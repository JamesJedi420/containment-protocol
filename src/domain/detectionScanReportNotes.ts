/**
 * SPE-781 slice 5 / SPE-2283 slice 3: player-facing weekly report copy for tiered detection scans.
 */

import type { BehaviorWeightedDisguiseValidationResult } from './disguiseValidation'
import {
  FABRICATED_CONTACT_READOUT_PREFIX,
  STRUCTURAL_ILLUSION_READOUT_PREFIX,
  formatIllusionDisproofSuffix,
  illusionReadoutPrefixForState,
} from './hiddenStateIllusionLifecycle'

export { FABRICATED_CONTACT_READOUT_PREFIX, STRUCTURAL_ILLUSION_READOUT_PREFIX }
import {
  resolveHiddenStateModality,
  type HiddenStateModalityKind,
} from './hiddenStateModality'
import type { CaseInstance } from './models'
import type { DetectionScanResult } from './revealPayload'
import type { DisguiseRevealIntegrationResult } from './revealPayloadDisguiseIntegration'
import type { HiddenStateModalityTellResult } from './hiddenStateModalityTells'
import { MODALITY_TELL_READOUT_PREFIXES } from './hiddenStateModalityTells'
import type { HiddenStateScoutingRevealIntegrationResult } from './revealPayloadScoutingIntegration'

export {
  CONCEALMENT_TELL_READOUT_PREFIX,
  COVER_TELL_READOUT_PREFIX,
  DISPLACEMENT_TELL_READOUT_PREFIX,
  MODALITY_TELL_READOUT_PREFIXES,
} from './hiddenStateModalityTells'

export const DETECTION_SCAN_READOUT_PREFIX = 'Detection readout:'
export const CONCEALMENT_SCAN_READOUT_PREFIX = 'Concealment readout:'
export const DISPLACEMENT_SCAN_READOUT_PREFIX = 'Displacement readout:'
export const COVER_SCAN_READOUT_PREFIX = 'Cover readout:'
export const SIGNATURE_MASK_SCAN_READOUT_PREFIX = 'Signature mask readout:'
export const FALSE_DETECTION_SCAN_READOUT_PREFIX = 'False-detection readout:'
export const GLAMOUR_SCAN_READOUT_PREFIX = 'Glamour readout:'
export const OUT_OF_PHASE_SCAN_READOUT_PREFIX = 'Out-of-phase readout:'

export const DETECTION_SCAN_READOUT_PREFIXES = [
  DETECTION_SCAN_READOUT_PREFIX,
  CONCEALMENT_SCAN_READOUT_PREFIX,
  DISPLACEMENT_SCAN_READOUT_PREFIX,
  COVER_SCAN_READOUT_PREFIX,
  SIGNATURE_MASK_SCAN_READOUT_PREFIX,
  FALSE_DETECTION_SCAN_READOUT_PREFIX,
  GLAMOUR_SCAN_READOUT_PREFIX,
  OUT_OF_PHASE_SCAN_READOUT_PREFIX,
  FABRICATED_CONTACT_READOUT_PREFIX,
  STRUCTURAL_ILLUSION_READOUT_PREFIX,
] as const

export function detectionScanReadoutPrefixForModality(
  modality: HiddenStateModalityKind
): string {
  switch (modality) {
    case 'concealed_presence':
      return CONCEALMENT_SCAN_READOUT_PREFIX
    case 'false_position':
      return DISPLACEMENT_SCAN_READOUT_PREFIX
    case 'disguised_identity':
      return COVER_SCAN_READOUT_PREFIX
    case 'signature_masking':
      return SIGNATURE_MASK_SCAN_READOUT_PREFIX
    case 'false_detection_output':
      return FALSE_DETECTION_SCAN_READOUT_PREFIX
    case 'glamour_overlay':
      return GLAMOUR_SCAN_READOUT_PREFIX
    case 'out_of_phase_presence':
      return OUT_OF_PHASE_SCAN_READOUT_PREFIX
    case 'none':
      return DETECTION_SCAN_READOUT_PREFIX
    default: {
      const _exhaustive: never = modality
      return _exhaustive
    }
  }
}

function isPresenceOnlyAbsentContact(scan: DetectionScanResult): boolean {
  if (scan.fields.length !== 1) {
    return false
  }

  const field = scan.fields[0]
  return field.tier === 'presence' && field.internalValue === false
}

function orderedPlayerFacingValues(result: DetectionScanResult): readonly string[] {
  return result.fields
    .map((field) => field.playerFacingValue.trim())
    .filter((value) => value.length > 0)
}

function resolutionReasonHasDetectionScanReadout(reason: string): boolean {
  return DETECTION_SCAN_READOUT_PREFIXES.some((prefix) => reason.startsWith(prefix))
}

