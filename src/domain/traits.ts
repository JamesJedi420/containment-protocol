import type {
  Agent,
  AgentTrait,
  CaseInstance,
  Id,
} from './models'
import {
  aggregateRuntimeModifierResults,
  createRuntimeModifierResult,
  getConfiguredRuntimeModifierEffect,
  hasAnomalyExposureRuntimeContext,
  hasAnyRuntimeContextTag,
  hasCaseRuntimeContext,
  hasLongAssignmentRuntimeContext,
  hasWitnessInterviewRuntimeContext,
  isLeaderRuntimeContext,
  type RuntimeModifierContext,
  type RuntimeModifierMap,
  type RuntimeModifierResult,
} from './modifierRuntime'

export interface TraitEvaluationContext extends RuntimeModifierContext {
  caseData?: CaseInstance
  supportTags?: string[]
  teamTags?: string[]
  leaderId?: Id | null
  phase: 'evaluation' | 'recovery'
}

export type TraitModifierMap = RuntimeModifierMap

export type TraitModifierResult = RuntimeModifierResult

export interface ResolvedTraitEffect {
  traitId: string
  active: boolean
  effect: TraitModifierResult
}

export interface TraitDefinition {
  id: string
  condition: (context: TraitEvaluationContext, trait: AgentTrait) => boolean
  modifier: (context: TraitEvaluationContext, trait: AgentTrait) => TraitModifierResult
}

function getConfiguredEffect(
  trait: AgentTrait,
  fallback: Partial<TraitModifierResult> = {}
): TraitModifierResult {
  return getConfiguredRuntimeModifierEffect(trait.modifiers, fallback)
}

export const TRAIT_DEFINITIONS: TraitDefinition[] = [
  {
    id: 'steady-aim',
    condition: (context) =>
      hasCaseRuntimeContext(context) &&
      (context.caseData?.kind === 'raid' ||
        hasAnyRuntimeContextTag(context, [
          'combat',
          'threat',
          'breach',
          'hunter',
          'sniper',
          'marksman',
        ])),
    modifier: (_context, trait) =>
      getConfiguredEffect(trait, {
        statModifiers: {
          tactical: 6,
        },
      }),
  },
  {
    id: 'marksman',
    condition: (context) =>
      hasCaseRuntimeContext(context) &&
      (context.caseData?.kind === 'raid' ||
        hasAnyRuntimeContextTag(context, [
          'combat',
          'threat',
          'breach',
          'hunter',
          'sniper',
          'marksman',
        ])),
    modifier: (_context, trait) =>
      getConfiguredEffect(trait, {
        statModifiers: {
          physical: 5,
          tactical: 5,
        },
      }),
  },
  {
    id: 'fieldcraft',
    condition: (context) =>
      hasCaseRuntimeContext(context) &&
      (context.caseData?.kind === 'raid' ||
        hasAnyRuntimeContextTag(context, [
          'field',
          'wilderness',
          'rural',
          'survival',
          'breach',
          'pursuit',
        ])),
    modifier: (_context, trait) =>
      getConfiguredEffect(trait, {
        statModifiers: {
          physical: 4,
          tactical: 4,
        },
      }),
  },
  {
    id: 'rapid-triage',
    condition: (context) =>
      hasCaseRuntimeContext(context) &&
      hasAnyRuntimeContextTag(context, [
        'medical',
        'medic',
        'triage',
        'biological',
        'hazmat',
        'support',
      ]),
    modifier: (_context, trait) =>
      getConfiguredEffect(trait, {
        statModifiers: {
          social: 4,
          stability: 5,
        },
      }),
  },
  {
    id: 'ward-specialist',
    condition: (context) =>
      hasCaseRuntimeContext(context) &&
      hasAnyRuntimeContextTag(context, [
        'occult',
        'ritual',
        'seal',
        'holy',
        'anomaly',
        'spirit',
        'containment',
      ]),
    modifier: (_context, trait) =>
      getConfiguredEffect(trait, {
        statModifiers: {
          stability: 5,
          technical: 5,
        },
      }),
  },
  {
    id: 'calculated-risk',
    condition: (context) =>
      hasCaseRuntimeContext(context) &&
      (context.caseData?.mode === 'probability' || (context.caseData?.stage ?? 0) >= 3),
    modifier: (_context, trait) =>
      getConfiguredEffect(trait, {
        statModifiers: {
          tactical: 4,
          cognitive: 4,
        },
      }),
  },
  {
    id: 'systems-savant',
    condition: (context) =>
      hasCaseRuntimeContext(context) &&
      (isLeaderRuntimeContext(context) ||
        hasAnyRuntimeContextTag(context, [
          'tech',
          'signal',
          'relay',
          'equipment',
          'analysis',
          'technical',
        ])),
    modifier: (_context, trait) =>
      getConfiguredEffect(trait, {
        statModifiers: {
          technical: 8,
          overall: 1,
        },
      }),
  },
  {
    id: 'disciplined',
    condition: (context) =>
      hasCaseRuntimeContext(context) &&
      (context.agent.fatigue >= 25 ||
        (context.caseData?.stage ?? 0) >= 2 ||
        isLeaderRuntimeContext(context)),
    modifier: (_context, trait) =>
      getConfiguredEffect(trait, {
        statModifiers: {
          stability: 4,
          overall: 1,
        },
      }),
  },
  {
    id: 'marathon-runner',
    condition: (context) =>
      hasCaseRuntimeContext(context) && hasLongAssignmentRuntimeContext(context),
    modifier: (_context, trait) =>
      getConfiguredEffect(trait, {
        effectivenessMultiplier: 1.1,
      }),
  },
  {
    id: 'cold-reader',
    condition: (context) =>
      hasCaseRuntimeContext(context) && hasWitnessInterviewRuntimeContext(context),
    modifier: (_context, trait) =>
      getConfiguredEffect(trait, {
        statModifiers: {
          presence: 6,
          insight: 2,
        },
        effectivenessMultiplier: 1.05,
      }),
  },
  {
    id: 'occult-scar',
    condition: (context) =>
      context.phase === 'recovery' ||
      (hasCaseRuntimeContext(context) && hasAnomalyExposureRuntimeContext(context)),
    modifier: (context, trait) =>
      context.phase === 'recovery'
        ? getConfiguredEffect(trait, {
            moraleRecoveryDelta: -5,
          })
        : getConfiguredEffect(trait, {
            statModifiers: {
              anomaly: 4,
              resilience: 3,
            },
            stressImpactMultiplier: 0.82,
          }),
  },
]

