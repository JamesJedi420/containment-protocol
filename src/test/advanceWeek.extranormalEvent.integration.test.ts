import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  BRIEF_COVER_UP_EVENT_FIXTURE,
  BRIEF_COVER_UP_EVENT_WITH_CLUSTER,
} from '../domain/extranormalEventRegistry'
import { advanceWeek } from '../domain/sim/advanceWeek'

function freezeCasesForQuietWeek(state: ReturnType<typeof createStartingState>) {
  for (const currentCase of Object.values(state.cases)) {
    currentCase.status = 'open'
    currentCase.assignedTeamIds = []
    currentCase.requiredTags = []
    currentCase.preferredTags = []
    currentCase.weeksRemaining = undefined
  }
}

describe('advanceWeek extranormal event monitoring integration (SPE-2105 slice 3)', () => {
  it('is a no-op for an empty extranormal event map without throwing', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.extranormalEventRecords = {}

    const nextState = advanceWeek(state)

    expect(nextState.extranormalEventRecords).toEqual({})
  })

  it('retains monitoringUntilWeek before the until-week after advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 36
    state.extranormalEventRecords = {
      [BRIEF_COVER_UP_EVENT_FIXTURE.id]: BRIEF_COVER_UP_EVENT_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const event = nextState.extranormalEventRecords?.[BRIEF_COVER_UP_EVENT_FIXTURE.id]

    expect(nextState.week).toBe(37)
    expect(event?.monitoringUntilWeek).toBe(38)
    expect(event?.closureState).toBe('sourceless_closed')
  })

  it('clears monitoringUntilWeek when advanceWeek reaches the until-week', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 38
    state.extranormalEventRecords = {
      [BRIEF_COVER_UP_EVENT_FIXTURE.id]: BRIEF_COVER_UP_EVENT_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const event = nextState.extranormalEventRecords?.[BRIEF_COVER_UP_EVENT_FIXTURE.id]

    expect(nextState.week).toBe(39)
    expect(event?.monitoringUntilWeek).toBeUndefined()
    expect(event?.closureState).toBe('sourceless_closed')
    expect(event?.similarEventCluster).toEqual(BRIEF_COVER_UP_EVENT_FIXTURE.similarEventCluster)
  })

  it('preserves cluster refs byte-stable through advanceWeek monitoring expiry', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 40
    state.extranormalEventRecords = {
      [BRIEF_COVER_UP_EVENT_WITH_CLUSTER.id]: BRIEF_COVER_UP_EVENT_WITH_CLUSTER,
    }

    const nextState = advanceWeek(state)
    const event = nextState.extranormalEventRecords?.[BRIEF_COVER_UP_EVENT_WITH_CLUSTER.id]

    expect(event?.monitoringUntilWeek).toBeUndefined()
    expect(event?.similarEventCluster).toEqual(BRIEF_COVER_UP_EVENT_WITH_CLUSTER.similarEventCluster)
    expect(event?.observerClassTags).toEqual(BRIEF_COVER_UP_EVENT_WITH_CLUSTER.observerClassTags)
  })
})
