import {
  type Agent,
  type AgentAbilityTrigger,
  type AgentPowerImpact,
  type AgentPerformanceBlendBreakdown,
  type AgentPerformance,
  type AgentScoreBreakdown,
  type CaseInstance,
  type DomainStats,
  type AgentTraitModifierKey,
  type Id,
  type RoleDomainWeights,
  type StatDomain,
} from './models'
import {
  aggregateAbilityEffects,
  resolveAgentAbilityEffects,
  type AbilityModifierResult,
} from './abilities'
import { aggregateEquipmentKitEffects, resolveAgentEquipmentKits } from './kits'
import {
  aggregateProtocolEffects,
  resolveAgentProtocolEffects,
  type AgencyProtocolState,
} from './protocols'
import {
  buildContextualRoleDomainWeights,
  buildWeightedDomainContribution,
  domainAverage,
  createEmptyDomainContribution,
  normalizeRoleDomainWeights,
  sumDomainContribution,
} from './statDomains'
import { resolveEquippedItems } from './equipment'
import { effectiveStats } from './agent/evaluation'
import {
  aggregateTraitEffects,
  resolveAgentTraitEffects,
  type TraitModifierResult,
} from './traits'
import { createRuntimeModifierResult } from './modifierRuntime'

export interface EvaluateAgentContext {
  fatigueOverride?: number
  includeFatigue?: boolean
  includeEquipment?: boolean
  includeKits?: boolean
  includeProtocols?: boolean
  roleWeights?: Partial<RoleDomainWeights>
  caseData?: CaseInstance
  supportTags?: string[]
  teamTags?: string[]
  leaderId?: Id | null
  protocolState?: AgencyProtocolState
  trackPowerImpact?: boolean
  triggerEvent?: AgentAbilityTrigger
}

export type AgentPerformanceBuckets = Pick<
  AgentPerformance,
  'fieldPower' | 'containment' | 'investigation' | 'support'
>

export interface EvaluatedAgentDerivedProfiles {
  domainProfile: Record<StatDomain, number>
  casePerformanceWeights: AgentPerformanceBuckets
  legacyPerformanceProfile: AgentPerformanceBuckets
  weightedPerformanceProfile: AgentPerformanceBuckets
  normalizedWeightedPerformanceProfile: AgentPerformanceBuckets
}

export interface EvaluatedAgentBreakdown {
  score: number
  scoreBreakdown: AgentScoreBreakdown
  effectiveStats: DomainStats
  weights: RoleDomainWeights
  traitBonus: number
  traitEffects: TraitModifierResult
  abilityEffects: AbilityModifierResult
  kitEffects: ReturnType<typeof aggregateEquipmentKitEffects>
  protocolEffects: ReturnType<typeof aggregateProtocolEffects>
  powerLayer: {
    kits: ReturnType<typeof resolveAgentEquipmentKits>
    protocols: ReturnType<typeof resolveAgentProtocolEffects>
  }
  modifierEffects: {
    effectivenessMultiplier: number
    stressImpactMultiplier: number
    moraleRecoveryDelta: number
  }
  derived: EvaluatedAgentDerivedProfiles
  performanceBlend: AgentPerformanceBlendBreakdown
  performance: AgentPerformance
  contributionByDomain: Record<StatDomain, number>
  powerImpact: AgentPowerImpact
}

const PERFORMANCE_KEYS = [
  'fieldPower',
  'containment',
  'investigation',
  'support',
] as const satisfies readonly (keyof Pick<
  AgentPerformance,
  'fieldPower' | 'containment' | 'investigation' | 'support'
>)[]

const PERFORMANCE_BLEND_WEIGHT = 0.85
const ROLE_WEIGHTED_PERFORMANCE_BLEND_WEIGHT = 1 - PERFORMANCE_BLEND_WEIGHT
const AGENT_EQUIPMENT_BONUS_PER_ITEM = 0.75

function createEmptyPerformanceBuckets(): AgentPerformanceBuckets {
  return {
    fieldPower: 0,
    containment: 0,
    investigation: 0,
    support: 0,
  }
}

function sumPerformance(performance: AgentPerformanceBuckets) {
  return PERFORMANCE_KEYS.reduce((total, key) => total + performance[key], 0)
}

function toRoundedFinite(value: number, digits = 2) {
  return Number((Number.isFinite(value) ? value : 0).toFixed(digits))
}

