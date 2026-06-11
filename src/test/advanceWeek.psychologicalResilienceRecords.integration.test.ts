import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import {
  PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE,
  PSYCHOLOGICAL_RESILIENCE_TREATMENT_BREAKDOWN_FIXTURE,
} from '../domain/psychologicalResilienceRegistry'
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

describe('advanceWeek psychological resilience records integration (SPE-1615 slice 2)', () => {
  it('is a no-op for an empty resilience map without throwing', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.psychologicalResilienceRecords = {}

    const nextState = advanceWeek(state)

    expect(nextState.psychologicalResilienceRecords).toEqual({})
  })

  it('preserves psychological resilience records through advanceWeek without mutation', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.psychologicalResilienceRecords = {
      [PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE.id]:
        PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE,
      [PSYCHOLOGICAL_RESILIENCE_TREATMENT_BREAKDOWN_FIXTURE.id]:
        PSYCHOLOGICAL_RESILIENCE_TREATMENT_BREAKDOWN_FIXTURE,
    }

    const nextState = advanceWeek(state)

    expect(nextState.psychologicalResilienceRecords).toEqual(state.psychologicalResilienceRecords)
    expect(nextState.week).toBe(2)
    expect(
      nextState.psychologicalResilienceRecords?.[PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE.id]
        ?.operatorRef
    ).toBe(PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE.operatorRef)
    expect(
      nextState.psychologicalResilienceRecords?.[
        PSYCHOLOGICAL_RESILIENCE_TREATMENT_BREAKDOWN_FIXTURE.id
      ]?.treatmentRequired
    ).toBe(true)
    expect(
      nextState.psychologicalResilienceRecords?.[
        PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE.id
      ]?.restRecoverable
    ).toBe(true)
  })
})
