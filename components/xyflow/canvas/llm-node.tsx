"use client"

import { memo, useEffect, useRef, useState, startTransition } from "react"
import { Handle, NodeResizer, Position, type NodeProps, useNodeConnections, useStore } from "@xyflow/react"
import { Bot, Loader2, Play } from "lucide-react"

import { useCompileFlow } from "@/components/xyflow/canvas/compile-flow-context"
import {
  flowBorderVioletDefault,
  flowBorderVioletSelected,
  flowHandleStyle,
  flowHeaderViolet,
  flowHeaderVioletIcon,
  flowHeaderVioletTitle,
  flowNodeHint,
  flowNodeShell,
  flowResizerHandle,
  flowNodeIconButton,
} from "@/lib/flow/node-chrome"
import type { LlmNodeData } from "@/lib/flow/canvas-types"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

import { runGeminiAction } from "@/app/actions/llm"
import type { FlowNodeData, SpiderNodeData, UrlNodeData } from "@/lib/flow/canvas-types"

const DEFAULT_H = 240

const getSourceRawText = (
  sourceType: string | null,
  data: unknown,
): string => {
  if (sourceType === "url" && data && typeof data === "object" && "url" in data) {
    return String((data as UrlNodeData).url ?? "")
  }

  if (sourceType === "spider" && data && typeof data === "object") {
    const spider = data as SpiderNodeData
    const pageUrls = spider.discovery?.pages.map((page) => page.url) ?? []
    if (pageUrls.length > 0) return pageUrls.join("\n")
    if (spider.run?.preview) return spider.run.preview
    if (spider.build?.preview) return spider.build.preview
  }

  if (sourceType === "llm" && data && typeof data === "object" && "preview" in data) {
    return String((data as any).preview ?? "")
  }

  return ""
}