function getTraitDefinition(trait: AgentTrait) {
  return TRAIT_DEFINITIONS.find((definition) => definition.id === trait.id)
}

export function aggregateTraitEffects(effects: TraitModifierResult[]): TraitModifierResult {
  return aggregateRuntimeModifierResults(effects)
}

export function resolveTraitEffect(
  trait: AgentTrait,
  context: TraitEvaluationContext
): ResolvedTraitEffect {
  const definition = getTraitDefinition(trait)

  if (!definition || !definition.condition(context, trait)) {
    return {
      traitId: trait.id,
      active: false,
      effect: createRuntimeModifierResult(),
    }
  }

  return {
    traitId: trait.id,
    active: true,
    effect: createRuntimeModifierResult(definition.modifier(context, trait)),
  }
}

export function resolveTraitModifiers(
  trait: AgentTrait,
  context: TraitEvaluationContext
): TraitModifierMap {
  return resolveTraitEffect(trait, context).effect.statModifiers
}

export function resolveAgentTraitEffects(
  agent: Agent,
  context: Omit<TraitEvaluationContext, 'agent'>
): TraitModifierResult[] {
  return (agent.traits ?? [])
    .map((trait) =>
      resolveTraitEffect(trait, {
        ...context,
        agent,
      })
    )
    .filter((resolvedTraitEffect) => resolvedTraitEffect.active)
    .map((resolvedTraitEffect) => resolvedTraitEffect.effect)
}

export function resolveAgentTraitModifiers(
  agent: Agent,
  context: Omit<TraitEvaluationContext, 'agent'>
): TraitModifierMap[] {
  return resolveAgentTraitEffects(agent, context).map((effect) => effect.statModifiers)
}
