"use client"

import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useSidebar } from "@/components/ui/sidebar"
import { sponsors } from "@/components/sponsors/sponsors"

type SponsorStripProps = {
  variant?: "compact" | "sidebar"
  className?: string
}

export const SponsorStrip = ({
  variant = "compact",
  className,
}: SponsorStripProps) => {
  const { state } = useSidebar()
  const isCompact = variant === "compact"
  const logoSize = isCompact ? "h-4" : "h-3.5"

  if (!isCompact && state === "collapsed") {
    return null
  }

  return (
    <div
      className={cn(
        "flex items-center",
        isCompact
          ? "min-w-0 gap-3"
          : "flex-wrap justify-center gap-2.5 pt-2",
        className,
      )}
    >
      {isCompact ? (
        <span className="hidden shrink-0 text-[10px] text-zinc-500 sm:inline">
          Built with
        </span>
      ) : null}

      <ul
        className={cn(
          "flex items-center",
          isCompact ? "min-w-0 gap-3" : "gap-2.5",
        )}
        aria-label="Sponsors"
      >
        {sponsors.map((sponsor) => (
          <li key={sponsor.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  role="img"
                  aria-label={`${sponsor.name} — ${sponsor.description}`}
                  tabIndex={0}
                  className={cn(
                    "inline-flex cursor-default opacity-70 transition-opacity outline-none hover:opacity-100 focus-visible:opacity-100",
                    sponsor.id === "cursor" && "text-zinc-300",
                  )}
                >
                  <sponsor.Logo className={logoSize} />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-60">
                <span className="font-medium">{sponsor.name}</span>
                <span className="text-background/80">
                  {" "}
                  — {sponsor.description}
                </span>
              </TooltipContent>
            </Tooltip>
          </li>
        ))}
      </ul>
    </div>
  )
}
