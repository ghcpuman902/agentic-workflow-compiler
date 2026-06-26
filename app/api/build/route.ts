import { NextResponse } from "next/server";

import { buildCollection } from "@/lib/build/collection";
import { buildDocument } from "@/lib/build/document";
import { cacheGet } from "@/lib/cache/fs-cache";
import { enableClickHouseTrace } from "@/lib/trace/clickhouse-sink";
import { summarizeTrace } from "@/lib/trace/trace";
import type { DiscoveryResult } from "@/lib/workflow/content-types";
import {
  ACTIVE_FAMILIES,
  COLLECTION_FORMATS,
  DOC_FORMATS,
  type CollectionFormat,
  type DocFormat,
  type OutputFamily,
} from "@/lib/workflow/content-types";

enableClickHouseTrace();

function isDocFormat(v: unknown): v is DocFormat {
  return typeof v === "string" && (DOC_FORMATS as string[]).includes(v);
}

function isCollectionFormat(v: unknown): v is CollectionFormat {
  return typeof v === "string" && (COLLECTION_FORMATS as string[]).includes(v);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const runId = typeof body.runId === "string" ? body.runId.trim() : "";
    const family = body.family as OutputFamily;
    const entity =
      typeof body.entity === "string" ? body.entity.trim() : undefined;

    if (!runId) {
      return NextResponse.json({ error: "runId is required" }, { status: 400 });
    }

    if (!ACTIVE_FAMILIES.includes(family)) {
      return NextResponse.json(
        { error: `family must be one of: ${ACTIVE_FAMILIES.join(", ")}` },
        { status: 400 }
      );
    }

    const discoveryKey = `discovery:${runId}`;
    const cached = await cacheGet<DiscoveryResult>("output", discoveryKey);

    const inlineDiscovery =
      body.discovery && typeof body.discovery === "object"
        ? (body.discovery as DiscoveryResult)
        : null;

    const discovery = inlineDiscovery ?? cached;

    if (!discovery?.pages?.length) {
      return NextResponse.json(
        {
          error:
            "Discovery result not found. Run POST /api/discover first or pass discovery in the body.",
        },
        { status: 400 }
      );
    }

    let artifact;

    if (family === "document") {
      const format = isDocFormat(body.format) ? body.format : "md";
      artifact = await buildDocument({
        runId,
        format,
        inspections: discovery.pages,
      });
    } else {
      const format = isCollectionFormat(body.format) ? body.format : "jsonl";
      artifact = await buildCollection({
        runId,
        discovery,
        entity,
        format,
      });
    }

    const traceSummary = await summarizeTrace(runId);

    return NextResponse.json({
      ok: true,
      artifact,
      traceSummary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
