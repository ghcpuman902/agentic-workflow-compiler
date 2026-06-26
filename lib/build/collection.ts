/**
 * Stage 2 - Collection build path.
 *
 * Flow: select a collection suggestion -> Gemini infers a typed field schema ->
 * Gemini generates a PLAIN JS `run(input)` extractor -> test it across the
 * discovered pages in-process (vm + timeout) -> repair on failure (max 3) ->
 * freeze the tool and run it deterministically across all pages with ZERO model
 * calls -> serialize to jsonl / csv / ts.
 *
 * Build-phase steps make Gemini calls (traced as model-call/build). The run
 * phase makes none (traced as node-exec/cache-hit/run).
 *
 * Canonical spec: docs/06-two-stage-pipeline.md
 */
import { promises as fs } from "fs"
import path from "path"
import { generateJson } from "@/lib/integrations/llm"
import { createCodeGen } from "@/lib/build/cursor-agent"
import { runInProcess } from "@/lib/build/execute"
import { cacheGet, cacheSet } from "@/lib/cache/fs-cache"
import { traceEvent } from "@/lib/trace/trace"
import { serializeCollection } from "@/lib/workflow/serialize-records"
import type {
  BuildArtifact,
  CollectionFormat,
  CompiledTool,
  DiscoveryResult,
  PageInspection,
  RawPage,
  Suggestion,
} from "@/lib/workflow/content-types"

const TIMEOUT_MS = 4000
const MAX_REPAIRS = 3
const PROMPT_CONTENT_LIMIT = 6000
const PREVIEW_LINES = 15

type SchemaField = {
  name: string
  type: string
  required: boolean
  description?: string
}

type InferredSchema = {
  entity: string
  fields: SchemaField[]
}

type ExtractorInput = { html?: string; markdown?: string }

type TestCase = {
  name: string
  passed: boolean
  message?: string
}

type TestReport = {
  passed: boolean
  total: number
  passedCount: number
  cases: TestCase[]
  records: unknown[]
  /** A failing input + error pair to feed the repair prompt. */
  sampleFailure?: { input: ExtractorInput; error: string; detail: string }
}

export type BuildCollectionParams = {
  runId: string
  discovery: DiscoveryResult
  entity?: string
  format: CollectionFormat
  /** Optional free-text hint from the discover node, fed to the build agent. */
  extraContext?: string
}

// ---------------------------------------------------------------------------
// a. Suggestion selection
// ---------------------------------------------------------------------------

function selectSuggestion(
  discovery: DiscoveryResult,
  entity?: string
): Suggestion {
  const collections = discovery.suggestions.filter(
    (s) => s.family === "collection"
  )
  if (collections.length === 0) {
    throw new Error("No collection suggestion available in discovery result")
  }

  if (entity) {
    const wanted = entity.trim().toLowerCase()
    const match = collections.find(
      (s) =>
        s.entity?.toLowerCase() === wanted ||
        s.label.toLowerCase().includes(wanted)
    )
    if (match) return match
  }

  return [...collections].sort((a, b) => b.confidence - a.confidence)[0]
}

// ---------------------------------------------------------------------------
// Page input resolution (cached raw body -> snapshot / markdown)
// ---------------------------------------------------------------------------

async function getPageInput(
  page: PageInspection,
  opts: { trace?: { runId: string } } = {}
): Promise<ExtractorInput> {
  const raw = await cacheGet<RawPage>("raw", page.url)
  if (raw && opts.trace) {
    await traceEvent({
      runId: opts.trace.runId,
      stage: "stage2",
      phase: "run",
      kind: "cache-hit",
      payload: { ns: "raw", url: page.url },
    })
  }
  const html = raw?.body ?? page.snapshot
  const markdown = page.markdown ?? page.outline
  return { html, markdown }
}

function truncate(text: string | undefined, limit = PROMPT_CONTENT_LIMIT): string {
  if (!text) return ""
  return text.length > limit ? text.slice(0, limit) + "\n...[truncated]" : text
}

// ---------------------------------------------------------------------------
// b. Schema inference (model-call / build)
// ---------------------------------------------------------------------------

