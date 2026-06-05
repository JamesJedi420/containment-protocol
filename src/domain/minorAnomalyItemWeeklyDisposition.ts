/**
 * SPE-2104 slice 3: weekly disposition / custody advance for persisted minor anomaly items.
 *
 * Pure deterministic tick: when the simulation week reaches the custody-review due week
 * (max staffNoteProvenance.week), advance one intake disposition step with append-only
 * statusHistory. Does not add persistence fields or rewrite prior history entries.
 */

import {
  validateMinorAnomalyRecord,
  isMinorAnomalyDisposition,
  type MinorAnomalyDisposition,
  type MinorAnomalyItemRecordsMap,
  type MinorAnomalyRecord,
  type MinorAnomalyStatusHistoryEntry,
} from './minorAnomalyItemRegistry'

const DEFAULT_DISPOSITION_ADVANCE: Partial<
  Record<MinorAnomalyDisposition, MinorAnomalyDisposition>
> = {
  recovered: 'pending_review',
  pending_review: 'stored',
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

function normalizeToken(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function freezeRecord(record: MinorAnomalyRecord): MinorAnomalyRecord {
  return Object.freeze({ ...record })
}

/** Max staff-note week on the record; undefined when no hook declares a week. */
export function resolveMinorAnomalyCustodyReviewDueWeek(
  record: MinorAnomalyRecord
): number | undefined {
  const hooks = record.staffNoteProvenance ?? []
  let dueWeek: number | undefined

  for (const hook of hooks) {
    if (!hook || hook.week === undefined || !isFiniteWeek(hook.week)) {
      continue
    }

    dueWeek = dueWeek === undefined ? hook.week : Math.max(dueWeek, hook.week)
  }

  return dueWeek
}

function recordMatchesLastHistoryDisposition(record: MinorAnomalyRecord): boolean {
  const history = record.statusHistory ?? []
  if (history.length === 0) {
    return true
  }

  const last = history[history.length - 1]
  return last?.toDisposition === record.disposition
}

function alreadyAdvancedDispositionThisWeek(
  record: MinorAnomalyRecord,
  week: number
): boolean {
  const history = record.statusHistory ?? []
  const last = history[history.length - 1]
  return last?.week === week
}

function resolveScheduledTargetDisposition(
  record: MinorAnomalyRecord
): MinorAnomalyDisposition | undefined {
  const statusToken = normalizeToken(record.status ?? '')
  if (
    statusToken &&
    isMinorAnomalyDisposition(statusToken) &&
    statusToken !== record.disposition
  ) {
    return statusToken
  }

  return DEFAULT_DISPOSITION_ADVANCE[record.disposition]
}

function appendStatusHistoryEntry(
  record: MinorAnomalyRecord,
  fromDisposition: MinorAnomalyDisposition,
  toDisposition: MinorAnomalyDisposition,
  week: number
): readonly MinorAnomalyStatusHistoryEntry[] {
  const prior = record.statusHistory ?? []
  const entry: MinorAnomalyStatusHistoryEntry = {
    fromDisposition,
    toDisposition,
    week,
    note: 'Weekly custody review disposition advance.',
  }

  return Object.freeze([...prior, entry])
}

/**
 * Advances one record when the simulation week has reached its custody-review due week.
 * Returns the same reference when no bounded field changes.
 */
export function advanceMinorAnomalyItemRecordDispositionForWeek(
  record: MinorAnomalyRecord,
  week: number
): MinorAnomalyRecord {
  const normalizedWeek = normalizeWeek(week)
  const dueWeek = resolveMinorAnomalyCustodyReviewDueWeek(record)

  if (dueWeek === undefined || normalizedWeek < dueWeek) {
    return record
  }

  if (!recordMatchesLastHistoryDisposition(record)) {
    return record
  }

  if (alreadyAdvancedDispositionThisWeek(record, normalizedWeek)) {
    return record
  }

  const targetDisposition = resolveScheduledTargetDisposition(record)
  if (!targetDisposition || targetDisposition === record.disposition) {
    return record
  }

  const nextHistory = appendStatusHistoryEntry(
    record,
    record.disposition,
    targetDisposition,
    normalizedWeek
  )

  const statusToken = normalizeToken(record.status ?? '')
  const clearStatus = statusToken === targetDisposition

  const withAdvance: MinorAnomalyRecord = {
    ...record,
    disposition: targetDisposition,
    statusHistory: nextHistory,
  }

  const candidate = clearStatus
    ? (() => {
        const { status: _status, ...withoutStatus } = withAdvance
        void _status
        return withoutStatus
      })()
    : withAdvance

  const validationPolicy =
    targetDisposition === 'destroyed' ? { requireDestructionAuthorization: true } : {}

  if (!validateMinorAnomalyRecord(candidate, validationPolicy).valid) {
    return record
  }

  return freezeRecord(candidate)
}

/**
 * Applies one weekly disposition/custody pass over persisted minor anomaly item records.
 * Empty map is a no-op. Re-applying after advance is idempotent for the same week.
 */
export function applyWeeklyMinorAnomalyItemDispositionTick(
  records: MinorAnomalyItemRecordsMap | null | undefined,
  week: number
): MinorAnomalyItemRecordsMap {
  const safeRecords = records ?? {}
  const itemIds = Object.keys(safeRecords)
  if (itemIds.length === 0) {
    return safeRecords
  }

  const normalizedWeek = normalizeWeek(week)
  const next: MinorAnomalyItemRecordsMap = { ...safeRecords }
  let changed = false

  for (const itemId of itemIds.sort((left, right) => left.localeCompare(right))) {
    const record = safeRecords[itemId]
    if (!record) {
      continue
    }

    const advanced = advanceMinorAnomalyItemRecordDispositionForWeek(record, normalizedWeek)
    if (advanced !== record) {
      next[itemId] = advanced
      changed = true
    }
  }

  return changed ? next : safeRecords
}
