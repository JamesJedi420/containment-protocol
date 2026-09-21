import { describe, expect, it } from 'vitest'
import { hydrateGame } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import { CONTAINMENT_DANGER_ZONE_ID, SALT_CACHE_ID } from '../domain/facilityEmergencyCache'
import { BODY_TRANSFER_CARGO_ID, HANDLERS_AVAILABLE_LABOR } from '../domain/facilityHaulingLabor'
import { ANOMALOUS_RELIC_CONTENT_ID, RELIC_VAULT_NODE_ID } from '../domain/facilitySecuredNodes'
import {
  CLEAN_ISOLATION,
  CURSED_OBJECT_QUARANTINE_NODE_ID,
} from '../domain/facilityStockQuarantine'
import { consumeFacilityStock } from '../domain/facilityStockpile'
import {
  parseFacilityWarehouseLots,
  resolveFacilityWarehouseLot,
  stampFacilityWarehouseLot,
  WAREHOUSE_LOT_A,
  WAREHOUSE_SAMPLE_STOCK_ID,
} from '../domain/facilityWarehouseLots'
import { BLAST_DOOR_SPARE_PART_ID } from '../domain/sparePartSuitability'

const PRESENT = {
  stockId: WAREHOUSE_SAMPLE_STOCK_ID,
  lot: WAREHOUSE_LOT_A,
} as const

const PRESENT_SNAPSHOT = {
  [WAREHOUSE_SAMPLE_STOCK_ID]: WAREHOUSE_LOT_A,
} as const

function withHiddenStockId(lot: string) {
  const input: Record<string, unknown> = { lot }
  Object.defineProperty(input, 'stockId', {
    value: WAREHOUSE_SAMPLE_STOCK_ID,
    enumerable: false,
    configurable: true,
  })
  return input
}

function withInheritedStockId(lot: string) {
  return Object.create({
    stockId: WAREHOUSE_SAMPLE_STOCK_ID,
    lot,
  }) as Record<string, unknown>
}

function withHiddenLot() {
  const input: Record<string, unknown> = { stockId: WAREHOUSE_SAMPLE_STOCK_ID }
  Object.defineProperty(input, 'lot', {
    value: WAREHOUSE_LOT_A,
    enumerable: false,
    configurable: true,
  })
  return input
}

function withInheritedLot() {
  return Object.assign(Object.create({ lot: WAREHOUSE_LOT_A }), {
    stockId: WAREHOUSE_SAMPLE_STOCK_ID,
  }) as Record<string, unknown>
}

function snapshotUnrelated(state: ReturnType<typeof createStartingState>) {
  return {
    inventory: structuredClone(state.inventory),
    facilityStockpile: structuredClone(state.facilityStockpile),
    departmentLocalStaging: structuredClone(state.departmentLocalStaging),
    facilityStockPlacement: structuredClone(state.facilityStockPlacement),
    facilityStockCondition: structuredClone(state.facilityStockCondition),
    facilityEmergencyCaches: structuredClone(state.facilityEmergencyCaches),
    facilityStockOverflow: structuredClone(state.facilityStockOverflow),
    facilityStockPreparedness: structuredClone(state.facilityStockPreparedness),
    facilityProtectionGoods: structuredClone(state.facilityProtectionGoods),
    facilityRestrictedObjectRelease: structuredClone(state.facilityRestrictedObjectRelease),
    facilitySecuredNodes: structuredClone(state.facilitySecuredNodes),
    facilityStockQuarantine: structuredClone(state.facilityStockQuarantine),
    facilityHaulingLabor: structuredClone(state.facilityHaulingLabor),
    fabricatedEquipmentLots: structuredClone(state.fabricatedEquipmentLots),
    equipmentInstances: structuredClone(state.equipmentInstances),
  }
}

