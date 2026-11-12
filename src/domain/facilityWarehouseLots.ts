/** SPE-2979 / SPE-1027 authored warehouse lot identity. Distinct from facilityStockpile qty. */

import type { GameState } from './models'
import { ensureNormalizedGameState } from './teamSimulation'

export const WAREHOUSE_SAMPLE_STOCK_ID = 'warehouse_sample' as const

export const WAREHOUSE_STOCK_IDS = [WAREHOUSE_SAMPLE_STOCK_ID] as const
export type WarehouseStockId = (typeof WAREHOUSE_STOCK_IDS)[number]

export const WAREHOUSE_LOT_A = 'lot_a' as const

export const WAREHOUSE_LOT_IDS = [WAREHOUSE_LOT_A] as const
export type WarehouseLotId = (typeof WAREHOUSE_LOT_IDS)[number]

export const WAREHOUSE_LOT_IDENTITIES = ['unknown', 'present'] as const
export type WarehouseLotIdentity = (typeof WAREHOUSE_LOT_IDENTITIES)[number]

export type FacilityWarehouseLots = Partial<Record<WarehouseStockId, WarehouseLotId>>

export type FacilityWarehouseLotFailureCode = 'invalid_stock' | 'invalid_lot'

export type FacilityWarehouseLotStampResult =
  | {
      ok: true
      state: GameState
      stockId: WarehouseStockId
      lot: WarehouseLotId
    }
  | { ok: false; state: GameState; code: FacilityWarehouseLotFailureCode }

export type FacilityWarehouseLotResolveResult =
  | {
      ok: true
      state: GameState
      stockId: WarehouseStockId
      lot: WarehouseLotId
      identity: Extract<WarehouseLotIdentity, 'present'>
    }
  | {
      ok: true
      state: GameState
      stockId: WarehouseStockId
      identity: Extract<WarehouseLotIdentity, 'unknown'>
    }
  | { ok: false; state: GameState; code: FacilityWarehouseLotFailureCode }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOwnEnumerableProperty(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.propertyIsEnumerable.call(value, key)
}

export function isWarehouseStockId(value: unknown): value is WarehouseStockId {
  return WAREHOUSE_STOCK_IDS.some((stockId) => stockId === value)
}

export function isWarehouseLotId(value: unknown): value is WarehouseLotId {
  return WAREHOUSE_LOT_IDS.some((lot) => lot === value)
}

function snapshotFacilityWarehouseLots(
  lots: FacilityWarehouseLots
): FacilityWarehouseLots | undefined {
  const next: FacilityWarehouseLots = {}
  for (const stockId of WAREHOUSE_STOCK_IDS) {
    if (!hasOwnEnumerableProperty(lots as Record<string, unknown>, stockId)) continue
    const stamped = lots[stockId]
    if (!isWarehouseLotId(stamped)) continue
    next[stockId] = stamped
  }
  return Object.keys(next).length === 0 ? undefined : Object.freeze(next)
}

/**
 * Hydrate optional `GameState.facilityWarehouseLots`.
 * Omit / non-record / empty after sanitizing → undefined.
 * Unknown, integer-index, prototype-unsafe, non-enumerable, qty-shaped, and
 * invalid-lot siblings drop independently. Valid siblings insert in authored
 * stock-id order. Qty is not lot identity.
 */
export function parseFacilityWarehouseLots(value: unknown): FacilityWarehouseLots | undefined {
  if (value === undefined) return undefined
  if (!isRecord(value)) return undefined

  const next: FacilityWarehouseLots = {}
  for (const stockId of WAREHOUSE_STOCK_IDS) {
    if (!hasOwnEnumerableProperty(value, stockId)) continue
    const lot = value[stockId]
    if (!isWarehouseLotId(lot)) continue
    next[stockId] = lot
  }
  return snapshotFacilityWarehouseLots(next)
}

function readStockId(input: unknown): WarehouseStockId | undefined {
  if (!isRecord(input) || !hasOwnEnumerableProperty(input, 'stockId')) return undefined
  return isWarehouseStockId(input.stockId) ? input.stockId : undefined
}

function readLot(input: unknown): WarehouseLotId | undefined {
  if (!isRecord(input) || !hasOwnEnumerableProperty(input, 'lot')) return undefined
  return isWarehouseLotId(input.lot) ? input.lot : undefined
}

function writeFacilityWarehouseLot(
  state: GameState,
  stockId: WarehouseStockId,
  lot: WarehouseLotId
): GameState | undefined {
  const current = parseFacilityWarehouseLots(state.facilityWarehouseLots) ?? {}
  const facilityWarehouseLots = snapshotFacilityWarehouseLots({
    ...current,
    [stockId]: lot,
  })
  if (!facilityWarehouseLots) return undefined
  return {
    ...ensureNormalizedGameState(state),
    facilityWarehouseLots,
  }
}

/**
 * Stamp compact present lot identity on one authored warehouse stock.
 * Unknown or malformed stock input fail-closes `invalid_stock`. Unknown or
 * malformed lot fail-closes `invalid_lot`. Failures keep the original state
 * reference. Success does not debit `facilityStockpile` or catalog `inventory`
 * and does not treat qty as lot identity.
 */
export function stampFacilityWarehouseLot(
  state: GameState,
  input: unknown
): FacilityWarehouseLotStampResult {
  const stockId = readStockId(input)
  if (!stockId) {
    return { ok: false, state, code: 'invalid_stock' }
  }

  const lot = readLot(input)
  if (!lot) {
    return { ok: false, state, code: 'invalid_lot' }
  }

  const nextState = writeFacilityWarehouseLot(state, stockId, lot)
  if (!nextState) {
    return { ok: false, state, code: 'invalid_stock' }
  }

  return {
    ok: true,
    state: nextState,
    stockId,
    lot,
  }
}

/**
 * Resolve authored warehouse lot identity vs omit.
 * Unknown or malformed stock input fail-closes `invalid_stock`. Unknown or
 * malformed lot fail-closes `invalid_lot`. Omit or absent lot resolves
 * `identity: 'unknown'` (not a default lot and not derived from qty).
 * Matching present lot resolves `identity: 'present'`. Read-only: returns the
 * same state reference and does not stamp.
 */
export function resolveFacilityWarehouseLot(
  state: GameState,
  input: unknown
): FacilityWarehouseLotResolveResult {
  const stockId = readStockId(input)
  if (!stockId) {
    return { ok: false, state, code: 'invalid_stock' }
  }

  const lot = readLot(input)
  if (!lot) {
    return { ok: false, state, code: 'invalid_lot' }
  }

  const stamped = parseFacilityWarehouseLots(state.facilityWarehouseLots)?.[stockId]
  if (stamped === undefined) {
    return {
      ok: true,
      state,
      stockId,
      identity: 'unknown',
    }
  }

  return {
    ok: true,
    state,
    stockId,
    lot: stamped,
    identity: 'present',
  }
}
