"use client"

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useTheme } from "next-themes"
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  reconnectEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type FinalConnectionState,
  type Node,
  type OnConnectStartParams,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import { AddNodeMenu } from "@/components/xyflow/canvas/add-node-menu"
import {
  CompileFlowProvider,
  type CompileFlowActions,
} from "@/components/xyflow/canvas/compile-flow-context"
import { makeDiscoverFactoryData } from "@/components/xyflow/canvas/discover-factory-node"
import { canvasNodeTypes } from "@/components/xyflow/canvas/node-types"
import { CompileFlowToolbar } from "@/components/workflow/compile-flow-toolbar"
import type { QuickDiscoveryResult } from "@/lib/discovery/quick-discover"
import {
  FACTORY_EXPANDED_HEIGHT,
  NODE_DEFAULT_SIZE,
  type DiscoverFactoryData,
  type FlowNodeData,
  type FlowNodeKind,
  type SpiderNodeData,
  type UrlNodeData,
  type LlmNodeData,
} from "@/lib/flow/canvas-types"
import {
  buildDiscoverSteps,
  completeAllSteps,
  finishBuildStep,
  setRunningStep,
} from "@/lib/flow/discover-activity"
import {
  findEdgeToTargetHandle,
  getConnectableTargetKinds,
  isAllowedConnection,
} from "@/lib/flow/connection-rules"
import { resolveDiscoverySelection } from "@/lib/workflow/discovery-intent"
import { resolveOutput } from "@/lib/workflow/content-types"
import type { DiscoverResponse } from "@/lib/workflow/pipeline-types"
import { parseUrlLines, SAMPLE_CANNES_URLS } from "@/lib/workflow/sample-urls"
import { useCanvasViewportPersistence } from "@/hooks/use-canvas-viewport-persistence"

const DEFAULT_MAX_INPUT_URLS = 25

let nodeCounter = 0
const makeId = (prefix: string) => `${prefix}-${++nodeCounter}`

const edgeStyle = { stroke: "var(--flow-edge-stroke)", strokeWidth: 1.5 }
const markerEnd = {
  type: MarkerType.ArrowClosed,
  color: "var(--flow-edge-stroke)",
  width: 12,
  height: 12,
}

const makeTextNode = (
  position: { x: number; y: number },
  content = "",
): Node => {
  const { width, height } = NODE_DEFAULT_SIZE.url
  return {
    id: makeId("text"),
    type: "url",
    position,
    data: { kind: "url", url: content } satisfies UrlNodeData,
    style: { width, height },
  }
}

const makeFlowNode = (
  kind: FlowNodeKind,
  position: { x: number; y: number },
): Node => {
  const { width, height } = NODE_DEFAULT_SIZE[kind]
  const id = makeId(kind === "discover-factory" ? "discover" : kind)

  switch (kind) {
    case "url":
      return makeTextNode(position)
    case "discover-factory":
      return {
        id,
        type: "discover-factory",
        position,
        data: makeDiscoverFactoryData(),
        style: { width, height },
      }
    case "preview":
      return {
        id,
        type: "preview",
        position,
        data: { kind: "preview", itemIndex: 0, mode: "auto" },
        style: { width, height },
      }
    case "llm":
      return {
        id,
        type: "llm",
        position,
        data: { 
          kind: "llm", 
          prompt: "", 
          modelType: "gemini", 
          reasoningLevel: "none", 
          outputMethod: "text" 
        } satisfies LlmNodeData,
        style: { width, height },
      }
    default:
      return makeTextNode(position)
  }
}

const getNodeSize = (node: Node) => ({
  width: Number(node.style?.width ?? node.measured?.width ?? 240),
  height: Number(node.style?.height ?? node.measured?.height ?? 160),
})

