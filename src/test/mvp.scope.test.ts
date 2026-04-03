import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { getTrainingProgram } from '../data/training'
import { buildAgentSimulationProfile } from '../domain/agent/simulation'
import { evaluateAgentBreakdown } from '../domain/evaluateAgent'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { assignTeam } from '../domain/sim/assign'
import { queueTraining } from '../domain/sim/training'
import { getTeamMembers } from '../domain/teamSimulation'
import { computeTeamScore } from '../domain/sim/scoring'

const combatDrills = getTrainingProgram('combat-drills')

if (!combatDrills) {
  throw new Error('Missing combat-drills program for MVP scope test.')
}

function makeOccultCase() {
  const state = createStartingState()
  return {
    ...state.cases['case-003'],
    requiredTags: ['occult'],
    preferredTags: ['containment', 'anomaly'],
    tags: ['occult', 'containment', 'anomaly'],
  }
}

describe('minimal MVP scope', () => {
  it('materializes a persistent agent entity with progression, history, equipment, and assignment state', () => {
    const state = createStartingState()
    const profile = buildAgentSimulationProfile(state.agents['a_ava'])

    expect(profile.agent.identity?.name).toBe(profile.agent.name)
    expect(profile.agent.vitals).toBeDefined()
    expect(profile.agent.progression).toBeDefined()
    expect(profile.agent.history).toBeDefined()
    expect(profile.agent.assignment).toBeDefined()
    expect(profile.agent.equipmentSlots).toBeDefined()
    expect(profile.readiness.band).toMatch(/steady|strained|critical|unavailable/)
    expect(profile.history.deployments).toBeGreaterThanOrEqual(0)
  })

  it('uses domain-based stats with passive abilities and additive equipment in the canonical evaluator', () => {
    const state = createStartingState()
    const caseData = makeOccultCase()
    const baseAgent = state.agents['a_ava']
    const upgradedAgent = {
      ...baseAgent,
      abilities: [
        {
          id: 'ward-hum',
          label: 'Ward Hum',
          type: 'passive' as const,
          effect: {
            control: 2,
            anomaly: 2,
          },
        },
      ],
      equipment: {
        ...(baseAgent.equipment ?? {}),
        ward_seals: 1,
        warding_kits: 1,
      },
      equipmentSlots: {
        ...(baseAgent.equipmentSlots ?? {}),
        secondary: 'ward_seals',
        utility1: 'warding_kits',
      },
    }

    const baseline = evaluateAgentBreakdown(baseAgent, {
      caseData,
      supportTags: [...caseData.requiredTags, ...caseData.preferredTags],
      fatigueOverride: 0,
    })
    const upgraded = evaluateAgentBreakdown(upgradedAgent, {
      caseData,
      supportTags: [...caseData.requiredTags, ...caseData.preferredTags],
      fatigueOverride: 0,
    })

    expect(upgraded.score).toBeGreaterThan(baseline.score)
    expect(upgraded.performance.containment).toBeGreaterThan(baseline.performance.containment)
    expect(upgraded.powerImpact.activeEquipmentIds).toEqual(
      expect.arrayContaining(['ward_seals', 'warding_kits'])
    )
    expect(upgraded.powerImpact.equipmentContributionDelta).toBeGreaterThan(0)
  })

  it('uses training as a weekly progression driver and records completion in reports', () => {
    const state = createStartingState()
    const caseData = {
      ...state.cases['case-001'],
      weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
      difficulty: { combat: 20, investigation: 0, utility: 0, social: 0 },
    }
    const beforeTraining = evaluateAgentBreakdown(state.agents['a_ava'], {
      caseData,
      fatigueOverride: 0,
    })
    const queued = queueTraining(state, 'a_ava', combatDrills.trainingId)
    const readyToComplete = {
      ...queued,
      trainingQueue: queued.trainingQueue.map((entry) =>
        entry.agentId === 'a_ava' ? { ...entry, remainingWeeks: 1 } : entry
      ),
    }

    expect(queued.agents['a_ava'].assignment?.state).toBe('training')

    const next = advanceWeek(readyToComplete)
    const trainedAgent = next.agents['a_ava']
    const afterTraining = evaluateAgentBreakdown(trainedAgent, {
      caseData,
      fatigueOverride: 0,
    })

    expect(trainedAgent.assignment?.state).toBe('idle')
    expect(trainedAgent.history?.trainingsDone).toBe(1)
    expect(trainedAgent.history?.counters.trainingsCompleted).toBe(1)
    expect(trainedAgent.progression?.xp).toBeGreaterThan(state.agents['a_ava'].progression?.xp ?? 0)
    expect(afterTraining.score).toBeGreaterThan(beforeTraining.score)
    expect(
      next.reports[0]?.notes.some((note) => note.type === 'agent.training_completed')
    ).toBe(true)
  })

  it('runs the assignment to resolution loop through advanceWeek for simulated cases', () => {
    const base = createStartingState()
    const prepared = {
      ...base,
      cases: {
        ...base.cases,
        'case-001': {
          ...base.cases['case-001'],
          mode: 'threshold' as const,
          weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
          difficulty: { combat: 0, investigation: 0, utility: 0, social: 0 },
          weeksRemaining: 1,
        },
      },
    }
    const assigned = assignTeam(prepared, 'case-001', 't_nightwatch')
    const membersBefore = getTeamMembers(assigned.teams['t_nightwatch'], assigned.agents)
    const scoreBefore = computeTeamScore(membersBefore, assigned.cases['case-001'])
    const next = advanceWeek(assigned)

    expect(scoreBefore.score).toBeGreaterThanOrEqual(0)
    expect(next.reports[0]?.resolvedCases).toContain('case-001')
    expect(next.cases['case-001'].status).toBe('resolved')

    for (const agentId of assigned.teams['t_nightwatch'].agentIds) {
      const agent = next.agents[agentId]
      expect(agent?.assignment?.state).toBe('idle')
      expect(agent?.history?.counters.assignmentsCompleted).toBe(1)
      expect(agent?.history?.counters.casesResolved).toBe(1)
      expect(agent?.progression?.xp).toBeGreaterThan(
        assigned.agents[agentId]?.progression?.xp ?? 0
      )
    }
  })
})
