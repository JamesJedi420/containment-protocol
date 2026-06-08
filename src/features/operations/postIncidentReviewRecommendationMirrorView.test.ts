import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { applyWeeklyPostIncidentReviewFollowOnArtifactTick } from '../../domain/postIncidentReviewFollowOnArtifact'
import { applyWeeklyPostIncidentReviewFollowOnRecommendationRegistryTick } from '../../domain/postIncidentReviewFollowOnRecommendationRegistry'
import { POST_INCIDENT_REVIEW_STUB_REGISTRY } from '../../domain/postIncidentReviewRegistry'
import { sanitizePostIncidentReviewRecommendationRecords } from '../../domain/postIncidentReviewRecommendationRegistry'
import {
  applyWeeklyPostIncidentReviewCreationTick,
  type QualifyingIncidentReviewDraft,
} from '../../domain/postIncidentReviewWeeklyOrchestration'
import { getPostIncidentReviewRecommendationMirrorView } from './postIncidentReviewRecommendationMirrorView'

describe('postIncidentReviewRecommendationMirrorView (SPE-868 slice 15)', () => {
  const nearCatastropheDraft: QualifyingIncidentReviewDraft = {
    reviewRef: 'review:near-catastrophe-case-major',
    caseId: 'case-major',
    caseTitle: 'District breach',
    trigger: 'near_catastrophe_threshold',
    stage: 4,
    kind: 'raid',
    anchorWeek: 12,
  }

  it('returns empty mirror when postIncidentReviewRecommendationRecords map is empty', () => {
    const game = createStartingState()
    game.postIncidentReviewRecommendationRecords = {}

    const view = getPostIncidentReviewRecommendationMirrorView(game)

    expect(view.isEmpty).toBe(true)
    expect(view.hasLinkedQualifyingReviews).toBe(false)
    expect(view.summary.totalRecords).toBe(0)
    expect(view.summary.linkedQualifyingReviewCount).toBe(0)
    expect(view.linkedQualifyingRecords).toEqual([])
    expect(view.records).toEqual([])
  })

  it('mirrors persisted recommendation fields in byte-stable id order', () => {
    const game = createStartingState()
    game.week = 12
    game.postIncidentReviewRecommendationRecords = {
      'recommendation:beta-stub': {
        id: 'recommendation:beta-stub',
        label: 'Follow-on recommendation — Beta',
        reviewRef: 'review:beta',
        stubSuffix: 'beta-stub',
        followOnToken: 'follow_on:recommendation-stub:beta-stub',
        orchestrationWeek: 12,
      },
      'recommendation:alpha-stub': {
        id: 'recommendation:alpha-stub',
        label: 'Follow-on recommendation — Alpha',
        reviewRef: 'review:alpha',
        stubSuffix: 'alpha-stub',
        followOnToken: 'follow_on:recommendation-stub:alpha-stub',
      },
    }

    const view = getPostIncidentReviewRecommendationMirrorView(game)

    expect(view.isEmpty).toBe(false)
    expect(view.summary.totalRecords).toBe(2)
    expect(view.summary.week).toBe(12)
    expect(view.records.map((record) => record.id)).toEqual([
      'recommendation:alpha-stub',
      'recommendation:beta-stub',
    ])
    expect(view.records[0]).toMatchObject({
      label: 'Follow-on recommendation — Alpha',
      reviewRefLabel: 'review:alpha',
      stubSuffixLabel: 'alpha-stub',
      orchestrationWeekLabel: '—',
      followOnTokenLabel: 'follow_on:recommendation-stub:alpha-stub',
      linkedQualifyingReview: null,
    })
    expect(view.records[1]).toMatchObject({
      orchestrationWeekLabel: 'W12',
    })
  })

  it('links reviewRef to qualifying incident rows from the post-incident review mirror', () => {
    const prior = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }
    const created = applyWeeklyPostIncidentReviewCreationTick(prior, {}, 12, [nearCatastropheDraft])
    const withArtifact = applyWeeklyPostIncidentReviewFollowOnArtifactTick(prior, created)
    const recommendations = applyWeeklyPostIncidentReviewFollowOnRecommendationRegistryTick(
      {},
      prior,
      withArtifact
    )

    const game = createStartingState()
    game.week = 12
    game.postIncidentReviewRecords = withArtifact
    game.postIncidentReviewRecommendationRecords = recommendations

    const view = getPostIncidentReviewRecommendationMirrorView(game)
    const record = view.records[0]

    expect(view.hasLinkedQualifyingReviews).toBe(true)
    expect(view.summary.linkedQualifyingReviewCount).toBe(1)
    expect(view.linkedQualifyingRecords).toHaveLength(1)
    expect(record?.reviewRefLabel).toBe('review:near-catastrophe-case-major')
    expect(record?.linkedQualifyingReview).toMatchObject({
      reviewRef: 'review:near-catastrophe-case-major',
      sourceLabel: 'Near-catastrophe threshold',
      linkedCaseIdLabel: 'case-major',
      orchestrationWeekLabel: 'W12',
    })
  })

  it('does not surface invalid records dropped on hydrate', () => {
    const game = createStartingState()
    game.postIncidentReviewRecommendationRecords = sanitizePostIncidentReviewRecommendationRecords({
      'recommendation:valid-stub': {
        id: 'recommendation:valid-stub',
        label: 'Follow-on recommendation — Valid',
        reviewRef: 'review:valid',
        stubSuffix: 'valid-stub',
        followOnToken: 'follow_on:recommendation-stub:valid-stub',
      },
      'recommendation:invalid-dropped': {
        id: '',
        label: 'Dropped recommendation',
        reviewRef: 'review:invalid',
        stubSuffix: 'invalid-stub',
        followOnToken: 'follow_on:recommendation-stub:invalid-stub',
      },
    })

    const view = getPostIncidentReviewRecommendationMirrorView(game)

    expect(view.summary.totalRecords).toBe(1)
    expect(view.records[0]?.id).toBe('recommendation:valid-stub')
  })

  it('is byte-stable for repeated mirror builds', () => {
    const game = createStartingState()

    const first = JSON.stringify(getPostIncidentReviewRecommendationMirrorView(game))
    const second = JSON.stringify(getPostIncidentReviewRecommendationMirrorView(game))

    expect(first).toBe(second)
  })
})
