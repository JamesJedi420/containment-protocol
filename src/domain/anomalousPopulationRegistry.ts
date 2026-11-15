/**
 * SPE-2097 slice 1: deterministic anomalous population registry.
 *
 * Pure helper. No GameState, UI, or biological-pool tick.
 * Population records are distinct from factions, civilizations, settlements, and individual ActorClass.
 * No external franchise species names or SoI IDs.
 */

export const POPULATION_KINDS = [
  'sapient_community',
  'engineered_cohort',
  'cryptobiome_pool',
  'informational_collective',
  'remnant_lineage',
  'disputed_taxon',
] as const
export type PopulationKind = (typeof POPULATION_KINDS)[number]

export const SAPIENCE_BANDS = ['non_sapient', 'limited', 'full', 'disputed'] as const
export type SapienceBand = (typeof SAPIENCE_BANDS)[number]

export const CONTAINMENT_POSTURES = [
  'fully_contained',
  'negotiated_coexistence',
  'monitored_autonomy',
  'unresolved',
] as const
export type ContainmentPosture = (typeof CONTAINMENT_POSTURES)[number]

export const SECRECY_STATES = ['public', 'restricted', 'hidden', 'assimilated'] as const
export type SecrecyState = (typeof SECRECY_STATES)[number]

export const TRANSLATION_STATUSES = ['translated', 'partial', 'untranslated'] as const
export type TranslationStatus = (typeof TRANSLATION_STATUSES)[number]

export interface IdentityDivergencePacket {
  readonly visibleAppearance: string
  readonly legalClass: string
  readonly culturalIdentity: string
  readonly lineage: string
  readonly coverStory: string
  readonly language: string
  readonly civicParticipation: string
}

export interface PopulationRevision {
  readonly week: number
  readonly priorPatch: string
  readonly reasonCode: string
}

export interface AnomalousPopulationRecord {
  readonly registryId: string
  readonly displayName: string
  readonly localNames: readonly string[]
  readonly aliases: readonly string[]
  readonly populationKind: PopulationKind
  readonly sapienceBand: SapienceBand
  readonly socialOrganization: string
  readonly containmentPosture: ContainmentPosture
  readonly secrecyState: SecrecyState
  readonly publicVisibility: string
  readonly translationStatus: TranslationStatus
  readonly provenance: string
  readonly confidence: number
  readonly relatedPopulationIds: readonly string[]
  readonly branchOriginId?: string
  readonly identityDivergence?: IdentityDivergencePacket
  readonly revisions: readonly PopulationRevision[]
  readonly linkedFactionIds?: readonly string[]
}

export interface PopulationValidationIssue {
  readonly code: string
  readonly field: string
  readonly registryId?: string
  readonly severity: 'error' | 'warning'
}

export interface PopulationValidationResult {
  readonly valid: boolean
  readonly issues: readonly PopulationValidationIssue[]
}

export interface ViewerContext {
  readonly clearanceLevel: number
}

export type ProjectedPopulationRecord = Omit<AnomalousPopulationRecord, 'secrecyState' | 'identityDivergence'> & {
  readonly secrecyState?: SecrecyState
  readonly identityDivergence?: IdentityDivergencePacket
  readonly redactedFields: readonly string[]
}

const KIND_SET = new Set(POPULATION_KINDS)
const BAND_SET = new Set(SAPIENCE_BANDS)
const POSTURE_SET = new Set(CONTAINMENT_POSTURES)
const SECRECY_SET = new Set(SECRECY_STATES)
const TRANSLATION_SET = new Set(TRANSLATION_STATUSES)

const REGISTRY_ID = /^pop:[a-z0-9]+(?:-[a-z0-9]+)*$/

function isHiddenOrAssimilated(state: SecrecyState): boolean {
  return state === 'hidden' || state === 'assimilated'
}

export function validatePopulationRecord(record: AnomalousPopulationRecord): PopulationValidationResult {
  const issues: PopulationValidationIssue[] = []

  if (!REGISTRY_ID.test(record.registryId)) {
    issues.push({ code: 'invalid_registry_id', field: 'registryId', registryId: record.registryId, severity: 'error' })
  }

  if (!KIND_SET.has(record.populationKind)) {
    issues.push({ code: 'invalid_population_kind', field: 'populationKind', registryId: record.registryId, severity: 'error' })
  }

  if (!BAND_SET.has(record.sapienceBand)) {
    issues.push({ code: 'invalid_sapience_band', field: 'sapienceBand', registryId: record.registryId, severity: 'error' })
  }

  if (!POSTURE_SET.has(record.containmentPosture)) {
    issues.push({ code: 'invalid_containment_posture', field: 'containmentPosture', registryId: record.registryId, severity: 'error' })
  }

  if (!SECRECY_SET.has(record.secrecyState)) {
    issues.push({ code: 'invalid_secrecy_state', field: 'secrecyState', registryId: record.registryId, severity: 'error' })
  }

  if (!TRANSLATION_SET.has(record.translationStatus)) {
    issues.push({ code: 'invalid_translation_status', field: 'translationStatus', registryId: record.registryId, severity: 'error' })
  }

  if (isHiddenOrAssimilated(record.secrecyState) && !record.identityDivergence) {
    issues.push({
      code: 'missing_identity_divergence',
      field: 'identityDivergence',
      registryId: record.registryId,
      severity: 'error',
    })
  }

  if (record.linkedFactionIds?.includes(record.registryId)) {
    issues.push({
      code: 'species_faction_collapse',
      field: 'linkedFactionIds',
      registryId: record.registryId,
      severity: 'warning',
    })
  }

  // Simple cycle check on relatedPopulationIds (self-ref)
  if (record.relatedPopulationIds.includes(record.registryId)) {
    issues.push({
      code: 'equivalence_cycle',
      field: 'relatedPopulationIds',
      registryId: record.registryId,
      severity: 'error',
    })
  }

  const normalizedLocal = record.localNames.map((n) => n.toLowerCase().trim())
  const unique = new Set(normalizedLocal)
  if (unique.size < normalizedLocal.length) {
    issues.push({
      code: 'duplicate_normalized_local_name',
      field: 'localNames',
      registryId: record.registryId,
      severity: 'warning',
    })
  }

  return { valid: issues.every((i) => i.severity !== 'error'), issues }
}

export function projectPopulationRecord(
  record: AnomalousPopulationRecord,
  viewer: ViewerContext,
): ProjectedPopulationRecord {
  const redacted: string[] = []
  let projected: ProjectedPopulationRecord = { ...record, redactedFields: [] }

  if (viewer.clearanceLevel < 3) {
    redacted.push('secrecyState')
    const { secrecyState: _, ...rest } = projected
    projected = { ...rest, redactedFields: redacted }
  }

  if (record.translationStatus === 'untranslated' && viewer.clearanceLevel < 4) {
    redacted.push('populationKind', 'sapienceBand')
    projected = { ...projected, populationKind: 'disputed_taxon' as PopulationKind, sapienceBand: 'disputed' as SapienceBand, redactedFields: [...redacted] }
  }

  // Stable: sort related ids
  projected = {
    ...projected,
    relatedPopulationIds: [...record.relatedPopulationIds].sort(),
    redactedFields: [...new Set(redacted)].sort(),
  }

  return projected
}

export function appendPopulationRevision(
  record: AnomalousPopulationRecord,
  week: number,
  reasonCode: string,
  priorPatch: string,
): AnomalousPopulationRecord {
  const revision: PopulationRevision = { week, priorPatch, reasonCode }
  return {
    ...record,
    revisions: [...record.revisions, revision],
  }
}
