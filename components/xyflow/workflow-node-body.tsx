"use client"

import { memo, useEffect, useState } from "react"

import type { PipelineNodeKind } from "@/lib/workflow/pipeline-types"
import {
  COLLECTION_FORMATS,
  DISABLED_FAMILIES,
  DOC_FORMATS,
} from "@/lib/workflow/content-types"
import { FAMILY_LABELS } from "@/lib/workflow/pipeline-types"
import { useWorkflowPipeline } from "@/components/workflow/workflow-pipeline-provider"
import { cn } from "@/lib/utils"

type WorkflowNodeBodyProps = {
  nodeKind: PipelineNodeKind
}

const UrlInputBody = memo(function UrlInputBody() {
  const pipeline = useWorkflowPipeline()
  const [draft, setDraft] = useState(pipeline.urlText)

  useEffect(() => {
    setDraft(pipeline.urlText)
  }, [pipeline.urlText])

  const handleBlur = () => {
    if (draft !== pipeline.urlText) pipeline.setUrlText(draft)
  }

  return (
    <div className="space-y-2">
      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={handleBlur}
        rows={4}
        aria-label="URLs to compile, one per line"
        className="nodrag nowheel w-full resize-none rounded border border-zinc-700 bg-zinc-950 px-2 py-1 font-mono text-[10px] text-zinc-300 outline-none focus-visible:border-zinc-500"
        onPointerDown={(event) => event.stopPropagation()}
      />
      <p className="text-[10px] text-zinc-500">
        {draft.split("\n").filter(Boolean).length} URLs · quick probe uses 1 at a
        time (up to 5)
      </p>
    </div>
  )
})

const QuickDiscoverBody = memo(function QuickDiscoverBody() {
  const pipeline = useWorkflowPipeline()
  const [thresholdDraft, setThresholdDraft] = useState(
    String(pipeline.confidenceThreshold),
  )

  useEffect(() => {
    setThresholdDraft(String(pipeline.confidenceThreshold))
  }, [pipeline.confidenceThreshold])

  const handleThresholdBlur = () => {
    const value = Number(thresholdDraft)
    if (Number.isNaN(value)) {
      setThresholdDraft(String(pipeline.confidenceThreshold))
      return
    }
    pipeline.setConfidenceThreshold(value)
  }

  return (
    <div className="space-y-2 text-[10px] text-zinc-400">
      <label className="flex items-center justify-between gap-2">
        <span>Confidence threshold</span>
        <input
          type="number"
          min={0.1}
          max={1}
          step={0.05}
          value={thresholdDraft}
          onChange={(event) => setThresholdDraft(event.target.value)}
          onBlur={handleThresholdBlur}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur()
          }}
          className="nodrag nowheel w-16 rounded border border-zinc-700 bg-zinc-950 px-1 py-0.5 text-right text-zinc-200"
          onPointerDown={(event) => event.stopPropagation()}
        />
      </label>
      {pipeline.discovery ? (
        <>
          <p>
            Probed {pipeline.probedUrls.length} · pending{" "}
            {pipeline.pendingUrls.length}
          </p>
          <p>
            Top confidence{" "}
            {(pipeline.discovery.topConfidence * 100).toFixed(0)}%
            {pipeline.discovery.confidenceMet ? " · met" : " · below threshold"}
          </p>
        </>
      ) : (
        <p>
          Play to probe 1 URL (up to 5). Multiple pasted URLs → Collection; single
          URL → you choose Document or Collection.
        </p>
      )}
    </div>
  )
})

