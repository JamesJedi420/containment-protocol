import { clamp } from './math'
import type { GameState } from './models'
import { buildAgencyRanking, RANKING_BASE_SCORE } from './rankings'

/** Abstract peer baseline — shared with ranking base score when no history exists. */
export const RIVAL_PRESSURE_PEER_BASELINE = RANKING_BASE_SCORE

export type RivalPressureBand = 'suppressed' | 'balanced' | 'competitive' | 'severe'

export type RivalPostExposurePosture = 'protective' | 'coercive' | 'neutral'

export interface RivalPressureView {
  /** 0–100 comparative pressure (higher = rivals look stronger). */
  score: number
  band: RivalPressureBand
  rankingScore: number
  peerBaseline: number
  /** Multiplier applied to contract reward scalars (funding / materials). */
  contractRewardMultiplier: number
  /** Additive delta applied to recruit overall quality. */
  recruitQualityDelta: number
  /**
   * Multiplier on negative external-support reliability drift (SPE-93).
   * <1 = standing-shaped forgiveness; >1 = accelerated trust collapse.
   */
  trustFailureDriftScale: number
  /**
   * Multiplier on emergency gray-market fallout tick penalty bands (SPE-2705).
   * Same standing-shaped inputs as {@link trustFailureDriftScale}; composed with precedent.
   * <1 = soften funding/containment fallout; >1 = harden.
   */
  falloutPenaltyScale: number
  /**
   * Additive regional-trust delta after public exposure (SPE-2701).
   * Applied only when disclosure awareness is active; high standing protective, low coercive.
   */
  postExposureTrustDelta: number
  /** Protective / coercive / neutral label for the post-exposure trust delta. */
  postExposurePosture: RivalPostExposurePosture
  summary: string
}

function getRivalPressureBand(score: number): RivalPressureBand {
  if (score >= 75) {
    return 'severe'
  }
  if (score >= 55) {
    return 'competitive'
  }
  if (score < 30) {
    return 'suppressed'
  }
  return 'balanced'
}

function buildStandingScaleNote(standingScale: number): string {
  if (standingScale < 1) {
    return `standing scale softens trust-failure drift and emergency fallout (${standingScale}×).`
  }
  if (standingScale > 1) {
    return `standing scale hardens trust-failure drift and emergency fallout (${standingScale}×).`
  }
  return `standing scale neutral for trust-failure drift and emergency fallout (${standingScale}×).`
}

export function resolveRivalPostExposurePosture(
  postExposureTrustDelta: number
): RivalPostExposurePosture {
  if (postExposureTrustDelta > 0) {
    return 'protective'
  }
  if (postExposureTrustDelta < 0) {
    return 'coercive'
  }
  return 'neutral'
}

function buildPostExposurePostureNote(
  postExposurePosture: RivalPostExposurePosture,
  postExposureTrustDelta: number
): string {
  switch (postExposurePosture) {
    case 'protective':
      return `post-exposure rival posture protective (trust ${postExposureTrustDelta > 0 ? '+' : ''}${postExposureTrustDelta}).`
    case 'coercive':
      return `post-exposure rival posture coercive (trust ${postExposureTrustDelta}).`
    case 'neutral':
      return `post-exposure rival posture neutral (trust ${postExposureTrustDelta}).`
    default: {
      const _exhaustive: never = postExposurePosture
      return _exhaustive
    }
  }
}

