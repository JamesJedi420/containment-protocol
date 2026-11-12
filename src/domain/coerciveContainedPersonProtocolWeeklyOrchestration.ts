/**
 * SPE-1882 slice 3/5: weekly orchestration for persisted coercive protocol records.
 *
 * Pure deterministic tick: runs tradeoff and coercion-risk projections each week,
 * persists bounded weekly projection snapshots, and preserves source records byte-stable.
 * Does not mutate welfare-debt accounting or implement contradiction-check siblings.
 */

import {
  projectCoerciveProtocolRiskReview,
  projectContainmentCareTradeoff,
  type CoerciveProtocolId,
  type CoerciveProtocolRecord,
  type CoerciveProtocolRecordsMap,
  type CoerciveProtocolRiskReviewProjection,
  type CoerciveProtocolWeeklyProjectionSnapshot,
  type CoerciveProtocolWeeklyProjectionSnapshotsMap,
  type ContainmentCareTradeoffProjection,
} from './coerciveContainedPersonProtocolRegistry'

export interface CoerciveProtocolWeeklyProjectionBundle {
  readonly recordId: CoerciveProtocolId
  readonly week: number
  readonly tradeoff: ContainmentCareTradeoffProjection
  readonly riskReview: CoerciveProtocolRiskReviewProjection
}

export interface CoerciveProtocolWeeklyTickResult {
  readonly records: CoerciveProtocolRecordsMap
  readonly snapshots: CoerciveProtocolWeeklyProjectionSnapshotsMap
}

function normalizeWeek(week: number): number {
  if (!Number.isFinite(week)) {
    return 1
  }

  return Math.max(1, Math.trunc(week))
}

function freezeSnapshot(
  bundle: CoerciveProtocolWeeklyProjectionBundle
): CoerciveProtocolWeeklyProjectionSnapshot {
  return Object.freeze({
    recordId: bundle.recordId,
    week: bundle.week,
    tradeoff: bundle.tradeoff,
    riskReview: bundle.riskReview,
  })
}

function weeklyProjectionSnapshotsEqual(
  left: CoerciveProtocolWeeklyProjectionSnapshot,
  right: CoerciveProtocolWeeklyProjectionSnapshot
): boolean {
  if (left.recordId !== right.recordId || left.week !== right.week) {
    return false
  }

  return (
    JSON.stringify(left.tradeoff) === JSON.stringify(right.tradeoff) &&
    JSON.stringify(left.riskReview) === JSON.stringify(right.riskReview)
  )
}

/**
 * Builds the deterministic weekly projection bundle for one protocol record.
 * Projections are derived from registry slice 1 helpers only.
 */
export function buildCoerciveProtocolWeeklyProjectionBundle(
  record: CoerciveProtocolRecord,
  week: number
): CoerciveProtocolWeeklyProjectionBundle {
  return Object.freeze({
    recordId: record.id,
    week: normalizeWeek(week),
    tradeoff: projectContainmentCareTradeoff(record),
    riskReview: projectCoerciveProtocolRiskReview(record),
  })
}

/**
 * Projects all persisted protocol records for the simulation week in stable id order.
 * Returns an empty frozen array when the map is empty.
 */
export function projectCoerciveProtocolRecordsForWeek(
  records: CoerciveProtocolRecordsMap | null | undefined,
  week: number
): readonly CoerciveProtocolWeeklyProjectionBundle[] {
  const safeRecords = records ?? {}
  const recordIds = Object.keys(safeRecords)
  if (recordIds.length === 0) {
    return Object.freeze([])
  }

  const normalizedWeek = normalizeWeek(week)
  const bundles: CoerciveProtocolWeeklyProjectionBundle[] = []

  for (const recordId of recordIds.sort((left, right) => left.localeCompare(right))) {
    const record = safeRecords[recordId]
    if (!record) {
      continue
    }

    bundles.push(buildCoerciveProtocolWeeklyProjectionBundle(record, normalizedWeek))
  }

  return Object.freeze(bundles)
}

function persistWeeklyProjectionSnapshots(
  records: CoerciveProtocolRecordsMap,
  snapshots: CoerciveProtocolWeeklyProjectionSnapshotsMap,
  week: number
): CoerciveProtocolWeeklyProjectionSnapshotsMap {
  const normalizedWeek = normalizeWeek(week)
  const recordIds = Object.keys(records).sort((left, right) => left.localeCompare(right))
  let nextSnapshots: CoerciveProtocolWeeklyProjectionSnapshotsMap | null = null

  for (const recordId of recordIds) {
    const record = records[recordId]
    if (!record) {
      continue
    }

    const bundle = buildCoerciveProtocolWeeklyProjectionBundle(record, normalizedWeek)
    const candidate = freezeSnapshot(bundle)
    const existing = (nextSnapshots ?? snapshots)[recordId]

    if (existing && weeklyProjectionSnapshotsEqual(existing, candidate)) {
      continue
    }

    if (!nextSnapshots) {
      nextSnapshots = { ...snapshots }
    }

    nextSnapshots[recordId] = candidate
  }

  const activeRecordIds = new Set(recordIds)
  const sourceSnapshots = nextSnapshots ?? snapshots
  for (const snapshotId of Object.keys(sourceSnapshots)) {
    if (activeRecordIds.has(snapshotId)) {
      continue
    }

    if (!nextSnapshots) {
      nextSnapshots = { ...snapshots }
    }

    delete nextSnapshots[snapshotId]
  }

  if (!nextSnapshots) {
    return snapshots
  }

  return Object.keys(nextSnapshots).length > 0 ? nextSnapshots : {}
}

/**
 * Applies one weekly orchestration pass over persisted coercive protocol records.
 * Runs deterministic projections, persists bounded weekly snapshots, and preserves
 * source records byte-stable. Empty map is a no-op. Re-applying after advance is
 * idempotent for the same week.
 */
export function applyWeeklyCoerciveProtocolTick(
  records: CoerciveProtocolRecordsMap | null | undefined,
  week: number,
  snapshots: CoerciveProtocolWeeklyProjectionSnapshotsMap | null | undefined = {}
): CoerciveProtocolWeeklyTickResult {
  const safeRecords = records ?? {}
  const safeSnapshots = snapshots ?? {}
  const recordIds = Object.keys(safeRecords)
  if (recordIds.length === 0) {
    return {
      records: safeRecords,
      snapshots: safeSnapshots,
    }
  }

  const nextSnapshots = persistWeeklyProjectionSnapshots(safeRecords, safeSnapshots, week)

  return {
    records: safeRecords,
    snapshots: nextSnapshots,
  }
}
