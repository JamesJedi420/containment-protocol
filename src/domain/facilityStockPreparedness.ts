/** SPE-2896 / SPE-1027 authored stockout preparedness. Distinct from facilityStockpile qty. */

import type { GameState } from './models'
import { ensureNormalizedGameState } from './teamSimulation'

export const FACILITY_SALT_STOCK_ID = 'facility_salt' as const

export const PREPAREDNESS_STOCK_IDS = [FACILITY_SALT_STOCK_ID] as const
export type PreparednessStockId = (typeof PREPAREDNESS_STOCK_IDS)[number]

export type FacilityStockPreparednessSnapshot = Readonly<{
  quantity: number
  reserve: number
  recentOutflow: number
}>

export type FacilityStockPreparedness = Partial<
  Record<PreparednessStockId, FacilityStockPreparednessSnapshot>
>

export type FacilityStockoutPressure = 'unknown' | 'stockout' | 'prepared'

export type FacilityStockPreparednessStampFailureCode = 'invalid_stock' | 'invalid_snapshot'

export type FacilityStockPreparednessStampResult =
  | {
      ok: true
      state: GameState
      stockId: PreparednessStockId
      snapshot: FacilityStockPreparednessSnapshot
    }
  | { ok: false; state: GameState; code: FacilityStockPreparednessStampFailureCode }

export type FacilityStockoutPressureResolveResult =
  | {
      ok: true
      state: GameState
      stockId: PreparednessStockId
      pressure: 'unknown'
    }
  | {
      ok: true
      state: GameState
      stockId: PreparednessStockId
      pressure: Exclude<FacilityStockoutPressure, 'unknown'>
      snapshot: FacilityStockPreparednessSnapshot
    }
  | { ok: false; state: GameState; code: 'invalid_stock' }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOwnEnumerableProperty(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.propertyIsEnumerable.call(value, key)
}

export function isPreparednessStockId(value: unknown): value is PreparednessStockId {
  return PREPAREDNESS_STOCK_IDS.some((stockId) => stockId === value)
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    Number.isSafeInteger(value) &&
    value >= 0
  )
}

function parsePreparednessSnapshot(value: unknown): FacilityStockPreparednessSnapshot | undefined {
  if (!isRecord(value)) return undefined
  if (
    !hasOwnEnumerableProperty(value, 'quantity') ||
    !hasOwnEnumerableProperty(value, 'reserve') ||
    !hasOwnEnumerableProperty(value, 'recentOutflow')
  ) {
    return undefined
  }

  const { quantity, reserve, recentOutflow } = value
  if (
    !isNonNegativeSafeInteger(quantity) ||
    !isNonNegativeSafeInteger(reserve) ||
    !isNonNegativeSafeInteger(recentOutflow)
  ) {
    return undefined
  }

  return Object.freeze({ quantity, reserve, recentOutflow })
}

function snapshotFacilityStockPreparedness(
  preparedness: FacilityStockPreparedness
): FacilityStockPreparedness | undefined {
  const next: FacilityStockPreparedness = {}
  for (const stockId of PREPAREDNESS_STOCK_IDS) {
    const snapshot = parsePreparednessSnapshot(preparedness[stockId])
    if (!snapshot) continue
    next[stockId] = snapshot
  }
  return Object.keys(next).length === 0 ? undefined : Object.freeze(next)
}

/**
 * Hydrate optional `GameState.facilityStockPreparedness`.
 * Omit / non-record / empty after sanitizing → undefined.
 * Unknown, integer-index, prototype-unsafe, non-enumerable, and malformed siblings drop
 * independently. Valid siblings insert in authored preparedness-stock id order.
 */
export function parseFacilityStockPreparedness(
  value: unknown
): FacilityStockPreparedness | undefined {
  if (value === undefined) return undefined
  if (!isRecord(value)) return undefined
  const next: FacilityStockPreparedness = {}
  for (const stockId of PREPAREDNESS_STOCK_IDS) {
    if (!hasOwnEnumerableProperty(value, stockId)) continue
    const snapshot = parsePreparednessSnapshot(value[stockId])
    if (!snapshot) continue
    next[stockId] = snapshot
  }
  return snapshotFacilityStockPreparedness(next)
}

function pressureForSnapshot(
  snapshot: FacilityStockPreparednessSnapshot
): Exclude<FacilityStockoutPressure, 'unknown'> {
  return snapshot.quantity < snapshot.reserve || snapshot.quantity <= snapshot.recentOutflow
    ? 'stockout'
    : 'prepared'
}

/**
 * Stamp one caller-owned quantity/reserve/outflow snapshot for an authored facility stock.
 * Unknown/malformed stock fail-closes `invalid_stock`; malformed numeric snapshots fail-close
 * `invalid_snapshot`. Success does not debit `facilityStockpile` or catalog `inventory`.
 */
export function stampFacilityStockPreparedness(
  state: GameState,
  input: unknown
): FacilityStockPreparednessStampResult {
  const record = isRecord(input) ? input : undefined
  const stockId = record && hasOwnEnumerableProperty(record, 'stockId') ? record.stockId : undefined
  if (!isPreparednessStockId(stockId)) {
    return { ok: false, state, code: 'invalid_stock' }
  }

  const snapshot = parsePreparednessSnapshot(record)
  if (!snapshot) {
    return { ok: false, state, code: 'invalid_snapshot' }
  }

  const current = parseFacilityStockPreparedness(state.facilityStockPreparedness) ?? {}
  const facilityStockPreparedness = snapshotFacilityStockPreparedness({
    ...current,
    [stockId]: snapshot,
  })
  const stampedSnapshot = facilityStockPreparedness?.[stockId]
  if (!facilityStockPreparedness || !stampedSnapshot) {
    return { ok: false, state, code: 'invalid_snapshot' }
  }

  const nextState: GameState = {
    ...ensureNormalizedGameState(state),
    facilityStockPreparedness,
  }
  return { ok: true, state: nextState, stockId, snapshot: stampedSnapshot }
}

/**
 * Resolve stockout pressure from a persisted preparedness snapshot.
 * Unknown/malformed stock fail-closes `invalid_stock`; omit or absent resolves `unknown`.
 * Read-only: returns the same state reference and does not stamp pressure or debit stock.
 */
export function resolveFacilityStockoutPressure(
  state: GameState,
  input: unknown
): FacilityStockoutPressureResolveResult {
  const record = isRecord(input) ? input : undefined
  const stockId = record && hasOwnEnumerableProperty(record, 'stockId') ? record.stockId : undefined
  if (!isPreparednessStockId(stockId)) {
    return { ok: false, state, code: 'invalid_stock' }
  }

  const preparedness = parseFacilityStockPreparedness(state.facilityStockPreparedness)
  const snapshot = preparedness?.[stockId]
  if (!snapshot) {
    return { ok: true, state, stockId, pressure: 'unknown' }
  }

  return {
    ok: true,
    state,
    stockId,
    pressure: pressureForSnapshot(snapshot),
    snapshot,
  }
}
