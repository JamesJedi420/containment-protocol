/** SPE-2897 / SPE-1027 authored counterfeit protection goods. Distinct from facilityStockpile qty. */

import type { GameState } from './models'
import { ensureNormalizedGameState } from './teamSimulation'

export const RESPIRATOR_FILTER_PROTECTION_GOOD_ID = 'respirator_filter' as const

export const PROTECTION_GOOD_IDS = [RESPIRATOR_FILTER_PROTECTION_GOOD_ID] as const
export type ProtectionGoodId = (typeof PROTECTION_GOOD_IDS)[number]

export const COUNTERFEIT_PROTECTION_GOOD_STATUS = 'counterfeit' as const

export const PROTECTION_GOOD_STATUSES = [COUNTERFEIT_PROTECTION_GOOD_STATUS] as const
export type ProtectionGoodStatus = (typeof PROTECTION_GOOD_STATUSES)[number]

export type FacilityProtectionGoods = Partial<Record<ProtectionGoodId, ProtectionGoodStatus>>

export type ProtectionGoodOutcome = 'unknown' | 'failed'
export type ProtectionGoodAssurance = 'unknown' | 'false_reassurance'

export type FacilityProtectionGoodFailureCode = 'invalid_item'

export type FacilityProtectionGoodRecordResult =
  | {
      ok: true
      state: GameState
      itemId: ProtectionGoodId
      status: ProtectionGoodStatus
    }
  | { ok: false; state: GameState; code: FacilityProtectionGoodFailureCode }

export type FacilityProtectionGoodResolveResult =
  | {
      ok: true
      state: GameState
      itemId: ProtectionGoodId
      protection: 'unknown'
      assurance: 'unknown'
    }
  | {
      ok: true
      state: GameState
      itemId: ProtectionGoodId
      protection: 'failed'
      assurance: 'false_reassurance'
      status: ProtectionGoodStatus
    }
  | { ok: false; state: GameState; code: FacilityProtectionGoodFailureCode }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOwnEnumerableProperty(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.propertyIsEnumerable.call(value, key)
}

export function isProtectionGoodId(value: unknown): value is ProtectionGoodId {
  return PROTECTION_GOOD_IDS.some((itemId) => itemId === value)
}

export function isProtectionGoodStatus(value: unknown): value is ProtectionGoodStatus {
  return PROTECTION_GOOD_STATUSES.some((status) => status === value)
}

function snapshotFacilityProtectionGoods(
  protectionGoods: FacilityProtectionGoods
): FacilityProtectionGoods | undefined {
  const next: FacilityProtectionGoods = {}
  for (const itemId of PROTECTION_GOOD_IDS) {
    if (!hasOwnEnumerableProperty(protectionGoods, itemId)) continue
    const status = protectionGoods[itemId]
    if (!isProtectionGoodStatus(status)) continue
    next[itemId] = status
  }
  return Object.keys(next).length === 0 ? undefined : Object.freeze(next)
}

/**
 * Hydrate optional `GameState.facilityProtectionGoods`.
 * Omit / non-record / empty after sanitizing -> undefined.
 * Unknown, integer-index, prototype-unsafe, non-enumerable, and malformed siblings drop
 * independently. Valid siblings insert in authored protection-good id order.
 */
export function parseFacilityProtectionGoods(value: unknown): FacilityProtectionGoods | undefined {
  if (value === undefined) return undefined
  if (!isRecord(value)) return undefined

  const next: FacilityProtectionGoods = {}
  for (const itemId of PROTECTION_GOOD_IDS) {
    if (!hasOwnEnumerableProperty(value, itemId)) continue
    const status = value[itemId]
    if (!isProtectionGoodStatus(status)) continue
    next[itemId] = status
  }
  return snapshotFacilityProtectionGoods(next)
}

function readProtectionGoodId(input: unknown): ProtectionGoodId | undefined {
  if (!isRecord(input) || !hasOwnEnumerableProperty(input, 'itemId')) return undefined
  return isProtectionGoodId(input.itemId) ? input.itemId : undefined
}

/**
 * Record one counterfeit authored protection good.
 * Unknown or malformed item input fail-closes `invalid_item` and leaves state unchanged.
 * Success stamps `counterfeit` without debiting `facilityStockpile` or catalog `inventory`.
 */
export function recordCounterfeitProtectionGood(
  state: GameState,
  input: unknown
): FacilityProtectionGoodRecordResult {
  const itemId = readProtectionGoodId(input)
  if (!itemId) {
    return { ok: false, state, code: 'invalid_item' }
  }

  const current = parseFacilityProtectionGoods(state.facilityProtectionGoods) ?? {}
  const facilityProtectionGoods = snapshotFacilityProtectionGoods({
    ...current,
    [itemId]: COUNTERFEIT_PROTECTION_GOOD_STATUS,
  })
  if (!facilityProtectionGoods) {
    return { ok: false, state, code: 'invalid_item' }
  }

  const nextState: GameState = {
    ...ensureNormalizedGameState(state),
    facilityProtectionGoods,
  }
  return {
    ok: true,
    state: nextState,
    itemId,
    status: COUNTERFEIT_PROTECTION_GOOD_STATUS,
  }
}

/**
 * Resolve the direct safety outcome and assurance signal for one authored protection good.
 * Unknown or malformed item input fail-closes `invalid_item`; omit or absent resolves unknown.
 * Read-only: returns the same state reference and does not debit stock or stamp an outcome.
 */
export function resolveFacilityProtectionGoodOutcome(
  state: GameState,
  input: unknown
): FacilityProtectionGoodResolveResult {
  const itemId = readProtectionGoodId(input)
  if (!itemId) {
    return { ok: false, state, code: 'invalid_item' }
  }

  const protectionGoods = parseFacilityProtectionGoods(state.facilityProtectionGoods)
  const status = protectionGoods?.[itemId]
  if (status === undefined) {
    return {
      ok: true,
      state,
      itemId,
      protection: 'unknown',
      assurance: 'unknown',
    }
  }

  return {
    ok: true,
    state,
    itemId,
    status,
    protection: 'failed',
    assurance: 'false_reassurance',
  }
}
