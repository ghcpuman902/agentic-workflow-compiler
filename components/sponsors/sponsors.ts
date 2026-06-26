import type { ComponentType } from "react"

import { ClickHouseLogo } from "@/components/sponsors/logos/clickhouse-logo"
import { CursorLogo } from "@/components/sponsors/logos/cursor-logo"
import { GeminiLogo } from "@/components/sponsors/logos/gemini-logo"
import { TavilyLogo } from "@/components/sponsors/logos/tavily-logo"

type SponsorLogoProps = {
  className?: string
}

export type Sponsor = {
  id: string
  name: string
  description: string
  Logo: ComponentType<SponsorLogoProps>
}

export const sponsors: Sponsor[] = [
  {
    id: "gemini",
    name: "Google Gemini",
    description: "Agent tasks and AI workflow discovery",
    Logo: GeminiLogo,
  },
  {
    id: "tavily",
    name: "Tavily",
    description: "Web page to Markdown",
    Logo: TavilyLogo,
  },
  {
    id: "clickhouse",
    name: "ClickHouse",
    description: "Telemetry, chat history, data retention",
    Logo: ClickHouseLogo,
  },
  {
    id: "cursor",
    name: "Cursor",
    description: "Coding",
    Logo: CursorLogo,
  },
]
