import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import {
  PSYCHOLOGICAL_RESILIENCE_STABLE_OPERATOR_FIXTURE,
  PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE,
  PSYCHOLOGICAL_RESILIENCE_TREATMENT_BREAKDOWN_FIXTURE,
} from '../domain/psychologicalResilienceRegistry'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { applyWeeklyPsychologicalResilienceDepletionTick } from '../domain/psychologicalResilienceWeeklyOrchestration'

function freezeCasesForQuietWeek(state: ReturnType<typeof createStartingState>) {
  for (const currentCase of Object.values(state.cases)) {
    currentCase.status = 'open'
    currentCase.assignedTeamIds = []
    currentCase.requiredTags = []
    currentCase.preferredTags = []
    currentCase.weeksRemaining = undefined
  }
}

describe('advanceWeek psychological resilience records integration (SPE-1615 slice 3)', () => {
  it('is a no-op for an empty resilience map without throwing', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.psychologicalResilienceRecords = {}

    const nextState = advanceWeek(state)

    expect(nextState.psychologicalResilienceRecords).toEqual({})
  })

  it('advances staged depletion fixture to compromised through advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.psychologicalResilienceRecords = {
      [PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE.id]:
        PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const advanced =
      nextState.psychologicalResilienceRecords?.[
        PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE.id
      ]

    expect(nextState.week).toBe(2)
    expect(advanced?.depletionBand).toBe('compromised')
    expect(advanced?.treatmentRequired).toBe(false)
    expect(advanced?.restRecoverable).toBe(true)
    expect(advanced?.operatorRef).toBe(
      PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE.operatorRef
    )
  })

  it('preserves treatment breakdown fixture at breakdown with unchanged gating flags', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.psychologicalResilienceRecords = {
      [PSYCHOLOGICAL_RESILIENCE_TREATMENT_BREAKDOWN_FIXTURE.id]:
        PSYCHOLOGICAL_RESILIENCE_TREATMENT_BREAKDOWN_FIXTURE,
    }

    const nextState = advanceWeek(state)

    expect(nextState.psychologicalResilienceRecords).toEqual(state.psychologicalResilienceRecords)
    expect(
      nextState.psychologicalResilienceRecords?.[
        PSYCHOLOGICAL_RESILIENCE_TREATMENT_BREAKDOWN_FIXTURE.id
      ]?.treatmentRequired
    ).toBe(true)
    expect(
      nextState.psychologicalResilienceRecords?.[
        PSYCHOLOGICAL_RESILIENCE_TREATMENT_BREAKDOWN_FIXTURE.id
      ]?.restRecoverable
    ).toBe(false)
  })

  it('keeps stable operator fixture unchanged through advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.psychologicalResilienceRecords = {
      [PSYCHOLOGICAL_RESILIENCE_STABLE_OPERATOR_FIXTURE.id]:
        PSYCHOLOGICAL_RESILIENCE_STABLE_OPERATOR_FIXTURE,
    }

    const nextState = advanceWeek(state)

    expect(nextState.psychologicalResilienceRecords).toEqual(state.psychologicalResilienceRecords)
    expect(
      nextState.psychologicalResilienceRecords?.[PSYCHOLOGICAL_RESILIENCE_STABLE_OPERATOR_FIXTURE.id]
        ?.depletionBand
    ).toBe('stable')
  })

  it('matches direct weekly tick output inside advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.psychologicalResilienceRecords = {
      [PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE.id]:
        PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE,
      [PSYCHOLOGICAL_RESILIENCE_TREATMENT_BREAKDOWN_FIXTURE.id]:
        PSYCHOLOGICAL_RESILIENCE_TREATMENT_BREAKDOWN_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const direct = applyWeeklyPsychologicalResilienceDepletionTick(
      state.psychologicalResilienceRecords,
      nextState.week
    )

    expect(nextState.psychologicalResilienceRecords).toEqual(direct)
  })
})