export function normalizeAgentPerformanceBuckets(
  performance: AgentPerformanceBuckets,
  targetTotal: number
) {
  const currentTotal = sumPerformance(performance)

  if (currentTotal <= 0 || targetTotal <= 0) {
    return createEmptyPerformanceBuckets()
  }

  const scale = targetTotal / currentTotal

  return {
    fieldPower: performance.fieldPower * scale,
    containment: performance.containment * scale,
    investigation: performance.investigation * scale,
    support: performance.support * scale,
  }
}

function computeAgentStressImpact(
  agent: Agent,
  effectiveStats: DomainStats,
  stressImpactMultiplier: number
) {
  const resilienceAverage = domainAverage(effectiveStats, 'resilience')
  const anomalyAverage = domainAverage(effectiveStats, 'anomaly')
  const instabilityPressure = Math.max(
    0,
    52 - (resilienceAverage * 0.7 + anomalyAverage * 0.3)
  )
  const fatiguePressure = agent.fatigue * 0.15
  const statusPenalty = agent.status === 'active' ? 0 : agent.status === 'injured' ? 8 : 4

  return Number(
    ((instabilityPressure + fatiguePressure + statusPenalty) * stressImpactMultiplier).toFixed(2)
  )
}

export function buildAgentCasePerformanceWeights(caseData?: CaseInstance): AgentPerformanceBuckets {
  if (!caseData) {
    return {
      fieldPower: 0.25,
      containment: 0.25,
      investigation: 0.25,
      support: 0.25,
    }
  }

  return {
    fieldPower: caseData.weights.combat,
    containment: caseData.weights.utility,
    investigation: caseData.weights.investigation,
    support: caseData.weights.social,
  }
}

export function normalizeAgentCasePerformanceWeights(
  weights: AgentPerformanceBuckets
) {
  const total = PERFORMANCE_KEYS.reduce((sum, key) => sum + Math.max(0, weights[key]), 0)

  if (total <= 0) {
    return {
      fieldPower: 0.25,
      containment: 0.25,
      investigation: 0.25,
      support: 0.25,
    }
  }

  return {
    fieldPower: weights.fieldPower / total,
    containment: weights.containment / total,
    investigation: weights.investigation / total,
    support: weights.support / total,
  }
}

export function buildAgentDomainProfile(
  effectiveStats: DomainStats
): Record<StatDomain, number> {
  return {
    field: domainAverage(effectiveStats, 'field'),
    resilience: domainAverage(effectiveStats, 'resilience'),
    control: domainAverage(effectiveStats, 'control'),
    insight: domainAverage(effectiveStats, 'insight'),
    presence: domainAverage(effectiveStats, 'presence'),
    anomaly: domainAverage(effectiveStats, 'anomaly'),
  }
}

export function buildAgentLegacyPerformanceProfile(
  domainProfile: Record<StatDomain, number>
): AgentPerformanceBuckets {
  return {
    fieldPower: domainProfile.field * 1.45 + domainProfile.resilience * 0.25,
    containment:
      domainProfile.control * 0.55 +
      domainProfile.anomaly * 0.3 +
      domainProfile.resilience * 0.15,
    investigation:
      domainProfile.insight * 0.75 +
      domainProfile.anomaly * 0.15 +
      domainProfile.presence * 0.1,
    support:
      domainProfile.presence * 0.45 +
      domainProfile.resilience * 0.3 +
      domainProfile.control * 0.25,
  }
}

export function buildAgentWeightedPerformanceProfile(
  contributionByDomain: Record<StatDomain, number>,
  traitBonus: number,
  equipmentLoad: number
): AgentPerformanceBuckets {
  const overallSpread = traitBonus / PERFORMANCE_KEYS.length

  return {
    fieldPower:
      contributionByDomain.field * 1.35 +
      contributionByDomain.resilience * 0.2 +
      overallSpread,
    containment:
      contributionByDomain.control * 0.55 +
      contributionByDomain.anomaly * 0.3 +
      contributionByDomain.resilience * 0.15 +
      overallSpread +
      equipmentLoad * AGENT_EQUIPMENT_BONUS_PER_ITEM,
    investigation:
      contributionByDomain.insight * 0.8 +
      contributionByDomain.anomaly * 0.15 +
      contributionByDomain.presence * 0.05 +
      overallSpread,
    support:
      contributionByDomain.presence * 0.5 +
      contributionByDomain.resilience * 0.25 +
      contributionByDomain.control * 0.25 +
      overallSpread +
      equipmentLoad * AGENT_EQUIPMENT_BONUS_PER_ITEM,
  }
}

