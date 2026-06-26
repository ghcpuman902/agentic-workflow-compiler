"use client"

import { Circle, Workflow } from "lucide-react"
import { cn } from "@/lib/utils"
import { SponsorStrip } from "@/components/sponsors"
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const outlinerItems = [
  { id: "url-input", label: "URL Input", status: "idle" as const },
  { id: "quick-discover", label: "Quick Discover", status: "idle" as const },
  { id: "output-select", label: "Output Select", status: "idle" as const },
  { id: "confirm-build", label: "Confirm Build", status: "idle" as const },
  { id: "generate-test", label: "Generate & Test", status: "idle" as const },
  { id: "url-queue", label: "URL Queue", status: "idle" as const },
]

const statusColor = {
  idle: "text-zinc-600",
  loading: "text-amber-500",
  success: "text-emerald-500",
  error: "text-red-500",
}

export const OutlinerPanel = () => {
  return (
    <>
      <SidebarHeader className="border-b border-zinc-800">
        <div className="flex items-center gap-2 px-1">
          <Workflow className="size-4 text-zinc-500" aria-hidden />
          <span className="text-sm font-semibold text-zinc-200">Outliner</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Collection</SidebarGroupLabel>
          <div className="px-2 pb-2">
            <p className="truncate text-sm text-zinc-300">compile_flow_v0.1</p>
          </div>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Workflow Objects</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {outlinerItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    tooltip={item.label}
                    className="hover:bg-zinc-900 hover:text-zinc-200"
                  >
                    <Circle
                      className={cn(
                        "size-2 shrink-0 fill-current",
                        statusColor[item.status],
                      )}
                      aria-hidden
                    />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-zinc-800">
        <p className="truncate px-1 text-xs text-zinc-500">
          Agentic at build time · deterministic at run time
        </p>
        <SponsorStrip variant="sidebar" />
      </SidebarFooter>
    </>
  )
}
