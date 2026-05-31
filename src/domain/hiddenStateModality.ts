/**
 * SPE-70 / SPE-2281 slice 1: case-level hidden-state modalities composed into tiered reveal scans.
 */

import type { ConcealmentLayer, DetectionScanInput, DetectionScanResult, SubjectTruthState } from './revealPayload'
import type { CaseInstance, Id } from './models'
import {
  buildDisguiseRevealSubjectFromCase,
  disguiseConcealmentRatingFromCase,
} from './revealPayloadDisguiseIntegration'
import {
  extraLayersToStripFromIllusion,
  illusionConcealmentLayer,
  resolveIllusionKindFromCase,
  shouldWithholdCanonicalSubjectForIllusion,
} from './hiddenStateIllusionLifecycle'
import { extraLayersToStripFromReconCache } from './hiddenStateScoutingReconCache'
import {
  buildSubjectTruthFromScouting,
  concealmentLayersFromRating,
  scoutingOutcomeToDetectionScan,
  type ScoutingRevealSubject,
} from './revealPayloadScoutingIntegration'
import {
  computeEffectiveScoutingConcealment,
  type ScoutingInput,
  type ScoutingResult,
} from './scoutingResolution'

export type HiddenStateModalityKind =
  | 'none'
  | 'concealed_presence'
  | 'false_position'
  | 'disguised_identity'
  | 'signature_masking'
  | 'false_detection_output'

export const MODALITY_SIGNATURE_MASK_TAG = 'modality-signature-mask'
export const MODALITY_FALSE_DETECTION_TAG = 'modality-false-detection'
export const INSTRUMENTATION_ATTACK_TAG = 'instrumentation-attack'

/** Player-facing category skew when signature-masking modality is active. */
export const SIGNATURE_MASK_CATEGORY_SKEW = 'benign utility signature'

/** Player-facing fabricated readouts when false-detection modality is active. */
export const FALSE_DETECTION_FABRICATED_PRESENCE = 'fabricated maintenance contact'
export const FALSE_DETECTION_FABRICATED_CATEGORY = 'instrumented false contact'

const CONCEALED_PRESENCE_LAYER: ConcealmentLayer = {
  id: 'layer:concealed-presence',
  blockedTiers: ['category', 'hostility', 'exact_identity'],
}

const FALSE_POSITION_LAYER: ConcealmentLayer = {
  id: 'layer:false-position',
  blockedTiers: ['exact_identity'],
}

const DISGUISED_IDENTITY_LAYER: ConcealmentLayer = {
  id: 'layer:disguised-identity',
  blockedTiers: ['exact_identity'],
}

const SIGNATURE_MASKING_LAYER: ConcealmentLayer = {
  id: 'layer:authored-signature-mask',
  blockedTiers: ['exact_identity'],
}

const FALSE_DETECTION_LAYER: ConcealmentLayer = {
  id: 'layer:authored-false-detection',
  blockedTiers: ['exact_identity'],
}

const DISGUISE_SIGNAL_TAGS = ['infiltration', 'disguise', 'covert', 'stealth'] as const

function caseModalityTagSet(caseData: CaseInstance): Set<string> {
  return new Set([
    ...(caseData.tags ?? []),
    ...(caseData.requiredTags ?? []),
    ...(caseData.preferredTags ?? []),
  ])
}

export function caseHasFalseDetectionModality(caseData: CaseInstance): boolean {
  const tags = caseModalityTagSet(caseData)

  return tags.has(MODALITY_FALSE_DETECTION_TAG) || tags.has(INSTRUMENTATION_ATTACK_TAG)
}

export function caseHasSignatureMaskModality(caseData: CaseInstance): boolean {
  return caseModalityTagSet(caseData).has(MODALITY_SIGNATURE_MASK_TAG)
}

export function caseHasDisguiseSignals(caseData: CaseInstance): boolean {
  if (caseData.infiltrationCoverProfile !== undefined) {
    return true
  }

  const tagSet = caseModalityTagSet(caseData)

  return DISGUISE_SIGNAL_TAGS.some((tag) => tagSet.has(tag))
}

