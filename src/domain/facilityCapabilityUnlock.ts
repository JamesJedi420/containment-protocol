/**
 * SPE-3388 — one durable facility-supported capability unlock.
 *
 * Qualification is completion of an upgrade on `facility:biohazard-response-lab`
 * to level 2 or higher. The liability stays on that record. Ready, degraded,
 * and suspended use are derived from an SPE-3386 resolution and are not stored.
 */

import type { GameState, FacilityCapabilityUnlock } from './models'
import {
  FACILITY_DEPENDENCY_AVAILABILITIES,
  FACILITY_DEPENDENCY_REJECTIONS,
  type FacilityDependencyAvailability,
  type FacilityDependencyAvailabilityResult,
  type FacilityDependencyRejection,
} from './facilityDependencyGraph'
import {
  FACILITY_DEPENDENCY_INPUT_REJECTIONS,
  type FacilityDependencyInputRejection,
  type FacilityDependencyInputResolution,
} from './facilityDependencyInputs'

/** Same production id as the biohazard workshop facility. This module does not read its mappings. */
export const FACILITY_CAPABILITY_UNLOCK_FACILITY_ID = 'facility:biohazard-response-lab' as const

export const FACILITY_CAPABILITY_UNLOCK_ID = 'capability:alert_timing' as const

export const FACILITY_CAPABILITY_UNLOCK_LIABILITY = 'dangerous_use' as const

export const FACILITY_CAPABILITY_UNLOCK_MIN_LEVEL = 2

export const FACILITY_CAPABILITY_EFFECTIVE_USES = [
  'never_unlocked',
  'ready',
  'degraded',
  'suspended',
] as const
export type FacilityCapabilityEffectiveUseKind = (typeof FACILITY_CAPABILITY_EFFECTIVE_USES)[number]

export interface FacilityCapabilityEffectiveUse {
  readonly use: FacilityCapabilityEffectiveUseKind
  readonly capabilityId: typeof FACILITY_CAPABILITY_UNLOCK_ID
  readonly unlock?: FacilityCapabilityUnlock
}

const UNLOCK_KEYS = ['capabilityId', 'liability', 'acquiredWeek'] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key)
}

function isAvailability(value: unknown): value is FacilityDependencyAvailability {
  return FACILITY_DEPENDENCY_AVAILABILITIES.some((availability) => availability === value)
}

function isKnownRejection(
  value: unknown
): value is FacilityDependencyInputRejection | FacilityDependencyRejection {
  return (
    FACILITY_DEPENDENCY_INPUT_REJECTIONS.some((rejection) => rejection === value) ||
    FACILITY_DEPENDENCY_REJECTIONS.some((rejection) => rejection === value)
  )
}

function isResolution(value: unknown): value is FacilityDependencyInputResolution {
  if (!isRecord(value) || typeof value.ok !== 'boolean') return false
  if (!value.ok) return isKnownRejection(value.rejection)
  return Array.isArray(value.results)
}

function freezeUnlock(unlock: FacilityCapabilityUnlock): FacilityCapabilityUnlock {
  return Object.freeze({
    capabilityId: FACILITY_CAPABILITY_UNLOCK_ID,
    liability: FACILITY_CAPABILITY_UNLOCK_LIABILITY,
    acquiredWeek: unlock.acquiredWeek,
  })
}

/** Drop a missing or malformed packet. Do not invent an unlock. */
export function sanitizeFacilityCapabilityUnlock(
  value: unknown
): FacilityCapabilityUnlock | undefined {
  if (!isRecord(value)) return undefined
  const keys = Object.keys(value)
  if (keys.length !== UNLOCK_KEYS.length) return undefined
  if (!UNLOCK_KEYS.every((key) => hasOwn(value, key))) return undefined
  if (value.capabilityId !== FACILITY_CAPABILITY_UNLOCK_ID) return undefined
  if (value.liability !== FACILITY_CAPABILITY_UNLOCK_LIABILITY) return undefined
  if (typeof value.acquiredWeek !== 'number' || !Number.isInteger(value.acquiredWeek)) {
    return undefined
  }
  if (value.acquiredWeek < 1) return undefined
  return freezeUnlock({
    capabilityId: FACILITY_CAPABILITY_UNLOCK_ID,
    liability: FACILITY_CAPABILITY_UNLOCK_LIABILITY,
    acquiredWeek: value.acquiredWeek,
  })
}

