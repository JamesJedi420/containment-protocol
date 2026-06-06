/**
 * SPE-2115 slice 3: weekly orchestration for persisted contained-person therapeutic care records.
 *
 * Pure deterministic tick: cadence-based missed-session streak increment and channel
 * degradation when compliance drift continues. Does not add persistence fields or wire
 * SPE-1889 integrated health bundle.
 */

import {
  validateTherapeuticCareScheduleRecord,
  type CareCadence,
  type ChannelState,
  type TherapeuticCareScheduleRecord,
  type TherapeuticCareScheduleRecordsMap,
} from './containedPersonTherapeuticCareRegistry'

/** Matches HIGH_MISSED_STREAK_THRESHOLD in containedPersonTherapeuticCareRegistry. */
const ACTIVE_TO_DEGRADED_STREAK_THRESHOLD = 2
const DEGRADED_TO_SUSPENDED_STREAK_THRESHOLD = 4

const CARE_CADENCE_WEEK_INTERVAL: Readonly<Record<CareCadence, number>> = {
  weekly: 1,
  biweekly: 2,
}

function normalizeWeek(week: number): number {
  if (!Number.isFinite(week)) {
    return 1
  }

  return Math.max(1, Math.trunc(week))
}

function freezeRecord(record: TherapeuticCareScheduleRecord): TherapeuticCareScheduleRecord {
  return Object.freeze({ ...record })
}

/** Whether the simulation week is a care-session due week for the declared cadence. */
export function isCareSessionDueWeek(week: number, cadence: CareCadence): boolean {
  const normalizedWeek = normalizeWeek(week)
  const interval = CARE_CADENCE_WEEK_INTERVAL[cadence]
  return normalizedWeek % interval === 0
}

/** Count of due care sessions from week 1 through week (inclusive). Week 0 yields 0. */
export function countDueCareSessionsThroughWeek(week: number, cadence: CareCadence): number {
  if (!Number.isFinite(week) || week < 1) {
    return 0
  }

  const normalizedWeek = Math.trunc(week)
  const interval = CARE_CADENCE_WEEK_INTERVAL[cadence]

  if (interval === 1) {
    return normalizedWeek
  }

  return Math.floor(normalizedWeek / interval)
}

/** Channel state after applying streak-driven degradation rules. */
export function resolveChannelStateForMissedSessionStreak(
  channelState: ChannelState,
  missedSessionStreak: number
): ChannelState {
  if (channelState === 'suspended') {
    return 'suspended'
  }

  if (
    channelState === 'degraded' &&
    missedSessionStreak >= DEGRADED_TO_SUSPENDED_STREAK_THRESHOLD
  ) {
    return 'suspended'
  }

  if (channelState === 'active' && missedSessionStreak >= ACTIVE_TO_DEGRADED_STREAK_THRESHOLD) {
    return 'degraded'
  }

  return channelState
}

function buildWeeklyAdvanceCandidate(
  record: TherapeuticCareScheduleRecord,
  week: number
): TherapeuticCareScheduleRecord | undefined {
  if (record.channelState === 'suspended') {
    return undefined
  }

  const normalizedWeek = normalizeWeek(week)
  if (!isCareSessionDueWeek(normalizedWeek, record.cadence)) {
    return undefined
  }

  const interval = CARE_CADENCE_WEEK_INTERVAL[record.cadence]
  const priorDueSessionCount = countDueCareSessionsThroughWeek(
    normalizedWeek - interval,
    record.cadence
  )
  const currentStreak = record.missedSessionStreak
  let nextStreak = currentStreak
  let changed = false

  const shouldIncrementStreak =
    currentStreak === 0 ||
    currentStreak === priorDueSessionCount

  if (shouldIncrementStreak) {
    nextStreak = currentStreak + 1
    changed = true
  }

  const nextChannelState = resolveChannelStateForMissedSessionStreak(
    record.channelState,
    nextStreak
  )
  if (nextChannelState !== record.channelState) {
    changed = true
  }

  if (!changed) {
    return undefined
  }

  return {
    ...record,
    missedSessionStreak: nextStreak,
    channelState: nextChannelState,
  }
}

/**
 * Advances one record for the simulation week: missed-session streak increment and channel
 * degradation on cadence due weeks. Returns the same reference when no bounded field changes.
 */
export function advanceTherapeuticCareScheduleRecordForWeek(
  record: TherapeuticCareScheduleRecord,
  week: number
): TherapeuticCareScheduleRecord {
  const candidate = buildWeeklyAdvanceCandidate(record, week)
  if (!candidate) {
    return record
  }

  if (!validateTherapeuticCareScheduleRecord(candidate).valid) {
    return record
  }

  return freezeRecord(candidate)
}

/**
 * Applies one weekly orchestration pass over persisted therapeutic care schedule records.
 * Empty map is a no-op. Re-applying after advance is idempotent for the same week.
 */
export function applyWeeklyTherapeuticCareTick(
  records: TherapeuticCareScheduleRecordsMap | null | undefined,
  week: number
): TherapeuticCareScheduleRecordsMap {
  const safeRecords = records ?? {}
  const recordIds = Object.keys(safeRecords)
  if (recordIds.length === 0) {
    return safeRecords
  }

  const normalizedWeek = normalizeWeek(week)
  const next: TherapeuticCareScheduleRecordsMap = { ...safeRecords }
  let changed = false

  for (const recordId of recordIds.sort((left, right) => left.localeCompare(right))) {
    const record = safeRecords[recordId]
    if (!record) {
      continue
    }

    const advanced = advanceTherapeuticCareScheduleRecordForWeek(record, normalizedWeek)
    if (advanced !== record) {
      next[recordId] = advanced
      changed = true
    }
  }

  return changed ? next : safeRecords
}
