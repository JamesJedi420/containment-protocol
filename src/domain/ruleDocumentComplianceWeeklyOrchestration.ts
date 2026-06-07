/**
 * SPE-2123 slice 3: weekly compliance-decay advance for persisted rule-document compliance records.
 *
 * Pure deterministic tick: project decay at the simulation week and advance complianceState
 * when the forecast band warrants a bounded transition. Does not add persistence fields or
 * mutate projection-only reads.
 */

import {
  projectComplianceDecay,
  validateRuleDocumentComplianceRecord,
  type ComplianceDecayBand,
  type ComplianceDecayProjection,
  type ComplianceState,
  type RuleDocumentComplianceRecord,
  type RuleDocumentComplianceRecordsMap,
} from './ruleDocumentComplianceContainmentRegistry'

function normalizeWeek(week: number): number {
  if (!Number.isFinite(week)) {
    return 1
  }

  return Math.max(1, Math.trunc(week))
}

function freezeRecord(record: RuleDocumentComplianceRecord): RuleDocumentComplianceRecord {
  return Object.freeze({ ...record })
}

/** Target compliance state implied by a decay-band forecast; undefined when no transition applies. */
export function resolveTargetComplianceStateFromDecayBand(
  record: RuleDocumentComplianceRecord,
  band: ComplianceDecayBand | null
): ComplianceState | undefined {
  if (record.complianceState === 'breach') {
    return undefined
  }

  if (band === null || band === 'stable') {
    return undefined
  }

  const current = record.complianceState

  if (band === 'critical') {
    if (record.breachConsequence !== undefined && current !== 'breach') {
      return 'breach'
    }

    if (current === 'compliant' || current === 'unknown') {
      return 'drifting'
    }

    return undefined
  }

  if (current === 'compliant' || current === 'unknown') {
    return 'drifting'
  }

  return undefined
}

/** Target compliance state from a decay projection; undefined when projection is redacted or terminal. */
export function resolveTargetComplianceStateFromProjection(
  record: RuleDocumentComplianceRecord,
  projection: ComplianceDecayProjection
): ComplianceState | undefined {
  if (projection.driftProbabilityPerWeek === null || projection.complianceDecayBand === null) {
    return undefined
  }

  return resolveTargetComplianceStateFromDecayBand(record, projection.complianceDecayBand)
}

const DRIFT_PROJECTION_FIELDS = [
  'bindingStrength',
  'complianceState',
  'physicalCopyRequired',
  'revisionHistoryRefs',
] as const

function shouldRedactUnknownProjectionFields(record: RuleDocumentComplianceRecord): boolean {
  const unknownFields = record.unknownFields ?? []
  return DRIFT_PROJECTION_FIELDS.some((field) => unknownFields.includes(field))
}

function buildWeeklyAdvanceCandidate(
  record: RuleDocumentComplianceRecord,
  week: number
): RuleDocumentComplianceRecord | undefined {
  if (record.complianceState === 'breach') {
    return undefined
  }

  const projection = projectComplianceDecay(record, {
    currentWeek: week,
    ...(shouldRedactUnknownProjectionFields(record) ? { redactUnknown: true } : {}),
  })
  const targetState = resolveTargetComplianceStateFromProjection(record, projection)

  if (!targetState || targetState === record.complianceState) {
    return undefined
  }

  return {
    ...record,
    complianceState: targetState,
  }
}

/**
 * Advances one record for the simulation week using projected compliance-decay band semantics.
 * Returns the same reference when no bounded field changes.
 */
export function advanceRuleDocumentComplianceRecordForWeek(
  record: RuleDocumentComplianceRecord,
  week: number
): RuleDocumentComplianceRecord {
  const normalizedWeek = normalizeWeek(week)
  const candidate = buildWeeklyAdvanceCandidate(record, normalizedWeek)
  if (!candidate) {
    return record
  }

  if (!validateRuleDocumentComplianceRecord(candidate).valid) {
    return record
  }

  return freezeRecord(candidate)
}

/**
 * Applies one weekly compliance-decay pass over persisted rule-document compliance records.
 * Empty map is a no-op. Re-applying after advance is idempotent for the same week.
 */
export function applyWeeklyRuleDocumentComplianceTick(
  records: RuleDocumentComplianceRecordsMap | null | undefined,
  week: number
): RuleDocumentComplianceRecordsMap {
  const safeRecords = records ?? {}
  const recordIds = Object.keys(safeRecords)
  if (recordIds.length === 0) {
    return safeRecords
  }

  const normalizedWeek = normalizeWeek(week)
  const next: RuleDocumentComplianceRecordsMap = { ...safeRecords }
  let changed = false

  for (const recordId of recordIds.sort((left, right) => left.localeCompare(right))) {
    const record = safeRecords[recordId]
    if (!record) {
      continue
    }

    const advanced = advanceRuleDocumentComplianceRecordForWeek(record, normalizedWeek)
    if (advanced !== record) {
      next[recordId] = advanced
      changed = true
    }
  }

  return changed ? next : safeRecords
}
