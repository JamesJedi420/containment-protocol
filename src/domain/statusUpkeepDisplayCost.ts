/**
 * SPE-2718 / SPE-39: status upkeep / public-display costs for agency ranking.
 *
 * Derives weekly display-upkeep adequacy from SPE-28 operating-cost funding history
 * (facility upkeep portion as the public-presentation cost anchor) and composes a
 * bounded ranking penalty + standing-gain scale. Does not mutate SPE-2696 award records.
 *
 * Distinct from legitimacy.sanctionLevel (institutional sanction / cover posture gating).
 */

import { WEEKLY_OPERATING_COST_SOURCE_ID } from './funding'
import { clamp } from './math'
import type { FundingState, GameState } from './models'
import { FUNDING_CALIBRATION } from './sim/calibration'

/** Bounded ranking penalty when display/upkeep is underfunded. */
export const STATUS_UPKEEP_RANKING_PENALTY = 3

export type StatusUpkeepBand = 'maintained' | 'underfunded' | 'neutral'

export interface StatusUpkeepDisplayEffect {
  readonly band: StatusUpkeepBand
  readonly week: number
  /** Facility/public-display cost slice for the week (payroll excluded). */
  readonly displayCost: number
  /** Funding immediately after that week's operating_cost entry; null when not charged. */
  readonly fundingAfterOperatingCost: number | null
  /** Ranking score delta composed for this week (0 maintained/neutral, negative when underfunded). */
  readonly rankingDelta: number
  /**
   * Scale applied to positive agency-standing award points for this week in ranking
   * composition only (1 = full credit; 0 = block gains). Negative awards always apply.
   */
  readonly standingGainScale: number
  readonly summary: string
}

export interface StatusUpkeepDisplaySummary {
  readonly band: StatusUpkeepBand
  readonly rankingDelta: number
  readonly standingGainScale: number
  readonly summary: string
  readonly week: number | null
}

/** SPE-28 facility upkeep base + periodic spike — public-display / presentation cost anchor. */
export function computeWeeklyPublicDisplayCost(closedWeek: number): number {
  const week = Math.max(1, Math.trunc(closedWeek))
  const cal = FUNDING_CALIBRATION.weeklyOperatingCost
  const upkeepSpike = week % cal.upkeepSpikeEveryWeeks === 0 ? cal.upkeepSpikeAmount : 0
  return Math.max(0, cal.facilityUpkeepBase + upkeepSpike)
}

function findOperatingCostEntryIndex(
  fundingState: FundingState | undefined,
  week: number
): number {
  if (!fundingState) {
    return -1
  }

  return fundingState.fundingHistory.findIndex(
    (entry) =>
      entry.week === week &&
      entry.reason === 'operating_cost' &&
      entry.sourceId === WEEKLY_OPERATING_COST_SOURCE_ID
  )
}

/**
 * Reconstruct absolute funding immediately after the week's operating_cost entry.
 * Uses current funding + full history to recover the pre-history baseline.
 */
export function reconstructFundingAfterOperatingCost(
  fundingState: FundingState | undefined,
  week: number
): number | null {
  if (!fundingState) {
    return null
  }

  const opIndex = findOperatingCostEntryIndex(fundingState, week)
  if (opIndex < 0) {
    return null
  }

  const historySum = fundingState.fundingHistory.reduce((sum, entry) => sum + entry.delta, 0)
  let funding = fundingState.funding - historySum
  for (let index = 0; index <= opIndex; index += 1) {
    funding += fundingState.fundingHistory[index]!.delta
  }

  return funding
}

function buildSummary(input: {
  band: StatusUpkeepBand
  displayCost: number
  fundingAfterOperatingCost: number | null
  rankingDelta: number
  standingGainScale: number
}): string {
  if (input.band === 'underfunded') {
    return (
      `Public-display upkeep underfunded ` +
      `(funding ${input.fundingAfterOperatingCost ?? 0} after facility display cost ${input.displayCost}); ` +
      `ranking ${input.rankingDelta} and week standing gains blocked in comparative standing.`
    )
  }

  if (input.band === 'maintained') {
    return (
      `Public-display upkeep maintained ` +
      `(funding ${input.fundingAfterOperatingCost ?? 0} after facility display cost ${input.displayCost}); ` +
      `no ranking penalty.`
    )
  }

  return 'Public-display upkeep not assessed for this week (no operating-cost charge).'
}

/**
 * Pure resolve: identical funding-history + week → identical upkeep/display effect.
 * Underfunded when funding after operating cost is negative.
 */
export function resolveStatusUpkeepDisplayEffect(
  fundingState: FundingState | undefined,
  week: number
): StatusUpkeepDisplayEffect {
  const closedWeek = Math.max(1, Math.trunc(week))
  const displayCost = computeWeeklyPublicDisplayCost(closedWeek)
  const fundingAfterOperatingCost = reconstructFundingAfterOperatingCost(
    fundingState,
    closedWeek
  )

  if (fundingAfterOperatingCost === null) {
    return {
      band: 'neutral',
      week: closedWeek,
      displayCost,
      fundingAfterOperatingCost: null,
      rankingDelta: 0,
      standingGainScale: 1,
      summary: buildSummary({
        band: 'neutral',
        displayCost,
        fundingAfterOperatingCost: null,
        rankingDelta: 0,
        standingGainScale: 1,
      }),
    }
  }

  if (fundingAfterOperatingCost < 0) {
    const rankingDelta = -STATUS_UPKEEP_RANKING_PENALTY
    return {
      band: 'underfunded',
      week: closedWeek,
      displayCost,
      fundingAfterOperatingCost,
      rankingDelta,
      standingGainScale: 0,
      summary: buildSummary({
        band: 'underfunded',
        displayCost,
        fundingAfterOperatingCost,
        rankingDelta,
        standingGainScale: 0,
      }),
    }
  }

  return {
    band: 'maintained',
    week: closedWeek,
    displayCost,
    fundingAfterOperatingCost,
    rankingDelta: 0,
    standingGainScale: 1,
    summary: buildSummary({
      band: 'maintained',
      displayCost,
      fundingAfterOperatingCost,
      rankingDelta: 0,
      standingGainScale: 1,
    }),
  }
}

/** Compose standing award points for ranking: block positive gains when scale is 0. */
export function composeStandingPointsForRanking(
  awardPoints: number,
  standingGainScale: number
): number {
  const scale = clamp(standingGainScale, 0, 1)
  if (awardPoints > 0 && scale < 1) {
    return Math.round(awardPoints * scale)
  }
  return awardPoints
}

export function buildStatusUpkeepDisplaySummary(
  game: Pick<GameState, 'agency' | 'reports'>
): StatusUpkeepDisplaySummary {
  const latestWeek = game.reports.at(-1)?.week ?? null
  if (latestWeek === null) {
    return {
      band: 'neutral',
      rankingDelta: 0,
      standingGainScale: 1,
      summary: 'Public-display upkeep not yet assessed.',
      week: null,
    }
  }

  const effect = resolveStatusUpkeepDisplayEffect(game.agency?.fundingState, latestWeek)
  return {
    band: effect.band,
    rankingDelta: effect.rankingDelta,
    standingGainScale: effect.standingGainScale,
    summary: effect.summary,
    week: effect.week,
  }
}