export function resolveHiddenStateModality(caseData: CaseInstance): HiddenStateModalityKind {
  if (caseData.hiddenState === 'displaced') {
    return 'false_position'
  }

  if (caseData.hiddenState !== 'hidden') {
    return 'none'
  }

  if (caseHasDisguiseSignals(caseData)) {
    return 'disguised_identity'
  }

  if (caseHasFalseDetectionModality(caseData)) {
    return 'false_detection_output'
  }

  if (caseHasSignatureMaskModality(caseData)) {
    return 'signature_masking'
  }

  return 'concealed_presence'
}

export function hiddenStateModalityLayer(
  modality: HiddenStateModalityKind
): ConcealmentLayer | null {
  switch (modality) {
    case 'concealed_presence':
      return CONCEALED_PRESENCE_LAYER
    case 'false_position':
      return FALSE_POSITION_LAYER
    case 'disguised_identity':
      return DISGUISED_IDENTITY_LAYER
    case 'signature_masking':
      return SIGNATURE_MASKING_LAYER
    case 'false_detection_output':
      return FALSE_DETECTION_LAYER
    case 'none':
      return null
    default: {
      const _exhaustive: never = modality
      return _exhaustive
    }
  }
}

function mergeConcealmentLayers(
  ...layerGroups: readonly (readonly ConcealmentLayer[])[]
): readonly ConcealmentLayer[] {
  const seen = new Set<string>()
  const merged: ConcealmentLayer[] = []

  for (const group of layerGroups) {
    for (const layer of group) {
      if (seen.has(layer.id)) {
        continue
      }

      seen.add(layer.id)
      merged.push(layer)
    }
  }

  return merged
}

function resolveSubjectPresent(subject: ScoutingRevealSubject): boolean {
  return subject.present ?? true
}

function resolveScoutingSubjectForCase(
  caseData: CaseInstance,
  subject: ScoutingRevealSubject,
  modality: HiddenStateModalityKind
): ScoutingRevealSubject {
  if (modality !== 'disguised_identity') {
    return subject
  }

  const disguiseSubject = buildDisguiseRevealSubjectFromCase(caseData)

  return {
    ...subject,
    category: disguiseSubject.category,
    hostility: disguiseSubject.hostility ?? subject.hostility,
    activeProtections: disguiseSubject.activeProtections ?? subject.activeProtections,
    activeEffects: disguiseSubject.activeEffects ?? subject.activeEffects,
    dormantEffects: disguiseSubject.dormantEffects ?? subject.dormantEffects,
  }
}

function scoutingConcealmentLayersForCase(
  caseData: CaseInstance,
  scoutingInput: ScoutingInput,
  modality: HiddenStateModalityKind
): readonly ConcealmentLayer[] {
  const { concealment } = computeEffectiveScoutingConcealment(scoutingInput)
  const scoutingLayers = concealmentLayersFromRating(concealment)

  if (modality === 'disguised_identity') {
    return mergeConcealmentLayers(
      concealmentLayersFromRating(disguiseConcealmentRatingFromCase(caseData)),
      scoutingLayers
    )
  }

  return scoutingLayers
}

