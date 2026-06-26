export type PreviewMode =
  | "auto"
  | "table"
  | "text"
  | "json"
  | "html"
  | "csv"
  | "xlsx"
  | "image"
  | "minibrowser"
  | "tavily-extract"
  | "tavily-search"

export type PreviewModeOption = {
  id: PreviewMode
  label: string
  hint: string
}

export const PREVIEW_MODE_OPTIONS: PreviewModeOption[] = [
  { id: "auto", label: "Auto", hint: "Detect from connected content" },
  { id: "table", label: "Table", hint: "Rows and columns" },
  { id: "text", label: "Text", hint: "Plain / markdown text" },
  { id: "json", label: "JSON", hint: "Structured JSON view" },
  { id: "html", label: "HTML", hint: "Render HTML in sandbox" },
  { id: "csv", label: "CSV", hint: "Spreadsheet-style grid" },
  { id: "xlsx", label: "XLSX", hint: "Excel file URL" },
  { id: "image", label: "Image", hint: "Image URL" },
  { id: "minibrowser", label: "Mini browser", hint: "Embed first URL in iframe" },
  {
    id: "tavily-extract",
    label: "Tavily extract",
    hint: "Clean markdown + images from URLs",
  },
  {
    id: "tavily-search",
    label: "Tavily search",
    hint: "Live web search results",
  },
]

export const isTavilyPreviewMode = (mode: PreviewMode) =>
  mode === "tavily-extract" || mode === "tavily-search"

export const isAsyncPreviewMode = (mode: PreviewMode) => isTavilyPreviewMode(mode)
