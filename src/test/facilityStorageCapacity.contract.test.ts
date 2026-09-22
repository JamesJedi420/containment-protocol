import { describe, expect, it } from 'vitest'
import { hydrateGame } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import { CONTAINMENT_DANGER_ZONE_ID, SALT_CACHE_ID } from '../domain/facilityEmergencyCache'
import { BODY_TRANSFER_CARGO_ID, HANDLERS_AVAILABLE_LABOR } from '../domain/facilityHaulingLabor'
import { CURSED_EVIDENCE_MISFILE_ID, MISMATCHED_OUTCOME } from '../domain/facilityInventoryMismatch'
import { ANOMALOUS_RELIC_CONTENT_ID, RELIC_VAULT_NODE_ID } from '../domain/facilitySecuredNodes'
import {
  EVIDENCE_CAGE_CAPACITY_NODE_ID,
  parseFacilityStorageCapacity,
  resolveFacilityStorageCapacity,
  stampFacilityStorageCapacity,
} from '../domain/facilityStorageCapacity'
import {
  EVIDENCE_CAGE_NODE_ID,
  OVERFLOWING_STATUS,
  recordFacilityOverflow,
  resolveFacilityOverflowPenalty,
} from '../domain/facilityStockOverflow'
import {
  CLEAN_ISOLATION,
  CURSED_OBJECT_QUARANTINE_NODE_ID,
} from '../domain/facilityStockQuarantine'
import { consumeFacilityStock } from '../domain/facilityStockpile'
import {
  FACILITY_SALT_STOCK_ID,
  stampFacilityStockPreparedness,
} from '../domain/facilityStockPreparedness'
import { EVIDENCE_OVERFLOW_ID, REAL_LOSS_OUTCOME } from '../domain/facilityTypedOverflowLoss'
import { WAREHOUSE_LOT_A, WAREHOUSE_SAMPLE_STOCK_ID } from '../domain/facilityWarehouseLots'
import { BLAST_DOOR_SPARE_PART_ID } from '../domain/sparePartSuitability'

type SnapshotInput = {
  quantity: unknown
  capacity: unknown
}

type SnapshotField = keyof SnapshotInput

const EVIDENCE_CAGE = { nodeId: EVIDENCE_CAGE_CAPACITY_NODE_ID } as const
const SNAPSHOT_FIELDS = ['quantity', 'capacity'] as const

const WITHIN_SNAPSHOT = {
  quantity: 4,
  capacity: 4,
} as const

const OVER_SNAPSHOT = {
  quantity: 5,
  capacity: 4,
} as const

const ZERO_WITHIN_SNAPSHOT = {
  quantity: 0,
  capacity: 0,
} as const

const MAX_SAFE_WITHIN_SNAPSHOT = {
  quantity: Number.MAX_SAFE_INTEGER,
  capacity: Number.MAX_SAFE_INTEGER,
} as const

const WITHIN_MAP = {
  [EVIDENCE_CAGE_CAPACITY_NODE_ID]: WITHIN_SNAPSHOT,
} as const

const INVALID_SNAPSHOT_VALUES = [
  -1,
  1.5,
  Number.NaN,
  Number.POSITIVE_INFINITY,
  Number.MAX_SAFE_INTEGER + 1,
  '4',
  null,
  undefined,
] as const

function inputFor(snapshot: SnapshotInput) {
  return { ...EVIDENCE_CAGE, ...snapshot }
}

function withHiddenNodeId(snapshot: SnapshotInput) {
  const input = { ...snapshot } as Record<string, unknown>
  Object.defineProperty(input, 'nodeId', {
    value: EVIDENCE_CAGE_CAPACITY_NODE_ID,
    enumerable: false,
    configurable: true,
  })
  return input
}

function withInheritedNodeId(snapshot: SnapshotInput) {
  return Object.assign(
    Object.create({ nodeId: EVIDENCE_CAGE_CAPACITY_NODE_ID }) as Record<string, unknown>,
    snapshot
  )
}

