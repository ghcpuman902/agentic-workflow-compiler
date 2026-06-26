"use client"

import { Cpu, FlaskConical, GitBranch, Play, Zap } from "lucide-react"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { useWorkflowPipeline } from "@/components/workflow/workflow-pipeline-provider"

export const WorkflowToolbar = () => {
  const pipeline = useWorkflowPipeline()

  const testsPassed = pipeline.artifact?.testsPassed
  const testsTotal = pipeline.artifact?.testsTotal
  const testsLabel =
    testsPassed !== undefined && testsTotal !== undefined
      ? `${testsPassed}/${testsTotal}`
      : "—"

  const modelCalls = pipeline.discovery ? pipeline.probedUrls.length : 0

  return (
    <header className="z-30 flex h-10 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-3">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-zinc-500" />
        <div className="flex items-center gap-1.5">
          <div className="flex size-5 items-center justify-center rounded bg-violet-600">
            <Cpu className="size-3 text-white" aria-hidden />
          </div>
          <span className="font-mono text-sm font-semibold tracking-tight text-white">
            CompileFlow
          </span>
        </div>
        <div className="h-4 w-px bg-zinc-700" />
        <span className="text-sm font-medium text-zinc-300">Cannes 2025 — Films</span>
        <span className="rounded border border-amber-500/30 bg-amber-500/20 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-amber-300">
          Building
        </span>
      </div>

      <div className="hidden items-center gap-5 md:flex">
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <Zap className="size-3 text-violet-400" aria-hidden />
          <span className="font-mono">{modelCalls}</span>
          <span className="text-zinc-600">probes</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <FlaskConical className="size-3 text-emerald-400" aria-hidden />
          <span className="font-mono text-emerald-400">{testsLabel}</span>
          <span className="text-zinc-600">tests</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <GitBranch className="size-3 text-zinc-500" aria-hidden />
          <span className="font-mono">v0.1</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden font-mono text-[10px] text-zinc-600 sm:inline">
          {pipeline.allUrls.length} URLs
        </span>
        <button
          type="button"
          className="flex h-7 items-center gap-1.5 rounded bg-violet-600 px-3 text-xs font-medium text-white transition-colors hover:bg-violet-500"
          title="Run full pipeline from URL Input"
        >
          <Play className="size-3 fill-current" aria-hidden />
          Run workflow
        </button>
      </div>
    </header>
  )
}
