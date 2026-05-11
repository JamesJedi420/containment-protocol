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

  it('adds follow-up objective-drift consequence when archive instability overlay applies', () => {
    const state = createStartingState()
    const caseId = Object.keys(state.cases)[0]
    const currentCase = state.cases[caseId]
    currentCase.mode = 'deterministic'
    currentCase.status = 'in_progress'
    currentCase.contract = { templateId: 'institutions-ritual-archive' }
    currentCase.assignedTeamIds = [Object.keys(state.teams)[0]]
    currentCase.difficulty = { combat: 0, investigation: 0, utility: 0, social: 0 }
    currentCase.stage = 1
    const team = state.teams[currentCase.assignedTeamIds[0]]
    team.memberIds = team.agentIds
    team.status = { state: 'deployed', assignedCaseId: caseId }
    currentCase.durationWeeks = 1
    currentCase.weeksRemaining = 1

    const nextState = advanceWeek(state)
    const lastReport = nextState.reports[nextState.reports.length - 1]
    const missionResult = lastReport?.caseSnapshots?.[caseId]?.missionResult
    expect(missionResult).toBeDefined()
    if (!missionResult) {
      throw new Error('Expected mission result in weekly report case snapshot.')
    }

    expect(missionResult.weakestLink?.executionInstability?.applied).toBe(true)
    expect(missionResult.route).toContain('fallback-containment')
    expect(
      missionResult.spawnedConsequences.some(
        (consequence) =>
          consequence.type === 'queued_follow_up' && consequence.detail.includes('objective realignment')
      )
    ).toBe(true)
  })
})
