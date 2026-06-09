import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { applyFundingIncome, createInitialFundingState, POST_INCIDENT_CLOSEOUT_REWARD_REASON, POST_INCIDENT_CLOSEOUT_TRAINING_CREDIT_REASON } from '../domain/funding'
import {
  CLOSEOUT_REWARD_BRANCH_PAYOUT_SOURCE_PREFIX,
  CLOSEOUT_REWARD_BRANCH_TRAINING_CREDIT_SOURCE_PREFIX,
} from '../domain/postIncidentReviewCloseoutRewardBranchPayout'
import { applyWeeklyPostIncidentReviewCloseoutRewardBranchTick } from '../domain/postIncidentReviewCloseoutRewardBranch'
import { applyWeeklyPostIncidentReviewFollowOnArtifactTick } from '../domain/postIncidentReviewFollowOnArtifact'
import { POST_INCIDENT_REVIEW_STUB_REGISTRY } from '../domain/postIncidentReviewRegistry'
import {
  applyWeeklyPostIncidentReviewCreationTick,
  type QualifyingIncidentReviewDraft,
} from '../domain/postIncidentReviewWeeklyOrchestration'
import { createStarterCase } from '../domain/templates/startingCases'
import { getCaseListItemView } from '../features/cases/caseView'
import { buildMissionTriageCloseoutRewardPayoutSignals } from '../features/cases/missionTriageCloseoutRewardPayoutSignalView'
import { buildMissionTriageDispositionView } from '../features/cases/missionTriageDispositionView'
import { buildMissionTriageListRowChips } from '../features/cases/missionTriageLayoutView'

