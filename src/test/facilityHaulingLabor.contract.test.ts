import { describe, expect, it } from 'vitest'
import { hydrateGame } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import { CONTAINMENT_DANGER_ZONE_ID, SALT_CACHE_ID } from '../domain/facilityEmergencyCache'
import {
  BODY_TRANSFER_CARGO_ID,
  HANDLERS_AVAILABLE_LABOR,
  parseFacilityHaulingLabor,
  resolveFacilityHaulBottleneck,
  stampFacilityHaulingLabor,
} from '../domain/facilityHaulingLabor'
import { ANOMALOUS_RELIC_CONTENT_ID, RELIC_VAULT_NODE_ID } from '../domain/facilitySecuredNodes'
import {
  CLEAN_ISOLATION,
  CURSED_OBJECT_QUARANTINE_NODE_ID,
} from '../domain/facilityStockQuarantine'
import { consumeFacilityStock } from '../domain/facilityStockpile'
import { BLAST_DOOR_SPARE_PART_ID } from '../domain/sparePartSuitability'

const PRESENT = {
  cargoId: BODY_TRANSFER_CARGO_ID,
  labor: HANDLERS_AVAILABLE_LABOR,
} as const

const PRESENT_SNAPSHOT = {
  [BODY_TRANSFER_CARGO_ID]: HANDLERS_AVAILABLE_LABOR,
} as const

function withHiddenCargoId(labor: string) {
  const input: Record<string, unknown> = { labor }
  Object.defineProperty(input, 'cargoId', {
    value: BODY_TRANSFER_CARGO_ID,
    enumerable: false,
    configurable: true,
  })
  return input
}

function withInheritedCargoId(labor: string) {
  return Object.create({
    cargoId: BODY_TRANSFER_CARGO_ID,
    labor,
  }) as Record<string, unknown>
}

function withHiddenLabor() {
  const input: Record<string, unknown> = { cargoId: BODY_TRANSFER_CARGO_ID }
  Object.defineProperty(input, 'labor', {
    value: HANDLERS_AVAILABLE_LABOR,
    enumerable: false,
    configurable: true,
  })
  return input
}

