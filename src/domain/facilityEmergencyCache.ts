/** SPE-2892 / SPE-1027 emergency cache live-incident response timing. Distinct from facilityStockpile qty. */

import type { GameState } from './models'
import { ensureNormalizedGameState } from './teamSimulation'

export const SALT_CACHE_ID = 'salt_cache' as const

export const EMERGENCY_CACHE_IDS = [SALT_CACHE_ID] as const
export type EmergencyCacheId = (typeof EMERGENCY_CACHE_IDS)[number]

export const CONTAINMENT_DANGER_ZONE_ID = 'containment_danger_zone' as const
export const REMOTE_STORAGE_ZONE_ID = 'remote_storage' as const

export const EMERGENCY_CACHE_ZONE_IDS = [
  CONTAINMENT_DANGER_ZONE_ID,
  REMOTE_STORAGE_ZONE_ID,
] as const
export type EmergencyCacheZoneId = (typeof EMERGENCY_CACHE_ZONE_IDS)[number]

export const CONTAINMENT_BREACH_INCIDENT_ID = 'containment_breach' as const

export const LIVE_INCIDENT_IDS = [CONTAINMENT_BREACH_INCIDENT_ID] as const
export type LiveIncidentId = (typeof LIVE_INCIDENT_IDS)[number]

export const LIVE_INCIDENT_RESPONSE_TIMINGS = ['delayed', 'improved'] as const
export type LiveIncidentResponseTiming = (typeof LIVE_INCIDENT_RESPONSE_TIMINGS)[number]

export type FacilityEmergencyCaches = Partial<Record<EmergencyCacheId, EmergencyCacheZoneId>>

export type FacilityEmergencyCacheStageFailureCode = 'invalid_cache' | 'invalid_zone'

export type FacilityEmergencyCacheStageResult =
  | { ok: true; state: GameState; cacheId: EmergencyCacheId; zone: EmergencyCacheZoneId }
  | { ok: false; state: GameState; code: FacilityEmergencyCacheStageFailureCode }

export type FacilityEmergencyCacheResolveFailureCode = 'invalid_incident'

export type FacilityEmergencyCacheResolveResult =
  | {
      ok: true
      state: GameState
      timing: LiveIncidentResponseTiming
      incidentId: LiveIncidentId
      cacheId: EmergencyCacheId
      zone?: EmergencyCacheZoneId
    }
  | { ok: false; state: GameState; code: FacilityEmergencyCacheResolveFailureCode }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isEmergencyCacheId(value: unknown): value is EmergencyCacheId {
  return EMERGENCY_CACHE_IDS.some((cacheId) => cacheId === value)
}

export function isEmergencyCacheZoneId(value: unknown): value is EmergencyCacheZoneId {
  return EMERGENCY_CACHE_ZONE_IDS.some((zoneId) => zoneId === value)
}

export function isLiveIncidentId(value: unknown): value is LiveIncidentId {
  return LIVE_INCIDENT_IDS.some((incidentId) => incidentId === value)
}

function snapshotFacilityEmergencyCaches(
  caches: FacilityEmergencyCaches
): FacilityEmergencyCaches | undefined {
  const next: FacilityEmergencyCaches = {}
  for (const cacheId of EMERGENCY_CACHE_IDS) {
    const zone = caches[cacheId]
    if (!isEmergencyCacheZoneId(zone)) continue
    next[cacheId] = zone
  }
  return Object.keys(next).length === 0 ? undefined : Object.freeze(next)
}

/**
 * Hydrate optional `GameState.facilityEmergencyCaches`.
 * Omit / non-record / empty after sanitizing → undefined.
 * Unknown, integer-index, prototype-unsafe, and non-enum siblings drop independently.
 * Valid siblings insert in authored cache id order.
 */
