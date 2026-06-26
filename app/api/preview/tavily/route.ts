import { NextResponse } from "next/server"

import {
  extractUrls,
  searchEventsWithTavily,
  type TavilyExtractOptions,
} from "@/lib/integrations/tavily"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: "extract" | "search"
      url?: string
      urls?: string[]
      query?: string
      extractDepth?: TavilyExtractOptions["extractDepth"]
      includeImages?: boolean
      searchDepth?: "basic" | "advanced"
      maxResults?: number
    }

    if (body.action === "extract") {
      const urls = (body.urls?.length ? body.urls : body.url ? [body.url] : [])
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 5)

      if (urls.length === 0) {
        return NextResponse.json(
          { error: "Provide at least one URL to extract" },
          { status: 400 },
        )
      }

      const docs = await extractUrls(urls, {
        extractDepth: body.extractDepth ?? "basic",
        format: "markdown",
        includeImages: body.includeImages ?? true,
        includeFavicon: true,
      })

      return NextResponse.json({ docs })
    }

    if (body.action === "search") {
      const query = body.query?.trim()
      if (!query) {
        return NextResponse.json(
          { error: "Provide a search query" },
          { status: 400 },
        )
      }

      const result = await searchEventsWithTavily(query, {
        searchDepth: body.searchDepth ?? "basic",
        maxResults: body.maxResults ?? 5,
        includeRawContent: true,
      })

      return NextResponse.json({ result })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Tavily preview failed",
      },
      { status: 500 },
    )
  }
}
