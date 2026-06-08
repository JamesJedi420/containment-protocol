/**
 * SPE-868 slice 10: deterministic follow-on artifact references for orchestration-created reviews.
 *
 * Appends bounded training-reference or recommendation-stub tokens to review `unknownFields`
 * when a qualifying retrospective record materializes. Does not queue training or mutate mirror UI.
 */

import {
  validatePostIncidentReviewRecord,
  type PostIncidentReviewRecord,
  type PostIncidentReviewRecordsMap,
  type PostIncidentReviewRoute,
} from './postIncidentReviewRegistry'

const ORCHESTRATION_WEEK_TOKEN_PREFIX = 'orchestration_week:'
export const FOLLOW_ON_TRAINING_REF_PREFIX = 'follow_on:training-ref:'
export const FOLLOW_ON_RECOMMENDATION_STUB_PREFIX = 'follow_on:recommendation-stub:'

const TRAINING_REF_BY_ROUTE: Readonly<Record<PostIncidentReviewRoute, string>> = {
  internal_command: 'threat-assessment',
  external_audit: 'analysis-lab',
  outside_review: 'field-improv',
  reform_mandate: 'combat-drills',
}

function normalizeToken(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === 'string')
}

function freezeRecord(record: PostIncidentReviewRecord): PostIncidentReviewRecord {
  return Object.freeze({ ...record })
}

function hasFollowOnArtifactToken(fields: readonly string[]): boolean {
  return fields.some(
    (field) =>
      field.startsWith(FOLLOW_ON_TRAINING_REF_PREFIX) ||
      field.startsWith(FOLLOW_ON_RECOMMENDATION_STUB_PREFIX)
  )
}

/** Whether a review record was created by weekly orchestration (not a starting-state stub). */
export function isOrchestrationCreatedPostIncidentReviewRecord(
  record: PostIncidentReviewRecord
): boolean {
  return asStringArray(record.unknownFields).some((field) =>
    field.startsWith(ORCHESTRATION_WEEK_TOKEN_PREFIX)
  )
}

function recommendationStubSuffix(reviewRef: string): string {
  return normalizeToken(reviewRef).replace(/^review:/, '')
}

/**
 * Builds one deterministic follow-on artifact token for an orchestration-created review.
 * Returns undefined when the record is ineligible or already carries a follow-on token.
 */
export function buildFollowOnArtifactTokenForReview(
  record: PostIncidentReviewRecord
): string | undefined {
  if (!isOrchestrationCreatedPostIncidentReviewRecord(record)) {
    return undefined
  }

  const unknownFields = asStringArray(record.unknownFields)
  if (hasFollowOnArtifactToken(unknownFields)) {
    return undefined
  }

  const reviewRef = normalizeToken(record.id)
  if (!reviewRef) {
    return undefined
  }

  const route = record.reviewRoute
  if (route === 'external_audit' || route === 'outside_review' || route === 'reform_mandate') {
    return `${FOLLOW_ON_RECOMMENDATION_STUB_PREFIX}${recommendationStubSuffix(reviewRef)}`
  }

  const trainingRef = TRAINING_REF_BY_ROUTE[route] ?? TRAINING_REF_BY_ROUTE.internal_command
  return `${FOLLOW_ON_TRAINING_REF_PREFIX}${trainingRef}`
}

function appendFollowOnArtifactToReview(
  record: PostIncidentReviewRecord,
  token: string
): PostIncidentReviewRecord | undefined {
  const unknownFields = [...asStringArray(record.unknownFields), token].sort((left, right) =>
    left.localeCompare(right)
  )

  const candidate: PostIncidentReviewRecord = {
    ...record,
    unknownFields,
  }

  if (!validatePostIncidentReviewRecord(candidate).valid) {
    return undefined
  }

  return freezeRecord(candidate)
}

/**
 * Appends follow-on artifact references for reviews materialized since the prior map snapshot.
 * Re-applying for the same week is idempotent; stub registry entries are unchanged.
 */
export function applyWeeklyPostIncidentReviewFollowOnArtifactTick(
  priorReviews: PostIncidentReviewRecordsMap | null | undefined,
  reviews: PostIncidentReviewRecordsMap | null | undefined
): PostIncidentReviewRecordsMap {
  const safePrior = priorReviews ?? {}
  const safeReviews = reviews ?? {}
  const reviewRefs = Object.keys(safeReviews)

  if (reviewRefs.length === 0) {
    return safeReviews
  }

  const materializedRefs = reviewRefs
    .filter((reviewRef) => {
      const record = safeReviews[reviewRef]
      return record && !safePrior[reviewRef] && isOrchestrationCreatedPostIncidentReviewRecord(record)
    })
    .sort((left, right) => left.localeCompare(right))

  if (materializedRefs.length === 0) {
    return safeReviews
  }

  const next: PostIncidentReviewRecordsMap = { ...safeReviews }
  let changed = false

  for (const reviewRef of materializedRefs) {
    const record = next[reviewRef]
    if (!record) {
      continue
    }

    const token = buildFollowOnArtifactTokenForReview(record)
    if (!token) {
      continue
    }

    const updated = appendFollowOnArtifactToReview(record, token)
    if (!updated) {
      continue
    }

    next[reviewRef] = updated
    changed = true
  }

  return changed ? next : safeReviews
}
