import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  IMPOSSIBLE_PREVENTION_DAMPENING_FIXTURE,
  RECURRENCE_DAMAGE_LEDGER_FIXTURE,
} from '../domain/recurrentCatastropheAmeliorationRegistry'
import { advanceWeek } from '../domain/sim/advanceWeek'
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

describe('advanceWeek recurrent catastrophe integration (SPE-2117 slice 3)', () => {
  it('is a no-op for an empty recurrent catastrophe map without throwing', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.recurrentCatastropheRecords = {}

    const nextState = advanceWeek(state)

    expect(nextState.recurrentCatastropheRecords).toEqual({})
  })

  it('retains recurrence fields before the due week after advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 51
    state.recurrentCatastropheRecords = {
      [RECURRENCE_DAMAGE_LEDGER_FIXTURE.id]: RECURRENCE_DAMAGE_LEDGER_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const record = nextState.recurrentCatastropheRecords?.[RECURRENCE_DAMAGE_LEDGER_FIXTURE.id]

    expect(nextState.week).toBe(52)
    expect(record?.recurrenceCount).toBe(3)
    expect(record?.lastOccurrenceWeek).toBe(40)
    expect(record?.damageLedgerRefs).toEqual(RECURRENCE_DAMAGE_LEDGER_FIXTURE.damageLedgerRefs)
  })

  it('advances recurrenceCount and lastOccurrenceWeek when advanceWeek reaches the due week', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 52
    state.recurrentCatastropheRecords = {
      [RECURRENCE_DAMAGE_LEDGER_FIXTURE.id]: RECURRENCE_DAMAGE_LEDGER_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const record = nextState.recurrentCatastropheRecords?.[RECURRENCE_DAMAGE_LEDGER_FIXTURE.id]

    expect(nextState.week).toBe(53)
    expect(record?.recurrenceCount).toBe(4)
    expect(record?.lastOccurrenceWeek).toBe(53)
    expect(record?.postIncidentReviewRefs).toEqual(
      RECURRENCE_DAMAGE_LEDGER_FIXTURE.postIncidentReviewRefs
    )
  })

  it('does not activate prevention tactics on impossible-ceiling records through advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 10
    state.recurrentCatastropheRecords = {
      [IMPOSSIBLE_PREVENTION_DAMPENING_FIXTURE.id]: {
        ...IMPOSSIBLE_PREVENTION_DAMPENING_FIXTURE,
        recurrenceCadence: 'weekly',
        recurrenceCount: 1,
        lastOccurrenceWeek: 10,
      },
    }

    const nextState = advanceWeek(state)
    const record =
      nextState.recurrentCatastropheRecords?.[IMPOSSIBLE_PREVENTION_DAMPENING_FIXTURE.id]

    expect(nextState.week).toBe(11)
    expect(record?.recurrenceCount).toBe(2)
    expect(record?.lastOccurrenceWeek).toBe(11)
    expect(record?.preventionTactics?.every((entry) => entry.active === false)).toBe(true)
  })

  it('matches direct tick output for the post-advance week', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 52
    state.recurrentCatastropheRecords = {
      [RECURRENCE_DAMAGE_LEDGER_FIXTURE.id]: RECURRENCE_DAMAGE_LEDGER_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const directTick = applyWeeklyRecurrentCatastropheTick(
      state.recurrentCatastropheRecords,
      nextState.week
    )

    expect(nextState.recurrentCatastropheRecords).toEqual(directTick)
  })
})
