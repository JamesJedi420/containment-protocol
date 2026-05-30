/**
 * SPE-781 slice 5 / SPE-2283 slice 3: player-facing weekly report copy for tiered detection scans.
 */

import type { BehaviorWeightedDisguiseValidationResult } from './disguiseValidation'
import {
  resolveHiddenStateModality,
  type HiddenStateModalityKind,
} from './hiddenStateModality'
import type { CaseInstance } from './models'
import type { DetectionScanResult } from './revealPayload'
import type { DisguiseRevealIntegrationResult } from './revealPayloadDisguiseIntegration'
import type { HiddenStateScoutingRevealIntegrationResult } from './revealPayloadScoutingIntegration'

export const DETECTION_SCAN_READOUT_PREFIX = 'Detection readout:'
export const CONCEALMENT_SCAN_READOUT_PREFIX = 'Concealment readout:'
export const DISPLACEMENT_SCAN_READOUT_PREFIX = 'Displacement readout:'
export const COVER_SCAN_READOUT_PREFIX = 'Cover readout:'

export const DETECTION_SCAN_READOUT_PREFIXES = [
  DETECTION_SCAN_READOUT_PREFIX,
  CONCEALMENT_SCAN_READOUT_PREFIX,
  DISPLACEMENT_SCAN_READOUT_PREFIX,
  COVER_SCAN_READOUT_PREFIX,
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
  modality: HiddenStateModalityKind
): boolean {
  if (!scouting.active || modality === 'none') {
    return false
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
  caseData?: CaseInstance
): void {
  if (resolutionReasons.some(resolutionReasonHasDetectionScanReadout)) {
    return
  }

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

    return
  }

  if (hiddenStateScouting === undefined) {
    return
  }

  const modality =
    caseData !== undefined ? resolveHiddenStateModality(caseData) : ('none' as const)

  if (!shouldAppendHiddenStateScoutingReportNote(hiddenStateScouting, modality)) {
    return
  }

  const summary = formatDetectionScanSummary(hiddenStateScouting.detectionScan, {
    prefix: detectionScanReadoutPrefixForModality(modality),
  })

  if (summary.length > 0) {
    resolutionReasons.push(summary)
  }
}
