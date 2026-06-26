"use client"

import { Pause, Play, Square } from "lucide-react"

import { cn } from "@/lib/utils"
import type { NodeRunState } from "@/lib/workflow/pipeline-types"

type NodeTransportControlsProps = {
  runState: NodeRunState
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  canPlay?: boolean
  canPause?: boolean
  canStop?: boolean
  accentClassName?: string
  className?: string
}

export const NodeTransportControls = ({
  runState,
  onPlay,
  onPause,
  onStop,
  canPlay = true,
  canPause = runState === "running",
  canStop = runState === "running" || runState === "paused",
  accentClassName = "text-muted-foreground hover:bg-muted",
  className,
}: NodeTransportControlsProps) => {
  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {runState === "running" ? (
        <button
          type="button"
          aria-label="Pause node"
          title="Pause"
          disabled={!canPause}
          onClick={onPause}
          className={cn(
            "rounded p-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40",
            accentClassName,
          )}
        >
          <Pause className="size-3" />
        </button>
      ) : (
        <button
          type="button"
          aria-label="Play node"
          title={runState === "completed" ? "Re-run" : "Run"}
          disabled={!canPlay}
          onClick={onPlay}
          className={cn(
            "rounded p-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40",
            runState === "completed"
              ? "text-emerald-400 hover:bg-emerald-900/30"
              : accentClassName,
          )}
        >
          <Play className="size-3" />
        </button>
      )}
      <button
        type="button"
        aria-label="Stop node"
        title="Stop"
        disabled={!canStop}
        onClick={onStop}
        className={cn(
          "rounded p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive",
          "disabled:cursor-not-allowed disabled:opacity-40",
        )}
      >
        <Square className="size-3" />
      </button>
    </div>
  )
}
