// Minimal squad kit template logic for assignment seam
export interface SquadKitTemplate {
  readonly id: string
  readonly label: string
  readonly requiredItemTags: readonly string[]
  readonly minCoveredCount: number
}

export type SquadKitTemplateCreateFailure =
  | 'invalid_id'
  | 'empty_label'
  | 'empty_required_tags'
  | 'invalid_min_count'

export type SquadKitTemplateCreateResult =
  | { ok: true; template: SquadKitTemplate }
  | { ok: false; error: SquadKitTemplateCreateFailure }

export interface KitMatchResult {
  readonly status: 'match'
  readonly coveredTags: readonly string[]
  readonly coverage: number
}

export interface KitMismatchResult {
  readonly status: 'mismatch'
  readonly coveredTags: readonly string[]
  readonly missingTags: readonly string[]
  readonly shortfall: number
}

export type SquadKitEvalResult = KitMatchResult | KitMismatchResult

export function createSquadKitTemplate(fields: {
  id: string
  label: string
  requiredItemTags: readonly string[]
  minCoveredCount: number
}): SquadKitTemplateCreateResult {
  if (!fields.id || fields.id.trim() === '') {
    return { ok: false, error: 'invalid_id' }
  }
  if (!fields.label || fields.label.trim() === '') {
    return { ok: false, error: 'empty_label' }
  }
  if (!fields.requiredItemTags || fields.requiredItemTags.length === 0) {
    return { ok: false, error: 'empty_required_tags' }
  }
  if (
    !Number.isInteger(fields.minCoveredCount) ||
    fields.minCoveredCount < 1 ||
    fields.minCoveredCount > fields.requiredItemTags.length
  ) {
    return { ok: false, error: 'invalid_min_count' }
  }
  return {
    ok: true,
    template: {
      id: fields.id.trim(),
      label: fields.label.trim(),
      requiredItemTags: fields.requiredItemTags,
      minCoveredCount: fields.minCoveredCount,
    },
  }
}

export function evaluateSquadKitMatch(
  template: SquadKitTemplate,
  squadItemTags: readonly string[],
): SquadKitEvalResult {
  const squadTagSet = new Set(squadItemTags)
  const covered: string[] = []
  const missing: string[] = []

  for (const tag of template.requiredItemTags) {
    if (squadTagSet.has(tag)) {
      covered.push(tag)
    } else {
      missing.push(tag)
    }
  }

  if (covered.length >= template.minCoveredCount) {
    return {
      status: 'match',
      coveredTags: covered,
      coverage: covered.length,
    }
  }

  return {
    status: 'mismatch',
    coveredTags: covered,
    missingTags: missing,
    shortfall: template.minCoveredCount - covered.length,
  }
}
