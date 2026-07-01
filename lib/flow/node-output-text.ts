import type {
  FlowNodeData,
  LlmNodeData,
  SpiderNodeData,
  UrlNodeData,
} from "@/lib/flow/canvas-types"
import {
  type CollectionFormat,
  type OutputFormat,
} from "@/lib/workflow/content-types"
import { serializeCollection } from "@/lib/workflow/serialize-records"
import {
  formatFromSpiderHandle,
  getSpiderOutputFamily,
} from "@/lib/workflow/spider-output"

const parseJsonLines = (lines: string[]): unknown[] => {
  const items: unknown[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      items.push(JSON.parse(trimmed))
    } catch {
      return []
    }
  }
  return items
}

const collectionFormatFrom = (
  spider: SpiderNodeData,
  formatHint?: OutputFormat,
): CollectionFormat => {
  const format = formatHint ?? formatFromSpiderHandle(null, spider)

  if (format === "csv" || format === "ts" || format === "jsonl") {
    return format
  }
  return "jsonl"
}

/** Resolved spider records from run/build, or parsed from serialized preview. */
export const resolveSpiderRecords = (
  spider: SpiderNodeData,
): unknown[] | null => {
  const records = spider.run?.records ?? spider.build?.records
  if (Array.isArray(records) && records.length > 0) return records

  const preview = spider.run?.preview ?? spider.build?.preview
  if (typeof preview === "string" && preview.trim()) {
    const parsed = parseJsonLines(preview.split("\n"))
    if (parsed.length > 0) return parsed
  }

  return null
}

/** Plain text projection of a spider's extracted output for downstream nodes. */
export const resolveSpiderOutputText = (
  spider: SpiderNodeData,
  sourceHandle?: string | null,
): string => {
  const format = formatFromSpiderHandle(sourceHandle, spider)
  const records = resolveSpiderRecords(spider)
  if (records) {
    const family = getSpiderOutputFamily(spider)

    if (family === "collection") {
      return serializeCollection(records, collectionFormatFrom(spider, format))
    }

    if (format === "json") {
      return JSON.stringify(records, null, 2)
    }

    return records
      .map((record) =>
        typeof record === "string" ? record : JSON.stringify(record),
      )
      .join("\n\n")
  }

  const preview = spider.run?.preview ?? spider.build?.preview
  if (typeof preview === "string" && preview.trim()) return preview

  return ""
}

/**
 * Convert any upstream node's output into plain text for preview modes, LLM
 * input, Tavily, etc. Never falls back to discovery page URLs for spiders —
 * those are inputs, not extracted output.
 */
export const resolveNodeOutputText = (
  sourceType: string | null | undefined,
  data: FlowNodeData | null | undefined,
  sourceHandle?: string | null,
): string => {
  if (!data) return ""

  if (sourceType === "url") {
    return String((data as UrlNodeData).url ?? "")
  }

  if (sourceType === "spider") {
    return resolveSpiderOutputText(data as SpiderNodeData, sourceHandle)
  }

  if (sourceType === "llm") {
    return String((data as LlmNodeData).preview ?? "")
  }

  const preview = (data as { preview?: unknown }).preview
  if (typeof preview === "string" && preview.trim()) return preview

  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}
