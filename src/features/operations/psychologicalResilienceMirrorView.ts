import type { GameState } from '../../domain/models'
import {
  projectPsychologicalResilienceReview,
  validatePsychologicalResilienceRecord,
  type PsychologicalResilienceRecord,
  type ResilienceComplication,
  type ResilienceExposureSource,
} from '../../domain/psychologicalResilienceRegistry'

export interface PsychologicalResilienceMirrorRecordView {
  id: string
  label: string
  summaryLabel: string
  operatorRefLabel: string
  depletionBandLabel: string
  exposureScoreLabel: string
  exposureEventCountLabel: string
  recoveryChannelLabel: string
  exposureSourceLabels: readonly string[]
  complicationLabels: readonly string[]
  exposureElevatedLabel: string
  depletionAdvancedLabel: string
  treatmentGatedLabel: string
  restRecoveryEligibleLabel: string
  dutyReliabilityDegradedLabel: string
  counselingRefLabel: string
  validationWarningLabels: readonly string[]
  unknownFieldLabels: readonly string[]
  confidenceLabel: string
  redacted: boolean
}

export interface PsychologicalResilienceMirrorSummaryView {
  totalRecords: number
  exposureElevatedCount: number
  treatmentGatedCount: number
  depletionAdvancedCount: number
  dutyReliabilityDegradedCount: number
  week: number
}

export interface PsychologicalResilienceMirrorView {
  isEmpty: boolean
  summary: PsychologicalResilienceMirrorSummaryView
  records: readonly PsychologicalResilienceMirrorRecordView[]
}

export function formatPsychologicalResilienceEnumLabel(value: string): string {
  return value
    .split('_')
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ')
}

function listPersistedRecords(game: GameState): PsychologicalResilienceRecord[] {
  const map = game.psychologicalResilienceRecords ?? {}
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

function sortedEnumLabels<T extends string>(
  values: readonly T[] | undefined,
  formatter: (value: T) => string
): readonly string[] {
  if (!values || values.length === 0) {
    return Object.freeze([])
  }

  return Object.freeze(
    [...values]
      .sort((left, right) => left.localeCompare(right))
      .map((value) => formatter(value))
  )
}

function sortedExposureSourceLabels(
  sources: readonly ResilienceExposureSource[] | undefined
): readonly string[] {
  return sortedEnumLabels(sources, formatPsychologicalResilienceEnumLabel)
}

function sortedComplicationLabels(
  complications: readonly ResilienceComplication[] | undefined
): readonly string[] {
  return sortedEnumLabels(complications, formatPsychologicalResilienceEnumLabel)
}

function sortedUnknownFieldLabels(unknownFields: readonly string[] | undefined): readonly string[] {
  return Object.freeze([...(unknownFields ?? [])].sort((left, right) => left.localeCompare(right)))
}

function toRecordView(record: PsychologicalResilienceRecord): PsychologicalResilienceMirrorRecordView {
  const projection = projectPsychologicalResilienceReview(record)
  const validation = validatePsychologicalResilienceRecord(record)

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
    operatorRefLabel: record.operatorRef,
    depletionBandLabel: formatPsychologicalResilienceEnumLabel(record.depletionBand),
    exposureScoreLabel: formatUnitScore(projection.exposureScore),
    exposureEventCountLabel: String(record.exposureEventCount),
    recoveryChannelLabel: formatPsychologicalResilienceEnumLabel(record.recoveryChannel),
    exposureSourceLabels: sortedExposureSourceLabels(record.exposureSources),
    complicationLabels: sortedComplicationLabels(record.activeComplications),
    exposureElevatedLabel: formatYesNo(projection.exposureElevated),
    depletionAdvancedLabel: formatYesNo(projection.depletionAdvanced),
    treatmentGatedLabel: formatYesNo(projection.treatmentGated),
    restRecoveryEligibleLabel: formatYesNo(projection.restRecoveryEligible),
    dutyReliabilityDegradedLabel: formatYesNo(projection.dutyReliabilityDegraded),
    counselingRefLabel: formatOptionalRef(record.counselingRef),
    validationWarningLabels,
    unknownFieldLabels: sortedUnknownFieldLabels(projection.unknownFields),
    confidenceLabel: formatConfidence(projection.confidence),
    redacted: projection.redacted,
  })
}

/** Read-only mirror over hydrated `psychologicalResilienceRecords`; does not re-validate dropped entries. */
export function getPsychologicalResilienceMirrorView(
  game: GameState
): PsychologicalResilienceMirrorView {
  const records = listPersistedRecords(game)
  const week = game.week

  let exposureElevatedCount = 0
  let treatmentGatedCount = 0
  let depletionAdvancedCount = 0
  let dutyReliabilityDegradedCount = 0

  const recordViews = records.map((record) => {
    const projection = projectPsychologicalResilienceReview(record)

    if (projection.exposureElevated) {
      exposureElevatedCount += 1
    }

    if (projection.treatmentGated) {
      treatmentGatedCount += 1
    }

    if (projection.depletionAdvanced) {
      depletionAdvancedCount += 1
    }

    if (projection.dutyReliabilityDegraded) {
      dutyReliabilityDegradedCount += 1
    }

    return toRecordView(record)
  })

  return Object.freeze({
    isEmpty: records.length === 0,
    summary: Object.freeze({
      totalRecords: records.length,
      exposureElevatedCount,
      treatmentGatedCount,
      depletionAdvancedCount,
      dutyReliabilityDegradedCount,
      week,
    }),
    records: Object.freeze(recordViews),
  })
}
