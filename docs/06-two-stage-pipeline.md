# Two-Stage Pipeline: Discover then Build

This is the canonical MVP architecture. It supersedes the earlier "type a goal + minimal spec" framing.

**Final product flow:** Paste URLs -> discover what the pages can become -> choose Document or Collection -> compile a reusable workflow.

The user should not need to type a goal. They only resolve ambiguity by choosing:

- what kind of artefact they want
- which discovered data entity they care about
- which final format they need

---

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

## Output Families

Keep the primary choice simple. Four families; two active for the MVP.

| Family | Status | Formats | Powered by |
|--------|--------|---------|-----------|
| **Document** | Active | Markdown · JSON | Tavily Extract (Stage 2) |
| **Collection** | Active | JSONL · CSV · TypeScript array | Generated browser extraction workflow |
| **Media** | Coming soon (greyed) | images · files · galleries · video/audio refs | - |
| **Browser session** | Coming soon (greyed) | authenticated session · interactive state · agent hand-off | - |

- **Document** - coherent long-form content.
- **Collection** - repeated structured records. This is where the workflow-compiler thesis is strongest.

The user selects one output family and, where relevant, one discovered entity type and final format.

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

The generated TypeScript extractor is produced inline via Gemini (AI SDK), executed in-process (vm + timeout), and repaired on test failure. Once tests pass, the tool is frozen and run deterministically across all supplied URLs (no LLM in the run phase).

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
| Stage 2 codegen | AI SDK + Gemini inline (`generateText`/`generateObject`) |
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
