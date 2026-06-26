import { NextResponse } from "next/server"

import { searchEventsWithTavily } from "@/lib/integrations/tavily"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const query = typeof body.query === "string" ? body.query.trim() : ""

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 })
    }

    const result = await searchEventsWithTavily(query, {
      searchDepth: body.searchDepth === "advanced" ? "advanced" : "basic",
      maxResults:
        typeof body.maxResults === "number"
          ? Math.min(Math.max(body.maxResults, 1), 10)
          : 5,
      includeRawContent: Boolean(body.includeRawContent),
    })

    return NextResponse.json({
      ok: true,
      envConfigured: Boolean(process.env.TAVILY_API_KEY),
      result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
