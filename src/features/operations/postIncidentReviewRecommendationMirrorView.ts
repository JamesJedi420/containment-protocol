import type { GameState } from '../../domain/models'
import type { PostIncidentReviewRecommendationRecord } from '../../domain/postIncidentReviewRecommendationRegistry'
import {
  getPostIncidentReviewMirrorView,
  type PostIncidentReviewMirrorRecordView,
} from './postIncidentReviewMirrorView'

export interface PostIncidentReviewRecommendationMirrorLinkedReviewView {
  reviewRef: string
  reviewLabel: string
  sourceLabel: string
  linkedCaseIdLabel: string
  orchestrationWeekLabel: string
}

export interface PostIncidentReviewRecommendationMirrorRecordView {
  id: string
  label: string
  reviewRefLabel: string
  stubSuffixLabel: string
  orchestrationWeekLabel: string
  followOnTokenLabel: string
  linkedQualifyingReview: PostIncidentReviewRecommendationMirrorLinkedReviewView | null
}

export interface PostIncidentReviewRecommendationMirrorSummaryView {
  totalRecords: number
  linkedQualifyingReviewCount: number
  week: number
}

export interface PostIncidentReviewRecommendationMirrorView {
  isEmpty: boolean
  hasLinkedQualifyingReviews: boolean
  summary: PostIncidentReviewRecommendationMirrorSummaryView
  linkedQualifyingRecords: readonly PostIncidentReviewRecommendationMirrorRecordView[]
  records: readonly PostIncidentReviewRecommendationMirrorRecordView[]
}

function listPersistedRecords(game: GameState): PostIncidentReviewRecommendationRecord[] {
  const map = game.postIncidentReviewRecommendationRecords ?? {}
  return Object.values(map).sort((left, right) => left.id.localeCompare(right.id))
}

function formatWeek(value: number | undefined): string {
  if (value === undefined) {
    return '—'
  }

  return `W${value}`
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

function toLinkedReviewView(
  reviewRef: string,
  qualifyingReview: PostIncidentReviewMirrorRecordView
): PostIncidentReviewRecommendationMirrorLinkedReviewView {
  return Object.freeze({
    reviewRef,
    reviewLabel: qualifyingReview.label,
    sourceLabel: qualifyingReview.sourceLabel,
    linkedCaseIdLabel: qualifyingReview.linkedCaseIdLabel,
    orchestrationWeekLabel: qualifyingReview.orchestrationWeekLabel,
  })
}

function toRecordView(
  record: PostIncidentReviewRecommendationRecord,
  qualifyingReviewIndex: ReadonlyMap<string, PostIncidentReviewMirrorRecordView>
): PostIncidentReviewRecommendationMirrorRecordView {
  const qualifyingReview = qualifyingReviewIndex.get(record.reviewRef)

  return Object.freeze({
    id: record.id,
    label: record.label,
    reviewRefLabel: record.reviewRef,
    stubSuffixLabel: record.stubSuffix,
    orchestrationWeekLabel: formatWeek(record.orchestrationWeek),
    followOnTokenLabel: record.followOnToken,
    linkedQualifyingReview: qualifyingReview
      ? toLinkedReviewView(record.reviewRef, qualifyingReview)
      : null,
  })
}

/** Read-only mirror over hydrated `postIncidentReviewRecommendationRecords`; does not re-validate dropped entries. */
export function getPostIncidentReviewRecommendationMirrorView(
  game: GameState
): PostIncidentReviewRecommendationMirrorView {
  const records = listPersistedRecords(game)
  const week = game.week
  const qualifyingReviewIndex = buildQualifyingReviewIndex(game)

  let linkedQualifyingReviewCount = 0

  const recordViews = records.map((record) => {
    const recordView = toRecordView(record, qualifyingReviewIndex)

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
    hasLinkedQualifyingReviews: linkedQualifyingRecords.length > 0,
    summary: Object.freeze({
      totalRecords: records.length,
      linkedQualifyingReviewCount,
      week,
    }),
    linkedQualifyingRecords,
    records: Object.freeze(recordViews),
  })
}
