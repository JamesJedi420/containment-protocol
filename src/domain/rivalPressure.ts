import { clamp } from './math'
import type { GameState } from './models'
import { buildAgencyRanking, RANKING_BASE_SCORE } from './rankings'

/** Abstract peer baseline — shared with ranking base score when no history exists. */
export const RIVAL_PRESSURE_PEER_BASELINE = RANKING_BASE_SCORE

export type RivalPressureBand = 'suppressed' | 'balanced' | 'competitive' | 'severe'

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

function buildForgivenessNote(trustFailureDriftScale: number): string {
  if (trustFailureDriftScale < 1) {
    return `external-support failure drift softened (${trustFailureDriftScale}×).`
  }
  if (trustFailureDriftScale > 1) {
    return `external-support failure drift hardened (${trustFailureDriftScale}×).`
  }
  return `external-support failure drift neutral (${trustFailureDriftScale}×).`
}

function buildRivalPressureSummary(
  band: RivalPressureBand,
  rankingScore: number,
  trustFailureDriftScale: number
): string {
  const forgiveness = buildForgivenessNote(trustFailureDriftScale)
  switch (band) {
    case 'suppressed':
      return `Comparative pressure suppressed (rank ${rankingScore}): peer agencies lag; contract terms and recruit quality tilt favorable; ${forgiveness}`
    case 'balanced':
      return `Comparative pressure balanced (rank ${rankingScore}): peer agencies track evenly; no rival payout or staffing skew; ${forgiveness}`
    case 'competitive':
      return `Comparative pressure competitive (rank ${rankingScore}): peer agencies press for share; contract payouts and recruit quality tighten; ${forgiveness}`
    case 'severe':
      return `Comparative pressure severe (rank ${rankingScore}): peer agencies dominate optics; contract payouts and recruit quality compress; ${forgiveness}`
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
  // High standing (negative deltaFromPeer) softens trust collapse; low standing hardens it.
  const trustFailureDriftScale = Number(clamp(1 + deltaFromPeer * 0.004, 0.7, 1.3).toFixed(3))

  return {
    score,
    band,
    rankingScore: clampedRanking,
    peerBaseline: RIVAL_PRESSURE_PEER_BASELINE,
    contractRewardMultiplier,
    recruitQualityDelta,
    trustFailureDriftScale,
    summary: buildRivalPressureSummary(band, clampedRanking, trustFailureDriftScale),
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
