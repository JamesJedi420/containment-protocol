/**
 * SPE-2114 slice 3: weekly orchestration for persisted entity welfare reclassification records.
 *
 * Pure deterministic tick: when the simulation week reaches a pre-scheduled transitionHistory
 * entry's due week, sync reclassificationState and review refs to that entry. Does not add
 * persistence fields, mutate unrelated record data, or wire SPE-1046 affiliation status.
 */

import {
  validateEntityWelfareReclassificationRecord,
  type EntityWelfareReclassificationRecord,
  type EntityWelfareReclassificationRecordsMap,
  type ReclassificationState,
  type ReclassificationTransitionHistoryEntry,
} from './entityWelfareReclassificationRegistry'

const TERMINAL_STATES = new Set<ReclassificationState>(['approved', 'denied', 'reverted'])

function normalizeWeek(week: number): number {
  if (!Number.isFinite(week)) {
    return 1
  }

  return Math.max(1, Math.trunc(week))
}

function isFiniteWeek(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value === Math.trunc(value)
}

function freezeRecord(
  record: EntityWelfareReclassificationRecord
): EntityWelfareReclassificationRecord {
  return Object.freeze({ ...record })
}

function sortedTransitionHistory(
  record: EntityWelfareReclassificationRecord
): readonly ReclassificationTransitionHistoryEntry[] {
  const history = record.transitionHistory ?? []

  return [...history].sort((left, right) => {
    const weekCompare = left.week - right.week
    if (weekCompare !== 0) {
      return weekCompare
    }

    return left.toState.localeCompare(right.toState)
  })
}

function recordMatchesLastHistoryState(record: EntityWelfareReclassificationRecord): boolean {
  const history = sortedTransitionHistory(record)
  if (history.length === 0) {
    return true
  }

  const last = history[history.length - 1]
  if (!last) {
    return true
  }

  if (last.fromState === record.reclassificationState && last.toState !== record.reclassificationState) {
    return true
  }

  return last.toState === record.reclassificationState
}

function findDueScheduledTransition(
  record: EntityWelfareReclassificationRecord,
  week: number
): ReclassificationTransitionHistoryEntry | undefined {
  const history = sortedTransitionHistory(record)

  for (const entry of history) {
    if (!isFiniteWeek(entry.week) || entry.week > week) {
      continue
    }

    if (entry.fromState !== record.reclassificationState) {
      continue
    }

    if (entry.toState === record.reclassificationState) {
      continue
    }

    return entry
  }

  return undefined
}

/** Due week for the earliest eligible scheduled transition; undefined when none is pending. */
export function resolveEntityWelfareReclassificationScheduledTransitionDueWeek(
  record: EntityWelfareReclassificationRecord
): number | undefined {
  if (TERMINAL_STATES.has(record.reclassificationState)) {
    return undefined
  }

  const history = sortedTransitionHistory(record)

  for (const entry of history) {
    if (entry.fromState !== record.reclassificationState) {
      continue
    }

    if (entry.toState === record.reclassificationState) {
      continue
    }

    return isFiniteWeek(entry.week) ? entry.week : undefined
  }

  return undefined
}

function buildWeeklyAdvanceCandidate(
  record: EntityWelfareReclassificationRecord,
  week: number
): EntityWelfareReclassificationRecord | undefined {
  if (TERMINAL_STATES.has(record.reclassificationState)) {
    return undefined
  }

  if (!recordMatchesLastHistoryState(record)) {
    return undefined
  }

  const dueEntry = findDueScheduledTransition(record, week)
  if (!dueEntry) {
    return undefined
  }

  const reviewArtifactRef =
    dueEntry.reviewArtifactRef ?? record.reviewArtifactRef ?? undefined

  return {
    ...record,
    reclassificationState: dueEntry.toState,
    ...(dueEntry.reviewGate ? { reviewGate: dueEntry.reviewGate } : {}),
    ...(reviewArtifactRef ? { reviewArtifactRef } : {}),
  }
}

/**
 * Advances one record when the simulation week has reached a scheduled transition due week.
 * Returns the same reference when no bounded field changes.
 */
export function advanceEntityWelfareReclassificationRecordForWeek(
  record: EntityWelfareReclassificationRecord,
  week: number
): EntityWelfareReclassificationRecord {
  const normalizedWeek = normalizeWeek(week)
  const candidate = buildWeeklyAdvanceCandidate(record, normalizedWeek)
  if (!candidate) {
    return record
  }

  if (!validateEntityWelfareReclassificationRecord(candidate).valid) {
    return record
  }

  return freezeRecord(candidate)
}

/**
 * Applies one weekly orchestration pass over persisted entity welfare reclassification records.
 * Empty map is a no-op. Re-applying after advance is idempotent for the same week.
 */
export function applyWeeklyEntityWelfareReclassificationTick(
  records: EntityWelfareReclassificationRecordsMap | null | undefined,
  week: number
): EntityWelfareReclassificationRecordsMap {
  const safeRecords = records ?? {}
  const recordIds = Object.keys(safeRecords)
  if (recordIds.length === 0) {
    return safeRecords
  }

  const normalizedWeek = normalizeWeek(week)
  const next: EntityWelfareReclassificationRecordsMap = { ...safeRecords }
  let changed = false

  for (const recordId of recordIds.sort((left, right) => left.localeCompare(right))) {
    const record = safeRecords[recordId]
    if (!record) {
      continue
    }

    const advanced = advanceEntityWelfareReclassificationRecordForWeek(record, normalizedWeek)
    if (advanced !== record) {
      next[recordId] = advanced
      changed = true
    }
  }

  return changed ? next : safeRecords
}
