/**
 * Sequential quick discover: probe one URL at a time (up to maxProbe) until
 * suggestion confidence meets the threshold — keeps Stage 1 fast and predictable.
 */
import crypto from "crypto"

import { cacheSet } from "@/lib/cache/fs-cache"
import { traceEvent } from "@/lib/trace/trace"
import type { DiscoveryResult, PageInspection } from "@/lib/workflow/content-types"
import {
  resolvePipelineConfig,
  type PipelineConfig,
} from "@/lib/workflow/pipeline-config"

import { resolveDiscoveryInputIntent } from "@/lib/workflow/discovery-intent"

import { aggregate } from "./aggregate"
import { quickRead } from "./agent-browser"
import { inspectUrl } from "./inspect"

function normalizeUrls(urls: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of urls) {
    const url = raw.trim()
    if (!url || seen.has(url)) continue
    seen.add(url)
    out.push(url)
  }
  return out
}

export type QuickDiscoveryResult = DiscoveryResult & {
  probedUrls: string[]
  pendingUrls: string[]
  confidenceMet: boolean
  topConfidence: number
  confidenceThreshold: number
  maxProbeUrls: number
  /** collection = multiple URLs pasted; ambiguous = single URL (document or collection). */
  inputIntent: "collection" | "ambiguous"
  totalInputUrls: number
}

export async function quickDiscoverUrls(
  allUrls: string[],
  options?: Partial<PipelineConfig> & { runId?: string },
): Promise<QuickDiscoveryResult> {
  const config = resolvePipelineConfig(options)
  const normalized = normalizeUrls(allUrls)
  const runId = options?.runId ?? crypto.randomUUID()
  const probeLimit = Math.min(config.maxProbeUrls, normalized.length)

  await traceEvent({
    runId,
    stage: "stage1",
    phase: "discover",
    kind: "quick-discover-start",
    payload: {
      totalUrls: normalized.length,
      maxProbe: probeLimit,
      confidenceThreshold: config.confidenceThreshold,
    },
  })

  const probedUrls: string[] = []
  const pages: PageInspection[] = []
  let topConfidence = 0
  let confidenceMet = false

  for (let i = 0; i < probeLimit; i++) {
    const url = normalized[i]
    probedUrls.push(url)

    await Promise.allSettled([quickRead(url)])

    try {
      const page = await inspectUrl(url, runId)
      pages.push(page)
    } catch (error) {
      await traceEvent({
        runId,
        stage: "stage1",
        phase: "discover",
        kind: "inspect-error",
        payload: { url, error: String(error) },
      })
    }

    const { roleGroups, suggestions } = aggregate(pages, {
      totalInputUrls: normalized.length,
    })
    topConfidence = suggestions[0]?.confidence ?? 0
    confidenceMet = topConfidence >= config.confidenceThreshold

    await traceEvent({
      runId,
      stage: "stage1",
      phase: "discover",
      kind: "quick-discover-probe",
      payload: {
        url,
        probeIndex: i + 1,
        topConfidence,
        confidenceMet,
      },
    })

    if (confidenceMet) {
      const result = await finalizeQuickDiscovery({
        runId,
        pages,
        roleGroups,
        suggestions,
        probedUrls,
        pendingUrls: normalized.slice(probedUrls.length),
        topConfidence,
        confidenceMet,
        config,
        totalInputUrls: normalized.length,
      })
      return result
    }
  }

  const { roleGroups, suggestions } = aggregate(pages, {
    totalInputUrls: normalized.length,
  })
  topConfidence = suggestions[0]?.confidence ?? 0

  return finalizeQuickDiscovery({
    runId,
    pages,
    roleGroups,
    suggestions,
    probedUrls,
    pendingUrls: normalized.slice(probedUrls.length),
    topConfidence,
    confidenceMet: topConfidence >= config.confidenceThreshold,
    config,
    totalInputUrls: normalized.length,
  })
}

async function finalizeQuickDiscovery(input: {
  runId: string
  pages: PageInspection[]
  roleGroups: DiscoveryResult["roleGroups"]
  suggestions: DiscoveryResult["suggestions"]
  probedUrls: string[]
  pendingUrls: string[]
  topConfidence: number
  confidenceMet: boolean
  config: PipelineConfig
  totalInputUrls: number
}): Promise<QuickDiscoveryResult> {
  const result: QuickDiscoveryResult = {
    runId: input.runId,
    pages: input.pages,
    roleGroups: input.roleGroups,
    suggestions: input.suggestions,
    createdAt: new Date().toISOString(),
    probedUrls: input.probedUrls,
    pendingUrls: input.pendingUrls,
    confidenceMet: input.confidenceMet,
    topConfidence: input.topConfidence,
    confidenceThreshold: input.config.confidenceThreshold,
    maxProbeUrls: input.config.maxProbeUrls,
    inputIntent: resolveDiscoveryInputIntent(input.totalInputUrls),
    totalInputUrls: input.totalInputUrls,
  }

  await cacheSet("output", `discovery:${input.runId}`, result)

  await traceEvent({
    runId: input.runId,
    stage: "stage1",
    phase: "discover",
    kind: "quick-discover-complete",
    payload: {
      probed: input.probedUrls.length,
      pending: input.pendingUrls.length,
      topConfidence: input.topConfidence,
      confidenceMet: input.confidenceMet,
    },
  })

  return result
}
