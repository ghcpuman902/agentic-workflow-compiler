/**
 * Deterministic spider RUN phase.
 *
 * The discover node's play button builds + freezes a `CompiledTool` against the
 * golden pages. The spider node's own play button then runs that frozen tool
 * across ALL supplied URLs (capped by `maxInputUrls`) with ZERO model calls —
 * the workflow-compiler thesis: agentic at build time, deterministic at run.
 *
 * URL inspection is LLM-free (heuristic browser reads), so this stays within
 * the "no model calls during run" guarantee. See docs/06-two-stage-pipeline.md.
 */
import { cacheGet } from "@/lib/cache/fs-cache"
import { runInProcess } from "@/lib/build/execute"
import { quickRead } from "@/lib/discovery/agent-browser"
import { inspectUrl } from "@/lib/discovery/inspect"
import { traceEvent } from "@/lib/trace/trace"
import type {
  CompiledTool,
  PageInspection,
  RawPage,
} from "@/lib/workflow/content-types"

const TIMEOUT_MS = 4000
const PREVIEW_LINES = 15

async function getPageInput(
  page: PageInspection,
): Promise<{ html?: string; markdown?: string }> {
  const raw = await cacheGet<RawPage>("raw", page.url)
  return {
    html: raw?.body ?? page.snapshot,
    markdown: page.markdown ?? page.outline,
  }
}

export type RunSpiderParams = {
  runId: string
  urls: string[]
  maxInputUrls: number
}

export type RunSpiderResult = {
  records: unknown[]
  preview: string
  urlsRun: number
}

/** Inspect each URL (LLM-free) and run the frozen extractor in the vm sandbox. */
export async function runSpiderAcrossUrls(
  params: RunSpiderParams,
): Promise<RunSpiderResult> {
  const urls = params.urls.slice(0, Math.max(1, params.maxInputUrls))

  const tool = await cacheGet<CompiledTool>("tools", `tool_${params.runId}`)
  if (!tool) {
    throw new Error("No frozen extractor for this spider — build it first")
  }

  const records: unknown[] = []
  let urlsRun = 0

  for (const url of urls) {
    let page: PageInspection
    try {
      await Promise.allSettled([quickRead(url)])
      page = await inspectUrl(url, params.runId)
    } catch (error) {
      await traceEvent({
        runId: params.runId,
        stage: "stage2",
        phase: "run",
        kind: "inspect-error",
        payload: { url, error: String(error) },
      })
      continue
    }

    const result = await runInProcess(tool.source, await getPageInput(page), TIMEOUT_MS)
    urlsRun++
    await traceEvent({
      runId: params.runId,
      stage: "stage2",
      phase: "run",
      kind: "node-exec",
      payload: {
        url,
        ok: !result.error,
        error: result.error,
        count: Array.isArray(result.output) ? result.output.length : 0,
      },
    })
    if (Array.isArray(result.output)) records.push(...result.output)
  }

  const preview = records
    .slice(0, PREVIEW_LINES)
    .map((record) => JSON.stringify(record))
    .join("\n")

  return { records, preview, urlsRun }
}
