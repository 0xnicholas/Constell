import { type IngestionEvent, type ProcessingFailure } from "./types.js";
import { ingestionEventSchema } from "./schemas.js";

export interface ValidationResult {
  valid: IngestionEvent[];
  invalid: ProcessingFailure[];
}

export function validateEvents(batch: unknown[]): ValidationResult {
  const valid: IngestionEvent[] = [];
  const invalid: ProcessingFailure[] = [];

  for (const raw of batch) {
    const parsed = ingestionEventSchema.safeParse(raw);
    if (!parsed.success) {
      invalid.push({
        eventId: ((raw as Record<string, unknown>)?.id as string) ?? "unknown",
        eventType: ((raw as Record<string, unknown>)?.type as string) ?? "unknown",
        reason: parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "),
        code: "VALIDATION_ERROR",
      });
      continue;
    }

    valid.push(parsed.data);
  }

  return { valid, invalid };
}

export interface CrossValidationResult {
  valid: IngestionEvent[];
  invalid: ProcessingFailure[];
}

/**
 * Cross-validate that observation-create events reference existing traces
 * (either in PostgreSQL or in the same batch's trace-create events).
 */
export function crossValidateTraceReferences(
  events: IngestionEvent[],
  existingTraceIds: Set<string>
): CrossValidationResult {
  const valid: IngestionEvent[] = [];
  const invalid: ProcessingFailure[] = [];

  const batchTraceIds = new Set(
    events.filter((e) => e.type === "trace-create").map((e) => (e.body as { id: string }).id)
  );

  const allTraceIds = new Set([...existingTraceIds, ...batchTraceIds]);

  for (const event of events) {
    if (event.type === "observation-create" || event.type === "score-create") {
      const body = event.body as { traceId: string };
      if (!allTraceIds.has(body.traceId)) {
        invalid.push({
          eventId: event.id,
          eventType: event.type,
          reason: `Trace ID "${body.traceId}" not found (must be created before or in same batch)`,
          code: "TRACE_NOT_FOUND",
        });
        continue;
      }
    }
    valid.push(event);
  }

  return { valid, invalid };
}
