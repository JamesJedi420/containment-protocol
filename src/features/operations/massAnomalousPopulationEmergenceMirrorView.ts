import type { GameState } from '../../domain/models'
import type { PopulationEmergenceRecord } from '../../domain/massAnomalousPopulationEmergenceRegistry'
import { resolvePopulationEmergenceGovernanceSurgeForWeek } from '../../domain/massAnomalousPopulationEmergenceWeeklyGovernance'

export interface MassAnomalousPopulationEmergenceMirrorTriageSymptomView {
  lane: string
  symptomLabel: string
  capacityGapHintLabel: string | null
}

export interface MassAnomalousPopulationEmergenceMirrorRecordView {
  id: string
  label: string
  summaryLabel: string
  magnitudeBandLabel: string
  newlyAnomalousCountLabel: string
  registrationBacklogWeeksLabel: string
  governanceModeLabel: string
  triageLaneLabels: readonly string[]
  rightsReviewQueueLabels: readonly string[]
  publicEducationBurdenLabel: string
  effectivePublicEducationBurdenLabel: string
  governanceSurgeBandLabel: string
  triageLaneSymptoms: readonly MassAnomalousPopulationEmergenceMirrorTriageSymptomView[]
  securitySurgeRefLabels: readonly string[]
  confidenceLabel: string
  redacted: boolean
}

export interface MassAnomalousPopulationEmergenceMirrorSummaryView {
  totalRecords: number
  registrationBacklogActiveCount: number
  collapsedMasqueradeCount: number
  week: number
}

export interface MassAnomalousPopulationEmergenceMirrorView {
  isEmpty: boolean
  summary: MassAnomalousPopulationEmergenceMirrorSummaryView
  records: readonly MassAnomalousPopulationEmergenceMirrorRecordView[]
}

export function formatPopulationEmergenceEnumLabel(value: string): string {
  return value
    .split('_')
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ')
}

function listPersistedRecords(game: GameState): PopulationEmergenceRecord[] {
  const map = game.massAnomalousPopulationEmergenceRecords ?? {}
  return Object.values(map).sort((left, right) => left.id.localeCompare(right.id))
}

function formatConfidence(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—'
  }

  return value.toFixed(2)
}

function formatUnitScore(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—'
  }

  return value.toFixed(2)
}

function formatPopulationCount(value: number): string {
  return value.toLocaleString('en-US')
}

function toRecordView(
  record: PopulationEmergenceRecord,
  week: number
): MassAnomalousPopulationEmergenceMirrorRecordView {
  const projection = resolvePopulationEmergenceGovernanceSurgeForWeek(record, week)

  const summaryLabel = record.summary
    ? projection.redacted
      ? '[Redacted]'
      : record.summary
    : '—'

  return Object.freeze({
    id: record.id,
    label: record.label,
    summaryLabel,
    magnitudeBandLabel: formatPopulationEmergenceEnumLabel(projection.emergenceMagnitudeBand),
    newlyAnomalousCountLabel: formatPopulationCount(record.newlyAnomalousCountEstimate),
    registrationBacklogWeeksLabel: String(record.registrationBacklogWeeks),
    governanceModeLabel: formatPopulationEmergenceEnumLabel(projection.governanceMode),
    triageLaneLabels: Object.freeze([...record.triageLanes]),
    rightsReviewQueueLabels: Object.freeze([...(record.rightsReviewQueueRefs ?? [])]),
    publicEducationBurdenLabel: formatUnitScore(projection.recordedPublicEducationBurden),
    effectivePublicEducationBurdenLabel: formatUnitScore(projection.effectivePublicEducationBurden),
    governanceSurgeBandLabel: projection.governanceSurgeBand
      ? formatPopulationEmergenceEnumLabel(projection.governanceSurgeBand)
      : '—',
    triageLaneSymptoms: Object.freeze(
      projection.triageLaneSymptoms.map((symptom) =>
        Object.freeze({
          lane: symptom.lane,
          symptomLabel: symptom.symptomDescriptor,
          capacityGapHintLabel: symptom.capacityGapHint,
        })
      )
    ),
    securitySurgeRefLabels: Object.freeze([...(record.securitySurgeRefs ?? [])]),
    confidenceLabel: formatConfidence(projection.confidence),
    redacted: projection.redacted,
  })
}

/** Read-only mirror over hydrated `massAnomalousPopulationEmergenceRecords`; does not re-validate dropped entries. */
export function getMassAnomalousPopulationEmergenceMirrorView(
  game: GameState
): MassAnomalousPopulationEmergenceMirrorView {
  const records = listPersistedRecords(game)

  const registrationBacklogActiveCount = records.filter(
    (record) => record.registrationBacklogWeeks > 0
  ).length
  const collapsedMasqueradeCount = records.filter(
    (record) => record.governanceMode === 'collapsed_masquerade'
  ).length

  return Object.freeze({
    isEmpty: records.length === 0,
    summary: Object.freeze({
      totalRecords: records.length,
      registrationBacklogActiveCount,
      collapsedMasqueradeCount,
      week: game.week,
    }),
    records: Object.freeze(records.map((record) => toRecordView(record, game.week))),
  })
}
