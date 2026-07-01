import type { QuickDiscoveryResult } from "@/lib/discovery/quick-discover"
import type {
  Cardinality,
  ItemType,
  OutputFormat,
  Suggestion,
} from "@/lib/workflow/content-types"

export type FlowNodeKind = "url" | "discover-factory" | "spider" | "preview" | "llm"

export type ActivityStepStatus = "pending" | "running" | "complete" | "error"

export type ActivityStep = {
  id: string
  label: string
  detail?: string
  status: ActivityStepStatus
}

export type DiscoverPhase =
  | "idle"
  | "running"
  | "select-output"
  | "building"
  | "done"
  | "error"

export type UrlNodeData = {
  kind: "url"
  url: string
}

/** Build/test status of a spider's frozen extractor. */
export type SpiderBuildStatus =
  | "unbuilt"
  | "building"
  | "approved"
  | "failed"

/** Deterministic run state when the spider executes across all URLs. */
export type SpiderRunState = "idle" | "running" | "done" | "error"

/** Summary of a completed build (golden test pass + frozen tool). */
export type SpiderBuildResult = {
  family: "document" | "collection"
  format: string
  preview: string
  recordCount: number
  testsPassed: number
  testsTotal: number
  repairCount: number
  buildModelCalls: number
  agent: "cursor" | "gemini"
  /** Extracted records (golden set), kept so the preview can re-serialize on
   * the fly when the output format changes — without a rebuild. */
  records?: unknown[]
}

/** Result of a deterministic run across all supplied URLs. */
export type SpiderRunResult = {
  preview: string
  recordCount: number
  urlsRun: number
  /** Full run records, kept for on-the-fly preview re-serialization. */
  records?: unknown[]
}

export type SpiderPayload = {
  label: string
  /** Locked at discover time — datatype of one output item. */
  itemType: ItemType
  /** Single vs array — locked from discovery + URL count. */
  cardinality: Cardinality
  /** Document vs collection — locked from the discover output choice. */
  outputFamily?: "document" | "collection"
  /** Active interchange format (jsonl/csv/ts or md/json); re-serializes instantly. */
  outputFormat?: OutputFormat
  /** Cap on how many URLs the deterministic run will process. */
  maxInputUrls: number
  /** Optional free-text hint forwarded to the build agent. */
  extraContext?: string
  confidence: number
  entity?: string
  suggestion?: Suggestion
  discovery: QuickDiscoveryResult | null
  runId?: string
  buildStatus: SpiderBuildStatus
  build?: SpiderBuildResult
  buildError?: string
  runState: SpiderRunState
  run?: SpiderRunResult
  runError?: string
}

export type SpiderNodeData = SpiderPayload & {
  kind: "spider"
  detached: boolean
  factoryId: string
}

export type DiscoverFactoryData = {
  kind: "discover-factory"
  confidenceThreshold: number
  /** Max pages probed during Stage 1 discovery (the golden set). */
  maxDiscoverPages: number
  /** Optional free-text hint forwarded to discovery + the build agent. */
  extraContext: string
  phase: DiscoverPhase
  settingsLocked: boolean
  activitySteps: ActivityStep[]
  /** Discovery result awaiting output choice (select-output phase). */
  pendingDiscovery?: QuickDiscoveryResult | null
  /** Index into pendingDiscovery.suggestions — chosen on the discover node. */
  selectedSuggestionIndex?: number
  /** Pre-assigned id used when the spider is materialized onto the canvas */
  spiderNodeId: string | null
  /** Spider rendered inside the factory until dragged out */
  embeddedSpider: SpiderPayload | null
  discovery: QuickDiscoveryResult | null
  error?: string
  startedAt?: number
}

import type { PreviewMode } from "@/lib/flow/preview-modes"

export type PreviewNodeData = {
  kind: "preview"
  itemIndex: number
  /** Manual viewer override; auto keeps content detection. */
  mode: PreviewMode
}

export type LlmNodeData = {
  kind: "llm"
  prompt: string
  modelType: "gemini"
  reasoningLevel: "none" | "low" | "high"
  outputMethod: "text" | "json"
  preview?: string
}

export type FlowNodeData =
  | UrlNodeData
  | DiscoverFactoryData
  | SpiderNodeData
  | PreviewNodeData
  | LlmNodeData

export const NODE_DEFAULT_SIZE: Record<
  FlowNodeKind,
  { width: number; height: number }
> = {
  url: { width: 240, height: 160 },
  "discover-factory": { width: 380, height: 260 },
  spider: { width: 300, height: 220 },
  preview: { width: 360, height: 320 },
  llm: { width: 280, height: 240 },
}

export const FACTORY_EXPANDED_HEIGHT = 420
