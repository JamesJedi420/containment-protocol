import { describe, expect, it } from 'vitest'
import { hydrateGame } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import { consumeFacilityStock } from '../domain/facilityStockpile'
import {
  CONTAINMENT_BREACH_INCIDENT_ID,
  CONTAINMENT_DANGER_ZONE_ID,
  parseFacilityEmergencyCaches,
  REMOTE_STORAGE_ZONE_ID,
  resolveLiveIncidentResponse,
  SALT_CACHE_ID,
  stageFacilityEmergencyCache,
} from '../domain/facilityEmergencyCache'
import { BLAST_DOOR_SPARE_PART_ID } from '../domain/sparePartSuitability'

const DANGER = {
  cacheId: SALT_CACHE_ID,
  zoneId: CONTAINMENT_DANGER_ZONE_ID,
} as const

const REMOTE = {
  cacheId: SALT_CACHE_ID,
  zoneId: REMOTE_STORAGE_ZONE_ID,
} as const

const BREACH = { incidentId: CONTAINMENT_BREACH_INCIDENT_ID } as const

function snapshotUnrelated(state: ReturnType<typeof createStartingState>) {
  return {
    inventory: structuredClone(state.inventory),
    facilityStockpile: structuredClone(state.facilityStockpile),
    facilityStockPlacement: structuredClone(state.facilityStockPlacement),
    facilityStockCondition: structuredClone(state.facilityStockCondition),
    equipmentInstances: structuredClone(state.equipmentInstances),
  }
}

