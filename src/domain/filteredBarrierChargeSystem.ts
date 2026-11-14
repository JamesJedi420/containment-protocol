/**
 * SPE-2194 slice 1: filtered barrier charge system registry.
 *
 * Pure deterministic registry representing containment barrier channel filters,
 * charge budgets, upkeep, and refresh cycles. Bounded to filtered barriers and
 * their charge accounting. Does not duplicate parent barrier or containment systems.
 * Does not invent specific charge quantities, upkeep rates, or balancing values.
 */

// ---------------------------------------------------------------------------
// Identifiers and unions
// ---------------------------------------------------------------------------

export type FilteredBarrierChargeId = string

export type ChannelFilterKind = 'spectral' | 'dimensional' | 'memetic' | 'physical' | 'composite'

export const CHANNEL_FILTER_KINDS: readonly ChannelFilterKind[] = [
  'spectral',
  'dimensional',
  'memetic',
  'physical',
  'composite',
] as const

export type RefreshCycleKind = 'daily' | 'per_round' | 'event_triggered' | 'manual'

export const REFRESH_CYCLE_KINDS: readonly RefreshCycleKind[] = [
  'daily',
  'per_round',
  'event_triggered',
  'manual',
] as const

export type BlockCategory = 'entity_passage' | 'information_leak' | 'energy_transfer' | 'influence_projection' | 'other'