describe('missionTriageCloseoutRewardPayoutSignalView (SPE-868 slice 31)', () => {
  const caseCloseoutDraft: QualifyingIncidentReviewDraft = {
    reviewRef: 'review:case-case-major-closeout',
    caseId: 'case-major',
    caseTitle: 'District breach',
    trigger: 'case_resolved',
    stage: 4,
    kind: 'standard',
    anchorWeek: 12,
  }

  function reviewsWithPayoutHistory() {
    const prior = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }
    const created = applyWeeklyPostIncidentReviewCreationTick(prior, {}, 12, [caseCloseoutDraft])
    const withRewardBranch = applyWeeklyPostIncidentReviewCloseoutRewardBranchTick(prior, created)
    const withFollowOn = applyWeeklyPostIncidentReviewFollowOnArtifactTick(prior, withRewardBranch)
    const record = withFollowOn[caseCloseoutDraft.reviewRef]!

    let fundingState = createInitialFundingState(0, 0, 0, 0, 0)
    fundingState = applyFundingIncome(
      fundingState,
      6,
      POST_INCIDENT_CLOSEOUT_REWARD_REASON,
      12,
      `${CLOSEOUT_REWARD_BRANCH_PAYOUT_SOURCE_PREFIX}${record.id}`
    )
    fundingState = applyFundingIncome(
      fundingState,
      3,
      POST_INCIDENT_CLOSEOUT_TRAINING_CREDIT_REASON,
      12,
      `${CLOSEOUT_REWARD_BRANCH_TRAINING_CREDIT_SOURCE_PREFIX}${record.id}`
    )

    return { record, fundingState }
  }

  it('surfaces compact payout markers for linked qualifying reviews', () => {
    const { record, fundingState } = reviewsWithPayoutHistory()
    const state = createStartingState()
    state.postIncidentReviewRecords = { [record.id]: record }
    state.agency = { ...state.agency!, fundingState }

    const mission = createStarterCase({
      id: 'case-major',
      templateId: 'puzzle_whispering_archive',
      stage: 4,
    })
    state.cases[mission.id] = mission

    const signals = buildMissionTriageCloseoutRewardPayoutSignals(mission, state)

    expect(signals.visible).toBe(true)
    expect(signals.markers.map((marker) => marker.label)).toEqual([
      'Closeout: funding',
      'Closeout: training',
    ])
    expect(signals.markers[0]?.title).toBe('Funding credit — Containment Priority')
    expect(signals.markers[1]?.title).toBe('Training credit — Containment Priority')
  })

  it('returns no markers when funding history has no closeout reward entries', () => {
    const prior = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }
    const created = applyWeeklyPostIncidentReviewCreationTick(prior, {}, 12, [caseCloseoutDraft])
    const withRewardBranch = applyWeeklyPostIncidentReviewCloseoutRewardBranchTick(prior, created)
    const record = withRewardBranch[caseCloseoutDraft.reviewRef]!

    const state = createStartingState()
    state.postIncidentReviewRecords = { [record.id]: record }

    const mission = createStarterCase({
      id: 'case-major',
      templateId: 'puzzle_whispering_archive',
      stage: 4,
    })
    state.cases[mission.id] = mission

    expect(buildMissionTriageCloseoutRewardPayoutSignals(mission, state)).toEqual({
      visible: false,
      markers: [],
    })
  })

  it('excludes stub registry reviews without orchestration week tokens', () => {
    const state = createStartingState()
    state.postIncidentReviewRecords = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }

    const mission = state.cases['case-001']
    expect(buildMissionTriageCloseoutRewardPayoutSignals(mission, state)).toEqual({
      visible: false,
      markers: [],
    })
  })

  it('falls back to weekly report note metadata when mirror labels are unavailable', () => {
    const state = createStartingState()
    const mission = createStarterCase({
      id: 'case-major',
      templateId: 'puzzle_whispering_archive',
      stage: 4,
    })
    state.cases[mission.id] = mission
    state.reports = [
      {
        week: 12,
        notes: [
          {
            id: 'note-closeout-payout',
            week: 12,
            content:
              'Post-incident closeout reward — Qualifying incident closeout review — District breach: funding credit (containment priority); training credit (containment priority).',
            type: 'post_incident_review.closeout_reward_payout',
            metadata: {
              reviewRef: 'review:case-case-major-closeout',
              reviewLabel: 'Qualifying incident closeout review — District breach',
              rewardBranch: 'containment_priority',
              payoutKinds: ['funding_credit', 'training_credit'],
              week: 12,
            },
          },
        ],
      },
    ]

    const signals = buildMissionTriageCloseoutRewardPayoutSignals(mission, state)

    expect(signals.visible).toBe(true)
    expect(signals.markers.map((marker) => marker.label)).toEqual([
      'Closeout: funding',
      'Closeout: training',
    ])
  })

  it('integrates closeout payout chips into list row chip builder', () => {
    const { record, fundingState } = reviewsWithPayoutHistory()
    const state = createStartingState()
    state.postIncidentReviewRecords = { [record.id]: record }
    state.agency = { ...state.agency!, fundingState }

    const mission = createStarterCase({
      id: 'case-major',
      templateId: 'puzzle_whispering_archive',
      stage: 4,
    })
    state.cases[mission.id] = mission

    const view = getCaseListItemView(mission, state, {
      includeCovertPrepSignals: true,
      includeIntakeSignals: true,
      includeModalitySignals: true,
      includeCloseoutRewardPayoutSignals: true,
    })
    const chips = buildMissionTriageListRowChips(
      view,
      buildMissionTriageDispositionView(view, state)
    )

    expect(chips.some((chip) => chip.label === 'Closeout: funding')).toBe(true)
    expect(chips.some((chip) => chip.label === 'Closeout: training')).toBe(true)
  })

  it('is byte-stable for repeated signal builds', () => {
    const { record, fundingState } = reviewsWithPayoutHistory()
    const state = createStartingState()
    state.postIncidentReviewRecords = { [record.id]: record }
    state.agency = { ...state.agency!, fundingState }

    const mission = createStarterCase({
      id: 'case-major',
      templateId: 'puzzle_whispering_archive',
      stage: 4,
    })
    state.cases[mission.id] = mission

    const first = JSON.stringify(buildMissionTriageCloseoutRewardPayoutSignals(mission, state))
    const second = JSON.stringify(buildMissionTriageCloseoutRewardPayoutSignals(mission, state))

    expect(first).toBe(second)
  })
})
