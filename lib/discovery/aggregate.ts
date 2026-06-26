/**
 * Stage 1 discovery aggregation.
 *
 * Compares a set of `PageInspection`s to:
 *   - group URLs by inferred page role (listing / detail / document / ...)
 *   - separate shared fields from optional fields across pages
 *   - produce ranked, SEMANTIC `Suggestion`s for the Document and Collection
 *     output families, with confidence, estimatedRecords and field coverage.
 *
 * Heuristic spine:
 *   - listing pages with many repeated, multi-field groups  => Collection
 *   - long-form text with few/no repeats                    => Document
 */
import type {
  PageInspection,
  PageRole,
  RepeatedGroup,
  Suggestion,
  SuggestionField,
  UrlRoleGroup,
} from "@/lib/workflow/content-types"

export type AggregateOptions = {
  /** Total URLs the user pasted (may exceed probed pages during quick discover). */
  totalInputUrls?: number
}

export type AggregateResult = {
  roleGroups: UrlRoleGroup[]
  suggestions: Suggestion[]
}

const ROLE_ORDER: PageRole[] = ["listing", "detail", "document", "mixed", "unknown"]

function groupByRole(pages: PageInspection[]): UrlRoleGroup[] {
  const byRole = new Map<PageRole, string[]>()
  for (const page of pages) {
    const list = byRole.get(page.pageRole) ?? []
    list.push(page.url)
    byRole.set(page.pageRole, list)
  }
  return ROLE_ORDER.filter((role) => byRole.has(role)).map((role) => ({
    role,
    urls: byRole.get(role) ?? [],
  }))
}

/** Pick the strongest repeated group on a page (most items, then most fields). */
function dominantGroup(page: PageInspection): RepeatedGroup | null {
  if (page.repeatedGroups.length === 0) return null
  return [...page.repeatedGroups].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count
    return b.sampleFields.length - a.sampleFields.length
  })[0]
}

/** A field is "shared" when it appears on most contributing pages, else optional. */
function computeFieldCoverage(groups: RepeatedGroup[]): SuggestionField[] {
  const total = groups.length
  if (total === 0) return []

  const seen = new Map<string, { type: string; pages: number }>()
  for (const group of groups) {
    const namesOnThisGroup = new Set(group.sampleFields.map((f) => f.name))
    for (const field of group.sampleFields) {
      if (!seen.has(field.name)) {
        seen.set(field.name, { type: field.inferredType, pages: 0 })
      }
    }
    for (const name of namesOnThisGroup) {
      const entry = seen.get(name)
      if (entry) entry.pages += 1
    }
  }

  return [...seen.entries()]
    .map(([name, info]) => ({
      name,
      type: info.type,
      coverage: Number((info.pages / total).toFixed(3)),
    }))
    .sort((a, b) => b.coverage - a.coverage)
}

/** Pick the most common entity name among the dominant groups. */
function consensusEntity(groups: RepeatedGroup[]): string {
  const tally = new Map<string, number>()
  for (const g of groups) tally.set(g.candidateName, (tally.get(g.candidateName) ?? 0) + 1)
  let best = "record"
  let bestN = -1
  for (const [name, n] of tally) {
    if (n > bestN) {
      best = name
      bestN = n
    }
  }
  return best
}

function buildCollectionSuggestion(pages: PageInspection[]): Suggestion | null {
  const dominants = pages
    .map((p) => dominantGroup(p))
    .filter((g): g is RepeatedGroup => g !== null && g.count >= 3)

  if (dominants.length === 0) return null

  const entity = consensusEntity(dominants)
  const fields = computeFieldCoverage(dominants)
  const estimatedRecords = dominants.reduce((sum, g) => sum + g.count, 0)

  // Confidence rises with cross-page consistency and average group confidence.
  const pagesWithRecords = dominants.length
  const consistency = pagesWithRecords / Math.max(pages.length, 1)
  const avgGroupConfidence =
    dominants.reduce((s, g) => s + g.confidence, 0) / dominants.length
  const fieldRichness = Math.min(fields.length / 4, 1)
  const confidence = Number(
    Math.min(1, 0.4 * consistency + 0.4 * avgGroupConfidence + 0.2 * fieldRichness).toFixed(3)
  )

  const sharedFields = fields.filter((f) => f.coverage >= 0.5).map((f) => f.name)
  const fieldHint = sharedFields.slice(0, 4).join(", ")
  const label = fieldHint
    ? `${estimatedRecords} ${entity}-like records · Likely fields: ${fieldHint}`
    : `${estimatedRecords} ${entity}-like records`

  return {
    family: "collection",
    label,
    confidence,
    estimatedRecords,
    fields,
    entity,
  }
}

function buildDocumentSuggestion(pages: PageInspection[]): Suggestion | null {
  // Document-leaning pages: substantial prose, not dominated by repeated records.
  const docPages = pages.filter((p) => {
    const maxGroup = p.repeatedGroups.reduce((m, g) => Math.max(m, g.count), 0)
    const longForm = p.documentSignals.paragraphCount >= 4 || p.documentSignals.textLength >= 1500
    return longForm && maxGroup < 4
  })

  if (docPages.length === 0) return null

  const consistency = docPages.length / Math.max(pages.length, 1)
  const avgText =
    docPages.reduce((s, p) => s + p.documentSignals.textLength, 0) / docPages.length
  const textScore = Math.min(avgText / 6000, 1)
  const confidence = Number(Math.min(1, 0.5 * consistency + 0.5 * textScore).toFixed(3))

  const label =
    docPages.length === 1
      ? `Long-form document${docPages[0].documentSignals.title ? `: ${docPages[0].documentSignals.title}` : ""}`
      : `${docPages.length} long-form documents`

  return {
    family: "document",
    label,
    confidence,
    estimatedRecords: docPages.length,
  }
}

export function aggregate(
  pages: PageInspection[],
  options?: AggregateOptions,
): AggregateResult {
  const roleGroups = groupByRole(pages)
  const totalInputUrls = options?.totalInputUrls ?? pages.length
  const multiUrlIntent = totalInputUrls > 1

  const suggestions: Suggestion[] = []
  const collection = buildCollectionSuggestion(pages)
  if (collection) suggestions.push(collection)
  const document = buildDocumentSuggestion(pages)
  if (document) suggestions.push(document)

  // Multiple pasted URLs imply array/collection output — bias ranking toward Collection.
  if (multiUrlIntent) {
    for (const suggestion of suggestions) {
      if (suggestion.family === "collection") {
        suggestion.confidence = Number(Math.min(1, suggestion.confidence + 0.12).toFixed(3))
      } else if (suggestion.family === "document") {
        suggestion.confidence = Number(Math.max(0.15, suggestion.confidence - 0.1).toFixed(3))
      }
    }
    if (!collection && pages.length > 0) {
      suggestions.push({
        family: "collection",
        label: `${totalInputUrls} URLs pasted — treat as a collection (array output)`,
        confidence: 0.45,
        estimatedRecords: totalInputUrls,
        entity: "record",
      })
    }
  }

  // Always offer Document as a low-confidence fallback so the user is never stuck.
  if (suggestions.length === 0 && pages.length > 0) {
    suggestions.push({
      family: "document",
      label: "Extract page content as a document",
      confidence: 0.25,
      estimatedRecords: pages.length,
    })
  }

  suggestions.sort((a, b) => b.confidence - a.confidence)

  return { roleGroups, suggestions }
}
