/**
 * SPE-781 slice 3 (SPE-2252): compose behavior-weighted disguise validation with tiered reveal payloads.
 *
 * Does not alter validation scores, detection confidence aggregation, or case application helpers.
 */

import {
  evaluateBehaviorWeightedDisguiseValidation,
  resolveDisguiseValidationContextFromCase,
  type BehaviorWeightedDisguiseValidationContext,
  type BehaviorWeightedDisguiseValidationResult,
} from './disguiseValidation'
import type { Agent, CaseInstance } from './models'
import {
  resolveDetectionScan,
  type DetectionScanInput,
  type DetectionScanResult,
  type HostilityLevel,
  type SubjectTruthState,
} from './revealPayload'
import {
  concealmentLayersFromRating,
  detectionScanTierOrder,
} from './revealPayloadScoutingIntegration'

export { detectionScanTierOrder }

export interface DisguiseRevealSubject {
  readonly exactIdentity: string
  readonly category: string
  readonly hostility?: HostilityLevel
  readonly activeProtections?: readonly string[]
  readonly activeEffects?: readonly string[]
  readonly dormantEffects?: readonly string[]
}

export interface DisguiseRevealIntegrationInput {
  readonly caseData: CaseInstance
  readonly agents: readonly Agent[]
  readonly subject: DisguiseRevealSubject
  readonly context?: BehaviorWeightedDisguiseValidationContext
}

export interface DisguiseRevealIntegrationResult extends BehaviorWeightedDisguiseValidationResult {
  readonly detectionScan: DetectionScanResult
}

function clampConcealmentRating(rating: number) {
  if (!Number.isFinite(rating)) {
    return 0
  }

  return Math.max(0, Math.min(3, Math.floor(rating)))
}

function normalizeAwarenessPressure(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.min(1, value))
}

function normalizeDocumentTier(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) {
    return 2
  }

  return Math.max(0, Math.min(2, Math.floor(value)))
}

export function disguiseConcealmentRatingFromCase(
  caseData: CaseInstance,
  context: BehaviorWeightedDisguiseValidationContext = {}
): number {
  const resolved = resolveDisguiseValidationContextFromCase(caseData, context)
  const awareness = normalizeAwarenessPressure(resolved.infiltrationAwareness)
  const documentTier = normalizeDocumentTier(resolved.documentTier)
  let rating = Math.floor(awareness * 2)

  if (documentTier <= 0) {
    rating += 1
  }

  return clampConcealmentRating(rating)
}

export function buildSubjectTruthFromDisguise(
  caseData: CaseInstance,
  subject: DisguiseRevealSubject,
  context: BehaviorWeightedDisguiseValidationContext = {}
): SubjectTruthState {
  const present = caseData.hiddenState === 'hidden'

  return {
    present,
    exactIdentity: subject.exactIdentity,
    category: subject.category,
    hostility: subject.hostility ?? 'latent',
    activeProtections: subject.activeProtections ?? [],
    concealmentLayers: concealmentLayersFromRating(
      disguiseConcealmentRatingFromCase(caseData, context)
    ),
    activeEffects: subject.activeEffects ?? [],
    dormantEffects: subject.dormantEffects ?? [],
  }
}

export function disguiseValidationToDetectionScan(
  validation: Pick<BehaviorWeightedDisguiseValidationResult, 'active' | 'level' | 'counterDetection'>
): DetectionScanInput {
  if (!validation.active) {
    return { family: 'presence_sweep' }
  }

  switch (validation.level) {
    case 'none':
      return { family: 'presence_sweep' }
    case 'meaningful':
      return { family: 'category_pass' }
    case 'strong':
      return {
        family: 'identity_probe',
        layersToStrip: validation.counterDetection ? 1 : 0,
      }
    default: {
      const _exhaustive: never = validation.level
      return _exhaustive
    }
  }
}

export function evaluateBehaviorWeightedDisguiseValidationWithRevealPayload(
  input: DisguiseRevealIntegrationInput
): DisguiseRevealIntegrationResult {
  const context = input.context ?? {}
  const validation = evaluateBehaviorWeightedDisguiseValidation(
    input.caseData,
    [...input.agents],
    context
  )
  const truth = buildSubjectTruthFromDisguise(input.caseData, input.subject, context)
  const scanInput = disguiseValidationToDetectionScan(validation)
  const detectionScan = resolveDetectionScan(truth, scanInput)

  return {
    ...validation,
    detectionScan,
  }
}
