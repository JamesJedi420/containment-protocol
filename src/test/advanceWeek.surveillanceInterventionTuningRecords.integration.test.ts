import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import { SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE } from '../domain/surveillanceCapacityInterventionTuningRegistry'
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

describe('advanceWeek surveillance intervention tuning records integration (SPE-848 slice 2)', () => {
  it('preserves surveillance tuning records through advanceWeek without mutation', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.surveillanceInterventionTuningRecords = {
      [SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE.id]: SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE,
    }

    const nextState = advanceWeek(state)

    expect(nextState.surveillanceInterventionTuningRecords).toEqual(
      state.surveillanceInterventionTuningRecords
    )
  })

  it('is a no-op for an empty tuning map without throwing', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.surveillanceInterventionTuningRecords = {}

    const nextState = advanceWeek(state)

    expect(nextState.surveillanceInterventionTuningRecords).toEqual({})
  })
})
