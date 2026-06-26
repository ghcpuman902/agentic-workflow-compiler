"use client"

import dynamic from "next/dynamic"
import { memo } from "react"
import { useTheme } from "next-themes"

import { MiniBrowserFrame } from "@/components/xyflow/canvas/mini-browser-frame"
import type { PreviewSlice } from "@/lib/flow/preview-content"
import { flowNodeBody, flowNodeDivider } from "@/lib/flow/node-chrome"
import { cn } from "@/lib/utils"

const CsvViewer = dynamic(
  () => import("@/components/ui/csv-viewer").then((module) => module.CsvViewer),
  {
    ssr: false,
    loading: () => <PreviewLoading label="Loading table…" />,
  },
)

const XlsxViewerPreview = dynamic(
  () =>
    import("@/components/ui/xlsx-viewer").then(
      (module) => module.XlsxViewerPreview,
    ),
  {
    ssr: false,
    loading: () => <PreviewLoading label="Loading spreadsheet…" />,
  },
)

const PreviewLoading = ({ label }: { label: string }) => (
  <div className="flex h-full min-h-[120px] items-center justify-center px-3">
    <span className={flowNodeBody}>{label}</span>
  </div>
)

const PreviewTable = memo(function PreviewTable({
  columns,
  rows,
}: {
  columns: string[]
  rows: Record<string, string>[]
}) {
  return (
    <div className="min-h-0 overflow-auto">
      <table className="w-full font-mono text-[9px]">
        <thead className="sticky top-0 bg-muted">
          <tr className={cn("border-b", flowNodeDivider)}>
            {columns.map((column) => (
              <th
                key={column}
                className="px-2 py-1 text-left font-normal text-muted-foreground"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={cn(
                "border-b border-border/60 transition-colors hover:bg-muted/50",
              )}
            >
              {columns.map((column) => (
                <td
                  key={column}
                  className="max-w-[120px] truncate px-2 py-1 text-foreground/80"
                  title={row[column]}
                >
                  {row[column] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
})

export const PreviewViewer = memo(function PreviewViewer({
  slice,
  className,
}: {
  slice: PreviewSlice
  className?: string
}) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      {slice.title ? (
        <div className={cn("shrink-0 px-2.5 py-1", flowNodeDivider, "border-b")}>
          <span className="truncate font-mono text-[9px] text-muted-foreground">
            {slice.title}
          </span>
        </div>
      ) : null}

      <div className="nodrag nowheel min-h-0 flex-1 overflow-hidden">
        {slice.kind === "table" ? (
          <PreviewTable
            columns={slice.columns ?? []}
            rows={slice.rows ?? []}
          />
        ) : null}

        {slice.kind === "text" ? (
          <pre className="h-full overflow-auto whitespace-pre-wrap px-2.5 py-2 font-mono text-[10px] leading-relaxed text-foreground/80">
            {slice.body}
          </pre>
        ) : null}

        {slice.kind === "json" ? (
          <pre className="h-full overflow-auto px-2.5 py-2 font-mono text-[10px] leading-relaxed text-foreground/80">
            {JSON.stringify(slice.value, null, 2)}
          </pre>
        ) : null}

        {slice.kind === "html" ? (
          <iframe
            title={slice.title ?? "HTML preview"}
            sandbox=""
            srcDoc={slice.html}
            className="h-full w-full border-0 bg-white"
          />
        ) : null}

        {slice.kind === "image" && slice.src ? (
          <div className="flex h-full items-center justify-center bg-muted/40 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slice.src}
              alt={slice.alt ?? "Preview"}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        ) : null}

        {slice.kind === "csv" && slice.body ? (
          <div className="h-full min-h-[160px] [&_.csv-viewer-root]:h-full">
            <CsvViewer data={slice.body} className="h-full" />
          </div>
        ) : null}

        {slice.kind === "xlsx" && slice.src ? (
          <div className="h-full min-h-[180px] overflow-hidden rounded-sm border border-border">
            <XlsxViewerPreview
              src={slice.src}
              fileName={slice.fileName}
              isDark={isDark}
              onIsDarkChange={() => undefined}
              showUpload={false}
              showDownload={false}
              showToolbar
              className="h-full"
            />
          </div>
        ) : null}

        {slice.kind === "minibrowser" && slice.browserUrl ? (
          <MiniBrowserFrame url={slice.browserUrl} title={slice.title} />
        ) : null}

        {slice.kind === "tavily-document" ? (
          <div className="flex h-full flex-col overflow-auto">
            {slice.documentUrl ? (
              <div className={cn("flex shrink-0 items-center gap-2 px-2.5 py-1.5", flowNodeDivider, "border-b")}>
                {slice.favicon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={slice.favicon}
                    alt=""
                    className="size-3 rounded-sm"
                  />
                ) : null}
                <a
                  href={slice.documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate font-mono text-[9px] text-emerald-700 hover:underline dark:text-emerald-400"
                >
                  {slice.documentUrl.replace(/^https?:\/\//, "")}
                </a>
              </div>
            ) : null}
            <pre className="whitespace-pre-wrap px-2.5 py-2 font-mono text-[10px] leading-relaxed text-foreground/80">
              {slice.body}
            </pre>
            {slice.images && slice.images.length > 0 ? (
              <div className={cn("grid grid-cols-2 gap-2 p-2", flowNodeDivider, "border-t")}>
                {slice.images.slice(0, 6).map((image) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={image}
                    src={image}
                    alt=""
                    className="max-h-24 w-full rounded border border-border object-cover"
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {slice.kind === "tavily-search" && slice.results ? (
          <div className="min-h-0 overflow-auto">
            <table className="w-full font-mono text-[9px]">
              <thead className="sticky top-0 bg-muted">
                <tr className={cn("border-b", flowNodeDivider)}>
                  <th className="px-2 py-1 text-left font-normal text-muted-foreground">
                    title
                  </th>
                  <th className="px-2 py-1 text-left font-normal text-muted-foreground">
                    score
                  </th>
                  <th className="px-2 py-1 text-left font-normal text-muted-foreground">
                    snippet
                  </th>
                </tr>
              </thead>
              <tbody>
                {slice.results.map((result) => (
                  <tr
                    key={result.url}
                    className="border-b border-border/60 align-top hover:bg-muted/50"
                  >
                    <td className="max-w-[90px] px-2 py-1">
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate text-emerald-700 hover:underline dark:text-emerald-400"
                        title={result.title}
                      >
                        {result.title}
                      </a>
                    </td>
                    <td className="px-2 py-1 text-muted-foreground">
                      {(result.score * 100).toFixed(0)}%
                    </td>
                    <td className="max-w-[140px] px-2 py-1 text-muted-foreground">
                      {result.content.slice(0, 160)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  )
})
