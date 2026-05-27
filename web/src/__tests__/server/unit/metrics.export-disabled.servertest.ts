import { test, expect } from "vitest";
import { metricsRouter } from "../../../server/api/routers/metrics";

test("metrics.export throws 503 when batch export is disabled", async () => {
  const original = process.env.CONSTELL_S3_BATCH_EXPORT_ENABLED;
  process.env.CONSTELL_S3_BATCH_EXPORT_ENABLED = "false";

  const ctx = {
    session: {
      user: { id: "u1", email: "a@b.com", name: null, image: null },
      projectId: "proj-test",
      expires: "2099-01-01",
    },
    apiKey: null,
  };
  const caller = metricsRouter.createCaller(ctx as any);

  await expect(
    caller.export({
      projectId: "proj-test",
      from: "2026-01-01T00:00:00Z",
      to: "2026-01-02T00:00:00Z",
      format: "jsonl",
      scope: "traces",
    })
  ).rejects.toThrow("Batch export is not enabled");

  process.env.CONSTELL_S3_BATCH_EXPORT_ENABLED = original;
});
