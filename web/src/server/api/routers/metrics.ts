import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { authedProcedure, createTRPCRouter } from "../trpc";
import { getClickHouseClient } from "@constell/shared/src/server";
import { Queue } from "bullmq";
import { queueNames, type ExportJob } from "@constell/shared/src/server";
import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_AUTH,
  maxRetriesPerRequest: null,
});

const exportQueue = new Queue<ExportJob>(queueNames.export, { connection: redis });

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

export function zeroSummary() {
  return {
    traceCount: 0,
    totalTokens: 0,
    totalCost: "0",
    avgLatencyMs: 0,
    p95LatencyMs: 0,
    errorCount: 0,
    errorRate: 0,
  };
}

export const metricsRouter = createTRPCRouter({
  summary: authedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
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
          count() AS trace_count,
          sum(total_tokens) AS total_tokens,
          sum(total_cost) AS total_cost,
          avg(latency_ms) AS avg_latency,
          quantile(0.95)(latency_ms) AS p95_latency,
          sum(has_error) AS error_count,
          round(sum(has_error) / count() * 100, 2) AS error_rate
        FROM traces_wide FINAL
        WHERE project_id = {projectId: String}
          AND created_at >= {from: String}
          AND created_at <= {to: String}
      `;
      const resultSet = await ch.query({
        query,
        query_params: { projectId, from, to },
        format: "JSONEachRow",
      });
      const rows = (await resultSet.json()) as Array<{
        trace_count: string;
        total_tokens: string;
        total_cost: string;
        avg_latency: string;
        p95_latency: string;
        error_count: string;
        error_rate: string;
      }>;
      const row = rows[0];
      if (!row || Number(row.trace_count) === 0) {
        return zeroSummary();
      }
      return {
        traceCount: Number(row.trace_count),
        totalTokens: Number(row.total_tokens),
        totalCost: row.total_cost ?? "0",
        avgLatencyMs: Number(row.avg_latency) || 0,
        p95LatencyMs: Number(row.p95_latency) || 0,
        errorCount: Number(row.error_count),
        errorRate: Number(row.error_rate) || 0,
      };
    }),

  trends: authedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        granularity: z.enum(["hour", "day"]).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      const range = getDefaultRange();
      const from = input.from ?? range.from;
      const to = input.to ?? range.to;
      assertRangeValid(from, to);

      const fromMs = new Date(from).getTime();
      const toMs = new Date(to).getTime();
      const rangeHours = (toMs - fromMs) / (1000 * 60 * 60);

      const granularity = input.granularity ?? (rangeHours <= 48 ? "hour" : "day");

      const bucketFn = granularity === "hour" ? "toStartOfHour" : "toStartOfDay";
      const bucketExpr = `${bucketFn}(created_at)`;
      const maxBuckets = 90;
      const estimatedBuckets = granularity === "hour" ? rangeHours : Math.ceil(rangeHours / 24);
      if (estimatedBuckets > maxBuckets) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Selected granularity '${granularity}' produces ${estimatedBuckets} buckets, exceeding the maximum of ${maxBuckets}. Use 'day' or narrow the date range.`,
        });
      }

      const ch = getClickHouseClient();
      const query = `
        SELECT
          ${bucketExpr} AS bucket,
          count() AS trace_count,
          sum(total_tokens) AS tokens,
          sum(total_cost) AS cost,
          avg(latency_ms) AS avg_latency,
          quantile(0.95)(latency_ms) AS p95_latency
        FROM traces_wide FINAL
        WHERE project_id = {projectId: String}
          AND created_at >= {from: String}
          AND created_at <= {to: String}
        GROUP BY bucket
        ORDER BY bucket
      `;
      const resultSet = await ch.query({
        query,
        query_params: { projectId, from, to },
        format: "JSONEachRow",
      });
      const rows = (await resultSet.json()) as Array<{
        bucket: string;
        trace_count: string;
        tokens: string;
        cost: string;
        avg_latency: string;
        p95_latency: string;
      }>;

      return {
        data: rows.map((r) => ({
          bucket: r.bucket,
          traceCount: Number(r.trace_count),
          tokens: Number(r.tokens),
          cost: r.cost ?? "0",
          avgLatencyMs: Number(r.avg_latency) || 0,
          p95LatencyMs: Number(r.p95_latency) || 0,
        })),
        actualGranularity: granularity,
      };
    }),

  modelBreakdown: authedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
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
          model,
          count() AS generation_count,
          sum(input_tokens) AS input_tokens,
          sum(output_tokens) AS output_tokens,
          sum(calculated_cost) AS cost
        FROM observations_wide FINAL
        WHERE project_id = {projectId: String}
          AND type = 'GENERATION'
          AND start_time >= {from: String}
          AND start_time <= {to: String}
          AND model IS NOT NULL
          AND model != ''
        GROUP BY model
        ORDER BY cost DESC
      `;
      const resultSet = await ch.query({
        query,
        query_params: { projectId, from, to },
        format: "JSONEachRow",
      });
      const rows = (await resultSet.json()) as Array<{
        model: string;
        generation_count: string;
        input_tokens: string;
        output_tokens: string;
        cost: string;
      }>;

      return {
        models: rows.map((r) => ({
          model: r.model,
          generationCount: Number(r.generation_count),
          inputTokens: Number(r.input_tokens),
          outputTokens: Number(r.output_tokens),
          cost: r.cost ?? "0",
        })),
      };
    }),

  export: authedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        from: z.string(),
        to: z.string(),
        format: z.enum(["jsonl", "csv"]),
        scope: z.enum(["traces", "observations"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });
      assertRangeValid(input.from, input.to);

      if (process.env.CONSTELL_S3_BATCH_EXPORT_ENABLED !== "true") {
        throw new TRPCError({
          code: "SERVICE_UNAVAILABLE",
          message: "Batch export is not enabled",
        });
      }

      const job = await exportQueue.add("batch-export", {
        projectId,
        from: input.from,
        to: input.to,
        format: input.format,
        scope: input.scope,
        requestedBy: {
          userId: ctx.session?.user?.id,
          apiKeyId: ctx.apiKey?.apiKeyId,
        },
      });

      return { jobId: job.id };
    }),
});
