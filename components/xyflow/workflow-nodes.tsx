"use client"

import { memo } from "react"
import { Handle, NodeResizer, Position, type NodeProps } from "@xyflow/react"
import { Loader2 } from "lucide-react"

import { NodeTransportControls } from "@/components/xyflow/node-transport-controls"
import { WorkflowNodeBody } from "@/components/xyflow/workflow-node-body"
import { useWorkflowPipeline, useNodeRunState } from "@/components/workflow/workflow-pipeline-provider"
import { flowNodeShell } from "@/lib/flow/node-chrome"
import { cn } from "@/lib/utils"
import {
  NODE_THEME,
  RUN_STATE_COLOR,
  RUN_STATE_LABEL,
  SOCKET_HEX,
} from "@/lib/workflow/node-theme"
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

const getSocketHex = (socket: SocketDef) =>
  SOCKET_HEX[socket.id] ?? "#6b7280"

const InputSocketRow = ({ socket }: { socket: SocketDef }) => (
  <div className="relative flex items-center bg-muted/40 px-2 py-0.5">
    <Handle
      id={socket.id}
      type="target"
      position={Position.Left}
      style={{
        left: -6,
        top: "50%",
        transform: "translateY(-50%)",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: "var(--flow-node-bg)",
        border: "2px solid",
        borderColor: getSocketHex(socket),
      }}
    />
    <span className="ml-2 font-mono text-[9px] text-muted-foreground">{socket.label}</span>
  </div>
)

const OutputSocketRow = ({ socket }: { socket: SocketDef }) => (
  <div className="relative flex items-center justify-end bg-muted/40 px-2 py-0.5">
    <span className="mr-2 font-mono text-[9px] text-muted-foreground">{socket.label}</span>
    <Handle
      id={socket.id}
      type="source"
      position={Position.Right}
      style={{
        right: -6,
        top: "50%",
        transform: "translateY(-50%)",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: "var(--flow-node-bg)",
        border: "2px solid",
        borderColor: getSocketHex(socket),
      }}
    />
  </div>
)

export const WorkflowNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as WorkflowNodeData
  const pipeline = useWorkflowPipeline()
  const nodeKind = nodeData.nodeKind
  const theme = nodeKind ? NODE_THEME[nodeKind] : null
  const runState = useNodeRunState(id)

  const control = nodeKind ? pipeline.getNodeControl(id, nodeKind) : null
  const isRunning = runState === "running"

  const Icon = theme?.icon

  return (
    <div
      className={cn(
        flowNodeShell(selected, {
          borderDefault: theme?.borderDefault,
          borderSelected: theme?.borderSelected ?? "border-primary/60",
        }),
        isRunning && "border-blue-500/60",
      )}
      style={{ width: "100%", height: "100%", minHeight: 160 }}
    >
      {selected ? (
        <NodeResizer
          isVisible
          minWidth={220}
          minHeight={140}
          lineStyle={{
            border: `1px solid ${theme?.resizerLine ?? "rgba(139,92,246,0.5)"}`,
          }}
          handleStyle={{
            width: 7,
            height: 7,
            background: theme?.accentHex ?? "#7c3aed",
            borderRadius: 2,
            border: "none",
          }}
        />
      ) : null}

      {/* Category header */}
      <div
        className={cn(
          "flex shrink-0 items-center gap-2 border-b px-2.5 py-1.5",
          theme?.headerBg ?? "bg-muted",
          theme?.headerBorder ?? "border-border",
        )}
      >
        {Icon ? (
          <Icon className={cn("size-3 shrink-0", theme.iconText)} aria-hidden />
        ) : null}
        <span
          className={cn(
            "truncate font-mono text-[10px] font-bold uppercase tracking-wide",
            theme?.headerText ?? "text-foreground",
          )}
        >
          {theme?.categoryLabel ?? nodeData.label}
        </span>
        {isRunning ? (
          <Loader2 className="size-3 shrink-0 animate-spin text-blue-400" aria-hidden />
        ) : null}
        {nodeData.gated ? (
          <span className="font-mono text-[8px] uppercase tracking-wide text-amber-500/80">
            gate
          </span>
        ) : null}
        {control ? (
          <NodeTransportControls
            className="ml-auto"
            runState={runState}
            onPlay={control.play}
            onPause={control.pause}
            onStop={control.stop}
            canPlay={control.canPlay}
            canPause={control.canPause}
            canStop={control.canStop}
            accentClassName={theme?.controlHover ?? "text-muted-foreground hover:bg-muted"}
          />
        ) : null}
      </div>

      {/* Title row */}
      <div className="shrink-0 border-b border-border bg-muted/50 px-2 py-1">
        <span className="font-mono text-[10px] font-medium text-foreground">
          {nodeData.label}
        </span>
        {nodeData.subtitle ? (
          <p className="truncate font-mono text-[9px] text-muted-foreground">
            {nodeData.subtitle}
          </p>
        ) : null}
      </div>

      {/* Scrollable body */}
      <div className="nodrag nowheel min-h-0 flex-1 overflow-y-auto px-2.5 py-2">
        {nodeKind ? <WorkflowNodeBody nodeKind={nodeKind} /> : null}
      </div>

      {/* Input sockets */}
      {nodeData.inputs?.map((socket) => (
        <InputSocketRow key={socket.id} socket={socket} />
      ))}

      {/* Output sockets */}
      {nodeData.outputs?.map((socket) => (
        <OutputSocketRow key={socket.id} socket={socket} />
      ))}

      {/* Status footer */}
      {control ? (
        <div className="flex shrink-0 items-center justify-between border-t border-border bg-muted/30 px-2 py-0.5">
          <span className={cn("font-mono text-[9px]", RUN_STATE_COLOR[runState])}>
            {RUN_STATE_LABEL[runState]}
          </span>
        </div>
      ) : null}
    </div>
  )
})

WorkflowNode.displayName = "WorkflowNode"

export type TextNodeData = {
  label?: string
  text: string
  outputs?: SocketDef[]
}

export const TextNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as TextNodeData

  return (
    <div
      className={flowNodeShell(selected, {
        borderSelected: "border-primary/50",
      })}
      style={{ width: "100%", height: "100%", minHeight: 100 }}
    >
      {nodeData.label ? (
        <div className="border-b border-border bg-muted/50 px-2.5 py-1.5">
          <span className="font-mono text-[10px] font-semibold text-muted-foreground">
            {nodeData.label}
          </span>
        </div>
      ) : null}

      <div className="flex-1 p-2.5">
        <p className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-foreground/80">
          {nodeData.text || "Empty note..."}
        </p>
      </div>

      {nodeData.outputs?.map((socket) => (
        <OutputSocketRow key={socket.id} socket={socket} />
      ))}
    </div>
  )
})

TextNode.displayName = "TextNode"

export const nodeTypes = {
  workflow: WorkflowNode,
  text: TextNode,
  default: WorkflowNode,
}
