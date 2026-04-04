import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { applyMissionResolutionAgentMutations } from '../domain/sim/missionResolutionAgents'
import type { Agent, AgentPerformanceOutput, ResolutionOutcome } from '../domain/models'

describe('mission-driven potential intel', () => {
  it('can confirm mission-side potential intel and trigger a breakthrough on major successes', () => {
    const state = createStartingState()
    const baseAgent = state.agents.a_ava
    const seededAgent: Agent = {
      ...baseAgent,
      level: 4,
      progression: {
        ...(baseAgent.progression ?? {
          xp: 0,
          level: 4,
          potentialTier: 'C' as const,
          growthProfile: 'steady',
        }),
        level: 4,
        potentialTier: 'C',
        growthProfile: 'steady',
        potentialIntel: {
          visibleTier: 'C',
          exactKnown: false,
          confidence: 'high',
          discoveryProgress: 90,
          source: 'training',
        },
      },
    }
    const effectiveCase = {
      ...state.cases['case-001'],
      status: 'in_progress' as const,
      stage: 3,
      weeksRemaining: 1,
    }
    const performance: AgentPerformanceOutput = {
      agentId: seededAgent.id,
      fieldPower: 82,
      containment: 18,
      investigation: 22,
      support: 12,
      stressImpact: 4,
      contribution: 82,
      threatHandled: 76,
      damageTaken: 0,
      healingPerformed: 0,
      evidenceGathered: 24,
      containmentActionsCompleted: 2,
      effectivenessScore: 88,
      contributionByDomain: {
        field: 50,
        resilience: 8,
        control: 10,
        insight: 16,
        presence: 6,
        anomaly: 10,
      },
    }
    const outcome: ResolutionOutcome = {
      caseId: effectiveCase.id,
      mode: effectiveCase.mode,
      kind: effectiveCase.kind,
      delta: 25,
      result: 'success',
      reasons: ['dominant-resolution'],
      agentPerformance: [performance],
    }

    const result = applyMissionResolutionAgentMutations({
      agents: { ...state.agents, [seededAgent.id]: seededAgent },
      assignedAgents: [seededAgent],
      assignedAgentLeaderBonuses: {},
      effectiveCase,
      outcome,
      week: state.week,
      rng: () => 0.5,
    })
    const progressed = result.nextAgents[seededAgent.id]

    expect(progressed.progression?.potentialTier).toBe('B')
    expect(progressed.progression?.potentialIntel).toMatchObject({
      visibleTier: 'B',
      exactKnown: true,
      confidence: 'confirmed',
      discoveryProgress: 100,
    })
    expect(progressed.history?.timeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          note: 'Mission performance confirmed C-tier potential.',
        }),
        expect.objectContaining({
          note: 'Exceptional progress triggered a breakthrough to B-tier potential.',
        }),
      ])
    )
  })
})
