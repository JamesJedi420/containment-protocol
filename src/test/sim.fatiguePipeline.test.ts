// cspell:words greentape sato
import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { applyWeeklyAgentFatigue, getAverageTeamFatigue } from '../domain/sim/fatiguePipeline'

describe('fatiguePipeline', () => {
  it('applies mission fatigue to active team agents and recovery fatigue to idle agents', () => {
    const state = createStartingState()
    state.config = {
      ...state.config,
      durationModel: 'attrition',
      attritionPerWeek: 6,
    }
    state.teams['t_nightwatch'] = {
      ...state.teams['t_nightwatch'],
      assignedCaseId: 'case-001',
    }

    const nextAgents = applyWeeklyAgentFatigue({
      agents: state.agents,
      teams: state.teams,
      config: state.config,
      activeTeamIds: ['t_nightwatch'],
    })

    const activeAgentId = state.teams['t_nightwatch'].agentIds[0]
    const idleAgentId = Object.keys(state.agents).find(
      (agentId) => !state.teams['t_nightwatch'].agentIds.includes(agentId)
    )

    expect(activeAgentId).toBeDefined()
    expect(idleAgentId).toBeDefined()
    expect(nextAgents[activeAgentId!].fatigue).toBe(state.agents[activeAgentId!].fatigue + 6)
    expect(nextAgents[idleAgentId!].fatigue).toBe(
      Math.max(state.agents[idleAgentId!].fatigue - 3, 0)
    )
  })

  it('uses lower mission fatigue in capacity mode than attrition mode', () => {
    const state = createStartingState()
    const activeTeamIds = ['t_nightwatch']

    const capacityAgents = applyWeeklyAgentFatigue({
      agents: state.agents,
      teams: state.teams,
      config: {
        ...state.config,
        durationModel: 'capacity',
        attritionPerWeek: 4,
      },
      activeTeamIds,
    })
    const attritionAgents = applyWeeklyAgentFatigue({
      agents: state.agents,
      teams: state.teams,
      config: {
        ...state.config,
        durationModel: 'attrition',
        attritionPerWeek: 4,
      },
      activeTeamIds,
    })
    const sampleAgentId = state.teams['t_nightwatch'].agentIds[0]

    const capacityDelta =
      capacityAgents[sampleAgentId].fatigue - state.agents[sampleAgentId].fatigue
    const attritionDelta =
      attritionAgents[sampleAgentId].fatigue - state.agents[sampleAgentId].fatigue

    expect(capacityDelta).toBe(3)
    expect(attritionDelta).toBe(4)
    expect(attritionDelta).toBeGreaterThanOrEqual(capacityDelta)
  })

  it('keeps training agents fatigue unchanged while applying clamp boundaries', () => {
    const state = createStartingState()
    const trainingAgentId = state.teams['t_greentape'].agentIds[0]
    const activeAgentId = state.teams['t_nightwatch'].agentIds[0]
    const idleAgentId = Object.keys(state.agents).find(
      (agentId) =>
        agentId !== trainingAgentId &&
        !state.teams['t_nightwatch'].agentIds.includes(agentId) &&
        !state.teams['t_greentape'].agentIds.includes(agentId)
    )

    state.agents[trainingAgentId] = {
      ...state.agents[trainingAgentId],
      fatigue: 47,
      assignment: {
        state: 'training',
        startedWeek: state.week,
      },
    }
    state.agents[activeAgentId] = {
      ...state.agents[activeAgentId],
      fatigue: 99,
    }
    if (idleAgentId) {
      state.agents[idleAgentId] = {
        ...state.agents[idleAgentId],
        fatigue: 0,
      }
    }

    const nextAgents = applyWeeklyAgentFatigue({
      agents: state.agents,
      teams: state.teams,
      config: {
        ...state.config,
        durationModel: 'attrition',
        attritionPerWeek: 6,
      },
      activeTeamIds: ['t_nightwatch'],
      activeTeamStressModifiers: {
        t_nightwatch: 0.5,
      },
    })

    expect(nextAgents[trainingAgentId].fatigue).toBe(47)
    expect(nextAgents[activeAgentId].fatigue).toBe(100)

    if (idleAgentId) {
      expect(nextAgents[idleAgentId].fatigue).toBe(0)
    }
  })

  it('returns rounded average fatigue and zero for empty teams', () => {
    const state = createStartingState()
    state.agents = {
      a: { ...state.agents['a_ava'], id: 'a', fatigue: 1 },
      b: { ...state.agents['a_sato'], id: 'b', fatigue: 2 },
      c: { ...state.agents['a_mina'], id: 'c', fatigue: 2 },
    }
    const mixedTeam = {
      id: 'team-mixed',
      name: 'Mixed',
      agentIds: ['a', 'b', 'c'],
      tags: [],
    }
    const emptyTeam = {
      id: 'team-empty',
      name: 'Empty',
      agentIds: [],
      tags: [],
    }

    expect(getAverageTeamFatigue(mixedTeam, state.agents)).toBe(2)
    expect(getAverageTeamFatigue(emptyTeam, state.agents)).toBe(0)
  })
})
