"use client"

import { PauseIcon, PlayIcon, SquareIcon } from "lucide-react"

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
  className?: string
}

const runStateLabel: Record<NodeRunState, string> = {
  idle: "Idle",
  running: "Running",
  paused: "Paused",
  completed: "Done",
  error: "Error",
  stopped: "Stopped",
}

export const NodeTransportControls = ({
  runState,
  onPlay,
  onPause,
  onStop,
  canPlay = true,
  canPause = runState === "running",
  canStop = runState === "running" || runState === "paused",
  className,
}: NodeTransportControlsProps) => {
  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <span className="sr-only">{runStateLabel[runState]}</span>
      <button
        type="button"
        aria-label="Play node"
        title="Play"
        disabled={!canPlay || runState === "running"}
        onClick={onPlay}
        className={cn(
          "inline-flex size-5 items-center justify-center rounded text-zinc-300 transition-colors",
          "hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40",
        )}
      >
        <PlayIcon className="size-3 fill-current" />
      </button>
      <button
        type="button"
        aria-label="Pause node"
        title="Pause"
        disabled={!canPause}
        onClick={onPause}
        className={cn(
          "inline-flex size-5 items-center justify-center rounded text-zinc-300 transition-colors",
          "hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40",
        )}
      >
        <PauseIcon className="size-3 fill-current" />
      </button>
      <button
        type="button"
        aria-label="Stop node"
        title="Stop"
        disabled={!canStop}
        onClick={onStop}
        className={cn(
          "inline-flex size-5 items-center justify-center rounded text-zinc-300 transition-colors",
          "hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40",
        )}
      >
        <SquareIcon className="size-3 fill-current" />
      </button>
    </div>
  )
}
