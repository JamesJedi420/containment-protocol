import { afterEach, describe, expect, it, vi } from 'vitest'
import { createStartingState } from '../data/startingState'
import type { Agent, CaseInstance } from '../domain/models'
import { buildAgentSimulationProfile } from '../domain/agent/simulation'
import { createDefaultTeamEquipmentSummary } from '../domain/equipment'
import {
  createDefaultPowerImpactSummary,
  createDefaultTeamPowerSummary,
  type TeamCompositionProfile,
} from '../domain/teamSimulation'

const baseState = createStartingState()

function makeAgent(): Agent {
  return {
    ...baseState.agents['a_ava'],
    id: 'agent-overall-guard',
    tags: [],
    relationships: {},
    fatigue: 0,
  }
}

function makeCase(): CaseInstance {
  return {
    ...baseState.cases['case-001'],
    id: 'case-overall-guard',
    preferredTags: [],
    requiredTags: [],
    difficulty: { combat: 10, investigation: 0, utility: 0, social: 0 },
    weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
    assignedTeamIds: [],
  }
}

function makeProfile(overall: number): TeamCompositionProfile {
  const agent = makeAgent()
  const agentProfile = buildAgentSimulationProfile(agent)

  return {
    members: [agent],
    agentProfiles: [agentProfile],
    agentPerformance: [
      {
        agentId: 'agent-overall-guard',
        effectivenessScore: 40,
        fieldPower: 40,
        containment: 20,
        investigation: 30,
        support: 10,
        stressImpact: 0,
        contribution: 40,
        threatHandled: 28,
        damageTaken: 0,
        healingPerformed: 8,
        evidenceGathered: 12,
        containmentActionsCompleted: 14,
        contributionByDomain: {
          field: 10,
          resilience: 10,
          control: 10,
          insight: 10,
          presence: 10,
          anomaly: 10,
        },
      },
    ],
    performanceSummary: {
      contribution: 40,
      threatHandled: 28,
      damageTaken: 0,
      healingPerformed: 8,
      evidenceGathered: 12,
      containmentActionsCompleted: 14,
    },
    powerImpactSummary: createDefaultPowerImpactSummary(),
    equipmentSummary: createDefaultTeamEquipmentSummary(),
    powerSummary: createDefaultTeamPowerSummary(),
    leaderId: null,
    derivedStats: {
      overall,
      fieldPower: 40,
      containment: 20,
      investigation: 30,
      support: 10,
      cohesion: 55,
      chemistryScore: 50,
      readiness: 70,
    },
    resolutionProfile: {
      fieldPower: 40,
      containment: 20,
      investigation: 30,
      support: 10,
    },
    chemistryProfile: {
      relationships: [],
      raw: 0,
      bonus: 0,
      pairs: 0,
      average: 0,
    },
    synergyProfile: {
      active: [],
      resolutionBonus: {
        fieldPower: 0,
        containment: 0,
        investigation: 0,
        support: 0,
      },
      scoreBonus: 0,
      cohesionBonus: 0,
    },
    leaderResolutionProfile: null,
    leaderBonus: {
      effectivenessMultiplier: 1,
      eventModifier: 0,
      xpBonus: 0,
      stressModifier: 0,
    },
    chemistryBonus: 0,
    projectedCaseStats: {
      combat: 40,
      investigation: 30,
      utility: 20,
      social: 10,
    },
  }
}

async function loadScoringWithOverall(overall: number) {
  vi.resetModules()
  vi.doMock('../domain/teamSimulation', async () => {
    const actual = await vi.importActual<typeof import('../domain/teamSimulation')>(
      '../domain/teamSimulation'
    )

    return {
      ...actual,
      buildAgentSquadCompositionProfile: () => makeProfile(overall),
    }
  })

  return import('../domain/sim/scoring')
}

afterEach(() => {
  vi.resetModules()
  vi.doUnmock('../domain/teamSimulation')
})

describe('computeTeamScore overall summary guard', () => {
  it('does not use derived overall as a canonical resolution driver', async () => {
    const lowOverallScoring = await loadScoringWithOverall(12)
    const lowOverallResult = lowOverallScoring.computeTeamScore([makeAgent()], makeCase())

    const highOverallScoring = await loadScoringWithOverall(999)
    const highOverallResult = highOverallScoring.computeTeamScore([makeAgent()], makeCase())

    expect(highOverallResult.score).toBe(lowOverallResult.score)
    expect(highOverallResult.modifierBreakdown).toEqual(lowOverallResult.modifierBreakdown)
    expect(highOverallResult.resolutionProfile).toEqual(lowOverallResult.resolutionProfile)
  })
})
