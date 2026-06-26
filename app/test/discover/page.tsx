import { DiscoverTestPanel } from "@/components/test/discover-test-panel";
import { ReadmePanel } from "@/components/test/readme-panel";
import { TestLabShell } from "@/components/test/test-lab-shell";
import { readTestReadme } from "@/lib/test/read-readme";

export default async function DiscoverTestPage() {
  const readme = await readTestReadme("app/test/discover/README.md");

  return (
    <TestLabShell
      title="Discover → Build"
      description="Paste up to five URLs, run Stage 1 structural discovery, pick Document or Collection, and preview the compiled output."
      currentPath="/test/discover"
    >
      <ReadmePanel content={readme} />
      <DiscoverTestPanel />
    </TestLabShell>
  );
}
