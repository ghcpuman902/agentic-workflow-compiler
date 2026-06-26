import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // The Cursor SDK is a Node-only package (ships native/asset files like
  // .LICENSE.txt) used only in server route handlers. Opt it out of bundling
  // so Turbopack uses native require instead of trying to bundle its assets.
  serverExternalPackages: ["@cursor/sdk"],
}

export default nextConfig
