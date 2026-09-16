import { describe, expect, it } from 'vitest'
import { hydrateGame } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import { consumeFacilityStock } from '../domain/facilityStockpile'
import {
  applyIncorrectStorageSpoilage,
  COLD_STORAGE_REAGENT_STOCK_ID,
  COLD_STORAGE_ZONE_ID,
  MUNDANE_SUPPLIES_SPOILAGE_ZONE_ID,
  MUNDANE_SUPPLIES_STOCK_ID,
  parseFacilityStockCondition,
} from '../domain/facilityStockSpoilage'
import { BLAST_DOOR_SPARE_PART_ID } from '../domain/sparePartSuitability'

const CORRECT = {
  stockId: COLD_STORAGE_REAGENT_STOCK_ID,
  storedZone: COLD_STORAGE_ZONE_ID,
} as const

const INCORRECT = {
  stockId: COLD_STORAGE_REAGENT_STOCK_ID,
  storedZone: MUNDANE_SUPPLIES_SPOILAGE_ZONE_ID,
} as const

function snapshotUnrelated(state: ReturnType<typeof createStartingState>) {
  return {
    inventory: structuredClone(state.inventory),
    facilityStockpile: structuredClone(state.facilityStockpile),
    facilityStockPlacement: structuredClone(state.facilityStockPlacement),
    equipmentInstances: structuredClone(state.equipmentInstances),
  }
}

