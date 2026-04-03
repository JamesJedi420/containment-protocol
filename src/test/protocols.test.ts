import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { evaluateAgentBreakdown } from '../domain/evaluateAgent'
import {
  buildAgencyProtocolState,
  listProtocolCatalog,
  PROTOCOL_TYPE_DEFINITIONS,
} from '../domain/protocols'
import type { Agent, CaseInstance, DomainStats, GameState } from '../domain/models'

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

function makeAgent(role: Agent['role'], overrides: Partial<Agent> = {}): Agent {
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

function makeCase(overrides: Partial<CaseInstance> = {}): CaseInstance {
  const state = createStartingState()

  return {
    ...state.cases['case-001'],
    id: 'case-protocol-test',
    templateId: 'case-protocol-test',
    difficulty: { combat: 0, investigation: 0, utility: 0, social: 0 },
    weights: { combat: 0.25, investigation: 0.25, utility: 0.25, social: 0.25 },
    tags: [],
    requiredTags: [],
    preferredTags: [],
    stage: 1,
    durationWeeks: 1,
    deadlineWeeks: 4,
    deadlineRemaining: 4,
    assignedTeamIds: [],
    ...overrides,
  }
}

function makeProtocolGameState(overrides: Partial<NonNullable<GameState['agency']>>) {
  const state = createStartingState()
  const containmentRating = overrides.containmentRating ?? state.containmentRating
  const clearanceLevel = overrides.clearanceLevel ?? state.clearanceLevel
  const funding = overrides.funding ?? state.funding

  return {
    ...state,
    agency: {
      ...state.agency,
      ...overrides,
      containmentRating,
      clearanceLevel,
      funding,
    },
    containmentRating,
    clearanceLevel,
    funding,
  }
}

describe('protocols', () => {
  it('defines initial protocol categories and maps them into the live protocol catalog', () => {
    expect(PROTOCOL_TYPE_DEFINITIONS.map((definition) => definition.id)).toEqual([
      'survival-focused',
      'anomaly-interaction',
      'investigation-efficiency',
      'operational-endurance',
    ])

    const catalog = listProtocolCatalog()

    expect(catalog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'field-clearance-protocol',
          type: 'investigation-efficiency',
        }),
        expect.objectContaining({
          id: 'containment-doctrine-alpha',
          type: 'anomaly-interaction',
        }),
        expect.objectContaining({
          id: 'crisis-command-uplink',
          type: 'operational-endurance',
        }),
        expect.objectContaining({
          id: 'anomaly-resistance-training',
          type: 'survival-focused',
        }),
      ])
    )
  })

  it('applies selected global protocol modifiers across multiple agents', () => {
    const protocolState = buildAgencyProtocolState(
      makeProtocolGameState({
        containmentRating: 90,
        clearanceLevel: 2,
        funding: 200,
        activeProtocolIds: ['containment-doctrine-alpha'],
        protocolSelectionLimit: 2,
      })
    )
    const anomalyCase = makeCase({
      tags: ['occult', 'containment', 'anomaly'],
      weights: { combat: 0.1, investigation: 0.2, utility: 0.5, social: 0.2 },
    })
    const hunter = makeAgent('hunter')
    const negotiator = makeAgent('negotiator', {
      id: 'agent-negotiator',
      tags: ['face'],
    })

    const baseHunter = evaluateAgentBreakdown(hunter, { caseData: anomalyCase })
    const protocolHunter = evaluateAgentBreakdown(hunter, {
      caseData: anomalyCase,
      protocolState,
    })
    const protocolNegotiator = evaluateAgentBreakdown(negotiator, {
      caseData: anomalyCase,
      protocolState,
    })

    expect(protocolState.activeProtocolIds).toEqual(['containment-doctrine-alpha'])
    expect(
      protocolState.unlockedProtocols.find((protocol) => protocol.id === 'containment-doctrine-alpha')
    ).toMatchObject({
      selected: true,
      type: 'anomaly-interaction',
      scope: { kind: 'all_agents' },
    })
    expect(protocolHunter.powerLayer.protocols.map((protocol) => protocol.id)).toContain(
      'containment-doctrine-alpha'
    )
    expect(protocolNegotiator.powerLayer.protocols.map((protocol) => protocol.id)).toContain(
      'containment-doctrine-alpha'
    )
    expect(protocolHunter.protocolEffects.statModifiers).toEqual({})
    expect(protocolNegotiator.protocolEffects.statModifiers).toEqual({})
    expect(protocolHunter.effectiveStats).toEqual(baseHunter.effectiveStats)
    expect(protocolHunter.score).toBeGreaterThan(baseHunter.score)
    expect(protocolHunter.protocolEffects.effectivenessMultiplier).toBeGreaterThan(1)
    expect(protocolNegotiator.protocolEffects.stressImpactMultiplier).toBeLessThan(1)
  })

  it('filters selected protocols by scope for role-specific and tag-specific application', () => {
    const roleProtocolState = buildAgencyProtocolState(
      makeProtocolGameState({
        containmentRating: 90,
        clearanceLevel: 3,
        funding: 200,
        activeProtocolIds: ['crisis-command-uplink'],
        protocolSelectionLimit: 1,
      })
    )
    const raidCase = makeCase({
      kind: 'raid',
      stage: 4,
      tags: ['raid', 'breach', 'threat', 'containment'],
      weights: { combat: 0.45, investigation: 0.15, utility: 0.3, social: 0.1 },
      raid: { minTeams: 2, maxTeams: 3 },
    })
    const hunter = makeAgent('hunter')
    const negotiator = makeAgent('negotiator', {
      id: 'agent-non-role-match',
    })

    const hunterRoleBreakdown = evaluateAgentBreakdown(hunter, {
      caseData: raidCase,
      protocolState: roleProtocolState,
    })
    const negotiatorRoleBreakdown = evaluateAgentBreakdown(negotiator, {
      caseData: raidCase,
      protocolState: roleProtocolState,
    })

    expect(hunterRoleBreakdown.powerLayer.protocols).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'crisis-command-uplink',
          scope: {
            kind: 'role',
            roles: ['hunter', 'tech', 'medic'],
          },
        }),
      ])
    )
    expect(negotiatorRoleBreakdown.powerLayer.protocols.map((protocol) => protocol.id)).not.toContain(
      'crisis-command-uplink'
    )

    const tagProtocolState = buildAgencyProtocolState(
      makeProtocolGameState({
        containmentRating: 72,
        clearanceLevel: 2,
        funding: 120,
        activeProtocolIds: ['field-clearance-protocol'],
        protocolSelectionLimit: 1,
      })
    )
    const evidenceCase = makeCase({
      tags: ['signal', 'analysis', 'evidence'],
      weights: { combat: 0.1, investigation: 0.5, utility: 0.3, social: 0.1 },
    })
    const analyst = makeAgent('tech', {
      id: 'agent-analyst',
      tags: ['tech', 'analyst'],
    })
    const nonTaggedHunter = makeAgent('hunter', {
      id: 'agent-non-tag-match',
      tags: ['field'],
    })

    const analystBreakdown = evaluateAgentBreakdown(analyst, {
      caseData: evidenceCase,
      protocolState: tagProtocolState,
    })
    const hunterTagBreakdown = evaluateAgentBreakdown(nonTaggedHunter, {
      caseData: evidenceCase,
      protocolState: tagProtocolState,
    })

    expect(analystBreakdown.powerLayer.protocols).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'field-clearance-protocol',
          type: 'investigation-efficiency',
          scope: {
            kind: 'tag',
            tags: ['analyst', 'analysis', 'tech'],
          },
        }),
      ])
    )
    expect(hunterTagBreakdown.powerLayer.protocols.map((protocol) => protocol.id)).not.toContain(
      'field-clearance-protocol'
    )
  })

  it('uses deterministic protocol selection limits when explicit agency selection is omitted', () => {
    const protocolState = buildAgencyProtocolState(
      makeProtocolGameState({
        containmentRating: 90,
        clearanceLevel: 3,
        funding: 200,
        protocolSelectionLimit: 2,
      })
    )

    expect(protocolState.selectionLimit).toBe(2)
    expect(protocolState.activeProtocolIds).toEqual([
      'field-clearance-protocol',
      'containment-doctrine-alpha',
    ])
    expect(protocolState.unlockedProtocols).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'field-clearance-protocol',
          selected: true,
        }),
        expect.objectContaining({
          id: 'containment-doctrine-alpha',
          selected: true,
        }),
        expect.objectContaining({
          id: 'crisis-command-uplink',
          selected: false,
        }),
        expect.objectContaining({
          id: 'anomaly-resistance-training',
          selected: false,
        }),
      ])
    )
  })

  it('integrates survival-focused protocols as a live endurance layer without branching trees', () => {
    const protocolState = buildAgencyProtocolState(
      makeProtocolGameState({
        containmentRating: 82,
        clearanceLevel: 2,
        funding: 120,
        activeProtocolIds: ['anomaly-resistance-training'],
        protocolSelectionLimit: 2,
      })
    )
    const prolongedAnomalyCase = makeCase({
      durationWeeks: 4,
      stage: 3,
      tags: ['occult', 'anomaly', 'containment'],
      weights: { combat: 0.2, investigation: 0.2, utility: 0.4, social: 0.2 },
    })
    const agent = makeAgent('medium', {
      id: 'agent-survival',
      tags: ['occult'],
    })

    const baseBreakdown = evaluateAgentBreakdown(agent, { caseData: prolongedAnomalyCase })
    const protocolBreakdown = evaluateAgentBreakdown(agent, {
      caseData: prolongedAnomalyCase,
      protocolState,
    })

    expect(protocolBreakdown.powerLayer.protocols).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'anomaly-resistance-training',
          type: 'survival-focused',
        }),
      ])
    )
    expect(protocolBreakdown.protocolEffects.stressImpactMultiplier).toBeLessThan(1)
    expect(protocolBreakdown.protocolEffects.effectivenessMultiplier).toBeGreaterThan(1)
    expect(protocolBreakdown.performance.stressImpact).toBeLessThan(
      baseBreakdown.performance.stressImpact
    )
  })
})
