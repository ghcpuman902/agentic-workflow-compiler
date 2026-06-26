/**
 * Stage 1 per-URL inspection: quick-read + deep inspect, cached once.
 */
import { cacheGetOrSet, hashKey } from "@/lib/cache/fs-cache";
import { traceEvent } from "@/lib/trace/trace";
import type {
  PageInspection,
  PageRole,
  RawPage,
  RepeatedGroup,
  SampleField,
} from "@/lib/workflow/content-types";

import { deepInspect, quickRead } from "./agent-browser";
import { EXTRACTOR_JS } from "./extractor-js";

const SCHEMA_TYPE_NAMES: Record<string, string> = {
  Event: "event",
  Product: "product",
  Article: "article",
  NewsArticle: "article",
  BlogPosting: "article",
  Person: "person",
  Organization: "organization",
  JobPosting: "job",
  Recipe: "recipe",
  Review: "review",
  Offer: "offer",
  Place: "place",
  LocalBusiness: "business",
  Course: "course",
  Book: "book",
  Movie: "movie",
  VideoObject: "video",
};

function inferSemanticEntity(
  structuredTypes: string[],
  sampleFields: SampleField[]
): string {
  for (const t of structuredTypes) {
    const short = t
      .replace(/^https?:\/\/schema\.org\//, "")
      .replace(/^schema:/, "");
    if (SCHEMA_TYPE_NAMES[short]) return SCHEMA_TYPE_NAMES[short];
  }

  const names = sampleFields.map((f) => f.name.toLowerCase());
  if (names.some((n) => n.includes("date") || n.includes("event"))) return "event";
  if (names.some((n) => n.includes("price") || n.includes("product")))
    return "product";
  if (names.some((n) => n.includes("author") || n.includes("article")))
    return "article";
  if (names.some((n) => n.includes("job") || n.includes("salary"))) return "job";
  return "record";
}

function mapRepeatedGroups(
  rawGroups: unknown[],
  structuredTypes: string[]
): RepeatedGroup[] {
  return rawGroups
    .filter(
      (g): g is Record<string, unknown> =>
        !!g &&
        typeof g === "object" &&
        typeof (g as { count?: unknown }).count === "number"
    )
    .map((g) => {
      const sampleFields = Array.isArray(g.sampleFields)
        ? (g.sampleFields as SampleField[])
        : [];
      const entity = inferSemanticEntity(structuredTypes, sampleFields);
      const count = Number(g.count) || 0;
      const fieldScore = Math.min(sampleFields.length / 4, 1);
      const countScore = Math.min(count / 20, 1);
      return {
        candidateName: entity,
        count,
        confidence:
          Math.round((0.4 + fieldScore * 0.3 + countScore * 0.3) * 100) / 100,
        sampleFields,
      };
    })
    .filter((g) => g.count >= 2);
}

function inferPageRole(
  repeatedGroups: RepeatedGroup[],
  headingCount: number,
  textLength: number,
  linkCount: number
): PageRole {
  const maxRepeat = repeatedGroups.reduce((m, g) => Math.max(m, g.count), 0);

  if (maxRepeat >= 5 && linkCount >= maxRepeat) return "listing";
  if (maxRepeat >= 3 && textLength < 8000) return "listing";
  if (maxRepeat <= 2 && textLength > 1500 && headingCount >= 2) return "detail";
  if (textLength > 3000 && headingCount >= 3 && maxRepeat <= 1) return "document";
  if (maxRepeat >= 2 && textLength > 2000) return "mixed";
  return "unknown";
}

function parseEvalPayload(evalResult: unknown): Record<string, unknown> {
  if (typeof evalResult === "string") {
    try {
      return JSON.parse(evalResult) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (evalResult && typeof evalResult === "object") {
    return evalResult as Record<string, unknown>;
  }
  return {};
}

function markdownSignals(markdown: string): Record<string, unknown> {
  return {
    structuredDataTypes: [],
    repeatedGroups: [],
    headingCount: (markdown.match(/^#+\s/gm) || []).length,
    paragraphCount: (markdown.match(/\n\n/g) || []).length + 1,
    linkCount: (markdown.match(/\[.*?\]\(.*?\)/g) || []).length,
    imageCount: 0,
    textLength: markdown.replace(/\s+/g, " ").trim().length,
    title: markdown.split("\n")[0]?.replace(/^#+\s*/, ""),
    degraded: true,
  };
}

function buildInspectionFromSignals(
  url: string,
  markdown: string,
  outline: string | undefined,
  evalPayload: Record<string, unknown>,
  snapshot: string | undefined,
  html: string
): { inspection: PageInspection; raw: RawPage } {
  const structuredDataTypes = Array.isArray(evalPayload.structuredDataTypes)
    ? (evalPayload.structuredDataTypes as string[]).map((t) =>
        t.replace(/^https?:\/\/schema\.org\//, "")
      )
    : [];

  const rawGroups = Array.isArray(evalPayload.repeatedGroups)
    ? evalPayload.repeatedGroups
    : [];
  const repeatedGroups = mapRepeatedGroups(rawGroups, structuredDataTypes);

  const headingCount = Number(evalPayload.headingCount) || 0;
  const paragraphCount = Number(evalPayload.paragraphCount) || 0;
  const textLength =
    Number(evalPayload.textLength) ||
    markdown.replace(/\s+/g, " ").trim().length;
  const linkCount = Number(evalPayload.linkCount) || 0;

  const pageRole = inferPageRole(
    repeatedGroups,
    headingCount,
    textLength,
    linkCount
  );

  const inspection: PageInspection = {
    url,
    pageRole,
    structuredDataTypes,
    repeatedGroups,
    documentSignals: {
      title:
        typeof evalPayload.title === "string"
          ? evalPayload.title
          : undefined,
      headingCount,
      paragraphCount,
      textLength,
    },
    markdown,
    outline,
    snapshot,
    fetchedAt: new Date().toISOString(),
  };

  const raw: RawPage = {
    url,
    hash: hashKey(url),
    contentType: "text/html",
    body: html || markdown,
    fetchedAt: inspection.fetchedAt,
  };

  return { inspection, raw };
}

/** Inspect one URL (cache-aware). */
export async function inspectUrl(
  url: string,
  runId?: string
): Promise<PageInspection> {
  const cacheKey = url;

  const { value: cached, hit } = await cacheGetOrSet<PageInspection>(
    "inspect",
    cacheKey,
    async () => {
      if (runId) {
        await traceEvent({
          runId,
          stage: "stage1",
          phase: "discover",
          kind: "inspect-start",
          payload: { url },
        });
      }

      const read = await quickRead(url);
      const markdown = read.markdown ?? "";

      let evalPayload: Record<string, unknown> = {};
      let snapshot: string | undefined;
      let html = markdown;

      const deep = await deepInspect(url, EXTRACTOR_JS);
      if (!deep.unavailable) {
        evalPayload = parseEvalPayload(deep.evalResult);
        snapshot = deep.snapshot;
        html = snapshot || markdown;
      } else {
        evalPayload = markdownSignals(markdown);
      }

      const { inspection, raw } = buildInspectionFromSignals(
        url,
        markdown,
        read.outline,
        evalPayload,
        snapshot,
        html
      );

      if (!inspection.documentSignals.title && read.title) {
        inspection.documentSignals.title = read.title;
      }

      await cacheGetOrSet("raw", cacheKey, async () => raw);

      if (runId) {
        await traceEvent({
          runId,
          stage: "stage1",
          phase: "discover",
          kind: "inspect-complete",
          payload: {
            url,
            pageRole: inspection.pageRole,
            repeatedGroupCount: inspection.repeatedGroups.length,
            degraded: Boolean(evalPayload.degraded),
          },
        });
      }

      return inspection;
    }
  );

  if (hit && runId) {
    await traceEvent({
      runId,
      stage: "stage1",
      phase: "discover",
      kind: "cache-hit",
      payload: { url, namespace: "inspect" },
    });
  }

  return cached;
}
