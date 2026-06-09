import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  applyWeeklyPostIncidentReviewCloseoutRewardBranchPayoutTick,
  CLOSEOUT_REWARD_BRANCH_PAYOUT_BY_BRANCH,
  extractCloseoutRewardBranchFromUnknownFields,
  getCloseoutRewardBranchPayoutDeltas,
  hasCloseoutRewardBranchPayoutForReview,
  POST_INCIDENT_CLOSEOUT_REWARD_REASON,
  POST_INCIDENT_CLOSEOUT_TRAINING_CREDIT_REASON,
} from '../domain/postIncidentReviewCloseoutRewardBranchPayout'
import {
  applyWeeklyPostIncidentReviewCloseoutRewardBranchTick,
  buildCloseoutRewardBranchToken,
  type PostIncidentCloseoutRewardBranch,
} from '../domain/postIncidentReviewCloseoutRewardBranch'
import { applyWeeklyPostIncidentReviewFollowOnArtifactTick } from '../domain/postIncidentReviewFollowOnArtifact'
import { POST_INCIDENT_REVIEW_STUB_REGISTRY } from '../domain/postIncidentReviewRegistry'
import {
  applyWeeklyPostIncidentReviewCreationTick,
  buildQualifyingIncidentReviewRecordForDraft,
  type QualifyingIncidentReviewDraft,
} from '../domain/postIncidentReviewWeeklyOrchestration'

function stateReadyForPayout() {
  return {
    ...createStartingState(),
    academyTier: 1,
    funding: 200,
  }
}

function reviewsWithRewardBranchForDraft(
  draft: QualifyingIncidentReviewDraft,
  branch?: PostIncidentCloseoutRewardBranch
) {
  const prior = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }
  const created = applyWeeklyPostIncidentReviewCreationTick(prior, {}, 12, [draft])
  const withRewardBranch = applyWeeklyPostIncidentReviewCloseoutRewardBranchTick(prior, created)
  const withArtifact = applyWeeklyPostIncidentReviewFollowOnArtifactTick(prior, withRewardBranch)

  if (!branch) {
    return { prior, next: withArtifact }
  }

  const record = withArtifact[draft.reviewRef]
  if (!record) {
    return { prior, next: withArtifact }
  }

  const unknownFields = [
    ...((record.unknownFields ?? []) as string[]).filter(
      (field) => !field.startsWith('reward_branch:')
    ),
    buildCloseoutRewardBranchToken(branch),
  ].sort((left, right) => left.localeCompare(right))

  return {
    prior,
    next: {
      ...withArtifact,
      [draft.reviewRef]: {
        ...record,
        unknownFields,
      },
    },
  }
}

