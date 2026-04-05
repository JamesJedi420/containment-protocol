import type {
  Agent,
  AgentTraitModifierKey,
  DomainStats,
  LegacyStatDomain,
  StatDomain,
} from './models'
import type { CaseInstance, Id } from '../models'
import { aggregateAbilityEffects, resolveAgentAbilityEffects } from '../abilities'
import { applyEquipmentModifiers, resolveAgentEquipmentModifiers } from '../equipment'
import { aggregateProtocolEffects, resolveAgentProtocolEffects } from '../protocols'
import { resolveAgentTraitModifiers } from '../traits'
import { clamp } from '../math'
import { deriveDomainStatsFromBase } from '../agentDefaults'
import {
  MAX_FATIGUE_STAT_REDUCTION,
  MAX_FATIGUE_MULTIPLIER,
  MIN_FATIGUE_MULTIPLIER,
  getDomainStatPaths,
  getLegacyDomainStatPaths,
} from '../statDomains'
import type { AgencyProtocolState } from '../protocols'

export interface EffectiveStatsOptions {
  fatigueOverride?: number
  includeFatigue?: boolean
  includeEquipment?: boolean
  includeProtocols?: boolean
  caseData?: CaseInstance
  supportTags?: string[]
  teamTags?: string[]
  leaderId?: Id | null
  protocolState?: AgencyProtocolState
}

/**
 * Apply fatigue multiplier to domain stats.
 * Fatigue (0..100) reduces all stats by up to 25%, with a 0.75 floor.
 *
 * @param stats Base stats before fatigue
 * @param fatigue 0..100 fatigue value
 * @returns Stats with fatigue applied
 */
function applyFatigueMultiplier(stats: DomainStats, fatigue: number): DomainStats {
  const mult = clamp(
    1 - (fatigue / 100) * MAX_FATIGUE_STAT_REDUCTION,
    MIN_FATIGUE_MULTIPLIER,
    MAX_FATIGUE_MULTIPLIER
  )

  return {
    physical: {
      strength: stats.physical.strength * mult,
      endurance: stats.physical.endurance * mult,
    },
    tactical: {
      awareness: stats.tactical.awareness * mult,
      reaction: stats.tactical.reaction * mult,
    },
    cognitive: {
      analysis: stats.cognitive.analysis * mult,
      investigation: stats.cognitive.investigation * mult,
    },
    social: {
      negotiation: stats.social.negotiation * mult,
      influence: stats.social.influence * mult,
    },
    stability: {
      resistance: stats.stability.resistance * mult,
      tolerance: stats.stability.tolerance * mult,
    },
    technical: {
      equipment: stats.technical.equipment * mult,
      anomaly: stats.technical.anomaly * mult,
    },
  }
}

/**
 * Apply a modifier (from trait or ability) to stored stats.
 * Modifiers can target:
 * - stored domains (e.g., 'physical': 3 affects both strength and endurance)
 * - operational domains (e.g., 'field': 3 affects the Field domain's backing substats)
 * - 'overall': affects all stats equally
 *
 * @param stats Base stats to modify
 * @param mod Modifier from AgentTrait or AgentAbility
 * @returns Stats with modifier applied
 */
function applyModifier(
  stats: DomainStats,
  mod: Partial<Record<AgentTraitModifierKey, number>>
): DomainStats {
  if (!mod || Object.keys(mod).length === 0) {
    return stats
  }

  const result: DomainStats = {
    physical: { ...stats.physical },
    tactical: { ...stats.tactical },
    cognitive: { ...stats.cognitive },
    social: { ...stats.social },
    stability: { ...stats.stability },
    technical: { ...stats.technical },
  }

  // Handle 'overall' modifier first
  const overallMod = mod.overall ?? 0
  if (overallMod !== 0) {
    result.physical.strength += overallMod
    result.physical.endurance += overallMod
    result.tactical.awareness += overallMod
    result.tactical.reaction += overallMod
    result.cognitive.analysis += overallMod
    result.cognitive.investigation += overallMod
    result.social.negotiation += overallMod
    result.social.influence += overallMod
    result.stability.resistance += overallMod
    result.stability.tolerance += overallMod
    result.technical.equipment += overallMod
    result.technical.anomaly += overallMod
  }

  function applyModifierToPath(path: string, amount: number) {
    switch (path) {
      case 'physical.strength':
        result.physical.strength += amount
        return
      case 'physical.endurance':
        result.physical.endurance += amount
        return
      case 'tactical.awareness':
        result.tactical.awareness += amount
        return
      case 'tactical.reaction':
        result.tactical.reaction += amount
        return
      case 'cognitive.analysis':
        result.cognitive.analysis += amount
        return
      case 'cognitive.investigation':
        result.cognitive.investigation += amount
        return
      case 'social.negotiation':
        result.social.negotiation += amount
        return
      case 'social.influence':
        result.social.influence += amount
        return
      case 'stability.resistance':
        result.stability.resistance += amount
        return
      case 'stability.tolerance':
        result.stability.tolerance += amount
        return
      case 'technical.equipment':
        result.technical.equipment += amount
        return
      case 'technical.anomaly':
        result.technical.anomaly += amount
        return
    }
  }

  function applyModifierToPaths(paths: readonly string[], amount: number) {
    if (amount === 0) {
      return
    }

    for (const path of paths) {
      applyModifierToPath(path, amount)
    }
  }

  // Handle domain-level modifiers
  const modMap = mod as Record<string, number>

  ;(
    [
      'physical',
      'tactical',
      'cognitive',
      'social',
      'stability',
      'technical',
    ] as const satisfies readonly LegacyStatDomain[]
  ).forEach((domain) => {
    applyModifierToPaths(getLegacyDomainStatPaths(domain), modMap[domain] ?? 0)
  })
  ;(
    [
      'field',
      'resilience',
      'control',
      'insight',
      'presence',
      'anomaly',
    ] as const satisfies readonly StatDomain[]
  ).forEach((domain) => {
    applyModifierToPaths(getDomainStatPaths(domain), modMap[domain] ?? 0)
  })

  return result
}

