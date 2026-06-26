import { NextResponse } from "next/server"

const isHttpUrl = (value: string) => /^https?:\/\/.+/i.test(value)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const target = searchParams.get("url")?.trim()

  if (!target || !isHttpUrl(target)) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 })
  }

  try {
    const response = await fetch(target, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; CompileFlowPreview/1.0; +https://compileflow.local)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
      next: { revalidate: 0 },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${response.status}` },
        { status: 502 },
      )
    }

    const contentType = response.headers.get("content-type") ?? "text/plain"
    const body = await response.text()

    if (contentType.includes("text/html")) {
      const baseTag = `<base href="${target}" target="_blank" />`
      const meta = `<meta charset="utf-8" /><meta name="referrer" content="no-referrer" />`
      const html = body.includes("<head")
        ? body.replace(/<head([^>]*)>/i, `<head$1>${meta}${baseTag}`)
        : `<!doctype html><html><head>${meta}${baseTag}</head><body>${body}</body></html>`

      return new NextResponse(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "private, max-age=120",
        },
      })
    }

    return NextResponse.redirect(target)
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load preview URL",
      },
      { status: 502 },
    )
  }
}
