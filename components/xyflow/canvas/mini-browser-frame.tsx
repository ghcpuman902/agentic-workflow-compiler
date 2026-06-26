"use client"

import { memo, useMemo, useState } from "react"
import { ExternalLink, RefreshCw } from "lucide-react"

import { flowNodeDivider, flowNodeIconButton } from "@/lib/flow/node-chrome"
import { cn } from "@/lib/utils"

const toBrowseProxyUrl = (url: string) =>
  `/api/preview/browse?url=${encodeURIComponent(url)}`

export const MiniBrowserFrame = memo(function MiniBrowserFrame({
  url,
  title,
}: {
  url: string
  title?: string
}) {
  const [reloadKey, setReloadKey] = useState(0)
  const proxySrc = useMemo(() => toBrowseProxyUrl(url), [url, reloadKey])

  const handleRefresh = () => {
    setReloadKey((current) => current + 1)
  }

  return (
    <div className="flex h-full min-h-[140px] flex-col">
      <div
        className={cn(
          "flex shrink-0 items-center gap-1 border-b px-2 py-1",
          flowNodeDivider,
        )}
      >
        <span
          className="min-w-0 flex-1 truncate font-mono text-[9px] text-muted-foreground"
          title={url}
        >
          {url.replace(/^https?:\/\//, "")}
        </span>
        <button
          type="button"
          onClick={handleRefresh}
          className={flowNodeIconButton}
          aria-label="Refresh mini browser"
        >
          <RefreshCw className="size-3" />
        </button>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className={flowNodeIconButton}
          aria-label="Open in new tab"
        >
          <ExternalLink className="size-3" />
        </a>
      </div>
      <iframe
        key={proxySrc}
        title={title ?? `Mini browser: ${url}`}
        src={proxySrc}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        className="min-h-0 flex-1 border-0 bg-background"
        referrerPolicy="no-referrer"
      />
    </div>
  )
})
