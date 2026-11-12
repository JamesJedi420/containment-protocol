/** SPE-2891 / SPE-1027 incorrect-storage spoilage. Distinct from facilityStockpile qty. */

import type { GameState } from './models'
import { ensureNormalizedGameState } from './teamSimulation'

export const COLD_STORAGE_REAGENT_STOCK_ID = 'cold_storage_reagent' as const
export const MUNDANE_SUPPLIES_STOCK_ID = 'mundane_supplies' as const

export const SPOILAGE_STOCK_IDS = [
  COLD_STORAGE_REAGENT_STOCK_ID,
  MUNDANE_SUPPLIES_STOCK_ID,
] as const
export type SpoilageStockId = (typeof SPOILAGE_STOCK_IDS)[number]
export type PerishableStockId = typeof COLD_STORAGE_REAGENT_STOCK_ID

export const COLD_STORAGE_ZONE_ID = 'cold_storage' as const
export const MUNDANE_SUPPLIES_SPOILAGE_ZONE_ID = 'mundane_supplies' as const

export const SPOILAGE_ZONE_IDS = [COLD_STORAGE_ZONE_ID, MUNDANE_SUPPLIES_SPOILAGE_ZONE_ID] as const
export type SpoilageZoneId = (typeof SPOILAGE_ZONE_IDS)[number]

export const SPOILAGE_CONDITIONS = ['intact', 'degraded', 'contaminated'] as const
export type SpoilageCondition = (typeof SPOILAGE_CONDITIONS)[number]

export type FacilityStockCondition = Partial<Record<SpoilageStockId, SpoilageCondition>>

export type FacilityStockSpoilageFailureCode = 'invalid_stock' | 'invalid_zone'

export type FacilityStockSpoilageResult =
  | { ok: true; state: GameState; stockId: PerishableStockId; storedZone: SpoilageZoneId }
  | { ok: false; state: GameState; code: FacilityStockSpoilageFailureCode }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isPerishableStockId(value: unknown): value is PerishableStockId {
  return value === COLD_STORAGE_REAGENT_STOCK_ID
}

export function isSpoilageZoneId(value: unknown): value is SpoilageZoneId {
  return SPOILAGE_ZONE_IDS.some((zoneId) => zoneId === value)
}

export function isSpoilageCondition(value: unknown): value is SpoilageCondition {
  return SPOILAGE_CONDITIONS.some((condition) => condition === value)
}

function snapshotFacilityStockCondition(
  condition: FacilityStockCondition
): FacilityStockCondition | undefined {
  const next: FacilityStockCondition = {}
  for (const stockId of SPOILAGE_STOCK_IDS) {
    const status = condition[stockId]
    if (!isSpoilageCondition(status)) continue
    next[stockId] = status
  }
  return Object.keys(next).length === 0 ? undefined : Object.freeze(next)
}

/**
 * Hydrate optional `GameState.facilityStockCondition`.
 * Omit / non-record / empty after sanitizing → undefined.
 * Unknown, integer-index, prototype-unsafe, and non-enum siblings drop independently.
 * Valid siblings insert in authored spoilage-stock id order.
 */
export function parseFacilityStockCondition(value: unknown): FacilityStockCondition | undefined {
  if (value === undefined) return undefined
  if (!isRecord(value)) return undefined
  const next: FacilityStockCondition = {}
  for (const stockId of SPOILAGE_STOCK_IDS) {
    if (!Object.prototype.hasOwnProperty.call(value, stockId)) continue
    const status = value[stockId]
    if (!isSpoilageCondition(status)) continue
    next[stockId] = status
  }
  return snapshotFacilityStockCondition(next)
}

function stampForStoredZone(
  current: FacilityStockCondition,
  storedZone: SpoilageZoneId
): FacilityStockCondition {
  switch (storedZone) {
    case COLD_STORAGE_ZONE_ID:
      return { ...current, [COLD_STORAGE_REAGENT_STOCK_ID]: 'intact' }
    case MUNDANE_SUPPLIES_SPOILAGE_ZONE_ID:
      return {
        ...current,
        [COLD_STORAGE_REAGENT_STOCK_ID]: 'degraded',
        [MUNDANE_SUPPLIES_STOCK_ID]: 'contaminated',
      }
    default: {
      const exhaustive: never = storedZone
      return exhaustive
    }
  }
}

/**
 * Apply incorrect-storage spoilage for one authored perishable stock type.
 * Unknown/malformed stock (including neighbor as primary) fail-closes `invalid_stock`.
 * Zone other than `cold_storage` or `mundane_supplies` fail-closes `invalid_zone`.
 * Allowed zone stamps reagent `intact` and leaves neighbor unchanged.
 * Incorrect zone stamps reagent `degraded` and neighbor `contaminated`.
 * Does not debit `facilityStockpile` or catalog `inventory`. Fail-closed paths leave state unchanged.
 */
export function applyIncorrectStorageSpoilage(
  state: GameState,
  input: unknown
): FacilityStockSpoilageResult {
  const stockId = isRecord(input) ? input.stockId : undefined
  if (!isPerishableStockId(stockId)) {
    return { ok: false, state, code: 'invalid_stock' }
  }

  const storedZone = isRecord(input) ? input.storedZone : undefined
  if (!isSpoilageZoneId(storedZone)) {
    return { ok: false, state, code: 'invalid_zone' }
  }

  const current = parseFacilityStockCondition(state.facilityStockCondition) ?? {}
  const facilityStockCondition = snapshotFacilityStockCondition(
    stampForStoredZone(current, storedZone)
  )
  const nextState: GameState = { ...ensureNormalizedGameState(state) }
  if (facilityStockCondition === undefined) {
    delete nextState.facilityStockCondition
  } else {
    nextState.facilityStockCondition = facilityStockCondition
  }
  return { ok: true, state: nextState, stockId, storedZone }
}
