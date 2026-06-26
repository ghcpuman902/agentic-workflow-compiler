import { getClickHouseClient, isClickHouseConfigured } from "@/lib/integrations/clickhouse";
import {
  saveLocalSession,
  saveLocalMessages,
  type ChatMessage,
  type ChatSession,
} from "@/lib/chat/local-chat-store";

let tablesEnsured = false;

const chTimestamp = (date: Date): string =>
  date.toISOString().replace("T", " ").replace("Z", "");

export async function ensureChatTables(): Promise<void> {
  if (tablesEnsured || !isClickHouseConfigured()) return;

  const client = getClickHouseClient();

  // Create chat_sessions
  await client.command({
    query: `
      CREATE TABLE IF NOT EXISTS chat_sessions (
        session_id String,
        title String,
        status String,
        created_at DateTime64(3, 'UTC'),
        updated_at DateTime64(3, 'UTC')
      ) ENGINE = MergeTree()
      ORDER BY (session_id, created_at)
    `,
  });

  // Create chat_messages
  await client.command({
    query: `
      CREATE TABLE IF NOT EXISTS chat_messages (
        message_id String,
        session_id String,
        role String,
        content String,
        metadata String,
        created_at DateTime64(3, 'UTC')
      ) ENGINE = MergeTree()
      ORDER BY (session_id, created_at)
    `,
  });

  tablesEnsured = true;
}

/** Best-effort mirror to ClickHouse; never throws (local store is source of truth). */
async function mirrorToClickHouse(
  session: ChatSession,
  messages: ChatMessage[],
): Promise<void> {
  if (!isClickHouseConfigured()) return;
  try {
    await ensureChatTables();
    const client = getClickHouseClient();
    await client.insert({
      table: "chat_sessions",
      values: [session],
      format: "JSONEachRow",
    });
    await client.insert({
      table: "chat_messages",
      values: messages,
      format: "JSONEachRow",
    });
  } catch (error) {
    console.error("ClickHouse chat mirror failed (local store kept):", error);
  }
}

export async function insertDemoSession(): Promise<string> {
  const now = chTimestamp(new Date());
  const sessionId = "demo-" + Date.now();

  const session: ChatSession = {
    session_id: sessionId,
    title: "Demo Chat Session",
    status: "active",
    created_at: now,
    updated_at: now,
  };

  const messages: ChatMessage[] = [
    {
      message_id: `${sessionId}-1`,
      session_id: sessionId,
      role: "user",
      content: "Hello, what can you do?",
      metadata: "{}",
      created_at: now,
    },
    {
      message_id: `${sessionId}-2`,
      session_id: sessionId,
      role: "assistant",
      content: "I am a simple demo chat bot. History is persisted locally and mirrored to ClickHouse.",
      metadata: "{}",
      created_at: now,
    },
  ];

  // Local disk is the durable source of truth (survives hot reloads/restarts).
  await saveLocalSession(session);
  await saveLocalMessages(messages);

  // ClickHouse is a best-effort cloud mirror.
  await mirrorToClickHouse(session, messages);

  return sessionId;
}
