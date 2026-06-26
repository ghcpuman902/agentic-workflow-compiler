/**
 * Execution tracing for the compiler.
 *
 * Every event is always appended to a local JSONL file (.cache/traces/<runId>.jsonl)
 * so the demo never blocks on ClickHouse. An optional external sink (set by the
 * ClickHouse tracing module via `setTraceSink`) mirrors events to ClickHouse.
 */
import { promises as fs } from "fs"
import path from "path"

export type TracePhase = "discover" | "build" | "run"
export type TraceStage = "stage1" | "stage2" | "system"

export type TraceEvent = {
  runId: string
  stage: TraceStage
  phase: TracePhase
  kind: string
  payload?: Record<string, unknown>
  ts: string
}

const TRACE_DIR = path.resolve(process.cwd(), ".cache", "traces")

type TraceSink = (event: TraceEvent) => Promise<void>

let externalSink: TraceSink | null = null

/** Wire an additional sink (e.g. ClickHouse). Pass null to remove it. */
export function setTraceSink(sink: TraceSink | null): void {
  externalSink = sink
}

export async function traceEvent(event: Omit<TraceEvent, "ts">): Promise<void> {
  const full: TraceEvent = { ...event, ts: new Date().toISOString() }

  try {
    await fs.mkdir(TRACE_DIR, { recursive: true })
    await fs.appendFile(
      path.join(TRACE_DIR, `${full.runId}.jsonl`),
      JSON.stringify(full) + "\n",
      "utf-8"
    )
  } catch {
    // Tracing must never throw into the main flow.
  }

  if (externalSink) {
    try {
      await externalSink(full)
    } catch {
      // External sink failures are non-fatal; local JSONL already has the event.
    }
  }
}

export async function readTrace(runId: string): Promise<TraceEvent[]> {
  try {
    const raw = await fs.readFile(
      path.join(TRACE_DIR, `${runId}.jsonl`),
      "utf-8"
    )
    return raw
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as TraceEvent)
  } catch {
    return []
  }
}

/** Convenience summary for the UI: counts of model calls by phase, cache hits, etc. */
export type TraceSummary = {
  total: number
  buildModelCalls: number
  runModelCalls: number
  cacheHits: number
  byPhase: Record<TracePhase, number>
}

export async function summarizeTrace(runId: string): Promise<TraceSummary> {
  const events = await readTrace(runId)
  const summary: TraceSummary = {
    total: events.length,
    buildModelCalls: 0,
    runModelCalls: 0,
    cacheHits: 0,
    byPhase: { discover: 0, build: 0, run: 0 },
  }
  for (const e of events) {
    summary.byPhase[e.phase] = (summary.byPhase[e.phase] ?? 0) + 1
    if (e.kind === "model-call") {
      if (e.phase === "run") summary.runModelCalls += 1
      else summary.buildModelCalls += 1
    }
    if (e.kind === "cache-hit") summary.cacheHits += 1
  }
  return summary
}
