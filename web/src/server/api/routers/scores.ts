import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { authedProcedure, createTRPCRouter } from "../trpc";
import { getClickHouseClient } from "@constell/shared/src/server";
import { prisma } from "@constell/shared/src/db";

const MAX_RANGE_DAYS = 90;

function getDefaultRange() {
  const to = new Date().toISOString();
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  return { from, to };
}

function assertRangeValid(from: string, to: string) {
  const fromMs = new Date(from).getTime();
  const toMs = new Date(to).getTime();
  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid date range" });
  }
  if (toMs < fromMs) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "End date must be after start date" });
  }
  const days = (toMs - fromMs) / (1000 * 60 * 60 * 24);
  if (days > MAX_RANGE_DAYS) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Date range exceeds ${MAX_RANGE_DAYS} days`,
    });
  }
}

export const scoresRouter = createTRPCRouter({
  // ─── Score Config CRUD ───

  configList: authedProcedure
    .input(z.object({ projectId: z.string().optional() }))
    .query(async ({ ctx }) => {
      const projectId = ctx.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      const configs = await prisma.scoreConfig.findMany({
        where: { projectId },
        orderBy: { createdAt: "asc" },
      });

      return configs.map((c) => ({
        id: c.id,
        name: c.name,
        dataType: c.dataType,
        description: c.description,
        minValue: c.minValue,
        maxValue: c.maxValue,
      }));
    }),

  configCreate: authedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        name: z.string().min(1),
        dataType: z.enum(["NUMERIC", "BOOLEAN", "CATEGORICAL"]),
        description: z.string().optional(),
        minValue: z.number().optional(),
        maxValue: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      try {
        const config = await prisma.scoreConfig.create({
          data: {
            projectId,
            name: input.name,
            dataType: input.dataType,
            description: input.description,
            minValue: input.minValue,
            maxValue: input.maxValue,
          },
        });
        return { id: config.id };
      } catch (err) {
        if (err instanceof Error && err.message.includes("Unique constraint")) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Score config "${input.name}" already exists`,
          });
        }
        throw err;
      }
    }),

  configUpdate: authedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        id: z.string(),
        description: z.string().optional(),
        minValue: z.number().optional(),
        maxValue: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      const config = await prisma.scoreConfig.updateMany({
        where: { id: input.id, projectId },
        data: {
          description: input.description,
          minValue: input.minValue,
          maxValue: input.maxValue,
        },
      });

      if (config.count === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Score config not found" });
      }
      return { id: input.id };
    }),

  configDelete: authedProcedure
    .input(z.object({ projectId: z.string().optional(), id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      const result = await prisma.scoreConfig.deleteMany({
        where: { id: input.id, projectId },
      });

      if (result.count === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Score config not found" });
      }
      return { success: true };
    }),

  // ─── Score CRUD ───

  list: authedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        traceId: z.string().optional(),
        observationId: z.string().optional(),
        name: z.string().optional(),
        source: z.enum(["API", "UI", "EVAL"]).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      const where: Record<string, unknown> = { projectId };
      if (input.traceId) where.traceId = input.traceId;
      if (input.observationId) where.observationId = input.observationId;
      if (input.name) where.name = input.name;
      if (input.source) where.source = input.source;

      const [scores, total] = await Promise.all([
        prisma.score.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: input.limit,
          skip: input.offset,
          include: { config: { select: { dataType: true } } },
        }),
        prisma.score.count({ where }),
      ]);

      return {
        scores: scores.map((s) => ({
          id: s.id,
          traceId: s.traceId,
          observationId: s.observationId,
          name: s.name,
          dataType: s.config?.dataType ?? "NUMERIC",
          value: s.value,
          stringValue: s.stringValue,
          source: s.source,
          comment: s.comment,
          createdAt: s.createdAt.toISOString(),
        })),
        total,
      };
    }),

  create: authedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        traceId: z.string(),
        observationId: z.string().optional(),
        name: z.string().min(1),
        value: z.number().optional(),
        stringValue: z.string().optional(),
        dataType: z.enum(["NUMERIC", "BOOLEAN", "CATEGORICAL"]).optional(),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      // Resolve or infer dataType
      let dataType = input.dataType;
      if (!dataType) {
        const config = await prisma.scoreConfig.findUnique({
          where: { projectId_name: { projectId, name: input.name } },
        });
        if (config) dataType = config.dataType;
        else
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "dataType required when no config exists",
          });
      }

      if (dataType === "CATEGORICAL" && !input.stringValue) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "stringValue required for CATEGORICAL scores",
        });
      }
      if ((dataType === "NUMERIC" || dataType === "BOOLEAN") && input.value === undefined) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "value required for NUMERIC/BOOLEAN scores",
        });
      }

      const config = await prisma.scoreConfig.findUnique({
        where: { projectId_name: { projectId, name: input.name } },
      });

      const score = await prisma.score.create({
        data: {
          projectId,
          traceId: input.traceId,
          observationId: input.observationId ?? null,
          name: input.name,
          configId: config?.id ?? null,
          value: input.value ?? (dataType === "BOOLEAN" ? 0 : 0),
          stringValue: input.stringValue ?? null,
          source: "UI",
          comment: input.comment ?? null,
        },
      });

      return { id: score.id };
    }),

  update: authedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        id: z.string(),
        value: z.number().optional(),
        stringValue: z.string().optional(),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      const existing = await prisma.score.findFirst({
        where: { id: input.id, projectId },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Score not found" });
      if (existing.source === "EVAL") {
        throw new TRPCError({ code: "FORBIDDEN", message: "EVAL scores are immutable" });
      }

      const score = await prisma.score.update({
        where: { id: input.id },
        data: {
          value: input.value,
          stringValue: input.stringValue,
          comment: input.comment,
        },
      });

      return { id: score.id };
    }),

  delete: authedProcedure
    .input(z.object({ projectId: z.string().optional(), id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      const existing = await prisma.score.findFirst({
        where: { id: input.id, projectId },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Score not found" });
      if (existing.source === "EVAL") {
        throw new TRPCError({ code: "FORBIDDEN", message: "EVAL scores are immutable" });
      }

      await prisma.score.delete({ where: { id: input.id } });
      return { success: true };
    }),

  // ─── Analytics ───

  analytics: authedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        name: z.string(),
        from: z.string().optional(),
        to: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      const range = getDefaultRange();
      const from = input.from ?? range.from;
      const to = input.to ?? range.to;
      assertRangeValid(from, to);

      const ch = getClickHouseClient();
      const query = `
        SELECT
          count() AS count,
          avg(value) AS average,
          min(value) AS min,
          max(value) AS max,
          string_value AS bucket,
          count() AS bucket_count
        FROM scores_wide FINAL
        WHERE project_id = {projectId: String}
          AND name = {name: String}
          AND created_at >= {from: String}
          AND created_at <= {to: String}
        GROUP BY string_value
        ORDER BY bucket_count DESC
      `;
      const resultSet = await ch.query({
        query,
        query_params: { projectId, name: input.name, from, to },
        format: "JSONEachRow",
      });
      const rows = (await resultSet.json()) as Array<{
        count: string;
        average: string;
        min: string;
        max: string;
        bucket: string | null;
        bucket_count: string;
      }>;

      const totalCount = rows.reduce((sum, r) => sum + Number(r.count), 0);
      const numericRows = rows.filter((r) => r.bucket === null || r.bucket === "");
      const categoricalRows = rows.filter((r) => r.bucket !== null && r.bucket !== "");

      return {
        count: totalCount,
        average: numericRows.length > 0 ? Number(numericRows[0].average) || null : null,
        min: numericRows.length > 0 ? Number(numericRows[0].min) || null : null,
        max: numericRows.length > 0 ? Number(numericRows[0].max) || null : null,
        distribution: categoricalRows.map((r) => ({
          bucket: r.bucket ?? "",
          count: Number(r.bucket_count),
          percentage: totalCount > 0 ? Math.round((Number(r.bucket_count) / totalCount) * 100) : 0,
        })),
      };
    }),

  trends: authedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        name: z.string(),
        from: z.string().optional(),
        to: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      const range = getDefaultRange();
      const from = input.from ?? range.from;
      const to = input.to ?? range.to;
      assertRangeValid(from, to);

      const ch = getClickHouseClient();
      const query = `
        SELECT
          toStartOfDay(created_at) AS bucket,
          avg(value) AS average
        FROM scores_wide FINAL
        WHERE project_id = {projectId: String}
          AND name = {name: String}
          AND created_at >= {from: String}
          AND created_at <= {to: String}
        GROUP BY bucket
        ORDER BY bucket ASC
      `;
      const resultSet = await ch.query({
        query,
        query_params: { projectId, name: input.name, from, to },
        format: "JSONEachRow",
      });
      const rows = (await resultSet.json()) as Array<{
        bucket: string;
        average: string;
      }>;

      return rows.map((r) => ({
        bucket: r.bucket,
        average: Number(r.average) || 0,
      }));
    }),
});
