"use client"

import { memo, useEffect, useRef, useState, startTransition } from "react"
import { Handle, NodeResizer, Position, type NodeProps } from "@xyflow/react"
import { AlignLeft } from "lucide-react"

import { useCompileFlow } from "@/components/xyflow/canvas/compile-flow-context"
import {
  flowBorderSkyDefault,
  flowBorderSkySelected,
  flowHandleStyle,
  flowHeaderSky,
  flowHeaderSkyIcon,
  flowHeaderSkyMeta,
  flowHeaderSkyTitle,
  flowNodeHint,
  flowNodeShell,
  flowResizerHandle,
} from "@/lib/flow/node-chrome"
import type { UrlNodeData } from "@/lib/flow/canvas-types"

const DEFAULT_H = 160

export const UrlNode = memo(function UrlNode({
  id,
  data,
  selected,
}: NodeProps & { data: UrlNodeData }) {
  const { updateNodeData } = useCompileFlow()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(data.url)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setValue(data.url)
  }, [data.url])

  useEffect(() => {
    if (editing) textareaRef.current?.focus()
  }, [editing])

  const lineCount = value.split("\n").filter(Boolean).length

  const commit = () => {
    startTransition(() => {
      updateNodeData(id, () => ({ kind: "url", url: value }))
    })
    setEditing(false)
  }

  return (
    <div
      className={flowNodeShell(selected, {
        borderDefault: flowBorderSkyDefault,
        borderSelected: flowBorderSkySelected,
      })}
      style={{ width: "100%", height: "100%", minHeight: DEFAULT_H }}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={200}
        minHeight={DEFAULT_H}
        lineStyle={{ border: "1px solid rgba(14,165,233,0.35)" }}
        handleStyle={flowResizerHandle("#0ea5e9")}
      />

      <div className={flowHeaderSky}>
        <AlignLeft className={flowHeaderSkyIcon} aria-hidden />
        <span className={flowHeaderSkyTitle}>Text</span>
        {lineCount > 0 ? (
          <span className={flowHeaderSkyMeta}>
            {lineCount} {lineCount === 1 ? "line" : "lines"}
          </span>
        ) : null}
      </div>

      <div className="nodrag nowheel min-h-0 flex-1 overflow-y-auto">
        {editing ? (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Escape") commit()
            }}
            className="h-full w-full resize-none bg-transparent px-2.5 py-2 font-mono text-[11px] leading-relaxed text-sky-900 outline-none dark:text-sky-200"
            placeholder={"https://example.com\nhttps://another.com\nnotes…"}
            aria-label="Text content, one item per line"
          />
        ) : (
          <div
            className="group h-full cursor-text px-2.5 py-2"
            onDoubleClick={() => setEditing(true)}
            role="button"
            tabIndex={0}
            aria-label="Edit text"
            onKeyDown={(event) => {
              if (event.key === "Enter") setEditing(true)
            }}
          >
            {value ? (
              <div className="space-y-0.5">
                {value.split("\n").filter(Boolean).map((line, index) => (
                  <div
                    key={index}
                    className="truncate font-mono text-[11px] leading-relaxed text-sky-700 transition-colors group-hover:text-sky-900 dark:text-sky-400/80 dark:group-hover:text-sky-300"
                    title={line}
                  >
                    {line}
                  </div>
                ))}
              </div>
            ) : (
              <span className={flowNodeHint}>double-click to edit text</span>
            )}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="out"
        style={flowHandleStyle("#0ea5e9", "right")}
      />
    </div>
  )
})
