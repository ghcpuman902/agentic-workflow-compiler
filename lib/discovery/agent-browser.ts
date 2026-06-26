/**
 * Thin wrapper around the agent-browser CLI (Vercel Labs), shelled out from Node.
 *
 * We invoke the project-local native binary directly at
 * `<repoRoot>/node_modules/.bin/agent-browser` (verified: agent-browser 0.30.1).
 * NEVER via `pnpm exec` — that adds startup latency and resolution surprises.
 *
 * Two speeds:
 *   - quickRead(url): `read <url> --json` — pure HTTP fetch + markdown, NO Chrome.
 *   - deepInspect(url): per-URL `--session` + `batch` (open + wait + snapshot)
 *     followed by a direct `eval` of the in-page extractor.
 *
 * Observed JSON shapes (probed against live pages with v0.30.1):
 *   read/open/eval/snapshot:  { success: boolean, data: <payload>, error: string|null }
 *     - read.data:     { content, contentType, finalUrl, source, status, truncated, url }
 *     - open.data:     { title, url }
 *     - eval.data:     { origin, result }            // result = the JS return value
 *     - snapshot.data: { origin, refs: {eN:{name,role}}, snapshot: "<text tree>" }
 *   batch:  TOP-LEVEL ARRAY of { command: string[], error, result, success }
 *           (NOT wrapped in { success, data }).
 *   wait (inside batch): result = { state: "networkidle" }
 *
 * Tokenization quirk: inside `batch`, each command string is split on whitespace
 * by the CLI. A large `eval` extractor would be mangled, so the extractor is run
 * as its OWN `eval` invocation (single argv element = no tokenization) rather than
 * inside the batch.
 */
import { execFile } from "child_process"
import path from "path"
import { promisify } from "util"
import { hashKey } from "@/lib/cache/fs-cache"

const execFileAsync = promisify(execFile)

const AB_BIN = path.resolve(process.cwd(), "node_modules", ".bin", "agent-browser")

const QUICK_TIMEOUT_MS = 30_000
const DEEP_TIMEOUT_MS = 60_000
/** Auto-shutdown the background daemon after a run so it never lingers. */
const IDLE_TIMEOUT_MS = "180000"
/** Snapshots / eval payloads can be large; give execFile plenty of headroom. */
const MAX_BUFFER = 16 * 1024 * 1024

type AbEnvelope = { success: boolean; data: unknown; error: string | null }
type AbBatchItem = {
  command: string[]
  success: boolean
  error: string | null
  result: unknown
}

/**
 * Parse CLI stdout into JSON defensively. The daemon sometimes prints a warning
 * line (e.g. "⚠ Daemon version mismatch detected, restarting...") before the
 * JSON payload, so we locate the first `{` or `[` and parse from there.
 */
function parseJsonLoose(stdout: string): unknown {
  const trimmed = stdout.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const firstBrace = trimmed.indexOf("{")
    const firstBracket = trimmed.indexOf("[")
    const candidates = [firstBrace, firstBracket].filter((i) => i >= 0)
    if (candidates.length === 0) {
      throw new Error(`agent-browser: no JSON found in output: ${trimmed.slice(0, 200)}`)
    }
    const start = Math.min(...candidates)
    return JSON.parse(trimmed.slice(start))
  }
}

/**
 * Run the agent-browser CLI with the given args. `--json` is always appended.
 * Returns the parsed JSON (envelope object for normal commands, array for batch).
 */
export async function runAB(args: string[], timeoutMs = QUICK_TIMEOUT_MS): Promise<unknown> {
  const { stdout } = await execFileAsync(AB_BIN, [...args, "--json"], {
    timeout: timeoutMs,
    maxBuffer: MAX_BUFFER,
    env: { ...process.env, AGENT_BROWSER_IDLE_TIMEOUT_MS: IDLE_TIMEOUT_MS },
  })
  return parseJsonLoose(stdout)
}

function asEnvelope(value: unknown): AbEnvelope {
  if (value && typeof value === "object" && "success" in value) {
    return value as AbEnvelope
  }
  return { success: false, data: null, error: "unexpected agent-browser output shape" }
}

