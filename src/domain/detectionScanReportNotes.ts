/**
 * SPE-781 slice 5: player-facing weekly report copy for tiered detection scans.
 */

import type { BehaviorWeightedDisguiseValidationResult } from './disguiseValidation'
import type { DetectionScanResult } from './revealPayload'
import type { DisguiseRevealIntegrationResult } from './revealPayloadDisguiseIntegration'

export const DETECTION_SCAN_READOUT_PREFIX = 'Detection readout:'

function orderedPlayerFacingValues(result: DetectionScanResult): readonly string[] {
  return result.fields.map((field) => field.playerFacingValue)
}

export function shouldAppendDetectionScanReportNote(
  validation: Pick<BehaviorWeightedDisguiseValidationResult, 'active'> & {
    readonly detectionScan: DetectionScanResult
  }
): boolean {
  if (!validation.active) {
    return false
  }

  const values = orderedPlayerFacingValues(validation.detectionScan)
  if (values.length === 0) {
    return false
  }

  if (values.length === 1 && values[0] === 'no contact') {
    return false
  }

  return true
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
  behaviorValidation?: DisguiseRevealIntegrationResult
): void {
  if (behaviorValidation === undefined || !shouldAppendDetectionScanReportNote(behaviorValidation)) {
    return
  }

  const summary = formatDetectionScanSummary(behaviorValidation.detectionScan)
  if (summary.length === 0) {
    return
  }

  resolutionReasons.push(summary)
}
