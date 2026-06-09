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
  applyWeeklyPostIncidentReviewFollowOnRecommendationRegistryTick,
  buildRecommendationRecordFromReview,
  parseFollowOnRecommendationStubToken,
} from '../domain/postIncidentReviewFollowOnRecommendationRegistry'
import {
  applyWeeklyPostIncidentReviewCreationTick,
  type QualifyingIncidentReviewDraft,
} from '../domain/postIncidentReviewWeeklyOrchestration'

describe('postIncidentReviewFollowOnRecommendationRegistry (SPE-868 slice 14)', () => {
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

  it('parses recommendation-stub tokens and rejects training refs', () => {
    expect(
      parseFollowOnRecommendationStubToken(
        `${FOLLOW_ON_RECOMMENDATION_STUB_PREFIX}near-catastrophe-case-major`
      )
    ).toBe('near-catastrophe-case-major')
    expect(parseFollowOnRecommendationStubToken('follow_on:training-ref:threat-assessment')).toBeUndefined()
    expect(parseFollowOnRecommendationStubToken(`${FOLLOW_ON_RECOMMENDATION_STUB_PREFIX}`)).toBeUndefined()
  })

  it('builds a recommendation record from an orchestration-created near-catastrophe review', () => {
    const prior = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }
    const created = applyWeeklyPostIncidentReviewCreationTick(prior, {}, 12, [nearCatastropheDraft])
    const withArtifact = applyWeeklyPostIncidentReviewFollowOnArtifactTick(prior, created)
    const review = withArtifact['review:near-catastrophe-case-major']
    const token = review?.unknownFields?.find((field) =>
      field.startsWith(FOLLOW_ON_RECOMMENDATION_STUB_PREFIX)
    )
    expect(review).toBeDefined()
    expect(token).toBeDefined()

    const recommendation = buildRecommendationRecordFromReview(review!, token!)

    expect(recommendation).toEqual({
      id: 'recommendation:near-catastrophe-case-major',
      label: 'Follow-on recommendation — Near-catastrophe threshold review — District breach',
      reviewRef: 'review:near-catastrophe-case-major',
      stubSuffix: 'near-catastrophe-case-major',
      followOnToken: 'follow_on:recommendation-stub:near-catastrophe-case-major',
      orchestrationWeek: 12,
    })
  })

  it('rejects recommendation records when stub suffix contains forbidden tokens', () => {
    const review = {
      id: 'review:franchise-stub',
      label: 'External audit review',
      reviewRoute: 'external_audit' as const,
      closureOutcome: 'administratively_cleared' as const,
      unknownFields: [
        'follow_on:recommendation-stub:foundation-audit',
        'orchestration_week:12',
      ],
    }

    expect(
      buildRecommendationRecordFromReview(
        review,
        'follow_on:recommendation-stub:foundation-audit'
      )
    ).toBeUndefined()
  })

  it('appends one recommendation record when a near-catastrophe review materializes', () => {
    const prior = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }
    const created = applyWeeklyPostIncidentReviewCreationTick(prior, {}, 12, [nearCatastropheDraft])
    const withArtifact = applyWeeklyPostIncidentReviewFollowOnArtifactTick(prior, created)
    const next = applyWeeklyPostIncidentReviewFollowOnRecommendationRegistryTick({}, prior, withArtifact)

    expect(next['recommendation:near-catastrophe-case-major']).toMatchObject({
      reviewRef: 'review:near-catastrophe-case-major',
      stubSuffix: 'near-catastrophe-case-major',
      followOnToken: 'follow_on:recommendation-stub:near-catastrophe-case-major',
      orchestrationWeek: 12,
    })
  })

  it('is idempotent when re-run for the same materialized review', () => {
    const prior = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }
    const created = applyWeeklyPostIncidentReviewCreationTick(prior, {}, 12, [nearCatastropheDraft])
    const withArtifact = applyWeeklyPostIncidentReviewFollowOnArtifactTick(prior, created)
    const once = applyWeeklyPostIncidentReviewFollowOnRecommendationRegistryTick({}, prior, withArtifact)
    const twice = applyWeeklyPostIncidentReviewFollowOnRecommendationRegistryTick(
      once,
      withArtifact,
      withArtifact
    )

    expect(twice).toBe(once)
    expect(Object.keys(twice)).toHaveLength(1)
  })

  it('does not append for stub registry reviews or training-ref closeouts', () => {
    const prior = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }
    const stubOnly = applyWeeklyPostIncidentReviewFollowOnRecommendationRegistryTick({}, prior, prior)

    expect(stubOnly).toEqual({})
    expect(
      stubOnly[RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE.id as keyof typeof stubOnly]
    ).toBeUndefined()

    const created = applyWeeklyPostIncidentReviewCreationTick(prior, {}, 12, [caseCloseoutDraft])
    const withArtifact = applyWeeklyPostIncidentReviewFollowOnArtifactTick(prior, created)
    const closeoutPath = applyWeeklyPostIncidentReviewFollowOnRecommendationRegistryTick(
      {},
      prior,
      withArtifact
    )

    expect(closeoutPath).toEqual({})
    expect(withArtifact['review:case-case-major-closeout']?.unknownFields).toContain(
      'follow_on:training-ref:threat-assessment'
    )
  })

  it('persists distinct recommendation records when closeout and near-catastrophe materialize same tick', () => {
    const prior = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }
    const created = applyWeeklyPostIncidentReviewCreationTick(prior, {}, 12, [
      caseCloseoutDraft,
      nearCatastropheDraft,
    ])
    const withArtifact = applyWeeklyPostIncidentReviewFollowOnArtifactTick(prior, created)
    const next = applyWeeklyPostIncidentReviewFollowOnRecommendationRegistryTick({}, prior, withArtifact)

    expect(Object.keys(next)).toEqual(['recommendation:near-catastrophe-case-major'])
    expect(next['recommendation:near-catastrophe-case-major']?.reviewRef).toBe(
      'review:near-catastrophe-case-major'
    )
  })

  it('does not append recommendations on a quiet tick', () => {
    const prior = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }
    const next = applyWeeklyPostIncidentReviewFollowOnRecommendationRegistryTick(
      {},
      prior,
      prior
    )

    expect(next).toEqual({})
    expect(createStartingState().postIncidentReviewRecommendationRecords).toBeUndefined()
  })
})
