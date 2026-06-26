import type {
  BuildArtifact,
  CollectionFormat,
  DiscoveryResult,
  DocFormat,
  OutputFamily,
  Suggestion,
} from "@/lib/workflow/content-types"
import type { QuickDiscoveryResult } from "@/lib/discovery/quick-discover"

export type NodeRunState =
  | "idle"
  | "running"
  | "paused"
  | "completed"
  | "error"
  | "stopped"

export type PipelineNodeKind =
  | "url-input"
  | "quick-discover"
  | "output-select"
  | "confirm-build"
  | "generate-test"
  | "url-queue"

export type WorkflowNodeKindData = {
  nodeKind: PipelineNodeKind
  runState?: NodeRunState
  gated?: boolean
}

export type PipelineState = {
  urlText: string
  allUrls: string[]
  probedUrls: string[]
  pendingUrls: string[]
  discovery: QuickDiscoveryResult | null
  selectedFamily: "document" | "collection"
  selectedSuggestion: Suggestion | null
  docFormat: DocFormat
  collectionFormat: CollectionFormat
  outputConfirmed: boolean
  buildConfirmed: boolean
  artifact: BuildArtifact | null
  error: string | null
  confidenceThreshold: number
}

export type DiscoverResponse = {
  ok: boolean
  mode?: "quick" | "full"
  result?: QuickDiscoveryResult
  error?: string
}

export type BuildResponse = {
  ok: boolean
  artifact?: BuildArtifact
  error?: string
}

export function isQuickDiscovery(
  result: DiscoveryResult | QuickDiscoveryResult,
): result is QuickDiscoveryResult {
  return "pendingUrls" in result && Array.isArray(result.pendingUrls)
}

export const FAMILY_LABELS: Record<OutputFamily, string> = {
  document: "Document",
  collection: "Collection",
  media: "Media",
  "browser-session": "Browser session",
}
