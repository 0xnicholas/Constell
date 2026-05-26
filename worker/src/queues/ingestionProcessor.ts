import { type Job } from "bullmq";
import { type IngestionJob } from "@constell/shared/src/server";
import {
  validateEvents,
  crossValidateTraceReferences,
  enrichEvents,
  type ProcessingFailure,
} from "@constell/shared/src/server";
import { prisma } from "@constell/shared/src/db";
import { calculateCost } from "../services/costCalculator.js";
import { ClickHouseBatchWriter } from "./clickhouseWriter.js";

interface TraceAggregate {
  totalTokens: number;
  totalCost: number;
  latencyMs: number;
  observationCount: number;
  hasError: number;
}

function computeTraceAggregates(
  events: ReturnType<typeof enrichEvents>,
  _projectId: string
): Map<string, TraceAggregate> {
  const map = new Map<string, TraceAggregate>();

  for (const event of events) {
    if (event.type !== "observation-create") continue;
    const body = event.body as {
      traceId: string;
      startTime?: string;
      endTime?: string;
      usage?: { input?: number; output?: number };
      level?: string;
    };
    const existing = map.get(body.traceId) ?? {
      totalTokens: 0,
      totalCost: 0,
      latencyMs: 0,
      observationCount: 0,
      hasError: 0,
    };

    const tokens = (body.usage?.input ?? 0) + (body.usage?.output ?? 0);
    const latency =
      body.startTime && body.endTime
        ? new Date(body.endTime).getTime() - new Date(body.startTime).getTime()
        : 0;

    map.set(body.traceId, {
      totalTokens: existing.totalTokens + tokens,
      totalCost: existing.totalCost, // cost calc requires model; handled separately
      latencyMs: Math.max(existing.latencyMs, latency),
      observationCount: existing.observationCount + 1,
      hasError: existing.hasError + (body.level === "ERROR" ? 1 : 0),
    });
  }
  return map;
}

export interface IngestionResult {
  processed: number;
  failed: number;
  failures: ProcessingFailure[];
}

export async function processIngestionJob(job: Job<IngestionJob>): Promise<IngestionResult> {
  const { batch, projectId } = job.data;
  const failures: ProcessingFailure[] = [];

  // 1. Shallow validate
  const { valid: shallowValid, invalid: shallowInvalid } = validateEvents(batch);
  failures.push(...shallowInvalid);

  // 2. Dedupe by event.id
  const seen = new Set<string>();
  const deduped = shallowValid.filter((e: { id: string; type: string }) => {
    if (seen.has(e.id)) {
      failures.push({
        eventId: e.id,
        eventType: e.type,
        reason: "Duplicate event ID in batch",
        code: "DUPLICATE_EVENT",
      });
      return false;
    }
    seen.add(e.id);
    return true;
  });

  // 3. Cross-validate trace references
  const existingTraceIds = await loadExistingTraceIds(projectId, deduped);
  const { valid: crossValid, invalid: crossInvalid } = crossValidateTraceReferences(
    deduped,
    existingTraceIds
  );
  failures.push(...crossInvalid);

  // 4. Enrich
  const enriched = enrichEvents(crossValid);

  // 5. Compute trace aggregates from batch observations
  const traceAggregates = computeTraceAggregates(enriched, projectId);

  // 6. Write to PostgreSQL
  const pgFailures = await writeToPostgres(enriched, projectId);
  failures.push(...pgFailures);

  // 7. Write to ClickHouse
  const chWriter = new ClickHouseBatchWriter();
  const chFailures = await writeToClickHouse(enriched, projectId, chWriter, traceAggregates);
  failures.push(...chFailures);

  const processed = enriched.length;
  const failed = failures.length;

  if (failures.length > 0) {
    console.error(`[ingestion] Job ${job.id}: ${failures.length} failures`, failures);
  }

  return { processed, failed, failures };
}

async function loadExistingTraceIds(
  projectId: string,
  events: { type: string; body: { id?: string } }[]
): Promise<Set<string>> {
  const traceIds = events.filter((e) => e.type === "trace-create").map((e) => e.body.id as string);

  const existing = await prisma.trace.findMany({
    where: {
      projectId,
      id: { in: traceIds },
    },
    select: { id: true },
  });

  return new Set(existing.map((t) => t.id));
}

