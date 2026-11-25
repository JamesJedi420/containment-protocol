/**
 * SPE-1416: deterministic anomaly-dependency registry (slice 1).
 *
 * Records explicit local dependents of a persistent anomaly or field.
 * Dependence kinds and benefit/recovery classification are authored metadata.
 * This is not a live ecology engine, GameState field, or neutralization simulator.
 */

export const DEPENDENCE_KINDS = [
  'biological',
  'social',
  'infrastructural',
  'procedural',
  'recovery',
] as const
export type DependenceKind = (typeof DEPENDENCE_KINDS)[number]

export const BENEFIT_TYPES = ['direct', 'hidden', 'recovery_only'] as const
export type BenefitType = (typeof BENEFIT_TYPES)[number]

const DEPENDENT_REF = /^dependent:[a-z0-9]+(?:-[a-z0-9]+)*$/
const ANOMALY_REF = /^anomaly:[a-z0-9]+(?:-[a-z0-9]+)*$/
const RECORD_ID = /^dep-rec:[a-z0-9]+(?:-[a-z0-9]+)*$/

export interface AnomalyDependencyRecord {
  readonly id: string
  readonly anomalyRef: string
  readonly dependentRef: string
  readonly dependenceKind: DependenceKind
  readonly benefitType: BenefitType
  readonly notes?: string
}

export interface DependencyValidationIssue {
  readonly code: string
  readonly field: string
  readonly recordId?: string
}

export interface DependencyValidationResult {
  readonly valid: boolean
  readonly issues: readonly DependencyValidationIssue[]
}

export type DependencyLookup =
  | { readonly status: 'found'; readonly record: AnomalyDependencyRecord }
  | { readonly status: 'unknown_record_id' }
  | { readonly status: 'ambiguous_record_id' }
  | { readonly status: 'invalid_record_id' }
  | { readonly status: 'invalid_record' }

const KIND_SET: ReadonlySet<string> = new Set(DEPENDENCE_KINDS)
const BENEFIT_SET: ReadonlySet<string> = new Set(BENEFIT_TYPES)

