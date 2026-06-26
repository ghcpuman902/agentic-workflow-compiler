# Tavily

Live web search used for discovering event pages and retrieving grounded source content.

## Env var

- `TAVILY_API_KEY`

## Wrapper

- `lib/integrations/tavily.ts` → `searchEventsWithTavily()`

## What it can do

- Search the open web with basic or advanced depth
- Return title, URL, content snippet, score, and optional raw page content
- Ground workflow discovery steps with real URLs instead of hallucinated links

## Test ideas

- "London AI hackathons next week"
- "Agentic AI meetups UK 2026"
- Toggle advanced search and raw content to compare payload size

## API route

`POST /api/test/tavily`

```json
{
  "query": "London AI hackathons next week",
  "searchDepth": "basic",
  "maxResults": 5,
  "includeRawContent": false
}
```
