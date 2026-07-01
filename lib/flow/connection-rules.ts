import type { Connection, Node } from "@xyflow/react"

import type { FlowNodeKind } from "@/lib/flow/canvas-types"
import {
  COLLECTION_FORMATS,
  DOC_FORMATS,
} from "@/lib/workflow/content-types"
import { spiderOutputHandleId } from "@/lib/workflow/spider-output"

type AllowedEdge = {
  sourceType: string
  sourceHandle: string
  targetType: string
  targetHandle: string
}

const spiderOutputHandles = [
  "out",
  ...COLLECTION_FORMATS.map(spiderOutputHandleId),
  ...DOC_FORMATS.map(spiderOutputHandleId),
]

const spiderToTarget = (
  targetType: FlowNodeKind,
  targetHandle = "in",
): AllowedEdge[] =>
  spiderOutputHandles.map((sourceHandle) => ({
    sourceType: "spider",
    sourceHandle,
    targetType,
    targetHandle,
  }))

const ALLOWED_EDGES: AllowedEdge[] = [
  {
    sourceType: "url",
    sourceHandle: "out",
    targetType: "discover-factory",
    targetHandle: "in",
  },
  {
    sourceType: "url",
    sourceHandle: "out",
    targetType: "spider",
    targetHandle: "in",
  },
  {
    sourceType: "url",
    sourceHandle: "out",
    targetType: "preview",
    targetHandle: "in",
  },
  {
    sourceType: "url",
    sourceHandle: "out",
    targetType: "llm",
    targetHandle: "in",
  },
  ...spiderToTarget("llm"),
  {
    sourceType: "llm",
    sourceHandle: "out",
    targetType: "llm",
    targetHandle: "in",
  },
  ...spiderToTarget("preview"),
  {
    sourceType: "llm",
    sourceHandle: "out",
    targetType: "preview",
    targetHandle: "in",
  },
]

export const isAllowedConnection = (
  connection: Connection,
  nodes: Node[],
): boolean => {
  const source = nodes.find((node) => node.id === connection.source)
  const target = nodes.find((node) => node.id === connection.target)
  if (!source?.type || !target?.type) return false

  return ALLOWED_EDGES.some(
    (rule) =>
      rule.sourceType === source.type &&
      rule.targetType === target.type &&
      rule.sourceHandle === (connection.sourceHandle ?? "out") &&
      rule.targetHandle === (connection.targetHandle ?? "in"),
  )
}

export const getConnectableTargetKinds = (
  sourceNodeId: string,
  sourceHandle: string | null,
  nodes: Node[],
): FlowNodeKind[] => {
  const source = nodes.find((node) => node.id === sourceNodeId)
  if (!source?.type) return []

  const handle = sourceHandle ?? "out"
  const kinds = new Set<FlowNodeKind>()

  for (const rule of ALLOWED_EDGES) {
    if (rule.sourceType === source.type && rule.sourceHandle === handle) {
      kinds.add(rule.targetType as FlowNodeKind)
    }
  }

  return [...kinds]
}

export const findEdgeToTargetHandle = (
  edges: { id: string; target: string; targetHandle?: string | null }[],
  targetId: string,
  targetHandle?: string | null,
) =>
  edges.find(
    (edge) =>
      edge.target === targetId &&
      (edge.targetHandle ?? null) === (targetHandle ?? null),
  )
