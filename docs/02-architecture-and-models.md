# Architecture and Models

> MVP architecture is the two-stage **Discover -> Build** pipeline ([06-two-stage-pipeline.md](./06-two-stage-pipeline.md)). The multi-agent roles below are conceptual responsibilities; in the MVP they are collapsed into two modules: a **discovery** module (Stage 1) and a **build** module (Stage 2), with inline Gemini calls rather than separate long-lived agents.

## Two-Stage MVP Architecture

### Stage 1: Structural Discovery (Browser Agent)
We use **agent-browser** (Vercel Labs CLI, shelled out from Node, headless, local) to inspect each pasted URL and find reusable data shapes (it does not extract final output yet). Two speeds: a super-fast `read --json` quick-check (HTTP, no Chrome) for an instant doc/collection hint, then a deeper `open` + `snapshot -i` + `eval` pass for JS-rendered structure.
**Inspects:** rendered DOM, accessibility tree, JSON-LD / embedded structured data, repeated sibling structures, headings/links/images, text density, cross-URL common structure, listing-vs-detail signals.
**Produces:** semantic suggestions (Document or Collection) with likely fields and estimated record counts - never raw DOM terminology in the user-facing surface.

### Stage 2: Build the Workflow
Routes by chosen output family:
* **Document path:** Tavily Extract -> content comparison -> cleaning -> merge/preserve boundaries -> citation metadata -> Markdown/JSON.
* **Collection path:** record-boundary detection -> inferred field schema -> generated TypeScript extractor -> test across URLs -> repair -> JSONL/CSV/TypeScript array.

## Conceptual Agent Responsibilities

### 1. Orchestrator (discovery + routing)
* interpret pasted URLs and inspection results
* infer page roles and define acceptance criteria
* suggest output families and route to the correct Stage 2 path
* track test and execution results; decide whether repair is required

### 2. Builder (Collection codegen)
Receives the inferred schema, sample page content, constraints, and fixtures.
* write the TypeScript extractor (EVE-style: pure, typed, no network)
* preserve typed inputs and outputs; handle predictable malformed input

### 3. Tester
* create consistency/coverage tests across supplied URLs
* include a deliberately strict case to exercise repair
* detect schema violations

### 4. Repair
Inputs: failing extractor, failing test, runtime error, sample input, expected result, schema.
* produce a minimal patch and preserve the contract

### 5. Verifier
* compare records/documents against source content and attach citations
* confirm acceptance criteria are satisfied

## Execution Model
**Build Phase (Agentic):**
Paste URLs -> Stage 1 browser inspection -> discovery suggestions -> user selects family/format -> (Collection) infer schema -> Builder writes extractor -> Tester creates tests -> in-process sandbox runs tests -> Repair patches failures -> tests pass -> workflow version frozen.

**Run Phase (Deterministic):**
Selected URLs -> cached raw pages -> frozen extractor (or Tavily Extract + deterministic cleaning) -> verifier/citation -> exported artefact. No LLM required in the run phase.

**Recovery Phase:**
Return to the agent when: a test fails, schema is violated, page structure changes, confidence falls below threshold, or a node throws. Capture trace -> identify failed node -> repair -> rerun tests -> publish new version.

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
    fields?: Array<{ name: string; type: string; coverage: number }>;
  }>;
};
```

## Output Family & Content Model
```typescript
type OutputFamily = "document" | "collection" | "media" | "browser-session";
// media + browser-session are visible but disabled in the MVP.

type DocFormat = "md" | "json";
type CollectionFormat = "jsonl" | "csv" | "ts";
```

## Workflow Node Model
```typescript
type WorkflowNodeKind = "generated-typescript" | "trusted-adapter" | "llm" | "human";

type WorkflowNode = {
  id: string;
  name: string;
  description: string;
  kind: WorkflowNodeKind;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  source?: string;
  tests?: WorkflowNodeTest[];
  status: "planned" | "building" | "testing" | "failed" | "repairing" | "approved" | "running" | "completed";
  version: number;
  dependencies: string[];
};

type WorkflowNodeTest = {
  id: string;
  name: string;
  input: unknown;
  expected?: unknown;
  expectedError?: string;
};

type CompiledWorkflow = {
  id: string;
  name: string;
  sourceUrls: string[];
  outputFamily: OutputFamily;
  outputFormat: DocFormat | CollectionFormat;
  version: number;
  nodes: WorkflowNode[];
  edges: Array<{ from: string; to: string }>;
  acceptanceCriteria: string[];
  buildStatus: "discovering" | "planning" | "building" | "testing" | "approved" | "failed";
  createdAt: string;
  updatedAt: string;
};
```

## Sandbox Requirements
For the MVP, use a constrained in-process execution environment (Node `vm` with plain-JS extractors and a hard timeout).
Generated extractors receive: JSON-serialisable input (page HTML/content), a timeout, captured console output, a limited dependency set, schema-validated output.
No unrestricted filesystem access or environment variables. Acknowledge that Node's `vm` is not production-grade isolation - use the term "constrained execution environment".

## Caching
Local filesystem cache keyed by URL hash. Raw pages and per-step outputs are cached so reruns do not re-inspect or re-scrape. Namespaces: raw pages, inspections, generated tools, outputs, traces.

## Human Intervention Model
Autonomous by default, interruptible by design. The user's main decision is choosing an output family/entity/format; they may also correct detected page roles. Possible human actions: edit the generated extractor, approve a node, change the target format, correct output, restart from a node.