export const LlmNode = memo(function LlmNode({
  id,
  data,
  selected,
}: NodeProps & { data: LlmNodeData }) {
  const { updateNodeData, getNodeData } = useCompileFlow()
  const [editing, setEditing] = useState(false)
  const [promptValue, setPromptValue] = useState(data.prompt || "")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // Track connections
  const connections = useNodeConnections({
    id,
    handleType: "target",
    handleId: "in",
  })
  
  const sourceId = connections[0]?.source ?? null
  const sourceNode = useStore((state) =>
    sourceId ? state.nodes.find((node) => node.id === sourceId) : undefined,
  )

  useEffect(() => {
    setPromptValue(data.prompt || "")
  }, [data.prompt])

  useEffect(() => {
    if (editing) textareaRef.current?.focus()
  }, [editing])

  const commitPrompt = () => {
    startTransition(() => {
      updateNodeData(id, (current) => ({ ...(current as LlmNodeData), prompt: promptValue }))
    })
    setEditing(false)
  }

  const [isRunning, setIsRunning] = useState(false)
  
  const handleRun = async () => {
    if (!promptValue.trim()) return

    setIsRunning(true)
    
    // Attempt to resolve input text from source node
    let inputText = ""
    if (sourceId && sourceNode) {
      const fromStore = getSourceRawText(sourceNode.type ?? null, sourceNode.data)
      if (fromStore.trim()) {
        inputText = fromStore
      } else {
        inputText = getSourceRawText(sourceNode.type ?? null, getNodeData(sourceId))
      }
    }

    try {
      const result = await runGeminiAction({
        prompt: promptValue,
        inputText: inputText || "No input provided.",
        modelType: data.modelType,
        reasoningLevel: data.reasoningLevel,
        outputMethod: data.outputMethod,
      })

      if (result.success && result.text) {
        updateNodeData(id, (current) => ({
          ...(current as LlmNodeData),
          preview: result.text,
        }))
      } else {
        updateNodeData(id, (current) => ({
          ...(current as LlmNodeData),
          preview: `Error: ${result.error}`,
        }))
      }
    } catch (e) {
      updateNodeData(id, (current) => ({
        ...(current as LlmNodeData),
        preview: `Error: ${String(e)}`,
      }))
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div
      className={flowNodeShell(selected, {
        borderDefault: flowBorderVioletDefault,
        borderSelected: flowBorderVioletSelected,
      })}
      style={{ width: "100%", height: "100%", minHeight: DEFAULT_H }}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={240}
        minHeight={DEFAULT_H}
        lineStyle={{ border: "1px solid rgba(139,92,246,0.35)" }}
        handleStyle={flowResizerHandle("#8b5cf6")}
      />

      <div className={flowHeaderViolet}>
        <Bot className={flowHeaderVioletIcon} aria-hidden />
        <span className={flowHeaderVioletTitle}>LLM (Gemini)</span>
        
        <div className="ml-auto flex items-center gap-1">
          {isRunning ? (
            <Loader2 className="size-3.5 animate-spin text-violet-500" />
          ) : (
            <button
              type="button"
              onClick={handleRun}
              className={flowNodeIconButton}
              title="Run Prompt"
            >
              <Play className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 p-2 border-b border-border/50 bg-muted/10">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[9px] text-muted-foreground uppercase">Reasoning</span>
            <Select 
              value={data.reasoningLevel || "none"} 
              onValueChange={(val) => updateNodeData(id, (current) => ({ ...(current as LlmNodeData), reasoningLevel: val as LlmNodeData["reasoningLevel"] }))}
            >
              <SelectTrigger className="h-6 nodrag nowheel bg-background text-[10px] font-mono px-2">
                <SelectValue placeholder="Reasoning" />
              </SelectTrigger>
              <SelectContent className="font-mono text-[10px]">
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[9px] text-muted-foreground uppercase">Output</span>
            <Select 
              value={data.outputMethod || "text"} 
              onValueChange={(val) => updateNodeData(id, (current) => ({ ...(current as LlmNodeData), outputMethod: val as LlmNodeData["outputMethod"] }))}
            >
              <SelectTrigger className="h-6 nodrag nowheel bg-background text-[10px] font-mono px-2">
                <SelectValue placeholder="Method" />
              </SelectTrigger>
              <SelectContent className="font-mono text-[10px]">
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="nodrag nowheel min-h-0 flex-1 overflow-y-auto">
        {editing ? (
          <textarea
            ref={textareaRef}
            value={promptValue}
            onChange={(event) => setPromptValue(event.target.value)}
            onBlur={commitPrompt}
            onKeyDown={(event) => {
              if (event.key === "Escape") commitPrompt()
            }}
            className="h-full w-full resize-none bg-transparent px-2.5 py-2 font-mono text-[11px] leading-relaxed text-violet-900 outline-none dark:text-violet-200"
            placeholder={"Enter your prompt here..."}
            aria-label="Prompt text"
          />
        ) : (
          <div
            className="group h-full cursor-text px-2.5 py-2"
            onDoubleClick={() => setEditing(true)}
            role="button"
            tabIndex={0}
            aria-label="Edit prompt text"
            onKeyDown={(event) => {
              if (event.key === "Enter") setEditing(true)
            }}
          >
            {promptValue ? (
              <div className="space-y-0.5">
                {promptValue.split("\n").map((line, index) => (
                  <div
                    key={index}
                    className="font-mono text-[11px] leading-relaxed text-violet-700 transition-colors group-hover:text-violet-900 dark:text-violet-400/80 dark:group-hover:text-violet-300"
                  >
                    {line || "\u00A0"}
                  </div>
                ))}
              </div>
            ) : (
              <span className={flowNodeHint}>double-click to edit prompt</span>
            )}
          </div>
        )}
      </div>

      {data.preview && (
        <div className="border-t border-border/50 bg-emerald-50/50 p-2 dark:bg-emerald-950/20">
          <span className="font-mono text-[9px] text-emerald-600/80 uppercase block mb-1">Preview output ready</span>
        </div>
      )}

      <Handle
        type="target"
        position={Position.Left}
        id="in"
        isConnectableStart
        title="Connect input text"
        style={flowHandleStyle("#8b5cf6", "left")}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        style={flowHandleStyle("#8b5cf6", "right")}
      />
    </div>
  )
})
