import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  COVERED_PURSUIT_RESOLUTION_FIXTURE,
  DISPOSAL_DEADLINE_SWEEP_FIXTURE,
  SUBCONSCIOUS_RETINAL_FILTER_FAILURE_FIXTURE,
} from '../domain/visualTriggerHazardRegistry'
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

describe('advanceWeek visual trigger hazard integration (SPE-2111 slice 3)', () => {
  it('is a no-op for an empty visual trigger hazard map without throwing', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.visualTriggerHazardRecords = {}

    const nextState = advanceWeek(state)

    expect(nextState.visualTriggerHazardRecords).toEqual({})
  })

  it('advances disposal compliance posture after advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 31
    state.visualTriggerHazardRecords = {
      [DISPOSAL_DEADLINE_SWEEP_FIXTURE.id]: DISPOSAL_DEADLINE_SWEEP_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const nextRecord =
      nextState.visualTriggerHazardRecords?.[DISPOSAL_DEADLINE_SWEEP_FIXTURE.id]

    expect(nextState.week).toBe(32)
    expect(nextRecord?.hazardousMediaInstances?.[0]?.sweepStatus).toBe('in_progress')
    expect(nextRecord?.label).toBe(DISPOSAL_DEADLINE_SWEEP_FIXTURE.label)
  })

  it('resolves covered pursuit after advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 9
    state.visualTriggerHazardRecords = {
      [COVERED_PURSUIT_RESOLUTION_FIXTURE.id]: COVERED_PURSUIT_RESOLUTION_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const nextRecord =
      nextState.visualTriggerHazardRecords?.[COVERED_PURSUIT_RESOLUTION_FIXTURE.id]

    expect(nextState.week).toBe(10)
    expect(nextRecord?.pursuitState).toBe('resolved')
    expect(nextRecord?.targetInstanceIds).toEqual(
      COVERED_PURSUIT_RESOLUTION_FIXTURE.targetInstanceIds
    )
  })

  it('applies scheduled awareness-band transition after advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 4
    state.visualTriggerHazardRecords = {
      [SUBCONSCIOUS_RETINAL_FILTER_FAILURE_FIXTURE.id]:
        SUBCONSCIOUS_RETINAL_FILTER_FAILURE_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const nextRecord =
      nextState.visualTriggerHazardRecords?.[SUBCONSCIOUS_RETINAL_FILTER_FAILURE_FIXTURE.id]

    expect(nextState.week).toBe(5)
    expect(nextRecord?.observerAwarenessBand).toBe('heightened')
    expect(nextRecord?.pursuitState).toBe('distressed')
  })

  it('is idempotent when advanceWeek state is re-ticked at the same week', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 9
    state.visualTriggerHazardRecords = {
      [COVERED_PURSUIT_RESOLUTION_FIXTURE.id]: COVERED_PURSUIT_RESOLUTION_FIXTURE,
    }

    const once = advanceWeek(state)
    const twice = {
      ...once,
      visualTriggerHazardRecords: once.visualTriggerHazardRecords,
    }
    twice.week = 9
    const reticked = advanceWeek(twice)

    expect(reticked.visualTriggerHazardRecords?.[COVERED_PURSUIT_RESOLUTION_FIXTURE.id]).toEqual(
      once.visualTriggerHazardRecords?.[COVERED_PURSUIT_RESOLUTION_FIXTURE.id]
    )
  })
})
