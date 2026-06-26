"use client"

import type { CSSProperties } from "react"
import dynamic from "next/dynamic"
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { OutlinerPanel } from "@/components/workflow/outliner-panel"
import { SponsorStrip } from "@/components/sponsors"

const ReactFlowCanvas = dynamic(
  () =>
    import("@/components/workflow/react-flow-canvas").then(
      (module) => module.ReactFlowCanvas,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 text-xs text-zinc-500">
        Loading editor…
      </div>
    ),
  },
)

export const BlenderWorkspace = () => {
  return (
    <SidebarProvider
      defaultOpen
      className="h-svh min-h-0 w-full bg-zinc-950"
      style={
        {
          "--sidebar-width": "13.5rem",
        } as CSSProperties
      }
    >
      <Sidebar
        collapsible="icon"
        className="border-zinc-800 bg-zinc-950 text-zinc-300"
      >
        <OutlinerPanel />
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="flex min-h-0 min-w-0 flex-1 flex-col bg-zinc-950 text-zinc-100">
        <header className="flex h-10 shrink-0 items-center gap-2 border-b border-zinc-800 px-3">
          <SidebarTrigger className="text-zinc-400" />
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Agentic Workflow Compiler
          </span>
        </header>

        <div className="relative min-h-0 flex-1">
          <ReactFlowCanvas />
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-zinc-800 bg-zinc-950 px-3 py-1.5 text-[10px] text-zinc-500">
          <span className="shrink-0">Build mode</span>
          <SponsorStrip variant="compact" className="min-w-0 flex-1 justify-center" />
          <span className="shrink-0">
            Toggle sidebar with{" "}
            <kbd className="rounded border border-zinc-700 px-1">⌘B</kbd>
          </span>
        </footer>
      </SidebarInset>
    </SidebarProvider>
  )
}
