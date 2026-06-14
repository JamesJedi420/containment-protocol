import type { GameState } from '../../domain/models'
import {
  projectCognitiveHazardExposureReview,
  type CognitiveHazardExposureRecord,
} from '../../domain/cognitiveHazardEngine'
import {
  composeCognitiveHazardSimulationTriggerSubjectSummaries,
  type CognitiveHazardSimulationTriggerSubjectSummary,
} from '../../domain/cognitiveHazardSimulationTriggers'
import { formatCognitiveHazardSimulationTriggerSummaryLabels } from '../../domain/cognitiveHazardSimulationTriggerSurfacing'

export interface CognitiveHazardExposureMirrorRecordView {
  id: string
  label: string
  summaryLabel: string
  subjectRefLabel: string
  triggerChannelLabels: readonly string[]
  fearPressureLabel: string
  memeticExposureLabel: string
  aggregateExposurePressureLabel: string
  memoryImpairmentBandLabel: string
  countermeasurePostureLabel: string
  exposureReviewBandLabel: string
  agentDutyDegradedLabel: string
  knowledgeIntegrityDegradedLabel: string
  procedureRestrictionActiveLabel: string
  countermeasureFailedLabel: string
  countermeasureShieldingActiveLabel: string
  memoryImpairmentAdvancedLabel: string
  simulationTriggerKindLabels: readonly string[]
  simulationTriggerChannelLabels: readonly string[]
  unknownFieldLabels: readonly string[]
  confidenceLabel: string
  redacted: boolean
}

export interface CognitiveHazardExposureMirrorSummaryView {
  totalRecords: number
  elevatedExposureCount: number
  simulationTriggerSubjectCount: number
  countermeasureFailedCount: number
  week: number
}

export interface CognitiveHazardExposureMirrorView {
  isEmpty: boolean
  summary: CognitiveHazardExposureMirrorSummaryView
  records: readonly CognitiveHazardExposureMirrorRecordView[]
}

export function formatCognitiveHazardEnumLabel(value: string): string {
  return value
    .split('_')
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ')
}

function listPersistedRecords(game: GameState): CognitiveHazardExposureRecord[] {
  const map = game.cognitiveHazardExposureRecords ?? {}
  return Object.values(map).sort((left, right) => left.id.localeCompare(right.id))
}

function formatUnitScore(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—'
  }

  return value.toFixed(2)
}

function formatYesNo(value: boolean): string {
  return value ? 'Yes' : '—'
}

function resolveSummaryLabel(record: CognitiveHazardExposureRecord, redacted: boolean): string {
  const summary = record.summary?.trim()
  if (!summary) {
    return '—'
  }

  const redactedFields = new Set(record.redactedFields ?? [])
  if (redacted && redactedFields.has('summary')) {
    return '[Redacted]'
  }

  return '—'
}

function findSubjectSummaryForRecord(
  recordId: string,
  subjectRef: string,
  summaries: readonly CognitiveHazardSimulationTriggerSubjectSummary[]
): CognitiveHazardSimulationTriggerSubjectSummary | undefined {
  return summaries.find(
    (summary) =>
      summary.recordIds.includes(recordId) ||
      summary.subjectRef.localeCompare(subjectRef) === 0
  )
}

function toRecordView(
  record: CognitiveHazardExposureRecord,
  subjectSummaries: readonly CognitiveHazardSimulationTriggerSubjectSummary[]
): CognitiveHazardExposureMirrorRecordView {
  const projection = projectCognitiveHazardExposureReview(record)
  const subjectSummary = findSubjectSummaryForRecord(
    record.id,
    projection.subjectRef,
    subjectSummaries
  )
  const triggerLabels = subjectSummary
    ? formatCognitiveHazardSimulationTriggerSummaryLabels(subjectSummary)
    : Object.freeze({
        triggerKindLabels: Object.freeze([] as string[]),
        triggerChannelLabels: Object.freeze([] as string[]),
      })

  return Object.freeze({
    id: projection.recordId,
    label: projection.label,
    summaryLabel: resolveSummaryLabel(record, projection.redacted),
    subjectRefLabel: projection.subjectRef,
    triggerChannelLabels: Object.freeze([...projection.triggerChannelLabels]),
    fearPressureLabel: formatUnitScore(projection.fearPressure),
    memeticExposureLabel: formatUnitScore(projection.memeticExposure),
    aggregateExposurePressureLabel: formatUnitScore(projection.aggregateExposurePressure),
    memoryImpairmentBandLabel: formatCognitiveHazardEnumLabel(projection.memoryImpairmentBand),
    countermeasurePostureLabel: formatCognitiveHazardEnumLabel(projection.countermeasurePosture),
    exposureReviewBandLabel: formatCognitiveHazardEnumLabel(projection.exposureReviewBand),
    agentDutyDegradedLabel: formatYesNo(projection.agentDutyDegraded),
    knowledgeIntegrityDegradedLabel: formatYesNo(projection.knowledgeIntegrityDegraded),
    procedureRestrictionActiveLabel: formatYesNo(projection.procedureRestrictionActive),
    countermeasureFailedLabel: formatYesNo(projection.countermeasureFailed),
    countermeasureShieldingActiveLabel: formatYesNo(projection.countermeasureShieldingActive),
    memoryImpairmentAdvancedLabel: formatYesNo(projection.memoryImpairmentAdvanced),
    simulationTriggerKindLabels: Object.freeze([...triggerLabels.triggerKindLabels]),
    simulationTriggerChannelLabels: Object.freeze([...triggerLabels.triggerChannelLabels]),
    unknownFieldLabels: Object.freeze([...projection.unknownFields]),
    confidenceLabel: formatUnitScore(projection.confidence),
    redacted: projection.redacted,
  })
}

/** Read-only mirror over hydrated `cognitiveHazardExposureRecords`; does not re-validate hidden truth. */
export function getCognitiveHazardExposureMirrorView(
  game: GameState
): CognitiveHazardExposureMirrorView {
  const records = listPersistedRecords(game)
  const subjectSummaries = composeCognitiveHazardSimulationTriggerSubjectSummaries(
    game.cognitiveHazardExposureRecords
  )

  let elevatedExposureCount = 0
  let countermeasureFailedCount = 0

  const recordViews = records.map((record) => {
    const projection = projectCognitiveHazardExposureReview(record)

    if (projection.exposureReviewBand === 'elevated' || projection.exposureReviewBand === 'critical') {
      elevatedExposureCount += 1
    }

    if (projection.countermeasureFailed) {
      countermeasureFailedCount += 1
    }

    return toRecordView(record, subjectSummaries)
  })

  return Object.freeze({
    isEmpty: records.length === 0,
    summary: Object.freeze({
      totalRecords: records.length,
      elevatedExposureCount,
      simulationTriggerSubjectCount: subjectSummaries.length,
      countermeasureFailedCount,
      week: game.week,
    }),
    records: Object.freeze(recordViews),
  })
}
