"use client"

import { createContext, useContext } from "react"

import type { FlowNodeData } from "@/lib/flow/canvas-types"

export type CompileFlowActions = {
  updateNodeData: (
    nodeId: string,
    updater: (data: FlowNodeData) => FlowNodeData,
  ) => void
  runDiscoverFactory: (factoryId: string) => void
  confirmDiscoverOutput: (factoryId: string) => void
  runSpider: (spiderId: string) => void
  materializeSpider: (
    factoryId: string,
    screenPosition: { x: number; y: number },
  ) => void
  getPreviewSourceId: (previewId: string) => string | null
  getNodeData: (nodeId: string) => FlowNodeData | null
  getNodeType: (nodeId: string) => string | null
}

const CompileFlowContext = createContext<CompileFlowActions | null>(null)

export const CompileFlowProvider = CompileFlowContext.Provider

export const useCompileFlow = () => {
  const ctx = useContext(CompileFlowContext)
  if (!ctx) {
    throw new Error("useCompileFlow must be used within CompileFlowProvider")
  }
  return ctx
}
