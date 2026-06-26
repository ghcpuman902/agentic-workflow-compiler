# Hackathon Scope and Demo

> Architecture note: the MVP follows the two-stage **Discover -> Build** pipeline. See [06-two-stage-pipeline.md](./06-two-stage-pipeline.md) for the canonical spec. This document covers scope, sponsor strategy, and the demo script.

## Hackathon Scope
**What We Are Building:**
A workflow compiler with two stages:

**Stage 1 - Structural discovery (browser agent):**
1. accept one or more pasted URLs (up to five, public pages only)
2. run a super-fast `agent-browser read` quick-check (no Chrome), then deep-inspect via agent-browser (`open` + `snapshot -i` + `eval`): DOM, accessibility tree, JSON-LD, repeated siblings, headings/links/images, text density
3. infer page roles (listing vs detail) across URLs
4. suggest semantic output families: Document or Collection (with likely fields / estimated record counts)

**Stage 2 - Build the workflow (depends on chosen family):**
5. **Document path:** Tavily Extract -> clean/merge -> citation metadata -> Markdown or JSON
6. **Collection path:** infer field schema -> generate a TypeScript extractor -> test across URLs -> repair -> JSONL/CSV/TypeScript array
7. run the frozen workflow deterministically across all supplied URLs (no LLM in the run phase)
8. preview, export, and save the reusable workflow
9. trace every step (Stage 1 inspection, build-time agent calls, run-time deterministic steps)

**Supported in the demo:**
* up to five pasted URLs
* public pages only
* Document and Collection outputs
* one recommended collection schema
* Tavily-backed Markdown extraction
* browser-backed collection discovery
* one generated TypeScript extractor
* one automated test and repair cycle

**What We Are Not Building (visible but disabled):**
Automatic Media extraction (images, files, galleries, video/audio) and transferable Browser sessions (authenticated state, interactive hand-off). Also out of scope: general-purpose visual programming, drag-and-drop editor, arbitrary branching/loops, distributed execution, multi-language execution, arbitrary package installation, collaboration, user accounts. The user never types a goal - they only resolve ambiguity by choosing an output family, entity, and format.

## Demonstration Use Case: Paste URLs -> Compile a Reusable Workflow
**Objective:** Show how pasting a few event/listing URLs lets the system discover repeated records and compile a tested, reusable TypeScript extractor (Collection), or a cleaned cited Markdown brief (Document).

**Demo flow:**
1. Paste 2-3 listing URLs + 1 detail URL
2. Browser agent inspects pages and reports roles ("2 listing, 1 detail")
3. System suggests "~18 event-like records: title, date, location, registration link" plus a Document option
4. User selects **Collection -> JSONL**
5. System infers schema, generates a TypeScript extractor
6. First test fails on an inconsistent page; repair agent patches the extractor
7. Tests pass; frozen extractor runs across all URLs -> JSONL preview
8. (Optional) switch to **Document -> Markdown** to show the Tavily-backed path
9. Save workflow for reuse; show 0 model calls during the deterministic run

**Example Stage 2 routes:**
- Document: `Selected URLs -> Tavily Extract -> clean/merge -> citation metadata -> Markdown/JSON`
- Collection: `Selected URLs -> browser inspection -> record boundaries -> inferred schema -> generated TS extractor -> test across URLs -> repair -> JSONL/CSV/TS array`

## Sponsor Tool Strategy
Three sponsor tools, each with a real runtime purpose:
1. **Tavily:** Powers the **Document path** - Extract cleaned, readable content with source metadata across selected URLs. Visibly present in the runtime path.
2. **ClickHouse:** Stores traces and metrics for Stage 1 inspection, build-time agent calls, test/repair attempts, and run-time deterministic steps; enables the build-vs-run cost comparison.
3. **Gemini (via AI SDK):** Build-time intelligence - infers schemas and generates the TypeScript extractor for the Collection path. Not used in the deterministic run phase.
*(Cursor is used to build, but doesn't count as a runtime integration tool. agent-browser (Vercel Labs) powers Stage 1 inspection as core infrastructure, not a sponsor tool.)*

## Three-Minute Demo Script Structure
* **0:00-0:25: Problem:** Most agent platforms keep an LLM inside every execution (expensive, slow, non-deterministic).
* **0:25-0:45: Solution:** Paste URLs; the system discovers what the pages can become and compiles a reusable workflow. The model leaves the execution path once the tool is stable.
* **0:45-1:10: Stage 1 Discovery:** Paste URLs, show headless inspection, page roles, and semantic suggestions (Document vs Collection).
* **1:10-1:35: Selection + Generation:** Pick Collection -> JSONL; show the generated TypeScript extractor.
* **1:35-1:55: Failure and Repair:** First test fails on an inconsistent page; repair agent patches the extractor; tests pass.
* **1:55-2:25: Run and Action:** Run the frozen extractor across all URLs; show JSONL preview (and optionally the Tavily Document path).
* **2:25-2:45: Deterministic Rerun:** Rerun, showing 0 model calls and cache hits for deterministic steps.
* **2:45-3:00: Closing:** "Paste URLs, discover what they can become, compile a reusable workflow. Agentic at build time, deterministic at run time."

## Key Presentation Claims
**Use:** "Paste URLs and the system discovers what they can become," "The agent suggests semantic entities, not DOM selectors," "Generated tools are typed, tested and inspectable," "Model leaves the execution path once stable," "Successful reasoning becomes durable software."
**Avoid:** "Universal workflow platform," "Completely secure sandbox," "Replaces developers," "Requires no AI."

## Main Risks
1. **Too Much Platform Work:** Keep to two output families (Document/Collection), one generated extractor, no editable graph in this slice.
2. **Browser Fragility/Weight:** agent-browser is light (0 npm deps, native binary) but needs `agent-browser install` to fetch Chrome once. Cache inspection results; if Chrome is unavailable, the `read` quick-check (pure HTTP, no Chrome) keeps the demo alive with markdown/outline-only inspection.
3. **Sponsor Tool Integration Failure:** Test credentials first; keep Tavily as the Document path and a fixed boundary.
4. **Live Web Instability:** Save raw page + inspection snapshots; use multiple URLs; keep a labelled fallback fixture.
5. **Code Execution Failure:** Simple pure TS extractor, restricted dependencies, enforce timeouts (in-process vm).
6. **Demo Is Hard to Understand:** Visibly show Paste -> Discover -> Choose -> Build -> Fail -> Repair -> Run -> Rerun.
7. **DOM Terminology Leaking to Users:** Always surface semantic entities; keep raw structural evidence in an advanced panel only.
