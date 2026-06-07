import { describe, expect, it } from 'vitest'
import {
  EXTERNAL_AUDIT_CLEARED_REVIEW_FIXTURE,
  POST_INCIDENT_REVIEW_ROUTES,
  POST_INCIDENT_CLOSURE_OUTCOMES,
  POST_INCIDENT_REVIEW_STUB_REGISTRY,
  RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE,
  projectPostIncidentReviewSummary,
  validatePostIncidentReviewRecord,
  type PostIncidentReviewRecord,
} from '../domain/postIncidentReviewRegistry'

function baseRecord(
  overrides: Partial<PostIncidentReviewRecord> = {}
): PostIncidentReviewRecord {
  return {
    id: 'review:test-base',
    label: 'Test post-incident review record',
    reviewRoute: 'internal_command',
    closureOutcome: 'contained',
    ...overrides,
  }
}

describe('postIncidentReviewRegistry (SPE-868 slice 5)', () => {
  it('validates recurrence cycle closeout fixture with milestone timings', () => {
    const result = validatePostIncidentReviewRecord(RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE)

    expect(result.valid).toBe(true)
    expect(RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE.milestoneTimings).toEqual({
      discoveryWeek: 38,
      responseWeek: 39,
      containmentWeek: 40,
      recoveryWeek: 41,
      reportingWeek: 42,
    })
  })

  it('projects milestone span weeks from distinct milestone timings', () => {
    const projection = projectPostIncidentReviewSummary(RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE)

    expect(projection.milestoneSpanWeeks).toBe(4)
    expect(projection.reviewRoute).toBe('internal_command')
    expect(projection.closureOutcome).toBe('contained')
    expect(projection.recurrenceObserved).toBe(true)
  })

  it('redacts milestone span when policy requests unknown redaction', () => {
    const projection = projectPostIncidentReviewSummary(
      {
        ...RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE,
        unknownFields: ['milestoneTimings'],
      },
      { redactUnknown: true }
    )

    expect(projection.milestoneSpanWeeks).toBeNull()
    expect(projection.redacted).toBe(true)
  })

  it('errors on franchise token in review label', () => {
    const result = validatePostIncidentReviewRecord(
      baseRecord({
        label: 'Foundation command review',
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'franchise_token_in_label')).toBe(true)
  })

  it('exports stable union catalogs', () => {
    expect(POST_INCIDENT_REVIEW_ROUTES).toEqual([
      'internal_command',
      'external_audit',
      'outside_review',
      'reform_mandate',
    ])
    expect(POST_INCIDENT_CLOSURE_OUTCOMES).toEqual([
      'solved',
      'administratively_cleared',
      'contained',
      'misclassified',
      'falsely_closed',
      'politically_buried',
    ])
  })

  it('includes stub registry fixtures for cross-registry wire-up', () => {
    expect(POST_INCIDENT_REVIEW_STUB_REGISTRY[RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE.id]).toEqual(
      RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE
    )
    expect(POST_INCIDENT_REVIEW_STUB_REGISTRY[EXTERNAL_AUDIT_CLEARED_REVIEW_FIXTURE.id]).toEqual(
      EXTERNAL_AUDIT_CLEARED_REVIEW_FIXTURE
    )
  })

  it('returns byte-stable validation results on repeated calls', () => {
    const first = validatePostIncidentReviewRecord(RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE)
    const second = validatePostIncidentReviewRecord(RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE)

    expect(first).toEqual(second)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })
})
