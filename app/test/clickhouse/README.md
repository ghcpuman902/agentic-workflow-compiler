# ClickHouse

Tracing and metrics store for workflow runs, node executions, and build-time telemetry.

## Env vars

- `CLICKHOUSE_KEYID` (or `CLICKHOUSE_USER`)
- `CLICKHOUSE_KEYSECRET` (or `CLICKHOUSE_PASSWORD`)

## Wrapper

- `lib/integrations/clickhouse.ts` → `testClickHouseConnection()`, `executeQuery()`

## What it can do

- Ping the managed ClickHouse query endpoint
- Run read-only SQL (SELECT, SHOW, DESCRIBE, EXPLAIN)
- Store workflow traces and compare agentic build cost vs deterministic rerun cost

## Test ideas

- Ping: `SELECT 1 AS ok`
- List tables: `SHOW TABLES`
- Inspect schema once tables exist

## API route

`POST /api/test/clickhouse`

Ping:

```json
{ "action": "ping" }
```

Query:

```json
{ "action": "query", "sql": "SELECT 1 AS ok" }
```
