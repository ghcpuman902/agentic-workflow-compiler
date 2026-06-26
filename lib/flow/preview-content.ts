import type { FlowNodeData, SpiderNodeData, UrlNodeData } from "@/lib/flow/canvas-types"
import type { PreviewMode } from "@/lib/flow/preview-modes"
import { parseUrlLines } from "@/lib/workflow/sample-urls"
import {
  resolveOutput,
  type CollectionFormat,
} from "@/lib/workflow/content-types"
import { serializeCollection } from "@/lib/workflow/serialize-records"

export type PreviewDisplayKind =
  | "table"
  | "text"
  | "html"
  | "image"
  | "csv"
  | "xlsx"
  | "json"
  | "minibrowser"
  | "tavily-document"
  | "tavily-search"

export type PreviewTableRow = Record<string, string>

export type PreviewSlice = {
  kind: PreviewDisplayKind
  title?: string
  columns?: string[]
  rows?: PreviewTableRow[]
  body?: string
  html?: string
  src?: string
  alt?: string
  fileName?: string
  value?: unknown
  /** Mini browser iframe target. */
  browserUrl?: string
  /** Tavily extract payload. */
  documentUrl?: string
  favicon?: string
  images?: string[]
  /** Tavily search payload. */
  query?: string
  results?: Array<{
    title: string
    url: string
    content: string
    score: number
  }>
}

export type PreviewContent = {
  title?: string
  /** Single slice for compact content. */
  slice?: PreviewSlice
  /** Multiple items — use left/right navigation in the preview node. */
  items?: PreviewSlice[]
}

const TABLE_ROW_LIMIT = 8

const IMAGE_URL =
  /^https?:\/\/.+\.(png|jpe?g|gif|webp|svg|avif|bmp)(\?.*)?$/i
const XLSX_URL = /^https?:\/\/.+\.xlsx(\?.*)?$/i

const looksLikeHtml = (value: string) =>
  /^\s*</.test(value) && /<[a-z][\s\S]*>/i.test(value)

const looksLikeCsv = (value: string) => {
  const lines = value.trim().split("\n").filter(Boolean)
  if (lines.length < 2) return false
  // JSON / JSONL is not CSV: objects and arrays start with { or [. Without this
  // guard, JSONL records (consistent comma counts) get fed to the CSV parser,
  // which then fails on the inner quotes ("Trailing quote ... is malformed").
  const firstChar = lines[0].trimStart()[0]
  if (firstChar === "{" || firstChar === "[") return false
  const delimiter = lines[0].includes("\t")
    ? "\t"
    : lines[0].includes(";")
      ? ";"
      : ","
  const firstCols = lines[0].split(delimiter).length
  return firstCols > 1 && lines.slice(1, 4).every((line) => line.split(delimiter).length === firstCols)
}

const formatCell = (value: unknown): string => {
  if (value == null) return "—"
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

const fieldsToTable = (
  fields: { name: string; type: string; sample?: string }[],
): PreviewSlice => ({
  kind: "table",
  columns: ["field", "type", "sample"],
  rows: fields.map((field) => ({
    field: field.name,
    type: field.type,
    sample: field.sample ?? "—",
  })),
})

const linesToTable = (lines: string[]): PreviewSlice => ({
  kind: "table",
  columns: ["#", "line"],
  rows: lines.map((line, index) => ({
    "#": String(index + 1),
    line,
  })),
})

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

const valueToSlice = (value: unknown, title?: string): PreviewSlice => {
  if (typeof value === "string") {
    if (IMAGE_URL.test(value)) {
      return { kind: "image", src: value, alt: title, title }
    }
    if (XLSX_URL.test(value)) {
      return {
        kind: "xlsx",
        src: value,
        fileName: value.split("/").pop(),
        title,
      }
    }
    if (looksLikeHtml(value)) {
      return { kind: "html", html: value, title }
    }
    if (looksLikeCsv(value)) {
      return { kind: "csv", body: value, title }
    }
    return { kind: "text", body: value, title }
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return { kind: "text", body: "[]", title }
    }
    if (value.every((entry) => entry && typeof entry === "object" && !Array.isArray(entry))) {
      const columns = Array.from(
        new Set(value.flatMap((entry) => Object.keys(entry as object))),
      )
      return {
        kind: "table",
        title,
        columns,
        rows: value.map((entry) =>
          Object.fromEntries(
            columns.map((column) => [
              column,
              formatCell((entry as Record<string, unknown>)[column]),
            ]),
          ),
        ),
      }
    }
    return {
      kind: "json",
      title,
      value,
    }
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length <= TABLE_ROW_LIMIT) {
      return {
        kind: "table",
        title,
        columns: ["key", "value"],
        rows: entries.map(([key, entry]) => ({
          key,
          value: formatCell(entry),
        })),
      }
    }
    return { kind: "json", title, value }
  }

  return { kind: "text", body: String(value), title }
}

