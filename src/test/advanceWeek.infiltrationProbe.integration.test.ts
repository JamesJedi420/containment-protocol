import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { advanceWeek } from '../domain/sim/advanceWeek'

describe('advanceWeek infiltration probe integration', () => {
  it('ticks probe tracks under cover and emits awareness complication events', () => {
    const state = createStartingState()
    const [teamId] = Object.keys(state.teams)

    state.reports = []
    state.agency!.supportAvailable = 3
    state.globalFlags = { 'conceal.case.case-001': true }

    for (const currentCase of Object.values(state.cases)) {
      currentCase.status = 'open'
      currentCase.assignedTeamIds = []
      currentCase.requiredTags = []
      currentCase.preferredTags = []
      currentCase.hiddenState = undefined
      currentCase.infiltrationProbeProgress = undefined
      currentCase.infiltrationAwareness = undefined
      currentCase.infiltrationStage = undefined
    }

    const covertCase = state.cases['case-001']
    covertCase.mode = 'deterministic'
    covertCase.status = 'in_progress'
    covertCase.assignedTeamIds = [teamId]
    covertCase.weeksRemaining = 3
    covertCase.tags = ['infiltration', 'public']
    covertCase.infiltrationAwareness = 0.48

    const nextState = advanceWeek(state)
    const updatedCase = nextState.cases['case-001']

    expect(updatedCase.hiddenState).toBe('hidden')
    expect(updatedCase.infiltrationProbeProgress).toBeGreaterThan(0)
    expect(updatedCase.infiltrationAwareness).toBeGreaterThan(0.48)
    expect(updatedCase.infiltrationStage).toBe('exposed')
    expect(updatedCase.detectionConfidence).toBeGreaterThanOrEqual(0.55)
  })
})
