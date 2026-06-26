# Discover → Build test page

End-to-end test for the two-stage pipeline:

1. **Stage 1** — Paste up to 5 public URLs. Quick-check (`agent-browser read`) runs in parallel, then deep inspect (`open` + `snapshot` + `eval`).
2. **Pick output** — Document or Collection (Media / Browser session are visible but disabled).
3. **Stage 2** — Build runs Tavily Extract (Document) or Gemini codegen + in-process test/repair (Collection).
4. **Preview** — Output text, generated TS extractor (Collection), and trace summary (build vs run model calls, cache hits).

## Env

- `GOOGLE_GENERATIVE_AI_API_KEY` — Collection codegen + repair
- `TAVILY_API_KEY` — Document path
- ClickHouse optional — local JSONL traces always written to `.cache/traces/`

## Setup

```bash
pnpm install
./node_modules/.bin/agent-browser install   # one-time Chrome download for deep inspect
```

Quick-check works without Chrome; deep inspect degrades to markdown-only when Chrome is unavailable.
