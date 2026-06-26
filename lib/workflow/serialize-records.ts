/**
 * Pure, dependency-free serialization for collection records.
 *
 * Shared by the server build path (`lib/build/collection.ts`) and the client
 * preview path (`lib/flow/preview-content.ts`) so changing a spider's output
 * format re-serializes the SAME extracted records identically on both sides —
 * no rebuild / model call required.
 */
import type { CollectionFormat } from "@/lib/workflow/content-types"

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

export const csvEscape = (value: unknown): string => {
  let s: string
  if (value == null) s = ""
  else if (typeof value === "object") s = JSON.stringify(value)
  else s = String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/** Serialize collection records to the requested format (jsonl | csv | ts). */
export const serializeCollection = (
  records: unknown[],
  format: CollectionFormat,
): string => {
  if (format === "jsonl") {
    return records.map((record) => JSON.stringify(record)).join("\n")
  }

  if (format === "ts") {
    return `export const records = ${JSON.stringify(records, null, 2)} as const\n`
  }

  // csv
  const objects = records.filter(isPlainRecord)
  const headerSet = new Set<string>()
  for (const object of objects) {
    for (const key of Object.keys(object)) headerSet.add(key)
  }
  const headers = [...headerSet]
  const lines = [headers.map(csvEscape).join(",")]
  for (const object of objects) {
    lines.push(headers.map((header) => csvEscape(object[header])).join(","))
  }
  return lines.join("\n")
}
