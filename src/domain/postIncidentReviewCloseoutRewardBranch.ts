/**
 * SPE-868 slice 28: deterministic branching reward logic on qualifying closeout paths.
 *
 * Derives how objectives were completed (containment quality, threshold mitigation,
 * recurrence softening) and persists bounded `reward_branch:` tokens in `unknownFields`.
 * Does not mutate mission payouts or registry schema fields.
 */

import { isOrchestrationCreatedPostIncidentReviewRecord } from './postIncidentReviewFollowOnArtifact'
import {
  validatePostIncidentReviewRecord,
  type PostIncidentReviewRecord,
  type PostIncidentReviewRecordsMap,
} from './postIncidentReviewRegistry'

const CASE_CLOSEOUT_REVIEW_REF_PATTERN = /^review:case-([a-zA-Z0-9_-]+)-closeout$/
const NEAR_CATASTROPHE_REVIEW_REF_PATTERN = /^review:near-catastrophe-([a-zA-Z0-9_-]+)$/
const CYCLE_CLOSEOUT_REVIEW_REF_PATTERN = /^review:cycle-(\d+)-closeout$/

export const CLOSEOUT_REWARD_BRANCH_TOKEN_PREFIX = 'reward_branch:'

/** How qualifying closeout objectives were completed — drives follow-on reward posture. */
export type PostIncidentCloseoutRewardBranch =
  | 'containment_priority'
  | 'contested_containment'
  | 'threshold_mitigation'
  | 'recurrence_softening'

export const POST_INCIDENT_CLOSEOUT_REWARD_BRANCHES: readonly PostIncidentCloseoutRewardBranch[] =
  ['containment_priority', 'contested_containment', 'threshold_mitigation', 'recurrence_softening'] as const

const CONTAINMENT_PRIORITY_ADHERENCE_THRESHOLD = 0.65

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

function hasCloseoutRewardBranchToken(fields: readonly string[]): boolean {
  return fields.some((field) => field.startsWith(CLOSEOUT_REWARD_BRANCH_TOKEN_PREFIX))
}

function isValidUnitScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
}

/**
 * Derives the deterministic reward branch for an orchestration-created qualifying closeout record.
 * Returns undefined for stub fixtures and non-closeout refs.
 */
export function derivePostIncidentCloseoutRewardBranch(
  record: PostIncidentReviewRecord
): PostIncidentCloseoutRewardBranch | undefined {
  if (!isOrchestrationCreatedPostIncidentReviewRecord(record)) {
    return undefined
  }

  const reviewId = normalizeToken(record.id)
  if (!reviewId) {
    return undefined
  }

  if (NEAR_CATASTROPHE_REVIEW_REF_PATTERN.test(reviewId)) {
    return 'threshold_mitigation'
  }

  if (CYCLE_CLOSEOUT_REVIEW_REF_PATTERN.test(reviewId)) {
    return record.recurrenceObserved === true ? 'recurrence_softening' : 'containment_priority'
  }

  if (CASE_CLOSEOUT_REVIEW_REF_PATTERN.test(reviewId)) {
    const adherence = isValidUnitScore(record.procedureAdherenceScore)
      ? record.procedureAdherenceScore
      : 0

    if (record.closureOutcome === 'contained' && adherence >= CONTAINMENT_PRIORITY_ADHERENCE_THRESHOLD) {
      return 'containment_priority'
    }

    return 'contested_containment'
  }

  return undefined
}

export function buildCloseoutRewardBranchToken(
  branch: PostIncidentCloseoutRewardBranch
): string {
  return `${CLOSEOUT_REWARD_BRANCH_TOKEN_PREFIX}${branch}`
}

export function parseCloseoutRewardBranchToken(
  token: string
): PostIncidentCloseoutRewardBranch | undefined {
  const normalized = normalizeToken(token)
  if (!normalized.startsWith(CLOSEOUT_REWARD_BRANCH_TOKEN_PREFIX)) {
    return undefined
  }

  const branch = normalized.slice(CLOSEOUT_REWARD_BRANCH_TOKEN_PREFIX.length)
  return POST_INCIDENT_CLOSEOUT_REWARD_BRANCHES.includes(branch as PostIncidentCloseoutRewardBranch)
    ? (branch as PostIncidentCloseoutRewardBranch)
    : undefined
}

function appendCloseoutRewardBranchToReview(
  record: PostIncidentReviewRecord,
  branch: PostIncidentCloseoutRewardBranch
): PostIncidentReviewRecord | undefined {
  const unknownFields = [...asStringArray(record.unknownFields), buildCloseoutRewardBranchToken(branch)].sort(
    (left, right) => left.localeCompare(right)
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
 * Appends reward-branch tokens for reviews materialized since the prior map snapshot.
 * Re-applying for the same week is idempotent; stub registry entries are unchanged.
 */
export function applyWeeklyPostIncidentReviewCloseoutRewardBranchTick(
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

    const unknownFields = asStringArray(record.unknownFields)
    if (hasCloseoutRewardBranchToken(unknownFields)) {
      continue
    }

    const branch = derivePostIncidentCloseoutRewardBranch(record)
    if (!branch) {
      continue
    }

    const updated = appendCloseoutRewardBranchToReview(record, branch)
    if (!updated) {
      continue
    }

    next[reviewRef] = updated
    changed = true
  }

  return changed ? next : safeReviews
}
