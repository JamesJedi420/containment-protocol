/**
 * SPE-1615 slice 3: weekly orchestration for persisted psychological resilience records.
 *
 * Pure deterministic tick: project exposure/depletion signals and advance depletionBand
 * one bounded step when score/event-count thresholds warrant. Preserves treatment/rest
 * flags unless an explicit breakdown transition applies.
 */

import {
  projectPsychologicalResilienceReview,
  validatePsychologicalResilienceRecord,
  type PsychologicalResilienceProjection,
  type PsychologicalResilienceRecord,
  type PsychologicalResilienceRecordsMap,
  type ResilienceDepletionBand,
} from './psychologicalResilienceRegistry'

const STABLE_TO_STRAINED_EVENT_COUNT_THRESHOLD = 3
const STRAINED_TO_DEPLETED_SCORE_THRESHOLD = 0.55
const STRAINED_TO_DEPLETED_EVENT_COUNT_THRESHOLD = 4
const DEPLETED_TO_COMPROMISED_SCORE_THRESHOLD = 0.65
const DEPLETED_TO_COMPROMISED_EVENT_COUNT_THRESHOLD = 5
const COMPROMISED_TO_BREAKDOWN_SCORE_THRESHOLD = 0.8
const COMPROMISED_TO_BREAKDOWN_EVENT_COUNT_THRESHOLD = 7

function normalizeWeek(week: number): number {
  if (!Number.isFinite(week)) {
    return 1
  }

  return Math.max(1, Math.trunc(week))
}

function freezeRecord(record: PsychologicalResilienceRecord): PsychologicalResilienceRecord {
  return Object.freeze({ ...record })
}

/** Target depletion band from weekly projection signals; undefined when no transition applies. */
export function resolveTargetDepletionBandFromProjection(
  record: PsychologicalResilienceRecord,
  projection: PsychologicalResilienceProjection
): ResilienceDepletionBand | undefined {
  const band = record.depletionBand
  const exposureScore = projection.exposureScore
  const exposureEventCount = projection.exposureEventCount

  if (band === 'breakdown') {
    return undefined
  }

  if (band === 'stable') {
    if (
      projection.exposureElevated ||
      exposureEventCount >= STABLE_TO_STRAINED_EVENT_COUNT_THRESHOLD
    ) {
      return 'strained'
    }

    return undefined
  }

  if (exposureScore === null) {
    return undefined
  }

  if (band === 'strained') {
    if (
      exposureScore >= STRAINED_TO_DEPLETED_SCORE_THRESHOLD &&
      exposureEventCount >= STRAINED_TO_DEPLETED_EVENT_COUNT_THRESHOLD
    ) {
      return 'depleted'
    }

    return undefined
  }

  if (band === 'depleted') {
    if (
      exposureScore >= DEPLETED_TO_COMPROMISED_SCORE_THRESHOLD &&
      exposureEventCount >= DEPLETED_TO_COMPROMISED_EVENT_COUNT_THRESHOLD &&
      projection.complicationActive
    ) {
      return 'compromised'
    }

    return undefined
  }

  if (band === 'compromised') {
    if (
      exposureScore >= COMPROMISED_TO_BREAKDOWN_SCORE_THRESHOLD &&
      exposureEventCount >= COMPROMISED_TO_BREAKDOWN_EVENT_COUNT_THRESHOLD
    ) {
      return 'breakdown'
    }

    return undefined
  }

  return undefined
}

function applyBreakdownTreatmentGate(
  record: PsychologicalResilienceRecord
): PsychologicalResilienceRecord {
  return {
    ...record,
    treatmentRequired: true,
    restRecoverable: false,
    recoveryChannel: 'treatment_required',
  }
}

function buildWeeklyAdvanceCandidate(
  record: PsychologicalResilienceRecord
): PsychologicalResilienceRecord | undefined {
  const projection = projectPsychologicalResilienceReview(record)
  const targetBand = resolveTargetDepletionBandFromProjection(record, projection)

  if (!targetBand || targetBand === record.depletionBand) {
    return undefined
  }

  const candidate: PsychologicalResilienceRecord = {
    ...record,
    depletionBand: targetBand,
  }

  if (targetBand === 'breakdown') {
    return applyBreakdownTreatmentGate(candidate)
  }

  return candidate
}

/**
 * Advances one resilience record for the simulation week using projected exposure semantics.
 * Returns the same reference when no bounded field changes.
 */
export function advancePsychologicalResilienceRecordForWeek(
  record: PsychologicalResilienceRecord,
  week: number
): PsychologicalResilienceRecord {
  normalizeWeek(week)
  const candidate = buildWeeklyAdvanceCandidate(record)
  if (!candidate) {
    return record
  }

  if (!validatePsychologicalResilienceRecord(candidate).valid) {
    return record
  }

  return freezeRecord(candidate)
}

/**
 * Applies one weekly psychological-resilience depletion pass over persisted records.
 * Empty map is a no-op. Re-applying after advance is idempotent for the same week.
 */
export function applyWeeklyPsychologicalResilienceDepletionTick(
  records: PsychologicalResilienceRecordsMap | null | undefined,
  week: number
): PsychologicalResilienceRecordsMap {
  const safeRecords = records ?? {}
  const recordIds = Object.keys(safeRecords)
  if (recordIds.length === 0) {
    return safeRecords
  }

  const normalizedWeek = normalizeWeek(week)
  const next: PsychologicalResilienceRecordsMap = { ...safeRecords }
  let changed = false

  for (const recordId of recordIds.sort((left, right) => left.localeCompare(right))) {
    const record = safeRecords[recordId]
    if (!record) {
      continue
    }

    const advanced = advancePsychologicalResilienceRecordForWeek(record, normalizedWeek)
    if (advanced !== record) {
      next[recordId] = advanced
      changed = true
    }
  }

  return changed ? next : safeRecords
}
