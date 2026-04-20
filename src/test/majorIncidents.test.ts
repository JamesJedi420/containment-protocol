import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  buildMajorIncidentOperationalCase,
  buildMajorIncidentProfile,
} from '../domain/majorIncidents'
import {
  buildDerivedMajorIncidentRuntime,
  buildPlannedMajorIncidentRuntime,
  evaluateMajorIncidentPlan,
  getAppliedMajorIncidentRewardPreview,
  getBestMajorIncidentPlanSuggestion,
  isOperationalMajorIncidentCase,
} from '../domain/majorIncidentOperations'
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

  it('makes the weakest selected team dominate major incident success', () => {
    const state = createOperationalIncidentState()

    const strongerPlan = evaluateMajorIncidentPlan(
      state,
      state.cases['incident-major'],
      ['team-alpha', 'team-bravo', 'team-delta']
    )
    const weakerPlan = evaluateMajorIncidentPlan(
      state,
      state.cases['incident-major'],
      ['team-alpha', 'team-bravo', 'team-charlie']
    )

    expect(strongerPlan?.valid).toBe(true)
    expect(weakerPlan?.valid).toBe(true)
    expect(weakerPlan?.weakestTeam?.team.id).toBe('team-charlie')
    expect(weakerPlan?.successChance ?? 0).toBeLessThan(strongerPlan?.successChance ?? 0)
    expect(weakerPlan?.weakestTeamWarning).toMatch(/bottlenecking/i)
  })

  it('requires the full team count before a major incident plan becomes valid', () => {
    const state = createOperationalIncidentState()

    const partialPlan = evaluateMajorIncidentPlan(
      state,
      state.cases['incident-major'],
      ['team-alpha', 'team-bravo']
    )

    expect(isOperationalMajorIncidentCase(state.cases['incident-major'])).toBe(true)
    expect(partialPlan?.valid).toBe(false)
    expect(partialPlan?.missingTeamCount).toBe(1)
  })

  it('applies strategy and provisioning changes deterministically to preview outputs', () => {
    const state = createOperationalIncidentState()

    const aggressivePlan = evaluateMajorIncidentPlan(
      state,
      state.cases['incident-major'],
      ['team-alpha', 'team-bravo', 'team-delta'],
      {
        strategy: 'aggressive',
        provisions: ['optimization_kits', 'extraction_tools'],
      }
    )
    const cautiousPlan = evaluateMajorIncidentPlan(
      state,
      state.cases['incident-major'],
      ['team-alpha', 'team-bravo', 'team-delta'],
      {
        strategy: 'cautious',
        provisions: ['medical_supplies'],
      }
    )

    expect(aggressivePlan?.runtime.durationWeeks).toBeLessThan(cautiousPlan?.runtime.durationWeeks ?? 99)
    expect(aggressivePlan?.rewardPreview.materials[0]?.quantity ?? 0).toBeGreaterThan(
      cautiousPlan?.rewardPreview.materials[0]?.quantity ?? 0
    )
    expect(aggressivePlan?.rewardPreview.gear.length ?? 0).toBeGreaterThan(0)
    expect(aggressivePlan?.rewardPreview.progressionUnlocks).toContain('counter-cult-dossier')
    expect(cautiousPlan?.injuryRisk).toBeLessThan(aggressivePlan?.injuryRisk ?? 1)
  })

  it('applies rumor salvage deterministically to successful major incident rewards', () => {
    const state = createOperationalIncidentState()
    const runtime = buildPlannedMajorIncidentRuntime(state.cases['incident-major'], state)

    expect(runtime?.rumor).toBeDefined()

    const firstReward = getAppliedMajorIncidentRewardPreview(runtime!, 'success')
    const secondReward = getAppliedMajorIncidentRewardPreview(runtime!, 'success')

    expect(firstReward.rumorLoot).toEqual(secondReward.rumorLoot)
    expect(firstReward.rumorLoot.length).toBeGreaterThan(0)
  })

  it('reduces derived incident lock time by one week in the second escalation band', () => {
    const earlyBand = createStartingState()
    const secondBand = createStartingState()
    const incidentCase = {
      ...earlyBand.cases['case-003'],
      id: 'incident-second-band',
      kind: 'raid' as const,
      stage: 3,
      assignedTeamIds: [],
      deadlineRemaining: 1,
      requiredTags: [],
      requiredRoles: [],
      raid: { minTeams: 2, maxTeams: 4 },
    }

    earlyBand.week = 12
    earlyBand.cases[incidentCase.id] = incidentCase
    secondBand.week = 13
    secondBand.cases[incidentCase.id] = { ...incidentCase }

    const earlyRuntime = buildDerivedMajorIncidentRuntime(earlyBand.cases[incidentCase.id], earlyBand)
    const secondRuntime = buildDerivedMajorIncidentRuntime(
      secondBand.cases[incidentCase.id],
      secondBand
    )

    expect(earlyRuntime).not.toBeNull()
    expect(secondRuntime).not.toBeNull()
    expect(secondRuntime?.durationWeeks).toBe((earlyRuntime?.durationWeeks ?? 0) - 1)
  })

  it('selects the strongest valid team set for the recommended incident plan', () => {
    const state = createOperationalIncidentState()

    const suggestion = getBestMajorIncidentPlanSuggestion(state, state.cases['incident-major'])

    expect(suggestion?.valid).toBe(true)
    expect(suggestion?.selectedTeams.map((team) => team.team.id)).toEqual([
      'team-alpha',
      'team-bravo',
      'team-delta',
    ])
  })

  it('uses combined cross-team synergy when ranking otherwise similar incident plans', () => {
    const state = createOperationalIncidentState()
    const baseAgent = createStartingState().agents.a_ava

    state.agents = {
      hunter_a: {
        ...baseAgent,
        id: 'hunter_a',
        name: 'Hunter A',
        role: 'investigator',
        tags: ['hunter'],
        baseStats: { combat: 64, investigation: 36, utility: 30, social: 24 },
        fatigue: 0,
        status: 'active',
      },
      occult_b: {
        ...baseAgent,
        id: 'occult_b',
        name: 'Occult B',
        role: 'investigator',
        tags: ['occultist'],
        baseStats: { combat: 64, investigation: 36, utility: 30, social: 24 },
        fatigue: 0,
        status: 'active',
      },
      tech_c: {
        ...baseAgent,
        id: 'tech_c',
        name: 'Tech C',
        role: 'investigator',
        tags: ['tech'],
        baseStats: { combat: 64, investigation: 36, utility: 30, social: 24 },
        fatigue: 0,
        status: 'active',
      },
      negotiator_d: {
        ...baseAgent,
        id: 'negotiator_d',
        name: 'Negotiator D',
        role: 'investigator',
        tags: ['negotiator'],
        baseStats: { combat: 64, investigation: 36, utility: 30, social: 24 },
        fatigue: 0,
        status: 'active',
      },
    }
    state.teams = {
      team_alpha: {
        id: 'team_alpha',
        name: 'Alpha',
        agentIds: ['hunter_a'],
        memberIds: ['hunter_a'],
        leaderId: 'hunter_a',
        tags: [],
      },
      team_bravo: {
        id: 'team_bravo',
        name: 'Bravo',
        agentIds: ['occult_b'],
        memberIds: ['occult_b'],
        leaderId: 'occult_b',
        tags: [],
      },
      team_charlie: {
        id: 'team_charlie',
        name: 'Charlie',
        agentIds: ['tech_c'],
        memberIds: ['tech_c'],
        leaderId: 'tech_c',
        tags: [],
      },
      team_delta: {
        id: 'team_delta',
        name: 'Delta',
        agentIds: ['negotiator_d'],
        memberIds: ['negotiator_d'],
        leaderId: 'negotiator_d',
        tags: [],
      },
    }
    state.cases['incident-major'] = {
      ...state.cases['case-003'],
      id: 'incident-major',
      title: 'Synergy Pressure Test',
      kind: 'raid',
      stage: 3,
      assignedTeamIds: [],
      durationWeeks: 3,
      deadlineRemaining: 2,
      difficulty: { combat: 48, investigation: 48, utility: 48, social: 48 },
      weights: { combat: 0.25, investigation: 0.25, utility: 0.25, social: 0.25 },
      tags: ['neutral'],
      requiredTags: [],
      requiredRoles: [],
      preferredTags: [],
      raid: { minTeams: 3, maxTeams: 3 },
      majorIncident: {
        incidentId: 'incident-major',
        name: 'Synergy Pressure Test',
        description: 'A neutral testbed incident used to compare team composition quality.',
        requiredTeams: 3,
        difficulty: 60,
        riskLevel: 'high',
        durationWeeks: 3,
        rewards: {
          materials: [{ itemId: 'electronic_parts', label: 'Electronic Parts', quantity: 2 }],
        },
        modifiers: [],
        strategy: 'balanced',
        provisions: [],
      },
    }

    const triadPlan = evaluateMajorIncidentPlan(state, state.cases['incident-major'], [
      'team_alpha',
      'team_bravo',
      'team_charlie',
    ])
    const nonTriadPlan = evaluateMajorIncidentPlan(state, state.cases['incident-major'], [
      'team_alpha',
      'team_bravo',
      'team_delta',
    ])
    expect(triadPlan?.valid).toBe(true)
    expect(nonTriadPlan?.valid).toBe(true)
    expect(triadPlan?.weakestTeam?.incidentOvr).toBe(nonTriadPlan?.weakestTeam?.incidentOvr)
    expect(triadPlan?.successChance ?? 0).toBeGreaterThan(nonTriadPlan?.successChance ?? 0)
  })
})

