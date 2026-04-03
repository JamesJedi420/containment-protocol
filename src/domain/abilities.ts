import type {
  Agent,
  AgentAbility,
  AgentAbilityTrigger,
} from './models'
import type { CaseInstance, Id } from './models'
import {
  aggregateRuntimeModifierResults,
  createRuntimeModifierResult,
  getConfiguredRuntimeModifierEffect,
  hasAnomalyExposureRuntimeContext,
  hasAnyRuntimeContextTag,
  hasCaseRuntimeContext,
  hasLongAssignmentRuntimeContext,
  isLeaderRuntimeContext,
  type RuntimeModifierContext,
  type RuntimeModifierMap,
  type RuntimeModifierResult,
} from './modifierRuntime'

export interface AbilityEvaluationContext extends RuntimeModifierContext {
  agent: Agent
  phase: 'evaluation' | 'recovery'
  triggerEvent?: AgentAbilityTrigger
  caseData?: CaseInstance
  supportTags?: string[]
  teamTags?: string[]
  leaderId?: Id | null
  stressGain?: number
}

export interface AbilityEffectResult {
  abilityId: string
  type: AgentAbility['type']
  trigger?: AgentAbilityTrigger
  triggerSatisfied: boolean
  activeInMvp: boolean
  modifiers: AbilityModifierMap
  effectivenessMultiplier: number
  stressImpactMultiplier: number
  moraleRecoveryDelta: number
  cooldown?: number
}

export type AbilityModifierMap = RuntimeModifierMap

export type AbilityModifierResult = RuntimeModifierResult

export interface AbilityDefinition {
  id: string
  condition: (context: AbilityEvaluationContext, ability: AgentAbility) => boolean
  modifier: (context: AbilityEvaluationContext, ability: AgentAbility) => AbilityModifierResult
  contextHint?: string
}

export interface AuthoredAbilityOwner {
  ownerId: string
  ownerName?: string
  abilities?: readonly AgentAbility[]
}

export interface AuthoredAbilityValidationIssue {
  ownerId: string
  ownerName?: string
  abilityId: string
}

const ABILITY_TRIGGER_LABELS: Record<AgentAbilityTrigger, string> = {
  OnCaseStart: 'Case Start',
  OnThreatEncounter: 'Threat Encounter',
  OnExposure: 'Exposure',
  OnStressGain: 'Stress Gain',
  OnTurnStart: 'Turn Start',
  OnResolutionCheck: 'Resolution Check',
  OnLongCaseDurationCheck: 'Long Case Duration Check',
}

export function isPassiveAbility(ability: AgentAbility): ability is AgentAbility & { type: 'passive' } {
  return ability.type === 'passive'
}

export function isActiveAbility(ability: AgentAbility): ability is AgentAbility & { type: 'active' } {
  return ability.type === 'active'
}

export function formatAbilityTrigger(trigger: AgentAbilityTrigger | undefined) {
  return trigger ? ABILITY_TRIGGER_LABELS[trigger] : undefined
}

function getConfiguredAbilityEffect(
  ability: AgentAbility,
  fallback: Partial<AbilityModifierResult> = {}
): AbilityModifierResult {
  return getConfiguredRuntimeModifierEffect(ability.effect, fallback)
}

