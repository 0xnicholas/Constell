import { describe, expect, test } from "vitest";
import { enrichEvents } from "../../../server/ingestion/enrichment.js";
import type { IngestionEvent } from "../../../server/ingestion/types.js";

describe("enrichEvents", () => {
  test("calculates latency from startTime/endTime", () => {
    const events: IngestionEvent[] = [
      {
        id: "evt_1",
        type: "observation-create",
        timestamp: "2026-05-26T12:00:00Z",
        body: {
          id: "o1",
          traceId: "t1",
          type: "GENERATION",
          startTime: "2026-05-26T12:00:00.000Z",
          endTime: "2026-05-26T12:00:01.500Z",
        },
      },
    ];
    const enriched = enrichEvents(events);
    expect(enriched[0]._enriched.latencyMs).toBe(1500);
  });

  test("calculates total tokens from usage", () => {
    const events: IngestionEvent[] = [
      {
        id: "evt_1",
        type: "observation-create",
        timestamp: "2026-05-26T12:00:00Z",
        body: {
          id: "o1",
          traceId: "t1",
          type: "GENERATION",
          usage: { input: 10, output: 5 },
        },
      },
    ];
    const enriched = enrichEvents(events);
    expect(enriched[0]._enriched.totalTokens).toBe(15);
  });

  test("uses body.timestamp for trace eventTs", () => {
    const events: IngestionEvent[] = [
      {
        id: "evt_1",
        type: "trace-create",
        timestamp: "2026-05-26T12:00:00Z",
        body: { id: "t1", timestamp: "2026-05-26T11:59:59Z" },
      },
    ];
    const enriched = enrichEvents(events);
    expect(enriched[0]._enriched.eventTs.toISOString()).toBe("2026-05-26T11:59:59.000Z");
  });
});
