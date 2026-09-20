import { describe, expect, it } from 'vitest'
import { hydrateGame } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import {
  COUNTERFEIT_PROTECTION_GOOD_STATUS,
  parseFacilityProtectionGoods,
  recordCounterfeitProtectionGood,
  resolveFacilityProtectionGoodOutcome,
  RESPIRATOR_FILTER_PROTECTION_GOOD_ID,
} from '../domain/facilityProtectionGoods'
import { consumeFacilityStock } from '../domain/facilityStockpile'
import { BLAST_DOOR_SPARE_PART_ID } from '../domain/sparePartSuitability'

const RESPIRATOR_FILTER = { itemId: RESPIRATOR_FILTER_PROTECTION_GOOD_ID } as const

function withHiddenItemId() {
  const input: Record<string, unknown> = {}
  Object.defineProperty(input, 'itemId', {
    value: RESPIRATOR_FILTER_PROTECTION_GOOD_ID,
    enumerable: false,
    configurable: true,
  })
  return input
}

function withInheritedItemId() {
  return Object.create({
    itemId: RESPIRATOR_FILTER_PROTECTION_GOOD_ID,
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
    equipmentInstances: structuredClone(state.equipmentInstances),
  }
}

describe('facility counterfeit protection goods', () => {
  it('records a counterfeit respirator filter and resolves safety failure with false reassurance', () => {
    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    const unrelated = snapshotUnrelated(state)

    const recorded = recordCounterfeitProtectionGood(state, RESPIRATOR_FILTER)
    expect(recorded).toMatchObject({
      ok: true,
      itemId: RESPIRATOR_FILTER_PROTECTION_GOOD_ID,
      status: COUNTERFEIT_PROTECTION_GOOD_STATUS,
    })
    if (!recorded.ok) throw new Error(recorded.code)
    expect(recorded.state).not.toBe(state)
    expect(recorded.state.facilityProtectionGoods).toEqual({
      [RESPIRATOR_FILTER_PROTECTION_GOOD_ID]: COUNTERFEIT_PROTECTION_GOOD_STATUS,
    })
    expect(Object.isFrozen(recorded.state.facilityProtectionGoods)).toBe(true)

    const beforeResolve = structuredClone(recorded.state)
    const resolved = resolveFacilityProtectionGoodOutcome(recorded.state, RESPIRATOR_FILTER)
    expect(resolved).toEqual({
      ok: true,
      state: recorded.state,
      itemId: RESPIRATOR_FILTER_PROTECTION_GOOD_ID,
      status: COUNTERFEIT_PROTECTION_GOOD_STATUS,
      protection: 'failed',
      assurance: 'false_reassurance',
    })
    expect(resolved.state).toBe(recorded.state)
    expect(recorded.state).toEqual(beforeResolve)

    expect(recorded.state.inventory).toEqual(unrelated.inventory)
    expect(recorded.state.facilityStockpile).toEqual(unrelated.facilityStockpile)
    expect(recorded.state.departmentLocalStaging).toEqual(unrelated.departmentLocalStaging)
    expect(recorded.state.facilityStockPlacement).toEqual(unrelated.facilityStockPlacement)
    expect(recorded.state.facilityStockCondition).toEqual(unrelated.facilityStockCondition)
    expect(recorded.state.facilityEmergencyCaches).toEqual(unrelated.facilityEmergencyCaches)
    expect(recorded.state.facilityStockOverflow).toEqual(unrelated.facilityStockOverflow)
    expect(recorded.state.facilityStockPreparedness).toEqual(unrelated.facilityStockPreparedness)
    expect(recorded.state.equipmentInstances).toEqual(unrelated.equipmentInstances)
    expect(state.facilityProtectionGoods).toBeUndefined()
    expect(state.facilityStockpile).toEqual(unrelated.facilityStockpile)
  })

  it('resolves unknown protection and assurance from omitted or empty state without writing', () => {
    const omitted = createStartingState()
    expect(omitted.facilityProtectionGoods).toBeUndefined()
    const omittedResult = resolveFacilityProtectionGoodOutcome(omitted, RESPIRATOR_FILTER)
    expect(omittedResult).toEqual({
      ok: true,
      state: omitted,
      itemId: RESPIRATOR_FILTER_PROTECTION_GOOD_ID,
      protection: 'unknown',
      assurance: 'unknown',
    })
    expect(omittedResult.state).toBe(omitted)
    expect(omitted.facilityProtectionGoods).toBeUndefined()

    const empty = { ...createStartingState(), facilityProtectionGoods: {} }
    const emptyResult = resolveFacilityProtectionGoodOutcome(empty, RESPIRATOR_FILTER)
    expect(emptyResult).toEqual({
      ok: true,
      state: empty,
      itemId: RESPIRATOR_FILTER_PROTECTION_GOOD_ID,
      protection: 'unknown',
      assurance: 'unknown',
    })
    expect(emptyResult.state).toBe(empty)
    expect(empty.facilityProtectionGoods).toEqual({})
  })

  it('fail-closes unknown, raw, missing, inherited, and hidden item ids on record', () => {
    const state = createStartingState()
    const before = structuredClone(state)
    for (const input of [
      { itemId: 'surgical_mask' },
      { itemId: BLAST_DOOR_SPARE_PART_ID },
      {},
      withInheritedItemId(),
      withHiddenItemId(),
      null,
      1,
      RESPIRATOR_FILTER_PROTECTION_GOOD_ID,
    ] as const) {
      const result = recordCounterfeitProtectionGood(state, input)
      expect(result).toEqual({ ok: false, state, code: 'invalid_item' })
      expect(result.state).toBe(state)
      expect(result.state).toEqual(before)
    }
  })

  it('fail-closes unknown, raw, missing, inherited, and hidden item ids on resolve', () => {
    const state = createStartingState()
    const recorded = recordCounterfeitProtectionGood(state, RESPIRATOR_FILTER)
    if (!recorded.ok) throw new Error(recorded.code)
    const before = structuredClone(recorded.state)

    for (const input of [
      { itemId: 'surgical_mask' },
      { itemId: BLAST_DOOR_SPARE_PART_ID },
      {},
      withInheritedItemId(),
      withHiddenItemId(),
      null,
      1,
      RESPIRATOR_FILTER_PROTECTION_GOOD_ID,
    ] as const) {
      const result = resolveFacilityProtectionGoodOutcome(recorded.state, input)
      expect(result).toEqual({ ok: false, state: recorded.state, code: 'invalid_item' })
      expect(result.state).toBe(recorded.state)
      expect(result.state).toEqual(before)
    }
  })

  it('writes immutably and idempotently and freezes parser and writer snapshots', () => {
    const state = createStartingState()
    const first = recordCounterfeitProtectionGood(state, RESPIRATOR_FILTER)
    const second = recordCounterfeitProtectionGood(state, RESPIRATOR_FILTER)
    expect(first).toEqual(second)
    if (!first.ok) throw new Error(first.code)
    expect(first.state).not.toBe(state)
    expect(state.facilityProtectionGoods).toBeUndefined()
    expect(Object.isFrozen(first.state.facilityProtectionGoods)).toBe(true)

    const repeated = recordCounterfeitProtectionGood(first.state, RESPIRATOR_FILTER)
    expect(repeated).toMatchObject({
      ok: true,
      itemId: RESPIRATOR_FILTER_PROTECTION_GOOD_ID,
      status: COUNTERFEIT_PROTECTION_GOOD_STATUS,
    })
    if (!repeated.ok) throw new Error(repeated.code)
    expect(repeated.state.facilityProtectionGoods).toEqual(first.state.facilityProtectionGoods)
    expect(first.state.facilityProtectionGoods).toEqual({
      [RESPIRATOR_FILTER_PROTECTION_GOOD_ID]: COUNTERFEIT_PROTECTION_GOOD_STATUS,
    })

    const parsed = parseFacilityProtectionGoods({
      [RESPIRATOR_FILTER_PROTECTION_GOOD_ID]: COUNTERFEIT_PROTECTION_GOOD_STATUS,
    })
    expect(parsed).toEqual({
      [RESPIRATOR_FILTER_PROTECTION_GOOD_ID]: COUNTERFEIT_PROTECTION_GOOD_STATUS,
    })
    expect(Object.isFrozen(parsed)).toBe(true)
  })

  it('drops malformed, unknown, integer, prototype-unsafe, symbol, inherited, and hidden siblings', () => {
    expect(parseFacilityProtectionGoods(undefined)).toBeUndefined()
    expect(parseFacilityProtectionGoods({})).toBeUndefined()
    expect(parseFacilityProtectionGoods(null)).toBeUndefined()
    expect(parseFacilityProtectionGoods([])).toBeUndefined()

    for (const status of ['authentic', 'mislabeled', null, 1, {}, undefined] as const) {
      expect(
        parseFacilityProtectionGoods({
          [RESPIRATOR_FILTER_PROTECTION_GOOD_ID]: status,
        })
      ).toBeUndefined()
    }

    const hiddenKnown: Record<string, unknown> = {}
    Object.defineProperty(hiddenKnown, RESPIRATOR_FILTER_PROTECTION_GOOD_ID, {
      value: COUNTERFEIT_PROTECTION_GOOD_STATUS,
      enumerable: false,
      configurable: true,
    })
    expect(parseFacilityProtectionGoods(hiddenKnown)).toBeUndefined()

    const inheritedKnown = Object.create({
      [RESPIRATOR_FILTER_PROTECTION_GOOD_ID]: COUNTERFEIT_PROTECTION_GOOD_STATUS,
    }) as Record<string, unknown>
    expect(parseFacilityProtectionGoods(inheritedKnown)).toBeUndefined()

    const mixed = Object.assign(
      Object.create({ inherited_sibling: COUNTERFEIT_PROTECTION_GOOD_STATUS }) as Record<
        PropertyKey,
        unknown
      >,
      {
        [RESPIRATOR_FILTER_PROTECTION_GOOD_ID]: COUNTERFEIT_PROTECTION_GOOD_STATUS,
        surgical_mask: 'mislabeled',
        '0': COUNTERFEIT_PROTECTION_GOOD_STATUS,
        constructor: COUNTERFEIT_PROTECTION_GOOD_STATUS,
        ['__proto__']: COUNTERFEIT_PROTECTION_GOOD_STATUS,
        [Symbol('ignored')]: COUNTERFEIT_PROTECTION_GOOD_STATUS,
      }
    )
    Object.defineProperty(mixed, 'hidden_sibling', {
      value: COUNTERFEIT_PROTECTION_GOOD_STATUS,
      enumerable: false,
      configurable: true,
    })
    const parsed = parseFacilityProtectionGoods(mixed)
    expect(parsed).toEqual({
      [RESPIRATOR_FILTER_PROTECTION_GOOD_ID]: COUNTERFEIT_PROTECTION_GOOD_STATUS,
    })
    expect(Object.isFrozen(parsed)).toBe(true)

    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    const unrelated = snapshotUnrelated(state)
    const hydrated = hydrateGame({ ...state, facilityProtectionGoods: mixed })
    expect(hydrated.facilityProtectionGoods).toEqual({
      [RESPIRATOR_FILTER_PROTECTION_GOOD_ID]: COUNTERFEIT_PROTECTION_GOOD_STATUS,
    })
    expect(hydrated.inventory).toEqual(unrelated.inventory)
    expect(hydrated.facilityStockpile).toEqual(unrelated.facilityStockpile)
    expect(hydrated.departmentLocalStaging).toEqual(unrelated.departmentLocalStaging)
    expect(hydrated.facilityStockPlacement).toEqual(unrelated.facilityStockPlacement)
    expect(hydrated.facilityStockCondition).toEqual(unrelated.facilityStockCondition)
    expect(hydrated.facilityEmergencyCaches).toEqual(unrelated.facilityEmergencyCaches)
    expect(hydrated.facilityStockOverflow).toEqual(unrelated.facilityStockOverflow)
    expect(hydrated.facilityStockPreparedness).toEqual(unrelated.facilityStockPreparedness)

    const malformed = hydrateGame({
      ...state,
      facilityProtectionGoods: {
        [RESPIRATOR_FILTER_PROTECTION_GOOD_ID]: 'authentic',
      },
    })
    expect(malformed.facilityProtectionGoods).toBeUndefined()
  })

  it('round-trips through JSON hydration without replaying the authoring command', () => {
    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    const unrelated = snapshotUnrelated(state)
    const recorded = recordCounterfeitProtectionGood(state, RESPIRATOR_FILTER)
    if (!recorded.ok) throw new Error(recorded.code)

    const hydrated = hydrateGame(JSON.parse(JSON.stringify(recorded.state)))
    expect(hydrated.facilityProtectionGoods).toEqual({
      [RESPIRATOR_FILTER_PROTECTION_GOOD_ID]: COUNTERFEIT_PROTECTION_GOOD_STATUS,
    })
    expect(hydrated.inventory).toEqual(unrelated.inventory)
    expect(hydrated.facilityStockpile).toEqual(unrelated.facilityStockpile)
    expect(hydrated.departmentLocalStaging).toEqual(unrelated.departmentLocalStaging)
    expect(hydrated.facilityStockPlacement).toEqual(unrelated.facilityStockPlacement)
    expect(hydrated.facilityStockCondition).toEqual(unrelated.facilityStockCondition)
    expect(hydrated.facilityEmergencyCaches).toEqual(unrelated.facilityEmergencyCaches)
    expect(hydrated.facilityStockOverflow).toEqual(unrelated.facilityStockOverflow)
    expect(hydrated.facilityStockPreparedness).toEqual(unrelated.facilityStockPreparedness)
    expect(resolveFacilityProtectionGoodOutcome(hydrated, RESPIRATOR_FILTER)).toEqual({
      ok: true,
      state: hydrated,
      itemId: RESPIRATOR_FILTER_PROTECTION_GOOD_ID,
      status: COUNTERFEIT_PROTECTION_GOOD_STATUS,
      protection: 'failed',
      assurance: 'false_reassurance',
    })
  })

  it('does not inherit protection goods from hydration fallback when omitted', () => {
    const starting = createStartingState()
    const fallback = {
      ...starting,
      facilityProtectionGoods: {
        [RESPIRATOR_FILTER_PROTECTION_GOOD_ID]: COUNTERFEIT_PROTECTION_GOOD_STATUS,
      },
    }
    const hydrated = hydrateGame(starting, fallback)
    expect(hydrated.facilityProtectionGoods).toBeUndefined()
    expect(fallback.facilityProtectionGoods).toEqual({
      [RESPIRATOR_FILTER_PROTECTION_GOOD_ID]: COUNTERFEIT_PROTECTION_GOOD_STATUS,
    })
  })

  it('leaves real spare-part consumption ungated when protection goods are omitted or present', () => {
    const omittedState = createStartingState()
    omittedState.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    expect(omittedState.facilityProtectionGoods).toBeUndefined()
    const omittedConsumed = consumeFacilityStock(omittedState, BLAST_DOOR_SPARE_PART_ID)
    expect(omittedConsumed).toMatchObject({ ok: true, remaining: 1 })
    if (!omittedConsumed.ok) throw new Error(omittedConsumed.code)
    expect(omittedConsumed.state.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 1 })
    expect(omittedConsumed.state.facilityProtectionGoods).toBeUndefined()
    expect(omittedState.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 2 })

    const presentState = createStartingState()
    presentState.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    const recorded = recordCounterfeitProtectionGood(presentState, RESPIRATOR_FILTER)
    if (!recorded.ok) throw new Error(recorded.code)
    const protectionBefore = structuredClone(recorded.state.facilityProtectionGoods)
    const presentConsumed = consumeFacilityStock(recorded.state, BLAST_DOOR_SPARE_PART_ID)
    expect(presentConsumed).toMatchObject({ ok: true, remaining: 1 })
    if (!presentConsumed.ok) throw new Error(presentConsumed.code)
    expect(presentConsumed.state.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 1 })
    expect(presentConsumed.state.facilityProtectionGoods).toEqual(protectionBefore)
    expect(recorded.state.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 2 })
    expect(
      resolveFacilityProtectionGoodOutcome(presentConsumed.state, RESPIRATOR_FILTER)
    ).toMatchObject({
      ok: true,
      status: COUNTERFEIT_PROTECTION_GOOD_STATUS,
      protection: 'failed',
      assurance: 'false_reassurance',
    })
  })
})
