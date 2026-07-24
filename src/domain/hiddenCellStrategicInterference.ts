/**
 * SPE-2704 / SPE-39: bounded hidden-cell strategic interference (funding theft).
 *
 * Derives cell-pressure activity from rival-pressure band and applies one
 * deterministic funding-theft expense through existing FundingState history.
 * No per-cell entities; no detection layer.
 */

import { applyFundingExpense, recomputeBudgetPressure } from './funding'
import { clamp } from './math'
import type { FundingState, GameState } from './models'
import {
  buildRivalPressure,
  buildRivalPressureFromRankingScore,
  type RivalPressureBand,
  type RivalPressureView,
} from './rivalPressure'

export const HIDDEN_CELL_FUNDING_THEFT_REASON = 'hidden_cell_funding_theft'
export const HIDDEN_CELL_FUNDING_THEFT_SOURCE_ID = 'hidden-cell-funding-theft'

export type HiddenCellInterferenceKind = 'funding_theft' | 'none'

export interface HiddenCellInterferenceEffect {
  readonly active: boolean
  readonly kind: HiddenCellInterferenceKind
  readonly rivalPressureScore: number
  readonly rivalPressureBand: RivalPressureBand
  /** Base theft before funding clamp (0 when inactive). */
  readonly baseTheftAmount: number
  /** Applied theft after clamp to available funding (0 when inactive or broke). */
  readonly fundingStolen: number
  readonly summary: string
}

export interface HiddenCellInterferenceSummary {
  readonly active: boolean
  readonly kind: HiddenCellInterferenceKind
  readonly fundingStolen: number
  readonly rivalPressureBand: RivalPressureBand
  readonly summary: string
}

/** Competitive/severe rival pressure means abstract hidden-cell pressure is active. */
export function isHiddenCellPressureActive(band: RivalPressureBand): boolean {
  return band === 'competitive' || band === 'severe'
}

/**
 * Base funding-theft amount from rival pressure score alone (funding clamp applied separately).
 * Inactive bands → 0. Active: scales above peer-balanced pressure floor.
 */
export function computeHiddenCellFundingTheftBaseAmount(
  score: number,
  band: RivalPressureBand
): number {
  if (!isHiddenCellPressureActive(band)) {
    return 0
  }

  return clamp(Math.round((clamp(Math.round(score), 0, 100) - 50) * 1.5), 1, 120)
}

function buildInterferenceSummary(input: {
  active: boolean
  band: RivalPressureBand
  fundingStolen: number
  baseTheftAmount: number
}): string {
  if (!input.active) {
    return `Hidden-cell interference inactive (${input.band}): no strategic diversion this week.`
  }

  if (input.fundingStolen <= 0) {
    return (
      `Hidden-cell interference active (${input.band}): funding diversion blocked ` +
      `(no available funds; base claim ${input.baseTheftAmount}).`
    )
  }

  return (
    `Hidden-cell interference diverted ${input.fundingStolen} funding ` +
    `(${input.band} cell pressure; strategic theft before open confrontation).`
  )
}

/** Pure resolve: identical pressure + funding inputs → identical effect. */
export function resolveHiddenCellFundingTheft(input: {
  rivalPressureScore: number
  rivalPressureBand: RivalPressureBand
  funding: number
}): HiddenCellInterferenceEffect {
  const rivalPressureScore = clamp(Math.round(input.rivalPressureScore), 0, 100)
  const rivalPressureBand = input.rivalPressureBand
  const active = isHiddenCellPressureActive(rivalPressureBand)
  const baseTheftAmount = computeHiddenCellFundingTheftBaseAmount(
    rivalPressureScore,
    rivalPressureBand
  )
  const available = Math.max(0, Math.trunc(input.funding))
  const fundingStolen = active ? Math.min(available, baseTheftAmount) : 0
  const kind: HiddenCellInterferenceKind = fundingStolen > 0 ? 'funding_theft' : 'none'

  return {
    active,
    kind,
    rivalPressureScore,
    rivalPressureBand,
    baseTheftAmount,
    fundingStolen,
    summary: buildInterferenceSummary({
      active,
      band: rivalPressureBand,
      fundingStolen,
      baseTheftAmount,
    }),
  }
}

