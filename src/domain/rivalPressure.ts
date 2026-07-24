import { clamp } from './math'
import type { GameState } from './models'
import { buildAgencyRanking } from './rankings'

/** Abstract peer baseline — matches ranking base score when no history exists. */
export const RIVAL_PRESSURE_PEER_BASELINE = 50

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

function buildRivalPressureSummary(band: RivalPressureBand, rankingScore: number): string {
  switch (band) {
    case 'suppressed':
      return `Comparative pressure suppressed (rank ${rankingScore}): peer agencies lag; contract terms and recruit quality tilt favorable.`
    case 'balanced':
      return `Comparative pressure balanced (rank ${rankingScore}): peer agencies track evenly; no rival payout or staffing skew.`
    case 'competitive':
      return `Comparative pressure competitive (rank ${rankingScore}): peer agencies press for share; contract payouts and recruit quality tighten.`
    case 'severe':
      return `Comparative pressure severe (rank ${rankingScore}): peer agencies dominate optics; contract payouts and recruit quality compress.`
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

  return {
    score,
    band,
    rankingScore: clampedRanking,
    peerBaseline: RIVAL_PRESSURE_PEER_BASELINE,
    contractRewardMultiplier,
    recruitQualityDelta,
    summary: buildRivalPressureSummary(band, clampedRanking),
  }
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
