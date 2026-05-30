/**
 * SPE-781 slice 5: player-facing weekly report copy for tiered detection scans.
 */

import type { BehaviorWeightedDisguiseValidationResult } from './disguiseValidation'
import type { DetectionScanResult } from './revealPayload'
import type { DisguiseRevealIntegrationResult } from './revealPayloadDisguiseIntegration'
import type { HiddenStateScoutingRevealIntegrationResult } from './revealPayloadScoutingIntegration'

export const DETECTION_SCAN_READOUT_PREFIX = 'Detection readout:'

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

function formatDetectionScanStrippedLayersSuffix(result: DetectionScanResult): string {
  const strippedCount = result.strippedLayerIds.length
  if (strippedCount === 0) {
    return ''
  }

  return ` Counter-detection stripped ${strippedCount} concealment layer${strippedCount === 1 ? '' : 's'}.`
}

/** Ordered player-facing tier values from a detection scan. */
export function formatDetectionScanSummary(result: DetectionScanResult): string {
  const orderedValues = orderedPlayerFacingValues(result)
  if (orderedValues.length === 0) {
    return ''
  }

  return (
    `${DETECTION_SCAN_READOUT_PREFIX} ${orderedValues.join('; ')}.` +
    formatDetectionScanStrippedLayersSuffix(result)
  )
}

export function appendDetectionScanResolutionReason(
  resolutionReasons: string[],
  behaviorValidation?: DisguiseRevealIntegrationResult,
  hiddenStateScouting?: HiddenStateScoutingRevealIntegrationResult
): void {
  if (resolutionReasons.some((reason) => reason.startsWith(DETECTION_SCAN_READOUT_PREFIX))) {
    return
  }

  const scanSource =
    behaviorValidation !== undefined && shouldAppendDetectionScanReportNote(behaviorValidation)
      ? behaviorValidation.detectionScan
      : hiddenStateScouting !== undefined && shouldAppendDetectionScanReportNote(hiddenStateScouting)
        ? hiddenStateScouting.detectionScan
        : undefined

  if (scanSource === undefined) {
    return
  }

  const summary = formatDetectionScanSummary(scanSource)
  if (summary.length === 0) {
    return
  }

  resolutionReasons.push(summary)
}