const CompileFlowCanvasInner = () => {
  const { resolvedTheme } = useTheme()
  const isDarkCanvas = resolvedTheme === "dark"
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([
    makeTextNode({ x: 120, y: 160 }, SAMPLE_CANNES_URLS),
  ])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const { fitView, getNodes, getNode, screenToFlowPosition } = useReactFlow()
  const {
    defaultViewport,
    handleViewportChange,
  } = useCanvasViewportPersistence()
  const edgeReconnectSuccessful = useRef(true)
  const isPointerOverCanvas = useRef(false)
  const pointerScreenRef = useRef<{ x: number; y: number } | null>(null)

  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  nodesRef.current = nodes
  edgesRef.current = edges

  const [addMenu, setAddMenu] = useState<{
    x: number
    y: number
    flowPos: { x: number; y: number }
    pendingConnection?: {
      source: string
      sourceHandle: string | null
    }
    allowedKinds?: FlowNodeKind[]
  } | null>(null)
  const canvasAreaRef = useRef<HTMLDivElement>(null)

  const updateNodeData = useCallback(
    (nodeId: string, updater: (data: FlowNodeData) => FlowNodeData) => {
      startTransition(() => {
        setNodes((current) =>
          current.map((node) =>
            node.id === nodeId
              ? { ...node, data: updater(node.data as FlowNodeData) }
              : node,
          ),
        )
      })
    },
    [setNodes],
  )

  const getUpstreamUrls = useCallback((targetId: string) => {
    const incoming = edgesRef.current.filter(
      (edge) => edge.target === targetId && edge.targetHandle === "in",
    )
    const urls: string[] = []
    for (const edge of incoming) {
      const source = nodesRef.current.find((node) => node.id === edge.source)
      if (source?.type === "url") {
        urls.push(...parseUrlLines((source.data as UrlNodeData).url))
      }
    }
    return urls
  }, [])

  const getPreviewSourceId = useCallback((previewId: string) => {
    const edge = edgesRef.current.find(
      (item) =>
        item.target === previewId && item.targetHandle === "in",
    )
    return edge?.source ?? null
  }, [])

  const getNodeData = useCallback((nodeId: string) => {
    const node = nodesRef.current.find((item) => item.id === nodeId)
    return (node?.data as FlowNodeData) ?? null
  }, [])

  const getNodeType = useCallback((nodeId: string) => {
    const node = nodesRef.current.find((item) => item.id === nodeId)
    return node?.type ?? null
  }, [])

  /**
   * Apply a patch to a spider wherever it currently lives: embedded inside its
   * factory (pre-extraction) and/or materialized as a standalone node.
   */
  const patchSpider = useCallback(
    (
      factoryId: string,
      spiderId: string,
      updater: (spider: SpiderNodeData) => Partial<SpiderNodeData>,
    ) => {
      startTransition(() => {
        setNodes((current) =>
          current.map((node) => {
            if (node.id === spiderId && node.type === "spider") {
              const data = node.data as SpiderNodeData
              return { ...node, data: { ...data, ...updater(data) } }
            }
            if (node.id === factoryId && node.type === "discover-factory") {
              const data = node.data as DiscoverFactoryData
              if (!data.embeddedSpider) return node
              const spider = data.embeddedSpider as SpiderNodeData
              return {
                ...node,
                data: {
                  ...data,
                  embeddedSpider: { ...spider, ...updater(spider) },
                },
              }
            }
            return node
          }),
        )
      })
    },
    [setNodes],
  )

  const buildSpider = useCallback(
    async (factoryId: string, spiderId: string, spider: SpiderNodeData) => {
      const discovery = spider.discovery
      if (!discovery) return

      const { family, format } = resolveOutput(
        spider.itemType,
        spider.cardinality,
        spider.suggestion?.family
      )

      patchSpider(factoryId, spiderId, () => ({
        buildStatus: "building",
        buildError: undefined,
      }))

      try {
        const response = await fetch("/api/build", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            runId: discovery.runId,
            family,
            format,
            entity: spider.entity,
            discovery,
            extraContext: spider.extraContext,
          }),
        })
        const payload = await response.json()
        if (!response.ok || payload.error || !payload.artifact) {
          throw new Error(payload.error || `Build failed (${response.status})`)
        }

        const artifact = payload.artifact as {
          family: "document" | "collection"
          format: string
          preview: string
          records?: unknown[]
          testsPassed: number
          testsTotal: number
          repairCount: number
          buildModelCalls: number
          agent?: "cursor" | "gemini"
        }

        patchSpider(factoryId, spiderId, () => ({
          buildStatus: "approved",
          build: {
            family: artifact.family,
            format: artifact.format,
            preview: artifact.preview,
            recordCount: artifact.records?.length ?? 0,
            testsPassed: artifact.testsPassed,
            testsTotal: artifact.testsTotal,
            repairCount: artifact.repairCount,
            buildModelCalls: artifact.buildModelCalls,
            agent: artifact.agent ?? "gemini",
            records: artifact.records ?? [],
          },
        }))

        updateNodeData(factoryId, (data) => {
          const d = data as DiscoverFactoryData
          if (d.phase !== "building") return d
          return {
            ...d,
            phase: "done",
            activitySteps: finishBuildStep(d.activitySteps, {
              status: "complete",
              detail: `${artifact.testsPassed}/${artifact.testsTotal} golden tests passed`,
            }),
          }
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : "Build failed"
        patchSpider(factoryId, spiderId, () => ({
          buildStatus: "failed",
          buildError: message,
        }))

        updateNodeData(factoryId, (data) => {
          const d = data as DiscoverFactoryData
          if (d.phase !== "building") return d
          return {
            ...d,
            phase: "done",
            activitySteps: finishBuildStep(d.activitySteps, {
              status: "error",
              detail: message,
            }),
          }
        })
      }
    },
    [patchSpider, updateNodeData],
  )

  const runSpider = useCallback(
    async (spiderId: string) => {
      const node = nodesRef.current.find((item) => item.id === spiderId)
      if (!node || node.type !== "spider") return
      const spider = node.data as SpiderNodeData
      if (spider.buildStatus !== "approved" || !spider.runId) return

      const urls = getUpstreamUrls(spiderId)
      if (urls.length === 0) {
        patchSpider(spider.factoryId, spiderId, () => ({
          runState: "error",
          runError: "Connect a text node with URLs to the spider input",
        }))
        return
      }

      const { family, format } = resolveOutput(
        spider.itemType,
        spider.cardinality,
        spider.suggestion?.family
      )

      patchSpider(spider.factoryId, spiderId, () => ({
        runState: "running",
        runError: undefined,
      }))

      try {
        const response = await fetch("/api/spider/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            runId: spider.runId,
            family,
            format,
            entity: spider.entity,
            urls,
            maxInputUrls: spider.maxInputUrls,
          }),
        })
        const payload = await response.json()
        if (!response.ok || payload.error || !payload.result) {
          throw new Error(payload.error || `Run failed (${response.status})`)
        }

        patchSpider(spider.factoryId, spiderId, () => ({
          runState: "done",
          run: {
            preview: payload.result.preview,
            recordCount: payload.result.recordCount,
            urlsRun: payload.result.urlsRun,
            records: payload.result.records ?? [],
          },
        }))
      } catch (error) {
        patchSpider(spider.factoryId, spiderId, () => ({
          runState: "error",
          runError: error instanceof Error ? error.message : "Run failed",
        }))
      }
    },
    [getUpstreamUrls, patchSpider],
  )

  const embedSpiderInFactory = useCallback(
    (
      factoryId: string,
      discovery: QuickDiscoveryResult,
      urlSourceId: string | null,
    ) => {
      const spiderId = makeId("spider")
      const selection = resolveDiscoverySelection(
        discovery.totalInputUrls,
        discovery.suggestions,
      )
      const suggestion = selection.suggestion ?? discovery.suggestions[0]
      const factory = nodesRef.current.find((node) => node.id === factoryId)
      const extraContext = (factory?.data as DiscoverFactoryData | undefined)
        ?.extraContext

      const spiderPayload: SpiderNodeData = {
        kind: "spider",
        label: suggestion?.label.slice(0, 48) ?? "Spider",
        itemType: selection.itemType,
        cardinality: selection.cardinality,
        maxInputUrls: Math.min(
          DEFAULT_MAX_INPUT_URLS,
          Math.max(1, discovery.totalInputUrls),
        ),
        extraContext: extraContext?.trim() ? extraContext.trim() : undefined,
        confidence: suggestion?.confidence ?? discovery.topConfidence,
        entity: suggestion?.entity,
        suggestion,
        discovery,
        runId: discovery.runId,
        buildStatus: "unbuilt",
        runState: "idle",
        detached: false,
        factoryId,
      }

      setNodes((current) =>
        current.map((node) => {
          if (node.id !== factoryId) return node
          const data = node.data as DiscoverFactoryData
          return {
            ...node,
            style: {
              ...node.style,
              width: NODE_DEFAULT_SIZE["discover-factory"].width,
              height: FACTORY_EXPANDED_HEIGHT,
            },
            data: {
              ...data,
              phase: "building",
              spiderNodeId: spiderId,
              embeddedSpider: spiderPayload,
              discovery,
            },
          }
        }),
      )

      // Store url source on factory for edge when materialized — keep in discovery meta
      void urlSourceId
      return { spiderId, spider: spiderPayload }
    },
    [setNodes],
  )

  const materializeSpider = useCallback(
    (factoryId: string, screenPosition: { x: number; y: number }) => {
      const factory = nodesRef.current.find((node) => node.id === factoryId)
      if (!factory) return

      const factoryData = factory.data as DiscoverFactoryData
      if (!factoryData.embeddedSpider || !factoryData.spiderNodeId) return

      const spiderId = factoryData.spiderNodeId
      const flowPosition = screenToFlowPosition(screenPosition)

      const spiderNode: Node = {
        id: spiderId,
        type: "spider",
        position: flowPosition,
        draggable: true,
        data: {
          kind: "spider",
          ...factoryData.embeddedSpider,
          detached: true,
          factoryId,
        } satisfies SpiderNodeData,
        style: { width: 260, height: 180, zIndex: 1000 },
      }

      setNodes((current) => {
        const already = current.some((node) => node.id === spiderId)
        const cleared = current.map((node) => {
          if (node.id !== factoryId) return node
          const data = node.data as DiscoverFactoryData
          return {
            ...node,
            data: { ...data, embeddedSpider: null },
          }
        })
        return already ? cleared : [...cleared, spiderNode]
      })

      const urlEdge = edgesRef.current.find(
        (edge) => edge.target === factoryId && edge.targetHandle === "in",
      )
      const urlSourceId = urlEdge?.source ?? null

      if (urlSourceId) {
        setEdges((current) => {
          const exists = current.some(
            (edge) =>
              edge.source === urlSourceId &&
              edge.target === spiderId &&
              edge.targetHandle === "in",
          )
          if (exists) return current
          return addEdge(
            {
              id: `e-spider-${Date.now()}`,
              source: urlSourceId,
              sourceHandle: "out",
              target: spiderId,
              targetHandle: "in",
              animated: true,
              style: edgeStyle,
              markerEnd,
              reconnectable: true,
            },
            current,
          )
        })
      }
    },
    [screenToFlowPosition, setEdges, setNodes],
  )

  const runDiscoverFactory = useCallback(
    async (factoryId: string) => {
      const urls = getUpstreamUrls(factoryId)
      if (urls.length === 0) {
        updateNodeData(factoryId, (data) => {
          const d = data as DiscoverFactoryData
          return {
            ...d,
            phase: "error",
            error: "Connect a text node to the discover input first",
          }
        })
        return
      }

      const factoryNode = nodesRef.current.find((node) => node.id === factoryId)
      const factoryData = factoryNode?.data as DiscoverFactoryData | undefined
      const threshold = factoryData?.confidenceThreshold ?? 0.55
      const maxProbe = factoryData?.maxDiscoverPages ?? 5
      const extraContext = factoryData?.extraContext ?? ""

      const urlEdge = edgesRef.current.find(
        (edge) => edge.target === factoryId && edge.targetHandle === "in",
      )
      const urlSourceId = urlEdge?.source ?? null

      const initialSteps = buildDiscoverSteps(urls.length)
      initialSteps[0] = { ...initialSteps[0], status: "running" }

      updateNodeData(factoryId, (data) => {
        const d = data as DiscoverFactoryData
        return {
          ...d,
          phase: "running",
          settingsLocked: true,
          activitySteps: initialSteps,
          error: undefined,
          spiderNodeId: null,
          embeddedSpider: null,
          discovery: null,
          startedAt: Date.now(),
        }
      })

      // Remove any previously materialized spider from this factory
      setNodes((current) =>
        current.filter((node) => {
          if (node.type !== "spider") return true
          return (node.data as SpiderNodeData).factoryId !== factoryId
        }),
      )

      const advanceActivity = (stepId: string, detail?: string) => {
        updateNodeData(factoryId, (data) => {
          const d = data as DiscoverFactoryData
          return {
            ...d,
            activitySteps: setRunningStep(d.activitySteps, stepId, detail),
          }
        })
      }

      try {
        advanceActivity("read", `${urls.length} URL${urls.length === 1 ? "" : "s"} connected`)

        advanceActivity(
          "probe",
          `Fetching ${urls[0].replace(/^https?:\/\//, "").slice(0, 52)}…`,
        )

        const response = await fetch("/api/discover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "quick",
            urls,
            confidenceThreshold: threshold,
            maxProbe,
            extraContext,
          }),
        })

        const payload = (await response.json()) as DiscoverResponse
        if (!response.ok || payload.error) {
          throw new Error(payload.error || `Discover failed (${response.status})`)
        }

        const result = payload.result
        if (!result) {
          throw new Error("No discovery result returned")
        }

        advanceActivity(
          "inspect",
          `Probed ${result.probedUrls.length} page${result.probedUrls.length === 1 ? "" : "s"}`,
        )
        advanceActivity(
          "score",
          `Top confidence ${(result.topConfidence * 100).toFixed(0)}%`,
        )

        const suggestion = resolveDiscoverySelection(
          urls.length,
          result.suggestions,
        ).suggestion

        updateNodeData(factoryId, (data) => {
          const d = data as DiscoverFactoryData
          return {
            ...d,
            activitySteps: completeAllSteps(
              d.activitySteps,
              suggestion
                ? `${suggestion.label.slice(0, 40)} · ${(suggestion.confidence * 100).toFixed(0)}%`
                : "Spider ready",
            ),
          }
        })

        const { spiderId, spider } = embedSpiderInFactory(
          factoryId,
          result,
          urlSourceId,
        )

        // The play button also runs the agentic build loop on the golden pages.
        void buildSpider(factoryId, spiderId, spider)
      } catch (error) {
        updateNodeData(factoryId, (data) => {
          const d = data as DiscoverFactoryData
          return {
            ...d,
            phase: "error",
            error: error instanceof Error ? error.message : "Discover failed",
            activitySteps: d.activitySteps.map((step) =>
              step.status === "running" || step.status === "pending"
                ? { ...step, status: "error" as const }
                : step,
            ),
          }
        })
      }
    },
    [getUpstreamUrls, embedSpiderInFactory, buildSpider, updateNodeData, setNodes],
  )

  const detachSpider = useCallback(
    (spiderNode: Node, parentNode: Node) => {
      const parentSize = getNodeSize(parentNode)
      const absolutePosition = {
        x: parentNode.position.x + spiderNode.position.x,
        y: parentNode.position.y + spiderNode.position.y,
      }

      setNodes((current) =>
        current.map((node) => {
          if (node.id !== spiderNode.id) return node
          return {
            ...node,
            parentId: undefined,
            extent: undefined,
            position: absolutePosition,
            data: {
              ...(node.data as SpiderNodeData),
              detached: true,
            },
            style: {
              ...node.style,
              width: parentSize.width > 0 ? 260 : node.style?.width,
            },
          }
        }),
      )
    },
    [setNodes],
  )

  const handleNodeDragStop = useCallback(
    (_event: MouseEvent | TouchEvent, node: Node) => {
      if (node.type !== "spider" || !node.parentId) return
      const parent = getNode(node.parentId)
      if (!parent) return

      const { width, height } = getNodeSize(parent)
      const margin = 24
      const outside =
        node.position.x < -margin ||
        node.position.y < -margin ||
        node.position.x > width - 80 ||
        node.position.y > height - 60

      if (outside) detachSpider(node, parent)
    },
    [detachSpider, getNode],
  )

  const handleAddNode = useCallback(
    (kind: FlowNodeKind) => {
      if (!addMenu) return
      const node = makeFlowNode(kind, addMenu.flowPos)
      const pending = addMenu.pendingConnection
      const nextNodes = [
        ...nodesRef.current.map((item) => ({ ...item, selected: false })),
        { ...node, selected: true },
      ]

      setNodes(nextNodes)

      if (pending) {
        const connection: Connection = {
          source: pending.source,
          sourceHandle: pending.sourceHandle,
          target: node.id,
          targetHandle: "in",
        }

        if (isAllowedConnection(connection, nextNodes)) {
          setEdges((current) => {
            const withoutTarget = current.filter(
              (edge) =>
                !(
                  edge.target === connection.target &&
                  (edge.targetHandle ?? null) === (connection.targetHandle ?? null)
                ),
            )
            return addEdge(
              { ...connection, style: edgeStyle, markerEnd, reconnectable: true },
              withoutTarget,
            )
          })
        }
      }

      setAddMenu(null)
    },
    [addMenu, setNodes, setEdges],
  )

  const openAddMenuAtScreen = useCallback(
    (screen: { x: number; y: number }) => {
      setAddMenu({
        x: screen.x,
        y: screen.y,
        flowPos: screenToFlowPosition(screen),
      })
    },
    [screenToFlowPosition],
  )

  const openAddMenuAtPointer = useCallback(() => {
    if (!isPointerOverCanvas.current || !pointerScreenRef.current) return
    openAddMenuAtScreen(pointerScreenRef.current)
  }, [openAddMenuAtScreen])

  const openAddMenuAtCanvasCenter = useCallback(() => {
    const rect = canvasAreaRef.current?.getBoundingClientRect()
    if (!rect) return
    openAddMenuAtScreen({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    })
  }, [openAddMenuAtScreen])

  const handleCanvasMouseEnter = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      isPointerOverCanvas.current = true
      pointerScreenRef.current = { x: event.clientX, y: event.clientY }
    },
    [],
  )

  const handleCanvasMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      isPointerOverCanvas.current = true
      pointerScreenRef.current = { x: event.clientX, y: event.clientY }
    },
    [],
  )

  const handleCanvasMouseLeave = useCallback(() => {
    isPointerOverCanvas.current = false
  }, [])

  const handlePaneClick = useCallback(() => setAddMenu(null), [])

  const handlePaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault()
      isPointerOverCanvas.current = true
      pointerScreenRef.current = { x: event.clientX, y: event.clientY }
      openAddMenuAtScreen({ x: event.clientX, y: event.clientY })
    },
    [openAddMenuAtScreen],
  )
  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!isAllowedConnection(connection, nodesRef.current)) return

      setEdges((current) => {
        const withoutTarget = current.filter(
          (edge) =>
            !(
              edge.target === connection.target &&
              (edge.targetHandle ?? null) === (connection.targetHandle ?? null)
            ),
        )
        return addEdge(
          { ...connection, style: edgeStyle, markerEnd, reconnectable: true },
          withoutTarget,
        )
      })
    },
    [setEdges],
  )

  const handleConnectStart = useCallback(
    (_event: MouseEvent | TouchEvent, params: OnConnectStartParams) => {
      if (params.handleType !== "target" || !params.nodeId) return

      setEdges((current) => {
        const existing = findEdgeToTargetHandle(
          current,
          params.nodeId!,
          params.handleId,
        )
        if (!existing) return current
        return current.filter((edge) => edge.id !== existing.id)
      })
    },
    [setEdges],
  )

  const handleConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, connectionState: FinalConnectionState) => {
      if (connectionState.isValid === true) return
      if (connectionState.fromHandle?.type !== "source") return
      if (!connectionState.fromNode) return

      const clientX = "clientX" in event ? event.clientX : event.touches[0]?.clientX
      const clientY = "clientY" in event ? event.clientY : event.touches[0]?.clientY
      if (clientX == null || clientY == null) return

      const sourceId = connectionState.fromNode.id
      const sourceHandle = connectionState.fromHandle.id ?? null
      const allowedKinds = getConnectableTargetKinds(
        sourceId,
        sourceHandle,
        nodesRef.current,
      ).filter((kind) => kind !== "spider")

      if (allowedKinds.length === 0) return

      const menuState = {
        x: clientX,
        y: clientY,
        flowPos: screenToFlowPosition({ x: clientX, y: clientY }),
        pendingConnection: { source: sourceId, sourceHandle },
        allowedKinds,
      }

      // Defer so onPaneClick from the same mouseup does not immediately dismiss the menu.
      window.setTimeout(() => setAddMenu(menuState), 0)
    },
    [screenToFlowPosition],
  )

  const handleReconnectStart = useCallback(() => {
    edgeReconnectSuccessful.current = false
  }, [])

  const handleReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      if (!isAllowedConnection(newConnection, nodesRef.current)) return

      edgeReconnectSuccessful.current = true
      setEdges((current) => {
        const withoutTarget = current.filter(
          (edge) =>
            edge.id === oldEdge.id ||
            !(
              edge.target === newConnection.target &&
              (edge.targetHandle ?? null) ===
                (newConnection.targetHandle ?? null)
            ),
        )
        const next = reconnectEdge(oldEdge, newConnection, withoutTarget)
        return next.map((edge) =>
          edge.id === oldEdge.id
            ? {
                ...edge,
                style: edgeStyle,
                markerEnd,
                reconnectable: true,
              }
            : edge,
        )
      })
    },
    [setEdges],
  )

  const handleIsValidConnection = useCallback(
    (connection: Connection | Edge) => {
      return isAllowedConnection(
        {
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle ?? null,
          targetHandle: connection.targetHandle ?? null,
        },
        nodesRef.current,
      )
    },
    [],
  )

  const handleReconnectEnd = useCallback(
    (_event: MouseEvent | TouchEvent, edge: Edge) => {
      if (!edgeReconnectSuccessful.current) {
        setEdges((current) => current.filter((item) => item.id !== edge.id))
      }
      edgeReconnectSuccessful.current = true
    },
    [setEdges],
  )

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement).tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return

      if (event.shiftKey && (event.key === "A" || event.key === "a")) {
        event.preventDefault()
        openAddMenuAtPointer()
        return
      }

      if (event.key === "f" || event.key === "F") {
        event.preventDefault()
        fitView({ padding: 0.15, duration: 300 })
        return
      }

      if (event.key === ".") {
        event.preventDefault()
        const selected = getNodes().filter((node) => node.selected)
        if (selected.length) {
          fitView({ nodes: selected, padding: 0.4, duration: 300 })
        }
      }
    }

    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [fitView, getNodes, openAddMenuAtPointer])

  const actions = useMemo<CompileFlowActions>(
    () => ({
      updateNodeData,
      runDiscoverFactory,
      runSpider,
      materializeSpider,
      getPreviewSourceId,
      getNodeData,
      getNodeType,
    }),
    [
      getNodeData,
      getNodeType,
      getPreviewSourceId,
      materializeSpider,
      runDiscoverFactory,
      runSpider,
      updateNodeData,
    ],
  )

  return (
    <CompileFlowProvider value={actions}>
      <div className="absolute inset-0 flex flex-col bg-muted/30">
        <CompileFlowToolbar
          nodeCount={nodes.length}
          onAddNode={openAddMenuAtCanvasCenter}
        />

        <div
          ref={canvasAreaRef}
          className="relative min-h-0 flex-1 overflow-hidden"
          onMouseEnter={handleCanvasMouseEnter}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={handleCanvasMouseLeave}
        >
          <ReactFlow
            className="react-flow-canvas"
            nodes={nodes}
            edges={edges}
            nodeTypes={canvasNodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            onConnectStart={handleConnectStart}
            onConnectEnd={handleConnectEnd}
            onReconnect={handleReconnect}
            onReconnectStart={handleReconnectStart}
            onReconnectEnd={handleReconnectEnd}
            isValidConnection={handleIsValidConnection}
            edgesReconnectable
            onNodeDragStop={handleNodeDragStop}
            onPaneClick={handlePaneClick}
            onPaneContextMenu={handlePaneContextMenu}
            defaultViewport={defaultViewport}
            onViewportChange={handleViewportChange}
            minZoom={0.15}
            maxZoom={2}
            colorMode={isDarkCanvas ? "dark" : "light"}
            deleteKeyCode={["Backspace", "Delete", "x", "X"]}
            panOnDrag={[1, 2]}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              color={isDarkCanvas ? "#232323" : "#d4d4d8"}
              gap={22}
              size={1}
            />
            <Controls
              position="bottom-right"
              showInteractive={false}
              className="react-flow-controls-blender"
            />

            <Panel position="bottom-left">
              <div className="rounded border border-border bg-background/85 px-2 py-1 backdrop-blur-sm">
              <span className="font-mono text-[9px] text-muted-foreground">
                Shift+A&nbsp;add&nbsp;·&nbsp;X&nbsp;delete&nbsp;·&nbsp;F&nbsp;fit&nbsp;·&nbsp;.&nbsp;focus
                ·&nbsp;drag output to empty to add&nbsp;·&nbsp;drag input to disconnect
              </span>
              </div>
            </Panel>
          </ReactFlow>

          {addMenu ? (
            <AddNodeMenu
              x={addMenu.x}
              y={addMenu.y}
              allowedKinds={addMenu.allowedKinds}
              onSelect={handleAddNode}
              onClose={() => setAddMenu(null)}
            />
          ) : null}
        </div>
      </div>
    </CompileFlowProvider>
  )
}

export const CompileFlowCanvas = () => {
  return (
    <ReactFlowProvider>
      <CompileFlowCanvasInner />
    </ReactFlowProvider>
  )
}