async function writeToPostgres(
  events: ReturnType<typeof enrichEvents>,
  projectId: string
): Promise<ProcessingFailure[]> {
  const failures: ProcessingFailure[] = [];

  // Phase 1: Upsert all traces first so observations can reference them
  for (const event of events) {
    if (event.type !== "trace-create") continue;
    try {
      const body = event.body as {
        id: string;
        name?: string;
        userId?: string;
        sessionId?: string;
        metadata?: unknown;
        release?: string;
        version?: string;
        tags?: string[];
        public?: boolean;
      };
      await prisma.trace.upsert({
        where: { id: body.id },
        update: {},
        create: {
          id: body.id,
          externalId: body.id,
          projectId,
          name: body.name ?? null,
          userId: body.userId ?? null,
          sessionId: body.sessionId ?? null,
          metadata: body.metadata ?? undefined,
          release: body.release ?? null,
          version: body.version ?? null,
          tags: body.tags ?? [],
          public: body.public ?? false,
          createdAt: event._enriched.eventTs,
          updatedAt: event._enriched.eventTs,
        },
      });
    } catch (err) {
      failures.push({
        eventId: event.id,
        eventType: event.type,
        reason: err instanceof Error ? err.message : String(err),
        code: "PG_ERROR",
      });
    }
  }

  // Phase 2: Create observations and accumulate trace aggregates
  for (const event of events) {
    if (event.type !== "observation-create") continue;
    try {
      const body = event.body as {
        id: string;
        traceId: string;
        type: string;
        name?: string;
        startTime?: string;
        endTime?: string;
        model?: string;
        input?: unknown;
        output?: unknown;
        usage?: { input?: number; output?: number };
        metadata?: unknown;
        parentObservationId?: string;
        level?: string;
        statusMessage?: string;
        environment?: string;
        release?: string;
        version?: string;
        sessionId?: string;
        userId?: string;
      };

      const cost = body.model
        ? await calculateCost(body.model, body.usage?.input ?? null, body.usage?.output ?? null)
        : null;

      await prisma.observation.create({
        data: {
          id: body.id,
          traceId: body.traceId,
          projectId,
          type: body.type,
          name: body.name ?? null,
          startTime: body.startTime ? new Date(body.startTime) : null,
          endTime: body.endTime ? new Date(body.endTime) : null,
          model: body.model ?? null,
          input: body.input ? JSON.stringify(body.input) : null,
          output: body.output ? JSON.stringify(body.output) : null,
          inputTokens: body.usage?.input ?? null,
          outputTokens: body.usage?.output ?? null,
          totalTokens: event._enriched.totalTokens,
          calculatedCost: cost,
          level: body.level ?? "DEFAULT",
          statusMessage: body.statusMessage ?? null,
          metadata: body.metadata ?? undefined,
          parentObservationId: body.parentObservationId ?? null,
          createdAt: event._enriched.eventTs,
          updatedAt: event._enriched.eventTs,
        },
      });

      // Accumulate trace aggregates in PG
      await prisma.trace.update({
        where: { id: body.traceId },
        data: {
          totalTokens: { increment: event._enriched.totalTokens ?? 0 },
          totalCost: { increment: cost ?? 0 },
        },
      });
    } catch (err) {
      failures.push({
        eventId: event.id,
        eventType: event.type,
        reason: err instanceof Error ? err.message : String(err),
        code: "PG_ERROR",
      });
    }
  }

  return failures;
}

async function writeToClickHouse(
  events: ReturnType<typeof enrichEvents>,
  projectId: string,
  writer: ClickHouseBatchWriter,
  traceAggregates: Map<string, TraceAggregate>
): Promise<ProcessingFailure[]> {
  const failures: ProcessingFailure[] = [];
  const now = new Date();

  for (const event of events) {
    try {
      if (event.type === "trace-create") {
        const body = event.body as {
          id: string;
          userId?: string;
          sessionId?: string;
          release?: string;
          version?: string;
        };
        const agg = traceAggregates.get(body.id) ?? {
          totalTokens: 0,
          totalCost: 0,
          latencyMs: 0,
          observationCount: 0,
          hasError: 0,
        };

        writer.addTrace({
          id: body.id,
          project_id: projectId,
          user_id: body.userId ?? null,
          session_id: body.sessionId ?? null,
          release: body.release ?? null,
          version: body.version ?? null,
          total_tokens: agg.totalTokens,
          total_cost: 0, // will be updated by worker v0.3.0+ via CH ReplacingMergeTree
          latency_ms: agg.latencyMs,
          observation_count: agg.observationCount,
          has_error: agg.hasError,
          created_at: event._enriched.eventTs.toISOString(),
          updated_at: event._enriched.eventTs.toISOString(),
          event_ts: event._enriched.eventTs.toISOString(),
          ingested_at: now.toISOString(),
        });
      } else if (event.type === "observation-create") {
        const body = event.body as {
          id: string;
          traceId: string;
          type: string;
          name?: string;
          startTime?: string;
          endTime?: string;
          model?: string;
          input?: unknown;
          output?: unknown;
          usage?: { input?: number; output?: number };
          modelParameters?: unknown;
          metadata?: unknown;
          parentObservationId?: string;
          level?: string;
          statusMessage?: string;
          environment?: string;
          release?: string;
          version?: string;
          sessionId?: string;
          userId?: string;
        };

        const cost = body.model
          ? await calculateCost(body.model, body.usage?.input ?? null, body.usage?.output ?? null)
          : null;

        writer.addObservation({
          id: body.id,
          trace_id: body.traceId,
          project_id: projectId,
          type: body.type,
          name: body.name ?? null,
          start_time: body.startTime ?? null,
          end_time: body.endTime ?? null,
          latency_ms: event._enriched.latencyMs ?? 0,
          input: body.input ? JSON.stringify(body.input) : "",
          output: body.output ? JSON.stringify(body.output) : "",
          model: body.model ?? null,
          model_parameters: body.modelParameters ? JSON.stringify(body.modelParameters) : null,
          input_tokens: body.usage?.input ?? 0,
          output_tokens: body.usage?.output ?? 0,
          total_tokens: event._enriched.totalTokens ?? 0,
          calculated_cost: cost ?? 0,
          level: body.level ?? "DEFAULT",
          status_message: body.statusMessage ?? null,
          environment: body.environment ?? null,
          release: body.release ?? null,
          version: body.version ?? null,
          session_id: body.sessionId ?? null,
          user_id: body.userId ?? null,
          metadata: body.metadata ? JSON.stringify(body.metadata) : "{}",
          parent_observation_id: body.parentObservationId ?? null,
          event_ts: event._enriched.eventTs.toISOString(),
          ingested_at: now.toISOString(),
        });
      }
    } catch (err) {
      failures.push({
        eventId: event.id,
        eventType: event.type,
        reason: err instanceof Error ? err.message : String(err),
        code: "CH_ERROR",
      });
    }
  }

  try {
    await writer.flush();
  } catch (err) {
    const flushError = err instanceof Error ? err.message : "ClickHouse flush failed";
    for (const event of events) {
      failures.push({
        eventId: event.id,
        eventType: event.type,
        reason: flushError,
        code: "CH_ERROR",
      });
    }
  }

  return failures;
}
