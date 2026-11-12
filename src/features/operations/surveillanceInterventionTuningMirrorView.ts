import type { GameState } from '../../domain/models'
import {
  INTERVENTION_HORIZON_BANDS,
  projectSurveillanceInterventionTuningReview,
  validateSurveillanceInterventionTuningRecord,
  type InterventionHorizonOutcome,
  type SurveillanceInterventionTuningRecord,
} from '../../domain/surveillanceCapacityInterventionTuningRegistry'

export interface SurveillanceInterventionTuningMirrorRecordView {
  id: string
  label: string
  summaryLabel: string
  subjectRefLabel: string
  interventionLevelLabel: string
  surveillanceSignalScoreLabel: string
  meaningfulContactScoreLabel: string
  healthcareLoadScoreLabel: string
  collateralStrainScoreLabel: string
  horizonOutcomeLabels: readonly string[]
  monitoringExceedsContactLabel: string
  sustainedUnderCollateralStrainLabel: string
  tuningRationaleRefLabel: string
  validationWarningLabels: readonly string[]
  unknownFieldLabels: readonly string[]
  confidenceLabel: string
  redacted: boolean
}

export interface SurveillanceInterventionTuningMirrorSummaryView {
  totalRecords: number
  monitoringExceedsContactCount: number
  sustainedUnderCollateralStrainCount: number
  week: number
}

export interface SurveillanceInterventionTuningMirrorView {
  isEmpty: boolean
  summary: SurveillanceInterventionTuningMirrorSummaryView
  records: readonly SurveillanceInterventionTuningMirrorRecordView[]
}

export function formatSurveillanceInterventionTuningEnumLabel(value: string): string {
  return value
    .split('_')
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ')
}

function listPersistedRecords(game: GameState): SurveillanceInterventionTuningRecord[] {
  const map = game.surveillanceInterventionTuningRecords ?? {}
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

function formatYesNo(value: boolean): string {
  return value ? 'Yes' : '—'
}

function formatOptionalRef(value: string | undefined): string {
  return value?.trim() ? value : '—'
}

function sortedUnknownFieldLabels(unknownFields: readonly string[] | undefined): readonly string[] {
  return Object.freeze([...(unknownFields ?? [])].sort((left, right) => left.localeCompare(right)))
}

function formatHealthcareLoadScore(record: SurveillanceInterventionTuningRecord): string {
  const redactedFields = new Set(record.redactedFields ?? [])
  if (redactedFields.has('healthcareLoadScore')) {
    return '—'
  }

  const value = record.healthcareLoadScore
  if (value === undefined || value === null) {
    return '—'
  }

  return formatUnitScore(value)
}

function sortedHorizonOutcomeLabels(
  record: SurveillanceInterventionTuningRecord
): readonly string[] {
  const horizonOutcomes = record.horizonOutcomes
  if (!horizonOutcomes) {
    return Object.freeze([])
  }

  return Object.freeze(
    INTERVENTION_HORIZON_BANDS.flatMap((band) => {
      const outcome = horizonOutcomes[band]
      if (!outcome) {
        return []
      }

      return [`${formatSurveillanceInterventionTuningEnumLabel(band)}: ${formatHorizonOutcomeLabel(outcome)}`]
    })
  )
}

function formatHorizonOutcomeLabel(value: InterventionHorizonOutcome): string {
  return formatSurveillanceInterventionTuningEnumLabel(value)
}

function toRecordView(
  record: SurveillanceInterventionTuningRecord
): SurveillanceInterventionTuningMirrorRecordView {
  const projection = projectSurveillanceInterventionTuningReview(record)
  const validation = validateSurveillanceInterventionTuningRecord(record)

  const validationWarningLabels = Object.freeze(
    validation.issues
      .filter((issue) => issue.severity === 'warning')
      .map((issue) => issue.detail)
  )

  const summaryLabel = record.summary?.trim() ? record.summary : '—'

  return Object.freeze({
    id: record.id,
    label: record.label,
    summaryLabel,
    subjectRefLabel: record.subjectRef,
    interventionLevelLabel: formatSurveillanceInterventionTuningEnumLabel(
      record.currentInterventionLevel
    ),
    surveillanceSignalScoreLabel: formatUnitScore(projection.surveillanceSignalScore),
    meaningfulContactScoreLabel: formatUnitScore(projection.meaningfulContactScore),
    healthcareLoadScoreLabel: formatHealthcareLoadScore(record),
    collateralStrainScoreLabel: formatUnitScore(projection.collateralStrainScore),
    horizonOutcomeLabels: sortedHorizonOutcomeLabels(record),
    monitoringExceedsContactLabel: formatYesNo(projection.monitoringExceedsContact),
    sustainedUnderCollateralStrainLabel: formatYesNo(projection.sustainedUnderCollateralStrain),
    tuningRationaleRefLabel: formatOptionalRef(record.tuningRationaleRef),
    validationWarningLabels,
    unknownFieldLabels: sortedUnknownFieldLabels(projection.unknownFields),
    confidenceLabel: formatConfidence(projection.confidence),
    redacted: projection.redacted,
  })
}

/** Read-only mirror over hydrated `surveillanceInterventionTuningRecords`; does not re-validate dropped entries. */
export function getSurveillanceInterventionTuningMirrorView(
  game: GameState
): SurveillanceInterventionTuningMirrorView {
  const records = listPersistedRecords(game)
  const week = game.week

  let monitoringExceedsContactCount = 0
  let sustainedUnderCollateralStrainCount = 0

  const recordViews = records.map((record) => {
    const projection = projectSurveillanceInterventionTuningReview(record)

    if (projection.monitoringExceedsContact) {
      monitoringExceedsContactCount += 1
    }

    if (projection.sustainedUnderCollateralStrain) {
      sustainedUnderCollateralStrainCount += 1
    }

    return toRecordView(record)
  })

  return Object.freeze({
    isEmpty: records.length === 0,
    summary: Object.freeze({
      totalRecords: records.length,
      monitoringExceedsContactCount,
      sustainedUnderCollateralStrainCount,
      week,
    }),
    records: Object.freeze(recordViews),
  })
}
