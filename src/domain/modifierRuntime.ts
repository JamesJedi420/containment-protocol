import type { Agent, CaseInstance, Id } from './models'
import {
  aggregateRuntimeModifierResults,
  createRuntimeModifierResult,
  getConfiguredRuntimeModifierEffect,
  hasModifierPayload,
  mergeRuntimeModifierMaps,
  type RuntimeModifierMap,
  type RuntimeModifierResult,
} from './shared/modifiers'
import { createTagSet, hasAnyTag } from './shared/tags'

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

export {
  aggregateRuntimeModifierResults,
  createRuntimeModifierResult,
  getConfiguredRuntimeModifierEffect,
  hasModifierPayload,
  mergeRuntimeModifierMaps,
}
export type { RuntimeModifierMap, RuntimeModifierResult }

export function buildRuntimeContextTagSet(context: RuntimeModifierContext) {
  return createTagSet(
    [context.agent.role],
    context.agent.tags,
    context.caseData?.tags,
    context.caseData?.requiredTags,
    context.caseData?.preferredTags,
    context.supportTags,
    context.teamTags
  )
}

export function hasAnyRuntimeContextTag(context: RuntimeModifierContext, tags: readonly string[]) {
  return hasAnyTag(buildRuntimeContextTagSet(context), tags)
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
