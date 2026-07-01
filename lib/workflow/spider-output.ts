import type { SpiderNodeData } from "@/lib/flow/canvas-types"
import {
  COLLECTION_FORMATS,
  DOC_FORMATS,
  resolveOutput,
  type CollectionFormat,
  type DocFormat,
  type OutputFormat,
} from "@/lib/workflow/content-types"

export type SpiderOutputContext = Pick<
  SpiderNodeData,
  | "outputFamily"
  | "outputFormat"
  | "build"
  | "suggestion"
  | "itemType"
  | "cardinality"
>

export const SPIDER_OUTPUT_HANDLE_PREFIX = "out-"

export const getSpiderOutputFamily = (
  spider: SpiderOutputContext,
): "document" | "collection" =>
  spider.outputFamily ??
  spider.build?.family ??
  spider.suggestion?.family ??
  resolveOutput(
    spider.itemType,
    spider.cardinality,
    spider.suggestion?.family,
  ).family

/** Formats the spider can emit instantly by re-serializing cached records. */
export const getInterchangeFormats = (
  family: "document" | "collection",
): OutputFormat[] =>
  family === "collection" ? [...COLLECTION_FORMATS] : [...DOC_FORMATS]

export const isInterchangeFormat = (
  family: "document" | "collection",
  format: string,
): format is OutputFormat =>
  getInterchangeFormats(family).includes(format as OutputFormat)

export const defaultInterchangeFormat = (
  family: "document" | "collection",
): OutputFormat => (family === "collection" ? "jsonl" : "md")

export const spiderOutputHandleId = (format: OutputFormat) =>
  `${SPIDER_OUTPUT_HANDLE_PREFIX}${format}`

export const formatFromSpiderHandle = (
  handle: string | null | undefined,
  spider: SpiderOutputContext,
): OutputFormat => {
  const family = getSpiderOutputFamily(spider)

  if (handle?.startsWith(SPIDER_OUTPUT_HANDLE_PREFIX)) {
    const candidate = handle.slice(SPIDER_OUTPUT_HANDLE_PREFIX.length)
    if (isInterchangeFormat(family, candidate)) {
      return candidate
    }
  }

  if (
    spider.outputFormat &&
    isInterchangeFormat(family, spider.outputFormat)
  ) {
    return spider.outputFormat
  }

  const buildFormat = spider.build?.format
  if (buildFormat && isInterchangeFormat(family, buildFormat)) {
    return buildFormat
  }

  return defaultInterchangeFormat(family)
}

export const collectionFormatLabel: Record<CollectionFormat, string> = {
  jsonl: "JSONL",
  csv: "CSV",
  ts: "TS",
}

export const docFormatLabel: Record<DocFormat, string> = {
  md: "Markdown",
  json: "JSON",
}

export const formatLabel = (format: OutputFormat) =>
  format in collectionFormatLabel
    ? collectionFormatLabel[format as CollectionFormat]
    : docFormatLabel[format as DocFormat]

/** Short labels for the Blender-style output rail (kept tight to the socket). */
export const formatShortLabel = (format: OutputFormat) => formatLabel(format)

/** Socket colours — Blender-style type colours per interchange format. */
export const formatSocketColor: Record<OutputFormat, string> = {
  jsonl: "#34d399",
  csv: "#fbbf24",
  ts: "#60a5fa",
  md: "#38bdf8",
  json: "#a78bfa",
}

export const INPUT_SOCKET_COLOR = "#a8a29e"