function withInheritedLabor() {
  return Object.assign(Object.create({ labor: HANDLERS_AVAILABLE_LABOR }), {
    cargoId: BODY_TRANSFER_CARGO_ID,
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
  expect(actual.equipmentInstances).toEqual(unrelated.equipmentInstances)
}

describe('facility hauling labor bottleneck', () => {
  it('stamps authored handlers and resolves present labor as moved vs omit as bottlenecked', () => {
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
    const unrelated = snapshotUnrelated(state)

    const stamped = stampFacilityHaulingLabor(state, PRESENT)
    expect(stamped).toMatchObject({
      ok: true,
      cargoId: BODY_TRANSFER_CARGO_ID,
      labor: HANDLERS_AVAILABLE_LABOR,
    })
    if (!stamped.ok) throw new Error(stamped.code)
    expect(stamped.state).not.toBe(state)
    expect(stamped.state.facilityHaulingLabor).toEqual(PRESENT_SNAPSHOT)
    expect(Object.isFrozen(stamped.state.facilityHaulingLabor)).toBe(true)

    const moved = resolveFacilityHaulBottleneck(stamped.state, PRESENT)
    expect(moved).toEqual({
      ok: true,
      state: stamped.state,
      cargoId: BODY_TRANSFER_CARGO_ID,
      labor: HANDLERS_AVAILABLE_LABOR,
      outcome: 'moved',
    })
    expect(moved.state).toBe(stamped.state)

    const omitted = resolveFacilityHaulBottleneck(state, PRESENT)
    expect(omitted).toEqual({
      ok: true,
      state,
      cargoId: BODY_TRANSFER_CARGO_ID,
      outcome: 'bottlenecked',
    })
    expect(omitted).not.toMatchObject({ labor: HANDLERS_AVAILABLE_LABOR })
    expect(omitted).not.toMatchObject({ outcome: 'moved' })
    expect(omitted.state).toBe(state)

    expectUnrelatedPreserved(stamped.state, unrelated)
    expect(state.facilityHaulingLabor).toBeUndefined()
    expect(state.facilityStockpile).toEqual(unrelated.facilityStockpile)
    expect(state.facilityEmergencyCaches).toEqual(unrelated.facilityEmergencyCaches)
    expect(state.facilityStockQuarantine).toEqual(unrelated.facilityStockQuarantine)
    expect(state.facilitySecuredNodes).toEqual(unrelated.facilitySecuredNodes)
  })

  it('resolves bottlenecked from omitted or empty state without writing or treating omit as moved', () => {
    const omitted = createStartingState()
    expect(omitted.facilityHaulingLabor).toBeUndefined()
    const omittedResolved = resolveFacilityHaulBottleneck(omitted, PRESENT)
    expect(omittedResolved).toEqual({
      ok: true,
      state: omitted,
      cargoId: BODY_TRANSFER_CARGO_ID,
      outcome: 'bottlenecked',
    })
    expect(omittedResolved.state).toBe(omitted)
    expect(omitted.facilityHaulingLabor).toBeUndefined()
    expect(omittedResolved).not.toMatchObject({ labor: HANDLERS_AVAILABLE_LABOR })
    expect(omittedResolved).not.toMatchObject({ outcome: 'moved' })

    const empty = { ...createStartingState(), facilityHaulingLabor: {} }
    const emptyResult = resolveFacilityHaulBottleneck(empty, PRESENT)
    expect(emptyResult).toEqual({
      ok: true,
      state: empty,
      cargoId: BODY_TRANSFER_CARGO_ID,
      outcome: 'bottlenecked',
    })
    expect(emptyResult.state).toBe(empty)
    expect(empty.facilityHaulingLabor).toEqual({})
    expect(emptyResult).not.toMatchObject({ outcome: 'moved' })
  })

  it('fail-closes unknown, raw, missing, inherited, and hidden cargo ids', () => {
    const state = createStartingState()
    const before = structuredClone(state)
    for (const input of [
      { cargoId: 'evidence_haul', labor: HANDLERS_AVAILABLE_LABOR },
      { labor: HANDLERS_AVAILABLE_LABOR },
      {},
      withInheritedCargoId(HANDLERS_AVAILABLE_LABOR),
      withHiddenCargoId(HANDLERS_AVAILABLE_LABOR),
      null,
      1,
      BODY_TRANSFER_CARGO_ID,
    ] as const) {
      const stamped = stampFacilityHaulingLabor(state, input)
      expect(stamped).toEqual({ ok: false, state, code: 'invalid_cargo' })
      expect(stamped.state).toBe(state)
      expect(stamped.state).toEqual(before)

      const resolved = resolveFacilityHaulBottleneck(state, input)
      expect(resolved).toEqual({ ok: false, state, code: 'invalid_cargo' })
      expect(resolved.state).toBe(state)
    }
  })

  it('fail-closes unknown, raw, missing, inherited, and hidden labor ids', () => {
    const state = createStartingState()
    const before = structuredClone(state)
    for (const input of [
      { cargoId: BODY_TRANSFER_CARGO_ID, labor: 'teleport' },
      { cargoId: BODY_TRANSFER_CARGO_ID, labor: 'labor_short' },
      { cargoId: BODY_TRANSFER_CARGO_ID },
      { cargoId: BODY_TRANSFER_CARGO_ID, labor: '' },
      { cargoId: BODY_TRANSFER_CARGO_ID, labor: 1 },
      withHiddenLabor(),
      withInheritedLabor(),
    ] as const) {
      const stamped = stampFacilityHaulingLabor(state, input)
      expect(stamped).toEqual({ ok: false, state, code: 'invalid_labor' })
      expect(stamped.state).toBe(state)
      expect(stamped.state).toEqual(before)

      const resolved = resolveFacilityHaulBottleneck(state, input)
      expect(resolved).toEqual({ ok: false, state, code: 'invalid_labor' })
      expect(resolved.state).toBe(state)
    }
  })

  it('writes immutably and idempotently and freezes parser and writer snapshots', () => {
    const state = createStartingState()
    const first = stampFacilityHaulingLabor(state, PRESENT)
    const second = stampFacilityHaulingLabor(state, PRESENT)
    expect(first).toEqual(second)
    if (!first.ok) throw new Error(first.code)
    expect(first.state).not.toBe(state)
    expect(state.facilityHaulingLabor).toBeUndefined()
    expect(Object.isFrozen(first.state.facilityHaulingLabor)).toBe(true)

    const repeated = stampFacilityHaulingLabor(first.state, PRESENT)
    expect(repeated).toMatchObject({ ok: true, labor: HANDLERS_AVAILABLE_LABOR })
    if (!repeated.ok) throw new Error(repeated.code)
    expect(repeated.state.facilityHaulingLabor).toEqual(first.state.facilityHaulingLabor)

    const beforeResolve = structuredClone(first.state)
    const resolved = resolveFacilityHaulBottleneck(first.state, PRESENT)
    expect(resolved.state).toBe(first.state)
    expect(first.state).toEqual(beforeResolve)

    const parsed = parseFacilityHaulingLabor(PRESENT_SNAPSHOT)
    expect(parsed).toEqual(PRESENT_SNAPSHOT)
    expect(Object.isFrozen(parsed)).toBe(true)
  })

  it('drops malformed, unknown, integer, prototype-unsafe, symbol, inherited, and hidden siblings', () => {
    expect(parseFacilityHaulingLabor(undefined)).toBeUndefined()
    expect(parseFacilityHaulingLabor({})).toBeUndefined()
    expect(parseFacilityHaulingLabor(null)).toBeUndefined()
    expect(parseFacilityHaulingLabor([])).toBeUndefined()

    for (const snapshot of [
      'teleport',
      'labor_short',
      1,
      null,
      { labor: HANDLERS_AVAILABLE_LABOR },
    ] as const) {
      expect(
        parseFacilityHaulingLabor({
          [BODY_TRANSFER_CARGO_ID]: snapshot,
        })
      ).toBeUndefined()
    }

    const hiddenKnown: Record<string, unknown> = {}
    Object.defineProperty(hiddenKnown, BODY_TRANSFER_CARGO_ID, {
      value: HANDLERS_AVAILABLE_LABOR,
      enumerable: false,
      configurable: true,
    })
    expect(parseFacilityHaulingLabor(hiddenKnown)).toBeUndefined()

    const inheritedKnown = Object.create({
      [BODY_TRANSFER_CARGO_ID]: HANDLERS_AVAILABLE_LABOR,
    }) as Record<string, unknown>
    expect(parseFacilityHaulingLabor(inheritedKnown)).toBeUndefined()

    const mixed = Object.assign(
      Object.create({ inherited_sibling: HANDLERS_AVAILABLE_LABOR }) as Record<
        PropertyKey,
        unknown
      >,
      {
        [BODY_TRANSFER_CARGO_ID]: HANDLERS_AVAILABLE_LABOR,
        evidence_haul: HANDLERS_AVAILABLE_LABOR,
        '0': HANDLERS_AVAILABLE_LABOR,
        constructor: HANDLERS_AVAILABLE_LABOR,
        ['__proto__']: HANDLERS_AVAILABLE_LABOR,
        [Symbol('ignored')]: HANDLERS_AVAILABLE_LABOR,
      }
    )
    Object.defineProperty(mixed, 'hidden_sibling', {
      value: HANDLERS_AVAILABLE_LABOR,
      enumerable: false,
      configurable: true,
    })
    const parsed = parseFacilityHaulingLabor(mixed)
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
    const unrelated = snapshotUnrelated(state)
    const hydrated = hydrateGame({ ...state, facilityHaulingLabor: mixed })
    expect(hydrated.facilityHaulingLabor).toEqual(PRESENT_SNAPSHOT)
    expectUnrelatedPreserved(hydrated, unrelated)

    const malformed = hydrateGame({
      ...state,
      facilityHaulingLabor: {
        [BODY_TRANSFER_CARGO_ID]: 'teleport',
      },
    })
    expect(malformed.facilityHaulingLabor).toBeUndefined()
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
    const unrelated = snapshotUnrelated(state)
    const stamped = stampFacilityHaulingLabor(state, PRESENT)
    if (!stamped.ok) throw new Error(stamped.code)

    const hydrated = hydrateGame(JSON.parse(JSON.stringify(stamped.state)))
    expect(hydrated.facilityHaulingLabor).toEqual(PRESENT_SNAPSHOT)
    expectUnrelatedPreserved(hydrated, unrelated)
    expect(resolveFacilityHaulBottleneck(hydrated, PRESENT)).toEqual({
      ok: true,
      state: hydrated,
      cargoId: BODY_TRANSFER_CARGO_ID,
      labor: HANDLERS_AVAILABLE_LABOR,
      outcome: 'moved',
    })
  })

  it('does not inherit hauling labor from hydration fallback when omitted', () => {
    const starting = createStartingState()
    const fallback = {
      ...starting,
      facilityHaulingLabor: {
        [BODY_TRANSFER_CARGO_ID]: HANDLERS_AVAILABLE_LABOR,
      },
    }
    const hydrated = hydrateGame(starting, fallback)
    expect(hydrated.facilityHaulingLabor).toBeUndefined()
    expect(fallback.facilityHaulingLabor).toEqual(PRESENT_SNAPSHOT)
  })

  it('leaves real spare-part consumption ungated when hauling labor is omitted or present', () => {
    const omittedState = createStartingState()
    omittedState.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    expect(omittedState.facilityHaulingLabor).toBeUndefined()
    const omittedConsumed = consumeFacilityStock(omittedState, BLAST_DOOR_SPARE_PART_ID)
    expect(omittedConsumed).toMatchObject({ ok: true, remaining: 1 })
    if (!omittedConsumed.ok) throw new Error(omittedConsumed.code)
    expect(omittedConsumed.state.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 1 })
    expect(omittedConsumed.state.facilityHaulingLabor).toBeUndefined()
    expect(omittedState.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 2 })

    const presentState = createStartingState()
    presentState.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    presentState.facilityEmergencyCaches = {
      [SALT_CACHE_ID]: CONTAINMENT_DANGER_ZONE_ID,
    }
    presentState.facilityStockQuarantine = {
      [CURSED_OBJECT_QUARANTINE_NODE_ID]: CLEAN_ISOLATION,
    }
    const stamped = stampFacilityHaulingLabor(presentState, PRESENT)
    if (!stamped.ok) throw new Error(stamped.code)
    const haulingBefore = structuredClone(stamped.state.facilityHaulingLabor)
    const cachesBefore = structuredClone(stamped.state.facilityEmergencyCaches)
    const quarantineBefore = structuredClone(stamped.state.facilityStockQuarantine)
    const presentConsumed = consumeFacilityStock(stamped.state, BLAST_DOOR_SPARE_PART_ID)
    expect(presentConsumed).toMatchObject({ ok: true, remaining: 1 })
    if (!presentConsumed.ok) throw new Error(presentConsumed.code)
    expect(presentConsumed.state.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 1 })
    expect(presentConsumed.state.facilityHaulingLabor).toEqual(haulingBefore)
    expect(presentConsumed.state.facilityEmergencyCaches).toEqual(cachesBefore)
    expect(presentConsumed.state.facilityStockQuarantine).toEqual(quarantineBefore)
    expect(stamped.state.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 2 })
    expect(resolveFacilityHaulBottleneck(presentConsumed.state, PRESENT)).toMatchObject({
      ok: true,
      labor: HANDLERS_AVAILABLE_LABOR,
      outcome: 'moved',
    })
  })
})
