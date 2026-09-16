import { describe, expect, it } from 'vitest'
import { hydrateGame } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import { consumeFacilityStock } from '../domain/facilityStockpile'
import {
  EVIDENCE_CAGE_NODE_ID,
  OVERFLOWING_STATUS,
  parseFacilityStockOverflow,
  recordFacilityOverflow,
  resolveFacilityOverflowPenalty,
} from '../domain/facilityStockOverflow'
import { BLAST_DOOR_SPARE_PART_ID } from '../domain/sparePartSuitability'

const EVIDENCE_CAGE = { nodeId: EVIDENCE_CAGE_NODE_ID } as const

function snapshotUnrelated(state: ReturnType<typeof createStartingState>) {
  return {
    inventory: structuredClone(state.inventory),
    facilityStockpile: structuredClone(state.facilityStockpile),
    facilityStockPlacement: structuredClone(state.facilityStockPlacement),
    facilityStockCondition: structuredClone(state.facilityStockCondition),
    facilityEmergencyCaches: structuredClone(state.facilityEmergencyCaches),
    equipmentInstances: structuredClone(state.equipmentInstances),
  }
}

describe('facility stock overflow access penalty', () => {
  it('blocks access when evidence_cage overflow is recorded', () => {
    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    const unrelated = snapshotUnrelated(state)
    const recorded = recordFacilityOverflow(state, EVIDENCE_CAGE)
    expect(recorded).toMatchObject({
      ok: true,
      nodeId: EVIDENCE_CAGE_NODE_ID,
      status: OVERFLOWING_STATUS,
    })
    if (!recorded.ok) throw new Error(recorded.code)
    const result = resolveFacilityOverflowPenalty(recorded.state, EVIDENCE_CAGE)
    expect(result).toEqual({
      ok: true,
      state: recorded.state,
      penalty: 'blocked',
      nodeId: EVIDENCE_CAGE_NODE_ID,
      status: OVERFLOWING_STATUS,
    })
    expect(result.state).toBe(recorded.state)
    expect(recorded.state.facilityStockOverflow).toEqual({
      [EVIDENCE_CAGE_NODE_ID]: OVERFLOWING_STATUS,
    })
    expect(recorded.state.inventory).toEqual(unrelated.inventory)
    expect(recorded.state.facilityStockpile).toEqual(unrelated.facilityStockpile)
    expect(recorded.state.facilityStockPlacement).toEqual(unrelated.facilityStockPlacement)
    expect(recorded.state.facilityStockCondition).toEqual(unrelated.facilityStockCondition)
    expect(recorded.state.facilityEmergencyCaches).toEqual(unrelated.facilityEmergencyCaches)
    expect(recorded.state.equipmentInstances).toEqual(unrelated.equipmentInstances)
    expect(state.facilityStockOverflow).toBeUndefined()
    expect(state.facilityStockpile).toEqual(unrelated.facilityStockpile)
  })

  it('clears access when overflow is omitted', () => {
    const state = createStartingState()
    expect(state.facilityStockOverflow).toBeUndefined()
    const result = resolveFacilityOverflowPenalty(state, EVIDENCE_CAGE)
    expect(result).toEqual({
      ok: true,
      state,
      penalty: 'clear',
      nodeId: EVIDENCE_CAGE_NODE_ID,
    })
    expect(result.state).toBe(state)
    expect(state.facilityStockOverflow).toBeUndefined()
  })

  it('fail-closes unknown or malformed node on record without writing overflow', () => {
    const state = createStartingState()
    const before = structuredClone(state)
    for (const nodeId of ['mundane_supplies', 'weapons_locker', null, 1, undefined]) {
      const result = recordFacilityOverflow(state, { nodeId })
      expect(result).toEqual({ ok: false, state, code: 'invalid_node' })
      expect(result.state).toBe(state)
      expect(result.state).toEqual(before)
    }
  })

  it('fail-closes unknown or malformed node on resolve without writing overflow', () => {
    const state = createStartingState()
    const recorded = recordFacilityOverflow(state, EVIDENCE_CAGE)
    if (!recorded.ok) throw new Error(recorded.code)
    const before = structuredClone(recorded.state)
    for (const input of [
      { nodeId: 'mundane_supplies' },
      { nodeId: 'weapons_locker' },
      {},
      null,
      1,
      EVIDENCE_CAGE_NODE_ID,
    ] as const) {
      const result = resolveFacilityOverflowPenalty(recorded.state, input)
      expect(result).toEqual({ ok: false, state: recorded.state, code: 'invalid_node' })
      expect(result.state).toBe(recorded.state)
      expect(result.state).toEqual(before)
    }
  })

  it('is immutable: same success input twice matches; hydration does not re-run resolve or record', () => {
    const state = createStartingState()
    const first = recordFacilityOverflow(state, EVIDENCE_CAGE)
    const second = recordFacilityOverflow(state, EVIDENCE_CAGE)
    expect(first).toEqual(second)
    if (!first.ok) throw new Error(first.code)
    const resolved = resolveFacilityOverflowPenalty(first.state, EVIDENCE_CAGE)
    expect(resolved).toMatchObject({ ok: true, penalty: 'blocked' })
    const hydrated = hydrateGame(JSON.parse(JSON.stringify(first.state)))
    expect(hydrated.facilityStockOverflow).toEqual({
      [EVIDENCE_CAGE_NODE_ID]: OVERFLOWING_STATUS,
    })
    expect(resolveFacilityOverflowPenalty(hydrated, EVIDENCE_CAGE)).toMatchObject({
      ok: true,
      penalty: 'blocked',
      status: OVERFLOWING_STATUS,
    })
    expect(state.facilityStockOverflow).toBeUndefined()
  })

  it('drops malformed hydration siblings independently', () => {
    expect(parseFacilityStockOverflow(undefined)).toBeUndefined()
    expect(parseFacilityStockOverflow({})).toBeUndefined()
    expect(parseFacilityStockOverflow(null)).toBeUndefined()
    expect(parseFacilityStockOverflow([])).toBeUndefined()
    expect(
      parseFacilityStockOverflow({
        [EVIDENCE_CAGE_NODE_ID]: 'cluttered',
        relic_vault: OVERFLOWING_STATUS,
        '0': OVERFLOWING_STATUS,
        constructor: OVERFLOWING_STATUS,
      })
    ).toBeUndefined()
    expect(
      parseFacilityStockOverflow({
        [EVIDENCE_CAGE_NODE_ID]: OVERFLOWING_STATUS,
        relic_vault: OVERFLOWING_STATUS,
        '0': OVERFLOWING_STATUS,
        constructor: OVERFLOWING_STATUS,
        cluttered: OVERFLOWING_STATUS,
      })
    ).toEqual({
      [EVIDENCE_CAGE_NODE_ID]: OVERFLOWING_STATUS,
    })

    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    const unrelated = snapshotUnrelated(state)
    const hydrated = hydrateGame({
      ...state,
      facilityStockOverflow: {
        [EVIDENCE_CAGE_NODE_ID]: OVERFLOWING_STATUS,
        relic_vault: OVERFLOWING_STATUS,
        '0': OVERFLOWING_STATUS,
        constructor: OVERFLOWING_STATUS,
        cluttered: OVERFLOWING_STATUS,
      },
    })
    expect(hydrated.facilityStockOverflow).toEqual({
      [EVIDENCE_CAGE_NODE_ID]: OVERFLOWING_STATUS,
    })
    expect(hydrated.inventory).toEqual(unrelated.inventory)
    expect(hydrated.facilityStockpile).toEqual(unrelated.facilityStockpile)
    expect(hydrated.facilityStockPlacement).toEqual(unrelated.facilityStockPlacement)
    expect(hydrated.facilityStockCondition).toEqual(unrelated.facilityStockCondition)
    expect(hydrated.facilityEmergencyCaches).toEqual(unrelated.facilityEmergencyCaches)
  })

  it('does not inherit facilityStockOverflow from hydration fallback when omitted', () => {
    const starting = createStartingState()
    const fallback = {
      ...starting,
      facilityStockOverflow: {
        [EVIDENCE_CAGE_NODE_ID]: OVERFLOWING_STATUS,
      },
    }
    const hydrated = hydrateGame({ ...starting, facilityStockOverflow: undefined }, fallback)
    expect(hydrated.facilityStockOverflow).toBeUndefined()
    expect(fallback.facilityStockOverflow).toEqual({
      [EVIDENCE_CAGE_NODE_ID]: OVERFLOWING_STATUS,
    })
  })

  it('round-trips a valid overflow map through hydrateGame without debiting catalog stock', () => {
    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    state.facilityStockOverflow = {
      [EVIDENCE_CAGE_NODE_ID]: OVERFLOWING_STATUS,
    }
    const unrelated = snapshotUnrelated(state)
    const hydrated = hydrateGame(JSON.parse(JSON.stringify(state)))
    expect(hydrated.facilityStockOverflow).toEqual({
      [EVIDENCE_CAGE_NODE_ID]: OVERFLOWING_STATUS,
    })
    expect(hydrated.inventory).toEqual(unrelated.inventory)
    expect(hydrated.facilityStockpile).toEqual(unrelated.facilityStockpile)
    expect(resolveFacilityOverflowPenalty(hydrated, EVIDENCE_CAGE)).toMatchObject({
      ok: true,
      penalty: 'blocked',
      status: OVERFLOWING_STATUS,
    })

    const omitted = hydrateGame(JSON.parse(JSON.stringify(createStartingState())))
    expect(omitted.facilityStockOverflow).toBeUndefined()
    expect(resolveFacilityOverflowPenalty(omitted, EVIDENCE_CAGE)).toMatchObject({
      ok: true,
      penalty: 'clear',
    })
  })

  it('leaves spare-part consume ungated when overflow is omitted or present', () => {
    const omittedState = createStartingState()
    omittedState.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    expect(omittedState.facilityStockOverflow).toBeUndefined()
    const omittedConsumed = consumeFacilityStock(omittedState, BLAST_DOOR_SPARE_PART_ID)
    expect(omittedConsumed).toMatchObject({ ok: true, remaining: 1 })
    if (!omittedConsumed.ok) throw new Error(omittedConsumed.code)
    expect(omittedConsumed.state.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 1 })
    expect(omittedConsumed.state.facilityStockOverflow).toBeUndefined()
    expect(omittedState.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 2 })

    const presentState = createStartingState()
    presentState.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    const recorded = recordFacilityOverflow(presentState, EVIDENCE_CAGE)
    if (!recorded.ok) throw new Error(recorded.code)
    const presentConsumed = consumeFacilityStock(recorded.state, BLAST_DOOR_SPARE_PART_ID)
    expect(presentConsumed).toMatchObject({ ok: true, remaining: 1 })
    if (!presentConsumed.ok) throw new Error(presentConsumed.code)
    expect(presentConsumed.state.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 1 })
    expect(presentConsumed.state.facilityStockOverflow).toEqual({
      [EVIDENCE_CAGE_NODE_ID]: OVERFLOWING_STATUS,
    })
    expect(recorded.state.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 2 })
  })
})