/** Truth snapshot for scouting scans with case hidden-state modalities applied. */
export function buildSubjectTruthFromCaseHiddenState(
  caseData: CaseInstance,
  scoutingInput: ScoutingInput,
  subject: ScoutingRevealSubject
): SubjectTruthState {
  const modality = resolveHiddenStateModality(caseData)
  const modalityLayer = hiddenStateModalityLayer(modality)
  const resolvedSubject = resolveScoutingSubjectForCase(caseData, subject, modality)
  let present = resolveSubjectPresent(resolvedSubject)
  if (shouldWithholdCanonicalSubjectForIllusion(caseData)) {
    present = false
  }

  const baseTruth = buildSubjectTruthFromScouting(scoutingInput, {
    ...resolvedSubject,
    present,
  })

  const scoutingLayers = scoutingConcealmentLayersForCase(caseData, scoutingInput, modality)
  const illusionKind = resolveIllusionKindFromCase(caseData)
  const illusionLayer =
    illusionKind !== null &&
    caseData.hiddenStateIllusionState !== undefined &&
    caseData.hiddenStateIllusionState.phase !== 'collapsed'
      ? illusionConcealmentLayer(illusionKind)
      : null
  const layerGroups: ConcealmentLayer[][] = []
  if (illusionLayer) {
    layerGroups.push([illusionLayer])
  }
  if (modalityLayer) {
    layerGroups.push([modalityLayer])
  }
  layerGroups.push(scoutingLayers)
  const concealmentLayers =
    layerGroups.length > 0 ? mergeConcealmentLayers(...layerGroups) : scoutingLayers

  return {
    ...baseTruth,
    present,
    exactIdentity: resolvedSubject.exactIdentity,
    category: resolvedSubject.category,
    concealmentLayers,
  }
}

export function formatDecoyLocusLabel(displacementTarget: Id | null | undefined): string | null {
  if (displacementTarget === null || displacementTarget === undefined) {
    return null
  }

  const trimmed = String(displacementTarget).trim()
  if (trimmed.length === 0) {
    return null
  }

  return `decoy locus ${trimmed}`
}

/** Player-facing scan projection for false-position without mutating canonical identity tiers. */
export function applyFalsePositionScanProjection(
  scan: DetectionScanResult,
  caseData: CaseInstance
): DetectionScanResult {
  const decoyLabel = formatDecoyLocusLabel(caseData.displacementTarget)
  if (decoyLabel === null) {
    return scan
  }

  const fields = scan.fields.map((field) => {
    if (field.tier === 'category') {
      return {
        ...field,
        playerFacingValue: decoyLabel,
        ambiguous: true,
      }
    }

    if (field.tier === 'presence') {
      return {
        ...field,
        playerFacingValue: `contact at ${decoyLabel}`,
        ambiguous: true,
      }
    }

    return field
  })

  return {
    ...scan,
    fields,
  }
}

/** Player-facing scan projection for signature masking without mutating canonical identity tiers. */
export function applySignatureMaskScanProjection(scan: DetectionScanResult): DetectionScanResult {
  const fields = scan.fields.map((field) => {
    if (field.tier === 'category') {
      return {
        ...field,
        playerFacingValue: SIGNATURE_MASK_CATEGORY_SKEW,
        ambiguous: true,
      }
    }

    return field
  })

  return {
    ...scan,
    fields,
  }
}

/** Player-facing scan projection for false-detection output without mutating canonical truth tiers. */
export function applyFalseDetectionScanProjection(scan: DetectionScanResult): DetectionScanResult {
  const fields = scan.fields.map((field) => {
    if (field.tier === 'presence') {
      return {
        ...field,
        playerFacingValue: FALSE_DETECTION_FABRICATED_PRESENCE,
        ambiguous: true,
      }
    }

    if (field.tier === 'category') {
      return {
        ...field,
        playerFacingValue: FALSE_DETECTION_FABRICATED_CATEGORY,
        ambiguous: true,
      }
    }

    return field
  })

  return {
    ...scan,
    fields,
  }
}

export function scoutingOutcomeToDetectionScanForCase(
  scouting: Pick<ScoutingResult, 'outcome' | 'revealed' | 'withheld'>,
  caseData: CaseInstance
): DetectionScanInput {
  const base = scoutingOutcomeToDetectionScan(scouting)
  const modality = resolveHiddenStateModality(caseData)
  let layersToStrip = base.layersToStrip ?? 0

  layersToStrip = Math.max(layersToStrip, extraLayersToStripFromReconCache(caseData))
  layersToStrip = Math.max(layersToStrip, extraLayersToStripFromIllusion(caseData))

  if (modality !== 'none' && caseData.counterDetection) {
    layersToStrip = Math.max(layersToStrip, 1)
  }

  if (layersToStrip === (base.layersToStrip ?? 0)) {
    return base
  }

  return {
    ...base,
    layersToStrip,
  }
}
