import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { clamp, sigmoid } from '../domain/math'
import {
  computeRequiredScore,
  computeTeamScore,
  evaluateCaseResolutionContext,
} from '../domain/sim/scoring'
import { buildAgencyProtocolState } from '../domain/protocols'
import {
  buildResolutionPreviewState,
  estimateOutcomeOdds as estimateOutcomeOddsFromPreview,
  previewResolutionForTeamIds as previewResolutionForTeamIdsFromPreview,
  resolveCase,
} from '../domain/sim/resolve'
import { resolveRaid } from '../domain/sim/raid'
import { playPartyCard } from '../domain/partyCards/engine'
import type { Agent, CaseInstance, DomainStats, GameState, Id } from '../domain/models'

function makeDomainStats(overrides: Partial<DomainStats> = {}): DomainStats {
  return {
    physical: { strength: 20, endurance: 20, ...(overrides.physical ?? {}) },
    tactical: { awareness: 40, reaction: 40, ...(overrides.tactical ?? {}) },
    cognitive: { analysis: 60, investigation: 60, ...(overrides.cognitive ?? {}) },
    social: { negotiation: 60, influence: 60, ...(overrides.social ?? {}) },
    stability: { resistance: 50, tolerance: 50, ...(overrides.stability ?? {}) },
    technical: { equipment: 60, anomaly: 60, ...(overrides.technical ?? {}) },
  }
}

function makeAgentFixture(role: Agent['role'], overrides: Partial<Agent> = {}): Agent {
  return {
    ...createStartingState().agents.a_ava,
    id: `agent-${role}`,
    name: `Agent ${role}`,
    role,
    baseStats: { combat: 40, investigation: 40, utility: 40, social: 40 },
    stats: makeDomainStats(),
    tags: [],
    relationships: {},
    fatigue: 0,
    status: 'active',
    traits: [],
    ...overrides,
  }
}

function getDeterministicPreviewResult(odds: { success: number; partial: number; fail: number }) {
  if (odds.success === 1) {
    return 'success'
  }

  if (odds.partial === 1) {
    return 'partial'
  }

  return 'fail'
}

function previewResolutionForTeamIds(c: CaseInstance, state: GameState, teamIds: Id[]) {
  return previewResolutionForTeamIdsFromPreview(c, buildResolutionPreviewState(state), teamIds)
}

function estimateOutcomeOdds(c: CaseInstance, state: GameState, teamIds: Id[]) {
  return estimateOutcomeOddsFromPreview(c, buildResolutionPreviewState(state), teamIds)
}

