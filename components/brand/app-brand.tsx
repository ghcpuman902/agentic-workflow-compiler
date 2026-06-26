import { Cpu } from "lucide-react"

import { cn } from "@/lib/utils"

type AppBrandProps = {
  className?: string
  showTagline?: boolean
}

export const AppBrand = ({
  className,
  showTagline = true,
}: AppBrandProps) => {
  return (
    <div className={cn("flex min-w-0 items-center gap-1.5", className)}>
      <div className="flex size-5 shrink-0 items-center justify-center rounded bg-primary">
        <Cpu className="size-3 text-primary-foreground" aria-hidden />
      </div>
      <div
        className={cn(
          "min-w-0 leading-none transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-data-[collapsible=icon]:hidden",
        )}
      >
        <span className="block truncate font-mono text-sm font-semibold tracking-tight text-foreground">
          CompileFlow
        </span>
        {showTagline ? (
          <span className="block truncate text-[10px] text-muted-foreground">
            Agentic Workflow Compiler
          </span>
        ) : null}
      </div>
    </div>
  )
}