function compareStrings(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

function token(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function freezeRecord(input: AnomalyDependencyRecord): AnomalyDependencyRecord {
  return Object.freeze({
    id: input.id,
    anomalyRef: input.anomalyRef,
    dependentRef: input.dependentRef,
    dependenceKind: input.dependenceKind,
    benefitType: input.benefitType,
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
  })
}

function issuesResult(issues: DependencyValidationIssue[]): DependencyValidationResult {
  const ordered = issues
    .slice()
    .sort(
      (a, b) =>
        compareStrings(a.code, b.code) ||
        compareStrings(a.field, b.field) ||
        compareStrings(a.recordId ?? '', b.recordId ?? '')
    )
  return Object.freeze({
    valid: ordered.length === 0,
    issues: Object.freeze(ordered.map((issue) => Object.freeze({ ...issue }))),
  })
}

function validateRecord(
  input: unknown,
  index: number,
  issues: DependencyValidationIssue[]
): AnomalyDependencyRecord | null {
  const field = `records[${index}]`
  if (!isPlainRecord(input)) {
    issues.push({ code: 'invalid_record', field })
    return null
  }

  const id = token(input.id)
  const anomalyRef = token(input.anomalyRef)
  const dependentRef = token(input.dependentRef)
  const dependenceKind = token(input.dependenceKind)
  const benefitType = token(input.benefitType)
  let legal = true

  if (!RECORD_ID.test(id)) {
    issues.push({
      code: 'invalid_record_id',
      field: `${field}.id`,
      ...(id ? { recordId: id } : {}),
    })
    legal = false
  }
  if (!ANOMALY_REF.test(anomalyRef)) {
    issues.push({
      code: 'invalid_anomaly_ref',
      field: `${field}.anomalyRef`,
      ...(id ? { recordId: id } : {}),
    })
    legal = false
  }
  if (!DEPENDENT_REF.test(dependentRef)) {
    issues.push({
      code: 'invalid_dependent_ref',
      field: `${field}.dependentRef`,
      ...(id ? { recordId: id } : {}),
    })
    legal = false
  }
  if (!KIND_SET.has(dependenceKind)) {
    issues.push({
      code: 'unknown_dependence_kind',
      field: `${field}.dependenceKind`,
      ...(id ? { recordId: id } : {}),
    })
    legal = false
  }
  if (!BENEFIT_SET.has(benefitType)) {
    issues.push({
      code: 'unknown_benefit_type',
      field: `${field}.benefitType`,
      ...(id ? { recordId: id } : {}),
    })
    legal = false
  }

  let notes: string | undefined
  if (input.notes !== undefined) {
    const value = token(input.notes)
    if (typeof input.notes !== 'string' || value.length === 0) {
      issues.push({
        code: 'invalid_notes',
        field: `${field}.notes`,
        ...(id ? { recordId: id } : {}),
      })
      legal = false
    } else {
      notes = value
    }
  }

  if (!legal) return null

  return freezeRecord({
    id,
    anomalyRef,
    dependentRef,
    dependenceKind: dependenceKind as DependenceKind,
    benefitType: benefitType as BenefitType,
    ...(notes !== undefined ? { notes } : {}),
  })
}

/**
 * Accept a list of dependency records.
 * Explicit anomaly and dependent refs are required.
 * Unknown kinds/types fail closed. Input order is not significant for validity.
 */
export function validateAnomalyDependencyRecords(input: unknown): DependencyValidationResult {
  if (!Array.isArray(input)) {
    return issuesResult([{ code: 'invalid_registry', field: 'records' }])
  }

  const issues: DependencyValidationIssue[] = []
  const seenIds = new Set<string>()

  for (let index = 0; index < input.length; index += 1) {
    const record = validateRecord(input[index], index, issues)
    if (!record) continue
    if (seenIds.has(record.id)) {
      issues.push({
        code: 'duplicate_record_id',
        field: `records[${index}].id`,
        recordId: record.id,
      })
    }
    seenIds.add(record.id)
  }

  return issuesResult(issues)
}

/** Frozen copy sorted by record id. Returns null when validation fails. */
export function normalizeAnomalyDependencyRecords(
  input: readonly AnomalyDependencyRecord[]
): readonly AnomalyDependencyRecord[] | null {
  const validation = validateAnomalyDependencyRecords(input)
  if (!validation.valid) return null
  const ordered = input
    .map((record, index) => validateRecord(record, index, [])!)
    .sort((a, b) => compareStrings(a.id, b.id))
  return Object.freeze(ordered)
}

export function lookupAnomalyDependencyRecord(
  records: readonly AnomalyDependencyRecord[],
  recordId: string
): DependencyLookup {
  const id = token(recordId)
  if (!RECORD_ID.test(id)) {
    return Object.freeze({ status: 'invalid_record_id' })
  }
  const matches = records.filter((record) => token(record.id) === id)
  if (matches.length === 0) return Object.freeze({ status: 'unknown_record_id' })
  if (matches.length > 1) return Object.freeze({ status: 'ambiguous_record_id' })
  const record = validateRecord(matches[0], 0, [])
  if (!record) return Object.freeze({ status: 'invalid_record' })
  return Object.freeze({ status: 'found', record })
}

/** Authored slice-1 fixtures. Not live simulation state. */
export const ANOMALY_DEPENDENCY_FIXTURES: readonly AnomalyDependencyRecord[] = Object.freeze([
  Object.freeze({
    id: 'dep-rec:healing-grove-residents',
    anomalyRef: 'anomaly:healing-grove',
    dependentRef: 'dependent:grove-community',
    dependenceKind: 'social',
    benefitType: 'direct',
    notes: 'Community health rituals rely on grove field',
  }),
  Object.freeze({
    id: 'dep-rec:field-powered-gate',
    anomalyRef: 'anomaly:barrier-field',
    dependentRef: 'dependent:gate-mechanism',
    dependenceKind: 'infrastructural',
    benefitType: 'hidden',
  }),
  Object.freeze({
    id: 'dep-rec:recovery-path-patient',
    anomalyRef: 'anomaly:temporal-anchor',
    dependentRef: 'dependent:patient-042',
    dependenceKind: 'recovery',
    benefitType: 'recovery_only',
    notes: 'Unresolved temporal reversal requires continued anchor',
  }),
])