const arrayToPreview = (values: unknown[], title?: string): PreviewContent => {
  if (values.length === 0) {
    return { title, slice: { kind: "text", body: "No items", title } }
  }

  if (values.length === 1) {
    return { title, slice: valueToSlice(values[0], `${title ?? "Item"} 1`) }
  }

  const slices = values.map((value, index) =>
    valueToSlice(value, `${title ?? "Item"} ${index + 1}`),
  )

  const allTables =
    slices.every((slice) => slice.kind === "table") &&
    slices.every(
      (slice) =>
        JSON.stringify(slice.columns ?? []) ===
        JSON.stringify(slices[0].columns ?? []),
    )

  if (allTables && slices.length <= TABLE_ROW_LIMIT) {
    return {
      title,
      slice: {
        kind: "table",
        columns: slices[0].columns,
        rows: slices.flatMap((slice) => slice.rows ?? []),
      },
    }
  }

  return { title, items: slices }
}

export const resolvePreviewFromText = (text: string): PreviewContent => {
  const trimmed = text.trim()
  if (!trimmed) {
    return { slice: { kind: "text", body: "Connect a source with content to preview." } }
  }

  if (IMAGE_URL.test(trimmed)) {
    return { slice: { kind: "image", src: trimmed, alt: "Preview image" } }
  }

  if (XLSX_URL.test(trimmed)) {
    return {
      slice: {
        kind: "xlsx",
        src: trimmed,
        fileName: trimmed.split("/").pop(),
      },
    }
  }

  if (looksLikeHtml(trimmed)) {
    return { slice: { kind: "html", html: trimmed } }
  }

  if (looksLikeCsv(trimmed)) {
    return { slice: { kind: "csv", body: trimmed } }
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (Array.isArray(parsed)) {
      return arrayToPreview(parsed, "JSON collection")
    }
    return { slice: valueToSlice(parsed, "JSON") }
  } catch {
    // fall through
  }

  const lines = parseUrlLines(text)
  const jsonLines = parseJsonLines(lines)
  if (jsonLines.length > 0) {
    return arrayToPreview(jsonLines, "JSONL")
  }

  if (lines.length === 1) {
    return { slice: valueToSlice(lines[0], "Line") }
  }

  if (lines.length <= TABLE_ROW_LIMIT) {
    return { title: `${lines.length} lines`, slice: linesToTable(lines) }
  }

  return {
    title: `${lines.length} lines`,
    items: lines.map((line, index) => ({
      kind: "text" as const,
      title: `Line ${index + 1}`,
      body: line,
    })),
  }
}

