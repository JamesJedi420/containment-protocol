// SPE-93: External support reliability and trust state
// Pure, deterministic functions. No side effects — all state mutation belongs in the store.

import type { ExternalSupportAsset, ExternalAssetTrustBand } from './models'

// ---------------------------------------------------------------------------
// Trust band derivation (read-time, never stored)
// ---------------------------------------------------------------------------

/**
 * Derives a trust band from a raw reliability value (0–100).
 * high ≥ 70 | moderate ≥ 40 | degraded ≥ 15 | failed < 15
 */
export function deriveAssetTrustBand(reliability: number): ExternalAssetTrustBand {
  if (reliability >= 70) return 'high'
  if (reliability >= 40) return 'moderate'
  if (reliability >= 15) return 'degraded'
  return 'failed'
}

// ---------------------------------------------------------------------------
// Reliability drift
// ---------------------------------------------------------------------------

export type AssetDriftTrigger =
  | 'support_delivered'   // successful support outcome → +reliability
  | 'support_failed'      // asset failed to deliver → −reliability
  | 'support_partial'     // partial delivery → slight decay
  | 'week_idle'           // no task this week → slight passive decay

const DRIFT_TABLE: Record<AssetDriftTrigger, number> = {
  support_delivered: +12,
  support_failed: -20,
  support_partial: -6,
  week_idle: -3,
}

/**
 * Returns an updated asset after applying a reliability drift trigger.
 * Deterministic — no RNG needed; trigger table drives the delta.
 * Returns the updated asset and a human-readable reason fragment.
 */
export function applyAssetReliabilityDrift(
  asset: ExternalSupportAsset,
  trigger: AssetDriftTrigger
): { asset: ExternalSupportAsset; driftReason: string } {
  const delta = DRIFT_TABLE[trigger]
  const next = Math.max(0, Math.min(100, asset.reliability + delta))
  const prevBand = deriveAssetTrustBand(asset.reliability)
  const nextBand = deriveAssetTrustBand(next)

  const directionLabel = delta > 0 ? 'improved' : delta < 0 ? 'degraded' : 'unchanged'
  const bandNote =
    prevBand !== nextBand ? ` (trust: ${prevBand} → ${nextBand})` : ''
  const driftReason = `${asset.label} reliability ${directionLabel} after ${trigger.replace(/_/g, ' ')}${bandNote}.`

  return {
    asset: { ...asset, reliability: next, lastDriftReason: driftReason },
    driftReason,
  }
}

// ---------------------------------------------------------------------------
// Support outcome resolution
// ---------------------------------------------------------------------------

/**
 * Modifies a base support score using the asset's current reliability.
 *
 * Mapping:
 *   high     → +2 to base score, full support delivered
 *   moderate → +1 to base score, partial uplift
 *   degraded →  0 modifier, no net benefit
 *   failed   → −1 to base score, disruption cost
 *
 * Returns the modified score, a drift trigger to apply after this call,
 * and a reason fragment suitable for injecting into report/note text.
 */
export function resolveAssetSupportOutcome(
  asset: ExternalSupportAsset,
  baseScore: number
): {
  modifiedScore: number
  driftTrigger: AssetDriftTrigger
  outcomeReason: string
} {
  const band = deriveAssetTrustBand(asset.reliability)

  switch (band) {
    case 'high':
      return {
        modifiedScore: baseScore + 2,
        driftTrigger: 'support_delivered',
        outcomeReason: `${asset.label} delivered reliable support (+2). Trust level: high.`,
      }
    case 'moderate':
      return {
        modifiedScore: baseScore + 1,
        driftTrigger: 'support_delivered',
        outcomeReason: `${asset.label} provided partial support (+1). Trust level: moderate.`,
      }
    case 'degraded':
      return {
        modifiedScore: baseScore,
        driftTrigger: 'support_partial',
        outcomeReason: `${asset.label} was unreliable — no net benefit. Trust level: degraded.`,
      }
    case 'failed':
      return {
        modifiedScore: baseScore - 1,
        driftTrigger: 'support_failed',
        outcomeReason: `${asset.label} failed to deliver — support disrupted (−1). Trust level: failed.`,
      }
  }
}

// ---------------------------------------------------------------------------
// Asset factory helper
// ---------------------------------------------------------------------------

/**
 * Creates a new contractor asset with a given starting reliability.
 * ID must be supplied by the caller (derived from seeded RNG in the store path).
 */
export function createContractorAsset(
  id: string,
  label: string,
  startingReliability: number,
  tags: string[] = []
): ExternalSupportAsset {
  return {
    id,
    label,
    assetClass: 'contractor',
    reliability: Math.max(0, Math.min(100, startingReliability)),
    tags,
  }
}
