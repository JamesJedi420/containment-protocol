import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import { advanceWeek } from '../domain/sim/advanceWeek'

function setHighFatigueForTeam(
  state: ReturnType<typeof createStartingState>,
  teamId: string,
  fatigue: number
) {
  const team = state.teams[teamId]
  if (!team) {
    throw new Error(`Missing team ${teamId}`)
  }
  for (const agentId of team.memberIds ?? team.agentIds ?? []) {
    const agent = state.agents[agentId]
    if (agent) {
      state.agents[agentId] = { ...agent, fatigue }
    }
  }
}

describe('advanceWeek deployment momentum (SPE-282)', () => {
  it('chains earn then spend across two successes in the same week using progressive momentum', () => {
    const state = createStartingState()
    state.config = {
      ...state.config,
      challengeModeEnabled: true,
      durationModel: 'attrition',
    }
    state.deploymentMomentum = undefined

    const caseA = 'case-001'
    const caseB = 'case-002'
    const teamA = 't_nightwatch'
    const teamB = 't_greentape'

    for (const caseId of [caseA, caseB]) {
      const c = state.cases[caseId]!
      c.mode = 'deterministic'
      c.status = 'in_progress'
      c.difficulty = { combat: 0, investigation: 0, utility: 0, social: 0 }
      c.stage = 1
      c.durationWeeks = 1
      c.weeksRemaining = 1
    }

    state.cases[caseA]!.assignedTeamIds = [teamA]
    state.cases[caseB]!.assignedTeamIds = [teamB]

    const teamRowA = state.teams[teamA]!
    teamRowA.memberIds = teamRowA.agentIds
    teamRowA.status = { state: 'deployed', assignedCaseId: caseA }

    const teamRowB = state.teams[teamB]!
    teamRowB.memberIds = teamRowB.agentIds
    teamRowB.status = { state: 'deployed', assignedCaseId: caseB }

    setHighFatigueForTeam(state, teamA, 80)
    setHighFatigueForTeam(state, teamB, 80)

    const next = advanceWeek(state)

    expect(next.deploymentMomentum?.stacks).toBe(1)

    const report = next.reports[next.reports.length - 1]
    const snapA = report?.caseSnapshots?.[caseA]?.missionResult
    const snapB = report?.caseSnapshots?.[caseB]?.missionResult

    expect(snapA?.outcome).toBe('success')
    expect(snapB?.outcome).toBe('success')

    const spentReasons = (snap: typeof snapA) =>
      (snap?.rewards?.reasons ?? []).filter((r) => r.includes('Deployment momentum: spent'))

    expect(spentReasons(snapA)).toHaveLength(0)
    expect(spentReasons(snapB).length).toBeGreaterThan(0)
  })
})
