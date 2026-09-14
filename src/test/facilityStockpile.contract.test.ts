import { describe, expect, it } from 'vitest'
import { hydrateGame } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import { consumeFacilityStock, parseFacilityStockpile } from '../domain/facilityStockpile'
import { BLAST_DOOR_SPARE_PART_ID } from '../domain/sparePartSuitability'

function snapshotCatalog(state: ReturnType<typeof createStartingState>) {
  return {
    inventory: structuredClone(state.inventory),
    equipmentInstances: structuredClone(state.equipmentInstances),
  }
}

describe('facility stockpile consume helper', () => {
  it('fail-closes omit, empty map, and missing key without changing state', () => {
    const omitted = createStartingState()
    const catalog = snapshotCatalog(omitted)
    const omittedResult = consumeFacilityStock(omitted, BLAST_DOOR_SPARE_PART_ID)
    expect(omittedResult).toEqual({
      ok: false,
      state: omitted,
      code: 'stock_unavailable',
    })
    expect(omitted.facilityStockpile).toBeUndefined()
    expect(omittedResult.state.inventory).toEqual(catalog.inventory)
    expect(omittedResult.state.equipmentInstances).toEqual(catalog.equipmentInstances)

    const empty = createStartingState()
    empty.facilityStockpile = {}
    const emptyBefore = structuredClone(empty)
    const emptyResult = consumeFacilityStock(empty, BLAST_DOOR_SPARE_PART_ID)
    expect(emptyResult).toMatchObject({ ok: false, code: 'stock_unavailable' })
    expect(emptyResult.state).toEqual(emptyBefore)

    const missingKey = createStartingState()
    missingKey.facilityStockpile = { blast_door_hinge_seal: undefined }
    const missingBefore = structuredClone(missingKey)
    const missingResult = consumeFacilityStock(missingKey, BLAST_DOOR_SPARE_PART_ID)
    expect(missingResult).toMatchObject({ ok: false, code: 'stock_unavailable' })
    expect(missingResult.state).toEqual(missingBefore)
  })

  it('debits one named unit and omits the key at zero', () => {
    const state = createStartingState()
    const catalog = snapshotCatalog(state)
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 1 }
    const result = consumeFacilityStock(state, BLAST_DOOR_SPARE_PART_ID)
    expect(result).toMatchObject({ ok: true, stockId: BLAST_DOOR_SPARE_PART_ID, remaining: 0 })
    if (!result.ok) throw new Error(result.code)
    expect(result.state.facilityStockpile).toBeUndefined()
    expect(result.state.facilityStockpile?.[BLAST_DOOR_SPARE_PART_ID]).toBeUndefined()
    expect(result.state.inventory).toEqual(catalog.inventory)
    expect(result.state.equipmentInstances).toEqual(catalog.equipmentInstances)
    expect(state.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 1 })
  })

  it('leaves remaining quantity 1 after debiting from 2', () => {
    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    const result = consumeFacilityStock(state, BLAST_DOOR_SPARE_PART_ID)
    expect(result).toMatchObject({ ok: true, remaining: 1 })
    if (!result.ok) throw new Error(result.code)
    expect(result.state.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 1 })
    expect(state.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 2 })
  })

  it('returns the original state on fail-closed consume when market week is drifted', () => {
    const state = createStartingState()
    state.market = { ...state.market, week: state.week + 1 }
    const unavailable = consumeFacilityStock(state, BLAST_DOOR_SPARE_PART_ID)
    expect(unavailable).toMatchObject({ ok: false, code: 'stock_unavailable' })
    expect(unavailable.state).toBe(state)
    expect(unavailable.state.market.week).toBe(state.week + 1)

    const invalid = consumeFacilityStock(state, 'ward_seals')
    expect(invalid).toMatchObject({ ok: false, code: 'invalid_stock_id' })
    expect(invalid.state).toBe(state)
    expect(invalid.state.market.week).toBe(state.week + 1)
  })

  it('fail-closes unknown, empty, and catalog item ids without debiting inventory', () => {
    const state = createStartingState()
    state.inventory.ward_seals = (state.inventory.ward_seals ?? 0) + 3
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    const catalog = snapshotCatalog(state)
    const stockpileBefore = structuredClone(state.facilityStockpile)

    for (const stockId of ['', 'ward_seals', 'not_a_part', null, 1] as const) {
      const result = consumeFacilityStock(state, stockId)
      expect(result).toMatchObject({ ok: false, code: 'invalid_stock_id' })
      expect(result.state.facilityStockpile).toEqual(stockpileBefore)
      expect(result.state.inventory).toEqual(catalog.inventory)
      expect(result.state.equipmentInstances).toEqual(catalog.equipmentInstances)
    }
  })

  it('is immutable: same input twice matches; consume of a spent 1-unit result fail-closes', () => {
    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 1 }
    const first = consumeFacilityStock(state, BLAST_DOOR_SPARE_PART_ID)
    const second = consumeFacilityStock(state, BLAST_DOOR_SPARE_PART_ID)
    expect(first).toEqual(second)
    expect(first).toMatchObject({ ok: true, remaining: 0 })
    if (!first.ok) throw new Error(first.code)
    const spent = consumeFacilityStock(first.state, BLAST_DOOR_SPARE_PART_ID)
    expect(spent).toMatchObject({ ok: false, code: 'stock_unavailable' })
    expect(spent.state.facilityStockpile).toBeUndefined()
  })

  it('drops malformed hydration siblings independently', () => {
    const raw = {
      [BLAST_DOOR_SPARE_PART_ID]: 2,
      ward_seals: 4,
      '0': 3,
      constructor: 1,
      not_a_part: -1,
      fractional: 1.5,
      zero: 0,
      nan: Number.NaN,
    }
    expect(parseFacilityStockpile(raw)).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 2 })
    expect(parseFacilityStockpile(undefined)).toBeUndefined()
    expect(parseFacilityStockpile({})).toBeUndefined()
    expect(parseFacilityStockpile(null)).toBeUndefined()
    expect(parseFacilityStockpile([])).toBeUndefined()
    expect(parseFacilityStockpile({ [BLAST_DOOR_SPARE_PART_ID]: 0 })).toBeUndefined()
    expect(parseFacilityStockpile({ [BLAST_DOOR_SPARE_PART_ID]: -1 })).toBeUndefined()

    const state = createStartingState()
    const catalog = snapshotCatalog(state)
    const hydrated = hydrateGame({
      ...state,
      facilityStockpile: raw,
    })
    expect(hydrated.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 2 })
    expect(hydrated.inventory).toEqual(catalog.inventory)
    expect(hydrated.equipmentInstances).toEqual(catalog.equipmentInstances)
  })

  it('round-trips a valid quantity through hydrateGame without debiting', () => {
    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    const catalog = snapshotCatalog(state)
    const hydrated = hydrateGame(JSON.parse(JSON.stringify(state)))
    expect(hydrated.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 2 })
    expect(hydrated.inventory).toEqual(catalog.inventory)
    expect(hydrated.equipmentInstances).toEqual(catalog.equipmentInstances)

    const omitted = hydrateGame(JSON.parse(JSON.stringify(createStartingState())))
    expect(omitted.facilityStockpile).toBeUndefined()
    const omittedConsume = consumeFacilityStock(omitted, BLAST_DOOR_SPARE_PART_ID)
    expect(omittedConsume).toMatchObject({ ok: false, code: 'stock_unavailable' })
  })
})
