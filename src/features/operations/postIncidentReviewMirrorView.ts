import type { GameState } from '../../domain/models'
import {
  projectPostIncidentReviewSummary,
  type PostIncidentReviewRecord,
} from '../../domain/postIncidentReviewRegistry'

export interface PostIncidentReviewMirrorRecordView {
  id: string
  label: string
  summaryLabel: string
  reviewRouteLabel: string
  closureOutcomeLabel: string
  milestoneSpanWeeksLabel: string
  discoveryWeekLabel: string
  responseWeekLabel: string
  containmentWeekLabel: string
  recoveryWeekLabel: string
  reportingWeekLabel: string
  procedureAdherenceScoreLabel: string
  recurrenceObservedLabel: string
  confidenceLabel: string
  unknownFieldLabels: readonly string[]
  redacted: boolean
}

export interface PostIncidentReviewMirrorSummaryView {
  totalRecords: number
  externalAuditRouteCount: number
  recurrenceObservedCount: number
  week: number
}

export interface PostIncidentReviewMirrorView {
  isEmpty: boolean
  summary: PostIncidentReviewMirrorSummaryView
  records: readonly PostIncidentReviewMirrorRecordView[]
}

export function formatPostIncidentReviewEnumLabel(value: string): string {
  return value
    .split('_')
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ')
}

function listPersistedRecords(game: GameState): PostIncidentReviewRecord[] {
  const map = game.postIncidentReviewRecords ?? {}
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

function formatMilestoneSpanWeeks(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—'
  }

  return String(value)
}

function formatWeek(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—'
  }

  return `W${value}`
}

function formatRecurrenceObserved(value: boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return '—'
  }

  return value ? 'Yes' : 'No'
}

function formatMilestoneWeek(
  record: PostIncidentReviewRecord,
  field: keyof NonNullable<PostIncidentReviewRecord['milestoneTimings']>,
  milestoneTimingsRedacted: boolean
): string {
  if (milestoneTimingsRedacted) {
    return '—'
  }

  return formatWeek(record.milestoneTimings?.[field])
}

function toRecordView(record: PostIncidentReviewRecord): PostIncidentReviewMirrorRecordView {
  const projection = projectPostIncidentReviewSummary(record)
  const milestoneTimingsRedacted = (record.redactedFields ?? []).includes('milestoneTimings')

  const summaryLabel = record.summary?.trim() ? record.summary : '—'

  return Object.freeze({
    id: record.id,
    label: record.label,
    summaryLabel,
    reviewRouteLabel: formatPostIncidentReviewEnumLabel(projection.reviewRoute),
    closureOutcomeLabel: formatPostIncidentReviewEnumLabel(projection.closureOutcome),
    milestoneSpanWeeksLabel: formatMilestoneSpanWeeks(projection.milestoneSpanWeeks),
    discoveryWeekLabel: formatMilestoneWeek(record, 'discoveryWeek', milestoneTimingsRedacted),
    responseWeekLabel: formatMilestoneWeek(record, 'responseWeek', milestoneTimingsRedacted),
    containmentWeekLabel: formatMilestoneWeek(record, 'containmentWeek', milestoneTimingsRedacted),
    recoveryWeekLabel: formatMilestoneWeek(record, 'recoveryWeek', milestoneTimingsRedacted),
    reportingWeekLabel: formatMilestoneWeek(record, 'reportingWeek', milestoneTimingsRedacted),
    procedureAdherenceScoreLabel: formatUnitScore(projection.procedureAdherenceScore),
    recurrenceObservedLabel: formatRecurrenceObserved(projection.recurrenceObserved),
    confidenceLabel: formatConfidence(projection.confidence),
    unknownFieldLabels: Object.freeze([...projection.unknownFields]),
    redacted: projection.redacted,
  })
}

/** Read-only mirror over hydrated `postIncidentReviewRecords`; does not re-validate dropped entries. */
export function getPostIncidentReviewMirrorView(game: GameState): PostIncidentReviewMirrorView {
  const records = listPersistedRecords(game)
  const week = game.week

  let externalAuditRouteCount = 0
  let recurrenceObservedCount = 0

  const recordViews = records.map((record) => {
    const projection = projectPostIncidentReviewSummary(record)

    if (projection.reviewRoute === 'external_audit') {
      externalAuditRouteCount += 1
    }

    if (projection.recurrenceObserved === true) {
      recurrenceObservedCount += 1
    }

    return toRecordView(record)
  })

  return Object.freeze({
    isEmpty: records.length === 0,
    summary: Object.freeze({
      totalRecords: records.length,
      externalAuditRouteCount,
      recurrenceObservedCount,
      week,
    }),
    records: Object.freeze(recordViews),
  })
}
