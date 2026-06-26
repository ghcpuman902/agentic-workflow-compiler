import { ClickHouseTestPanel } from "@/components/test/clickhouse-test-panel"
import { ReadmePanel } from "@/components/test/readme-panel"
import { TestLabShell } from "@/components/test/test-lab-shell"
import { readTestReadme } from "@/lib/test/read-readme"

export default async function ClickHouseTestPage() {
  const readme = await readTestReadme("app/test/clickhouse/README.md")

  return (
    <TestLabShell
      title="ClickHouse Test"
      description="Ping the connection and run read-only SQL against the managed endpoint."
      currentPath="/test/clickhouse"
    >
      <ReadmePanel content={readme} />
      <ClickHouseTestPanel />
    </TestLabShell>
  )
}
