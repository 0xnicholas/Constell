import { describe, expect, test } from "vitest";
import {
  crossValidateTraceReferences,
  validateEvents,
} from "../../../server/ingestion/validation.js";
import type { IngestionEvent } from "../../../server/ingestion/types.js";

describe("validateEvents", () => {
  test("accepts valid events", () => {
    const result = validateEvents([
      {
        id: "evt_1",
        type: "trace-create",
        timestamp: "2026-05-26T12:00:00Z",
        body: { id: "t1" },
      },
    ]);
    expect(result.valid).toHaveLength(1);
    expect(result.invalid).toHaveLength(0);
  });

  test("rejects invalid event", () => {
    const result = validateEvents([
      {
        id: "evt_1",
        type: "invalid-type",
        timestamp: "2026-05-26T12:00:00Z",
        body: {},
      },
    ]);
    expect(result.valid).toHaveLength(0);
    expect(result.invalid).toHaveLength(1);
    expect(result.invalid[0].code).toBe("VALIDATION_ERROR");
  });
});

describe("crossValidateTraceReferences", () => {
  test("allows observation referencing trace in same batch", () => {
    const events: IngestionEvent[] = [
      {
        id: "evt_1",
        type: "trace-create",
        timestamp: "2026-05-26T12:00:00Z",
        body: { id: "t1" },
      },
      {
        id: "evt_2",
        type: "observation-create",
        timestamp: "2026-05-26T12:00:01Z",
        body: { id: "o1", traceId: "t1", type: "SPAN" },
      },
    ];
    const result = crossValidateTraceReferences(events, new Set());
    expect(result.valid).toHaveLength(2);
    expect(result.invalid).toHaveLength(0);
  });

  test("allows observation referencing existing trace", () => {
    const events: IngestionEvent[] = [
      {
        id: "evt_2",
        type: "observation-create",
        timestamp: "2026-05-26T12:00:01Z",
        body: { id: "o1", traceId: "t1", type: "SPAN" },
      },
    ];
    const result = crossValidateTraceReferences(events, new Set(["t1"]));
    expect(result.valid).toHaveLength(1);
    expect(result.invalid).toHaveLength(0);
  });

  test("rejects observation with missing trace reference", () => {
    const events: IngestionEvent[] = [
      {
        id: "evt_2",
        type: "observation-create",
        timestamp: "2026-05-26T12:00:01Z",
        body: { id: "o1", traceId: "missing", type: "SPAN" },
      },
    ];
    const result = crossValidateTraceReferences(events, new Set());
    expect(result.valid).toHaveLength(0);
    expect(result.invalid).toHaveLength(1);
    expect(result.invalid[0].code).toBe("TRACE_NOT_FOUND");
  });
});
