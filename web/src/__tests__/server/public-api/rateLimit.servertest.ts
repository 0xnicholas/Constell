import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Redis from "ioredis";
import { checkRateLimit } from "~/features/public-api/server/rateLimit";

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_AUTH || "myredissecret",
  lazyConnect: true,
});

beforeAll(async () => {
  await redis.connect().catch(() => {});
  await redis.flushdb();
});

afterAll(async () => {
  await redis.quit();
});

describe("checkRateLimit", () => {
  it("allows requests under limit", async () => {
    const result = await checkRateLimit("test-key-1", {
      windowMs: 60_000,
      maxRequests: 5,
    });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("blocks requests over limit", async () => {
    const key = "test-key-2";
    for (let i = 0; i < 5; i++) {
      await checkRateLimit(key, { windowMs: 60_000, maxRequests: 5 });
    }
    const result = await checkRateLimit(key, {
      windowMs: 60_000,
      maxRequests: 5,
    });
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });
});
