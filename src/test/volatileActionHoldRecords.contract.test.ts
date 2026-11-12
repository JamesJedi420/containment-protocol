import { describe, expect, it } from 'vitest'
import { hydrateGame } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import {
  parseVolatileActionHoldRecords,
  readVolatileActionHold,
  recordVolatileActionHold,
} from '../domain/volatileActionHoldRecords'
import {
  VOLATILE_ACTION_PHASE_VARIANT_ID,
  resolveVolatileActionPhasePipeline,
} from '../domain/volatileActionPhasePipeline'
import { consumeFacilityStock } from '../domain/facilityStockpile'
import { BLAST_DOOR_SPARE_PART_ID } from '../domain/sparePartSuitability'
import type { VolatileActionPriorityActorInput } from '../domain/volatileActionPriority'

function actor(
  actorId: string,
  overrides: Partial<VolatileActionPriorityActorInput> = {}
): VolatileActionPriorityActorInput {
  return {
    actorId,
    sideId: 'responders',
    readiness: 'steady',
    posture: 'guarded',
    exposure: 'covered',
    injury: 'none',
    toolState: 'operational',
    precision: 50,
    aimCommitment: 'none',
    targetingMode: 'explicit_designation',
    ...overrides,
  }
}

function snapshotUnrelated(state: ReturnType<typeof createStartingState>) {
  return {
    inventory: structuredClone(state.inventory),
    facilityStockpile: structuredClone(state.facilityStockpile),
    facilityProtectionGoods: structuredClone(state.facilityProtectionGoods),
    equipmentInstances: structuredClone(state.equipmentInstances),
  }
}

