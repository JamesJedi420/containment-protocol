import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import type { ResolutionOutcome } from '../domain/models'
import { applyMissionResolutionAgentMutations } from '../domain/sim/missionResolutionAgents'

function makeOutcome(overrides: Partial<ResolutionOutcome> = {}): ResolutionOutcome {
  return {
    caseId: 'case-001',
    mode: 'threshold',
    kind: 'case',
    delta: 10,
    result: 'success',
    reasons: ['test-outcome'],
    ...overrides,
  }
}

describe('applyMissionResolutionAgentMutations', () => {
  it('applies case history + xp events for successful mission resolution', () => {
    const state = createStartingState()
    const team = state.teams['t_nightwatch']
    const assignedAgents = team.agentIds.map((agentId) => state.agents[agentId]!).filter(Boolean)

    const result = applyMissionResolutionAgentMutations({
      agents: state.agents,
      assignedAgents,
      assignedAgentLeaderBonuses: {},
      effectiveCase: {
        ...state.cases['case-001'],
        assignedTeamIds: ['t_nightwatch'],
      },
      outcome: makeOutcome({ result: 'success' }),
      week: state.week,
      rng: () => 0.5,
    })

    const firstAgent = result.nextAgents[team.agentIds[0]]
    expect(firstAgent?.assignment?.state).toBe('idle')
    expect(firstAgent?.history?.counters.assignmentsCompleted).toBe(1)
    expect(firstAgent?.history?.timeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ eventType: 'case.resolved' }),
        expect.objectContaining({ eventType: 'progression.xp_gained' }),
      ])
    )
    expect(result.eventDrafts.some((draft) => draft.type === 'progression.xp_gained')).toBe(true)
    expect(result.missionInjuries).toHaveLength(0)
  })

  it('records injuries and recovery assignment when fail outcome causes injury roll', () => {
    const state = createStartingState()
    const team = state.teams['t_nightwatch']
    const assignedAgents = team.agentIds.map((agentId) => ({
      ...state.agents[agentId]!,
      fatigue: 90,
      status: 'active' as const,
    }))

    const result = applyMissionResolutionAgentMutations({
      agents: {
        ...state.agents,
        ...Object.fromEntries(assignedAgents.map((agent) => [agent.id, agent])),
      },
      assignedAgents,
      assignedAgentLeaderBonuses: {},
      effectiveCase: {
        ...state.cases['case-001'],
        stage: 3,
        assignedTeamIds: ['t_nightwatch'],
      },
      outcome: makeOutcome({ result: 'fail', delta: -20 }),
      week: state.week,
      rng: () => 0,
    })

    expect(result.missionInjuries.length).toBeGreaterThan(0)
    expect(result.eventDrafts.some((draft) => draft.type === 'agent.injured')).toBe(true)

    const firstAgent = result.nextAgents[team.agentIds[0]]
    expect(firstAgent?.status).toBe('injured')
    expect(firstAgent?.assignment?.state).toBe('recovery')
    expect(firstAgent?.history?.timeline).toEqual(
      expect.arrayContaining([expect.objectContaining({ eventType: 'agent.injured' })])
    )
  })

  it('can kill agents on catastrophic failed missions that carry fatality pressure', () => {
    const state = createStartingState()
    const team = state.teams['t_nightwatch']
    const assignedAgents = team.agentIds.map((agentId) => ({
      ...state.agents[agentId]!,
      fatigue: 95,
      status: 'active' as const,
    }))

    const result = applyMissionResolutionAgentMutations({
      agents: {
        ...state.agents,
        ...Object.fromEntries(assignedAgents.map((agent) => [agent.id, agent])),
      },
      assignedAgents,
      assignedAgentLeaderBonuses: {},
      effectiveCase: {
        ...state.cases['case-001'],
        kind: 'raid',
        stage: 5,
        assignedTeamIds: ['t_nightwatch'],
        raid: {
          minTeams: 2,
          maxTeams: 2,
        },
      },
      outcome: makeOutcome({ result: 'fail', delta: -40 }),
      week: state.week,
      rng: () => 0,
    })

    expect(result.missionFatalities.length).toBeGreaterThan(0)
    expect(result.eventDrafts.some((draft) => draft.type === 'agent.killed')).toBe(true)

    const firstAgent = result.nextAgents[team.agentIds[0]]
    expect(firstAgent?.status).toBe('dead')
    expect(firstAgent?.assignment?.state).toBe('idle')
    expect(firstAgent?.vitals?.health).toBe(0)
  })
})
