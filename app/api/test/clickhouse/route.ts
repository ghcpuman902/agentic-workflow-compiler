import { NextResponse } from "next/server"

import {
  executeQuery,
  testClickHouseConnection,
} from "@/lib/integrations/clickhouse"

const ALLOWED_PREFIXES = [
  "SELECT",
  "SHOW",
  "DESCRIBE",
  "DESC",
  "EXPLAIN",
] as const

function isAllowedSql(sql: string): boolean {
  const normalized = sql.trim().replace(/;+\s*$/, "")
  const firstToken = normalized.split(/\s+/)[0]?.toUpperCase()
  return ALLOWED_PREFIXES.includes(
    firstToken as (typeof ALLOWED_PREFIXES)[number]
  )
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const action = body.action === "query" ? "query" : "ping"

    if (action === "ping") {
      const connected = await testClickHouseConnection()
      return NextResponse.json({
        ok: connected,
        envConfigured: Boolean(
          process.env.CLICKHOUSE_KEYID || process.env.CLICKHOUSE_USER
        ),
        message: connected
          ? "ClickHouse connection successful"
          : "ClickHouse connection failed",
      })
    }

    const sql = typeof body.sql === "string" ? body.sql.trim() : ""
    if (!sql) {
      return NextResponse.json({ error: "SQL is required" }, { status: 400 })
    }

    if (!isAllowedSql(sql)) {
      return NextResponse.json(
        {
          error:
            "Only read-only queries are allowed (SELECT, SHOW, DESCRIBE, EXPLAIN).",
        },
        { status: 400 }
      )
    }

    const result = await executeQuery(sql)
    return NextResponse.json({
      ok: true,
      envConfigured: Boolean(
        process.env.CLICKHOUSE_KEYID || process.env.CLICKHOUSE_USER
      ),
      result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
