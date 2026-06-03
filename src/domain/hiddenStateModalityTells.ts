/**
 * SPE-2286 slice 6: deterministic mode-specific tells for hidden-state modalities.
 */

import type { Agent, CaseInstance } from './models'
import {
  anomalyConcealmentFromCase,
  teamScoutingCapabilityFromAgents,
} from './revealPayloadScoutingIntegration'
import { resolveHiddenStateModality, type HiddenStateModalityKind } from './hiddenStateModality'

export type HiddenStateTellKind =
  | 'thermal_residual'
  | 'route_timing'
  | 'speech_cadence'
  | 'metadata_spoof'
  | 'signature_drift'

export const TELL_THERMAL_RESIDUAL_TAG = 'tell-thermal-residual'
export const TELL_SIGNATURE_DRIFT_TAG = 'tell-signature-drift'
export const TELL_ROUTE_TIMING_TAG = 'tell-route-timing'
export const TELL_SPEECH_CADENCE_TAG = 'tell-speech-cadence'
export const TELL_METADATA_SPOOF_TAG = 'tell-metadata-spoof'
export const OBSERVER_THRESHOLD_STRICT_TAG = 'observer-threshold-strict'

export const CONCEALMENT_TELL_READOUT_PREFIX = 'Concealment tell readout:'
export const DISPLACEMENT_TELL_READOUT_PREFIX = 'Displacement tell readout:'
export const COVER_TELL_READOUT_PREFIX = 'Cover tell readout:'
export const SIGNATURE_MASK_TELL_READOUT_PREFIX = 'Signature mask tell readout:'

export const MODALITY_TELL_READOUT_PREFIXES = [
  CONCEALMENT_TELL_READOUT_PREFIX,
  DISPLACEMENT_TELL_READOUT_PREFIX,
  COVER_TELL_READOUT_PREFIX,
  SIGNATURE_MASK_TELL_READOUT_PREFIX,
] as const

const MEANINGFUL_DETECTION_CONFIDENCE_FLOOR = 0.6
const TELL_SCORE_ADJUSTMENT = 2

export interface HiddenStateModalityTellResult {
  readonly active: boolean
  readonly kind?: HiddenStateTellKind
  readonly modality: HiddenStateModalityKind
  readonly readoutPrefix?: string
  readonly readoutLine?: string
  readonly scoreAdjustment: number
  readonly scoreAdjustmentReason?: string
}

const INACTIVE_TELL: HiddenStateModalityTellResult = {
  active: false,
  modality: 'none',
  scoreAdjustment: 0,
}

interface TellCandidate {
  readonly priority: number
  readonly kind: HiddenStateTellKind
  readonly modality: HiddenStateModalityKind
  readonly tag: string
}

const TELL_CANDIDATES: readonly TellCandidate[] = [
  {
    priority: 0,
    kind: 'speech_cadence',
    modality: 'disguised_identity',
    tag: TELL_SPEECH_CADENCE_TAG,
  },
  {
    priority: 1,
    kind: 'metadata_spoof',
    modality: 'disguised_identity',
    tag: TELL_METADATA_SPOOF_TAG,
  },
  {
    priority: 2,
    kind: 'route_timing',
    modality: 'false_position',
    tag: TELL_ROUTE_TIMING_TAG,
  },
  {
    priority: 3,
    kind: 'signature_drift',
    modality: 'signature_masking',
    tag: TELL_SIGNATURE_DRIFT_TAG,
  },
  {
    priority: 4,
    kind: 'thermal_residual',
    modality: 'concealed_presence',
    tag: TELL_THERMAL_RESIDUAL_TAG,
  },
]

function caseTagSet(caseData: CaseInstance): Set<string> {
  return new Set([
    ...(caseData.tags ?? []),
    ...(caseData.requiredTags ?? []),
    ...(caseData.preferredTags ?? []),
  ])
}

