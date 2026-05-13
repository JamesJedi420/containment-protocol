import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import type { Agent } from '../domain/models'
import { applyWeeklyAgentFatigue } from '../domain/sim/fatiguePipeline'
import {
  applyResponderEnergyExertion,
  applyResponderEnergyRecovery,
  classifyResponderEnergyReserve,
  createDefaultResponderEnergyBudget,
  getResponderDutyCost,
  resolveResponderExertionCost,
} from '../domain/responderEnergyBudget'

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'agent-energy',
    name: 'Energy Agent',
    role: 'field_recon',
    baseStats: { combat: 5, investigation: 5, utility: 5, social: 5 },
    stats: {
      physical: { strength: 50, endurance: 50 },
      tactical: { awareness: 50, reaction: 50 },
      cognitive: { analysis: 50, investigation: 50 },
      social: { negotiation: 50, influence: 50 },
      stability: { resistance: 50, tolerance: 50 },
      technical: { equipment: 50, anomaly: 50 },
    },
    tags: [],
    relationships: {},
    fatigue: 0,
    status: 'active',
    ...overrides,
  }
}

describe('responder energy budget', () => {
  it('uses deterministic duty-cost classes', () => {
    expect(getResponderDutyCost('idle_upkeep')).toBeLessThan(getResponderDutyCost('patrol'))
    expect(getResponderDutyCost('patrol')).toBeLessThan(getResponderDutyCost('carry'))
    expect(getResponderDutyCost('carry')).toBeLessThan(getResponderDutyCost('sprint_response'))
    expect(getResponderDutyCost('sprint_response')).toBeLessThan(
      getResponderDutyCost('prolonged_field_operation')
    )
  })

  it('resolves the same duty as higher exertion for lower conditioning and injury', () => {
    const conditioned = makeAgent({
      stats: {
        ...makeAgent().stats!,
        physical: { strength: 80, endurance: 85 },
      },
    })
    const strained = makeAgent({
      status: 'injured',
      stats: {
        ...makeAgent().stats!,
        physical: { strength: 35, endurance: 30 },
      },
    })

    expect(resolveResponderExertionCost(conditioned, 'carry')).toBeLessThan(
      resolveResponderExertionCost(strained, 'carry')
    )
  })

  it('increases non-idle exertion cost when reserve is already taxed', () => {
    const stable = makeAgent({
      energyBudget: {
        currentReserve: 90,
        reserveBand: 'stable',
        exertionDebt: 0,
        estimateConfidence: 'medium',
      },
    })
    const taxed = makeAgent({
      energyBudget: {
        currentReserve: 45,
        reserveBand: 'taxed',
        exertionDebt: 0,
        estimateConfidence: 'medium',
      },
    })

    expect(resolveResponderExertionCost(taxed, 'patrol')).toBeGreaterThan(
      resolveResponderExertionCost(stable, 'patrol')
    )
  })

  it('derives reserve band from numeric state instead of trusting stale stored band', () => {
    const staleStable = makeAgent({
      energyBudget: {
        currentReserve: 20,
        reserveBand: 'stable',
        exertionDebt: 0,
        estimateConfidence: 'medium',
      },
    })
    const realStable = makeAgent({
      energyBudget: {
        currentReserve: 90,
        reserveBand: 'stable',
        exertionDebt: 0,
        estimateConfidence: 'medium',
      },
    })

    expect(resolveResponderExertionCost(staleStable, 'patrol')).toBeGreaterThan(
      resolveResponderExertionCost(realStable, 'patrol')
    )
    expect(applyResponderEnergyRecovery(staleStable.energyBudget!).currentReserve).toBeGreaterThan(
      staleStable.energyBudget!.currentReserve
    )
  })

  it('classifies compact reserve bands from reserve and debt', () => {
    expect(classifyResponderEnergyReserve({ currentReserve: 82, exertionDebt: 0 })).toBe('stable')
    expect(classifyResponderEnergyReserve({ currentReserve: 48, exertionDebt: 0 })).toBe('taxed')
    expect(classifyResponderEnergyReserve({ currentReserve: 18, exertionDebt: 0 })).toBe('depleted')
    expect(classifyResponderEnergyReserve({ currentReserve: 0, exertionDebt: 3 })).toBe('overdrawn')
  })

  it('charges baseline upkeep to idle agents during the weekly fatigue pass', () => {
    const state = createStartingState()
    const idleAgentId = Object.keys(state.agents).find(
      (agentId) => !state.teams['t_nightwatch'].agentIds.includes(agentId)
    )

    expect(idleAgentId).toBeDefined()
    state.agents[idleAgentId!] = {
      ...state.agents[idleAgentId!],
      energyBudget: createDefaultResponderEnergyBudget(),
    }

    const result = applyWeeklyAgentFatigue({
      agents: state.agents,
      teams: state.teams,
      config: state.config,
      activeTeamIds: ['t_nightwatch'],
    })

    expect(result[idleAgentId!].energyBudget!.currentReserve).toBeLessThan(
      state.agents[idleAgentId!].energyBudget!.currentReserve
    )
    expect(result[idleAgentId!].energyBudget!.lastDutyCost).toBe(
      getResponderDutyCost('idle_upkeep')
    )
  })

  it('restores taxed idle reserve after upkeep without erasing the upkeep record', () => {
    const state = createStartingState()
    const idleAgentId = Object.keys(state.agents).find(
      (agentId) => !state.teams['t_nightwatch'].agentIds.includes(agentId)
    )

    expect(idleAgentId).toBeDefined()
    state.agents[idleAgentId!] = {
      ...state.agents[idleAgentId!],
      energyBudget: {
        currentReserve: 50,
        reserveBand: 'taxed',
        exertionDebt: 0,
        estimateConfidence: 'medium',
      },
    }

    const result = applyWeeklyAgentFatigue({
      agents: state.agents,
      teams: state.teams,
      config: state.config,
      activeTeamIds: ['t_nightwatch'],
    })

    expect(result[idleAgentId!].energyBudget!.currentReserve).toBeGreaterThan(50)
    expect(result[idleAgentId!].energyBudget!.lastDutyCost).toBe(
      getResponderDutyCost('idle_upkeep')
    )
  })

  it('maps active and training agents to bounded weekly duty costs', () => {
    const state = createStartingState()
    const activeAgentId = state.teams['t_nightwatch'].agentIds[0]
    const trainingAgentId = state.teams['t_greentape'].agentIds[0]

    state.agents[activeAgentId] = {
      ...state.agents[activeAgentId],
      energyBudget: createDefaultResponderEnergyBudget(),
    }
    state.agents[trainingAgentId] = {
      ...state.agents[trainingAgentId],
      assignment: {
        state: 'training',
        startedWeek: state.week,
      },
      energyBudget: createDefaultResponderEnergyBudget(),
    }

    const result = applyWeeklyAgentFatigue({
      agents: state.agents,
      teams: state.teams,
      config: state.config,
      activeTeamIds: ['t_nightwatch'],
    })

    expect(result[activeAgentId].energyBudget!.lastDutyCost).toBe(
      resolveResponderExertionCost(state.agents[activeAgentId], 'prolonged_field_operation')
    )
    expect(result[trainingAgentId].energyBudget!.lastDutyCost).toBe(
      resolveResponderExertionCost(state.agents[trainingAgentId], 'patrol')
    )
  })

  it('converts overdrawn exertion into downstream physical fatigue debt', () => {
    const agent = makeAgent({
      energyBudget: {
        currentReserve: 4,
        reserveBand: 'depleted',
        exertionDebt: 0,
        estimateConfidence: 'medium',
      },
    })

    const result = applyResponderEnergyExertion(agent, 'prolonged_field_operation')

    expect(result.energyBudget.reserveBand).toBe('overdrawn')
    expect(result.energyBudget.exertionDebt).toBeGreaterThan(0)
    expect(result.fatigueChannels.physicalExhaustion).toBeGreaterThan(0)
  })
})
