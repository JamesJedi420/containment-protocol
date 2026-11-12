/**
 * SPE-2109 slice 3: weekly awareness/fallout progression for persisted public disclosure records.
 *
 * Pure deterministic tick: when the simulation week reaches a pre-scheduled transitionHistory
 * entry's due week, sync awarenessLevel and falloutPhase to that entry. Does not add persistence
 * fields, mutate trustByRegion, or rewrite prior history entries.
 */

import {
  AWARENESS_LEVELS,
  validatePublicDisclosureRecord,
  type PublicDisclosureRecord,
  type PublicDisclosureRecordsMap,
  type PublicDisclosureTransitionHistoryEntry,
} from './publicDisclosureStateRegistry'

function normalizeWeek(week: number): number {
  if (!Number.isFinite(week)) {
    return 1
  }

  return Math.max(1, Math.trunc(week))
}

function isFiniteWeek(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value === Math.trunc(value)
}

function freezeRecord(record: PublicDisclosureRecord): PublicDisclosureRecord {
  return Object.freeze({ ...record })
}

function sortedTransitionHistory(
  record: PublicDisclosureRecord
): readonly PublicDisclosureTransitionHistoryEntry[] {
  const history = record.transitionHistory ?? []

  return [...history].sort((left, right) => {
    const weekCompare = left.week - right.week
    if (weekCompare !== 0) {
      return weekCompare
    }

    return left.toAwarenessLevel.localeCompare(right.toAwarenessLevel)
  })
}

function recordMatchesLastHistoryAwareness(record: PublicDisclosureRecord): boolean {
  const history = sortedTransitionHistory(record)
  if (history.length === 0) {
    return true
  }

  const last = history[history.length - 1]
  if (!last) {
    return true
  }

  if (
    last.fromAwarenessLevel === record.awarenessLevel &&
    last.toAwarenessLevel !== record.awarenessLevel
  ) {
    return true
  }

  return last.toAwarenessLevel === record.awarenessLevel
}

function findDueScheduledTransition(
  record: PublicDisclosureRecord,
  week: number
): PublicDisclosureTransitionHistoryEntry | undefined {
  const history = sortedTransitionHistory(record)

  for (const entry of history) {
    if (!isFiniteWeek(entry.week) || entry.week > week) {
      continue
    }

    if (entry.fromAwarenessLevel !== record.awarenessLevel) {
      continue
    }

    if (entry.toAwarenessLevel === record.awarenessLevel) {
      continue
    }

    return entry
  }

  return undefined
}

/** Due week for the earliest eligible scheduled transition; undefined when none is pending. */
export function resolvePublicDisclosureScheduledTransitionDueWeek(
  record: PublicDisclosureRecord
): number | undefined {
  const history = sortedTransitionHistory(record)

  for (const entry of history) {
    if (entry.fromAwarenessLevel !== record.awarenessLevel) {
      continue
    }

    if (entry.toAwarenessLevel === record.awarenessLevel) {
      continue
    }

    return isFiniteWeek(entry.week) ? entry.week : undefined
  }

  return undefined
}

function advancePublicDisclosureRecordOneStep(
  record: PublicDisclosureRecord,
  week: number
): PublicDisclosureRecord {
  if (!recordMatchesLastHistoryAwareness(record)) {
    return record
  }

  const dueEntry = findDueScheduledTransition(record, week)
  if (!dueEntry) {
    return record
  }

  const candidate: PublicDisclosureRecord = {
    ...record,
    awarenessLevel: dueEntry.toAwarenessLevel,
    falloutPhase: dueEntry.falloutPhase ?? record.falloutPhase,
  }

  if (!validatePublicDisclosureRecord(candidate).valid) {
    return record
  }

  return freezeRecord(candidate)
}

/**
 * Advances one record when the simulation week has reached scheduled transition due week(s).
 * Overdue entries catch up in one tick (bounded by awareness ladder length). Returns the same
 * reference when no bounded field changes.
 */
export function advancePublicDisclosureRecordForWeek(
  record: PublicDisclosureRecord,
  week: number
): PublicDisclosureRecord {
  const normalizedWeek = normalizeWeek(week)
  let current = record

  for (let step = 0; step < AWARENESS_LEVELS.length; step += 1) {
    const next = advancePublicDisclosureRecordOneStep(current, normalizedWeek)
    if (next === current) {
      break
    }

    current = next
  }

  return current
}

/**
 * Applies one weekly awareness/fallout progression pass over persisted public disclosure records.
 * Empty map is a no-op. Re-applying after advance is idempotent for the same week.
 */
export function applyWeeklyPublicDisclosureProgressionTick(
  records: PublicDisclosureRecordsMap | null | undefined,
  week: number
): PublicDisclosureRecordsMap {
  const safeRecords = records ?? {}
  const recordIds = Object.keys(safeRecords)
  if (recordIds.length === 0) {
    return safeRecords
  }

  const normalizedWeek = normalizeWeek(week)
  const next: PublicDisclosureRecordsMap = { ...safeRecords }
  let changed = false

  for (const recordId of recordIds.sort((left, right) => left.localeCompare(right))) {
    const record = safeRecords[recordId]
    if (!record) {
      continue
    }

    const advanced = advancePublicDisclosureRecordForWeek(record, normalizedWeek)
    if (advanced !== record) {
      next[recordId] = advanced
      changed = true
    }
  }

  return changed ? next : safeRecords
}
