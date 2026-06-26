"use client";

import { useMemo, useState } from "react";

import { ApiResultPanel } from "@/components/test/api-result-panel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { QuickDiscoveryResult } from "@/lib/discovery/quick-discover";
import {
  DEFAULT_CONFIDENCE_THRESHOLD,
  MAX_PROBE_URLS,
} from "@/lib/workflow/pipeline-config";
import type {
  BuildArtifact,
  CollectionFormat,
  DocFormat,
  OutputFamily,
  Suggestion,
} from "@/lib/workflow/content-types";
import type { TraceSummary } from "@/lib/trace/trace";
import {
  COLLECTION_FORMATS,
  DISABLED_FAMILIES,
  DOC_FORMATS,
} from "@/lib/workflow/content-types";
import { FAMILY_LABELS } from "@/lib/workflow/pipeline-types";
import { parseUrlLines, SAMPLE_CANNES_URLS } from "@/lib/workflow/sample-urls";

type DiscoverResponse = {
  ok: boolean;
  mode?: "quick" | "full";
  result?: QuickDiscoveryResult;
  traceSummary?: TraceSummary;
  error?: string;
};

type BuildResponse = {
  ok: boolean;
  artifact?: BuildArtifact;
  traceSummary?: TraceSummary;
  error?: string;
};