/**
 * Compute effective stats for an agent.
 *
 * Pipeline:
 * 1. Resolve base: `agent.stats ?? deriveDomainStatsFromBase(agent.baseStats)`
 * 2. Apply fatigue multiplier
 * 3. Merge conditional trait modifiers (additive)
 * 4. Merge passive ability effects (additive)
 * 5. Merge equipment stat modifiers (additive)
 * 6. Apply higher-level kit/protocol multipliers outside the raw stat layer
 *
 * @param agent Agent to evaluate
 * @returns Effective DomainStats after all modifiers
 */
export function effectiveStats(agent: Agent, options: EffectiveStatsOptions = {}): DomainStats {
  // Step 1: Resolve base stats
  const baseStats = agent.stats ?? deriveDomainStatsFromBase(agent.baseStats)

  // Step 2: Apply fatigue
  const resolvedFatigue =
    options.fatigueOverride ?? (options.includeFatigue === false ? 0 : agent.fatigue)
  let effective = applyFatigueMultiplier(baseStats, resolvedFatigue)
  const traitModifiers = resolveAgentTraitModifiers(agent, {
    phase: 'evaluation',
    caseData: options.caseData,
    supportTags: options.supportTags,
    teamTags: options.teamTags,
    leaderId: options.leaderId,
  })
  const abilityEffects = resolveAgentAbilityEffects(agent, {
    phase: 'evaluation',
    caseData: options.caseData,
    supportTags: options.supportTags,
    teamTags: options.teamTags,
    leaderId: options.leaderId,
  })
  const aggregatedAbilityEffects = aggregateAbilityEffects(abilityEffects)
  const aggregatedProtocolEffects = aggregateProtocolEffects(
    resolveAgentProtocolEffects(
      agent,
      {
        agent,
        phase: 'evaluation',
        caseData: options.caseData,
        supportTags: options.supportTags,
        teamTags: options.teamTags,
        leaderId: options.leaderId,
      },
      options.protocolState
    )
  )

  // Step 3: Apply conditional trait modifiers through the canonical trait helper.
  for (const modifiers of traitModifiers) {
    effective = applyModifier(effective, modifiers)
  }

  // Step 4: Apply passive ability effects through the canonical ability helper.
  effective = applyModifier(effective, aggregatedAbilityEffects.statModifiers)

  // Step 5: Apply deterministic progression growth through the same modifier pipeline.
  effective = applyModifier(effective, agent.progression?.growthStats ?? {})

  // Step 6: Apply slotted equipment modifiers through the canonical equipment helper.
  if (options.includeEquipment !== false) {
    effective = applyEquipmentModifiers(
      effective,
      resolveAgentEquipmentModifiers(agent, {
        caseData: options.caseData,
        supportTags: options.supportTags,
        teamTags: options.teamTags,
      })
    )
  }

  // Step 7: Apply active agency protocol bonuses.
  if (options.includeProtocols !== false) {
    effective = applyModifier(effective, aggregatedProtocolEffects.statModifiers)
  }

  // Final pass: clamp all values to positive integers
  const result: DomainStats = {
    physical: {
      strength: Math.max(0, Math.round(effective.physical.strength)),
      endurance: Math.max(0, Math.round(effective.physical.endurance)),
    },
    tactical: {
      awareness: Math.max(0, Math.round(effective.tactical.awareness)),
      reaction: Math.max(0, Math.round(effective.tactical.reaction)),
    },
    cognitive: {
      analysis: Math.max(0, Math.round(effective.cognitive.analysis)),
      investigation: Math.max(0, Math.round(effective.cognitive.investigation)),
    },
    social: {
      negotiation: Math.max(0, Math.round(effective.social.negotiation)),
      influence: Math.max(0, Math.round(effective.social.influence)),
    },
    stability: {
      resistance: Math.max(0, Math.round(effective.stability.resistance)),
      tolerance: Math.max(0, Math.round(effective.stability.tolerance)),
    },
    technical: {
      equipment: Math.max(0, Math.round(effective.technical.equipment)),
      anomaly: Math.max(0, Math.round(effective.technical.anomaly)),
    },
  }

  return result
}