export const BLOCK_CATEGORIES: readonly BlockCategory[] = [
  'entity_passage',
  'information_leak',
  'energy_transfer',
  'influence_projection',
  'other',
] as const

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface FilteredBarrierChargeRecord {
  readonly id: FilteredBarrierChargeId
  readonly label: string
  /** Opaque barrier or channel reference owned by parent barrier system. */
  readonly barrierRef: string
  readonly channelFilter: ChannelFilterKind
  /** Remaining charge units for the current cycle (non-negative integer). */
  readonly chargeRemaining: number
  /** Documented daily charge budget (separate from remaining and upkeep). */
  readonly dailyChargeBudget: number
  /** Documented per-round upkeep cost (separate from budget and remaining). */
  readonly perRoundUpkeep: number
  readonly refreshCycle: RefreshCycleKind
  readonly blockCategories: readonly BlockCategory[]
  readonly summary?: string
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type FilteredBarrierChargeValidationCode =
  | 'missing_id'
  | 'missing_label'
  | 'missing_barrier_ref'
  | 'invalid_channel_filter'
  | 'invalid_charge_remaining'
  | 'invalid_daily_charge_budget'
  | 'invalid_per_round_upkeep'
  | 'invalid_refresh_cycle'
  | 'empty_block_categories'
  | 'invalid_block_category'
  | 'duplicate_block_category'
  | 'franchise_token_in_id'
  | 'franchise_token_in_label'

export interface FilteredBarrierChargeValidationIssue {
  readonly code: FilteredBarrierChargeValidationCode
  readonly detail: string
  readonly severity: 'error' | 'warning'
  readonly relatedIds?: readonly string[]
}

export interface FilteredBarrierChargeValidationResult {
  readonly valid: boolean
  readonly issues: readonly FilteredBarrierChargeValidationIssue[]
}

// ---------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------

export interface FilteredBarrierChargeProjection {
  readonly recordId: FilteredBarrierChargeId
  readonly barrierRef: string
  readonly channelFilter: ChannelFilterKind
  readonly chargeRemaining: number
  readonly dailyChargeBudget: number
  readonly perRoundUpkeep: number
  readonly refreshCycle: RefreshCycleKind
  readonly blockCategories: readonly BlockCategory[]
  readonly hasRemainingCharge: boolean
  readonly budgetExceeded: boolean
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const CHANNEL_FILTER_SET = new Set<string>(CHANNEL_FILTER_KINDS)
const REFRESH_CYCLE_SET = new Set<string>(REFRESH_CYCLE_KINDS)
const BLOCK_CATEGORY_SET = new Set<string>(BLOCK_CATEGORIES)

export const FRANCHISE_TOKEN_PATTERN =
  /(?:\b(?:scp|mtf|mobile task force|foundation|goc|gru|uiu|chaos insurgency|group of interest|broken masquerade|masquerade breach)\b|goi-)/i

const MAX_CHARGE_UNITS = 100_000 as const

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeToken(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function pushIssue(
  issues: FilteredBarrierChargeValidationIssue[],
  issue: FilteredBarrierChargeValidationIssue
): void {
  issues.push(issue)
}

function containsFranchiseToken(value: string): boolean {
  const token = normalizeToken(value)
  return token.length > 0 && FRANCHISE_TOKEN_PATTERN.test(token)
}

function isSafeNonNegativeInt(value: unknown, max: number = MAX_CHARGE_UNITS): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= max
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validateFilteredBarrierChargeRecord(
  record: FilteredBarrierChargeRecord
): FilteredBarrierChargeValidationResult {
  const issues: FilteredBarrierChargeValidationIssue[] = []
  const id = normalizeToken(record.id)
  const label = normalizeToken(record.label)
  const barrierRef = normalizeToken(record.barrierRef)

  if (id.length === 0) {
    pushIssue(issues, {
      code: 'missing_id',
      detail: 'Filtered barrier charge record requires a nonempty id.',
      severity: 'error',
    })
  } else if (containsFranchiseToken(id)) {
    pushIssue(issues, {
      code: 'franchise_token_in_id',
      detail: `Filtered barrier charge record ${id} id contains a franchise token.`,
      severity: 'error',
      relatedIds: [id],
    })
  }

  if (label.length === 0) {
    pushIssue(issues, {
      code: 'missing_label',
      detail: `Filtered barrier charge record ${id || '(unknown)'} requires a nonempty label.`,
      severity: 'error',
      relatedIds: id ? [id] : undefined,
    })
  } else if (containsFranchiseToken(label)) {
    pushIssue(issues, {
      code: 'franchise_token_in_label',
      detail: `Filtered barrier charge record ${id || '(unknown)'} label contains a franchise token.`,
      severity: 'error',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (barrierRef.length === 0) {
    pushIssue(issues, {
      code: 'missing_barrier_ref',
      detail: `Filtered barrier charge record ${id || '(unknown)'} requires a nonempty barrierRef.`,
      severity: 'error',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!CHANNEL_FILTER_SET.has(record.channelFilter)) {
    pushIssue(issues, {
      code: 'invalid_channel_filter',
      detail: `Filtered barrier charge record ${id || '(unknown)'} has invalid channelFilter.`,
      severity: 'error',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isSafeNonNegativeInt(record.chargeRemaining)) {
    pushIssue(issues, {
      code: 'invalid_charge_remaining',
      detail: `Filtered barrier charge record ${id || '(unknown)'} chargeRemaining must be a safe non-negative integer ≤ ${MAX_CHARGE_UNITS}.`,
      severity: 'error',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isSafeNonNegativeInt(record.dailyChargeBudget)) {
    pushIssue(issues, {
      code: 'invalid_daily_charge_budget',
      detail: `Filtered barrier charge record ${id || '(unknown)'} dailyChargeBudget must be a safe non-negative integer ≤ ${MAX_CHARGE_UNITS}.`,
      severity: 'error',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isSafeNonNegativeInt(record.perRoundUpkeep)) {
    pushIssue(issues, {
      code: 'invalid_per_round_upkeep',
      detail: `Filtered barrier charge record ${id || '(unknown)'} perRoundUpkeep must be a safe non-negative integer ≤ ${MAX_CHARGE_UNITS}.`,
      severity: 'error',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!REFRESH_CYCLE_SET.has(record.refreshCycle)) {
    pushIssue(issues, {
      code: 'invalid_refresh_cycle',
      detail: `Filtered barrier charge record ${id || '(unknown)'} has invalid refreshCycle.`,
      severity: 'error',
      relatedIds: id ? [id] : undefined,
    })
  }

  const categories = Array.isArray(record.blockCategories) ? record.blockCategories : []
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  let invalidCount = 0

  for (const cat of categories) {
    const token = normalizeToken(cat)
    if (!BLOCK_CATEGORY_SET.has(token)) {
      invalidCount += 1
      continue
    }
    if (seen.has(token)) {
      duplicates.add(token)
    } else {
      seen.add(token)
    }
  }

  if (invalidCount > 0) {
    pushIssue(issues, {
      code: 'invalid_block_category',
      detail: `Filtered barrier charge record ${id || '(unknown)'} has ${invalidCount} invalid block category(ies).`,
      severity: 'error',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (duplicates.size > 0) {
    pushIssue(issues, {
      code: 'duplicate_block_category',
      detail: `Filtered barrier charge record ${id || '(unknown)'} has duplicate block categories: ${[...duplicates].join(', ')}.`,
      severity: 'error',
      relatedIds: id ? [id, ...duplicates] : [...duplicates],
    })
  }

  if (seen.size === 0) {
    pushIssue(issues, {
      code: 'empty_block_categories',
      detail: `Filtered barrier charge record ${id || '(unknown)'} requires at least one valid block category.`,
      severity: 'error',
      relatedIds: id ? [id] : undefined,
    })
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}

// ---------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------

export function projectFilteredBarrierCharge(
  record: FilteredBarrierChargeRecord
): FilteredBarrierChargeProjection {
  const validation = validateFilteredBarrierChargeRecord(record)
  if (!validation.valid) {
    throw new Error(
      `Cannot project invalid filtered barrier charge record: ${validation.issues.map((i) => i.code).join(', ')}`
    )
  }

  const uniqueCategories = [...new Set(record.blockCategories)].sort()

  return {
    recordId: record.id,
    barrierRef: record.barrierRef,
    channelFilter: record.channelFilter,
    chargeRemaining: record.chargeRemaining,
    dailyChargeBudget: record.dailyChargeBudget,
    perRoundUpkeep: record.perRoundUpkeep,
    refreshCycle: record.refreshCycle,
    blockCategories: uniqueCategories as BlockCategory[],
    hasRemainingCharge: record.chargeRemaining > 0,
    budgetExceeded: record.chargeRemaining > record.dailyChargeBudget,
  }
}
