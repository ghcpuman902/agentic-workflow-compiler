"use client"

import { useEffect, useLayoutEffect, useMemo, useState } from "react"
import type { Edge, Node } from "@xyflow/react"

import { syncCanvasNodeCounter } from "@/lib/flow/canvas-id"
import {
  createDebouncedCanvasGraphWriter,
  readCanvasGraph,
} from "@/lib/flow/canvas-graph-storage"
import { DEFAULT_WORKFLOW_ID } from "@/lib/flow/canvas-viewport-storage"

type UseCanvasGraphPersistenceArgs = {
  nodes: Node[]
  edges: Edge[]
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>
  workflowId?: string
}

export const useCanvasGraphPersistence = ({
  nodes,
  edges,
  setNodes,
  setEdges,
  workflowId = DEFAULT_WORKFLOW_ID,
}: UseCanvasGraphPersistenceArgs) => {
  const writer = useMemo(
    () => createDebouncedCanvasGraphWriter(workflowId),
    [workflowId],
  )
  const [persistenceEnabled, setPersistenceEnabled] = useState(false)

  useLayoutEffect(() => {
    const stored = readCanvasGraph(workflowId)
    if (stored) {
      syncCanvasNodeCounter(stored.nodes.map((node) => node.id))
      setNodes(stored.nodes)
      setEdges(stored.edges)
    }
    setPersistenceEnabled(true)
  }, [setEdges, setNodes, workflowId])

  useEffect(() => {
    if (!persistenceEnabled) return
    writer.schedule({ nodes, edges })
  }, [edges, nodes, persistenceEnabled, writer])

  useEffect(() => {
    const handlePageHide = () => writer.flush()

    window.addEventListener("pagehide", handlePageHide)
    return () => {
      window.removeEventListener("pagehide", handlePageHide)
      writer.flush()
      writer.cancel()
    }
  }, [writer])
}
