"use server"

import { executeQuery, isClickHouseConfigured } from "@/lib/integrations/clickhouse"
import { promises as fs } from "fs"
import path from "path"
import { cacheRoot } from "@/lib/cache/fs-cache"
import { listLocalSessions, type ChatSession } from "@/lib/chat/local-chat-store"

export async function getCachedRawPages() {
  const rawDir = path.join(cacheRoot(), "raw")
  try {
    const files = await fs.readdir(rawDir)
    return files.map(f => ({ filename: f }))
  } catch {
    return []
  }
}

export type ChatSessionsResult = {
  configured: boolean
  source: "local" | "clickhouse" | "merged"
  sessions: ChatSession[]
  error?: string
}

export async function getChatSessions(): Promise<ChatSessionsResult> {
  // Local disk is the durable source of truth — always available, survives restarts.
  const localSessions = await listLocalSessions()
  const configured = isClickHouseConfigured()

  if (!configured) {
    return { configured: false, source: "local", sessions: localSessions }
  }

  try {
    const remote = (await executeQuery(`
      SELECT session_id, title, status, created_at, updated_at
      FROM chat_sessions
      ORDER BY created_at DESC
      LIMIT 20
    `)) as ChatSession[]

    // Merge: local entries win, remote-only sessions are appended.
    const byId = new Map<string, ChatSession>()
    for (const session of remote) byId.set(session.session_id, session)
    for (const session of localSessions) byId.set(session.session_id, session)

    const sessions = [...byId.values()].sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    )

    return { configured: true, source: "merged", sessions }
  } catch (err) {
    // ClickHouse unreachable / table missing — fall back to durable local data.
    return {
      configured: true,
      source: "local",
      sessions: localSessions,
      error: String(err),
    }
  }
}
