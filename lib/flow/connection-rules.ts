import type { Connection, Node } from "@xyflow/react"

import type { FlowNodeKind } from "@/lib/flow/canvas-types"

type AllowedEdge = {
  sourceType: string
  sourceHandle: string
  targetType: string
  targetHandle: string
}

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
  {
    sourceType: "spider",
    sourceHandle: "out",
    targetType: "preview",
    targetHandle: "in",
  },
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
