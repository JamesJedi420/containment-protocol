// cspell:words cooldown medkits unslotted
import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { formatAbilityTrigger, resolveAbilityEffect } from '../domain/abilities'
import { deriveDomainStatsFromBase } from '../domain/agentDefaults'
import { effectiveStats } from '../domain/agent/evaluation'
import {
  applyEquipmentModifiers,
  resolveAgentEquipmentModifiers,
  resolveEquippedItems,
} from '../domain/equipment'
import {
  buildAgentDomainProfile,
  buildAgentLegacyPerformanceProfile,
  buildAgentWeightedPerformanceProfile,
  evaluateAgent,
  evaluateAgentBreakdown,
  normalizeAgentCasePerformanceWeights,
  normalizeAgentPerformanceBuckets,
} from '../domain/evaluateAgent'
import {
  buildCaseDomainWeights,
  buildContextualRoleDomainWeights,
  STAT_DOMAIN_DEFINITIONS,
  getRoleDomainWeights,
} from '../domain/statDomains'
import { buildAgencyProtocolState } from '../domain/protocols'
import { computeTeamScore } from '../domain/sim/scoring'
import { buildAgentSquadCompositionProfile } from '../domain/teamSimulation'
import type { Agent, AgentRole, CaseInstance, DomainStats } from '../domain/models'

const DOMAIN_KEYS = ['field', 'resilience', 'control', 'insight', 'presence', 'anomaly'] as const

function makeDomainStats(overrides: Partial<DomainStats> = {}): DomainStats {
  return {
    physical: { strength: 10, endurance: 20, ...(overrides.physical ?? {}) },
    tactical: { awareness: 30, reaction: 40, ...(overrides.tactical ?? {}) },
    cognitive: { analysis: 50, investigation: 60, ...(overrides.cognitive ?? {}) },
    social: { negotiation: 70, influence: 80, ...(overrides.social ?? {}) },
    stability: { resistance: 90, tolerance: 100, ...(overrides.stability ?? {}) },
    technical: { equipment: 110, anomaly: 120, ...(overrides.technical ?? {}) },
  }
}

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    ...createStartingState().agents.a_ava,
    id: 'agent-test',
    name: 'Agent Test',
    role: 'tech',
    baseStats: { combat: 20, investigation: 30, utility: 40, social: 50 },
    stats: makeDomainStats(),
    tags: ['tech', 'analyst'],
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
    id: 'case-test',
    templateId: 'case-test-template',
    difficulty: { combat: 0, investigation: 0, utility: 0, social: 0 },
    weights: { combat: 0, investigation: 0, utility: 0, social: 0 },
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

