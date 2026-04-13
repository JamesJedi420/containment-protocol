// Funding, Procurement, & Budget Pressure System Logic
// Deterministic, explicit, and testable

import type {
  GameState,
  FundingState,
  FundingCategory,
  FundingHistoryRecord,
  ProcurementBacklogEntry,
} from './models'
import { FUNDING_CALIBRATION } from './sim/calibration'

type FundingConfig = Pick<
  GameState['config'],
  | 'fundingBasePerWeek'
  | 'fundingPerResolution'
  | 'fundingPenaltyPerFail'
  | 'fundingPenaltyPerUnresolved'
>

export interface FundingPressureAssessment {
  funding: number
  budgetPressure: number
  pendingProcurementRequestIds: string[]
  staleProcurementRequestIds: string[]
  constrained: boolean
  severeConstraint: boolean
  deploymentTriagePenalty: number
  deploymentSetupDelayWeeks: number
  recoveryThroughputPenalty: number
  therapyTraumaReductionPenalty: number
  facilityUpgradeBlocked: boolean
  replacementPressurePenalty: number
  reasonCodes: string[]
}

function sanitizeInteger(value: number | undefined, fallback: number, min?: number) {
  const finiteValue = typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : fallback

  if (typeof min === 'number') {
    return Math.max(min, finiteValue)
  }

  return finiteValue
}

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values.filter((value) => value.length > 0))].sort((left, right) =>
    left.localeCompare(right)
  )
}

function sanitizeFundingHistory(
  value: FundingState['fundingHistory'] | undefined
): FundingState['fundingHistory'] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(
      (entry): entry is FundingHistoryRecord =>
        typeof entry?.week === 'number' &&
        Number.isFinite(entry.week) &&
        typeof entry.delta === 'number' &&
        Number.isFinite(entry.delta) &&
        typeof entry.reason === 'string'
    )
    .map((entry) => ({
      week: sanitizeInteger(entry.week, 0, 0),
      delta: Number(entry.delta.toFixed(2)),
      reason: entry.reason,
      ...(typeof entry.sourceId === 'string' && entry.sourceId.length > 0
        ? { sourceId: entry.sourceId }
        : {}),
    }))
    .sort((left, right) => {
      if (left.week !== right.week) {
        return left.week - right.week
      }

      const leftSource = left.sourceId ?? ''
      const rightSource = right.sourceId ?? ''
      if (leftSource !== rightSource) {
        return leftSource.localeCompare(rightSource)
      }

      if (left.reason !== right.reason) {
        return left.reason.localeCompare(right.reason)
      }

      return left.delta - right.delta
    })
}

function sanitizeProcurementBacklog(
  value: FundingState['procurementBacklog'] | undefined
): FundingState['procurementBacklog'] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(
      (entry): entry is ProcurementBacklogEntry =>
        typeof entry?.requestId === 'string' &&
        entry.requestId.length > 0 &&
        typeof entry.itemId === 'string' &&
        entry.itemId.length > 0 &&
        typeof entry.quantity === 'number' &&
        Number.isFinite(entry.quantity) &&
        typeof entry.requestedWeek === 'number' &&
        Number.isFinite(entry.requestedWeek) &&
        typeof entry.cost === 'number' &&
        Number.isFinite(entry.cost) &&
        (entry.status === 'pending' || entry.status === 'fulfilled' || entry.status === 'cancelled')
    )
    .map((entry) => ({
      requestId: entry.requestId,
      itemId: entry.itemId,
      quantity: sanitizeInteger(entry.quantity, 1, 0),
      requestedWeek: sanitizeInteger(entry.requestedWeek, 0, 0),
      cost: sanitizeInteger(entry.cost, 0),
      status: entry.status,
      ...(typeof entry.fulfilledWeek === 'number' && Number.isFinite(entry.fulfilledWeek)
        ? { fulfilledWeek: sanitizeInteger(entry.fulfilledWeek, 0, 0) }
        : {}),
      ...(typeof entry.blockedReason === 'string' && entry.blockedReason.length > 0
        ? { blockedReason: entry.blockedReason }
        : {}),
    }))
    .sort((left, right) => {
      if (left.requestedWeek !== right.requestedWeek) {
        return left.requestedWeek - right.requestedWeek
      }

      return left.requestId.localeCompare(right.requestId)
    })
}

// --- Funding Logic ---

export function createInitialFundingState(
  basePerWeek: number,
  perResolution: number,
  penaltyPerFail: number,
  penaltyPerUnresolved: number,
  initialFunding = 0
): FundingState {
  return {
    funding: initialFunding,
    fundingBasePerWeek: basePerWeek,
    fundingPerResolution: perResolution,
    fundingPenaltyPerFail: penaltyPerFail,
    fundingPenaltyPerUnresolved: penaltyPerUnresolved,
    budgetPressure: 0,
    fundingHistory: [],
    procurementBacklog: [],
  }
}

