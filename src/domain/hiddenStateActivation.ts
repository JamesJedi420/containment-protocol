/**
 * SPE-2107: deterministic runtime concealment activation from tags, global flags, and recon signals.
 * Distinct from SPE-70 field propagation and behavior-weighted disguise validation.
 */

import type { CaseInstance, GameFlagValue, Id } from './models'

export type ConcealmentActivationMode = 'hidden' | 'displaced'

export interface ConcealmentActivationContext {
  globalFlags: Readonly<Record<string, GameFlagValue>>
  /** From `countCaseHiddenModifiers` when a recon bridge is desired. */
  hiddenModifierCount?: number
}

export interface ConcealmentActivationResult {
  applied: boolean
  mode?: ConcealmentActivationMode
  reason?: string
  detectionConfidence?: number
  displacementTarget?: Id | null
}

/** Case tags that can activate concealed presence without manual `hiddenState` assignment. */
export const CONCEALMENT_ACTIVATION_TAGS = [
  'infiltration',
  'disguise',
  'stealth',
  'concealment',
  'covert',
] as const

const GLOBAL_CONCEAL_PREFIX = 'conceal.'
const GLOBAL_CONCEAL_CASE_PREFIX = 'conceal.case.'
const GLOBAL_CONCEAL_DISPLACE_PREFIX = 'conceal.displace.'
const MIN_HIDDEN_MODIFIER_COUNT = 2
const MIN_INVESTIGATION_WEIGHT_FOR_RECON_BRIDGE = 0.3
const DEFAULT_HIDDEN_DETECTION_CONFIDENCE = 0.25
const DEFAULT_DISPLACED_DETECTION_CONFIDENCE = 0.55

function isTruthyGameFlag(value: GameFlagValue | undefined) {
  if (value === undefined || value === null) {
    return false
  }

  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    return value !== 0
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return normalized.length > 0 && normalized !== 'false' && normalized !== '0'
  }

  return false
}

function collectCaseTags(caseData: CaseInstance) {
  return [...new Set([...caseData.tags, ...caseData.requiredTags, ...caseData.preferredTags])]
}

function hasConcealmentActivationTag(caseData: CaseInstance) {
  const caseTags = collectCaseTags(caseData)
  return CONCEALMENT_ACTIVATION_TAGS.some((tag) => caseTags.includes(tag))
}

function isSharedConcealGlobalFlag(flagId: string) {
  return (
    flagId.startsWith(GLOBAL_CONCEAL_PREFIX) &&
    !flagId.startsWith(GLOBAL_CONCEAL_CASE_PREFIX) &&
    !flagId.startsWith(GLOBAL_CONCEAL_DISPLACE_PREFIX)
  )
}

function hasSharedConcealGlobalFlag(globalFlags: Readonly<Record<string, GameFlagValue>>) {
  return Object.entries(globalFlags).some(
    ([flagId, value]) => isSharedConcealGlobalFlag(flagId) && isTruthyGameFlag(value)
  )
}

function readPerCaseConcealFlag(
  globalFlags: Readonly<Record<string, GameFlagValue>>,
  caseId: Id,
  prefix: string
): GameFlagValue | undefined {
  return globalFlags[`${prefix}${caseId}`]
}

function readDisplacementTarget(
  globalFlags: Readonly<Record<string, GameFlagValue>>,
  caseId: Id
): Id | null {
  const value = readPerCaseConcealFlag(globalFlags, caseId, GLOBAL_CONCEAL_DISPLACE_PREFIX)
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function matchesReconBridge(caseData: CaseInstance, hiddenModifierCount: number | undefined) {
  if (hiddenModifierCount === undefined) {
    return false
  }

  return (
    hiddenModifierCount >= MIN_HIDDEN_MODIFIER_COUNT &&
    caseData.weights.investigation >= MIN_INVESTIGATION_WEIGHT_FOR_RECON_BRIDGE
  )
}

function canApplyActivation(caseData: CaseInstance) {
  return caseData.hiddenState === undefined
}

/**
 * Resolves whether a case should enter concealed presence this week.
 * Does not mutate the case; use {@link applyConcealmentActivationToCase} for merges.
 */
export function resolveConcealmentActivation(
  caseData: CaseInstance,
  context: ConcealmentActivationContext
): ConcealmentActivationResult {
  if (!canApplyActivation(caseData)) {
    return { applied: false }
  }

  const { globalFlags } = context
  const displacementTarget = readDisplacementTarget(globalFlags, caseData.id)
  if (displacementTarget) {
    return {
      applied: true,
      mode: 'displaced',
      reason: `global-flag:${GLOBAL_CONCEAL_DISPLACE_PREFIX}${caseData.id}`,
      detectionConfidence: DEFAULT_DISPLACED_DETECTION_CONFIDENCE,
      displacementTarget,
    }
  }

  const perCaseFlag = readPerCaseConcealFlag(globalFlags, caseData.id, GLOBAL_CONCEAL_CASE_PREFIX)
  if (isTruthyGameFlag(perCaseFlag)) {
    return {
      applied: true,
      mode: 'hidden',
      reason: `global-flag:${GLOBAL_CONCEAL_CASE_PREFIX}${caseData.id}`,
      detectionConfidence: DEFAULT_HIDDEN_DETECTION_CONFIDENCE,
    }
  }

  if (hasSharedConcealGlobalFlag(globalFlags)) {
    return {
      applied: true,
      mode: 'hidden',
      reason: `global-flag-prefix:${GLOBAL_CONCEAL_PREFIX}`,
      detectionConfidence: DEFAULT_HIDDEN_DETECTION_CONFIDENCE,
    }
  }

  if (hasConcealmentActivationTag(caseData)) {
    return {
      applied: true,
      mode: 'hidden',
      reason: 'case-tag',
      detectionConfidence: DEFAULT_HIDDEN_DETECTION_CONFIDENCE,
    }
  }

  if (matchesReconBridge(caseData, context.hiddenModifierCount)) {
    return {
      applied: true,
      mode: 'hidden',
      reason: 'recon-hidden-modifiers',
      detectionConfidence: DEFAULT_HIDDEN_DETECTION_CONFIDENCE,
    }
  }

  return { applied: false }
}

/** Merges activation fields onto a case when {@link resolveConcealmentActivation} applies. */
export function applyConcealmentActivationToCase(
  caseData: CaseInstance,
  context: ConcealmentActivationContext
): CaseInstance {
  const activation = resolveConcealmentActivation(caseData, context)
  if (!activation.applied || !activation.mode) {
    return caseData
  }

  if (activation.mode === 'displaced') {
    return {
      ...caseData,
      hiddenState: 'displaced',
      detectionConfidence: activation.detectionConfidence,
      displacementTarget: activation.displacementTarget ?? null,
      counterDetection: caseData.counterDetection ?? false,
    }
  }

  return {
    ...caseData,
    hiddenState: 'hidden',
    detectionConfidence: activation.detectionConfidence,
    counterDetection: caseData.counterDetection ?? false,
  }
}