function requiresObserverThresholdGate(caseData: CaseInstance, tags: Set<string>): boolean {
  if (tags.has(OBSERVER_THRESHOLD_STRICT_TAG)) {
    return true
  }

  const detectionConfidence =
    typeof caseData.detectionConfidence === 'number' ? caseData.detectionConfidence : 0

  return detectionConfidence > MEANINGFUL_DETECTION_CONFIDENCE_FLOOR
}

function observerBandTooWeakForConcealment(
  caseData: CaseInstance,
  agents: readonly Agent[]
): boolean {
  const teamCapability = teamScoutingCapabilityFromAgents(agents)
  const anomalyConcealment = anomalyConcealmentFromCase(caseData)

  return teamCapability < anomalyConcealment
}

function resolvePrimaryTellCandidate(
  caseData: CaseInstance,
  modality: HiddenStateModalityKind
): TellCandidate | null {
  const tags = caseTagSet(caseData)

  for (const candidate of TELL_CANDIDATES) {
    if (candidate.modality === modality && tags.has(candidate.tag)) {
      return candidate
    }
  }

  return null
}

export function tellReadoutPrefixForModality(modality: HiddenStateModalityKind): string | null {
  switch (modality) {
    case 'concealed_presence':
      return CONCEALMENT_TELL_READOUT_PREFIX
    case 'false_position':
      return DISPLACEMENT_TELL_READOUT_PREFIX
    case 'disguised_identity':
      return COVER_TELL_READOUT_PREFIX
    case 'signature_masking':
      return SIGNATURE_MASK_TELL_READOUT_PREFIX
    case 'false_detection_output':
    case 'glamour_overlay':
    case 'out_of_phase_presence':
    case 'none':
      return null
    default: {
      const _exhaustive: never = modality
      return _exhaustive
    }
  }
}

export function formatModalityTellReadout(
  kind: HiddenStateTellKind,
  caseData: CaseInstance
): string {
  switch (kind) {
    case 'thermal_residual':
      return 'Residual signature and timing do not match baseline occupancy.'
    case 'route_timing': {
      const decoy = caseData.displacementTarget?.trim()
      if (decoy !== undefined && decoy.length > 0) {
        return `Decoy locus ${decoy} timing is inconsistent with the filed movement log.`
      }

      return 'Decoy locus timing is inconsistent with the filed movement log.'
    }
    case 'speech_cadence':
      return 'Speech cadence does not match the claimed cover profile.'
    case 'metadata_spoof':
      return 'Contact metadata shows spoofed chain-of-custody markers.'
    case 'signature_drift':
      return 'Class estimate drifts from filed baseline without matching exact identity markers.'
    default: {
      const _exhaustive: never = kind
      return _exhaustive
    }
  }
}

export function evaluateHiddenStateModalityTell(input: {
  readonly caseData: CaseInstance
  readonly agents: readonly Agent[]
  readonly disguiseValidationActive: boolean
}): HiddenStateModalityTellResult {
  if (input.disguiseValidationActive || input.agents.length === 0) {
    return INACTIVE_TELL
  }

  const modality = resolveHiddenStateModality(input.caseData)
  if (modality === 'none') {
    return INACTIVE_TELL
  }

  const candidate = resolvePrimaryTellCandidate(input.caseData, modality)
  if (candidate === null) {
    return { ...INACTIVE_TELL, modality }
  }

  const tags = caseTagSet(input.caseData)
  if (
    requiresObserverThresholdGate(input.caseData, tags) &&
    !observerBandTooWeakForConcealment(input.caseData, input.agents)
  ) {
    return { ...INACTIVE_TELL, modality }
  }

  const prefix = tellReadoutPrefixForModality(modality)
  const sentence = formatModalityTellReadout(candidate.kind, input.caseData)
  const readoutLine =
    prefix !== null && sentence.length > 0 ? `${prefix} ${sentence}` : undefined

  return {
    active: true,
    kind: candidate.kind,
    modality,
    readoutPrefix: prefix ?? undefined,
    readoutLine,
    scoreAdjustment: TELL_SCORE_ADJUSTMENT,
    scoreAdjustmentReason: readoutLine,
  }
}
