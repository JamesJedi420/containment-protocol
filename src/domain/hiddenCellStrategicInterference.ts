/**
 * SPE-2704 / SPE-2706 / SPE-2707 / SPE-2710 / SPE-2714 / SPE-39: bounded hidden-cell strategic interference.
 *
 * Derives cell-pressure activity from rival-pressure band and applies:
 * - funding theft (SPE-2704) through existing FundingState history
 * - research rollback (SPE-2706) against active ResearchState progress
 * - panic amplification (SPE-2707) into ambient GameState.globalPressure
 * - infrastructure compromise (SPE-2710) against maintenance specialist capacity
 * - covert cell growth + detection narrowing (SPE-2714) on agency abstract counters
 *
 * No per-cell entities; detection is abstract narrowing bands only (no SPE-854 / scan UX).
 */

import { applyFundingExpense, recomputeBudgetPressure } from './funding'
import { clamp } from './math'
import type { AgencyState, FundingState, GameState, ResearchState } from './models'
import {
  buildRivalPressure,
  buildRivalPressureFromRankingScore,
  type RivalPressureBand,
  type RivalPressureView,
} from './rivalPressure'

export const HIDDEN_CELL_FUNDING_THEFT_REASON = 'hidden_cell_funding_theft'
export const HIDDEN_CELL_FUNDING_THEFT_SOURCE_ID = 'hidden-cell-funding-theft'

/** Max ambient pressure points one panic-amplification tick may add. */
export const HIDDEN_CELL_PANIC_AMPLIFICATION_MAX = 4

/** Max maintenance specialists one infrastructure-compromise tick may drain. */
export const HIDDEN_CELL_INFRASTRUCTURE_COMPROMISE_MAX = 2

/** Max covert-growth points one tick may add. */
export const HIDDEN_CELL_COVERT_GROWTH_MAX = 3

/** Cap on cumulative abstract covert-growth level. */
export const HIDDEN_CELL_COVERT_GROWTH_LEVEL_MAX = 20

/** Cap on cumulative detection-narrowing progress (0–100). */
export const HIDDEN_CELL_DETECTION_NARROWING_MAX = 100

/** Narrowing progress points per unit of applied covert growth. */
export const HIDDEN_CELL_DETECTION_NARROWING_PER_GROWTH = 8

export type HiddenCellInterferenceKind =
  | 'funding_theft'
  | 'research_rollback'
  | 'panic_amplification'
  | 'infrastructure_compromise'
  | 'covert_cell_growth'
  | 'none'

/** Player-facing detection-narrowing band — no coordinates / full cell truth. */
export type HiddenCellDetectionNarrowingBand =
  | 'none'
  | 'vague'
  | 'regional'
  | 'sector'
  | 'imminent'

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

export interface HiddenCellPanicAmplificationEffect {
  readonly active: boolean
  readonly kind: HiddenCellInterferenceKind
  readonly rivalPressureScore: number
  readonly rivalPressureBand: RivalPressureBand
  /** Base amplification before apply (0 when inactive). */
  readonly baseAmplificationAmount: number
  /** Applied globalPressure delta (0 when inactive). */
  readonly pressureAmplified: number
  readonly summary: string
}

export interface HiddenCellInfrastructureCompromiseEffect {
  readonly active: boolean
  readonly kind: HiddenCellInterferenceKind
  readonly rivalPressureScore: number
  readonly rivalPressureBand: RivalPressureBand
  /** Base compromise before capacity clamp (0 when inactive). */
  readonly baseCompromiseAmount: number
  /** Applied maintenance-specialist drain (0 when inactive or no capacity). */
  readonly maintenanceCompromised: number
  readonly summary: string
}

export interface HiddenCellCovertGrowthEffect {
  readonly active: boolean
  readonly kind: HiddenCellInterferenceKind
  readonly rivalPressureScore: number
  readonly rivalPressureBand: RivalPressureBand
  /** Base growth before cumulative-level clamp (0 when inactive). */
  readonly baseGrowthAmount: number
  /** Applied growth after clamp to remaining room (0 when inactive or at cap). */
  readonly growthApplied: number
  /** Base narrowing before progress clamp (0 when inactive). */
  readonly baseNarrowingAmount: number
  /** Applied narrowing after clamp (0 when inactive or at cap). */
  readonly narrowingApplied: number
  /** Detection band after applying this tick's narrowing to current progress. */
  readonly detectionNarrowingBand: HiddenCellDetectionNarrowingBand
  readonly summary: string
}

