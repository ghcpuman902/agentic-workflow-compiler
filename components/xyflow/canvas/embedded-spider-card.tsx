"use client"

import { useRef } from "react"
import { Bug, CheckCircle2, Loader2 } from "lucide-react"

import { useCompileFlow } from "@/components/xyflow/canvas/compile-flow-context"
import {
  flowHeaderEmerald,
  flowHeaderEmeraldIcon,
  flowHeaderEmeraldTitle,
  flowNodeBadge,
  flowNodeBody,
  flowSpiderShell,
} from "@/lib/flow/node-chrome"
import { cn } from "@/lib/utils"
import type { DiscoverFactoryData } from "@/lib/flow/canvas-types"
import { ITEM_TYPE_LABELS } from "@/lib/workflow/content-types"

type EmbeddedSpiderCardProps = {
  factoryId: string
  spider: NonNullable<DiscoverFactoryData["embeddedSpider"]>
}

export const EmbeddedSpiderCard = ({
  factoryId,
  spider,
}: EmbeddedSpiderCardProps) => {
  const { materializeSpider } = useCompileFlow()
  const dragStart = useRef<{ x: number; y: number } | null>(null)

  const fields = spider.suggestion?.fields?.slice(0, 3) ?? []

  const handlePointerDown = (event: React.PointerEvent) => {
    event.stopPropagation()
    dragStart.current = { x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerUp = (event: React.PointerEvent) => {
    if (!dragStart.current) return
    const dx = event.clientX - dragStart.current.x
    const dy = event.clientY - dragStart.current.y
    dragStart.current = null

    if (Math.hypot(dx, dy) > 36) {
      materializeSpider(factoryId, { x: event.clientX, y: event.clientY })
    }
  }

  return (
    <div
      className={cn(
        "mt-3 cursor-grab rounded-sm border border-emerald-300 active:cursor-grabbing dark:border-emerald-700/50",
        flowSpiderShell,
        "shadow-md ring-1 ring-emerald-500/15 dark:shadow-lg dark:shadow-violet-950/30 dark:ring-emerald-500/20",
      )}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      role="button"
      tabIndex={0}
      aria-label={`Spider ${spider.label}. Drag outward to extract.`}
    >
      <div className={cn(flowHeaderEmerald, "px-2 py-1")}>
        <Bug className={flowHeaderEmeraldIcon} aria-hidden />
        <span className={flowHeaderEmeraldTitle}>Spider</span>
        {spider.buildStatus === "building" ? (
          <Loader2 className="size-3 animate-spin text-violet-500 dark:text-violet-400" aria-hidden />
        ) : spider.buildStatus === "approved" ? (
          <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" aria-hidden />
        ) : null}
        <span className="ml-auto font-mono text-[8px] text-violet-600 dark:text-violet-500">
          drag out ➜
        </span>
      </div>
      <div className="space-y-1 p-2">
        <p className="truncate font-mono text-[10px] text-foreground">{spider.label}</p>
        <div className="flex flex-wrap gap-1">
          <span className="rounded border border-emerald-200 bg-emerald-50 px-1 py-0.5 font-mono text-[8px] text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/50 dark:text-emerald-300">
            {ITEM_TYPE_LABELS[spider.itemType]}
          </span>
          <span className={flowNodeBadge}>{spider.cardinality}</span>
          <span className="rounded border border-violet-200 bg-violet-50 px-1 py-0.5 font-mono text-[8px] text-violet-700 dark:border-violet-800/50 dark:bg-violet-950/50 dark:text-violet-300">
            {(spider.confidence * 100).toFixed(0)}%
          </span>
        </div>
        {spider.build ? (
          <p className="font-mono text-[8px] text-emerald-700 dark:text-emerald-400">
            {spider.build.testsPassed}/{spider.build.testsTotal} tests ·{" "}
            {spider.build.repairCount} repair
            {spider.build.repairCount === 1 ? "" : "s"}
          </p>
        ) : null}
        {fields.length > 0 ? (
          <ul className="space-y-0.5 pt-1">
            {fields.map((field) => (
              <li key={field.name} className={flowNodeBody}>
                {field.name}{" "}
                <span className="text-muted-foreground/70">{field.type}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <button
          type="button"
          className="mt-1 w-full rounded border border-violet-200 bg-violet-50 py-1 font-mono text-[8px] text-violet-700 transition-colors hover:bg-violet-100 dark:border-violet-800/50 dark:bg-violet-950/30 dark:text-violet-300 dark:hover:bg-violet-900/40"
          onClick={(event) => {
            event.stopPropagation()
            const factoryEl = event.currentTarget.closest(
              "[data-discover-factory]",
            ) as HTMLElement | null
            const rect = factoryEl?.getBoundingClientRect()
            materializeSpider(factoryId, {
              x: (rect?.right ?? event.clientX) + 40,
              y: rect?.top ?? event.clientY,
            })
          }}
        >
          Extract to canvas
        </button>
      </div>
    </div>
  )
}
