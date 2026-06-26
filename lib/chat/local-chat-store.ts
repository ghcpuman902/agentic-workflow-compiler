/**
 * Durable local chat store.
 *
 * Persists chat sessions + messages to a single JSON file under `.cache/chat/`.
 * Unlike module-level state, this survives Fast Refresh / hot reloads and full
 * dev-server restarts, so a generated session is never "destroyed on code edit".
 * ClickHouse is treated as a best-effort cloud mirror (see clickhouse-chat.ts).
 */
import { promises as fs } from "fs"
import path from "path"
import { cacheRoot } from "@/lib/cache/fs-cache"

export type ChatSession = {
  session_id: string
  title: string
  status: string
  created_at: string
  updated_at: string
}

export type ChatMessage = {
  message_id: string
  session_id: string
  role: string
  content: string
  metadata: string
  created_at: string
}

type ChatStore = {
  sessions: ChatSession[]
  messages: ChatMessage[]
}

const CHAT_DIR = path.join(cacheRoot(), "chat")
const STORE_PATH = path.join(CHAT_DIR, "store.json")

const emptyStore: ChatStore = { sessions: [], messages: [] }

/** Serialize writes so concurrent server actions don't clobber the file. */
let writeQueue: Promise<void> = Promise.resolve()

async function readStore(): Promise<ChatStore> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf-8")
    const parsed = JSON.parse(raw) as Partial<ChatStore>
    return {
      sessions: parsed.sessions ?? [],
      messages: parsed.messages ?? [],
    }
  } catch {
    return { ...emptyStore }
  }
}

async function writeStore(store: ChatStore): Promise<void> {
  await fs.mkdir(CHAT_DIR, { recursive: true })
  const tmpPath = `${STORE_PATH}.${process.pid}.tmp`
  await fs.writeFile(tmpPath, JSON.stringify(store, null, 2), "utf-8")
  await fs.rename(tmpPath, STORE_PATH)
}

function enqueueWrite(mutate: (store: ChatStore) => void): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    const store = await readStore()
    mutate(store)
    await writeStore(store)
  })
  return writeQueue
}

export async function listLocalSessions(limit = 20): Promise<ChatSession[]> {
  const store = await readStore()
  return [...store.sessions]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit)
}

export async function getLocalMessages(sessionId: string): Promise<ChatMessage[]> {
  const store = await readStore()
  return store.messages
    .filter((message) => message.session_id === sessionId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
}

export async function saveLocalSession(session: ChatSession): Promise<void> {
  await enqueueWrite((store) => {
    const index = store.sessions.findIndex(
      (existing) => existing.session_id === session.session_id,
    )
    if (index >= 0) {
      store.sessions[index] = session
      return
    }
    store.sessions.push(session)
  })
}

export async function saveLocalMessages(messages: ChatMessage[]): Promise<void> {
  await enqueueWrite((store) => {
    for (const message of messages) {
      const index = store.messages.findIndex(
        (existing) => existing.message_id === message.message_id,
      )
      if (index >= 0) {
        store.messages[index] = message
        continue
      }
      store.messages.push(message)
    }
  })
}
