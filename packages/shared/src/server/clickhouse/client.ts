import { createClient, type ClickHouseClient } from "@clickhouse/client";
import { parseEnv, type Env } from "../../env.js";

let _client: ClickHouseClient | null = null;

function createClickHouseClient(env: Env): ClickHouseClient {
  return createClient({
    url: env.CLICKHOUSE_URL,
    username: env.CLICKHOUSE_USER,
    password: env.CLICKHOUSE_PASSWORD,
    request_timeout: 30000,
    max_open_connections: 10,
  });
}

export function getClickHouseClient(): ClickHouseClient {
  if (!_client) {
    const env = parseEnv(process.env);
    _client = createClickHouseClient(env);
  }
  return _client;
}

export async function pingClickHouse(): Promise<boolean> {
  try {
    const result = await getClickHouseClient().ping();
    return result.success;
  } catch {
    return false;
  }
}
