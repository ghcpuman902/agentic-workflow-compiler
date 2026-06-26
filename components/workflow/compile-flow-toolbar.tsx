"use client"

import { GitBranch, Plus } from "lucide-react"

import { AppBrand } from "@/components/brand/app-brand"
import { SidebarTrigger } from "@/components/ui/sidebar"

type CompileFlowToolbarProps = {
  nodeCount: number
  onAddNode: () => void
}

export const CompileFlowToolbar = ({
  nodeCount,
  onAddNode,
}: CompileFlowToolbarProps) => {
  return (
    <header className="z-30 flex h-10 shrink-0 items-center justify-between border-b border-border bg-background px-3">
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger className="text-muted-foreground" />
        <AppBrand showTagline={false} />
        <div className="h-4 w-px bg-border" />
        <span className="text-sm font-medium text-foreground">New workflow</span>
        <span className="rounded border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-300">
          Building
        </span>
        <div className="hidden h-4 w-px bg-border sm:block" />
        <button
          type="button"
          onClick={onAddNode}
          className="group hidden items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-all hover:border-border hover:bg-muted hover:text-foreground sm:flex"
          aria-label="Add node (Shift+A)"
        >
          <Plus className="size-3 transition-colors group-hover:text-primary" />
          Add node
          <span className="text-muted-foreground/70 group-hover:text-muted-foreground">
            Shift+A
          </span>
        </button>
      </div>

      <div className="hidden items-center gap-5 md:flex">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <GitBranch className="size-3" aria-hidden />
          <span className="font-mono">v0.1</span>
        </div>
      </div>

      <div className="font-mono text-[10px] text-muted-foreground">
        {nodeCount} node{nodeCount === 1 ? "" : "s"}
      </div>
    </header>
  )
}
