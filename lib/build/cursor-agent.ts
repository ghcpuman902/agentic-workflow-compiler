/**
 * Stage 2 code generation via a Cursor agent (`@cursor/sdk`).
 *
 * The discover node's build loop uses an AGENT (not a single Gemini round-trip):
 * `Agent.create` + `agent.send` with follow-up sends for repair, keeping full
 * conversation context across the build → test → repair cycle. Runs locally
 * against the repo `cwd` with the `composer-2.5` model.
 *
 * If `CURSOR_API_KEY` is missing or the agent fails to start
 * (`CursorAgentError`), callers fall back to the Gemini `generateCode` path so
 * the demo never hard-fails. See docs/06-two-stage-pipeline.md.
 */
import type { SDKAgent } from "@cursor/sdk"

import { generateCode } from "@/lib/integrations/llm"
import { traceEvent } from "@/lib/trace/trace"

const MODEL_ID = "composer-2.5"

/**
 * `@cursor/sdk` is a Node-only package that ships webpack-style asset files
 * (e.g. `403.js.LICENSE.txt`) Turbopack can't bundle. We load it via a runtime
 * `createRequire` so the bundler never statically resolves into the package —
 * this code path only ever runs inside server route handlers.
 */
type CursorSdkModule = typeof import("@cursor/sdk")

let cachedSdk: CursorSdkModule | null = null

async function loadCursorSdk(): Promise<CursorSdkModule> {
  if (cachedSdk) return cachedSdk
  const { createRequire } = await import("node:module")
  const requireFromHere = createRequire(import.meta.url)
  cachedSdk = requireFromHere("@cursor/sdk") as CursorSdkModule
  return cachedSdk
}

export type CodeGen = {
  /** Which underlying agent produced the code. */
  agent: "cursor" | "gemini"
  /** Generate or repair extractor source from a prompt. Returns plain code. */
  send: (prompt: string, purpose: string) => Promise<string>
  /** Release any agent handles. Always called in a finally. */
  dispose: () => Promise<void>
}

export const cursorAgentAvailable = (): boolean =>
  Boolean(process.env.CURSOR_API_KEY)

/** Strip ```lang ... ``` fences the agent may wrap code in. */
function stripFences(raw: string): string {
  const trimmed = raw.trim()
  const fence = trimmed.match(/^```[a-zA-Z0-9]*\s*\n([\s\S]*?)\n?```$/)
  return fence ? fence[1].trim() : trimmed
}

/**
 * Build a `CodeGen` backed by a Cursor agent session. Falls back to Gemini when
 * the key is absent or the agent cannot start. The returned `send` keeps
 * conversation context for repair turns.
 */
export async function createCodeGen(runId: string): Promise<CodeGen> {
  if (!cursorAgentAvailable()) return geminiCodeGen(runId)

  const sdk = await loadCursorSdk()

  let agent: SDKAgent
  try {
    agent = await sdk.Agent.create({
      apiKey: process.env.CURSOR_API_KEY,
      model: { id: MODEL_ID },
      local: { cwd: process.cwd(), settingSources: [] },
    })
  } catch (error) {
    // Thrown CursorAgentError == the run never started (auth/config/network).
    if (error instanceof sdk.CursorAgentError) {
      await traceEvent({
        runId,
        stage: "stage2",
        phase: "build",
        kind: "agent-fallback",
        payload: { reason: error.message, retryable: error.isRetryable },
      })
      return geminiCodeGen(runId)
    }
    throw error
  }

  return {
    agent: "cursor",
    send: async (prompt, purpose) => {
      await traceEvent({
        runId,
        stage: "stage2",
        phase: "build",
        kind: "model-call",
        payload: { purpose, model: MODEL_ID, agent: "cursor" },
      })
      const run = await agent.send(prompt)
      const result = await run.wait()
      if (result.status === "error") {
        throw new Error(`Cursor agent run failed (${result.id})`)
      }
      return stripFences(result.result ?? "")
    },
    dispose: async () => {
      await agent[Symbol.asyncDispose]()
    },
  }
}

/** Gemini-backed CodeGen — stateless, every send carries full context. */
function geminiCodeGen(runId: string): CodeGen {
  return {
    agent: "gemini",
    send: (prompt, purpose) => generateCode(prompt, { runId, purpose }),
    dispose: async () => {},
  }
}
