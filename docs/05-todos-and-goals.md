# Todos, Verifyables and SMART Goals

> Aligned to the two-stage **Discover -> Build** pipeline. Canonical spec: [06-two-stage-pipeline.md](./06-two-stage-pipeline.md).

## SMART Goals
1. **Specific:** Build a two-stage workflow compiler MVP where a user pastes up to five URLs, agent-browser (Vercel Labs) discovers reusable data shapes and suggests Document/Collection outputs, and the system compiles a tested, reusable TypeScript extractor (Collection) or a cleaned cited Markdown document (Document).
2. **Measurable:** Stage 1 returns page roles + at least one semantic suggestion. Collection path generates a TS extractor, intentionally fails 1 test, repairs it, and runs across all URLs with 0 model calls in the run phase (build-vs-run call comparison shown).
3. **Achievable:** Scope is restricted to two output families, in-process execution (vm + timeout), local caching, and public pages only - avoiding media extraction, browser sessions, and a full node editor.
4. **Relevant:** Acts on the open web, uses real-time information, operates autonomously (user only picks an output family/format), and combines three sponsor tools (Tavily, ClickHouse, Gemini).
5. **Time-Bound:** Stage 1 discovery in ~70 mins, Collection build+test+repair in ~35 mins, API + test page in ~20 mins; Document path and tracing are P1; freeze and record the 3-minute demo before the deadline.

## Recommended Build Sequence (Todos)

### Stage 0: Verify Integrations
- [ ] Create public repository
- [ ] Create Devpost draft
- [ ] Obtain sponsor credentials
- [x] Test Tavily API (wrapper + /test/tavily)
- [ ] Fix + test ClickHouse API (`executeQuery`, env alignment)
- [x] Test Gemini via AI SDK (/test/llm)
- [ ] Confirm publishing / export requirements
- [x] Minimal Next.js application

### Stage 1: Structural Discovery (agent-browser)
- [ ] Install agent-browser (`npm install agent-browser` + `agent-browser install`)
- [ ] Types + local cache (`PageInspection`, `DiscoveryResult`, output families; fs cache keyed by URL hash)
- [ ] Super-fast quick-check: `agent-browser read <url> --json` (no Chrome) per URL in parallel
- [ ] Deep inspection per URL via agent-browser (`open` + `snapshot -i` + `eval`): DOM, a11y tree, JSON-LD, repeated siblings, counts
- [ ] Aggregate across URLs: infer page roles (listing/detail), shared vs optional fields
- [ ] Suggest semantic Document/Collection outputs (likely fields, estimated records) - never raw DOM terms
- [ ] `POST /api/discover` + `/test/discover` page (paste up to 5 URLs, show roles + suggestions + output-family chips)

### Stage 2: Build the Workflow
- [ ] Collection path: infer schema -> generate TS extractor -> test across URLs -> repair -> JSONL/CSV/TS array
- [ ] Document path (P1): Tavily Extract -> clean/merge -> citation metadata -> Markdown/JSON
- [ ] `POST /api/build` + result preview/export

### Stage 3: Test + Repair (Collection)
- [ ] Generate test cases from inferred schema (coverage + a deliberately strict first case)
- [ ] Run extractor in-process (vm + timeout); detect failure
- [ ] Repair loop: `generate -> test -> fail -> repair -> pass`

### Stage 4: Deterministic Run
- [ ] Freeze tool; run across all supplied URLs with 0 model calls
- [ ] Cache raw pages + steps so reruns do not re-scrape

### Stage 5: Trace and Metrics
- [ ] ClickHouse traces for Stage 1 inspection, build-time agent calls, run-time steps (local JSONL fallback)
- [ ] Build-vs-run model-call comparison

### Stage 6: UI (Separate Workstream)
- [ ] Tab 1: node editor
- [ ] Tab 2: saved data
- [ ] Tab 3: active/inactive chat history
- [ ] Output families with Media + Browser-session greyed out ("Coming soon")

### Stage 7: Freeze
- [ ] Freeze features
- [ ] Record the 3-minute demo video
- [ ] Complete submission

## Minimum Acceptance Criteria (Verifyables)
- [ ] 1. Pasting URLs produces a structural discovery result (page roles + suggestions).
- [ ] 2. At least one suggested output uses semantic entity language, not DOM terms.
- [ ] 3. The workflow contains a discovery step plus a build step (>= 2 stages).
- [ ] 4. The Collection path generates a TypeScript extractor with a typed schema.
- [ ] 5. At least one unit/consistency test is generated.
- [ ] 6. At least one first attempt fails.
- [ ] 7. The system repairs the failed extractor.
- [ ] 8. The repaired extractor passes its tests.
- [ ] 9. The workflow processes live web data from the pasted URLs.
- [ ] 10. The workflow produces a visible artefact (JSONL/CSV/TS array or cited Markdown) that can be exported.
- [ ] 11. Three sponsor tools are materially used (Tavily, ClickHouse, Gemini).
- [ ] 12. A deterministic rerun uses cached data and makes 0 model calls.
- [ ] 13. Execution traces are inspectable.
- [ ] 14. The public repository contains setup instructions.
- [ ] 15. A three-minute demonstration video is complete.

## Priority Order

### P0: Must Work
- [ ] Public repository
- [ ] Paste-URLs input (1-5)
- [ ] Stage 1 agent-browser inspection (quick-check + deep inspect)
- [ ] Semantic Document/Collection suggestions
- [ ] Collection: generated TypeScript extractor
- [ ] In-process constrained execution
- [ ] Test generation + repair loop
- [ ] Deterministic run across URLs -> exportable artefact
- [ ] Three sponsor integrations
- [ ] Demo video

### P1: Strongly Preferred
- [ ] Document path (Tavily Extract -> Markdown/JSON)
- [ ] ClickHouse trace view
- [ ] Build-vs-run call-count comparison
- [ ] URL role grouping with user correction
- [ ] Generated-code viewer
- [ ] Workflow save/reuse

### P2: Only If Time Remains
- [ ] CSV + TypeScript array formats (beyond JSONL)
- [ ] Advanced structural-evidence panel
- [ ] Editable graph
- [ ] Human override
- [ ] Pagination crawl beyond supplied URLs
- [ ] Multiple use cases

## Disabled-but-Visible (communicates future architecture)
- [ ] Media output family (images, files, galleries) - greyed "Coming soon"
- [ ] Browser session family (authenticated/interactive state) - greyed "Coming soon"

## Hackathon Challenge Alignment Checklist
- [ ] Act on the open web
- [ ] Use real-time information
- [ ] Perform real work
- [ ] Publish, monitor, orchestrate or transact (export reusable workflow + artefact)
- [ ] Operate without constant manual intervention (user only picks family/format)
- [ ] Use at least three sponsor tools
- [ ] Demonstrate the result in three minutes
