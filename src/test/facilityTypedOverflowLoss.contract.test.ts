import { describe, expect, it } from 'vitest'
import { hydrateGame } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import { CONTAINMENT_DANGER_ZONE_ID, SALT_CACHE_ID } from '../domain/facilityEmergencyCache'
import { BODY_TRANSFER_CARGO_ID, HANDLERS_AVAILABLE_LABOR } from '../domain/facilityHaulingLabor'
import { ANOMALOUS_RELIC_CONTENT_ID, RELIC_VAULT_NODE_ID } from '../domain/facilitySecuredNodes'
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
  EVIDENCE_OVERFLOW_ID,
  FORCED_TRIAGE_OUTCOME,
  parseFacilityTypedOverflowLoss,
  REAL_LOSS_OUTCOME,
  resolveFacilityTypedOverflowLoss,
  stampFacilityTypedOverflowLoss,
} from '../domain/facilityTypedOverflowLoss'
import { WAREHOUSE_LOT_A, WAREHOUSE_SAMPLE_STOCK_ID } from '../domain/facilityWarehouseLots'
import { BLAST_DOOR_SPARE_PART_ID } from '../domain/sparePartSuitability'

const FORCED_TRIAGE = {
  overflowId: EVIDENCE_OVERFLOW_ID,
  outcome: FORCED_TRIAGE_OUTCOME,
} as const

const REAL_LOSS = {
  overflowId: EVIDENCE_OVERFLOW_ID,
  outcome: REAL_LOSS_OUTCOME,
} as const

const OVERFLOW_ONLY = { overflowId: EVIDENCE_OVERFLOW_ID } as const

const FORCED_TRIAGE_SNAPSHOT = {
  [EVIDENCE_OVERFLOW_ID]: FORCED_TRIAGE_OUTCOME,
} as const

const REAL_LOSS_SNAPSHOT = {
  [EVIDENCE_OVERFLOW_ID]: REAL_LOSS_OUTCOME,
} as const

function withHiddenOverflowId(outcome: string) {
  const input: Record<string, unknown> = { outcome }
  Object.defineProperty(input, 'overflowId', {
    value: EVIDENCE_OVERFLOW_ID,
    enumerable: false,
    configurable: true,
  })
  return input
}

function withInheritedOverflowId(outcome: string) {
  return Object.create({
    overflowId: EVIDENCE_OVERFLOW_ID,
    outcome,
  }) as Record<string, unknown>
}

function withHiddenOutcome() {
  const input: Record<string, unknown> = { overflowId: EVIDENCE_OVERFLOW_ID }
  Object.defineProperty(input, 'outcome', {
    value: FORCED_TRIAGE_OUTCOME,
    enumerable: false,
    configurable: true,
  })
  return input
}

