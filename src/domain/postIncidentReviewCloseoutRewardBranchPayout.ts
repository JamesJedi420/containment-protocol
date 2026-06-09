/**
 * SPE-868 slice 29: bounded funding/training credit payouts from closeout reward branches.
 *
 * Reads `reward_branch:` tokens on orchestration-created reviews materialized this tick and
 * applies deterministic funding deltas plus optional training credits when a follow-on
 * training-ref is present. Does not change branch derivation (slice 28).
 */

import {
  applyFundingIncome,
  createInitialFundingState,
  POST_INCIDENT_CLOSEOUT_REWARD_REASON,
  POST_INCIDENT_CLOSEOUT_TRAINING_CREDIT_REASON,
  type FundingState,
} from './funding'
import type { GameState } from './models'
import {
  FOLLOW_ON_TRAINING_REF_PREFIX,
  isOrchestrationCreatedPostIncidentReviewRecord,
} from './postIncidentReviewFollowOnArtifact'
import {
  parseCloseoutRewardBranchToken,
  type PostIncidentCloseoutRewardBranch,
} from './postIncidentReviewCloseoutRewardBranch'
import type { PostIncidentReviewRecordsMap } from './postIncidentReviewRegistry'

export const CLOSEOUT_REWARD_BRANCH_PAYOUT_SOURCE_PREFIX = 'post-incident-closeout-reward:'
export const CLOSEOUT_REWARD_BRANCH_TRAINING_CREDIT_SOURCE_PREFIX =
  'post-incident-closeout-training-credit:'

export { POST_INCIDENT_CLOSEOUT_REWARD_REASON, POST_INCIDENT_CLOSEOUT_TRAINING_CREDIT_REASON }

export interface CloseoutRewardBranchPayoutDeltas {
  readonly fundingDelta: number
  readonly trainingCreditDelta: number
}

export const CLOSEOUT_REWARD_BRANCH_PAYOUT_BY_BRANCH: Readonly<
  Record<PostIncidentCloseoutRewardBranch, CloseoutRewardBranchPayoutDeltas>
> = {
  containment_priority: { fundingDelta: 6, trainingCreditDelta: 3 },
  contested_containment: { fundingDelta: 2, trainingCreditDelta: 0 },
  threshold_mitigation: { fundingDelta: 4, trainingCreditDelta: 2 },
  recurrence_softening: { fundingDelta: 3, trainingCreditDelta: 2 },
}

function asStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === 'string')
}

function buildPayoutSourceId(reviewRef: string): string {
  return `${CLOSEOUT_REWARD_BRANCH_PAYOUT_SOURCE_PREFIX}${reviewRef}`
}

function buildTrainingCreditSourceId(reviewRef: string): string {
  return `${CLOSEOUT_REWARD_BRANCH_TRAINING_CREDIT_SOURCE_PREFIX}${reviewRef}`
}

export function getCloseoutRewardBranchPayoutDeltas(
  branch: PostIncidentCloseoutRewardBranch
): CloseoutRewardBranchPayoutDeltas {
  return CLOSEOUT_REWARD_BRANCH_PAYOUT_BY_BRANCH[branch]
}

export function extractCloseoutRewardBranchFromUnknownFields(
  unknownFields: readonly string[] | undefined
): PostIncidentCloseoutRewardBranch | undefined {
  for (const field of asStringArray(unknownFields)) {
    const branch = parseCloseoutRewardBranchToken(field)
    if (branch) {
      return branch
    }
  }

  return undefined
}

function hasFollowOnTrainingRefToken(fields: readonly string[]): boolean {
  return fields.some((field) => field.startsWith(FOLLOW_ON_TRAINING_REF_PREFIX))
}

export function hasCloseoutRewardBranchPayoutForReview(
  fundingState: FundingState | undefined,
  reviewRef: string
): boolean {
  if (!fundingState) {
    return false
  }

  const sourceId = buildPayoutSourceId(reviewRef)
  return fundingState.fundingHistory.some((entry) => entry.sourceId === sourceId)
}

