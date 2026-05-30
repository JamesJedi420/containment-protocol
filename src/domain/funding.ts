// Funding, Procurement, & Budget Pressure System Logic
// Deterministic, explicit, and testable

import {
  inventoryItemLabels,
  productionCatalog,
  productionMaterialCatalog,
} from '../data/production'
import { getEquipmentCatalogEntries } from './equipment'
import type {
  CourierShellFrontState,
  GameState,
  FundingState,
  FundingCategory,
  FundingHistoryRecord,
  LegitimacyState,
  ProcurementBacklogEntry,
  SupportStaffSummary,
} from './models'
import { FUNDING_CALIBRATION } from './sim/calibration'

const PROCUREMENT_SOURCE_REASONS = new Set<string>(['market_transaction'])

let knownProcurementItemIdsCache: Set<string> | undefined

export function getKnownProcurementItemIds(): Set<string> {
  if (!knownProcurementItemIdsCache) {
    knownProcurementItemIdsCache = new Set([
      ...Object.keys(inventoryItemLabels),
      ...productionMaterialCatalog.map((material) => material.materialId),
      ...productionCatalog.map((recipe) => recipe.outputItemId),
      ...getEquipmentCatalogEntries().map((definition) => definition.id),
    ])
  }

  return knownProcurementItemIdsCache
}

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

function clampCampaignWeek(value: number | undefined, campaignWeek: number, fallback: number) {
  const cappedWeek = Math.max(1, Math.trunc(campaignWeek))
  return Math.min(cappedWeek, sanitizeInteger(value, fallback, 1))
}

const COURIER_SHELL_STATUSES = ['active', 'strained', 'collapsed'] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * SPE-449–450: sanitize courier shell front snapshots (status, exposure, temporal weeks, collapse reason).
 */
export function sanitizeCourierShellFrontState(
  value: unknown,
  campaignWeek: number
): CourierShellFrontState | undefined {
  if (!isRecord(value) || value.type !== 'courierShell') {
    return undefined
  }

  const cappedWeek = Math.max(1, Math.trunc(campaignWeek))
  const startedWeek = clampCampaignWeek(value.startedWeek as number | undefined, cappedWeek, 1)
  const rawLastResolved =
    typeof value.lastResolvedWeek === 'number' && Number.isFinite(value.lastResolvedWeek)
      ? Math.trunc(value.lastResolvedWeek)
      : undefined
  const lastResolvedWeek =
    typeof rawLastResolved === 'number'
      ? Math.min(cappedWeek, Math.max(startedWeek, rawLastResolved))
      : undefined

  const status = COURIER_SHELL_STATUSES.includes(
    value.status as (typeof COURIER_SHELL_STATUSES)[number]
  )
    ? (value.status as CourierShellFrontState['status'])
    : 'active'

  const exposureBand: CourierShellFrontState['exposureBand'] =
    status === 'active' ? 'low' : 'elevated'

  const startupCostPaid = sanitizeInteger(value.startupCostPaid as number | undefined, 0, 0)
  const lastNet =
    typeof value.lastNet === 'number' && Number.isFinite(value.lastNet)
      ? Math.trunc(value.lastNet)
      : undefined

  const collapseReason =
    status === 'collapsed' && value.collapseReason === 'overstretched'
      ? 'overstretched'
      : undefined

  return {
    type: 'courierShell',
    status,
    startedWeek,
    startupCostPaid,
    exposureBand,
    ...(typeof lastResolvedWeek === 'number' ? { lastResolvedWeek } : {}),
    ...(typeof lastNet === 'number' ? { lastNet } : {}),
    ...(collapseReason ? { collapseReason } : {}),
  }
}

/** SPE-452: clamp maintenance specialist pool to a non-negative bounded weekly capacity. */
export function sanitizeMaintenanceSpecialistsAvailable(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined
  }

  return Math.min(99, Math.max(0, Math.trunc(value)))
}