// ---------------------------------------------------------------------------
// Quick-check: HTTP fetch + markdown, no Chrome. Runs for every URL in parallel.
// ---------------------------------------------------------------------------

export type QuickReadResult = {
  markdown?: string
  outline?: string
  title?: string
  textLength: number
}

/** Derive a human title from the first markdown heading, else first non-empty line. */
function titleFromMarkdown(markdown: string | undefined): string | undefined {
  if (!markdown) return undefined
  for (const line of markdown.split("\n")) {
    const heading = line.match(/^#{1,6}\s+(.*\S)\s*$/)
    if (heading) return heading[1].trim()
  }
  const firstLine = markdown.split("\n").find((l) => l.trim().length > 0)
  return firstLine?.trim()
}

export async function quickRead(url: string): Promise<QuickReadResult> {
  const [readRes, outlineRes] = await Promise.allSettled([
    runAB(["read", url], QUICK_TIMEOUT_MS),
    runAB(["read", url, "--outline"], QUICK_TIMEOUT_MS),
  ])

  let markdown: string | undefined
  if (readRes.status === "fulfilled") {
    const env = asEnvelope(readRes.value)
    const data = env.data as { content?: string } | null
    if (env.success && data?.content) markdown = data.content
  }

  let outline: string | undefined
  if (outlineRes.status === "fulfilled") {
    const env = asEnvelope(outlineRes.value)
    const data = env.data as { content?: string } | null
    if (env.success && data?.content) outline = data.content
  }

  return {
    markdown,
    outline,
    title: titleFromMarkdown(markdown),
    textLength: markdown?.length ?? 0,
  }
}

// ---------------------------------------------------------------------------
// Deep inspect: JS-rendered DOM via Chrome. Resilient — returns nulls on failure.
// ---------------------------------------------------------------------------

export type DeepInspectResult = {
  snapshot?: string
  evalResult?: unknown
  /** True when Chrome could not be driven; caller should fall back to quickRead. */
  unavailable: boolean
}

/** Stable per-URL session name so parallel inspections stay isolated. */
function sessionFor(url: string): string {
  return `disc-${hashKey(url).slice(0, 16)}`
}

export async function deepInspect(url: string, extractorJs: string): Promise<DeepInspectResult> {
  const session = sessionFor(url)
  try {
    // Heavy navigation steps chained in one invocation (simple, space-free args).
    const batchRaw = await runAB(
      [
        "--session",
        session,
        "batch",
        `open ${url}`,
        "wait --load networkidle",
        "snapshot -i",
      ],
      DEEP_TIMEOUT_MS
    )

    let snapshot: string | undefined
    if (Array.isArray(batchRaw)) {
      const items = batchRaw as AbBatchItem[]
      const openOk = items[0]?.success === true
      if (!openOk) {
        return { unavailable: true }
      }
      const snap = items.find((i) => i.command[0] === "snapshot")
      const snapData = snap?.result as { snapshot?: string } | undefined
      snapshot = snapData?.snapshot
    } else {
      // Some failures surface as a single envelope rather than a batch array.
      const env = asEnvelope(batchRaw)
      if (!env.success) return { unavailable: true }
    }

    // The extractor is run separately (single argv = no batch tokenization).
    const evalRaw = await runAB(["--session", session, "eval", extractorJs], DEEP_TIMEOUT_MS)
    const evalEnv = asEnvelope(evalRaw)
    const evalData = evalEnv.data as { result?: unknown } | null
    const evalResult = evalEnv.success ? evalData?.result : undefined

    return { snapshot, evalResult, unavailable: false }
  } catch {
    // Chrome unavailable / timeout / crash — degrade gracefully to quickRead only.
    return { unavailable: true }
  } finally {
    // Best-effort cleanup; never let a close failure surface.
    try {
      await runAB(["--session", session, "close"], QUICK_TIMEOUT_MS)
    } catch {
      /* ignore */
    }
  }
}
