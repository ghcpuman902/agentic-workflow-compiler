/**
 * Stage 1 Discovery orchestrator.
 *
 * Flow: quick-check all URLs in parallel (instant hint) -> deep inspect each
 * URL in parallel (cached) -> aggregate into role groups + ranked suggestions.
 *
 * Stable entry point: `discoverUrls(urls, runId?)`.
 */
import crypto from "crypto"
import { cacheSet } from "@/lib/cache/fs-cache"
import { traceEvent } from "@/lib/trace/trace"
import type { DiscoveryResult, PageInspection } from "@/lib/workflow/content-types"
import { aggregate } from "./aggregate"
import { inspectUrl } from "./inspect"

/** Normalise + de-duplicate the pasted URL list while preserving order. */
function normalizeUrls(urls: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of urls) {
    const url = raw.trim()
    if (!url) continue
    if (seen.has(url)) continue
    seen.add(url)
    out.push(url)
  }
  return out
}

export async function discoverUrls(
  urls: string[],
  runId: string = crypto.randomUUID()
): Promise<DiscoveryResult> {
  const targets = normalizeUrls(urls)

  await traceEvent({
    runId,
    stage: "stage1",
    phase: "discover",
    kind: "discover-start",
    payload: { urlCount: targets.length, urls: targets },
  })

  // Deep inspect in parallel (each call is cached + isolated by per-URL session).
  const settled = await Promise.allSettled(targets.map((url) => inspectUrl(url, runId)))

  const pages: PageInspection[] = []
  for (let i = 0; i < settled.length; i++) {
    const result = settled[i]
    if (result.status === "fulfilled") {
      pages.push(result.value)
    } else {
      await traceEvent({
        runId,
        stage: "stage1",
        phase: "discover",
        kind: "inspect-error",
        payload: { url: targets[i], error: String(result.reason) },
      })
    }
  }

  const { roleGroups, suggestions } = aggregate(pages)

  const result: DiscoveryResult = {
    runId,
    pages,
    roleGroups,
    suggestions,
    createdAt: new Date().toISOString(),
  }

  await cacheSet("output", `discovery:${runId}`, result)

  await traceEvent({
    runId,
    stage: "stage1",
    phase: "discover",
    kind: "discover-complete",
    payload: {
      pages: pages.length,
      suggestions: suggestions.map((s) => ({
        family: s.family,
        label: s.label,
        confidence: s.confidence,
      })),
      roleGroups: roleGroups.map((g) => ({ role: g.role, count: g.urls.length })),
    },
  })

  return result
}
