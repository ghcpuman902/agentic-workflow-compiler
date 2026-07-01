"use client"

import { memo } from "react"
import { NodeResizer, type NodeProps } from "@xyflow/react"
import { Bug, CheckCircle2, Loader2, Play } from "lucide-react"

import {
  BlenderInputSocket,
  BlenderOutputRail,
} from "@/components/xyflow/canvas/blender-node-sockets"
import { useCompileFlow } from "@/components/xyflow/canvas/compile-flow-context"
import {
  flowBorderEmeraldDefault,
  flowBorderEmeraldSelected,
  flowHeaderEmerald,
  flowHeaderEmeraldControl,
  flowHeaderEmeraldIcon,
  flowHeaderEmeraldTitle,
  flowNodeBadge,
  flowNodeBody,
  flowNodeBodyStrong,
  flowNodeDivider,
  flowNodeInputSm,
  flowNodeLabel,
  flowNodeShell,
  flowResizerHandle,
  flowSpiderShell,
} from "@/lib/flow/node-chrome"
import { cn } from "@/lib/utils"
import type { SpiderNodeData } from "@/lib/flow/canvas-types"
import type { OutputFormat } from "@/lib/workflow/content-types"
import {
  formatFromSpiderHandle,
  formatShortLabel,
  formatSocketColor,
  getInterchangeFormats,
  getSpiderOutputFamily,
  INPUT_SOCKET_COLOR,
  spiderOutputHandleId,
} from "@/lib/workflow/spider-output"