describe('facility stock incorrect-storage spoilage', () => {
  it('stamps reagent intact on the allowed zone without contaminating neighbor or debiting stock', () => {
    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    const unrelated = snapshotUnrelated(state)
    const result = applyIncorrectStorageSpoilage(state, CORRECT)
    expect(result).toMatchObject({
      ok: true,
      stockId: COLD_STORAGE_REAGENT_STOCK_ID,
      storedZone: COLD_STORAGE_ZONE_ID,
    })
    if (!result.ok) throw new Error(result.code)
    expect(result.state.facilityStockCondition).toEqual({
      [COLD_STORAGE_REAGENT_STOCK_ID]: 'intact',
    })
    expect(result.state.inventory).toEqual(unrelated.inventory)
    expect(result.state.facilityStockpile).toEqual(unrelated.facilityStockpile)
    expect(result.state.facilityStockPlacement).toEqual(unrelated.facilityStockPlacement)
    expect(result.state.equipmentInstances).toEqual(unrelated.equipmentInstances)
    expect(state.facilityStockCondition).toBeUndefined()
    expect(state.facilityStockpile).toEqual(unrelated.facilityStockpile)
  })

  it('stamps reagent degraded and neighbor contaminated when stored in mundane_supplies', () => {
    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    const unrelated = snapshotUnrelated(state)
    const result = applyIncorrectStorageSpoilage(state, INCORRECT)
    expect(result).toMatchObject({
      ok: true,
      stockId: COLD_STORAGE_REAGENT_STOCK_ID,
      storedZone: MUNDANE_SUPPLIES_SPOILAGE_ZONE_ID,
    })
    if (!result.ok) throw new Error(result.code)
    expect(result.state.facilityStockCondition).toEqual({
      [COLD_STORAGE_REAGENT_STOCK_ID]: 'degraded',
      [MUNDANE_SUPPLIES_STOCK_ID]: 'contaminated',
    })
    expect(result.state.inventory).toEqual(unrelated.inventory)
    expect(result.state.facilityStockpile).toEqual(unrelated.facilityStockpile)
    expect(result.state.facilityStockPlacement).toEqual(unrelated.facilityStockPlacement)
    expect(state.facilityStockCondition).toBeUndefined()
  })

  it('fail-closes unknown or neighbor-as-primary stock without writing condition', () => {
    const state = createStartingState()
    const before = structuredClone(state)
    for (const input of [
      { ...CORRECT, stockId: MUNDANE_SUPPLIES_STOCK_ID },
      { ...CORRECT, stockId: 'evidence_cage' },
      { storedZone: COLD_STORAGE_ZONE_ID },
      null,
      1,
      COLD_STORAGE_REAGENT_STOCK_ID,
    ] as const) {
      const result = applyIncorrectStorageSpoilage(state, input)
      expect(result).toEqual({ ok: false, state, code: 'invalid_stock' })
      expect(result.state).toBe(state)
      expect(result.state).toEqual(before)
    }
  })

  it('fail-closes unknown stored zone without writing condition', () => {
    const state = createStartingState()
    const before = structuredClone(state)
    for (const storedZone of ['weapons_locker', 'nearby', null, 1, undefined]) {
      const result = applyIncorrectStorageSpoilage(state, { ...CORRECT, storedZone })
      expect(result).toEqual({ ok: false, state, code: 'invalid_zone' })
      expect(result.state).toBe(state)
      expect(result.state).toEqual(before)
    }
  })

  it('does not clear a pre-existing neighbor contaminated stamp on a later correct-zone apply', () => {
    const state = createStartingState()
    const spoiled = applyIncorrectStorageSpoilage(state, INCORRECT)
    if (!spoiled.ok) throw new Error(spoiled.code)
    const corrected = applyIncorrectStorageSpoilage(spoiled.state, CORRECT)
    expect(corrected).toMatchObject({ ok: true, storedZone: COLD_STORAGE_ZONE_ID })
    if (!corrected.ok) throw new Error(corrected.code)
    expect(corrected.state.facilityStockCondition).toEqual({
      [COLD_STORAGE_REAGENT_STOCK_ID]: 'intact',
      [MUNDANE_SUPPLIES_STOCK_ID]: 'contaminated',
    })
    expect(spoiled.state.facilityStockCondition).toEqual({
      [COLD_STORAGE_REAGENT_STOCK_ID]: 'degraded',
      [MUNDANE_SUPPLIES_STOCK_ID]: 'contaminated',
    })
  })

  it('is immutable: same success input twice matches; hydration does not re-apply', () => {
    const state = createStartingState()
    const first = applyIncorrectStorageSpoilage(state, INCORRECT)
    const second = applyIncorrectStorageSpoilage(state, INCORRECT)
    expect(first).toEqual(second)
    if (!first.ok) throw new Error(first.code)
    const hydrated = hydrateGame(JSON.parse(JSON.stringify(first.state)))
    expect(hydrated.facilityStockCondition).toEqual({
      [COLD_STORAGE_REAGENT_STOCK_ID]: 'degraded',
      [MUNDANE_SUPPLIES_STOCK_ID]: 'contaminated',
    })
    expect(state.facilityStockCondition).toBeUndefined()
  })

  it('drops malformed hydration siblings independently', () => {
    expect(parseFacilityStockCondition(undefined)).toBeUndefined()
    expect(parseFacilityStockCondition({})).toBeUndefined()
    expect(parseFacilityStockCondition(null)).toBeUndefined()
    expect(parseFacilityStockCondition([])).toBeUndefined()
    expect(
      parseFacilityStockCondition({
        [COLD_STORAGE_REAGENT_STOCK_ID]: 'rotten',
        evidence_cage: 'degraded',
        '0': 'intact',
        constructor: 'contaminated',
      })
    ).toBeUndefined()
    expect(
      parseFacilityStockCondition({
        [COLD_STORAGE_REAGENT_STOCK_ID]: 'degraded',
        [MUNDANE_SUPPLIES_STOCK_ID]: 'contaminated',
        evidence_cage: 'intact',
        '0': 'intact',
        constructor: 'contaminated',
        nearby: 'degraded',
      })
    ).toEqual({
      [COLD_STORAGE_REAGENT_STOCK_ID]: 'degraded',
      [MUNDANE_SUPPLIES_STOCK_ID]: 'contaminated',
    })

    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    const unrelated = snapshotUnrelated(state)
    const hydrated = hydrateGame({
      ...state,
      facilityStockCondition: {
        [COLD_STORAGE_REAGENT_STOCK_ID]: 'degraded',
        [MUNDANE_SUPPLIES_STOCK_ID]: 'contaminated',
        evidence_cage: 'intact',
        '0': 'intact',
        constructor: 'contaminated',
        nearby: 'degraded',
      },
    })
    expect(hydrated.facilityStockCondition).toEqual({
      [COLD_STORAGE_REAGENT_STOCK_ID]: 'degraded',
      [MUNDANE_SUPPLIES_STOCK_ID]: 'contaminated',
    })
    expect(hydrated.inventory).toEqual(unrelated.inventory)
    expect(hydrated.facilityStockpile).toEqual(unrelated.facilityStockpile)
    expect(hydrated.facilityStockPlacement).toEqual(unrelated.facilityStockPlacement)
  })

  it('does not inherit facilityStockCondition from hydration fallback when omitted', () => {
    const starting = createStartingState()
    const fallback = {
      ...starting,
      facilityStockCondition: {
        [COLD_STORAGE_REAGENT_STOCK_ID]: 'degraded',
        [MUNDANE_SUPPLIES_STOCK_ID]: 'contaminated',
      },
    }
    const hydrated = hydrateGame({ ...starting, facilityStockCondition: undefined }, fallback)
    expect(hydrated.facilityStockCondition).toBeUndefined()
    expect(fallback.facilityStockCondition).toEqual({
      [COLD_STORAGE_REAGENT_STOCK_ID]: 'degraded',
      [MUNDANE_SUPPLIES_STOCK_ID]: 'contaminated',
    })
  })

  it('round-trips a valid condition map through hydrateGame without debiting catalog stock', () => {
    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    state.facilityStockCondition = {
      [COLD_STORAGE_REAGENT_STOCK_ID]: 'intact',
    }
    const unrelated = snapshotUnrelated(state)
    const hydrated = hydrateGame(JSON.parse(JSON.stringify(state)))
    expect(hydrated.facilityStockCondition).toEqual({
      [COLD_STORAGE_REAGENT_STOCK_ID]: 'intact',
    })
    expect(hydrated.inventory).toEqual(unrelated.inventory)
    expect(hydrated.facilityStockpile).toEqual(unrelated.facilityStockpile)

    const omitted = hydrateGame(JSON.parse(JSON.stringify(createStartingState())))
    expect(omitted.facilityStockCondition).toBeUndefined()
  })

  it('leaves spare-part consume ungated when condition is omitted', () => {
    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    expect(state.facilityStockCondition).toBeUndefined()
    const consumed = consumeFacilityStock(state, BLAST_DOOR_SPARE_PART_ID)
    expect(consumed).toMatchObject({ ok: true, remaining: 1 })
    if (!consumed.ok) throw new Error(consumed.code)
    expect(consumed.state.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 1 })
    expect(consumed.state.facilityStockCondition).toBeUndefined()
    expect(state.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 2 })
  })
})
