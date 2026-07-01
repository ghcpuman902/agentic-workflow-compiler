"use client"

import { memo, useEffect, useState } from "react"
import { Handle, NodeResizer, Position, type NodeProps } from "@xyflow/react"
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Pause,
  Play,
  Sparkles,
  Square,
} from "lucide-react"

import { AgentActivityLog } from "@/components/xyflow/canvas/agent-activity-log"
import { EmbeddedSpiderCard } from "@/components/xyflow/canvas/embedded-spider-card"
import { useCompileFlow } from "@/components/xyflow/canvas/compile-flow-context"
import {
  flowBorderVioletDefault,
  flowBorderVioletDone,
  flowBorderVioletRunning,
  flowBorderVioletSelected,
  flowDiscoverShell,
  flowHandleStyle,
  flowHeaderViolet,
  flowHeaderVioletControl,
  flowHeaderVioletIcon,
  flowHeaderVioletMeta,
  flowHeaderVioletTitle,
  flowNodeBody,
  flowNodeDivider,
  flowNodeInput,
  flowNodeInputRight,
  flowNodeLabel,
  flowNodeLabelStrong,
  flowNodePanel,
  flowNodeShell,
  flowNodeStopButton,
  flowResizerHandle,
} from "@/lib/flow/node-chrome"
import { cn } from "@/lib/utils"
import {
  DEFAULT_CONFIDENCE_THRESHOLD,
  MAX_PROBE_URLS,
} from "@/lib/workflow/pipeline-config"
import type { DiscoverFactoryData } from "@/lib/flow/canvas-types"

const ElapsedLabel = ({
  startedAt,
  building,
}: {
  startedAt?: number
  building?: boolean
}) => {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!startedAt) return
    const tick = () =>
      setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [startedAt])

  if (!startedAt) return null

  return (
    <span className="font-mono text-[9px] text-violet-500">
      {elapsed}s · {building ? "agent building & testing extractor…" : "probing live URLs…"}
    </span>
  )
}

