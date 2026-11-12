/**
 * SPE-2718 / SPE-39: status upkeep / public-display costs for agency ranking.
 *
 * Derives weekly display-upkeep adequacy from SPE-28 operating-cost affordability
 * (facility upkeep portion as the public-presentation cost anchor) and composes a
 * bounded ranking penalty + standing-gain scale. Does not mutate SPE-2696 award records.
 *
 * Distinct from legitimacy.sanctionLevel (institutional sanction / cover posture gating).
 *
 * Production week-close captures affordability from pre-cost funding (advanceWeek clamps
 * post-cost funding to ≥ 0). Ranking prefers report-note metadata; funding-history resolve
 * remains a test/legacy fallback using funding before the operating_cost entry.
 */

import { WEEKLY_OPERATING_COST_SOURCE_ID } from './funding'
import { clamp } from './math'
import type { FundingState, GameState, ReportNote } from './models'
import { FUNDING_CALIBRATION } from './sim/calibration'

/** Bounded ranking penalty when display/upkeep is underfunded. */
export const STATUS_UPKEEP_RANKING_PENALTY = 3

export type StatusUpkeepBand = 'maintained' | 'underfunded' | 'neutral'

export interface StatusUpkeepDisplayEffect {
  readonly band: StatusUpkeepBand
  readonly week: number
  /** Facility/public-display cost slice for the week (payroll excluded). */
  readonly displayCost: number
  /** Full SPE-28 operating-cost amount used for affordability (0 when not charged). */
  readonly operatingCostAmount: number
  /** Funding available before operating cost; null when not assessed. */
  readonly fundingBeforeOperatingCost: number | null
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

function buildSummary(input: {
  band: StatusUpkeepBand
  displayCost: number
  operatingCostAmount: number
  fundingBeforeOperatingCost: number | null
  rankingDelta: number
}): string {
  if (input.band === 'underfunded') {
    return (
      `Public-display upkeep underfunded ` +
      `(funding ${input.fundingBeforeOperatingCost ?? 0} could not cover weekly operating cost ${input.operatingCostAmount}; ` +
      `facility display slice ${input.displayCost}); ` +
      `ranking ${input.rankingDelta} and week standing gains blocked in comparative standing.`
    )
  }

  if (input.band === 'maintained') {
    return (
      `Public-display upkeep maintained ` +
      `(funding ${input.fundingBeforeOperatingCost ?? 0} covered weekly operating cost ${input.operatingCostAmount}; ` +
      `facility display slice ${input.displayCost}); ` +
      `no ranking penalty.`
    )
  }

  return 'Public-display upkeep not assessed for this week (no operating-cost charge).'
}

/**
 * Pure resolve from pre-cost funding vs operating-cost amount.
 * Underfunded when the agency cannot cover the week's SPE-28 operating cost.
 */
export function resolveStatusUpkeepDisplayEffectFromAffordability(
  fundingBeforeOperatingCost: number,
  operatingCostAmount: number,
  week: number
): StatusUpkeepDisplayEffect {
  const closedWeek = Math.max(1, Math.trunc(week))
  const displayCost = computeWeeklyPublicDisplayCost(closedWeek)
  const cost = Math.max(0, Math.trunc(operatingCostAmount))
  const fundingBefore = Math.trunc(fundingBeforeOperatingCost)

  if (cost <= 0) {
    return {
      band: 'neutral',
      week: closedWeek,
      displayCost,
      operatingCostAmount: 0,
      fundingBeforeOperatingCost: fundingBefore,
      rankingDelta: 0,
      standingGainScale: 1,
      summary: buildSummary({
        band: 'neutral',
        displayCost,
        operatingCostAmount: 0,
        fundingBeforeOperatingCost: fundingBefore,
        rankingDelta: 0,
      }),
    }
  }

  if (fundingBefore < cost) {
    const rankingDelta = -STATUS_UPKEEP_RANKING_PENALTY
    return {
      band: 'underfunded',
      week: closedWeek,
      displayCost,
      operatingCostAmount: cost,
      fundingBeforeOperatingCost: fundingBefore,
      rankingDelta,
      standingGainScale: 0,
      summary: buildSummary({
        band: 'underfunded',
        displayCost,
        operatingCostAmount: cost,
        fundingBeforeOperatingCost: fundingBefore,
        rankingDelta,
      }),
    }
  }

  return {
    band: 'maintained',
    week: closedWeek,
    displayCost,
    operatingCostAmount: cost,
    fundingBeforeOperatingCost: fundingBefore,
    rankingDelta: 0,
    standingGainScale: 1,
    summary: buildSummary({
      band: 'maintained',
      displayCost,
      operatingCostAmount: cost,
      fundingBeforeOperatingCost: fundingBefore,
      rankingDelta: 0,
    }),
  }
}

/**
 * Reconstruct funding immediately before the week's operating_cost entry.
 * Uses current funding + full history to recover the pre-history baseline.
 */
export function reconstructFundingBeforeOperatingCost(
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
  for (let index = 0; index < opIndex; index += 1) {
    funding += fundingState.fundingHistory[index]!.delta
  }

  return funding
}

export function findWeeklyOperatingCostAmount(
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

  return Math.max(0, -fundingState.fundingHistory[opIndex]!.delta)
}

/** @deprecated Prefer reconstructFundingBeforeOperatingCost; kept for call-site clarity in tests. */
export function reconstructFundingAfterOperatingCost(
  fundingState: FundingState | undefined,
  week: number
): number | null {
  const before = reconstructFundingBeforeOperatingCost(fundingState, week)
  const amount = findWeeklyOperatingCostAmount(fundingState, week)
  if (before === null || amount === null) {
    return null
  }
  return before - amount
}

/**
 * Funding-history fallback: identical history + week → identical effect.
 * Prefer report-note metadata after real advanceWeek (post-cost funding is clamped).
 */
export function resolveStatusUpkeepDisplayEffect(
  fundingState: FundingState | undefined,
  week: number
): StatusUpkeepDisplayEffect {
  const closedWeek = Math.max(1, Math.trunc(week))
  const fundingBefore = reconstructFundingBeforeOperatingCost(fundingState, closedWeek)
  const operatingCostAmount = findWeeklyOperatingCostAmount(fundingState, closedWeek)

  if (fundingBefore === null || operatingCostAmount === null) {
    const displayCost = computeWeeklyPublicDisplayCost(closedWeek)
    return {
      band: 'neutral',
      week: closedWeek,
      displayCost,
      operatingCostAmount: 0,
      fundingBeforeOperatingCost: null,
      rankingDelta: 0,
      standingGainScale: 1,
      summary: buildSummary({
        band: 'neutral',
        displayCost,
        operatingCostAmount: 0,
        fundingBeforeOperatingCost: null,
        rankingDelta: 0,
      }),
    }
  }

  return resolveStatusUpkeepDisplayEffectFromAffordability(
    fundingBefore,
    operatingCostAmount,
    closedWeek
  )
}

export function readStatusUpkeepEffectFromReportNotes(
  notes: readonly ReportNote[] | undefined,
  week: number
): StatusUpkeepDisplayEffect | null {
  const note = (notes ?? []).find(
    (entry) =>
      entry.type === 'agency.status_upkeep_display' &&
      (entry.metadata?.week === week || entry.metadata?.week === undefined)
  )
  if (!note?.metadata) {
    return null
  }

  const band = note.metadata.band
  if (band !== 'maintained' && band !== 'underfunded' && band !== 'neutral') {
    return null
  }

  const rankingDelta =
    typeof note.metadata.rankingDelta === 'number' ? note.metadata.rankingDelta : 0
  const standingGainScale =
    typeof note.metadata.standingGainScale === 'number' ? note.metadata.standingGainScale : 1
  const displayCost =
    typeof note.metadata.displayCost === 'number'
      ? note.metadata.displayCost
      : computeWeeklyPublicDisplayCost(week)
  const operatingCostAmount =
    typeof note.metadata.operatingCostAmount === 'number' ? note.metadata.operatingCostAmount : 0
  const fundingBeforeOperatingCost =
    typeof note.metadata.fundingBeforeOperatingCost === 'number'
      ? note.metadata.fundingBeforeOperatingCost
      : null

  return {
    band,
    week,
    displayCost,
    operatingCostAmount,
    fundingBeforeOperatingCost,
    rankingDelta,
    standingGainScale,
    summary:
      typeof note.content === 'string' && note.content.length > 0
        ? note.content.replace(/^Week \d+ — /, '')
        : buildSummary({
            band,
            displayCost,
            operatingCostAmount,
            fundingBeforeOperatingCost,
            rankingDelta,
          }),
  }
}

/** Ranking week resolve: report notes (production) then funding-history fallback. */
export function resolveStatusUpkeepForRankingWeek(
  report: Pick<GameState['reports'][number], 'week' | 'notes'>,
  fundingState: FundingState | undefined
): StatusUpkeepDisplayEffect {
  return (
    readStatusUpkeepEffectFromReportNotes(report.notes, report.week) ??
    resolveStatusUpkeepDisplayEffect(fundingState, report.week)
  )
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

export function findStatusUpkeepMarkersForWeek(
  agency: GameState['agency'] | undefined,
  week: number
): StatusUpkeepDisplayEffect | null {
  if (!agency || agency.lastStatusUpkeepWeek !== week || !agency.lastStatusUpkeepBand) {
    return null
  }

  return resolveStatusUpkeepDisplayEffectFromAffordability(
    agency.lastStatusUpkeepFundingBefore ?? 0,
    agency.lastStatusUpkeepOperatingCost ?? 0,
    week
  )
}

export function buildStatusUpkeepDisplaySummary(
  game: Pick<GameState, 'agency' | 'reports'>
): StatusUpkeepDisplaySummary {
  const latestReport = game.reports.at(-1)
  const latestWeek = latestReport?.week ?? null
  if (latestWeek === null) {
    return {
      band: 'neutral',
      rankingDelta: 0,
      standingGainScale: 1,
      summary: 'Public-display upkeep not yet assessed.',
      week: null,
    }
  }

  const fromMarkers = findStatusUpkeepMarkersForWeek(game.agency, latestWeek)
  const effect =
    fromMarkers ??
    readStatusUpkeepEffectFromReportNotes(latestReport?.notes, latestWeek) ??
    resolveStatusUpkeepDisplayEffect(game.agency?.fundingState, latestWeek)

  return {
    band: effect.band,
    rankingDelta: effect.rankingDelta,
    standingGainScale: effect.standingGainScale,
    summary: effect.summary,
    week: effect.week,
  }
}
