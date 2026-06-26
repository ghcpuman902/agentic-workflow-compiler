import {
  CheckCircle2,
  FlaskConical,
  Globe,
  Layers,
  ListOrdered,
  Sparkles,
  type LucideIcon,
} from "lucide-react"

import type { NodeRunState, PipelineNodeKind } from "@/lib/workflow/pipeline-types"

export type NodeTheme = {
  categoryLabel: string
  icon: LucideIcon
  headerBg: string
  headerBorder: string
  headerText: string
  iconText: string
  controlHover: string
  accentHex: string
  borderDefault: string
  borderSelected: string
  resizerLine: string
}

export const NODE_THEME: Record<PipelineNodeKind, NodeTheme> = {
  "url-input": {
    categoryLabel: "URL",
    icon: Globe,
    headerBg: "bg-sky-100 dark:bg-sky-950/50",
    headerBorder: "border-sky-200 dark:border-sky-900/30",
    headerText: "text-sky-800 dark:text-sky-300",
    iconText: "text-sky-600 dark:text-sky-400",
    controlHover: "text-sky-700 hover:bg-sky-100 dark:text-sky-400 dark:hover:bg-sky-900/40",
    accentHex: "#0ea5e9",
    borderDefault: "border-sky-200 dark:border-sky-900/40",
    borderSelected: "border-sky-500/60 shadow-[0_0_0_1px_rgba(14,165,233,0.12)]",
    resizerLine: "rgba(14,165,233,0.35)",
  },
  "quick-discover": {
    categoryLabel: "Discover",
    icon: Sparkles,
    headerBg: "bg-violet-100 dark:bg-violet-950/30",
    headerBorder: "border-violet-200 dark:border-violet-900/30",
    headerText: "text-violet-800 dark:text-violet-300",
    iconText: "text-violet-600 dark:text-violet-400",
    controlHover: "text-violet-700 hover:bg-violet-100 dark:text-violet-400 dark:hover:bg-violet-900/40",
    accentHex: "#7c3aed",
    borderDefault: "border-border dark:border-[#3a3a3a]",
    borderSelected: "border-violet-500/50 shadow-[0_0_24px_rgba(139,92,246,0.08)]",
    resizerLine: "rgba(139,92,246,0.4)",
  },
  "output-select": {
    categoryLabel: "Schema",
    icon: Layers,
    headerBg: "bg-amber-100 dark:bg-amber-950/50",
    headerBorder: "border-amber-200 dark:border-amber-900/30",
    headerText: "text-amber-900 dark:text-amber-300",
    iconText: "text-amber-700 dark:text-amber-400",
    controlHover: "text-amber-800 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/40",
    accentHex: "#f59e0b",
    borderDefault: "border-border dark:border-[#3a3a3a]",
    borderSelected: "border-amber-500/70 shadow-[0_0_0_1px_rgba(245,158,11,0.15)]",
    resizerLine: "rgba(245,158,11,0.4)",
  },
  "confirm-build": {
    categoryLabel: "Agent",
    icon: CheckCircle2,
    headerBg: "bg-violet-100 dark:bg-violet-950/40",
    headerBorder: "border-violet-200 dark:border-violet-900/30",
    headerText: "text-violet-800 dark:text-violet-300",
    iconText: "text-violet-600 dark:text-violet-400",
    controlHover: "text-violet-700 hover:bg-violet-100 dark:text-violet-400 dark:hover:bg-violet-900/40",
    accentHex: "#8b5cf6",
    borderDefault: "border-border dark:border-[#3a3a3a]",
    borderSelected: "border-violet-500/50",
    resizerLine: "rgba(139,92,246,0.4)",
  },
  "generate-test": {
    categoryLabel: "Test",
    icon: FlaskConical,
    headerBg: "bg-rose-100 dark:bg-rose-950/50",
    headerBorder: "border-rose-200 dark:border-rose-900/30",
    headerText: "text-rose-900 dark:text-rose-300",
    iconText: "text-rose-700 dark:text-rose-400",
    controlHover: "text-rose-800 hover:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-900/40",
    accentHex: "#f43f5e",
    borderDefault: "border-border dark:border-[#3a3a3a]",
    borderSelected: "border-rose-500/70 shadow-[0_0_0_1px_rgba(244,63,94,0.15)]",
    resizerLine: "rgba(244,63,94,0.4)",
  },
  "url-queue": {
    categoryLabel: "Output",
    icon: ListOrdered,
    headerBg: "bg-muted dark:bg-zinc-800/80",
    headerBorder: "border-border dark:border-zinc-700/50",
    headerText: "text-foreground dark:text-zinc-300",
    iconText: "text-muted-foreground dark:text-zinc-400",
    controlHover: "text-muted-foreground hover:bg-muted dark:text-zinc-400 dark:hover:bg-zinc-700/40",
    accentHex: "#71717a",
    borderDefault: "border-border dark:border-[#3a3a3a]",
    borderSelected: "border-zinc-500/60",
    resizerLine: "rgba(113,113,122,0.4)",
  },
}

export const RUN_STATE_LABEL: Record<NodeRunState, string> = {
  idle: "Idle",
  running: "Running",
  paused: "Paused",
  completed: "Complete",
  error: "Failed",
  stopped: "Stopped",
}

export const RUN_STATE_COLOR: Record<NodeRunState, string> = {
  idle: "text-muted-foreground",
  running: "text-blue-600 dark:text-blue-400",
  paused: "text-amber-700 dark:text-amber-400",
  completed: "text-emerald-700 dark:text-emerald-400",
  error: "text-destructive",
  stopped: "text-muted-foreground",
}

export const SOCKET_HEX: Record<string, string> = {
  urls: "#34d399",
  discovery: "#60a5fa",
  selection: "#fbbf24",
  approved: "#a78bfa",
  artifact: "#fb7185",
  batch: "#71717a",
}
