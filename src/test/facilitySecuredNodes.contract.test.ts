import { describe, expect, it } from 'vitest'
import { hydrateGame } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import {
  ANOMALOUS_RELIC_CONTENT_ID,
  MUNDANE_RECORDS_CONTENT_ID,
  parseFacilitySecuredNodes,
  RELIC_VAULT_NODE_ID,
  resolveSecuredNodeThreat,
  stampSecuredNodeContents,
} from '../domain/facilitySecuredNodes'
import { COUNTERFEIT_PROTECTION_GOOD_STATUS } from '../domain/facilityProtectionGoods'
import {
  RELIQUARY_KEY_SET_COMPONENT_IDS,
  RELIQUARY_KEY_SET_ID,
} from '../domain/facilityRestrictedObjectRelease'
import { consumeFacilityStock } from '../domain/facilityStockpile'
import { BLAST_DOOR_SPARE_PART_ID } from '../domain/sparePartSuitability'

const MUNDANE = {
  nodeId: RELIC_VAULT_NODE_ID,
  contentId: MUNDANE_RECORDS_CONTENT_ID,
} as const

const RELIC = {
  nodeId: RELIC_VAULT_NODE_ID,
  contentId: ANOMALOUS_RELIC_CONTENT_ID,
} as const

const STORED_RELIC_SNAPSHOT = {
  [RELIC_VAULT_NODE_ID]: ANOMALOUS_RELIC_CONTENT_ID,
} as const

const STORED_RESTRICTED_RELEASE = {
  [RELIQUARY_KEY_SET_ID]: {
    mode: 'stored' as const,
    components: [...RELIQUARY_KEY_SET_COMPONENT_IDS],
  },
}

function withHiddenNodeId(contentId: string) {
  const input: Record<string, unknown> = { contentId }
  Object.defineProperty(input, 'nodeId', {
    value: RELIC_VAULT_NODE_ID,
    enumerable: false,
    configurable: true,
  })
  return input
}

function withInheritedNodeId(contentId: string) {
  return Object.create({
    nodeId: RELIC_VAULT_NODE_ID,
    contentId,
  }) as Record<string, unknown>
}

function withHiddenContentId() {
  const input: Record<string, unknown> = { nodeId: RELIC_VAULT_NODE_ID }
  Object.defineProperty(input, 'contentId', {
    value: ANOMALOUS_RELIC_CONTENT_ID,
    enumerable: false,
    configurable: true,
  })
  return input
}