describe('resolveCase', () => {
  it('returns success in threshold mode when the score clears the requirement', () => {
    const state = createStartingState()

    state.agents = {
      'agent-test': {
        id: 'agent-test',
        name: 'Agent Test',
        role: 'hunter',
        baseStats: { combat: 120, investigation: 0, utility: 0, social: 0 },
        tags: [],
        relationships: {},
        fatigue: 0,
        status: 'active',
      },
    }

    state.teams = {
      'team-test': {
        id: 'team-test',
        name: 'Test Team',
        agentIds: ['agent-test'],
        tags: [],
      },
    }

    state.cases = {
      'case-threshold': {
        ...state.cases['case-001'],
        id: 'case-threshold',
        mode: 'threshold',
        difficulty: { combat: 20, investigation: 0, utility: 0, social: 0 },
        weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
        preferredTags: [],
        assignedTeamIds: ['team-test'],
      },
    }

    const outcome = resolveCase(
      state.cases['case-threshold'],
      [state.agents['agent-test']],
      state.config,
      () => 0.1
    )

    expect(outcome.result).toBe('success')
    expect(outcome.reasons.some((reason) => reason.includes('threshold'))).toBe(true)
  })

  it('returns fail in threshold mode when the deficit exceeds the partial window', () => {
    const state = createStartingState()

    state.agents = {
      'agent-test': {
        id: 'agent-test',
        name: 'Agent Test',
        role: 'hunter',
        baseStats: { combat: 1, investigation: 0, utility: 0, social: 0 },
        tags: [],
        relationships: {},
        fatigue: 0,
        status: 'active',
      },
    }

    state.teams = {
      'team-test': {
        id: 'team-test',
        name: 'Test Team',
        agentIds: ['agent-test'],
        tags: [],
      },
    }

    state.cases = {
      'case-threshold': {
        ...state.cases['case-001'],
        id: 'case-threshold',
        mode: 'threshold',
        difficulty: { combat: 120, investigation: 0, utility: 0, social: 0 },
        weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
        preferredTags: [],
        assignedTeamIds: ['team-test'],
      },
    }

    const outcome = resolveCase(
      state.cases['case-threshold'],
      [state.agents['agent-test']],
      state.config,
      () => 0.1
    )

    expect(outcome.result).toBe('fail')
    expect(outcome.reasons.at(-1)).not.toContain('Partial containment')
  })

  it('returns partial in threshold mode when the deficit stays within the partial window', () => {
    const state = createStartingState()

    state.agents = {
      'agent-test': {
        id: 'agent-test',
        name: 'Agent Test',
        role: 'hunter',
        baseStats: { combat: 100, investigation: 0, utility: 0, social: 0 },
        tags: [],
        relationships: {},
        fatigue: 0,
        status: 'active',
      },
    }

    state.teams = {
      'team-test': {
        id: 'team-test',
        name: 'Test Team',
        agentIds: ['agent-test'],
        tags: [],
      },
    }

    state.cases = {
      'case-threshold': {
        ...state.cases['case-001'],
        id: 'case-threshold',
        mode: 'threshold',
        difficulty: { combat: 0, investigation: 0, utility: 0, social: 0 },
        weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
        preferredTags: [],
        assignedTeamIds: ['team-test'],
      },
    }

    const calibratedScore = computeTeamScore(
      [state.agents['agent-test']],
      state.cases['case-threshold']
    )
    state.cases['case-threshold'] = {
      ...state.cases['case-threshold'],
      difficulty: {
        combat: Math.ceil(calibratedScore.score + state.config.partialMargin / 2),
        investigation: 0,
        utility: 0,
        social: 0,
      },
    }

    const outcome = resolveCase(
      state.cases['case-threshold'],
      [state.agents['agent-test']],
      state.config,
      () => 0.1
    )

    expect(outcome.result).toBe('partial')
    expect(outcome.reasons.some((reason) => reason.includes('Partial containment'))).toBe(true)
  })

  it('passive support ability moves threshold boundary from fail to partial', () => {
    const state = createStartingState()
    const supportCase = {
      ...state.cases['case-001'],
      id: 'case-support-threshold-fail-partial',
      mode: 'threshold' as const,
      tags: ['medical', 'support'],
      preferredTags: [],
      requiredTags: [],
      requiredRoles: [],
      difficulty: { combat: 0, investigation: 0, utility: 0, social: 0 },
      weights: { combat: 0, investigation: 0, utility: 0, social: 1 },
    }
    const medicNoAbility = makeAgentFixture('medic', {
      id: 'medic-no-passive',
      baseStats: { combat: 20, investigation: 20, utility: 20, social: 40 },
      abilities: [],
    })
    const medicWithAbility = makeAgentFixture('medic', {
      id: 'medic-with-passive',
      baseStats: { combat: 20, investigation: 20, utility: 20, social: 40 },
      abilities: [
        {
          id: 'field-triage',
          label: 'Field Triage',
          type: 'passive',
          effect: { presence: 7 },
        },
      ],
    })

    const baseScore = computeTeamScore([medicNoAbility], supportCase)
    const buffedScore = computeTeamScore([medicWithAbility], supportCase)
    const calibratedCase = {
      ...supportCase,
      difficulty: {
        combat: 0,
        investigation: 0,
        utility: 0,
        social: Math.ceil((baseScore.score + buffedScore.score) / 2 + state.config.partialMargin),
      },
    }

    const noAbilityOutcome = resolveCase(calibratedCase, [medicNoAbility], state.config, () => 0.1)
    const withAbilityOutcome = resolveCase(
      calibratedCase,
      [medicWithAbility],
      state.config,
      () => 0.1
    )

    expect(noAbilityOutcome.result).toBe('fail')
    expect(withAbilityOutcome.result).toBe('partial')
    expect(withAbilityOutcome.delta).toBeGreaterThan(noAbilityOutcome.delta)
  })

  it('passive support ability moves threshold boundary from partial to success', () => {
    const state = createStartingState()
    const supportCase = {
      ...state.cases['case-001'],
      id: 'case-support-threshold-partial-success',
      mode: 'threshold' as const,
      tags: ['negotiation', 'support'],
      preferredTags: [],
      requiredTags: [],
      requiredRoles: [],
      difficulty: { combat: 0, investigation: 0, utility: 0, social: 0 },
      weights: { combat: 0, investigation: 0, utility: 0, social: 1 },
    }
    const negotiatorNoAbility = makeAgentFixture('negotiator', {
      id: 'negotiator-no-passive',
      baseStats: { combat: 10, investigation: 30, utility: 30, social: 60 },
      abilities: [],
    })
    const negotiatorWithAbility = makeAgentFixture('negotiator', {
      id: 'negotiator-with-passive',
      baseStats: { combat: 10, investigation: 30, utility: 30, social: 60 },
      abilities: [
        {
          id: 'silver-tongue',
          label: 'Silver Tongue',
          type: 'passive',
          effect: { presence: 10 },
        },
      ],
    })

    const baseScore = computeTeamScore([negotiatorNoAbility], supportCase)
    const buffedScore = computeTeamScore([negotiatorWithAbility], supportCase)
    const calibratedRequired = Math.max(
      Math.ceil(baseScore.score + 1),
      Math.min(
        Math.floor(buffedScore.score),
        Math.ceil(baseScore.score + state.config.partialMargin / 2)
      )
    )
    const calibratedCase = {
      ...supportCase,
      difficulty: {
        combat: 0,
        investigation: 0,
        utility: 0,
        social: calibratedRequired,
      },
    }

    const noAbilityOutcome = resolveCase(
      calibratedCase,
      [negotiatorNoAbility],
      state.config,
      () => 0.1
    )
    const withAbilityOutcome = resolveCase(
      calibratedCase,
      [negotiatorWithAbility],
      state.config,
      () => 0.1
    )

    expect(noAbilityOutcome.result).toBe('partial')
    expect(withAbilityOutcome.result).toBe('success')
    expect(withAbilityOutcome.delta).toBeGreaterThan(noAbilityOutcome.delta)
  })

  it('applies duration penalty to threshold delta only in attrition mode', () => {
    const state = createStartingState()

    state.agents = {
      'agent-test': {
        id: 'agent-test',
        name: 'Agent Test',
        role: 'hunter',
        baseStats: { combat: 60, investigation: 0, utility: 0, social: 0 },
        tags: [],
        relationships: {},
        fatigue: 0,
        status: 'active',
      },
    }

    state.teams = {
      'team-test': {
        id: 'team-test',
        name: 'Test Team',
        agentIds: ['agent-test'],
        tags: [],
      },
    }

    state.cases = {
      'case-threshold': {
        ...state.cases['case-001'],
        id: 'case-threshold',
        mode: 'threshold',
        stage: 1,
        durationWeeks: 3,
        difficulty: { combat: 50, investigation: 0, utility: 0, social: 0 },
        weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
        preferredTags: [],
        assignedTeamIds: ['team-test'],
      },
    }

    const thresholdCase = state.cases['case-threshold']
    const agents = [state.agents['agent-test']]
    const capacityConfig = {
      ...state.config,
      durationModel: 'capacity' as const,
      attritionPerWeek: 4,
    }
    const attritionConfig = {
      ...state.config,
      durationModel: 'attrition' as const,
      attritionPerWeek: 4,
    }

    const capacityOutcome = resolveCase(thresholdCase, agents, capacityConfig, () => 0.1)
    const attritionOutcome = resolveCase(thresholdCase, agents, attritionConfig, () => 0.1)

    expect(attritionOutcome.delta).toBeCloseTo(capacityOutcome.delta - 12, 6)
  })

  it('returns partial for a high-probability near miss in probability mode', () => {
    const state = createStartingState()

    state.agents = {
      'agent-test': {
        id: 'agent-test',
        name: 'Agent Test',
        role: 'hunter',
        baseStats: { combat: 140, investigation: 0, utility: 0, social: 0 },
        tags: [],
        relationships: {},
        fatigue: 0,
        status: 'active',
      },
    }

    state.teams = {
      'team-test': {
        id: 'team-test',
        name: 'Test Team',
        agentIds: ['agent-test'],
        tags: [],
      },
    }

    state.cases = {
      'case-probability': {
        ...state.cases['case-002'],
        id: 'case-probability',
        difficulty: { combat: 100, investigation: 0, utility: 0, social: 0 },
        weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
        preferredTags: [],
        assignedTeamIds: ['team-test'],
      },
    }

    const probabilityCase = state.cases['case-probability']
    const team = computeTeamScore([state.agents['agent-test']], probabilityCase)
    const required = computeRequiredScore(probabilityCase, state.config)
    const delta = team.score - required
    const chance = clamp(sigmoid(delta * state.config.probabilityK), 0.05, 0.95)
    const draw = chance + (1 - chance) / 2
    const outcome = resolveCase(
      probabilityCase,
      [state.agents['agent-test']],
      state.config,
      () => draw
    )

    expect(chance).toBeGreaterThanOrEqual(0.7)
    expect(draw).toBeGreaterThan(chance)
    expect(outcome.result).toBe('partial')
    expect(outcome.reasons.some((reason) => reason.includes('Chance='))).toBe(true)
  })

  it('returns success in probability mode when the roll beats the chance', () => {
    const state = createStartingState()

    state.agents = {
      'agent-test': {
        id: 'agent-test',
        name: 'Agent Test',
        role: 'hunter',
        baseStats: { combat: 140, investigation: 0, utility: 0, social: 0 },
        tags: [],
        relationships: {},
        fatigue: 0,
        status: 'active',
      },
    }

    state.teams = {
      'team-test': {
        id: 'team-test',
        name: 'Test Team',
        agentIds: ['agent-test'],
        tags: [],
      },
    }

    state.cases = {
      'case-probability': {
        ...state.cases['case-002'],
        id: 'case-probability',
        mode: 'probability',
        difficulty: { combat: 100, investigation: 0, utility: 0, social: 0 },
        weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
        preferredTags: [],
        assignedTeamIds: ['team-test'],
      },
    }

    const probabilityCase = state.cases['case-probability']
    const team = computeTeamScore([state.agents['agent-test']], probabilityCase)
    const required = computeRequiredScore(probabilityCase, state.config)
    const delta = team.score - required
    const chance = clamp(sigmoid(delta * state.config.probabilityK), 0.05, 0.95)
    const outcome = resolveCase(
      probabilityCase,
      [state.agents['agent-test']],
      state.config,
      () => chance / 2
    )

    expect(outcome.result).toBe('success')
    expect(outcome.reasons.some((reason) => reason.includes('Chance='))).toBe(true)
  })

  it('returns fail in probability mode when the roll misses a low chance case', () => {
    const state = createStartingState()

    state.agents = {
      'agent-test': {
        id: 'agent-test',
        name: 'Agent Test',
        role: 'hunter',
        baseStats: { combat: 1, investigation: 0, utility: 0, social: 0 },
        tags: [],
        relationships: {},
        fatigue: 0,
        status: 'active',
      },
    }

    state.teams = {
      'team-test': {
        id: 'team-test',
        name: 'Test Team',
        agentIds: ['agent-test'],
        tags: [],
      },
    }

    state.cases = {
      'case-probability': {
        ...state.cases['case-002'],
        id: 'case-probability',
        mode: 'probability',
        difficulty: { combat: 100, investigation: 0, utility: 0, social: 0 },
        weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
        preferredTags: [],
        assignedTeamIds: ['team-test'],
      },
    }

    const outcome = resolveCase(
      state.cases['case-probability'],
      [state.agents['agent-test']],
      state.config,
      () => 0.99
    )

    expect(outcome.result).toBe('fail')
    expect(outcome.reasons.some((reason) => reason.includes('roll='))).toBe(true)
  })

  it('uses leader event control to shift probability outcomes in probability mode', () => {
    const state = createStartingState()
    const agent = makeAgentFixture('investigator', {
      id: 'leader-event-agent',
    })
    const baseCase = {
      ...state.cases['case-002'],
      id: 'case-leader-probability',
      mode: 'probability' as const,
      preferredTags: [],
      stage: 1,
      difficulty: { combat: 20, investigation: 0, utility: 0, social: 0 },
      weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
    }
    const calibratedScore = computeTeamScore([agent], baseCase)
    const probabilityCase = {
      ...baseCase,
      difficulty: {
        combat: Math.round(calibratedScore.score),
        investigation: 0,
        utility: 0,
        social: 0,
      },
    }

    const boostedTeam = computeTeamScore([agent], probabilityCase, {
      leaderBonusOverride: {
        effectivenessMultiplier: 1,
        eventModifier: 0.35,
        xpBonus: 0,
        stressModifier: 0,
      },
    })
    const neutralTeam = computeTeamScore([agent], probabilityCase, {
      leaderBonusOverride: {
        effectivenessMultiplier: 1,
        eventModifier: 0,
        xpBonus: 0,
        stressModifier: 0,
      },
    })
    const required = computeRequiredScore(probabilityCase, state.config)
    const boostedChance = clamp(
      sigmoid((boostedTeam.score - required) * state.config.probabilityK) +
        boostedTeam.leaderBonusModel.eventModifier * 0.08,
      0.05,
      0.95
    )
    const neutralChance = clamp(
      sigmoid((neutralTeam.score - required) * state.config.probabilityK) +
        neutralTeam.leaderBonusModel.eventModifier * 0.08,
      0.05,
      0.95
    )
    const draw = (boostedChance + neutralChance) / 2

    const boostedOutcome = resolveCase(probabilityCase, [agent], state.config, () => draw, {
      leaderBonusOverride: {
        effectivenessMultiplier: 1,
        eventModifier: 0.35,
        xpBonus: 0,
        stressModifier: 0,
      },
    })
    const neutralOutcome = resolveCase(probabilityCase, [agent], state.config, () => draw, {
      leaderBonusOverride: {
        effectivenessMultiplier: 1,
        eventModifier: 0,
        xpBonus: 0,
        stressModifier: 0,
      },
    })

    expect(boostedChance).toBeGreaterThan(neutralChance)
    expect(boostedOutcome.result).not.toBe(neutralOutcome.result)
    expect(boostedOutcome.reasons.some((reason) => reason.includes('Leader event control:'))).toBe(
      true
    )
  })

  it('blocks deterministic cases when required tags are missing', () => {
    const state = createStartingState()
    const outcome = resolveCase(state.cases['case-003'], [], state.config, () => 0.1)

    expect(outcome.result).toBe('fail')
    expect(outcome.reasons).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/No active members are available for deployment\./i),
        expect.stringMatching(/Missing required tags:/i),
      ])
    )
  })

  it('blocks structurally invalid participants before scoring', () => {
    const state = createStartingState()
    const caseData = {
      ...state.cases['case-001'],
      requiredTags: [],
      requiredRoles: [],
      preferredTags: [],
    }
    const trainingAgent = makeAgentFixture('hunter', {
      id: 'agent-training',
      assignment: { state: 'training', startedWeek: state.week },
    })

    const outcome = resolveCase(caseData, [trainingAgent], state.config, () => 0.1)

    expect(outcome.result).toBe('fail')
    expect(outcome.reasons).toEqual(
      expect.arrayContaining([
        'No active members are available for deployment.',
        'One or more members are in training and cannot deploy.',
      ])
    )
  })

  it('keeps deterministic resolveCase and preview path aligned for the same input', () => {
    const state = createStartingState()

    state.agents = {
      'agent-test': {
        id: 'agent-test',
        name: 'Agent Test',
        role: 'hunter',
        baseStats: { combat: 120, investigation: 0, utility: 0, social: 0 },
        tags: [],
        relationships: {},
        fatigue: 0,
        status: 'active',
      },
    }

    state.teams = {
      'team-test': {
        id: 'team-test',
        name: 'Test Team',
        leaderId: 'agent-test',
        memberIds: ['agent-test'],
        agentIds: ['agent-test'],
        tags: [],
      },
    }

    state.cases = {
      'case-threshold': {
        ...state.cases['case-001'],
        id: 'case-threshold',
        mode: 'threshold',
        difficulty: { combat: 20, investigation: 0, utility: 0, social: 0 },
        weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
        preferredTags: [],
        requiredTags: [],
        requiredRoles: [],
        assignedTeamIds: ['team-test'],
      },
    }

    const preview = previewResolutionForTeamIds(state.cases['case-threshold'], state, ['team-test'])
    const outcomeA = resolveCase(
      state.cases['case-threshold'],
      [state.agents['agent-test']],
      state.config,
      () => 0.1
    )
    const outcomeB = resolveCase(
      state.cases['case-threshold'],
      [state.agents['agent-test']],
      state.config,
      () => 0.1
    )

    expect(preview.validation?.valid).toBe(true)
    expect(preview.deployableAgentIds).toEqual(['agent-test'])
    expect(getDeterministicPreviewResult(preview.odds)).toBe(outcomeA.result)
    expect(outcomeA).toEqual(outcomeB)
  })

  it('keeps threshold preview deterministic odds aligned with resolveCase for identical context inputs', () => {
    const state = createStartingState()

    state.agents = {
      'agent-test': {
        id: 'agent-test',
        name: 'Agent Test',
        role: 'hunter',
        baseStats: { combat: 110, investigation: 0, utility: 0, social: 0 },
        tags: ['occult'],
        relationships: {},
        fatigue: 0,
        status: 'active',
      },
    }

    state.teams = {
      'team-test': {
        id: 'team-test',
        name: 'Test Team',
        leaderId: 'agent-test',
        memberIds: ['agent-test'],
        agentIds: ['agent-test'],
        tags: ['occult'],
      },
    }

    state.cases = {
      'case-threshold': {
        ...state.cases['case-001'],
        id: 'case-threshold',
        mode: 'threshold',
        difficulty: { combat: 100, investigation: 0, utility: 0, social: 0 },
        weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
        preferredTags: ['occult'],
        requiredTags: [],
        requiredRoles: [],
        assignedTeamIds: ['team-test'],
      },
    }

    const currentCase = state.cases['case-threshold']
    const preview = previewResolutionForTeamIds(currentCase, state, ['team-test'])
    const outcome = resolveCase(
      currentCase,
      [state.agents['agent-test']],
      state.config,
      () => 0.5,
      {
        inventory: state.inventory,
        supportTags: [...state.teams['team-test'].tags],
        leaderId: state.teams['team-test'].leaderId ?? null,
      }
    )

    expect(preview.validation?.valid).toBe(true)
    expect(preview.odds.blockedByRequiredTags).toBe(false)
    expect(preview.odds.blockedByRequiredRoles).toBe(false)
    expect(outcome.result).toBe(getDeterministicPreviewResult(preview.odds))
  })

  it('keeps state-derived protocol bonuses aligned between preview and direct resolution', () => {
    const state = createStartingState()
    state.agency = {
      ...state.agency,
      containmentRating: 90,
      clearanceLevel: 2,
      funding: 200,
      supportAvailable: state.agency?.supportAvailable ?? 0,
    }
    state.containmentRating = 90
    state.clearanceLevel = 2
    state.funding = 200

    state.agents = {
      'agent-test': {
        id: 'agent-test',
        name: 'Agent Test',
        role: 'tech',
        baseStats: { combat: 20, investigation: 55, utility: 60, social: 20 },
        tags: ['analysis'],
        relationships: {},
        fatigue: 0,
        status: 'active',
      },
    }

    state.teams = {
      'team-test': {
        id: 'team-test',
        name: 'Test Team',
        leaderId: 'agent-test',
        memberIds: ['agent-test'],
        agentIds: ['agent-test'],
        tags: ['analysis'],
      },
    }

    const baseCase = {
      ...state.cases['case-001'],
      id: 'case-protocol',
      mode: 'threshold' as const,
      kind: 'case' as const,
      difficulty: { combat: 0, investigation: 0, utility: 0, social: 0 },
      weights: { combat: 0, investigation: 0, utility: 1, social: 0 },
      tags: ['signal', 'analysis', 'evidence'],
      preferredTags: [],
      requiredTags: [],
      requiredRoles: [],
      assignedTeamIds: ['team-test'],
    }
    const protocolState = buildAgencyProtocolState(state)
    const baseScore = computeTeamScore([state.agents['agent-test']], baseCase).score
    const protocolScore = computeTeamScore([state.agents['agent-test']], baseCase, {
      protocolState,
    }).score

    state.cases = {
      'case-protocol': {
        ...baseCase,
        difficulty: {
          combat: 0,
          investigation: 0,
          utility: Number(((baseScore + protocolScore) / 2).toFixed(2)),
          social: 0,
        },
      },
    }

    const preview = previewResolutionForTeamIds(state.cases['case-protocol'], state, ['team-test'])
    const directWithProtocol = resolveCase(
      state.cases['case-protocol'],
      [state.agents['agent-test']],
      state.config,
      () => 0.1,
      {
        inventory: state.inventory,
        supportTags: ['analysis'],
        leaderId: 'agent-test',
        protocolState,
      }
    )
    const directWithoutProtocol = resolveCase(
      state.cases['case-protocol'],
      [state.agents['agent-test']],
      state.config,
      () => 0.1,
      {
        inventory: state.inventory,
        supportTags: ['analysis'],
        leaderId: 'agent-test',
      }
    )

    expect(protocolScore).toBeGreaterThan(baseScore)
    expect(preview.validation?.valid).toBe(true)
    expect(getDeterministicPreviewResult(preview.odds)).toBe(directWithProtocol.result)
    expect(directWithProtocol.result).not.toBe(directWithoutProtocol.result)
    expect(
      directWithProtocol.reasons.some((reason) =>
        reason.includes('Protocols: Field Clearance Protocol')
      )
    ).toBe(true)
  })

  it('uses preview success chance as the same probability boundary used by resolveCase', () => {
    const state = createStartingState()

    state.agents = {
      'agent-test': {
        id: 'agent-test',
        name: 'Agent Test',
        role: 'hunter',
        baseStats: { combat: 70, investigation: 0, utility: 0, social: 0 },
        tags: [],
        relationships: {},
        fatigue: 0,
        status: 'active',
      },
    }

    state.teams = {
      'team-test': {
        id: 'team-test',
        name: 'Test Team',
        leaderId: 'agent-test',
        memberIds: ['agent-test'],
        agentIds: ['agent-test'],
        tags: [],
      },
    }

    const probabilityCase = {
      ...state.cases['case-002'],
      id: 'case-probability',
      mode: 'probability' as const,
      difficulty: { combat: 10, investigation: 0, utility: 0, social: 0 },
      weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
      preferredTags: [],
      requiredTags: [],
      requiredRoles: [],
      assignedTeamIds: ['team-test'],
    }
    const calibratedScore = computeTeamScore([state.agents['agent-test']], probabilityCase)

    state.cases = {
      'case-probability': {
        ...probabilityCase,
        difficulty: {
          combat: Math.round(calibratedScore.score),
          investigation: 0,
          utility: 0,
          social: 0,
        },
      },
    }

    const currentCase = state.cases['case-probability']
    const preview = previewResolutionForTeamIds(currentCase, state, ['team-test'])
    const successChance = preview.odds.success

    expect(successChance).toBeGreaterThan(0.05)
    expect(successChance).toBeLessThan(0.95)

    const belowBoundary = Math.max(0, successChance - 1e-6)
    const aboveBoundary = Math.min(1, successChance + 1e-6)
    const successOutcome = resolveCase(
      currentCase,
      [state.agents['agent-test']],
      state.config,
      () => belowBoundary,
      {
        inventory: state.inventory,
        supportTags: [...state.teams['team-test'].tags],
        leaderId: state.teams['team-test'].leaderId ?? null,
      }
    )
    const missOutcome = resolveCase(
      currentCase,
      [state.agents['agent-test']],
      state.config,
      () => aboveBoundary,
      {
        inventory: state.inventory,
        supportTags: [...state.teams['team-test'].tags],
        leaderId: state.teams['team-test'].leaderId ?? null,
      }
    )

    expect(successOutcome.result).toBe('success')
    expect(missOutcome.result).toBe(preview.odds.partial > 0 ? 'partial' : 'fail')
    if (preview.odds.partial > 0) {
      expect(preview.odds.fail).toBe(0)
    } else {
      expect(preview.odds.fail).toBeCloseTo(1 - preview.odds.success, 6)
    }
  })
})