function hasCaseTag(caseData: CaseInstance | undefined, tags: readonly string[]) {
  if (!caseData) {
    return false
  }

  const caseTags = new Set([
    ...caseData.tags,
    ...caseData.requiredTags,
    ...caseData.preferredTags,
  ])

  return tags.some((tag) => caseTags.has(tag))
}

function computePerformanceExplanationMetrics(
  caseData: CaseInstance | undefined,
  performanceBuckets: AgentPerformanceBuckets,
  stressImpact: number
) {
  const normalizedWeights = normalizeAgentCasePerformanceWeights(
    buildAgentCasePerformanceWeights(caseData)
  )
  const threatContext = hasCaseTag(caseData, [
    'threat',
    'combat',
    'breach',
    'raid',
    'outbreak',
    'vampire',
    'hunter',
  ])
  const healingContext = hasCaseTag(caseData, [
    'medical',
    'triage',
    'biological',
    'witness',
    'rescue',
    'hazmat',
  ])
  const evidenceContext = hasCaseTag(caseData, [
    'evidence',
    'witness',
    'archive',
    'analysis',
    'relay',
    'forensics',
  ])
  const containmentContext = hasCaseTag(caseData, [
    'containment',
    'anomaly',
    'occult',
    'ritual',
    'seal',
    'ward',
    'spirit',
  ])

  const contribution =
    performanceBuckets.fieldPower * normalizedWeights.fieldPower +
    performanceBuckets.containment * normalizedWeights.containment +
    performanceBuckets.investigation * normalizedWeights.investigation +
    performanceBuckets.support * normalizedWeights.support

  const threatHandled =
    performanceBuckets.fieldPower *
    (0.35 + normalizedWeights.fieldPower * 0.65 + (threatContext ? 0.2 : 0))
  const damageTaken =
    stressImpact *
    (0.35 + normalizedWeights.fieldPower * 0.45 + (caseData?.kind === 'raid' ? 0.2 : 0) + (containmentContext ? 0.1 : 0))
  const healingPerformed =
    performanceBuckets.support *
    (0.2 + normalizedWeights.support * 0.8 + (healingContext ? 0.2 : 0))
  const evidenceGathered =
    performanceBuckets.investigation *
    (0.2 + normalizedWeights.investigation * 0.8 + (evidenceContext ? 0.2 : 0))
  const containmentActionsCompleted =
    performanceBuckets.containment *
    (0.2 + normalizedWeights.containment * 0.8 + (containmentContext ? 0.2 : 0))

  return {
    contribution: Number(contribution.toFixed(2)),
    threatHandled: Number(threatHandled.toFixed(2)),
    damageTaken: Number(damageTaken.toFixed(2)),
    healingPerformed: Number(healingPerformed.toFixed(2)),
    evidenceGathered: Number(evidenceGathered.toFixed(2)),
    containmentActionsCompleted: Number(containmentActionsCompleted.toFixed(2)),
  }
}

