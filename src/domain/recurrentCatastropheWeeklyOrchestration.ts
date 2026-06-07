/**
 * SPE-2117 slice 3: weekly recurrence advance for persisted recurrent catastrophe records.
 *
 * Pure deterministic tick: when the simulation week reaches the cadence due week
 * (lastOccurrenceWeek + cadence interval), increment recurrenceCount and advance
 * lastOccurrenceWeek. Does not add persistence fields or activate prevention tactics.
 */

import {
  isRecurrenceCadence,
  validateRecurrentCatastropheRecord,
  type RecurrenceCadence,
  type RecurrentCatastropheRecord,
  type RecurrentCatastropheRecordsMap,
} from './recurrentCatastropheAmeliorationRegistry'

const CADENCE_WEEK_INTERVAL: Readonly<Record<RecurrenceCadence, number>> = {
  weekly: 1,
  monthly: 4,
  seasonal: 13,
  annual: 52,
  irregular: 8,
}

function normalizeWeek(week: number): number {
  if (!Number.isFinite(week)) {
    return 1
  }

  return Math.max(1, Math.trunc(week))
}

function isFiniteWeek(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value === Math.trunc(value)
}

function freezeRecord(record: RecurrentCatastropheRecord): RecurrentCatastropheRecord {
  return Object.freeze({ ...record })
}

function resolveCadenceInterval(record: RecurrentCatastropheRecord): number {
  const cadence = isRecurrenceCadence(record.recurrenceCadence)
    ? record.recurrenceCadence
    : 'irregular'

  return CADENCE_WEEK_INTERVAL[cadence]
}

/** Recurrence due week from last occurrence + cadence interval; undefined when anchor is not declared. */
export function resolveRecurrenceDueWeek(record: RecurrentCatastropheRecord): number | undefined {
  const lastOccurrenceWeek = record.lastOccurrenceWeek
  if (!isFiniteWeek(lastOccurrenceWeek)) {
    return undefined
  }

  return lastOccurrenceWeek + resolveCadenceInterval(record)
}

function alreadyAdvancedRecurrenceThisWeek(
  record: RecurrentCatastropheRecord,
  week: number
): boolean {
  return record.lastOccurrenceWeek === week
}

/**
 * Advances one record when the simulation week has reached its recurrence due week.
 * Returns the same reference when no bounded field changes.
 */
export function advanceRecurrentCatastropheRecordForWeek(
  record: RecurrentCatastropheRecord,
  week: number
): RecurrentCatastropheRecord {
  const normalizedWeek = normalizeWeek(week)
  const dueWeek = resolveRecurrenceDueWeek(record)

  if (dueWeek === undefined || normalizedWeek < dueWeek) {
    return record
  }

  if (alreadyAdvancedRecurrenceThisWeek(record, normalizedWeek)) {
    return record
  }

  const candidate: RecurrentCatastropheRecord = {
    ...record,
    recurrenceCount: record.recurrenceCount + 1,
    lastOccurrenceWeek: normalizedWeek,
  }

  if (!validateRecurrentCatastropheRecord(candidate).valid) {
    return record
  }

  return freezeRecord(candidate)
}

/**
 * Applies one weekly recurrence pass over persisted recurrent catastrophe records.
 * Empty map is a no-op. Re-applying after advance is idempotent for the same week.
 */
export function applyWeeklyRecurrentCatastropheTick(
  records: RecurrentCatastropheRecordsMap | null | undefined,
  week: number
): RecurrentCatastropheRecordsMap {
  const safeRecords = records ?? {}
  const recordIds = Object.keys(safeRecords)
  if (recordIds.length === 0) {
    return safeRecords
  }

  const normalizedWeek = normalizeWeek(week)
  const next: RecurrentCatastropheRecordsMap = { ...safeRecords }
  let changed = false

  for (const recordId of recordIds.sort((left, right) => left.localeCompare(right))) {
    const record = safeRecords[recordId]
    if (!record) {
      continue
    }

    const advanced = advanceRecurrentCatastropheRecordForWeek(record, normalizedWeek)
    if (advanced !== record) {
      next[recordId] = advanced
      changed = true
    }
  }

  return changed ? next : safeRecords
}
