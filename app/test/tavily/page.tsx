import { ReadmePanel } from "@/components/test/readme-panel"
import { TavilyTestPanel } from "@/components/test/tavily-test-panel"
import { TestLabShell } from "@/components/test/test-lab-shell"
import { readTestReadme } from "@/lib/test/read-readme"

export default async function TavilyTestPage() {
  const readme = await readTestReadme("app/test/tavily/README.md")

  return (
    <TestLabShell
      title="Tavily Test"
      description="Search the live web and inspect grounded results."
      currentPath="/test/tavily"
    >
      <ReadmePanel content={readme} />
      <TavilyTestPanel />
    </TestLabShell>
  )
}
