"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
import { useReactFlow, type Viewport } from "@xyflow/react"

import {
  createDebouncedCanvasViewportWriter,
  DEFAULT_CANVAS_VIEWPORT,
  DEFAULT_WORKFLOW_ID,
  INITIAL_FIT_VIEW_OPTIONS,
  readCanvasViewport,
} from "@/lib/flow/canvas-viewport-storage"

export const useCanvasViewportPersistence = (
  workflowId = DEFAULT_WORKFLOW_ID,
) => {
  const { getViewport, fitView } = useReactFlow()
  const writer = useMemo(
    () => createDebouncedCanvasViewportWriter(workflowId),
    [workflowId],
  )
  const initialFitStartedRef = useRef(false)

  const storedViewport = useMemo(
    () => readCanvasViewport(workflowId),
    [workflowId],
  )

  const defaultViewport = storedViewport ?? DEFAULT_CANVAS_VIEWPORT
  const shouldInitialFit = storedViewport === null

  useEffect(() => {
    if (!shouldInitialFit || initialFitStartedRef.current) return
    initialFitStartedRef.current = true

    void fitView(INITIAL_FIT_VIEW_OPTIONS).then(() => {
      writer.schedule(getViewport())
      writer.flush()
    })
  }, [fitView, getViewport, shouldInitialFit, writer])

  useEffect(() => {
    const handlePageHide = () => writer.flush()

    window.addEventListener("pagehide", handlePageHide)
    return () => {
      window.removeEventListener("pagehide", handlePageHide)
      writer.flush()
      writer.cancel()
    }
  }, [writer])

  const handleViewportChange = useCallback(
    (viewport: Viewport) => {
      writer.schedule(viewport)
    },
    [writer],
  )

  return {
    defaultViewport,
    handleViewportChange,
  }
}
