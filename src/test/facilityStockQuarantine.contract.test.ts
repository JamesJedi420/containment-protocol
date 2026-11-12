import { describe, expect, it } from 'vitest'
import { hydrateGame } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import { ANOMALOUS_RELIC_CONTENT_ID, RELIC_VAULT_NODE_ID } from '../domain/facilitySecuredNodes'
import {
  CLEAN_ISOLATION,
  CURSED_OBJECT_QUARANTINE_NODE_ID,
  parseFacilityStockQuarantine,
  QUARANTINED_ISOLATION,
  resolveFacilityQuarantineSeparation,
  stampFacilityQuarantine,
} from '../domain/facilityStockQuarantine'
import {
  COLD_STORAGE_REAGENT_STOCK_ID,
  MUNDANE_SUPPLIES_STOCK_ID,
} from '../domain/facilityStockSpoilage'
import { consumeFacilityStock } from '../domain/facilityStockpile'
import { BLAST_DOOR_SPARE_PART_ID } from '../domain/sparePartSuitability'

const QUARANTINED = {
  nodeId: CURSED_OBJECT_QUARANTINE_NODE_ID,
  isolation: QUARANTINED_ISOLATION,
} as const

const CLEAN = {
  nodeId: CURSED_OBJECT_QUARANTINE_NODE_ID,
  isolation: CLEAN_ISOLATION,
} as const

const QUARANTINED_SNAPSHOT = {
  [CURSED_OBJECT_QUARANTINE_NODE_ID]: QUARANTINED_ISOLATION,
} as const

const CLEAN_SNAPSHOT = {
  [CURSED_OBJECT_QUARANTINE_NODE_ID]: CLEAN_ISOLATION,
} as const

function withHiddenNodeId(isolation: string) {
  const input: Record<string, unknown> = { isolation }
  Object.defineProperty(input, 'nodeId', {
    value: CURSED_OBJECT_QUARANTINE_NODE_ID,
    enumerable: false,
    configurable: true,
  })
  return input
}

function withInheritedNodeId(isolation: string) {
  return Object.create({
    nodeId: CURSED_OBJECT_QUARANTINE_NODE_ID,
    isolation,
  }) as Record<string, unknown>
}

function withHiddenIsolation() {
  const input: Record<string, unknown> = { nodeId: CURSED_OBJECT_QUARANTINE_NODE_ID }
  Object.defineProperty(input, 'isolation', {
    value: QUARANTINED_ISOLATION,
    enumerable: false,
    configurable: true,
  })
  return input
}

