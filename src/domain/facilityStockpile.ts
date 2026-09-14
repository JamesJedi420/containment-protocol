/** SPE-2887 / SPE-1027 named-part facility stockpile. Distinct from catalog inventory. */

import type { GameState } from './models'
import { isSparePartId, SPARE_PART_IDS, type SparePartId } from './sparePartSuitability'
import { ensureNormalizedGameState } from './teamSimulation'

export type FacilityStockpile = Partial<Record<SparePartId, number>>

export type FacilityStockConsumeFailureCode = 'stock_unavailable' | 'invalid_stock_id'

export type FacilityStockConsumeResult =
  | { ok: true; state: GameState; stockId: SparePartId; remaining: number }
  | { ok: false; state: GameState; code: FacilityStockConsumeFailureCode }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPositiveStockQuantity(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    Number.isSafeInteger(value) &&
    value >= 1
  )
}

function snapshotFacilityStockpile(stockpile: FacilityStockpile): FacilityStockpile | undefined {
  const next: FacilityStockpile = {}
  for (const stockId of SPARE_PART_IDS) {
    const quantity = stockpile[stockId]
    if (!isPositiveStockQuantity(quantity)) continue
    next[stockId] = quantity
  }
  return Object.keys(next).length === 0 ? undefined : next
}

/**
 * Hydrate optional `GameState.facilityStockpile`.
 * Omit / non-record / empty after sanitizing → undefined.
 * Unknown, unsafe, integer-index, negative, non-integer, and zero keys drop independently.
 */
export function parseFacilityStockpile(value: unknown): FacilityStockpile | undefined {
  if (value === undefined) return undefined
  if (!isRecord(value)) return undefined
  const next: FacilityStockpile = {}
  for (const stockId of SPARE_PART_IDS) {
    if (!Object.prototype.hasOwnProperty.call(value, stockId)) continue
    const quantity = value[stockId]
    if (!isPositiveStockQuantity(quantity)) continue
    next[stockId] = quantity
  }
  return snapshotFacilityStockpile(next)
}

/**
 * Debit exactly one named spare-part unit from the facility stockpile.
 * Missing/zero fail-closes `stock_unavailable`. Unknown/malformed id fail-closes `invalid_stock_id`.
 * Fail-closed paths leave state unchanged. Does not touch catalog `inventory`.
 */
export function consumeFacilityStock(
  state: GameState,
  stockId: unknown
): FacilityStockConsumeResult {
  const normalized = ensureNormalizedGameState(state)
  if (!isSparePartId(stockId)) {
    return { ok: false, state: normalized, code: 'invalid_stock_id' }
  }

  const current = parseFacilityStockpile(normalized.facilityStockpile)
  const available = current?.[stockId]
  if (!isPositiveStockQuantity(available)) {
    return { ok: false, state: normalized, code: 'stock_unavailable' }
  }

  const remaining = available - 1
  const next: FacilityStockpile = { ...current }
  if (remaining < 1) {
    delete next[stockId]
  } else {
    next[stockId] = remaining
  }
  const facilityStockpile = snapshotFacilityStockpile(next)
  const nextState: GameState = { ...normalized }
  if (facilityStockpile === undefined) {
    delete nextState.facilityStockpile
  } else {
    nextState.facilityStockpile = facilityStockpile
  }
  return { ok: true, state: nextState, stockId, remaining }
}
