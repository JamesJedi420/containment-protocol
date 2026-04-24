import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  calcWeekScore,
  compareResolutionAgainstCase,
  createDefaultScoringSystemConfig,
  computeRequiredResolutionProfile,
  computeRequiredScore,
  computeTeamScore,
  sanitizeScoringSystemConfig,
} from '../domain/sim/scoring'
import { buildAgencyProtocolState } from '../domain/protocols'
import type { Agent, DomainStats } from '../domain/models'
import { buildAgentSquadCompositionProfile } from '../domain/teamSimulation'

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

function makeRoleWeightedAgent(role: Agent['role'], overrides: Partial<Agent> = {}): Agent {
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

describe('scoring helpers', () => {
  it('computes team score without chemistry or preferred tag bonuses', () => {
    const state = createStartingState()
    const caseInstance = state.cases['case-001']
    const agent = {
      ...state.agents['a_ava'],
      id: 'agent-test',
      tags: [],
      relationships: {},
      fatigue: 0,
    }

    const result = computeTeamScore([agent], {
      ...caseInstance,
      preferredTags: [],
    })

    expect(result.score).toBeGreaterThan(0)
    expect(result.reasons).toEqual([
      'No specialist present: reduced reliability in containment.',
    ])
    expect(result.resolutionProfile.fieldPower).toBeGreaterThan(0)
    expect(result.modifierBreakdown.chemistryBonus).toBe(0)
    expect(result.agentPerformance[0]).toMatchObject({
      contribution: expect.any(Number),
      threatHandled: expect.any(Number),
      damageTaken: expect.any(Number),
      healingPerformed: expect.any(Number),
      evidenceGathered: expect.any(Number),
      containmentActionsCompleted: expect.any(Number),
    })
    expect(result.performanceSummary).toMatchObject({
      contribution: expect.any(Number),
      threatHandled: expect.any(Number),
      damageTaken: expect.any(Number),
      healingPerformed: expect.any(Number),
      evidenceGathered: expect.any(Number),
      containmentActionsCompleted: expect.any(Number),
    })
    expect(result.comparison.providedProfile).toMatchObject({
      fieldPower: expect.any(Number),
      containment: expect.any(Number),
      investigation: expect.any(Number),
      support: expect.any(Number),
    })
    expect(result.layerBreakdown.baseScore).toBeCloseTo(result.comparison.weightedProvidedScore, 6)
    expect(result.layerBreakdown.finalScore).toBe(result.score)
    expect(result.layerBreakdown.layers.map((layer) => layer.id)).toEqual([
      'leader',
      'synergy',
      'chemistry',
      'readiness',
      'preferred-tags',
      'equipment',
      'party-cards',
      'context-adjustment',
    ])
  })

  it('routes case scoring through role-weighted resolution buckets instead of flat mirrored stats', () => {
    const techAgent = makeRoleWeightedAgent('tech')
    const negotiatorAgent = makeRoleWeightedAgent('negotiator')
    const supportHeavyCase = {
      ...createStartingState().cases['case-001'],
      preferredTags: [],
      difficulty: { combat: 0, investigation: 0, utility: 0, social: 40 },
      weights: { combat: 0, investigation: 0, utility: 0, social: 1 },
    }

    const techResult = computeTeamScore([techAgent], supportHeavyCase)
    const negotiatorResult = computeTeamScore([negotiatorAgent], supportHeavyCase)

    expect(negotiatorResult.score).toBeGreaterThan(techResult.score)
    expect(negotiatorResult.resolutionProfile.support).toBeGreaterThan(
      techResult.resolutionProfile.support
    )
  })

  it('support-only case scores deterministically higher with passive support ability', () => {
    const supportOnlyCase = {
      ...createStartingState().cases['case-001'],
      preferredTags: [],
      requiredTags: [],
      requiredRoles: [],
      tags: ['support', 'triage'],
      difficulty: { combat: 0, investigation: 0, utility: 0, social: 30 },
      weights: { combat: 0, investigation: 0, utility: 0, social: 1 },
    }
    const medicBase = makeRoleWeightedAgent('medic', {
      id: 'medic-base',
      abilities: [],
    })
    const medicWithAbility = makeRoleWeightedAgent('medic', {
      id: 'medic-support-passive',
      abilities: [
        {
          id: 'compassion-loop',
          label: 'Compassion Loop',
          type: 'passive',
          effect: { presence: 3 },
        },
      ],
    })

    const baseResult = computeTeamScore([medicBase], supportOnlyCase)
    const buffedResult = computeTeamScore([medicWithAbility], supportOnlyCase)

    expect(buffedResult.resolutionProfile.support).toBeGreaterThan(
      baseResult.resolutionProfile.support
    )
    expect(buffedResult.agentPerformance[0].support).toBeGreaterThan(
      baseResult.agentPerformance[0].support
    )
    expect(buffedResult.score).toBeGreaterThan(baseResult.score)
  })

  it('keeps passive support buffs self-only without aura spillover to teammates', () => {
    const supportCase = {
      ...createStartingState().cases['case-001'],
      preferredTags: [],
      requiredTags: [],
      requiredRoles: [],
      tags: ['support'],
      difficulty: { combat: 0, investigation: 0, utility: 0, social: 30 },
      weights: { combat: 0, investigation: 0, utility: 0, social: 1 },
    }
    const supportBase = makeRoleWeightedAgent('medic', {
      id: 'support-base',
      abilities: [],
      relationships: { 'teammate-anchor': 0 },
    })
    const supportBuffed = {
      ...supportBase,
      id: 'support-buffed',
      abilities: [
        {
          id: 'bedside-manner',
          label: 'Bedside Manner',
          type: 'passive' as const,
          effect: { presence: 4 },
        },
      ],
    }
    const teammateAnchor = makeRoleWeightedAgent('tech', {
      id: 'teammate-anchor',
      abilities: [],
      relationships: { 'support-base': 0, 'support-buffed': 0 },
    })

    const baselineTeam = computeTeamScore([supportBase, teammateAnchor], supportCase, {
      leaderId: teammateAnchor.id,
    })
    const buffedTeam = computeTeamScore([supportBuffed, teammateAnchor], supportCase, {
      leaderId: teammateAnchor.id,
    })
    const baselineTeammate = baselineTeam.agentPerformance.find(
      (entry) => entry.agentId === teammateAnchor.id
    )
    const buffedTeammate = buffedTeam.agentPerformance.find(
      (entry) => entry.agentId === teammateAnchor.id
    )

    expect(baselineTeammate).toBeDefined()
    expect(buffedTeammate).toBeDefined()
    expect(buffedTeammate?.support).toBeCloseTo(baselineTeammate?.support ?? 0, 6)
    expect(buffedTeammate?.effectivenessScore).toBeCloseTo(
      baselineTeammate?.effectivenessScore ?? 0,
      6
    )
    expect(buffedTeam.score).toBeGreaterThan(baselineTeam.score)
  })

  it('applies passive support stat buffs without requiring conditional support tags', () => {
    const nonSupportTaggedCase = {
      ...createStartingState().cases['case-001'],
      preferredTags: [],
      requiredTags: [],
      requiredRoles: [],
      tags: ['archive', 'paperwork'],
      difficulty: { combat: 0, investigation: 0, utility: 0, social: 25 },
      weights: { combat: 0, investigation: 0, utility: 0, social: 1 },
    }
    const baseAgent = makeRoleWeightedAgent('negotiator', {
      id: 'negotiator-base',
      abilities: [],
    })
    const passiveAgent = makeRoleWeightedAgent('negotiator', {
      id: 'negotiator-passive',
      abilities: [
        {
          id: 'composure-loop',
          label: 'Composure Loop',
          type: 'passive',
          effect: { presence: 5 },
        },
      ],
    })

    const baseResult = computeTeamScore([baseAgent], nonSupportTaggedCase)
    const passiveResult = computeTeamScore([passiveAgent], nonSupportTaggedCase)

    expect(passiveResult.agentPerformance[0].support).toBeGreaterThan(
      baseResult.agentPerformance[0].support
    )
    expect(passiveResult.score).toBeGreaterThan(baseResult.score)
  })

  it('reuses the team composition agent performance stream in case scoring', () => {
    const agents = [makeRoleWeightedAgent('hunter'), makeRoleWeightedAgent('medic')]
    const currentCase = {
      ...createStartingState().cases['case-001'],
      preferredTags: [],
    }

    const profile = buildAgentSquadCompositionProfile(agents, agents[0].id, [], {
      caseData: currentCase,
      leaderId: agents[0].id,
    })
    const result = computeTeamScore(agents, currentCase, {
      leaderId: agents[0].id,
    })

    expect(result.agentPerformance).toEqual(profile.agentPerformance)
    expect(result.performanceSummary).toEqual(profile.performanceSummary)
    expect(result.resolutionProfile).toEqual(profile.resolutionProfile)
  })

  it('surfaces active equipment kits and protocols in the readable team score reasons', () => {
    const state = createStartingState()
    const protocolState = buildAgencyProtocolState({
      ...state,
      agency: {
        ...state.agency,
        containmentRating: 90,
        clearanceLevel: 2,
        funding: 200,
        supportAvailable: 0,
      },
      containmentRating: 90,
      clearanceLevel: 2,
      funding: 200,
    })
    const agent = makeRoleWeightedAgent('tech', {
      id: 'agent-kit-protocol',
      tags: ['tech', 'analyst'],
      equipmentSlots: {
        primary: 'silver_rounds',
        armor: 'field_plate',
        utility: 'signal_jammers',
        utility2: 'emf_sensors',
      },
      equipment: {},
    })
    const caseInstance = {
      ...state.cases['case-001'],
      kind: 'raid' as const,
      preferredTags: [],
      requiredTags: [],
      tags: ['breach', 'combat', 'signal', 'analysis', 'evidence'],
      weights: { combat: 0.35, investigation: 0.25, utility: 0.3, social: 0.1 },
    }

    const result = computeTeamScore([agent], caseInstance, {
      protocolState,
    })

    expect(result.reasons).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Equipment kits:'),
        expect.stringContaining('Protocols:'),
      ])
    )
    expect(result.powerSummary.inventory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          itemId: 'field_plate',
          equippedCount: 1,
        }),
        expect.objectContaining({
          itemId: 'signal_jammers',
          equippedCount: 1,
        }),
      ])
    )
    expect(result.powerSummary.kits.map((kit) => kit.id)).toEqual(
      expect.arrayContaining(['breach-response-kit', 'investigation-survey-suite'])
    )
    expect(result.powerSummary.kits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'breach-response-kit',
          activeThresholds: [2],
          highestActiveThreshold: 2,
        }),
        expect.objectContaining({
          id: 'investigation-survey-suite',
          activeThresholds: [2],
          highestActiveThreshold: 2,
        }),
      ])
    )
    expect(result.powerSummary.protocols.map((protocol) => protocol.id)).toContain(
      'field-clearance-protocol'
    )
    expect(result.powerSummary.effectivenessMultiplier).toBeGreaterThanOrEqual(1)
    expect(result.powerImpactSummary).toMatchObject({
      activeEquipmentIds: expect.arrayContaining([
        'field_plate',
        'signal_jammers',
        'silver_rounds',
      ]),
      activeKitIds: expect.arrayContaining(['breach-response-kit', 'investigation-survey-suite']),
      activeProtocolIds: ['field-clearance-protocol'],
      equipmentContributionDelta: expect.any(Number),
      kitEffectivenessMultiplier: expect.any(Number),
      protocolEffectivenessMultiplier: expect.any(Number),
      notes: expect.arrayContaining([
        expect.stringContaining('Gear shifted contribution'),
        expect.stringContaining('Kits applied'),
        expect.stringContaining('Protocols shifted contribution'),
      ]),
    })
    expect(result.powerImpactSummary.equipmentContributionDelta).toBeGreaterThan(0)
    expect(result.powerImpactSummary.kitScoreDelta).toBeGreaterThan(0)
    expect(result.powerImpactSummary.protocolScoreDelta).toBeGreaterThan(0)
    expect(result.reasons.some((reason) => reason.includes('Breach Response Kit (2-piece)'))).toBe(
      true
    )
    expect(
      result.reasons.some((reason) => reason.includes('Investigation Survey Suite (2-piece)'))
    ).toBe(true)
    expect(result.reasons.some((reason) => reason.includes('Field Clearance Protocol'))).toBe(true)
  })

  it('layers gear, kits, and protocols on top of stable chemistry and synergy modifiers', () => {
    const state = createStartingState()
    const baseTech = makeRoleWeightedAgent('tech', {
      id: 'agent-tech-layer',
      tags: ['tech', 'analyst', 'scholar'],
      relationships: { 'agent-invest-layer': 2 },
      equipmentSlots: {},
      equipment: {},
    })
    const equippedTech = {
      ...baseTech,
      equipmentSlots: {
        utility1: 'signal_jammers',
        utility2: 'emf_sensors',
      },
      equipment: {},
    }
    const investigator = makeRoleWeightedAgent('investigator', {
      id: 'agent-invest-layer',
      relationships: { 'agent-tech-layer': 2 },
    })
    const caseInstance = {
      ...state.cases['case-001'],
      preferredTags: [],
      requiredTags: [],
      tags: ['analysis', 'evidence', 'signal'],
      weights: { combat: 0.1, investigation: 0.6, utility: 0.2, social: 0.1 },
    }
    const protocolState = buildAgencyProtocolState({
      ...state,
      agency: {
        ...state.agency,
        containmentRating: 72,
        clearanceLevel: 2,
        funding: 120,
        activeProtocolIds: ['field-clearance-protocol'],
        protocolSelectionLimit: 1,
        supportAvailable: 0,
      },
      containmentRating: 72,
      clearanceLevel: 2,
      funding: 120,
    })

    const baseResult = computeTeamScore([baseTech, investigator], caseInstance, {
      leaderId: baseTech.id,
    })
    const equippedResult = computeTeamScore([equippedTech, investigator], caseInstance, {
      leaderId: equippedTech.id,
    })
    const protocolResult = computeTeamScore([equippedTech, investigator], caseInstance, {
      leaderId: equippedTech.id,
      protocolState,
    })

    expect(baseResult.modifierBreakdown.synergyBonus).toBeGreaterThan(0)
    expect(baseResult.modifierBreakdown.chemistryBonus).toBeGreaterThan(0)
    expect(equippedResult.modifierBreakdown.synergyBonus).toBe(
      baseResult.modifierBreakdown.synergyBonus
    )
    expect(equippedResult.modifierBreakdown.chemistryBonus).toBe(
      baseResult.modifierBreakdown.chemistryBonus
    )
    expect(protocolResult.modifierBreakdown.synergyBonus).toBe(
      baseResult.modifierBreakdown.synergyBonus
    )
    expect(protocolResult.modifierBreakdown.chemistryBonus).toBe(
      baseResult.modifierBreakdown.chemistryBonus
    )

    expect(equippedResult.powerImpactSummary.activeEquipmentIds).toEqual(
      expect.arrayContaining(['signal_jammers', 'emf_sensors'])
    )
    expect(equippedResult.powerImpactSummary.activeKitIds).toContain('investigation-survey-suite')
    expect(equippedResult.powerImpactSummary.equipmentContributionDelta).toBeGreaterThan(0)
    expect(equippedResult.powerImpactSummary.kitEffectivenessMultiplier).toBeGreaterThan(1)

    expect(protocolResult.powerImpactSummary.activeProtocolIds).toContain(
      'field-clearance-protocol'
    )
    expect(protocolResult.powerImpactSummary.protocolScoreDelta).toBeGreaterThan(0)
    expect(equippedResult.score).toBeGreaterThan(baseResult.score)
    expect(protocolResult.score).toBeGreaterThan(equippedResult.score)
  })

  it('adds leadership, synergy, and readiness modifiers for multi-agent teams', () => {
    const agentA = makeRoleWeightedAgent('hunter', {
      id: 'agent-a',
      relationships: { 'agent-b': 2 },
    })
    const agentB = makeRoleWeightedAgent('medic', {
      id: 'agent-b',
      relationships: { 'agent-a': 2 },
    })
    const result = computeTeamScore(
      [agentA, agentB],
      {
        ...createStartingState().cases['case-001'],
        preferredTags: [],
      },
      {}
    )

    expect(result.modifierBreakdown.leaderBonus).toBeGreaterThan(0)
    expect(result.modifierBreakdown.synergyBonus).not.toBe(0)
    expect(result.modifierBreakdown.readinessBonus).toBeGreaterThan(0)
    expect(result.layerBreakdown.layers.find((layer) => layer.id === 'leader')?.delta).toBeCloseTo(
      result.modifierBreakdown.leaderBonus,
      6
    )
    expect(result.layerBreakdown.layers.find((layer) => layer.id === 'synergy')?.delta).toBeCloseTo(
      result.modifierBreakdown.synergyBonus,
      6
    )
    expect(
      result.layerBreakdown.layers.find((layer) => layer.id === 'readiness')?.delta
    ).toBeCloseTo(result.modifierBreakdown.readinessBonus, 6)
    expect(result.layerBreakdown.layers.reduce((sum, layer) => sum + layer.delta, 0)).toBeCloseTo(
      result.score - result.layerBreakdown.baseScore,
      6
    )
    expect(result.comparison.finalDelta).toBeCloseTo(
      result.score -
        computeRequiredScore(
          {
            ...createStartingState().cases['case-001'],
            preferredTags: [],
          },
          createStartingState().config
        ),
      6
    )
    expect(result.reasons.some((reason) => reason.startsWith('Leader bonus:'))).toBe(true)
  })

  it('builds a required bucket profile that preserves the existing scalar requirement score', () => {
    const state = createStartingState()
    const caseInstance = {
      ...state.cases['case-001'],
      stage: 3,
      durationWeeks: 4,
      difficulty: { combat: 12, investigation: 8, utility: 10, social: 6 },
      weights: { combat: 0.4, investigation: 0.3, utility: 0.2, social: 0.1 },
    }
    const config = {
      ...state.config,
      durationModel: 'attrition' as const,
      attritionPerWeek: 5,
    }

    const requiredProfile = computeRequiredResolutionProfile(caseInstance, config)
    const requiredScore = computeRequiredScore(caseInstance, config)

    expect(requiredProfile.fieldPower).toBeGreaterThan(0)
    expect(requiredProfile.containment).toBeGreaterThan(0)
    expect(requiredProfile.investigation).toBeGreaterThan(0)
    expect(requiredProfile.support).toBeGreaterThan(0)
    expect(requiredScore).toBeGreaterThan(0)
    expect(requiredScore).toBeCloseTo(
      requiredProfile.fieldPower * 0.4 +
        requiredProfile.investigation * 0.3 +
        requiredProfile.containment * 0.2 +
        requiredProfile.support * 0.1,
      6
    )
  })

  it('compares provided buckets against case demands axis by axis', () => {
    const state = createStartingState()
    const caseInstance = {
      ...state.cases['case-001'],
      stage: 2,
      difficulty: { combat: 60, investigation: 45, utility: 25, social: 20 },
      weights: { combat: 0.4, investigation: 0.3, utility: 0.2, social: 0.1 },
    }
    const result = computeTeamScore(
      [makeRoleWeightedAgent('hunter'), makeRoleWeightedAgent('investigator')],
      caseInstance,
      { config: state.config }
    )
    const comparison = compareResolutionAgainstCase(
      result.comparison.providedProfile,
      caseInstance,
      result.comparison.nonAxisModifierTotal,
      state.config
    )

    expect(comparison.axisAssessments.fieldPower).toMatchObject({
      provided: expect.any(Number),
      required: expect.any(Number),
      delta: expect.any(Number),
      weight: 0.4,
    })
    expect(comparison.axisAssessments.containment.weight).toBe(0.2)
    expect(comparison.axisAssessments.investigation.weight).toBe(0.3)
    expect(comparison.axisAssessments.support.weight).toBe(0.1)
    expect(comparison.metAxes.length + comparison.unmetAxes.length).toBe(4)
    expect(comparison.finalDelta).toBeCloseTo(
      result.score - computeRequiredScore(caseInstance, state.config),
      6
    )
  })

  it('changes team score when leader selection changes for the same squad', () => {
    const strongLeader = makeRoleWeightedAgent('negotiator', {
      id: 'leader-strong',
      relationships: { 'leader-weak': 2 },
      stats: makeDomainStats({
        tactical: { awareness: 72, reaction: 72 },
        cognitive: { analysis: 70, investigation: 70 },
        social: { negotiation: 88, influence: 88 },
        stability: { resistance: 82, tolerance: 82 },
      }),
    })
    const weakLeader = makeRoleWeightedAgent('hunter', {
      id: 'leader-weak',
      relationships: { 'leader-strong': 2 },
      stats: makeDomainStats({
        physical: { strength: 86, endurance: 86 },
        tactical: { awareness: 26, reaction: 26 },
        cognitive: { analysis: 22, investigation: 22 },
        social: { negotiation: 14, influence: 14 },
        stability: { resistance: 18, tolerance: 18 },
      }),
    })
    const caseInstance = {
      ...createStartingState().cases['case-001'],
      preferredTags: [],
    }

    const strongLeaderResult = computeTeamScore([strongLeader, weakLeader], caseInstance, {
      leaderId: 'leader-strong',
    })
    const weakLeaderResult = computeTeamScore([strongLeader, weakLeader], caseInstance, {
      leaderId: 'leader-weak',
    })

    expect(strongLeaderResult.resolutionProfile).toEqual(weakLeaderResult.resolutionProfile)
    expect(strongLeaderResult.score).toBeGreaterThan(weakLeaderResult.score)
    expect(strongLeaderResult.modifierBreakdown.leaderEffectivenessMultiplier).toBeGreaterThan(
      weakLeaderResult.modifierBreakdown.leaderEffectivenessMultiplier
    )
  })

  it('adds attrition duration to the required score when attrition mode is active', () => {
    const state = createStartingState()
    const caseInstance = {
      ...state.cases['case-001'],
      stage: 2,
      durationWeeks: 3,
      difficulty: { combat: 10, investigation: 0, utility: 0, social: 0 },
      weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
    }

    const required = computeRequiredScore(caseInstance, {
      ...state.config,
      durationModel: 'attrition',
      attritionPerWeek: 4,
    })

    expect(required).toBeCloseTo(33.5, 6)
  })

  it('keeps required score unchanged by duration in capacity mode', () => {
    const state = createStartingState()
    const caseInstance = {
      ...state.cases['case-001'],
      stage: 2,
      durationWeeks: 3,
      difficulty: { combat: 10, investigation: 0, utility: 0, social: 0 },
      weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
    }

    const capacityRequired = computeRequiredScore(caseInstance, {
      ...state.config,
      durationModel: 'capacity',
      attritionPerWeek: 4,
    })
    const attritionRequired = computeRequiredScore(caseInstance, {
      ...state.config,
      durationModel: 'attrition',
      attritionPerWeek: 4,
    })

    expect(capacityRequired).toBeCloseTo(21.5, 6)
    expect(attritionRequired - capacityRequired).toBeCloseTo(12, 6)
  })

  it('calculates weekly score from all report outcomes', () => {
    expect(
      calcWeekScore({
        week: 1,
        rngStateBefore: 1,
        rngStateAfter: 2,
        newCases: [],
        progressedCases: [],
        resolvedCases: ['case-001'],
        failedCases: ['case-002'],
        partialCases: ['case-003'],
        unresolvedTriggers: ['case-004', 'case-005'],
        spawnedCases: [],
        maxStage: 1,
        avgFatigue: 0,
        teamStatus: [],
        notes: [],
      })
    ).toBe(100 - 30 - 10 - 100)
  })

  it('keeps default scoring-system config behavior stable', () => {
    const defaults = createDefaultScoringSystemConfig()

    expect(defaults.resolvePoints).toBe(100)
    expect(defaults.unresolvedPenalty).toBe(-50)
    expect(defaults.failPenalty).toBe(-30)
    expect(defaults.partialPenalty).toBe(-10)
    expect(defaults.preferredTagBonusPerHit).toBe(1)
    expect(defaults.maxEquipmentStack).toBe(2)
    expect(defaults.multiAgentReadinessBaseline).toBe(50)
    expect(defaults.minSuccessChance).toBe(0.05)
    expect(defaults.maxSuccessChance).toBe(0.95)
    expect(defaults.nearMissPartialChance).toBe(0.7)
    expect(defaults.leaderEventChanceRate).toBe(0.08)
    expect(defaults.equipmentSupportRules.length).toBeGreaterThan(0)
  })

  it('sanitizes scoring-system config overrides and applies them to weekly score', () => {
    const sanitized = sanitizeScoringSystemConfig({
      minSuccessChance: 0.9,
      maxSuccessChance: 0.1,
      maxEquipmentStack: 0,
      multiAgentReadinessBaseline: 500,
      nearMissPartialChance: 2,
      resolvePoints: 200,
      unresolvedPenalty: -20,
      failPenalty: -5,
      partialPenalty: -2,
    })

    expect(sanitized.minSuccessChance).toBe(0.9)
    expect(sanitized.maxSuccessChance).toBe(0.9)
    expect(sanitized.maxEquipmentStack).toBe(1)
    expect(sanitized.multiAgentReadinessBaseline).toBe(100)
    expect(sanitized.nearMissPartialChance).toBe(1)

    const score = calcWeekScore(
      {
        week: 1,
        rngStateBefore: 1,
        rngStateAfter: 2,
        newCases: [],
        progressedCases: [],
        resolvedCases: ['case-001'],
        failedCases: ['case-002'],
        partialCases: ['case-003'],
        unresolvedTriggers: ['case-004', 'case-005'],
        spawnedCases: [],
        maxStage: 1,
        avgFatigue: 0,
        teamStatus: [],
        notes: [],
      },
      sanitized
    )

    expect(score).toBe(200 - 5 - 2 - 40)
  })
})
