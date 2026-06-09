import type { GameState } from '../../domain/models'
import {
  composeRecurrentCatastrophePostIncidentReviewLinks,
  validateRecurrentCatastrophePostIncidentReviewRefs,
  type RecurrentCatastrophePostIncidentReviewLinkSummary,
} from '../../domain/recurrentCatastrophePostIncidentReviewLinks'
import { formatOptionalPostIncidentReviewEnumLabel } from './postIncidentReviewMirrorView'

export interface RecurrentCatastrophePostIncidentReviewLinkRecordView {
  recordId: string
  linkedReviewCountLabel: string
  reviewLinks: readonly RecurrentCatastrophePostIncidentReviewLinkItemView[]
  unresolvedReviewRefLabels: readonly string[]
  reviewRefValidationWarningLabels: readonly string[]
}

export interface RecurrentCatastrophePostIncidentReviewLinkItemView {
  reviewRefLabel: string
  reviewIdLabel: string
  reviewRouteLabel: string
  closureOutcomeLabel: string
  milestoneSpanWeeksLabel: string
  recurrenceObservedLabel: string
  procedureAdherenceScoreLabel: string
  confidenceLabel: string
  redacted: boolean
}

export interface RecurrentCatastrophePostIncidentReviewLinksSummaryView {
  totalRecords: number
  totalLinkedReviews: number
  totalUnresolvedReviewRefs: number
  week: number
}

export interface RecurrentCatastrophePostIncidentReviewLinksView {
  isEmpty: boolean
  summary: RecurrentCatastrophePostIncidentReviewLinksSummaryView
  records: readonly RecurrentCatastrophePostIncidentReviewLinkRecordView[]
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

function formatRecurrenceObserved(value: boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return '—'
  }

  return value ? 'Yes' : 'No'
}

function toLinkItemView(
  link: RecurrentCatastrophePostIncidentReviewLinkSummary['links'][number]
): RecurrentCatastrophePostIncidentReviewLinkItemView {
  const summary = link.summary

  return Object.freeze({
    reviewRefLabel: link.reviewRef,
    reviewIdLabel: link.reviewId,
    reviewRouteLabel: formatOptionalPostIncidentReviewEnumLabel(summary.reviewRoute),
    closureOutcomeLabel: formatOptionalPostIncidentReviewEnumLabel(summary.closureOutcome),
    milestoneSpanWeeksLabel: formatMilestoneSpanWeeks(summary.milestoneSpanWeeks),
    recurrenceObservedLabel: formatRecurrenceObserved(summary.recurrenceObserved),
    procedureAdherenceScoreLabel: formatUnitScore(summary.procedureAdherenceScore),
    confidenceLabel: formatConfidence(summary.confidence),
    redacted: summary.redacted,
  })
}

function buildRecordView(
  summary: RecurrentCatastrophePostIncidentReviewLinkSummary,
  game: GameState
): RecurrentCatastrophePostIncidentReviewLinkRecordView {
  const record = game.recurrentCatastropheRecords?.[summary.recordId]
  const validation = record
    ? validateRecurrentCatastrophePostIncidentReviewRefs(record, game.postIncidentReviewRecords)
    : null

  const reviewRefValidationWarningLabels = Object.freeze(
    validation
      ? validation.issues
          .filter((issue) => issue.severity === 'warning')
          .map((issue) => issue.detail)
      : []
  )

  return Object.freeze({
    recordId: summary.recordId,
    linkedReviewCountLabel: String(summary.linkedReviewCount),
    reviewLinks: Object.freeze(summary.links.map((link) => toLinkItemView(link))),
    unresolvedReviewRefLabels: Object.freeze([...summary.unresolvedReviewRefs]),
    reviewRefValidationWarningLabels,
  })
}

/** Read-only compose over hydrated catastrophe + review maps; does not re-validate dropped entries. */
export function getRecurrentCatastrophePostIncidentReviewLinksView(
  game: GameState
): RecurrentCatastrophePostIncidentReviewLinksView {
  const catastropheRecords = game.recurrentCatastropheRecords ?? {}
  const reviewRecords = game.postIncidentReviewRecords ?? {}
  const week = game.week

  const summaries = composeRecurrentCatastrophePostIncidentReviewLinks(
    catastropheRecords,
    reviewRecords
  )

  let totalLinkedReviews = 0
  let totalUnresolvedReviewRefs = 0

  const recordViews = summaries.map((summary) => {
    totalLinkedReviews += summary.linkedReviewCount
    totalUnresolvedReviewRefs += summary.unresolvedReviewRefs.length

    return buildRecordView(summary, game)
  })

  return Object.freeze({
    isEmpty: summaries.length === 0,
    summary: Object.freeze({
      totalRecords: summaries.length,
      totalLinkedReviews,
      totalUnresolvedReviewRefs,
      week,
    }),
    records: Object.freeze(recordViews),
  })
}