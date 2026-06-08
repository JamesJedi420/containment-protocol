import type { GameState } from '../../domain/models'
import type { PostIncidentReviewRecommendationActionRecord } from '../../domain/postIncidentReviewRecommendationActionRegistry'
import type { PostIncidentReviewRecommendationRecord } from '../../domain/postIncidentReviewRecommendationRegistry'
import {
  getPostIncidentReviewMirrorView,
  type PostIncidentReviewMirrorRecordView,
} from './postIncidentReviewMirrorView'

export interface PostIncidentReviewRecommendationActionMirrorLinkedRecommendationView {
  recommendationRef: string
  recommendationLabel: string
  reviewRefLabel: string
  stubSuffixLabel: string
  orchestrationWeekLabel: string
}

export interface PostIncidentReviewRecommendationActionMirrorLinkedReviewView {
  reviewRef: string
  reviewLabel: string
  sourceLabel: string
  linkedCaseIdLabel: string
  orchestrationWeekLabel: string
}

export interface PostIncidentReviewRecommendationActionMirrorRecordView {
  id: string
  label: string
  recommendationRefLabel: string
  reviewRefLabel: string
  stubSuffixLabel: string
  actionTokenLabel: string
  orchestrationWeekLabel: string
  linkedRecommendation: PostIncidentReviewRecommendationActionMirrorLinkedRecommendationView | null
  linkedQualifyingReview: PostIncidentReviewRecommendationActionMirrorLinkedReviewView | null
}

export interface PostIncidentReviewRecommendationActionMirrorSummaryView {
  totalRecords: number
  linkedRecommendationCount: number
  linkedQualifyingReviewCount: number
  week: number
}

export interface PostIncidentReviewRecommendationActionMirrorView {
  isEmpty: boolean
  hasLinkedRecommendations: boolean
  hasLinkedQualifyingReviews: boolean
  summary: PostIncidentReviewRecommendationActionMirrorSummaryView
  linkedQualifyingRecords: readonly PostIncidentReviewRecommendationActionMirrorRecordView[]
  records: readonly PostIncidentReviewRecommendationActionMirrorRecordView[]
}

function listPersistedRecords(
  game: GameState
): PostIncidentReviewRecommendationActionRecord[] {
  const map = game.postIncidentReviewRecommendationActionRecords ?? {}
  return Object.values(map).sort((left, right) => left.id.localeCompare(right.id))
}

function formatWeek(value: number | undefined): string {
  if (value === undefined) {
    return '—'
  }

  return `W${value}`
}

function buildRecommendationIndex(
  game: GameState
): ReadonlyMap<string, PostIncidentReviewRecommendationRecord> {
  const map = game.postIncidentReviewRecommendationRecords ?? {}
  const index = new Map<string, PostIncidentReviewRecommendationRecord>()

  for (const record of Object.values(map)) {
    index.set(record.id, record)
  }

  return index
}

function buildQualifyingReviewIndex(
  game: GameState
): ReadonlyMap<string, PostIncidentReviewMirrorRecordView> {
  const reviewMirror = getPostIncidentReviewMirrorView(game)
  const index = new Map<string, PostIncidentReviewMirrorRecordView>()

  for (const record of reviewMirror.qualifyingIncidentRecords) {
    index.set(record.id, record)
  }

  return index
}

function toLinkedRecommendationView(
  recommendationRef: string,
  recommendation: PostIncidentReviewRecommendationRecord
): PostIncidentReviewRecommendationActionMirrorLinkedRecommendationView {
  return Object.freeze({
    recommendationRef,
    recommendationLabel: recommendation.label,
    reviewRefLabel: recommendation.reviewRef,
    stubSuffixLabel: recommendation.stubSuffix,
    orchestrationWeekLabel: formatWeek(recommendation.orchestrationWeek),
  })
}

function toLinkedReviewView(
  reviewRef: string,
  qualifyingReview: PostIncidentReviewMirrorRecordView
): PostIncidentReviewRecommendationActionMirrorLinkedReviewView {
  return Object.freeze({
    reviewRef,
    reviewLabel: qualifyingReview.label,
    sourceLabel: qualifyingReview.sourceLabel,
    linkedCaseIdLabel: qualifyingReview.linkedCaseIdLabel,
    orchestrationWeekLabel: qualifyingReview.orchestrationWeekLabel,
  })
}

function toRecordView(
  record: PostIncidentReviewRecommendationActionRecord,
  recommendationIndex: ReadonlyMap<string, PostIncidentReviewRecommendationRecord>,
  qualifyingReviewIndex: ReadonlyMap<string, PostIncidentReviewMirrorRecordView>
): PostIncidentReviewRecommendationActionMirrorRecordView {
  const recommendation = recommendationIndex.get(record.recommendationRef)
  const qualifyingReview = qualifyingReviewIndex.get(record.reviewRef)

  return Object.freeze({
    id: record.id,
    label: record.label,
    recommendationRefLabel: record.recommendationRef,
    reviewRefLabel: record.reviewRef,
    stubSuffixLabel: record.stubSuffix,
    actionTokenLabel: record.actionToken,
    orchestrationWeekLabel: formatWeek(record.orchestrationWeek),
    linkedRecommendation: recommendation
      ? toLinkedRecommendationView(record.recommendationRef, recommendation)
      : null,
    linkedQualifyingReview: qualifyingReview
      ? toLinkedReviewView(record.reviewRef, qualifyingReview)
      : null,
  })
}

/** Read-only mirror over hydrated `postIncidentReviewRecommendationActionRecords`; does not re-validate dropped entries. */
export function getPostIncidentReviewRecommendationActionMirrorView(
  game: GameState
): PostIncidentReviewRecommendationActionMirrorView {
  const records = listPersistedRecords(game)
  const week = game.week
  const recommendationIndex = buildRecommendationIndex(game)
  const qualifyingReviewIndex = buildQualifyingReviewIndex(game)

  let linkedRecommendationCount = 0
  let linkedQualifyingReviewCount = 0

  const recordViews = records.map((record) => {
    const recordView = toRecordView(record, recommendationIndex, qualifyingReviewIndex)

    if (recordView.linkedRecommendation) {
      linkedRecommendationCount += 1
    }

    if (recordView.linkedQualifyingReview) {
      linkedQualifyingReviewCount += 1
    }

    return recordView
  })

  const linkedQualifyingRecords = Object.freeze(
    recordViews.filter((record) => record.linkedQualifyingReview !== null)
  )

  return Object.freeze({
    isEmpty: records.length === 0,
    hasLinkedRecommendations: linkedRecommendationCount > 0,
    hasLinkedQualifyingReviews: linkedQualifyingRecords.length > 0,
    summary: Object.freeze({
      totalRecords: records.length,
      linkedRecommendationCount,
      linkedQualifyingReviewCount,
      week,
    }),
    linkedQualifyingRecords,
    records: Object.freeze(recordViews),
  })
}
