import { DiscoverTestPanel } from "@/components/test/discover-test-panel";
import { ReadmePanel } from "@/components/test/readme-panel";
import { TestLabShell } from "@/components/test/test-lab-shell";
import { readTestReadme } from "@/lib/test/read-readme";

export default async function DiscoverTestPage() {
  const readme = await readTestReadme("app/test/discover/README.md");

  return (
    <TestLabShell
      title="Discover → Build"
      description="Paste URLs (one per line), run fast quick discover, pick output type, build & test, then run slow workflow discovery on the queue — all without leaving this page."
      currentPath="/test/discover"
    >
      <ReadmePanel content={readme} />
      <DiscoverTestPanel />
    </TestLabShell>
  );
}
