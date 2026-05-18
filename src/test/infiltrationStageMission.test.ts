import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { resolveAssignedCaseForWeek } from '../domain/caseResolutionOrchestration'
import { evaluateInfiltrationStageMissionPressure } from '../domain/infiltrationProbe'
import type { Agent, CaseInstance, Team } from '../domain/models'
import { createStarterCase } from '../domain/templates/startingCases'

function createBehaviorObserver(id: string) {
  return {
    id,
    name: id,
    role: 'medium',
    baseStats: {
      combat: 10,
      investigation: 50,
      utility: 40,
      social: 30,
    },
    tags: ['medium', 'liaison'],
    relationships: {},
    fatigue: 0,
    status: 'active',
  } satisfies Agent
}

function createObserverTeam(id: string, agentId: string) {
  return {
    id,
    name: id,
    agentIds: [agentId],
    tags: [],
  } satisfies Team
}

function createInfiltrationBriefingCase(overrides: Partial<CaseInstance> = {}): CaseInstance {
  return {
    ...createStarterCase({
      id: 'case-infiltration-stage',
      templateId: 'ops-004',
    }),
    mode: 'threshold',
    hiddenState: 'hidden',
    detectionConfidence: 0.2,
    counterDetection: false,
    tags: ['infiltration', 'media', 'public'],
    requiredTags: ['medium'],
    preferredTags: [],
    assignedTeamIds: [],
    infiltrationCoverProfile: {
      claimedRole: 'official_inspector',
      documentTier: 2,
      doctrineBand: 0.4,
    },
    ...overrides,
  }
}

describe('infiltration stage mission-resolution fallout', () => {
  it('orders stage malus probing < exposed < violent', () => {
    const base = createInfiltrationBriefingCase()

    expect(evaluateInfiltrationStageMissionPressure({ ...base, infiltrationStage: 'probing' }).active).toBe(
      false
    )

    const exposed = evaluateInfiltrationStageMissionPressure({
      ...base,
      infiltrationStage: 'exposed',
    })
    const violent = evaluateInfiltrationStageMissionPressure({
      ...base,
      infiltrationStage: 'violent',
    })

    expect(exposed.active).toBe(true)
    expect(violent.active).toBe(true)
    expect(exposed.scoreAdjustment).toBeGreaterThan(0)
    expect(violent.scoreAdjustment).toBeGreaterThan(exposed.scoreAdjustment)
  })

  it('applies violent-stage malus through live case resolution orchestration', () => {
    const state = createStartingState()
    const observer = createBehaviorObserver('a_stage_orchestration')
    const team = createObserverTeam('t_stage_orchestration', observer.id)
    state.agents[observer.id] = observer
    state.teams[team.id] = team

    const probingCase = createInfiltrationBriefingCase({
      infiltrationStage: 'probing',
      infiltrationAwareness: 0.3,
      assignedTeamIds: [team.id],
    })
    const violentCase = createInfiltrationBriefingCase({
      infiltrationStage: 'violent',
      infiltrationAwareness: 0.85,
      counterDetection: true,
      detectionConfidence: 0.75,
      assignedTeamIds: [team.id],
    })

    const probingResolution = resolveAssignedCaseForWeek(probingCase, state, () => 0.5)
    const violentResolution = resolveAssignedCaseForWeek(violentCase, state, () => 0.5)

    expect(probingResolution.infiltrationStageMission?.active).toBe(false)
    expect(violentResolution.infiltrationStageMission?.active).toBe(true)
    expect(violentResolution.infiltrationStageMission?.scoreAdjustment).toBeGreaterThan(0)
    expect(
      violentResolution.outcome.reasons.some((reason) => reason.includes('Infiltration stage:'))
    ).toBe(true)
    expect(
      (probingResolution.infiltrationStageMission?.scoreAdjustment ?? 0) <
        (violentResolution.infiltrationStageMission?.scoreAdjustment ?? 0)
    ).toBe(true)
  })
})
