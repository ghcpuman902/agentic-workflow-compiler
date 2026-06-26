# Sponsor Tool Test Lab

Internal pages for validating sponsor integrations and pipeline stages before wiring them into the full workspace UI (which is a separate workstream).

## Available tools / stages

- Tavily - live web search and grounded source/document extraction (powers the Document path)
- ClickHouse - workflow traces, metrics, and query storage
- Gemini LLM - build-time schema inference and TypeScript extractor generation
- Discover - Stage 1: paste up to 5 URLs, run headless structural discovery, see page roles + Document/Collection suggestions, then build (Stage 2)

## How to use

1. Ensure credentials are set in `.env.local` (see `.env.example`).
2. Open `/test` directly in the browser - these pages are not linked from the landing page.
3. Run each tool's health check or sample query and inspect the JSON response panel.

## Routes

- `/test/tavily`
- `/test/clickhouse`
- `/test/llm`
- `/test/discover` - paste URLs -> discovery suggestions -> pick output family/format -> build preview

See [docs/06-two-stage-pipeline.md](../../docs/06-two-stage-pipeline.md) for the canonical pipeline spec.