async function inferSchema(
  runId: string,
  suggestion: Suggestion,
  samplePage: PageInspection,
  sampleInput: ExtractorInput
): Promise<InferredSchema> {
  const sampleValues = samplePage.repeatedGroups
    .flatMap((g) => g.sampleFields)
    .slice(0, 24)
    .map((f) => `${f.name} (${f.inferredType}): ${JSON.stringify(f.examples?.slice(0, 3) ?? [])}`)
    .join("\n")

  const declaredFields = (suggestion.fields ?? [])
    .map((f) => `${f.name}: ${f.type} (coverage ${Math.round(f.coverage * 100)}%)`)
    .join("\n")

  const content = truncate(sampleInput.html || sampleInput.markdown, 3500)

  const prompt = `You are designing a typed field schema for a data Collection extracted from web pages.

Entity: ${suggestion.entity ?? suggestion.label}
Suggestion label: ${suggestion.label}
Estimated records: ${suggestion.estimatedRecords ?? "unknown"}

Declared candidate fields:
${declaredFields || "(none)"}

Observed sample field values from repeated groups:
${sampleValues || "(none)"}

Sample page content (truncated):
${content || "(none)"}

Return ONLY a JSON object with this exact shape:
{
  "entity": "<singular entity name>",
  "fields": [
    { "name": "<camelCase field>", "type": "string|number|boolean|string[]", "required": true|false, "description": "<short>" }
  ]
}
Prefer 3-8 meaningful fields. Mark a field required only if it should appear on every record (e.g. a title/name).`

  const schema = await generateJson<InferredSchema>(prompt, {
    runId,
    purpose: "infer-schema",
  })

  if (!schema.fields || schema.fields.length === 0) {
    throw new Error("Inferred schema has no fields")
  }
  return schema
}

// ---------------------------------------------------------------------------
// c. Extractor generation (model-call / build)
// ---------------------------------------------------------------------------

function schemaSummary(schema: InferredSchema): string {
  return schema.fields
    .map(
      (f) =>
        `- ${f.name}: ${f.type}${f.required ? " (required)" : ""}${f.description ? ` - ${f.description}` : ""}`
    )
    .join("\n")
}

function extractorPrompt(
  schema: InferredSchema,
  sampleInput: ExtractorInput,
  extraContext?: string,
): string {
  const content = truncate(sampleInput.html || sampleInput.markdown)
  const source = sampleInput.html ? "HTML" : "Markdown"
  const contextLine = extraContext?.trim()
    ? `\nUser context (prioritise these fields/goals when extracting):\n${extraContext.trim()}\n`
    : ""
  return `Write a PLAIN JavaScript (ES2020) extractor. Output ONLY code, no explanation, no markdown fences.

Define exactly one function:
  function run(input) { ... }
${contextLine}
- input is an object: { html?: string, markdown?: string }
- run MUST return an array of record objects matching this schema for entity "${schema.entity}":
${schemaSummary(schema)}

Hard requirements:
- Pure and deterministic. NO network, NO fetch, NO require, NO imports, NO process, NO DOM/document.
- Parse the provided strings using ONLY string methods and RegExp (there is no DOM in the sandbox).
- Every required string field MUST be present, trimmed, and non-empty on every returned record.
- Skip partial/garbage records rather than emitting empty required fields.
- Numbers should be parsed to JS numbers; arrays to JS arrays.

Sample ${source} input the extractor will receive (truncated):
"""
${content}
"""`
}

// ---------------------------------------------------------------------------
// d. Testing across pages (node-exec / build)
// ---------------------------------------------------------------------------

function isPlainRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

async function runToolOnPages(
  source: string,
  pages: PageInspection[],
  inputs: ExtractorInput[],
  trace: { runId: string; phase: "build" | "run" }
): Promise<{ records: unknown[]; perPage: { url: string; records: unknown[]; error?: string }[] }> {
  const perPage: { url: string; records: unknown[]; error?: string }[] = []
  for (let i = 0; i < pages.length; i++) {
    const result = await runInProcess(source, inputs[i], TIMEOUT_MS)
    await traceEvent({
      runId: trace.runId,
      stage: "stage2",
      phase: trace.phase,
      kind: "node-exec",
      payload: {
        url: pages[i].url,
        ok: !result.error,
        error: result.error,
        count: Array.isArray(result.output) ? result.output.length : 0,
      },
    })
    const records = Array.isArray(result.output) ? result.output : []
    perPage.push({ url: pages[i].url, records, error: result.error })
  }
  return { records: perPage.flatMap((p) => p.records), perPage }
}

/**
 * Evaluate the extractor against the pages. Includes a deliberately STRICT
 * assertion (required string fields must be trimmed & non-empty) that the first
 * generation usually fails, forcing a demoable repair.
 */
