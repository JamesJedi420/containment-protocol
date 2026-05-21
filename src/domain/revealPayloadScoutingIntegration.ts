/**
 * SPE-781 slice 2: compose SPE-59 scouting resolution with tiered reveal payloads.
 *
 * Does not alter scouting outcome bands, modifier aggregation, or legacy revealed/withheld flags.
 */

import {
  resolveDetectionScan,
  type ConcealmentLayer,
  type DetectionScanInput,
  type DetectionScanResult,
  type HostilityLevel,
  type RevealTier,
  type SubjectTruthState,
} from './revealPayload'
import {
  computeEffectiveScoutingConcealment,
  resolveScouting,
  type ScoutingInput,
  type ScoutingResult,
} from './scoutingResolution'

export interface ScoutingRevealSubject {
  readonly present?: boolean
  readonly exactIdentity: string
  readonly category: string
  readonly hostility?: HostilityLevel
  readonly activeProtections?: readonly string[]
  readonly activeEffects?: readonly string[]
  readonly dormantEffects?: readonly string[]
}

export interface ScoutingRevealIntegrationInput extends ScoutingInput {
  readonly subject: ScoutingRevealSubject
}

export interface ScoutingRevealIntegrationResult extends ScoutingResult {
  readonly detectionScan: DetectionScanResult
}

const GLAMOUR_LAYER: ConcealmentLayer = {
  id: 'layer:glamour',
  blockedTiers: ['category', 'exact_identity', 'hostility'],
}

const SIGNATURE_MASK_LAYER: ConcealmentLayer = {
  id: 'layer:signature-mask',
  blockedTiers: ['exact_identity'],
}

function clampConcealmentRating(rating: number) {
  if (!Number.isFinite(rating)) {
    return 0
  }

  return Math.max(0, Math.min(3, Math.floor(rating)))
}

export function concealmentLayersFromRating(anomalyConcealment: number): readonly ConcealmentLayer[] {
  const rating = clampConcealmentRating(anomalyConcealment)
  const layers: ConcealmentLayer[] = []

  if (rating >= 2) {
    layers.push(GLAMOUR_LAYER)
  }

  if (rating >= 1) {
    layers.push(SIGNATURE_MASK_LAYER)
  }

  return layers
}

export function buildSubjectTruthFromScouting(
  input: ScoutingInput,
  subject: ScoutingRevealSubject
): SubjectTruthState {
  const present = subject.present ?? true
  const { concealment } = computeEffectiveScoutingConcealment(input)

  return {
    present,
    exactIdentity: subject.exactIdentity,
    category: subject.category,
    hostility: subject.hostility ?? 'latent',
    activeProtections: subject.activeProtections ?? [],
    concealmentLayers: concealmentLayersFromRating(concealment),
    activeEffects: subject.activeEffects ?? [],
    dormantEffects: subject.dormantEffects ?? [],
  }
}

export function scoutingOutcomeToDetectionScan(
  scouting: Pick<ScoutingResult, 'outcome' | 'revealed' | 'withheld'>
): DetectionScanInput {
  if (scouting.withheld) {
    return { family: 'presence_sweep' }
  }

  if (!scouting.revealed) {
    return { family: 'presence_sweep' }
  }

  switch (scouting.outcome) {
    case 'strong':
      return { family: 'identity_probe', layersToStrip: 1 }
    case 'success':
      return { family: 'category_pass' }
    case 'partial':
      return { family: 'presence_sweep' }
    case 'fail':
    case 'catastrophic':
      return { family: 'presence_sweep' }
    default: {
      const _exhaustive: never = scouting.outcome
      return _exhaustive
    }
  }
}

export function resolveScoutingWithRevealPayload(
  input: ScoutingRevealIntegrationInput
): ScoutingRevealIntegrationResult {
  const scouting = resolveScouting(input)
  const truth = buildSubjectTruthFromScouting(input, input.subject)
  const scanInput = scoutingOutcomeToDetectionScan(scouting)
  const detectionScan = resolveDetectionScan(truth, scanInput)

  return {
    ...scouting,
    detectionScan,
  }
}

/** Test helper: tiers exposed on the detection scan (stable ordering). */
export function detectionScanTierOrder(result: DetectionScanResult): readonly RevealTier[] {
  return result.fields.map((field) => field.tier)
}