export function resolveHiddenCellFundingTheftFromPressure(
  pressure: Pick<RivalPressureView, 'score' | 'band'>,
  funding: number
): HiddenCellInterferenceEffect {
  return resolveHiddenCellFundingTheft({
    rivalPressureScore: pressure.score,
    rivalPressureBand: pressure.band,
    funding,
  })
}

export function resolveHiddenCellFundingTheftFromRankingScore(
  rankingScore: number,
  funding: number
): HiddenCellInterferenceEffect {
  const pressure = buildRivalPressureFromRankingScore(rankingScore)
  return resolveHiddenCellFundingTheftFromPressure(pressure, funding)
}

export function hasHiddenCellFundingTheftForWeek(
  fundingState: FundingState | undefined,
  closedWeek: number
): boolean {
  if (!fundingState) {
    return false
  }

  const week = Math.max(1, Math.trunc(closedWeek))
  return fundingState.fundingHistory.some(
    (entry) =>
      entry.week === week &&
      entry.reason === HIDDEN_CELL_FUNDING_THEFT_REASON &&
      entry.sourceId === HIDDEN_CELL_FUNDING_THEFT_SOURCE_ID
  )
}

/**
 * Apply funding theft to FundingState once per closed week.
 * Caller should pass fundingState whose `.funding` matches the pre-theft top-level funding.
 */
export function applyHiddenCellFundingTheftToFundingState(
  state: FundingState,
  effect: HiddenCellInterferenceEffect,
  closedWeek: number
): { state: FundingState; appliedAmount: number; effect: HiddenCellInterferenceEffect } {
  const week = Math.max(1, Math.trunc(closedWeek))
  const cappedTheft = Math.max(0, Math.min(effect.fundingStolen, Math.trunc(state.funding)))

  if (cappedTheft <= 0 || hasHiddenCellFundingTheftForWeek(state, week)) {
    return { state, appliedAmount: 0, effect }
  }

  const withExpense = applyFundingExpense(
    state,
    cappedTheft,
    HIDDEN_CELL_FUNDING_THEFT_REASON,
    week,
    HIDDEN_CELL_FUNDING_THEFT_SOURCE_ID
  )

  return {
    state: recomputeBudgetPressure(withExpense, week),
    appliedAmount: cappedTheft,
    effect,
  }
}

/** Read-time summary for agency/report surfaces from current ranking pressure + funding. */
export function buildHiddenCellInterferenceSummary(
  game: Pick<GameState, 'reports' | 'events' | 'funding' | 'agency'>
): HiddenCellInterferenceSummary {
  const pressure = buildRivalPressure(game)
  const funding = game.agency?.funding ?? game.funding
  const effect = resolveHiddenCellFundingTheftFromPressure(pressure, funding)

  return {
    active: effect.active,
    kind: effect.kind,
    fundingStolen: effect.fundingStolen,
    rivalPressureBand: effect.rivalPressureBand,
    summary: effect.summary,
  }
}

/** Locate applied theft amount for a closed week from funding history (note surfacing). */
export function findHiddenCellFundingTheftAmountForWeek(
  fundingState: FundingState | undefined,
  closedWeek: number
): number {
  if (!fundingState) {
    return 0
  }

  const week = Math.max(1, Math.trunc(closedWeek))
  const entry = fundingState.fundingHistory.find(
    (record) =>
      record.week === week &&
      record.reason === HIDDEN_CELL_FUNDING_THEFT_REASON &&
      record.sourceId === HIDDEN_CELL_FUNDING_THEFT_SOURCE_ID
  )

  if (!entry || entry.delta >= 0) {
    return 0
  }

  return Math.abs(entry.delta)
}
