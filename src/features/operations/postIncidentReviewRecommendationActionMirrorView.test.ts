import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { applyWeeklyPostIncidentReviewFollowOnArtifactTick } from '../../domain/postIncidentReviewFollowOnArtifact'
import { applyWeeklyPostIncidentReviewFollowOnRecommendationActionTick } from '../../domain/postIncidentReviewFollowOnRecommendationAction'
import { applyWeeklyPostIncidentReviewFollowOnRecommendationRegistryTick } from '../../domain/postIncidentReviewFollowOnRecommendationRegistry'
import { POST_INCIDENT_REVIEW_STUB_REGISTRY } from '../../domain/postIncidentReviewRegistry'
import { sanitizePostIncidentReviewRecommendationActionRecords } from '../../domain/postIncidentReviewRecommendationActionRegistry'
import {
  applyWeeklyPostIncidentReviewCreationTick,
  type QualifyingIncidentReviewDraft,
} from '../../domain/postIncidentReviewWeeklyOrchestration'
import { getPostIncidentReviewRecommendationActionMirrorView } from './postIncidentReviewRecommendationActionMirrorView'

describe('postIncidentReviewRecommendationActionMirrorView (SPE-868 slice 18)', () => {
  const nearCatastropheDraft: QualifyingIncidentReviewDraft = {
    reviewRef: 'review:near-catastrophe-case-major',
    caseId: 'case-major',
    caseTitle: 'District breach',
    trigger: 'near_catastrophe_threshold',
    stage: 4,
    kind: 'raid',
    anchorWeek: 12,
  }

  function materializeNearCatastropheActionRecords() {
    const prior = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }
    const created = applyWeeklyPostIncidentReviewCreationTick(prior, {}, 12, [nearCatastropheDraft])
    const withArtifact = applyWeeklyPostIncidentReviewFollowOnArtifactTick(prior, created)
    const recommendations = applyWeeklyPostIncidentReviewFollowOnRecommendationRegistryTick(
      {},
      prior,
      withArtifact
    )
    const actions = applyWeeklyPostIncidentReviewFollowOnRecommendationActionTick(
      { ...createStartingState(), academyTier: 1 },
      {},
      {},
      recommendations
    )

    return { withArtifact, recommendations, actions }
  }

  it('returns empty mirror when postIncidentReviewRecommendationActionRecords map is empty', () => {
    const game = createStartingState()
    game.postIncidentReviewRecommendationActionRecords = {}

    const view = getPostIncidentReviewRecommendationActionMirrorView(game)

    expect(view.isEmpty).toBe(true)
    expect(view.hasLinkedRecommendations).toBe(false)
    expect(view.hasLinkedQualifyingReviews).toBe(false)
    expect(view.summary.totalRecords).toBe(0)
    expect(view.summary.linkedRecommendationCount).toBe(0)
    expect(view.summary.linkedQualifyingReviewCount).toBe(0)
    expect(view.linkedQualifyingRecords).toEqual([])
    expect(view.records).toEqual([])
  })

  it('mirrors persisted action fields in byte-stable id order', () => {
    const game = createStartingState()
    game.week = 12
    game.postIncidentReviewRecommendationActionRecords = {
      'action:beta-stub': {
        id: 'action:beta-stub',
        label: 'Follow-on recommendation action — Beta',
        recommendationRef: 'recommendation:beta-stub',
        reviewRef: 'review:beta',
        stubSuffix: 'beta-stub',
        actionToken: 'follow_on:action-stub:beta-stub',
        orchestrationWeek: 12,
      },
      'action:alpha-stub': {
        id: 'action:alpha-stub',
        label: 'Follow-on recommendation action — Alpha',
        recommendationRef: 'recommendation:alpha-stub',
        reviewRef: 'review:alpha',
        stubSuffix: 'alpha-stub',
        actionToken: 'follow_on:action-stub:alpha-stub',
      },
    }

    const view = getPostIncidentReviewRecommendationActionMirrorView(game)

    expect(view.isEmpty).toBe(false)
    expect(view.summary.totalRecords).toBe(2)
    expect(view.summary.week).toBe(12)
    expect(view.records.map((record) => record.id)).toEqual(['action:alpha-stub', 'action:beta-stub'])
    expect(view.records[0]).toMatchObject({
      label: 'Follow-on recommendation action — Alpha',
      recommendationRefLabel: 'recommendation:alpha-stub',
      reviewRefLabel: 'review:alpha',
      stubSuffixLabel: 'alpha-stub',
      orchestrationWeekLabel: '—',
      actionTokenLabel: 'follow_on:action-stub:alpha-stub',
      linkedRecommendation: null,
      linkedQualifyingReview: null,
    })
    expect(view.records[1]).toMatchObject({
      orchestrationWeekLabel: 'W12',
    })
  })

  it('links recommendationRef and reviewRef to persisted recommendation and qualifying review rows', () => {
    const { withArtifact, recommendations, actions } = materializeNearCatastropheActionRecords()

    const game = createStartingState()
    game.week = 12
    game.postIncidentReviewRecords = withArtifact
    game.postIncidentReviewRecommendationRecords = recommendations
    game.postIncidentReviewRecommendationActionRecords = actions

    const view = getPostIncidentReviewRecommendationActionMirrorView(game)
    const record = view.records[0]

    expect(view.hasLinkedRecommendations).toBe(true)
    expect(view.hasLinkedQualifyingReviews).toBe(true)
    expect(view.summary.linkedRecommendationCount).toBe(1)
    expect(view.summary.linkedQualifyingReviewCount).toBe(1)
    expect(view.linkedQualifyingRecords).toHaveLength(1)
    expect(record?.recommendationRefLabel).toBe('recommendation:near-catastrophe-case-major')
    expect(record?.reviewRefLabel).toBe('review:near-catastrophe-case-major')
    expect(record?.linkedRecommendation).toMatchObject({
      recommendationRef: 'recommendation:near-catastrophe-case-major',
      reviewRefLabel: 'review:near-catastrophe-case-major',
      stubSuffixLabel: 'near-catastrophe-case-major',
    })
    expect(record?.linkedQualifyingReview).toMatchObject({
      reviewRef: 'review:near-catastrophe-case-major',
      sourceLabel: 'Near-catastrophe threshold',
      linkedCaseIdLabel: 'case-major',
      orchestrationWeekLabel: 'W12',
    })
  })

  it('leaves recommendation linkage null when recommendation exists but qualifying review row is missing', () => {
    const game = createStartingState()
    game.week = 12
    game.postIncidentReviewRecommendationRecords = {
      'recommendation:orphan-stub': {
        id: 'recommendation:orphan-stub',
        label: 'Follow-on recommendation — Orphan',
        reviewRef: 'review:missing-qualifying',
        stubSuffix: 'orphan-stub',
        followOnToken: 'follow_on:recommendation-stub:orphan-stub',
      },
    }
    game.postIncidentReviewRecommendationActionRecords = {
      'action:orphan-stub': {
        id: 'action:orphan-stub',
        label: 'Follow-on recommendation action — Orphan',
        recommendationRef: 'recommendation:orphan-stub',
        reviewRef: 'review:missing-qualifying',
        stubSuffix: 'orphan-stub',
        actionToken: 'follow_on:action-stub:orphan-stub',
      },
    }

    const view = getPostIncidentReviewRecommendationActionMirrorView(game)
    const record = view.records[0]

    expect(view.summary.linkedRecommendationCount).toBe(1)
    expect(view.summary.linkedQualifyingReviewCount).toBe(0)
    expect(view.hasLinkedQualifyingReviews).toBe(false)
    expect(view.linkedQualifyingRecords).toEqual([])
    expect(record?.linkedRecommendation).toMatchObject({
      recommendationRef: 'recommendation:orphan-stub',
    })
    expect(record?.linkedQualifyingReview).toBeNull()
  })

  it('does not surface invalid records dropped on hydrate', () => {
    const game = createStartingState()
    game.postIncidentReviewRecommendationActionRecords =
      sanitizePostIncidentReviewRecommendationActionRecords({
        'action:valid-stub': {
          id: 'action:valid-stub',
          label: 'Follow-on recommendation action — Valid',
          recommendationRef: 'recommendation:valid-stub',
          reviewRef: 'review:valid',
          stubSuffix: 'valid-stub',
          actionToken: 'follow_on:action-stub:valid-stub',
        },
        'action:invalid-dropped': {
          id: '',
          label: 'Dropped action',
          recommendationRef: 'recommendation:invalid',
          reviewRef: 'review:invalid',
          stubSuffix: 'invalid-stub',
          actionToken: 'follow_on:action-stub:invalid-stub',
        },
      })

    const view = getPostIncidentReviewRecommendationActionMirrorView(game)

    expect(view.summary.totalRecords).toBe(1)
    expect(view.records[0]?.id).toBe('action:valid-stub')
  })

  it('is byte-stable for repeated mirror builds', () => {
    const game = createStartingState()

    const first = JSON.stringify(getPostIncidentReviewRecommendationActionMirrorView(game))
    const second = JSON.stringify(getPostIncidentReviewRecommendationActionMirrorView(game))

    expect(first).toBe(second)
  })
})
