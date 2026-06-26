import { cn } from "@/lib/utils"

export const flowNodeShell = (
  selected: boolean,
  options?: {
    borderDefault?: string
    borderSelected?: string
    rounded?: "sm" | "md"
    extra?: string
  },
) =>
  cn(
    "flex flex-col overflow-hidden border bg-card text-card-foreground shadow-sm",
    options?.rounded === "md" ? "rounded-md" : "rounded-sm",
    options?.extra,
    selected
      ? (options?.borderSelected ??
          "border-primary/60 ring-1 ring-primary/10 shadow-sm")
      : (options?.borderDefault ?? "border-border"),
  )

export const flowNodeBody = "font-mono text-[10px] text-muted-foreground"
export const flowNodeBodyStrong = "font-mono text-[10px] font-medium text-foreground"
export const flowNodeHint =
  "font-mono text-[10px] italic text-muted-foreground/80"
export const flowNodeLabel = "font-mono text-[10px] text-muted-foreground"
export const flowNodeLabelStrong = "font-mono text-[10px] text-foreground/80"

export const flowNodeInput =
  "nodrag nowheel w-full resize-none rounded border border-input bg-background px-1.5 py-1 font-mono text-[10px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring disabled:opacity-50"

export const flowNodeInputSm =
  "nodrag nowheel rounded border border-input bg-background px-1 py-0.5 font-mono text-[9px] text-foreground outline-none focus-visible:border-ring disabled:opacity-50"

export const flowNodeInputRight =
  "nodrag nowheel w-16 rounded border border-input bg-background px-1 py-0.5 text-right font-mono text-[10px] text-foreground outline-none focus-visible:border-ring disabled:opacity-50"

export const flowNodeBadge =
  "rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground"

export const flowNodeDivider = "border-t border-border"
export const flowNodePanel = "rounded border border-border bg-muted/30"
export const flowNodeIconButton =
  "rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
export const flowNodeStopButton =
  "rounded p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"

export const flowHandleStyle = (
  color: string,
  side: "left" | "right",
  top: string | number = "50%",
) => ({
  [side === "left" ? "left" : "right"]: side === "left" ? -6 : -6,
  top,
  background: color,
  width: 10,
  height: 10,
  border: "2px solid var(--flow-node-bg)",
})

export const flowResizerHandle = (color: string) => ({
  width: 7,
  height: 7,
  background: color,
  borderRadius: 2,
  border: "none",
})

export const flowHeaderSky =
  "flex shrink-0 items-center gap-2 border-b border-sky-200 bg-sky-50 px-2.5 py-1.5 dark:border-sky-900/30 dark:bg-sky-950/50"
export const flowHeaderSkyIcon = "size-3 shrink-0 text-sky-600 dark:text-sky-400"
export const flowHeaderSkyTitle =
  "font-mono text-[10px] font-bold uppercase tracking-wide text-sky-800 dark:text-sky-300"
export const flowHeaderSkyMeta =
  "ml-auto font-mono text-[9px] text-sky-600/90 dark:text-sky-700"

export const flowHeaderViolet =
  "flex shrink-0 items-center gap-2 border-b border-violet-200 bg-violet-50 px-3 py-1.5 dark:border-violet-900/30 dark:bg-violet-950/30"
export const flowHeaderVioletIcon =
  "size-3.5 shrink-0 text-violet-600 dark:text-violet-400"
export const flowHeaderVioletTitle =
  "font-mono text-[10px] font-bold uppercase tracking-wide text-violet-800 dark:text-violet-300"
export const flowHeaderVioletMeta =
  "font-mono text-[9px] text-violet-600/80 dark:text-violet-700"
export const flowHeaderVioletControl =
  "rounded p-0.5 text-violet-700 transition-colors hover:bg-violet-100 dark:text-violet-400 dark:hover:bg-violet-900/40"

export const flowHeaderEmerald =
  "flex shrink-0 flex-wrap items-center gap-2 border-b border-emerald-200 bg-emerald-50 px-2.5 py-1.5 dark:border-emerald-900/30 dark:bg-emerald-950/50"
export const flowHeaderEmeraldIcon =
  "size-3 shrink-0 text-emerald-600 dark:text-emerald-400"
export const flowHeaderEmeraldTitle =
  "font-mono text-[10px] font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-300"
export const flowHeaderEmeraldControl =
  "rounded p-0.5 text-emerald-700 transition-colors hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-900/40"

export const flowBorderSkySelected =
  "border-sky-500/60 shadow-[0_0_0_1px_rgba(14,165,233,0.12)]"
export const flowBorderSkyDefault =
  "border-sky-200 dark:border-sky-900/40"

export const flowBorderVioletSelected = "border-violet-500/50"
export const flowBorderVioletRunning = "border-violet-500/40"
export const flowBorderVioletDone =
  "border-violet-600/50 shadow-[0_0_24px_rgba(139,92,246,0.08)]"
export const flowBorderVioletDefault = "border-border dark:border-[#3a3a3a]"

export const flowBorderEmeraldSelected =
  "border-emerald-500/70 shadow-[0_0_0_1px_rgba(16,185,129,0.15)]"
export const flowBorderEmeraldDefault =
  "border-emerald-200 dark:border-violet-700/50"

export const flowDiscoverShell =
  "bg-violet-50/40 dark:bg-[#161620]"

export const flowSpiderShell =
  "bg-emerald-50/30 dark:bg-[#1a1625]"
