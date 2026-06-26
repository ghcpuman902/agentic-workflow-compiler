"use client"

import { Circle } from "lucide-react"
import { cn } from "@/lib/utils"
import { AppBrand } from "@/components/brand/app-brand"
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

const paletteItems = [
  { id: "url", label: "Text", hint: "Shift+A" },
  { id: "discover-factory", label: "Discover factory", hint: "Shift+A" },
  { id: "spider", label: "Spider", hint: "Spawned by discover" },
  { id: "preview", label: "Preview", hint: "Shift+A" },
]

export const OutlinerPanel = () => {
  return (
    <>
      <SidebarHeader className="h-10 shrink-0 justify-center border-b border-sidebar-border px-3 py-0 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0">
        <AppBrand />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Collection</SidebarGroupLabel>
          <div className="px-2 pb-2">
            <p className="truncate text-sm text-sidebar-foreground">
              compile_flow_v0.1
            </p>
          </div>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Node palette</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {paletteItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton tooltip={`${item.label} — ${item.hint}`}>
                    <Circle
                      className={cn(
                        "size-2 shrink-0 fill-current text-muted-foreground",
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

      <SidebarFooter className="border-t border-sidebar-border">
        <p className="truncate px-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          Discover factory spawns spiders · drag out to wire preview
        </p>
        <SponsorStrip variant="sidebar" />
      </SidebarFooter>
    </>
  )
}
