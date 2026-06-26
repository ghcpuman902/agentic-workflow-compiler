# Two-Stage Pipeline: Discover then Build

This is the canonical MVP architecture. It supersedes the earlier "type a goal + minimal spec" framing.

**Final product flow:** Paste URLs -> discover what the pages can become -> choose Document or Collection -> compile a reusable workflow.

The user should not need to type a goal. They only resolve ambiguity by choosing:

- what kind of artefact they want
- which discovered data entity they care about
- which final format they need

---

## Discover node UX

The Discover node is a single play button that runs the whole build pipeline. Before pressing
play the user only sees:

- **Extra context** — an optional free-text textarea passed to discovery and to the build
  agent (e.g. "I care about speaker names and ticket prices"). Never required.
- **Advanced settings** (collapsible, at the bottom): **Confidence threshold** (default `0.55`)
  and **Max discover pages** (default `5`). These are out of the way so the default flow is
  just *paste URLs → press play*.

Pressing play runs **discover → build → test → repair → freeze** and emits a tested spider
(see "Agentic build loop" below). The discover node never asks the user to pick array vs
single or md vs json — that is resolved on the spider afterwards.

## Stage 1: Structural Discovery (Browser Agent)

The user pastes one URL or multiple URLs, one per line:

```
https://example.com/events
https://example.com/events?page=2
https://another-site.com/conferences
```