export interface HiddenCellInterferenceSummary {
  readonly active: boolean
  readonly kind: HiddenCellInterferenceKind
  readonly fundingStolen: number
  readonly progressTimeRolledBack: number
  readonly researchProjectId: string | null
  readonly pressureAmplified: number
  readonly maintenanceCompromised: number
  readonly covertGrowthApplied: number
  readonly detectionNarrowingApplied: number
  readonly detectionNarrowingBand: HiddenCellDetectionNarrowingBand
  readonly covertGrowthLevel: number
  readonly detectionNarrowing: number
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

/**
 * Base panic-amplification points from rival pressure score alone.
 * Inactive bands → 0. Active: 1–4 ambient globalPressure points above peer-balanced floor.
 */
export function computeHiddenCellPanicAmplificationBaseAmount(
  score: number,
  band: RivalPressureBand
): number {
  if (!isHiddenCellPressureActive(band)) {
    return 0
  }

  return clamp(
    Math.round((clamp(Math.round(score), 0, 100) - 50) / 12.5),
    1,
    HIDDEN_CELL_PANIC_AMPLIFICATION_MAX
  )
}

/**
 * Base infrastructure-compromise specialists from rival pressure score alone (capacity clamp applied separately).
 * Inactive bands → 0. Active: 1–2 maintenance specialists above peer-balanced floor.
 */
export function computeHiddenCellInfrastructureCompromiseBaseAmount(
  score: number,
  band: RivalPressureBand
): number {
  if (!isHiddenCellPressureActive(band)) {
    return 0
  }

  return clamp(
    Math.round((clamp(Math.round(score), 0, 100) - 50) / 25),
    1,
    HIDDEN_CELL_INFRASTRUCTURE_COMPROMISE_MAX
  )
}

/**
 * Base covert-growth points from rival pressure score alone (cumulative clamp applied separately).
 * Inactive bands → 0. Active: 1–3 growth points above peer-balanced floor.
 */
export function computeHiddenCellCovertGrowthBaseAmount(
  score: number,
  band: RivalPressureBand
): number {
  if (!isHiddenCellPressureActive(band)) {
    return 0
  }

  return clamp(
    Math.round((clamp(Math.round(score), 0, 100) - 50) / 16.5),
    1,
    HIDDEN_CELL_COVERT_GROWTH_MAX
  )
}

/**
 * Base detection-narrowing progress from applied (or prospective) growth amount.
 * Inactive / zero growth → 0. Active: growth × HIDDEN_CELL_DETECTION_NARROWING_PER_GROWTH.
 */
export function computeHiddenCellDetectionNarrowingBaseAmount(
  growthAmount: number,
  band: RivalPressureBand
): number {
  if (!isHiddenCellPressureActive(band)) {
    return 0
  }

  const growth = Math.max(0, Math.trunc(growthAmount))
  if (growth <= 0) {
    return 0
  }

  return clamp(growth * HIDDEN_CELL_DETECTION_NARROWING_PER_GROWTH, 1, HIDDEN_CELL_DETECTION_NARROWING_MAX)
}

/** Map cumulative narrowing progress to a player-facing band (no location truth). */
export function detectionNarrowingBandFromProgress(
  narrowing: number
): HiddenCellDetectionNarrowingBand {
  const progress = clamp(Math.trunc(narrowing), 0, HIDDEN_CELL_DETECTION_NARROWING_MAX)
  if (progress <= 0) {
    return 'none'
  }
  if (progress < 25) {
    return 'vague'
  }
  if (progress < 50) {
    return 'regional'
  }
  if (progress < 75) {
    return 'sector'
  }
  return 'imminent'
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

function buildPanicAmplificationSummary(input: {
  active: boolean
  band: RivalPressureBand
  pressureAmplified: number
  baseAmplificationAmount: number
}): string {
  if (!input.active) {
    return `Hidden-cell panic interference inactive (${input.band}): no panic amplification this week.`
  }

  if (input.pressureAmplified <= 0) {
    return (
      `Hidden-cell panic interference active (${input.band}): panic amplification blocked ` +
      `(base claim ${input.baseAmplificationAmount}).`
    )
  }

  return (
    `Hidden-cell interference amplified ambient panic pressure by ${input.pressureAmplified} ` +
    `(${input.band} cell pressure; strategic unrest before open confrontation).`
  )
}

function buildInfrastructureCompromiseSummary(input: {
  active: boolean
  band: RivalPressureBand
  maintenanceCompromised: number
  baseCompromiseAmount: number
}): string {
  if (!input.active) {
    return (
      `Hidden-cell infrastructure interference inactive (${input.band}): ` +
      `no infrastructure compromise this week.`
    )
  }

  if (input.maintenanceCompromised <= 0) {
    return (
      `Hidden-cell infrastructure interference active (${input.band}): infrastructure compromise blocked ` +
      `(no available maintenance capacity; base claim ${input.baseCompromiseAmount}).`
    )
  }

  return (
    `Hidden-cell interference compromised ${input.maintenanceCompromised} maintenance specialist` +
    `${input.maintenanceCompromised === 1 ? '' : 's'} ` +
    `(${input.band} cell pressure; strategic infrastructure sabotage before open confrontation).`
  )
}

function buildCovertGrowthSummary(input: {
  active: boolean
  band: RivalPressureBand
  growthApplied: number
  baseGrowthAmount: number
  narrowingApplied: number
  detectionNarrowingBand: HiddenCellDetectionNarrowingBand
}): string {
  if (!input.active) {
    return (
      `Hidden-cell covert growth inactive (${input.band}): ` +
      `no covert network expansion or detection narrowing this week.`
    )
  }

  if (input.growthApplied <= 0 && input.narrowingApplied <= 0) {
    return (
      `Hidden-cell covert growth active (${input.band}): covert expansion blocked ` +
      `(growth/narrowing at cap; base claim ${input.baseGrowthAmount}).`
    )
  }

  const growthPart =
    input.growthApplied > 0
      ? `expanded covert network pressure by ${input.growthApplied}`
      : 'held covert network pressure at cap'
  const narrowingPart =
    input.narrowingApplied > 0
      ? `intel narrowing advanced to ${input.detectionNarrowingBand}`
      : `intel narrowing held at ${input.detectionNarrowingBand}`

  return (
    `Hidden-cell interference ${growthPart} ` +
    `(${input.band} cell pressure; ${narrowingPart} before open confrontation).`
  )
}

function composeInterferenceSummary(input: {
  active: boolean
  band: RivalPressureBand
  fundingStolen: number
  progressTimeRolledBack: number
  researchProjectId: string | null
  pressureAmplified: number
  maintenanceCompromised: number
  growthApplied: number
  narrowingApplied: number
  fundingSummary: string
  researchSummary: string
  panicSummary: string
  infrastructureSummary: string
  covertGrowthSummary: string
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
  if (input.pressureAmplified > 0) {
    parts.push(input.panicSummary)
  }
  if (input.maintenanceCompromised > 0) {
    parts.push(input.infrastructureSummary)
  }
  if (input.growthApplied > 0 || input.narrowingApplied > 0) {
    parts.push(input.covertGrowthSummary)
  }

  if (parts.length > 0) {
    return parts.join(' ')
  }

  return (
    `Hidden-cell interference active (${input.band}): no funding, research, panic, infrastructure, or covert diversion applied this week.`
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

/** Pure resolve: identical pressure inputs → identical panic-amplification effect. */
export function resolveHiddenCellPanicAmplification(input: {
  rivalPressureScore: number
  rivalPressureBand: RivalPressureBand
}): HiddenCellPanicAmplificationEffect {
  const rivalPressureScore = clamp(Math.round(input.rivalPressureScore), 0, 100)
  const rivalPressureBand = input.rivalPressureBand
  const active = isHiddenCellPressureActive(rivalPressureBand)
  const baseAmplificationAmount = computeHiddenCellPanicAmplificationBaseAmount(
    rivalPressureScore,
    rivalPressureBand
  )
  const pressureAmplified = active ? baseAmplificationAmount : 0
  const kind: HiddenCellInterferenceKind =
    pressureAmplified > 0 ? 'panic_amplification' : 'none'

  return {
    active,
    kind,
    rivalPressureScore,
    rivalPressureBand,
    baseAmplificationAmount,
    pressureAmplified,
    summary: buildPanicAmplificationSummary({
      active,
      band: rivalPressureBand,
      pressureAmplified,
      baseAmplificationAmount,
    }),
  }
}

export function resolveHiddenCellPanicAmplificationFromPressure(
  pressure: Pick<RivalPressureView, 'score' | 'band'>
): HiddenCellPanicAmplificationEffect {
  return resolveHiddenCellPanicAmplification({
    rivalPressureScore: pressure.score,
    rivalPressureBand: pressure.band,
  })
}

export function resolveHiddenCellPanicAmplificationFromRankingScore(
  rankingScore: number
): HiddenCellPanicAmplificationEffect {
  const pressure = buildRivalPressureFromRankingScore(rankingScore)
  return resolveHiddenCellPanicAmplificationFromPressure(pressure)
}

/** Pure resolve: identical pressure + maintenance-capacity inputs → identical compromise effect. */
export function resolveHiddenCellInfrastructureCompromise(input: {
  rivalPressureScore: number
  rivalPressureBand: RivalPressureBand
  maintenanceSpecialistsAvailable: number
}): HiddenCellInfrastructureCompromiseEffect {
  const rivalPressureScore = clamp(Math.round(input.rivalPressureScore), 0, 100)
  const rivalPressureBand = input.rivalPressureBand
  const active = isHiddenCellPressureActive(rivalPressureBand)
  const baseCompromiseAmount = computeHiddenCellInfrastructureCompromiseBaseAmount(
    rivalPressureScore,
    rivalPressureBand
  )
  const available = Math.max(0, Math.trunc(input.maintenanceSpecialistsAvailable))
  const maintenanceCompromised = active ? Math.min(available, baseCompromiseAmount) : 0
  const kind: HiddenCellInterferenceKind =
    maintenanceCompromised > 0 ? 'infrastructure_compromise' : 'none'

  return {
    active,
    kind,
    rivalPressureScore,
    rivalPressureBand,
    baseCompromiseAmount,
    maintenanceCompromised,
    summary: buildInfrastructureCompromiseSummary({
      active,
      band: rivalPressureBand,
      maintenanceCompromised,
      baseCompromiseAmount,
    }),
  }
}

export function resolveHiddenCellInfrastructureCompromiseFromPressure(
  pressure: Pick<RivalPressureView, 'score' | 'band'>,
  maintenanceSpecialistsAvailable: number
): HiddenCellInfrastructureCompromiseEffect {
  return resolveHiddenCellInfrastructureCompromise({
    rivalPressureScore: pressure.score,
    rivalPressureBand: pressure.band,
    maintenanceSpecialistsAvailable,
  })
}

export function resolveHiddenCellInfrastructureCompromiseFromRankingScore(
  rankingScore: number,
  maintenanceSpecialistsAvailable: number
): HiddenCellInfrastructureCompromiseEffect {
  const pressure = buildRivalPressureFromRankingScore(rankingScore)
  return resolveHiddenCellInfrastructureCompromiseFromPressure(
    pressure,
    maintenanceSpecialistsAvailable
  )
}

/**
 * Pure resolve: identical pressure + prior growth/narrowing → identical covert-growth effect.
 * Detection narrowing is derived from the prospective growth tick (not a separate scan UX).
 */
export function resolveHiddenCellCovertGrowth(input: {
  rivalPressureScore: number
  rivalPressureBand: RivalPressureBand
  covertGrowthLevel: number
  detectionNarrowing: number
}): HiddenCellCovertGrowthEffect {
  const rivalPressureScore = clamp(Math.round(input.rivalPressureScore), 0, 100)
  const rivalPressureBand = input.rivalPressureBand
  const active = isHiddenCellPressureActive(rivalPressureBand)
  const baseGrowthAmount = computeHiddenCellCovertGrowthBaseAmount(
    rivalPressureScore,
    rivalPressureBand
  )
  const currentLevel = clamp(
    Math.trunc(input.covertGrowthLevel),
    0,
    HIDDEN_CELL_COVERT_GROWTH_LEVEL_MAX
  )
  const growthRoom = HIDDEN_CELL_COVERT_GROWTH_LEVEL_MAX - currentLevel
  const growthApplied = active ? Math.min(growthRoom, baseGrowthAmount) : 0

  // When growth is at cap but pressure is still active, allow a residual narrowing tick
  // so intel can still advance without inventing a second pressure formula.
  const prospectiveGrowthForNarrowing = active
    ? growthApplied > 0
      ? growthApplied
      : baseGrowthAmount > 0
        ? 1
        : 0
    : 0
  const baseNarrowingAmount = computeHiddenCellDetectionNarrowingBaseAmount(
    prospectiveGrowthForNarrowing,
    rivalPressureBand
  )
  const currentNarrowing = clamp(
    Math.trunc(input.detectionNarrowing),
    0,
    HIDDEN_CELL_DETECTION_NARROWING_MAX
  )
  const narrowingRoom = HIDDEN_CELL_DETECTION_NARROWING_MAX - currentNarrowing
  const narrowingApplied = active ? Math.min(narrowingRoom, baseNarrowingAmount) : 0
  const detectionNarrowingBand = detectionNarrowingBandFromProgress(
    currentNarrowing + narrowingApplied
  )
  const kind: HiddenCellInterferenceKind =
    growthApplied > 0 || narrowingApplied > 0 ? 'covert_cell_growth' : 'none'

  return {
    active,
    kind,
    rivalPressureScore,
    rivalPressureBand,
    baseGrowthAmount,
    growthApplied,
    baseNarrowingAmount,
    narrowingApplied,
    detectionNarrowingBand,
    summary: buildCovertGrowthSummary({
      active,
      band: rivalPressureBand,
      growthApplied,
      baseGrowthAmount,
      narrowingApplied,
      detectionNarrowingBand,
    }),
  }
}

export function resolveHiddenCellCovertGrowthFromPressure(
  pressure: Pick<RivalPressureView, 'score' | 'band'>,
  covertGrowthLevel: number,
  detectionNarrowing: number
): HiddenCellCovertGrowthEffect {
  return resolveHiddenCellCovertGrowth({
    rivalPressureScore: pressure.score,
    rivalPressureBand: pressure.band,
    covertGrowthLevel,
    detectionNarrowing,
  })
}

export function resolveHiddenCellCovertGrowthFromRankingScore(
  rankingScore: number,
  covertGrowthLevel: number,
  detectionNarrowing: number
): HiddenCellCovertGrowthEffect {
  const pressure = buildRivalPressureFromRankingScore(rankingScore)
  return resolveHiddenCellCovertGrowthFromPressure(
    pressure,
    covertGrowthLevel,
    detectionNarrowing
  )
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

export function hasHiddenCellPanicAmplificationForWeek(
  state: Pick<
    GameState,
    'lastHiddenCellPanicAmplificationWeek' | 'lastHiddenCellPanicAmplificationAmount'
  >,
  closedWeek: number
): boolean {
  const week = Math.max(1, Math.trunc(closedWeek))
  return (
    state.lastHiddenCellPanicAmplificationWeek === week &&
    Math.max(0, Math.trunc(state.lastHiddenCellPanicAmplificationAmount ?? 0)) > 0
  )
}

export function hasHiddenCellInfrastructureCompromiseForWeek(
  agency: Pick<
    AgencyState,
    | 'lastHiddenCellInfrastructureCompromiseWeek'
    | 'lastHiddenCellInfrastructureCompromiseAmount'
  > | undefined,
  closedWeek: number
): boolean {
  if (!agency) {
    return false
  }

  const week = Math.max(1, Math.trunc(closedWeek))
  return (
    agency.lastHiddenCellInfrastructureCompromiseWeek === week &&
    Math.max(0, Math.trunc(agency.lastHiddenCellInfrastructureCompromiseAmount ?? 0)) > 0
  )
}

export function hasHiddenCellCovertGrowthForWeek(
  agency: Pick<
    AgencyState,
    | 'lastHiddenCellCovertGrowthWeek'
    | 'lastHiddenCellCovertGrowthAmount'
    | 'lastHiddenCellDetectionNarrowingAmount'
  > | undefined,
  closedWeek: number
): boolean {
  if (!agency) {
    return false
  }

  const week = Math.max(1, Math.trunc(closedWeek))
  if (agency.lastHiddenCellCovertGrowthWeek !== week) {
    return false
  }

  return (
    Math.max(0, Math.trunc(agency.lastHiddenCellCovertGrowthAmount ?? 0)) > 0 ||
    Math.max(0, Math.trunc(agency.lastHiddenCellDetectionNarrowingAmount ?? 0)) > 0
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

/**
 * Apply panic amplification to ambient globalPressure once per closed week.
 * Composes into existing pressure score; does not spawn incidents in-band.
 */
export function applyHiddenCellPanicAmplificationToGameState(
  state: Pick<
    GameState,
    | 'globalPressure'
    | 'lastHiddenCellPanicAmplificationWeek'
    | 'lastHiddenCellPanicAmplificationAmount'
  >,
  effect: HiddenCellPanicAmplificationEffect,
  closedWeek: number
): {
  state: Pick<
    GameState,
    | 'globalPressure'
    | 'lastHiddenCellPanicAmplificationWeek'
    | 'lastHiddenCellPanicAmplificationAmount'
  >
  appliedAmount: number
  effect: HiddenCellPanicAmplificationEffect
} {
  const week = Math.max(1, Math.trunc(closedWeek))
  const appliedAmount = Math.max(0, Math.trunc(effect.pressureAmplified))

  if (appliedAmount <= 0 || hasHiddenCellPanicAmplificationForWeek(state, week)) {
    return { state, appliedAmount: 0, effect }
  }

  const currentPressure = Math.max(0, Math.trunc(state.globalPressure ?? 0))
  return {
    state: {
      globalPressure: currentPressure + appliedAmount,
      lastHiddenCellPanicAmplificationWeek: week,
      lastHiddenCellPanicAmplificationAmount: appliedAmount,
    },
    appliedAmount,
    effect,
  }
}

/**
 * Apply infrastructure compromise to maintenance specialist capacity once per closed week.
 * Composes into SPE-94 recovery bottleneck; does not invent a parallel sabotage sim.
 */
export function applyHiddenCellInfrastructureCompromiseToAgencyState(
  agency: Pick<
    AgencyState,
    | 'maintenanceSpecialistsAvailable'
    | 'lastHiddenCellInfrastructureCompromiseWeek'
    | 'lastHiddenCellInfrastructureCompromiseAmount'
  >,
  effect: HiddenCellInfrastructureCompromiseEffect,
  closedWeek: number
): {
  state: Pick<
    AgencyState,
    | 'maintenanceSpecialistsAvailable'
    | 'lastHiddenCellInfrastructureCompromiseWeek'
    | 'lastHiddenCellInfrastructureCompromiseAmount'
  >
  appliedAmount: number
  effect: HiddenCellInfrastructureCompromiseEffect
} {
  const week = Math.max(1, Math.trunc(closedWeek))
  const available = Math.max(0, Math.trunc(agency.maintenanceSpecialistsAvailable ?? 0))
  const appliedAmount = Math.max(0, Math.min(available, Math.trunc(effect.maintenanceCompromised)))

  if (appliedAmount <= 0 || hasHiddenCellInfrastructureCompromiseForWeek(agency, week)) {
    return { state: agency, appliedAmount: 0, effect }
  }

  return {
    state: {
      maintenanceSpecialistsAvailable: available - appliedAmount,
      lastHiddenCellInfrastructureCompromiseWeek: week,
      lastHiddenCellInfrastructureCompromiseAmount: appliedAmount,
    },
    appliedAmount,
    effect,
  }
}

/**
 * Apply covert growth + detection narrowing once per closed week.
 * Abstract counters only — no per-cell entities or SPE-854 scan UX.
 */
export function applyHiddenCellCovertGrowthToAgencyState(
  agency: Pick<
    AgencyState,
    | 'hiddenCellCovertGrowthLevel'
    | 'hiddenCellDetectionNarrowing'
    | 'lastHiddenCellCovertGrowthWeek'
    | 'lastHiddenCellCovertGrowthAmount'
    | 'lastHiddenCellDetectionNarrowingAmount'
  >,
  effect: HiddenCellCovertGrowthEffect,
  closedWeek: number
): {
  state: Pick<
    AgencyState,
    | 'hiddenCellCovertGrowthLevel'
    | 'hiddenCellDetectionNarrowing'
    | 'lastHiddenCellCovertGrowthWeek'
    | 'lastHiddenCellCovertGrowthAmount'
    | 'lastHiddenCellDetectionNarrowingAmount'
  >
  appliedGrowth: number
  appliedNarrowing: number
  effect: HiddenCellCovertGrowthEffect
} {
  const week = Math.max(1, Math.trunc(closedWeek))
  const currentLevel = clamp(
    Math.trunc(agency.hiddenCellCovertGrowthLevel ?? 0),
    0,
    HIDDEN_CELL_COVERT_GROWTH_LEVEL_MAX
  )
  const currentNarrowing = clamp(
    Math.trunc(agency.hiddenCellDetectionNarrowing ?? 0),
    0,
    HIDDEN_CELL_DETECTION_NARROWING_MAX
  )
  const appliedGrowth = Math.max(
    0,
    Math.min(HIDDEN_CELL_COVERT_GROWTH_LEVEL_MAX - currentLevel, Math.trunc(effect.growthApplied))
  )
  const appliedNarrowing = Math.max(
    0,
    Math.min(
      HIDDEN_CELL_DETECTION_NARROWING_MAX - currentNarrowing,
      Math.trunc(effect.narrowingApplied)
    )
  )

  if (
    (appliedGrowth <= 0 && appliedNarrowing <= 0) ||
    hasHiddenCellCovertGrowthForWeek(agency, week)
  ) {
    return {
      state: agency,
      appliedGrowth: 0,
      appliedNarrowing: 0,
      effect,
    }
  }

  return {
    state: {
      hiddenCellCovertGrowthLevel: currentLevel + appliedGrowth,
      hiddenCellDetectionNarrowing: currentNarrowing + appliedNarrowing,
      lastHiddenCellCovertGrowthWeek: week,
      lastHiddenCellCovertGrowthAmount: appliedGrowth,
      lastHiddenCellDetectionNarrowingAmount: appliedNarrowing,
    },
    appliedGrowth,
    appliedNarrowing,
    effect,
  }
}

/** Read-time summary for agency/report surfaces from current ranking pressure + funding + research + panic + infra + covert. */
export function buildHiddenCellInterferenceSummary(
  game: Pick<GameState, 'reports' | 'events' | 'funding' | 'agency' | 'researchState'>
): HiddenCellInterferenceSummary {
  const pressure = buildRivalPressure(game)
  const funding = game.agency?.funding ?? game.funding
  const fundingEffect = resolveHiddenCellFundingTheftFromPressure(pressure, funding)
  const researchEffect = resolveHiddenCellResearchRollbackFromPressure(pressure, game.researchState)
  const panicEffect = resolveHiddenCellPanicAmplificationFromPressure(pressure)
  const maintenanceAvailable = game.agency?.maintenanceSpecialistsAvailable ?? 0
  const infrastructureEffect = resolveHiddenCellInfrastructureCompromiseFromPressure(
    pressure,
    maintenanceAvailable
  )
  const covertGrowthLevel = game.agency?.hiddenCellCovertGrowthLevel ?? 0
  const detectionNarrowing = game.agency?.hiddenCellDetectionNarrowing ?? 0
  const covertGrowthEffect = resolveHiddenCellCovertGrowthFromPressure(
    pressure,
    covertGrowthLevel,
    detectionNarrowing
  )
  const active = fundingEffect.active
  const fundingStolen = fundingEffect.fundingStolen
  const progressTimeRolledBack = researchEffect.progressTimeRolledBack
  const researchProjectId = researchEffect.targetProjectId
  const pressureAmplified = panicEffect.pressureAmplified
  const maintenanceCompromised = infrastructureEffect.maintenanceCompromised
  const covertGrowthApplied = covertGrowthEffect.growthApplied
  const detectionNarrowingApplied = covertGrowthEffect.narrowingApplied
  const kind: HiddenCellInterferenceKind =
    fundingStolen > 0
      ? 'funding_theft'
      : progressTimeRolledBack > 0
        ? 'research_rollback'
        : pressureAmplified > 0
          ? 'panic_amplification'
          : maintenanceCompromised > 0
            ? 'infrastructure_compromise'
            : covertGrowthApplied > 0 || detectionNarrowingApplied > 0
              ? 'covert_cell_growth'
              : 'none'

  return {
    active,
    kind,
    fundingStolen,
    progressTimeRolledBack,
    researchProjectId,
    pressureAmplified,
    maintenanceCompromised,
    covertGrowthApplied,
    detectionNarrowingApplied,
    detectionNarrowingBand: covertGrowthEffect.detectionNarrowingBand,
    covertGrowthLevel,
    detectionNarrowing,
    rivalPressureBand: pressure.band,
    summary: composeInterferenceSummary({
      active,
      band: pressure.band,
      fundingStolen,
      progressTimeRolledBack,
      researchProjectId,
      pressureAmplified,
      maintenanceCompromised,
      growthApplied: covertGrowthApplied,
      narrowingApplied: detectionNarrowingApplied,
      fundingSummary: fundingEffect.summary,
      researchSummary: researchEffect.summary,
      panicSummary: panicEffect.summary,
      infrastructureSummary: infrastructureEffect.summary,
      covertGrowthSummary: covertGrowthEffect.summary,
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

/** Locate applied panic amplification amount for a closed week (note surfacing / tests). */
export function findHiddenCellPanicAmplificationAmountForWeek(
  state: Pick<
    GameState,
    'lastHiddenCellPanicAmplificationWeek' | 'lastHiddenCellPanicAmplificationAmount'
  >,
  closedWeek: number
): number {
  if (!hasHiddenCellPanicAmplificationForWeek(state, closedWeek)) {
    return 0
  }

  return Math.max(0, Math.trunc(state.lastHiddenCellPanicAmplificationAmount ?? 0))
}

/** Locate applied infrastructure compromise amount for a closed week (note surfacing / tests). */
export function findHiddenCellInfrastructureCompromiseAmountForWeek(
  agency: Pick<
    AgencyState,
    | 'lastHiddenCellInfrastructureCompromiseWeek'
    | 'lastHiddenCellInfrastructureCompromiseAmount'
  > | undefined,
  closedWeek: number
): number {
  if (!hasHiddenCellInfrastructureCompromiseForWeek(agency, closedWeek)) {
    return 0
  }

  return Math.max(0, Math.trunc(agency?.lastHiddenCellInfrastructureCompromiseAmount ?? 0))
}

/** Locate applied covert-growth amount for a closed week (note surfacing / tests). */
export function findHiddenCellCovertGrowthAmountForWeek(
  agency: Pick<
    AgencyState,
    | 'lastHiddenCellCovertGrowthWeek'
    | 'lastHiddenCellCovertGrowthAmount'
    | 'lastHiddenCellDetectionNarrowingAmount'
  > | undefined,
  closedWeek: number
): number {
  if (!hasHiddenCellCovertGrowthForWeek(agency, closedWeek)) {
    return 0
  }

  return Math.max(0, Math.trunc(agency?.lastHiddenCellCovertGrowthAmount ?? 0))
}

/** Locate applied detection-narrowing amount for a closed week (note surfacing / tests). */
export function findHiddenCellDetectionNarrowingAmountForWeek(
  agency: Pick<
    AgencyState,
    | 'lastHiddenCellCovertGrowthWeek'
    | 'lastHiddenCellCovertGrowthAmount'
    | 'lastHiddenCellDetectionNarrowingAmount'
  > | undefined,
  closedWeek: number
): number {
  if (!hasHiddenCellCovertGrowthForWeek(agency, closedWeek)) {
    return 0
  }

  return Math.max(0, Math.trunc(agency?.lastHiddenCellDetectionNarrowingAmount ?? 0))
}