function sanitizeCourierShellBudgetPressureDebt(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined
  }

  const debt = Math.max(0, Math.trunc(value))
  const cap = FUNDING_CALIBRATION.budgetPressure.maxPressure

  return Math.min(cap, debt)
}

function isFundingHistorySourceIdValid(
  reason: string,
  sourceId: string | undefined,
  procurementRequestIds: Set<string>
) {
  if (!sourceId) {
    return !PROCUREMENT_SOURCE_REASONS.has(reason)
  }

  if (PROCUREMENT_SOURCE_REASONS.has(reason)) {
    return procurementRequestIds.has(sourceId)
  }

  return sourceId.trim().length > 0
}

function sanitizeFundingHistory(
  value: FundingState['fundingHistory'] | undefined,
  campaignWeek: number,
  procurementRequestIds: Set<string>
): FundingState['fundingHistory'] {
  if (!Array.isArray(value)) {
    return []
  }

  const cappedWeek = Math.max(1, Math.trunc(campaignWeek))

  return value
    .filter(
      (entry): entry is FundingHistoryRecord =>
        typeof entry?.week === 'number' &&
        Number.isFinite(entry.week) &&
        typeof entry.delta === 'number' &&
        Number.isFinite(entry.delta) &&
        typeof entry.reason === 'string' &&
        entry.reason.trim().length > 0
    )
    .map((entry) => {
      const week = clampCampaignWeek(entry.week, cappedWeek, cappedWeek)
      const reason = entry.reason.trim() as FundingCategory
      const sourceId =
        typeof entry.sourceId === 'string' && entry.sourceId.trim().length > 0
          ? entry.sourceId.trim()
          : undefined

      if (!isFundingHistorySourceIdValid(reason, sourceId, procurementRequestIds)) {
        return null
      }

      return {
        week,
        delta: Number(entry.delta.toFixed(2)),
        reason,
        ...(sourceId ? { sourceId } : {}),
      }
    })
    .filter((entry): entry is FundingHistoryRecord => entry !== null)
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

function sanitizeProcurementBacklogEntry(
  entry: ProcurementBacklogEntry,
  campaignWeek: number,
  knownItemIds: Set<string>
): ProcurementBacklogEntry | null {
  const cappedWeek = Math.max(1, Math.trunc(campaignWeek))
  if (typeof entry.quantity !== 'number' || !Number.isFinite(entry.quantity) || entry.quantity < 1) {
    return null
  }

  const quantity = Math.max(1, Math.trunc(entry.quantity))

  const requestedWeek = clampCampaignWeek(entry.requestedWeek, cappedWeek, 1)
  let status = entry.status
  let fulfilledWeek =
    typeof entry.fulfilledWeek === 'number' && Number.isFinite(entry.fulfilledWeek)
      ? clampCampaignWeek(entry.fulfilledWeek, cappedWeek, requestedWeek)
      : undefined
  let blockedReason =
    typeof entry.blockedReason === 'string' && entry.blockedReason.trim().length > 0
      ? entry.blockedReason.trim()
      : undefined

  const itemKnown = knownItemIds.has(entry.itemId)

  if (!itemKnown) {
    if (status === 'pending') {
      status = 'cancelled'
      fulfilledWeek = requestedWeek
      blockedReason = blockedReason ?? 'unknown_item'
    }
  }

  if (status === 'pending') {
    fulfilledWeek = undefined
    blockedReason = undefined
  } else {
    if (fulfilledWeek === undefined || fulfilledWeek < requestedWeek) {
      fulfilledWeek = requestedWeek
    }
  }

  return {
    requestId: entry.requestId,
    itemId: entry.itemId,
    quantity,
    requestedWeek,
    cost: sanitizeInteger(entry.cost, 0, 0),
    status,
    ...(fulfilledWeek !== undefined ? { fulfilledWeek } : {}),
    ...(blockedReason ? { blockedReason } : {}),
  }
}

function sanitizeProcurementBacklog(
  value: FundingState['procurementBacklog'] | undefined,
  campaignWeek: number,
  knownItemIds: Set<string>
): FundingState['procurementBacklog'] {
  if (!Array.isArray(value)) {
    return []
  }

  const sanitized = value
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
    .map((entry) => sanitizeProcurementBacklogEntry(entry, campaignWeek, knownItemIds))
    .filter((entry): entry is ProcurementBacklogEntry => entry !== null)
    .sort((left, right) => {
      if (left.requestedWeek !== right.requestedWeek) {
        return left.requestedWeek - right.requestedWeek
      }

      return left.requestId.localeCompare(right.requestId)
    })

  /** SPE-458: duplicate request ids keep the earliest requestedWeek entry. */
  const dedupedByRequestId = new Map<string, ProcurementBacklogEntry>()

  for (const entry of sanitized) {
    if (!dedupedByRequestId.has(entry.requestId)) {
      dedupedByRequestId.set(entry.requestId, entry)
    }
  }

  return [...dedupedByRequestId.values()].sort((left, right) => {
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
  const shellDebt = sanitizeCourierShellBudgetPressureDebt(state.courierShellBudgetPressureDebt) ?? 0
  return {
    ...state,
    budgetPressure: Math.min(
      FUNDING_CALIBRATION.budgetPressure.maxPressure,
      pressure + shellDebt
    ),
  }
}

export function normalizeFundingState(
  funding: number,
  config: FundingConfig,
  existing?: FundingState,
  currentWeek?: number
): FundingState {
  const campaignWeek =
    typeof currentWeek === 'number' && Number.isFinite(currentWeek)
      ? Math.max(1, Math.trunc(currentWeek))
      : 1
  const baseline = existing ?? createInitialFundingState(
    config.fundingBasePerWeek,
    config.fundingPerResolution,
    config.fundingPenaltyPerFail,
    config.fundingPenaltyPerUnresolved,
    funding
  )
  const knownItemIds = getKnownProcurementItemIds()
  const procurementBacklog = sanitizeProcurementBacklog(
    existing?.procurementBacklog,
    campaignWeek,
    knownItemIds
  )
  const procurementRequestIds = new Set(procurementBacklog.map((entry) => entry.requestId))

  const normalized = recomputeBudgetPressure(
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
      fundingHistory: sanitizeFundingHistory(
        existing?.fundingHistory,
        campaignWeek,
        procurementRequestIds
      ),
      procurementBacklog,
      courierShellBudgetPressureDebt: sanitizeCourierShellBudgetPressureDebt(
        existing?.courierShellBudgetPressureDebt
      ),
    },
    campaignWeek
  )

  return {
    ...normalized,
    budgetPressure: Number.isFinite(normalized.budgetPressure)
      ? normalized.budgetPressure
      : 0,
  }
}

export function getCanonicalFundingState(
  game: Pick<GameState, 'agency' | 'config' | 'funding' | 'week'>,
  currentWeekOverride?: number
) {
  const week =
    typeof currentWeekOverride === 'number' && Number.isFinite(currentWeekOverride)
      ? Math.max(0, Math.trunc(currentWeekOverride))
      : game.week
  return normalizeFundingState(
    sanitizeInteger(game.funding, 0),
    game.config,
    game.agency?.fundingState,
    week
  )
}

export function assessFundingPressure(
  game: Pick<GameState, 'agency' | 'config' | 'funding' | 'supportStaff' | 'week'>
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

  // Support staff (admin/logistics) can reduce procurement throughput penalty deterministically
  let recoveryThroughputPenalty = budgetPressure >= 3 ? 2 : constrained ? 1 : 0
  const adminLogisticsRelief = (game.supportStaff?.admin ?? 0) + (game.supportStaff?.logistics ?? 0)
  if (adminLogisticsRelief >= 10) {
    recoveryThroughputPenalty = Math.max(0, recoveryThroughputPenalty - 2)
  } else if (adminLogisticsRelief >= 5) {
    recoveryThroughputPenalty = Math.max(0, recoveryThroughputPenalty - 1)
  }

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

const LEGITIMACY_SANCTION_LEVELS = [
  'sanctioned',
  'covert',
  'tolerated',
  'unsanctioned',
] as const satisfies readonly LegitimacyState['sanctionLevel'][]

const LEGITIMACY_FALLOUT_RISKS = ['none', 'risk', 'costly'] as const satisfies readonly NonNullable<
  LegitimacyState['falloutRisk']
>[]

const MAX_LEGITIMACY_ACCESS_REASON_LENGTH = 240
const MAX_SUPPORT_STAFF_ROLE_COUNT = 99
const MAX_SUPPORT_STAFF_PRESSURE = 100
const MAX_EMERGENCY_WAIVER_PRECEDENT_COUNT = 50000

function clampSupportStaffRoleCount(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0
  }

  return Math.min(MAX_SUPPORT_STAFF_ROLE_COUNT, Math.max(0, Math.trunc(value)))
}

/**
 * Hydration problem 470: bounded legitimacy/access enums and optional accessReason text.
 */
export function sanitizeLegitimacyState(raw: unknown): LegitimacyState | undefined {
  if (!isRecord(raw)) {
    return undefined
  }

  const sanctionLevel = LEGITIMACY_SANCTION_LEVELS.includes(
    raw.sanctionLevel as LegitimacyState['sanctionLevel']
  )
    ? (raw.sanctionLevel as LegitimacyState['sanctionLevel'])
    : undefined

  if (!sanctionLevel) {
    return undefined
  }

  const falloutRisk = LEGITIMACY_FALLOUT_RISKS.includes(
    raw.falloutRisk as NonNullable<LegitimacyState['falloutRisk']>
  )
    ? (raw.falloutRisk as LegitimacyState['falloutRisk'])
    : undefined

  const accessReason =
    typeof raw.accessReason === 'string' && raw.accessReason.trim().length > 0
      ? raw.accessReason.trim().slice(0, MAX_LEGITIMACY_ACCESS_REASON_LENGTH)
      : undefined

  return {
    sanctionLevel,
    ...(falloutRisk ? { falloutRisk } : {}),
    ...(accessReason ? { accessReason } : {}),
  }
}

/**
 * Hydration problem 471: waiver grant week must match campaign week; precedent count is finite-capped.
 */
export function sanitizeEmergencyGrayMarketWaiverWeek(
  raw: unknown,
  campaignWeek: number
): number | undefined {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return undefined
  }

  const cappedWeek = Math.max(1, Math.trunc(campaignWeek))
  const waiverWeek = Math.trunc(raw)

  if (waiverWeek < 1 || waiverWeek > cappedWeek || waiverWeek !== cappedWeek) {
    return undefined
  }

  return waiverWeek
}

export function sanitizeEmergencyGrayMarketWaiverPrecedentCount(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return 0
  }

  return Math.min(MAX_EMERGENCY_WAIVER_PRECEDENT_COUNT, Math.max(0, Math.trunc(raw)))
}

/**
 * Hydration problem 477: role counts are bounded; total and pressure are validated or recomputed.
 */
export function sanitizeSupportStaffSummary(raw: unknown): SupportStaffSummary | undefined {
  if (!isRecord(raw)) {
    return undefined
  }

  const admin = clampSupportStaffRoleCount(raw.admin)
  const logistics = clampSupportStaffRoleCount(raw.logistics)
  const medical = clampSupportStaffRoleCount(raw.medical)
  const intel = clampSupportStaffRoleCount(raw.intel)
  const roleTotal = admin + logistics + medical + intel

  if (roleTotal === 0) {
    return undefined
  }

  const persistedTotal =
    typeof raw.total === 'number' && Number.isFinite(raw.total)
      ? Math.max(0, Math.trunc(raw.total))
      : undefined
  const total = persistedTotal === roleTotal ? persistedTotal : roleTotal

  const pressure =
    typeof raw.pressure === 'number' && Number.isFinite(raw.pressure)
      ? Math.min(MAX_SUPPORT_STAFF_PRESSURE, Math.max(0, Math.trunc(raw.pressure)))
      : 0

  return { admin, logistics, medical, intel, total, pressure }
}