function snapshotWith(
  field: SnapshotField,
  value: unknown,
  base: SnapshotInput = WITHIN_SNAPSHOT
): SnapshotInput {
  return { ...base, [field]: value }
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
    facilityInventoryMismatch: structuredClone(state.facilityInventoryMismatch),
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
  expect(actual.facilityInventoryMismatch).toEqual(unrelated.facilityInventoryMismatch)
  expect(actual.fabricatedEquipmentLots).toEqual(unrelated.fabricatedEquipmentLots)
  expect(actual.equipmentInstances).toEqual(unrelated.equipmentInstances)
}

describe('facility storage capacity qty-vs-capacity', () => {
  it('stamps evidence_cage qty-vs-capacity and resolves within_capacity without touching unrelated stock', () => {
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
    state.facilityInventoryMismatch = {
      [CURSED_EVIDENCE_MISFILE_ID]: MISMATCHED_OUTCOME,
    }
    state.facilityStockOverflow = {
      [EVIDENCE_CAGE_NODE_ID]: OVERFLOWING_STATUS,
    }
    const unrelated = snapshotUnrelated(state)

    const stamped = stampFacilityStorageCapacity(state, inputFor(WITHIN_SNAPSHOT))
    expect(stamped).toMatchObject({
      ok: true,
      nodeId: EVIDENCE_CAGE_CAPACITY_NODE_ID,
      snapshot: WITHIN_SNAPSHOT,
    })
    if (!stamped.ok) throw new Error(stamped.code)
    expect(stamped.state).not.toBe(state)
    expect(stamped.state.facilityStorageCapacity).toEqual(WITHIN_MAP)
    expect(Object.isFrozen(stamped.state.facilityStorageCapacity)).toBe(true)
    expect(
      Object.isFrozen(stamped.state.facilityStorageCapacity?.[EVIDENCE_CAGE_CAPACITY_NODE_ID])
    ).toBe(true)
    expect(Object.isFrozen(stamped.snapshot)).toBe(true)
    expectUnrelatedPreserved(stamped.state, unrelated)
    expect(state.facilityStorageCapacity).toBeUndefined()
    expect(stamped).not.toMatchObject({ penalty: 'blocked' })
    expect(stamped).not.toMatchObject({ penalty: 'clear' })

    const beforeResolve = structuredClone(stamped.state)
    const resolved = resolveFacilityStorageCapacity(stamped.state, EVIDENCE_CAGE)
    expect(resolved).toEqual({
      ok: true,
      state: stamped.state,
      nodeId: EVIDENCE_CAGE_CAPACITY_NODE_ID,
      outcome: 'within_capacity',
      snapshot: WITHIN_SNAPSHOT,
    })
    expect(resolved.state).toBe(stamped.state)
    expect(stamped.state).toEqual(beforeResolve)
    expect(resolved).not.toMatchObject({ penalty: 'blocked' })
    expect(resolved).not.toMatchObject({ outcome: 'blocked' })
    expect(resolved).not.toMatchObject({ outcome: 'clear' })
  })

  it('resolves over_capacity when quantity exceeds capacity, including equality and zero', () => {
    const resolveSnapshot = (snapshot: SnapshotInput) => {
      const state = createStartingState()
      const stamped = stampFacilityStorageCapacity(state, inputFor(snapshot))
      expect(stamped).toMatchObject({ ok: true, snapshot })
      if (!stamped.ok) throw new Error(stamped.code)
      const result = resolveFacilityStorageCapacity(stamped.state, EVIDENCE_CAGE)
      expect(result.state).toBe(stamped.state)
      return result
    }

    expect(resolveSnapshot(WITHIN_SNAPSHOT)).toMatchObject({
      ok: true,
      outcome: 'within_capacity',
    })
    expect(resolveSnapshot(OVER_SNAPSHOT)).toMatchObject({
      ok: true,
      outcome: 'over_capacity',
    })
    expect(resolveSnapshot({ quantity: 3, capacity: 4 })).toMatchObject({
      ok: true,
      outcome: 'within_capacity',
    })
    expect(resolveSnapshot(ZERO_WITHIN_SNAPSHOT)).toMatchObject({
      ok: true,
      outcome: 'within_capacity',
      snapshot: ZERO_WITHIN_SNAPSHOT,
    })
    expect(resolveSnapshot({ quantity: 1, capacity: 0 })).toMatchObject({
      ok: true,
      outcome: 'over_capacity',
    })
    expect(resolveSnapshot(MAX_SAFE_WITHIN_SNAPSHOT)).toMatchObject({
      ok: true,
      outcome: 'within_capacity',
      snapshot: MAX_SAFE_WITHIN_SNAPSHOT,
    })
  })

  it('resolves unknown from omitted or absent capacity, not SPE-2895 blocked or clear', () => {
    const omitted = createStartingState()
    expect(omitted.facilityStorageCapacity).toBeUndefined()
    const omittedResult = resolveFacilityStorageCapacity(omitted, EVIDENCE_CAGE)
    expect(omittedResult).toEqual({
      ok: true,
      state: omitted,
      outcome: 'unknown',
      nodeId: EVIDENCE_CAGE_CAPACITY_NODE_ID,
    })
    expect(omittedResult.state).toBe(omitted)
    expect(omitted.facilityStorageCapacity).toBeUndefined()
    expect(omittedResult).not.toMatchObject({ penalty: 'blocked' })
    expect(omittedResult).not.toMatchObject({ penalty: 'clear' })
    expect(omittedResult).not.toMatchObject({ outcome: 'blocked' })
    expect(omittedResult).not.toMatchObject({ outcome: 'clear' })

    const absent = { ...createStartingState(), facilityStorageCapacity: {} }
    const absentResult = resolveFacilityStorageCapacity(absent, EVIDENCE_CAGE)
    expect(absentResult).toEqual({
      ok: true,
      state: absent,
      outcome: 'unknown',
      nodeId: EVIDENCE_CAGE_CAPACITY_NODE_ID,
    })
    expect(absentResult.state).toBe(absent)
    expect(absent.facilityStorageCapacity).toEqual({})
  })

  it('keeps SPE-2895 overflow distinct: overflow does not stamp capacity; capacity does not yield blocked/clear', () => {
    const state = createStartingState()
    const overflowed = recordFacilityOverflow(state, { nodeId: EVIDENCE_CAGE_NODE_ID })
    expect(overflowed).toMatchObject({ ok: true, status: OVERFLOWING_STATUS })
    if (!overflowed.ok) throw new Error(overflowed.code)
    expect(overflowed.state.facilityStorageCapacity).toBeUndefined()
    expect(
      resolveFacilityOverflowPenalty(overflowed.state, { nodeId: EVIDENCE_CAGE_NODE_ID })
    ).toEqual({
      ok: true,
      state: overflowed.state,
      penalty: 'blocked',
      nodeId: EVIDENCE_CAGE_NODE_ID,
      status: OVERFLOWING_STATUS,
    })
    expect(resolveFacilityStorageCapacity(overflowed.state, EVIDENCE_CAGE)).toEqual({
      ok: true,
      state: overflowed.state,
      nodeId: EVIDENCE_CAGE_CAPACITY_NODE_ID,
      outcome: 'unknown',
    })

    const stamped = stampFacilityStorageCapacity(state, inputFor(OVER_SNAPSHOT))
    if (!stamped.ok) throw new Error(stamped.code)
    expect(stamped.state.facilityStockOverflow).toBeUndefined()
    expect(resolveFacilityStorageCapacity(stamped.state, EVIDENCE_CAGE)).toEqual({
      ok: true,
      state: stamped.state,
      nodeId: EVIDENCE_CAGE_CAPACITY_NODE_ID,
      outcome: 'over_capacity',
      snapshot: OVER_SNAPSHOT,
    })
    expect(
      resolveFacilityOverflowPenalty(stamped.state, { nodeId: EVIDENCE_CAGE_NODE_ID })
    ).toEqual({
      ok: true,
      state: stamped.state,
      penalty: 'clear',
      nodeId: EVIDENCE_CAGE_NODE_ID,
    })
    expect(stamped).not.toMatchObject({ penalty: 'blocked' })
    expect(stamped).not.toMatchObject({ penalty: 'clear' })
  })

  it('fail-closes unknown, raw, missing, inherited, and hidden node ids', () => {
    const state = createStartingState()
    const before = structuredClone(state)
    for (const input of [
      { ...inputFor(WITHIN_SNAPSHOT), nodeId: 'overflowing' },
      { ...inputFor(WITHIN_SNAPSHOT), nodeId: 'blocked' },
      { ...inputFor(WITHIN_SNAPSHOT), nodeId: 'clear' },
      { ...inputFor(WITHIN_SNAPSHOT), nodeId: FACILITY_SALT_STOCK_ID },
      { ...inputFor(WITHIN_SNAPSHOT), nodeId: BLAST_DOOR_SPARE_PART_ID },
      WITHIN_SNAPSHOT,
      withHiddenNodeId(WITHIN_SNAPSHOT),
      withInheritedNodeId(WITHIN_SNAPSHOT),
      null,
      1,
      EVIDENCE_CAGE_CAPACITY_NODE_ID,
    ] as const) {
      const stamped = stampFacilityStorageCapacity(state, input)
      expect(stamped).toEqual({ ok: false, state, code: 'invalid_node' })
      expect(stamped.state).toBe(state)
      expect(stamped.state).toEqual(before)

      const resolved = resolveFacilityStorageCapacity(state, input)
      expect(resolved).toEqual({ ok: false, state, code: 'invalid_node' })
      expect(resolved.state).toBe(state)
    }
  })

  it('fail-closes missing, negative, non-integer, non-finite, unsafe, inherited, or hidden snapshot fields', () => {
    const state = createStartingState()
    const before = structuredClone(state)

    for (const field of SNAPSHOT_FIELDS) {
      for (const value of INVALID_SNAPSHOT_VALUES) {
        const result = stampFacilityStorageCapacity(state, inputFor(snapshotWith(field, value)))
        expect(result).toEqual({ ok: false, state, code: 'invalid_snapshot' })
        expect(result.state).toBe(state)
        expect(result.state).toEqual(before)
      }

      const missing = { ...inputFor(WITHIN_SNAPSHOT) } as Record<string, unknown>
      delete missing[field]
      const missingResult = stampFacilityStorageCapacity(state, missing)
      expect(missingResult).toEqual({ ok: false, state, code: 'invalid_snapshot' })
      expect(missingResult.state).toBe(state)
      expect(missingResult.state).toEqual(before)

      const hidden = { ...inputFor(WITHIN_SNAPSHOT) } as Record<string, unknown>
      Object.defineProperty(hidden, field, {
        value: WITHIN_SNAPSHOT[field],
        enumerable: false,
        configurable: true,
      })
      const hiddenResult = stampFacilityStorageCapacity(state, hidden)
      expect(hiddenResult).toEqual({ ok: false, state, code: 'invalid_snapshot' })
      expect(hiddenResult.state).toBe(state)
      expect(hiddenResult.state).toEqual(before)

      const inheritedBase = { ...inputFor(WITHIN_SNAPSHOT) } as Record<string, unknown>
      delete inheritedBase[field]
      const inherited = Object.assign(
        Object.create({ [field]: WITHIN_SNAPSHOT[field] }) as Record<string, unknown>,
        inheritedBase
      )
      const inheritedResult = stampFacilityStorageCapacity(state, inherited)
      expect(inheritedResult).toEqual({ ok: false, state, code: 'invalid_snapshot' })
      expect(inheritedResult.state).toBe(state)
      expect(inheritedResult.state).toEqual(before)
    }
  })

  it('writes immutably and idempotently and freezes parser and writer snapshots', () => {
    const state = createStartingState()
    const first = stampFacilityStorageCapacity(state, inputFor(WITHIN_SNAPSHOT))
    const second = stampFacilityStorageCapacity(state, inputFor(WITHIN_SNAPSHOT))
    expect(first).toEqual(second)
    if (!first.ok) throw new Error(first.code)
    expect(first.state).not.toBe(state)
    expect(state.facilityStorageCapacity).toBeUndefined()
    expect(Object.isFrozen(first.state.facilityStorageCapacity)).toBe(true)

    const repeated = stampFacilityStorageCapacity(first.state, inputFor(WITHIN_SNAPSHOT))
    expect(repeated).toMatchObject({ ok: true, snapshot: WITHIN_SNAPSHOT })
    if (!repeated.ok) throw new Error(repeated.code)
    expect(repeated.state.facilityStorageCapacity).toEqual(first.state.facilityStorageCapacity)

    const beforeResolve = structuredClone(first.state)
    const resolved = resolveFacilityStorageCapacity(first.state, EVIDENCE_CAGE)
    expect(resolved.state).toBe(first.state)
    expect(first.state).toEqual(beforeResolve)

    const parsed = parseFacilityStorageCapacity(WITHIN_MAP)
    expect(parsed).toEqual(WITHIN_MAP)
    expect(Object.isFrozen(parsed)).toBe(true)
    expect(Object.isFrozen(parsed?.[EVIDENCE_CAGE_CAPACITY_NODE_ID])).toBe(true)
  })

  it('drops malformed, overflow-shaped, preparedness-shaped, unknown, integer, prototype-unsafe, symbol, inherited, and hidden siblings', () => {
    expect(parseFacilityStorageCapacity(undefined)).toBeUndefined()
    expect(parseFacilityStorageCapacity({})).toBeUndefined()
    expect(parseFacilityStorageCapacity(null)).toBeUndefined()
    expect(parseFacilityStorageCapacity([])).toBeUndefined()

    for (const field of SNAPSHOT_FIELDS) {
      for (const value of INVALID_SNAPSHOT_VALUES) {
        expect(
          parseFacilityStorageCapacity({
            [EVIDENCE_CAGE_CAPACITY_NODE_ID]: snapshotWith(field, value),
          })
        ).toBeUndefined()
      }

      const missing = { ...WITHIN_SNAPSHOT } as Record<string, unknown>
      delete missing[field]
      expect(
        parseFacilityStorageCapacity({ [EVIDENCE_CAGE_CAPACITY_NODE_ID]: missing })
      ).toBeUndefined()
    }

    for (const snapshot of [
      OVERFLOWING_STATUS,
      'blocked',
      'clear',
      { quantity: 4, reserve: 4, recentOutflow: 0 },
      { quantity: 4 },
      { capacity: 4 },
      2,
      null,
    ] as const) {
      expect(
        parseFacilityStorageCapacity({
          [EVIDENCE_CAGE_CAPACITY_NODE_ID]: snapshot,
        })
      ).toBeUndefined()
    }

    const hiddenKnown: Record<string, unknown> = {}
    Object.defineProperty(hiddenKnown, EVIDENCE_CAGE_CAPACITY_NODE_ID, {
      value: WITHIN_SNAPSHOT,
      enumerable: false,
      configurable: true,
    })
    expect(parseFacilityStorageCapacity(hiddenKnown)).toBeUndefined()

    const inheritedKnown = Object.create({
      [EVIDENCE_CAGE_CAPACITY_NODE_ID]: WITHIN_SNAPSHOT,
    }) as Record<string, unknown>
    expect(parseFacilityStorageCapacity(inheritedKnown)).toBeUndefined()

    const mixed = Object.assign(
      Object.create({ inherited_sibling: WITHIN_SNAPSHOT }) as Record<PropertyKey, unknown>,
      {
        [EVIDENCE_CAGE_CAPACITY_NODE_ID]: { ...WITHIN_SNAPSHOT, derived: 'over_capacity' },
        overflowing: WITHIN_SNAPSHOT,
        blocked: WITHIN_SNAPSHOT,
        clear: WITHIN_SNAPSHOT,
        [FACILITY_SALT_STOCK_ID]: WITHIN_SNAPSHOT,
        '0': WITHIN_SNAPSHOT,
        constructor: WITHIN_SNAPSHOT,
      }
    )
    Object.defineProperty(mixed, Symbol('capacity'), {
      value: WITHIN_SNAPSHOT,
      enumerable: true,
      configurable: true,
    })
    expect(parseFacilityStorageCapacity(mixed)).toEqual(WITHIN_MAP)

    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    state.facilityStockOverflow = { [EVIDENCE_CAGE_NODE_ID]: OVERFLOWING_STATUS }
    state.facilityWarehouseLots = { [WAREHOUSE_SAMPLE_STOCK_ID]: WAREHOUSE_LOT_A }
    state.facilityTypedOverflowLoss = { [EVIDENCE_OVERFLOW_ID]: REAL_LOSS_OUTCOME }
    state.facilityInventoryMismatch = { [CURSED_EVIDENCE_MISFILE_ID]: MISMATCHED_OUTCOME }
    const unrelated = snapshotUnrelated(state)
    const hydrated = hydrateGame({
      ...state,
      facilityStorageCapacity: mixed,
    })
    expect(hydrated.facilityStorageCapacity).toEqual(WITHIN_MAP)
    expectUnrelatedPreserved(hydrated, unrelated)
  })

  it('does not inherit facilityStorageCapacity from hydration fallback when omitted', () => {
    const starting = createStartingState()
    const fallback = {
      ...starting,
      facilityStorageCapacity: WITHIN_MAP,
    }
    const hydrated = hydrateGame({ ...starting, facilityStorageCapacity: undefined }, fallback)
    expect(hydrated.facilityStorageCapacity).toBeUndefined()
    expect(fallback.facilityStorageCapacity).toEqual(WITHIN_MAP)

    const empty = { ...createStartingState(), facilityStorageCapacity: {} }
    const emptyHydrated = hydrateGame(empty)
    expect(emptyHydrated.facilityStorageCapacity).toBeUndefined()
    expect(empty.facilityStorageCapacity).toEqual({})
  })

  it('round-trips a valid storage capacity map through hydrateGame without debiting catalog stock', () => {
    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    state.facilityStorageCapacity = WITHIN_MAP
    const unrelated = snapshotUnrelated(state)
    const hydrated = hydrateGame(JSON.parse(JSON.stringify(state)))
    expect(hydrated.facilityStorageCapacity).toEqual(WITHIN_MAP)
    expectUnrelatedPreserved(hydrated, unrelated)
    expect(resolveFacilityStorageCapacity(hydrated, EVIDENCE_CAGE)).toEqual({
      ok: true,
      state: hydrated,
      nodeId: EVIDENCE_CAGE_CAPACITY_NODE_ID,
      outcome: 'within_capacity',
      snapshot: WITHIN_SNAPSHOT,
    })
  })

  it('leaves consumeFacilityStock ungated when storage capacity is omitted or over capacity', () => {
    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    const without = consumeFacilityStock(state, BLAST_DOOR_SPARE_PART_ID)
    expect(without).toMatchObject({ ok: true })
    if (!without.ok) throw new Error(without.code)
    expect(without.state.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 1 })

    const stamped = stampFacilityStorageCapacity(state, inputFor(OVER_SNAPSHOT))
    if (!stamped.ok) throw new Error(stamped.code)
    const withCapacity = consumeFacilityStock(stamped.state, BLAST_DOOR_SPARE_PART_ID)
    expect(withCapacity).toMatchObject({ ok: true })
    if (!withCapacity.ok) throw new Error(withCapacity.code)
    expect(withCapacity.state.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 1 })
    expect(withCapacity.state.facilityStorageCapacity).toEqual({
      [EVIDENCE_CAGE_CAPACITY_NODE_ID]: OVER_SNAPSHOT,
    })
  })

  it('does not mix preparedness stamp into storage capacity or gate preparedness from capacity', () => {
    const state = createStartingState()
    const preparedness = stampFacilityStockPreparedness(state, {
      stockId: FACILITY_SALT_STOCK_ID,
      quantity: 4,
      reserve: 4,
      recentOutflow: 0,
    })
    if (!preparedness.ok) throw new Error(preparedness.code)
    expect(preparedness.state.facilityStorageCapacity).toBeUndefined()

    const capacity = stampFacilityStorageCapacity(state, inputFor(WITHIN_SNAPSHOT))
    if (!capacity.ok) throw new Error(capacity.code)
    expect(capacity.state.facilityStockPreparedness).toBeUndefined()
  })
})
