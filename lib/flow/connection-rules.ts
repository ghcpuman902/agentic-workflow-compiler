import type { Connection, Node } from "@xyflow/react"

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
    sourceType: "spider",
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
