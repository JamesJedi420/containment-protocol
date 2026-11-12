import { describe, expect, it } from 'vitest'
import { hydrateGame } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import { consumeFacilityStock } from '../domain/facilityStockpile'
import {
  handleAccessControlledStock,
  MUNDANE_SUPPLIES_ZONE_ID,
  parseFacilityStockPlacement,
  WEAPONS_LOCKER_ALLOWED_ZONE,
  WEAPONS_LOCKER_REQUIRED_CLEARANCE,
  WEAPONS_LOCKER_STORAGE_CLASS_ID,
} from '../domain/facilityStockAccess'
import { BLAST_DOOR_SPARE_PART_ID } from '../domain/sparePartSuitability'

const CLEARED = WEAPONS_LOCKER_REQUIRED_CLEARANCE
const UNCLEARED = WEAPONS_LOCKER_REQUIRED_CLEARANCE - 1
const ALLOWED = {
  classId: WEAPONS_LOCKER_STORAGE_CLASS_ID,
  staffClearance: CLEARED,
  destinationZone: WEAPONS_LOCKER_ALLOWED_ZONE,
} as const

function snapshotUnrelated(state: ReturnType<typeof createStartingState>) {
  return {
    inventory: structuredClone(state.inventory),
    facilityStockpile: structuredClone(state.facilityStockpile),
    equipmentInstances: structuredClone(state.equipmentInstances),
  }
}

