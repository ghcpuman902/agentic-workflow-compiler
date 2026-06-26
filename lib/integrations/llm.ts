/**
 * LLM Integration Wrapper
 * Used to test orchestration and node generation, plus Stage 2 build-time helpers.
 */
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { traceEvent } from "@/lib/trace/trace";

const MODEL = "gemini-2.5-flash";

function requireApiKey(): void {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GOOGLE_GENERATIVE_AI_API_KEY is not set in environment variables"
    );
  }
}

export async function askLLM(prompt: string): Promise<string> {
  requireApiKey();

  // Using Gemini instead of OpenAI as per hackathon requirement
  const { text } = await generateText({
    model: google(MODEL), // or "gemini-1.5-pro" / "gemini-2.5-pro"
    messages: [{ role: "user", content: prompt }],
  });

  return text;
}

// ---------------------------------------------------------------------------
// Stage 2 build-time helpers
// ---------------------------------------------------------------------------

export type BuildCallOptions = {
  /** When supplied, every call emits a build-phase model-call trace event. */
  runId?: string;
  /** Human-readable label of why this call is happening (for tracing/debug). */
  purpose?: string;
};

/**
 * Raw build-time text generation. Always tagged as a build-phase model-call so
 * the trace can distinguish Gemini usage during build vs the deterministic run.
 */
async function generateBuildText(
  prompt: string,
  opts: BuildCallOptions = {}
): Promise<string> {
  requireApiKey();

  if (opts.runId) {
    await traceEvent({
      runId: opts.runId,
      stage: "stage2",
      phase: "build",
      kind: "model-call",
      payload: { purpose: opts.purpose ?? "generate", model: MODEL },
    });
  }

  const { text } = await generateText({
    model: google(MODEL),
    messages: [{ role: "user", content: prompt }],
  });

  return text;
}

/** Strip ```json / ``` fences (and language hints) from a fenced block. */
function stripFences(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```[a-zA-Z0-9]*\s*\n([\s\S]*?)\n?```$/);
  if (fenceMatch) return fenceMatch[1].trim();
  return trimmed;
}

/** Pull the first balanced JSON object/array out of an arbitrary string. */
function extractJsonText(raw: string): string {
  const unfenced = stripFences(raw);

  // Fast path: already valid JSON.
  try {
    JSON.parse(unfenced);
    return unfenced;
  } catch {
    // fall through to brace/bracket scanning
  }

  const firstObj = unfenced.indexOf("{");
  const firstArr = unfenced.indexOf("[");
  const candidates = [firstObj, firstArr].filter((i) => i >= 0);
  if (candidates.length === 0) return unfenced;
  const start = Math.min(...candidates);
  const open = unfenced[start];
  const close = open === "{" ? "}" : "]";

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < unfenced.length; i++) {
    const ch = unfenced[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return unfenced.slice(start, i + 1);
    }
  }
  return unfenced.slice(start);
}

/**
 * Generate JSON and parse it into `T`. Uses generateText + robust extraction
 * (fence stripping + balanced-brace scan) to avoid adding a schema dependency.
 */
export async function generateJson<T>(
  prompt: string,
  opts: BuildCallOptions = {}
): Promise<T> {
  const text = await generateBuildText(prompt, {
    ...opts,
    purpose: opts.purpose ?? "generate-json",
  });
  const jsonText = extractJsonText(text);
  try {
    return JSON.parse(jsonText) as T;
  } catch (err) {
    throw new Error(
      `Failed to parse model JSON output: ${(err as Error).message}\n--- raw ---\n${text}`
    );
  }
}

/**
 * Generate source code, stripping any markdown code fences (```ts / ```js).
 * Returns plain code text.
 */
export async function generateCode(
  prompt: string,
  opts: BuildCallOptions = {}
): Promise<string> {
  const text = await generateBuildText(prompt, {
    ...opts,
    purpose: opts.purpose ?? "generate-code",
  });
  return stripFences(text);
}
