"use client"

import { useEffect, useRef } from "react"
import { AlignLeft, Sparkles, Table, Bot } from "lucide-react"

import type { FlowNodeKind } from "@/lib/flow/canvas-types"
import { cn } from "@/lib/utils"

const ADDABLE_NODES: {
  id: FlowNodeKind
  label: string
  description: string
  icon: React.ElementType
  color: string
  accent: string
}[] = [
  {
    id: "url",
    label: "Text",
    description: "Paste URLs or notes — one line per item",
    icon: AlignLeft,
    color: "text-sky-600 dark:text-sky-400",
    accent: "hover:bg-sky-50 dark:hover:bg-sky-950/40",
  },
  {
    id: "llm",
    label: "LLM (Gemini)",
    description: "Transform text using a prompt and Gemini",
    icon: Bot,
    color: "text-violet-600 dark:text-violet-400",
    accent: "hover:bg-violet-50 dark:hover:bg-violet-950/40",
  },
  {
    id: "discover-factory",
    label: "Discover",
    description: "Quick discovery factory — spawns a spider",
    icon: Sparkles,
    color: "text-violet-600 dark:text-violet-400",
    accent: "hover:bg-violet-50 dark:hover:bg-violet-950/40",
  },
  {
    id: "preview",
    label: "Preview",
    description: "Universal viewer — auto, mini browser, Tavily, tables, JSON",
    icon: Table,
    color: "text-emerald-600 dark:text-emerald-400",
    accent: "hover:bg-emerald-50 dark:hover:bg-emerald-950/40",
  },
]

type AddNodeMenuProps = {
  x: number
  y: number
  allowedKinds?: FlowNodeKind[]
  onSelect: (kind: FlowNodeKind) => void
  onClose: () => void
}

export const AddNodeMenu = ({
  x,
  y,
  allowedKinds,
  onSelect,
  onClose,
}: AddNodeMenuProps) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose()
      }
    }
    const timer = setTimeout(() => window.addEventListener("mousedown", handler), 0)
    return () => {
      clearTimeout(timer)
      window.removeEventListener("mousedown", handler)
    }
  }, [onClose])

  const visibleNodes = allowedKinds
    ? ADDABLE_NODES.filter((node) => allowedKinds.includes(node.id))
    : ADDABLE_NODES

  const menuWidth = 260
  const menuHeight = Math.min(220, 52 + visibleNodes.length * 52)
  const cursorOffset = 12
  const left = Math.min(
    x + cursorOffset,
    window.innerWidth - menuWidth - 8,
  )
  const top = Math.min(
    y + cursorOffset,
    window.innerHeight - menuHeight - 8,
  )

  return (
    <div
      ref={ref}
      className="fixed z-50 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-2xl"
      style={{ left, top, width: menuWidth }}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {allowedKinds ? "Add & Connect" : "Add Node"}
        </span>
        <span className="font-mono text-[9px] text-muted-foreground/70">
          {allowedKinds ? "release wire" : "Shift+A"}
        </span>
      </div>
      <div className="py-1">
        {visibleNodes.map((type) => {
          const Icon = type.icon
          return (
            <button
              key={type.id}
              type="button"
              onMouseDown={(event) => {
                event.stopPropagation()
                onSelect(type.id)
              }}
              className={cn(
                "group flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
                type.accent,
              )}
            >
              <Icon className={cn("size-4 shrink-0", type.color)} aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[11px] text-foreground transition-colors group-hover:text-foreground">
                  {type.label}
                </div>
                <div className="truncate text-[9px] text-muted-foreground">
                  {type.description}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