export const resolvePreviewFromSpider = (
  spider: SpiderNodeData,
): PreviewContent => {
  // The Output-item dropdown drives the format. Re-serialize the already
  // extracted records (run preferred, else the golden build set) to the
  // currently selected collection format — instant, no rebuild / model call.
  const records = spider.run?.records ?? spider.build?.records
  const { family, format } = resolveOutput(spider.itemType, spider.cardinality)
  if (family === "collection" && Array.isArray(records) && records.length > 0) {
    const collectionFormat = format as CollectionFormat
    if (collectionFormat === "csv") {
      return {
        title: spider.label,
        slice: { kind: "csv", body: serializeCollection(records, "csv") },
      }
    }
    if (collectionFormat === "ts") {
      return {
        title: spider.label,
        slice: { kind: "text", body: serializeCollection(records, "ts") },
      }
    }
    // jsonl (the array-of-records default) — render the records as a table.
    return arrayToPreview(records, spider.label)
  }

  // Otherwise fall back to whatever the spider serialized at build/run time.
  const serialized = spider.run?.preview ?? spider.build?.preview
  if (serialized && serialized.trim()) {
    return resolvePreviewFromText(serialized)
  }

  const discovery = spider.discovery
  if (!discovery) {
    return {
      slice: {
        kind: "text",
        body: "Spider has no discovery data yet. Run discover first.",
      },
    }
  }

  const suggestionFields =
    spider.suggestion?.fields?.map((field) => ({
      name: field.name,
      type: field.type,
      sample: undefined as string | undefined,
    })) ?? []

  const pageItems: PreviewSlice[] = discovery.pages.map((page, index) => {
    const group = page.repeatedGroups[0]
    const sampleFields =
      group?.sampleFields.map((field) => ({
        name: field.name,
        type: field.inferredType,
        sample: formatCell(field.examples[0]),
      })) ?? []

    const fields =
      sampleFields.length > 0
        ? sampleFields
        : suggestionFields.map((field) => ({
            ...field,
            sample: "—",
          }))

    if (page.markdown && fields.length === 0) {
      return {
        kind: "text",
        title: page.url.replace(/^https?:\/\//, "").slice(0, 48),
        body: page.markdown.slice(0, 4000),
      }
    }

    if (page.snapshot && fields.length === 0) {
      return {
        kind: "html",
        title: page.url.replace(/^https?:\/\//, "").slice(0, 48),
        html: page.snapshot,
      }
    }

    return {
      ...fieldsToTable(fields),
      title: `${index + 1}. ${page.url.replace(/^https?:\/\//, "").slice(0, 40)}`,
    }
  })

  if (pageItems.length === 0) {
    return {
      slice: {
        kind: "text",
        body: "No inspectable pages on this spider.",
      },
    }
  }

  if (pageItems.length === 1) {
    return {
      title: spider.label,
      slice: pageItems[0],
    }
  }

  return {
    title: spider.label,
    items: pageItems,
  }
}

export const resolvePreviewContent = (
  sourceType: string | null | undefined,
  data: FlowNodeData | null,
): PreviewContent => {
  if (!data) {
    return {
      slice: {
        kind: "text",
        body: "Connect a text or spider node to preview its output.",
      },
    }
  }

  if (sourceType === "url") {
    return resolvePreviewFromText((data as UrlNodeData).url)
  }

  if (sourceType === "spider") {
    return resolvePreviewFromSpider(data as SpiderNodeData)
  }

  return {
    slice: {
      kind: "text",
      body: `Preview for “${sourceType}” nodes is not supported yet.`,
    },
  }
}

export const getActivePreviewSlice = (
  content: PreviewContent,
  itemIndex: number,
): PreviewSlice | null => {
  if (content.slice) return content.slice
  if (!content.items?.length) return null
  const index = Math.min(Math.max(itemIndex, 0), content.items.length - 1)
  return content.items[index] ?? null
}

export const previewHasPager = (content: PreviewContent) =>
  Boolean(content.items && content.items.length > 1)

const HTTP_URL = /^https?:\/\/.+/i

export const extractHttpUrls = (text: string) =>
  parseUrlLines(text).filter((line) => HTTP_URL.test(line))

export const applyPreviewMode = (
  mode: PreviewMode | undefined,
  autoContent: PreviewContent,
  rawText: string,
): PreviewContent => {
  if (!mode || mode === "auto") return autoContent

  const trimmed = rawText.trim()
  const urls = extractHttpUrls(rawText)

  if (mode === "minibrowser") {
    const browserUrl = urls[0]
    if (!browserUrl) {
      return {
        slice: {
          kind: "text",
          body: "Mini browser needs an http(s) URL in the connected text node.",
        },
      }
    }
    return {
      title: browserUrl.replace(/^https?:\/\//, "").slice(0, 48),
      items: urls.map((url, index) => ({
        kind: "minibrowser" as const,
        title: `Page ${index + 1}`,
        browserUrl: url,
      })),
    }
  }

  if (mode === "tavily-extract" || mode === "tavily-search") {
    return autoContent
  }

  if (mode === "table") {
    const lines = parseUrlLines(trimmed)
    if (lines.length > 0) {
      return lines.length <= TABLE_ROW_LIMIT
        ? { title: `${lines.length} lines`, slice: linesToTable(lines) }
        : {
            title: `${lines.length} lines`,
            items: lines.map((line, index) => ({
              kind: "text" as const,
              title: `Line ${index + 1}`,
              body: line,
            })),
          }
    }
    return autoContent.slice?.kind === "table"
      ? autoContent
      : { slice: { kind: "table", columns: ["value"], rows: [{ value: trimmed || "—" }] } }
  }

  if (mode === "text") {
    return { slice: { kind: "text", body: trimmed || "Empty" } }
  }

  if (mode === "json") {
    try {
      return {
        slice: {
          kind: "json",
          value: JSON.parse(trimmed) as unknown,
        },
      }
    } catch {
      return { slice: { kind: "json", value: trimmed } }
    }
  }

  if (mode === "html") {
    return {
      slice: {
        kind: "html",
        html: looksLikeHtml(trimmed)
          ? trimmed
          : `<pre>${trimmed.replace(/</g, "&lt;")}</pre>`,
      },
    }
  }

  if (mode === "csv") {
    return { slice: { kind: "csv", body: trimmed } }
  }

  if (mode === "xlsx") {
    const src = urls.find((url) => XLSX_URL.test(url)) ?? urls[0]
    if (!src) {
      return {
        slice: {
          kind: "text",
          body: "XLSX mode needs a spreadsheet URL in the connected text.",
        },
      }
    }
    return {
      slice: {
        kind: "xlsx",
        src,
        fileName: src.split("/").pop(),
      },
    }
  }

  if (mode === "image") {
    const src = urls.find((url) => IMAGE_URL.test(url)) ?? urls[0]
    if (!src) {
      return {
        slice: {
          kind: "text",
          body: "Image mode needs an image URL in the connected text.",
        },
      }
    }
    return { slice: { kind: "image", src, alt: "Preview image" } }
  }

  return autoContent
}

export type TavilyPreviewDocument = {
  url: string
  title: string
  content: string
  favicon?: string
  images?: string[]
}

export const tavilyDocumentsToPreview = (
  docs: TavilyPreviewDocument[],
): PreviewContent => {
  if (docs.length === 0) {
    return {
      slice: { kind: "text", body: "Tavily extract returned no documents." },
    }
  }

  if (docs.length === 1) {
    const doc = docs[0]
    return {
      title: doc.title,
      slice: {
        kind: "tavily-document",
        title: doc.title,
        documentUrl: doc.url,
        favicon: doc.favicon,
        body: doc.content,
        images: doc.images,
      },
    }
  }

  return {
    title: `${docs.length} pages`,
    items: docs.map((doc, index) => ({
      kind: "tavily-document" as const,
      title: doc.title || `Page ${index + 1}`,
      documentUrl: doc.url,
      favicon: doc.favicon,
      body: doc.content,
      images: doc.images,
    })),
  }
}

export const tavilySearchToPreview = (query: string, results: Array<{
  title: string
  url: string
  content: string
  score: number
}>): PreviewContent => ({
  title: `Search: ${query}`,
  slice: {
    kind: "tavily-search",
    query,
    results,
  },
})
