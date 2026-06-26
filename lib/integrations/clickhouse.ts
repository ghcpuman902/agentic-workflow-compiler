/**
 * ClickHouse API Integration Wrapper
 * Used to store workflow traces, node executions, test results, etc.
 *
 * Env resolution accepts either credential scheme:
 *   - CLICKHOUSE_KEYID / CLICKHOUSE_KEYSECRET (ClickHouse Cloud API keys), or
 *   - CLICKHOUSE_USER / CLICKHOUSE_PASSWORD (classic username/password).
 * Username falls back to KEYID, then "default".
 */
import { createClient, ClickHouseClient } from "@clickhouse/client";

let clickhouseClient: ClickHouseClient | null = null;

type ClickHouseEnv = {
  url: string;
  username: string;
  password: string;
};

/**
 * Resolve ClickHouse connection settings from either env scheme.
 * Returns null when configuration is missing/placeholder (caller decides how to
 * degrade — e.g. tracing no-ops, health check returns false).
 */
export function resolveClickHouseEnv(): ClickHouseEnv | null {
  const url = process.env.CLICKHOUSE_URL;
  const password =
    process.env.CLICKHOUSE_KEYSECRET || process.env.CLICKHOUSE_PASSWORD;
  const username =
    process.env.CLICKHOUSE_USER || process.env.CLICKHOUSE_KEYID || "default";

  if (
    !url ||
    !password ||
    password === "<put_your_password_here>"
  ) {
    return null;
  }

  return { url, username, password };
}

/** True when ClickHouse credentials are present and usable. */
export function isClickHouseConfigured(): boolean {
  return resolveClickHouseEnv() !== null;
}

export function getClickHouseClient(): ClickHouseClient {
  if (clickhouseClient) return clickhouseClient;

  const env = resolveClickHouseEnv();
  if (!env) {
    throw new Error(
      "ClickHouse env missing: set CLICKHOUSE_URL plus CLICKHOUSE_KEYSECRET (with CLICKHOUSE_KEYID) or CLICKHOUSE_PASSWORD (with CLICKHOUSE_USER)."
    );
  }

  clickhouseClient = createClient({
    url: env.url,
    username: env.username,
    password: env.password,
  });

  return clickhouseClient;
}

/**
 * Run a read-only query and return the rows (JSONEachRow).
 * Satisfies the import in app/api/test/clickhouse/route.ts.
 */
export async function executeQuery(sql: string): Promise<any[]> {
  const client = getClickHouseClient();
  const resultSet = await client.query({
    query: sql,
    format: "JSONEachRow",
  });
  const rows = await resultSet.json();
  return Array.isArray(rows) ? rows : [];
}

/**
 * Basic health check to confirm connection.
 */
export async function testClickHouseConnection(): Promise<boolean> {
  try {
    const result = await executeQuery("SELECT 1 AS ok");
    return Array.isArray(result) && result.length > 0;
  } catch (error) {
    console.error("ClickHouse connection error:", error);
    return false;
  }
}
