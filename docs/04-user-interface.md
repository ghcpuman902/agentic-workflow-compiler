# User Interface

> The interface follows the two-stage **Discover -> Build** pipeline ([06-two-stage-pipeline.md](./06-two-stage-pipeline.md)). The primary user action is *paste URLs -> choose an output*, not designing a graph. The full node-editor workspace is a separate workstream.

## Stage 1 UI: Paste URLs -> Discover

### Input
```
Paste one or more URLs (one per line)
+---------------------------------------------+
| https://example.com/events                  |
| https://example.com/events?page=2           |
| https://another-site.com/conferences        |
+---------------------------------------------+
[ Inspect pages ]
```
Up to five URLs, public pages only.

### After inspection: suggestions
Show discovered, **semantic** output options (never DOM terminology):

```
We found several possible outputs

Suggested collection
  Events
  12-30 repeated records detected
  Likely fields: title, date, location, organiser, registration link

Suggested document
  Event descriptions
  Long-form content detected on detail pages

Other detected structure
  Navigation links · Sponsor logos · Speaker profiles
```

The user selects one output family and, where relevant, one discovered entity type.

### URL grouping (page roles)
Show how the system interpreted the URLs (user can correct, but normally should not need to):

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

### Advanced panel (optional)
Expose raw structural evidence (repeated sibling signatures, JSON-LD types, counts) behind an advanced toggle - kept out of the primary surface.

## Output Families
Keep the primary choice simple. Two active, two disabled:

```
Document          Markdown · JSON
Collection        JSONL · CSV · TypeScript
Media             Coming soon   (greyed)
Browser session   Coming soon   (greyed)
```

- **Document** - coherent long-form content (Tavily-powered in Stage 2).
- **Collection** - repeated structured records (generated browser extraction workflow).
- **Media** (images/files/galleries/AV refs) and **Browser session** (authenticated/interactive state, agent hand-off) are visible but disabled to communicate the future architecture.

## Stage 2 UI: Build + Preview
After selection:
- **Document path:** show cleaned Markdown/JSON preview with source citations.
- **Collection path:** show inferred schema, the generated TypeScript extractor, test results (including the repaired failure), and a preview of the JSONL/CSV/TS output.
- Actions: export artefact, save workflow for reuse.

## Workspace UI (Separate Workstream)
The richer Blender-style environment is built separately. Planned tabs:

- **Tab 1 - Node editor:** read-only execution graph (`Discover -> Infer schema -> Generate -> Test -> Repair -> Run -> Export`). Node statuses: planned, building, testing, failed, repairing, approved, running, completed.
- **Tab 2 - Saved data:** persisted raw pages, inspections, cached step outputs, and results.
- **Tab 3 - Chat history:** active/inactive agent conversations (build-time reasoning) rendered via the AI SDK.

### Centre Panel: Selected Node
TypeScript source, description, input/output schema, generated tests, test results, execution logs, current version.

### Orchestration Timeline (example)
* `10:42:03` Inspected 3 URLs (2 listing, 1 detail)
* `10:42:08` Suggested "Events" collection (~18 records: title, date, location, registration link)
* `10:42:17` Builder generated `extractEvents()`
* `10:42:20` Tester generated four consistency cases
* `10:42:22` Test failed: detail page had no record list
* `10:42:29` Repair agent adjusted record-boundary selector
* `10:42:31` All tests passed
* `10:42:40` Workflow version 1 approved
* `10:42:51` Ran across 3 URLs -> 33 records (0 model calls)

## Metrics (Header/Bottom)
Crucial for the value proposition:
* Agent calls during build
* Deterministic step executions + cache hits
* Workflow version
* Tests passed
* Repair count
* Total run time
* Model calls during rerun
* Approximate recurring cost

**Strongest metric:**
* Build run: N model calls
* Compiled rerun: 0 model calls for deterministic nodes
(Only make a zero-call claim if technically true.)
