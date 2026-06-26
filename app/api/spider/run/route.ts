import { NextResponse } from "next/server";

import { buildDocument } from "@/lib/build/document";
import { runSpiderAcrossUrls } from "@/lib/build/run-spider";
import { quickRead } from "@/lib/discovery/agent-browser";
import { inspectUrl } from "@/lib/discovery/inspect";
import { enableClickHouseTrace } from "@/lib/trace/clickhouse-sink";
import { summarizeTrace } from "@/lib/trace/trace";
import type { DocFormat, PageInspection } from "@/lib/workflow/content-types";

enableClickHouseTrace();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const runId = typeof body.runId === "string" ? body.runId.trim() : "";
    const family = body.family === "document" ? "document" : "collection";
    const urls: string[] = Array.isArray(body.urls)
      ? body.urls.filter((u: unknown) => typeof u === "string" && u.trim())
      : [];
    const maxInputUrls =
      typeof body.maxInputUrls === "number" && body.maxInputUrls > 0
        ? Math.floor(body.maxInputUrls)
        : 25;

    if (!runId) {
      return NextResponse.json({ error: "runId is required" }, { status: 400 });
    }
    if (urls.length === 0) {
      return NextResponse.json(
        { error: "At least one URL is required" },
        { status: 400 },
      );
    }

    const capped = urls.slice(0, maxInputUrls);

    if (family === "document") {
      const format: DocFormat = body.format === "json" ? "json" : "md";
      const inspections: PageInspection[] = [];
      for (const url of capped) {
        try {
          await Promise.allSettled([quickRead(url)]);
          inspections.push(await inspectUrl(url, runId));
        } catch {
          // skip unreachable pages
        }
      }
      const artifact = await buildDocument({ runId, format, inspections });
      const traceSummary = await summarizeTrace(runId);
      return NextResponse.json({
        ok: true,
        result: {
          preview: artifact.preview,
          recordCount: artifact.records?.length ?? 0,
          urlsRun: inspections.length,
        },
        traceSummary,
      });
    }

    const result = await runSpiderAcrossUrls({ runId, urls: capped, maxInputUrls });
    const traceSummary = await summarizeTrace(runId);

    return NextResponse.json({
      ok: true,
      result: {
        preview: result.preview,
        recordCount: result.records.length,
        urlsRun: result.urlsRun,
        records: result.records,
      },
      traceSummary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
