# Multiagents Hackathon — Devpost submission draft

**Deadline:** 26 Jun 2026 @ 4:30pm GMT+1  
**Repo:** https://github.com/ghcpuman902/agentic-workflow-compiler  
**Prizes to enter:** Best Use of Tavily Search · Best Use of Cursor  
*(ClickHouse: optional trace sink only — skip that prize unless you wire it before submit)*

---

## 20-minute action plan

| Min | Task |
|-----|------|
| 0–3 | `git add` + commit + push to `master` (public repo required) |
| 3–8 | Record Chrome demo at `http://localhost:3121` (see script below) |
| 8–12 | Upload to YouTube (Unlisted), copy link |
| 12–18 | Paste fields below into Devpost |
| 18–20 | Double-check GitHub link, video embed, sponsor checkboxes, Submit |

---

## General info

### Project name
```
Agentic Workflow Compiler
```

### Elevator pitch (≤200 chars)
```
Paste live URLs into a node graph. Agents discover data shapes, compile tested TypeScript extractors, and freeze reusable workflows—agentic at build time, deterministic at run time.
```
*(196 characters)*

---

## Project Story — About the project

Copy everything between the lines:

---

Most AI workflow tools keep an LLM in the loop on every run: trigger → reason → tool → reason → result. That works for one-offs, but it is expensive, slow, and non-deterministic for repeated jobs like scraping the same site every day.

**Agentic Workflow Compiler** flips the model: **agents design the automation once; frozen TypeScript runs it forever.**

### What we built (hackathon MVP)

A Blender-inspired node editor where you:

1. **Paste public URLs** (we ship Cannes Film Festival film pages as the default demo).
2. **Press Play on Discover** — a browser agent (`agent-browser`) inspects live pages (accessibility tree, JSON-LD, repeated DOM patterns) and suggests semantic output types (Document vs Collection).
3. **Autonomous build loop** — the system generates a typed extractor, runs it in-process, tests against live URLs, and repairs failures without manual intervention.
4. **Freeze a Spider node** — a reusable, deterministic workflow artefact you can re-run without calling an LLM.

Two output paths ship today:

- **Document** — Tavily Extract turns pages into clean Markdown (great when structure is article-like).
- **Collection** — Gemini (or a **Cursor agent** via `@cursor/sdk`) writes a plain JS `run(input)` extractor, tested and repaired across your URL set.

The UI shows live agent activity, build vs run traces, and preview panes for Tavily documents and collection grids.

### Why we built it

We wanted multi-agent autonomy on the **open web** without paying model tokens every time the same pipeline runs. The hackathon brief — act on real-time data, operate without constant manual intervention — maps directly to: discover → compile → test → repair → freeze.

### How we built it

- **Next.js 16** + **React Flow** node canvas
- **agent-browser** (Vercel Labs) for Stage 1 structural discovery
- **Tavily Extract** for Document path Markdown
- **Google Gemini** for schema inference, codegen, and repair fallback
- **Cursor Agent SDK** (`composer-2.5`) for the primary Stage 2 build/repair loop when `CURSOR_API_KEY` is set
- **ClickHouse** client wired as an *optional* trace sink (local JSONL always works; cloud sink is scaffolded, not demo-critical)

### What we learned

- Separating **discovery** (what exists on the page?) from **compilation** (how do we extract it reliably?) makes repair loops much easier to reason about.
- Browser accessibility snapshots are token-efficient for agents compared to raw HTML.
- Keeping extractors as plain functions with automated cross-URL tests catches brittle selectors early.

### Challenges

- JS-rendered pages need headless Chrome; we degrade gracefully to HTTP quick-check when Chrome is unavailable.
- Agent codegen sometimes wraps code in fences or drifts from the schema — the repair loop and Cursor session context help, but it is not perfect in 8 hours.
- ClickHouse tracing is integrated at the API layer but not yet a user-facing feature — we focused the demo on the compile pipeline instead.

### What is *not* in this MVP (on purpose)

- Media extraction and transferable browser sessions (visible but disabled in UI)
- Cloud worker execution, scheduling, marketplace
- Full ClickHouse-backed chat history / analytics UI

These are post-hackathon roadmap items documented in our repo.

---

## Built with

```
Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, React Flow (@xyflow/react), agent-browser, Tavily API, Google Gemini (AI SDK), Cursor Agent SDK (@cursor/sdk), ClickHouse client, Node.js, pnpm
```

---

## Try it out links

| Label | URL |
|-------|-----|
| GitHub Repository | https://github.com/ghcpuman902/agentic-workflow-compiler |
| Live demo | *(local only — see README in repo; run `pnpm dev` on port 3121)* |

*(Devpost requires a public GitHub repo — done. No deployed URL is fine; say "clone & run" in the video.)*

---

## Sponsor / Special Prizes (checkboxes)

- [x] **Best Use of Tavily Search** — Document path uses Tavily Extract for live web → Markdown
- [x] **Best Use of Cursor** — Stage 2 build/repair loop via `@cursor/sdk` Cursor agent
- [ ] Best Use of ClickHouse — *skip unless you demo trace queries before deadline*
- [ ] Prometheux / Gensyn / Senso — not used

---

## 3-minute demo video script

**Setup before record:** Dev server running (`pnpm dev`), `.env.local` has `TAVILY_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, optionally `CURSOR_API_KEY`. Use **3–5 URLs** (not all 22 Cannes URLs — faster).

### 0:00–0:25 — Hook
> "AI agents are great at one-off tasks, but terrible at repeatable automation — you pay the model every time. We built Agentic Workflow Compiler: agents design the pipeline once, then TypeScript runs it deterministically."

Show the node graph: URL node → Discover Factory → (Spider appears after run).

### 0:25–0:45 — Input
> "Paste live public URLs — here are Cannes film detail pages. Optional context, then one Play button."

Click **Play** on Discover Factory. Point at activity log ("probing live URLs…").

### 0:45–1:45 — Discovery + build (may need jump-cut in edit)
> "Stage 1: a browser agent inspects real pages — accessibility tree, JSON-LD, repeated cards — and picks Document or Collection."

When done, show the embedded Spider card. Mention:
- **Collection path:** Cursor agent (or Gemini) writes extractor → auto-test → repair
- **Document path:** Tavily Extract → Markdown preview

If Collection finishes first, open preview grid / generated code panel.

### 1:45–2:30 — Output & autonomy
> "No manual coding. The agent tested against live URLs and froze a reusable Spider. Re-run executes without an LLM."

Show preview data, trace summary (build vs run events), sponsor strip (Tavily · Cursor · Gemini).

### 2:30–3:00 — Close
> "Open source on GitHub. Agentic at build time, deterministic at run time. Thanks — built at tokens& Multiagents Hackathon London."

End card: repo URL + your name/handle.

**Recording tips**
- Chrome tab capture + mic, 1080p
- Speed up the middle 60s in YouTube editor if discover takes long
- Unlisted upload is fine; paste link into Devpost

---

## Thumbnail idea

Screenshot of the React Flow canvas with Discover node running (violet header, activity log visible) + text overlay: **"Agentic Workflow Compiler"**.

---

## Pre-submit checklist

- [ ] Public GitHub repo pushed (latest commit)
- [ ] Demo video on YouTube (embedded link works)
- [ ] Project name + elevator pitch saved
- [ ] About story pasted (Markdown renders OK)
- [ ] Built-with tags filled
- [ ] Tavily + Cursor prize boxes checked
- [ ] Team members added (max 3)
- [ ] Thumbnail uploaded (3:2 ratio)
