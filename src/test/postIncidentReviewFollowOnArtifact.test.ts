import { describe, expect, it } from 'vitest'
import {
  EXTERNAL_AUDIT_CLEARED_REVIEW_FIXTURE,
  POST_INCIDENT_REVIEW_STUB_REGISTRY,
  RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE,
} from '../domain/postIncidentReviewRegistry'
import {
  applyWeeklyPostIncidentReviewFollowOnArtifactTick,
  buildFollowOnArtifactTokenForReview,
  FOLLOW_ON_RECOMMENDATION_STUB_PREFIX,
  FOLLOW_ON_TRAINING_REF_PREFIX,
  isOrchestrationCreatedPostIncidentReviewRecord,
} from '../domain/postIncidentReviewFollowOnArtifact'
import {
  applyWeeklyPostIncidentReviewCreationTick,
  buildQualifyingIncidentReviewRecordForDraft,
  type QualifyingIncidentReviewDraft,
} from '../domain/postIncidentReviewWeeklyOrchestration'

describe('postIncidentReviewFollowOnArtifact (SPE-868 slice 10)', () => {
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

  it('detects orchestration-created reviews and ignores stub fixtures', () => {
    const orchestrationRecord = buildQualifyingIncidentReviewRecordForDraft(caseCloseoutDraft, 12)

    expect(orchestrationRecord).toBeDefined()
    expect(isOrchestrationCreatedPostIncidentReviewRecord(orchestrationRecord!)).toBe(true)
    expect(isOrchestrationCreatedPostIncidentReviewRecord(RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE)).toBe(
      false
    )
    expect(isOrchestrationCreatedPostIncidentReviewRecord(EXTERNAL_AUDIT_CLEARED_REVIEW_FIXTURE)).toBe(
      false
    )
  })

  it('builds a training ref for internal_command closeout reviews', () => {
    const record = buildQualifyingIncidentReviewRecordForDraft(caseCloseoutDraft, 12)

    expect(buildFollowOnArtifactTokenForReview(record!)).toBe(
      `${FOLLOW_ON_TRAINING_REF_PREFIX}threat-assessment`
    )
  })

  it('builds a recommendation stub for external_audit near-catastrophe reviews', () => {
    const record = buildQualifyingIncidentReviewRecordForDraft(nearCatastropheDraft, 12)

    expect(buildFollowOnArtifactTokenForReview(record!)).toBe(
      `${FOLLOW_ON_RECOMMENDATION_STUB_PREFIX}near-catastrophe-case-major`
    )
  })

  it('appends one follow-on artifact when a qualifying review materializes', () => {
    const prior = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }
    const created = applyWeeklyPostIncidentReviewCreationTick(prior, {}, 12, [caseCloseoutDraft])
    const next = applyWeeklyPostIncidentReviewFollowOnArtifactTick(prior, created)
    const record = next['review:case-case-major-closeout']

    expect(record?.unknownFields).toEqual([
      'follow_on:training-ref:threat-assessment',
      'orchestration_week:12',
    ])
    expect(prior['review:case-case-major-closeout']).toBeUndefined()
    expect(next[RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE.id]).toBe(
      RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE
    )
  })

  it('is idempotent when re-run for the same materialized review', () => {
    const prior = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }
    const created = applyWeeklyPostIncidentReviewCreationTick(prior, {}, 12, [caseCloseoutDraft])
    const once = applyWeeklyPostIncidentReviewFollowOnArtifactTick(prior, created)
    const twice = applyWeeklyPostIncidentReviewFollowOnArtifactTick(once, once)

    expect(twice).toBe(once)
    expect(twice['review:case-case-major-closeout']?.unknownFields).toEqual([
      'follow_on:training-ref:threat-assessment',
      'orchestration_week:12',
    ])
  })

  it('does not append artifacts for stub registry reviews without orchestration tokens', () => {
    const prior = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }
    const next = applyWeeklyPostIncidentReviewFollowOnArtifactTick(prior, prior)

    expect(next).toBe(prior)
    expect(next[RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE.id]?.unknownFields).toBeUndefined()
    expect(next[EXTERNAL_AUDIT_CLEARED_REVIEW_FIXTURE.id]?.unknownFields).toBeUndefined()
  })

  it('allows distinct follow-on artifacts for closeout and near-catastrophe reviews', () => {
    const prior = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }
    const created = applyWeeklyPostIncidentReviewCreationTick(prior, {}, 12, [
      caseCloseoutDraft,
      nearCatastropheDraft,
    ])
    const next = applyWeeklyPostIncidentReviewFollowOnArtifactTick(prior, created)

    expect(next['review:case-case-major-closeout']?.unknownFields).toContain(
      'follow_on:training-ref:threat-assessment'
    )
    expect(next['review:near-catastrophe-case-major']?.unknownFields).toContain(
      'follow_on:recommendation-stub:near-catastrophe-case-major'
    )
  })
})
