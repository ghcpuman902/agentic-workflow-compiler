/**
 * Output Publisher
 * Handles the final step of the workflow: publishing cited.md
 */
import fs from "fs/promises";
import path from "path";

export interface EventRecord {
  title: string;
  url: string;
  date: string;
  location: string;
  registrationStatus: string;
}

export async function publishCitedMd(
  events: EventRecord[],
  outputPath: string = "output/cited.md"
): Promise<string> {
  const fullPath = path.resolve(process.cwd(), outputPath);
  const dir = path.dirname(fullPath);

  // Ensure output directory exists
  await fs.mkdir(dir, { recursive: true });

  const content = [
    "# Verified London AI Events",
    `*Generated on ${new Date().toISOString()}*\n`,
    "## Shortlist",
  ];

  for (const event of events) {
    content.push(
      `### [${event.title}](${event.url})`,
      `- **Date:** ${event.date}`,
      `- **Location:** ${event.location}`,
      `- **Registration Status:** ${event.registrationStatus}\n`
    );
  }

  const finalContent = content.join("\n");
  await fs.writeFile(fullPath, finalContent, "utf-8");

  return fullPath;
}
