"use client"

import { cn } from "@/lib/utils"

type ApiResultPanelProps = {
  title?: string
  loading?: boolean
  error?: string | null
  data?: unknown
  className?: string
}

export function ApiResultPanel({
  title = "Response",
  loading,
  error,
  data,
  className,
}: ApiResultPanelProps) {
  return (
    <section
      className={cn(
        "rounded-xl border bg-card text-sm text-card-foreground",
        className
      )}
      aria-live="polite"
    >
      <div className="border-b px-4 py-2 font-medium">{title}</div>
      <div className="p-4">
        {loading ? (
          <p className="text-muted-foreground">Running request…</p>
        ) : null}

        {!loading && error ? (
          <pre className="overflow-x-auto rounded-lg bg-destructive/10 p-3 font-mono text-xs text-destructive">
            {error}
          </pre>
        ) : null}

        {!loading && !error && data !== undefined ? (
          <pre className="max-h-[480px] overflow-auto rounded-lg bg-muted p-3 font-mono text-xs">
            {JSON.stringify(data, null, 2)}
          </pre>
        ) : null}

        {!loading && !error && data === undefined ? (
          <p className="text-muted-foreground">
            Run a test to see the API response here.
          </p>
        ) : null}
      </div>
    </section>
  )
}
