import { describe, expect, it } from 'vitest'
import { hydrateGame } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import { CONTAINMENT_DANGER_ZONE_ID, SALT_CACHE_ID } from '../domain/facilityEmergencyCache'
import { BODY_TRANSFER_CARGO_ID, HANDLERS_AVAILABLE_LABOR } from '../domain/facilityHaulingLabor'
import {
  CURSED_EVIDENCE_MISFILE_ID,
  MISMATCHED_OUTCOME,
  parseFacilityInventoryMismatch,
  resolveFacilityInventoryMismatch,
  stampFacilityInventoryMismatch,
} from '../domain/facilityInventoryMismatch'
import { ANOMALOUS_RELIC_CONTENT_ID, RELIC_VAULT_NODE_ID } from '../domain/facilitySecuredNodes'
import {
  handleAccessControlledStock,
  MUNDANE_SUPPLIES_ZONE_ID,
  WEAPONS_LOCKER_STORAGE_CLASS_ID,
} from '../domain/facilityStockAccess'
import { EVIDENCE_CAGE_NODE_ID, OVERFLOWING_STATUS } from '../domain/facilityStockOverflow'
import {
  CLEAN_ISOLATION,
  CURSED_OBJECT_QUARANTINE_NODE_ID,
} from '../domain/facilityStockQuarantine'
import { consumeFacilityStock } from '../domain/facilityStockpile'
import { EVIDENCE_OVERFLOW_ID, REAL_LOSS_OUTCOME } from '../domain/facilityTypedOverflowLoss'
import { WAREHOUSE_LOT_A, WAREHOUSE_SAMPLE_STOCK_ID } from '../domain/facilityWarehouseLots'
import { BLAST_DOOR_SPARE_PART_ID } from '../domain/sparePartSuitability'

const MISMATCHED = {
  mismatchId: CURSED_EVIDENCE_MISFILE_ID,
  outcome: MISMATCHED_OUTCOME,
} as const

const MISMATCH_ONLY = { mismatchId: CURSED_EVIDENCE_MISFILE_ID } as const

const MISMATCHED_SNAPSHOT = {
  [CURSED_EVIDENCE_MISFILE_ID]: MISMATCHED_OUTCOME,
} as const

function withHiddenMismatchId(outcome: string) {
  const input: Record<string, unknown> = { outcome }
  Object.defineProperty(input, 'mismatchId', {
    value: CURSED_EVIDENCE_MISFILE_ID,
    enumerable: false,
    configurable: true,
  })
  return input
}

function withInheritedMismatchId(outcome: string) {
  return Object.create({
    mismatchId: CURSED_EVIDENCE_MISFILE_ID,
    outcome,
  }) as Record<string, unknown>
}

function withHiddenOutcome() {
  const input: Record<string, unknown> = { mismatchId: CURSED_EVIDENCE_MISFILE_ID }
  Object.defineProperty(input, 'outcome', {
    value: MISMATCHED_OUTCOME,
    enumerable: false,
    configurable: true,
  })
  return input
}