function buildAgentPerformance(
  agent: Agent,
  effectiveStats: DomainStats,
  contributionByDomain: Record<StatDomain, number>,
  traitBonus: number,
  effectivenessMultiplier: number,
  stressImpactMultiplier: number,
  equipmentLoad: number,
  caseData?: CaseInstance
): {
  performance: AgentPerformance
  derived: EvaluatedAgentDerivedProfiles
  performanceBlend: AgentPerformanceBlendBreakdown
} {
  const domainProfile = buildAgentDomainProfile(effectiveStats)
  const legacyProfile = buildAgentLegacyPerformanceProfile(domainProfile)
  const weightedProfile = buildAgentWeightedPerformanceProfile(
    contributionByDomain,
    traitBonus,
    equipmentLoad
  )
  const targetTotal = Math.max(0, sumPerformance(legacyProfile) + traitBonus + equipmentLoad * 1.5)
  const normalizedWeighted = normalizeAgentPerformanceBuckets(weightedProfile, targetTotal)
  const casePerformanceWeights = normalizeAgentCasePerformanceWeights(
    buildAgentCasePerformanceWeights(caseData)
  )

  const performanceBuckets = {
    fieldPower: Number(
      (
        (legacyProfile.fieldPower * PERFORMANCE_BLEND_WEIGHT +
          normalizedWeighted.fieldPower * ROLE_WEIGHTED_PERFORMANCE_BLEND_WEIGHT) *
        effectivenessMultiplier
      ).toFixed(2)
    ),
    containment: Number(
      (
        (legacyProfile.containment * PERFORMANCE_BLEND_WEIGHT +
          normalizedWeighted.containment * ROLE_WEIGHTED_PERFORMANCE_BLEND_WEIGHT) *
        effectivenessMultiplier
      ).toFixed(2)
    ),
    investigation: Number(
      (
        (legacyProfile.investigation * PERFORMANCE_BLEND_WEIGHT +
          normalizedWeighted.investigation * ROLE_WEIGHTED_PERFORMANCE_BLEND_WEIGHT) *
        effectivenessMultiplier
      ).toFixed(2)
    ),
    support: Number(
      (
        (legacyProfile.support * PERFORMANCE_BLEND_WEIGHT +
          normalizedWeighted.support * ROLE_WEIGHTED_PERFORMANCE_BLEND_WEIGHT) *
        effectivenessMultiplier
      ).toFixed(2)
    ),
  }
  const stressImpact = computeAgentStressImpact(agent, effectiveStats, stressImpactMultiplier)
  const metrics = computePerformanceExplanationMetrics(
    caseData,
    performanceBuckets,
    stressImpact
  )
  const performanceBlend: AgentPerformanceBlendBreakdown = {
    equipmentLoad,
    legacyBlendWeight: PERFORMANCE_BLEND_WEIGHT,
    weightedBlendWeight: ROLE_WEIGHTED_PERFORMANCE_BLEND_WEIGHT,
    legacyTotal: Number(sumPerformance(legacyProfile).toFixed(2)),
    weightedTotal: Number(sumPerformance(weightedProfile).toFixed(2)),
    normalizedWeightedTotal: Number(sumPerformance(normalizedWeighted).toFixed(2)),
    blendedTotal: Number(sumPerformance(performanceBuckets).toFixed(2)),
  }

  return {
    performance: {
      ...performanceBuckets,
      stressImpact,
      ...metrics,
    },
    derived: {
      domainProfile,
      casePerformanceWeights,
      legacyPerformanceProfile: legacyProfile,
      weightedPerformanceProfile: weightedProfile,
      normalizedWeightedPerformanceProfile: normalizedWeighted,
    },
    performanceBlend,
  }
}

