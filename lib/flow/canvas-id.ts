let nodeCounter = 0

export const makeCanvasNodeId = (prefix: string) => `${prefix}-${++nodeCounter}`

/** After restoring a saved graph, bump the counter past existing numeric suffixes. */
export const syncCanvasNodeCounter = (nodeIds: string[]) => {
  let max = 0
  for (const id of nodeIds) {
    const match = id.match(/-(\d+)$/)
    if (match) max = Math.max(max, Number.parseInt(match[1], 10))
  }
  if (max > nodeCounter) nodeCounter = max
}
