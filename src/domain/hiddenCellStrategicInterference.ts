/**
 * SPE-2704 / SPE-2706 / SPE-39: bounded hidden-cell strategic interference.
 *
 * Derives cell-pressure activity from rival-pressure band and applies:
 * - funding theft (SPE-2704) through existing FundingState history
 * - research rollback (SPE-2706) against active ResearchState progress
 *
 * No per-cell entities; no detection layer.
 */

import { applyFundingExpense, recomputeBudgetPressure } from './funding'
import { clamp } from './math'
import type { FundingState, GameState, ResearchState } from './models'
import {
  buildRivalPressure,
  buildRivalPressureFromRankingScore,
  type RivalPressureBand,
  type RivalPressureView,
} from './rivalPressure'

export const HIDDEN_CELL_FUNDING_THEFT_REASON = 'hidden_cell_funding_theft'
export const HIDDEN_CELL_FUNDING_THEFT_SOURCE_ID = 'hidden-cell-funding-theft'

export type HiddenCellInterferenceKind = 'funding_theft' | 'research_rollback' | 'none'

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

export interface HiddenCellResearchRollbackEffect {
  readonly active: boolean
  readonly kind: HiddenCellInterferenceKind
  readonly rivalPressureScore: number
  readonly rivalPressureBand: RivalPressureBand
  /** Base rollback weeks before progress clamp (0 when inactive). */
  readonly baseRollbackAmount: number
  /** Applied progressTime reduction (0 when inactive or no eligible progress). */
  readonly progressTimeRolledBack: number
  readonly targetProjectId: string | null
  readonly summary: string
}