async function testTool(
  source: string,
  pages: PageInspection[],
  inputs: ExtractorInput[],
  schema: InferredSchema,
  suggestion: Suggestion,
  trace: { runId: string; phase: "build" | "run" }
): Promise<TestReport> {
  const { records, perPage } = await runToolOnPages(source, pages, inputs, trace)
  const cases: TestCase[] = []
  const requiredFields = schema.fields.filter((f) => f.required)
  const requiredStringFields = requiredFields.filter(
    (f) => f.type === "string" || f.type === "string[]"
  )

  let sampleFailure: TestReport["sampleFailure"]
  const firstNonEmpty = perPage.find((p) => p.records.length > 0) ?? perPage[0]
  const failingInput =
    inputs[perPage.indexOf(firstNonEmpty)] ?? inputs[0] ?? {}

  // Test 1 (STRICT, runs first): every required string field is trimmed & non-empty.
  let strictPassed = true
  let strictDetail = ""
  for (const rec of records) {
    if (!isPlainRecord(rec)) {
      strictPassed = false
      strictDetail = "A returned item is not an object record"
      break
    }
    for (const f of requiredStringFields) {
      const value = rec[f.name]
      const asString = Array.isArray(value) ? value.join("") : value
      if (typeof asString !== "string" || asString.length === 0) {
        strictPassed = false
        strictDetail = `Required field "${f.name}" is missing or empty`
        break
      }
      if (asString !== asString.trim()) {
        strictPassed = false
        strictDetail = `Required field "${f.name}" has untrimmed whitespace: ${JSON.stringify(asString)}`
        break
      }
    }
    if (!strictPassed) break
  }
  cases.push({
    name: "strict:required-string-fields-trimmed-nonempty",
    passed: strictPassed,
    message: strictPassed ? undefined : strictDetail,
  })
  if (!strictPassed) {
    sampleFailure = {
      input: failingInput,
      error: "Strict assertion failed",
      detail: strictDetail,
    }
  }

  // Test 2: produced at least one record.
  const hasRecords = records.length > 0
  cases.push({
    name: "produced-records",
    passed: hasRecords,
    message: hasRecords ? undefined : "Extractor returned no records",
  })
  if (!hasRecords && !sampleFailure) {
    sampleFailure = {
      input: failingInput,
      error: "No records",
      detail: "Extractor returned an empty array on all pages",
    }
  }

  // Test 3: field coverage - every record contains all required fields.
  const missingCoverage = records.some(
    (rec) =>
      !isPlainRecord(rec) ||
      requiredFields.some((f) => !(f.name in rec) || rec[f.name] == null)
  )
  cases.push({
    name: "field-coverage",
    passed: !missingCoverage,
    message: missingCoverage
      ? "Some records are missing required fields"
      : undefined,
  })
  if (missingCoverage && !sampleFailure) {
    sampleFailure = {
      input: failingInput,
      error: "Field coverage failed",
      detail: "Records are missing one or more required fields",
    }
  }

  // Test 4: record-count sanity vs estimatedRecords (loose).
  let countSane = true
  let countDetail = ""
  if (suggestion.estimatedRecords && suggestion.estimatedRecords > 0) {
    const lo = Math.max(1, Math.floor(suggestion.estimatedRecords * 0.25))
    const hi = Math.ceil(suggestion.estimatedRecords * 4)
    countSane = records.length >= lo && records.length <= hi
    countDetail = `Got ${records.length} records, expected roughly ${suggestion.estimatedRecords} (range ${lo}-${hi})`
  } else {
    countSane = records.length > 0
    countDetail = `Got ${records.length} records`
  }
  cases.push({
    name: "record-count-sanity",
    passed: countSane,
    message: countSane ? undefined : countDetail,
  })

  const passedCount = cases.filter((c) => c.passed).length
  return {
    passed: cases.every((c) => c.passed),
    total: cases.length,
    passedCount,
    cases,
    records,
    sampleFailure,
  }
}

// ---------------------------------------------------------------------------
// e. Repair loop (model-call / build)
// ---------------------------------------------------------------------------

function repairPrompt(
  current: string,
  schema: InferredSchema,
  report: TestReport
): string {
  const failing = report.cases.filter((c) => !c.passed)
  const failureList = failing
    .map((c) => `- ${c.name}: ${c.message ?? "failed"}`)
    .join("\n")
  const sample = report.sampleFailure
  const sampleInputText = truncate(
    sample?.input.html || sample?.input.markdown,
    3000
  )

  return `The following PLAIN JavaScript extractor failed its tests. Fix it. Output ONLY corrected code, no explanation, no markdown fences.

Schema (entity "${schema.entity}"):
${schemaSummary(schema)}

Failing tests:
${failureList}

Failure detail: ${sample?.detail ?? "see tests"}

Key fixes likely needed: trim() every string field, drop records with empty required fields, ensure required fields always present.

Current extractor:
${current}

Sample input that failed (truncated):
"""
${sampleInputText}
"""`
}

