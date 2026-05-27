import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { authedProcedure, createTRPCRouter } from "../trpc";
import { prisma } from "@constell/shared/src/db";
import { queueNames, type EvalJob } from "@constell/shared/src/server";
import { Queue } from "bullmq";
import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_AUTH,
  maxRetriesPerRequest: null,
});

const evalQueue = new Queue<EvalJob>(queueNames.eval, { connection: redis });

export const evalsRouter = createTRPCRouter({
  // ─── Template CRUD ───

  templateList: authedProcedure
    .input(z.object({ projectId: z.string().optional() }))
    .query(async ({ ctx }) => {
      const projectId = ctx.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      const templates = await prisma.evalTemplate.findMany({
        where: { projectId },
        orderBy: { createdAt: "asc" },
      });

      return templates.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        scoreName: t.scoreName,
        scoreDataType: t.scoreDataType,
        model: t.model,
      }));
    }),

  templateCreate: authedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        name: z.string().min(1),
        description: z.string().optional(),
        prompt: z.string().min(1),
        outputSchema: z.record(z.unknown()).optional(),
        scoreName: z.string().min(1),
        scoreDataType: z.enum(["NUMERIC", "BOOLEAN", "CATEGORICAL"]),
        model: z.string().optional(),
        temperature: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      try {
        const template = await prisma.evalTemplate.create({
          data: {
            projectId,
            name: input.name,
            description: input.description,
            prompt: input.prompt,
            outputSchema: input.outputSchema
              ? (input.outputSchema as Prisma.InputJsonValue)
              : undefined,
            scoreName: input.scoreName,
            scoreDataType: input.scoreDataType,
            model: input.model,
            temperature: input.temperature,
          },
        });
        return { id: template.id };
      } catch (err) {
        if (err instanceof Error && err.message.includes("Unique constraint")) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Eval template "${input.name}" already exists`,
          });
        }
        throw err;
      }
    }),

  templateDelete: authedProcedure
    .input(z.object({ projectId: z.string().optional(), id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      // Check for existing runs
      const runCount = await prisma.evalRun.count({
        where: { templateId: input.id, projectId },
      });
      if (runCount > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Cannot delete template with existing eval runs",
        });
      }

      const result = await prisma.evalTemplate.deleteMany({
        where: { id: input.id, projectId },
      });

      if (result.count === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      }
      return { success: true };
    }),

  // ─── Run CRUD ───

  runList: authedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        templateId: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      const where: Record<string, unknown> = { projectId };
      if (input.templateId) where.templateId = input.templateId;

      const [runs, total] = await Promise.all([
        prisma.evalRun.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: input.limit,
          skip: input.offset,
          include: { template: { select: { name: true } } },
        }),
        prisma.evalRun.count({ where }),
      ]);

      return {
        runs: runs.map((r) => ({
          id: r.id,
          templateName: r.template?.name ?? "",
          status: r.status,
          traceCount: r.traceCount,
          scoreCount: r.scoreCount,
          averageScore: r.averageScore,
          createdAt: r.createdAt.toISOString(),
        })),
        total,
      };
    }),

  runCreate: authedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        templateId: z.string(),
        from: z.string().optional(),
        to: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      const template = await prisma.evalTemplate.findFirst({
        where: { id: input.templateId, projectId },
      });
      if (!template) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });

      const run = await prisma.evalRun.create({
        data: {
          projectId,
          templateId: input.templateId,
          status: "PENDING",
          from: input.from ? new Date(input.from) : null,
          to: input.to ? new Date(input.to) : null,
        },
      });

      await evalQueue.add("eval", {
        projectId,
        templateId: input.templateId,
        runId: run.id,
        from: input.from,
        to: input.to,
      });

      return { id: run.id, status: "PENDING" as const };
    }),

  runDetail: authedProcedure
    .input(z.object({ projectId: z.string().optional(), id: z.string() }))
    .query(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      const run = await prisma.evalRun.findFirst({
        where: { id: input.id, projectId },
        include: { template: { select: { name: true } } },
      });
      if (!run) throw new TRPCError({ code: "NOT_FOUND", message: "Run not found" });

      return {
        id: run.id,
        templateId: run.templateId,
        templateName: run.template?.name ?? "",
        status: run.status,
        from: run.from?.toISOString() ?? null,
        to: run.to?.toISOString() ?? null,
        traceCount: run.traceCount,
        processedCount: run.processedCount,
        scoreCount: run.scoreCount,
        averageScore: run.averageScore,
        errorMessage: run.errorMessage,
        createdAt: run.createdAt.toISOString(),
        updatedAt: run.updatedAt.toISOString(),
      };
    }),

  runCancel: authedProcedure
    .input(z.object({ projectId: z.string().optional(), id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      const run = await prisma.evalRun.findFirst({
        where: { id: input.id, projectId },
      });
      if (!run) throw new TRPCError({ code: "NOT_FOUND", message: "Run not found" });
      if (run.status !== "PENDING" && run.status !== "RUNNING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot cancel run with status ${run.status}`,
        });
      }

      if (run.jobId) {
        const job = await evalQueue.getJob(run.jobId);
        if (job) await job.remove();
      }

      await prisma.evalRun.update({
        where: { id: input.id },
        data: { status: "CANCELLED" },
      });

      return { success: true };
    }),
});
