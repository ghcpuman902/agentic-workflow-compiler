import type { CSSProperties } from "react"
import type { Edge, Node } from "@xyflow/react"

import { DEFAULT_WORKFLOW_ID } from "@/lib/flow/canvas-viewport-storage"

export const CANVAS_GRAPH_STORAGE_VERSION = 1

type StoredGraphPayload = {
  v: number
  nodes: Node[]
  edges: Edge[]
}

const getStorageKey = (workflowId = DEFAULT_WORKFLOW_ID) =>
  `compileflow:graph:v${CANVAS_GRAPH_STORAGE_VERSION}:${workflowId}`

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const sanitizeNode = (node: unknown): Node | null => {
  if (!isPlainObject(node)) return null
  if (typeof node.id !== "string" || !node.id) return null
  if (typeof node.type !== "string" || !node.type) return null
  if (!isPlainObject(node.position)) return null
  if (!isPlainObject(node.data)) return null

  const { x, y } = node.position
  if (typeof x !== "number" || typeof y !== "number") return null

  return {
    id: node.id,
    type: node.type,
    position: { x, y },
    data: node.data,
    ...(node.parentId && typeof node.parentId === "string"
      ? { parentId: node.parentId }
      : {}),
    ...(node.extent ? { extent: node.extent as Node["extent"] } : {}),
    ...(node.style && isPlainObject(node.style)
      ? { style: node.style as CSSProperties }
      : {}),
    ...(typeof node.draggable === "boolean" ? { draggable: node.draggable } : {}),
    selected: false,
    dragging: false,
  }
}

const sanitizeEdge = (edge: unknown): Edge | null => {
  if (!isPlainObject(edge)) return null
  if (typeof edge.id !== "string" || !edge.id) return null
  if (typeof edge.source !== "string" || !edge.source) return null
  if (typeof edge.target !== "string" || !edge.target) return null

  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    ...(typeof edge.sourceHandle === "string" ? { sourceHandle: edge.sourceHandle } : {}),
    ...(typeof edge.targetHandle === "string" ? { targetHandle: edge.targetHandle } : {}),
    ...(edge.style && isPlainObject(edge.style)
      ? { style: edge.style as CSSProperties }
      : {}),
    ...(edge.markerEnd && isPlainObject(edge.markerEnd)
      ? { markerEnd: edge.markerEnd as Edge["markerEnd"] }
      : {}),
    ...(typeof edge.animated === "boolean" ? { animated: edge.animated } : {}),
    ...(typeof edge.reconnectable === "boolean"
      ? { reconnectable: edge.reconnectable }
      : {}),
  }
}

const parseStoredGraph = (raw: string | null): StoredGraphPayload | null => {
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as StoredGraphPayload
    if (parsed.v !== CANVAS_GRAPH_STORAGE_VERSION) return null
    if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) return null

    const nodes = parsed.nodes
      .map(sanitizeNode)
      .filter((node): node is Node => node !== null)
    const edges = parsed.edges
      .map(sanitizeEdge)
      .filter((edge): edge is Edge => edge !== null)

    if (nodes.length === 0) return null

    const nodeIds = new Set(nodes.map((node) => node.id))
    const validEdges = edges.filter(
      (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target),
    )

    return { v: parsed.v, nodes, edges: validEdges }
  } catch {
    return null
  }
}

const readFromStorage = (storage: Storage, workflowId?: string) =>
  parseStoredGraph(storage.getItem(getStorageKey(workflowId)))

export type StoredCanvasGraph = {
  nodes: Node[]
  edges: Edge[]
}

export const readCanvasGraph = (
  workflowId = DEFAULT_WORKFLOW_ID,
): StoredCanvasGraph | null => {
  if (typeof window === "undefined") return null

  try {
    return readFromStorage(localStorage, workflowId)
  } catch {
    try {
      return readFromStorage(sessionStorage, workflowId)
    } catch {
      return null
    }
  }
}

export const writeCanvasGraph = (
  nodes: Node[],
  edges: Edge[],
  workflowId = DEFAULT_WORKFLOW_ID,
): void => {
  if (typeof window === "undefined") return
  if (nodes.length === 0) return

  const payload: StoredGraphPayload = {
    v: CANVAS_GRAPH_STORAGE_VERSION,
    nodes: nodes.map((node) => ({
      ...node,
      selected: false,
      dragging: false,
      measured: undefined,
    })),
    edges,
  }

  const serialized = JSON.stringify(payload)

  try {
    localStorage.setItem(getStorageKey(workflowId), serialized)
    return
  } catch {
    // fall through to sessionStorage
  }

  try {
    sessionStorage.setItem(getStorageKey(workflowId), serialized)
  } catch {
    // ignore quota / private mode
  }
}

export type DebouncedCanvasGraphWriter = {
  schedule: (graph: StoredCanvasGraph) => void
  flush: () => void
  cancel: () => void
}

export const createDebouncedCanvasGraphWriter = (
  workflowId = DEFAULT_WORKFLOW_ID,
  delayMs = 300,
): DebouncedCanvasGraphWriter => {
  let timer: ReturnType<typeof setTimeout> | null = null
  let lastGraph: StoredCanvasGraph | null = null

  const flush = () => {
    if (lastGraph) {
      writeCanvasGraph(lastGraph.nodes, lastGraph.edges, workflowId)
    }
    timer = null
  }

  return {
    schedule(graph: StoredCanvasGraph) {
      lastGraph = graph
      if (timer) clearTimeout(timer)
      timer = setTimeout(flush, delayMs)
    },
    flush() {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      if (lastGraph) {
        writeCanvasGraph(lastGraph.nodes, lastGraph.edges, workflowId)
      }
    },
    cancel() {
      if (timer) clearTimeout(timer)
      timer = null
      lastGraph = null
    },
  }
}