function createOperationalIncidentState() {
  const state = createStartingState()
  const baseAgent = state.agents.a_ava

  state.agents = {}
  state.teams = {}

  state.agents['agent-alpha'] = {
    ...baseAgent,
    id: 'agent-alpha',
    name: 'Alpha',
    role: 'hunter',
    baseStats: { combat: 92, investigation: 82, utility: 78, social: 52 },
    fatigue: 5,
    status: 'active',
  }
  state.agents['agent-bravo'] = {
    ...baseAgent,
    id: 'agent-bravo',
    name: 'Bravo',
    role: 'tech',
    baseStats: { combat: 72, investigation: 86, utility: 94, social: 48 },
    fatigue: 8,
    status: 'active',
  }
  state.agents['agent-charlie'] = {
    ...baseAgent,
    id: 'agent-charlie',
    name: 'Charlie',
    role: 'negotiator',
    baseStats: { combat: 12, investigation: 18, utility: 16, social: 32 },
    fatigue: 12,
    status: 'active',
  }
  state.agents['agent-delta'] = {
    ...baseAgent,
    id: 'agent-delta',
    name: 'Delta',
    role: 'field_recon',
    baseStats: { combat: 74, investigation: 88, utility: 90, social: 56 },
    fatigue: 7,
    status: 'active',
  }

  state.teams['team-alpha'] = {
    id: 'team-alpha',
    name: 'Alpha Team',
    agentIds: ['agent-alpha'],
    memberIds: ['agent-alpha'],
    leaderId: 'agent-alpha',
    tags: ['field', 'strike'],
  }
  state.teams['team-bravo'] = {
    id: 'team-bravo',
    name: 'Bravo Team',
    agentIds: ['agent-bravo'],
    memberIds: ['agent-bravo'],
    leaderId: 'agent-bravo',
    tags: ['tech', 'support'],
  }
  state.teams['team-charlie'] = {
    id: 'team-charlie',
    name: 'Charlie Team',
    agentIds: ['agent-charlie'],
    memberIds: ['agent-charlie'],
    leaderId: 'agent-charlie',
    tags: ['social'],
  }
  state.teams['team-delta'] = {
    id: 'team-delta',
    name: 'Delta Team',
    agentIds: ['agent-delta'],
    memberIds: ['agent-delta'],
    leaderId: 'agent-delta',
    tags: ['recon', 'analysis'],
  }

  state.inventory['medical_supplies'] = 5
  state.inventory['emf_sensors'] = 2
  state.inventory['signal_jammers'] = 2
  state.inventory['silver_rounds'] = 2

  state.cases['incident-major'] = {
    ...state.cases['case-003'],
    id: 'incident-major',
    title: 'Regional Fracture Event',
    kind: 'raid',
    stage: 3,
    deadlineRemaining: 1,
    durationWeeks: 4,
    requiredTags: [],
    requiredRoles: [],
    preferredTags: ['field', 'tech', 'analysis'],
    raid: { minTeams: 2, maxTeams: 4 },
    assignedTeamIds: [],
  }

  return state
}
