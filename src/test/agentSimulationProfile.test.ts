import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { buildAgentSimulationProfile } from '../domain/agent/simulation'
import { buildAgentSquadCompositionProfile } from '../domain/teamSimulation'

describe('agent simulation profile', () => {
  it('builds one canonical backend profile with split assignment and resolution eligibility', () => {
    const state = createStartingState()
    const caseData = state.cases['case-001']
    const readyProfile = buildAgentSimulationProfile(state.agents['a_ava'], { caseData })

    expect(readyProfile.agent.id).toBe('a_ava')
    expect(readyProfile.availability.assignment.eligible).toBe(true)
    expect(readyProfile.availability.resolution.eligible).toBe(true)
    expect(readyProfile.performance.agentId).toBe('a_ava')
    expect(readyProfile.history.casesCompleted).toBe(0)
    expect(readyProfile.history.totalContribution).toBe(0)
    expect(readyProfile.domainProfile.field).toBeGreaterThan(0)
    expect(readyProfile.score).toBeGreaterThan(0)
    expect(readyProfile.scoreBreakdown.finalScore).toBe(readyProfile.score)
    expect(readyProfile.scoreBreakdown.preEffectivenessScore).toBeCloseTo(
      readyProfile.scoreBreakdown.baseDomainScore + readyProfile.scoreBreakdown.traitBonus,
      2
    )
    expect(readyProfile.performanceBlend.blendedTotal).toBeCloseTo(
      readyProfile.performance.fieldPower +
        readyProfile.performance.containment +
        readyProfile.performance.investigation +
        readyProfile.performance.support,
      2
    )
    expect(
      readyProfile.performanceBlend.legacyBlendWeight +
        readyProfile.performanceBlend.weightedBlendWeight
    ).toBeCloseTo(1, 4)

    const assignedProfile = buildAgentSimulationProfile(
      {
        ...state.agents['a_ava'],
        assignment: {
          state: 'assigned',
          caseId: 'case-001',
          teamId: 't_nightwatch',
          startedWeek: state.week,
        },
      },
      { caseData }
    )

    expect(assignedProfile.availability.assignment.eligible).toBe(false)
    expect(assignedProfile.availability.assignment.blockedReasons).toContain('assigned')
    expect(assignedProfile.availability.resolution.eligible).toBe(true)
    expect(assignedProfile.availability.currentAssignmentState).toBe('assigned')
  })

  it('feeds team composition from canonical agent simulation profiles instead of a parallel path', () => {
    const state = createStartingState()
    const caseData = state.cases['case-001']
    const profile = buildAgentSquadCompositionProfile(
      [state.agents['a_ava'], state.agents['a_kellan']],
      'a_ava',
      [],
      { caseData }
    )

    expect(profile.agentProfiles).toHaveLength(2)

    for (const agentProfile of profile.agentProfiles) {
      const matchingPerformance = profile.agentPerformance.find(
        (entry) => entry.agentId === agentProfile.agentId
      )

      expect(matchingPerformance).toBeDefined()
      expect(matchingPerformance?.effectivenessScore).toBe(agentProfile.score)
      expect(matchingPerformance?.fieldPower).toBe(agentProfile.performance.fieldPower)
      expect(matchingPerformance?.containment).toBe(agentProfile.performance.containment)
      expect(matchingPerformance?.investigation).toBe(agentProfile.performance.investigation)
      expect(matchingPerformance?.support).toBe(agentProfile.performance.support)
    }
  })
})
