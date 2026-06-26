import { insertDemoSession } from "@/lib/chat/clickhouse-chat"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const sessionId = await insertDemoSession()
    return NextResponse.json({ success: true, sessionId })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