function resolutionReasonHasModalityTellReadout(reason: string): boolean {
  return MODALITY_TELL_READOUT_PREFIXES.some((prefix) => reason.startsWith(prefix))
}

export function shouldAppendModalityTellReportNote(
  tell: HiddenStateModalityTellResult | undefined
): boolean {
  return tell?.active === true && (tell.readoutLine?.length ?? 0) > 0
}

export function appendModalityTellResolutionReason(
  resolutionReasons: string[],
  tell: HiddenStateModalityTellResult | undefined
): void {
  if (!shouldAppendModalityTellReportNote(tell)) {
    return
  }

  if (resolutionReasons.some(resolutionReasonHasModalityTellReadout)) {
    return
  }

  resolutionReasons.push(tell!.readoutLine!)
}

export function shouldAppendDetectionScanReportNote(
  validation: Pick<BehaviorWeightedDisguiseValidationResult, 'active'> & {
    readonly detectionScan: DetectionScanResult
  }
): boolean {
  if (!validation.active) {
    return false
  }

  if (isPresenceOnlyAbsentContact(validation.detectionScan)) {
    return false
  }

  return orderedPlayerFacingValues(validation.detectionScan).length > 0
}

export function shouldAppendHiddenStateScoutingReportNote(
  scouting: HiddenStateScoutingRevealIntegrationResult,
  modality: HiddenStateModalityKind,
  caseData?: CaseInstance
): boolean {
  if (!scouting.active || modality === 'none') {
    return false
  }

  const illusionPhase = caseData?.hiddenStateIllusionState?.phase
  if (illusionPhase === 'active' || illusionPhase === 'disproved') {
    return orderedPlayerFacingValues(scouting.detectionScan).length > 0
  }

  if (modality === 'out_of_phase_presence') {
    return orderedPlayerFacingValues(scouting.detectionScan).length > 0
  }

  if (isPresenceOnlyAbsentContact(scouting.detectionScan)) {
    return false
  }

  return orderedPlayerFacingValues(scouting.detectionScan).length > 0
}

function formatDetectionScanStrippedLayersSuffix(result: DetectionScanResult): string {
  const strippedCount = result.strippedLayerIds.length
  if (strippedCount === 0) {
    return ''
  }

  return ` Counter-detection stripped ${strippedCount} concealment layer${strippedCount === 1 ? '' : 's'}.`
}

/** Ordered player-facing tier values from a detection scan. */
export function formatDetectionScanSummary(
  result: DetectionScanResult,
  options?: { readonly prefix?: string }
): string {
  const orderedValues = orderedPlayerFacingValues(result)
  if (orderedValues.length === 0) {
    return ''
  }

  const prefix = options?.prefix ?? DETECTION_SCAN_READOUT_PREFIX

  return (
    `${prefix} ${orderedValues.join('; ')}.` + formatDetectionScanStrippedLayersSuffix(result)
  )
}

export function appendDetectionScanResolutionReason(
  resolutionReasons: string[],
  behaviorValidation?: DisguiseRevealIntegrationResult,
  hiddenStateScouting?: HiddenStateScoutingRevealIntegrationResult,
  caseData?: CaseInstance,
  modalityTell?: HiddenStateModalityTellResult
): void {
  if (!resolutionReasons.some(resolutionReasonHasDetectionScanReadout)) {
    if (
      behaviorValidation !== undefined &&
      shouldAppendDetectionScanReportNote(behaviorValidation)
    ) {
      const summary = formatDetectionScanSummary(behaviorValidation.detectionScan, {
        prefix: DETECTION_SCAN_READOUT_PREFIX,
      })
      if (summary.length > 0) {
        resolutionReasons.push(summary)
      }
    } else if (hiddenStateScouting !== undefined) {
      const illusionPrefix =
        hiddenStateScouting.illusionReadoutPrefix ??
        (caseData !== undefined
          ? illusionReadoutPrefixForState(caseData.hiddenStateIllusionState)
          : null)
      const modality =
        caseData !== undefined ? resolveHiddenStateModality(caseData) : ('none' as const)

      if (shouldAppendHiddenStateScoutingReportNote(hiddenStateScouting, modality, caseData)) {
        const prefix = illusionPrefix ?? detectionScanReadoutPrefixForModality(modality)
        let summary = formatDetectionScanSummary(hiddenStateScouting.detectionScan, {
          prefix,
        })

        if (summary.length > 0) {
          summary +=
            hiddenStateScouting.illusionDisproofSuffix ??
            formatIllusionDisproofSuffix(caseData?.hiddenStateIllusionState)
          resolutionReasons.push(summary)
        }
      }
    }
  }

  appendModalityTellResolutionReason(resolutionReasons, modalityTell)
}