function withInheritedOutcome() {
  return Object.assign(Object.create({ outcome: FORCED_TRIAGE_OUTCOME }), {
    overflowId: EVIDENCE_OVERFLOW_ID,
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
  expect(actual.fabricatedEquipmentLots).toEqual(unrelated.fabricatedEquipmentLots)
  expect(actual.equipmentInstances).toEqual(unrelated.equipmentInstances)
}

describe('facility typed overflow forced triage or real loss', () => {
  it('stamps forced_triage or real_loss as present vs omit as none, distinct from access-blocked', () => {
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
    const unrelated = snapshotUnrelated(state)

    const omitted = resolveFacilityTypedOverflowLoss(state, OVERFLOW_ONLY)
    expect(omitted).toEqual({
      ok: true,
      state,
      overflowId: EVIDENCE_OVERFLOW_ID,
      outcome: 'none',
    })
    expect(omitted.state).toBe(state)

    const stamped = stampFacilityTypedOverflowLoss(state, FORCED_TRIAGE)
    expect(stamped).toMatchObject({
      ok: true,
      overflowId: EVIDENCE_OVERFLOW_ID,
      outcome: FORCED_TRIAGE_OUTCOME,
    })
    if (!stamped.ok) throw new Error(stamped.code)
    expect(stamped.state.facilityTypedOverflowLoss).toEqual(FORCED_TRIAGE_SNAPSHOT)
    expect(Object.isFrozen(stamped.state.facilityTypedOverflowLoss)).toBe(true)
    expectUnrelatedPreserved(stamped.state, unrelated)
    expect(state.facilityTypedOverflowLoss).toBeUndefined()

    const resolved = resolveFacilityTypedOverflowLoss(stamped.state, OVERFLOW_ONLY)
    expect(resolved).toEqual({
      ok: true,
      state: stamped.state,
      overflowId: EVIDENCE_OVERFLOW_ID,
      outcome: FORCED_TRIAGE_OUTCOME,
    })
    expect(resolved.state).toBe(stamped.state)

    const lost = stampFacilityTypedOverflowLoss(state, REAL_LOSS)
    expect(lost).toMatchObject({ ok: true, outcome: REAL_LOSS_OUTCOME })
    if (!lost.ok) throw new Error(lost.code)
    expect(lost.state.facilityTypedOverflowLoss).toEqual(REAL_LOSS_SNAPSHOT)
    expect(resolveFacilityTypedOverflowLoss(lost.state, OVERFLOW_ONLY)).toEqual({
      ok: true,
      state: lost.state,
      overflowId: EVIDENCE_OVERFLOW_ID,
      outcome: REAL_LOSS_OUTCOME,
    })
  })

  it('does not treat SPE-2895 access-blocked overflow as typed loss or triage', () => {
    const state = createStartingState()
    const blocked = recordFacilityOverflow(state, { nodeId: EVIDENCE_CAGE_NODE_ID })
    if (!blocked.ok) throw new Error(blocked.code)
    expect(
      resolveFacilityOverflowPenalty(blocked.state, { nodeId: EVIDENCE_CAGE_NODE_ID })
    ).toMatchObject({
      ok: true,
      penalty: 'blocked',
      status: OVERFLOWING_STATUS,
    })
    expect(resolveFacilityTypedOverflowLoss(blocked.state, OVERFLOW_ONLY)).toEqual({
      ok: true,
      state: blocked.state,
      overflowId: EVIDENCE_OVERFLOW_ID,
      outcome: 'none',
    })
    expect(blocked.state.facilityTypedOverflowLoss).toBeUndefined()

    const typed = stampFacilityTypedOverflowLoss(state, FORCED_TRIAGE)
    if (!typed.ok) throw new Error(typed.code)
    expect(resolveFacilityOverflowPenalty(typed.state, { nodeId: EVIDENCE_CAGE_NODE_ID })).toEqual({
      ok: true,
      state: typed.state,
      penalty: 'clear',
      nodeId: EVIDENCE_CAGE_NODE_ID,
    })
    expect(typed.state.facilityStockOverflow).toBeUndefined()
  })

  it('fail-closes unknown, raw, missing, inherited, and hidden overflow ids', () => {
    const state = createStartingState()
    const before = structuredClone(state)
    for (const input of [
      { overflowId: EVIDENCE_CAGE_NODE_ID, outcome: FORCED_TRIAGE_OUTCOME },
      { overflowId: 'blocked', outcome: FORCED_TRIAGE_OUTCOME },
      { overflowId: OVERFLOWING_STATUS, outcome: FORCED_TRIAGE_OUTCOME },
      { outcome: FORCED_TRIAGE_OUTCOME },
      { overflowId: '', outcome: FORCED_TRIAGE_OUTCOME },
      { overflowId: 1, outcome: FORCED_TRIAGE_OUTCOME },
      withHiddenOverflowId(FORCED_TRIAGE_OUTCOME),
      withInheritedOverflowId(FORCED_TRIAGE_OUTCOME),
      null,
      1,
      EVIDENCE_OVERFLOW_ID,
    ] as const) {
      const stamped = stampFacilityTypedOverflowLoss(state, input)
      expect(stamped).toEqual({ ok: false, state, code: 'invalid_overflow' })
      expect(stamped.state).toBe(state)
      expect(stamped.state).toEqual(before)

      const resolved = resolveFacilityTypedOverflowLoss(state, input)
      expect(resolved).toEqual({ ok: false, state, code: 'invalid_overflow' })
      expect(resolved.state).toBe(state)
    }
  })

  it('fail-closes unknown, raw, missing, inherited, hidden, and access-blocked-shaped outcomes on stamp', () => {
    const state = createStartingState()
    const before = structuredClone(state)
    for (const input of [
      { overflowId: EVIDENCE_OVERFLOW_ID, outcome: 'blocked' },
      { overflowId: EVIDENCE_OVERFLOW_ID, outcome: 'clear' },
      { overflowId: EVIDENCE_OVERFLOW_ID, outcome: OVERFLOWING_STATUS },
      { overflowId: EVIDENCE_OVERFLOW_ID, outcome: 'none' },
      { overflowId: EVIDENCE_OVERFLOW_ID },
      { overflowId: EVIDENCE_OVERFLOW_ID, outcome: '' },
      { overflowId: EVIDENCE_OVERFLOW_ID, outcome: 2 },
      withHiddenOutcome(),
      withInheritedOutcome(),
    ] as const) {
      const stamped = stampFacilityTypedOverflowLoss(state, input)
      expect(stamped).toEqual({ ok: false, state, code: 'invalid_outcome' })
      expect(stamped.state).toBe(state)
      expect(stamped.state).toEqual(before)
    }
  })

  it('writes immutably and idempotently and freezes parser and writer snapshots', () => {
    const state = createStartingState()
    const first = stampFacilityTypedOverflowLoss(state, FORCED_TRIAGE)
    const second = stampFacilityTypedOverflowLoss(state, FORCED_TRIAGE)
    expect(first).toEqual(second)
    if (!first.ok) throw new Error(first.code)
    expect(first.state).not.toBe(state)
    expect(state.facilityTypedOverflowLoss).toBeUndefined()
    expect(Object.isFrozen(first.state.facilityTypedOverflowLoss)).toBe(true)

    const repeated = stampFacilityTypedOverflowLoss(first.state, FORCED_TRIAGE)
    expect(repeated).toMatchObject({ ok: true, outcome: FORCED_TRIAGE_OUTCOME })
    if (!repeated.ok) throw new Error(repeated.code)
    expect(repeated.state.facilityTypedOverflowLoss).toEqual(first.state.facilityTypedOverflowLoss)

    const beforeResolve = structuredClone(first.state)
    const resolved = resolveFacilityTypedOverflowLoss(first.state, OVERFLOW_ONLY)
    expect(resolved.state).toBe(first.state)
    expect(first.state).toEqual(beforeResolve)

    const parsed = parseFacilityTypedOverflowLoss(FORCED_TRIAGE_SNAPSHOT)
    expect(parsed).toEqual(FORCED_TRIAGE_SNAPSHOT)
    expect(Object.isFrozen(parsed)).toBe(true)
  })

  it('drops malformed, unknown, integer, access-blocked-shaped, prototype-unsafe, symbol, inherited, and hidden siblings', () => {
    expect(parseFacilityTypedOverflowLoss(undefined)).toBeUndefined()
    expect(parseFacilityTypedOverflowLoss({})).toBeUndefined()
    expect(parseFacilityTypedOverflowLoss(null)).toBeUndefined()
    expect(parseFacilityTypedOverflowLoss([])).toBeUndefined()

    for (const snapshot of [
      'blocked',
      'clear',
      OVERFLOWING_STATUS,
      'none',
      2,
      null,
      { outcome: FORCED_TRIAGE_OUTCOME },
    ] as const) {
      expect(
        parseFacilityTypedOverflowLoss({
          [EVIDENCE_OVERFLOW_ID]: snapshot,
        })
      ).toBeUndefined()
    }

    const hiddenKnown: Record<string, unknown> = {}
    Object.defineProperty(hiddenKnown, EVIDENCE_OVERFLOW_ID, {
      value: FORCED_TRIAGE_OUTCOME,
      enumerable: false,
      configurable: true,
    })
    expect(parseFacilityTypedOverflowLoss(hiddenKnown)).toBeUndefined()

    const inheritedKnown = Object.create({
      [EVIDENCE_OVERFLOW_ID]: FORCED_TRIAGE_OUTCOME,
    }) as Record<string, unknown>
    expect(parseFacilityTypedOverflowLoss(inheritedKnown)).toBeUndefined()

    const mixed = Object.assign(
      Object.create({ inherited_sibling: FORCED_TRIAGE_OUTCOME }) as Record<PropertyKey, unknown>,
      {
        [EVIDENCE_OVERFLOW_ID]: FORCED_TRIAGE_OUTCOME,
        [EVIDENCE_CAGE_NODE_ID]: OVERFLOWING_STATUS,
        blocked: FORCED_TRIAGE_OUTCOME,
        overflowing: REAL_LOSS_OUTCOME,
        '0': FORCED_TRIAGE_OUTCOME,
        constructor: FORCED_TRIAGE_OUTCOME,
      }
    )
    Object.defineProperty(mixed, Symbol('typed'), {
      value: FORCED_TRIAGE_OUTCOME,
      enumerable: true,
      configurable: true,
    })
    expect(parseFacilityTypedOverflowLoss(mixed)).toEqual(FORCED_TRIAGE_SNAPSHOT)

    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    state.facilityStockOverflow = { [EVIDENCE_CAGE_NODE_ID]: OVERFLOWING_STATUS }
    state.facilityWarehouseLots = { [WAREHOUSE_SAMPLE_STOCK_ID]: WAREHOUSE_LOT_A }
    const unrelated = snapshotUnrelated(state)
    const hydrated = hydrateGame({
      ...state,
      facilityTypedOverflowLoss: mixed,
    })
    expect(hydrated.facilityTypedOverflowLoss).toEqual(FORCED_TRIAGE_SNAPSHOT)
    expectUnrelatedPreserved(hydrated, unrelated)
  })

  it('does not inherit facilityTypedOverflowLoss from hydration fallback when omitted', () => {
    const starting = createStartingState()
    const fallback = {
      ...starting,
      facilityTypedOverflowLoss: FORCED_TRIAGE_SNAPSHOT,
    }
    const hydrated = hydrateGame({ ...starting, facilityTypedOverflowLoss: undefined }, fallback)
    expect(hydrated.facilityTypedOverflowLoss).toBeUndefined()
    expect(fallback.facilityTypedOverflowLoss).toEqual(FORCED_TRIAGE_SNAPSHOT)

    const empty = { ...createStartingState(), facilityTypedOverflowLoss: {} }
    const emptyHydrated = hydrateGame(empty)
    expect(emptyHydrated.facilityTypedOverflowLoss).toBeUndefined()
    expect(empty.facilityTypedOverflowLoss).toEqual({})
  })

  it('round-trips a valid typed overflow map through hydrateGame without debiting catalog stock', () => {
    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    state.facilityTypedOverflowLoss = REAL_LOSS_SNAPSHOT
    const unrelated = snapshotUnrelated(state)
    const hydrated = hydrateGame(JSON.parse(JSON.stringify(state)))
    expect(hydrated.facilityTypedOverflowLoss).toEqual(REAL_LOSS_SNAPSHOT)
    expectUnrelatedPreserved(hydrated, unrelated)
    expect(resolveFacilityTypedOverflowLoss(hydrated, OVERFLOW_ONLY)).toEqual({
      ok: true,
      state: hydrated,
      overflowId: EVIDENCE_OVERFLOW_ID,
      outcome: REAL_LOSS_OUTCOME,
    })
  })

  it('leaves consumeFacilityStock ungated when typed overflow is omitted or present', () => {
    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    const without = consumeFacilityStock(state, BLAST_DOOR_SPARE_PART_ID)
    expect(without).toMatchObject({ ok: true })
    if (!without.ok) throw new Error(without.code)
    expect(without.state.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 1 })

    const stamped = stampFacilityTypedOverflowLoss(state, REAL_LOSS)
    if (!stamped.ok) throw new Error(stamped.code)
    const withTyped = consumeFacilityStock(stamped.state, BLAST_DOOR_SPARE_PART_ID)
    expect(withTyped).toMatchObject({ ok: true })
    if (!withTyped.ok) throw new Error(withTyped.code)
    expect(withTyped.state.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 1 })
    expect(withTyped.state.facilityTypedOverflowLoss).toEqual(REAL_LOSS_SNAPSHOT)
  })
})
