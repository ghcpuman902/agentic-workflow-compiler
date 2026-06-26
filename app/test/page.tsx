import Link from "next/link"

import { ReadmePanel } from "@/components/test/readme-panel"
import { TestLabShell } from "@/components/test/test-lab-shell"
import { readTestReadme } from "@/lib/test/read-readme"

const tools = [
  {
    href: "/test/discover",
    name: "Discover → Build",
    summary:
      "Two-stage pipeline: paste URLs, inspect structure, build Document or Collection.",
    env: "GOOGLE_GENERATIVE_AI_API_KEY, TAVILY_API_KEY",
  },
  {
    href: "/test/tavily",
    name: "Tavily",
    summary: "Live web search and grounded source retrieval.",
    env: "TAVILY_API_KEY",
  },
  {
    href: "/test/clickhouse",
    name: "ClickHouse",
    summary: "Workflow traces, metrics, and read-only SQL queries.",
    env: "CLICKHOUSE_KEYID, CLICKHOUSE_KEYSECRET",
  },
  {
    href: "/test/llm",
    name: "Gemini LLM",
    summary: "Orchestration and node-generation prompts.",
    env: "GOOGLE_GENERATIVE_AI_API_KEY",
  },
]

export default async function TestIndexPage() {
  const readme = await readTestReadme("app/test/README.md")

  return (
    <TestLabShell
      title="Sponsor Tool Test Lab"
      description="Direct URLs only — not linked from the landing page. Use these pages to verify credentials and explore each integration."
      currentPath="/test"
    >
      <ReadmePanel content={readme} />

      <section className="grid gap-4 md:grid-cols-3">
        {tools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="rounded-xl border bg-card p-4 transition-colors hover:bg-muted/40"
          >
            <h2 className="font-medium">{tool.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{tool.summary}</p>
            <p className="mt-4 font-mono text-xs text-muted-foreground">
              {tool.env}
            </p>
          </Link>
        ))}
      </section>
    </TestLabShell>
  )
}
