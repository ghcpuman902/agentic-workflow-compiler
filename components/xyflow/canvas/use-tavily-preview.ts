"use client"

import { useEffect, useState } from "react"

import type { PreviewContent } from "@/lib/flow/preview-content"
import {
  extractHttpUrls,
  tavilyDocumentsToPreview,
  tavilySearchToPreview,
} from "@/lib/flow/preview-content"

import type { PreviewMode } from "@/lib/flow/preview-modes"

type TavilyPreviewState = {
  content: PreviewContent | null
  error: string | null
  loading: boolean
}

export const useTavilyPreview = ({
  mode,
  rawText,
  enabled,
}: {
  mode: PreviewMode
  rawText: string
  enabled: boolean
}): TavilyPreviewState => {
  const [state, setState] = useState<TavilyPreviewState>({
    content: null,
    error: null,
    loading: false,
  })

  useEffect(() => {
    if (!enabled || (mode !== "tavily-extract" && mode !== "tavily-search")) {
      setState({ content: null, error: null, loading: false })
      return
    }

    const controller = new AbortController()

    const load = async () => {
      setState((current) => ({ ...current, loading: true, error: null }))

      try {
        if (mode === "tavily-extract") {
          const urls = extractHttpUrls(rawText)
          if (urls.length === 0) {
            throw new Error("Connect text with at least one http(s) URL.")
          }

          const response = await fetch("/api/preview/tavily", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "extract",
              urls,
              extractDepth: "basic",
              includeImages: true,
            }),
            signal: controller.signal,
          })

          const payload = (await response.json()) as {
            docs?: Array<{
              url: string
              title: string
              content: string
              favicon?: string
              images?: string[]
            }>
            error?: string
          }

          if (!response.ok) {
            throw new Error(payload.error ?? "Tavily extract failed")
          }

          setState({
            loading: false,
            error: null,
            content: tavilyDocumentsToPreview(payload.docs ?? []),
          })
          return
        }

        const lines = rawText.trim().split("\n").map((line) => line.trim()).filter(Boolean)
        const query =
          lines.find((line) => !/^https?:\/\//i.test(line)) ?? lines[0] ?? ""
        if (!query) {
          throw new Error(
            "Tavily search needs a text query line (not only URLs).",
          )
        }

        const response = await fetch("/api/preview/tavily", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "search",
            query,
            searchDepth: "basic",
            maxResults: 5,
          }),
          signal: controller.signal,
        })

        const payload = (await response.json()) as {
          result?: {
            results: Array<{
              title: string
              url: string
              content: string
              score: number
            }>
          }
          error?: string
        }

        if (!response.ok) {
          throw new Error(payload.error ?? "Tavily search failed")
        }

        setState({
          loading: false,
          error: null,
          content: tavilySearchToPreview(
            query,
            payload.result?.results ?? [],
          ),
        })
      } catch (error) {
        if (controller.signal.aborted) return
        setState({
          loading: false,
          content: null,
          error:
            error instanceof Error ? error.message : "Tavily preview failed",
        })
      }
    }

    void load()

    return () => controller.abort()
  }, [enabled, mode, rawText])

  return state
}