export const SpiderNode = memo(function SpiderNode({
  id,
  data,
  selected,
}: NodeProps & { data: SpiderNodeData }) {
  const { updateNodeData, runSpider } = useCompileFlow()
  const fields = data.suggestion?.fields?.slice(0, 4) ?? []
  const isBuilding = data.buildStatus === "building"
  const isRunning = data.runState === "running"
  const canRun = data.buildStatus === "approved" && !isRunning
  const outputFamily = getSpiderOutputFamily(data)
  const interchangeFormats = getInterchangeFormats(outputFamily)
  const activeFormat = formatFromSpiderHandle(null, data)
  const socketDisabled = isBuilding || isRunning

  const handleFormatChange = (format: OutputFormat) => {
    updateNodeData(id, (current) => ({
      ...(current as SpiderNodeData),
      outputFormat: format,
    }))
  }

  const handleMaxInputChange = (value: string) => {
    const parsed = Number(value)
    if (Number.isNaN(parsed)) return
    const clamped = Math.min(500, Math.max(1, Math.round(parsed)))
    updateNodeData(id, (current) => ({ ...current, maxInputUrls: clamped }))
  }

  const outputSockets = interchangeFormats.map((format) => ({
    formatKey: format,
    id: spiderOutputHandleId(format),
    label: formatShortLabel(format),
    color: formatSocketColor[format],
  }))

  return (
    <div
      className={flowNodeShell(selected, {
        borderDefault: flowBorderEmeraldDefault,
        borderSelected: flowBorderEmeraldSelected,
        extra: cn(
          flowSpiderShell,
          "relative",
          !data.detached && "shadow-md dark:shadow-lg dark:shadow-violet-950/40",
        ),
      })}
      style={{ width: "100%", height: "100%", minHeight: 200 }}
    >
      <BlenderInputSocket label="urls" color={INPUT_SOCKET_COLOR} top={28} />

      <NodeResizer
        isVisible={selected && data.detached}
        minWidth={280}
        minHeight={200}
        lineStyle={{ border: "1px solid rgba(16,185,129,0.35)" }}
        handleStyle={flowResizerHandle("#10b981")}
      />

      <div className={cn(flowHeaderEmerald, "relative pl-3")}>
        <Bug className={flowHeaderEmeraldIcon} aria-hidden />
        <span className={flowHeaderEmeraldTitle}>Spider</span>
        {isBuilding ? (
          <Loader2 className="size-3 animate-spin text-violet-500 dark:text-violet-400" aria-hidden />
        ) : data.buildStatus === "approved" ? (
          <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" aria-hidden />
        ) : null}

        {data.detached && canRun ? (
          <button
            type="button"
            onClick={() => runSpider(id)}
            className={cn(flowHeaderEmeraldControl, "ml-auto")}
            title={`Run on all URLs (max ${data.maxInputUrls})`}
            aria-label="Run spider on all URLs"
          >
            <Play className="size-3" />
          </button>
        ) : !data.detached ? (
          <span
            className="ml-auto font-mono text-[8px] text-violet-600 dark:text-violet-600"
            title="Drag out of factory"
          >
            ⠿
          </span>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="nodrag nowheel min-w-0 flex-1 space-y-1.5 overflow-y-auto p-2.5 pl-3">
          <p className={cn(flowNodeBodyStrong, "truncate")}>{data.label}</p>

          <div className="flex flex-wrap items-center gap-1">
            <span
              className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 font-mono text-[9px] capitalize text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/50 dark:text-emerald-300"
              title="Locked by discover node"
            >
              {outputFamily}
            </span>
            <span className={flowNodeBadge} title="Locked by discover node">
              {data.cardinality}
            </span>
            <span className="rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 font-mono text-[9px] text-violet-700 dark:border-violet-800/50 dark:bg-violet-950/50 dark:text-violet-300">
              {(data.confidence * 100).toFixed(0)}% conf
            </span>
            {data.entity ? (
              <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 font-mono text-[9px] text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/50 dark:text-emerald-300">
                {data.entity}
              </span>
            ) : null}
          </div>

          <label className={cn("flex items-center justify-between gap-2", flowNodeLabel)}>
            <span>Max input URLs</span>
            <input
              type="number"
              min={1}
              max={500}
              step={1}
              value={data.maxInputUrls}
              disabled={isRunning}
              onChange={(event) => handleMaxInputChange(event.target.value)}
              onPointerDown={(event) => event.stopPropagation()}
              className={cn(flowNodeInputSm, "w-14 text-right focus-visible:border-emerald-500/60")}
              aria-label="Max input URLs"
            />
          </label>

          {fields.length > 0 ? (
            <ul className={cn("space-y-0.5 pt-1.5", flowNodeDivider)}>
              {fields.map((field) => (
                <li
                  key={field.name}
                  className={cn("flex justify-between gap-2", flowNodeLabel)}
                >
                  <span className="text-foreground/70">{field.name}</span>
                  <span>{field.type}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {data.buildStatus === "building" ? (
            <p className={cn(flowNodeDivider, "pt-1.5 font-mono text-[9px] text-violet-600 dark:text-violet-400")}>
              Agent building & testing extractor…
            </p>
          ) : null}

          {data.build ? (
            <div className={cn("space-y-0.5 pt-1.5 font-mono text-[9px]", flowNodeDivider)}>
              <p className="text-emerald-700 dark:text-emerald-400">
                {data.build.testsPassed}/{data.build.testsTotal} golden tests ·{" "}
                {data.build.repairCount} repair
                {data.build.repairCount === 1 ? "" : "s"}
              </p>
              <p className={flowNodeBody}>
                {data.build.agent === "cursor" ? "Cursor agent" : "Gemini"} ·{" "}
                {data.build.recordCount} records
              </p>
            </div>
          ) : null}

          {data.buildError ? (
            <p className={cn(flowNodeDivider, "pt-1.5 font-mono text-[9px] text-destructive")}>
              {data.buildError}
            </p>
          ) : null}

          {data.run ? (
            <p className={cn(flowNodeDivider, "border-emerald-200 pt-1.5 font-mono text-[9px] text-emerald-700 dark:border-emerald-900/30 dark:text-emerald-300")}>
              Ran {data.run.urlsRun} URLs → {data.run.recordCount} records
            </p>
          ) : null}

          {data.runError ? (
            <p className={cn(flowNodeDivider, "pt-1.5 font-mono text-[9px] text-destructive")}>
              {data.runError}
            </p>
          ) : null}

          {!data.detached ? (
            <p className="font-mono text-[8px] text-violet-600 dark:text-violet-600">
              drag outward to extract →
            </p>
          ) : null}
        </div>

        <BlenderOutputRail
          formats={outputSockets}
          activeFormatKey={activeFormat}
          disabled={socketDisabled}
          onSelectFormat={(formatKey) =>
            handleFormatChange(formatKey as OutputFormat)
          }
        />
      </div>
    </div>
  )
})
