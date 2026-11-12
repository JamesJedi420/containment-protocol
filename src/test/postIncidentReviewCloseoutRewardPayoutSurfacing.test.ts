import { describe, expect, it } from 'vitest'
import { applyFundingIncome, createInitialFundingState } from '../domain/funding'
import {
  applyWeeklyPostIncidentReviewCloseoutRewardBranchPayoutTick,
  CLOSEOUT_REWARD_BRANCH_PAYOUT_SOURCE_PREFIX,
} from '../domain/postIncidentReviewCloseoutRewardBranchPayout'
import {
  applyWeeklyPostIncidentReviewCloseoutRewardBranchTick,
} from '../domain/postIncidentReviewCloseoutRewardBranch'
import { applyWeeklyPostIncidentReviewFollowOnArtifactTick } from '../domain/postIncidentReviewFollowOnArtifact'
import {
  buildWeeklyPostIncidentReviewCloseoutRewardPayoutReportNotes,
  deriveCloseoutRewardPayoutLineLabelsForReview,
  formatCloseoutRewardPayoutLineLabel,
  formatCloseoutRewardPayoutNoteContent,
} from '../domain/postIncidentReviewCloseoutRewardPayoutSurfacing'
import {
  POST_INCIDENT_REVIEW_STUB_REGISTRY,
  RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE,
} from '../domain/postIncidentReviewRegistry'
import {
  applyWeeklyPostIncidentReviewCreationTick,
  type QualifyingIncidentReviewDraft,
} from '../domain/postIncidentReviewWeeklyOrchestration'
import { createStartingState } from '../data/startingState'

describe('postIncidentReviewCloseoutRewardPayoutSurfacing (SPE-868 slice 30)', () => {
  const caseCloseoutDraft: QualifyingIncidentReviewDraft = {
    reviewRef: 'review:case-case-major-closeout',
    caseId: 'case-major',
    caseTitle: 'District breach',
    trigger: 'case_resolved',
    stage: 4,
    kind: 'standard',
    anchorWeek: 12,
  }

  function reviewsReadyForPayout() {
    const prior = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }
    const created = applyWeeklyPostIncidentReviewCreationTick(prior, {}, 12, [caseCloseoutDraft])
    const withRewardBranch = applyWeeklyPostIncidentReviewCloseoutRewardBranchTick(prior, created)
    return applyWeeklyPostIncidentReviewFollowOnArtifactTick(prior, withRewardBranch)
  }

  it('formats payout line labels without numeric deltas', () => {
    expect(formatCloseoutRewardPayoutLineLabel('funding_credit', 'containment_priority')).toBe(
      'Funding credit — Containment Priority'
    )
    expect(formatCloseoutRewardPayoutLineLabel('training_credit', 'threshold_mitigation')).toBe(
      'Training credit — Threshold Mitigation'
    )
  })

  it('derives payout line labels from funding history for qualifying reviews', () => {
    const prior = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }
    const next = reviewsReadyForPayout()
    const record = next[caseCloseoutDraft.reviewRef]!
    const state = applyWeeklyPostIncidentReviewCloseoutRewardBranchPayoutTick(
      { ...createStartingState(), academyTier: 1, funding: 200 },
      prior,
      next,
      12
    )

    const labels = deriveCloseoutRewardPayoutLineLabelsForReview(
      record,
      state.agency?.fundingState
    )

    expect(labels).toEqual([
      'Funding credit — Containment Priority',
      'Training credit — Containment Priority',
    ])
  })

  it('returns no payout lines when funding history is empty', () => {
    const next = reviewsReadyForPayout()
    const record = next[caseCloseoutDraft.reviewRef]!

    expect(
      deriveCloseoutRewardPayoutLineLabelsForReview(record, createInitialFundingState(0, 0, 0, 0, 0))
    ).toEqual([])
  })

  it('does not derive payout lines for stub registry reviews', () => {
    const stub = RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE
    const fundingState = createInitialFundingState(0, 0, 0, 0, 0)
    const withHistory = applyFundingIncome(
      fundingState,
      6,
      'post_incident_closeout_reward',
      12,
      `${CLOSEOUT_REWARD_BRANCH_PAYOUT_SOURCE_PREFIX}${stub.id}`
    )

    expect(deriveCloseoutRewardPayoutLineLabelsForReview(stub, withHistory)).toEqual([])
  })

  it('builds a weekly report note for materialized payout reviews', () => {
    const prior = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }
    const next = reviewsReadyForPayout()
    const record = next[caseCloseoutDraft.reviewRef]!
    const state = applyWeeklyPostIncidentReviewCloseoutRewardBranchPayoutTick(
      { ...createStartingState(), academyTier: 1, funding: 200 },
      prior,
      next,
      12
    )
    const notes = buildWeeklyPostIncidentReviewCloseoutRewardPayoutReportNotes({
      priorReviews: prior,
      nextReviews: next,
      nextFundingState: state.agency?.fundingState,
      week: 12,
      sequenceStart: 1,
    })

    expect(notes).toHaveLength(1)
    expect(notes[0]?.type).toBe('post_incident_review.closeout_reward_payout')
    expect(notes[0]?.content).toBe(
      formatCloseoutRewardPayoutNoteContent(record, ['funding_credit', 'training_credit'], 'containment_priority')
    )
    expect(notes[0]?.metadata).toMatchObject({
      reviewRef: 'review:case-case-major-closeout',
      rewardBranch: 'containment_priority',
      payoutKinds: ['funding_credit', 'training_credit'],
      week: 12,
    })
  })

  it('is a no-op when no orchestration-created review materializes this tick', () => {
    const prior = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }
    const notes = buildWeeklyPostIncidentReviewCloseoutRewardPayoutReportNotes({
      priorReviews: prior,
      nextReviews: prior,
      nextFundingState: createInitialFundingState(0, 0, 0, 0, 0),
      week: 12,
      sequenceStart: 1,
    })

    expect(notes).toEqual([])
  })

  it('is idempotent when prior map already contains materialized reviews', () => {
    const prior = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }
    const next = reviewsReadyForPayout()
    const state = applyWeeklyPostIncidentReviewCloseoutRewardBranchPayoutTick(
      { ...createStartingState(), academyTier: 1, funding: 200 },
      prior,
      next,
      12
    )
    const once = buildWeeklyPostIncidentReviewCloseoutRewardPayoutReportNotes({
      priorReviews: prior,
      nextReviews: next,
      nextFundingState: state.agency?.fundingState,
      week: 12,
      sequenceStart: 1,
    })
    const twice = buildWeeklyPostIncidentReviewCloseoutRewardPayoutReportNotes({
      priorReviews: next,
      nextReviews: next,
      nextFundingState: state.agency?.fundingState,
      week: 13,
      sequenceStart: 1,
    })

    expect(once).toHaveLength(1)
    expect(twice).toEqual([])
  })
})
