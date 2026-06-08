/**
 * SPE-868 slice 14: persist recommendation-stub follow-on tokens into GameState registry.
 *
 * When orchestration-created reviews materialize with recommendation-stub tokens, append one
 * bounded recommendation record per review ref. Training-ref tokens are ignored.
 */

import {
  FOLLOW_ON_RECOMMENDATION_STUB_PREFIX,
  isOrchestrationCreatedPostIncidentReviewRecord,
} from './postIncidentReviewFollowOnArtifact'
import { extractFollowOnArtifactTokenFromUnknownFields } from './postIncidentReviewFollowOnWeeklyReportNotes'
import type { PostIncidentReviewRecord, PostIncidentReviewRecordsMap } from './postIncidentReviewRegistry'
import {
  validatePostIncidentReviewRecommendationRecord,
  type PostIncidentReviewRecommendationRecord,
  type PostIncidentReviewRecommendationRecordsMap,
} from './postIncidentReviewRecommendationRegistry'

const ORCHESTRATION_WEEK_TOKEN_PREFIX = 'orchestration_week:'
const RECOMMENDATION_ID_PREFIX = 'recommendation:'

function normalizeToken(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === 'string')
}

function freezeRecord(
  record: PostIncidentReviewRecommendationRecord
): PostIncidentReviewRecommendationRecord {
  return Object.freeze({ ...record })
}

function parseOrchestrationWeek(unknownFields: readonly string[] | undefined): number | undefined {
  const token = asStringArray(unknownFields).find((field) =>
    field.startsWith(ORCHESTRATION_WEEK_TOKEN_PREFIX)
  )
  if (!token) {
    return undefined
  }

  const week = Number.parseInt(token.slice(ORCHESTRATION_WEEK_TOKEN_PREFIX.length), 10)
  return Number.isFinite(week) && week >= 0 && week === Math.trunc(week) ? week : undefined
}

/** Returns a bounded stub suffix from a follow-on recommendation-stub token, or undefined. */
export function parseFollowOnRecommendationStubToken(token: string): string | undefined {
  if (!token.startsWith(FOLLOW_ON_RECOMMENDATION_STUB_PREFIX)) {
    return undefined
  }

  const stubSuffix = token.slice(FOLLOW_ON_RECOMMENDATION_STUB_PREFIX.length).trim()
  return stubSuffix.length > 0 ? stubSuffix : undefined
}

function buildRecommendationId(stubSuffix: string): string {
  return `${RECOMMENDATION_ID_PREFIX}${stubSuffix}`
}

/**
 * Builds one recommendation registry record from an orchestration-created review carrying a stub token.
 * Returns undefined when the record is ineligible or the token fails validation.
 */
export function buildRecommendationRecordFromReview(
  record: PostIncidentReviewRecord,
  followOnToken: string
): PostIncidentReviewRecommendationRecord | undefined {
  if (!isOrchestrationCreatedPostIncidentReviewRecord(record)) {
    return undefined
  }

  const stubSuffix = parseFollowOnRecommendationStubToken(followOnToken)
  if (!stubSuffix) {
    return undefined
  }

  const reviewRef = normalizeToken(record.id)
  if (!reviewRef) {
    return undefined
  }

  const orchestrationWeek = parseOrchestrationWeek(record.unknownFields)
  const candidate: PostIncidentReviewRecommendationRecord = {
    id: buildRecommendationId(stubSuffix),
    label: `Follow-on recommendation — ${normalizeToken(record.label) || reviewRef}`,
    reviewRef,
    stubSuffix,
    followOnToken,
    ...(orchestrationWeek !== undefined ? { orchestrationWeek } : {}),
  }

  if (!validatePostIncidentReviewRecommendationRecord(candidate).valid) {
    return undefined
  }

  return freezeRecord(candidate)
}

function collectMaterializedFollowOnRecommendationStubReviewRefs(input: {
  priorReviews: PostIncidentReviewRecordsMap
  nextReviews: PostIncidentReviewRecordsMap
}): readonly string[] {
  return Object.keys(input.nextReviews)
    .filter((reviewRef) => {
      const nextRecord = input.nextReviews[reviewRef]
      if (!nextRecord || input.priorReviews[reviewRef]) {
        return false
      }

      if (!isOrchestrationCreatedPostIncidentReviewRecord(nextRecord)) {
        return false
      }

      const token = extractFollowOnArtifactTokenFromUnknownFields(nextRecord.unknownFields)
      return token !== undefined && parseFollowOnRecommendationStubToken(token) !== undefined
    })
    .sort((left, right) => left.localeCompare(right))
}

/**
 * Appends recommendation registry records for stub artifacts on reviews materialized this tick.
 * Re-applying for the same week is idempotent; training-ref tokens and stub registry reviews are skipped.
 */
export function applyWeeklyPostIncidentReviewFollowOnRecommendationRegistryTick(
  priorRecommendations: PostIncidentReviewRecommendationRecordsMap | null | undefined,
  priorReviews: PostIncidentReviewRecordsMap | null | undefined,
  nextReviews: PostIncidentReviewRecordsMap | null | undefined
): PostIncidentReviewRecommendationRecordsMap {
  const prior = priorRecommendations ?? {}
  const priorReviewMap = priorReviews ?? {}
  const next = nextReviews ?? {}
  const materializedRefs = collectMaterializedFollowOnRecommendationStubReviewRefs({
    priorReviews: priorReviewMap,
    nextReviews: next,
  })

  if (materializedRefs.length === 0) {
    return prior
  }

  const nextRecommendations: PostIncidentReviewRecommendationRecordsMap = { ...prior }
  let changed = false

  for (const reviewRef of materializedRefs) {
    const record = next[reviewRef]
    if (!record) {
      continue
    }

    const token = extractFollowOnArtifactTokenFromUnknownFields(record.unknownFields)
    if (!token) {
      continue
    }

    const recommendation = buildRecommendationRecordFromReview(record, token)
    if (!recommendation || nextRecommendations[recommendation.id]) {
      continue
    }

    nextRecommendations[recommendation.id] = recommendation
    changed = true
  }

  return changed ? nextRecommendations : prior
}