function withInheritedContentId() {
  return Object.assign(Object.create({ contentId: ANOMALOUS_RELIC_CONTENT_ID }), {
    nodeId: RELIC_VAULT_NODE_ID,
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
  expect(actual.equipmentInstances).toEqual(unrelated.equipmentInstances)
}

describe('facility secured-node stored-content threat', () => {
  it('stamps authored contents and resolves elevated vs mundane vs omit as distinct bands', () => {
    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    state.facilityProtectionGoods = {
      respirator_filter: COUNTERFEIT_PROTECTION_GOOD_STATUS,
    }
    state.facilityRestrictedObjectRelease = structuredClone(STORED_RESTRICTED_RELEASE)
    const unrelated = snapshotUnrelated(state)

    const mundane = stampSecuredNodeContents(state, MUNDANE)
    expect(mundane).toMatchObject({
      ok: true,
      nodeId: RELIC_VAULT_NODE_ID,
      contentId: MUNDANE_RECORDS_CONTENT_ID,
    })
    if (!mundane.ok) throw new Error(mundane.code)
    expect(mundane.state).not.toBe(state)
    expect(mundane.state.facilitySecuredNodes).toEqual({
      [RELIC_VAULT_NODE_ID]: MUNDANE_RECORDS_CONTENT_ID,
    })
    expect(Object.isFrozen(mundane.state.facilitySecuredNodes)).toBe(true)

    const mundaneResolved = resolveSecuredNodeThreat(mundane.state, {
      nodeId: RELIC_VAULT_NODE_ID,
    })
    expect(mundaneResolved).toEqual({
      ok: true,
      state: mundane.state,
      nodeId: RELIC_VAULT_NODE_ID,
      contentId: MUNDANE_RECORDS_CONTENT_ID,
      threatAttraction: 'low',
      theftExposure: 'low',
      accessRisk: 'low',
    })
    expect(mundaneResolved.state).toBe(mundane.state)

    const relic = stampSecuredNodeContents(state, RELIC)
    expect(relic).toMatchObject({
      ok: true,
      nodeId: RELIC_VAULT_NODE_ID,
      contentId: ANOMALOUS_RELIC_CONTENT_ID,
    })
    if (!relic.ok) throw new Error(relic.code)
    expect(relic.state.facilitySecuredNodes).toEqual(STORED_RELIC_SNAPSHOT)
    expect(Object.isFrozen(relic.state.facilitySecuredNodes)).toBe(true)

    const relicResolved = resolveSecuredNodeThreat(relic.state, {
      nodeId: RELIC_VAULT_NODE_ID,
    })
    expect(relicResolved).toEqual({
      ok: true,
      state: relic.state,
      nodeId: RELIC_VAULT_NODE_ID,
      contentId: ANOMALOUS_RELIC_CONTENT_ID,
      threatAttraction: 'elevated',
      theftExposure: 'elevated',
      accessRisk: 'elevated',
    })
    expect(relicResolved).not.toMatchObject({ threatAttraction: 'low' })
    expect(relicResolved).not.toMatchObject({ threatAttraction: 'unknown' })
    if (!mundaneResolved.ok || !relicResolved.ok) throw new Error('resolve failed')
    if (!('contentId' in mundaneResolved) || !('contentId' in relicResolved)) {
      throw new Error('expected persisted content')
    }
    expect(mundaneResolved.threatAttraction).not.toBe(relicResolved.threatAttraction)
    expect(mundaneResolved.theftExposure).not.toBe(relicResolved.theftExposure)
    expect(mundaneResolved.accessRisk).not.toBe(relicResolved.accessRisk)

    const omittedResolved = resolveSecuredNodeThreat(state, { nodeId: RELIC_VAULT_NODE_ID })
    expect(omittedResolved).toEqual({
      ok: true,
      state,
      nodeId: RELIC_VAULT_NODE_ID,
      threatAttraction: 'unknown',
      theftExposure: 'unknown',
      accessRisk: 'unknown',
    })
    expect(omittedResolved).not.toMatchObject({ threatAttraction: 'elevated' })
    expect(omittedResolved).not.toMatchObject({ threatAttraction: 'low' })
    expect(omittedResolved.state).toBe(state)

    expectUnrelatedPreserved(mundane.state, unrelated)
    expectUnrelatedPreserved(relic.state, unrelated)
    expect(state.facilitySecuredNodes).toBeUndefined()
    expect(state.facilityStockpile).toEqual(unrelated.facilityStockpile)
    expect(state.facilityProtectionGoods).toEqual(unrelated.facilityProtectionGoods)
    expect(state.facilityRestrictedObjectRelease).toEqual(unrelated.facilityRestrictedObjectRelease)
  })

  it('resolves unknown baseline from omitted or empty state without writing', () => {
    const omitted = createStartingState()
    expect(omitted.facilitySecuredNodes).toBeUndefined()
    const omittedResult = resolveSecuredNodeThreat(omitted, { nodeId: RELIC_VAULT_NODE_ID })
    expect(omittedResult).toEqual({
      ok: true,
      state: omitted,
      nodeId: RELIC_VAULT_NODE_ID,
      threatAttraction: 'unknown',
      theftExposure: 'unknown',
      accessRisk: 'unknown',
    })
    expect(omittedResult.state).toBe(omitted)
    expect(omitted.facilitySecuredNodes).toBeUndefined()
    expect(omittedResult).not.toMatchObject({ threatAttraction: 'elevated' })
    expect(omittedResult).not.toMatchObject({ contentId: MUNDANE_RECORDS_CONTENT_ID })

    const empty = { ...createStartingState(), facilitySecuredNodes: {} }
    const emptyResult = resolveSecuredNodeThreat(empty, { nodeId: RELIC_VAULT_NODE_ID })
    expect(emptyResult).toEqual({
      ok: true,
      state: empty,
      nodeId: RELIC_VAULT_NODE_ID,
      threatAttraction: 'unknown',
      theftExposure: 'unknown',
      accessRisk: 'unknown',
    })
    expect(emptyResult.state).toBe(empty)
    expect(empty.facilitySecuredNodes).toEqual({})
    expect(emptyResult).not.toMatchObject({ threatAttraction: 'low' })
  })

  it('fail-closes unknown, raw, missing, inherited, and hidden node ids', () => {
    const state = createStartingState()
    const before = structuredClone(state)
    for (const input of [
      { nodeId: 'evidence_cage', contentId: ANOMALOUS_RELIC_CONTENT_ID },
      { contentId: ANOMALOUS_RELIC_CONTENT_ID },
      {},
      withInheritedNodeId(ANOMALOUS_RELIC_CONTENT_ID),
      withHiddenNodeId(ANOMALOUS_RELIC_CONTENT_ID),
      null,
      1,
      RELIC_VAULT_NODE_ID,
    ] as const) {
      const stamped = stampSecuredNodeContents(state, input)
      expect(stamped).toEqual({ ok: false, state, code: 'invalid_node' })
      expect(stamped.state).toBe(state)
      expect(stamped.state).toEqual(before)

      const resolved = resolveSecuredNodeThreat(state, input)
      expect(resolved).toEqual({ ok: false, state, code: 'invalid_node' })
      expect(resolved.state).toBe(state)
    }
  })

  it('fail-closes unknown, raw, missing, inherited, and hidden content ids', () => {
    const state = createStartingState()
    const before = structuredClone(state)
    for (const input of [
      { nodeId: RELIC_VAULT_NODE_ID, contentId: 'cursed_amulet' },
      { nodeId: RELIC_VAULT_NODE_ID, contentId: BLAST_DOOR_SPARE_PART_ID },
      { nodeId: RELIC_VAULT_NODE_ID },
      { nodeId: RELIC_VAULT_NODE_ID, contentId: '' },
      { nodeId: RELIC_VAULT_NODE_ID, contentId: 1 },
      withHiddenContentId(),
      withInheritedContentId(),
    ] as const) {
      const stamped = stampSecuredNodeContents(state, input)
      expect(stamped).toEqual({ ok: false, state, code: 'invalid_content' })
      expect(stamped.state).toBe(state)
      expect(stamped.state).toEqual(before)
    }
  })

  it('writes immutably and idempotently and freezes parser and writer snapshots', () => {
    const state = createStartingState()
    const first = stampSecuredNodeContents(state, RELIC)
    const second = stampSecuredNodeContents(state, RELIC)
    expect(first).toEqual(second)
    if (!first.ok) throw new Error(first.code)
    expect(first.state).not.toBe(state)
    expect(state.facilitySecuredNodes).toBeUndefined()
    expect(Object.isFrozen(first.state.facilitySecuredNodes)).toBe(true)

    const repeated = stampSecuredNodeContents(first.state, RELIC)
    expect(repeated).toMatchObject({ ok: true, contentId: ANOMALOUS_RELIC_CONTENT_ID })
    if (!repeated.ok) throw new Error(repeated.code)
    expect(repeated.state.facilitySecuredNodes).toEqual(first.state.facilitySecuredNodes)

    const beforeResolve = structuredClone(first.state)
    const resolved = resolveSecuredNodeThreat(first.state, { nodeId: RELIC_VAULT_NODE_ID })
    expect(resolved.state).toBe(first.state)
    expect(first.state).toEqual(beforeResolve)

    const parsed = parseFacilitySecuredNodes(STORED_RELIC_SNAPSHOT)
    expect(parsed).toEqual(STORED_RELIC_SNAPSHOT)
    expect(Object.isFrozen(parsed)).toBe(true)
  })

  it('drops malformed, unknown, integer, prototype-unsafe, symbol, inherited, and hidden siblings', () => {
    expect(parseFacilitySecuredNodes(undefined)).toBeUndefined()
    expect(parseFacilitySecuredNodes({})).toBeUndefined()
    expect(parseFacilitySecuredNodes(null)).toBeUndefined()
    expect(parseFacilitySecuredNodes([])).toBeUndefined()

    for (const snapshot of [
      'active_use',
      'stored',
      1,
      null,
      { contentId: ANOMALOUS_RELIC_CONTENT_ID },
    ] as const) {
      expect(
        parseFacilitySecuredNodes({
          [RELIC_VAULT_NODE_ID]: snapshot,
        })
      ).toBeUndefined()
    }

    const hiddenKnown: Record<string, unknown> = {}
    Object.defineProperty(hiddenKnown, RELIC_VAULT_NODE_ID, {
      value: ANOMALOUS_RELIC_CONTENT_ID,
      enumerable: false,
      configurable: true,
    })
    expect(parseFacilitySecuredNodes(hiddenKnown)).toBeUndefined()

    const inheritedKnown = Object.create({
      [RELIC_VAULT_NODE_ID]: ANOMALOUS_RELIC_CONTENT_ID,
    }) as Record<string, unknown>
    expect(parseFacilitySecuredNodes(inheritedKnown)).toBeUndefined()

    const mixed = Object.assign(
      Object.create({ inherited_sibling: ANOMALOUS_RELIC_CONTENT_ID }) as Record<
        PropertyKey,
        unknown
      >,
      {
        [RELIC_VAULT_NODE_ID]: ANOMALOUS_RELIC_CONTENT_ID,
        cursed_amulet: ANOMALOUS_RELIC_CONTENT_ID,
        '0': ANOMALOUS_RELIC_CONTENT_ID,
        constructor: ANOMALOUS_RELIC_CONTENT_ID,
        ['__proto__']: ANOMALOUS_RELIC_CONTENT_ID,
        [Symbol('ignored')]: ANOMALOUS_RELIC_CONTENT_ID,
      }
    )
    Object.defineProperty(mixed, 'hidden_sibling', {
      value: ANOMALOUS_RELIC_CONTENT_ID,
      enumerable: false,
      configurable: true,
    })
    const parsed = parseFacilitySecuredNodes(mixed)
    expect(parsed).toEqual(STORED_RELIC_SNAPSHOT)
    expect(Object.isFrozen(parsed)).toBe(true)

    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    state.facilityProtectionGoods = {
      respirator_filter: COUNTERFEIT_PROTECTION_GOOD_STATUS,
    }
    state.facilityRestrictedObjectRelease = structuredClone(STORED_RESTRICTED_RELEASE)
    const unrelated = snapshotUnrelated(state)
    const hydrated = hydrateGame({ ...state, facilitySecuredNodes: mixed })
    expect(hydrated.facilitySecuredNodes).toEqual(STORED_RELIC_SNAPSHOT)
    expectUnrelatedPreserved(hydrated, unrelated)

    const malformed = hydrateGame({
      ...state,
      facilitySecuredNodes: {
        [RELIC_VAULT_NODE_ID]: 'cursed_amulet',
      },
    })
    expect(malformed.facilitySecuredNodes).toBeUndefined()
  })

  it('round-trips through JSON hydration without replaying the authoring command', () => {
    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    state.facilityProtectionGoods = {
      respirator_filter: COUNTERFEIT_PROTECTION_GOOD_STATUS,
    }
    state.facilityRestrictedObjectRelease = structuredClone(STORED_RESTRICTED_RELEASE)
    const unrelated = snapshotUnrelated(state)
    const stamped = stampSecuredNodeContents(state, RELIC)
    if (!stamped.ok) throw new Error(stamped.code)

    const hydrated = hydrateGame(JSON.parse(JSON.stringify(stamped.state)))
    expect(hydrated.facilitySecuredNodes).toEqual(STORED_RELIC_SNAPSHOT)
    expectUnrelatedPreserved(hydrated, unrelated)
    expect(resolveSecuredNodeThreat(hydrated, { nodeId: RELIC_VAULT_NODE_ID })).toEqual({
      ok: true,
      state: hydrated,
      nodeId: RELIC_VAULT_NODE_ID,
      contentId: ANOMALOUS_RELIC_CONTENT_ID,
      threatAttraction: 'elevated',
      theftExposure: 'elevated',
      accessRisk: 'elevated',
    })
  })

  it('does not inherit secured-node contents from hydration fallback when omitted', () => {
    const starting = createStartingState()
    const fallback = {
      ...starting,
      facilitySecuredNodes: {
        [RELIC_VAULT_NODE_ID]: ANOMALOUS_RELIC_CONTENT_ID,
      },
    }
    const hydrated = hydrateGame(starting, fallback)
    expect(hydrated.facilitySecuredNodes).toBeUndefined()
    expect(fallback.facilitySecuredNodes).toEqual(STORED_RELIC_SNAPSHOT)
  })

  it('leaves real spare-part consumption ungated when secured-node contents are omitted or present', () => {
    const omittedState = createStartingState()
    omittedState.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    expect(omittedState.facilitySecuredNodes).toBeUndefined()
    const omittedConsumed = consumeFacilityStock(omittedState, BLAST_DOOR_SPARE_PART_ID)
    expect(omittedConsumed).toMatchObject({ ok: true, remaining: 1 })
    if (!omittedConsumed.ok) throw new Error(omittedConsumed.code)
    expect(omittedConsumed.state.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 1 })
    expect(omittedConsumed.state.facilitySecuredNodes).toBeUndefined()
    expect(omittedState.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 2 })

    const presentState = createStartingState()
    presentState.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    presentState.facilityProtectionGoods = {
      respirator_filter: COUNTERFEIT_PROTECTION_GOOD_STATUS,
    }
    presentState.facilityRestrictedObjectRelease = structuredClone(STORED_RESTRICTED_RELEASE)
    const stamped = stampSecuredNodeContents(presentState, RELIC)
    if (!stamped.ok) throw new Error(stamped.code)
    const nodesBefore = structuredClone(stamped.state.facilitySecuredNodes)
    const releaseBefore = structuredClone(stamped.state.facilityRestrictedObjectRelease)
    const goodsBefore = structuredClone(stamped.state.facilityProtectionGoods)
    const presentConsumed = consumeFacilityStock(stamped.state, BLAST_DOOR_SPARE_PART_ID)
    expect(presentConsumed).toMatchObject({ ok: true, remaining: 1 })
    if (!presentConsumed.ok) throw new Error(presentConsumed.code)
    expect(presentConsumed.state.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 1 })
    expect(presentConsumed.state.facilitySecuredNodes).toEqual(nodesBefore)
    expect(presentConsumed.state.facilityRestrictedObjectRelease).toEqual(releaseBefore)
    expect(presentConsumed.state.facilityProtectionGoods).toEqual(goodsBefore)
    expect(stamped.state.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 2 })
    expect(
      resolveSecuredNodeThreat(presentConsumed.state, { nodeId: RELIC_VAULT_NODE_ID })
    ).toMatchObject({
      ok: true,
      threatAttraction: 'elevated',
    })
  })
})
