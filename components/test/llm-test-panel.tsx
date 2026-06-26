"use client"

import { useState } from "react"

import { ApiResultPanel } from "@/components/test/api-result-panel"
import { Button } from "@/components/ui/button"

const samplePrompts = [
  "Say hello in exactly 3 words.",
  "List 3 fields needed to normalise an event record.",
  "Return a one-sentence workflow plan for finding London AI events.",
]

export function LlmTestPanel() {
  const [prompt, setPrompt] = useState(samplePrompts[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<unknown>()

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/test/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
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
        <h2 className="font-medium">Prompt</h2>

        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">
            Message to Gemini
          </span>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={8}
            aria-label="LLM prompt"
            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          {samplePrompts.map((sample) => (
            <Button
              key={sample}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPrompt(sample)}
            >
              Use sample
            </Button>
          ))}
        </div>

        <Button onClick={handleSubmit} disabled={loading || !prompt.trim()}>
          Send to Gemini
        </Button>
      </section>

      <div className="space-y-4">
        <ApiResultPanel loading={loading} error={error} data={data} />

        {data &&
        typeof data === "object" &&
        data !== null &&
        "text" in data &&
        typeof data.text === "string" ? (
          <section className="rounded-xl border bg-card p-4">
            <h2 className="font-medium">Model output</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm">{data.text}</p>
          </section>
        ) : null}
      </div>
    </div>
  )
}
