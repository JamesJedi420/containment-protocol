import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  buildMajorIncidentOperationalCase,
  buildMajorIncidentProfile,
} from '../domain/majorIncidents'
import { evaluateCaseResolutionContext } from '../domain/sim/scoring'

describe('majorIncidents', () => {
  it('builds a deterministic staged cult-incident profile with boss escalation', () => {
    const state = createStartingState()
    const currentCase = {
      ...state.cases['case-003'],
      stage: 5,
      deadlineRemaining: 0,
    }

    const profile = buildMajorIncidentProfile(currentCase)

    expect(profile).not.toBeNull()
    expect(profile?.archetypeId).toBe('coordinated_cult_operation')
    expect(profile?.currentStageIndex).toBe(3)
    expect(profile?.currentStage.label).toBe('Ascension event')
    expect(profile?.bossEntity?.name).toBe('Hierophant Prime')
    expect(profile?.progression).toEqual([
      expect.objectContaining({ index: 1, status: 'cleared' }),
      expect.objectContaining({ index: 2, status: 'cleared' }),
      expect.objectContaining({ index: 3, status: 'active' }),
    ])
  })

  it('builds a higher-scale operational case with stricter raid requirements', () => {
    const state = createStartingState()
    const raidIncident = {
      ...state.cases['case-003'],
      kind: 'raid' as const,
      stage: 3,
      deadlineRemaining: 1,
      raid: { minTeams: 2, maxTeams: 4 },
      requiredTags: [],
      requiredRoles: [],
    }

    const operationalCase = buildMajorIncidentOperationalCase(raidIncident)

    expect(operationalCase.raid?.minTeams).toBe(3)
    expect(operationalCase.difficulty.combat).toBeGreaterThan(raidIncident.difficulty.combat)
    expect(operationalCase.difficulty.investigation).toBeGreaterThan(
      raidIncident.difficulty.investigation
    )
    expect(operationalCase.difficulty.utility).toBeGreaterThan(raidIncident.difficulty.utility)
  })

  it('makes later incident stages harder under the shared resolution path', () => {
    const baseAgent = createStartingState().agents.a_ava
    const agents = [
      {
        ...baseAgent,
        id: 'incident-agent-1',
        name: 'Incident Agent 1',
        tags: ['occultist', 'holy'],
        baseStats: { combat: 90, investigation: 90, utility: 85, social: 60 },
        fatigue: 0,
        status: 'active' as const,
      },
      {
        ...baseAgent,
        id: 'incident-agent-2',
        name: 'Incident Agent 2',
        tags: ['tech', 'analyst'],
        baseStats: { combat: 80, investigation: 85, utility: 95, social: 55 },
        fatigue: 0,
        status: 'active' as const,
      },
      {
        ...baseAgent,
        id: 'incident-agent-3',
        name: 'Incident Agent 3',
        tags: ['negotiator', 'field-kit'],
        baseStats: { combat: 75, investigation: 80, utility: 88, social: 70 },
        fatigue: 0,
        status: 'active' as const,
      },
    ]
    const state = createStartingState()
    const lowStageIncident = {
      ...state.cases['case-003'],
      id: 'incident-low',
      kind: 'raid' as const,
      stage: 1,
      raid: { minTeams: 2, maxTeams: 4 },
      requiredTags: [],
      requiredRoles: [],
      assignedTeamIds: ['team-1', 'team-2', 'team-3'],
    }
    const highStageIncident = {
      ...lowStageIncident,
      id: 'incident-high',
      stage: 3,
    }

    const lowStageEvaluation = evaluateCaseResolutionContext({
      caseData: lowStageIncident,
      agents,
      config: state.config,
      context: {
        preflight: {
          selectedTeamCount: 3,
          minTeamCount: 2,
        },
      },
    })
    const highStageEvaluation = evaluateCaseResolutionContext({
      caseData: highStageIncident,
      agents,
      config: state.config,
      context: {
        preflight: {
          selectedTeamCount: 3,
          minTeamCount: 2,
        },
      },
    })

    expect(lowStageEvaluation.requiredScore).not.toBeNull()
    expect(highStageEvaluation.requiredScore).not.toBeNull()
    expect(highStageEvaluation.requiredScore!).toBeGreaterThan(lowStageEvaluation.requiredScore!)
    expect(highStageEvaluation.delta).toBeLessThan(lowStageEvaluation.delta)
  })
})