describe('facility emergency cache live-incident response timing', () => {
  it('improves containment_breach timing when salt_cache is staged at the danger zone', () => {
    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    const unrelated = snapshotUnrelated(state)
    const staged = stageFacilityEmergencyCache(state, DANGER)
    expect(staged).toMatchObject({
      ok: true,
      cacheId: SALT_CACHE_ID,
      zone: CONTAINMENT_DANGER_ZONE_ID,
    })
    if (!staged.ok) throw new Error(staged.code)
    const result = resolveLiveIncidentResponse(staged.state, BREACH)
    expect(result).toEqual({
      ok: true,
      state: staged.state,
      timing: 'improved',
      incidentId: CONTAINMENT_BREACH_INCIDENT_ID,
      cacheId: SALT_CACHE_ID,
      zone: CONTAINMENT_DANGER_ZONE_ID,
    })
    expect(result.state).toBe(staged.state)
    expect(staged.state.facilityEmergencyCaches).toEqual({
      [SALT_CACHE_ID]: CONTAINMENT_DANGER_ZONE_ID,
    })
    expect(staged.state.inventory).toEqual(unrelated.inventory)
    expect(staged.state.facilityStockpile).toEqual(unrelated.facilityStockpile)
    expect(staged.state.facilityStockPlacement).toEqual(unrelated.facilityStockPlacement)
    expect(staged.state.facilityStockCondition).toEqual(unrelated.facilityStockCondition)
    expect(staged.state.equipmentInstances).toEqual(unrelated.equipmentInstances)
    expect(state.facilityEmergencyCaches).toBeUndefined()
    expect(state.facilityStockpile).toEqual(unrelated.facilityStockpile)
  })

  it('delays containment_breach timing when caches are omitted', () => {
    const state = createStartingState()
    expect(state.facilityEmergencyCaches).toBeUndefined()
    const result = resolveLiveIncidentResponse(state, BREACH)
    expect(result).toEqual({
      ok: true,
      state,
      timing: 'delayed',
      incidentId: CONTAINMENT_BREACH_INCIDENT_ID,
      cacheId: SALT_CACHE_ID,
    })
    expect(result.state).toBe(state)
    expect(state.facilityEmergencyCaches).toBeUndefined()
  })

  it('delays containment_breach timing when salt_cache is staged at remote_storage', () => {
    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    const unrelated = snapshotUnrelated(state)
    const staged = stageFacilityEmergencyCache(state, REMOTE)
    if (!staged.ok) throw new Error(staged.code)
    expect(staged.state.facilityEmergencyCaches).toEqual({
      [SALT_CACHE_ID]: REMOTE_STORAGE_ZONE_ID,
    })
    const result = resolveLiveIncidentResponse(staged.state, BREACH)
    expect(result).toEqual({
      ok: true,
      state: staged.state,
      timing: 'delayed',
      incidentId: CONTAINMENT_BREACH_INCIDENT_ID,
      cacheId: SALT_CACHE_ID,
      zone: REMOTE_STORAGE_ZONE_ID,
    })
    expect(result.state).toBe(staged.state)
    expect(staged.state.inventory).toEqual(unrelated.inventory)
    expect(staged.state.facilityStockpile).toEqual(unrelated.facilityStockpile)
    expect(state.facilityEmergencyCaches).toBeUndefined()
  })

  it('fail-closes unknown or malformed incident without writing caches', () => {
    const state = createStartingState()
    const staged = stageFacilityEmergencyCache(state, DANGER)
    if (!staged.ok) throw new Error(staged.code)
    const before = structuredClone(staged.state)
    for (const input of [
      { incidentId: 'possession_outbreak' },
      { incidentId: SALT_CACHE_ID },
      {},
      null,
      1,
      CONTAINMENT_BREACH_INCIDENT_ID,
    ] as const) {
      const result = resolveLiveIncidentResponse(staged.state, input)
      expect(result).toEqual({ ok: false, state: staged.state, code: 'invalid_incident' })
      expect(result.state).toBe(staged.state)
      expect(result.state).toEqual(before)
    }
  })

  it('fail-closes unknown cache on stage without writing caches', () => {
    const state = createStartingState()
    const before = structuredClone(state)
    for (const cacheId of ['med_kit_cache', 'weapons_locker', null, 1, undefined]) {
      const result = stageFacilityEmergencyCache(state, {
        cacheId,
        zoneId: CONTAINMENT_DANGER_ZONE_ID,
      })
      expect(result).toEqual({ ok: false, state, code: 'invalid_cache' })
      expect(result.state).toBe(state)
      expect(result.state).toEqual(before)
    }
  })

  it('fail-closes unknown zone on stage without writing caches', () => {
    const state = createStartingState()
    const before = structuredClone(state)
    for (const zoneId of ['mundane_supplies', 'weapons_locker', 'nearby', null, 1, undefined]) {
      const result = stageFacilityEmergencyCache(state, { cacheId: SALT_CACHE_ID, zoneId })
      expect(result).toEqual({ ok: false, state, code: 'invalid_zone' })
      expect(result.state).toBe(state)
      expect(result.state).toEqual(before)
    }
  })

  it('is immutable: same success input twice matches; hydration does not re-run resolve or stage', () => {
    const state = createStartingState()
    const first = stageFacilityEmergencyCache(state, DANGER)
    const second = stageFacilityEmergencyCache(state, DANGER)
    expect(first).toEqual(second)
    if (!first.ok) throw new Error(first.code)
    const resolved = resolveLiveIncidentResponse(first.state, BREACH)
    expect(resolved).toMatchObject({ ok: true, timing: 'improved' })
    const hydrated = hydrateGame(JSON.parse(JSON.stringify(first.state)))
    expect(hydrated.facilityEmergencyCaches).toEqual({
      [SALT_CACHE_ID]: CONTAINMENT_DANGER_ZONE_ID,
    })
    expect(resolveLiveIncidentResponse(hydrated, BREACH)).toMatchObject({
      ok: true,
      timing: 'improved',
      zone: CONTAINMENT_DANGER_ZONE_ID,
    })
    expect(state.facilityEmergencyCaches).toBeUndefined()
  })

  it('drops malformed hydration siblings independently', () => {
    expect(parseFacilityEmergencyCaches(undefined)).toBeUndefined()
    expect(parseFacilityEmergencyCaches({})).toBeUndefined()
    expect(parseFacilityEmergencyCaches(null)).toBeUndefined()
    expect(parseFacilityEmergencyCaches([])).toBeUndefined()
    expect(
      parseFacilityEmergencyCaches({
        [SALT_CACHE_ID]: 'nearby',
        med_kit_cache: CONTAINMENT_DANGER_ZONE_ID,
        '0': CONTAINMENT_DANGER_ZONE_ID,
        constructor: REMOTE_STORAGE_ZONE_ID,
      })
    ).toBeUndefined()
    expect(
      parseFacilityEmergencyCaches({
        [SALT_CACHE_ID]: CONTAINMENT_DANGER_ZONE_ID,
        med_kit_cache: REMOTE_STORAGE_ZONE_ID,
        '0': CONTAINMENT_DANGER_ZONE_ID,
        constructor: REMOTE_STORAGE_ZONE_ID,
        nearby: CONTAINMENT_DANGER_ZONE_ID,
      })
    ).toEqual({
      [SALT_CACHE_ID]: CONTAINMENT_DANGER_ZONE_ID,
    })

    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    const unrelated = snapshotUnrelated(state)
    const hydrated = hydrateGame({
      ...state,
      facilityEmergencyCaches: {
        [SALT_CACHE_ID]: CONTAINMENT_DANGER_ZONE_ID,
        med_kit_cache: REMOTE_STORAGE_ZONE_ID,
        '0': CONTAINMENT_DANGER_ZONE_ID,
        constructor: REMOTE_STORAGE_ZONE_ID,
        nearby: CONTAINMENT_DANGER_ZONE_ID,
      },
    })
    expect(hydrated.facilityEmergencyCaches).toEqual({
      [SALT_CACHE_ID]: CONTAINMENT_DANGER_ZONE_ID,
    })
    expect(hydrated.inventory).toEqual(unrelated.inventory)
    expect(hydrated.facilityStockpile).toEqual(unrelated.facilityStockpile)
    expect(hydrated.facilityStockPlacement).toEqual(unrelated.facilityStockPlacement)
    expect(hydrated.facilityStockCondition).toEqual(unrelated.facilityStockCondition)
  })

  it('does not inherit facilityEmergencyCaches from hydration fallback when omitted', () => {
    const starting = createStartingState()
    const fallback = {
      ...starting,
      facilityEmergencyCaches: {
        [SALT_CACHE_ID]: CONTAINMENT_DANGER_ZONE_ID,
      },
    }
    const hydrated = hydrateGame({ ...starting, facilityEmergencyCaches: undefined }, fallback)
    expect(hydrated.facilityEmergencyCaches).toBeUndefined()
    expect(fallback.facilityEmergencyCaches).toEqual({
      [SALT_CACHE_ID]: CONTAINMENT_DANGER_ZONE_ID,
    })
  })

  it('round-trips a valid cache map through hydrateGame without debiting catalog stock', () => {
    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    state.facilityEmergencyCaches = {
      [SALT_CACHE_ID]: REMOTE_STORAGE_ZONE_ID,
    }
    const unrelated = snapshotUnrelated(state)
    const hydrated = hydrateGame(JSON.parse(JSON.stringify(state)))
    expect(hydrated.facilityEmergencyCaches).toEqual({
      [SALT_CACHE_ID]: REMOTE_STORAGE_ZONE_ID,
    })
    expect(hydrated.inventory).toEqual(unrelated.inventory)
    expect(hydrated.facilityStockpile).toEqual(unrelated.facilityStockpile)
    expect(resolveLiveIncidentResponse(hydrated, BREACH)).toMatchObject({
      ok: true,
      timing: 'delayed',
      zone: REMOTE_STORAGE_ZONE_ID,
    })

    const omitted = hydrateGame(JSON.parse(JSON.stringify(createStartingState())))
    expect(omitted.facilityEmergencyCaches).toBeUndefined()
  })

  it('leaves spare-part consume ungated when caches are omitted or present', () => {
    const omittedState = createStartingState()
    omittedState.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    expect(omittedState.facilityEmergencyCaches).toBeUndefined()
    const omittedConsumed = consumeFacilityStock(omittedState, BLAST_DOOR_SPARE_PART_ID)
    expect(omittedConsumed).toMatchObject({ ok: true, remaining: 1 })
    if (!omittedConsumed.ok) throw new Error(omittedConsumed.code)
    expect(omittedConsumed.state.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 1 })
    expect(omittedConsumed.state.facilityEmergencyCaches).toBeUndefined()
    expect(omittedState.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 2 })

    const presentState = createStartingState()
    presentState.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    const staged = stageFacilityEmergencyCache(presentState, DANGER)
    if (!staged.ok) throw new Error(staged.code)
    const presentConsumed = consumeFacilityStock(staged.state, BLAST_DOOR_SPARE_PART_ID)
    expect(presentConsumed).toMatchObject({ ok: true, remaining: 1 })
    if (!presentConsumed.ok) throw new Error(presentConsumed.code)
    expect(presentConsumed.state.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 1 })
    expect(presentConsumed.state.facilityEmergencyCaches).toEqual({
      [SALT_CACHE_ID]: CONTAINMENT_DANGER_ZONE_ID,
    })
    expect(staged.state.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 2 })
  })
})
