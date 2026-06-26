import { NextResponse } from "next/server"

import { askLLM } from "@/lib/integrations/llm"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : ""

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    const text = await askLLM(prompt)

    return NextResponse.json({
      ok: true,
      envConfigured: Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY),
      text,
      model: "gemini-2.5-flash",
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