const OutputSelectBody = memo(function OutputSelectBody() {
  const pipeline = useWorkflowPipeline()

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {(["document", "collection"] as const).map((family) => (
          <button
            key={family}
            type="button"
            disabled={!pipeline.discovery || pipeline.outputConfirmed}
            onClick={() => pipeline.setSelectedFamily(family)}
            className={cn(
              "nodrag rounded border px-2 py-0.5 text-[10px] transition-colors",
              pipeline.selectedFamily === family
                ? "border-emerald-500 bg-emerald-950 text-emerald-200"
                : "border-zinc-700 text-zinc-400 hover:bg-zinc-800",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            {FAMILY_LABELS[family]}
          </button>
        ))}
      </div>
      <select
        value={
          pipeline.selectedFamily === "document"
            ? pipeline.docFormat
            : pipeline.collectionFormat
        }
        disabled={!pipeline.discovery || pipeline.outputConfirmed}
        onChange={(event) => {
          if (pipeline.selectedFamily === "document") {
            pipeline.setDocFormat(event.target.value as typeof pipeline.docFormat)
          } else {
            pipeline.setCollectionFormat(
              event.target.value as typeof pipeline.collectionFormat,
            )
          }
        }}
        className="nodrag nowheel h-7 w-full rounded border border-zinc-700 bg-zinc-950 px-2 text-[10px] text-zinc-300"
        aria-label="Output format"
      >
        {(pipeline.selectedFamily === "document"
          ? DOC_FORMATS
          : COLLECTION_FORMATS
        ).map((format) => (
          <option key={format} value={format}>
            {format}
          </option>
        ))}
      </select>
      {pipeline.discovery?.suggestions.length ? (
        <ul className="max-h-20 space-y-1 overflow-auto text-[10px] text-zinc-500">
          {pipeline.discovery.suggestions.map((suggestion, index) => (
            <li key={`${suggestion.family}-${index}`}>
              <button
                type="button"
                disabled={pipeline.outputConfirmed}
                onClick={() => pipeline.setSelectedSuggestion(suggestion)}
                className={cn(
                  "nodrag w-full rounded px-1 py-0.5 text-left hover:bg-zinc-800",
                  pipeline.selectedSuggestion === suggestion &&
                    "bg-zinc-800 text-zinc-200",
                )}
              >
                {suggestion.label.slice(0, 72)}
                … {(suggestion.confidence * 100).toFixed(0)}%
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {DISABLED_FAMILIES.map((family) => (
        <p key={family} className="text-[10px] text-zinc-600">
          {FAMILY_LABELS[family]} · coming soon
        </p>
      ))}
      <p className="text-[10px] text-zinc-500">
        {pipeline.outputConfirmed
          ? "Output type confirmed"
          : "Select type, then play to confirm"}
      </p>
    </div>
  )
})

const ConfirmBuildBody = memo(function ConfirmBuildBody() {
  const pipeline = useWorkflowPipeline()

  return (
    <div className="space-y-2 text-[10px] text-zinc-400">
      <p>
        {pipeline.outputConfirmed
          ? `Ready to generate & test a ${pipeline.selectedFamily} workflow.`
          : "Waiting for output type confirmation upstream."}
      </p>
      <p>
        {pipeline.buildConfirmed
          ? "Build confirmed — downstream nodes unlocked"
          : "Play to confirm workflow generation and testing"}
      </p>
    </div>
  )
})

const GenerateTestBody = memo(function GenerateTestBody() {
  const pipeline = useWorkflowPipeline()

  return (
    <div className="space-y-2 text-[10px] text-zinc-400">
      {pipeline.artifact ? (
        <>
          <p>
            {pipeline.artifact.family} · {pipeline.artifact.format}
          </p>
          <p>
            Tests {pipeline.artifact.testsPassed}/{pipeline.artifact.testsTotal}
            · repairs {pipeline.artifact.repairCount}
          </p>
        </>
      ) : (
        <p>Runs codegen + sandbox tests on probed URLs after build is confirmed.</p>
      )}
    </div>
  )
})

const UrlQueueBody = memo(function UrlQueueBody() {
  const pipeline = useWorkflowPipeline()

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-zinc-400">
        {pipeline.pendingUrls.length} URLs queued after human confirmation
      </p>
      <ul className="nowheel max-h-28 space-y-0.5 overflow-auto text-[10px] text-zinc-500">
        {pipeline.pendingUrls.map((url) => (
          <li key={url} className="truncate" title={url}>
            {url.replace("https://www.festival-cannes.com/en/f/", "")}
          </li>
        ))}
      </ul>
      {pipeline.pendingUrls.length === 0 ? (
        <p className="text-[10px] text-zinc-600">
          Run quick discover to populate the queue.
        </p>
      ) : null}
    </div>
  )
})

export const WorkflowNodeBody = memo(function WorkflowNodeBody({
  nodeKind,
}: WorkflowNodeBodyProps) {
  switch (nodeKind) {
    case "url-input":
      return <UrlInputBody />
    case "quick-discover":
      return <QuickDiscoverBody />
    case "output-select":
      return <OutputSelectBody />
    case "confirm-build":
      return <ConfirmBuildBody />
    case "generate-test":
      return <GenerateTestBody />
    case "url-queue":
      return <UrlQueueBody />
    default:
      return null
  }
})
