import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConstellClient } from "../client";

describe("ConstellClient", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn(
      async () => new Response(JSON.stringify({ batchId: "job-1" }), { status: 202 })
    ) as unknown as typeof fetch;
  });

  it("sends a trace event", async () => {
    const client = new ConstellClient({
      baseUrl: "http://localhost:3000",
      publicKey: "pk",
      secretKey: "sk",
    });
    const traceId = client.trace({ name: "test-trace" });
    expect(traceId).toBeTruthy();
    await client.flush();
    expect(globalThis.fetch).toHaveBeenCalled();
    const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.batch[0].type).toBe("trace-create");
    expect(body.batch[0].body.name).toBe("test-trace");
  });

  it("sends an observation event", async () => {
    const client = new ConstellClient({
      baseUrl: "http://localhost:3000",
      publicKey: "pk",
      secretKey: "sk",
    });
    client.observation({ traceId: "trace-1", name: "span-1" });
    await client.flush();
    const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.batch[0].type).toBe("observation-create");
    expect(body.batch[0].body.traceId).toBe("trace-1");
  });
});
