import { describe, expect, it } from 'vitest'
import { hydrateGame } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import {
  FACILITY_SALT_STOCK_ID,
  parseFacilityStockPreparedness,
  resolveFacilityStockoutPressure,
  stampFacilityStockPreparedness,
} from '../domain/facilityStockPreparedness'
import { consumeFacilityStock } from '../domain/facilityStockpile'
import { BLAST_DOOR_SPARE_PART_ID } from '../domain/sparePartSuitability'

type SnapshotInput = {
  quantity: unknown
  reserve: unknown
  recentOutflow: unknown
}

type SnapshotField = keyof SnapshotInput

const FACILITY_SALT = { stockId: FACILITY_SALT_STOCK_ID } as const
const SNAPSHOT_FIELDS = ['quantity', 'reserve', 'recentOutflow'] as const

const PREPARED_SNAPSHOT = {
  quantity: 4,
  reserve: 4,
  recentOutflow: 0,
} as const

const STOCKOUT_BY_RESERVE_SNAPSHOT = {
  quantity: 4,
  reserve: 5,
  recentOutflow: 0,
} as const

const MAX_SAFE_PREPARED_SNAPSHOT = {
  quantity: Number.MAX_SAFE_INTEGER,
  reserve: Number.MAX_SAFE_INTEGER,
  recentOutflow: Number.MAX_SAFE_INTEGER - 1,
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
  return { ...FACILITY_SALT, ...snapshot }
}

function withHiddenStockId(snapshot: SnapshotInput) {
  const input = { ...snapshot } as Record<string, unknown>
  Object.defineProperty(input, 'stockId', {
    value: FACILITY_SALT_STOCK_ID,
    enumerable: false,
    configurable: true,
  })
  return input
}

function withInheritedStockId(snapshot: SnapshotInput) {
  return Object.assign(
    Object.create({ stockId: FACILITY_SALT_STOCK_ID }) as Record<string, unknown>,
    snapshot
  )
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
    equipmentInstances: structuredClone(state.equipmentInstances),
  }
}

function snapshotWith(
  field: SnapshotField,
  value: unknown,
  base: SnapshotInput = PREPARED_SNAPSHOT
): SnapshotInput {
  return { ...base, [field]: value }
}

