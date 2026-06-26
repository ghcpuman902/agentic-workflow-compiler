"use client"

import type { CSSProperties } from "react"
import dynamic from "next/dynamic"
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
} from "@/components/ui/sidebar"
import { OutlinerPanel } from "@/components/workflow/outliner-panel"
import { SponsorStrip } from "@/components/sponsors"

const ReactFlowCanvas = dynamic(
  () =>
    import("@/components/workflow/compile-flow-canvas").then(
      (module) => module.CompileFlowCanvas,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center bg-muted font-mono text-xs text-muted-foreground">
        Loading editor…
      </div>
    ),
  },
)

export const BlenderWorkspace = () => {
  return (
    <SidebarProvider
      defaultOpen
      className="h-svh max-h-svh min-h-0 w-svw max-w-svw overflow-hidden bg-background"
      style={
        {
          "--sidebar-width": "13.5rem",
        } as CSSProperties
      }
    >
      <Sidebar collapsible="icon" variant="sidebar">
        <OutlinerPanel />
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background text-foreground">
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <ReactFlowCanvas />
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-background px-3 py-1.5 text-[10px] text-muted-foreground">
          <span className="shrink-0 font-mono">Build mode</span>
          <SponsorStrip variant="compact" className="min-w-0 flex-1 justify-center" />
          <span className="shrink-0">
            Toggle sidebar{" "}
            <kbd className="rounded border border-border px-1 font-mono">⌘B</kbd>
          </span>
        </footer>
      </SidebarInset>
    </SidebarProvider>
  )
}
