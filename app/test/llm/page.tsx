import { LlmTestPanel } from "@/components/test/llm-test-panel"
import { ReadmePanel } from "@/components/test/readme-panel"
import { TestLabShell } from "@/components/test/test-lab-shell"
import { readTestReadme } from "@/lib/test/read-readme"

export default async function LlmTestPage() {
  const readme = await readTestReadme("app/test/llm/README.md")

  return (
    <TestLabShell
      title="Gemini LLM Test"
      description="Send orchestration prompts and inspect model output."
      currentPath="/test/llm"
    >
      <ReadmePanel content={readme} />
      <LlmTestPanel />
    </TestLabShell>
  )
}
