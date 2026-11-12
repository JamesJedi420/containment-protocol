/**
 * SPE-2106 slice 3: weekly monitoring-cadence lifecycle advance for persisted unexplained locations.
 *
 * Pure deterministic tick: when the simulation week reaches the monitoring due week
 * (anchor week + monitoringCadenceWeeks), advance one lifecycle step with append-only
 * statusHistory. Does not add persistence fields or rewrite prior history entries.
 */

import {
  validateUnexplainedLocationRecord,
  isUnexplainedLocationLifecycleState,
  type UnexplainedLocationLifecycleState,
  type UnexplainedLocationRecord,
  type UnexplainedLocationRecordsMap,
  type UnexplainedLocationStatusHistoryEntry,
} from './unexplainedLocationRegistry'

const TERMINAL_LIFECYCLE_STATES: ReadonlySet<UnexplainedLocationLifecycleState> = new Set([
  'archived',
  'destroyed',
  'neutralized',
  'disputed',
  'public_managed',
  'pending_reactivation',
])

const DEFAULT_LIFECYCLE_ADVANCE: Partial<
  Record<UnexplainedLocationLifecycleState, UnexplainedLocationLifecycleState>
> = {
  active: 'monitor_only',
  monitor_only: 'archived',
  utility_use: 'archived',
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

function freezeRecord(record: UnexplainedLocationRecord): UnexplainedLocationRecord {
  return Object.freeze({ ...record })
}

function resolveMonitoringAnchorWeek(record: UnexplainedLocationRecord): number | undefined {
  let anchorWeek: number | undefined

  if (record.discoveryWeek !== undefined && isFiniteWeek(record.discoveryWeek)) {
    anchorWeek = record.discoveryWeek
  }

  if (record.containmentWeek !== undefined && isFiniteWeek(record.containmentWeek)) {
    anchorWeek =
      anchorWeek === undefined
        ? record.containmentWeek
        : Math.max(anchorWeek, record.containmentWeek)
  }

  const history = record.statusHistory ?? []
  const last = history[history.length - 1]
  if (last && isFiniteWeek(last.week)) {
    anchorWeek = anchorWeek === undefined ? last.week : Math.max(anchorWeek, last.week)
  }

  return anchorWeek
}

/** Monitoring review due week from anchor + cadence; undefined when cadence is not declared. */
export function resolveUnexplainedLocationMonitoringDueWeek(
  record: UnexplainedLocationRecord
): number | undefined {
  const cadence = record.monitoringCadenceWeeks
  if (cadence === undefined || !isFiniteWeek(cadence) || cadence === 0) {
    return undefined
  }

  const anchorWeek = resolveMonitoringAnchorWeek(record)
  if (anchorWeek === undefined) {
    return undefined
  }

  return anchorWeek + cadence
}

function recordMatchesLastHistoryLifecycle(record: UnexplainedLocationRecord): boolean {
  const history = record.statusHistory ?? []
  if (history.length === 0) {
    return true
  }

  const last = history[history.length - 1]
  return last?.toState === record.lifecycleState
}

function alreadyAdvancedLifecycleThisWeek(
  record: UnexplainedLocationRecord,
  week: number
): boolean {
  const history = record.statusHistory ?? []
  const last = history[history.length - 1]
  return last?.week === week
}

function resolveScheduledTargetLifecycle(
  record: UnexplainedLocationRecord
): UnexplainedLocationLifecycleState | undefined {
  if (TERMINAL_LIFECYCLE_STATES.has(record.lifecycleState)) {
    return undefined
  }

  return DEFAULT_LIFECYCLE_ADVANCE[record.lifecycleState]
}

function appendStatusHistoryEntry(
  record: UnexplainedLocationRecord,
  fromState: UnexplainedLocationLifecycleState,
  toState: UnexplainedLocationLifecycleState,
  week: number
): readonly UnexplainedLocationStatusHistoryEntry[] {
  const prior = record.statusHistory ?? []
  const entry: UnexplainedLocationStatusHistoryEntry = {
    fromState,
    toState,
    week,
    note: 'Weekly monitoring cadence lifecycle advance.',
  }

  return Object.freeze([...prior, entry])
}

/**
 * Advances one record when the simulation week has reached its monitoring due week.
 * Returns the same reference when no bounded field changes.
 */
export function advanceUnexplainedLocationRecordLifecycleForWeek(
  record: UnexplainedLocationRecord,
  week: number
): UnexplainedLocationRecord {
  const normalizedWeek = normalizeWeek(week)
  const dueWeek = resolveUnexplainedLocationMonitoringDueWeek(record)

  if (dueWeek === undefined || normalizedWeek < dueWeek) {
    return record
  }

  if (!recordMatchesLastHistoryLifecycle(record)) {
    return record
  }

  if (alreadyAdvancedLifecycleThisWeek(record, normalizedWeek)) {
    return record
  }

  const targetLifecycle = resolveScheduledTargetLifecycle(record)
  if (!targetLifecycle || targetLifecycle === record.lifecycleState) {
    return record
  }

  if (!isUnexplainedLocationLifecycleState(targetLifecycle)) {
    return record
  }

  const nextHistory = appendStatusHistoryEntry(
    record,
    record.lifecycleState,
    targetLifecycle,
    normalizedWeek
  )

  const candidate: UnexplainedLocationRecord = {
    ...record,
    lifecycleState: targetLifecycle,
    statusHistory: nextHistory,
  }

  const validationPolicy =
    targetLifecycle === 'neutralized' ? { requireNeutralizationAuthorization: true } : {}

  if (!validateUnexplainedLocationRecord(candidate, validationPolicy).valid) {
    return record
  }

  return freezeRecord(candidate)
}

/**
 * Applies one weekly monitoring-cadence lifecycle pass over persisted unexplained location records.
 * Empty map is a no-op. Re-applying after advance is idempotent for the same week.
 */
export function applyWeeklyUnexplainedLocationLifecycleTick(
  records: UnexplainedLocationRecordsMap | null | undefined,
  week: number
): UnexplainedLocationRecordsMap {
  const safeRecords = records ?? {}
  const locationIds = Object.keys(safeRecords)
  if (locationIds.length === 0) {
    return safeRecords
  }

  const normalizedWeek = normalizeWeek(week)
  const next: UnexplainedLocationRecordsMap = { ...safeRecords }
  let changed = false

  for (const locationId of locationIds.sort((left, right) => left.localeCompare(right))) {
    const record = safeRecords[locationId]
    if (!record) {
      continue
    }

    const advanced = advanceUnexplainedLocationRecordLifecycleForWeek(record, normalizedWeek)
    if (advanced !== record) {
      next[locationId] = advanced
      changed = true
    }
  }

  return changed ? next : safeRecords
}
