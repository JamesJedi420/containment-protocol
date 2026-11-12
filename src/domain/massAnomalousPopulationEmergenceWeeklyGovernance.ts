/**
 * SPE-2122 slice 3: weekly registration-backlog decay for persisted mass anomalous
 * population emergence records.
 *
 * Pure deterministic tick: each week decrements registrationBacklogWeeks while positive
 * (floor at 0). Governance surge band is derived at read time via projectGovernanceSurge
 * with currentWeek policy — not persisted. Does not add persistence fields or mutate
 * unrelated record data.
 */

import {
  projectGovernanceSurge,
  validatePopulationEmergenceRecord,
  type GovernanceSurgeBand,
  type GovernanceSurgeProjection,
  type MassAnomalousPopulationEmergenceRecordsMap,
  type PopulationEmergenceRecord,
} from './massAnomalousPopulationEmergenceRegistry'

function normalizeWeek(week: number): number {
  if (!Number.isFinite(week)) {
    return 1
  }

  return Math.max(1, Math.trunc(week))
}

function isValidNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function freezeRecord(record: PopulationEmergenceRecord): PopulationEmergenceRecord {
  return Object.freeze({ ...record })
}

/** Next registration backlog weeks after one weekly decay step; floors at 0. */
export function resolveNextRegistrationBacklogWeeks(current: number): number {
  if (!isValidNonNegativeNumber(current) || current <= 0) {
    return 0
  }

  return current - 1
}

/**
 * Deterministic governance-surge projection for the simulation week. Surge band is
 * re-derived from persisted record fields plus week-drift policy — not stored on GameState.
 */
export function resolvePopulationEmergenceGovernanceSurgeForWeek(
  record: PopulationEmergenceRecord,
  week: number
): GovernanceSurgeProjection {
  return projectGovernanceSurge(record, { currentWeek: normalizeWeek(week) })
}

/** Governance surge band for the simulation week; null when projection inputs are masked. */
export function resolvePopulationEmergenceGovernanceSurgeBandForWeek(
  record: PopulationEmergenceRecord,
  week: number
): GovernanceSurgeBand | null {
  return resolvePopulationEmergenceGovernanceSurgeForWeek(record, week).governanceSurgeBand
}

function buildBacklogDecayCandidate(
  record: PopulationEmergenceRecord
): PopulationEmergenceRecord | undefined {
  const currentBacklog = record.registrationBacklogWeeks
  if (!isValidNonNegativeNumber(currentBacklog) || currentBacklog <= 0) {
    return undefined
  }

  const nextBacklog = resolveNextRegistrationBacklogWeeks(currentBacklog)
  if (nextBacklog === currentBacklog) {
    return undefined
  }

  return {
    ...record,
    registrationBacklogWeeks: nextBacklog,
  }
}

/**
 * Advances one record for the simulation week: registration backlog decay.
 * Returns the same reference when no bounded field changes.
 */
export function advancePopulationEmergenceRecordForWeek(
  record: PopulationEmergenceRecord,
  week: number
): PopulationEmergenceRecord {
  void normalizeWeek(week)

  const candidate = buildBacklogDecayCandidate(record)
  if (!candidate) {
    return record
  }

  if (!validatePopulationEmergenceRecord(candidate).valid) {
    return record
  }

  return freezeRecord(candidate)
}

/**
 * Applies one weekly governance pass over persisted mass anomalous population emergence records.
 * Empty map is a no-op. Re-applying after backlog reaches zero is idempotent for the same week.
 */
export function applyWeeklyPopulationEmergenceGovernanceTick(
  records: MassAnomalousPopulationEmergenceRecordsMap | null | undefined,
  week: number
): MassAnomalousPopulationEmergenceRecordsMap {
  const safeRecords = records ?? {}
  const recordIds = Object.keys(safeRecords)
  if (recordIds.length === 0) {
    return safeRecords
  }

  const normalizedWeek = normalizeWeek(week)
  const next: MassAnomalousPopulationEmergenceRecordsMap = { ...safeRecords }
  let changed = false

  for (const recordId of recordIds.sort((left, right) => left.localeCompare(right))) {
    const record = safeRecords[recordId]
    if (!record) {
      continue
    }

    const advanced = advancePopulationEmergenceRecordForWeek(record, normalizedWeek)
    if (advanced !== record) {
      next[recordId] = advanced
      changed = true
    }
  }

  return changed ? next : safeRecords
}