describe('agent evaluation contract', () => {
  it('maps base stats into the shared domain layout', () => {
    expect(
      deriveDomainStatsFromBase({ combat: 11, investigation: 22, utility: 33, social: 44 })
    ).toEqual({
      physical: { strength: 11, endurance: 22 },
      tactical: { awareness: 17, reaction: 33 },
      cognitive: { analysis: 22, investigation: 22 },
      social: { negotiation: 44, influence: 44 },
      stability: { resistance: 33, tolerance: 39 },
      technical: { equipment: 33, anomaly: 28 },
    })
  })

  it('keeps the evaluation domain set stable for compatibility consumers', () => {
    const result = computeTeamScore([makeAgent()], makeCase())

    expect(Object.keys(result.agentPerformance[0].contributionByDomain)).toEqual(DOMAIN_KEYS)
  })

  it('produces canonical agent performance buckets from the evaluator', () => {
    const agent = makeAgent({
      role: 'tech',
      equipmentSlots: { utility: 'signal_jammers' },
      traits: [
        {
          id: 'systems-savant',
          label: 'Systems Savant',
          modifiers: { technical: 6, overall: 1 },
        },
      ],
    })
    const currentCase = makeCase({
      tags: ['signal', 'tech'],
      weights: { combat: 1, investigation: 1, utility: 1, social: 1 },
    })

    const breakdown = evaluateAgentBreakdown(agent, { caseData: currentCase })

    expect(breakdown.performance.fieldPower).toBeGreaterThan(0)
    expect(breakdown.performance.containment).toBeGreaterThan(0)
    expect(breakdown.performance.investigation).toBeGreaterThan(0)
    expect(breakdown.performance.support).toBeGreaterThan(0)
    expect(breakdown.performance.stressImpact).toBeGreaterThanOrEqual(0)
    expect(breakdown.performance.contribution).toBeGreaterThan(0)
    expect(breakdown.performance.threatHandled).toBeGreaterThanOrEqual(0)
    expect(breakdown.performance.damageTaken).toBeGreaterThanOrEqual(0)
    expect(breakdown.performance.healingPerformed).toBeGreaterThanOrEqual(0)
    expect(breakdown.performance.evidenceGathered).toBeGreaterThanOrEqual(0)
    expect(breakdown.performance.containmentActionsCompleted).toBeGreaterThanOrEqual(0)
  })

  it('exposes explicit derived evaluation profiles from the canonical evaluator', () => {
    const agent = makeAgent({
      role: 'tech',
      equipment: { signal_jammers: 1 },
      equipmentSlots: { utility: 'signal_jammers' },
    })
    const currentCase = makeCase({
      tags: ['signal', 'tech'],
      weights: { combat: 0.1, investigation: 0.25, utility: 0.5, social: 0.15 },
    })

    const breakdown = evaluateAgentBreakdown(agent, { caseData: currentCase })

    expect(breakdown.derived.domainProfile).toEqual(
      buildAgentDomainProfile(breakdown.effectiveStats)
    )
    expect(breakdown.derived.legacyPerformanceProfile).toEqual(
      buildAgentLegacyPerformanceProfile(breakdown.derived.domainProfile)
    )
    expect(breakdown.derived.weightedPerformanceProfile).toEqual(
      buildAgentWeightedPerformanceProfile(
        breakdown.contributionByDomain,
        breakdown.traitBonus,
        breakdown.performanceBlend.equipmentLoad
      )
    )
    expect(breakdown.derived.normalizedWeightedPerformanceProfile).toEqual(
      normalizeAgentPerformanceBuckets(
        breakdown.derived.weightedPerformanceProfile,
        Math.max(
          0,
          Object.values(breakdown.derived.legacyPerformanceProfile).reduce(
            (sum, value) => sum + value,
            0
          ) +
            breakdown.traitBonus +
            1.5
        )
      )
    )
    expect(breakdown.derived.casePerformanceWeights).toEqual(
      normalizeAgentCasePerformanceWeights({
        fieldPower: currentCase.weights.combat,
        containment: currentCase.weights.utility,
        investigation: currentCase.weights.investigation,
        support: currentCase.weights.social,
      })
    )
    expect(breakdown.scoreBreakdown.preEffectivenessScore).toBeCloseTo(
      breakdown.scoreBreakdown.baseDomainScore + breakdown.scoreBreakdown.traitBonus,
      2
    )
    expect(breakdown.scoreBreakdown.finalScore).toBe(breakdown.score)
    expect(breakdown.scoreBreakdown.finalScore).toBeCloseTo(
      Number(
        (
          breakdown.scoreBreakdown.preEffectivenessScore *
          breakdown.scoreBreakdown.effectivenessMultiplier
        ).toFixed(2)
      ),
      2
    )
    expect(breakdown.performanceBlend.blendedTotal).toBeCloseTo(
      breakdown.performance.fieldPower +
        breakdown.performance.containment +
        breakdown.performance.investigation +
        breakdown.performance.support,
      2
    )
  })

  it('uses canonical agent performance output in team simulation', () => {
    const agent = makeAgent({
      role: 'hunter',
      equipmentSlots: { primary: 'silver_rounds' },
    })
    const currentCase = makeCase({
      tags: ['combat'],
      weights: { combat: 1, investigation: 1, utility: 1, social: 1 },
    })
    const breakdown = evaluateAgentBreakdown(agent, { caseData: currentCase })
    const profile = buildAgentSquadCompositionProfile([agent], agent.id, [], {
      caseData: currentCase,
      leaderId: agent.id,
    })

    expect(profile.resolutionProfile).toEqual({
      fieldPower: breakdown.performance.fieldPower,
      containment: breakdown.performance.containment,
      investigation: breakdown.performance.investigation,
      support: breakdown.performance.support,
    })
    expect(profile.agentPerformance).toEqual([
      expect.objectContaining({
        agentId: agent.id,
        fieldPower: breakdown.performance.fieldPower,
        containment: breakdown.performance.containment,
        investigation: breakdown.performance.investigation,
        support: breakdown.performance.support,
        stressImpact: breakdown.performance.stressImpact,
        contribution: breakdown.performance.contribution,
        threatHandled: breakdown.performance.threatHandled,
        damageTaken: breakdown.performance.damageTaken,
        healingPerformed: breakdown.performance.healingPerformed,
        evidenceGathered: breakdown.performance.evidenceGathered,
        containmentActionsCompleted: breakdown.performance.containmentActionsCompleted,
        effectivenessScore: Number(breakdown.score.toFixed(2)),
      }),
    ])
    expect(profile.derivedStats.fieldPower).toBe(Math.round(breakdown.performance.fieldPower))
    expect(profile.derivedStats.containment).toBe(Math.round(breakdown.performance.containment))
    expect(profile.derivedStats.investigation).toBe(Math.round(breakdown.performance.investigation))
    expect(profile.derivedStats.support).toBe(Math.round(breakdown.performance.support))
  })

  it('derives role weights from the canonical domain definition registry', () => {
    expect(STAT_DOMAIN_DEFINITIONS.map((definition) => definition.name)).toEqual(DOMAIN_KEYS)

    const roles: AgentRole[] = [
      'hunter',
      'occultist',
      'investigator',
      'medium',
      'tech',
      'medic',
      'negotiator',
    ]

    for (const role of roles) {
      const weights = getRoleDomainWeights(role)
      const registryTotal = STAT_DOMAIN_DEFINITIONS.reduce(
        (sum, definition) => sum + definition.weightByRole[role],
        0
      )

      expect(Object.keys(weights)).toEqual(DOMAIN_KEYS)
      expect(registryTotal).toBeCloseTo(1, 6)
      expect(Object.values(weights).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 6)
    }
  })

  it('weights the same domain stats differently by role', () => {
    const stats = makeDomainStats()
    const techAgent = makeAgent({ id: 'agent-tech', role: 'tech', stats })
    const negotiatorAgent = makeAgent({ id: 'agent-negotiator', role: 'negotiator', stats })
    const result = computeTeamScore([techAgent, negotiatorAgent], makeCase())

    const techPerformance = result.agentPerformance.find((entry) => entry.agentId === techAgent.id)
    const negotiatorPerformance = result.agentPerformance.find(
      (entry) => entry.agentId === negotiatorAgent.id
    )

    expect(techPerformance).toBeDefined()
    expect(negotiatorPerformance).toBeDefined()
    expect(techPerformance?.contributionByDomain).not.toEqual(
      negotiatorPerformance?.contributionByDomain
    )
    expect(techPerformance?.contributionByDomain.control).toBeGreaterThan(
      techPerformance?.contributionByDomain.field ?? 0
    )
    expect(negotiatorPerformance?.contributionByDomain.presence).toBeGreaterThan(
      negotiatorPerformance?.contributionByDomain.field ?? 0
    )
  })

  it('derives deterministic domain pressure from case demands and tags', () => {
    const occultContainmentCase = makeCase({
      kind: 'raid',
      durationWeeks: 4,
      weights: { combat: 0.1, investigation: 0.2, utility: 0.55, social: 0.15 },
      tags: ['anomaly', 'containment', 'ritual'],
      requiredTags: ['ward'],
      preferredTags: ['hazmat'],
    })

    const weights = buildCaseDomainWeights(occultContainmentCase)

    expect(Object.values(weights).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 6)
    expect(weights.control).toBeGreaterThan(weights.field)
    expect(weights.anomaly).toBeGreaterThan(weights.presence)
    expect(weights.resilience).toBeGreaterThan(0)
  })

  it('blends role identity with case pressure instead of using a flat role-only profile', () => {
    const witnessHeavyCase = makeCase({
      durationWeeks: 1,
      weights: { combat: 0.05, investigation: 0.3, utility: 0.05, social: 0.6 },
      tags: ['witness', 'interview'],
    })

    const roleWeights = getRoleDomainWeights('investigator')
    const contextualWeights = buildContextualRoleDomainWeights('investigator', witnessHeavyCase)

    expect(Object.values(contextualWeights).reduce((sum, value) => sum + value, 0)).toBeCloseTo(
      1,
      6
    )
    expect(contextualWeights.presence).toBeGreaterThan(roleWeights.presence)
    expect(contextualWeights.field).toBeLessThan(roleWeights.field)
    expect(contextualWeights.insight).toBeGreaterThan(0)
  })

  it('shifts evaluator weights toward long-duration resilience pressure', () => {
    const baseAgent = makeAgent({ role: 'hunter' })
    const shortCase = makeCase({
      durationWeeks: 1,
      weights: { combat: 0.5, investigation: 0.2, utility: 0.2, social: 0.1 },
      tags: ['breach'],
    })
    const longCase = makeCase({
      durationWeeks: 5,
      weights: { combat: 0.5, investigation: 0.2, utility: 0.2, social: 0.1 },
      tags: ['breach', 'survival', 'exposure'],
    })

    const shortBreakdown = evaluateAgentBreakdown(baseAgent, { caseData: shortCase })
    const longBreakdown = evaluateAgentBreakdown(baseAgent, { caseData: longCase })

    expect(longBreakdown.weights.resilience).toBeGreaterThan(shortBreakdown.weights.resilience)
    expect(longBreakdown.weights.field).toBeLessThan(shortBreakdown.weights.field)
  })

  it('applies conditional trait modifiers through the evaluator and scoring pipeline when context matches', () => {
    const matchingCase = makeCase({
      tags: ['signal', 'tech'],
      weights: { combat: 1, investigation: 1, utility: 1, social: 1 },
    })
    const baseAgent = makeAgent({ role: 'tech', traits: [] })
    const traitAgent = makeAgent({
      role: 'tech',
      traits: [
        {
          id: 'systems-savant',
          label: 'Systems Savant',
          modifiers: {
            technical: 10,
            overall: 2,
          },
        },
      ],
    })

    const baseBreakdown = evaluateAgentBreakdown(baseAgent, { caseData: matchingCase })
    const traitBreakdown = evaluateAgentBreakdown(traitAgent, { caseData: matchingCase })
    const baseScore = computeTeamScore([baseAgent], matchingCase)
    const traitScore = computeTeamScore([traitAgent], matchingCase)

    expect(evaluateAgent(traitAgent, { caseData: matchingCase })).toBe(traitBreakdown.score)
    expect(traitBreakdown.score).toBeGreaterThan(baseBreakdown.score)
    expect(traitBreakdown.contributionByDomain.control).toBeGreaterThan(
      baseBreakdown.contributionByDomain.control
    )
    expect(traitBreakdown.effectiveStats.technical.equipment).toBeGreaterThan(
      baseBreakdown.effectiveStats.technical.equipment
    )
    expect(traitScore.score).toBeGreaterThan(baseScore.score)
    expect(traitScore.agentPerformance[0].effectivenessScore).toBeGreaterThan(
      baseScore.agentPerformance[0].effectivenessScore
    )
  })

  it('does not apply conditional trait modifiers without matching scoring context', () => {
    const nonMatchingCase = makeCase({
      tags: ['diplomatic', 'paperwork'],
      weights: { combat: 1, investigation: 1, utility: 1, social: 1 },
    })
    const baseAgent = makeAgent({ role: 'tech', traits: [] })
    const traitAgent = makeAgent({
      role: 'tech',
      traits: [
        {
          id: 'ward-specialist',
          label: 'Ward Specialist',
          modifiers: {
            stability: 10,
            technical: 10,
          },
        },
      ],
    })

    const baseBreakdown = evaluateAgentBreakdown(baseAgent, { caseData: nonMatchingCase })
    const traitBreakdown = evaluateAgentBreakdown(traitAgent, { caseData: nonMatchingCase })
    const baseScore = computeTeamScore([baseAgent], nonMatchingCase)
    const traitScore = computeTeamScore([traitAgent], nonMatchingCase)

    expect(traitBreakdown.score).toBe(baseBreakdown.score)
    expect(traitBreakdown.contributionByDomain).toEqual(baseBreakdown.contributionByDomain)
    expect(traitScore.score).toBe(baseScore.score)
    expect(traitScore.agentPerformance).toEqual(baseScore.agentPerformance)
  })

  it('applies long-assignment trait multipliers dynamically during evaluation', () => {
    const longCase = makeCase({
      durationWeeks: 4,
      weights: { combat: 1, investigation: 1, utility: 1, social: 1 },
    })
    const shortCase = makeCase({
      durationWeeks: 1,
      weights: { combat: 1, investigation: 1, utility: 1, social: 1 },
    })
    const baseAgent = makeAgent({ role: 'hunter', traits: [] })
    const traitAgent = makeAgent({
      role: 'hunter',
      traits: [
        {
          id: 'marathon-runner',
          label: 'Marathon Runner',
          description: 'Keeps pace through extended operations.',
          modifiers: {},
        },
      ],
    })

    const baseLong = evaluateAgentBreakdown(baseAgent, { caseData: longCase })
    const traitLong = evaluateAgentBreakdown(traitAgent, { caseData: longCase })
    const baseShort = evaluateAgentBreakdown(baseAgent, { caseData: shortCase })
    const traitShort = evaluateAgentBreakdown(traitAgent, { caseData: shortCase })

    expect(traitLong.traitEffects.effectivenessMultiplier).toBeCloseTo(1.1, 6)
    expect(traitLong.score).toBeGreaterThan(baseLong.score)
    expect(traitLong.performance.fieldPower).toBeGreaterThan(baseLong.performance.fieldPower)
    expect(traitShort.score).toBe(baseShort.score)
    expect(traitShort.performance).toEqual(baseShort.performance)
  })

  it('applies witness-facing trait modifiers dynamically during scoring', () => {
    const witnessCase = makeCase({
      tags: ['witness', 'interview'],
      weights: { combat: 0.05, investigation: 0.45, utility: 0.1, social: 0.4 },
    })
    const baseAgent = makeAgent({ role: 'negotiator', traits: [] })
    const traitAgent = makeAgent({
      role: 'negotiator',
      traits: [
        {
          id: 'cold-reader',
          label: 'Cold Reader',
          description: 'Reads witness pressure and tells quickly.',
          modifiers: {},
        },
      ],
    })

    const baseBreakdown = evaluateAgentBreakdown(baseAgent, { caseData: witnessCase })
    const traitBreakdown = evaluateAgentBreakdown(traitAgent, { caseData: witnessCase })

    expect(traitBreakdown.traitEffects.effectivenessMultiplier).toBeCloseTo(1.05, 6)
    expect(traitBreakdown.effectiveStats.social.negotiation).toBeGreaterThan(
      baseBreakdown.effectiveStats.social.negotiation
    )
    expect(traitBreakdown.contributionByDomain.presence).toBeGreaterThan(
      baseBreakdown.contributionByDomain.presence
    )
    expect(traitBreakdown.performance.support).toBeGreaterThan(baseBreakdown.performance.support)
  })

  it('applies anomaly stress-resistance traits dynamically during evaluation', () => {
    const anomalyCase = makeCase({
      tags: ['occult', 'anomaly'],
      weights: { combat: 0.05, investigation: 0.35, utility: 0.35, social: 0.25 },
    })
    const baseAgent = makeAgent({ role: 'medium', fatigue: 35, traits: [] })
    const scarredAgent = makeAgent({
      role: 'medium',
      fatigue: 35,
      traits: [
        {
          id: 'occult-scar',
          label: 'Occult Scar',
          description: 'Exposure hardened the mind but left recovery scars.',
          modifiers: {},
        },
      ],
    })

    const baseBreakdown = evaluateAgentBreakdown(baseAgent, { caseData: anomalyCase })
    const scarredBreakdown = evaluateAgentBreakdown(scarredAgent, { caseData: anomalyCase })

    expect(scarredBreakdown.traitEffects.stressImpactMultiplier).toBeCloseTo(0.82, 6)
    expect(scarredBreakdown.performance.stressImpact).toBeLessThan(
      baseBreakdown.performance.stressImpact
    )
    expect(scarredBreakdown.contributionByDomain.anomaly).toBeGreaterThan(
      baseBreakdown.contributionByDomain.anomaly
    )
  })

  it('applies passive ability modifiers in canonical effective stats and evaluator breakdown', () => {
    const baseAgent = makeAgent({ role: 'tech', abilities: [] })
    const abilityAgent = makeAgent({
      role: 'tech',
      abilities: [
        {
          id: 'signal-overclock',
          label: 'Signal Overclock',
          type: 'passive',
          effect: {
            technical: 8,
            overall: 1,
          },
        },
      ],
    })

    const baseEffective = effectiveStats(baseAgent)
    const abilityEffective = effectiveStats(abilityAgent)
    const baseBreakdown = evaluateAgentBreakdown(baseAgent)
    const abilityBreakdown = evaluateAgentBreakdown(abilityAgent)

    expect(abilityEffective.technical.equipment).toBeGreaterThan(baseEffective.technical.equipment)
    expect(abilityBreakdown.effectiveStats.technical.equipment).toBeGreaterThan(
      baseBreakdown.effectiveStats.technical.equipment
    )
    expect(abilityBreakdown.score).toBeGreaterThan(baseBreakdown.score)
  })

  it('passive support ability increases support performance in team scoring', () => {
    const supportCase = makeCase({
      tags: ['medical', 'support'],
      weights: { combat: 0, investigation: 0, utility: 0, social: 1 },
      difficulty: { combat: 0, investigation: 0, utility: 0, social: 40 },
    })
    const baseAgent = makeAgent({ role: 'medic', abilities: [] })
    const supportAgent = makeAgent({
      role: 'medic',
      abilities: [
        {
          id: 'bedside-manner',
          label: 'Bedside Manner',
          type: 'passive',
          effect: { presence: 4, resilience: 1 },
        },
      ],
    })

    const baseBreakdown = evaluateAgentBreakdown(baseAgent, { caseData: supportCase })
    const supportBreakdown = evaluateAgentBreakdown(supportAgent, { caseData: supportCase })
    const baseTeamScore = computeTeamScore([baseAgent], supportCase)
    const supportTeamScore = computeTeamScore([supportAgent], supportCase)

    expect(supportBreakdown.performance.support).toBeGreaterThan(baseBreakdown.performance.support)
    expect(supportTeamScore.resolutionProfile.support).toBeGreaterThan(
      baseTeamScore.resolutionProfile.support
    )
    expect(supportTeamScore.score).toBeGreaterThan(baseTeamScore.score)
  })

  it('applies conditional passive ability multipliers during matching case evaluation', () => {
    const anomalyCase = makeCase({
      tags: ['anomaly', 'containment', 'ritual'],
      weights: { combat: 0.1, investigation: 0.2, utility: 0.55, social: 0.15 },
    })
    const baseAgent = makeAgent({ role: 'occultist', fatigue: 35, abilities: [] })
    const abilityAgent = makeAgent({
      role: 'occultist',
      fatigue: 35,
      abilities: [
        {
          id: 'ward-hum',
          label: 'Ward Hum',
          type: 'passive',
          effect: { control: 2 },
        },
      ],
    })

    const baseBreakdown = evaluateAgentBreakdown(baseAgent, { caseData: anomalyCase })
    const abilityBreakdown = evaluateAgentBreakdown(abilityAgent, { caseData: anomalyCase })

    expect(abilityBreakdown.abilityEffects.stressImpactMultiplier).toBeCloseTo(0.9, 6)
    expect(abilityBreakdown.abilityEffects.effectivenessMultiplier).toBe(1)
    expect(abilityBreakdown.performance.stressImpact).toBeLessThan(
      baseBreakdown.performance.stressImpact
    )
    expect(abilityBreakdown.performance.containment).toBeGreaterThan(
      baseBreakdown.performance.containment
    )
  })

  it('supports passive ability recovery effects without activating active abilities', () => {
    const ability = {
      id: 'triage-rhythm',
      label: 'Triage Rhythm',
      type: 'passive' as const,
      effect: { overall: 1 },
    }
    const agent = makeAgent({
      abilities: [ability],
    })

    const recoveryEffect = resolveAbilityEffect(ability, {
      agent,
      phase: 'recovery',
    })

    expect(recoveryEffect.activeInMvp).toBe(true)
    expect(recoveryEffect.moraleRecoveryDelta).toBe(4)
    expect(recoveryEffect.modifiers).toEqual({ overall: 1 })
  })

  it('combines trait and passive ability multipliers through one modifier stack', () => {
    const longCase = makeCase({
      durationWeeks: 4,
      tags: ['signal', 'tech'],
      weights: { combat: 0.15, investigation: 0.35, utility: 0.35, social: 0.15 },
    })
    const traitOnlyAgent = makeAgent({
      role: 'tech',
      traits: [
        {
          id: 'marathon-runner',
          label: 'Marathon Runner',
          modifiers: {},
        },
      ],
      abilities: [],
    })
    const stackedAgent = makeAgent({
      role: 'tech',
      traits: [
        {
          id: 'marathon-runner',
          label: 'Marathon Runner',
          modifiers: {},
        },
      ],
      abilities: [
        {
          id: 'sustained-focus',
          label: 'Sustained Focus',
          type: 'passive',
          effect: {},
        },
      ],
    })

    const traitOnlyBreakdown = evaluateAgentBreakdown(traitOnlyAgent, { caseData: longCase })
    const stackedBreakdown = evaluateAgentBreakdown(stackedAgent, { caseData: longCase })

    expect(traitOnlyBreakdown.traitEffects.effectivenessMultiplier).toBeCloseTo(1.1, 6)
    expect(stackedBreakdown.abilityEffects.effectivenessMultiplier).toBeCloseTo(1.05, 6)
    expect(stackedBreakdown.modifierEffects.effectivenessMultiplier).toBeCloseTo(1.155, 6)
    expect(stackedBreakdown.score).toBeGreaterThan(traitOnlyBreakdown.score)
  })

  it('applies slotted equipment modifiers through canonical effective stats and scoring', () => {
    const caseInstance = makeCase({
      tags: ['signal', 'tech'],
      weights: { combat: 1, investigation: 1, utility: 1, social: 1 },
    })
    const baseAgent = makeAgent({
      role: 'tech',
      equipmentSlots: {},
      equipment: {},
    })
    const equippedAgent = makeAgent({
      role: 'tech',
      equipmentSlots: { utility: 'signal_jammers' },
      equipment: {},
    })

    const baseEffective = effectiveStats(baseAgent)
    const equippedEffective = effectiveStats(equippedAgent)
    const baseBreakdown = evaluateAgentBreakdown(baseAgent, { caseData: caseInstance })
    const equippedBreakdown = evaluateAgentBreakdown(equippedAgent, { caseData: caseInstance })
    const baseScore = computeTeamScore([baseAgent], caseInstance)
    const equippedScore = computeTeamScore([equippedAgent], caseInstance)

    expect(equippedEffective.cognitive.analysis).toBeGreaterThan(baseEffective.cognitive.analysis)
    expect(equippedBreakdown.score).toBeGreaterThan(baseBreakdown.score)
    expect(equippedScore.score).toBeGreaterThan(baseScore.score)
    expect(equippedScore.agentPerformance[0].containment).toBeGreaterThan(
      baseScore.agentPerformance[0].containment
    )
    expect(equippedScore.agentPerformance[0].support).toBeGreaterThan(
      baseScore.agentPerformance[0].support
    )
  })

  it('uses fixed item stat blocks and ignores per-agent quality drift', () => {
    const baseAgent = makeAgent({
      role: 'hunter',
      equipmentSlots: { primary: 'silver_rounds' },
      equipment: {},
    })
    const driftedAgent = makeAgent({
      role: 'hunter',
      equipmentSlots: { primary: 'silver_rounds' },
      equipment: { silver_rounds: 2 },
    })

    const baseEffective = effectiveStats(baseAgent)
    const driftedEffective = effectiveStats(driftedAgent)
    const baseBreakdown = evaluateAgentBreakdown(baseAgent)
    const driftedBreakdown = evaluateAgentBreakdown(driftedAgent)

    expect(driftedEffective).toEqual(baseEffective)
    expect(driftedBreakdown.score).toBe(baseBreakdown.score)
    expect(driftedBreakdown.performance).toEqual(baseBreakdown.performance)
  })

  it('supports the expanded MVP slot layout with legacy aliases preserved', () => {
    const agent = makeAgent({
      equipmentSlots: {
        primary: 'silver_rounds',
        secondary: 'ward_seals',
        armor: 'field_plate',
        headgear: 'breach_visor',
        utility: 'signal_jammers',
        utility2: 'medkits',
      },
      equipment: {},
    })

    const equippedItems = resolveEquippedItems(agent)

    expect(equippedItems.map((item) => item.slot)).toEqual([
      'primary',
      'secondary',
      'armor',
      'headgear',
      'utility1',
      'utility2',
    ])
    expect(equippedItems.map((item) => item.id)).toEqual([
      'silver_rounds',
      'ward_seals',
      'field_plate',
      'breach_visor',
      'signal_jammers',
      'medkits',
    ])
  })

  it('applies context-specific equipment modifiers additively only when the case context matches', () => {
    const signalCase = makeCase({
      tags: ['signal', 'tech'],
      weights: { combat: 0.05, investigation: 0.35, utility: 0.45, social: 0.15 },
    })
    const routineCase = makeCase({
      tags: ['archive'],
      weights: { combat: 0.25, investigation: 0.25, utility: 0.25, social: 0.25 },
    })
    const agent = makeAgent({
      role: 'tech',
      equipmentSlots: {
        utility: 'signal_jammers',
        headgear: 'breach_visor',
      },
      equipment: {},
    })

    const signalItems = resolveEquippedItems(agent, { caseData: signalCase })
    const routineItems = resolveEquippedItems(agent, { caseData: routineCase })
    const signalEffective = effectiveStats(agent, { caseData: signalCase })
    const routineEffective = effectiveStats(agent, { caseData: routineCase })
    const signalBreakdown = evaluateAgentBreakdown(agent, { caseData: signalCase })
    const routineBreakdown = evaluateAgentBreakdown(agent, { caseData: routineCase })

    expect(
      signalItems.some(
        (item) =>
          item.id === 'signal_jammers' &&
          ((item.activeModifiers.technical?.equipment ?? 0) > 0 ||
            (item.activeModifiers.cognitive?.analysis ?? 0) > 0)
      )
    ).toBe(true)
    expect(
      routineItems.every(
        (item) =>
          (item.activeModifiers.technical?.equipment ?? 0) === 0 &&
          (item.activeModifiers.cognitive?.analysis ?? 0) === 0 &&
          (item.activeModifiers.social?.negotiation ?? 0) === 0
      )
    ).toBe(true)
    expect(signalEffective.cognitive.analysis).toBeGreaterThan(routineEffective.cognitive.analysis)
    expect(signalBreakdown.score).toBeGreaterThan(routineBreakdown.score)
    expect(signalBreakdown.performance.containment).toBeGreaterThan(
      routineBreakdown.performance.containment
    )
  })

  it('ignores unslotted stale equipment quality when deriving equipment-driven power', () => {
    const currentCase = makeCase({
      tags: ['signal', 'analysis'],
      weights: { combat: 0.1, investigation: 0.4, utility: 0.4, social: 0.1 },
    })
    const cleanAgent = makeAgent({
      role: 'tech',
      equipmentSlots: { utility: 'signal_jammers' },
      equipment: { signal_jammers: 1 },
    })
    const staleAgent = makeAgent({
      role: 'tech',
      equipmentSlots: { utility: 'signal_jammers' },
      equipment: {
        signal_jammers: 1,
        ward_seals: 9,
      },
    })

    const cleanBreakdown = evaluateAgentBreakdown(cleanAgent, { caseData: currentCase })
    const staleBreakdown = evaluateAgentBreakdown(staleAgent, { caseData: currentCase })

    expect(staleBreakdown.score).toBeCloseTo(cleanBreakdown.score, 6)
    expect(staleBreakdown.performanceBlend.equipmentLoad).toBe(
      cleanBreakdown.performanceBlend.equipmentLoad
    )
    expect(staleBreakdown.performance).toEqual(cleanBreakdown.performance)
  })

  it('activates deterministic equipment kits only when the equipped loadout and case context match', () => {
    const breachCase = makeCase({
      kind: 'raid',
      tags: ['breach', 'combat', 'threat'],
      weights: { combat: 0.6, investigation: 0.1, utility: 0.2, social: 0.1 },
    })
    const routineCase = makeCase({
      tags: ['archive'],
      weights: { combat: 0.6, investigation: 0.1, utility: 0.2, social: 0.1 },
    })
    const agent = makeAgent({
      role: 'hunter',
      equipmentSlots: {
        primary: 'silver_rounds',
        armor: 'field_plate',
      },
      equipment: {},
    })

    const breachBreakdown = evaluateAgentBreakdown(agent, { caseData: breachCase })
    const routineBreakdown = evaluateAgentBreakdown(agent, { caseData: routineCase })

    expect(breachBreakdown.powerLayer.kits.map((kit) => kit.id)).toContain('breach-response-kit')
    expect(breachBreakdown.powerLayer.kits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'breach-response-kit',
          matchedPieceCount: 2,
          activeThresholds: [2],
          highestActiveThreshold: 2,
        }),
      ])
    )
    expect(breachBreakdown.kitEffects.statModifiers).toEqual({})
    expect(breachBreakdown.kitEffects.effectivenessMultiplier).toBeCloseTo(1.03, 6)
    expect(routineBreakdown.powerLayer.kits).toEqual([])
    expect(routineBreakdown.kitEffects.statModifiers).toEqual({})
  })

  it('keeps item effects in effective stats and kit effects in the multiplier layer', () => {
    const breachCase = makeCase({
      kind: 'raid',
      tags: ['breach', 'combat', 'threat'],
      weights: { combat: 0.6, investigation: 0.1, utility: 0.2, social: 0.1 },
    })
    const oneItemAgent = makeAgent({
      role: 'hunter',
      equipmentSlots: {
        primary: 'silver_rounds',
      },
      equipment: {},
    })
    const kitAgent = makeAgent({
      role: 'hunter',
      equipmentSlots: {
        primary: 'silver_rounds',
        armor: 'field_plate',
      },
      equipment: {},
    })

    const oneItemEffective = effectiveStats(oneItemAgent, { caseData: breachCase })
    const kitEffective = effectiveStats(kitAgent, { caseData: breachCase })
    const oneItemBreakdown = evaluateAgentBreakdown(oneItemAgent, { caseData: breachCase })
    const kitBreakdown = evaluateAgentBreakdown(kitAgent, { caseData: breachCase })
    const expectedKitEffective = applyEquipmentModifiers(
      kitAgent.stats!,
      resolveAgentEquipmentModifiers(kitAgent, { caseData: breachCase })
    )

    expect(oneItemEffective.tactical.awareness).toBeGreaterThan(kitAgent.stats!.tactical.awareness)
    expect(kitEffective).toEqual(expectedKitEffective)
    expect(kitBreakdown.kitEffects.statModifiers).toEqual({})
    expect(kitBreakdown.kitEffects.effectivenessMultiplier).toBeGreaterThan(1)
    expect(kitBreakdown.score).toBeGreaterThan(oneItemBreakdown.score)
  })

  it('unlocks and applies agency protocols through the same canonical evaluator path', () => {
    const state = createStartingState()
    const protocolState = buildAgencyProtocolState({
      ...state,
      agency: {
        ...state.agency,
        containmentRating: 90,
        clearanceLevel: 2,
        funding: 200,
      },
      containmentRating: 90,
      clearanceLevel: 2,
      funding: 200,
    })
    const evidenceCase = makeCase({
      tags: ['signal', 'analysis', 'evidence'],
      weights: { combat: 0.05, investigation: 0.45, utility: 0.4, social: 0.1 },
    })
    const agent = makeAgent({ role: 'tech' })

    const baseBreakdown = evaluateAgentBreakdown(agent, { caseData: evidenceCase })
    const protocolBreakdown = evaluateAgentBreakdown(agent, {
      caseData: evidenceCase,
      protocolState,
    })

    expect(protocolState.unlockedProtocols.map((protocol) => protocol.id)).toContain(
      'field-clearance-protocol'
    )
    expect(protocolBreakdown.powerLayer.protocols.map((protocol) => protocol.id)).toContain(
      'field-clearance-protocol'
    )
    expect(protocolBreakdown.protocolEffects.statModifiers).toEqual({})
    expect(protocolBreakdown.effectiveStats).toEqual(baseBreakdown.effectiveStats)
    expect(protocolBreakdown.score).toBeGreaterThan(baseBreakdown.score)
    expect(protocolBreakdown.performance.investigation).toBeGreaterThan(
      baseBreakdown.performance.investigation
    )
  })

  it('keeps active abilities as scaffolded no-ops in the MVP evaluation flow', () => {
    const baseAgent = makeAgent({ role: 'tech', abilities: [] })
    const activeAbilityAgent = makeAgent({
      role: 'tech',
      abilities: [
        {
          id: 'breach-overclock',
          label: 'Breach Overclock',
          type: 'active',
          trigger: 'OnResolutionCheck',
          cooldown: 2,
          effect: {
            technical: 25,
            overall: 5,
          },
        },
      ],
    })

    const baseEffective = effectiveStats(baseAgent)
    const activeEffective = effectiveStats(activeAbilityAgent)
    const baseBreakdown = evaluateAgentBreakdown(baseAgent)
    const activeBreakdown = evaluateAgentBreakdown(activeAbilityAgent)

    expect(activeEffective).toEqual(baseEffective)
    expect(activeBreakdown.contributionByDomain).toEqual(baseBreakdown.contributionByDomain)
    expect(activeBreakdown.score).toBe(baseBreakdown.score)
  })

  it('executes trigger-capable active abilities only when trigger matches and cooldown is ready', () => {
    const ability = {
      id: 'containment-surge',
      label: 'Containment Surge',
      type: 'active' as const,
      trigger: 'OnCaseStart' as const,
      cooldown: 3,
      effect: {
        control: 6,
        anomaly: 4,
      },
    }
    const agent = makeAgent({
      abilities: [ability],
    })

    const inactiveEffect = resolveAbilityEffect(ability, {
      agent,
      phase: 'evaluation',
    })
    const matchedTriggerEffect = resolveAbilityEffect(ability, {
      agent,
      phase: 'evaluation',
      triggerEvent: 'OnCaseStart',
    })
    const onCooldownEffect = resolveAbilityEffect(ability, {
      agent: {
        ...agent,
        abilityState: {
          'containment-surge': {
            cooldownRemaining: 2,
          },
        },
      },
      phase: 'evaluation',
      triggerEvent: 'OnCaseStart',
    })

    expect(formatAbilityTrigger(ability.trigger)).toBe('Case Start')
    expect(inactiveEffect.triggerSatisfied).toBe(false)
    expect(matchedTriggerEffect.triggerSatisfied).toBe(true)
    expect(onCooldownEffect.triggerSatisfied).toBe(true)
    expect(inactiveEffect.activeInMvp).toBe(false)
    expect(matchedTriggerEffect.activeInMvp).toBe(true)
    expect(onCooldownEffect.activeInMvp).toBe(false)
    expect(inactiveEffect.modifiers).toEqual({})
    expect(matchedTriggerEffect.modifiers).toEqual({
      control: 6,
      anomaly: 4,
    })
    expect(onCooldownEffect.modifiers).toEqual({})
  })

  it('honors evaluator fatigue controls when deriving effective stats', () => {
    const fatiguedAgent = makeAgent({ fatigue: 80 })

    const defaultBreakdown = evaluateAgentBreakdown(fatiguedAgent)
    const noFatigueBreakdown = evaluateAgentBreakdown(fatiguedAgent, { includeFatigue: false })
    const overrideBreakdown = evaluateAgentBreakdown(fatiguedAgent, { fatigueOverride: 100 })

    expect(noFatigueBreakdown.score).toBeGreaterThan(defaultBreakdown.score)
    expect(overrideBreakdown.score).toBeLessThan(defaultBreakdown.score)
  })

  it('reduces score and domain contribution as fatigue rises', () => {
    const caseInstance = makeCase({
      weights: { combat: 1, investigation: 1, utility: 1, social: 1 },
    })
    const restedAgent = makeAgent({
      fatigue: 0,
      stats: makeDomainStats(),
    })
    const fatiguedAgent = makeAgent({
      fatigue: 80,
      stats: makeDomainStats(),
    })

    const rested = computeTeamScore([restedAgent], caseInstance)
    const fatigued = computeTeamScore([fatiguedAgent], caseInstance)

    expect(fatigued.score).toBeLessThan(rested.score)
    expect(fatigued.agentPerformance[0].effectivenessScore).toBeLessThan(
      rested.agentPerformance[0].effectivenessScore
    )
  })

  it('keeps passive trait metadata from mutating the numeric evaluation contract without case context', () => {
    const baseAgent = makeAgent({ traits: [] })
    const traitAgent = makeAgent({
      traits: [{ id: 'systems-savant', label: 'Systems Savant', modifiers: { technical: 8 } }],
    })

    const baseBreakdown = evaluateAgentBreakdown(baseAgent)
    const traitBreakdown = evaluateAgentBreakdown(traitAgent)

    expect(traitBreakdown.score).toBe(baseBreakdown.score)
    expect(traitBreakdown.contributionByDomain).toEqual(baseBreakdown.contributionByDomain)
  })

  it('uses domain stats as the canonical case scoring source when stats are present', () => {
    const caseInstance = makeCase({
      weights: { combat: 1, investigation: 1, utility: 1, social: 1 },
    })
    const canonicalStats = makeDomainStats({
      physical: { strength: 25, endurance: 20 },
      tactical: { awareness: 45, reaction: 35 },
      cognitive: { analysis: 60, investigation: 55 },
      social: { negotiation: 50, influence: 40 },
      stability: { resistance: 48, tolerance: 46 },
      technical: { equipment: 58, anomaly: 62 },
    })

    const baseBiasedAgent = makeAgent({
      id: 'agent-base-biased',
      stats: canonicalStats,
      baseStats: { combat: 999, investigation: 999, utility: 999, social: 999 },
    })
    const baseMutedAgent = makeAgent({
      id: 'agent-base-muted',
      stats: canonicalStats,
      baseStats: { combat: 1, investigation: 1, utility: 1, social: 1 },
    })

    const biasedResult = computeTeamScore([baseBiasedAgent], caseInstance)
    const mutedResult = computeTeamScore([baseMutedAgent], caseInstance)

    expect(biasedResult.score).toBeCloseTo(mutedResult.score, 6)
    expect(biasedResult.agentPerformance[0].effectivenessScore).toBeCloseTo(
      mutedResult.agentPerformance[0].effectivenessScore,
      6
    )
    expect(biasedResult.agentPerformance[0].contributionByDomain).toEqual(
      mutedResult.agentPerformance[0].contributionByDomain
    )
  })

  it('falls back to baseStats-derived domains when canonical stats are absent', () => {
    const caseInstance = makeCase({
      weights: { combat: 1, investigation: 1, utility: 1, social: 1 },
    })
    const legacyOnlyAgent = makeAgent({
      id: 'agent-legacy-only',
      stats: undefined,
      baseStats: { combat: 12, investigation: 34, utility: 56, social: 78 },
      fatigue: 0,
    })

    const result = computeTeamScore([legacyOnlyAgent], caseInstance)
    const breakdown = evaluateAgentBreakdown(legacyOnlyAgent, { caseData: caseInstance })

    expect(result.agentPerformance[0].effectivenessScore).toBeCloseTo(breakdown.score, 2)
    expect(result.agentPerformance[0].contributionByDomain).toEqual(
      Object.fromEntries(
        DOMAIN_KEYS.map((domain) => [
          domain,
          Number(breakdown.contributionByDomain[domain].toFixed(2)),
        ])
      )
    )
  })
})
