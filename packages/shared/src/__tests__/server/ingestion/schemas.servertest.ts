import { describe, expect, test } from "vitest";
import {
  ingestionBatchSchema,
  ingestionEventSchema,
  observationCreateBodySchema,
  traceCreateBodySchema,
} from "../../../server/ingestion/schemas.js";

describe("traceCreateBodySchema", () => {
  test("validates minimal trace", () => {
    const result = traceCreateBodySchema.safeParse({ id: "trace_001" });
    expect(result.success).toBe(true);
  });

  test("rejects missing id", () => {
    const result = traceCreateBodySchema.safeParse({ name: "test" });
    expect(result.success).toBe(false);
  });
});

describe("observationCreateBodySchema", () => {
  test("validates generation observation", () => {
    const result = observationCreateBodySchema.safeParse({
      id: "gen_001",
      traceId: "trace_001",
      type: "GENERATION",
      model: "gpt-4o",
    });
    expect(result.success).toBe(true);
  });

  test("rejects invalid type", () => {
    const result = observationCreateBodySchema.safeParse({
      id: "gen_001",
      traceId: "trace_001",
      type: "INVALID",
    });
    expect(result.success).toBe(false);
  });
});

describe("ingestionBatchSchema", () => {
  test("validates batch with trace + observation", () => {
    const result = ingestionBatchSchema.safeParse({
      batch: [
        {
          id: "evt_001",
          type: "trace-create",
          timestamp: "2026-05-26T12:00:00Z",
          body: { id: "trace_001" },
        },
        {
          id: "evt_002",
          type: "observation-create",
          timestamp: "2026-05-26T12:00:01Z",
          body: {
            id: "gen_001",
            traceId: "trace_001",
            type: "GENERATION",
            model: "gpt-4o",
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  test("rejects batch > 100 events", () => {
    const batch = Array.from({ length: 101 }, (_, i) => ({
      id: `evt_${i}`,
      type: "trace-create" as const,
      timestamp: "2026-05-26T12:00:00Z",
      body: { id: `trace_${i}` },
    }));
    const result = ingestionBatchSchema.safeParse({ batch });
    expect(result.success).toBe(false);
  });
});
