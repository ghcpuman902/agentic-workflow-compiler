"use client"

import { useCallback } from "react"
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import { WorkflowPipelineProvider } from "@/components/workflow/workflow-pipeline-provider"
import {
  nodeTypes,
  type WorkflowNodeData,
} from "@/components/xyflow/workflow-nodes"

const pipelineNodes: Node<WorkflowNodeData>[] = [
  {
    id: "url-input",
    type: "workflow",
    position: { x: 40, y: 120 },
    data: {
      label: "URL Input",
      subtitle: "Paste target pages",
      headerClassName: "bg-emerald-900",
      nodeKind: "url-input",
      outputs: [{ id: "urls", label: "All URLs", color: "bg-emerald-400" }],
    },
  },
  {
    id: "quick-discover",
    type: "workflow",
    position: { x: 360, y: 80 },
    data: {
      label: "Quick Discover",
      subtitle: "1 URL at a time · up to 5 probes",
      headerClassName: "bg-blue-900",
      nodeKind: "quick-discover",
      inputs: [{ id: "urls", label: "URLs", color: "bg-emerald-400" }],
      outputs: [{ id: "discovery", label: "Discovery", color: "bg-blue-400" }],
    },
  },
  {
    id: "output-select",
    type: "workflow",
    position: { x: 680, y: 40 },
    data: {
      label: "Output Select",
      subtitle: "Choose data type & format",
      headerClassName: "bg-amber-900",
      nodeKind: "output-select",
      gated: true,
      inputs: [{ id: "discovery", label: "Discovery", color: "bg-blue-400" }],
      outputs: [{ id: "selection", label: "Selection", color: "bg-amber-400" }],
    },
  },
  {
    id: "confirm-build",
    type: "workflow",
    position: { x: 680, y: 280 },
    data: {
      label: "Confirm Build",
      subtitle: "Approve codegen + testing",
      headerClassName: "bg-violet-900",
      nodeKind: "confirm-build",
      gated: true,
      inputs: [{ id: "selection", label: "Selection", color: "bg-amber-400" }],
      outputs: [{ id: "approved", label: "Approved", color: "bg-violet-400" }],
    },
  },
  {
    id: "generate-test",
    type: "workflow",
    position: { x: 1000, y: 80 },
    data: {
      label: "Generate & Test",
      subtitle: "TS extractor + sandbox",
      headerClassName: "bg-rose-900",
      nodeKind: "generate-test",
      inputs: [{ id: "approved", label: "Approved", color: "bg-violet-400" }],
      outputs: [{ id: "artifact", label: "Artifact", color: "bg-rose-400" }],
    },
  },
  {
    id: "url-queue",
    type: "workflow",
    position: { x: 1000, y: 320 },
    data: {
      label: "URL Queue",
      subtitle: "Remaining pages after gates",
      headerClassName: "bg-zinc-800",
      nodeKind: "url-queue",
      inputs: [
        { id: "artifact", label: "Artifact", color: "bg-rose-400" },
        { id: "urls", label: "Pending URLs", color: "bg-emerald-400" },
      ],
      outputs: [{ id: "batch", label: "Batch result", color: "bg-zinc-400" }],
    },
  },
]

const pipelineEdges: Edge[] = [
  {
    id: "urls-discover",
    source: "url-input",
    target: "quick-discover",
    animated: true,
  },
  {
    id: "discover-output",
    source: "quick-discover",
    target: "output-select",
    animated: true,
  },
  {
    id: "output-confirm",
    source: "output-select",
    target: "confirm-build",
  },
  {
    id: "confirm-generate",
    source: "confirm-build",
    target: "generate-test",
  },
  {
    id: "input-queue",
    source: "url-input",
    target: "url-queue",
  },
  {
    id: "generate-queue",
    source: "generate-test",
    target: "url-queue",
  },
]

const ReactFlowCanvasInner = () => {
  const [nodes, , onNodesChange] = useNodesState(pipelineNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(pipelineEdges)

  const handleConnect = useCallback(
    (connection: Connection) => {
      setEdges((current) => addEdge(connection, current))
    },
    [setEdges],
  )

  return (
    <div className="absolute inset-0 flex flex-col bg-zinc-950">
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-3 py-1.5">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          Discover → Build Pipeline
        </h2>
        <span className="text-[10px] text-zinc-600">
          {nodes.length} nodes · play/pause/stop on each node
        </span>
      </header>

      <div className="relative min-h-0 flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.35}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
          className="h-full w-full bg-zinc-950"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={16}
            size={1}
            color="#52525b"
          />
          <Controls
            className="border-zinc-800! bg-zinc-900! [&>button:hover]:bg-zinc-800! [&>button]:border-zinc-700! [&>button]:bg-zinc-900! [&>button]:fill-zinc-400!"
            showInteractive={false}
          />
          <MiniMap
            className="border-zinc-800! bg-zinc-900!"
            maskColor="rgb(9 9 11 / 0.75)"
            nodeColor="#52525b"
          />
        </ReactFlow>
      </div>
    </div>
  )
}

export const ReactFlowCanvas = () => {
  return (
    <WorkflowPipelineProvider>
      <ReactFlowCanvasInner />
    </WorkflowPipelineProvider>
  )
}
