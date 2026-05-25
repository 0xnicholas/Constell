import { expect, test } from "vitest";
import { parseEnv } from "../env.js";

test("parseEnv validates required vars", () => {
  const env = parseEnv({
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://localhost:5432/test",
    CLICKHOUSE_URL: "http://localhost:8123",
    SALT: "testsalt",
    ENCRYPTION_KEY: "0".repeat(64),
  });
  expect(env.NODE_ENV).toBe("test");
  expect(env.REDIS_PORT).toBe(6379);
});
