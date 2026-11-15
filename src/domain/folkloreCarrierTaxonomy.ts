export type FolkloreCarrierType =
  | 'material_object'
  | 'spoken_phrase'
  | 'repeated_story'
  | 'song'
  | 'customary_action'
  | 'social_game'
  | 'child_to_child_transmission'
  | 'mixed_carrier'
  | 'unknown_fragment'

export interface FolkloreCarrierTag {
  carrierType: FolkloreCarrierType
  confidence: number
  notes?: string
}

export interface FolkloreCaseCarriers {
  caseId: string
  carriers: readonly FolkloreCarrierTag[]
}

/**
 * Deterministic normalization of carrier tags for a folklore case.
 * Supports multi-carrier and mixed without collapsing.
 */
export function normalizeFolkloreCarriers(input: FolkloreCaseCarriers): FolkloreCaseCarriers {
  const normalized = input.carriers
    .map((tag) => ({
      carrierType: tag.carrierType,
      confidence: Math.max(0, Math.min(1, Number(tag.confidence.toFixed(3)))),
      ...(tag.notes ? { notes: tag.notes.trim() } : {}),
    }))
    .filter((tag) => tag.confidence > 0)

  const unique = Array.from(
    new Map(normalized.map((tag) => [tag.carrierType, tag])).values()
  ).sort((a, b) => a.carrierType.localeCompare(b.carrierType))

  return {
    caseId: input.caseId.trim(),
    carriers: unique,
  }
}

export function hasMixedCarrier(carriers: readonly FolkloreCarrierTag[]): boolean {
  return carriers.some((c) => c.carrierType === 'mixed_carrier') || carriers.length > 1
}