We use **[agent-browser](https://agent-browser.dev)** (Vercel Labs) as the browser engine - a fast Rust CLI driving Chrome via CDP, shelled out from Node and run locally in headless mode. It gives us two speeds:

- **Quick-check (super fast, no Chrome):** `agent-browser read <url> --json` does an HTTP fetch with markdown negotiation and HTML-to-text extraction. Run for every pasted URL in parallel to instantly hint doc-vs-collection and show an outline preview while deep inspection runs.
- **Deep inspect (JS-rendered):** `agent-browser open <url>` + `wait --load networkidle` + `snapshot -i` (compact accessibility tree with `@eN` refs) + `eval <js>` (extract JSON-LD, repeated siblings, counts) for full structural discovery.

For each URL we inspect:

- rendered DOM (via `eval`)
- accessibility tree (`snapshot -i`, token-efficient `@eN` refs)
- JSON-LD and embedded structured data
- repeated sibling structures
- headings, links, images and text density
- common structure across multiple URLs
- whether pages appear to be detail pages or listing pages

The purpose is **not** to extract final output yet. It is to answer:

> What reusable data shapes appear to exist across these pages?

Possible discoveries: repeated event records, product cards, people/speaker profiles, article/document body, navigation links, tables, downloadable files, image galleries.

The browser agent then suggests **potential output types**.

### Important distinction

The browser agent must suggest **semantic entities, not DOM terminology**.

- Bad: `Repeated <div> group with 18 children`
- Better: `18 event-like records · Likely fields: title, date, location, registration link`

Structural evidence can be exposed in an advanced panel.

### Multiple-URL behaviour

Multiple URLs are not just extra inputs - they improve discovery. The system compares them to distinguish:

- stable structure from page-specific noise
- shared fields from optional fields
- listing pages from detail pages
- pagination variants
- different templates on the same site
- equivalent data represented differently across sites

Example inference:

```
URL 1: 18 event cards
URL 2: 15 event cards using the same layout
URL 3: individual event detail page

=> Collection source: URLs 1 and 2
   Enrichment source: URL 3
```

### URL grouping (page roles)

After inspection, show how the system interpreted the URLs, with the option to correct:

```
Detected page roles
  2 listing pages
  1 detail page
  0 unsupported pages

Listing pages
  example.com/events
  example.com/events?page=2
Detail pages
  example.com/events/agent-hackathon
```

This gives transparency without asking the user to design the workflow.

---

## Output model: singular item type × cardinality (Blender-style)

We do **not** make the user declare "array output" or "markdown output" on the discover
node. Following the Blender node model, a node carries a single **item type** (the datatype
of *one* output item) and the **cardinality** (single vs array) is *derived from the input*:

- **list of URLs in → array out**
- **single URL in → single out**

List-ness therefore only affects the **discover stage** (whether discovery needs to detect
repeated record boundaries across pages). It is never something the node itself pins.

```ts
type ItemType   = "markdown" | "html" | "json" | "csv-row"   // datatype of ONE item
type Cardinality = "single" | "array"                         // = urlCount > 1 ? "array" : "single"
```

The build **family** and concrete **format** are *derived* from `(itemType, cardinality)`,
not chosen directly:

| itemType | cardinality | build family | format |
|----------|-------------|--------------|--------|
| `markdown` | any | Document | `md` |
| `html` | any | Document | `md` (approximated until a real HTML writer exists) |
| `json` | `single` | Document | `json` |
| `json` | `array` | Collection | `jsonl` |
| `csv-row` | any | Collection | `csv` |

**Default selection, overridable.** When the user pastes multiple URLs (`array`), the spider
defaults its item type to a record-shaped type (`json`/`csv-row`); a single URL defaults to
`markdown`. The user can always override the item type on the spider — the cardinality badge
stays read-only because it is a property of the input, not a choice.

Two families remain greyed for the MVP:

| Family | Status | Powered by |
|--------|--------|-----------|
| **Document** | Active | Tavily Extract (Stage 2) |
| **Collection** | Active | Cursor-agent-generated extractor, vm-sandboxed |
| **Media** | Coming soon (greyed) | - |
| **Browser session** | Coming soon (greyed) | - |

---

## Stage 2: Build the Workflow

After selection, the route depends on the family.

### Document path

```
Selected URLs
  -> Tavily Extract
  -> content comparison
  -> document cleaning
  -> merge or preserve per-page boundaries
  -> citation metadata
  -> Markdown or JSON
```

Tavily is useful here because document output benefits from cleaned content, readable Markdown, semantic extraction, source metadata, and less dependence on fragile DOM selectors.

The generated workflow can still add deterministic processing: remove repeated navigation, normalise headings, combine documents, generate front matter, preserve source attribution.

### Collection path

```
Selected URLs
  -> browser structural inspection
  -> candidate record boundaries
  -> inferred field schema
  -> generated TypeScript extractor
  -> test across supplied URLs
  -> repair inconsistent extraction
  -> JSONL, CSV or TypeScript array
```

The generated extractor is produced by an **agent** (not a single Gemini round-trip),
executed in-process (vm + timeout), and repaired on test failure. Once tests pass, the tool is
frozen and run deterministically across all supplied URLs (no LLM in the run phase).

### Agentic build loop (golden passes)

The discover node's play button triggers the loop:

1. **Golden passes** — the orchestrator derives expected assertions from the already-probed
   (cached) pages: expected record count (`estimatedRecords`) and the required fields (shared
   fields with coverage ≥ 0.5 from `aggregate()`). These probed pages are the golden set.
2. **Builder agent** — a [Cursor agent](https://cursor.com/docs/sdk/typescript) (`@cursor/sdk`,
   `Agent.create` + `agent.send`, local runtime, model `composer-2.5`) writes a modular
   `run(input)` extractor. Extra context from the discover node is included in the prompt.
3. **Tester** — the extractor runs in the vm+timeout sandbox against the golden pages.
4. **Repair** — on failure, a follow-up `agent.send` keeps full conversation context and
   patches the extractor; loop until golden passes (bounded retries).
5. **Freeze** — the passing extractor is cached as a `CompiledTool`.

If `CURSOR_API_KEY` is not configured (or the local agent is unreachable), the loop falls back
to the Gemini `generateCode` path so the demo never hard-fails.

### Run phase (deterministic)

The **spider node** has its own play button. It runs the frozen extractor across **all** pasted
URLs (capped by the spider's **max input** setting) with **zero** model calls. Every spider
exposes a `maxInputUrls` cap so a 500-URL paste can be limited to, say, 25 for a demo.

SDK guardrails applied on the server path: dispose the agent in `finally`
(`agent[Symbol.asyncDispose]()`), distinguish thrown `CursorAgentError` (run never started:
auth/config) from `result.status === "error"` (ran but failed), always `await run.wait()`, pass
`apiKey` explicitly, and set `local.settingSources: []` so ambient settings are not loaded.

---

## Discovery Result Model

```typescript
type PageInspection = {
  url: string;
  pageRole: "listing" | "detail" | "document" | "mixed" | "unknown";
  structuredDataTypes: string[];
  repeatedGroups: Array<{
    candidateName: string;
    count: number;
    confidence: number;
    sampleFields: Array<{
      name: string;
      inferredType: string;
      examples: unknown[];
    }>;
  }>;
  documentSignals: {
    title?: string;
    headingCount: number;
    paragraphCount: number;
    textLength: number;
  };
};

type DiscoveryResult = {
  pages: PageInspection[];
  suggestions: Array<{
    family: "document" | "collection";
    label: string;
    confidence: number;
    estimatedRecords?: number;
    fields?: Array<{
      name: string;
      type: string;
      coverage: number;
    }>;
  }>;
};
```

---

## Recommended Interaction

```
Paste one or more URLs
  -> browser agent discovers potential data shapes
  -> system suggests Document or Collection outputs
  -> user selects one option
  -> Stage 2 builds and validates the workflow
  -> result preview appears
  -> export or save workflow
```

---

## Hackathon Scope

For the demo, support:

- up to five pasted URLs
- public pages only
- Document and Collection outputs
- one recommended collection schema
- Tavily-backed Markdown extraction
- browser-backed collection discovery
- one generated TypeScript extractor
- one automated test and repair cycle

Do **not** build automatic media extraction or transferable browser sessions yet. Keep them visible but disabled to communicate the future architecture.

---

## Confirmed implementation decisions

| Decision | Choice |
|----------|--------|
| Stage 1 browser | **agent-browser** (Vercel Labs CLI), shelled out from Node, headless, run locally |
| Quick-check | `agent-browser read <url> --json` - HTTP fetch, no Chrome, parallel per URL |
| Deep inspect | `agent-browser open` + `wait` + `snapshot -i` + `eval` (per-URL `--session`) |
| Stage 2 codegen | **Cursor agent** (`@cursor/sdk`, local, `composer-2.5`); Gemini `generateCode` fallback |
| Tool execution | In-process Node (dynamic import / `vm`) + timeout |
| Caching | Local filesystem, hash-keyed; scrape/inspect once |
| Tracing | ClickHouse (build vs run events); local JSONL fallback |
| Document path | Tavily Extract + deterministic cleaning |
| UI | Separate workstream (Tab1 node editor, Tab2 saved data, Tab3 chat history) |

### agent-browser setup

```bash
npm install agent-browser     # project-local; 0 npm deps, native Rust binary
agent-browser install         # download Chrome for Testing (first run only)
```

Invoke from Node via `child_process.execFile("agent-browser", [...args, "--json"])`. A background Rust daemon persists between calls; use `--session <hash>` per URL for isolation/parallelism and `--idle-timeout 3m` to auto-shut after a run. Use `agent-browser batch` to chain `open -> wait -> snapshot -> eval` in one invocation. If Chrome cannot be downloaded in the environment, the `read` quick-check still works (pure HTTP) and the demo degrades to markdown/outline-only inspection.
