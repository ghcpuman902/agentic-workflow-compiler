/**
 * Safe in-process execution of a GENERATED EXTRACTOR.
 *
 * The generated artefact is PLAIN JavaScript (ES2020), not TypeScript: it
 * defines a function `run(input)` that returns an array of records. We execute
 * it inside Node's `vm` module with a heavily restricted context (no require,
 * no network, no process) and a hard timeout.
 */
import vm from "vm"

export type ExtractorInput = { html?: string; markdown?: string }

export type RunResult = {
  output: unknown
  logs: string[]
  error?: string
}

/**
 * Wrap the generated source so the sandbox resolves `run`, calls it with the
 * provided `__input`, and returns the result — ALL inside a single
 * `runInNewContext` call so the `timeout` covers the extractor execution too.
 *
 * (The vm timeout only applies to code executed within the script; calling a
 * returned function later in the host context would NOT be bounded.)
 *
 * The model may emit any of:
 *   - `function run(input) { ... }`
 *   - `const run = (input) => { ... }`
 *   - `module.exports = run` / CommonJS-style exports (fences already stripped)
 */
function wrapSource(source: string): string {
  return `
"use strict";
const module = { exports: {} };
const exports = module.exports;
${source}
;(function () {
  let fn;
  if (typeof run === "function") fn = run;
  else if (module && module.exports) {
    if (typeof module.exports === "function") fn = module.exports;
    else if (typeof module.exports.run === "function") fn = module.exports.run;
    else if (typeof module.exports.default === "function") fn = module.exports.default;
  }
  if (typeof fn !== "function") {
    throw new Error("Generated artefact does not define a callable run(input)");
  }
  return fn(__input);
})();
`
}

export async function runInProcess(
  source: string,
  input: unknown,
  timeoutMs = 4000
): Promise<RunResult> {
  const logs: string[] = []

  const captureConsole = {
    log: (...args: unknown[]) => logs.push(args.map(stringifyArg).join(" ")),
    info: (...args: unknown[]) => logs.push(args.map(stringifyArg).join(" ")),
    warn: (...args: unknown[]) => logs.push(args.map(stringifyArg).join(" ")),
    error: (...args: unknown[]) => logs.push(args.map(stringifyArg).join(" ")),
    debug: (...args: unknown[]) => logs.push(args.map(stringifyArg).join(" ")),
  }

  // Only safe, deterministic globals. No require, fetch, process, timers, etc.
  const sandbox: Record<string, unknown> = {
    console: captureConsole,
    JSON,
    Object,
    Array,
    String,
    Number,
    Boolean,
    Math,
    Date,
    RegExp,
    Map,
    Set,
    Symbol,
    Error,
    TypeError,
    RangeError,
    isNaN,
    isFinite,
    parseInt,
    parseFloat,
    encodeURIComponent,
    decodeURIComponent,
  }
  // Hide ambient capabilities even if the platform leaks them.
  sandbox.globalThis = sandbox
  sandbox.require = undefined
  sandbox.process = undefined
  sandbox.fetch = undefined
  sandbox.setTimeout = undefined
  sandbox.setInterval = undefined
  // The input the extractor receives, exposed inside the sandbox.
  sandbox.__input = input

  try {
    // Define `run` AND invoke it within one script so `timeout` bounds the
    // extractor's own execution (e.g. accidental infinite loops).
    const output = vm.runInNewContext(wrapSource(source), sandbox, {
      timeout: timeoutMs,
      filename: "generated-extractor.js",
    })
    return { output, logs }
  } catch (err) {
    return {
      output: undefined,
      logs,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

function stringifyArg(arg: unknown): string {
  if (typeof arg === "string") return arg
  try {
    return JSON.stringify(arg)
  } catch {
    return String(arg)
  }
}
