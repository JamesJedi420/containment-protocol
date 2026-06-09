/**
 * SPE-868 slice 30: read-only closeout reward payout line surfacing for mirror and report notes.
 *
 * Projects branch tokens and qualifying `fundingHistory` payout sourceIds into legibility labels
 * without numeric deltas — no payout logic changes (slice 29).
 */

import type { FundingState } from './models'
import { isOrchestrationCreatedPostIncidentReviewRecord } from './postIncidentReviewFollowOnArtifact'
import {
  CLOSEOUT_REWARD_BRANCH_PAYOUT_SOURCE_PREFIX,
  CLOSEOUT_REWARD_BRANCH_TRAINING_CREDIT_SOURCE_PREFIX,
  extractCloseoutRewardBranchFromUnknownFields,
  POST_INCIDENT_CLOSEOUT_REWARD_REASON,
  POST_INCIDENT_CLOSEOUT_TRAINING_CREDIT_REASON,
} from './postIncidentReviewCloseoutRewardBranchPayout'
import type { PostIncidentCloseoutRewardBranch } from './postIncidentReviewCloseoutRewardBranch'
import type { PostIncidentReviewRecord, PostIncidentReviewRecordsMap } from './postIncidentReviewRegistry'
import type { ReportNote } from './models'
import { createDeterministicReportNote } from './reportNotes'

export type CloseoutRewardPayoutLineKind = 'funding_credit' | 'training_credit'

const PAYOUT_LINE_KIND_ORDER: readonly CloseoutRewardPayoutLineKind[] = [
  'funding_credit',
  'training_credit',
]

function humanizeRewardBranch(branch: PostIncidentCloseoutRewardBranch): string {
  return branch.replace(/_/g, ' ')
}

function formatPostIncidentReviewEnumLabel(value: string): string {
  return value
    .split('_')
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ')
}

export function formatCloseoutRewardPayoutLineLabel(
  kind: CloseoutRewardPayoutLineKind,
  branch: PostIncidentCloseoutRewardBranch
): string {
  const branchLabel = formatPostIncidentReviewEnumLabel(branch)
  const kindLabel = kind === 'funding_credit' ? 'Funding credit' : 'Training credit'
  return `${kindLabel} — ${branchLabel}`
}

function buildPayoutSourceId(reviewRef: string): string {
  return `${CLOSEOUT_REWARD_BRANCH_PAYOUT_SOURCE_PREFIX}${reviewRef}`
}

function buildTrainingCreditSourceId(reviewRef: string): string {
  return `${CLOSEOUT_REWARD_BRANCH_TRAINING_CREDIT_SOURCE_PREFIX}${reviewRef}`
}

function hasFundingHistoryPayoutEntry(
  fundingState: FundingState | undefined,
  reviewRef: string,
  kind: CloseoutRewardPayoutLineKind
): boolean {
  if (!fundingState || fundingState.fundingHistory.length === 0) {
    return false
  }

  const sourceId =
    kind === 'funding_credit'
      ? buildPayoutSourceId(reviewRef)
      : buildTrainingCreditSourceId(reviewRef)
  const reason =
    kind === 'funding_credit'
      ? POST_INCIDENT_CLOSEOUT_REWARD_REASON
      : POST_INCIDENT_CLOSEOUT_TRAINING_CREDIT_REASON

  return fundingState.fundingHistory.some(
    (entry) => entry.sourceId === sourceId && entry.reason === reason
  )
}

/**
 * Derives stable payout line labels for a review from branch tokens and funding history.
 * Returns an empty list when history is empty or no qualifying payout entries exist.
 */
export function deriveCloseoutRewardPayoutLineLabelsForReview(
  record: PostIncidentReviewRecord,
  fundingState: FundingState | undefined
): readonly string[] {
  if (!isOrchestrationCreatedPostIncidentReviewRecord(record)) {
    return []
  }

  const branch = extractCloseoutRewardBranchFromUnknownFields(record.unknownFields)
  if (!branch) {
    return []
  }

  if (!fundingState || fundingState.fundingHistory.length === 0) {
    return []
  }

  const lines = PAYOUT_LINE_KIND_ORDER.filter((kind) =>
    hasFundingHistoryPayoutEntry(fundingState, record.id, kind)
  ).map((kind) => formatCloseoutRewardPayoutLineLabel(kind, branch))

  return Object.freeze(lines)
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

function collectPayoutKindsForReview(
  reviewRef: string,
  fundingState: FundingState | undefined
): readonly CloseoutRewardPayoutLineKind[] {
  return Object.freeze(
    PAYOUT_LINE_KIND_ORDER.filter((kind) =>
      hasFundingHistoryPayoutEntry(fundingState, reviewRef, kind)
    )
  )
}

export function formatCloseoutRewardPayoutNoteContent(
  record: PostIncidentReviewRecord,
  payoutKinds: readonly CloseoutRewardPayoutLineKind[],
  branch: PostIncidentCloseoutRewardBranch
): string {
  const branchLabel = humanizeRewardBranch(branch)
  const kindPhrases = payoutKinds.map((kind) =>
    kind === 'funding_credit'
      ? `funding credit (${branchLabel})`
      : `training credit (${branchLabel})`
  )

  return `Post-incident closeout reward — ${record.label}: ${kindPhrases.join('; ')}.`
}

/**
 * Builds deterministic weekly report notes for closeout reward payouts materialized this tick.
 */
export function buildWeeklyPostIncidentReviewCloseoutRewardPayoutReportNotes(input: {
  priorReviews: PostIncidentReviewRecordsMap | null | undefined
  nextReviews: PostIncidentReviewRecordsMap | null | undefined
  nextFundingState: FundingState | null | undefined
  week: number
  sequenceStart: number
  baseTimestamp?: number
}): ReportNote[] {
  const priorReviews = input.priorReviews ?? {}
  const nextReviews = input.nextReviews ?? {}
  const materializedRefs = collectMaterializedRewardBranchReviewRefs({
    priorReviews,
    nextReviews,
  })

  if (materializedRefs.length === 0) {
    return []
  }

  const notes: ReportNote[] = []
  let sequence = input.sequenceStart

  for (const reviewRef of materializedRefs) {
    const record = nextReviews[reviewRef]
    if (!record) {
      continue
    }

    const branch = extractCloseoutRewardBranchFromUnknownFields(record.unknownFields)
    if (!branch) {
      continue
    }

    const payoutKinds = collectPayoutKindsForReview(reviewRef, input.nextFundingState ?? undefined)
    if (payoutKinds.length === 0) {
      continue
    }

    notes.push(
      createDeterministicReportNote(
        formatCloseoutRewardPayoutNoteContent(record, payoutKinds, branch),
        input.week,
        sequence,
        input.baseTimestamp,
        'post_incident_review.closeout_reward_payout',
        {
          reviewRef,
          reviewLabel: record.label,
          rewardBranch: branch,
          payoutKinds: [...payoutKinds],
          week: input.week,
        }
      )
    )
    sequence += 1
  }

  return notes
}
