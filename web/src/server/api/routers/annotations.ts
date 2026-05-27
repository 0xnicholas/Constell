import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { authedProcedure, createTRPCRouter } from "../trpc";
import { prisma } from "@constell/shared/src/db";

async function assertAdminOrOwner(ctx: {
  session: { user: { id: string } } | null;
  projectId: string | null;
}) {
  if (!ctx.session?.user?.id || !ctx.projectId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  const membership = await prisma.membership.findFirst({
    where: {
      userId: ctx.session.user.id,
      organization: { projects: { some: { id: ctx.projectId } } },
      role: { in: ["ADMIN", "OWNER"] },
    },
  });
  if (!membership) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
}

export const annotationsRouter = createTRPCRouter({
  // ─── Queue CRUD ───

  queueList: authedProcedure
    .input(z.object({ projectId: z.string().optional() }))
    .query(async ({ ctx }) => {
      const projectId = ctx.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      const queues = await prisma.annotationQueue.findMany({
        where: { projectId },
        orderBy: { createdAt: "asc" },
        include: {
          _count: { select: { items: true } },
          items: { where: { status: { in: ["ANNOTATED", "REVIEWED"] } }, select: { id: true } },
          scoreConfig: { select: { name: true } },
        },
      });

      return queues.map((q) => ({
        id: q.id,
        name: q.name,
        description: q.description,
        scoreConfigName: q.scoreConfig?.name ?? null,
        itemCount: q._count.items,
        completedCount: q.items.length,
      }));
    }),

  queueCreate: authedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        name: z.string().min(1),
        description: z.string().optional(),
        scoreConfigId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      try {
        const queue = await prisma.annotationQueue.create({
          data: {
            projectId,
            name: input.name,
            description: input.description,
            scoreConfigId: input.scoreConfigId ?? null,
          },
        });
        return { id: queue.id };
      } catch (err) {
        if (err instanceof Error && err.message.includes("Unique constraint")) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Annotation queue "${input.name}" already exists`,
          });
        }
        throw err;
      }
    }),

  queueDelete: authedProcedure
    .input(z.object({ projectId: z.string().optional(), id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      const result = await prisma.annotationQueue.deleteMany({
        where: { id: input.id, projectId },
      });

      if (result.count === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Queue not found" });
      }
      return { success: true };
    }),

  queuePopulate: authedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        queueId: z.string(),
        traceIds: z.array(z.string()).max(1000),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      await assertAdminOrOwner({ ...ctx, projectId });

      const queue = await prisma.annotationQueue.findFirst({
        where: { id: input.queueId, projectId },
      });
      if (!queue) throw new TRPCError({ code: "NOT_FOUND", message: "Queue not found" });

      const existingTraceIds = new Set(
        (
          await prisma.annotationQueueItem.findMany({
            where: { queueId: input.queueId, traceId: { in: input.traceIds } },
            select: { traceId: true },
          })
        ).map((i) => i.traceId)
      );

      const newTraceIds = input.traceIds.filter((id) => !existingTraceIds.has(id));

      if (newTraceIds.length > 0) {
        await prisma.annotationQueueItem.createMany({
          data: newTraceIds.map((traceId) => ({
            queueId: input.queueId,
            traceId,
            status: "PENDING" as const,
          })),
          skipDuplicates: true,
        });
      }

      return { added: newTraceIds.length };
    }),

  // ─── Item Operations ───

  itemList: authedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        queueId: z.string(),
        status: z.enum(["PENDING", "ASSIGNED", "ANNOTATED", "REVIEWED"]).optional(),
        assignedTo: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      const queue = await prisma.annotationQueue.findFirst({
        where: { id: input.queueId, projectId },
      });
      if (!queue) throw new TRPCError({ code: "NOT_FOUND", message: "Queue not found" });

      const where: Record<string, unknown> = { queueId: input.queueId };
      if (input.status) where.status = input.status;
      if (input.assignedTo) where.assignedTo = input.assignedTo;

      const [items, total] = await Promise.all([
        prisma.annotationQueueItem.findMany({
          where,
          orderBy: { createdAt: "asc" },
          take: input.limit,
          skip: input.offset,
          include: { annotator: { select: { name: true, email: true } } },
        }),
        prisma.annotationQueueItem.count({ where }),
      ]);

      return {
        items: items.map((i) => ({
          id: i.id,
          traceId: i.traceId,
          status: i.status,
          assignedTo: i.assignedTo,
          annotatorName: i.annotator?.name ?? i.annotator?.email ?? null,
          scoreValue: i.scoreValue,
          stringValue: i.stringValue,
          comment: i.comment,
          createdAt: i.createdAt.toISOString(),
        })),
        total,
      };
    }),

  itemAssign: authedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        itemIds: z.array(z.string()),
        userId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      await assertAdminOrOwner({ ...ctx, projectId });

      const updated = await prisma.annotationQueueItem.updateMany({
        where: {
          id: { in: input.itemIds },
          queue: { projectId },
        },
        data: {
          assignedTo: input.userId ?? null,
          status: input.userId ? "ASSIGNED" : "PENDING",
        },
      });

      return { updated: updated.count };
    }),

  itemAnnotate: authedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        itemId: z.string(),
        scoreValue: z.number().optional(),
        stringValue: z.string().optional(),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });
      const userId = ctx.session?.user?.id;
      if (!userId) throw new TRPCError({ code: "UNAUTHORIZED", message: "Login required" });

      const item = await prisma.annotationQueueItem.findFirst({
        where: { id: input.itemId, queue: { projectId } },
        include: { queue: { include: { scoreConfig: true } } },
      });
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
      if (item.assignedTo !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Item not assigned to you" });
      }

      // Create Score record
      await prisma.score.create({
        data: {
          projectId,
          traceId: item.traceId,
          name: item.queue.scoreConfig?.name ?? "annotation",
          configId: item.queue.scoreConfigId,
          value: input.scoreValue ?? 0,
          stringValue: input.stringValue ?? null,
          source: "ANNOTATION",
          comment: input.comment ?? null,
        },
      });

      // Update item
      await prisma.annotationQueueItem.update({
        where: { id: input.itemId },
        data: {
          status: "ANNOTATED",
          scoreValue: input.scoreValue,
          stringValue: input.stringValue,
          comment: input.comment,
        },
      });

      return { id: item.id };
    }),

  itemReview: authedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        itemId: z.string(),
        approved: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });
      const reviewerId = ctx.session?.user?.id;
      if (!reviewerId) throw new TRPCError({ code: "UNAUTHORIZED", message: "Login required" });

      await assertAdminOrOwner({ ...ctx, projectId });

      const item = await prisma.annotationQueueItem.findFirst({
        where: { id: input.itemId, queue: { projectId }, status: "ANNOTATED" },
      });
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Annotated item not found" });

      if (input.approved) {
        await prisma.annotationQueueItem.update({
          where: { id: input.itemId },
          data: { status: "REVIEWED", reviewedBy: reviewerId },
        });
      } else {
        // Delete the associated score and reset item
        await prisma.score.deleteMany({
          where: {
            projectId,
            traceId: item.traceId,
            source: "ANNOTATION",
          },
        });
        await prisma.annotationQueueItem.update({
          where: { id: input.itemId },
          data: {
            status: "ASSIGNED",
            scoreValue: null,
            stringValue: null,
            comment: null,
            reviewedBy: null,
          },
        });
      }

      return { id: item.id };
    }),

  // ─── My Assignments ───

  myAssignments: authedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        status: z.enum(["PENDING", "ASSIGNED", "ANNOTATED", "REVIEWED"]).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      const userId = ctx.session?.user?.id;
      if (!userId) return [];

      const where: Record<string, unknown> = { assignedTo: userId };
      if (projectId) {
        where.queue = { projectId };
      }
      if (input.status) where.status = input.status;

      const items = await prisma.annotationQueueItem.findMany({
        where,
        orderBy: { createdAt: "asc" },
        include: { queue: { select: { name: true } } },
      });

      return items.map((i) => ({
        itemId: i.id,
        queueName: i.queue.name,
        traceId: i.traceId,
        status: i.status,
      }));
    }),

  // ─── Stats ───

  queueStats: authedProcedure
    .input(z.object({ projectId: z.string().optional(), queueId: z.string() }))
    .query(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      const queue = await prisma.annotationQueue.findFirst({
        where: { id: input.queueId, projectId },
      });
      if (!queue) throw new TRPCError({ code: "NOT_FOUND", message: "Queue not found" });

      const [total, pending, assigned, annotated, reviewed, avgScore] = await Promise.all([
        prisma.annotationQueueItem.count({ where: { queueId: input.queueId } }),
        prisma.annotationQueueItem.count({ where: { queueId: input.queueId, status: "PENDING" } }),
        prisma.annotationQueueItem.count({ where: { queueId: input.queueId, status: "ASSIGNED" } }),
        prisma.annotationQueueItem.count({
          where: { queueId: input.queueId, status: "ANNOTATED" },
        }),
        prisma.annotationQueueItem.count({ where: { queueId: input.queueId, status: "REVIEWED" } }),
        prisma.annotationQueueItem.aggregate({
          where: { queueId: input.queueId, scoreValue: { not: null } },
          _avg: { scoreValue: true },
        }),
      ]);

      return {
        total,
        pending,
        assigned,
        annotated,
        reviewed,
        averageScore: avgScore._avg.scoreValue,
      };
    }),
});
