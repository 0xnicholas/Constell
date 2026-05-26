import { type IngestionEvent, type ObservationCreateBody } from "./types.js";

export interface EnrichedEvent extends IngestionEvent {
  _enriched: {
    eventTs: Date;
    latencyMs: number | null;
    totalTokens: number | null;
    calculatedCost: number | null;
  };
}

export function enrichEvents(events: IngestionEvent[]): EnrichedEvent[] {
  return events.map((event) => {
    const eventTs = parseTimestamp(event);
    const latencyMs = calculateLatency(event);
    const totalTokens = calculateTotalTokens(event);

    return {
      ...event,
      _enriched: {
        eventTs,
        latencyMs,
        totalTokens,
        calculatedCost: null, // set by cost calculator in worker
      },
    };
  });
}

function parseTimestamp(event: IngestionEvent): Date {
  // Priority: body.timestamp > event.timestamp > now()
  if (event.type === "trace-create") {
    const body = event.body as { timestamp?: string };
    if (body.timestamp) return new Date(body.timestamp);
  }
  if (event.type === "observation-create") {
    const body = event.body as { startTime?: string };
    if (body.startTime) return new Date(body.startTime);
  }
  return new Date(event.timestamp);
}

function calculateLatency(event: IngestionEvent): number | null {
  if (event.type !== "observation-create") return null;
  const body = event.body as ObservationCreateBody;
  if (body.startTime && body.endTime) {
    const start = new Date(body.startTime).getTime();
    const end = new Date(body.endTime).getTime();
    return Math.max(0, end - start);
  }
  return null;
}

function calculateTotalTokens(event: IngestionEvent): number | null {
  if (event.type !== "observation-create") return null;
  const body = event.body as ObservationCreateBody;
  if (!body.usage) return null;
  if (body.usage.total !== undefined) return body.usage.total;
  if (body.usage.input !== undefined && body.usage.output !== undefined) {
    return body.usage.input + body.usage.output;
  }
  return null;
}