export const ABILITY_DEFINITIONS: AbilityDefinition[] = [
  {
    id: 'signal-overclock',
    condition: (context) =>
      !hasCaseRuntimeContext(context) ||
      isLeaderRuntimeContext(context) ||
      hasAnyRuntimeContextTag(context, [
        'tech',
        'signal',
        'relay',
        'analysis',
        'equipment',
        'technical',
      ]),
    modifier: (_context, ability) =>
      getConfiguredAbilityEffect(ability, {
        statModifiers: {
          control: 4,
          insight: 2,
        },
        effectivenessMultiplier: 1.04,
      }),
  },
  {
    id: 'triage-rhythm',
    condition: (context) =>
      context.phase === 'recovery' ||
      (hasCaseRuntimeContext(context) &&
        hasAnyRuntimeContextTag(context, [
          'medical',
          'triage',
          'medic',
          'hazmat',
          'support',
          'rescue',
        ])),
    modifier: (context, ability) =>
      context.phase === 'recovery'
        ? getConfiguredAbilityEffect(ability, {
            moraleRecoveryDelta: 4,
          })
        : getConfiguredAbilityEffect(ability, {
            statModifiers: {
              presence: 2,
              resilience: 2,
            },
            stressImpactMultiplier: 0.94,
          }),
    contextHint: 'Active during recovery or on medical/support operations.',
  },
  {
    id: 'civil-calibration',
    condition: () => true,
    modifier: (_context, ability) => getConfiguredAbilityEffect(ability),
    contextHint: 'Always active as a self-only support presence boost.',
  },
  {
    id: 'ward-hum',
    condition: (context) =>
      hasCaseRuntimeContext(context) &&
      hasAnomalyExposureRuntimeContext(context),
    modifier: (_context, ability) =>
      getConfiguredAbilityEffect(ability, {
        statModifiers: {
          control: 3,
          anomaly: 4,
        },
        stressImpactMultiplier: 0.9,
      }),
    contextHint: 'Active on anomaly exposure cases only.',
  },
  {
    id: 'sustained-focus',
    condition: (context) =>
      hasCaseRuntimeContext(context) && hasLongAssignmentRuntimeContext(context),
    modifier: (_context, ability) =>
      getConfiguredAbilityEffect(ability, {
        effectivenessMultiplier: 1.05,
        statModifiers: {
          resilience: 2,
          insight: 2,
        },
      }),
    contextHint: 'Active on long-duration assignments only.',
  },
]

const ABILITY_DEFINITION_ID_SET = new Set(
  ABILITY_DEFINITIONS.map((definition) => definition.id)
)

function isTriggerSatisfied(
  ability: AgentAbility,
  context: AbilityEvaluationContext
) {
  if (isPassiveAbility(ability)) {
    return true
  }

  if (!ability.trigger) {
    return false
  }

  if (context.triggerEvent === ability.trigger) {
    return true
  }

  if (context.triggerEvent === 'OnCaseStart' && ability.trigger === 'OnResolutionCheck') {
    return true
  }

  if (
    context.triggerEvent === 'OnCaseStart' &&
    ability.trigger === 'OnExposure' &&
    hasAnomalyExposureRuntimeContext(context)
  ) {
    return true
  }

  return false
}

function getAbilityDefinition(ability: AgentAbility) {
  return ABILITY_DEFINITIONS.find((definition) => definition.id === ability.id)
}

export function getAbilityDefinitionById(abilityId: string) {
  return ABILITY_DEFINITIONS.find((definition) => definition.id === abilityId)
}

export function hasAbilityDefinition(abilityId: string) {
  return ABILITY_DEFINITION_ID_SET.has(abilityId)
}

export function getAbilityContextHint(ability: AgentAbility) {
  return getAbilityDefinition(ability)?.contextHint
}

export function getAuthoredAbilityValidationIssues(
  owners: readonly AuthoredAbilityOwner[]
): AuthoredAbilityValidationIssue[] {
  return owners.flatMap((owner) =>
    (owner.abilities ?? [])
      .filter((ability) => !hasAbilityDefinition(ability.id))
      .map((ability) => ({
        ownerId: owner.ownerId,
        ownerName: owner.ownerName,
        abilityId: ability.id,
      }))
  )
}

export function assertKnownAuthoredAbilities(
  owners: readonly AuthoredAbilityOwner[],
  contextLabel = 'authored abilities'
) {
  const issues = getAuthoredAbilityValidationIssues(owners)

  if (issues.length === 0) {
    return
  }

  const details = issues
    .map((issue) =>
      issue.ownerName
        ? `${issue.ownerId} (${issue.ownerName}): ${issue.abilityId}`
        : `${issue.ownerId}: ${issue.abilityId}`
    )
    .join(', ')

  throw new Error(`Unknown ${contextLabel}: ${details}`)
}

