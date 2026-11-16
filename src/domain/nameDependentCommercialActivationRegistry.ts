/**
 * SPE-2151 — name-dependent commercial activation registry (slice 1).
 *
 * Bounded exact-name / venue activation metadata under SPE-1033.
 * Does not implement activation effects, exposure mechanics, public-health state,
 * or a business/naming engine.
 */

export const NAME_DEPENDENT_COMMERCIAL_ACTIVATION_SCHEMA_VERSION =
  'spe-2151.v1' as const
export type NameDependentCommercialActivationSchemaVersion =
  typeof NAME_DEPENDENT_COMMERCIAL_ACTIVATION_SCHEMA_VERSION

export type ActivationRecordId = string

export type VenueClass =
  | 'retail'
  | 'hospitality'
  | 'entertainment'
  | 'service'
  | 'other'

export type PublicHealthRiskLevel = 'none' | 'low' | 'moderate' | 'high' | 'unknown'

export interface RegionalVariationRef {
  readonly regionId: string
  readonly note?: string
}

export interface NameDependentCommercialActivationRecord {
  readonly recordId: ActivationRecordId
  /** Authored trigger predicate: exact name required for activation. */
  readonly exactNameRequirement: string
  /** Venue classification, kept separate from the name predicate. */
  readonly venueClass: VenueClass
  /** Configuration/context refs for regional variation; not a second store. */
  readonly regionalVariationRefs: readonly RegionalVariationRef[]
  /** Downstream consequence/reference only; no public-health authority. */
  readonly publicHealthRisk: PublicHealthRiskLevel
}

export interface NameDependentCommercialActivationRegistry {
  readonly schemaVersion: NameDependentCommercialActivationSchemaVersion
  readonly records: Readonly<Record<string, NameDependentCommercialActivationRecord>>
}

export function createEmptyNameDependentCommercialActivationRegistry(): NameDependentCommercialActivationRegistry {
  return Object.freeze({
    schemaVersion: NAME_DEPENDENT_COMMERCIAL_ACTIVATION_SCHEMA_VERSION,
    records: Object.freeze(
      Object.create(null) as Record<string, NameDependentCommercialActivationRecord>,
    ),
  })
}

function freezeRecord(
  record: NameDependentCommercialActivationRecord,
): NameDependentCommercialActivationRecord {
  return Object.freeze({
    ...record,
    regionalVariationRefs: Object.freeze([...record.regionalVariationRefs]),
  })
}

export function upsertNameDependentCommercialActivation(
  registry: NameDependentCommercialActivationRegistry,
  record: NameDependentCommercialActivationRecord,
): NameDependentCommercialActivationRegistry {
  const recordId = record.recordId.trim()
  if (!recordId) {
    throw new Error('recordId must be non-empty')
  }
  if (!record.exactNameRequirement.trim()) {
    throw new Error('exactNameRequirement must be non-empty')
  }
  const next: Record<string, NameDependentCommercialActivationRecord> = Object.create(
    null,
  )
  for (const [id, entry] of Object.entries(registry.records)) {
    next[id] = entry
  }
  next[recordId] = freezeRecord({ ...record, recordId })
  return Object.freeze({
    ...registry,
    records: Object.freeze(next),
  })
}

export function lookupNameDependentCommercialActivation(
  registry: NameDependentCommercialActivationRegistry,
  recordId: ActivationRecordId,
): NameDependentCommercialActivationRecord | null {
  const id = recordId.trim()
  return registry.records[id] ?? null
}

export type ValidationErrorCode =
  | 'empty_record_id'
  | 'empty_exact_name'
  | 'unknown_venue_class'
  | 'unknown_public_health_risk'
  | 'duplicate_record_id'

const LEGAL_VENUE: ReadonlySet<VenueClass> = new Set([
  'retail',
  'hospitality',
  'entertainment',
  'service',
  'other',
])

const LEGAL_RISK: ReadonlySet<PublicHealthRiskLevel> = new Set([
  'none',
  'low',
  'moderate',
  'high',
  'unknown',
])

export function validateNameDependentCommercialActivationRecord(
  record: NameDependentCommercialActivationRecord,
): ValidationErrorCode[] {
  const errors: ValidationErrorCode[] = []
  if (!record.recordId.trim()) errors.push('empty_record_id')
  if (!record.exactNameRequirement.trim()) errors.push('empty_exact_name')
  if (!LEGAL_VENUE.has(record.venueClass)) errors.push('unknown_venue_class')
  if (!LEGAL_RISK.has(record.publicHealthRisk)) errors.push('unknown_public_health_risk')
  return errors
}

export function validateRegistry(
  registry: NameDependentCommercialActivationRegistry,
): { ok: true } | { ok: false; errors: ValidationErrorCode[] } {
  const seen = new Set<string>()
  const errors: ValidationErrorCode[] = []
  for (const record of Object.values(registry.records)) {
    const id = record.recordId.trim()
    if (seen.has(id)) errors.push('duplicate_record_id')
    seen.add(id)
    errors.push(...validateNameDependentCommercialActivationRecord(record))
  }
  return errors.length === 0 ? { ok: true } : { ok: false, errors }
}
