import { test, expect } from "vitest";
import { zeroSummary } from "../../../server/api/routers/metrics";

test("zeroSummary returns all zeros with string totalCost", () => {
  expect(zeroSummary()).toEqual({
    traceCount: 0,
    totalTokens: 0,
    totalCost: "0",
    avgLatencyMs: 0,
    p95LatencyMs: 0,
    errorCount: 0,
    errorRate: 0,
  });
});
