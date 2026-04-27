/**
 * SPE-746: Compromised authority resolution — pure functions for deriving
 * override packets and exposure outcomes from a CompromisedAuthorityState.
 *
 * All functions are pure and deterministic; no side effects.
 */

import type {
  BeliefTrackState,
  BeliefTier,
} from '../beliefTracks'
import type {
  CaseTemplate,
  CompromisedAuthorityState,
  CompromisedResponseCategory,
  CompromisedResponseOverride,
  CorruptionDepth,
} from '../models'

// ---------------------------------------------------------------------------
// Threshold constants
// ---------------------------------------------------------------------------

/** Number of patrol anomalies required before an exposure event fires. */
const EXPOSURE_THRESHOLD = 5

/** Weight delta applied to anti-faction patrol templates when authority is distorting patrol. */
const PATROL_WEIGHT_DELTA_SHALLOW: number = -2
const PATROL_WEIGHT_DELTA_EMBEDDED: number = -4

/** Ascending tier order for exposure belief escalation. */
const TIER_ORDER: BeliefTier[] = ['clear', 'uncertain', 'suspected', 'condemned']

function escalateTier(tier: BeliefTier): BeliefTier {
  const idx = TIER_ORDER.indexOf(tier)
  return TIER_ORDER[Math.min(idx + 1, TIER_ORDER.length - 1)]
}

// ---------------------------------------------------------------------------
// Response resolution
// ---------------------------------------------------------------------------

/**
 * Resolves the full override packet a compromised authority applies to a
 * security event, given the set of response categories being queried.
 * Only categories that are both in `queriedCategories` and in the authority's
 * `distortedCategories` produce active overrides.
 */
export function resolveCompromisedAuthorityResponse(
  queriedCategories: Set<CompromisedResponseCategory>,
  authority: CompromisedAuthorityState
): CompromisedResponseOverride {
  const active = authority.distortedCategories.filter((c) => queriedCategories.has(c))

  const patrolActive = active.includes('patrol')
  const interrogationActive = active.includes('interrogation')
  const custodyActive = active.includes('custody')
  const evidenceActive = active.includes('evidence')

  const depthDelta: Record<CorruptionDepth, number> = {
    shallow_cover: PATROL_WEIGHT_DELTA_SHALLOW,
    embedded_control: PATROL_WEIGHT_DELTA_EMBEDDED,
  }

  return {
    patrolWeightDelta: patrolActive ? depthDelta[authority.corruptionDepth] : 0,
    harassmentWeightDelta: interrogationActive ? 2 : 0,
    redirectInterrogation: interrogationActive,
    custodyMarker: custodyActive
      ? {
          effect: 'compromised_authority_release',
          triggeredAt: 0,
          targetInstitutionId: authority.officialRole,
        }
      : undefined,
    evidenceRoutingMode: evidenceActive
      ? authority.corruptionDepth === 'embedded_control'
        ? 'forward_to_faction'
        : 'suppress'
      : undefined,
  }
}

// ---------------------------------------------------------------------------
// Exposure resolution
// ---------------------------------------------------------------------------

/**
 * Resolves an exposure tick for an active compromised authority surface.
 * Increments the anomaly counter; if the threshold is reached (or
 * `authorityLinkEvidenceFound` is set), escalates the institutional
 * belief tracks on the associated case.
 * Returns updated values — callers must apply them to state.
 */
export function resolveCompromisedAuthorityExposure(
  authority: CompromisedAuthorityState,
  beliefTracks: BeliefTrackState
): { updatedAnomalyCount: number; updatedBeliefTracks: BeliefTrackState } {
  const updatedAnomalyCount = authority.patrolAnomalyCount + 1
  const thresholdMet =
    updatedAnomalyCount >= EXPOSURE_THRESHOLD || authority.authorityLinkEvidenceFound === true

  if (!thresholdMet) {
    return { updatedAnomalyCount, updatedBeliefTracks: beliefTracks }
  }

  // Exposure event: escalate institutional judgment one tier
  const updatedBeliefTracks: BeliefTrackState = {
    ...beliefTracks,
    institutionalJudgment: escalateTier(beliefTracks.institutionalJudgment),
  }

  return { updatedAnomalyCount, updatedBeliefTracks }
}

// ---------------------------------------------------------------------------
// Pool weight distortion
// ---------------------------------------------------------------------------

/**
 * Applies the patrol weight delta from a resolved override to a template pool.
 * Templates tagged with anti-faction intel markers are deprioritised; all
 * others retain their baseline weight.
 * Returns a new ordered array weighted by repetition (cheap discrete weights).
 */
export function applyPatrolWeightDistortion(
  pool: CaseTemplate[],
  override: CompromisedResponseOverride
): CaseTemplate[] {
  if (override.patrolWeightDelta === 0) return pool

  const delta = override.patrolWeightDelta // negative = deprioritise anti-faction entries

  // Baseline weight = 1 per entry; anti-faction entries get max(1, 1 + delta) copies.
  // A negative delta means fewer copies (down-weighted); a positive delta means more.
  const result: CaseTemplate[] = []
  for (const template of pool) {
    const isAntiFaction = template.tags.includes('anti_faction')
    const copies = isAntiFaction ? Math.max(1, 1 + delta) : 1
    for (let i = 0; i < copies; i++) {
      result.push(template)
    }
  }
  return result.length > 0 ? result : pool
}
