import { describe, expect, it } from 'vitest'
import { hydrateGame } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import {
  parseFacilityRestrictedObjectRelease,
  recordRestrictedObjectStored,
  RELIQUARY_KEY_SET_COMPONENT_IDS,
  RELIQUARY_KEY_SET_ID,
  resolveRestrictedObjectRelease,
  transitionRestrictedObjectRelease,
} from '../domain/facilityRestrictedObjectRelease'
import { COUNTERFEIT_PROTECTION_GOOD_STATUS } from '../domain/facilityProtectionGoods'
import { consumeFacilityStock } from '../domain/facilityStockpile'
import { BLAST_DOOR_SPARE_PART_ID } from '../domain/sparePartSuitability'

const COMPLETE = {
  setId: RELIQUARY_KEY_SET_ID,
  components: [...RELIQUARY_KEY_SET_COMPONENT_IDS],
} as const

const STORED_SNAPSHOT = {
  mode: 'stored' as const,
  components: [...RELIQUARY_KEY_SET_COMPONENT_IDS],
}

function withHiddenSetId() {
  const input: Record<string, unknown> = {
    components: [...RELIQUARY_KEY_SET_COMPONENT_IDS],
  }
  Object.defineProperty(input, 'setId', {
    value: RELIQUARY_KEY_SET_ID,
    enumerable: false,
    configurable: true,
  })
  return input
}

function withInheritedSetId() {
  return Object.create({
    setId: RELIQUARY_KEY_SET_ID,
    components: [...RELIQUARY_KEY_SET_COMPONENT_IDS],
  }) as Record<string, unknown>
}

function withHiddenComponents() {
  const input: Record<string, unknown> = { setId: RELIQUARY_KEY_SET_ID }
  Object.defineProperty(input, 'components', {
    value: [...RELIQUARY_KEY_SET_COMPONENT_IDS],
    enumerable: false,
    configurable: true,
  })
  return input
}

