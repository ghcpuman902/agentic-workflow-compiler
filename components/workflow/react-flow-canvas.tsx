"use client"

import { useCallback, useEffect } from "react"
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import {
  nodeTypes,
  type WorkflowNodeData,
} from "@/components/xyflow/workflow-nodes"
import { WorkflowPipelineProvider } from "@/components/workflow/workflow-pipeline-provider"
import { WorkflowToolbar } from "@/components/workflow/workflow-toolbar"

const pipelineNodes: Node<WorkflowNodeData>[] = [
  {
    id: "url-input",
    type: "workflow",
    position: { x: 40, y: 120 },
    style: { width: 280, height: 240 },
    data: {
      label: "URL Input",
      subtitle: "Paste target pages",
      nodeKind: "url-input",
      outputs: [{ id: "urls", label: "All URLs" }],
    },
  },
  {
    id: "quick-discover",
    type: "workflow",
    position: { x: 380, y: 80 },
    style: { width: 280, height: 260 },
    data: {
      label: "Quick Discover",
      subtitle: "1 URL at a time · up to 5 probes",
      nodeKind: "quick-discover",
      inputs: [{ id: "urls", label: "URLs" }],
      outputs: [{ id: "discovery", label: "Discovery" }],
    },
  },
  {
    id: "output-select",
    type: "workflow",
    position: { x: 720, y: 40 },
    style: { width: 300, height: 320 },
    data: {
      label: "Output Select",
      subtitle: "Choose data type & format",
      nodeKind: "output-select",
      gated: true,
      inputs: [{ id: "discovery", label: "Discovery" }],
      outputs: [{ id: "selection", label: "Selection" }],
    },
  },
  {
    id: "confirm-build",
    type: "workflow",
    position: { x: 720, y: 400 },
    style: { width: 280, height: 200 },
    data: {
      label: "Confirm Build",
      subtitle: "Approve codegen + testing",
      nodeKind: "confirm-build",
      gated: true,
      inputs: [{ id: "selection", label: "Selection" }],
      outputs: [{ id: "approved", label: "Approved" }],
    },
  },
  {
    id: "generate-test",
    type: "workflow",
    position: { x: 1060, y: 80 },
    style: { width: 280, height: 220 },
    data: {
      label: "Generate & Test",
      subtitle: "TS extractor + sandbox",
      nodeKind: "generate-test",
      inputs: [{ id: "approved", label: "Approved" }],
      outputs: [{ id: "artifact", label: "Artifact" }],
    },
  },
  {
    id: "url-queue",
    type: "workflow",
    position: { x: 1060, y: 360 },
    style: { width: 280, height: 260 },
    data: {
      label: "URL Queue",
      subtitle: "Remaining pages after gates",
      nodeKind: "url-queue",
      inputs: [
        { id: "artifact", label: "Artifact" },
        { id: "urls", label: "Pending URLs" },
      ],
      outputs: [{ id: "batch", label: "Batch result" }],
    },
  },
]

const edgeStyle = { stroke: "#3a3a3a", strokeWidth: 1.5 }
const markerEnd = {
  type: MarkerType.ArrowClosed,
  color: "#3a3a3a",
  width: 12,
  height: 12,
}

const pipelineEdges: Edge[] = [
  {
    id: "urls-discover",
    source: "url-input",
    target: "quick-discover",
    style: edgeStyle,
    markerEnd,
    animated: true,
  },
  {
    id: "discover-output",
    source: "quick-discover",
    target: "output-select",
    style: edgeStyle,
    markerEnd,
    animated: true,
  },
  {
    id: "output-confirm",
    source: "output-select",
    target: "confirm-build",
    style: edgeStyle,
    markerEnd,
  },
  {
    id: "confirm-generate",
    source: "confirm-build",
    target: "generate-test",
    style: edgeStyle,
    markerEnd,
  },
  {
    id: "input-queue",
    source: "url-input",
    target: "url-queue",
    style: edgeStyle,
    markerEnd,
  },
  {
    id: "generate-queue",
    source: "generate-test",
    target: "url-queue",
    style: edgeStyle,
    markerEnd,
  },
]

const ReactFlowCanvasInner = () => {
  const [nodes, , onNodesChange] = useNodesState(pipelineNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(pipelineEdges)
  const { fitView, getNodes } = useReactFlow()

  const handleConnect = useCallback(
    (connection: Connection) => {
      setEdges((current) =>
        addEdge(
          {
            ...connection,
            style: edgeStyle,
            markerEnd,
          },
          current,
        ),
      )
    },
    [setEdges],
  )

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement).tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return

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
  }, [fitView, getNodes])

  return (
    <div className="absolute inset-0 flex flex-col bg-[#141414]">
      <WorkflowToolbar />

      <div className="relative min-h-0 flex-1">
        <ReactFlow
          className="react-flow-canvas"
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          onlyRenderVisibleElements
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.15}
          maxZoom={2}
          colorMode="dark"
          deleteKeyCode={null}
          panOnDrag={[1, 2]}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            color="#232323"
            gap={22}
            size={1}
          />
          <Controls
            position="bottom-right"
            showInteractive={false}
            className="react-flow-controls-blender"
          />

          <Panel position="bottom-left">
            <div className="rounded border border-[#2a2a2a] bg-[#1a1a1a]/80 px-2 py-1">
              <span className="font-mono text-[9px] text-zinc-700">
                F&nbsp;fit&nbsp;·&nbsp;.&nbsp;focus&nbsp;·&nbsp;play/pause/stop on
                each node
              </span>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  )
}

export const ReactFlowCanvas = () => {
  return (
    <WorkflowPipelineProvider>
      <ReactFlowProvider>
        <ReactFlowCanvasInner />
      </ReactFlowProvider>
    </WorkflowPipelineProvider>
  )
}
