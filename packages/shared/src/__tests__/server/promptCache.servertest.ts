import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  getPromptFromCache,
  setPromptInCache,
  invalidatePromptCache,
} from "../../server/promptCache";
import Redis from "ioredis";

const redis = new Redis({
  host: "localhost",
  port: 6379,
  password: "myredissecret",
  db: 9,
  maxRetriesPerRequest: 1,
});

describe("promptCache", () => {
  beforeAll(async () => {
    await redis.flushdb();
  });
  afterAll(async () => {
    await redis.flushdb();
    await redis.quit();
  });

  it("returns null for missing key", async () => {
    const result = await getPromptFromCache("proj-1", "greet", "latest", redis);
    expect(result).toBeNull();
  });

  it("sets and gets cached prompt", async () => {
    await setPromptInCache(
      "proj-1",
      "greet",
      "latest",
      { content: "Hello", config: {}, version: 1 },
      redis
    );
    const result = await getPromptFromCache("proj-1", "greet", "latest", redis);
    expect(result).toEqual({ content: "Hello", config: {}, version: 1 });
  });

  it("invalidates cached prompt", async () => {
    await setPromptInCache(
      "proj-1",
      "greet",
      "latest",
      { content: "Hi", config: null, version: 2 },
      redis
    );
    await invalidatePromptCache("proj-1", "greet", redis);
    const result = await getPromptFromCache("proj-1", "greet", "latest", redis);
    expect(result).toBeNull();
  });
});
