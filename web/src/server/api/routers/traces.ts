import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { authedProcedure, createTRPCRouter } from "../trpc";
import { getClickHouseClient } from "@constell/shared/src/server";
import { prisma } from "@constell/shared/src/db";

export const tracesRouter = createTRPCRouter({
  list: authedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const resolvedProjectId = ctx.projectId ?? input.projectId;
      if (!resolvedProjectId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "projectId required",
        });
      }

      const ch = getClickHouseClient();
      const { from, to, limit, offset } = input;

      const conditions = [`project_id = {projectId: String}`];
      if (from) conditions.push(`created_at >= {from: String}`);
      if (to) conditions.push(`created_at <= {to: String}`);
      const where = conditions.join(" AND ");

      const query = `
        SELECT
          id,
          user_id,
          session_id,
          release,
          version,
          total_tokens,
          total_cost,
          latency_ms,
          observation_count,
          has_error,
          created_at,
          event_ts
        FROM traces_wide FINAL
        WHERE ${where}
        ORDER BY created_at DESC
        LIMIT {limit: UInt32}
        OFFSET {offset: UInt32}
      `;

      const queryParams: Record<string, unknown> = {
        projectId: resolvedProjectId,
        limit,
        offset,
      };
      if (from) queryParams.from = from;
      if (to) queryParams.to = to;

      const resultSet = await ch.query({
        query,
        query_params: queryParams,
        format: "JSONEachRow",
      });
      const rows = await resultSet.json<unknown[]>();

      return { traces: rows, limit, offset };
    }),

  detail: authedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        traceId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const resolvedProjectId = ctx.projectId ?? input.projectId;
      if (!resolvedProjectId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "projectId required",
        });
      }

      const pgTrace = await prisma.trace.findFirst({
        where: {
          projectId: resolvedProjectId,
          OR: [{ externalId: input.traceId }, { id: input.traceId }],
        },
        include: {
          observations: {
            orderBy: { startTime: "asc" },
          },
        },
      });
      if (!pgTrace) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Trace not found" });
      }
      return { trace: pgTrace };
    }),
});