export function resolveAbilityEffect(
  ability: AgentAbility,
  context: AbilityEvaluationContext
): AbilityEffectResult {
  const triggerSatisfied = isTriggerSatisfied(ability, context)

  if (isPassiveAbility(ability)) {
    const definition = getAbilityDefinition(ability)
    const effect =
      !definition
        ? getConfiguredAbilityEffect(ability)
        : definition.condition(context, ability)
          ? createRuntimeModifierResult(definition.modifier(context, ability))
          : createRuntimeModifierResult()

    return {
      abilityId: ability.id,
      type: ability.type,
      trigger: ability.trigger,
      triggerSatisfied,
      activeInMvp: true,
      modifiers: effect.statModifiers,
      effectivenessMultiplier: effect.effectivenessMultiplier,
      stressImpactMultiplier: effect.stressImpactMultiplier,
      moraleRecoveryDelta: effect.moraleRecoveryDelta,
      ...(ability.cooldown !== undefined ? { cooldown: ability.cooldown } : {}),
    }
  }

  // Active abilities execute when their trigger is satisfied and cooldown is ready.
  if (triggerSatisfied) {
    const cooldownRemaining = context.agent.abilityState?.[ability.id]?.cooldownRemaining ?? 0

    if (cooldownRemaining <= 0) {
      const definition = getAbilityDefinition(ability)
      const effect =
        !definition
          ? getConfiguredAbilityEffect(ability)
          : definition.condition(context, ability)
            ? createRuntimeModifierResult(definition.modifier(context, ability))
            : createRuntimeModifierResult()

      return {
        abilityId: ability.id,
        type: ability.type,
        trigger: ability.trigger,
        triggerSatisfied,
        activeInMvp: true,
        modifiers: effect.statModifiers,
        effectivenessMultiplier: effect.effectivenessMultiplier,
        stressImpactMultiplier: effect.stressImpactMultiplier,
        moraleRecoveryDelta: effect.moraleRecoveryDelta,
        ...(ability.cooldown !== undefined ? { cooldown: ability.cooldown } : {}),
      }
    }
  }

  // Active ability is inert: trigger not satisfied or ability is on cooldown.
  return {
    abilityId: ability.id,
    type: ability.type,
    trigger: ability.trigger,
    triggerSatisfied,
    activeInMvp: false,
    modifiers: {},
    effectivenessMultiplier: 1,
    stressImpactMultiplier: 1,
    moraleRecoveryDelta: 0,
    ...(ability.cooldown !== undefined ? { cooldown: ability.cooldown } : {}),
  }
}

export function resolveAbilityModifiers(
  ability: AgentAbility,
  context: AbilityEvaluationContext
): AbilityModifierMap {
  return resolveAbilityEffect(ability, context).modifiers
}

export function resolveAgentAbilityEffects(
  agent: Agent,
  context: Omit<AbilityEvaluationContext, 'agent'>
): AbilityEffectResult[] {
  return (agent.abilities ?? []).map((ability) =>
    resolveAbilityEffect(ability, {
      ...context,
      agent,
    })
  )
}

export function aggregateAbilityEffects(effects: AbilityEffectResult[]): AbilityModifierResult {
  return aggregateRuntimeModifierResults(
    effects.map((effect) =>
      createRuntimeModifierResult({
        statModifiers: effect.modifiers,
        effectivenessMultiplier: effect.effectivenessMultiplier,
        stressImpactMultiplier: effect.stressImpactMultiplier,
        moraleRecoveryDelta: effect.moraleRecoveryDelta,
      })
    )
  )
}

export function resolveAgentAbilityModifiers(
  agent: Agent,
  context: Omit<AbilityEvaluationContext, 'agent'>
): AbilityModifierMap[] {
  return resolveAgentAbilityEffects(agent, context)
    .filter((result) => Object.keys(result.modifiers).length > 0)
    .map((result) => result.modifiers)
}
