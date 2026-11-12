import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  POST_INCIDENT_REVIEW_STUB_REGISTRY,
  RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE,
} from '../domain/postIncidentReviewRegistry'
import {
  applyWeeklyPostIncidentReviewFollowOnArtifactTick,
  FOLLOW_ON_RECOMMENDATION_STUB_PREFIX,
} from '../domain/postIncidentReviewFollowOnArtifact'
import {
  applyWeeklyPostIncidentReviewFollowOnRecommendationActionTick,
} from '../domain/postIncidentReviewFollowOnRecommendationAction'
import {
  applyWeeklyPostIncidentReviewFollowOnRecommendationRegistryTick,
} from '../domain/postIncidentReviewFollowOnRecommendationRegistry'
import {
  buildRecommendationActionRecordFromRecommendation,
  FOLLOW_ON_ACTION_STUB_PREFIX,
  parseFollowOnActionStubToken,
} from '../domain/postIncidentReviewRecommendationActionRegistry'
import {
  applyWeeklyPostIncidentReviewCreationTick,
  type QualifyingIncidentReviewDraft,
} from '../domain/postIncidentReviewWeeklyOrchestration'

function stateReadyForRecommendationAction() {
  return {
    ...createStartingState(),
    academyTier: 1,
  }
}

describe('postIncidentReviewFollowOnRecommendationAction (SPE-868 slice 17)', () => {
  const nearCatastropheDraft: QualifyingIncidentReviewDraft = {
    reviewRef: 'review:near-catastrophe-case-major',
    caseId: 'case-major',
    caseTitle: 'District breach',
    trigger: 'near_catastrophe_threshold',
    stage: 4,
    kind: 'raid',
    anchorWeek: 12,
  }

  const caseCloseoutDraft: QualifyingIncidentReviewDraft = {
    reviewRef: 'review:case-case-major-closeout',
    caseId: 'case-major',
    caseTitle: 'District breach',
    trigger: 'case_resolved',
    stage: 4,
    kind: 'standard',
    anchorWeek: 12,
  }

  function materializeNearCatastropheRecommendations() {
    const prior = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }
    const created = applyWeeklyPostIncidentReviewCreationTick(prior, {}, 12, [nearCatastropheDraft])
    const withArtifact = applyWeeklyPostIncidentReviewFollowOnArtifactTick(prior, created)
    const recommendations = applyWeeklyPostIncidentReviewFollowOnRecommendationRegistryTick(
      {},
      prior,
      withArtifact
    )

    return { prior, recommendations }
  }

  it('parses action-stub tokens and rejects recommendation-stub prefixes', () => {
    expect(parseFollowOnActionStubToken(`${FOLLOW_ON_ACTION_STUB_PREFIX}near-catastrophe-case-major`)).toBe(
      'near-catastrophe-case-major'
    )
    expect(
      parseFollowOnActionStubToken(`${FOLLOW_ON_RECOMMENDATION_STUB_PREFIX}near-catastrophe-case-major`)
    ).toBeUndefined()
    expect(parseFollowOnActionStubToken(`${FOLLOW_ON_ACTION_STUB_PREFIX}`)).toBeUndefined()
  })

  it('builds an action record from a persisted recommendation record', () => {
    const { recommendations } = materializeNearCatastropheRecommendations()
    const recommendation = recommendations['recommendation:near-catastrophe-case-major']
    expect(recommendation).toBeDefined()

    const action = buildRecommendationActionRecordFromRecommendation(recommendation!)

    expect(action).toEqual({
      id: 'action:near-catastrophe-case-major',
      label: 'Follow-on recommendation action — Follow-on recommendation — Near-catastrophe threshold review — District breach',
      recommendationRef: 'recommendation:near-catastrophe-case-major',
      reviewRef: 'review:near-catastrophe-case-major',
      stubSuffix: 'near-catastrophe-case-major',
      actionToken: 'follow_on:action-stub:near-catastrophe-case-major',
      orchestrationWeek: 12,
    })
  })

  it('rejects action records when stub suffix contains forbidden tokens', () => {
    const action = buildRecommendationActionRecordFromRecommendation({
      id: 'recommendation:foundation-audit',
      label: 'External audit recommendation',
      reviewRef: 'review:franchise-stub',
      stubSuffix: 'foundation-audit',
      followOnToken: 'follow_on:recommendation-stub:foundation-audit',
      orchestrationWeek: 12,
    })

    expect(action).toBeUndefined()
  })

  it('appends one action record when a recommendation record materializes', () => {
    const { recommendations } = materializeNearCatastropheRecommendations()
    const next = applyWeeklyPostIncidentReviewFollowOnRecommendationActionTick(
      stateReadyForRecommendationAction(),
      {},
      {},
      recommendations
    )

    expect(next['action:near-catastrophe-case-major']).toMatchObject({
      recommendationRef: 'recommendation:near-catastrophe-case-major',
      reviewRef: 'review:near-catastrophe-case-major',
      actionToken: 'follow_on:action-stub:near-catastrophe-case-major',
      orchestrationWeek: 12,
    })
  })

  it('is idempotent when re-run for the same materialized recommendation', () => {
    const { recommendations } = materializeNearCatastropheRecommendations()
    const state = stateReadyForRecommendationAction()
    const once = applyWeeklyPostIncidentReviewFollowOnRecommendationActionTick(state, {}, {}, recommendations)
    const twice = applyWeeklyPostIncidentReviewFollowOnRecommendationActionTick(
      state,
      once,
      recommendations,
      recommendations
    )

    expect(twice).toBe(once)
    expect(Object.keys(twice)).toHaveLength(1)
  })

  it('does not append actions for training-ref closeouts or quiet ticks', () => {
    const prior = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }
    const quiet = applyWeeklyPostIncidentReviewFollowOnRecommendationActionTick(
      stateReadyForRecommendationAction(),
      {},
      {},
      {}
    )

    expect(quiet).toEqual({})

    const created = applyWeeklyPostIncidentReviewCreationTick(prior, {}, 12, [caseCloseoutDraft])
    const withArtifact = applyWeeklyPostIncidentReviewFollowOnArtifactTick(prior, created)
    const recommendations = applyWeeklyPostIncidentReviewFollowOnRecommendationRegistryTick(
      {},
      prior,
      withArtifact
    )
    const closeoutPath = applyWeeklyPostIncidentReviewFollowOnRecommendationActionTick(
      stateReadyForRecommendationAction(),
      {},
      {},
      recommendations
    )

    expect(recommendations).toEqual({})
    expect(closeoutPath).toEqual({})
    expect(withArtifact['review:case-case-major-closeout']?.unknownFields).toContain(
      'follow_on:training-ref:threat-assessment'
    )
  })

  it('only appends action for recommendation stub on dual-path same tick', () => {
    const prior = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }
    const created = applyWeeklyPostIncidentReviewCreationTick(prior, {}, 12, [
      caseCloseoutDraft,
      nearCatastropheDraft,
    ])
    const withArtifact = applyWeeklyPostIncidentReviewFollowOnArtifactTick(prior, created)
    const recommendations = applyWeeklyPostIncidentReviewFollowOnRecommendationRegistryTick(
      {},
      prior,
      withArtifact
    )
    const next = applyWeeklyPostIncidentReviewFollowOnRecommendationActionTick(
      stateReadyForRecommendationAction(),
      {},
      {},
      recommendations
    )

    expect(Object.keys(recommendations)).toEqual(['recommendation:near-catastrophe-case-major'])
    expect(Object.keys(next)).toEqual(['action:near-catastrophe-case-major'])
    expect(next['action:near-catastrophe-case-major']?.recommendationRef).toBe(
      'recommendation:near-catastrophe-case-major'
    )
  })

  it('skips action materialization when academy tier blocks institutional follow-through', () => {
    const { recommendations } = materializeNearCatastropheRecommendations()
    const next = applyWeeklyPostIncidentReviewFollowOnRecommendationActionTick(
      createStartingState(),
      {},
      {},
      recommendations
    )

    expect(next).toEqual({})
  })

  it('does not append actions for stub registry reviews on a quiet tick', () => {
    const prior = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }
    const next = applyWeeklyPostIncidentReviewFollowOnRecommendationActionTick(
      stateReadyForRecommendationAction(),
      {},
      {},
      {}
    )

    expect(next).toEqual({})
    expect(prior[RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE.id]).toEqual(
      RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE
    )
  })
})
