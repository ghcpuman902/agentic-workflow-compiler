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
// Item type × cardinality (Blender-style output model)
//
// A node carries a single ITEM TYPE (the datatype of one output item). Whether
// the output is single or an array (CARDINALITY) is DERIVED from the input URL
// count, never declared on the node. The build family + concrete format are in
// turn derived from (itemType, cardinality). See docs/06-two-stage-pipeline.md.
// ---------------------------------------------------------------------------

export type ItemType = "markdown" | "html" | "json" | "csv-row"
export type Cardinality = "single" | "array"

export const ITEM_TYPES: ItemType[] = ["markdown", "html", "json", "csv-row"]

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  markdown: "Markdown",
  html: "HTML",
  json: "JSON",
  "csv-row": "CSV row",
}

/** Cardinality is a property of the input: many URLs ⇒ array, one URL ⇒ single. */
export const cardinalityForUrlCount = (urlCount: number): Cardinality =>
  urlCount > 1 ? "array" : "single"

/** A record-shaped item type implies the Collection build path. */
export const isRecordItemType = (itemType: ItemType): boolean =>
  itemType === "csv-row" || itemType === "json"

export type ResolvedOutput = {
  family: "document" | "collection"
  format: OutputFormat
}

/**
 * Derive the build family + concrete format from the singular item type and the
 * input-derived cardinality. csv-row and arrayed json are record collections;
 * everything else is a single document.
 */
export const resolveOutput = (
  itemType: ItemType,
  cardinality: Cardinality,
): ResolvedOutput => {
  if (itemType === "csv-row") return { family: "collection", format: "csv" }
  if (itemType === "json" && cardinality === "array")
    return { family: "collection", format: "jsonl" }
  if (itemType === "json") return { family: "document", format: "json" }
  // markdown + html (html approximated as markdown until a real HTML writer exists)
  return { family: "document", format: "md" }
}

/** Default item type to pre-select on the spider given the input cardinality. */
export const defaultItemType = (cardinality: Cardinality): ItemType =>
  cardinality === "array" ? "json" : "markdown"

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
  /** Which agent generated the extractor (Collection path only). */
  agent?: "cursor" | "gemini"
}
