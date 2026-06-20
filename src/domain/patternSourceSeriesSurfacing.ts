/**
 * SPE-2497 slice 5: read-only surfacing for pattern source series weekly transitions.
 *
 * Compares pre-tick vs post-tick persisted records and formats transition summaries
 * for weekly report notes — safe labels only; no hidden truth beyond registry fields.
 */

import type {
  PatternSourceSeriesRecord,
  PatternSourceSeriesRecordsMap,
  ProcessingStatus,
} from './patternSourceSeriesRegistry'

export type PatternSourceSeriesWeeklyTransitionKind =
  | 'processing_status_advanced'
  | 'readiness_score_changed'

export interface PatternSourceSeriesWeeklyTransitionSummary {
  readonly recordId: string
  readonly label: string
  readonly transitionKinds: readonly PatternSourceSeriesWeeklyTransitionKind[]
  readonly priorProcessingStatus: ProcessingStatus
  readonly nextProcessingStatus: ProcessingStatus
  readonly priorReadinessScore: number
  readonly nextReadinessScore: number
  readonly structuredReasons: readonly string[]
}

function formatEnumLabel(value: string): string {
  return value
    .split('_')
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ')
}

function formatReadinessScore(score: number): string {
  return score.toFixed(2)
}

function composeWeeklyTransitionSummary(input: {
  priorRecord: PatternSourceSeriesRecord
  nextRecord: PatternSourceSeriesRecord
}): PatternSourceSeriesWeeklyTransitionSummary | undefined {
  const transitionKinds: PatternSourceSeriesWeeklyTransitionKind[] = []
  const structuredReasons: string[] = []

  const priorStatus = input.priorRecord.processingStatus
  const nextStatus = input.nextRecord.processingStatus
  if (priorStatus !== nextStatus) {
    transitionKinds.push('processing_status_advanced')
    structuredReasons.push(`status:${priorStatus}->${nextStatus}`)
  }

  const priorReadinessScore = input.priorRecord.readinessScore
  const nextReadinessScore = input.nextRecord.readinessScore
  if (priorReadinessScore !== nextReadinessScore) {
    transitionKinds.push('readiness_score_changed')
    structuredReasons.push(`readiness:${priorReadinessScore}->${nextReadinessScore}`)
  }

  if (transitionKinds.length === 0) {
    return undefined
  }

  return Object.freeze({
    recordId: input.nextRecord.id,
    label: input.nextRecord.title,
    transitionKinds: Object.freeze(
      [...transitionKinds].sort((left, right) => left.localeCompare(right))
    ),
    priorProcessingStatus: priorStatus,
    nextProcessingStatus: nextStatus,
    priorReadinessScore,
    nextReadinessScore,
    structuredReasons: Object.freeze(structuredReasons),
  })
}

/**
 * Builds transition summaries for records that changed during the weekly tick.
 */
export function composePatternSourceSeriesWeeklyTransitionSummaries(input: {
  priorRecords: PatternSourceSeriesRecordsMap | null | undefined
  nextRecords: PatternSourceSeriesRecordsMap | null | undefined
}): readonly PatternSourceSeriesWeeklyTransitionSummary[] {
  const priorRecords = input.priorRecords ?? {}
  const nextRecords = input.nextRecords ?? {}
  const recordIds = Object.keys(nextRecords).sort((left, right) => left.localeCompare(right))

  if (recordIds.length === 0) {
    return []
  }

  const summaries: PatternSourceSeriesWeeklyTransitionSummary[] = []

  for (const recordId of recordIds) {
    const nextRecord = nextRecords[recordId]
    const priorRecord = priorRecords[recordId]
    if (!nextRecord || !priorRecord) {
      continue
    }

    const summary = composeWeeklyTransitionSummary({ priorRecord, nextRecord })
    if (summary) {
      summaries.push(summary)
    }
  }

  return Object.freeze(summaries)
}

export function formatPatternSourceSeriesWeeklyTransitionKindLabel(
  kind: PatternSourceSeriesWeeklyTransitionKind
): string {
  switch (kind) {
    case 'processing_status_advanced':
      return 'Processing status advanced'
    case 'readiness_score_changed':
      return 'Readiness score changed'
  }
}

export function formatPatternSourceSeriesWeeklyTransitionNoteContent(
  summary: PatternSourceSeriesWeeklyTransitionSummary
): string {
  const kindLabels = summary.transitionKinds.map((kind) =>
    formatPatternSourceSeriesWeeklyTransitionKindLabel(kind)
  )

  return `Pattern source series weekly transition — ${summary.label}: ${kindLabels.join('; ')}. Processing ${formatEnumLabel(summary.priorProcessingStatus)} → ${formatEnumLabel(summary.nextProcessingStatus)}; readiness ${formatReadinessScore(summary.priorReadinessScore)} → ${formatReadinessScore(summary.nextReadinessScore)}.`
}