function isFiniteModifier(
  modifiers: Partial<Record<AgentTraitModifierKey, number>>,
  key: AgentTraitModifierKey
) {
  const value = modifiers[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function getAggregatedTraitEffects(agent: Agent, context: EvaluateAgentContext) {
  return aggregateTraitEffects(
    resolveAgentTraitEffects(agent, {
      phase: 'evaluation',
      caseData: context.caseData,
      supportTags: context.supportTags,
      teamTags: context.teamTags,
      leaderId: context.leaderId,
    })
  )
}

function getAggregatedAbilityEffects(agent: Agent, context: EvaluateAgentContext) {
  return aggregateAbilityEffects(
    resolveAgentAbilityEffects(agent, {
      phase: 'evaluation',
      caseData: context.caseData,
      supportTags: context.supportTags,
      teamTags: context.teamTags,
      leaderId: context.leaderId,
      triggerEvent: context.triggerEvent,
    })
  )
}

function getAggregatedKitEffects(agent: Agent, context: EvaluateAgentContext) {
  if (context.includeKits === false || context.includeEquipment === false) {
    return createRuntimeModifierResult()
  }

  return aggregateEquipmentKitEffects(
    resolveAgentEquipmentKits(agent, {
      agent,
      phase: 'evaluation',
      caseData: context.caseData,
      supportTags: context.supportTags,
      teamTags: context.teamTags,
      leaderId: context.leaderId,
    })
  )
}

function getResolvedKits(agent: Agent, context: EvaluateAgentContext) {
  if (context.includeKits === false || context.includeEquipment === false) {
    return []
  }

  return resolveAgentEquipmentKits(agent, {
    agent,
    phase: 'evaluation',
    caseData: context.caseData,
    supportTags: context.supportTags,
    teamTags: context.teamTags,
    leaderId: context.leaderId,
  })
}

function getAggregatedProtocolEffects(agent: Agent, context: EvaluateAgentContext) {
  if (context.includeProtocols === false) {
    return createRuntimeModifierResult()
  }

  return aggregateProtocolEffects(
    resolveAgentProtocolEffects(
      agent,
      {
        agent,
        phase: 'evaluation',
        caseData: context.caseData,
        supportTags: context.supportTags,
        teamTags: context.teamTags,
        leaderId: context.leaderId,
      },
      context.protocolState
    )
  )
}

function getResolvedProtocols(agent: Agent, context: EvaluateAgentContext) {
  if (context.includeProtocols === false) {
    return []
  }

  return resolveAgentProtocolEffects(
    agent,
    {
      agent,
      phase: 'evaluation',
      caseData: context.caseData,
      supportTags: context.supportTags,
      teamTags: context.teamTags,
      leaderId: context.leaderId,
    },
    context.protocolState
  )
}

function createEmptyAgentPowerImpact(): AgentPowerImpact {
  return {
    activeEquipmentIds: [],
    activeKitIds: [],
    activeProtocolIds: [],
    equipmentContributionDelta: 0,
    kitContributionDelta: 0,
    protocolContributionDelta: 0,
    equipmentScoreDelta: 0,
    kitScoreDelta: 0,
    protocolScoreDelta: 0,
    kitEffectivenessMultiplier: 1,
    protocolEffectivenessMultiplier: 1,
  }
}

function getTraitOverallBonusFromEffects(
  modifiers: Partial<Record<AgentTraitModifierKey, number>>
) {
  return isFiniteModifier(modifiers, 'overall')
}

function getTraitEffects(agent: Agent, context: EvaluateAgentContext) {
  return getAggregatedTraitEffects(agent, context)
}

function getEffectiveWeights(agent: Agent, context: EvaluateAgentContext): RoleDomainWeights {
  const defaultWeights = buildContextualRoleDomainWeights(agent.role, context.caseData)

  if (!context.roleWeights) {
    return defaultWeights
  }

  return normalizeRoleDomainWeights({
    field: context.roleWeights.field ?? defaultWeights.field,
    resilience: context.roleWeights.resilience ?? defaultWeights.resilience,
    control: context.roleWeights.control ?? defaultWeights.control,
    insight: context.roleWeights.insight ?? defaultWeights.insight,
    presence: context.roleWeights.presence ?? defaultWeights.presence,
    anomaly: context.roleWeights.anomaly ?? defaultWeights.anomaly,
  })
}

function evaluateAgentBreakdownCore(
  agent: Agent,
  context: EvaluateAgentContext = {}
): EvaluatedAgentBreakdown {
  const equippedItems =
    context.includeEquipment === false
      ? []
      : resolveEquippedItems(agent, {
          caseData: context.caseData,
          supportTags: context.supportTags,
          teamTags: context.teamTags,
        })
  const effectiveStatsResult = effectiveStats(agent, {
    includeFatigue: context.includeFatigue,
    fatigueOverride: context.fatigueOverride,
    includeEquipment: context.includeEquipment,
    includeProtocols: context.includeProtocols,
    caseData: context.caseData,
    supportTags: context.supportTags,
    teamTags: context.teamTags,
    leaderId: context.leaderId,
    protocolState: context.protocolState,
  })
  const weights = getEffectiveWeights(agent, context)
  const traitEffects = getTraitEffects(agent, context)
  const abilityEffects = getAggregatedAbilityEffects(agent, context)
  const kitEffects = getAggregatedKitEffects(agent, context)
  const protocolEffects = getAggregatedProtocolEffects(agent, context)
  const resolvedKits = getResolvedKits(agent, context)
  const resolvedProtocols = getResolvedProtocols(agent, context)
  const modifierEffects = {
    effectivenessMultiplier:
      traitEffects.effectivenessMultiplier *
      abilityEffects.effectivenessMultiplier *
      kitEffects.effectivenessMultiplier *
      protocolEffects.effectivenessMultiplier,
    stressImpactMultiplier:
      traitEffects.stressImpactMultiplier *
      abilityEffects.stressImpactMultiplier *
      kitEffects.stressImpactMultiplier *
      protocolEffects.stressImpactMultiplier,
    moraleRecoveryDelta:
      traitEffects.moraleRecoveryDelta +
      abilityEffects.moraleRecoveryDelta +
      kitEffects.moraleRecoveryDelta +
      protocolEffects.moraleRecoveryDelta,
  }
  const traitBonus = getTraitOverallBonusFromEffects(traitEffects.statModifiers)
  const contributionByDomain =
    weights
      ? buildWeightedDomainContribution(effectiveStatsResult, weights)
      : createEmptyDomainContribution()
  const performanceResult = buildAgentPerformance(
    agent,
    effectiveStatsResult,
    contributionByDomain,
    traitBonus,
    modifierEffects.effectivenessMultiplier,
    modifierEffects.stressImpactMultiplier,
    equippedItems.reduce((total, item) => total + Math.max(0, item.quality), 0),
    context.caseData
  )
  const { performance, derived, performanceBlend } = performanceResult
  const baseDomainScore = sumDomainContribution(contributionByDomain)
  const preEffectivenessScore = baseDomainScore + traitBonus
  const finalScore = Number(
    (preEffectivenessScore * modifierEffects.effectivenessMultiplier).toFixed(2)
  )

  return {
    score: finalScore,
    scoreBreakdown: {
      baseDomainScore: Number(baseDomainScore.toFixed(2)),
      traitBonus: Number(traitBonus.toFixed(2)),
      preEffectivenessScore: Number(preEffectivenessScore.toFixed(2)),
      effectivenessMultiplier: Number(modifierEffects.effectivenessMultiplier.toFixed(4)),
      finalScore,
    },
    effectiveStats: effectiveStatsResult,
    weights,
    traitBonus,
    traitEffects,
    abilityEffects,
    kitEffects,
    protocolEffects,
    powerLayer: {
      kits: resolvedKits,
      protocols: resolvedProtocols,
    },
    modifierEffects,
    derived,
    performanceBlend,
    performance,
    contributionByDomain,
    powerImpact: createEmptyAgentPowerImpact(),
  }
}

export function evaluateAgentBreakdown(
  agent: Agent,
  context: EvaluateAgentContext = {}
): EvaluatedAgentBreakdown {
  const fullBreakdown = evaluateAgentBreakdownCore(agent, {
    ...context,
    trackPowerImpact: false,
  })

  if (context.trackPowerImpact === false) {
    return fullBreakdown
  }

  const baseBreakdown = evaluateAgentBreakdownCore(agent, {
    ...context,
    includeEquipment: false,
    includeKits: false,
    includeProtocols: false,
    trackPowerImpact: false,
  })
  const equipmentBreakdown = evaluateAgentBreakdownCore(agent, {
    ...context,
    includeEquipment: true,
    includeKits: false,
    includeProtocols: false,
    trackPowerImpact: false,
  })
  const kitBreakdown = evaluateAgentBreakdownCore(agent, {
    ...context,
    includeEquipment: true,
    includeKits: true,
    includeProtocols: false,
    trackPowerImpact: false,
  })

  const powerImpact: AgentPowerImpact = {
    activeEquipmentIds:
      context.includeEquipment === false
        ? []
        : [...new Set(resolveEquippedItems(agent, {
            caseData: context.caseData,
            supportTags: context.supportTags,
            teamTags: context.teamTags,
          }).map((item) => item.id))].sort((left, right) => left.localeCompare(right)),
    activeKitIds: [...new Set(fullBreakdown.powerLayer.kits.map((kit) => kit.id))].sort(
      (left, right) => left.localeCompare(right)
    ),
    activeProtocolIds: [...new Set(fullBreakdown.powerLayer.protocols.map((protocol) => protocol.id))].sort(
      (left, right) => left.localeCompare(right)
    ),
    equipmentContributionDelta: toRoundedFinite(
      equipmentBreakdown.performance.contribution - baseBreakdown.performance.contribution
    ),
    kitContributionDelta: toRoundedFinite(
      kitBreakdown.performance.contribution - equipmentBreakdown.performance.contribution
    ),
    protocolContributionDelta: toRoundedFinite(
      fullBreakdown.performance.contribution - kitBreakdown.performance.contribution
    ),
    equipmentScoreDelta: toRoundedFinite(equipmentBreakdown.score - baseBreakdown.score),
    kitScoreDelta: toRoundedFinite(kitBreakdown.score - equipmentBreakdown.score),
    protocolScoreDelta: toRoundedFinite(fullBreakdown.score - kitBreakdown.score),
    kitEffectivenessMultiplier: toRoundedFinite(fullBreakdown.kitEffects.effectivenessMultiplier, 4),
    protocolEffectivenessMultiplier: toRoundedFinite(
      fullBreakdown.protocolEffects.effectivenessMultiplier,
      4
    ),
  }

  return {
    ...fullBreakdown,
    powerImpact,
  }
}

export function evaluateAgent(agent: Agent, context: EvaluateAgentContext = {}): number {
  return evaluateAgentBreakdown(agent, context).score
}
