"use client"

import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import type { ActivityStep } from "@/lib/flow/canvas-types"

type AgentActivityLogProps = {
  steps: ActivityStep[]
  className?: string
}

const StepIcon = ({ status }: { status: ActivityStep["status"] }) => {
  switch (status) {
    case "running":
      return (
        <Loader2
          className="size-3 shrink-0 animate-spin text-violet-600 dark:text-violet-400"
          aria-hidden
        />
      )
    case "complete":
      return (
        <CheckCircle2
          className="size-3 shrink-0 text-emerald-600 dark:text-emerald-400"
          aria-hidden
        />
      )
    case "error":
      return (
        <XCircle className="size-3 shrink-0 text-destructive" aria-hidden />
      )
    default:
      return (
        <Circle className="size-3 shrink-0 text-muted-foreground/50" aria-hidden />
      )
  }
}

export const AgentActivityLog = ({ steps, className }: AgentActivityLogProps) => {
  const runningStep = steps.find((step) => step.status === "running")

  return (
    <div className={cn("space-y-2", className)}>
      {runningStep?.detail ? (
        <div className="rounded border border-violet-200 bg-violet-50 px-2 py-1.5 dark:border-violet-900/40 dark:bg-violet-950/20">
          <p className="font-mono text-[10px] leading-relaxed text-violet-900 dark:text-violet-200/90">
            {runningStep.detail}
          </p>
        </div>
      ) : null}

      <div
        className="max-h-36 space-y-1 overflow-y-auto nowheel"
        role="log"
        aria-live="polite"
        aria-label="Discovery agent activity"
      >
        {steps.map((step) => (
          <div
            key={step.id}
            className={cn(
              "flex items-start gap-2 rounded px-1 py-0.5 transition-colors",
              step.status === "running" && "bg-violet-50 dark:bg-violet-950/30",
            )}
          >
            <StepIcon status={step.status} />
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "font-mono text-[10px]",
                  step.status === "complete"
                    ? "text-muted-foreground"
                    : step.status === "running"
                      ? "text-violet-900 dark:text-violet-200"
                      : step.status === "error"
                        ? "text-destructive"
                        : "text-muted-foreground/80",
                )}
              >
                {step.label}
              </p>
              {step.detail && step.status !== "running" ? (
                <p className="truncate font-mono text-[9px] text-muted-foreground">
                  {step.detail}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