function buildRivalPressureSummary(
  band: RivalPressureBand,
  rankingScore: number,
  standingScale: number,
  postExposurePosture: RivalPostExposurePosture,
  postExposureTrustDelta: number
): string {
  const standing = buildStandingScaleNote(standingScale)
  const exposure = buildPostExposurePostureNote(postExposurePosture, postExposureTrustDelta)
  switch (band) {
    case 'suppressed':
      return `Comparative pressure suppressed (rank ${rankingScore}): peer agencies lag; contract terms and recruit quality tilt favorable; ${standing} ${exposure}`
    case 'balanced':
      return `Comparative pressure balanced (rank ${rankingScore}): peer agencies track evenly; no rival payout or staffing skew; ${standing} ${exposure}`
    case 'competitive':
      return `Comparative pressure competitive (rank ${rankingScore}): peer agencies press for share; contract payouts and recruit quality tighten; ${standing} ${exposure}`
    case 'severe':
      return `Comparative pressure severe (rank ${rankingScore}): peer agencies dominate optics; contract payouts and recruit quality compress; ${standing} ${exposure}`
    default: {
      const _exhaustive: never = band
      return _exhaustive
    }
  }
}

/**
 * Pure ranking→pressure derivation. Prefer this in unit tests; gameplay uses
 * {@link buildRivalPressure} so ranking history stays the single source of truth.
 */
export function buildRivalPressureFromRankingScore(rankingScore: number): RivalPressureView {
  const clampedRanking = clamp(Math.round(rankingScore), 0, 100)
  const deltaFromPeer = RIVAL_PRESSURE_PEER_BASELINE - clampedRanking
  const score = clamp(Math.round(RIVAL_PRESSURE_PEER_BASELINE + deltaFromPeer), 0, 100)
  const band = getRivalPressureBand(score)
  const contractRewardMultiplier = Number(
    clamp(1 - deltaFromPeer * 0.002, 0.88, 1.06).toFixed(3)
  )
  const recruitQualityDelta = clamp(Math.round(-deltaFromPeer * 0.12), -6, 4) + 0
  // High standing (negative deltaFromPeer) softens trust collapse / fallout; low standing hardens.
  const standingScale = Number(clamp(1 + deltaFromPeer * 0.004, 0.7, 1.3).toFixed(3))
  const trustFailureDriftScale = standingScale
  const falloutPenaltyScale = standingScale
  // High standing protects regional trust after exposure; low standing coerces it downward.
  const postExposureTrustDelta = Number(clamp(-deltaFromPeer * 0.0025, -0.1, 0.1).toFixed(2)) + 0
  const postExposurePosture = resolveRivalPostExposurePosture(postExposureTrustDelta)

  return {
    score,
    band,
    rankingScore: clampedRanking,
    peerBaseline: RIVAL_PRESSURE_PEER_BASELINE,
    contractRewardMultiplier,
    recruitQualityDelta,
    trustFailureDriftScale,
    falloutPenaltyScale,
    postExposureTrustDelta,
    postExposurePosture,
    summary: buildRivalPressureSummary(
      band,
      clampedRanking,
      standingScale,
      postExposurePosture,
      postExposureTrustDelta
    ),
  }
}

/** Scale a negative reliability drift by standing-shaped forgiveness; positive deltas pass through. */
export function applyTrustFailureDriftScale(
  baseDelta: number,
  trustFailureDriftScale: number
): number {
  if (baseDelta >= 0) {
    return baseDelta
  }
  const scale = clamp(trustFailureDriftScale, 0.7, 1.3)
  return Math.round(baseDelta * scale)
}

/** Read-time rival/comparative pressure from agency ranking. No persisted fields. */
export function buildRivalPressure(
  game: Pick<GameState, 'reports' | 'events'>
): RivalPressureView {
  return buildRivalPressureFromRankingScore(buildAgencyRanking(game).score)
}

export function applyRivalPressureToContractScalar(
  scalar: number,
  pressure: Pick<RivalPressureView, 'contractRewardMultiplier'>
): number {
  return clamp(scalar * pressure.contractRewardMultiplier, 0.6, 1.9)
}

export function applyRivalPressureToRecruitQuality(
  overallScore: number,
  pressure: Pick<RivalPressureView, 'recruitQualityDelta'>
): number {
  return clamp(overallScore + pressure.recruitQualityDelta, 0, 100)
}
