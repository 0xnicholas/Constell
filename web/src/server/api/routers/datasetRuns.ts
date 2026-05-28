import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { authedProcedure, createTRPCRouter } from "../trpc";
import { prisma } from "@constell/shared/src/db";
import { queueNames, type DatasetRunJob } from "@constell/shared/src/server";
import { Queue } from "bullmq";
import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_AUTH,
  maxRetriesPerRequest: null,
});

const datasetRunQueue = new Queue<DatasetRunJob>(queueNames.datasetRun, {
  connection: redis,
});

export const datasetRunsRouter = createTRPCRouter({
  list: authedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        datasetId: z.string(),
        page: z.number().default(0),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      const where: Record<string, unknown> = {
        projectId,
        datasetId: input.datasetId,
      };
      const [data, totalCount] = await Promise.all([
        prisma.datasetRun.findMany({
          where,
          skip: input.page * input.limit,
          take: input.limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.datasetRun.count({ where }),
      ]);

      return { data, totalCount, page: input.page, limit: input.limit };
    }),

  create: authedProcedure
    .input(
      z
        .object({
          projectId: z.string().optional(),
          datasetId: z.string(),
          name: z.string().min(1),
          description: z.string().optional(),
          presetId: z.string().optional(),
          promptId: z.string().optional(),
          promptVersion: z.number().optional(),
          model: z.string().optional(),
          modelParams: z.record(z.unknown()).optional(),
          evalTemplateIds: z.array(z.string()).optional(),
        })
        .refine((data) => !!(data.presetId || data.model), {
          message: "Must provide presetId or manual model config",
        })
    )
    .mutation(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      let execParams: Omit<DatasetRunJob, "projectId" | "datasetId" | "datasetRunId">;

      if (input.presetId) {
        const preset = await prisma.datasetRunPreset.findFirst({
          where: { id: input.presetId, projectId },
        });
        if (!preset) throw new TRPCError({ code: "NOT_FOUND", message: "Preset not found" });
        execParams = {
          promptId: preset.promptId ?? undefined,
          promptVersion: preset.promptVersion ?? undefined,
          model: preset.model,
          modelParams: (preset.modelParams as Record<string, unknown>) ?? undefined,
          evalTemplateIds: preset.evalTemplateIds,
        };
      } else {
        execParams = {
          promptId: input.promptId ?? undefined,
          promptVersion: input.promptVersion ?? undefined,
          model: input.model!,
          modelParams: input.modelParams ?? undefined,
          evalTemplateIds: input.evalTemplateIds ?? [],
        };
      }

      try {
        const run = await prisma.datasetRun.create({
          data: {
            projectId,
            datasetId: input.datasetId,
            name: input.name,
            description: input.description,
            status: "PENDING",
            metadata: { ...execParams, presetId: input.presetId } as Prisma.InputJsonValue,
          },
        });

        await datasetRunQueue.add(
          run.id,
          {
            projectId,
            datasetId: input.datasetId,
            datasetRunId: run.id,
            ...execParams,
          },
          { jobId: run.id }
        );

        return run;
      } catch (err) {
        if (err instanceof Error && err.message.includes("Unique constraint")) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Run name already exists for this dataset",
          });
        }
        throw err;
      }
    }),

  cancel: authedProcedure
    .input(z.object({ projectId: z.string().optional(), id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      const job = await datasetRunQueue.getJob(input.id);
      if (job) {
        await job.remove();
      }

      return prisma.datasetRun.update({
        where: { id: input.id, projectId },
        data: { status: "CANCELLED" },
      });
    }),

  delete: authedProcedure
    .input(z.object({ projectId: z.string().optional(), id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      await prisma.datasetRun.delete({ where: { id: input.id, projectId } });
      return { success: true };
    }),

  detail: authedProcedure
    .input(z.object({ projectId: z.string().optional(), id: z.string() }))
    .query(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      const run = await prisma.datasetRun.findUnique({
        where: { id: input.id, projectId },
        include: { runItems: { include: { datasetItem: true } } },
      });
      if (!run) throw new TRPCError({ code: "NOT_FOUND", message: "Run not found" });

      return run;
    }),

  items: authedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        runId: z.string(),
        page: z.number().default(0),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      const where: Record<string, unknown> = {
        projectId,
        datasetRunId: input.runId,
      };
      const [data, totalCount] = await Promise.all([
        prisma.datasetRunItem.findMany({
          where,
          skip: input.page * input.limit,
          take: input.limit,
          include: { datasetItem: true },
        }),
        prisma.datasetRunItem.count({ where }),
      ]);

      return { data, totalCount, page: input.page, limit: input.limit };
    }),

  compare: authedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        datasetId: z.string(),
        runIds: z.array(z.string()).min(2).max(5),
      })
    )
    .query(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      const datasetItems = await prisma.datasetItem.findMany({
        where: { projectId, datasetId: input.datasetId, status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
      });

      const runs = await prisma.datasetRun.findMany({
        where: {
          projectId,
          id: { in: input.runIds },
          datasetId: input.datasetId,
        },
        include: { runItems: true },
      });

      const allTraceIds = runs.flatMap((r) => r.runItems.map((ri) => ri.traceId));
      const allScores = await prisma.score.findMany({
        where: {
          projectId,
          traceId: { in: allTraceIds },
        },
      });

      const enrichedItems = datasetItems.map((item) => {
        const runsMap: Record<string, unknown> = {};
        for (const run of runs) {
          const ri = run.runItems.find((r) => r.datasetItemId === item.id);
          if (ri) {
            const traceScores = allScores.filter((s) => s.traceId === ri.traceId);
            runsMap[run.id] = {
              traceId: ri.traceId,
              observationId: ri.observationId,
              scores: traceScores,
            };
          }
        }
        return { ...item, runs: runsMap };
      });

      return {
        datasetItems: enrichedItems,
        runs: runs.map((r) => ({
          id: r.id,
          name: r.name,
          status: r.status,
          metadata: r.metadata,
        })),
      };
    }),
});
