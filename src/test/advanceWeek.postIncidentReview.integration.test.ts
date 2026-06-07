import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE,
} from '../domain/postIncidentReviewRegistry'
import {
  RECURRENCE_DAMAGE_LEDGER_FIXTURE,
} from '../domain/recurrentCatastropheAmeliorationRegistry'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { applyWeeklyPostIncidentReviewCreationTick } from '../domain/postIncidentReviewWeeklyOrchestration'
import { applyWeeklyRecurrentCatastropheTick } from '../domain/recurrentCatastropheWeeklyOrchestration'

function freezeCasesForQuietWeek(state: ReturnType<typeof createStartingState>) {
  for (const currentCase of Object.values(state.cases)) {
    currentCase.status = 'open'
    currentCase.assignedTeamIds = []
    currentCase.requiredTags = []
    currentCase.preferredTags = []
    currentCase.weeksRemaining = undefined
  }
}

describe('advanceWeek post-incident review integration (SPE-868 slice 4)', () => {
  it('is a no-op for an empty recurrent catastrophe map without throwing', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.recurrentCatastropheRecords = {}

    const nextState = advanceWeek(state)

    expect(nextState.postIncidentReviewRecords).toEqual(state.postIncidentReviewRecords)
  })

  it('does not duplicate existing stub reviews before recurrence is due', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 51
    state.recurrentCatastropheRecords = {
      [RECURRENCE_DAMAGE_LEDGER_FIXTURE.id]: RECURRENCE_DAMAGE_LEDGER_FIXTURE,
    }

    const nextState = advanceWeek(state)

    expect(nextState.week).toBe(52)
    expect(nextState.postIncidentReviewRecords?.[RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE.id]).toEqual(
      RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE
    )
    expect(nextState.postIncidentReviewRecords?.['review:cycle-4-closeout']).toBeUndefined()
  })

  it('creates cycle-4 closeout review when advanceWeek reaches recurrence due week', () => {
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
    const created = nextState.postIncidentReviewRecords?.['review:cycle-4-closeout']
    const catastrophe =
      nextState.recurrentCatastropheRecords?.[RECURRENCE_DAMAGE_LEDGER_FIXTURE.id]

    expect(nextState.week).toBe(53)
    expect(catastrophe?.recurrenceCount).toBe(4)
    expect(catastrophe?.lastOccurrenceWeek).toBe(53)
    expect(created?.label).toBe('Manifestation cascade cycle 4 closeout review')
    expect(created?.milestoneTimings?.reportingWeek).toBe(53)
    expect(created?.unknownFields).toEqual(['orchestration_week:53'])
    expect(nextState.postIncidentReviewRecords?.[RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE.id]).toEqual(
      RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE
    )
  })

  it('matches direct recurrence tick plus review creation for the post-advance week', () => {
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
    const directRecurrenceTick = applyWeeklyRecurrentCatastropheTick(
      state.recurrentCatastropheRecords,
      nextState.week
    )
    const directReviewTick = applyWeeklyPostIncidentReviewCreationTick(
      state.postIncidentReviewRecords,
      directRecurrenceTick,
      nextState.week
    )

    expect(nextState.recurrentCatastropheRecords).toEqual(directRecurrenceTick)
    expect(nextState.postIncidentReviewRecords).toEqual(directReviewTick)
  })
})
