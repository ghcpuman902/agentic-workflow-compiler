import { NextResponse } from "next/server";

import { discoverUrls } from "@/lib/discovery/discover";
import { quickDiscoverUrls } from "@/lib/discovery/quick-discover";
import { enableClickHouseTrace } from "@/lib/trace/clickhouse-sink";
import { summarizeTrace } from "@/lib/trace/trace";
import { resolvePipelineConfig } from "@/lib/workflow/pipeline-config";

enableClickHouseTrace();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const urls = Array.isArray(body.urls)
      ? body.urls.filter((u: unknown) => typeof u === "string")
      : [];
    const runId =
      typeof body.runId === "string" && body.runId.trim()
        ? body.runId.trim()
        : undefined;
    const mode = body.mode === "quick" ? "quick" : "full";
    const config = resolvePipelineConfig({
      confidenceThreshold:
        typeof body.confidenceThreshold === "number"
          ? body.confidenceThreshold
          : undefined,
      maxProbeUrls:
        typeof body.maxProbe === "number" ? body.maxProbe : undefined,
    });

    if (urls.length === 0) {
      return NextResponse.json(
        { error: "urls array is required (at least one public URL)" },
        { status: 400 },
      );
    }

    const result =
      mode === "quick"
        ? await quickDiscoverUrls(urls, { ...config, runId })
        : await discoverUrls(urls.slice(0, config.maxProbeUrls), runId);

    const traceSummary = await summarizeTrace(result.runId);

    return NextResponse.json({
      ok: true,
      mode,
      result,
      traceSummary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
