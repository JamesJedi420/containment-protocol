import { describe, expect, it } from 'vitest'
import {
  derivePostIncidentMilestoneTimings,
  EXTERNAL_AUDIT_CLEARED_REVIEW_FIXTURE,
  POST_INCIDENT_MILESTONE_TIMING_PROFILES,
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

  it('redacts reviewRoute and closureOutcome when redactedFields includes them', () => {
    const projection = projectPostIncidentReviewSummary({
      ...RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE,
      redactedFields: ['reviewRoute', 'closureOutcome'],
    })

    expect(projection.reviewRoute).toBeNull()
    expect(projection.closureOutcome).toBeNull()
    expect(projection.redacted).toBe(true)
    expect(projection.recurrenceObserved).toBe(true)
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

describe('derivePostIncidentMilestoneTimings (SPE-868 slice 20)', () => {
  it('exports stable milestone timing profile catalog', () => {
    expect(POST_INCIDENT_MILESTONE_TIMING_PROFILES).toEqual([
      'cycle_closeout',
      'case_closeout',
      'near_catastrophe',
      'reporting_only',
    ])
  })

  it('derives full five-milestone cycle closeout intervals from anchor week', () => {
    expect(derivePostIncidentMilestoneTimings('cycle_closeout', 53)).toEqual({
      discoveryWeek: 49,
      responseWeek: 50,
      containmentWeek: 51,
      recoveryWeek: 52,
      reportingWeek: 53,
    })
  })

  it('derives four-milestone case closeout intervals without recovery', () => {
    expect(derivePostIncidentMilestoneTimings('case_closeout', 12)).toEqual({
      discoveryWeek: 9,
      responseWeek: 10,
      containmentWeek: 11,
      reportingWeek: 12,
    })
  })

  it('derives three-milestone near-catastrophe intervals without containment or recovery', () => {
    expect(derivePostIncidentMilestoneTimings('near_catastrophe', 12)).toEqual({
      discoveryWeek: 10,
      responseWeek: 11,
      reportingWeek: 12,
    })
  })

  it('derives reporting-only stub when lifecycle events are unknown', () => {
    expect(derivePostIncidentMilestoneTimings('reporting_only', 12)).toEqual({
      reportingWeek: 12,
    })
  })

  it('clamps sub-one anchor weeks and non-finite inputs to week 1', () => {
    expect(derivePostIncidentMilestoneTimings('case_closeout', 0)).toEqual({
      discoveryWeek: 0,
      responseWeek: 0,
      containmentWeek: 0,
      reportingWeek: 1,
    })
    expect(derivePostIncidentMilestoneTimings('reporting_only', Number.NaN)).toEqual({
      reportingWeek: 1,
    })
  })

  it('returns byte-stable milestone timings on repeated calls', () => {
    const first = derivePostIncidentMilestoneTimings('cycle_closeout', 42)
    const second = derivePostIncidentMilestoneTimings('cycle_closeout', 42)

    expect(first).toEqual(second)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })
})