describe('volatile action hold records', () => {
  it('stamps hold_aim, abort, and delayed_emission keyed to the instance', () => {
    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    const unrelated = snapshotUnrelated(state)

    const held = recordVolatileActionHold(state, {
      encounterId: 'encounter:hold-aim',
      kind: 'hold_aim',
      instanceId: 'encounter:hold-aim',
    })
    expect(held.ledger).toEqual({
      instanceId: 'encounter:hold-aim',
      encounterId: 'encounter:hold-aim',
      entries: [{ sequence: 0, kind: 'hold_aim' }],
    })
    expect(held.state.volatileActionHoldRecords).toEqual({
      'encounter:hold-aim': held.ledger,
    })
    expect(Object.isFrozen(held.state.volatileActionHoldRecords)).toBe(true)
    expect(readVolatileActionHold(held.state, 'encounter:hold-aim')).toEqual({
      kind: 'hold_aim',
      instanceId: 'encounter:hold-aim',
    })

    const aborted = recordVolatileActionHold(held.state, {
      encounterId: 'encounter:abort',
      kind: 'abort',
      instanceId: 'procedure:abort-line',
      reason: 'lost_line_of_sight',
    })
    const delayed = recordVolatileActionHold(aborted.state, {
      encounterId: 'encounter:delay',
      kind: 'delayed_emission',
      instanceId: 'encounter:delay',
    })

    expect(Object.keys(delayed.state.volatileActionHoldRecords ?? {})).toEqual([
      'encounter:delay',
      'encounter:hold-aim',
      'procedure:abort-line',
    ])
    expect(readVolatileActionHold(delayed.state, 'procedure:abort-line')).toEqual({
      kind: 'abort',
      instanceId: 'procedure:abort-line',
      reason: 'lost_line_of_sight',
    })
    expect(delayed.state.inventory).toEqual(unrelated.inventory)
    expect(delayed.state.facilityStockpile).toEqual(unrelated.facilityStockpile)
    expect(state.volatileActionHoldRecords).toBeUndefined()
  })

  it('appends a correction instead of overwriting a mistaken hold', () => {
    const state = createStartingState()
    const mistaken = recordVolatileActionHold(state, {
      encounterId: 'encounter:correct',
      kind: 'hold_aim',
      instanceId: 'encounter:correct',
    })
    const corrected = recordVolatileActionHold(mistaken.state, {
      encounterId: 'encounter:correct',
      kind: 'abort',
      instanceId: 'encounter:correct',
      reason: 'corrected_abort',
    })

    expect(corrected.ledger.entries).toEqual([
      { sequence: 0, kind: 'hold_aim' },
      { sequence: 1, kind: 'abort', reason: 'corrected_abort' },
    ])
    expect(readVolatileActionHold(corrected.state, 'encounter:correct')).toEqual({
      kind: 'abort',
      instanceId: 'encounter:correct',
      reason: 'corrected_abort',
    })
    expect(mistaken.ledger.entries).toEqual([{ sequence: 0, kind: 'hold_aim' }])
  })

  it('round-trips a keyed ledger through hydrateGame and pipeline replay', () => {
    const state = createStartingState()
    const stamped = recordVolatileActionHold(state, {
      encounterId: 'encounter:replay',
      kind: 'delayed_emission',
      instanceId: 'encounter:replay',
    })
    const hydrated = hydrateGame(JSON.parse(JSON.stringify(stamped.state)))
    expect(hydrated.volatileActionHoldRecords).toEqual(stamped.state.volatileActionHoldRecords)

    const hold = readVolatileActionHold(hydrated, 'encounter:replay')
    const pipeline = resolveVolatileActionPhasePipeline({
      encounterId: 'encounter:replay',
      variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
      mode: 'advanced_action',
      stakes: 'present',
      actionPriority: { mode: { kind: 'per_actor' }, actors: [actor('actor:alpha')] },
      hold,
    })
    expect(pipeline.phases.find((phase) => phase.id === 'effect_emission')?.status).toBe('delayed')
    expect(pipeline.hold).toEqual({
      kind: 'delayed_emission',
      instanceId: 'encounter:replay',
    })
  })

  it('does not inherit volatileActionHoldRecords from hydration fallback when omitted', () => {
    const starting = createStartingState()
    const fallback = {
      ...starting,
      volatileActionHoldRecords: {
        'encounter:fallback': {
          instanceId: 'encounter:fallback',
          encounterId: 'encounter:fallback',
          entries: [{ sequence: 0, kind: 'hold_aim' as const }],
        },
      },
    }
    const hydrated = hydrateGame({ ...starting, volatileActionHoldRecords: undefined }, fallback)
    expect(hydrated.volatileActionHoldRecords).toBeUndefined()
    expect(fallback.volatileActionHoldRecords?.['encounter:fallback']?.entries[0]?.kind).toBe(
      'hold_aim'
    )
  })

  it('drops malformed hydration siblings independently', () => {
    expect(parseVolatileActionHoldRecords(undefined)).toBeUndefined()
    expect(parseVolatileActionHoldRecords({})).toBeUndefined()
    expect(parseVolatileActionHoldRecords(null)).toBeUndefined()
    expect(parseVolatileActionHoldRecords([])).toBeUndefined()

    const mixed = {
      'encounter:keep': {
        instanceId: 'encounter:keep',
        encounterId: 'encounter:keep',
        entries: [{ sequence: 0, kind: 'hold_aim' }],
      },
      'encounter:mismatch': {
        instanceId: 'encounter:other',
        encounterId: 'encounter:mismatch',
        entries: [{ sequence: 0, kind: 'hold_aim' }],
      },
      '0': {
        instanceId: '0',
        encounterId: 'encounter:index',
        entries: [{ sequence: 0, kind: 'hold_aim' }],
      },
      constructor: {
        instanceId: 'constructor',
        encounterId: 'encounter:proto',
        entries: [{ sequence: 0, kind: 'hold_aim' }],
      },
      'encounter:empty': {
        instanceId: 'encounter:empty',
        encounterId: 'encounter:empty',
        entries: [],
      },
      'encounter:gap': {
        instanceId: 'encounter:gap',
        encounterId: 'encounter:gap',
        entries: [{ sequence: 1, kind: 'hold_aim' }],
      },
    }
    expect(parseVolatileActionHoldRecords(mixed)).toEqual({
      'encounter:keep': {
        instanceId: 'encounter:keep',
        encounterId: 'encounter:keep',
        entries: [{ sequence: 0, kind: 'hold_aim' }],
      },
    })

    const hydrated = hydrateGame({
      ...createStartingState(),
      volatileActionHoldRecords: mixed,
    })
    expect(hydrated.volatileActionHoldRecords).toEqual({
      'encounter:keep': {
        instanceId: 'encounter:keep',
        encounterId: 'encounter:keep',
        entries: [{ sequence: 0, kind: 'hold_aim' }],
      },
    })
  })

  it('fail-closes missing or unsafe stamp and read keys', () => {
    const state = createStartingState()
    expect(() => recordVolatileActionHold(state, { kind: 'none' })).toThrow(
      'hold kind must be hold_aim, abort, or delayed_emission.'
    )
    expect(() =>
      recordVolatileActionHold(state, {
        kind: 'hold_aim',
        instanceId: 'encounter:missing-encounter',
      })
    ).toThrow('encounterId must be a non-empty trimmed string.')
    expect(() =>
      recordVolatileActionHold(state, {
        encounterId: '  ',
        kind: 'hold_aim',
        instanceId: 'encounter:blank',
      })
    ).toThrow('encounterId must be a non-empty trimmed string.')
    expect(() =>
      recordVolatileActionHold(state, {
        encounterId: '__proto__',
        kind: 'hold_aim',
        instanceId: 'encounter:proto-enc',
      })
    ).toThrow('encounterId is unsafe.')
    expect(() => readVolatileActionHold(state, '  ')).toThrow(
      'hold instanceId must be a non-empty trimmed string.'
    )
    expect(() => readVolatileActionHold(state, '__proto__')).toThrow('hold instanceId is unsafe.')
    expect(readVolatileActionHold(state, 'encounter:absent')).toEqual({ kind: 'none' })
  })

  it('fail-closes encounterId mismatch on an existing instance instead of overwriting', () => {
    const state = createStartingState()
    const first = recordVolatileActionHold(state, {
      encounterId: 'encounter:alpha',
      kind: 'hold_aim',
      instanceId: 'procedure:shared',
    })
    expect(() =>
      recordVolatileActionHold(first.state, {
        encounterId: 'encounter:bravo',
        kind: 'abort',
        instanceId: 'procedure:shared',
        reason: 'wrong_encounter',
      })
    ).toThrow('hold encounterId must match the existing instance encounterId.')
    expect(first.state.volatileActionHoldRecords?.['procedure:shared']?.entries).toEqual([
      { sequence: 0, kind: 'hold_aim' },
    ])
  })

  it('does not debit stock when stamping a hold ledger', () => {
    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    const stamped = recordVolatileActionHold(state, {
      encounterId: 'encounter:stock',
      kind: 'hold_aim',
      instanceId: 'encounter:stock',
    })
    const consumed = consumeFacilityStock(stamped.state, BLAST_DOOR_SPARE_PART_ID)
    expect(consumed.ok).toBe(true)
    expect(stamped.state.facilityStockpile).toEqual({ [BLAST_DOOR_SPARE_PART_ID]: 2 })
    expect(stamped.state.volatileActionHoldRecords).toEqual({
      'encounter:stock': {
        instanceId: 'encounter:stock',
        encounterId: 'encounter:stock',
        entries: [{ sequence: 0, kind: 'hold_aim' }],
      },
    })
  })
})
