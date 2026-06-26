/**
 * Shared content + workflow types for the two-stage Discover -> Build pipeline.
 * Canonical spec: docs/06-two-stage-pipeline.md
 */

// ---------------------------------------------------------------------------
// Output families & formats
// ---------------------------------------------------------------------------

export type OutputFamily = "document" | "collection" | "media" | "browser-session"

export type DocFormat = "md" | "json"
export type CollectionFormat = "jsonl" | "csv" | "ts"
export type OutputFormat = DocFormat | CollectionFormat

/** Families that are actually buildable in the MVP. */
export const ACTIVE_FAMILIES: OutputFamily[] = ["document", "collection"]
/** Families that are shown but disabled ("Coming soon"). */
export const DISABLED_FAMILIES: OutputFamily[] = ["media", "browser-session"]

export const DOC_FORMATS: DocFormat[] = ["md", "json"]
export const COLLECTION_FORMATS: CollectionFormat[] = ["jsonl", "csv", "ts"]

// ---------------------------------------------------------------------------
// Stage 1: structural discovery
// ---------------------------------------------------------------------------

export type PageRole = "listing" | "detail" | "document" | "mixed" | "unknown"

export type SampleField = {
  name: string
  inferredType: string
  examples: unknown[]
}

export type RepeatedGroup = {
  /** Semantic name (e.g. "event", "product"), never raw DOM terminology. */
  candidateName: string
  count: number
  confidence: number
  sampleFields: SampleField[]
}

export type DocumentSignals = {
  title?: string
  headingCount: number
  paragraphCount: number
  textLength: number
}

export type PageInspection = {
  url: string
  pageRole: PageRole
  structuredDataTypes: string[]
  repeatedGroups: RepeatedGroup[]
  documentSignals: DocumentSignals
  /** Raw artefacts captured during inspection (cached). */
  markdown?: string
  outline?: string
  snapshot?: string
  fetchedAt: string
}

export type SuggestionField = {
  name: string
  type: string
  /** Fraction of inspected pages/records that contained this field (0..1). */
  coverage: number
}

export type Suggestion = {
  family: "document" | "collection"
  label: string
  confidence: number
  estimatedRecords?: number
  fields?: SuggestionField[]
  /** Discovered entity type the suggestion is about (e.g. "event"). */
  entity?: string
}

export type UrlRoleGroup = {
  role: PageRole
  urls: string[]
}

export type DiscoveryResult = {
  runId: string
  pages: PageInspection[]
  roleGroups: UrlRoleGroup[]
  suggestions: Suggestion[]
  createdAt: string
}

// ---------------------------------------------------------------------------
// Raw page (cached scrape artefact)
// ---------------------------------------------------------------------------

export type RawPage = {
  url: string
  hash: string
  contentType?: string
  body: string
  fetchedAt: string
}

// ---------------------------------------------------------------------------
// Stage 2: compiled artefacts
// ---------------------------------------------------------------------------

/** A generated, frozen TypeScript extractor for the Collection path. */
export type CompiledTool = {
  id: string
  schema: Record<string, unknown>
  /** Generated TS source: exported `run(input: { html: string }): Record[]`. */
  source: string
  version: number
  family: "collection"
  createdAt: string
}

export type BuildArtifact = {
  family: OutputFamily
  format: OutputFormat
  /** Absolute path of the written output file, when persisted. */
  outputPath?: string
  /** Text preview for the UI (jsonl head / markdown). */
  preview: string
  /** Parsed records for the Collection path. */
  records?: unknown[]
  /** Generated extractor for the Collection path. */
  tool?: CompiledTool
  buildModelCalls: number
  /** Should be 0 for deterministic runs. */
  runModelCalls: number
  repairCount: number
  testsPassed: number
  testsTotal: number
}
