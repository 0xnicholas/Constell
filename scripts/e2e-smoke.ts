/**
 * End-to-end smoke test for v0.3.0-alpha tracing pipeline.
 *
 * Prerequisites:
 *   1. Web app running:  `pnpm run dev:web`
 *   2. Worker running:   `pnpm run dev:worker`
 *   3. Redis running:    `pnpm run infra:dev:up`
 *   4. An API key exists in the DB for a project (run `npx tsx scripts/seed-smoke.ts` first)
 *
 * Usage:
 *   SMOKE_PUBLIC_KEY=pk_test SMOKE_SECRET_KEY=sk_test npx tsx scripts/e2e-smoke.ts
 */

import { ConstellClient } from "../sdk/typescript/src/client";

const BASE_URL = process.env.SMOKE_BASE_URL || "http://localhost:3000";
const PUBLIC_KEY = process.env.SMOKE_PUBLIC_KEY || "pk_test";
const SECRET_KEY = process.env.SMOKE_SECRET_KEY || "sk_test";

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const traceId = `smoke-trace-${Date.now()}`;
  const obsId = `smoke-obs-${Date.now()}`;

  console.log("[smoke] Sending trace + observation via SDK…");
  const client = new ConstellClient({
    baseUrl: BASE_URL,
    publicKey: PUBLIC_KEY,
    secretKey: SECRET_KEY,
    flushIntervalMs: 100,
  });

  client.trace({
    id: traceId,
    name: "Smoke Test Trace",
    userId: "smoke-user",
    tags: ["smoke"],
  });

  client.observation({
    id: obsId,
    traceId,
    name: "Smoke Span",
    type: "SPAN",
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 123).toISOString(),
    input: { query: "hello" },
    output: { response: "world" },
    usage: { input: 10, output: 5, total: 15 },
  });

  await client.flush();
  console.log("[smoke] SDK flush complete.");

  console.log("[smoke] Waiting 3s for worker to process…");
  await sleep(3000);

  // Verify via tRPC (public-api style, using API key)
  // ctx.projectId is resolved from the API key; we don't need to pass projectId in input.
  const auth = Buffer.from(`${PUBLIC_KEY}:${SECRET_KEY}`).toString("base64");

  console.log("[smoke] Querying trace list…");
  const listRes = await fetch(
    `${BASE_URL}/api/trpc/traces.list?input=${encodeURIComponent(JSON.stringify({ limit: 10, offset: 0 }))}`,
    { headers: { Authorization: `Basic ${auth}` } }
  );
  const listJson = await listRes.json();
  const traces = listJson.result?.data?.traces ?? [];
  const found = traces.find((t: { id: string }) => t.id === traceId);

  if (!found) {
    console.error(
      "[smoke] ❌ Trace not found in list response:",
      JSON.stringify(listJson, null, 2)
    );
    process.exit(1);
  }
  console.log("[smoke] ✅ Trace found in list:", found.id);

  console.log("[smoke] Querying trace detail…");
  const detailRes = await fetch(
    `${BASE_URL}/api/trpc/traces.detail?input=${encodeURIComponent(JSON.stringify({ traceId }))}`,
    { headers: { Authorization: `Basic ${auth}` } }
  );
  const detailJson = await detailRes.json();
  const trace = detailJson.result?.data?.trace;

  if (!trace) {
    console.error(
      "[smoke] ❌ Trace not found in detail response:",
      JSON.stringify(detailJson, null, 2)
    );
    process.exit(1);
  }

  const obsCount = trace.observations?.length ?? 0;
  if (obsCount === 0) {
    console.error("[smoke] ❌ No observations in trace detail");
    process.exit(1);
  }

  console.log("[smoke] ✅ Trace detail returned with", obsCount, "observation(s)");
  console.log("[smoke] ✅ All checks passed!");
}

main().catch((err) => {
  console.error("[smoke] ❌ Unhandled error:", err);
  process.exit(1);
});