describe('resolveRaid', () => {
  function makeRaidFixture() {
    const state = createStartingState()

    const agent = (id: string) => ({
      id,
      name: `Agent ${id}`,
      role: 'hunter' as const,
      baseStats: { combat: 120, investigation: 0, utility: 0, social: 0 },
      tags: [],
      relationships: {},
      fatigue: 0,
      status: 'active' as const,
    })

    state.agents = {
      'agent-a': agent('agent-a'),
      'agent-b': agent('agent-b'),
      'agent-c': agent('agent-c'),
    }

    state.teams = {
      'team-1': { id: 'team-1', name: 'Team 1', agentIds: ['agent-a'], tags: [] },
      'team-2': { id: 'team-2', name: 'Team 2', agentIds: ['agent-b'], tags: [] },
      'team-3': { id: 'team-3', name: 'Team 3', agentIds: ['agent-c'], tags: [] },
    }

    state.cases = {
      'raid-001': {
        ...state.cases['case-001'],
        id: 'raid-001',
        kind: 'raid',
        assignedTeamIds: [],
        difficulty: { combat: 50, investigation: 0, utility: 0, social: 0 },
        weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
        preferredTags: [],
        raid: { minTeams: 1, maxTeams: 3 },
      },
    }

    return state
  }

  it('applies no penalty with a single team', () => {
    const state = makeRaidFixture()
    const raidCase = state.cases['raid-001']

    const base = resolveCase(raidCase, [state.agents['agent-a']], state.config, () => 0.1)
    const raid = resolveRaid(
      raidCase,
      [state.teams['team-1']],
      state.agents,
      state.config,
      () => 0.1
    )

    expect(raid.delta).toBeCloseTo(base.delta, 6)
    expect(raid.reasons.some((reason) => reason.includes('Raid coordination penalty: -0%'))).toBe(
      true
    )
  })

  it('reduces delta by penalty * 10 for each extra team', () => {
    const state = makeRaidFixture()
    const raidCase = state.cases['raid-001']
    const penalty = state.config.raidCoordinationPenaltyPerExtraTeam // 1 extra team

    const base = resolveCase(
      raidCase,
      [state.agents['agent-a'], state.agents['agent-b']],
      state.config,
      () => 0.1
    )
    const raid = resolveRaid(
      raidCase,
      [state.teams['team-1'], state.teams['team-2']],
      state.agents,
      state.config,
      () => 0.1
    )

    expect(raid.delta).toBeCloseTo(base.delta - penalty * 10, 6)
    expect(raid.reasons.some((reason) => reason.includes('Raid coordination penalty:'))).toBe(true)
  })

  it('clamps penalty at 35% regardless of team count', () => {
    const state = makeRaidFixture()

    // Add enough extra teams to exceed the 35% cap
    for (let i = 4; i <= 20; i++) {
      state.agents[`agent-${i}`] = {
        id: `agent-${i}`,
        name: `Agent ${i}`,
        role: 'hunter',
        baseStats: { combat: 120, investigation: 0, utility: 0, social: 0 },
        tags: [],
        relationships: {},
        fatigue: 0,
        status: 'active',
      }
      state.teams[`team-${i}`] = {
        id: `team-${i}`,
        name: `Team ${i}`,
        agentIds: [`agent-${i}`],
        tags: [],
      }
    }

    const raidCase = state.cases['raid-001']
    const manyTeams = Object.values(state.teams)
    const raid = resolveRaid(raidCase, manyTeams, state.agents, state.config, () => 0.1)

    const base = resolveCase(
      raidCase,
      manyTeams.flatMap((t) => t.agentIds.map((id) => state.agents[id])),
      state.config,
      () => 0.1
    )

    // Max penalty is 0.35 * 10 = 3.5
    expect(raid.delta).toBeCloseTo(base.delta - 3.5, 6)
    expect(raid.reasons.some((reason) => reason.includes('Raid coordination penalty: -35%'))).toBe(
      true
    )
  })

  it('preserves mode, kind, caseId and result from base resolution', () => {
    const state = makeRaidFixture()
    const raidCase = state.cases['raid-001']

    const base = resolveCase(raidCase, [state.agents['agent-a']], state.config, () => 0.1)
    const raid = resolveRaid(
      raidCase,
      [state.teams['team-1']],
      state.agents,
      state.config,
      () => 0.1
    )

    expect(raid.mode).toBe(base.mode)
    expect(raid.kind).toBe(base.kind)
    expect(raid.caseId).toBe(base.caseId)
    expect(raid.result).toBe(base.result)
  })

  it('fails raids that do not meet the minimum team count', () => {
    const state = makeRaidFixture()
    const raidCase = {
      ...state.cases['raid-001'],
      raid: { minTeams: 2, maxTeams: 3 },
    }

    const raid = resolveRaid(
      raidCase,
      [state.teams['team-1']],
      state.agents,
      state.config,
      () => 0.1
    )

    expect(raid.result).toBe('fail')
    expect(raid.delta).toBe(-999)
    expect(raid.reasons[0]).toContain('Insufficient raid coverage: 1/2 teams assigned.')
  })

  it('uses the same raid preflight blocking in preview and raid resolution', () => {
    const state = makeRaidFixture()
    const raidCase = {
      ...state.cases['raid-001'],
      raid: { minTeams: 2, maxTeams: 3 },
      assignedTeamIds: [],
    }

    const preview = previewResolutionForTeamIds(raidCase, state, ['team-1'])
    const raid = resolveRaid(
      raidCase,
      [state.teams['team-1']],
      state.agents,
      state.config,
      () => 0.1
    )

    expect(preview.validation?.issues[0]?.code).toBe('insufficient-raid-teams')
    expect(preview.validation?.issues[0]?.detail).toBe(raid.reasons[0])
    expect(preview.odds).toEqual({
      chemistry: 0,
      success: 0,
      partial: 0,
      fail: 1,
      blockedByRequiredTags: false,
      blockedByRequiredRoles: false,
    })
    expect(raid.delta).toBe(-999)
    expect(raid.result).toBe('fail')
  })

  it('lets raid coordination penalty change the resolved outcome', () => {
    const state = makeRaidFixture()
    const raidCase = {
      ...state.cases['raid-001'],
      mode: 'threshold' as const,
      raid: { minTeams: 1, maxTeams: 3 },
    }
    const penaltyConfig = {
      ...state.config,
      raidCoordinationPenaltyPerExtraTeam: 0.25,
    }
    const agents = [state.agents['agent-a'], state.agents['agent-b']]
    const calibratedScore = computeTeamScore(agents, raidCase)
    const maxCombatDifficulty = Math.max(1, Math.ceil(calibratedScore.score))
    let selectedOutcome:
      | {
          base: ReturnType<typeof resolveCase>
          raid: ReturnType<typeof resolveRaid>
        }
      | undefined

    for (let combatDifficulty = 1; combatDifficulty <= maxCombatDifficulty; combatDifficulty += 1) {
      const calibratedRaidCase = {
        ...raidCase,
        difficulty: {
          combat: combatDifficulty,
          investigation: 0,
          utility: 0,
          social: 0,
        },
        weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
      }
      const base = resolveCase(calibratedRaidCase, agents, state.config, () => 0.1)
      const raid = resolveRaid(
        calibratedRaidCase,
        [state.teams['team-1'], state.teams['team-2']],
        state.agents,
        penaltyConfig,
        () => 0.1
      )

      if (base.result === 'success' && raid.result === 'partial') {
        selectedOutcome = { base, raid }
        break
      }
    }

    expect(selectedOutcome).toBeDefined()

    const { base, raid } = selectedOutcome!

    expect(base.result).toBe('success')
    expect(raid.result).toBe('partial')
    expect(raid.delta).toBeLessThan(0)
    expect(raid.reasons.some((reason) => reason.includes('Raid coordination penalty:'))).toBe(true)
  })

  it('keeps resolveRaid, resolveCase, and preview path aligned for the same single-team raid input', () => {
    const state = makeRaidFixture()
    const raidCase = {
      ...state.cases['raid-001'],
      mode: 'threshold' as const,
      raid: { minTeams: 1, maxTeams: 3 },
      assignedTeamIds: ['team-1'],
    }

    const preview = previewResolutionForTeamIds(raidCase, state, ['team-1'])
    const direct = resolveCase(raidCase, [state.agents['agent-a']], state.config, () => 0.1)
    const raidA = resolveRaid(
      raidCase,
      [state.teams['team-1']],
      state.agents,
      state.config,
      () => 0.1
    )
    const raidB = resolveRaid(
      raidCase,
      [state.teams['team-1']],
      state.agents,
      state.config,
      () => 0.1
    )

    expect(preview.validation?.valid).toBe(true)
    expect(getDeterministicPreviewResult(preview.odds)).toBe(raidA.result)
    expect(raidA.result).toBe(direct.result)
    expect(raidA.delta).toBeCloseTo(direct.delta, 6)
    expect(raidA).toEqual(raidB)
  })

  it('keeps valid raid preview outcome band aligned with resolveRaid under the same selected teams', () => {
    const state = makeRaidFixture()
    const raidCase = {
      ...state.cases['raid-001'],
      mode: 'threshold' as const,
      raid: { minTeams: 1, maxTeams: 3 },
      requiredTags: [],
      requiredRoles: [],
      assignedTeamIds: ['team-1', 'team-2'],
    }

    const preview = previewResolutionForTeamIds(raidCase, state, ['team-1', 'team-2'])
    const raid = resolveRaid(
      raidCase,
      [state.teams['team-1'], state.teams['team-2']],
      state.agents,
      state.config,
      () => 0.5,
      state.inventory
    )

    const oneHotCount = [preview.odds.success, preview.odds.partial, preview.odds.fail].filter(
      (entry) => entry === 1
    ).length

    expect(preview.validation?.valid).toBe(true)
    expect(oneHotCount).toBe(1)
    expect(raid.result).toBe(getDeterministicPreviewResult(preview.odds))
    expect(raid.reasons.some((reason) => reason.includes('Raid coordination penalty:'))).toBe(true)
  })

  it('deduplicates shared agents identically in raid preview and resolveRaid', () => {
    const state = makeRaidFixture()
    state.teams['team-shadow'] = {
      id: 'team-shadow',
      name: 'Team Shadow',
      agentIds: ['agent-a', 'agent-b'],
      tags: [],
    }
    const raidCase = {
      ...state.cases['raid-001'],
      mode: 'threshold' as const,
      raid: { minTeams: 1, maxTeams: 3 },
      requiredTags: [],
      requiredRoles: [],
      assignedTeamIds: ['team-1', 'team-shadow'],
    }

    const preview = previewResolutionForTeamIds(raidCase, state, ['team-1', 'team-shadow'])
    const raid = resolveRaid(
      raidCase,
      [state.teams['team-1'], state.teams['team-shadow']],
      state.agents,
      state.config,
      () => 0.5,
      state.inventory
    )

    expect(preview.deployableAgentIds.filter((id) => id === 'agent-a')).toHaveLength(1)
    expect(new Set(preview.deployableAgentIds).size).toBe(preview.deployableAgentIds.length)
    expect(raid.result).toBe(getDeterministicPreviewResult(preview.odds))
  })

  it('applies the same party-card score adjustments in raid preview and live resolveRaid execution', () => {
    const state = makeRaidFixture()
    state.partyCards!.hand = ['card-last-push']

    const baseRaidCase = {
      ...state.cases['raid-001'],
      mode: 'threshold' as const,
      raid: { minTeams: 1, maxTeams: 3 },
      requiredTags: [],
      requiredRoles: [],
      assignedTeamIds: ['team-1', 'team-2'],
    }
    const coordinationScoreAdjustment = -state.config.raidCoordinationPenaltyPerExtraTeam * 10
    const baselineScore = computeTeamScore(
      [state.agents['agent-a'], state.agents['agent-b']],
      baseRaidCase,
      {
        inventory: state.inventory,
        supportTags: [],
        scoreAdjustment: coordinationScoreAdjustment,
      }
    ).score
    const calibratedRaidCase = {
      ...baseRaidCase,
      difficulty: {
        combat: Math.round(baselineScore + 6),
        investigation: 0,
        utility: 0,
        social: 0,
      },
      weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
    }

    state.partyCards = playPartyCard(state.partyCards!, 'card-last-push', {
      weekPlayed: state.week,
      targetCaseId: calibratedRaidCase.id,
    })

    const preview = previewResolutionForTeamIds(calibratedRaidCase, state, ['team-1', 'team-2'])
    const raid = resolveRaid(
      calibratedRaidCase,
      [state.teams['team-1'], state.teams['team-2']],
      state.agents,
      state.config,
      () => 0.5,
      state.inventory
    )

    // Contract expectation: same effective input should yield same outcome band.
    // Current implementation intentionally violates this for raids because party-card
    // score adjustments are present in preview but not threaded into resolveRaid.
    expect(raid.result).toBe(getDeterministicPreviewResult(preview.odds))
  })
})

