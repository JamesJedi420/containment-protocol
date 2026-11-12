import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE,
} from '../../domain/postIncidentReviewRegistry'
import {
  RECURRENCE_DAMAGE_LEDGER_FIXTURE,
  type RecurrentCatastropheRecord,
} from '../../domain/recurrentCatastropheAmeliorationRegistry'
import { advanceWeek } from '../../domain/sim/advanceWeek'
import {
  getRecurrentCatastrophePostIncidentReviewLinksView,
} from './recurrentCatastrophePostIncidentReviewLinksView'

function freezeCasesForQuietWeek(state: ReturnType<typeof createStartingState>) {
  for (const currentCase of Object.values(state.cases)) {
    currentCase.status = 'open'
    currentCase.assignedTeamIds = []
    currentCase.requiredTags = []
    currentCase.preferredTags = []
    currentCase.weeksRemaining = undefined
  }
}

function recurrenceWithoutReviewFixture(): RecurrentCatastropheRecord {
  return {
    id: 'recurrent-catastrophe:missing-review-refs',
    label: 'Recurrence without review refs',
    recurrenceCadence: 'monthly',
    failureMode: 'manifestation',
    preventionCeiling: 'unknown',
    ameliorationTactics: [{ tactic: 'shielding', active: true }],
    recurrenceCount: 2,
  }
}

describe('recurrentCatastrophePostIncidentReviewLinksView (SPE-868 registry slice 5)', () => {
  it('returns empty view when recurrentCatastropheRecords map is empty', () => {
    const game = createStartingState()
    game.recurrentCatastropheRecords = {}

    const view = getRecurrentCatastrophePostIncidentReviewLinksView(game)

    expect(view.isEmpty).toBe(true)
    expect(view.summary.totalRecords).toBe(0)
    expect(view.records).toEqual([])
  })

  it('resolves review:cycle-3-closeout from persisted postIncidentReviewRecords', () => {
    const game = createStartingState()
    game.recurrentCatastropheRecords = {
      [RECURRENCE_DAMAGE_LEDGER_FIXTURE.id]: RECURRENCE_DAMAGE_LEDGER_FIXTURE,
    }

    const view = getRecurrentCatastrophePostIncidentReviewLinksView(game)
    const record = view.records[0]

    expect(view.isEmpty).toBe(false)
    expect(view.summary.totalLinkedReviews).toBe(1)
    expect(record?.recordId).toBe(RECURRENCE_DAMAGE_LEDGER_FIXTURE.id)
    expect(record?.reviewLinks).toHaveLength(1)
    expect(record?.reviewLinks[0]?.reviewRefLabel).toBe('review:cycle-3-closeout')
    expect(record?.reviewLinks[0]?.reviewIdLabel).toBe(RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE.id)
    expect(record?.reviewLinks[0]?.reviewRouteLabel).toBe('Internal Command')
    expect(record?.unresolvedReviewRefLabels).toEqual([])
  })

  it('warns on missing review refs when postIncidentReviewRecords is empty', () => {
    const game = createStartingState()
    game.postIncidentReviewRecords = {}
    game.recurrentCatastropheRecords = {
      [RECURRENCE_DAMAGE_LEDGER_FIXTURE.id]: RECURRENCE_DAMAGE_LEDGER_FIXTURE,
    }

    const view = getRecurrentCatastrophePostIncidentReviewLinksView(game)
    const record = view.records[0]

    expect(record?.reviewLinks).toEqual([])
    expect(record?.unresolvedReviewRefLabels).toEqual(['review:cycle-3-closeout'])
    expect(
      record?.reviewRefValidationWarningLabels.some((label) => label.includes('does not resolve'))
    ).toBe(true)
    expect(view.summary.totalUnresolvedReviewRefs).toBe(1)
  })

  it('warns when recurrenceCount is positive without postIncidentReviewRefs', () => {
    const game = createStartingState()
    const fixture = recurrenceWithoutReviewFixture()
    game.recurrentCatastropheRecords = {
      [fixture.id]: fixture,
    }

    const view = getRecurrentCatastrophePostIncidentReviewLinksView(game)
    const record = view.records[0]

    expect(record?.reviewRefValidationWarningLabels.some((label) =>
      label.includes('recurrenceCount')
    )).toBe(true)
  })

  it('resolves cycle-4 closeout after advanceWeek orchestration creates it', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 52
    state.recurrentCatastropheRecords = {
      [RECURRENCE_DAMAGE_LEDGER_FIXTURE.id]: {
        ...RECURRENCE_DAMAGE_LEDGER_FIXTURE,
        postIncidentReviewRefs: ['review:cycle-3-closeout', 'review:cycle-4-closeout'],
      },
    }

    const nextState = advanceWeek(state)
    const view = getRecurrentCatastrophePostIncidentReviewLinksView(nextState)
    const record = view.records[0]

    expect(record?.reviewLinks).toHaveLength(2)
    expect(record?.reviewLinks.map((link) => link.reviewRefLabel)).toEqual([
      'review:cycle-3-closeout',
      'review:cycle-4-closeout',
    ])
    expect(record?.unresolvedReviewRefLabels).toEqual([])
    expect(view.summary.totalLinkedReviews).toBe(2)
  })

  it('does not re-sanitize dropped hydrated review entries at compose site', () => {
    const game = createStartingState()
    game.recurrentCatastropheRecords = {
      [RECURRENCE_DAMAGE_LEDGER_FIXTURE.id]: RECURRENCE_DAMAGE_LEDGER_FIXTURE,
    }
    game.postIncidentReviewRecords = {
      [RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE.id]: RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE,
      'review:invalid-dropped': {
        id: 'review:invalid-dropped',
        label: 'Invalid franchise review',
        reviewRoute: 'internal_command',
        closureOutcome: 'contained',
      },
    }

    const view = getRecurrentCatastrophePostIncidentReviewLinksView(game)

    expect(Object.keys(game.postIncidentReviewRecords ?? {})).toContain('review:invalid-dropped')
    expect(view.records[0]?.reviewLinks).toHaveLength(1)
  })

  it('is byte-stable for repeated compose view builds', () => {
    const game = createStartingState()
    game.recurrentCatastropheRecords = {
      [RECURRENCE_DAMAGE_LEDGER_FIXTURE.id]: RECURRENCE_DAMAGE_LEDGER_FIXTURE,
    }

    const first = JSON.stringify(getRecurrentCatastrophePostIncidentReviewLinksView(game))
    const second = JSON.stringify(getRecurrentCatastrophePostIncidentReviewLinksView(game))

    expect(first).toBe(second)
  })
})