function expectUnrelatedPreserved(
  actual: ReturnType<typeof createStartingState>,
  unrelated: ReturnType<typeof snapshotUnrelated>
) {
  expect(actual.inventory).toEqual(unrelated.inventory)
  expect(actual.facilityStockpile).toEqual(unrelated.facilityStockpile)
  expect(actual.departmentLocalStaging).toEqual(unrelated.departmentLocalStaging)
  expect(actual.facilityStockPlacement).toEqual(unrelated.facilityStockPlacement)
  expect(actual.facilityStockCondition).toEqual(unrelated.facilityStockCondition)
  expect(actual.facilityEmergencyCaches).toEqual(unrelated.facilityEmergencyCaches)
  expect(actual.facilityStockOverflow).toEqual(unrelated.facilityStockOverflow)
  expect(actual.facilityStockPreparedness).toEqual(unrelated.facilityStockPreparedness)
  expect(actual.facilityProtectionGoods).toEqual(unrelated.facilityProtectionGoods)
  expect(actual.facilityRestrictedObjectRelease).toEqual(unrelated.facilityRestrictedObjectRelease)
  expect(actual.facilitySecuredNodes).toEqual(unrelated.facilitySecuredNodes)
  expect(actual.facilityStockQuarantine).toEqual(unrelated.facilityStockQuarantine)
  expect(actual.facilityHaulingLabor).toEqual(unrelated.facilityHaulingLabor)
  expect(actual.fabricatedEquipmentLots).toEqual(unrelated.fabricatedEquipmentLots)
  expect(actual.equipmentInstances).toEqual(unrelated.equipmentInstances)
}