export interface HiddenCellInterferenceSummary {
  readonly active: boolean
  readonly kind: HiddenCellInterferenceKind
  readonly fundingStolen: number
  readonly progressTimeRolledBack: number
  readonly researchProjectId: string | null
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

/**
 * Base research-rollback weeks from rival pressure score alone (progress clamp applied separately).
 * Inactive bands → 0. Active: 1–2 weeks above peer-balanced pressure floor.
 */
export function computeHiddenCellResearchRollbackBaseAmount(
  score: number,
  band: RivalPressureBand
): number {
  if (!isHiddenCellPressureActive(band)) {
    return 0
  }

  return clamp(Math.round((clamp(Math.round(score), 0, 100) - 50) / 25), 1, 2)
}

function buildFundingInterferenceSummary(input: {
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

function buildResearchRollbackSummary(input: {
  active: boolean
  band: RivalPressureBand
  progressTimeRolledBack: number
  baseRollbackAmount: number
  targetProjectId: string | null
}): string {
  if (!input.active) {
    return `Hidden-cell research interference inactive (${input.band}): no research rollback this week.`
  }

  if (input.progressTimeRolledBack <= 0 || !input.targetProjectId) {
    return (
      `Hidden-cell research interference active (${input.band}): research rollback blocked ` +
      `(no eligible active progress; base claim ${input.baseRollbackAmount} week` +
      `${input.baseRollbackAmount === 1 ? '' : 's'}).`
    )
  }

  return (
    `Hidden-cell interference rolled back ${input.progressTimeRolledBack} week` +
    `${input.progressTimeRolledBack === 1 ? '' : 's'} of research on ${input.targetProjectId} ` +
    `(${input.band} cell pressure; strategic sabotage before open confrontation).`
  )
}

function composeInterferenceSummary(input: {
  active: boolean
  band: RivalPressureBand
  fundingStolen: number
  progressTimeRolledBack: number
  researchProjectId: string | null
  fundingSummary: string
  researchSummary: string
}): string {
  if (!input.active) {
    return `Hidden-cell interference inactive (${input.band}): no strategic diversion this week.`
  }

  const parts: string[] = []
  if (input.fundingStolen > 0) {
    parts.push(input.fundingSummary)
  }
  if (input.progressTimeRolledBack > 0 && input.researchProjectId) {
    parts.push(input.researchSummary)
  }

  if (parts.length > 0) {
    return parts.join(' ')
  }

  return (
    `Hidden-cell interference active (${input.band}): no funding or research diversion applied this week.`
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
    summary: buildFundingInterferenceSummary({
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

/**
 * Lex-min active project id with progressTime > 0 (deterministic target selection).
 * Completed projects are never selected.
 */
export function selectHiddenCellResearchRollbackTarget(
  researchState: ResearchState | undefined
): string | null {
  if (!researchState) {
    return null
  }

  const eligible = researchState.activeProjectIds
    .filter((projectId) => {
      const project = researchState.projects[projectId]
      return (
        Boolean(project) &&
        project.status === 'active' &&
        Math.max(0, Math.trunc(project.progressTime ?? 0)) > 0
      )
    })
    .sort((left, right) => left.localeCompare(right))

  return eligible[0] ?? null
}

/** Pure resolve: identical pressure + research inputs → identical rollback effect. */
export function resolveHiddenCellResearchRollback(input: {
  rivalPressureScore: number
  rivalPressureBand: RivalPressureBand
  researchState: ResearchState | undefined
}): HiddenCellResearchRollbackEffect {
  const rivalPressureScore = clamp(Math.round(input.rivalPressureScore), 0, 100)
  const rivalPressureBand = input.rivalPressureBand
  const active = isHiddenCellPressureActive(rivalPressureBand)
  const baseRollbackAmount = computeHiddenCellResearchRollbackBaseAmount(
    rivalPressureScore,
    rivalPressureBand
  )
  const targetProjectId = active ? selectHiddenCellResearchRollbackTarget(input.researchState) : null
  const availableProgress =
    targetProjectId && input.researchState
      ? Math.max(0, Math.trunc(input.researchState.projects[targetProjectId]?.progressTime ?? 0))
      : 0
  const progressTimeRolledBack =
    active && targetProjectId ? Math.min(availableProgress, baseRollbackAmount) : 0
  const kind: HiddenCellInterferenceKind =
    progressTimeRolledBack > 0 ? 'research_rollback' : 'none'

  return {
    active,
    kind,
    rivalPressureScore,
    rivalPressureBand,
    baseRollbackAmount,
    progressTimeRolledBack,
    targetProjectId: progressTimeRolledBack > 0 ? targetProjectId : null,
    summary: buildResearchRollbackSummary({
      active,
      band: rivalPressureBand,
      progressTimeRolledBack,
      baseRollbackAmount,
      targetProjectId: progressTimeRolledBack > 0 ? targetProjectId : null,
    }),
  }
}

export function resolveHiddenCellResearchRollbackFromPressure(
  pressure: Pick<RivalPressureView, 'score' | 'band'>,
  researchState: ResearchState | undefined
): HiddenCellResearchRollbackEffect {
  return resolveHiddenCellResearchRollback({
    rivalPressureScore: pressure.score,
    rivalPressureBand: pressure.band,
    researchState,
  })
}

export function resolveHiddenCellResearchRollbackFromRankingScore(
  rankingScore: number,
  researchState: ResearchState | undefined
): HiddenCellResearchRollbackEffect {
  const pressure = buildRivalPressureFromRankingScore(rankingScore)
  return resolveHiddenCellResearchRollbackFromPressure(pressure, researchState)
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

export function hasHiddenCellResearchRollbackForWeek(
  researchState: ResearchState | undefined,
  closedWeek: number
): boolean {
  if (!researchState) {
    return false
  }

  const week = Math.max(1, Math.trunc(closedWeek))
  return (
    researchState.lastHiddenCellRollbackWeek === week &&
    typeof researchState.lastHiddenCellRollbackProjectId === 'string' &&
    researchState.lastHiddenCellRollbackProjectId.length > 0 &&
    Math.max(0, Math.trunc(researchState.lastHiddenCellRollbackAmount ?? 0)) > 0
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

/**
 * Apply research rollback to ResearchState once per closed week.
 * Progress-only: never un-completes projects; clamps to available progressTime.
 */
export function applyHiddenCellResearchRollbackToResearchState(
  state: ResearchState,
  effect: HiddenCellResearchRollbackEffect,
  closedWeek: number
): {
  state: ResearchState
  appliedAmount: number
  effect: HiddenCellResearchRollbackEffect
} {
  const week = Math.max(1, Math.trunc(closedWeek))

  if (
    effect.progressTimeRolledBack <= 0 ||
    !effect.targetProjectId ||
    hasHiddenCellResearchRollbackForWeek(state, week)
  ) {
    return { state, appliedAmount: 0, effect }
  }

  const project = state.projects[effect.targetProjectId]
  if (!project || project.status !== 'active') {
    return { state, appliedAmount: 0, effect }
  }

  const currentProgress = Math.max(0, Math.trunc(project.progressTime ?? 0))
  const appliedAmount = Math.min(currentProgress, Math.max(0, Math.trunc(effect.progressTimeRolledBack)))
  if (appliedAmount <= 0) {
    return { state, appliedAmount: 0, effect }
  }

  return {
    state: {
      ...state,
      lastHiddenCellRollbackWeek: week,
      lastHiddenCellRollbackProjectId: effect.targetProjectId,
      lastHiddenCellRollbackAmount: appliedAmount,
      projects: {
        ...state.projects,
        [effect.targetProjectId]: {
          ...project,
          progressTime: currentProgress - appliedAmount,
          lastUpdatedWeek: week,
        },
      },
    },
    appliedAmount,
    effect,
  }
}

/** Read-time summary for agency/report surfaces from current ranking pressure + funding + research. */
export function buildHiddenCellInterferenceSummary(
  game: Pick<GameState, 'reports' | 'events' | 'funding' | 'agency' | 'researchState'>
): HiddenCellInterferenceSummary {
  const pressure = buildRivalPressure(game)
  const funding = game.agency?.funding ?? game.funding
  const fundingEffect = resolveHiddenCellFundingTheftFromPressure(pressure, funding)
  const researchEffect = resolveHiddenCellResearchRollbackFromPressure(pressure, game.researchState)
  const active = fundingEffect.active
  const fundingStolen = fundingEffect.fundingStolen
  const progressTimeRolledBack = researchEffect.progressTimeRolledBack
  const researchProjectId = researchEffect.targetProjectId
  const kind: HiddenCellInterferenceKind =
    fundingStolen > 0
      ? 'funding_theft'
      : progressTimeRolledBack > 0
        ? 'research_rollback'
        : 'none'

  return {
    active,
    kind,
    fundingStolen,
    progressTimeRolledBack,
    researchProjectId,
    rivalPressureBand: pressure.band,
    summary: composeInterferenceSummary({
      active,
      band: pressure.band,
      fundingStolen,
      progressTimeRolledBack,
      researchProjectId,
      fundingSummary: fundingEffect.summary,
      researchSummary: researchEffect.summary,
    }),
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

/** Locate applied research rollback amount for a closed week (note surfacing / tests). */
export function findHiddenCellResearchRollbackAmountForWeek(
  researchState: ResearchState | undefined,
  closedWeek: number
): number {
  if (!hasHiddenCellResearchRollbackForWeek(researchState, closedWeek)) {
    return 0
  }

  return Math.max(0, Math.trunc(researchState?.lastHiddenCellRollbackAmount ?? 0))
}

export function findHiddenCellResearchRollbackProjectIdForWeek(
  researchState: ResearchState | undefined,
  closedWeek: number
): string | null {
  if (!hasHiddenCellResearchRollbackForWeek(researchState, closedWeek)) {
    return null
  }

  const projectId = researchState?.lastHiddenCellRollbackProjectId
  return typeof projectId === 'string' && projectId.length > 0 ? projectId : null
}
