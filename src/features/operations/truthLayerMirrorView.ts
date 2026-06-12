import type { GameState } from '../../domain/models'
import {
  projectTruthLayerReviewView,
  type TruthLayerRecord,
  type TruthLayerSlotProjection,
  type TruthLayerWeeklyProjectionSnapshot,
} from '../../domain/truthLayerRecordRegistry'

export interface TruthLayerMirrorSlotView {
  narrativeLabel: string
  summaryLabel: string
  sourceConfidenceLabel: string
  knowledgeTierLabel: string
  redacted: boolean
}

export interface TruthLayerMirrorSnapshotView {
  week: number
  mythInfrastructureActiveLabel: string
  correctionPressureLabel: string
  layerDivergenceLabel: string
  mythDrivesOpsWithoutVerificationLabel: string
  claimSourceConfidenceLabel: string
  verificationSourceConfidenceLabel: string
  redacted: boolean
}

export interface TruthLayerMirrorRecordView {
  id: string
  label: string
  summaryLabel: string
  subjectRef: string
  subjectKindLabel: string
  claim: TruthLayerMirrorSlotView
  doctrine: TruthLayerMirrorSlotView
  verification: TruthLayerMirrorSlotView
  layerDivergenceLabel: string
  competingLayerCount: number
  mythInfrastructureActiveLabel: string
  correctionPressureLabel: string
  confidenceLabel: string
  unknownFieldsLabel: string
  redacted: boolean
  weeklySnapshot: TruthLayerMirrorSnapshotView | null
}

export interface TruthLayerMirrorSummaryView {
  totalRecords: number
  layerDivergenceCount: number
  mythInfrastructureActiveCount: number
  weeklySnapshotCount: number
  week: number
}

export interface TruthLayerMirrorView {
  isEmpty: boolean
  summary: TruthLayerMirrorSummaryView
  records: readonly TruthLayerMirrorRecordView[]
}

export function formatTruthLayerEnumLabel(value: string): string {
  return value
    .split('_')
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ')
}

function listPersistedRecords(game: GameState): TruthLayerRecord[] {
  const map = game.truthLayerRecords ?? {}
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

  return formatTruthLayerEnumLabel(value)
}

function formatSlotNarrative(slot: TruthLayerSlotProjection): string {
  if (slot.redacted) {
    return '[Redacted]'
  }

  return slot.narrative ?? '—'
}

function formatSlotSummary(slot: TruthLayerSlotProjection): string {
  if (slot.redacted) {
    return '[Redacted]'
  }

  return slot.summary ?? '—'
}

function toSlotView(slot: TruthLayerSlotProjection): TruthLayerMirrorSlotView {
  return Object.freeze({
    narrativeLabel: formatSlotNarrative(slot),
    summaryLabel: formatSlotSummary(slot),
    sourceConfidenceLabel: formatNullableEnum(slot.sourceConfidence),
    knowledgeTierLabel: formatNullableEnum(slot.knowledgeTier),
    redacted: slot.redacted,
  })
}

function toSnapshotView(
  snapshot: TruthLayerWeeklyProjectionSnapshot
): TruthLayerMirrorSnapshotView {
  const ops = snapshot.ops

  return Object.freeze({
    week: snapshot.week,
    mythInfrastructureActiveLabel: formatBoolean(ops.mythInfrastructureActive),
    correctionPressureLabel: formatConfidence(ops.correctionPressure),
    layerDivergenceLabel: formatBoolean(ops.layerDivergence),
    mythDrivesOpsWithoutVerificationLabel: formatBoolean(ops.mythDrivesOpsWithoutVerification),
    claimSourceConfidenceLabel: formatNullableEnum(ops.claimSourceConfidence),
    verificationSourceConfidenceLabel: formatNullableEnum(ops.verificationSourceConfidence),
    redacted: ops.redacted,
  })
}

function toRecordView(
  record: TruthLayerRecord,
  snapshot: TruthLayerWeeklyProjectionSnapshot | undefined
): TruthLayerMirrorRecordView {
  const projection = projectTruthLayerReviewView(record)

  const summaryLabel =
    projection.summary ??
    (projection.redacted && record.summary ? '[Redacted]' : '—')

  return Object.freeze({
    id: record.id,
    label: record.label,
    summaryLabel,
    subjectRef: projection.subjectRef,
    subjectKindLabel: formatTruthLayerEnumLabel(projection.subjectKind),
    claim: toSlotView(projection.claim),
    doctrine: toSlotView(projection.doctrine),
    verification: toSlotView(projection.verification),
    layerDivergenceLabel: formatBoolean(projection.layerDivergence),
    competingLayerCount: projection.competingLayerCount,
    mythInfrastructureActiveLabel: formatBoolean(projection.mythInfrastructureActive),
    correctionPressureLabel: formatConfidence(projection.correctionPressure),
    confidenceLabel: formatConfidence(projection.confidence),
    unknownFieldsLabel:
      projection.unknownFields.length > 0 ? projection.unknownFields.join(', ') : '—',
    redacted: projection.redacted,
    weeklySnapshot: snapshot ? toSnapshotView(snapshot) : null,
  })
}

/** Read-only mirror over hydrated `truthLayerRecords` and weekly projection snapshots. */
export function getTruthLayerMirrorView(game: GameState): TruthLayerMirrorView {
  const records = listPersistedRecords(game)
  const snapshots = game.truthLayerWeeklyProjectionSnapshots ?? {}

  const layerDivergenceCount = records.filter((record) => {
    const projection = projectTruthLayerReviewView(record)
    return projection.layerDivergence
  }).length

  const mythInfrastructureActiveCount = records.filter((record) => {
    const projection = projectTruthLayerReviewView(record)
    return projection.mythInfrastructureActive
  }).length

  const weeklySnapshotCount = records.filter((record) => snapshots[record.id] !== undefined).length

  return Object.freeze({
    isEmpty: records.length === 0,
    summary: Object.freeze({
      totalRecords: records.length,
      layerDivergenceCount,
      mythInfrastructureActiveCount,
      weeklySnapshotCount,
      week: game.week,
    }),
    records: Object.freeze(
      records.map((record) => toRecordView(record, snapshots[record.id]))
    ),
  })
}
