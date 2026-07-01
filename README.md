# Agentic Workflow Compiler

**Winner — Best Use of Cursor & Overall** · [tokens& Multiagents Hackathon](https://devpost.com/hackathons) (London, June 2026)

Paste live URLs into a node graph. Agents discover data shapes, compile tested TypeScript extractors, and freeze reusable workflows — **agentic at build time, deterministic at run time.**

| | |
|---|---|
| **Devpost** | [devpost.com/software/asdfsad](https://devpost.com/software/asdfsad) — demo video, screenshots, and submission story |
| **GitHub** | [github.com/ghcpuman902/agentic-workflow-compiler](https://github.com/ghcpuman902/agentic-workflow-compiler) |

---

## What it is

Most AI workflow tools keep an LLM in the loop on every run: trigger → reason → tool → reason → result. That works for one-offs, but it is expensive, slow, and non-deterministic for repeated jobs like scraping the same site every day.

**Agentic Workflow Compiler** flips the model: agents design the automation once; frozen TypeScript runs it forever.

A Blender-inspired node editor where you:

1. **Paste public URLs** (Cannes Film Festival pages ship as the default demo).
2. **Press Play on Discover** — `agent-browser` inspects live pages (accessibility tree, JSON-LD, repeated DOM patterns) and suggests semantic output types (Document vs Collection).
3. **Autonomous build loop** — the system generates a typed extractor, tests it against live URLs, and repairs failures without manual intervention.
4. **Freeze a Spider node** — a reusable, deterministic workflow artefact you can re-run without calling an LLM.

Two output paths ship in this MVP:

- **Document** — Tavily Extract turns pages into clean Markdown (article-like structure).
- **Collection** — Gemini (or a **Cursor agent** via `@cursor/sdk`) writes a plain JS `run(input)` extractor, tested and repaired across your URL set.

---

## Hackathon snapshot

This repository is preserved as the **hackathon submission snapshot** — the state of the project at the end of the tokens& Multiagents Hackathon, including what we demoed on [Devpost](https://devpost.com/software/asdfsad).

We plan to continue development in a **separate repository** with a clearer name and a longer-term roadmap (scheduling, cloud workers, marketplace, etc.). When that repo is ready, this README will link to it. Until then, clone and run from here.

---

## Quick start

**Requirements:** Node.js 20+, [pnpm](https://pnpm.io/), Chrome for deep page inspection (via agent-browser).

```bash
git clone https://github.com/ghcpuman902/agentic-workflow-compiler.git
cd agentic-workflow-compiler
pnpm install
pnpm exec agent-browser install   # one-time Chrome download for deep inspect
cp .env.example .env.local        # then fill in API keys (see below)
pnpm dev                          # http://localhost:3121
```

### Environment variables

Copy [`.env.example`](.env.example) to `.env.local`:

| Variable | Purpose |
|----------|---------|
| `TAVILY_API_KEY` | Document path — Tavily Extract for live web → Markdown |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Schema inference, codegen, repair fallback |
| `CURSOR_API_KEY` | Stage 2 build/repair via Cursor Agent SDK (optional; falls back to Gemini) |
| `CLICKHOUSE_URL`, `CLICKHOUSE_KEYID`, `CLICKHOUSE_KEYSECRET` | Optional trace sink (local JSONL always works) |
| `DISCOVERY_CONFIDENCE_THRESHOLD` | Quick discover stop threshold (default `0.55`) |

### Demo flow

1. Open the canvas at `http://localhost:3121`.
2. Connect a **Text** node with 2–5 public URLs to a **Discover Factory** node.
3. Press **Play** — watch Stage 1 discovery, pick Document or Collection, then let the build loop compile and test the extractor.
4. Materialize the **Spider** node and re-run across URLs — no LLM calls in the run phase.

See [`docs/03-hackathon-scope-and-demo.md`](docs/03-hackathon-scope-and-demo.md) for the full demo script.

---

## Architecture

```text
Paste URLs → Discover (agent-browser) → Choose output family
    → Build (Cursor agent / Gemini) → Test → Repair → Freeze Spider
    → Run (deterministic, no LLM)
```

| Stage | What happens |
|-------|----------------|
| **Stage 1 — Discover** | Quick HTTP read + optional Chrome deep inspect; infer page roles and suggest Document vs Collection |
| **Stage 2 — Build** | Generate extractor, run golden tests, auto-repair on failure |
| **Run** | Execute frozen tool across all URLs in a sandbox — zero model calls |

Canonical spec: [`docs/06-two-stage-pipeline.md`](docs/06-two-stage-pipeline.md)

---

## Built with

Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · React Flow · [agent-browser](https://agent-browser.dev) · Tavily · Google Gemini (AI SDK) · [Cursor Agent SDK](https://www.npmjs.com/package/@cursor/sdk) · ClickHouse (optional traces) · pnpm

### Sponsor integrations (hackathon)

- **Tavily** — Document path extraction
- **Cursor** — Primary Stage 2 build/repair loop when `CURSOR_API_KEY` is set

---

## Documentation

| Doc | Description |
|-----|-------------|
| [`docs/01-overall-context.md`](docs/01-overall-context.md) | Vision, thesis, roadmap |
| [`docs/02-architecture-and-models.md`](docs/02-architecture-and-models.md) | System design |
| [`docs/03-hackathon-scope-and-demo.md`](docs/03-hackathon-scope-and-demo.md) | MVP scope and demo script |
| [`docs/06-two-stage-pipeline.md`](docs/06-two-stage-pipeline.md) | Discover → Build pipeline spec |
| [`docs/hackathon-submission-draft.md`](docs/hackathon-submission-draft.md) | Original Devpost submission copy |

---

## What's not in this MVP

Media extraction, authenticated browser sessions, cloud scheduling, workflow marketplace, and full ClickHouse analytics UI are documented as post-hackathon roadmap items — visible in the UI but disabled or scaffolded only.

---

## License

No license file is included in this hackathon snapshot. Contact the repository owner before reuse.
