/**
 * Stage 1 Discovery public surface.
 *
 * Primary entry point for the integration layer:
 *   discoverUrls(urls: string[], runId?: string): Promise<DiscoveryResult>
 */
export { discoverUrls } from "./discover";
export { quickDiscoverUrls } from "./quick-discover";
export type { QuickDiscoveryResult } from "./quick-discover";
export { inspectUrl } from "./inspect";
export { EXTRACTOR_JS as extractorJs } from "./extractor-js";
export { aggregate } from "./aggregate";
export type { AggregateResult } from "./aggregate";
export { quickRead, deepInspect, runAB } from "./agent-browser";
export type { QuickReadResult, DeepInspectResult } from "./agent-browser";
