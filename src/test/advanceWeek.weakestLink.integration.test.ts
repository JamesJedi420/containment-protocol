import { describe, it, expect } from 'vitest'
import { createStartingState } from '../data/startingState'
import { advanceWeek } from '../domain/sim/advanceWeek'

describe('advanceWeek weakest-link integration', () => {
  it('stores weakestLink result in MissionResult for deterministic missions', () => {
    const state = createStartingState()
    // Force a deterministic mission with a single team
    const caseId = Object.keys(state.cases)[0]
    const currentCase = state.cases[caseId]
    currentCase.mode = 'deterministic'
    currentCase.status = 'in_progress'
    currentCase.assignedTeamIds = [Object.keys(state.teams)[0]]
    // Set up team and agents to be valid
    const team = state.teams[currentCase.assignedTeamIds[0]]
    team.memberIds = team.agentIds
    team.status = { state: 'deployed', assignedCaseId: caseId }
    // Force mission to resolve in one week
    currentCase.durationWeeks = 1
    currentCase.weeksRemaining = 1
    // Run week advancement
    const nextState = advanceWeek(state)
    // Find the mission result in canonical state (reports)
    const lastReport = nextState.reports[nextState.reports.length - 1]
    const caseSnapshot = lastReport?.caseSnapshots?.[caseId]
    const missionResult = caseSnapshot?.missionResult
    expect(missionResult).toBeDefined()
    if (!missionResult) {
      throw new Error('Expected mission result in weekly report case snapshot.')
    }
    expect(missionResult.weakestLink).toBeDefined()
    expect(missionResult.weakestLink?.missionId).toBe(caseId)
    expect(['success', 'partial', 'fail']).toContain(missionResult.weakestLink?.resultKind)
    expect(missionResult.weakestLink?.weakestLinkPenaltyBuckets).toBeInstanceOf(Array)
  })
})
