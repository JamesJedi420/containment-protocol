/**
 * SPE-677: Belief track system — external-party perception state for CaseInstance.
 *
 * Each track holds one of four ordered tiers: clear → uncertain → suspected → condemned.
 * The `factTruth` track is the objective ground truth and is excluded from pressure scoring.
 * Public-facing tracks (`witnessInterpretation`, `institutionalJudgment`, `crowdConsensus`)
 * can diverge from factTruth and are updated by divergence/reveal movers.
 */

export type BeliefTier = 'clear' | 'uncertain' | 'suspected' | 'condemned'

export interface BeliefTrackState {
  /** Objective ground truth. Immutable by divergence/reveal movers. */
  factTruth: BeliefTier
  /** How direct witnesses interpret the situation. */
  witnessInterpretation: BeliefTier
  /** How governing institutions or official bodies have ruled. */
  institutionalJudgment: BeliefTier
  /** How public/crowd perception has settled. */
  crowdConsensus: BeliefTier
}

const TIER_PRESSURE: Record<BeliefTier, number> = {
  clear: 0,
  uncertain: 1,
  suspected: 2,
  condemned: 3,
}

/**
 * Returns the pressure bonus contributed by external-party belief state.
 * Only `institutionalJudgment` and `crowdConsensus` are included; `factTruth`
 * and `witnessInterpretation` are intentionally excluded from pressure scoring.
 * Range: 0 (both clear) to +6 (both condemned).
 */
export function getBeliefDrivenCasePressure(beliefTracks: BeliefTrackState): number {
  return (
    TIER_PRESSURE[beliefTracks.institutionalJudgment] +
    TIER_PRESSURE[beliefTracks.crowdConsensus]
  )
}

/**
 * Applies a divergence event to a public-facing belief track.
 * `factTruth` cannot be targeted by this mover.
 * Returns a new BeliefTrackState with the updated track.
 */
export function applyBeliefTrackDivergence(
  state: BeliefTrackState,
  track: 'witnessInterpretation' | 'institutionalJudgment' | 'crowdConsensus',
  tier: BeliefTier
): BeliefTrackState {
  return { ...state, [track]: tier }
}

/**
 * Applies a reveal event — sets all public-facing tracks to match factTruth,
 * collapsing any divergence between perception and objective truth.
 */
export function applyBeliefTrackReveal(state: BeliefTrackState): BeliefTrackState {
  return {
    ...state,
    witnessInterpretation: state.factTruth,
    institutionalJudgment: state.factTruth,
    crowdConsensus: state.factTruth,
  }
}
