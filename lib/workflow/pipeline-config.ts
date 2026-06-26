/** Minimum top-suggestion confidence before quick discover stops probing. */
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.55

/** Max URLs inspected sequentially during quick discover (keeps Stage 1 fast). */
export const MAX_PROBE_URLS = 5

export type PipelineConfig = {
  confidenceThreshold: number
  maxProbeUrls: number
}

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  confidenceThreshold: DEFAULT_CONFIDENCE_THRESHOLD,
  maxProbeUrls: MAX_PROBE_URLS,
}

export function resolvePipelineConfig(
  partial?: Partial<PipelineConfig>,
): PipelineConfig {
  return {
    confidenceThreshold:
      partial?.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD,
    maxProbeUrls: partial?.maxProbeUrls ?? MAX_PROBE_URLS,
  }
}
