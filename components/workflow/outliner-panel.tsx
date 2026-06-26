"use client"

import * as React from "react"
import { Circle, Database, MessageSquare, LayoutGrid } from "lucide-react"
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { getCachedRawPages, getChatSessions, type ChatSessionsResult } from "@/app/actions/sidebar"

const paletteItems = [
  { id: "url", label: "Text", hint: "Shift+A" },
  { id: "llm", label: "LLM (Gemini)", hint: "Shift+A" },
  { id: "discover-factory", label: "Discover factory", hint: "Shift+A" },
  { id: "spider", label: "Spider", hint: "Spawned by discover" },
  { id: "preview", label: "Preview", hint: "Shift+A" },
]

export const OutlinerPanel = () => {
  const [activeTab, setActiveTab] = React.useState("build")
  const [cachedPages, setCachedPages] = React.useState<{filename: string}[]>([])
  const [chatData, setChatData] = React.useState<ChatSessionsResult | null>(null)

  React.useEffect(() => {
    if (activeTab === "data") {
      getCachedRawPages().then(setCachedPages)
    } else if (activeTab === "chat") {
      getChatSessions().then(setChatData)
    }
  }, [activeTab])

  return (
    <>
      <SidebarHeader className="h-10 shrink-0 justify-center border-b border-sidebar-border px-3 py-0 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0">
        <AppBrand />
      </SidebarHeader>

      <SidebarContent className="flex flex-col h-full overflow-hidden">
        <Tabs defaultValue="build" onValueChange={setActiveTab} className="flex flex-col h-full flex-1 w-full gap-0">
          <div className="px-3 py-2 shrink-0 border-b border-sidebar-border group-data-[collapsible=icon]:hidden">
            <TabsList className="w-full grid grid-cols-3 h-8">
              <TabsTrigger value="build" className="text-xs px-1">
                <LayoutGrid className="size-3 mr-1" /> Build
              </TabsTrigger>
              <TabsTrigger value="data" className="text-xs px-1">
                <Database className="size-3 mr-1" /> Data
              </TabsTrigger>
              <TabsTrigger value="chat" className="text-xs px-1">
                <MessageSquare className="size-3 mr-1" /> Chat
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="build" className="flex-1 overflow-y-auto m-0 p-0">
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
          </TabsContent>

          <TabsContent value="data" className="flex-1 overflow-y-auto m-0 p-0 group-data-[collapsible=icon]:hidden">
            <SidebarGroup>
              <SidebarGroupLabel>Cached Raw Pages</SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="px-3 py-2 text-xs text-muted-foreground flex flex-col gap-2">
                  {cachedPages.length === 0 ? (
                    <p>No cached data found.</p>
                  ) : (
                    cachedPages.map((page, idx) => (
                      <div key={idx} className="truncate rounded border border-border px-2 py-1 bg-muted/50">
                        {page.filename}
                      </div>
                    ))
                  )}
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </TabsContent>

          <TabsContent value="chat" className="flex-1 overflow-y-auto m-0 p-0 group-data-[collapsible=icon]:hidden">
            <SidebarGroup>
              <SidebarGroupLabel>Chat History</SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="px-3 py-2 text-xs flex flex-col gap-2">
                  {!chatData ? (
                    <p className="text-muted-foreground">Loading sessions...</p>
                  ) : chatData.sessions.length === 0 ? (
                    <p className="text-muted-foreground">No chat history yet.</p>
                  ) : (
                    chatData.sessions.map((session) => (
                      <div key={session.session_id} className="rounded border border-border px-2 py-1.5 bg-muted/50 flex flex-col gap-1">
                        <span className="font-semibold text-foreground truncate">{session.title || "Untitled Session"}</span>
                        <span className="text-[10px] text-muted-foreground">{session.created_at}</span>
                      </div>
                    ))
                  )}

                  {chatData && (
                    <p className="text-[10px] text-muted-foreground">
                      Persisted locally
                      {chatData.configured
                        ? chatData.error
                          ? " · ClickHouse unavailable (mirror)"
                          : " · mirrored to ClickHouse"
                        : " · ClickHouse not configured"}
                    </p>
                  )}

                  <button
                    onClick={async () => {
                      const res = await fetch("/api/chat/demo", { method: "POST" })
                      if (res.ok) {
                        getChatSessions().then(setChatData)
                      }
                    }}
                    className="mt-2 rounded bg-primary text-primary-foreground px-2 py-1 font-medium hover:opacity-90"
                  >
                    + Generate Demo Session
                  </button>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </TabsContent>
        </Tabs>
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