describe('postIncidentReviewCloseoutRewardBranchPayout (SPE-868 slice 29)', () => {
  const caseCloseoutDraft: QualifyingIncidentReviewDraft = {
    reviewRef: 'review:case-case-major-closeout',
    caseId: 'case-major',
    caseTitle: 'District breach',
    trigger: 'case_resolved',
    stage: 4,
    kind: 'standard',
    anchorWeek: 12,
  }

  it('exports deterministic bounded deltas for every reward branch', () => {
    const branches = Object.keys(
      CLOSEOUT_REWARD_BRANCH_PAYOUT_BY_BRANCH
    ) as PostIncidentCloseoutRewardBranch[]

    for (const branch of branches) {
      const deltas = getCloseoutRewardBranchPayoutDeltas(branch)
      expect(deltas.fundingDelta).toBeGreaterThan(0)
      expect(deltas.trainingCreditDelta).toBeGreaterThanOrEqual(0)
    }

    expect(getCloseoutRewardBranchPayoutDeltas('containment_priority').fundingDelta).toBeGreaterThan(
      getCloseoutRewardBranchPayoutDeltas('contested_containment').fundingDelta
    )
  })

  it('extracts reward branch tokens from unknownFields', () => {
    expect(
      extractCloseoutRewardBranchFromUnknownFields([
        'orchestration_week:12',
        'reward_branch:threshold_mitigation',
      ])
    ).toBe('threshold_mitigation')
    expect(extractCloseoutRewardBranchFromUnknownFields(['follow_on:training-ref:threat-assessment'])).toBeUndefined()
  })

  it('applies containment_priority funding and training credit when a qualifying review materializes', () => {
    const { prior, next } = reviewsWithRewardBranchForDraft(caseCloseoutDraft)
    const result = applyWeeklyPostIncidentReviewCloseoutRewardBranchPayoutTick(
      stateReadyForPayout(),
      prior,
      next,
      12
    )

    expect(result.funding).toBe(200 + 6 + 3)
    const history = result.agency?.fundingState?.fundingHistory ?? []
    expect(history).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          week: 12,
          delta: 6,
          reason: POST_INCIDENT_CLOSEOUT_REWARD_REASON,
          sourceId: 'post-incident-closeout-reward:review:case-case-major-closeout',
        }),
        expect.objectContaining({
          week: 12,
          delta: 3,
          reason: POST_INCIDENT_CLOSEOUT_TRAINING_CREDIT_REASON,
          sourceId: 'post-incident-closeout-training-credit:review:case-case-major-closeout',
        }),
      ])
    )
  })

  it('applies contested_containment funding without training credit', () => {
    const { prior, next } = reviewsWithRewardBranchForDraft(
      caseCloseoutDraft,
      'contested_containment'
    )
    const result = applyWeeklyPostIncidentReviewCloseoutRewardBranchPayoutTick(
      stateReadyForPayout(),
      prior,
      next,
      12
    )

    expect(result.funding).toBe(202)
    const history = result.agency?.fundingState?.fundingHistory ?? []
    expect(history.some((entry) => entry.reason === POST_INCIDENT_CLOSEOUT_TRAINING_CREDIT_REASON)).toBe(
      false
    )
  })

  it('applies threshold_mitigation deltas for near-catastrophe reviews without training-ref', () => {
    const nearCatastropheDraft: QualifyingIncidentReviewDraft = {
      reviewRef: 'review:near-catastrophe-case-major',
      caseId: 'case-major',
      caseTitle: 'District breach',
      trigger: 'near_catastrophe_threshold',
      stage: 4,
      kind: 'raid',
      anchorWeek: 12,
    }
    const { prior, next } = reviewsWithRewardBranchForDraft(nearCatastropheDraft)
    const result = applyWeeklyPostIncidentReviewCloseoutRewardBranchPayoutTick(
      stateReadyForPayout(),
      prior,
      next,
      12
    )

    expect(result.funding).toBe(204)
    expect(
      result.agency?.fundingState?.fundingHistory.some(
        (entry) => entry.reason === POST_INCIDENT_CLOSEOUT_TRAINING_CREDIT_REASON
      )
    ).toBe(false)
  })

  it('applies recurrence_softening deltas on cycle closeout reviews', () => {
    const record = buildQualifyingIncidentReviewRecordForDraft(caseCloseoutDraft, 12)
    const prior = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }
    const next = {
      'review:cycle-4-closeout': {
        ...record!,
        id: 'review:cycle-4-closeout',
        unknownFields: [
          'orchestration_week:12',
          'reward_branch:recurrence_softening',
          'follow_on:training-ref:threat-assessment',
        ],
      },
    }

    const result = applyWeeklyPostIncidentReviewCloseoutRewardBranchPayoutTick(
      stateReadyForPayout(),
      prior,
      next,
      12
    )

    expect(result.funding).toBe(205)
  })

  it('is idempotent when re-run for the same materialized review', () => {
    const { prior, next } = reviewsWithRewardBranchForDraft(caseCloseoutDraft)
    const baseState = stateReadyForPayout()
    const once = applyWeeklyPostIncidentReviewCloseoutRewardBranchPayoutTick(baseState, prior, next, 12)
    const twice = applyWeeklyPostIncidentReviewCloseoutRewardBranchPayoutTick(once, prior, next, 12)

    expect(twice).toBe(once)
    expect(hasCloseoutRewardBranchPayoutForReview(once.agency?.fundingState, caseCloseoutDraft.reviewRef)).toBe(
      true
    )
  })

  it('skips stub registry fixtures without orchestration week token', () => {
    const prior = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }
    const next = {
      ...prior,
      'review:cycle-3-closeout': {
        ...prior['review:cycle-3-closeout'],
        unknownFields: ['reward_branch:containment_priority'],
      },
    }
    const result = applyWeeklyPostIncidentReviewCloseoutRewardBranchPayoutTick(
      stateReadyForPayout(),
      prior,
      next,
      12
    )

    expect(result.funding).toBe(200)
  })
})