describe('estimateOutcomeOdds', () => {
  it('returns a blocked fail when no agents are available', () => {
    const state = createStartingState()

    const odds = estimateOutcomeOdds(state.cases['case-001'], state, [])

    expect(odds).toEqual({
      chemistry: 0,
      success: 0,
      partial: 0,
      fail: 1,
      blockedByRequiredTags: true,
      blockedByRequiredRoles: true,
    })
  })

  it('returns a blocked fail when the requested team is missing', () => {
    const state = createStartingState()

    const odds = estimateOutcomeOdds(state.cases['case-001'], state, ['missing-team'])

    expect(odds).toEqual({
      chemistry: 0,
      success: 0,
      partial: 0,
      fail: 1,
      blockedByRequiredTags: true,
      blockedByRequiredRoles: true,
    })
  })

  it('marks deterministic blocks when required tags are missing', () => {
    const state = createStartingState()

    state.agents = {
      'agent-test': {
        id: 'agent-test',
        name: 'Agent Test',
        role: 'hunter',
        baseStats: { combat: 10, investigation: 10, utility: 10, social: 10 },
        tags: ['combat'],
        relationships: {},
        fatigue: 0,
        status: 'active',
      },
    }

    state.teams = {
      'team-test': {
        id: 'team-test',
        name: 'Test Team',
        agentIds: ['agent-test'],
        tags: [],
      },
    }

    state.cases = {
      'case-deterministic': {
        ...state.cases['case-003'],
        id: 'case-deterministic',
        assignedTeamIds: ['team-test'],
      },
    }

    const odds = estimateOutcomeOdds(state.cases['case-deterministic'], state, ['team-test'])

    expect(odds).toEqual({
      chemistry: 0,
      success: 0,
      partial: 0,
      fail: 1,
      blockedByRequiredTags: true,
      blockedByRequiredRoles: true,
    })
  })

  it('returns threshold odds for a guaranteed success case', () => {
    const state = createStartingState()

    state.agents = {
      'agent-test': {
        id: 'agent-test',
        name: 'Agent Test',
        role: 'hunter',
        baseStats: { combat: 120, investigation: 0, utility: 0, social: 0 },
        tags: [],
        relationships: {},
        fatigue: 0,
        status: 'active',
      },
    }

    state.teams = {
      'team-test': {
        id: 'team-test',
        name: 'Test Team',
        agentIds: ['agent-test'],
        tags: [],
      },
    }

    state.cases = {
      'case-threshold': {
        ...state.cases['case-001'],
        id: 'case-threshold',
        mode: 'threshold',
        difficulty: { combat: 20, investigation: 0, utility: 0, social: 0 },
        weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
        preferredTags: [],
        assignedTeamIds: ['team-test'],
      },
    }

    const odds = estimateOutcomeOdds(state.cases['case-threshold'], state, ['team-test'])

    expect(odds.success).toBe(1)
    expect(odds.partial).toBe(0)
    expect(odds.fail).toBe(0)
    expect(odds.blockedByRequiredTags).toBe(false)
    expect(odds.blockedByRequiredRoles).toBe(false)
  })

  it('returns full chemistry when the required score is zero', () => {
    const state = createStartingState()

    state.agents = {
      'agent-test': {
        id: 'agent-test',
        name: 'Agent Test',
        role: 'hunter',
        baseStats: { combat: 10, investigation: 10, utility: 10, social: 10 },
        tags: [],
        relationships: {},
        fatigue: 0,
        status: 'active',
      },
    }

    state.teams = {
      'team-test': {
        id: 'team-test',
        name: 'Test Team',
        agentIds: ['agent-test'],
        tags: [],
      },
    }

    state.cases = {
      'case-threshold': {
        ...state.cases['case-001'],
        id: 'case-threshold',
        mode: 'threshold',
        difficulty: { combat: 0, investigation: 0, utility: 0, social: 0 },
        weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
        preferredTags: [],
        assignedTeamIds: ['team-test'],
      },
    }

    const odds = estimateOutcomeOdds(state.cases['case-threshold'], state, ['team-test'])

    expect(odds.chemistry).toBe(1)
    expect(odds.success).toBe(1)
    expect(odds.partial).toBe(0)
    expect(odds.fail).toBe(0)
  })

  it('returns threshold fail odds for a weak assignment', () => {
    const state = createStartingState()

    state.agents = {
      'agent-test': {
        id: 'agent-test',
        name: 'Agent Test',
        role: 'hunter',
        baseStats: { combat: 1, investigation: 0, utility: 0, social: 0 },
        tags: [],
        relationships: {},
        fatigue: 0,
        status: 'active',
      },
    }

    state.teams = {
      'team-test': {
        id: 'team-test',
        name: 'Test Team',
        agentIds: ['agent-test'],
        tags: [],
      },
    }

    state.cases = {
      'case-threshold': {
        ...state.cases['case-001'],
        id: 'case-threshold',
        mode: 'threshold',
        difficulty: { combat: 120, investigation: 0, utility: 0, social: 0 },
        weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
        preferredTags: [],
        assignedTeamIds: ['team-test'],
      },
    }

    const odds = estimateOutcomeOdds(state.cases['case-threshold'], state, ['team-test'])

    expect(odds.success).toBe(0)
    expect(odds.partial).toBe(0)
    expect(odds.fail).toBe(1)
    expect(odds.blockedByRequiredTags).toBe(false)
    expect(odds.blockedByRequiredRoles).toBe(false)
  })

  it('returns threshold partial odds for a near-miss assignment', () => {
    const state = createStartingState()

    state.agents = {
      'agent-test': {
        id: 'agent-test',
        name: 'Agent Test',
        role: 'hunter',
        baseStats: { combat: 100, investigation: 0, utility: 0, social: 0 },
        tags: [],
        relationships: {},
        fatigue: 0,
        status: 'active',
      },
    }

    state.teams = {
      'team-test': {
        id: 'team-test',
        name: 'Test Team',
        agentIds: ['agent-test'],
        tags: [],
      },
    }

    state.cases = {
      'case-threshold': {
        ...state.cases['case-001'],
        id: 'case-threshold',
        mode: 'threshold',
        difficulty: { combat: 0, investigation: 0, utility: 0, social: 0 },
        weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
        preferredTags: [],
        assignedTeamIds: ['team-test'],
      },
    }

    const calibratedScore = computeTeamScore(
      [state.agents['agent-test']],
      state.cases['case-threshold']
    )
    state.cases['case-threshold'] = {
      ...state.cases['case-threshold'],
      difficulty: {
        combat: Math.ceil(calibratedScore.score + state.config.partialMargin / 2),
        investigation: 0,
        utility: 0,
        social: 0,
      },
    }

    const odds = estimateOutcomeOdds(state.cases['case-threshold'], state, ['team-test'])

    expect(odds.success).toBe(0)
    expect(odds.partial).toBe(1)
    expect(odds.fail).toBe(0)
    expect(odds.blockedByRequiredTags).toBe(false)
    expect(odds.blockedByRequiredRoles).toBe(false)
  })

  it('returns probability odds with a partial band on high chance cases', () => {
    const state = createStartingState()

    state.agents = {
      'agent-test': {
        id: 'agent-test',
        name: 'Agent Test',
        role: 'hunter',
        baseStats: { combat: 140, investigation: 0, utility: 0, social: 0 },
        tags: [],
        relationships: {},
        fatigue: 0,
        status: 'active',
      },
    }

    state.teams = {
      'team-test': {
        id: 'team-test',
        name: 'Test Team',
        agentIds: ['agent-test'],
        tags: [],
      },
    }

    state.cases = {
      'case-probability': {
        ...state.cases['case-002'],
        id: 'case-probability',
        mode: 'probability',
        difficulty: { combat: 100, investigation: 0, utility: 0, social: 0 },
        weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
        preferredTags: [],
        assignedTeamIds: ['team-test'],
      },
    }

    const odds = estimateOutcomeOdds(state.cases['case-probability'], state, ['team-test'])

    expect(odds.success).toBeGreaterThanOrEqual(0.7)
    expect(odds.partial).toBeCloseTo(1 - odds.success, 6)
    expect(odds.fail).toBe(0)
    expect(odds.blockedByRequiredTags).toBe(false)
    expect(odds.blockedByRequiredRoles).toBe(false)
  })

  it('returns probability odds with no partial band on low chance cases', () => {
    const state = createStartingState()

    state.agents = {
      'agent-test': {
        id: 'agent-test',
        name: 'Agent Test',
        role: 'hunter',
        baseStats: { combat: 1, investigation: 0, utility: 0, social: 0 },
        tags: [],
        relationships: {},
        fatigue: 0,
        status: 'active',
      },
    }

    state.teams = {
      'team-test': {
        id: 'team-test',
        name: 'Test Team',
        agentIds: ['agent-test'],
        tags: [],
      },
    }

    state.cases = {
      'case-probability': {
        ...state.cases['case-002'],
        id: 'case-probability',
        mode: 'probability',
        difficulty: { combat: 100, investigation: 0, utility: 0, social: 0 },
        weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
        preferredTags: [],
        assignedTeamIds: ['team-test'],
      },
    }

    const odds = estimateOutcomeOdds(state.cases['case-probability'], state, ['team-test'])

    expect(odds.success).toBeLessThan(0.7)
    expect(odds.partial).toBe(0)
    expect(odds.fail).toBeCloseTo(1 - odds.success, 6)
    expect(odds.blockedByRequiredTags).toBe(false)
    expect(odds.blockedByRequiredRoles).toBe(false)
  })

  it('blocks cases when required role coverage is missing even if tags are satisfied', () => {
    const state = createStartingState()
    state.cases['case-role-gated'] = {
      ...state.cases['case-001'],
      id: 'case-role-gated',
      mode: 'threshold',
      requiredTags: [],
      requiredRoles: ['support'],
      assignedTeamIds: ['team-test'],
    }
    state.agents = {
      'agent-test': {
        id: 'agent-test',
        name: 'Agent Test',
        role: 'hunter',
        baseStats: { combat: 120, investigation: 0, utility: 0, social: 0 },
        tags: [],
        relationships: {},
        fatigue: 0,
        status: 'active',
      },
    }
    state.teams = {
      'team-test': {
        id: 'team-test',
        name: 'Test Team',
        agentIds: ['agent-test'],
        tags: [],
      },
    }

    const outcome = resolveCase(
      state.cases['case-role-gated'],
      [state.agents['agent-test']],
      state.config,
      () => 0.1
    )
    const odds = estimateOutcomeOdds(state.cases['case-role-gated'], state, ['team-test'])

    expect(outcome.result).toBe('fail')
    expect(outcome.reasons[0]).toMatch(/Missing required roles:/i)
    expect(odds.blockedByRequiredTags).toBe(false)
    expect(odds.blockedByRequiredRoles).toBe(true)
  })

  it('returns a blocked fail when no deployable members remain after preflight', () => {
    const state = createStartingState()

    state.agents = {
      'agent-test': {
        id: 'agent-test',
        name: 'Agent Test',
        role: 'hunter',
        baseStats: { combat: 120, investigation: 0, utility: 0, social: 0 },
        tags: [],
        relationships: {},
        fatigue: 0,
        status: 'active',
        assignment: { state: 'training', startedWeek: state.week },
      },
    }

    state.teams = {
      'team-test': {
        id: 'team-test',
        name: 'Test Team',
        agentIds: ['agent-test'],
        tags: [],
      },
    }

    state.cases = {
      'case-threshold': {
        ...state.cases['case-001'],
        id: 'case-threshold',
        mode: 'threshold',
        difficulty: { combat: 20, investigation: 0, utility: 0, social: 0 },
        weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
        preferredTags: [],
        requiredTags: [],
        requiredRoles: [],
        assignedTeamIds: ['team-test'],
      },
    }

    const odds = estimateOutcomeOdds(state.cases['case-threshold'], state, ['team-test'])

    expect(odds.success).toBe(0)
    expect(odds.partial).toBe(0)
    expect(odds.fail).toBe(1)
    expect(odds.blockedByRequiredTags).toBe(false)
    expect(odds.blockedByRequiredRoles).toBe(false)
  })
})

