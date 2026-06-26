import Link from "next/link"

import { cn } from "@/lib/utils"

const testLinks = [
  { href: "/test", label: "Overview", exact: true },
  { href: "/test/discover", label: "Discover" },
  { href: "/test/tavily", label: "Tavily" },
  { href: "/test/clickhouse", label: "ClickHouse" },
  { href: "/test/llm", label: "Gemini LLM" },
]

export function TestLabShell({
  title,
  description,
  children,
  currentPath,
}: {
  title: string
  description?: string
  children: React.ReactNode
  currentPath: string
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Internal test lab
            </p>
            <h1 className="mt-1 text-2xl font-semibold">{title}</h1>
            {description ? (
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          <nav aria-label="Sponsor tool tests" className="flex flex-wrap gap-2">
            {testLinks.map((link) => {
              const isActive = link.exact
                ? currentPath === link.href
                : currentPath.startsWith(link.href)

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:bg-muted"
                  )}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">{children}</main>
    </div>
  )
}