export const DiscoverFactoryNode = memo(function DiscoverFactoryNode({
  id,
  data,
  selected,
}: NodeProps & { data: DiscoverFactoryData }) {
  const { updateNodeData, runDiscoverFactory, confirmDiscoverOutput } = useCompileFlow()
  const isRunning = data.phase === "running"
  const isBuilding = data.phase === "building"
  const isSelectingOutput = data.phase === "select-output"
  const isDone = data.phase === "done"
  const isBusy = isRunning || isBuilding
  const settingsDisabled = data.settingsLocked || isBusy || isDone || isSelectingOutput
  const [thresholdDraft, setThresholdDraft] = useState(
    String(data.confidenceThreshold),
  )
  const [maxPagesDraft, setMaxPagesDraft] = useState(
    String(data.maxDiscoverPages),
  )
  const [contextDraft, setContextDraft] = useState(data.extraContext)
  const [advancedOpen, setAdvancedOpen] = useState(false)

  useEffect(() => {
    if (!isBusy) {
      setThresholdDraft(String(data.confidenceThreshold))
      setMaxPagesDraft(String(data.maxDiscoverPages))
      setContextDraft(data.extraContext)
    }
  }, [data.confidenceThreshold, data.maxDiscoverPages, data.extraContext, isBusy])

  const handlePlay = () => {
    if (isBusy) return
    runDiscoverFactory(id)
  }

  const handleThresholdBlur = () => {
    const value = Number(thresholdDraft)
    if (Number.isNaN(value)) {
      setThresholdDraft(String(data.confidenceThreshold))
      return
    }

    const clamped = Math.min(1, Math.max(0.1, value))
    setThresholdDraft(String(clamped))
    if (clamped === data.confidenceThreshold) return

    updateNodeData(id, (current) => {
      const d = current as DiscoverFactoryData
      return { ...d, confidenceThreshold: clamped }
    })
  }

  const handleMaxPagesBlur = () => {
    const value = Number(maxPagesDraft)
    if (Number.isNaN(value)) {
      setMaxPagesDraft(String(data.maxDiscoverPages))
      return
    }

    const clamped = Math.min(20, Math.max(1, Math.round(value)))
    setMaxPagesDraft(String(clamped))
    if (clamped === data.maxDiscoverPages) return

    updateNodeData(id, (current) => {
      const d = current as DiscoverFactoryData
      return { ...d, maxDiscoverPages: clamped }
    })
  }

  const handleContextCommit = () => {
    if (contextDraft === data.extraContext) return
    updateNodeData(id, (current) => {
      const d = current as DiscoverFactoryData
      return { ...d, extraContext: contextDraft }
    })
  }

  return (
    <div
      className={cn(
        flowNodeShell(selected, {
          rounded: "md",
          extra: cn("border-2", flowDiscoverShell),
          borderDefault: flowBorderVioletDefault,
          borderSelected: flowBorderVioletSelected,
        }),
        isBusy && flowBorderVioletRunning,
        isDone && flowBorderVioletDone,
      )}
      style={{ width: "100%", height: "100%", minHeight: 240 }}
      data-discover-factory
    >
      <NodeResizer
        isVisible={selected}
        minWidth={320}
        minHeight={240}
        lineStyle={{ border: "1px solid rgba(139,92,246,0.4)" }}
        handleStyle={flowResizerHandle("#7c3aed")}
      />

      <div className={flowHeaderViolet}>
        <Sparkles className={flowHeaderVioletIcon} aria-hidden />
        <span className={flowHeaderVioletTitle}>Discover</span>
        <span className={flowHeaderVioletMeta}>factory</span>
        {isBusy ? (
          <Loader2 className="size-3 animate-spin text-violet-600 dark:text-violet-400" aria-hidden />
        ) : null}

        <div className="ml-auto flex items-center gap-0.5">
          {isBusy ? (
            <button
              type="button"
              className={flowHeaderVioletControl}
              title="Pause"
              aria-label="Pause discovery"
            >
              <Pause className="size-3" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePlay}
              disabled={isBusy}
              className={cn(
                "rounded p-0.5 transition-colors disabled:opacity-40",
                isDone
                  ? "text-emerald-700 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                  : flowHeaderVioletControl,
              )}
              title={isDone ? "Re-run discovery" : "Run discovery"}
              aria-label="Run discovery"
            >
              <Play className="size-3" />
            </button>
          )}
          <button
            type="button"
            className={flowNodeStopButton}
            title="Stop"
            aria-label="Stop discovery"
          >
            <Square className="size-3" />
          </button>
        </div>
      </div>

      <div className="nodrag nowheel min-h-0 flex-1 overflow-y-auto p-3">
        {data.phase === "idle" && !data.embeddedSpider ? (
          <div className="space-y-3">
            <p className={cn(flowNodeBody, "leading-relaxed")}>
              Connect a text node, add optional context, then press play.
              Discover → build → test → freeze. Usually 10–40 seconds.
            </p>

            <label className="block space-y-1">
              <span className={flowNodeLabel}>
                Extra context <span className="text-muted-foreground/70">(optional)</span>
              </span>
              <textarea
                value={contextDraft}
                disabled={settingsDisabled}
                onChange={(event) => setContextDraft(event.target.value)}
                onBlur={handleContextCommit}
                onPointerDown={(event) => event.stopPropagation()}
                placeholder="e.g. I care about speaker names and ticket prices"
                rows={2}
                className={cn(flowNodeInput, "focus-visible:border-violet-500/60")}
                aria-label="Extra context for discovery and the build agent"
              />
            </label>

            <div className={flowNodePanel}>
              <button
                type="button"
                onClick={() => setAdvancedOpen((open) => !open)}
                onPointerDown={(event) => event.stopPropagation()}
                className="nodrag flex w-full items-center gap-1 px-1.5 py-1 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground"
                aria-expanded={advancedOpen}
                aria-label="Toggle advanced settings"
              >
                {advancedOpen ? (
                  <ChevronDown className="size-3" aria-hidden />
                ) : (
                  <ChevronRight className="size-3" aria-hidden />
                )}
                <span>Advanced settings</span>
              </button>

              {advancedOpen ? (
                <div className={cn("space-y-2 px-1.5 py-2", flowNodeDivider)}>
                  <label className={cn("flex items-center justify-between gap-2", flowNodeLabel)}>
                    <span>Max discover pages</span>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      step={1}
                      disabled={settingsDisabled}
                      value={maxPagesDraft}
                      onChange={(event) => setMaxPagesDraft(event.target.value)}
                      onBlur={handleMaxPagesBlur}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.currentTarget.blur()
                      }}
                      className={flowNodeInputRight}
                      onPointerDown={(event) => event.stopPropagation()}
                      aria-label="Max discover pages"
                    />
                  </label>
                  <label className={cn("flex items-center justify-between gap-2", flowNodeLabel)}>
                    <span>Confidence threshold</span>
                    <input
                      type="number"
                      min={0.1}
                      max={1}
                      step={0.05}
                      disabled={settingsDisabled}
                      value={thresholdDraft}
                      onChange={(event) => setThresholdDraft(event.target.value)}
                      onBlur={handleThresholdBlur}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.currentTarget.blur()
                      }}
                      className={flowNodeInputRight}
                      onPointerDown={(event) => event.stopPropagation()}
                      aria-label="Confidence threshold"
                    />
                  </label>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {isBusy ? (
          <ElapsedLabel startedAt={data.startedAt} building={isBuilding} />
        ) : null}

        {(isBusy || isDone || data.phase === "error") &&
        data.activitySteps.length > 0 ? (
          <AgentActivityLog steps={data.activitySteps} className="mt-2" />
        ) : null}

        {isSelectingOutput && data.pendingDiscovery ? (
          <div className={cn("mt-3 space-y-2", flowNodePanel, "p-2")}>
            <p className={flowNodeLabelStrong}>Choose output (locked on spider)</p>
            <ul className="space-y-1">
              {data.pendingDiscovery.suggestions.map((suggestion, index) => {
                const selected = (data.selectedSuggestionIndex ?? 0) === index
                return (
                  <li key={`${suggestion.family}-${index}`}>
                    <button
                      type="button"
                      onClick={() =>
                        updateNodeData(id, (current) => ({
                          ...(current as DiscoverFactoryData),
                          selectedSuggestionIndex: index,
                        }))
                      }
                      onPointerDown={(event) => event.stopPropagation()}
                      className={cn(
                        "nodrag w-full rounded border px-2 py-1.5 text-left transition-colors",
                        selected
                          ? "border-violet-500 bg-violet-50 dark:border-violet-600 dark:bg-violet-950/40"
                          : "border-border bg-background hover:bg-muted/50",
                      )}
                      aria-pressed={selected}
                    >
                      <span className="block font-mono text-[10px] text-foreground">
                        {suggestion.label}
                      </span>
                      <span className="mt-0.5 block font-mono text-[9px] text-muted-foreground">
                        {suggestion.family}
                        {suggestion.estimatedRecords
                          ? ` · ~${suggestion.estimatedRecords} records`
                          : ""}
                        {" · "}
                        {(suggestion.confidence * 100).toFixed(0)}%
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <button
              type="button"
              onClick={() => confirmDiscoverOutput(id)}
              onPointerDown={(event) => event.stopPropagation()}
              className="nodrag w-full rounded border border-emerald-500 bg-emerald-50 py-1.5 font-mono text-[10px] text-emerald-800 transition-colors hover:bg-emerald-100 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-900/50"
            >
              Build & freeze spider
            </button>
          </div>
        ) : null}

        {data.embeddedSpider ? (
          <EmbeddedSpiderCard factoryId={id} spider={data.embeddedSpider} />
        ) : null}

        {isDone && data.embeddedSpider ? (
          <p className={cn("mt-2 pt-2 font-mono text-[9px] text-violet-700 dark:text-violet-500", flowNodeDivider, "border-violet-200 dark:border-violet-900/30")}>
            Drag the spider card outward to extract it, then wire preview.
          </p>
        ) : null}

        {data.phase === "error" && data.error ? (
          <p className="mt-2 font-mono text-[10px] text-destructive">{data.error}</p>
        ) : null}

        {isRunning && !data.embeddedSpider ? (
          <div className="mt-3 flex min-h-[72px] items-center justify-center rounded border border-dashed border-violet-300 bg-violet-50/60 animate-pulse dark:border-violet-800/40 dark:bg-violet-950/10">
            <span className="font-mono text-[9px] text-violet-700 dark:text-violet-600">
              Waiting for discovery API…
            </span>
          </div>
        ) : null}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id="in"
        isConnectableStart
        title="Drag to disconnect or reconnect"
        style={flowHandleStyle("#7c3aed", "left", "30%")}
      />
    </div>
  )
})

export const makeDiscoverFactoryData = (): DiscoverFactoryData => ({
  kind: "discover-factory",
  confidenceThreshold: DEFAULT_CONFIDENCE_THRESHOLD,
  maxDiscoverPages: MAX_PROBE_URLS,
  extraContext: "",
  phase: "idle",
  settingsLocked: false,
  activitySteps: [],
  spiderNodeId: null,
  embeddedSpider: null,
  discovery: null,
  pendingDiscovery: null,
  selectedSuggestionIndex: 0,
})
