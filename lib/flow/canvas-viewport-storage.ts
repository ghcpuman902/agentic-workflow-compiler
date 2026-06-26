import type { Viewport } from "@xyflow/react"

export const CANVAS_VIEWPORT_STORAGE_VERSION = 1
export const DEFAULT_WORKFLOW_ID = "compile_flow_v0.1"

export const CANVAS_MIN_ZOOM = 0.15
export const CANVAS_MAX_ZOOM = 2

export const DEFAULT_CANVAS_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 }

export const INITIAL_FIT_VIEW_OPTIONS = {
  padding: 0.55,
  maxZoom: 0.85,
  duration: 0,
} as const

type StoredViewportPayload = {
  v: number
  x: number
  y: number
  zoom: number
}

const isValidNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value)

export const clampCanvasZoom = (zoom: number) =>
  Math.min(CANVAS_MAX_ZOOM, Math.max(CANVAS_MIN_ZOOM, zoom))

const getStorageKey = (workflowId = DEFAULT_WORKFLOW_ID) =>
  `compileflow:viewport:v${CANVAS_VIEWPORT_STORAGE_VERSION}:${workflowId}`

const parseStoredViewport = (raw: string | null): Viewport | null => {
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as StoredViewportPayload
    if (parsed.v !== CANVAS_VIEWPORT_STORAGE_VERSION) return null
    if (
      !isValidNumber(parsed.x) ||
      !isValidNumber(parsed.y) ||
      !isValidNumber(parsed.zoom)
    ) {
      return null
    }

    return {
      x: parsed.x,
      y: parsed.y,
      zoom: clampCanvasZoom(parsed.zoom),
    }
  } catch {
    return null
  }
}

const readFromStorage = (storage: Storage, workflowId?: string) =>
  parseStoredViewport(storage.getItem(getStorageKey(workflowId)))

export const readCanvasViewport = (
  workflowId = DEFAULT_WORKFLOW_ID,
): Viewport | null => {
  if (typeof window === "undefined") return null

  try {
    return readFromStorage(localStorage, workflowId)
  } catch {
    try {
      return readFromStorage(sessionStorage, workflowId)
    } catch {
      return null
    }
  }
}

export const writeCanvasViewport = (
  viewport: Viewport,
  workflowId = DEFAULT_WORKFLOW_ID,
): void => {
  if (typeof window === "undefined") return

  const payload: StoredViewportPayload = {
    v: CANVAS_VIEWPORT_STORAGE_VERSION,
    x: viewport.x,
    y: viewport.y,
    zoom: clampCanvasZoom(viewport.zoom),
  }

  const serialized = JSON.stringify(payload)

  try {
    localStorage.setItem(getStorageKey(workflowId), serialized)
    return
  } catch {
    // fall through to sessionStorage
  }

  try {
    sessionStorage.setItem(getStorageKey(workflowId), serialized)
  } catch {
    // ignore quota / private mode
  }
}

export type DebouncedCanvasViewportWriter = {
  schedule: (viewport: Viewport) => void
  flush: () => void
  cancel: () => void
}

export const createDebouncedCanvasViewportWriter = (
  workflowId = DEFAULT_WORKFLOW_ID,
  delayMs = 200,
): DebouncedCanvasViewportWriter => {
  let timer: ReturnType<typeof setTimeout> | null = null
  let lastViewport: Viewport | null = null

  const flush = () => {
    if (lastViewport) {
      writeCanvasViewport(lastViewport, workflowId)
    }
    timer = null
  }

  return {
    schedule(viewport: Viewport) {
      lastViewport = viewport
      if (timer) clearTimeout(timer)
      timer = setTimeout(flush, delayMs)
    },
    flush() {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      if (lastViewport) {
        writeCanvasViewport(lastViewport, workflowId)
      }
    },
    cancel() {
      if (timer) clearTimeout(timer)
      timer = null
      lastViewport = null
    },
  }
}
