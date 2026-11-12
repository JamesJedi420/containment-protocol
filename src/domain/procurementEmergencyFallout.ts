import { clamp } from './math'
import { buildRivalPressureFromRankingScore } from './rivalPressure'

/** Max extra precedent steps that tighten fallout beyond the first waiver. */
export const EMERGENCY_WAIVER_FALLOUT_PRECEDENT_MAX_EXTRA_STEPS = 6

/** Funding/containment penalty multiplier added per precedent step. */
export const EMERGENCY_WAIVER_FALLOUT_PRECEDENT_MULTIPLIER_STEP = 0.06

/** Canonical persisted multiplier for an emergency-waiver fallout tick. */
export function getEmergencyWaiverFalloutPrecedentPenaltyMultiplier(
  precedentCount: number
): number {
  const baseline = clamp(Math.trunc(precedentCount), 1, 50000)
  const extraSteps = Math.min(
    baseline - 1,
    EMERGENCY_WAIVER_FALLOUT_PRECEDENT_MAX_EXTRA_STEPS
  )
  return Math.round(
    (1 + EMERGENCY_WAIVER_FALLOUT_PRECEDENT_MULTIPLIER_STEP * extraSteps) * 1000
  ) / 1000
}

/**
 * Standing-shaped fallout penalty scale (SPE-2705).
 * Canonical value for a tick payload — must match {@link buildRivalPressureFromRankingScore}.
 */
export function getEmergencyWaiverFalloutStandingPenaltyScale(rankingScore: number): number {
  return buildRivalPressureFromRankingScore(rankingScore).falloutPenaltyScale
}
