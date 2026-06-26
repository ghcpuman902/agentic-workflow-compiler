import type { ActivityStep } from "@/lib/flow/canvas-types"

export const buildDiscoverSteps = (urlCount: number): ActivityStep[] => {
  const probeLabel = `Probing pages (up to ${Math.min(5, urlCount)})`
  return [
    { id: "read", label: "Reading URL input", status: "pending" },
    { id: "probe", label: probeLabel, status: "pending" },
    { id: "inspect", label: "Inspecting DOM structure", status: "pending" },
    { id: "score", label: "Scoring extraction candidates", status: "pending" },
    { id: "spider", label: "Generating spider node", status: "pending" },
    { id: "build", label: "Building & testing extractor", status: "pending" },
  ]
}

export const advanceStep = (
  steps: ActivityStep[],
  stepId: string,
  patch: Partial<ActivityStep>,
): ActivityStep[] => {
  const index = steps.findIndex((step) => step.id === stepId)
  if (index === -1) return steps

  return steps.map((step, i) => {
    if (step.id === stepId) return { ...step, ...patch }
    if (i < index && step.status !== "complete" && step.status !== "error") {
      return { ...step, status: "complete" }
    }
    if (i === index + 1 && patch.status === "complete" && step.status === "pending") {
      return { ...step, status: "running" }
    }
    return step
  })
}

export const setRunningStep = (
  steps: ActivityStep[],
  stepId: string,
  detail?: string,
): ActivityStep[] => {
  return steps.map((step) => {
    if (step.id === stepId) {
      return { ...step, status: "running", detail }
    }
    if (step.status === "running") {
      return { ...step, status: "complete", detail: undefined }
    }
    return step
  })
}

/**
 * Stage 1 finished: complete every discovery step (and stamp the spider detail),
 * then hand off to the agentic build by leaving the "build" step "running".
 */
export const completeAllSteps = (
  steps: ActivityStep[],
  spiderDetail: string,
): ActivityStep[] =>
  steps.map((step) => {
    if (step.id === "build") {
      return { ...step, status: "running", detail: undefined }
    }
    if (step.id === "spider") {
      return { ...step, status: "complete", detail: spiderDetail }
    }
    return { ...step, status: "complete", detail: undefined }
  })

/** Stage 2 finished: resolve the "build" step to complete (or error). */
export const finishBuildStep = (
  steps: ActivityStep[],
  patch: Partial<ActivityStep>,
): ActivityStep[] =>
  steps.map((step) =>
    step.id === "build" ? { ...step, ...patch } : step,
  )
