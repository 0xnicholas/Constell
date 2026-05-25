import { createClient } from "@clickhouse/client";
import { parseEnv } from "../../env.js";

const env = parseEnv(process.env);

export const clickhouse = createClient({
  url: env.CLICKHOUSE_URL,
  username: env.CLICKHOUSE_USER,
  password: env.CLICKHOUSE_PASSWORD,
  request_timeout: 30000,
  max_open_connections: 10,
});

export async function pingClickHouse(): Promise<boolean> {
  try {
    const result = await clickhouse.ping();
    return result.success;
  } catch {
    return false;
  }
}
