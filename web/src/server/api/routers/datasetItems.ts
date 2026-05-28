import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { authedProcedure, createTRPCRouter } from "../trpc";
import { prisma } from "@constell/shared/src/db";

export const datasetItemsRouter = createTRPCRouter({
  list: authedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        datasetId: z.string(),
        status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
        page: z.number().default(0),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      const where: Record<string, unknown> = {
        projectId,
        datasetId: input.datasetId,
      };
      if (input.status) where.status = input.status;

      const [data, totalCount] = await Promise.all([
        prisma.datasetItem.findMany({
          where,
          skip: input.page * input.limit,
          take: input.limit,
          orderBy: { createdAt: "asc" },
        }),
        prisma.datasetItem.count({ where }),
      ]);

      return { data, totalCount, page: input.page, limit: input.limit };
    }),

  create: authedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        datasetId: z.string(),
        input: z.any().optional(),
        expectedOutput: z.any().optional(),
        metadata: z.record(z.unknown()).optional(),
        status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      return prisma.datasetItem.create({
        data: {
          projectId,
          datasetId: input.datasetId,
          input: (input.input ?? undefined) as never,
          expectedOutput: (input.expectedOutput ?? undefined) as never,
          metadata: (input.metadata ?? undefined) as never,
          status: input.status,
        },
      });
    }),

  createMany: authedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        datasetId: z.string(),
        items: z.array(
          z.object({
            input: z.any().optional(),
            expectedOutput: z.any().optional(),
            metadata: z.record(z.unknown()).optional(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      const result = await prisma.datasetItem.createMany({
        data: input.items.map((it) => ({
          projectId,
          datasetId: input.datasetId,
          input: (it.input ?? undefined) as never,
          expectedOutput: (it.expectedOutput ?? undefined) as never,
          metadata: (it.metadata ?? undefined) as never,
        })),
      });

      return { createdCount: result.count };
    }),

  createFromTrace: authedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        datasetId: z.string(),
        traceId: z.string(),
        observationId: z.string().optional(),
        input: z.any().optional(),
        expectedOutput: z.any().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      let itemInput = input.input;
      let itemExpectedOutput = input.expectedOutput;

      if (itemInput === undefined || itemExpectedOutput === undefined) {
        if (input.observationId) {
          const obs = await prisma.observation.findFirst({
            where: { id: input.observationId, projectId },
          });
          if (!obs) throw new TRPCError({ code: "NOT_FOUND", message: "Observation not found" });
          itemInput = itemInput ?? obs.input;
          itemExpectedOutput = itemExpectedOutput ?? obs.output;
        } else {
          const trace = await prisma.trace.findFirst({
            where: { id: input.traceId, projectId },
          });
          if (!trace) throw new TRPCError({ code: "NOT_FOUND", message: "Trace not found" });
          itemInput = itemInput ?? trace.metadata;
        }
      }

      return prisma.datasetItem.create({
        data: {
          projectId,
          datasetId: input.datasetId,
          input: (itemInput ?? undefined) as never,
          expectedOutput: (itemExpectedOutput ?? undefined) as never,
          sourceTraceId: input.traceId,
          sourceObservationId: input.observationId,
        },
      });
    }),

  update: authedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        id: z.string(),
        input: z.any().optional(),
        expectedOutput: z.any().optional(),
        metadata: z.record(z.unknown()).optional(),
        status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      const data: Record<string, unknown> = {};
      if (input.input !== undefined) data.input = input.input;
      if (input.expectedOutput !== undefined) data.expectedOutput = input.expectedOutput;
      if (input.metadata !== undefined) data.metadata = input.metadata;
      if (input.status !== undefined) data.status = input.status;

      return prisma.datasetItem.update({
        where: { id: input.id, projectId },
        data,
      });
    }),

  delete: authedProcedure
    .input(z.object({ projectId: z.string().optional(), id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      await prisma.datasetItem.delete({ where: { id: input.id, projectId } });
      return { success: true };
    }),
});
