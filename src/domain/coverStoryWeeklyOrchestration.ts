/**
 * SPE-1347 slice 2: weekly orchestration for persisted cover-story records.
 *
 * Pure deterministic tick: runs lifecycle projections each week, persists bounded
 * weekly projection snapshots, and preserves source records byte-stable.
 * Does not implement a full contradiction engine or mutate cover-story record fields.
 */

import {
  projectCoverStoryLifecycleView,
  type CoverStoryLifecycleProjection,
  type CoverStoryRecord,
  type CoverStoryRecordsMap,
  type CoverStoryWeeklyProjectionSnapshot,
  type CoverStoryWeeklyProjectionSnapshotsMap,
} from './coverStoryLifecycleRegistry'

export interface CoverStoryWeeklyProjectionBundle {
  readonly recordId: string
  readonly week: number
  readonly lifecycle: CoverStoryLifecycleProjection
}

export interface CoverStoryWeeklyTickResult {
  readonly records: CoverStoryRecordsMap
  readonly snapshots: CoverStoryWeeklyProjectionSnapshotsMap
}

function normalizeWeek(week: number): number {
  if (!Number.isFinite(week)) {
    return 1
  }

  return Math.max(1, Math.trunc(week))
}

function freezeSnapshot(
  bundle: CoverStoryWeeklyProjectionBundle
): CoverStoryWeeklyProjectionSnapshot {
  return Object.freeze({
    recordId: bundle.recordId,
    week: bundle.week,
    lifecycle: bundle.lifecycle,
  })
}

function weeklyProjectionSnapshotsEqual(
  left: CoverStoryWeeklyProjectionSnapshot,
  right: CoverStoryWeeklyProjectionSnapshot
): boolean {
  if (left.recordId !== right.recordId || left.week !== right.week) {
    return false
  }

  return JSON.stringify(left.lifecycle) === JSON.stringify(right.lifecycle)
}

/**
 * Builds the deterministic weekly lifecycle projection bundle for one cover-story record.
 */
export function buildCoverStoryWeeklyProjectionBundle(
  record: CoverStoryRecord,
  week: number
): CoverStoryWeeklyProjectionBundle {
  return Object.freeze({
    recordId: record.id,
    week: normalizeWeek(week),
    lifecycle: projectCoverStoryLifecycleView(record),
  })
}

/**
 * Projects all persisted cover-story records for the simulation week in stable id order.
 * Returns an empty frozen array when the map is empty.
 */
export function projectCoverStoryRecordsForWeek(
  records: CoverStoryRecordsMap | null | undefined,
  week: number
): readonly CoverStoryWeeklyProjectionBundle[] {
  const safeRecords = records ?? {}
  const recordIds = Object.keys(safeRecords)
  if (recordIds.length === 0) {
    return Object.freeze([])
  }

  const normalizedWeek = normalizeWeek(week)
  const bundles: CoverStoryWeeklyProjectionBundle[] = []

  for (const recordId of recordIds.sort((left, right) => left.localeCompare(right))) {
    const record = safeRecords[recordId]
    if (!record) {
      continue
    }

    bundles.push(buildCoverStoryWeeklyProjectionBundle(record, normalizedWeek))
  }

  return Object.freeze(bundles)
}

function persistWeeklyProjectionSnapshots(
  records: CoverStoryRecordsMap,
  snapshots: CoverStoryWeeklyProjectionSnapshotsMap,
  week: number
): CoverStoryWeeklyProjectionSnapshotsMap {
  const normalizedWeek = normalizeWeek(week)
  const recordIds = Object.keys(records).sort((left, right) => left.localeCompare(right))
  let nextSnapshots: CoverStoryWeeklyProjectionSnapshotsMap | null = null

  for (const recordId of recordIds) {
    const record = records[recordId]
    if (!record) {
      continue
    }

    const bundle = buildCoverStoryWeeklyProjectionBundle(record, normalizedWeek)
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
 * Applies one weekly orchestration pass over persisted cover-story records.
 * Runs deterministic lifecycle projections, persists bounded weekly snapshots, and preserves
 * source records byte-stable. Empty map is a no-op. Re-applying after advance is
 * idempotent for the same week.
 */
export function applyWeeklyCoverStoryTick(
  records: CoverStoryRecordsMap | null | undefined,
  week: number,
  snapshots: CoverStoryWeeklyProjectionSnapshotsMap | null | undefined = {}
): CoverStoryWeeklyTickResult {
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
