import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { advanceWeek } from '../domain/sim/advanceWeek'

describe('advanceWeek hidden-state downstream operational impact', () => {
  it('uses displacement to alter the mission route deterministically', () => {
    const state = createStartingState()
    const [teamA, teamB] = Object.keys(state.teams)

    state.reports = []
    state.agency!.supportAvailable = 2

    for (const currentCase of Object.values(state.cases)) {
      currentCase.status = 'open'
      currentCase.assignedTeamIds = []
      currentCase.requiredTags = []
      currentCase.preferredTags = []
    }

    state.cases['case-001'].mode = 'deterministic'
    state.cases['case-001'].status = 'in_progress'
    state.cases['case-001'].assignedTeamIds = [teamA]
    state.cases['case-001'].weeksRemaining = 1
    state.cases['case-001'].hiddenState = 'hidden'
    state.cases['case-001'].route = 'route-a'

    state.cases['case-003'].mode = 'deterministic'
    state.cases['case-003'].status = 'in_progress'
    state.cases['case-003'].assignedTeamIds = [teamB]
    state.cases['case-003'].weeksRemaining = 1
    state.cases['case-003'].hiddenState = 'displaced'
    state.cases['case-003'].displacementTarget = 'safehouse-9'
    state.cases['case-003'].route = 'route-a'

    const nextState = advanceWeek(state)
    const lastReport = nextState.reports[nextState.reports.length - 1]

    const hiddenRoute = lastReport.caseSnapshots?.['case-001']?.missionResult?.route
    const displacedRoute = lastReport.caseSnapshots?.['case-003']?.missionResult?.route

    expect(hiddenRoute).toBe('route-a')
    expect(displacedRoute).toBe('route-a->safehouse-9')
    expect(hiddenRoute).not.toBe(displacedRoute)
  })
})
