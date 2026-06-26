import { getClickHouseClient, isClickHouseConfigured } from "@/lib/integrations/clickhouse";

let tablesEnsured = false;

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

export async function insertDemoSession() {
  if (!isClickHouseConfigured()) return;
  await ensureChatTables();

  const client = getClickHouseClient();
  const sessionId = "demo-" + Date.now();
  
  await client.insert({
    table: "chat_sessions",
    values: [
      {
        session_id: sessionId,
        title: "Demo Chat Session",
        status: "active",
        created_at: new Date().toISOString().replace("T", " ").replace("Z", ""),
        updated_at: new Date().toISOString().replace("T", " ").replace("Z", ""),
      }
    ],
    format: "JSONEachRow"
  });

  await client.insert({
    table: "chat_messages",
    values: [
      {
        message_id: "msg1",
        session_id: sessionId,
        role: "user",
        content: "Hello, what can you do?",
        metadata: "{}",
        created_at: new Date().toISOString().replace("T", " ").replace("Z", ""),
      },
      {
        message_id: "msg2",
        session_id: sessionId,
        role: "assistant",
        content: "I am a simple demo chat bot using ClickHouse!",
        metadata: "{}",
        created_at: new Date().toISOString().replace("T", " ").replace("Z", ""),
      }
    ],
    format: "JSONEachRow"
  });

  return sessionId;
}
