/**
 * Optional ClickHouse trace sink. Local JSONL is always written by trace.ts first.
 */
import { getClickHouseClient, isClickHouseConfigured } from "@/lib/integrations/clickhouse";
import { setTraceSink, type TraceEvent } from "@/lib/trace/trace";

let enabled = false;
let tableEnsured = false;

async function ensureTable(): Promise<void> {
  if (tableEnsured || !isClickHouseConfigured()) return;

  const client = getClickHouseClient();
  await client.command({
    query: `
      CREATE TABLE IF NOT EXISTS compiler_events (
        run_id String,
        stage String,
        phase String,
        kind String,
        payload String,
        ts DateTime64(3, 'UTC')
      )
      ENGINE = MergeTree()
      ORDER BY (run_id, ts)
    `,
  });
  tableEnsured = true;
}

async function insertEvent(event: TraceEvent): Promise<void> {
  if (!isClickHouseConfigured()) return;

  await ensureTable();

  const client = getClickHouseClient();
  await client.insert({
    table: "compiler_events",
    values: [
      {
        run_id: event.runId,
        stage: event.stage,
        phase: event.phase,
        kind: event.kind,
        payload: JSON.stringify(event.payload ?? {}),
        ts: event.ts.replace("T", " ").replace("Z", ""),
      },
    ],
    format: "JSONEachRow",
  });
}

/**
 * Mirror trace events to ClickHouse when credentials are configured.
 * Safe to call multiple times; subsequent calls are no-ops.
 */
export function enableClickHouseTrace(): void {
  if (enabled) return;
  if (!isClickHouseConfigured()) return;

  enabled = true;
  setTraceSink(insertEvent);
}

export function disableClickHouseTrace(): void {
  enabled = false;
  setTraceSink(null);
}
