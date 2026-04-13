// cspell:words psionic
import type { Agent, AgentTraitModifierKey, CaseInstance, Id } from './models'

export interface RuntimeModifierContext {
  agent: Agent
  caseData?: CaseInstance
  supportTags?: string[]
  teamTags?: string[]
  leaderId?: Id | null
  phase: 'evaluation' | 'recovery'
  triggerEvent?: string
  stressGain?: number
}

export type RuntimeModifierMap = Partial<Record<AgentTraitModifierKey, number>>

export interface RuntimeModifierResult {
  statModifiers: RuntimeModifierMap
  effectivenessMultiplier: number
  stressImpactMultiplier: number
  moraleRecoveryDelta: number
}

export function hasModifierPayload(modifiers: RuntimeModifierMap | undefined) {
  return Object.values(modifiers ?? {}).some((value) => value !== 0)
}

export function createRuntimeModifierResult(
  overrides: Partial<RuntimeModifierResult> = {}
): RuntimeModifierResult {
  return {
    statModifiers: overrides.statModifiers ?? {},
    effectivenessMultiplier:
      overrides.effectivenessMultiplier !== undefined ? overrides.effectivenessMultiplier : 1,
    stressImpactMultiplier:
      overrides.stressImpactMultiplier !== undefined ? overrides.stressImpactMultiplier : 1,
    moraleRecoveryDelta:
      overrides.moraleRecoveryDelta !== undefined ? overrides.moraleRecoveryDelta : 0,
  }
}

export function mergeRuntimeModifierMaps(
  left: RuntimeModifierMap,
  right: RuntimeModifierMap
): RuntimeModifierMap {
  const keys = new Set<AgentTraitModifierKey>([
    ...Object.keys(left),
    ...Object.keys(right),
  ] as AgentTraitModifierKey[])
  const merged: RuntimeModifierMap = {}

  for (const key of keys) {
    const value = (left[key] ?? 0) + (right[key] ?? 0)
    if (value !== 0) {
      merged[key] = value
    }
  }

  return merged
}

export function aggregateRuntimeModifierResults(
  effects: RuntimeModifierResult[]
): RuntimeModifierResult {
  return effects.reduce(
    (aggregate, effect) =>
      createRuntimeModifierResult({
        statModifiers: mergeRuntimeModifierMaps(aggregate.statModifiers, effect.statModifiers),
        effectivenessMultiplier: aggregate.effectivenessMultiplier * effect.effectivenessMultiplier,
        stressImpactMultiplier: aggregate.stressImpactMultiplier * effect.stressImpactMultiplier,
        moraleRecoveryDelta: aggregate.moraleRecoveryDelta + effect.moraleRecoveryDelta,
      }),
    createRuntimeModifierResult()
  )
}

export function getConfiguredRuntimeModifierEffect(
  modifiers: RuntimeModifierMap | undefined,
  fallback: Partial<RuntimeModifierResult> = {}
): RuntimeModifierResult {
  return createRuntimeModifierResult({
    ...fallback,
    statModifiers: mergeRuntimeModifierMaps(fallback.statModifiers ?? {}, modifiers ?? {}),
  })
}

export function buildRuntimeContextTagSet(context: RuntimeModifierContext) {
  return new Set([
    context.agent.role,
    ...(context.agent.tags ?? []),
    ...(context.caseData?.tags ?? []),
    ...(context.caseData?.requiredTags ?? []),
    ...(context.caseData?.preferredTags ?? []),
    ...(context.supportTags ?? []),
    ...(context.teamTags ?? []),
  ])
}

export function hasAnyRuntimeContextTag(context: RuntimeModifierContext, tags: readonly string[]) {
  const contextTags = buildRuntimeContextTagSet(context)
  return tags.some((tag) => contextTags.has(tag))
}

export function hasCaseRuntimeContext(context: RuntimeModifierContext) {
  return context.caseData !== undefined
}

export function hasLongAssignmentRuntimeContext(context: RuntimeModifierContext) {
  return (context.caseData?.durationWeeks ?? 0) >= 3 || (context.caseData?.weeksRemaining ?? 0) >= 3
}

export function hasWitnessInterviewRuntimeContext(context: RuntimeModifierContext) {
  return (
    hasAnyRuntimeContextTag(context, [
      'witness',
      'interview',
      'civilian',
      'negotiation',
      'social',
      'psionic',
    ]) || (context.caseData?.weights.social ?? 0) >= 0.2
  )
}

export function hasAnomalyExposureRuntimeContext(context: RuntimeModifierContext) {
  return hasAnyRuntimeContextTag(context, [
    'occult',
    'anomaly',
    'psionic',
    'ritual',
    'spirit',
    'hybrid',
    'seal',
  ])
}

export function isLeaderRuntimeContext(context: RuntimeModifierContext) {
  return (
    context.leaderId !== null &&
    context.leaderId !== undefined &&
    context.leaderId === context.agent.id
  )
}
