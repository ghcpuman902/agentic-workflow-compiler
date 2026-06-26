# Plan: ClickHouse-Backed Chat History & Analytics UI

Based on our post-hackathon roadmap and the "Tab 3: active/inactive chat history" requirement, here is the detailed plan to add chat history and analytics using ClickHouse.

## 1. ClickHouse Schema Design

We need to create the tables that will store our chat sessions, messages, and analytics. 
We'll update our ClickHouse sink or create a new one specifically for chat.

```sql
-- Table for Chat Sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
  session_id String,
  title String,
  status String, -- 'active', 'inactive'
  created_at DateTime64(3, 'UTC'),
  updated_at DateTime64(3, 'UTC')
) ENGINE = MergeTree()
ORDER BY (session_id, created_at);

-- Table for Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
  message_id String,
  session_id String,
  role String, -- 'user', 'assistant', 'system'
  content String,
  metadata String, -- JSON string for extra context (e.g., token usage)
  created_at DateTime64(3, 'UTC')
) ENGINE = MergeTree()
ORDER BY (session_id, created_at);
```

## 2. API Endpoints

We'll use Vercel AI SDK and ClickHouse client to manage these conversations.

### `POST /api/chat`
Handles sending messages to the LLM and saving the response.
```typescript
// Pseudocode
export async function POST(req: Request) {
  const { messages, sessionId } = await req.json();
  
  // 1. Save user message to ClickHouse
  await insertChatMessage({ sessionId, role: 'user', content: messages.at(-1).content });
  
  // 2. Call LLM via Vercel AI SDK
  const response = await streamText({
    model: gemini('gemini-2.5-flash'),
    messages,
    onFinish: async (result) => {
      // 3. Save assistant message to ClickHouse on finish
      await insertChatMessage({ 
        sessionId, 
        role: 'assistant', 
        content: result.text,
        metadata: JSON.stringify(result.usage)
      });
    }
  });
  
  return response.toDataStreamResponse();
}
```

### `GET /api/chat/history?sessionId=...`
Fetches historical messages from ClickHouse.
```typescript
// Pseudocode
export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get('sessionId');
  const messages = await executeQuery(`
    SELECT * FROM chat_messages 
    WHERE session_id = '${sessionId}' 
    ORDER BY created_at ASC
  `);
  return Response.json({ messages });
}
```

## 3. Frontend Implementation (Tab 3: Chat History)

We will build the `ChatHistoryTab` and integrate it into the main UI.

### Components Needed:
1. **`ChatPanel`**: The main container for Tab 3.
2. **`MessageList`**: Renders user and assistant messages, utilizing Tailwind CSS for styling.
3. **`ChatInput`**: A form for users to send new messages.
4. **`SessionSidebar`**: A list of past chat sessions (active/inactive).

```tsx
// Pseudocode for ChatPanel
export const ChatPanel = () => {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat',
    initialMessages: fetchedHistory // Fetched from /api/chat/history
  });

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
            <span className="inline-block p-2 rounded-md bg-muted">
              {msg.content}
            </span>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <input 
          value={input} 
          onChange={handleInputChange} 
          className="w-full p-2 border rounded" 
          placeholder="Type a message..."
        />
      </form>
    </div>
  );
};
```

## 4. Analytics UI Integration

Since we promised "Full ClickHouse-backed chat history / analytics UI", we'll also add a small analytics panel.
This will query the existing `compiler_events` and the new `chat_messages` tables to show:
- Total LLM model calls (build vs run).
- Tokens used (parsed from `metadata`).
- Workflow execution times.

### `GET /api/analytics`
```typescript
// Pseudocode
export async function GET() {
  const metrics = await executeQuery(`
    SELECT 
      count(*) as total_events,
      stage
    FROM compiler_events
    GROUP BY stage
  `);
  return Response.json({ metrics });
}
```

## Summary of Steps:
1. **Setup ClickHouse Tables** in `lib/trace/clickhouse-sink.ts` (or a new `clickhouse-chat.ts`).
2. **Create the CRUD functions** for chat data (insert session, insert message, fetch messages).
3. **Build the API Routes** (`/api/chat` and `/api/chat/history`).
4. **Implement the UI** (Tab 3: Chat History components).
5. **Connect AI SDK** for real-time streaming and background ClickHouse saving.
6. **Add the Analytics View** to show build vs run metrics from ClickHouse.
