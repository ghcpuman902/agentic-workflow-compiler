/**
 * Stage 2 Document path: Tavily Extract + deterministic cleaning.
 */
import { promises as fs } from "fs";
import path from "path";

import { extractUrls } from "@/lib/integrations/tavily";
import { traceEvent } from "@/lib/trace/trace";
import type { BuildArtifact, DocFormat, PageInspection } from "@/lib/workflow/content-types";

const OUTPUT_DIR = path.resolve(process.cwd(), "output");

const NAV_PATTERNS = [
  /^(\s*[-*]\s+\[.*?\]\(.*?\)\s*)+$/gm,
  /^(Home|About|Contact|Privacy|Terms|Cookie)\s*$/gim,
  /^(Skip to content|Menu|Search)\s*$/gim,
];

function stripRepeatedNav(content: string): string {
  let out = content;
  for (const pattern of NAV_PATTERNS) {
    out = out.replace(pattern, "");
  }
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

function normalizeHeadings(content: string): string {
  return content.replace(/^(#{1,6})\s+/gm, (match) => match);
}

export type DocumentBuildInput = {
  runId: string;
  format: DocFormat;
  inspections: PageInspection[];
};

function buildMarkdownPage(doc: {
  url: string;
  title: string;
  content: string;
  index: number;
}): string {
  const cleaned = normalizeHeadings(stripRepeatedNav(doc.content));
  return [
    `---`,
    `source: ${doc.url}`,
    `title: "${doc.title.replace(/"/g, '\\"')}"`,
    `extractedAt: ${new Date().toISOString()}`,
    `---`,
    ``,
    `# ${doc.title}`,
    ``,
    cleaned,
  ].join("\n");
}

function mergeDocuments(
  pages: Array<{ url: string; title: string; content: string }>,
  format: DocFormat
): { text: string; preview: string; records: unknown[] } {
  if (format === "json") {
    const records = pages.map((p) => ({
      title: p.title,
      sourceUrl: p.url,
      content: stripRepeatedNav(p.content),
      extractedAt: new Date().toISOString(),
    }));
    const text = JSON.stringify(records, null, 2);
    return { text, preview: text.slice(0, 4000), records };
  }

  const sections = pages.map((p, i) =>
    buildMarkdownPage({ ...p, index: i })
  );
  const text = sections.join("\n\n---\n\n");
  return { text, preview: text.slice(0, 4000), records: pages };
}

async function persistOutput(
  runId: string,
  format: DocFormat,
  text: string
): Promise<string> {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const ext = format === "json" ? "json" : "md";
  const filePath = path.join(OUTPUT_DIR, `${runId}.${ext}`);
  await fs.writeFile(filePath, text, "utf-8");
  return filePath;
}

/** Build a Document artefact via Tavily Extract + cleaning. */
export async function buildDocument(
  input: DocumentBuildInput
): Promise<BuildArtifact> {
  const { runId, format, inspections } = input;
  const urls = inspections.map((p) => p.url);

  await traceEvent({
    runId,
    stage: "stage2",
    phase: "build",
    kind: "build-start",
    payload: { family: "document", format, urlCount: urls.length },
  });

  await traceEvent({
    runId,
    stage: "stage2",
    phase: "build",
    kind: "tavily-extract",
    payload: { urls },
  });

  const extracted = await extractUrls(urls, {
    extractDepth: "basic",
    format: "markdown",
    includeFavicon: true,
  });

  const pages = extracted.map((doc) => ({
    url: doc.url,
    title: doc.title,
    content: doc.content,
  }));

  for (const url of urls) {
    await traceEvent({
      runId,
      stage: "stage2",
      phase: "run",
      kind: "document-merge",
      payload: { url },
    });
  }

  const { text, preview, records } = mergeDocuments(pages, format);
  const outputPath = await persistOutput(runId, format, text);

  await traceEvent({
    runId,
    stage: "stage2",
    phase: "run",
    kind: "build-complete",
    payload: { family: "document", pageCount: pages.length },
  });

  return {
    family: "document",
    format,
    outputPath,
    preview,
    records,
    buildModelCalls: 0,
    runModelCalls: 0,
    repairCount: 0,
    testsPassed: pages.length,
    testsTotal: urls.length,
  };
}
