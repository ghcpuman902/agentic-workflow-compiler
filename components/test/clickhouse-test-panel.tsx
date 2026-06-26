"use client"

import { useState } from "react"

import { ApiResultPanel } from "@/components/test/api-result-panel"
import { Button } from "@/components/ui/button"

const sampleQueries = [
  "SELECT 1 AS ok",
  "SHOW TABLES",
  "SELECT currentDatabase() AS db",
]

export function ClickHouseTestPanel() {
  const [sql, setSql] = useState(sampleQueries[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<unknown>()

  const runRequest = async (body: Record<string, unknown>) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/test/clickhouse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  const handlePing = () => runRequest({ action: "ping" })
  const handleQuery = () => runRequest({ action: "query", sql })

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-4 rounded-xl border bg-card p-4">
        <h2 className="font-medium">Connection & query</h2>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handlePing} disabled={loading} variant="secondary">
            Ping connection
          </Button>
        </div>

        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">
            Read-only SQL (SELECT, SHOW, DESCRIBE, EXPLAIN)
          </span>
          <textarea
            value={sql}
            onChange={(event) => setSql(event.target.value)}
            rows={6}
            aria-label="ClickHouse SQL query"
            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          {sampleQueries.map((sample) => (
            <Button
              key={sample}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSql(sample)}
            >
              Use sample
            </Button>
          ))}
        </div>

        <Button onClick={handleQuery} disabled={loading || !sql.trim()}>
          Run query
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
        "data" in data.result &&
        Array.isArray(data.result.data) ? (
          <section className="rounded-xl border bg-card p-4">
            <h2 className="font-medium">Table preview</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[320px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b">
                    {Object.keys(data.result.data[0] ?? {}).map((key) => (
                      <th key={key} className="px-2 py-2 font-medium">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.result.data.map(
                    (row: Record<string, unknown>, index: number) => (
                      <tr key={index} className="border-b last:border-0">
                        {Object.values(row).map((value, cellIndex) => (
                          <td
                            key={cellIndex}
                            className="px-2 py-2 text-muted-foreground"
                          >
                            {String(value)}
                          </td>
                        ))}
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  )
}