export function DiscoverTestPanel() {
  const [urlText, setUrlText] = useState(SAMPLE_CANNES_URLS);
  const [confidenceThreshold, setConfidenceThreshold] = useState(
    DEFAULT_CONFIDENCE_THRESHOLD,
  );
  const [discovery, setDiscovery] = useState<QuickDiscoveryResult | null>(null);
  const [selectedFamily, setSelectedFamily] = useState<"document" | "collection">(
    "collection",
  );
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(
    null,
  );
  const [docFormat, setDocFormat] = useState<DocFormat>("md");
  const [collectionFormat, setCollectionFormat] =
    useState<CollectionFormat>("jsonl");
  const [outputConfirmed, setOutputConfirmed] = useState(false);
  const [buildConfirmed, setBuildConfirmed] = useState(false);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [buildLoading, setBuildLoading] = useState(false);
  const [queueLoading, setQueueLoading] = useState(false);
  const [inspectError, setInspectError] = useState<string | null>(null);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [inspectData, setInspectData] = useState<unknown>();
  const [buildData, setBuildData] = useState<unknown>();
  const [queueData, setQueueData] = useState<unknown>();
  const [artifact, setArtifact] = useState<BuildArtifact | null>(null);
  const [pendingUrls, setPendingUrls] = useState<string[]>([]);
  const [traceSummary, setTraceSummary] = useState<TraceSummary | null>(null);

  const allUrls = useMemo(() => parseUrlLines(urlText), [urlText]);

  const activeSuggestions = useMemo(
    () =>
      discovery?.suggestions.filter((s) => s.family === selectedFamily) ?? [],
    [discovery, selectedFamily],
  );

  const handleQuickDiscover = async () => {
    setInspectLoading(true);
    setInspectError(null);
    setBuildError(null);
    setQueueError(null);
    setArtifact(null);
    setBuildData(undefined);
    setQueueData(undefined);
    setOutputConfirmed(false);
    setBuildConfirmed(false);

    try {
      const response = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "quick",
          urls: allUrls,
          confidenceThreshold,
        }),
      });
      const payload = (await response.json()) as DiscoverResponse;
      if (!response.ok || payload.error) {
        throw new Error(payload.error || `Request failed (${response.status})`);
      }

      setInspectData(payload);
      setDiscovery(payload.result ?? null);
      setPendingUrls(payload.result?.pendingUrls ?? []);
      setTraceSummary(payload.traceSummary ?? null);

      const first =
        payload.result?.suggestions.find((s) => s.family === selectedFamily) ??
        payload.result?.suggestions[0] ??
        null;
      setSelectedSuggestion(first);
      if (first?.family === "document" || first?.family === "collection") {
        setSelectedFamily(first.family);
      }
    } catch (err) {
      setInspectData(undefined);
      setDiscovery(null);
      setPendingUrls([]);
      setInspectError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setInspectLoading(false);
    }
  };

  const handleBuild = async () => {
    if (!discovery?.runId || !outputConfirmed || !buildConfirmed) return;

    setBuildLoading(true);
    setBuildError(null);

    try {
      const format =
        selectedFamily === "document" ? docFormat : collectionFormat;

      const response = await fetch("/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId: discovery.runId,
          family: selectedFamily,
          format,
          entity: selectedSuggestion?.entity,
          discovery,
        }),
      });

      const payload = (await response.json()) as BuildResponse;
      if (!response.ok || payload.error) {
        throw new Error(payload.error || `Request failed (${response.status})`);
      }

      setBuildData(payload);
      setArtifact(payload.artifact ?? null);
      setTraceSummary(payload.traceSummary ?? null);
    } catch (err) {
      setBuildData(undefined);
      setArtifact(null);
      setBuildError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBuildLoading(false);
    }
  };

  const handleProcessQueue = async () => {
    if (!discovery?.runId || pendingUrls.length === 0 || !artifact) return;

    setQueueLoading(true);
    setQueueError(null);

    try {
      const response = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "full",
          urls: pendingUrls,
          runId: discovery.runId,
        }),
      });

      const payload = (await response.json()) as DiscoverResponse;
      if (!response.ok || payload.error) {
        throw new Error(payload.error || `Request failed (${response.status})`);
      }

      setQueueData(payload);
      setPendingUrls([]);
      setTraceSummary(payload.traceSummary ?? null);
    } catch (err) {
      setQueueData(undefined);
      setQueueError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setQueueLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-xl border bg-card p-4">
          <h2 className="font-medium">Paste URLs</h2>
          <textarea
            value={urlText}
            onChange={(e) => setUrlText(e.target.value)}
            rows={12}
            aria-label="URLs to inspect, one per line"
            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            placeholder="https://example.com/events&#10;https://example.com/events?page=2"
          />
          <label className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">
              Quick discover confidence threshold
            </span>
            <input
              type="number"
              min={0.1}
              max={1}
              step={0.05}
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
              className="h-8 w-20 rounded-lg border border-input bg-transparent px-2 text-right font-mono text-sm"
              aria-label="Confidence threshold for quick discover"
            />
          </label>
          <p className="text-xs text-muted-foreground">
            {allUrls.length} URLs total · quick discover probes 1 URL at a time
            (up to {MAX_PROBE_URLS}) until confidence ≥{" "}
            {(confidenceThreshold * 100).toFixed(0)}%
          </p>
          <Button
            onClick={handleQuickDiscover}
            disabled={inspectLoading || allUrls.length === 0}
          >
            Quick discover
          </Button>
        </section>

        <ApiResultPanel
          title="Discover API response"
          loading={inspectLoading}
          error={inspectError}
          data={inspectData}
        />
      </div>

      {discovery ? (
        <>
          <section className="space-y-4 rounded-xl border bg-card p-4">
            <h2 className="font-medium">Quick discover summary</h2>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Probed</dt>
                <dd>{discovery.probedUrls.length} URL(s)</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Pending queue</dt>
                <dd>{pendingUrls.length} URL(s)</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Top confidence</dt>
                <dd>{(discovery.topConfidence * 100).toFixed(0)}%</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Threshold met</dt>
                <dd>{discovery.confidenceMet ? "Yes" : "No (used max probes)"}</dd>
              </div>
            </dl>
            {pendingUrls.length > 0 ? (
              <ul className="max-h-40 space-y-1 overflow-auto text-xs text-muted-foreground">
                {pendingUrls.map((url) => (
                  <li key={url} className="truncate font-mono" title={url}>
                    {url}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="space-y-4 rounded-xl border bg-card p-4">
            <h2 className="font-medium">Detected page roles</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {discovery.roleGroups.map((g) => (
                <div key={g.role} className="rounded-lg border p-3">
                  <p className="text-sm font-medium capitalize">{g.role}</p>
                  <p className="text-2xl font-semibold">{g.urls.length}</p>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {g.urls.map((u) => (
                      <li key={u} className="truncate" title={u}>
                        {u}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4 rounded-xl border bg-card p-4">
            <h2 className="font-medium">Suggestions</h2>
            <ul className="space-y-3">
              {discovery.suggestions.map((s, i) => (
                <li
                  key={`${s.family}-${i}`}
                  className={cn(
                    "rounded-lg border p-3",
                    selectedSuggestion === s && "border-primary bg-primary/5",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium uppercase">
                      {s.family}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      confidence {(s.confidence * 100).toFixed(0)}%
                    </span>
                    {s.estimatedRecords ? (
                      <span className="text-xs text-muted-foreground">
                        ~{s.estimatedRecords} records
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm">{s.label}</p>
                  {s.fields?.length ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Fields:{" "}
                      {s.fields
                        .map((f) => `${f.name} (${Math.round(f.coverage * 100)}%)`)
                        .join(", ")}
                    </p>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    disabled={outputConfirmed}
                    onClick={() => {
                      setSelectedSuggestion(s);
                      if (s.family === "document" || s.family === "collection") {
                        setSelectedFamily(s.family);
                      }
                    }}
                  >
                    Select
                  </Button>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-4 rounded-xl border bg-card p-4">
            <h2 className="font-medium">1. Choose output type</h2>
            <div className="flex flex-wrap gap-2">
              {(["document", "collection"] as const).map((family) => (
                <button
                  key={family}
                  type="button"
                  disabled={outputConfirmed}
                  onClick={() => setSelectedFamily(family)}
                  className={cn(
                    "rounded-lg border px-4 py-2 text-sm transition-colors",
                    selectedFamily === family
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-muted",
                    outputConfirmed && "opacity-60",
                  )}
                >
                  {FAMILY_LABELS[family]}
                </button>
              ))}
              {DISABLED_FAMILIES.map((family) => (
                <span
                  key={family}
                  title="Coming soon"
                  className="cursor-not-allowed rounded-lg border border-dashed px-4 py-2 text-sm text-muted-foreground opacity-60"
                >
                  {FAMILY_LABELS[family as OutputFamily]} · Coming soon
                </span>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {selectedFamily === "document" ? (
                <label className="block space-y-2">
                  <span className="text-sm text-muted-foreground">Format</span>
                  <select
                    value={docFormat}
                    disabled={outputConfirmed}
                    onChange={(e) => setDocFormat(e.target.value as DocFormat)}
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    aria-label="Document format"
                  >
                    {DOC_FORMATS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="block space-y-2">
                  <span className="text-sm text-muted-foreground">Format</span>
                  <select
                    value={collectionFormat}
                    disabled={outputConfirmed}
                    onChange={(e) =>
                      setCollectionFormat(e.target.value as CollectionFormat)
                    }
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    aria-label="Collection format"
                  >
                    {COLLECTION_FORMATS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {activeSuggestions.length > 0 ? (
              <p className="text-sm text-muted-foreground">
                Selected: {selectedSuggestion?.label ?? activeSuggestions[0].label}
              </p>
            ) : null}

            <Button
              variant="outline"
              disabled={outputConfirmed || !selectedSuggestion}
              onClick={() => setOutputConfirmed(true)}
            >
              {outputConfirmed ? "Output type confirmed" : "Confirm output type"}
            </Button>
          </section>

          <section className="space-y-4 rounded-xl border bg-card p-4">
            <h2 className="font-medium">2. Confirm workflow generate & test</h2>
            <p className="text-sm text-muted-foreground">
              Unlocks codegen and sandbox testing on the probed URLs. The remaining{" "}
              {pendingUrls.length} URL(s) stay queued until after build succeeds.
            </p>
            <Button
              variant="outline"
              disabled={!outputConfirmed || buildConfirmed}
              onClick={() => setBuildConfirmed(true)}
            >
              {buildConfirmed ? "Build confirmed" : "Confirm build & test"}
            </Button>
          </section>

          <section className="space-y-4 rounded-xl border bg-card p-4">
            <h2 className="font-medium">Generate & test</h2>
            <Button
              onClick={handleBuild}
              disabled={buildLoading || !buildConfirmed || !outputConfirmed}
            >
              Build workflow
            </Button>
          </section>
        </>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <ApiResultPanel
          title="Build API response"
          loading={buildLoading}
          error={buildError}
          data={buildData}
        />

        {traceSummary ? (
          <section className="rounded-xl border bg-card p-4 text-sm">
            <h2 className="font-medium">Trace summary</h2>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-muted-foreground">
              <dt>Total events</dt>
              <dd className="font-mono text-foreground">{traceSummary.total}</dd>
              <dt>Build model calls</dt>
              <dd className="font-mono text-foreground">
                {traceSummary.buildModelCalls}
              </dd>
              <dt>Run model calls</dt>
              <dd className="font-mono text-foreground">
                {traceSummary.runModelCalls}
              </dd>
              <dt>Cache hits</dt>
              <dd className="font-mono text-foreground">
                {traceSummary.cacheHits}
              </dd>
              <dt>Discover phase</dt>
              <dd className="font-mono text-foreground">
                {traceSummary.byPhase.discover}
              </dd>
              <dt>Build phase</dt>
              <dd className="font-mono text-foreground">
                {traceSummary.byPhase.build}
              </dd>
              <dt>Run phase</dt>
              <dd className="font-mono text-foreground">
                {traceSummary.byPhase.run}
              </dd>
            </dl>
          </section>
        ) : null}
      </div>

      {artifact && pendingUrls.length > 0 ? (
        <section className="space-y-4 rounded-xl border bg-card p-4">
          <h2 className="font-medium">URL queue ({pendingUrls.length} remaining)</h2>
          <p className="text-sm text-muted-foreground">
            Process the remaining URLs after workflow generation and testing succeed.
          </p>
          <Button
            onClick={handleProcessQueue}
            disabled={queueLoading || !buildConfirmed}
          >
            Process queued URLs
          </Button>
          <ApiResultPanel
            title="Queue discover response"
            loading={queueLoading}
            error={queueError}
            data={queueData}
          />
        </section>
      ) : null}

      {artifact ? (
        <section className="space-y-4 rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-medium">Output preview</h2>
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs">
              {artifact.family} · {artifact.format}
            </span>
            <span className="text-xs text-muted-foreground">
              build calls: {artifact.buildModelCalls} · run calls:{" "}
              {artifact.runModelCalls} · repairs: {artifact.repairCount}
            </span>
          </div>
          <pre className="max-h-[480px] overflow-auto rounded-lg bg-muted p-3 font-mono text-xs">
            {artifact.preview}
          </pre>
          {artifact.tool?.source ? (
            <>
              <h3 className="text-sm font-medium">Generated extractor (TS)</h3>
              <pre className="max-h-[360px] overflow-auto rounded-lg bg-muted p-3 font-mono text-xs">
                {artifact.tool.source}
              </pre>
            </>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