// ---------------------------------------------------------------------------
// g. Serialization
// ---------------------------------------------------------------------------

const EXT: Record<CollectionFormat, string> = {
  jsonl: "jsonl",
  csv: "csv",
  ts: "ts",
}

function serialize(records: unknown[], format: CollectionFormat): string {
  return serializeCollection(records, format)
}

function preview(serialized: string): string {
  return serialized.split("\n").slice(0, PREVIEW_LINES).join("\n")
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

export async function buildCollection(
  params: BuildCollectionParams
): Promise<BuildArtifact> {
  const { runId, discovery, entity, format, extraContext } = params
  let buildModelCalls = 0
  let repairCount = 0

  // a. Select target suggestion.
  const suggestion = selectSuggestion(discovery, entity)

  const pages = discovery.pages
  if (pages.length === 0) {
    throw new Error("Discovery result contains no pages")
  }

  // Resolve inputs once (build phase: no run-phase cache-hit traces here).
  const buildInputs = await Promise.all(pages.map((p) => getPageInput(p)))
  const samplePageIdx =
    buildInputs.findIndex((i) => i.html || i.markdown) >= 0
      ? buildInputs.findIndex((i) => i.html || i.markdown)
      : 0
  const samplePage = pages[samplePageIdx]
  const sampleInput = buildInputs[samplePageIdx]

  // b. Infer schema (model-call build).
  const schema = await inferSchema(runId, suggestion, samplePage, sampleInput)
  buildModelCalls++

  // The build loop is agentic: a Cursor agent (or Gemini fallback) writes the
  // extractor, then patches it via follow-up sends until the golden tests pass.
  const codegen = await createCodeGen(runId)
  let source: string
  let report: TestReport
  try {
    // c. Generate extractor (model-call build).
    source = await codegen.send(
      extractorPrompt(schema, sampleInput, extraContext),
      "generate-extractor",
    )
    buildModelCalls++

    // d. Test across the golden pages.
    report = await testTool(source, pages, buildInputs, schema, suggestion, {
      runId,
      phase: "build",
    })

    // e. Repair loop (each patch is a model-call build).
    while (!report.passed && repairCount < MAX_REPAIRS) {
      source = await codegen.send(
        repairPrompt(source, schema, report),
        `repair-extractor-${repairCount + 1}`,
      )
      buildModelCalls++
      repairCount++
      report = await testTool(source, pages, buildInputs, schema, suggestion, {
        runId,
        phase: "build",
      })
    }
  } finally {
    await codegen.dispose()
  }

  // Freeze the compiled tool.
  const tool: CompiledTool = {
    id: `tool_${runId}`,
    schema: schema as unknown as Record<string, unknown>,
    source,
    version: repairCount + 1,
    family: "collection",
    createdAt: new Date().toISOString(),
  }
  await cacheSet("tools", tool.id, tool)

  // f. RUN phase: deterministic, ZERO model calls.
  const runInputs = await Promise.all(
    pages.map((p) => getPageInput(p, { trace: { runId } }))
  )
  const { records } = await runToolOnPages(tool.source, pages, runInputs, {
    runId,
    phase: "run",
  })

  // g. Serialize + persist.
  const serialized = serialize(records, format)
  const ext = EXT[format]
  await cacheSet("output", `${runId}:${format}`, { format, serialized, records })

  const outputDir = path.resolve(process.cwd(), "output")
  await fs.mkdir(outputDir, { recursive: true })
  const outputPath = path.join(outputDir, `${runId}.${ext}`)
  await fs.writeFile(outputPath, serialized, "utf-8")

  await traceEvent({
    runId,
    stage: "stage2",
    phase: "run",
    kind: "output-written",
    payload: { outputPath, format, records: records.length },
  })

  // h. Build artefact.
  return {
    family: "collection",
    format,
    outputPath,
    preview: preview(serialized),
    records,
    tool,
    buildModelCalls,
    runModelCalls: 0,
    repairCount,
    testsPassed: report.passedCount,
    testsTotal: report.total,
    agent: codegen.agent,
  }
}
