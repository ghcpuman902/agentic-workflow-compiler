"use client"

import { memo, useEffect, useMemo, useRef } from "react"
import {
  Handle,
  NodeResizer,
  Position,
  useNodeConnections,
  useStore,
  type NodeProps,
} from "@xyflow/react"
import { ChevronLeft, ChevronRight, Eye, Loader2 } from "lucide-react"

import { PreviewViewer } from "@/components/xyflow/canvas/preview-viewer"
import { useTavilyPreview } from "@/components/xyflow/canvas/use-tavily-preview"
import { useCompileFlow } from "@/components/xyflow/canvas/compile-flow-context"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  flowBorderEmeraldSelected,
  flowHandleStyle,
  flowHeaderEmerald,
  flowHeaderEmeraldIcon,
  flowHeaderEmeraldTitle,
  flowNodeBody,
  flowNodeIconButton,
  flowNodeShell,
  flowResizerHandle,
} from "@/lib/flow/node-chrome"
import { cn } from "@/lib/utils"
import type { PreviewNodeData, SpiderNodeData, UrlNodeData, FlowNodeData } from "@/lib/flow/canvas-types"
import {
  applyPreviewMode,
  getActivePreviewSlice,
  previewHasPager,
  resolvePreviewContent,
} from "@/lib/flow/preview-content"
import {
  isTavilyPreviewMode,
  PREVIEW_MODE_OPTIONS,
  type PreviewMode,
} from "@/lib/flow/preview-modes"

const getSourceRawText = (
  sourceType: string | null,
  data: unknown,
): string => {
  if (sourceType === "url" && data && typeof data === "object" && "url" in data) {
    return String((data as UrlNodeData).url ?? "")
  }

  if (sourceType === "spider" && data && typeof data === "object") {
    const spider = data as SpiderNodeData
    const pageUrls = spider.discovery?.pages.map((page) => page.url) ?? []
    if (pageUrls.length > 0) return pageUrls.join("\n")
    if (spider.run?.preview) return spider.run.preview
    if (spider.build?.preview) return spider.build.preview
  }

  return ""
}

