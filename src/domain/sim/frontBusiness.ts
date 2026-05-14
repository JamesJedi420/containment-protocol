import type { CourierShellFrontState, GameState } from '../models'
import { getCanonicalFundingState } from '../funding'
import { normalizeGameState } from '../teamSimulation'
import {
  OFF_BOOKS_COURIER_LOCKOUT_TAG,
  OFF_BOOKS_COURIER_PAID_PREREQ_TAG,
} from './downtimeSideWork'
import { FRONT_BUSINESS_CALIBRATION } from './calibration'
import { vitalsHasExposureResidue } from './recoveryImpairments'

export function agencyHasPaidCourierPrerequisite(game: Pick<GameState, 'agents'>): boolean {
  return Object.values(game.agents).some((a) => a?.tags.includes(OFF_BOOKS_COURIER_PAID_PREREQ_TAG))
}

function countCourierLockouts(agents: GameState['agents']): number {
  let n = 0
  for (const a of Object.values(agents)) {
    if (!a) continue
    if (a.tags.includes(OFF_BOOKS_COURIER_LOCKOUT_TAG)) n += 1
  }
  return n
}

function countExposureResidueAgents(agents: GameState['agents']): number {
  let n = 0
  for (const a of Object.values(agents)) {
    if (!a) continue
    if (vitalsHasExposureResidue(a.vitals)) n += 1
  }
  return n
}

export interface CourierShellRiskBreakdown {
  riskScore: number
  lockoutCount: number
  residueCount: number
  budgetPressure: number
}

export function getCourierShellRiskBreakdown(
  game: Pick<GameState, 'agents' | 'agency' | 'config' | 'funding' | 'week'>
): CourierShellRiskBreakdown {
  const lockoutCount = countCourierLockouts(game.agents)
  const residueCount = countExposureResidueAgents(game.agents)
  const budgetPressure = getCanonicalFundingState(game).budgetPressure
  return {
    riskScore: lockoutCount * 2 + residueCount + budgetPressure,
    lockoutCount,
    residueCount,
    budgetPressure,
  }
}

function courierShellRiskScore(game: Pick<GameState, 'agents' | 'agency' | 'config' | 'funding' | 'week'>): number {
  return getCourierShellRiskBreakdown(game).riskScore
}

/**
 * SPE-1703a: open the single courier shell front (paid prerequisite, one copy per campaign slice).
 * No-op when already present, prerequisites missing, funding too low, or agency missing.
 */
export function openCourierShellFront(state: GameState): GameState {
  const base = normalizeGameState(state)
  if (!base.agency) return base
  if (base.agency.courierShellFront?.type === 'courierShell') return base
  if (!agencyHasPaidCourierPrerequisite(base)) return base

  const cost = FRONT_BUSINESS_CALIBRATION.courierShellStartupCost
  if (base.funding < cost) return base

  return normalizeGameState({
    ...base,
    funding: base.funding - cost,
    agency: {
      ...base.agency,
      courierShellFront: {
        type: 'courierShell',
        status: 'active',
        startedWeek: base.week,
        startupCostPaid: cost,
        exposureBand: 'low',
      },
    },
  })
}

export interface CourierShellWeeklyResolution {
  fundingDelta: number
  nextFront: CourierShellFrontState
  applyCollapseBudgetPressureDebt: boolean
}

/**
 * Deterministic weekly ledger for the courier shell while it is not collapsed.
 * Idempotent when `lastResolvedWeek` already equals `closedWeek`.
 */
export function resolveCourierShellFrontWeekly(
  game: Pick<GameState, 'agents' | 'agency' | 'config' | 'funding' | 'week'>,
  closedWeek: number
): CourierShellWeeklyResolution | null {
  const front = game.agency?.courierShellFront
  if (!front || front.type !== 'courierShell' || front.status === 'collapsed') return null
  if (front.lastResolvedWeek === closedWeek) return null

  const risk = courierShellRiskScore(game)
  const net =
    FRONT_BUSINESS_CALIBRATION.courierShellWeeklyBase -
    risk * FRONT_BUSINESS_CALIBRATION.courierShellRiskMultiplier

  const collapse = risk >= FRONT_BUSINESS_CALIBRATION.courierShellCollapseRiskThreshold
  const strained =
    !collapse &&
    (risk >= FRONT_BUSINESS_CALIBRATION.courierShellStrainRiskThreshold || net < 0)

  const nextStatus = collapse ? 'collapsed' : strained ? 'strained' : 'active'
  const exposureBand: CourierShellFrontState['exposureBand'] =
    nextStatus === 'active' ? 'low' : 'elevated'

  const nextFront: CourierShellFrontState = {
    ...front,
    status: nextStatus,
    lastResolvedWeek: closedWeek,
    lastNet: net,
    exposureBand,
    collapseReason: collapse ? 'overstretched' : undefined,
  }

  return {
    fundingDelta: net,
    nextFront,
    applyCollapseBudgetPressureDebt: collapse,
  }
}