describe('facility stock preparedness and stockout pressure', () => {
  it('stamps facility_salt preparedness and resolves prepared without touching unrelated stock', () => {
    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    const unrelated = snapshotUnrelated(state)
    const stamped = stampFacilityStockPreparedness(state, inputFor(PREPARED_SNAPSHOT))
    expect(stamped).toMatchObject({
      ok: true,
      stockId: FACILITY_SALT_STOCK_ID,
      snapshot: PREPARED_SNAPSHOT,
    })
    if (!stamped.ok) throw new Error(stamped.code)
    expect(stamped.state).not.toBe(state)
    expect(stamped.state.facilityStockPreparedness).toEqual({
      [FACILITY_SALT_STOCK_ID]: PREPARED_SNAPSHOT,
    })
    expect(Object.isFrozen(stamped.state.facilityStockPreparedness)).toBe(true)
    expect(Object.isFrozen(stamped.state.facilityStockPreparedness?.[FACILITY_SALT_STOCK_ID])).toBe(
      true
    )
    expect(Object.isFrozen(stamped.snapshot)).toBe(true)

    const beforeResolve = structuredClone(stamped.state)
    const result = resolveFacilityStockoutPressure(stamped.state, FACILITY_SALT)
    expect(result).toEqual({
      ok: true,
      state: stamped.state,
      pressure: 'prepared',
      stockId: FACILITY_SALT_STOCK_ID,
      snapshot: PREPARED_SNAPSHOT,
    })
    expect(result.state).toBe(stamped.state)
    expect(stamped.state).toEqual(beforeResolve)
    expect(stamped.state.inventory).toEqual(unrelated.inventory)
    expect(stamped.state.facilityStockpile).toEqual(unrelated.facilityStockpile)
    expect(stamped.state.departmentLocalStaging).toEqual(unrelated.departmentLocalStaging)
    expect(stamped.state.facilityStockPlacement).toEqual(unrelated.facilityStockPlacement)
    expect(stamped.state.facilityStockCondition).toEqual(unrelated.facilityStockCondition)
    expect(stamped.state.facilityEmergencyCaches).toEqual(unrelated.facilityEmergencyCaches)
    expect(stamped.state.facilityStockOverflow).toEqual(unrelated.facilityStockOverflow)
    expect(stamped.state.equipmentInstances).toEqual(unrelated.equipmentInstances)
    expect(state.facilityStockPreparedness).toBeUndefined()
    expect(state.facilityStockpile).toEqual(unrelated.facilityStockpile)
  })

  it('uses reserve and recent outflow rather than raw quantity alone, including equality and zero', () => {
    const resolveSnapshot = (snapshot: SnapshotInput) => {
      const state = createStartingState()
      const stamped = stampFacilityStockPreparedness(state, inputFor(snapshot))
      expect(stamped).toMatchObject({ ok: true, snapshot })
      if (!stamped.ok) throw new Error(stamped.code)
      const result = resolveFacilityStockoutPressure(stamped.state, FACILITY_SALT)
      expect(result.state).toBe(stamped.state)
      return result
    }

    expect(resolveSnapshot({ quantity: 4, reserve: 4, recentOutflow: 0 })).toMatchObject({
      ok: true,
      pressure: 'prepared',
    })
    expect(resolveSnapshot({ quantity: 4, reserve: 5, recentOutflow: 0 })).toMatchObject({
      ok: true,
      pressure: 'stockout',
    })
    expect(resolveSnapshot({ quantity: 4, reserve: 0, recentOutflow: 3 })).toMatchObject({
      ok: true,
      pressure: 'prepared',
    })
    expect(resolveSnapshot({ quantity: 4, reserve: 0, recentOutflow: 4 })).toMatchObject({
      ok: true,
      pressure: 'stockout',
    })
    expect(resolveSnapshot({ quantity: 0, reserve: 0, recentOutflow: 0 })).toMatchObject({
      ok: true,
      pressure: 'stockout',
      snapshot: { quantity: 0, reserve: 0, recentOutflow: 0 },
    })
    expect(resolveSnapshot(MAX_SAFE_PREPARED_SNAPSHOT)).toMatchObject({
      ok: true,
      pressure: 'prepared',
      snapshot: MAX_SAFE_PREPARED_SNAPSHOT,
    })
  })

  it('resolves unknown from omitted or absent preparedness without writing state', () => {
    const omitted = createStartingState()
    expect(omitted.facilityStockPreparedness).toBeUndefined()
    const omittedResult = resolveFacilityStockoutPressure(omitted, FACILITY_SALT)
    expect(omittedResult).toEqual({
      ok: true,
      state: omitted,
      pressure: 'unknown',
      stockId: FACILITY_SALT_STOCK_ID,
    })
    expect(omittedResult.state).toBe(omitted)
    expect(omitted.facilityStockPreparedness).toBeUndefined()

    const absent = { ...createStartingState(), facilityStockPreparedness: {} }
    const absentResult = resolveFacilityStockoutPressure(absent, FACILITY_SALT)
    expect(absentResult).toEqual({
      ok: true,
      state: absent,
      pressure: 'unknown',
      stockId: FACILITY_SALT_STOCK_ID,
    })
    expect(absentResult.state).toBe(absent)
    expect(absent.facilityStockPreparedness).toEqual({})
  })

  it('fail-closes unknown or malformed stock on stamp without writing preparedness', () => {
    const state = createStartingState()
    const before = structuredClone(state)
    for (const input of [
      { ...inputFor(PREPARED_SNAPSHOT), stockId: 'salt_cache' },
      { ...inputFor(PREPARED_SNAPSHOT), stockId: 'evidence_cage' },
      { ...inputFor(PREPARED_SNAPSHOT), stockId: BLAST_DOOR_SPARE_PART_ID },
      PREPARED_SNAPSHOT,
      withHiddenStockId(PREPARED_SNAPSHOT),
      withInheritedStockId(PREPARED_SNAPSHOT),
      null,
      1,
      FACILITY_SALT_STOCK_ID,
    ] as const) {
      const result = stampFacilityStockPreparedness(state, input)
      expect(result).toEqual({ ok: false, state, code: 'invalid_stock' })
      expect(result.state).toBe(state)
      expect(result.state).toEqual(before)
    }
  })

  it('fail-closes missing, negative, non-integer, non-finite, or unsafe snapshot fields', () => {
    const state = createStartingState()
    const before = structuredClone(state)

    for (const field of SNAPSHOT_FIELDS) {
      for (const value of INVALID_SNAPSHOT_VALUES) {
        const result = stampFacilityStockPreparedness(state, inputFor(snapshotWith(field, value)))
        expect(result).toEqual({ ok: false, state, code: 'invalid_snapshot' })
        expect(result.state).toBe(state)
        expect(result.state).toEqual(before)
      }

      const missing = { ...inputFor(PREPARED_SNAPSHOT) } as Record<string, unknown>
      delete missing[field]
      const missingResult = stampFacilityStockPreparedness(state, missing)
      expect(missingResult).toEqual({ ok: false, state, code: 'invalid_snapshot' })
      expect(missingResult.state).toBe(state)
      expect(missingResult.state).toEqual(before)

      const hidden = { ...inputFor(PREPARED_SNAPSHOT) } as Record<string, unknown>
      Object.defineProperty(hidden, field, {
        value: PREPARED_SNAPSHOT[field],
        enumerable: false,
        configurable: true,
      })
      const hiddenResult = stampFacilityStockPreparedness(state, hidden)
      expect(hiddenResult).toEqual({ ok: false, state, code: 'invalid_snapshot' })
      expect(hiddenResult.state).toBe(state)
      expect(hiddenResult.state).toEqual(before)

      const inheritedBase = { ...inputFor(PREPARED_SNAPSHOT) } as Record<string, unknown>
      delete inheritedBase[field]
      const inherited = Object.assign(
        Object.create({ [field]: PREPARED_SNAPSHOT[field] }) as Record<string, unknown>,
        inheritedBase
      )
      const inheritedResult = stampFacilityStockPreparedness(state, inherited)
      expect(inheritedResult).toEqual({ ok: false, state, code: 'invalid_snapshot' })
      expect(inheritedResult.state).toBe(state)
      expect(inheritedResult.state).toEqual(before)
    }
  })

  it('fail-closes unknown or malformed stock on resolve without writing preparedness', () => {
    const state = createStartingState()
    const stamped = stampFacilityStockPreparedness(state, inputFor(PREPARED_SNAPSHOT))
    if (!stamped.ok) throw new Error(stamped.code)
    const before = structuredClone(stamped.state)

    for (const input of [
      { stockId: 'salt_cache' },
      { stockId: 'evidence_cage' },
      { stockId: BLAST_DOOR_SPARE_PART_ID },
      {},
      withHiddenStockId(PREPARED_SNAPSHOT),
      withInheritedStockId(PREPARED_SNAPSHOT),
      null,
      1,
      FACILITY_SALT_STOCK_ID,
    ] as const) {
      const result = resolveFacilityStockoutPressure(stamped.state, input)
      expect(result).toEqual({ ok: false, state: stamped.state, code: 'invalid_stock' })
      expect(result.state).toBe(stamped.state)
      expect(result.state).toEqual(before)
    }
  })

  it('is immutable: same stamp twice matches and hydration does not re-run stamp or resolve', () => {
    const state = createStartingState()
    const input = inputFor(STOCKOUT_BY_RESERVE_SNAPSHOT)
    const first = stampFacilityStockPreparedness(state, input)
    const second = stampFacilityStockPreparedness(state, input)
    expect(first).toEqual(second)
    if (!first.ok) throw new Error(first.code)
    expect(state.facilityStockPreparedness).toBeUndefined()

    const hydrated = hydrateGame(JSON.parse(JSON.stringify(first.state)))
    expect(hydrated.facilityStockPreparedness).toEqual({
      [FACILITY_SALT_STOCK_ID]: STOCKOUT_BY_RESERVE_SNAPSHOT,
    })
    const resolved = resolveFacilityStockoutPressure(hydrated, FACILITY_SALT)
    expect(resolved).toEqual({
      ok: true,
      state: hydrated,
      pressure: 'stockout',
      stockId: FACILITY_SALT_STOCK_ID,
      snapshot: STOCKOUT_BY_RESERVE_SNAPSHOT,
    })
    expect(resolved.state).toBe(hydrated)
    if (!resolved.ok || resolved.pressure === 'unknown') throw new Error('expected stockout')
    expect(Object.isFrozen(resolved.snapshot)).toBe(true)
  })

  it('drops malformed, non-enumerable, inherited, integer, and prototype-unsafe siblings independently', () => {
    expect(parseFacilityStockPreparedness(undefined)).toBeUndefined()
    expect(parseFacilityStockPreparedness({})).toBeUndefined()
    expect(parseFacilityStockPreparedness(null)).toBeUndefined()
    expect(parseFacilityStockPreparedness([])).toBeUndefined()

    for (const field of SNAPSHOT_FIELDS) {
      for (const value of INVALID_SNAPSHOT_VALUES) {
        expect(
          parseFacilityStockPreparedness({
            [FACILITY_SALT_STOCK_ID]: snapshotWith(field, value),
          })
        ).toBeUndefined()
      }

      const missing = { ...PREPARED_SNAPSHOT } as Record<string, unknown>
      delete missing[field]
      expect(parseFacilityStockPreparedness({ [FACILITY_SALT_STOCK_ID]: missing })).toBeUndefined()

      const hidden = { ...PREPARED_SNAPSHOT } as Record<string, unknown>
      Object.defineProperty(hidden, field, {
        value: PREPARED_SNAPSHOT[field],
        enumerable: false,
        configurable: true,
      })
      expect(parseFacilityStockPreparedness({ [FACILITY_SALT_STOCK_ID]: hidden })).toBeUndefined()

      const inheritedBase = { ...PREPARED_SNAPSHOT } as Record<string, unknown>
      delete inheritedBase[field]
      const inherited = Object.assign(
        Object.create({ [field]: PREPARED_SNAPSHOT[field] }) as Record<string, unknown>,
        inheritedBase
      )
      expect(
        parseFacilityStockPreparedness({ [FACILITY_SALT_STOCK_ID]: inherited })
      ).toBeUndefined()
    }

    const hiddenKnown: Record<string, unknown> = {}
    Object.defineProperty(hiddenKnown, FACILITY_SALT_STOCK_ID, {
      value: PREPARED_SNAPSHOT,
      enumerable: false,
      configurable: true,
    })
    expect(parseFacilityStockPreparedness(hiddenKnown)).toBeUndefined()

    const inheritedKnown = Object.create({
      [FACILITY_SALT_STOCK_ID]: PREPARED_SNAPSHOT,
    }) as Record<string, unknown>
    expect(parseFacilityStockPreparedness(inheritedKnown)).toBeUndefined()

    expect(
      parseFacilityStockPreparedness({
        [FACILITY_SALT_STOCK_ID]: { ...PREPARED_SNAPSHOT, derived: 'stockout' },
        salt_cache: STOCKOUT_BY_RESERVE_SNAPSHOT,
        evidence_cage: STOCKOUT_BY_RESERVE_SNAPSHOT,
        '0': STOCKOUT_BY_RESERVE_SNAPSHOT,
        constructor: STOCKOUT_BY_RESERVE_SNAPSHOT,
        [Symbol('ignored')]: STOCKOUT_BY_RESERVE_SNAPSHOT,
        ['__proto__']: STOCKOUT_BY_RESERVE_SNAPSHOT,
      })
    ).toEqual({
      [FACILITY_SALT_STOCK_ID]: PREPARED_SNAPSHOT,
    })

    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    const unrelated = snapshotUnrelated(state)
    const hydrated = hydrateGame({
      ...state,
      facilityStockPreparedness: {
        [FACILITY_SALT_STOCK_ID]: { ...PREPARED_SNAPSHOT, derived: 'stockout' },
        salt_cache: STOCKOUT_BY_RESERVE_SNAPSHOT,
        evidence_cage: STOCKOUT_BY_RESERVE_SNAPSHOT,
        '0': STOCKOUT_BY_RESERVE_SNAPSHOT,
        constructor: STOCKOUT_BY_RESERVE_SNAPSHOT,
        ['__proto__']: STOCKOUT_BY_RESERVE_SNAPSHOT,
      },
    })
    expect(hydrated.facilityStockPreparedness).toEqual({
      [FACILITY_SALT_STOCK_ID]: PREPARED_SNAPSHOT,
    })
    expect(hydrated.inventory).toEqual(unrelated.inventory)
    expect(hydrated.facilityStockpile).toEqual(unrelated.facilityStockpile)
    expect(hydrated.departmentLocalStaging).toEqual(unrelated.departmentLocalStaging)
    expect(hydrated.facilityStockPlacement).toEqual(unrelated.facilityStockPlacement)
    expect(hydrated.facilityStockCondition).toEqual(unrelated.facilityStockCondition)
    expect(hydrated.facilityEmergencyCaches).toEqual(unrelated.facilityEmergencyCaches)
    expect(hydrated.facilityStockOverflow).toEqual(unrelated.facilityStockOverflow)
  })

  it('does not inherit facilityStockPreparedness from hydration fallback when omitted', () => {
    const starting = createStartingState()
    const fallback = {
      ...starting,
      facilityStockPreparedness: {
        [FACILITY_SALT_STOCK_ID]: STOCKOUT_BY_RESERVE_SNAPSHOT,
      },
    }
    const hydrated = hydrateGame({ ...starting, facilityStockPreparedness: undefined }, fallback)
    expect(hydrated.facilityStockPreparedness).toBeUndefined()
    expect(fallback.facilityStockPreparedness).toEqual({
      [FACILITY_SALT_STOCK_ID]: STOCKOUT_BY_RESERVE_SNAPSHOT,
    })
  })

  it('leaves spare-part consume ungated when preparedness is omitted or stockout-present', () => {
    const omittedState = createStartingState()
    omittedState.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    expect(omittedState.facilityStockPreparedness).toBeUndefined()
    const omittedConsumed = consumeFacilityStock(omittedState, BLAST_DOOR_SPARE_PART_ID)
    expect(omittedConsumed).toMatchObject({ ok: true, remaining: 1 })
    if (!omittedConsumed.ok) throw new Error(omittedConsumed.code)
    expect(omittedConsumed.state.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 1 })
    expect(omittedConsumed.state.facilityStockPreparedness).toBeUndefined()
    expect(omittedState.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 2 })

    const presentState = createStartingState()
    presentState.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    const stamped = stampFacilityStockPreparedness(
      presentState,
      inputFor(STOCKOUT_BY_RESERVE_SNAPSHOT)
    )
    if (!stamped.ok) throw new Error(stamped.code)
    const preparednessBefore = structuredClone(stamped.state.facilityStockPreparedness)
    const presentConsumed = consumeFacilityStock(stamped.state, BLAST_DOOR_SPARE_PART_ID)
    expect(presentConsumed).toMatchObject({ ok: true, remaining: 1 })
    if (!presentConsumed.ok) throw new Error(presentConsumed.code)
    expect(presentConsumed.state.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 1 })
    expect(presentConsumed.state.facilityStockPreparedness).toEqual(preparednessBefore)
    expect(stamped.state.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 2 })
    expect(resolveFacilityStockoutPressure(presentConsumed.state, FACILITY_SALT)).toMatchObject({
      ok: true,
      pressure: 'stockout',
      snapshot: STOCKOUT_BY_RESERVE_SNAPSHOT,
    })
  })
})
