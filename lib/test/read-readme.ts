import fs from "fs/promises"
import path from "path"

export async function readTestReadme(relativePath: string): Promise<string> {
  const readmePath = path.join(process.cwd(), relativePath)
  return fs.readFile(readmePath, "utf-8")
}