export function applyFundingIncome(
  state: FundingState,
  delta: number,
  reason: FundingCategory | string,
  week: number,
  sourceId?: string
): FundingState {
  const funding = state.funding + delta
  const history: FundingHistoryRecord = { week, delta, reason, sourceId }
  return {
    ...state,
    funding,
    fundingHistory: [...state.fundingHistory, history],
  }
}

export function applyFundingExpense(
  state: FundingState,
  delta: number,
  reason: FundingCategory | string,
  week: number,
  sourceId?: string
): FundingState {
  // Expenses are negative deltas
  const funding = state.funding - delta
  const history: FundingHistoryRecord = { week, delta: -delta, reason, sourceId }
  return {
    ...state,
    funding,
    fundingHistory: [...state.fundingHistory, history],
  }
}

// --- Procurement Logic ---

export function placeProcurementOrder(
  state: FundingState,
  entry: Omit<ProcurementBacklogEntry, 'status' | 'fulfilledWeek'>
): FundingState {
  // Validate affordability at placement
  if (entry.cost > state.funding) throw new Error('Insufficient funds for procurement order')
  // Deduct cost at placement (policy: deterministic)
  const updatedState = applyFundingExpense(state, entry.cost, 'market_transaction', entry.requestedWeek, entry.requestId)
  const backlogEntry: ProcurementBacklogEntry = {
    ...entry,
    status: 'pending',
  }
  return {
    ...updatedState,
    procurementBacklog: [...updatedState.procurementBacklog, backlogEntry],
  }
}

export function fulfillProcurementOrder(
  state: FundingState,
  requestId: string,
  fulfilledWeek: number
): FundingState {
  const idx = state.procurementBacklog.findIndex((e) => e.requestId === requestId)
  if (idx === -1) throw new Error('Procurement order not found')
  const entry = state.procurementBacklog[idx]
  if (entry.status !== 'pending') throw new Error('Order not pending')
  const updatedEntry: ProcurementBacklogEntry = {
    ...entry,
    status: 'fulfilled',
    fulfilledWeek,
  }
  const newBacklog = [
    ...state.procurementBacklog.slice(0, idx),
    updatedEntry,
    ...state.procurementBacklog.slice(idx + 1),
  ]
  return {
    ...state,
    procurementBacklog: newBacklog,
  }
}

export function cancelProcurementOrder(
  state: FundingState,
  requestId: string,
  cancelledWeek: number,
  blockedReason?: string
): FundingState {
  const idx = state.procurementBacklog.findIndex((e) => e.requestId === requestId)
  if (idx === -1) throw new Error('Procurement order not found')
  const entry = state.procurementBacklog[idx]
  if (entry.status !== 'pending') throw new Error('Order not pending')
  const updatedEntry: ProcurementBacklogEntry = {
    ...entry,
    status: 'cancelled',
    fulfilledWeek: cancelledWeek,
    blockedReason,
  }
  const newBacklog = [
    ...state.procurementBacklog.slice(0, idx),
    updatedEntry,
    ...state.procurementBacklog.slice(idx + 1),
  ]
  return {
    ...state,
    procurementBacklog: newBacklog,
  }
}

// --- Budget Pressure Logic ---

export function recomputeBudgetPressure(state: FundingState, currentWeek?: number): FundingState {
  let pressure = 0
  const referenceWeek =
    typeof currentWeek === 'number' && Number.isFinite(currentWeek)
      ? Math.max(0, Math.trunc(currentWeek))
      : (state.fundingHistory.at(-1)?.week ?? 0)

  if (state.funding < 0) pressure += 1
  if (
    state.procurementBacklog.filter((e) => e.status === 'pending').length >
    FUNDING_CALIBRATION.budgetPressure.pendingBacklogThreshold
  ) {
    pressure += 1
  }
  if (
    state.procurementBacklog.some(
      (e) =>
        e.status === 'pending' &&
        e.requestedWeek < referenceWeek - FUNDING_CALIBRATION.budgetPressure.staleBacklogWeeks
    )
  ) {
    pressure += 1
  }
  if (
    state.fundingHistory
      .slice(-FUNDING_CALIBRATION.budgetPressure.recentPenaltyWindow)
      .filter(
        (h) =>
          h.delta < 0 && (h.reason === 'failure_penalty' || h.reason === 'unresolved_penalty')
      ).length >= FUNDING_CALIBRATION.budgetPressure.recentPenaltyCountThreshold
  )
    pressure += 1
  return {
    ...state,
    budgetPressure: Math.min(FUNDING_CALIBRATION.budgetPressure.maxPressure, pressure),
  }
}

