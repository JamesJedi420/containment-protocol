import { describe, expect, it } from 'vitest'
import {
  POST_INCIDENT_REVIEW_STUB_REGISTRY,
  RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE,
} from '../domain/postIncidentReviewRegistry'
import {
  IMPOSSIBLE_PREVENTION_DAMPENING_FIXTURE,
  RECURRENCE_DAMAGE_LEDGER_FIXTURE,
  validateRecurrentCatastropheRecord,
  type RecurrentCatastropheRecord,
} from '../domain/recurrentCatastropheAmeliorationRegistry'
import {
  composeRecurrentCatastrophePostIncidentReviewLinks,
  resolveRecurrentCatastrophePostIncidentReviewLinks,
  validateRecurrentCatastrophePostIncidentReviewRefs,
} from '../domain/recurrentCatastrophePostIncidentReviewLinks'

function baseRecord(
  overrides: Partial<RecurrentCatastropheRecord> = {}
): RecurrentCatastropheRecord {
  return {
    id: 'recurrent-catastrophe:test-base',
    label: 'Test recurrent catastrophe record',
    recurrenceCadence: 'monthly',
    failureMode: 'manifestation',
    preventionCeiling: 'unknown',
    ameliorationTactics: [{ tactic: 'shielding', active: true }],
    recurrenceCount: 0,
    ...overrides,
  }
}

describe('recurrentCatastrophePostIncidentReviewLinks (SPE-868 slice 5)', () => {
  it('validates empty postIncidentReviewRefs without throw', () => {
    const result = validateRecurrentCatastrophePostIncidentReviewRefs(
      IMPOSSIBLE_PREVENTION_DAMPENING_FIXTURE,
      POST_INCIDENT_REVIEW_STUB_REGISTRY
    )

    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([])
  })

  it('resolves review:cycle-3-closeout for recurrence damage ledger fixture', () => {
    const links = resolveRecurrentCatastrophePostIncidentReviewLinks(
      RECURRENCE_DAMAGE_LEDGER_FIXTURE,
      POST_INCIDENT_REVIEW_STUB_REGISTRY
    )

    expect(links).toHaveLength(1)
    expect(links[0]?.reviewRef).toBe('review:cycle-3-closeout')
    expect(links[0]?.reviewId).toBe(RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE.id)
    expect(links[0]?.summary.milestoneSpanWeeks).toBe(4)
  })

  it('warns when review ref does not resolve in registry', () => {
    const result = validateRecurrentCatastrophePostIncidentReviewRefs(
      baseRecord({
        postIncidentReviewRefs: ['review:missing-closeout'],
      }),
      POST_INCIDENT_REVIEW_STUB_REGISTRY
    )

    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'missing_post_incident_review_ref',
        severity: 'warning',
        relatedReviewRefs: ['review:missing-closeout'],
      }),
    ])
  })

  it('warns when recurrenceCount is positive without postIncidentReviewRefs', () => {
    const result = validateRecurrentCatastrophePostIncidentReviewRefs(
      baseRecord({
        recurrenceCount: 2,
      }),
      POST_INCIDENT_REVIEW_STUB_REGISTRY
    )

    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'recurrence_without_post_incident_review',
        severity: 'warning',
      }),
    ])
  })

  it('errors on franchise token in review ref', () => {
    const result = validateRecurrentCatastrophePostIncidentReviewRefs(
      baseRecord({
        postIncidentReviewRefs: ['review:foundation-audit'],
      }),
      POST_INCIDENT_REVIEW_STUB_REGISTRY
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'franchise_token_in_review_ref')).toBe(
      true
    )
  })

  it('compose summaries stay deterministic and skip invalid catastrophe records', () => {
    const invalidRecord = baseRecord({
      id: 'recurrent-catastrophe:invalid-review-link',
      recurrenceCount: Number.NaN,
      postIncidentReviewRefs: ['review:cycle-3-closeout'],
    })

    const summaries = composeRecurrentCatastrophePostIncidentReviewLinks(
      {
        [RECURRENCE_DAMAGE_LEDGER_FIXTURE.id]: RECURRENCE_DAMAGE_LEDGER_FIXTURE,
        [invalidRecord.id]: invalidRecord,
      },
      POST_INCIDENT_REVIEW_STUB_REGISTRY
    )

    expect(summaries).toHaveLength(1)
    expect(summaries[0]?.recordId).toBe(RECURRENCE_DAMAGE_LEDGER_FIXTURE.id)
    expect(summaries[0]?.linkedReviewCount).toBe(1)
    expect(summaries[0]?.unresolvedReviewRefs).toEqual([])
  })

  it('does not change slice 1 recurrent catastrophe validation contract', () => {
    const result = validateRecurrentCatastropheRecord(RECURRENCE_DAMAGE_LEDGER_FIXTURE)

    expect(result.valid).toBe(true)
    expect(RECURRENCE_DAMAGE_LEDGER_FIXTURE.postIncidentReviewRefs).toEqual([
      'review:cycle-3-closeout',
    ])
  })
})