function withInheritedComponents() {
  return Object.assign(Object.create({ components: [...RELIQUARY_KEY_SET_COMPONENT_IDS] }), {
    setId: RELIQUARY_KEY_SET_ID,
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
  expect(actual.equipmentInstances).toEqual(unrelated.equipmentInstances)
}

describe('facility restricted-object component-set release', () => {
  it('records stored membership and moves stored → inspection → testing without implying testing from removal', () => {
    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    state.facilityProtectionGoods = {
      respirator_filter: COUNTERFEIT_PROTECTION_GOOD_STATUS,
    }
    const unrelated = snapshotUnrelated(state)

    const stored = recordRestrictedObjectStored(state, COMPLETE)
    expect(stored).toMatchObject({
      ok: true,
      setId: RELIQUARY_KEY_SET_ID,
      mode: 'stored',
      components: [...RELIQUARY_KEY_SET_COMPONENT_IDS],
    })
    if (!stored.ok) throw new Error(stored.code)
    expect(stored.state).not.toBe(state)
    expect(stored.state.facilityRestrictedObjectRelease).toEqual({
      [RELIQUARY_KEY_SET_ID]: STORED_SNAPSHOT,
    })
    expect(Object.isFrozen(stored.state.facilityRestrictedObjectRelease)).toBe(true)
    expect(
      Object.isFrozen(stored.state.facilityRestrictedObjectRelease?.[RELIQUARY_KEY_SET_ID])
    ).toBe(true)
    expect(
      Object.isFrozen(
        stored.state.facilityRestrictedObjectRelease?.[RELIQUARY_KEY_SET_ID]?.components
      )
    ).toBe(true)

    const storedResolved = resolveRestrictedObjectRelease(stored.state, {
      setId: RELIQUARY_KEY_SET_ID,
    })
    expect(storedResolved).toEqual({
      ok: true,
      state: stored.state,
      setId: RELIQUARY_KEY_SET_ID,
      mode: 'stored',
      components: [...RELIQUARY_KEY_SET_COMPONENT_IDS],
    })
    expect(storedResolved.state).toBe(stored.state)

    const inspected = transitionRestrictedObjectRelease(stored.state, {
      ...COMPLETE,
      mode: 'inspection',
    })
    expect(inspected).toMatchObject({
      ok: true,
      setId: RELIQUARY_KEY_SET_ID,
      mode: 'inspection',
    })
    if (!inspected.ok) throw new Error(inspected.code)
    expect(inspected.state).not.toBe(stored.state)
    const inspectionResolved = resolveRestrictedObjectRelease(inspected.state, {
      setId: RELIQUARY_KEY_SET_ID,
    })
    expect(inspectionResolved).toMatchObject({
      ok: true,
      mode: 'inspection',
      components: [...RELIQUARY_KEY_SET_COMPONENT_IDS],
    })
    expect(inspectionResolved).not.toMatchObject({ mode: 'testing' })

    const skippedTesting = transitionRestrictedObjectRelease(stored.state, {
      ...COMPLETE,
      mode: 'testing',
    })
    expect(skippedTesting).toEqual({ ok: false, state: stored.state, code: 'illegal_transition' })
    expect(skippedTesting.state).toBe(stored.state)

    const tested = transitionRestrictedObjectRelease(inspected.state, {
      ...COMPLETE,
      mode: 'testing',
    })
    expect(tested).toMatchObject({
      ok: true,
      setId: RELIQUARY_KEY_SET_ID,
      mode: 'testing',
    })
    if (!tested.ok) throw new Error(tested.code)
    expect(
      resolveRestrictedObjectRelease(tested.state, { setId: RELIQUARY_KEY_SET_ID })
    ).toMatchObject({
      ok: true,
      mode: 'testing',
    })

    expectUnrelatedPreserved(stored.state, unrelated)
    expectUnrelatedPreserved(inspected.state, unrelated)
    expectUnrelatedPreserved(tested.state, unrelated)
    expect(state.facilityRestrictedObjectRelease).toBeUndefined()
    expect(state.facilityStockpile).toEqual(unrelated.facilityStockpile)
    expect(state.facilityProtectionGoods).toEqual(unrelated.facilityProtectionGoods)
  })

  it('resolves unknown from omitted or empty state without writing', () => {
    const omitted = createStartingState()
    expect(omitted.facilityRestrictedObjectRelease).toBeUndefined()
    const omittedResult = resolveRestrictedObjectRelease(omitted, { setId: RELIQUARY_KEY_SET_ID })
    expect(omittedResult).toEqual({
      ok: true,
      state: omitted,
      setId: RELIQUARY_KEY_SET_ID,
      mode: 'unknown',
    })
    expect(omittedResult.state).toBe(omitted)
    expect(omitted.facilityRestrictedObjectRelease).toBeUndefined()

    const empty = { ...createStartingState(), facilityRestrictedObjectRelease: {} }
    const emptyResult = resolveRestrictedObjectRelease(empty, { setId: RELIQUARY_KEY_SET_ID })
    expect(emptyResult).toEqual({
      ok: true,
      state: empty,
      setId: RELIQUARY_KEY_SET_ID,
      mode: 'unknown',
    })
    expect(emptyResult.state).toBe(empty)
    expect(empty.facilityRestrictedObjectRelease).toEqual({})
  })

  it('fail-closes incomplete, extra, duplicate, unknown, inherited, and hidden components', () => {
    const state = createStartingState()
    const stored = recordRestrictedObjectStored(state, COMPLETE)
    if (!stored.ok) throw new Error(stored.code)
    const before = structuredClone(stored.state)

    for (const input of [
      { setId: RELIQUARY_KEY_SET_ID, components: ['reliquary_key_set_1'] },
      {
        setId: RELIQUARY_KEY_SET_ID,
        components: ['reliquary_key_set_1', 'reliquary_key_set_2', 'reliquary_key_set_3'],
      },
      {
        setId: RELIQUARY_KEY_SET_ID,
        components: ['reliquary_key_set_1', 'reliquary_key_set_1'],
      },
      { setId: RELIQUARY_KEY_SET_ID, components: ['unknown_shard'] },
      { setId: RELIQUARY_KEY_SET_ID, components: [] },
      { setId: RELIQUARY_KEY_SET_ID },
      { setId: RELIQUARY_KEY_SET_ID, components: 'reliquary_key_set_1' },
      withHiddenComponents(),
      withInheritedComponents(),
    ] as const) {
      const recorded = recordRestrictedObjectStored(state, input)
      expect(recorded).toEqual({ ok: false, state, code: 'incomplete_set' })
      expect(recorded.state).toBe(state)

      const transitioned = transitionRestrictedObjectRelease(stored.state, {
        ...(input as Record<string, unknown>),
        mode: 'inspection',
      })
      expect(transitioned).toEqual({
        ok: false,
        state: stored.state,
        code: 'incomplete_set',
      })
      expect(transitioned.state).toBe(stored.state)
      expect(stored.state).toEqual(before)
    }
  })

  it('fail-closes unknown, raw, missing, inherited, and hidden set ids', () => {
    const state = createStartingState()
    const before = structuredClone(state)
    for (const input of [
      { setId: 'cursed_amulet', components: [...RELIQUARY_KEY_SET_COMPONENT_IDS] },
      { components: [...RELIQUARY_KEY_SET_COMPONENT_IDS] },
      {},
      withInheritedSetId(),
      withHiddenSetId(),
      null,
      1,
      RELIQUARY_KEY_SET_ID,
    ] as const) {
      const recorded = recordRestrictedObjectStored(state, input)
      expect(recorded).toEqual({ ok: false, state, code: 'invalid_set' })
      expect(recorded.state).toBe(state)
      expect(recorded.state).toEqual(before)

      const resolved = resolveRestrictedObjectRelease(state, input)
      expect(resolved).toEqual({ ok: false, state, code: 'invalid_set' })
      expect(resolved.state).toBe(state)
    }
  })

  it('fail-closes illegal transitions including stored → testing and omitted current state', () => {
    const state = createStartingState()
    const omitted = transitionRestrictedObjectRelease(state, { ...COMPLETE, mode: 'inspection' })
    expect(omitted).toEqual({ ok: false, state, code: 'illegal_transition' })
    expect(omitted.state).toBe(state)

    const stored = recordRestrictedObjectStored(state, COMPLETE)
    if (!stored.ok) throw new Error(stored.code)
    const before = structuredClone(stored.state)

    for (const input of [
      { ...COMPLETE, mode: 'testing' },
      { ...COMPLETE, mode: 'stored' },
    ] as const) {
      const result = transitionRestrictedObjectRelease(stored.state, input)
      expect(result).toEqual({ ok: false, state: stored.state, code: 'illegal_transition' })
      expect(result.state).toBe(stored.state)
    }

    for (const input of [{ ...COMPLETE, mode: 'active_use' }, { ...COMPLETE }] as const) {
      const result = transitionRestrictedObjectRelease(stored.state, input)
      expect(result).toEqual({ ok: false, state: stored.state, code: 'invalid_set' })
      expect(result.state).toBe(stored.state)
    }

    const inspected = transitionRestrictedObjectRelease(stored.state, {
      ...COMPLETE,
      mode: 'inspection',
    })
    if (!inspected.ok) throw new Error(inspected.code)
    const backToStored = transitionRestrictedObjectRelease(inspected.state, {
      ...COMPLETE,
      mode: 'stored',
    })
    expect(backToStored).toEqual({
      ok: false,
      state: inspected.state,
      code: 'illegal_transition',
    })
    expect(stored.state).toEqual(before)
  })

  it('fail-closes record attempts that would rewind inspection or testing back to stored', () => {
    const state = createStartingState()
    const stored = recordRestrictedObjectStored(state, COMPLETE)
    if (!stored.ok) throw new Error(stored.code)

    const inspected = transitionRestrictedObjectRelease(stored.state, {
      ...COMPLETE,
      mode: 'inspection',
    })
    if (!inspected.ok) throw new Error(inspected.code)

    const inspectedBefore = structuredClone(inspected.state)
    const rewindFromInspection = recordRestrictedObjectStored(inspected.state, COMPLETE)
    expect(rewindFromInspection).toEqual({
      ok: false,
      state: inspected.state,
      code: 'illegal_transition',
    })
    expect(rewindFromInspection.state).toBe(inspected.state)
    expect(inspected.state).toEqual(inspectedBefore)
    expect(
      resolveRestrictedObjectRelease(inspected.state, { setId: RELIQUARY_KEY_SET_ID })
    ).toMatchObject({
      ok: true,
      mode: 'inspection',
    })

    const tested = transitionRestrictedObjectRelease(inspected.state, {
      ...COMPLETE,
      mode: 'testing',
    })
    if (!tested.ok) throw new Error(tested.code)

    const testedBefore = structuredClone(tested.state)
    const rewindFromTesting = recordRestrictedObjectStored(tested.state, COMPLETE)
    expect(rewindFromTesting).toEqual({
      ok: false,
      state: tested.state,
      code: 'illegal_transition',
    })
    expect(rewindFromTesting.state).toBe(tested.state)
    expect(tested.state).toEqual(testedBefore)
    expect(
      resolveRestrictedObjectRelease(tested.state, { setId: RELIQUARY_KEY_SET_ID })
    ).toMatchObject({
      ok: true,
      mode: 'testing',
    })
  })

  it('writes immutably and idempotently and freezes parser and writer snapshots', () => {
    const state = createStartingState()
    const first = recordRestrictedObjectStored(state, COMPLETE)
    const second = recordRestrictedObjectStored(state, COMPLETE)
    expect(first).toEqual(second)
    if (!first.ok) throw new Error(first.code)
    expect(first.state).not.toBe(state)
    expect(state.facilityRestrictedObjectRelease).toBeUndefined()
    expect(Object.isFrozen(first.state.facilityRestrictedObjectRelease)).toBe(true)

    const repeated = recordRestrictedObjectStored(first.state, COMPLETE)
    expect(repeated).toMatchObject({ ok: true, mode: 'stored' })
    if (!repeated.ok) throw new Error(repeated.code)
    expect(repeated.state.facilityRestrictedObjectRelease).toEqual(
      first.state.facilityRestrictedObjectRelease
    )

    const parsed = parseFacilityRestrictedObjectRelease({
      [RELIQUARY_KEY_SET_ID]: STORED_SNAPSHOT,
    })
    expect(parsed).toEqual({
      [RELIQUARY_KEY_SET_ID]: STORED_SNAPSHOT,
    })
    expect(Object.isFrozen(parsed)).toBe(true)
    expect(Object.isFrozen(parsed?.[RELIQUARY_KEY_SET_ID])).toBe(true)
    expect(Object.isFrozen(parsed?.[RELIQUARY_KEY_SET_ID]?.components)).toBe(true)
  })

  it('drops malformed, unknown, integer, prototype-unsafe, symbol, inherited, and hidden siblings', () => {
    expect(parseFacilityRestrictedObjectRelease(undefined)).toBeUndefined()
    expect(parseFacilityRestrictedObjectRelease({})).toBeUndefined()
    expect(parseFacilityRestrictedObjectRelease(null)).toBeUndefined()
    expect(parseFacilityRestrictedObjectRelease([])).toBeUndefined()

    for (const snapshot of [
      { mode: 'active_use', components: [...RELIQUARY_KEY_SET_COMPONENT_IDS] },
      { mode: 'stored', components: ['reliquary_key_set_1'] },
      { mode: 'stored' },
      { components: [...RELIQUARY_KEY_SET_COMPONENT_IDS] },
      null,
      1,
      'stored',
    ] as const) {
      expect(
        parseFacilityRestrictedObjectRelease({
          [RELIQUARY_KEY_SET_ID]: snapshot,
        })
      ).toBeUndefined()
    }

    const hiddenKnown: Record<string, unknown> = {}
    Object.defineProperty(hiddenKnown, RELIQUARY_KEY_SET_ID, {
      value: STORED_SNAPSHOT,
      enumerable: false,
      configurable: true,
    })
    expect(parseFacilityRestrictedObjectRelease(hiddenKnown)).toBeUndefined()

    const inheritedKnown = Object.create({
      [RELIQUARY_KEY_SET_ID]: STORED_SNAPSHOT,
    }) as Record<string, unknown>
    expect(parseFacilityRestrictedObjectRelease(inheritedKnown)).toBeUndefined()

    const mixed = Object.assign(
      Object.create({ inherited_sibling: STORED_SNAPSHOT }) as Record<PropertyKey, unknown>,
      {
        [RELIQUARY_KEY_SET_ID]: STORED_SNAPSHOT,
        cursed_amulet: STORED_SNAPSHOT,
        '0': STORED_SNAPSHOT,
        constructor: STORED_SNAPSHOT,
        ['__proto__']: STORED_SNAPSHOT,
        [Symbol('ignored')]: STORED_SNAPSHOT,
      }
    )
    Object.defineProperty(mixed, 'hidden_sibling', {
      value: STORED_SNAPSHOT,
      enumerable: false,
      configurable: true,
    })
    const parsed = parseFacilityRestrictedObjectRelease(mixed)
    expect(parsed).toEqual({
      [RELIQUARY_KEY_SET_ID]: STORED_SNAPSHOT,
    })
    expect(Object.isFrozen(parsed)).toBe(true)

    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    state.facilityProtectionGoods = {
      respirator_filter: COUNTERFEIT_PROTECTION_GOOD_STATUS,
    }
    const unrelated = snapshotUnrelated(state)
    const hydrated = hydrateGame({ ...state, facilityRestrictedObjectRelease: mixed })
    expect(hydrated.facilityRestrictedObjectRelease).toEqual({
      [RELIQUARY_KEY_SET_ID]: STORED_SNAPSHOT,
    })
    expectUnrelatedPreserved(hydrated, unrelated)

    const malformed = hydrateGame({
      ...state,
      facilityRestrictedObjectRelease: {
        [RELIQUARY_KEY_SET_ID]: {
          mode: 'active_use',
          components: [...RELIQUARY_KEY_SET_COMPONENT_IDS],
        },
      },
    })
    expect(malformed.facilityRestrictedObjectRelease).toBeUndefined()
  })

  it('round-trips through JSON hydration without replaying the authoring command', () => {
    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    state.facilityProtectionGoods = {
      respirator_filter: COUNTERFEIT_PROTECTION_GOOD_STATUS,
    }
    const unrelated = snapshotUnrelated(state)
    const stored = recordRestrictedObjectStored(state, COMPLETE)
    if (!stored.ok) throw new Error(stored.code)
    const inspected = transitionRestrictedObjectRelease(stored.state, {
      ...COMPLETE,
      mode: 'inspection',
    })
    if (!inspected.ok) throw new Error(inspected.code)

    const hydrated = hydrateGame(JSON.parse(JSON.stringify(inspected.state)))
    expect(hydrated.facilityRestrictedObjectRelease).toEqual({
      [RELIQUARY_KEY_SET_ID]: {
        mode: 'inspection',
        components: [...RELIQUARY_KEY_SET_COMPONENT_IDS],
      },
    })
    expectUnrelatedPreserved(hydrated, unrelated)
    expect(resolveRestrictedObjectRelease(hydrated, { setId: RELIQUARY_KEY_SET_ID })).toEqual({
      ok: true,
      state: hydrated,
      setId: RELIQUARY_KEY_SET_ID,
      mode: 'inspection',
      components: [...RELIQUARY_KEY_SET_COMPONENT_IDS],
    })
  })

  it('does not inherit restricted-object release from hydration fallback when omitted', () => {
    const starting = createStartingState()
    const fallback = {
      ...starting,
      facilityRestrictedObjectRelease: {
        [RELIQUARY_KEY_SET_ID]: STORED_SNAPSHOT,
      },
    }
    const hydrated = hydrateGame(starting, fallback)
    expect(hydrated.facilityRestrictedObjectRelease).toBeUndefined()
    expect(fallback.facilityRestrictedObjectRelease).toEqual({
      [RELIQUARY_KEY_SET_ID]: STORED_SNAPSHOT,
    })
  })

  it('leaves real spare-part consumption ungated when restricted-object release is omitted or present', () => {
    const omittedState = createStartingState()
    omittedState.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    expect(omittedState.facilityRestrictedObjectRelease).toBeUndefined()
    const omittedConsumed = consumeFacilityStock(omittedState, BLAST_DOOR_SPARE_PART_ID)
    expect(omittedConsumed).toMatchObject({ ok: true, remaining: 1 })
    if (!omittedConsumed.ok) throw new Error(omittedConsumed.code)
    expect(omittedConsumed.state.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 1 })
    expect(omittedConsumed.state.facilityRestrictedObjectRelease).toBeUndefined()
    expect(omittedState.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 2 })

    const presentState = createStartingState()
    presentState.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    const stored = recordRestrictedObjectStored(presentState, COMPLETE)
    if (!stored.ok) throw new Error(stored.code)
    const releaseBefore = structuredClone(stored.state.facilityRestrictedObjectRelease)
    const presentConsumed = consumeFacilityStock(stored.state, BLAST_DOOR_SPARE_PART_ID)
    expect(presentConsumed).toMatchObject({ ok: true, remaining: 1 })
    if (!presentConsumed.ok) throw new Error(presentConsumed.code)
    expect(presentConsumed.state.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 1 })
    expect(presentConsumed.state.facilityRestrictedObjectRelease).toEqual(releaseBefore)
    expect(stored.state.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 2 })
    expect(
      resolveRestrictedObjectRelease(presentConsumed.state, { setId: RELIQUARY_KEY_SET_ID })
    ).toMatchObject({
      ok: true,
      mode: 'stored',
    })
  })
})