function withInheritedIsolation() {
  return Object.assign(Object.create({ isolation: QUARANTINED_ISOLATION }), {
    nodeId: CURSED_OBJECT_QUARANTINE_NODE_ID,
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
  expect(actual.equipmentInstances).toEqual(unrelated.equipmentInstances)
}

describe('facility stock quarantine separation', () => {
  it('stamps authored isolation and resolves quarantined vs clean as distinct separated states', () => {
    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    state.facilityStockCondition = {
      [COLD_STORAGE_REAGENT_STOCK_ID]: 'degraded',
      [MUNDANE_SUPPLIES_STOCK_ID]: 'contaminated',
    }
    state.facilitySecuredNodes = {
      [RELIC_VAULT_NODE_ID]: ANOMALOUS_RELIC_CONTENT_ID,
    }
    const unrelated = snapshotUnrelated(state)

    const quarantined = stampFacilityQuarantine(state, QUARANTINED)
    expect(quarantined).toMatchObject({
      ok: true,
      nodeId: CURSED_OBJECT_QUARANTINE_NODE_ID,
      isolation: QUARANTINED_ISOLATION,
    })
    if (!quarantined.ok) throw new Error(quarantined.code)
    expect(quarantined.state).not.toBe(state)
    expect(quarantined.state.facilityStockQuarantine).toEqual(QUARANTINED_SNAPSHOT)
    expect(Object.isFrozen(quarantined.state.facilityStockQuarantine)).toBe(true)

    const quarantinedResolved = resolveFacilityQuarantineSeparation(quarantined.state, QUARANTINED)
    expect(quarantinedResolved).toEqual({
      ok: true,
      state: quarantined.state,
      nodeId: CURSED_OBJECT_QUARANTINE_NODE_ID,
      isolation: QUARANTINED_ISOLATION,
      separation: 'separated',
    })
    expect(quarantinedResolved.state).toBe(quarantined.state)

    const clean = stampFacilityQuarantine(state, CLEAN)
    expect(clean).toMatchObject({
      ok: true,
      nodeId: CURSED_OBJECT_QUARANTINE_NODE_ID,
      isolation: CLEAN_ISOLATION,
    })
    if (!clean.ok) throw new Error(clean.code)
    expect(clean.state.facilityStockQuarantine).toEqual(CLEAN_SNAPSHOT)
    expect(Object.isFrozen(clean.state.facilityStockQuarantine)).toBe(true)

    const cleanResolved = resolveFacilityQuarantineSeparation(clean.state, CLEAN)
    expect(cleanResolved).toEqual({
      ok: true,
      state: clean.state,
      nodeId: CURSED_OBJECT_QUARANTINE_NODE_ID,
      isolation: CLEAN_ISOLATION,
      separation: 'separated',
    })
    if (!quarantinedResolved.ok || !cleanResolved.ok) throw new Error('resolve failed')
    if (!('isolation' in quarantinedResolved) || !('isolation' in cleanResolved)) {
      throw new Error('expected persisted isolation')
    }
    expect(quarantinedResolved.isolation).not.toBe(cleanResolved.isolation)
    expect(quarantinedResolved.separation).toBe('separated')
    expect(cleanResolved.separation).toBe('separated')

    const omittedResolved = resolveFacilityQuarantineSeparation(state, QUARANTINED)
    expect(omittedResolved).toEqual({
      ok: true,
      state,
      nodeId: CURSED_OBJECT_QUARANTINE_NODE_ID,
      separation: 'unknown',
    })
    expect(omittedResolved).not.toMatchObject({ isolation: QUARANTINED_ISOLATION })
    expect(omittedResolved).not.toMatchObject({ isolation: CLEAN_ISOLATION })
    expect(omittedResolved).not.toMatchObject({ separation: 'separated' })
    expect(omittedResolved.state).toBe(state)

    expectUnrelatedPreserved(quarantined.state, unrelated)
    expectUnrelatedPreserved(clean.state, unrelated)
    expect(state.facilityStockQuarantine).toBeUndefined()
    expect(state.facilityStockpile).toEqual(unrelated.facilityStockpile)
    expect(state.facilityStockCondition).toEqual(unrelated.facilityStockCondition)
    expect(state.facilitySecuredNodes).toEqual(unrelated.facilitySecuredNodes)
  })

  it('resolves unknown baseline from omitted or empty state without writing or treating omit as mixed or clean', () => {
    const omitted = createStartingState()
    expect(omitted.facilityStockQuarantine).toBeUndefined()
    const omittedQuarantined = resolveFacilityQuarantineSeparation(omitted, QUARANTINED)
    expect(omittedQuarantined).toEqual({
      ok: true,
      state: omitted,
      nodeId: CURSED_OBJECT_QUARANTINE_NODE_ID,
      separation: 'unknown',
    })
    expect(omittedQuarantined.state).toBe(omitted)
    expect(omitted.facilityStockQuarantine).toBeUndefined()
    expect(omittedQuarantined).not.toMatchObject({ isolation: CLEAN_ISOLATION })
    expect(omittedQuarantined).not.toMatchObject({ code: 'mix_mismatch' })

    const omittedClean = resolveFacilityQuarantineSeparation(omitted, CLEAN)
    expect(omittedClean).toEqual({
      ok: true,
      state: omitted,
      nodeId: CURSED_OBJECT_QUARANTINE_NODE_ID,
      separation: 'unknown',
    })
    expect(omittedClean).not.toMatchObject({ isolation: QUARANTINED_ISOLATION })
    expect(omittedClean).not.toMatchObject({ separation: 'separated' })

    const empty = { ...createStartingState(), facilityStockQuarantine: {} }
    const emptyResult = resolveFacilityQuarantineSeparation(empty, QUARANTINED)
    expect(emptyResult).toEqual({
      ok: true,
      state: empty,
      nodeId: CURSED_OBJECT_QUARANTINE_NODE_ID,
      separation: 'unknown',
    })
    expect(emptyResult.state).toBe(empty)
    expect(empty.facilityStockQuarantine).toEqual({})
    expect(emptyResult).not.toMatchObject({ isolation: CLEAN_ISOLATION })
  })

  it('fail-closes mixing opposite isolations on stamp and resolve without mutating state', () => {
    const state = createStartingState()
    const quarantined = stampFacilityQuarantine(state, QUARANTINED)
    if (!quarantined.ok) throw new Error(quarantined.code)
    const beforeMix = structuredClone(quarantined.state)

    const stampedMix = stampFacilityQuarantine(quarantined.state, CLEAN)
    expect(stampedMix).toEqual({ ok: false, state: quarantined.state, code: 'mix_mismatch' })
    expect(stampedMix.state).toBe(quarantined.state)
    expect(quarantined.state).toEqual(beforeMix)

    const resolvedMix = resolveFacilityQuarantineSeparation(quarantined.state, CLEAN)
    expect(resolvedMix).toEqual({ ok: false, state: quarantined.state, code: 'mix_mismatch' })
    expect(resolvedMix.state).toBe(quarantined.state)
    expect(quarantined.state).toEqual(beforeMix)

    const clean = stampFacilityQuarantine(state, CLEAN)
    if (!clean.ok) throw new Error(clean.code)
    const reverseMix = resolveFacilityQuarantineSeparation(clean.state, QUARANTINED)
    expect(reverseMix).toEqual({ ok: false, state: clean.state, code: 'mix_mismatch' })
    expect(reverseMix.state).toBe(clean.state)
  })

  it('fail-closes unknown, raw, missing, inherited, and hidden node ids', () => {
    const state = createStartingState()
    const before = structuredClone(state)
    for (const input of [
      { nodeId: 'evidence_cage', isolation: QUARANTINED_ISOLATION },
      { isolation: QUARANTINED_ISOLATION },
      {},
      withInheritedNodeId(QUARANTINED_ISOLATION),
      withHiddenNodeId(QUARANTINED_ISOLATION),
      null,
      1,
      CURSED_OBJECT_QUARANTINE_NODE_ID,
    ] as const) {
      const stamped = stampFacilityQuarantine(state, input)
      expect(stamped).toEqual({ ok: false, state, code: 'invalid_node' })
      expect(stamped.state).toBe(state)
      expect(stamped.state).toEqual(before)

      const resolved = resolveFacilityQuarantineSeparation(state, input)
      expect(resolved).toEqual({ ok: false, state, code: 'invalid_node' })
      expect(resolved.state).toBe(state)
    }
  })

  it('fail-closes unknown, raw, missing, inherited, and hidden isolation ids', () => {
    const state = createStartingState()
    const before = structuredClone(state)
    for (const input of [
      { nodeId: CURSED_OBJECT_QUARANTINE_NODE_ID, isolation: 'mixed' },
      { nodeId: CURSED_OBJECT_QUARANTINE_NODE_ID, isolation: 'contaminated' },
      { nodeId: CURSED_OBJECT_QUARANTINE_NODE_ID },
      { nodeId: CURSED_OBJECT_QUARANTINE_NODE_ID, isolation: '' },
      { nodeId: CURSED_OBJECT_QUARANTINE_NODE_ID, isolation: 1 },
      withHiddenIsolation(),
      withInheritedIsolation(),
    ] as const) {
      const stamped = stampFacilityQuarantine(state, input)
      expect(stamped).toEqual({ ok: false, state, code: 'invalid_isolation' })
      expect(stamped.state).toBe(state)
      expect(stamped.state).toEqual(before)

      const resolved = resolveFacilityQuarantineSeparation(state, input)
      expect(resolved).toEqual({ ok: false, state, code: 'invalid_isolation' })
      expect(resolved.state).toBe(state)
    }
  })

  it('writes immutably and idempotently and freezes parser and writer snapshots', () => {
    const state = createStartingState()
    const first = stampFacilityQuarantine(state, QUARANTINED)
    const second = stampFacilityQuarantine(state, QUARANTINED)
    expect(first).toEqual(second)
    if (!first.ok) throw new Error(first.code)
    expect(first.state).not.toBe(state)
    expect(state.facilityStockQuarantine).toBeUndefined()
    expect(Object.isFrozen(first.state.facilityStockQuarantine)).toBe(true)

    const repeated = stampFacilityQuarantine(first.state, QUARANTINED)
    expect(repeated).toMatchObject({ ok: true, isolation: QUARANTINED_ISOLATION })
    if (!repeated.ok) throw new Error(repeated.code)
    expect(repeated.state.facilityStockQuarantine).toEqual(first.state.facilityStockQuarantine)

    const beforeResolve = structuredClone(first.state)
    const resolved = resolveFacilityQuarantineSeparation(first.state, QUARANTINED)
    expect(resolved.state).toBe(first.state)
    expect(first.state).toEqual(beforeResolve)

    const parsed = parseFacilityStockQuarantine(QUARANTINED_SNAPSHOT)
    expect(parsed).toEqual(QUARANTINED_SNAPSHOT)
    expect(Object.isFrozen(parsed)).toBe(true)
  })

  it('drops malformed, unknown, integer, prototype-unsafe, symbol, inherited, and hidden siblings', () => {
    expect(parseFacilityStockQuarantine(undefined)).toBeUndefined()
    expect(parseFacilityStockQuarantine({})).toBeUndefined()
    expect(parseFacilityStockQuarantine(null)).toBeUndefined()
    expect(parseFacilityStockQuarantine([])).toBeUndefined()

    for (const snapshot of [
      'mixed',
      'contaminated',
      1,
      null,
      { isolation: QUARANTINED_ISOLATION },
    ] as const) {
      expect(
        parseFacilityStockQuarantine({
          [CURSED_OBJECT_QUARANTINE_NODE_ID]: snapshot,
        })
      ).toBeUndefined()
    }

    const hiddenKnown: Record<string, unknown> = {}
    Object.defineProperty(hiddenKnown, CURSED_OBJECT_QUARANTINE_NODE_ID, {
      value: QUARANTINED_ISOLATION,
      enumerable: false,
      configurable: true,
    })
    expect(parseFacilityStockQuarantine(hiddenKnown)).toBeUndefined()

    const inheritedKnown = Object.create({
      [CURSED_OBJECT_QUARANTINE_NODE_ID]: QUARANTINED_ISOLATION,
    }) as Record<string, unknown>
    expect(parseFacilityStockQuarantine(inheritedKnown)).toBeUndefined()

    const mixed = Object.assign(
      Object.create({ inherited_sibling: QUARANTINED_ISOLATION }) as Record<PropertyKey, unknown>,
      {
        [CURSED_OBJECT_QUARANTINE_NODE_ID]: QUARANTINED_ISOLATION,
        mundane_supplies: CLEAN_ISOLATION,
        '0': QUARANTINED_ISOLATION,
        constructor: QUARANTINED_ISOLATION,
        ['__proto__']: QUARANTINED_ISOLATION,
        [Symbol('ignored')]: QUARANTINED_ISOLATION,
      }
    )
    Object.defineProperty(mixed, 'hidden_sibling', {
      value: QUARANTINED_ISOLATION,
      enumerable: false,
      configurable: true,
    })
    const parsed = parseFacilityStockQuarantine(mixed)
    expect(parsed).toEqual(QUARANTINED_SNAPSHOT)
    expect(Object.isFrozen(parsed)).toBe(true)

    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    state.facilityStockCondition = {
      [COLD_STORAGE_REAGENT_STOCK_ID]: 'degraded',
      [MUNDANE_SUPPLIES_STOCK_ID]: 'contaminated',
    }
    state.facilitySecuredNodes = {
      [RELIC_VAULT_NODE_ID]: ANOMALOUS_RELIC_CONTENT_ID,
    }
    const unrelated = snapshotUnrelated(state)
    const hydrated = hydrateGame({ ...state, facilityStockQuarantine: mixed })
    expect(hydrated.facilityStockQuarantine).toEqual(QUARANTINED_SNAPSHOT)
    expectUnrelatedPreserved(hydrated, unrelated)

    const malformed = hydrateGame({
      ...state,
      facilityStockQuarantine: {
        [CURSED_OBJECT_QUARANTINE_NODE_ID]: 'mixed',
      },
    })
    expect(malformed.facilityStockQuarantine).toBeUndefined()
  })

  it('round-trips through JSON hydration without replaying the authoring command', () => {
    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    state.facilityStockCondition = {
      [COLD_STORAGE_REAGENT_STOCK_ID]: 'degraded',
      [MUNDANE_SUPPLIES_STOCK_ID]: 'contaminated',
    }
    const unrelated = snapshotUnrelated(state)
    const stamped = stampFacilityQuarantine(state, QUARANTINED)
    if (!stamped.ok) throw new Error(stamped.code)

    const hydrated = hydrateGame(JSON.parse(JSON.stringify(stamped.state)))
    expect(hydrated.facilityStockQuarantine).toEqual(QUARANTINED_SNAPSHOT)
    expectUnrelatedPreserved(hydrated, unrelated)
    expect(resolveFacilityQuarantineSeparation(hydrated, QUARANTINED)).toEqual({
      ok: true,
      state: hydrated,
      nodeId: CURSED_OBJECT_QUARANTINE_NODE_ID,
      isolation: QUARANTINED_ISOLATION,
      separation: 'separated',
    })
  })

  it('does not inherit quarantine isolation from hydration fallback when omitted', () => {
    const starting = createStartingState()
    const fallback = {
      ...starting,
      facilityStockQuarantine: {
        [CURSED_OBJECT_QUARANTINE_NODE_ID]: QUARANTINED_ISOLATION,
      },
    }
    const hydrated = hydrateGame(starting, fallback)
    expect(hydrated.facilityStockQuarantine).toBeUndefined()
    expect(fallback.facilityStockQuarantine).toEqual(QUARANTINED_SNAPSHOT)
  })

  it('leaves real spare-part consumption ungated when quarantine isolation is omitted or present', () => {
    const omittedState = createStartingState()
    omittedState.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    expect(omittedState.facilityStockQuarantine).toBeUndefined()
    const omittedConsumed = consumeFacilityStock(omittedState, BLAST_DOOR_SPARE_PART_ID)
    expect(omittedConsumed).toMatchObject({ ok: true, remaining: 1 })
    if (!omittedConsumed.ok) throw new Error(omittedConsumed.code)
    expect(omittedConsumed.state.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 1 })
    expect(omittedConsumed.state.facilityStockQuarantine).toBeUndefined()
    expect(omittedState.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 2 })

    const presentState = createStartingState()
    presentState.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    presentState.facilityStockCondition = {
      [COLD_STORAGE_REAGENT_STOCK_ID]: 'degraded',
      [MUNDANE_SUPPLIES_STOCK_ID]: 'contaminated',
    }
    const stamped = stampFacilityQuarantine(presentState, QUARANTINED)
    if (!stamped.ok) throw new Error(stamped.code)
    const quarantineBefore = structuredClone(stamped.state.facilityStockQuarantine)
    const conditionBefore = structuredClone(stamped.state.facilityStockCondition)
    const presentConsumed = consumeFacilityStock(stamped.state, BLAST_DOOR_SPARE_PART_ID)
    expect(presentConsumed).toMatchObject({ ok: true, remaining: 1 })
    if (!presentConsumed.ok) throw new Error(presentConsumed.code)
    expect(presentConsumed.state.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 1 })
    expect(presentConsumed.state.facilityStockQuarantine).toEqual(quarantineBefore)
    expect(presentConsumed.state.facilityStockCondition).toEqual(conditionBefore)
    expect(stamped.state.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 2 })
    expect(resolveFacilityQuarantineSeparation(presentConsumed.state, QUARANTINED)).toMatchObject({
      ok: true,
      isolation: QUARANTINED_ISOLATION,
      separation: 'separated',
    })
  })
})
