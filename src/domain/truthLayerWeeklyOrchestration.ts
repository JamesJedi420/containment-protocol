/**
 * SPE-1343 slice 3: weekly orchestration for persisted truth-layer records.
 *
 * Pure deterministic tick: runs myth-as-infrastructure ops projections each week,
 * persists bounded weekly projection snapshots, and preserves source records byte-stable.
 * Does not extend PublicDisclosureRecord or collapse claim/doctrine/verification layers.
 */

import {
  projectTruthLayerOpsView,
  type TruthLayerOpsProjection,
  type TruthLayerRecord,
  type TruthLayerRecordsMap,
  type TruthLayerWeeklyProjectionSnapshot,
  type TruthLayerWeeklyProjectionSnapshotsMap,
} from './truthLayerRecordRegistry'

export interface TruthLayerWeeklyProjectionBundle {
  readonly recordId: string
  readonly week: number
  readonly ops: TruthLayerOpsProjection
}

export interface TruthLayerWeeklyTickResult {
  readonly records: TruthLayerRecordsMap
  readonly snapshots: TruthLayerWeeklyProjectionSnapshotsMap
}

function normalizeWeek(week: number): number {
  if (!Number.isFinite(week)) {
    return 1
  }

  return Math.max(1, Math.trunc(week))
}

function freezeSnapshot(
  bundle: TruthLayerWeeklyProjectionBundle
): TruthLayerWeeklyProjectionSnapshot {
  return Object.freeze({
    recordId: bundle.recordId,
    week: bundle.week,
    ops: bundle.ops,
  })
}

function weeklyProjectionSnapshotsEqual(
  left: TruthLayerWeeklyProjectionSnapshot,
  right: TruthLayerWeeklyProjectionSnapshot
): boolean {
  if (left.recordId !== right.recordId || left.week !== right.week) {
    return false
  }

  return JSON.stringify(left.ops) === JSON.stringify(right.ops)
}

/**
 * Builds the deterministic weekly ops projection bundle for one truth-layer record.
 */
export function buildTruthLayerWeeklyProjectionBundle(
  record: TruthLayerRecord,
  week: number
): TruthLayerWeeklyProjectionBundle {
  return Object.freeze({
    recordId: record.id,
    week: normalizeWeek(week),
    ops: projectTruthLayerOpsView(record),
  })
}

/**
 * Projects all persisted truth-layer records for the simulation week in stable id order.
 * Returns an empty frozen array when the map is empty.
 */
export function projectTruthLayerRecordsForWeek(
  records: TruthLayerRecordsMap | null | undefined,
  week: number
): readonly TruthLayerWeeklyProjectionBundle[] {
  const safeRecords = records ?? {}
  const recordIds = Object.keys(safeRecords)
  if (recordIds.length === 0) {
    return Object.freeze([])
  }

  const normalizedWeek = normalizeWeek(week)
  const bundles: TruthLayerWeeklyProjectionBundle[] = []

  for (const recordId of recordIds.sort((left, right) => left.localeCompare(right))) {
    const record = safeRecords[recordId]
    if (!record) {
      continue
    }

    bundles.push(buildTruthLayerWeeklyProjectionBundle(record, normalizedWeek))
  }

  return Object.freeze(bundles)
}

function persistWeeklyProjectionSnapshots(
  records: TruthLayerRecordsMap,
  snapshots: TruthLayerWeeklyProjectionSnapshotsMap,
  week: number
): TruthLayerWeeklyProjectionSnapshotsMap {
  const normalizedWeek = normalizeWeek(week)
  const recordIds = Object.keys(records).sort((left, right) => left.localeCompare(right))
  let nextSnapshots: TruthLayerWeeklyProjectionSnapshotsMap | null = null

  for (const recordId of recordIds) {
    const record = records[recordId]
    if (!record) {
      continue
    }

    const bundle = buildTruthLayerWeeklyProjectionBundle(record, normalizedWeek)
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
 * Applies one weekly orchestration pass over persisted truth-layer records.
 * Runs deterministic ops projections, persists bounded weekly snapshots, and preserves
 * source records byte-stable. Empty map is a no-op. Re-applying after advance is
 * idempotent for the same week.
 */
export function applyWeeklyTruthLayerTick(
  records: TruthLayerRecordsMap | null | undefined,
  week: number,
  snapshots: TruthLayerWeeklyProjectionSnapshotsMap | null | undefined = {}
): TruthLayerWeeklyTickResult {
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