describe('evaluateCaseResolutionContext', () => {
  it('matches resolveCase for direct threshold resolution', () => {
    const state = createStartingState()

    state.agents = {
      'agent-test': {
        id: 'agent-test',
        name: 'Agent Test',
        role: 'hunter',
        baseStats: { combat: 120, investigation: 0, utility: 0, social: 0 },
        tags: [],
        relationships: {},
        fatigue: 0,
        status: 'active',
      },
    }

    state.cases = {
      'case-threshold': {
        ...state.cases['case-001'],
        id: 'case-threshold',
        mode: 'threshold',
        difficulty: { combat: 20, investigation: 0, utility: 0, social: 0 },
        weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
        preferredTags: [],
        assignedTeamIds: ['team-test'],
      },
    }

    const evaluation = evaluateCaseResolutionContext({
      caseData: state.cases['case-threshold'],
      agents: [state.agents['agent-test']],
      config: state.config,
    })
    const outcome = resolveCase(
      state.cases['case-threshold'],
      [state.agents['agent-test']],
      state.config,
      () => 0.1
    )

    expect(evaluation.outcome).toEqual(outcome)
    expect(evaluation.requiredScore).toBe(
      computeRequiredScore(state.cases['case-threshold'], state.config)
    )
    expect(evaluation.teamScore?.score).toBe(
      computeTeamScore([state.agents['agent-test']], state.cases['case-threshold']).score
    )
    expect(evaluation.modifiersApplied).toEqual(
      evaluation.teamScore?.modifierBreakdown ?? evaluation.modifiersApplied
    )
  })

  it('drives preview odds from the same canonical evaluation context', () => {
    const state = createStartingState()

    state.agents = {
      'agent-test': {
        id: 'agent-test',
        name: 'Agent Test',
        role: 'hunter',
        baseStats: { combat: 70, investigation: 0, utility: 0, social: 0 },
        tags: [],
        relationships: {},
        fatigue: 0,
        status: 'active',
      },
    }

    state.teams = {
      'team-test': {
        id: 'team-test',
        name: 'Test Team',
        leaderId: 'agent-test',
        memberIds: ['agent-test'],
        agentIds: ['agent-test'],
        tags: [],
      },
    }

    state.cases = {
      'case-probability': {
        ...state.cases['case-002'],
        id: 'case-probability',
        mode: 'probability',
        difficulty: { combat: 80, investigation: 0, utility: 0, social: 0 },
        weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
        preferredTags: [],
        assignedTeamIds: ['team-test'],
      },
    }

    const preview = previewResolutionForTeamIds(state.cases['case-probability'], state, [
      'team-test',
    ])
    const evaluation = evaluateCaseResolutionContext({
      caseData: state.cases['case-probability'],
      agents: [state.agents['agent-test']],
      config: state.config,
      context: {
        inventory: state.inventory,
        supportTags: [],
        leaderId: 'agent-test',
      },
    })

    expect(preview.validation).toEqual(evaluation.validationResult)
    expect(preview.odds.success).toBeCloseTo(evaluation.successChance ?? 0, 6)
    expect(preview.odds.blockedByRequiredTags).toBe(evaluation.blockedByRequiredTags)
    expect(preview.odds.blockedByRequiredRoles).toBe(evaluation.blockedByRequiredRoles)
  })
})
