import { describe, expect, it } from 'vitest'
import {
  RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE,
  POST_INCIDENT_REVIEW_STUB_REGISTRY,
  type PostIncidentReviewRecord,
} from '../domain/postIncidentReviewRegistry'
import {
  RECURRENCE_DAMAGE_LEDGER_FIXTURE,
  type RecurrentCatastropheRecord,
} from '../domain/recurrentCatastropheAmeliorationRegistry'
import {
  applyWeeklyPostIncidentReviewCreationTick,
  buildPostIncidentReviewRecordForRef,
  isRecurrentCatastropheAnchoredThisWeek,
  resolveQualifyingPostIncidentReviewRefs,
} from '../domain/postIncidentReviewWeeklyOrchestration'

function baseCatastrophe(
  overrides: Partial<RecurrentCatastropheRecord> = {}
): RecurrentCatastropheRecord {
  return {
    id: 'recurrent-catastrophe:test-review-creation',
    label: 'Test review creation catastrophe',
    recurrenceCadence: 'monthly',
    failureMode: 'manifestation',
    preventionCeiling: 'unknown',
    ameliorationTactics: [{ tactic: 'shielding', active: true }],
    recurrenceCount: 2,
    lastOccurrenceWeek: 12,
    postIncidentReviewRefs: ['review:cycle-2-closeout'],
    ...overrides,
  }
}

describe('postIncidentReviewWeeklyOrchestration (SPE-868 slice 4)', () => {
  it('is a no-op for an empty catastrophe map without throwing', () => {
    const reviews = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }

    expect(applyWeeklyPostIncidentReviewCreationTick(reviews, {}, 12)).toBe(reviews)
    expect(applyWeeklyPostIncidentReviewCreationTick(reviews, undefined, 12)).toBe(reviews)
    expect(applyWeeklyPostIncidentReviewCreationTick({}, undefined, 12)).toEqual({})
  })

  it('detects recurrence anchored on the simulation week', () => {
    const anchored = baseCatastrophe()
    const notAnchored = baseCatastrophe({ lastOccurrenceWeek: 11 })

    expect(isRecurrentCatastropheAnchoredThisWeek(anchored, 12)).toBe(true)
    expect(isRecurrentCatastropheAnchoredThisWeek(notAnchored, 12)).toBe(false)
    expect(isRecurrentCatastropheAnchoredThisWeek(baseCatastrophe({ recurrenceCount: 0 }), 12)).toBe(
      false
    )
  })

  it('resolves missing cycle closeout refs only when cycle number matches recurrenceCount', () => {
    const catastrophe = baseCatastrophe({
      recurrenceCount: 4,
      lastOccurrenceWeek: 53,
      postIncidentReviewRefs: [
        'review:cycle-3-closeout',
        'review:cycle-4-closeout',
        'review:cycle-5-closeout',
      ],
    })

    expect(
      resolveQualifyingPostIncidentReviewRefs(catastrophe, POST_INCIDENT_REVIEW_STUB_REGISTRY, 53)
    ).toEqual(['review:cycle-4-closeout'])
  })

  it('builds deterministic cycle closeout records anchored to lastOccurrenceWeek', () => {
    const catastrophe = baseCatastrophe({
      recurrenceCount: 4,
      lastOccurrenceWeek: 53,
    })
    const created = buildPostIncidentReviewRecordForRef(
      'review:cycle-4-closeout',
      catastrophe,
      53
    )

    expect(created).toEqual({
      id: 'review:cycle-4-closeout',
      label: 'Manifestation cascade cycle 4 closeout review',
      summary: 'Structured retrospective after seasonal cascade recurrence recovery.',
      reviewRoute: 'internal_command',
      closureOutcome: 'contained',
      milestoneTimings: {
        discoveryWeek: 49,
        responseWeek: 50,
        containmentWeek: 51,
        recoveryWeek: 52,
        reportingWeek: 53,
      },
      procedureAdherenceScore: 0.71,
      recurrenceObserved: true,
      confidence: 0.74,
      unknownFields: ['orchestration_week:53'],
    })
  })

  it('creates missing qualifying reviews without mutating existing hydrated entries', () => {
    const existing: PostIncidentReviewRecord = {
      ...RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE,
      confidence: 0.81,
    }
    const reviews = {
      [existing.id]: existing,
    }
    const catastrophe = baseCatastrophe({
      recurrenceCount: 4,
      lastOccurrenceWeek: 53,
      postIncidentReviewRefs: ['review:cycle-3-closeout', 'review:cycle-4-closeout'],
    })

    const next = applyWeeklyPostIncidentReviewCreationTick(reviews, { [catastrophe.id]: catastrophe }, 53)

    expect(next[existing.id]).toBe(existing)
    expect(next['review:cycle-4-closeout']?.label).toBe(
      'Manifestation cascade cycle 4 closeout review'
    )
    expect(next['review:cycle-4-closeout']?.unknownFields).toEqual(['orchestration_week:53'])
  })

  it('is idempotent when re-applied after creation for the same week', () => {
    const catastrophe = baseCatastrophe()
    const map = { [catastrophe.id]: catastrophe }
    const once = applyWeeklyPostIncidentReviewCreationTick({}, map, 12)
    const twice = applyWeeklyPostIncidentReviewCreationTick(once, map, 12)

    expect(twice).toBe(once)
    expect(Object.keys(once)).toEqual(['review:cycle-2-closeout'])
  })

  it('rejects franchise token refs without creating records', () => {
    const catastrophe = baseCatastrophe({
      postIncidentReviewRefs: ['review:foundation-audit'],
    })

    const next = applyWeeklyPostIncidentReviewCreationTick({}, { [catastrophe.id]: catastrophe }, 12)

    expect(next).toEqual({})
  })

  it('creates generic closeout stubs for non-cycle refs', () => {
    const catastrophe = baseCatastrophe({
      postIncidentReviewRefs: ['review:missing-closeout'],
    })

    const next = applyWeeklyPostIncidentReviewCreationTick({}, { [catastrophe.id]: catastrophe }, 12)
    const created = next['review:missing-closeout']

    expect(created?.label).toBe('Pending post-incident closeout review')
    expect(created?.milestoneTimings).toEqual({ reportingWeek: 12 })
    expect(created?.unknownFields).toEqual(['orchestration_week:12'])
  })

  it('materializes cycle-4 closeout when recurrence damage ledger advances at week 53', () => {
    const catastrophe = {
      ...RECURRENCE_DAMAGE_LEDGER_FIXTURE,
      postIncidentReviewRefs: ['review:cycle-3-closeout', 'review:cycle-4-closeout'],
    }
    const advancedCatastrophe = {
      ...catastrophe,
      recurrenceCount: 4,
      lastOccurrenceWeek: 53,
    }

    const next = applyWeeklyPostIncidentReviewCreationTick(
      { [RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE.id]: RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE },
      { [advancedCatastrophe.id]: advancedCatastrophe },
      53
    )

    expect(next['review:cycle-3-closeout']).toBe(RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE)
    expect(next['review:cycle-4-closeout']?.milestoneTimings?.reportingWeek).toBe(53)
  })
})
