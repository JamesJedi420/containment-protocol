import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  EXTERNAL_AUDIT_CLEARED_REVIEW_FIXTURE,
  RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE,
  sanitizePostIncidentReviewRecords,
} from '../../domain/postIncidentReviewRegistry'
import {
  formatPostIncidentReviewEnumLabel,
  getPostIncidentReviewMirrorView,
} from './postIncidentReviewMirrorView'

describe('postIncidentReviewMirrorView (SPE-868 slice 3)', () => {
  it('returns empty mirror when postIncidentReviewRecords map is empty', () => {
    const game = createStartingState()
    game.postIncidentReviewRecords = {}

    const view = getPostIncidentReviewMirrorView(game)

    expect(view.isEmpty).toBe(true)
    expect(view.summary.totalRecords).toBe(0)
    expect(view.records).toEqual([])
  })

  it('mirrors persisted fields and review summary projection', () => {
    const game = createStartingState()
    game.week = 42
    game.postIncidentReviewRecords = {
      [RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE.id]: RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE,
      [EXTERNAL_AUDIT_CLEARED_REVIEW_FIXTURE.id]: EXTERNAL_AUDIT_CLEARED_REVIEW_FIXTURE,
    }

    const view = getPostIncidentReviewMirrorView(game)
    const closeout = view.records.find(
      (record) => record.id === RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE.id
    )
    const audit = view.records.find(
      (record) => record.id === EXTERNAL_AUDIT_CLEARED_REVIEW_FIXTURE.id
    )

    expect(view.isEmpty).toBe(false)
    expect(view.summary.totalRecords).toBe(2)
    expect(view.summary.externalAuditRouteCount).toBe(1)
    expect(view.summary.recurrenceObservedCount).toBe(1)
    expect(view.summary.week).toBe(42)
    expect(closeout?.reviewRouteLabel).toBe('Internal Command')
    expect(closeout?.closureOutcomeLabel).toBe('Contained')
    expect(closeout?.milestoneSpanWeeksLabel).toBe('4')
    expect(closeout?.discoveryWeekLabel).toBe('W38')
    expect(closeout?.reportingWeekLabel).toBe('W42')
    expect(closeout?.procedureAdherenceScoreLabel).toBe('0.71')
    expect(closeout?.recurrenceObservedLabel).toBe('Yes')
    expect(closeout?.confidenceLabel).toBe('0.74')
    expect(audit?.reviewRouteLabel).toBe('External Audit')
    expect(audit?.closureOutcomeLabel).toBe('Administratively Cleared')
    expect(audit?.recurrenceObservedLabel).toBe('No')
  })

  it('renders redacted projection fields as legibility gaps', () => {
    const game = createStartingState()
    game.postIncidentReviewRecords = {
      [RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE.id]: {
        ...RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE,
        redactedFields: ['milestoneTimings', 'procedureAdherenceScore', 'confidence'],
      },
    }

    const view = getPostIncidentReviewMirrorView(game)
    const record = view.records[0]

    expect(record?.milestoneSpanWeeksLabel).toBe('—')
    expect(record?.discoveryWeekLabel).toBe('—')
    expect(record?.procedureAdherenceScoreLabel).toBe('—')
    expect(record?.confidenceLabel).toBe('—')
    expect(record?.redacted).toBe(true)
  })

  it('does not surface invalid records dropped on hydrate', () => {
    const game = createStartingState()
    game.postIncidentReviewRecords = sanitizePostIncidentReviewRecords({
      [RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE.id]: RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE,
      'review:invalid-dropped': {
        id: 'review:invalid-dropped',
        label: 'Foundation command review',
        reviewRoute: 'internal_command',
        closureOutcome: 'contained',
      },
    })

    const view = getPostIncidentReviewMirrorView(game)

    expect(view.summary.totalRecords).toBe(1)
    expect(view.records[0]?.id).toBe(RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE.id)
  })

  it('formats enum labels for CP-neutral UI copy', () => {
    expect(formatPostIncidentReviewEnumLabel('external_audit')).toBe('External Audit')
    expect(formatPostIncidentReviewEnumLabel('administratively_cleared')).toBe(
      'Administratively Cleared'
    )
  })

  it('is byte-stable for repeated mirror builds', () => {
    const game = createStartingState()

    const first = JSON.stringify(getPostIncidentReviewMirrorView(game))
    const second = JSON.stringify(getPostIncidentReviewMirrorView(game))

    expect(first).toBe(second)
  })
})
