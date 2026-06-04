/**
 * SPE-2105 slice 3: weekly monitoring-until / closureState advance for persisted extranormal events.
 *
 * Pure deterministic tick: when the simulation week reaches monitoringUntilWeek, clear the
 * monitoring window and advance monitor_only closure to sourceless_closed. Does not mutate
 * unrelated fields or rewrite mistaken history beyond the bounded monitoring contract.
 */

import {
  validateExtranormalEventRecord,
  type ExtranormalEventRecord,
  type ExtranormalEventRecordsMap,
  type ExtranormalClosureState,
} from './extranormalEventRegistry'

function normalizeWeek(week: number): number {
  if (!Number.isFinite(week)) {
    return 1
  }

  return Math.max(1, Math.trunc(week))
}

function isFiniteWeek(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value === Math.trunc(value)
}

function freezeRecord(record: ExtranormalEventRecord): ExtranormalEventRecord {
  return Object.freeze({ ...record })
}

function resolveClosureStateAfterMonitoringExpiry(
  closureState: ExtranormalClosureState | undefined
): ExtranormalClosureState | undefined {
  if (closureState === 'monitor_only') {
    return 'sourceless_closed'
  }

  return closureState
}

/**
 * Advances one record when the simulation week has reached its monitoring-until week.
 * Returns the same reference when no bounded field changes.
 */
export function advanceExtranormalEventRecordMonitoringForWeek(
  record: ExtranormalEventRecord,
  week: number
): ExtranormalEventRecord {
  const normalizedWeek = normalizeWeek(week)
  const monitoringUntilWeek = record.monitoringUntilWeek

  if (!isFiniteWeek(monitoringUntilWeek) || normalizedWeek < monitoringUntilWeek) {
    return record
  }

  const nextClosureState = resolveClosureStateAfterMonitoringExpiry(record.closureState)

  const withoutMonitoring = { ...record }
  delete (withoutMonitoring as Partial<ExtranormalEventRecord>).monitoringUntilWeek
  const candidate: ExtranormalEventRecord = {
    ...withoutMonitoring,
    ...(nextClosureState !== undefined ? { closureState: nextClosureState } : {}),
  }

  if (!validateExtranormalEventRecord(candidate).valid) {
    return record
  }

  return freezeRecord(candidate)
}

/**
 * Applies one weekly monitoring/closure pass over persisted extranormal event records.
 * Empty map is a no-op. Re-applying after monitoring has expired is idempotent.
 */
export function applyWeeklyExtranormalEventMonitoringTick(
  records: ExtranormalEventRecordsMap | null | undefined,
  week: number
): ExtranormalEventRecordsMap {
  const safeRecords = records ?? {}
  const eventIds = Object.keys(safeRecords)
  if (eventIds.length === 0) {
    return safeRecords
  }

  const normalizedWeek = normalizeWeek(week)
  const next: ExtranormalEventRecordsMap = { ...safeRecords }
  let changed = false

  for (const eventId of eventIds.sort((left, right) => left.localeCompare(right))) {
    const record = safeRecords[eventId]
    if (!record) {
      continue
    }

    const advanced = advanceExtranormalEventRecordMonitoringForWeek(record, normalizedWeek)
    if (advanced !== record) {
      next[eventId] = advanced
      changed = true
    }
  }

  return changed ? next : safeRecords
}
