"use client"

import type { CSSProperties } from "react"
import { Handle, Position } from "@xyflow/react"

import { cn } from "@/lib/utils"

const blenderSocketStyle = (
  color: string,
  side: "left" | "right",
): CSSProperties => ({
  top: "50%",
  [side === "left" ? "left" : "right"]: -8,
  transform: "translateY(-50%)",
  width: 12,
  height: 12,
  background: color,
  border: "2px solid var(--flow-node-bg, var(--card))",
  borderRadius: "9999px",
  ["--flow-socket-color" as string]: color,
})

type BlenderInputSocketProps = {
  id?: string
  label: string
  color?: string
  top?: string | number
}

export const BlenderInputSocket = ({
  id = "in",
  label,
  color = "#a8a29e",
  top = 28,
}: BlenderInputSocketProps) => (
  <div
    className="pointer-events-none absolute z-10 flex -translate-y-1/2 items-center"
    style={{ left: 0, top }}
  >
    <Handle
      type="target"
      position={Position.Left}
      id={id}
      isConnectableStart
      title={label}
      className="flow-blender-socket pointer-events-auto !relative !left-0 !top-0 !translate-none"
      style={{
        ...blenderSocketStyle(color, "left"),
        position: "relative",
        left: -8,
        top: 0,
        transform: "none",
      }}
    />
    <span className="pointer-events-none ml-1 select-none font-mono text-[8px] uppercase tracking-wide text-muted-foreground">
      {label}
    </span>
  </div>
)

type BlenderOutputSocketProps = {
  id: string
  label: string
  color: string
  active?: boolean
  disabled?: boolean
  onSelect?: () => void
}

export const BlenderOutputSocket = ({
  id,
  label,
  color,
  active = false,
  disabled = false,
  onSelect,
}: BlenderOutputSocketProps) => (
  <div className="relative flex h-[1.625rem] shrink-0 items-center justify-end">
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      onPointerDown={(event) => event.stopPropagation()}
      className={cn(
        "nodrag nowheel mr-1 max-w-[4rem] truncate text-right font-mono text-[9px] leading-none transition-colors",
        active
          ? "font-semibold text-foreground"
          : "text-muted-foreground hover:text-foreground",
        disabled && "opacity-40",
      )}
      aria-pressed={active}
      aria-label={`${label} output`}
    >
      {label}
    </button>
    <Handle
      type="source"
      position={Position.Right}
      id={id}
      title={`${label} output`}
      className="flow-blender-socket"
      style={blenderSocketStyle(color, "right")}
    />
  </div>
)

type BlenderOutputRailProps = {
  formats: Array<{
    id: string
    label: string
    color: string
    formatKey: string
  }>
  activeFormatKey?: string
  disabled?: boolean
  onSelectFormat?: (formatKey: string) => void
}

export const BlenderOutputRail = ({
  formats,
  activeFormatKey,
  disabled = false,
  onSelectFormat,
}: BlenderOutputRailProps) => (
  <div
    className="flex w-[4.75rem] shrink-0 flex-col justify-center border-l border-border/50 bg-muted/15 py-1.5 dark:bg-black/10"
    aria-label="Output sockets"
  >
    {formats.map((item) => (
      <BlenderOutputSocket
        key={item.id}
        id={item.id}
        label={item.label}
        color={item.color}
        active={activeFormatKey === item.formatKey}
        disabled={disabled}
        onSelect={onSelectFormat ? () => onSelectFormat(item.formatKey) : undefined}
      />
    ))}
  </div>
)
