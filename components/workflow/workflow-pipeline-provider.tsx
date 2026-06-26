"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

import type { QuickDiscoveryResult } from "@/lib/discovery/quick-discover"
import { DEFAULT_CONFIDENCE_THRESHOLD } from "@/lib/workflow/pipeline-config"
import type {
  BuildResponse,
  DiscoverResponse,
  NodeRunState,
  PipelineNodeKind,
  PipelineState,
} from "@/lib/workflow/pipeline-types"
import type {
  BuildArtifact,
  CollectionFormat,
  DocFormat,
  Suggestion,
} from "@/lib/workflow/content-types"
import { parseUrlLines, SAMPLE_CANNES_URLS } from "@/lib/workflow/sample-urls"

type NodeControl = {
  runState: NodeRunState
  play: () => void
  pause: () => void
  stop: () => void
  canPlay: boolean
  canPause: boolean
  canStop: boolean
}

type WorkflowPipelineContextValue = PipelineState & {
  setUrlText: (text: string) => void
  setConfidenceThreshold: (value: number) => void
  setSelectedFamily: (family: "document" | "collection") => void
  setSelectedSuggestion: (suggestion: Suggestion | null) => void
  setDocFormat: (format: DocFormat) => void
  setCollectionFormat: (format: CollectionFormat) => void
  confirmOutput: () => void
  confirmBuild: () => void
  getNodeControl: (nodeId: string, kind: PipelineNodeKind) => NodeControl
}

const WorkflowPipelineContext =
  createContext<WorkflowPipelineContextValue | null>(null)

export const useWorkflowPipeline = () => {
  const ctx = useContext(WorkflowPipelineContext)
  if (!ctx) {
    throw new Error("useWorkflowPipeline must be used within WorkflowPipelineProvider")
  }
  return ctx
}

const INITIAL_NODE_STATES: Record<string, NodeRunState> = {
  "url-input": "idle",
  "quick-discover": "idle",
  "output-select": "idle",
  "confirm-build": "idle",
  "generate-test": "idle",
  "url-queue": "idle",
}