describe('facility warehouse lot identity', () => {
  it('stamps authored lot identity as present vs omit as unknown, distinct from stockpile qty', () => {
    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    state.facilityEmergencyCaches = {
      [SALT_CACHE_ID]: CONTAINMENT_DANGER_ZONE_ID,
    }
    state.facilityStockQuarantine = {
      [CURSED_OBJECT_QUARANTINE_NODE_ID]: CLEAN_ISOLATION,
    }
    state.facilitySecuredNodes = {
      [RELIC_VAULT_NODE_ID]: ANOMALOUS_RELIC_CONTENT_ID,
    }
    state.facilityHaulingLabor = {
      [BODY_TRANSFER_CARGO_ID]: HANDLERS_AVAILABLE_LABOR,
    }
    const unrelated = snapshotUnrelated(state)

    const stamped = stampFacilityWarehouseLot(state, PRESENT)
    expect(stamped).toMatchObject({
      ok: true,
      stockId: WAREHOUSE_SAMPLE_STOCK_ID,
      lot: WAREHOUSE_LOT_A,
    })
    if (!stamped.ok) throw new Error(stamped.code)
    expect(stamped.state).not.toBe(state)
    expect(stamped.state.facilityWarehouseLots).toEqual(PRESENT_SNAPSHOT)
    expect(Object.isFrozen(stamped.state.facilityWarehouseLots)).toBe(true)
    expect(stamped.state.facilityStockpile).toEqual(unrelated.facilityStockpile)

    const present = resolveFacilityWarehouseLot(stamped.state, PRESENT)
    expect(present).toEqual({
      ok: true,
      state: stamped.state,
      stockId: WAREHOUSE_SAMPLE_STOCK_ID,
      lot: WAREHOUSE_LOT_A,
      identity: 'present',
    })
    expect(present.state).toBe(stamped.state)

    const omitted = resolveFacilityWarehouseLot(state, PRESENT)
    expect(omitted).toEqual({
      ok: true,
      state,
      stockId: WAREHOUSE_SAMPLE_STOCK_ID,
      identity: 'unknown',
    })
    expect(omitted).not.toMatchObject({ lot: WAREHOUSE_LOT_A })
    expect(omitted).not.toMatchObject({ identity: 'present' })
    expect(omitted.state).toBe(state)
    expect(state.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 2 })

    expectUnrelatedPreserved(stamped.state, unrelated)
    expect(state.facilityWarehouseLots).toBeUndefined()
  })

  it('resolves unknown from omitted or empty state without writing or treating omit as a default lot', () => {
    const omitted = createStartingState()
    omitted.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 4 }
    expect(omitted.facilityWarehouseLots).toBeUndefined()
    const omittedResolved = resolveFacilityWarehouseLot(omitted, PRESENT)
    expect(omittedResolved).toEqual({
      ok: true,
      state: omitted,
      stockId: WAREHOUSE_SAMPLE_STOCK_ID,
      identity: 'unknown',
    })
    expect(omittedResolved.state).toBe(omitted)
    expect(omitted.facilityWarehouseLots).toBeUndefined()
    expect(omitted.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 4 })
    expect(omittedResolved).not.toMatchObject({ lot: WAREHOUSE_LOT_A })
    expect(omittedResolved).not.toMatchObject({ identity: 'present' })

    const empty = { ...createStartingState(), facilityWarehouseLots: {} }
    empty.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 1 }
    const emptyResult = resolveFacilityWarehouseLot(empty, PRESENT)
    expect(emptyResult).toEqual({
      ok: true,
      state: empty,
      stockId: WAREHOUSE_SAMPLE_STOCK_ID,
      identity: 'unknown',
    })
    expect(emptyResult.state).toBe(empty)
    expect(empty.facilityWarehouseLots).toEqual({})
    expect(emptyResult).not.toMatchObject({ identity: 'present' })
  })

  it('fail-closes unknown, raw, missing, inherited, and hidden stock ids including spare-part qty keys', () => {
    const state = createStartingState()
    const before = structuredClone(state)
    for (const input of [
      { stockId: BLAST_DOOR_SPARE_PART_ID, lot: WAREHOUSE_LOT_A },
      { stockId: 'evidence_lot', lot: WAREHOUSE_LOT_A },
      { lot: WAREHOUSE_LOT_A },
      {},
      withInheritedStockId(WAREHOUSE_LOT_A),
      withHiddenStockId(WAREHOUSE_LOT_A),
      null,
      1,
      WAREHOUSE_SAMPLE_STOCK_ID,
    ] as const) {
      const stamped = stampFacilityWarehouseLot(state, input)
      expect(stamped).toEqual({ ok: false, state, code: 'invalid_stock' })
      expect(stamped.state).toBe(state)
      expect(stamped.state).toEqual(before)

      const resolved = resolveFacilityWarehouseLot(state, input)
      expect(resolved).toEqual({ ok: false, state, code: 'invalid_stock' })
      expect(resolved.state).toBe(state)
    }
  })

  it('fail-closes unknown, raw, missing, inherited, hidden, and qty-shaped lot ids', () => {
    const state = createStartingState()
    const before = structuredClone(state)
    for (const input of [
      { stockId: WAREHOUSE_SAMPLE_STOCK_ID, lot: 'default_lot' },
      { stockId: WAREHOUSE_SAMPLE_STOCK_ID, lot: BLAST_DOOR_SPARE_PART_ID },
      { stockId: WAREHOUSE_SAMPLE_STOCK_ID },
      { stockId: WAREHOUSE_SAMPLE_STOCK_ID, lot: '' },
      { stockId: WAREHOUSE_SAMPLE_STOCK_ID, lot: 2 },
      withHiddenLot(),
      withInheritedLot(),
    ] as const) {
      const stamped = stampFacilityWarehouseLot(state, input)
      expect(stamped).toEqual({ ok: false, state, code: 'invalid_lot' })
      expect(stamped.state).toBe(state)
      expect(stamped.state).toEqual(before)

      const resolved = resolveFacilityWarehouseLot(state, input)
      expect(resolved).toEqual({ ok: false, state, code: 'invalid_lot' })
      expect(resolved.state).toBe(state)
    }
  })

  it('writes immutably and idempotently and freezes parser and writer snapshots', () => {
    const state = createStartingState()
    const first = stampFacilityWarehouseLot(state, PRESENT)
    const second = stampFacilityWarehouseLot(state, PRESENT)
    expect(first).toEqual(second)
    if (!first.ok) throw new Error(first.code)
    expect(first.state).not.toBe(state)
    expect(state.facilityWarehouseLots).toBeUndefined()
    expect(Object.isFrozen(first.state.facilityWarehouseLots)).toBe(true)

    const repeated = stampFacilityWarehouseLot(first.state, PRESENT)
    expect(repeated).toMatchObject({ ok: true, lot: WAREHOUSE_LOT_A })
    if (!repeated.ok) throw new Error(repeated.code)
    expect(repeated.state.facilityWarehouseLots).toEqual(first.state.facilityWarehouseLots)

    const beforeResolve = structuredClone(first.state)
    const resolved = resolveFacilityWarehouseLot(first.state, PRESENT)
    expect(resolved.state).toBe(first.state)
    expect(first.state).toEqual(beforeResolve)

    const parsed = parseFacilityWarehouseLots(PRESENT_SNAPSHOT)
    expect(parsed).toEqual(PRESENT_SNAPSHOT)
    expect(Object.isFrozen(parsed)).toBe(true)
  })

  it('drops malformed, unknown, integer, qty-shaped, prototype-unsafe, symbol, inherited, and hidden siblings', () => {
    expect(parseFacilityWarehouseLots(undefined)).toBeUndefined()
    expect(parseFacilityWarehouseLots({})).toBeUndefined()
    expect(parseFacilityWarehouseLots(null)).toBeUndefined()
    expect(parseFacilityWarehouseLots([])).toBeUndefined()

    for (const snapshot of [
      'default_lot',
      BLAST_DOOR_SPARE_PART_ID,
      2,
      null,
      { lot: WAREHOUSE_LOT_A },
    ] as const) {
      expect(
        parseFacilityWarehouseLots({
          [WAREHOUSE_SAMPLE_STOCK_ID]: snapshot,
        })
      ).toBeUndefined()
    }

    const hiddenKnown: Record<string, unknown> = {}
    Object.defineProperty(hiddenKnown, WAREHOUSE_SAMPLE_STOCK_ID, {
      value: WAREHOUSE_LOT_A,
      enumerable: false,
      configurable: true,
    })
    expect(parseFacilityWarehouseLots(hiddenKnown)).toBeUndefined()

    const inheritedKnown = Object.create({
      [WAREHOUSE_SAMPLE_STOCK_ID]: WAREHOUSE_LOT_A,
    }) as Record<string, unknown>
    expect(parseFacilityWarehouseLots(inheritedKnown)).toBeUndefined()

    const mixed = Object.assign(
      Object.create({ inherited_sibling: WAREHOUSE_LOT_A }) as Record<PropertyKey, unknown>,
      {
        [WAREHOUSE_SAMPLE_STOCK_ID]: WAREHOUSE_LOT_A,
        evidence_lot: WAREHOUSE_LOT_A,
        [BLAST_DOOR_SPARE_PART_ID]: 2,
        '0': WAREHOUSE_LOT_A,
        constructor: WAREHOUSE_LOT_A,
        ['__proto__']: WAREHOUSE_LOT_A,
        [Symbol('ignored')]: WAREHOUSE_LOT_A,
      }
    )
    Object.defineProperty(mixed, 'hidden_sibling', {
      value: WAREHOUSE_LOT_A,
      enumerable: false,
      configurable: true,
    })
    const parsed = parseFacilityWarehouseLots(mixed)
    expect(parsed).toEqual(PRESENT_SNAPSHOT)
    expect(Object.isFrozen(parsed)).toBe(true)

    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    state.facilityEmergencyCaches = {
      [SALT_CACHE_ID]: CONTAINMENT_DANGER_ZONE_ID,
    }
    state.facilityStockQuarantine = {
      [CURSED_OBJECT_QUARANTINE_NODE_ID]: CLEAN_ISOLATION,
    }
    state.facilitySecuredNodes = {
      [RELIC_VAULT_NODE_ID]: ANOMALOUS_RELIC_CONTENT_ID,
    }
    state.facilityHaulingLabor = {
      [BODY_TRANSFER_CARGO_ID]: HANDLERS_AVAILABLE_LABOR,
    }
    const unrelated = snapshotUnrelated(state)
    const hydrated = hydrateGame({ ...state, facilityWarehouseLots: mixed })
    expect(hydrated.facilityWarehouseLots).toEqual(PRESENT_SNAPSHOT)
    expectUnrelatedPreserved(hydrated, unrelated)

    const malformed = hydrateGame({
      ...state,
      facilityWarehouseLots: {
        [WAREHOUSE_SAMPLE_STOCK_ID]: 2,
      },
    })
    expect(malformed.facilityWarehouseLots).toBeUndefined()
    expect(malformed.facilityStockpile).toEqual(unrelated.facilityStockpile)
  })

  it('round-trips through JSON hydration without replaying the authoring command', () => {
    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    state.facilityEmergencyCaches = {
      [SALT_CACHE_ID]: CONTAINMENT_DANGER_ZONE_ID,
    }
    state.facilityStockQuarantine = {
      [CURSED_OBJECT_QUARANTINE_NODE_ID]: CLEAN_ISOLATION,
    }
    state.facilityHaulingLabor = {
      [BODY_TRANSFER_CARGO_ID]: HANDLERS_AVAILABLE_LABOR,
    }
    const unrelated = snapshotUnrelated(state)
    const stamped = stampFacilityWarehouseLot(state, PRESENT)
    if (!stamped.ok) throw new Error(stamped.code)

    const hydrated = hydrateGame(JSON.parse(JSON.stringify(stamped.state)))
    expect(hydrated.facilityWarehouseLots).toEqual(PRESENT_SNAPSHOT)
    expectUnrelatedPreserved(hydrated, unrelated)
    expect(resolveFacilityWarehouseLot(hydrated, PRESENT)).toEqual({
      ok: true,
      state: hydrated,
      stockId: WAREHOUSE_SAMPLE_STOCK_ID,
      lot: WAREHOUSE_LOT_A,
      identity: 'present',
    })
  })

  it('does not inherit warehouse lots from hydration fallback when omitted', () => {
    const starting = createStartingState()
    const fallback = {
      ...starting,
      facilityWarehouseLots: {
        [WAREHOUSE_SAMPLE_STOCK_ID]: WAREHOUSE_LOT_A,
      },
    }
    const hydrated = hydrateGame(starting, fallback)
    expect(hydrated.facilityWarehouseLots).toBeUndefined()
    expect(fallback.facilityWarehouseLots).toEqual(PRESENT_SNAPSHOT)
  })

  it('leaves real spare-part consumption ungated and does not stamp or clear lot identity', () => {
    const omittedState = createStartingState()
    omittedState.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    expect(omittedState.facilityWarehouseLots).toBeUndefined()
    const omittedConsumed = consumeFacilityStock(omittedState, BLAST_DOOR_SPARE_PART_ID)
    expect(omittedConsumed).toMatchObject({ ok: true, remaining: 1 })
    if (!omittedConsumed.ok) throw new Error(omittedConsumed.code)
    expect(omittedConsumed.state.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 1 })
    expect(omittedConsumed.state.facilityWarehouseLots).toBeUndefined()
    expect(omittedState.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 2 })
    expect(resolveFacilityWarehouseLot(omittedConsumed.state, PRESENT)).toMatchObject({
      ok: true,
      identity: 'unknown',
    })

    const presentState = createStartingState()
    presentState.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    presentState.facilityEmergencyCaches = {
      [SALT_CACHE_ID]: CONTAINMENT_DANGER_ZONE_ID,
    }
    presentState.facilityStockQuarantine = {
      [CURSED_OBJECT_QUARANTINE_NODE_ID]: CLEAN_ISOLATION,
    }
    presentState.facilityHaulingLabor = {
      [BODY_TRANSFER_CARGO_ID]: HANDLERS_AVAILABLE_LABOR,
    }
    const stamped = stampFacilityWarehouseLot(presentState, PRESENT)
    if (!stamped.ok) throw new Error(stamped.code)
    const lotsBefore = structuredClone(stamped.state.facilityWarehouseLots)
    const cachesBefore = structuredClone(stamped.state.facilityEmergencyCaches)
    const quarantineBefore = structuredClone(stamped.state.facilityStockQuarantine)
    const haulingBefore = structuredClone(stamped.state.facilityHaulingLabor)
    const presentConsumed = consumeFacilityStock(stamped.state, BLAST_DOOR_SPARE_PART_ID)
    expect(presentConsumed).toMatchObject({ ok: true, remaining: 1 })
    if (!presentConsumed.ok) throw new Error(presentConsumed.code)
    expect(presentConsumed.state.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 1 })
    expect(presentConsumed.state.facilityWarehouseLots).toEqual(lotsBefore)
    expect(presentConsumed.state.facilityEmergencyCaches).toEqual(cachesBefore)
    expect(presentConsumed.state.facilityStockQuarantine).toEqual(quarantineBefore)
    expect(presentConsumed.state.facilityHaulingLabor).toEqual(haulingBefore)
    expect(stamped.state.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 2 })
    expect(resolveFacilityWarehouseLot(presentConsumed.state, PRESENT)).toMatchObject({
      ok: true,
      lot: WAREHOUSE_LOT_A,
      identity: 'present',
    })
  })
})