function collectMaterializedRewardBranchReviewRefs(input: {
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

      return extractCloseoutRewardBranchFromUnknownFields(nextRecord.unknownFields) !== undefined
    })
    .sort((left, right) => left.localeCompare(right))
}

function resolveFundingState(state: GameState): FundingState {
  if (state.agency?.fundingState) {
    return state.agency.fundingState
  }

  return createInitialFundingState(
    state.config.fundingBasePerWeek,
    state.config.fundingPerResolution,
    state.config.fundingPenaltyPerFail,
    state.config.fundingPenaltyPerUnresolved,
    state.funding
  )
}

function applyPayoutToFundingState(
  fundingState: FundingState,
  input: {
    week: number
    reviewRef: string
    fundingDelta: number
    trainingCreditDelta: number
  }
): { fundingState: FundingState; totalDelta: number } {
  const week = Math.max(1, Math.trunc(input.week))
  let current = fundingState
  let totalDelta = 0

  if (input.fundingDelta > 0) {
    current = applyFundingIncome(
      current,
      input.fundingDelta,
      POST_INCIDENT_CLOSEOUT_REWARD_REASON,
      week,
      buildPayoutSourceId(input.reviewRef)
    )
    totalDelta += input.fundingDelta
  }

  if (input.trainingCreditDelta > 0) {
    current = applyFundingIncome(
      current,
      input.trainingCreditDelta,
      POST_INCIDENT_CLOSEOUT_TRAINING_CREDIT_REASON,
      week,
      buildTrainingCreditSourceId(input.reviewRef)
    )
    totalDelta += input.trainingCreditDelta
  }

  return { fundingState: current, totalDelta }
}

/**
 * Applies bounded closeout reward-branch payouts for reviews materialized this tick.
 * Re-applying for the same week is idempotent; stub registry entries are unchanged.
 */
export function applyWeeklyPostIncidentReviewCloseoutRewardBranchPayoutTick(
  state: GameState,
  priorReviews: PostIncidentReviewRecordsMap | null | undefined,
  nextReviews: PostIncidentReviewRecordsMap | null | undefined,
  week: number
): GameState {
  const prior = priorReviews ?? {}
  const next = nextReviews ?? {}
  const materializedRefs = collectMaterializedRewardBranchReviewRefs({
    priorReviews: prior,
    nextReviews: next,
  })

  if (materializedRefs.length === 0) {
    return state
  }

  let fundingState = resolveFundingState(state)
  let funding = state.funding
  let changed = false

  for (const reviewRef of materializedRefs) {
    if (hasCloseoutRewardBranchPayoutForReview(fundingState, reviewRef)) {
      continue
    }

    const record = next[reviewRef]
    if (!record) {
      continue
    }

    const branch = extractCloseoutRewardBranchFromUnknownFields(record.unknownFields)
    if (!branch) {
      continue
    }

    const deltas = getCloseoutRewardBranchPayoutDeltas(branch)
    const unknownFields = asStringArray(record.unknownFields)
    const trainingCreditDelta = hasFollowOnTrainingRefToken(unknownFields)
      ? deltas.trainingCreditDelta
      : 0

    const applied = applyPayoutToFundingState(fundingState, {
      week,
      reviewRef,
      fundingDelta: deltas.fundingDelta,
      trainingCreditDelta,
    })

    if (applied.totalDelta === 0) {
      continue
    }

    fundingState = applied.fundingState
    funding += applied.totalDelta
    changed = true
  }

  if (!changed) {
    return state
  }

  const agency = state.agency ?? {
    containmentRating: state.containmentRating,
    clearanceLevel: state.clearanceLevel,
    funding: state.funding,
    supportAvailable: 0,
  }

  return {
    ...state,
    funding,
    agency: {
      ...agency,
      funding,
      fundingState,
    },
  }
}