describe('facility stock access-controlled handle', () => {
  it('stamps allowed-zone placement for cleared staff without debiting stock', () => {
    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    const unrelated = snapshotUnrelated(state)
    const result = handleAccessControlledStock(state, ALLOWED)
    expect(result).toMatchObject({
      ok: true,
      classId: WEAPONS_LOCKER_STORAGE_CLASS_ID,
      zone: WEAPONS_LOCKER_ALLOWED_ZONE,
    })
    if (!result.ok) throw new Error(result.code)
    expect(result.state.facilityStockPlacement).toEqual({
      [WEAPONS_LOCKER_STORAGE_CLASS_ID]: WEAPONS_LOCKER_ALLOWED_ZONE,
    })
    expect(result.state.inventory).toEqual(unrelated.inventory)
    expect(result.state.facilityStockpile).toEqual(unrelated.facilityStockpile)
    expect(result.state.equipmentInstances).toEqual(unrelated.equipmentInstances)
    expect(state.facilityStockPlacement).toBeUndefined()
    expect(state.facilityStockpile).toEqual(unrelated.facilityStockpile)
  })

  it('fail-closes uncleared staff on the allowed zone without writing placement', () => {
    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 1 }
    const before = structuredClone(state)
    const unrelated = snapshotUnrelated(state)
    const result = handleAccessControlledStock(state, {
      ...ALLOWED,
      staffClearance: UNCLEARED,
    })
    expect(result).toEqual({ ok: false, state, code: 'clearance_denied' })
    expect(result.state).toBe(state)
    expect(result.state).toEqual(before)
    expect(result.state.facilityStockPlacement).toBeUndefined()
    expect(result.state.inventory).toEqual(unrelated.inventory)
    expect(result.state.facilityStockpile).toEqual(unrelated.facilityStockpile)
  })

  it('fail-closes cleared staff routed to mundane_supplies without writing placement', () => {
    const state = createStartingState()
    const before = structuredClone(state)
    const result = handleAccessControlledStock(state, {
      ...ALLOWED,
      destinationZone: MUNDANE_SUPPLIES_ZONE_ID,
    })
    expect(result).toEqual({ ok: false, state, code: 'wrong_zone' })
    expect(result.state).toBe(state)
    expect(result.state).toEqual(before)
    expect(result.state.facilityStockPlacement).toBeUndefined()
  })

  it('fail-closes unknown or omitted class before clearance or zone checks', () => {
    const state = createStartingState()
    const before = structuredClone(state)
    for (const input of [
      { ...ALLOWED, classId: 'evidence_cage' },
      { staffClearance: UNCLEARED, destinationZone: MUNDANE_SUPPLIES_ZONE_ID },
      null,
      1,
      'weapons_locker',
    ] as const) {
      const result = handleAccessControlledStock(state, input)
      expect(result).toEqual({ ok: false, state, code: 'invalid_class' })
      expect(result.state).toBe(state)
      expect(result.state).toEqual(before)
    }
  })

  it('fail-closes non-integer and below-floor staff clearance as clearance_denied', () => {
    const state = createStartingState()
    for (const staffClearance of [1.5, Number.NaN, Number.POSITIVE_INFINITY, 0, -1, '2', null]) {
      const result = handleAccessControlledStock(state, { ...ALLOWED, staffClearance })
      expect(result).toMatchObject({ ok: false, code: 'clearance_denied' })
      expect(result.state).toBe(state)
      expect(result.state.facilityStockPlacement).toBeUndefined()
    }
  })

  it('is immutable: same success input twice matches; hydration does not re-handle', () => {
    const state = createStartingState()
    const first = handleAccessControlledStock(state, ALLOWED)
    const second = handleAccessControlledStock(state, ALLOWED)
    expect(first).toEqual(second)
    if (!first.ok) throw new Error(first.code)
    const hydrated = hydrateGame(JSON.parse(JSON.stringify(first.state)))
    expect(hydrated.facilityStockPlacement).toEqual({
      [WEAPONS_LOCKER_STORAGE_CLASS_ID]: WEAPONS_LOCKER_ALLOWED_ZONE,
    })
    expect(state.facilityStockPlacement).toBeUndefined()
  })

  it('drops malformed hydration siblings independently', () => {
    expect(parseFacilityStockPlacement(undefined)).toBeUndefined()
    expect(parseFacilityStockPlacement({})).toBeUndefined()
    expect(parseFacilityStockPlacement(null)).toBeUndefined()
    expect(parseFacilityStockPlacement([])).toBeUndefined()
    expect(
      parseFacilityStockPlacement({
        [WEAPONS_LOCKER_STORAGE_CLASS_ID]: 'nearby',
        evidence_cage: WEAPONS_LOCKER_ALLOWED_ZONE,
        '0': WEAPONS_LOCKER_ALLOWED_ZONE,
        constructor: WEAPONS_LOCKER_ALLOWED_ZONE,
      })
    ).toBeUndefined()
    expect(
      parseFacilityStockPlacement({
        [WEAPONS_LOCKER_STORAGE_CLASS_ID]: WEAPONS_LOCKER_ALLOWED_ZONE,
        evidence_cage: WEAPONS_LOCKER_ALLOWED_ZONE,
        '0': WEAPONS_LOCKER_ALLOWED_ZONE,
        constructor: WEAPONS_LOCKER_ALLOWED_ZONE,
        nearby: MUNDANE_SUPPLIES_ZONE_ID,
      })
    ).toEqual({ [WEAPONS_LOCKER_STORAGE_CLASS_ID]: WEAPONS_LOCKER_ALLOWED_ZONE })

    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    const unrelated = snapshotUnrelated(state)
    const hydrated = hydrateGame({
      ...state,
      facilityStockPlacement: {
        [WEAPONS_LOCKER_STORAGE_CLASS_ID]: WEAPONS_LOCKER_ALLOWED_ZONE,
        evidence_cage: WEAPONS_LOCKER_ALLOWED_ZONE,
        '0': WEAPONS_LOCKER_ALLOWED_ZONE,
        constructor: WEAPONS_LOCKER_ALLOWED_ZONE,
        nearby: MUNDANE_SUPPLIES_ZONE_ID,
      },
    })
    expect(hydrated.facilityStockPlacement).toEqual({
      [WEAPONS_LOCKER_STORAGE_CLASS_ID]: WEAPONS_LOCKER_ALLOWED_ZONE,
    })
    expect(hydrated.inventory).toEqual(unrelated.inventory)
    expect(hydrated.facilityStockpile).toEqual(unrelated.facilityStockpile)
  })

  it('does not inherit facilityStockPlacement from hydration fallback when omitted', () => {
    const starting = createStartingState()
    const fallback = {
      ...starting,
      facilityStockPlacement: {
        [WEAPONS_LOCKER_STORAGE_CLASS_ID]: WEAPONS_LOCKER_ALLOWED_ZONE,
      },
    }
    const hydrated = hydrateGame({ ...starting, facilityStockPlacement: undefined }, fallback)
    expect(hydrated.facilityStockPlacement).toBeUndefined()
    expect(fallback.facilityStockPlacement).toEqual({
      [WEAPONS_LOCKER_STORAGE_CLASS_ID]: WEAPONS_LOCKER_ALLOWED_ZONE,
    })
  })

  it('round-trips a valid placement through hydrateGame without debiting catalog stock', () => {
    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    state.facilityStockPlacement = {
      [WEAPONS_LOCKER_STORAGE_CLASS_ID]: WEAPONS_LOCKER_ALLOWED_ZONE,
    }
    const unrelated = snapshotUnrelated(state)
    const hydrated = hydrateGame(JSON.parse(JSON.stringify(state)))
    expect(hydrated.facilityStockPlacement).toEqual({
      [WEAPONS_LOCKER_STORAGE_CLASS_ID]: WEAPONS_LOCKER_ALLOWED_ZONE,
    })
    expect(hydrated.inventory).toEqual(unrelated.inventory)
    expect(hydrated.facilityStockpile).toEqual(unrelated.facilityStockpile)

    const omitted = hydrateGame(JSON.parse(JSON.stringify(createStartingState())))
    expect(omitted.facilityStockPlacement).toBeUndefined()
  })

  it('leaves spare-part consume ungated when placement is omitted', () => {
    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    expect(state.facilityStockPlacement).toBeUndefined()
    const consumed = consumeFacilityStock(state, BLAST_DOOR_SPARE_PART_ID)
    expect(consumed).toMatchObject({ ok: true, remaining: 1 })
    if (!consumed.ok) throw new Error(consumed.code)
    expect(consumed.state.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 1 })
    expect(consumed.state.facilityStockPlacement).toBeUndefined()
    expect(state.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 2 })
  })
})