export const PreviewNode = memo(function PreviewNode({
  id,
  data,
  selected,
}: NodeProps & { data: PreviewNodeData }) {
  const { updateNodeData, getNodeData } = useCompileFlow()
  const connections = useNodeConnections({
    id,
    handleType: "target",
    handleId: "in",
    onDisconnect: () => {
      updateNodeData(id, (current) => ({
        ...(current as PreviewNodeData),
        itemIndex: 0,
      }))
    },
  })

  const sourceId = connections[0]?.source ?? null
  const sourceNode = useStore((state) =>
    sourceId ? state.nodes.find((node) => node.id === sourceId) : undefined,
  )
  const sourceType = sourceNode?.type ?? null
  const mode = data.mode ?? "auto"

  const prevSourceId = useRef<string | null>(null)

  useEffect(() => {
    if (prevSourceId.current === sourceId) return
    prevSourceId.current = sourceId
    if (sourceId) {
      updateNodeData(id, (current) => ({
        ...(current as PreviewNodeData),
        itemIndex: 0,
      }))
    }
  }, [id, sourceId, updateNodeData])

  const rawText = useMemo(() => {
    const fromStore = getSourceRawText(sourceType, sourceNode?.data)
    if (fromStore.trim()) return fromStore
    if (!sourceId) return ""
    return getSourceRawText(sourceType, getNodeData(sourceId))
  }, [getNodeData, sourceId, sourceNode?.data, sourceType])

  const autoContent = useMemo(() => {
    const nodeData =
      (sourceNode?.data as FlowNodeData | undefined) ??
      (sourceId ? getNodeData(sourceId) : null)
    return resolvePreviewContent(sourceType, nodeData)
  }, [getNodeData, sourceId, sourceNode?.data, sourceType])

  const tavilyPreview = useTavilyPreview({
    mode,
    rawText,
    enabled: Boolean(sourceId && isTavilyPreviewMode(mode)),
  })

  const previewContent = useMemo(() => {
    if (isTavilyPreviewMode(mode)) {
      if (tavilyPreview.content) return tavilyPreview.content
      if (tavilyPreview.error) {
        return {
          slice: { kind: "text" as const, body: tavilyPreview.error },
        }
      }
      return {
        slice: {
          kind: "text" as const,
          body: tavilyPreview.loading
            ? "Fetching from Tavily…"
            : "Connect a source, then choose a Tavily preview mode.",
        },
      }
    }
    return applyPreviewMode(mode, autoContent, rawText)
  }, [autoContent, mode, rawText, tavilyPreview.content, tavilyPreview.error, tavilyPreview.loading])

  const hasPager = previewHasPager(previewContent)
  const itemCount = previewContent.items?.length ?? 0
  const itemIndex = Math.min(
    Math.max(data.itemIndex, 0),
    Math.max(itemCount - 1, 0),
  )
  const activeSlice = getActivePreviewSlice(previewContent, itemIndex)
  const modeLabel =
    PREVIEW_MODE_OPTIONS.find((option) => option.id === mode)?.label ?? "Auto"

  const handlePrevious = () => {
    updateNodeData(id, (current) => ({
      ...(current as PreviewNodeData),
      itemIndex: Math.max(0, itemIndex - 1),
    }))
  }

  const handleNext = () => {
    updateNodeData(id, (current) => ({
      ...(current as PreviewNodeData),
      itemIndex: Math.min(itemCount - 1, itemIndex + 1),
    }))
  }

  const handleModeChange = (value: string) => {
    updateNodeData(id, (current) => ({
      ...(current as PreviewNodeData),
      mode: value as PreviewMode,
      itemIndex: 0,
    }))
  }

  return (
    <div
      className={flowNodeShell(selected, {
        borderSelected: flowBorderEmeraldSelected,
      })}
      style={{ width: "100%", height: "100%", minHeight: 220 }}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={300}
        minHeight={220}
        lineStyle={{ border: "1px solid rgba(16,185,129,0.4)" }}
        handleStyle={flowResizerHandle("#10b981")}
      />

      <div className={flowHeaderEmerald}>
        <Eye className={flowHeaderEmeraldIcon} aria-hidden />
        <span className={flowHeaderEmeraldTitle}>Preview</span>

        <Select value={mode} onValueChange={handleModeChange}>
          <SelectTrigger
            size="sm"
            className="nodrag nowheel h-6 min-w-[6.5rem] border-input bg-background px-2 font-mono text-[9px] text-foreground"
            aria-label="Preview display mode"
          >
            <SelectValue placeholder="Auto">{modeLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent className="z-[200] font-mono text-[10px]">
            {PREVIEW_MODE_OPTIONS.map((option) => (
              <SelectItem key={option.id} value={option.id} title={option.hint}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {tavilyPreview.loading ? (
          <Loader2 className="size-3 animate-spin text-emerald-600 dark:text-emerald-400" aria-hidden />
        ) : null}

        {previewContent.title ? (
          <span className="max-w-[88px] truncate font-mono text-[9px] text-muted-foreground">
            {previewContent.title}
          </span>
        ) : null}

        {hasPager ? (
          <div className="ml-auto flex items-center gap-0.5">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={itemIndex <= 0}
              className={flowNodeIconButton}
              aria-label="Previous item"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <span className="min-w-12 text-center font-mono text-[9px] text-muted-foreground">
              {itemIndex + 1}/{itemCount}
            </span>
            <button
              type="button"
              onClick={handleNext}
              disabled={itemIndex >= itemCount - 1}
              className={flowNodeIconButton}
              aria-label="Next item"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        ) : null}
      </div>

      <div className="nodrag nowheel flex min-h-0 flex-1 flex-col overflow-hidden">
        {!sourceId ? (
          <div className="flex h-full items-center justify-center px-3 py-4">
            <span className={cn(flowNodeBody, "text-center")}>
              Connect text or spider output, then pick a preview mode
            </span>
          </div>
        ) : activeSlice ? (
          <PreviewViewer slice={activeSlice} />
        ) : (
          <div className="flex h-full items-center justify-center px-3 py-4">
            <span className={flowNodeBody}>Nothing to preview yet</span>
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id="in"
        isConnectableStart
        title="Drag to disconnect or reconnect"
        style={flowHandleStyle("#10b981", "left")}
      />
    </div>
  )
})