function withInheritedOutcome() {
  return Object.assign(Object.create({ outcome: MISMATCHED_OUTCOME }), {
    mismatchId: CURSED_EVIDENCE_MISFILE_ID,
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
    facilityWarehouseLots: structuredClone(state.facilityWarehouseLots),
    facilityTypedOverflowLoss: structuredClone(state.facilityTypedOverflowLoss),
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
  expect(actual.facilityWarehouseLots).toEqual(unrelated.facilityWarehouseLots)
  expect(actual.facilityTypedOverflowLoss).toEqual(unrelated.facilityTypedOverflowLoss)
  expect(actual.fabricatedEquipmentLots).toEqual(unrelated.fabricatedEquipmentLots)
  expect(actual.equipmentInstances).toEqual(unrelated.equipmentInstances)
}

describe('facility inventory mismatch beyond wrong-zone', () => {
  it('stamps mismatched as present vs omit as none, distinct from SPE-2890 wrong_zone', () => {
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
    state.facilityWarehouseLots = {
      [WAREHOUSE_SAMPLE_STOCK_ID]: WAREHOUSE_LOT_A,
    }
    state.facilityTypedOverflowLoss = {
      [EVIDENCE_OVERFLOW_ID]: REAL_LOSS_OUTCOME,
    }
    const unrelated = snapshotUnrelated(state)

    const omitted = resolveFacilityInventoryMismatch(state, MISMATCH_ONLY)
    expect(omitted).toEqual({
      ok: true,
      state,
      mismatchId: CURSED_EVIDENCE_MISFILE_ID,
      outcome: 'none',
    })
    expect(omitted.state).toBe(state)
    expect(omitted).not.toMatchObject({ code: 'wrong_zone' })
    expect(omitted).not.toMatchObject({ code: 'clearance_denied' })

    const stamped = stampFacilityInventoryMismatch(state, MISMATCHED)
    expect(stamped).toMatchObject({
      ok: true,
      mismatchId: CURSED_EVIDENCE_MISFILE_ID,
      outcome: MISMATCHED_OUTCOME,
    })
    if (!stamped.ok) throw new Error(stamped.code)
    expect(stamped.state.facilityInventoryMismatch).toEqual(MISMATCHED_SNAPSHOT)
    expect(Object.isFrozen(stamped.state.facilityInventoryMismatch)).toBe(true)
    expectUnrelatedPreserved(stamped.state, unrelated)
    expect(state.facilityInventoryMismatch).toBeUndefined()
    expect(stamped).not.toMatchObject({ code: 'wrong_zone' })

    const resolved = resolveFacilityInventoryMismatch(stamped.state, MISMATCH_ONLY)
    expect(resolved).toEqual({
      ok: true,
      state: stamped.state,
      mismatchId: CURSED_EVIDENCE_MISFILE_ID,
      outcome: MISMATCHED_OUTCOME,
    })
    expect(resolved.state).toBe(stamped.state)
  })

  it('does not treat SPE-2890 wrong_zone as inventory-mismatch or stamp wrong_zone', () => {
    const state = createStartingState()
    const wrongZone = handleAccessControlledStock(state, {
      classId: WEAPONS_LOCKER_STORAGE_CLASS_ID,
      staffClearance: 2,
      destinationZone: MUNDANE_SUPPLIES_ZONE_ID,
    })
    expect(wrongZone).toEqual({ ok: false, state, code: 'wrong_zone' })
    expect(wrongZone.state).toBe(state)
    expect(wrongZone.state.facilityInventoryMismatch).toBeUndefined()
    expect(resolveFacilityInventoryMismatch(wrongZone.state, MISMATCH_ONLY)).toEqual({
      ok: true,
      state: wrongZone.state,
      mismatchId: CURSED_EVIDENCE_MISFILE_ID,
      outcome: 'none',
    })

    const stamped = stampFacilityInventoryMismatch(state, MISMATCHED)
    if (!stamped.ok) throw new Error(stamped.code)
    expect(stamped.state.facilityInventoryMismatch).toEqual(MISMATCHED_SNAPSHOT)
    expect(stamped).not.toMatchObject({ code: 'wrong_zone' })
    expect(
      handleAccessControlledStock(stamped.state, {
        classId: WEAPONS_LOCKER_STORAGE_CLASS_ID,
        staffClearance: 2,
        destinationZone: MUNDANE_SUPPLIES_ZONE_ID,
      })
    ).toEqual({ ok: false, state: stamped.state, code: 'wrong_zone' })
    expect(stamped.state.facilityStockPlacement).toBeUndefined()
  })

  it('fail-closes unknown, raw, missing, inherited, and hidden mismatch ids', () => {
    const state = createStartingState()
    const before = structuredClone(state)
    for (const input of [
      { mismatchId: 'wrong_zone', outcome: MISMATCHED_OUTCOME },
      { mismatchId: 'clearance_denied', outcome: MISMATCHED_OUTCOME },
      { mismatchId: WEAPONS_LOCKER_STORAGE_CLASS_ID, outcome: MISMATCHED_OUTCOME },
      { outcome: MISMATCHED_OUTCOME },
      { mismatchId: '', outcome: MISMATCHED_OUTCOME },
      { mismatchId: 1, outcome: MISMATCHED_OUTCOME },
      withHiddenMismatchId(MISMATCHED_OUTCOME),
      withInheritedMismatchId(MISMATCHED_OUTCOME),
      null,
      1,
      CURSED_EVIDENCE_MISFILE_ID,
    ] as const) {
      const stamped = stampFacilityInventoryMismatch(state, input)
      expect(stamped).toEqual({ ok: false, state, code: 'invalid_mismatch' })
      expect(stamped.state).toBe(state)
      expect(stamped.state).toEqual(before)

      const resolved = resolveFacilityInventoryMismatch(state, input)
      expect(resolved).toEqual({ ok: false, state, code: 'invalid_mismatch' })
      expect(resolved.state).toBe(state)
    }
  })

  it('fail-closes unknown, raw, missing, inherited, hidden, and wrong-zone-shaped outcomes on stamp', () => {
    const state = createStartingState()
    const before = structuredClone(state)
    for (const input of [
      { mismatchId: CURSED_EVIDENCE_MISFILE_ID, outcome: 'wrong_zone' },
      { mismatchId: CURSED_EVIDENCE_MISFILE_ID, outcome: 'clearance_denied' },
      { mismatchId: CURSED_EVIDENCE_MISFILE_ID, outcome: 'none' },
      { mismatchId: CURSED_EVIDENCE_MISFILE_ID },
      { mismatchId: CURSED_EVIDENCE_MISFILE_ID, outcome: '' },
      { mismatchId: CURSED_EVIDENCE_MISFILE_ID, outcome: 2 },
      withHiddenOutcome(),
      withInheritedOutcome(),
    ] as const) {
      const stamped = stampFacilityInventoryMismatch(state, input)
      expect(stamped).toEqual({ ok: false, state, code: 'invalid_outcome' })
      expect(stamped.state).toBe(state)
      expect(stamped.state).toEqual(before)
    }
  })

  it('writes immutably and idempotently and freezes parser and writer snapshots', () => {
    const state = createStartingState()
    const first = stampFacilityInventoryMismatch(state, MISMATCHED)
    const second = stampFacilityInventoryMismatch(state, MISMATCHED)
    expect(first).toEqual(second)
    if (!first.ok) throw new Error(first.code)
    expect(first.state).not.toBe(state)
    expect(state.facilityInventoryMismatch).toBeUndefined()
    expect(Object.isFrozen(first.state.facilityInventoryMismatch)).toBe(true)

    const repeated = stampFacilityInventoryMismatch(first.state, MISMATCHED)
    expect(repeated).toMatchObject({ ok: true, outcome: MISMATCHED_OUTCOME })
    if (!repeated.ok) throw new Error(repeated.code)
    expect(repeated.state.facilityInventoryMismatch).toEqual(first.state.facilityInventoryMismatch)

    const beforeResolve = structuredClone(first.state)
    const resolved = resolveFacilityInventoryMismatch(first.state, MISMATCH_ONLY)
    expect(resolved.state).toBe(first.state)
    expect(first.state).toEqual(beforeResolve)

    const parsed = parseFacilityInventoryMismatch(MISMATCHED_SNAPSHOT)
    expect(parsed).toEqual(MISMATCHED_SNAPSHOT)
    expect(Object.isFrozen(parsed)).toBe(true)
  })

  it('drops malformed, unknown, integer, wrong-zone-shaped, prototype-unsafe, symbol, inherited, and hidden siblings', () => {
    expect(parseFacilityInventoryMismatch(undefined)).toBeUndefined()
    expect(parseFacilityInventoryMismatch({})).toBeUndefined()
    expect(parseFacilityInventoryMismatch(null)).toBeUndefined()
    expect(parseFacilityInventoryMismatch([])).toBeUndefined()

    for (const snapshot of [
      'wrong_zone',
      'clearance_denied',
      'none',
      2,
      null,
      { outcome: MISMATCHED_OUTCOME },
    ] as const) {
      expect(
        parseFacilityInventoryMismatch({
          [CURSED_EVIDENCE_MISFILE_ID]: snapshot,
        })
      ).toBeUndefined()
    }

    const hiddenKnown: Record<string, unknown> = {}
    Object.defineProperty(hiddenKnown, CURSED_EVIDENCE_MISFILE_ID, {
      value: MISMATCHED_OUTCOME,
      enumerable: false,
      configurable: true,
    })
    expect(parseFacilityInventoryMismatch(hiddenKnown)).toBeUndefined()

    const inheritedKnown = Object.create({
      [CURSED_EVIDENCE_MISFILE_ID]: MISMATCHED_OUTCOME,
    }) as Record<string, unknown>
    expect(parseFacilityInventoryMismatch(inheritedKnown)).toBeUndefined()

    const mixed = Object.assign(
      Object.create({ inherited_sibling: MISMATCHED_OUTCOME }) as Record<PropertyKey, unknown>,
      {
        [CURSED_EVIDENCE_MISFILE_ID]: MISMATCHED_OUTCOME,
        wrong_zone: MISMATCHED_OUTCOME,
        clearance_denied: MISMATCHED_OUTCOME,
        [WEAPONS_LOCKER_STORAGE_CLASS_ID]: MISMATCHED_OUTCOME,
        '0': MISMATCHED_OUTCOME,
        constructor: MISMATCHED_OUTCOME,
      }
    )
    Object.defineProperty(mixed, Symbol('mismatch'), {
      value: MISMATCHED_OUTCOME,
      enumerable: true,
      configurable: true,
    })
    expect(parseFacilityInventoryMismatch(mixed)).toEqual(MISMATCHED_SNAPSHOT)

    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    state.facilityStockOverflow = { [EVIDENCE_CAGE_NODE_ID]: OVERFLOWING_STATUS }
    state.facilityWarehouseLots = { [WAREHOUSE_SAMPLE_STOCK_ID]: WAREHOUSE_LOT_A }
    state.facilityTypedOverflowLoss = { [EVIDENCE_OVERFLOW_ID]: REAL_LOSS_OUTCOME }
    const unrelated = snapshotUnrelated(state)
    const hydrated = hydrateGame({
      ...state,
      facilityInventoryMismatch: mixed,
    })
    expect(hydrated.facilityInventoryMismatch).toEqual(MISMATCHED_SNAPSHOT)
    expectUnrelatedPreserved(hydrated, unrelated)
  })

  it('does not inherit facilityInventoryMismatch from hydration fallback when omitted', () => {
    const starting = createStartingState()
    const fallback = {
      ...starting,
      facilityInventoryMismatch: MISMATCHED_SNAPSHOT,
    }
    const hydrated = hydrateGame({ ...starting, facilityInventoryMismatch: undefined }, fallback)
    expect(hydrated.facilityInventoryMismatch).toBeUndefined()
    expect(fallback.facilityInventoryMismatch).toEqual(MISMATCHED_SNAPSHOT)

    const empty = { ...createStartingState(), facilityInventoryMismatch: {} }
    const emptyHydrated = hydrateGame(empty)
    expect(emptyHydrated.facilityInventoryMismatch).toBeUndefined()
    expect(empty.facilityInventoryMismatch).toEqual({})
  })

  it('round-trips a valid inventory mismatch map through hydrateGame without debiting catalog stock', () => {
    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    state.facilityInventoryMismatch = MISMATCHED_SNAPSHOT
    const unrelated = snapshotUnrelated(state)
    const hydrated = hydrateGame(JSON.parse(JSON.stringify(state)))
    expect(hydrated.facilityInventoryMismatch).toEqual(MISMATCHED_SNAPSHOT)
    expectUnrelatedPreserved(hydrated, unrelated)
    expect(resolveFacilityInventoryMismatch(hydrated, MISMATCH_ONLY)).toEqual({
      ok: true,
      state: hydrated,
      mismatchId: CURSED_EVIDENCE_MISFILE_ID,
      outcome: MISMATCHED_OUTCOME,
    })
  })

  it('leaves consumeFacilityStock ungated when inventory mismatch is omitted or present', () => {
    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    const without = consumeFacilityStock(state, BLAST_DOOR_SPARE_PART_ID)
    expect(without).toMatchObject({ ok: true })
    if (!without.ok) throw new Error(without.code)
    expect(without.state.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 1 })

    const stamped = stampFacilityInventoryMismatch(state, MISMATCHED)
    if (!stamped.ok) throw new Error(stamped.code)
    const withMismatch = consumeFacilityStock(stamped.state, BLAST_DOOR_SPARE_PART_ID)
    expect(withMismatch).toMatchObject({ ok: true })
    if (!withMismatch.ok) throw new Error(withMismatch.code)
    expect(withMismatch.state.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 1 })
    expect(withMismatch.state.facilityInventoryMismatch).toEqual(MISMATCHED_SNAPSHOT)
  })
})