export const WorkflowPipelineProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const [urlText, setUrlTextState] = useState(SAMPLE_CANNES_URLS)
  const [discovery, setDiscovery] = useState<QuickDiscoveryResult | null>(null)
  const [probedUrls, setProbedUrls] = useState<string[]>([])
  const [pendingUrls, setPendingUrls] = useState<string[]>([])
  const [selectedFamily, setSelectedFamily] = useState<
    "document" | "collection"
  >("collection")
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<Suggestion | null>(null)
  const [docFormat, setDocFormat] = useState<DocFormat>("md")
  const [collectionFormat, setCollectionFormat] =
    useState<CollectionFormat>("jsonl")
  const [outputConfirmed, setOutputConfirmed] = useState(false)
  const [buildConfirmed, setBuildConfirmed] = useState(false)
  const [artifact, setArtifact] = useState<BuildArtifact | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confidenceThreshold, setConfidenceThreshold] = useState(
    DEFAULT_CONFIDENCE_THRESHOLD,
  )
  const [nodeStates, setNodeStates] =
    useState<Record<string, NodeRunState>>(INITIAL_NODE_STATES)

  const abortRef = useRef<AbortController | null>(null)
  const pausedRef = useRef(false)

  const allUrls = useMemo(() => parseUrlLines(urlText), [urlText])

  const setNodeState = useCallback((nodeId: string, state: NodeRunState) => {
    setNodeStates((current) => ({ ...current, [nodeId]: state }))
  }, [])

  const setUrlText = useCallback((text: string) => {
    setUrlTextState(text)
    setDiscovery(null)
    setProbedUrls([])
    setPendingUrls(parseUrlLines(text))
    setOutputConfirmed(false)
    setBuildConfirmed(false)
    setArtifact(null)
    setError(null)
    setNodeStates(INITIAL_NODE_STATES)
  }, [])

  const stopActive = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    pausedRef.current = false
  }, [])

  const runQuickDiscover = useCallback(async () => {
    if (allUrls.length === 0) {
      setError("Add at least one URL")
      setNodeState("quick-discover", "error")
      return
    }

    stopActive()
    const controller = new AbortController()
    abortRef.current = controller
    pausedRef.current = false

    setNodeState("quick-discover", "running")
    setError(null)
    setDiscovery(null)
    setOutputConfirmed(false)
    setBuildConfirmed(false)
    setArtifact(null)

    try {
      const response = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "quick",
          urls: allUrls,
          confidenceThreshold,
        }),
        signal: controller.signal,
      })

      if (pausedRef.current) {
        setNodeState("quick-discover", "paused")
        return
      }

      const payload = (await response.json()) as DiscoverResponse
      if (!response.ok || payload.error) {
        throw new Error(payload.error || `Discover failed (${response.status})`)
      }

      const result = payload.result ?? null
      setDiscovery(result)
      setProbedUrls(result?.probedUrls ?? [])
      setPendingUrls(result?.pendingUrls ?? [])

      const first =
        result?.suggestions.find((s) => s.family === selectedFamily) ??
        result?.suggestions[0] ??
        null
      setSelectedSuggestion(first)
      if (first?.family === "document" || first?.family === "collection") {
        setSelectedFamily(first.family)
      }

      setNodeState("quick-discover", "completed")
      setNodeState("output-select", "idle")
    } catch (err) {
      if (controller.signal.aborted) {
        setNodeState("quick-discover", pausedRef.current ? "paused" : "stopped")
        return
      }
      setError(err instanceof Error ? err.message : "Discover failed")
      setNodeState("quick-discover", "error")
    } finally {
      if (abortRef.current === controller) abortRef.current = null
    }
  }, [
    allUrls,
    confidenceThreshold,
    selectedFamily,
    setNodeState,
    stopActive,
  ])

  const runGenerateTest = useCallback(async () => {
    if (!discovery?.runId || !outputConfirmed || !buildConfirmed) {
      setError("Confirm output type and build before generating")
      setNodeState("generate-test", "error")
      return
    }

    stopActive()
    const controller = new AbortController()
    abortRef.current = controller
    pausedRef.current = false

    setNodeState("generate-test", "running")
    setError(null)

    try {
      const format =
        selectedFamily === "document" ? docFormat : collectionFormat

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
        signal: controller.signal,
      })

      if (pausedRef.current) {
        setNodeState("generate-test", "paused")
        return
      }

      const payload = (await response.json()) as BuildResponse
      if (!response.ok || payload.error) {
        throw new Error(payload.error || `Build failed (${response.status})`)
      }

      setArtifact(payload.artifact ?? null)
      setNodeState("generate-test", "completed")
      setNodeState("url-queue", "idle")
    } catch (err) {
      if (controller.signal.aborted) {
        setNodeState("generate-test", pausedRef.current ? "paused" : "stopped")
        return
      }
      setError(err instanceof Error ? err.message : "Build failed")
      setNodeState("generate-test", "error")
    } finally {
      if (abortRef.current === controller) abortRef.current = null
    }
  }, [
    buildConfirmed,
    collectionFormat,
    discovery,
    docFormat,
    outputConfirmed,
    selectedFamily,
    selectedSuggestion?.entity,
    setNodeState,
    stopActive,
  ])

  const runUrlQueue = useCallback(async () => {
    if (!discovery?.runId || pendingUrls.length === 0) {
      setNodeState("url-queue", pendingUrls.length === 0 ? "completed" : "idle")
      return
    }

    if (!outputConfirmed || !buildConfirmed || !artifact) {
      setError("Complete output selection, build confirmation, and generate & test first")
      setNodeState("url-queue", "error")
      return
    }

    stopActive()
    const controller = new AbortController()
    abortRef.current = controller
    pausedRef.current = false

    setNodeState("url-queue", "running")
    setError(null)

    try {
      const response = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "full",
          urls: pendingUrls,
          runId: discovery.runId,
        }),
        signal: controller.signal,
      })

      if (pausedRef.current) {
        setNodeState("url-queue", "paused")
        return
      }

      const payload = (await response.json()) as DiscoverResponse
      if (!response.ok || payload.error) {
        throw new Error(payload.error || `Queue discover failed (${response.status})`)
      }

      setPendingUrls([])
      setProbedUrls((current) => [
        ...current,
        ...(payload.result?.pages.map((p) => p.url) ?? []),
      ])
      setNodeState("url-queue", "completed")
    } catch (err) {
      if (controller.signal.aborted) {
        setNodeState("url-queue", pausedRef.current ? "paused" : "stopped")
        return
      }
      setError(err instanceof Error ? err.message : "Queue processing failed")
      setNodeState("url-queue", "error")
    } finally {
      if (abortRef.current === controller) abortRef.current = null
    }
  }, [
    artifact,
    buildConfirmed,
    discovery,
    outputConfirmed,
    pendingUrls,
    setNodeState,
    stopActive,
  ])

  const confirmOutput = useCallback(() => {
    if (!discovery) return
    setOutputConfirmed(true)
    setNodeState("output-select", "completed")
    setNodeState("confirm-build", "idle")
  }, [discovery, setNodeState])

  const confirmBuild = useCallback(() => {
    if (!outputConfirmed) return
    setBuildConfirmed(true)
    setNodeState("confirm-build", "completed")
    setNodeState("generate-test", "idle")
  }, [outputConfirmed, setNodeState])

  const playNode = useCallback(
    (nodeId: string, kind: PipelineNodeKind) => {
      switch (kind) {
        case "url-input":
          setNodeState(nodeId, "completed")
          setNodeState("quick-discover", "idle")
          break
        case "quick-discover":
          void runQuickDiscover()
          break
        case "output-select":
          if (discovery && selectedSuggestion) confirmOutput()
          break
        case "confirm-build":
          if (outputConfirmed) confirmBuild()
          break
        case "generate-test":
          void runGenerateTest()
          break
        case "url-queue":
          void runUrlQueue()
          break
      }
    },
    [
      confirmBuild,
      confirmOutput,
      discovery,
      outputConfirmed,
      runGenerateTest,
      runQuickDiscover,
      runUrlQueue,
      selectedSuggestion,
      setNodeState,
    ],
  )

  const pauseNode = useCallback(
    (nodeId: string) => {
      const state = nodeStates[nodeId]
      if (state !== "running") return
      pausedRef.current = true
      abortRef.current?.abort()
      setNodeState(nodeId, "paused")
    },
    [nodeStates, setNodeState],
  )

  const stopNode = useCallback(
    (nodeId: string) => {
      const state = nodeStates[nodeId]
      if (state !== "running" && state !== "paused") return
      pausedRef.current = false
      abortRef.current?.abort()
      setNodeState(nodeId, "stopped")
    },
    [nodeStates, setNodeState],
  )

  const getNodeControl = useCallback(
    (nodeId: string, kind: PipelineNodeKind): NodeControl => {
      const runState = nodeStates[nodeId] ?? "idle"

      const canPlay = (() => {
        switch (kind) {
          case "url-input":
            return allUrls.length > 0 && runState !== "running"
          case "quick-discover":
            return allUrls.length > 0 && runState !== "running"
          case "output-select":
            return Boolean(discovery && selectedSuggestion) && !outputConfirmed
          case "confirm-build":
            return outputConfirmed && !buildConfirmed
          case "generate-test":
            return (
              buildConfirmed &&
              outputConfirmed &&
              Boolean(discovery) &&
              runState !== "running"
            )
          case "url-queue":
            return (
              buildConfirmed &&
              Boolean(artifact) &&
              pendingUrls.length > 0 &&
              runState !== "running"
            )
          default:
            return false
        }
      })()

      return {
        runState,
        play: () => playNode(nodeId, kind),
        pause: () => pauseNode(nodeId),
        stop: () => stopNode(nodeId),
        canPlay,
        canPause: runState === "running",
        canStop: runState === "running" || runState === "paused",
      }
    },
    [
      allUrls.length,
      artifact,
      buildConfirmed,
      discovery,
      nodeStates,
      outputConfirmed,
      pauseNode,
      pendingUrls.length,
      playNode,
      selectedSuggestion,
      stopNode,
    ],
  )

  const value = useMemo<WorkflowPipelineContextValue>(
    () => ({
      urlText,
      allUrls,
      probedUrls,
      pendingUrls,
      discovery,
      selectedFamily,
      selectedSuggestion,
      docFormat,
      collectionFormat,
      outputConfirmed,
      buildConfirmed,
      artifact,
      error,
      confidenceThreshold,
      setUrlText,
      setConfidenceThreshold,
      setSelectedFamily,
      setSelectedSuggestion,
      setDocFormat,
      setCollectionFormat,
      confirmOutput,
      confirmBuild,
      getNodeControl,
    }),
    [
      allUrls,
      artifact,
      buildConfirmed,
      collectionFormat,
      confidenceThreshold,
      confirmBuild,
      confirmOutput,
      discovery,
      docFormat,
      error,
      getNodeControl,
      outputConfirmed,
      pendingUrls,
      probedUrls,
      selectedFamily,
      selectedSuggestion,
      setUrlText,
      urlText,
    ],
  )

  return (
    <WorkflowPipelineContext.Provider value={value}>
      {children}
    </WorkflowPipelineContext.Provider>
  )
}
