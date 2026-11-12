import type { GameState } from '../../domain/models'
import {
  projectCoverStoryLifecycleView,
  type CoverStoryLifecycleProjection,
  type CoverStoryRecord,
  type CoverStoryWeeklyProjectionSnapshot,
} from '../../domain/coverStoryLifecycleRegistry'

export interface CoverStoryMirrorSnapshotView {
  week: number
  lifecyclePhaseLabel: string
  coverStressActiveLabel: string
  coverCollapsedLabel: string
  repairInProgressLabel: string
  contradictionPressureLabel: string
  coverCapacityScoreLabel: string
  activeContradictionChannelCount: number
  contradictionChannelHintsLabel: string
  latestRepairActionLabel: string
  confidenceLabel: string
  redacted: boolean
}

export interface CoverStoryMirrorRecordView {
  id: string
  label: string
  summaryLabel: string
  lifecyclePhaseLabel: string
  subjectRef: string
  subjectKindLabel: string
  coverMotivationLabel: string
  exposureKindLabel: string
  contradictionPressureLabel: string
  coverCapacityScoreLabel: string
  activeContradictionChannelCount: number
  contradictionChannelHintsLabel: string
  latestRepairActionLabel: string
  coverStressActiveLabel: string
  coverCollapsedLabel: string
  repairInProgressLabel: string
  confidenceLabel: string
  unknownFieldsLabel: string
  redacted: boolean
  weeklySnapshot: CoverStoryMirrorSnapshotView | null
}

export interface CoverStoryMirrorSummaryView {
  totalRecords: number
  coverStressActiveCount: number
  coverCollapsedCount: number
  repairInProgressCount: number
  weeklySnapshotCount: number
  week: number
}

export interface CoverStoryMirrorView {
  isEmpty: boolean
  summary: CoverStoryMirrorSummaryView
  records: readonly CoverStoryMirrorRecordView[]
}

export function formatCoverStoryEnumLabel(value: string): string {
  return value
    .split('_')
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ')
}

function listPersistedRecords(game: GameState): CoverStoryRecord[] {
  const map = game.coverStoryRecords ?? {}
  return Object.values(map).sort((left, right) => left.id.localeCompare(right.id))
}

function formatConfidence(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—'
  }

  return value.toFixed(2)
}

function formatBoolean(value: boolean): string {
  return value ? 'Yes' : 'No'
}

function formatNullableEnum(value: string | null | undefined): string {
  if (!value) {
    return '—'
  }

  return formatCoverStoryEnumLabel(value)
}

function formatSummary(projection: CoverStoryLifecycleProjection, summaryRedacted: boolean): string {
  if (projection.redacted && summaryRedacted) {
    return '[Redacted]'
  }

  return projection.summary ?? '—'
}

function formatChannelHints(hints: readonly string[]): string {
  if (hints.length === 0) {
    return '—'
  }

  return hints.map((hint) => formatCoverStoryEnumLabel(hint)).join(', ')
}

function toSnapshotView(
  snapshot: CoverStoryWeeklyProjectionSnapshot
): CoverStoryMirrorSnapshotView {
  const lifecycle = snapshot.lifecycle

  return Object.freeze({
    week: snapshot.week,
    lifecyclePhaseLabel: formatCoverStoryEnumLabel(lifecycle.lifecyclePhase),
    coverStressActiveLabel: formatBoolean(lifecycle.coverStressActive),
    coverCollapsedLabel: formatBoolean(lifecycle.coverCollapsed),
    repairInProgressLabel: formatBoolean(lifecycle.repairInProgress),
    contradictionPressureLabel: formatConfidence(lifecycle.contradictionPressure),
    coverCapacityScoreLabel: formatConfidence(lifecycle.coverCapacityScore),
    activeContradictionChannelCount: lifecycle.activeContradictionChannelCount,
    contradictionChannelHintsLabel: formatChannelHints(lifecycle.contradictionChannelHints),
    latestRepairActionLabel: formatNullableEnum(lifecycle.latestRepairAction),
    confidenceLabel: formatConfidence(lifecycle.confidence),
    redacted: lifecycle.redacted,
  })
}

function toRecordView(
  record: CoverStoryRecord,
  projection: CoverStoryLifecycleProjection,
  snapshot: CoverStoryWeeklyProjectionSnapshot | undefined
): CoverStoryMirrorRecordView {
  const summaryRedacted = (record.redactedFields ?? []).includes('summary')

  return Object.freeze({
    id: record.id,
    label: projection.label,
    summaryLabel: formatSummary(projection, summaryRedacted),
    lifecyclePhaseLabel: formatCoverStoryEnumLabel(projection.lifecyclePhase),
    subjectRef: projection.subjectRef,
    subjectKindLabel: formatCoverStoryEnumLabel(projection.subjectKind),
    coverMotivationLabel: formatNullableEnum(projection.coverMotivation),
    exposureKindLabel: formatNullableEnum(projection.exposureKind),
    contradictionPressureLabel: formatConfidence(projection.contradictionPressure),
    coverCapacityScoreLabel: formatConfidence(projection.coverCapacityScore),
    activeContradictionChannelCount: projection.activeContradictionChannelCount,
    contradictionChannelHintsLabel: formatChannelHints(projection.contradictionChannelHints),
    latestRepairActionLabel: formatNullableEnum(projection.latestRepairAction),
    coverStressActiveLabel: formatBoolean(projection.coverStressActive),
    coverCollapsedLabel: formatBoolean(projection.coverCollapsed),
    repairInProgressLabel: formatBoolean(projection.repairInProgress),
    confidenceLabel: formatConfidence(projection.confidence),
    unknownFieldsLabel:
      projection.unknownFields.length > 0 ? projection.unknownFields.join(', ') : '—',
    redacted: projection.redacted,
    weeklySnapshot: snapshot ? toSnapshotView(snapshot) : null,
  })
}

/** Read-only mirror over hydrated `coverStoryRecords` and weekly projection snapshots. */
export function getCoverStoryMirrorView(game: GameState): CoverStoryMirrorView {
  const records = listPersistedRecords(game)
  const snapshots = game.coverStoryWeeklyProjectionSnapshots ?? {}

  const coverStressActiveCount = records.filter((record) => {
    const projection = projectCoverStoryLifecycleView(record)
    return projection.coverStressActive
  }).length

  const coverCollapsedCount = records.filter((record) => {
    const projection = projectCoverStoryLifecycleView(record)
    return projection.coverCollapsed
  }).length

  const repairInProgressCount = records.filter((record) => {
    const projection = projectCoverStoryLifecycleView(record)
    return projection.repairInProgress
  }).length

  const weeklySnapshotCount = records.filter((record) => snapshots[record.id] !== undefined).length

  return Object.freeze({
    isEmpty: records.length === 0,
    summary: Object.freeze({
      totalRecords: records.length,
      coverStressActiveCount,
      coverCollapsedCount,
      repairInProgressCount,
      weeklySnapshotCount,
      week: game.week,
    }),
    records: Object.freeze(
      records.map((record) => {
        const projection = projectCoverStoryLifecycleView(record)
        return toRecordView(record, projection, snapshots[record.id])
      })
    ),
  })
}
