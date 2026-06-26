import type { Suggestion } from "@/lib/workflow/content-types"
import {
  cardinalityForUrlCount,
  defaultItemType,
  type Cardinality,
  type ItemType,
} from "@/lib/workflow/content-types"

/** How we interpret pasted URLs before the user confirms output type. */
export type DiscoveryInputIntent = "collection" | "ambiguous"

export type DiscoverySelection = {
  inputIntent: DiscoveryInputIntent
  /** Derived purely from the input URL count (Blender-style). */
  cardinality: Cardinality
  /** Default singular item type to pre-select on the spider (overridable). */
  itemType: ItemType
  family: "document" | "collection"
  suggestion: Suggestion | null
}

/**
 * Multiple pasted URLs signal array/collection intent.
 * A single URL can be either a document or a one-page collection — user must choose.
 */
export const resolveDiscoveryInputIntent = (
  urlCount: number,
): DiscoveryInputIntent => (urlCount > 1 ? "collection" : "ambiguous")

export const resolveDiscoverySelection = (
  urlCount: number,
  suggestions: Suggestion[],
): DiscoverySelection => {
  const inputIntent = resolveDiscoveryInputIntent(urlCount)
  const cardinality = cardinalityForUrlCount(urlCount)
  const itemType = defaultItemType(cardinality)

  if (inputIntent === "collection") {
    const collection =
      suggestions.find((s) => s.family === "collection") ?? suggestions[0] ?? null
    return {
      inputIntent,
      cardinality,
      itemType,
      family: "collection",
      suggestion: collection,
    }
  }

  return {
    inputIntent,
    cardinality,
    itemType,
    family: "document",
    suggestion: suggestions.find((s) => s.family === "document") ?? null,
  }
}