export function normalizeFundingState(
  funding: number,
  config: FundingConfig,
  existing?: FundingState,
  currentWeek?: number
): FundingState {
  const baseline = existing ?? createInitialFundingState(
    config.fundingBasePerWeek,
    config.fundingPerResolution,
    config.fundingPenaltyPerFail,
    config.fundingPenaltyPerUnresolved,
    funding
  )

  return recomputeBudgetPressure(
    {
      ...baseline,
      funding,
      fundingBasePerWeek: sanitizeInteger(
        config.fundingBasePerWeek,
        baseline.fundingBasePerWeek,
        0
      ),
      fundingPerResolution: sanitizeInteger(
        config.fundingPerResolution,
        baseline.fundingPerResolution,
        0
      ),
      fundingPenaltyPerFail: sanitizeInteger(
        config.fundingPenaltyPerFail,
        baseline.fundingPenaltyPerFail,
        0
      ),
      fundingPenaltyPerUnresolved: sanitizeInteger(
        config.fundingPenaltyPerUnresolved,
        baseline.fundingPenaltyPerUnresolved,
        0
      ),
      fundingHistory: sanitizeFundingHistory(existing?.fundingHistory),
      procurementBacklog: sanitizeProcurementBacklog(existing?.procurementBacklog),
    },
    currentWeek
  )
}

export function getCanonicalFundingState(
  game: Pick<GameState, 'agency' | 'config' | 'funding' | 'week'>
) {
  return normalizeFundingState(
    sanitizeInteger(game.funding, 0),
    game.config,
    game.agency?.fundingState,
    game.week
  )
}

export function assessFundingPressure(
  game: Pick<GameState, 'agency' | 'config' | 'funding' | 'week'>
): FundingPressureAssessment {
  const fundingState = getCanonicalFundingState(game)
  const pendingProcurementRequestIds = fundingState.procurementBacklog
    .filter((entry) => entry.status === 'pending')
    .map((entry) => entry.requestId)
  const staleProcurementRequestIds = fundingState.procurementBacklog
    .filter(
      (entry) =>
        entry.status === 'pending' &&
        game.week - entry.requestedWeek > FUNDING_CALIBRATION.budgetPressure.staleBacklogWeeks
    )
    .map((entry) => entry.requestId)
  const budgetPressure = fundingState.budgetPressure
  const constrained = budgetPressure >= 2 || staleProcurementRequestIds.length > 0
  const severeConstraint = budgetPressure >= 4 || staleProcurementRequestIds.length > 0
  const deploymentSetupDelayWeeks = severeConstraint ? 2 : constrained ? 1 : 0
  const recoveryThroughputPenalty = budgetPressure >= 3 ? 2 : constrained ? 1 : 0
  const therapyTraumaReductionPenalty = severeConstraint ? 1 : 0
  const replacementPressurePenalty = Math.min(
    2,
    (budgetPressure >= 2 ? 1 : 0) + (staleProcurementRequestIds.length > 0 ? 1 : 0)
  )

  return {
    funding: fundingState.funding,
    budgetPressure,
    pendingProcurementRequestIds: uniqueSorted(pendingProcurementRequestIds),
    staleProcurementRequestIds: uniqueSorted(staleProcurementRequestIds),
    constrained,
    severeConstraint,
    deploymentTriagePenalty: Math.min(
      10,
      budgetPressure * 2 + (staleProcurementRequestIds.length > 0 ? 2 : 0)
    ),
    deploymentSetupDelayWeeks,
    recoveryThroughputPenalty,
    therapyTraumaReductionPenalty,
    facilityUpgradeBlocked: severeConstraint,
    replacementPressurePenalty,
    reasonCodes: uniqueSorted([
      constrained ? `budget-pressure:${budgetPressure}` : '',
      pendingProcurementRequestIds.length > 0
        ? `pending-procurement:${pendingProcurementRequestIds.length}`
        : '',
      staleProcurementRequestIds.length > 0 ? 'stale-procurement-backlog' : '',
    ]),
  }
}

// --- Selectors ---

export function getCompactFundingSummary(state: FundingState) {
  return {
    funding: state.funding,
    budgetPressure: state.budgetPressure,
    backlog: state.procurementBacklog.filter((e) => e.status === 'pending').length,
  }
}

export function getFundingHistory(state: FundingState) {
  return state.fundingHistory
}

export function getProcurementBacklog(state: FundingState) {
  return state.procurementBacklog
}
