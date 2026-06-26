"use client"

import { useState } from "react"

import { ApiResultPanel } from "@/components/test/api-result-panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function TavilyTestPanel() {
  const [query, setQuery] = useState("London AI hackathons next week")
  const [searchDepth, setSearchDepth] = useState<"basic" | "advanced">("basic")
  const [maxResults, setMaxResults] = useState(5)
  const [includeRawContent, setIncludeRawContent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<unknown>()

  const handleSearch = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/test/tavily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          searchDepth,
          maxResults,
          includeRawContent,
        }),
      })

      const payload = await response.json()
      if (!response.ok || payload.error) {
        throw new Error(payload.error || `Request failed (${response.status})`)
      }

      setData(payload)
    } catch (err) {
      setData(undefined)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-4 rounded-xl border bg-card p-4">
        <h2 className="font-medium">Run search</h2>

        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Query</span>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Tavily search query"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">Search depth</span>
            <select
              value={searchDepth}
              onChange={(event) =>
                setSearchDepth(event.target.value as "basic" | "advanced")
              }
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              aria-label="Tavily search depth"
            >
              <option value="basic">basic</option>
              <option value="advanced">advanced</option>
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">Max results</span>
            <Input
              type="number"
              min={1}
              max={10}
              value={maxResults}
              onChange={(event) =>
                setMaxResults(Number(event.target.value) || 5)
              }
              aria-label="Maximum Tavily results"
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeRawContent}
            onChange={(event) => setIncludeRawContent(event.target.checked)}
            className="size-4 rounded border-input"
          />
          Include raw content
        </label>

        <Button onClick={handleSearch} disabled={loading || !query.trim()}>
          Search with Tavily
        </Button>
      </section>

      <div className="space-y-4">
        <ApiResultPanel loading={loading} error={error} data={data} />

        {data &&
        typeof data === "object" &&
        data !== null &&
        "result" in data &&
        typeof data.result === "object" &&
        data.result !== null &&
        "results" in data.result &&
        Array.isArray(data.result.results) ? (
          <section className="space-y-3 rounded-xl border bg-card p-4">
            <h2 className="font-medium">Rendered results</h2>
            <ul className="space-y-3">
              {data.result.results.map(
                (
                  item: {
                    title: string
                    url: string
                    content: string
                    score: number
                  },
                  index: number
                ) => (
                  <li key={`${item.url}-${index}`} className="rounded-lg border p-3">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {item.title}
                    </a>
                    <p className="mt-1 text-xs text-muted-foreground">
                      score: {item.score.toFixed(3)}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {item.content}
                    </p>
                  </li>
                )
              )}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  )
}