function isDurableUnlock(value: unknown): value is FacilityCapabilityUnlock {
  return sanitizeFacilityCapabilityUnlock(value) !== undefined
}

function neverUnlocked(): FacilityCapabilityEffectiveUse {
  return Object.freeze({
    use: 'never_unlocked',
    capabilityId: FACILITY_CAPABILITY_UNLOCK_ID,
  })
}

function withUse(
  use: Exclude<FacilityCapabilityEffectiveUseKind, 'never_unlocked'>,
  unlock: FacilityCapabilityUnlock
): FacilityCapabilityEffectiveUse {
  return Object.freeze({
    use,
    capabilityId: FACILITY_CAPABILITY_UNLOCK_ID,
    unlock,
  })
}

function effectiveUseForAvailability(
  availability: FacilityDependencyAvailability,
  unlock: FacilityCapabilityUnlock
): FacilityCapabilityEffectiveUse {
  switch (availability) {
    case 'ready':
      return withUse('ready', unlock)
    case 'degraded':
      return withUse('degraded', unlock)
    case 'unavailable':
      return withUse('suspended', unlock)
    default: {
      const unexpected: never = availability
      return unexpected
    }
  }
}

/**
 * Derive current use from a durable unlock and one SPE-3386 resolution.
 * An absent unlock stays never-unlocked. Support loss suspends use and keeps the record.
 */
export function deriveFacilityCapabilityEffectiveUse(
  unlock: FacilityCapabilityUnlock | undefined,
  resolution: FacilityDependencyInputResolution
): FacilityCapabilityEffectiveUse {
  if (!isDurableUnlock(unlock)) return neverUnlocked()
  if (!isResolution(resolution) || !resolution.ok) return withUse('suspended', unlock)

  const matches = resolution.results.filter(
    (result): result is FacilityDependencyAvailabilityResult =>
      isRecord(result) && result.nodeId === FACILITY_CAPABILITY_UNLOCK_ID
  )
  const result = matches.length === 1 ? matches[0] : undefined
  if (!result || !isAvailability(result.availability)) return withUse('suspended', unlock)
  return effectiveUseForAvailability(result.availability, unlock)
}

/**
 * Write the exemplar once when its facility upgrade has just completed at level 2 or higher.
 * A second completion, a missing facility, an in-progress upgrade, or a lower level leaves state unchanged.
 */
export function grantFacilitySupportedCapabilityUnlock(
  state: GameState,
  completedFacilityIds: readonly string[]
): GameState {
  if (state.facilityCapabilityUnlock !== undefined) return state
  if (!completedFacilityIds.includes(FACILITY_CAPABILITY_UNLOCK_FACILITY_ID)) return state
  const facility = state.facilityState?.facilities[FACILITY_CAPABILITY_UNLOCK_FACILITY_ID]
  if (!facility || facility.facilityId !== FACILITY_CAPABILITY_UNLOCK_FACILITY_ID) return state
  if (facility.upgradeInProgress) return state
  if (facility.level < FACILITY_CAPABILITY_UNLOCK_MIN_LEVEL) return state
  if (typeof state.week !== 'number' || !Number.isInteger(state.week) || state.week < 1) {
    return state
  }

  return {
    ...state,
    facilityCapabilityUnlock: freezeUnlock({
      capabilityId: FACILITY_CAPABILITY_UNLOCK_ID,
      liability: FACILITY_CAPABILITY_UNLOCK_LIABILITY,
      acquiredWeek: state.week,
    }),
  }
}
