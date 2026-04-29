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

  it('activates bounded overdrive on high combat stress and stores expiry aftermath debt', () => {
    const state = createStartingState()
    const team = state.teams['t_nightwatch']
    const subjectId = team.agentIds[0]
    const subject = {
      ...state.agents[subjectId]!,
      fatigue: 50,
      status: 'active' as const,
      fatigueChannels: {
        ...(state.agents[subjectId]!.fatigueChannels ?? {
          physicalExhaustion: 0,
          mentalExhaustion: 0,
          combatStress: 0,
          capabilityUsesThisPhase: 0,
        }),
        combatStress: 70,
      },
    }

    const result = applyMissionResolutionAgentMutations({
      agents: {
        ...state.agents,
        [subject.id]: subject,
      },
      assignedAgents: [subject],
      assignedAgentLeaderBonuses: {},
      effectiveCase: {
        ...state.cases['case-001'],
        stage: 2,
        assignedTeamIds: ['t_nightwatch'],
      },
      outcome: makeOutcome({ result: 'fail', delta: -20 }),
      week: state.week,
      rng: () => 0.6,
    })

    const next = result.nextAgents[subject.id]
    expect(next?.overdrive?.active).toBe(false)
    expect(next?.overdrive?.remainingPhases).toBe(0)
    expect(next?.overdrive?.recoveryDebt).toBeGreaterThan(0)
  })

  it('overdrive provides short-term injury protection versus same agent without activation', () => {
    const state = createStartingState()
    const team = state.teams['t_nightwatch']
    const subjectId = team.agentIds[0]
    const base = state.agents[subjectId]!

    const lowStress = {
      ...base,
      fatigue: 50,
      status: 'active' as const,
      fatigueChannels: {
        ...(base.fatigueChannels ?? {
          physicalExhaustion: 0,
          mentalExhaustion: 0,
          combatStress: 0,
          capabilityUsesThisPhase: 0,
        }),
        combatStress: 40,
      },
    }

    const highStress = {
      ...base,
      fatigue: 50,
      status: 'active' as const,
      fatigueChannels: {
        ...(base.fatigueChannels ?? {
          physicalExhaustion: 0,
          mentalExhaustion: 0,
          combatStress: 0,
          capabilityUsesThisPhase: 0,
        }),
        combatStress: 70,
      },
    }

    const commonInput = {
      assignedAgentLeaderBonuses: {},
      effectiveCase: {
        ...state.cases['case-001'],
        stage: 2,
        assignedTeamIds: ['t_nightwatch'],
      },
      outcome: makeOutcome({ result: 'fail', delta: -20 }),
      week: state.week,
      rng: () => 0.6,
    }

    const lowResult = applyMissionResolutionAgentMutations({
      agents: { ...state.agents, [lowStress.id]: lowStress },
      assignedAgents: [lowStress],
      ...commonInput,
    })

    const highResult = applyMissionResolutionAgentMutations({
      agents: { ...state.agents, [highStress.id]: highStress },
      assignedAgents: [highStress],
      ...commonInput,
    })

    // Deterministic protection expectation: high-stress run activates overdrive and
    // should not produce more injuries than the non-overdrive baseline.
    expect(highResult.missionInjuries.length).toBeLessThanOrEqual(lowResult.missionInjuries.length)
  })

  it('transit vulnerability can trigger return-route ambush injury outside main fail roll', () => {
    const state = createStartingState()
    const team = state.teams['t_nightwatch']
    const subjectId = team.agentIds[0]
    const subject = {
      ...state.agents[subjectId]!,
      fatigue: 10,
      status: 'active' as const,
      fatigueChannels: {
        ...(state.agents[subjectId]!.fatigueChannels ?? {
          physicalExhaustion: 0,
          mentalExhaustion: 0,
          combatStress: 0,
          capabilityUsesThisPhase: 0,
        }),
        physicalExhaustion: 70,
        mentalExhaustion: 45,
        combatStress: 20,
      },
    }

    const result = applyMissionResolutionAgentMutations({
      agents: {
        ...state.agents,
        [subject.id]: subject,
      },
      assignedAgents: [subject],
      assignedAgentLeaderBonuses: {},
      effectiveCase: {
        ...state.cases['case-001'],
        stage: 1,
        assignedTeamIds: ['t_nightwatch'],
      },
      outcome: makeOutcome({ result: 'fail', delta: -5 }),
      week: state.week,
      rng: () => 0,
    })

    expect(result.missionInjuries.length).toBeGreaterThan(0)
    expect(result.missionInjuries.every((injury) => injury.severity === 'minor')).toBe(true)
  })

  it('transit vulnerability does not trigger when return path is not solo', () => {
    const state = createStartingState()
    const team = state.teams['t_nightwatch']
    const ids = team.agentIds.slice(0, 2)
    const assignedAgents = ids.map((id) => ({
      ...state.agents[id]!,
      fatigue: 10,
      status: 'active' as const,
      fatigueChannels: {
        ...(state.agents[id]!.fatigueChannels ?? {
          physicalExhaustion: 0,
          mentalExhaustion: 0,
          combatStress: 0,
          capabilityUsesThisPhase: 0,
        }),
        physicalExhaustion: 70,
        mentalExhaustion: 45,
        combatStress: 20,
      },
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
        stage: 1,
        assignedTeamIds: ['t_nightwatch'],
      },
      outcome: makeOutcome({ result: 'fail', delta: -5 }),
      week: state.week,
      rng: () => 0,
    })

    // Not solo: bounded transit vulnerability window is disabled.
    expect(result.missionInjuries).toHaveLength(0)
  })

  it('transit ambush injury applies extra morale penalty', () => {
    const state = createStartingState()
    const team = state.teams['t_nightwatch']
    const subjectId = team.agentIds[0]
    const subject = {
      ...state.agents[subjectId]!,
      fatigue: 10,
      status: 'active' as const,
      fatigueChannels: {
        ...(state.agents[subjectId]!.fatigueChannels ?? {
          physicalExhaustion: 0,
          mentalExhaustion: 0,
          combatStress: 0,
          capabilityUsesThisPhase: 0,
        }),
        physicalExhaustion: 70,
        mentalExhaustion: 45,
        combatStress: 20,
      },
      vitals: {
        health: 100,
        stress: 10,
        morale: 90,
        wounds: 0,
        statusFlags: [],
      },
    }

    const result = applyMissionResolutionAgentMutations({
      agents: {
        ...state.agents,
        [subject.id]: subject,
      },
      assignedAgents: [subject],
      assignedAgentLeaderBonuses: {},
      effectiveCase: {
        ...state.cases['case-001'],
        stage: 1,
        assignedTeamIds: ['t_nightwatch'],
      },
      outcome: makeOutcome({ result: 'fail', delta: -5 }),
      week: state.week,
      rng: () => 0,
    })

    const next = result.nextAgents[subject.id]
    // Base minor injury morale loss is 8; transit penalty adds 6 => total 14.
    expect(next?.vitals?.morale).toBe(76)
  })
})
