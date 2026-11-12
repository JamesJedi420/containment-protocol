import { describe, expect, it } from 'vitest'
import { POST_INCIDENT_REVIEW_STUB_REGISTRY } from '../domain/postIncidentReviewRegistry'
import {
  FOLLOW_ON_RECOMMENDATION_STUB_PREFIX,
  FOLLOW_ON_TRAINING_REF_PREFIX,
  applyWeeklyPostIncidentReviewFollowOnArtifactTick,
} from '../domain/postIncidentReviewFollowOnArtifact'
import {
  buildWeeklyPostIncidentReviewFollowOnReportNotes,
  extractFollowOnArtifactTokenFromUnknownFields,
} from '../domain/postIncidentReviewFollowOnWeeklyReportNotes'
import {
  applyWeeklyPostIncidentReviewCreationTick,
  type QualifyingIncidentReviewDraft,
} from '../domain/postIncidentReviewWeeklyOrchestration'

describe('postIncidentReviewFollowOnWeeklyReportNotes (SPE-868 slice 11)', () => {
  const caseCloseoutDraft: QualifyingIncidentReviewDraft = {
    reviewRef: 'review:case-case-major-closeout',
    caseId: 'case-major',
    caseTitle: 'District breach',
    trigger: 'case_resolved',
    stage: 4,
    kind: 'standard',
    anchorWeek: 12,
  }

  const nearCatastropheDraft: QualifyingIncidentReviewDraft = {
    reviewRef: 'review:near-catastrophe-case-major',
    caseId: 'case-major',
    caseTitle: 'District breach',
    trigger: 'near_catastrophe_threshold',
    stage: 4,
    kind: 'raid',
    anchorWeek: 12,
  }

  it('extracts follow-on tokens from unknownFields', () => {
    expect(
      extractFollowOnArtifactTokenFromUnknownFields([
        'orchestration_week:12',
        `${FOLLOW_ON_TRAINING_REF_PREFIX}threat-assessment`,
      ])
    ).toBe(`${FOLLOW_ON_TRAINING_REF_PREFIX}threat-assessment`)
    expect(
      extractFollowOnArtifactTokenFromUnknownFields([
        `${FOLLOW_ON_RECOMMENDATION_STUB_PREFIX}near-catastrophe-case-major`,
      ])
    ).toBe(`${FOLLOW_ON_RECOMMENDATION_STUB_PREFIX}near-catastrophe-case-major`)
  })

  it('builds a training-ref note for a materialized closeout review', () => {
    const prior = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }
    const created = applyWeeklyPostIncidentReviewCreationTick(prior, {}, 12, [caseCloseoutDraft])
    const next = applyWeeklyPostIncidentReviewFollowOnArtifactTick(prior, created)
    const notes = buildWeeklyPostIncidentReviewFollowOnReportNotes({
      priorReviews: prior,
      nextReviews: next,
      week: 12,
      sequenceStart: 1,
    })

    expect(notes).toHaveLength(1)
    expect(notes[0]?.type).toBe('post_incident_review.follow_on')
    expect(notes[0]?.content).toBe(
      'Post-incident follow-on — Qualifying incident closeout review — District breach: training reference (threat assessment).'
    )
    expect(notes[0]?.metadata).toMatchObject({
      reviewRef: 'review:case-case-major-closeout',
      followOnKind: 'training_ref',
      followOnToken: `${FOLLOW_ON_TRAINING_REF_PREFIX}threat-assessment`,
      week: 12,
    })
  })

  it('builds a recommendation-stub note for a materialized near-catastrophe review', () => {
    const prior = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }
    const created = applyWeeklyPostIncidentReviewCreationTick(prior, {}, 12, [nearCatastropheDraft])
    const next = applyWeeklyPostIncidentReviewFollowOnArtifactTick(prior, created)
    const notes = buildWeeklyPostIncidentReviewFollowOnReportNotes({
      priorReviews: prior,
      nextReviews: next,
      week: 12,
      sequenceStart: 3,
    })

    expect(notes).toHaveLength(1)
    expect(notes[0]?.content).toBe(
      'Post-incident follow-on — Near-catastrophe threshold review — District breach: recommendation stub (near catastrophe case major).'
    )
    expect(notes[0]?.metadata).toMatchObject({
      followOnKind: 'recommendation_stub',
      followOnToken: `${FOLLOW_ON_RECOMMENDATION_STUB_PREFIX}near-catastrophe-case-major`,
    })
  })

  it('emits at most two notes for closeout and near-catastrophe reviews materialized together', () => {
    const prior = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }
    const created = applyWeeklyPostIncidentReviewCreationTick(prior, {}, 12, [
      caseCloseoutDraft,
      nearCatastropheDraft,
    ])
    const next = applyWeeklyPostIncidentReviewFollowOnArtifactTick(prior, created)
    const notes = buildWeeklyPostIncidentReviewFollowOnReportNotes({
      priorReviews: prior,
      nextReviews: next,
      week: 12,
      sequenceStart: 1,
    })

    expect(notes).toHaveLength(2)
    expect(notes.map((note) => note.metadata?.reviewRef)).toEqual([
      'review:case-case-major-closeout',
      'review:near-catastrophe-case-major',
    ])
  })

  it('is a no-op when no orchestration-created review materializes this tick', () => {
    const prior = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }
    const notes = buildWeeklyPostIncidentReviewFollowOnReportNotes({
      priorReviews: prior,
      nextReviews: prior,
      week: 12,
      sequenceStart: 1,
    })

    expect(notes).toEqual([])
  })

  it('does not emit notes for stub registry reviews without follow-on tokens', () => {
    const prior = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }
    const notes = buildWeeklyPostIncidentReviewFollowOnReportNotes({
      priorReviews: {},
      nextReviews: prior,
      week: 12,
      sequenceStart: 1,
    })

    expect(notes).toEqual([])
  })

  it('is idempotent when prior map already contains materialized reviews', () => {
    const prior = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }
    const created = applyWeeklyPostIncidentReviewCreationTick(prior, {}, 12, [caseCloseoutDraft])
    const next = applyWeeklyPostIncidentReviewFollowOnArtifactTick(prior, created)
    const once = buildWeeklyPostIncidentReviewFollowOnReportNotes({
      priorReviews: prior,
      nextReviews: next,
      week: 12,
      sequenceStart: 1,
    })
    const twice = buildWeeklyPostIncidentReviewFollowOnReportNotes({
      priorReviews: next,
      nextReviews: next,
      week: 13,
      sequenceStart: 1,
    })

    expect(once).toHaveLength(1)
    expect(twice).toEqual([])
  })
})
