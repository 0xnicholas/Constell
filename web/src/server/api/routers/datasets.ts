import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { authedProcedure, createTRPCRouter } from "../trpc";
import { prisma } from "@constell/shared/src/db";

export const datasetsRouter = createTRPCRouter({
  list: authedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        search: z.string().optional(),
        page: z.number().default(0),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      const where: Record<string, unknown> = { projectId };
      if (input.search) {
        where.name = { contains: input.search, mode: "insensitive" };
      }

      const [data, totalCount] = await Promise.all([
        prisma.dataset.findMany({
          where,
          skip: input.page * input.limit,
          take: input.limit,
          orderBy: { createdAt: "desc" },
          include: { _count: { select: { items: true, runs: true } } },
        }),
        prisma.dataset.count({ where }),
      ]);

      return {
        data: data.map((d) => ({
          ...d,
          itemsCount: d._count.items,
          runsCount: d._count.runs,
        })),
        totalCount,
        page: input.page,
        limit: input.limit,
      };
    }),

  create: authedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        inputSchema: z.record(z.unknown()).optional(),
        expectedOutputSchema: z.record(z.unknown()).optional(),
        metadata: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      try {
        return await prisma.dataset.create({
          data: {
            projectId,
            name: input.name,
            description: input.description,
            inputSchema: (input.inputSchema ?? undefined) as never,
            expectedOutputSchema: (input.expectedOutputSchema ?? undefined) as never,
            metadata: (input.metadata ?? undefined) as never,
          },
        });
      } catch (err) {
        if (err instanceof Error && err.message.includes("Unique constraint")) {
          throw new TRPCError({ code: "CONFLICT", message: "Dataset name already exists" });
        }
        throw err;
      }
    }),

  update: authedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        inputSchema: z.record(z.unknown()).optional(),
        expectedOutputSchema: z.record(z.unknown()).optional(),
        metadata: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      const data: Record<string, unknown> = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.description !== undefined) data.description = input.description;
      if (input.inputSchema !== undefined) data.inputSchema = input.inputSchema;
      if (input.expectedOutputSchema !== undefined)
        data.expectedOutputSchema = input.expectedOutputSchema;
      if (input.metadata !== undefined) data.metadata = input.metadata;

      return prisma.dataset.update({ where: { id: input.id, projectId }, data });
    }),

  delete: authedProcedure
    .input(z.object({ projectId: z.string().optional(), id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      await prisma.dataset.delete({ where: { id: input.id, projectId } });
      return { success: true };
    }),

  detail: authedProcedure
    .input(z.object({ projectId: z.string().optional(), id: z.string() }))
    .query(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      const ds = await prisma.dataset.findUnique({
        where: { id: input.id, projectId },
        include: { _count: { select: { items: true, runs: true } } },
      });
      if (!ds) throw new TRPCError({ code: "NOT_FOUND", message: "Dataset not found" });

      return {
        ...ds,
        itemsCount: ds._count.items,
        runsCount: ds._count.runs,
      };
    }),
});
