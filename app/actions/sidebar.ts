"use server"

import { executeQuery, isClickHouseConfigured } from "@/lib/integrations/clickhouse"
import { promises as fs } from "fs"
import path from "path"
import { cacheRoot } from "@/lib/cache/fs-cache"

export async function getCachedRawPages() {
  const rawDir = path.join(cacheRoot(), "raw")
  try {
    const files = await fs.readdir(rawDir)
    return files.map(f => ({ filename: f }))
  } catch {
    return []
  }
}

export async function getChatSessions() {
  if (!isClickHouseConfigured()) {
    return { configured: false, sessions: [] }
  }

  try {
    // Basic query to fetch sessions if they exist
    const sessions = await executeQuery(`
      SELECT session_id, title, status, created_at 
      FROM chat_sessions 
      ORDER BY created_at DESC 
      LIMIT 10
    `)
    return { configured: true, sessions }
  } catch (err) {
    // Table might not exist yet
    return { configured: true, sessions: [], error: String(err) }
  }
}