export function parseFacilityEmergencyCaches(value: unknown): FacilityEmergencyCaches | undefined {
  if (value === undefined) return undefined
  if (!isRecord(value)) return undefined
  const next: FacilityEmergencyCaches = {}
  for (const cacheId of EMERGENCY_CACHE_IDS) {
    if (!Object.prototype.hasOwnProperty.call(value, cacheId)) continue
    const zone = value[cacheId]
    if (!isEmergencyCacheZoneId(zone)) continue
    next[cacheId] = zone
  }
  return snapshotFacilityEmergencyCaches(next)
}

function requiredCacheForIncident(incidentId: LiveIncidentId): EmergencyCacheId {
  switch (incidentId) {
    case CONTAINMENT_BREACH_INCIDENT_ID:
      return SALT_CACHE_ID
    default: {
      const exhaustive: never = incidentId
      return exhaustive
    }
  }
}

function matchingZoneForIncident(incidentId: LiveIncidentId): EmergencyCacheZoneId {
  switch (incidentId) {
    case CONTAINMENT_BREACH_INCIDENT_ID:
      return CONTAINMENT_DANGER_ZONE_ID
    default: {
      const exhaustive: never = incidentId
      return exhaustive
    }
  }
}

function timingForStagedZone(
  incidentId: LiveIncidentId,
  zone: EmergencyCacheZoneId | undefined
): LiveIncidentResponseTiming {
  return zone === matchingZoneForIncident(incidentId) ? 'improved' : 'delayed'
}

/**
 * Stage one authored emergency cache at a known cache zone.
 * Unknown/malformed cache fail-closes `invalid_cache`.
 * Zone other than `containment_danger_zone` or `remote_storage` fail-closes `invalid_zone`.
 * Danger and remote are both legal destinations; remote is delayed on resolve, not a stage failure.
 * Does not debit `facilityStockpile` or catalog `inventory`. Fail-closed paths leave state unchanged.
 */
export function stageFacilityEmergencyCache(
  state: GameState,
  input: unknown
): FacilityEmergencyCacheStageResult {
  const cacheId = isRecord(input) ? input.cacheId : undefined
  if (!isEmergencyCacheId(cacheId)) {
    return { ok: false, state, code: 'invalid_cache' }
  }

  const zoneId = isRecord(input) ? input.zoneId : undefined
  if (!isEmergencyCacheZoneId(zoneId)) {
    return { ok: false, state, code: 'invalid_zone' }
  }

  const current = parseFacilityEmergencyCaches(state.facilityEmergencyCaches) ?? {}
  const facilityEmergencyCaches = snapshotFacilityEmergencyCaches({
    ...current,
    [cacheId]: zoneId,
  })
  const nextState: GameState = { ...ensureNormalizedGameState(state) }
  if (facilityEmergencyCaches === undefined) {
    delete nextState.facilityEmergencyCaches
  } else {
    nextState.facilityEmergencyCaches = facilityEmergencyCaches
  }
  return { ok: true, state: nextState, cacheId, zone: zoneId }
}

/**
 * Resolve live-incident response timing from staged emergency caches.
 * Unknown/malformed incident fail-closes `invalid_incident`.
 * `salt_cache` at `containment_danger_zone` → `improved`.
 * Omit, absent, or `remote_storage` → `delayed`.
 * Read-only: returns the same state reference. Does not stamp timing or debit stock.
 */
export function resolveLiveIncidentResponse(
  state: GameState,
  input: unknown
): FacilityEmergencyCacheResolveResult {
  const incidentId = isRecord(input) ? input.incidentId : undefined
  if (!isLiveIncidentId(incidentId)) {
    return { ok: false, state, code: 'invalid_incident' }
  }

  const cacheId = requiredCacheForIncident(incidentId)
  const caches = parseFacilityEmergencyCaches(state.facilityEmergencyCaches)
  const zone = caches?.[cacheId]
  const timing = timingForStagedZone(incidentId, zone)
  if (zone === undefined) {
    return { ok: true, state, timing, incidentId, cacheId }
  }
  return { ok: true, state, timing, incidentId, cacheId, zone }
}
