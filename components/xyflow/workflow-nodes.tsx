"use client"

import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/base-node"
import { NodeTransportControls } from "@/components/xyflow/node-transport-controls"
import { WorkflowNodeBody } from "@/components/xyflow/workflow-node-body"
import { useWorkflowPipeline } from "@/components/workflow/workflow-pipeline-provider"
import { cn } from "@/lib/utils"
import type { PipelineNodeKind } from "@/lib/workflow/pipeline-types"

export type SocketDef = {
  id: string
  label: string
  color?: string
}

export type WorkflowNodeData = {
  label: string
  subtitle?: string
  headerClassName?: string
  inputs?: SocketDef[]
  outputs?: SocketDef[]
  status?: "idle" | "loading" | "success" | "error"
  nodeKind?: PipelineNodeKind
  gated?: boolean
}

const statusRing: Record<NonNullable<WorkflowNodeData["status"]>, string> = {
  idle: "",
  loading: "ring-2 ring-amber-500/80",
  success: "ring-2 ring-emerald-500/80",
  error: "ring-2 ring-red-500/80",
}

const runStateRing = {
  running: "ring-2 ring-amber-400/80",
  paused: "ring-2 ring-sky-400/80",
  completed: "ring-2 ring-emerald-500/80",
  error: "ring-2 ring-red-500/80",
  stopped: "ring-2 ring-zinc-500/80",
  idle: "",
} as const

const SocketRow = ({
  socket,
  type,
}: {
  socket: SocketDef
  type: "source" | "target"
}) => (
  <div className="relative flex items-center justify-between gap-2 py-0.5">
    <Handle
      id={socket.id}
      type={type}
      position={type === "target" ? Position.Left : Position.Right}
      className={cn(
        "h-2.5! w-2.5! rounded-full! border-none!",
        type === "target" ? "-left-4!" : "-right-4!",
        socket.color ?? "bg-yellow-500",
      )}
    />
    <span className="flex-1 text-[11px] text-zinc-400">{socket.label}</span>
  </div>
)

export const WorkflowNode = memo(({ id, data }: NodeProps) => {
  const nodeData = data as WorkflowNodeData
  const pipeline = useWorkflowPipeline()
  const nodeKind = nodeData.nodeKind

  const control = nodeKind
    ? pipeline.getNodeControl(id, nodeKind)
    : null

  const statusFromRun =
    control?.runState === "running"
      ? "loading"
      : control?.runState === "completed"
        ? "success"
        : control?.runState === "error"
          ? "error"
          : nodeData.status

  return (
    <BaseNode
      className={cn(
        "w-60 border-zinc-800 bg-zinc-900 p-0 text-zinc-100 shadow-xl",
        statusFromRun ? statusRing[statusFromRun] : undefined,
        control ? runStateRing[control.runState] : undefined,
      )}
    >
      <BaseNodeHeader
        className={cn(
          "rounded-t-md px-2 py-1.5",
          nodeData.headerClassName ?? "bg-zinc-800",
        )}
      >
        <BaseNodeHeaderTitle className="text-[11px] font-bold text-white">
          {nodeData.label || "Untitled Node"}
        </BaseNodeHeaderTitle>
        {control ? (
          <NodeTransportControls
            runState={control.runState}
            onPlay={control.play}
            onPause={control.pause}
            onStop={control.stop}
            canPlay={control.canPlay}
            canPause={control.canPause}
            canStop={control.canStop}
          />
        ) : null}
      </BaseNodeHeader>

      {nodeData.subtitle ? (
        <p className="border-b border-zinc-800 px-3 py-1 text-[10px] text-zinc-500">
          {nodeData.subtitle}
          {nodeData.gated ? " · human gate" : ""}
        </p>
      ) : null}

      <BaseNodeContent className="space-y-2 p-3">
        {nodeKind ? <WorkflowNodeBody nodeKind={nodeKind} /> : null}

        {nodeData.inputs?.map((socket) => (
          <SocketRow key={socket.id} socket={socket} type="target" />
        ))}
        {nodeData.outputs?.map((socket) => (
          <SocketRow key={socket.id} socket={socket} type="source" />
        ))}
      </BaseNodeContent>
    </BaseNode>
  )
})

WorkflowNode.displayName = "WorkflowNode"

export type TextNodeData = {
  label?: string
  text: string
  outputs?: SocketDef[]
}

export const TextNode = memo(({ data }: NodeProps) => {
  const nodeData = data as TextNodeData

  return (
    <BaseNode className="w-52 border-zinc-800 bg-zinc-900/50 p-0 text-zinc-100 shadow-xl">
      {nodeData.label ? (
        <BaseNodeHeader className="rounded-t-md bg-zinc-800/50 px-2 py-1.5">
          <BaseNodeHeaderTitle className="text-[11px] font-semibold text-zinc-400">
            {nodeData.label}
          </BaseNodeHeaderTitle>
        </BaseNodeHeader>
      ) : null}

      <BaseNodeContent className="p-3">
        <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-zinc-400">
          {nodeData.text || "Empty note..."}
        </p>

        {nodeData.outputs && nodeData.outputs.length > 0 ? (
          <div className="mt-3 space-y-1">
            {nodeData.outputs.map((socket) => (
              <SocketRow key={socket.id} socket={socket} type="source" />
            ))}
          </div>
        ) : null}
      </BaseNodeContent>
    </BaseNode>
  )
})

TextNode.displayName = "TextNode"

export const nodeTypes = {
  workflow: WorkflowNode,
  text: TextNode,
  default: WorkflowNode,
}
