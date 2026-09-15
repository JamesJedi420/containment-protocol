/** SPE-2890 / SPE-1027 access-controlled storage class. Distinct from facilityStockpile qty. */

import type { GameState } from './models'
import { ensureNormalizedGameState } from './teamSimulation'

export const WEAPONS_LOCKER_STORAGE_CLASS_ID = 'weapons_locker' as const
export type WeaponsLockerStorageClassId = typeof WEAPONS_LOCKER_STORAGE_CLASS_ID

export const STORAGE_CLASS_IDS = [WEAPONS_LOCKER_STORAGE_CLASS_ID] as const
export type StorageClassId = (typeof STORAGE_CLASS_IDS)[number]

export const WEAPONS_LOCKER_ZONE_ID = 'weapons_locker' as const
export const MUNDANE_SUPPLIES_ZONE_ID = 'mundane_supplies' as const

export const STORAGE_ZONE_IDS = [MUNDANE_SUPPLIES_ZONE_ID, WEAPONS_LOCKER_ZONE_ID] as const
export type StorageZoneId = (typeof STORAGE_ZONE_IDS)[number]

export const WEAPONS_LOCKER_REQUIRED_CLEARANCE = 2
export const WEAPONS_LOCKER_ALLOWED_ZONE = WEAPONS_LOCKER_ZONE_ID

export type FacilityStockPlacement = Partial<Record<StorageClassId, StorageZoneId>>

export type FacilityStockAccessFailureCode = 'invalid_class' | 'clearance_denied' | 'wrong_zone'

export type FacilityStockHandleResult =
  | { ok: true; state: GameState; classId: StorageClassId; zone: StorageZoneId }
  | { ok: false; state: GameState; code: FacilityStockAccessFailureCode }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isStorageClassId(value: unknown): value is StorageClassId {
  return STORAGE_CLASS_IDS.some((classId) => classId === value)
}

export function isStorageZoneId(value: unknown): value is StorageZoneId {
  return STORAGE_ZONE_IDS.some((zoneId) => zoneId === value)
}

function isClearedStaff(value: unknown): boolean {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    Number.isSafeInteger(value) &&
    value >= WEAPONS_LOCKER_REQUIRED_CLEARANCE
  )
}

function allowedZoneForClass(classId: StorageClassId): StorageZoneId {
  switch (classId) {
    case WEAPONS_LOCKER_STORAGE_CLASS_ID:
      return WEAPONS_LOCKER_ALLOWED_ZONE
    default: {
      const exhaustive: never = classId
      return exhaustive
    }
  }
}

function snapshotFacilityStockPlacement(
  placement: FacilityStockPlacement
): FacilityStockPlacement | undefined {
  const next: FacilityStockPlacement = {}
  for (const classId of STORAGE_CLASS_IDS) {
    const zone = placement[classId]
    if (!isStorageZoneId(zone)) continue
    next[classId] = zone
  }
  return Object.keys(next).length === 0 ? undefined : Object.freeze(next)
}

/**
 * Hydrate optional `GameState.facilityStockPlacement`.
 * Omit / non-record / empty after sanitizing → undefined.
 * Unknown, integer-index, prototype-unsafe, and non-enum siblings drop independently.
 * Valid siblings insert in authored storage-class id order.
 */
export function parseFacilityStockPlacement(value: unknown): FacilityStockPlacement | undefined {
  if (value === undefined) return undefined
  if (!isRecord(value)) return undefined
  const next: FacilityStockPlacement = {}
  for (const classId of STORAGE_CLASS_IDS) {
    if (!Object.prototype.hasOwnProperty.call(value, classId)) continue
    const zone = value[classId]
    if (!isStorageZoneId(zone)) continue
    next[classId] = zone
  }
  return snapshotFacilityStockPlacement(next)
}

/**
 * Route one authored access-controlled storage class.
 * Unknown/malformed class fail-closes `invalid_class`.
 * Non-integer, unsafe, or below-floor staff clearance fail-closes `clearance_denied`.
 * Destination other than the class allowed zone fail-closes `wrong_zone`.
 * Success stamps placement; does not debit `facilityStockpile` or catalog `inventory`.
 * Fail-closed paths leave state unchanged.
 */
export function handleAccessControlledStock(
  state: GameState,
  input: unknown
): FacilityStockHandleResult {
  const classId = isRecord(input) ? input.classId : undefined
  if (!isStorageClassId(classId)) {
    return { ok: false, state, code: 'invalid_class' }
  }

  const staffClearance = isRecord(input) ? input.staffClearance : undefined
  if (!isClearedStaff(staffClearance)) {
    return { ok: false, state, code: 'clearance_denied' }
  }

  const destinationZone = isRecord(input) ? input.destinationZone : undefined
  const allowedZone = allowedZoneForClass(classId)
  if (destinationZone !== allowedZone) {
    return { ok: false, state, code: 'wrong_zone' }
  }

  const current = parseFacilityStockPlacement(state.facilityStockPlacement) ?? {}
  const next: FacilityStockPlacement = { ...current, [classId]: allowedZone }
  const facilityStockPlacement = snapshotFacilityStockPlacement(next)
  const nextState: GameState = { ...ensureNormalizedGameState(state) }
  if (facilityStockPlacement === undefined) {
    delete nextState.facilityStockPlacement
  } else {
    nextState.facilityStockPlacement = facilityStockPlacement
  }
  return { ok: true, state: nextState, classId, zone: allowedZone }
}
