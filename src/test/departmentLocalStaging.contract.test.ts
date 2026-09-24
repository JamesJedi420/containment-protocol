import { describe, expect, it } from 'vitest'
import { hydrateGame } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import { parseDepartmentLocalStaging } from '../domain/departmentLocalStaging'
import { BLAST_DOOR_SPARE_PART_ID } from '../domain/sparePartSuitability'
import { advanceWeek } from '../domain/sim/advanceWeek'

const RECORDS = 'department:records-analysis'
const BIOHAZARD = 'department:biohazard-response'
const ADJACENT = { inputStaging: 'adjacent', outputStaging: 'adjacent' } as const
const REMOTE = { inputStaging: 'remote', outputStaging: 'remote' } as const
const MIXED = { inputStaging: 'adjacent', outputStaging: 'remote' } as const

function snapshotUnrelated(state: ReturnType<typeof createStartingState>) {
  return {
    inventory: structuredClone(state.inventory),
    facilityStockpile: structuredClone(state.facilityStockpile),
    equipmentInstances: structuredClone(state.equipmentInstances),
  }
}

function attachTwoDepartmentWork(state: ReturnType<typeof createStartingState>, requiredWork = 2) {
  state.departmentWorkshopWorkOrders = {
    'work:records': {
      id: 'work:records',
      departmentId: RECORDS,
      caseId: 'case-records',
      taskType: 'records_review',
      requiredWork,
    },
    'work:biohazard': {
      id: 'work:biohazard',
      departmentId: BIOHAZARD,
      caseId: 'case-biohazard',
      taskType: 'containment_response',
      requiredWork,
    },
  }
  state.departmentWorkshopSnapshots = {
    [RECORDS]: {
      departmentId: RECORDS,
      slotCapacity: 1,
      queued: [],
      active: [{ workOrderId: 'work:records', completedWork: 0 }],
      paused: [],
    },
    [BIOHAZARD]: {
      departmentId: BIOHAZARD,
      slotCapacity: 1,
      queued: [],
      active: [{ workOrderId: 'work:biohazard', completedWork: 0 }],
      paused: [],
    },
  }
}

describe('department-local staging persist', () => {
  it('parses omit, empty, and non-records as undefined', () => {
    expect(parseDepartmentLocalStaging(undefined)).toBeUndefined()
    expect(parseDepartmentLocalStaging({})).toBeUndefined()
    expect(parseDepartmentLocalStaging(null)).toBeUndefined()
    expect(parseDepartmentLocalStaging([])).toBeUndefined()
    expect(parseDepartmentLocalStaging('adjacent')).toBeUndefined()
  })

  it('drops unknown, integer-index, prototype-unsafe, partial, and nearby siblings independently', () => {
    const raw = {
      [RECORDS]: ADJACENT,
      [BIOHAZARD]: MIXED,
      'department:not-a-department': ADJACENT,
      '0': ADJACENT,
      constructor: ADJACENT,
      nearby: { inputStaging: 'nearby', outputStaging: 'adjacent' },
      [RECORDS.replace('records', 'missing')]: ADJACENT,
    }
    const withPartial = {
      ...raw,
      [BIOHAZARD]: { inputStaging: 'adjacent' },
    }
    expect(parseDepartmentLocalStaging(raw)).toEqual({
      [BIOHAZARD]: MIXED,
      [RECORDS]: ADJACENT,
    })
    expect(parseDepartmentLocalStaging(withPartial)).toEqual({ [RECORDS]: ADJACENT })
    expect(
      parseDepartmentLocalStaging({
        [RECORDS]: { inputStaging: 'nearby', outputStaging: 'adjacent' },
      })
    ).toBeUndefined()

    const protoPolluted = {
      [BIOHAZARD]: ADJACENT,
    } as Record<string, unknown>
    Object.defineProperty(protoPolluted, '__proto__', {
      value: ADJACENT,
      enumerable: true,
      configurable: true,
    })
    expect(parseDepartmentLocalStaging(protoPolluted)).toEqual({ [BIOHAZARD]: ADJACENT })
  })

  it('keeps valid siblings in code-unit department-id order', () => {
    const parsed = parseDepartmentLocalStaging({
      [RECORDS]: ADJACENT,
      [BIOHAZARD]: REMOTE,
    })
    expect(Object.keys(parsed ?? {})).toEqual([BIOHAZARD, RECORDS])
    expect(parsed).toEqual({
      [BIOHAZARD]: REMOTE,
      [RECORDS]: ADJACENT,
    })
  })

  it('does not mutate the input map', () => {
    const input = { [RECORDS]: { ...ADJACENT }, extra: 'nope' }
    const before = structuredClone(input)
    parseDepartmentLocalStaging(input)
    expect(input).toEqual(before)
  })

  it('does not inherit departmentLocalStaging from hydration fallback when omitted', () => {
    const starting = createStartingState()
    const fallback = {
      ...starting,
      departmentLocalStaging: { [RECORDS]: ADJACENT },
    }
    const hydrated = hydrateGame({ ...starting, departmentLocalStaging: undefined }, fallback)
    expect(hydrated.departmentLocalStaging).toBeUndefined()
    expect(fallback.departmentLocalStaging).toEqual({ [RECORDS]: ADJACENT })
  })

  it('round-trips a valid map through hydrateGame without mutating catalog stock', () => {
    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 2 }
    state.departmentLocalStaging = {
      [RECORDS]: ADJACENT,
      [BIOHAZARD]: REMOTE,
    }
    const unrelated = snapshotUnrelated(state)
    const hydrated = hydrateGame(JSON.parse(JSON.stringify(state)))
    expect(hydrated.departmentLocalStaging).toEqual({
      [BIOHAZARD]: REMOTE,
      [RECORDS]: ADJACENT,
    })
    expect(hydrated.inventory).toEqual(unrelated.inventory)
    expect(hydrated.facilityStockpile).toEqual(unrelated.facilityStockpile)
    expect(hydrated.equipmentInstances).toEqual(unrelated.equipmentInstances)

    const omitted = hydrateGame(JSON.parse(JSON.stringify(createStartingState())))
    expect(omitted.departmentLocalStaging).toBeUndefined()
  })

  it('drops malformed hydration siblings and leaves catalog stock unchanged', () => {
    const state = createStartingState()
    state.facilityStockpile = { [BLAST_DOOR_SPARE_PART_ID]: 1 }
    const unrelated = snapshotUnrelated(state)
    const hydrated = hydrateGame({
      ...state,
      departmentLocalStaging: {
        [RECORDS]: ADJACENT,
        [BIOHAZARD]: { inputStaging: 'adjacent' },
        '0': ADJACENT,
        'department:unknown': ADJACENT,
      },
    })
    expect(hydrated.departmentLocalStaging).toEqual({ [RECORDS]: ADJACENT })
    expect(hydrated.inventory).toEqual(unrelated.inventory)
    expect(hydrated.facilityStockpile).toEqual(unrelated.facilityStockpile)
  })

  it('week-close keeps unplaced departments at one work unit even when the persisted cache says adjacent', () => {
    const close = (staging: ReturnType<typeof createStartingState>['departmentLocalStaging']) => {
      const state = createStartingState()
      attachTwoDepartmentWork(state)
      if (staging !== undefined) {
        state.departmentLocalStaging = staging
      }
      const unrelated = snapshotUnrelated(state)
      const stagingBefore = structuredClone(state.departmentLocalStaging)
      const next = advanceWeek(state, Date.UTC(2026, 0, 1))
      expect(next.departmentLocalStaging).toEqual(stagingBefore)
      expect(next.inventory).toEqual(unrelated.inventory)
      expect(next.facilityStockpile).toEqual(unrelated.facilityStockpile)
      return next
    }

    const adjacent = close({ [RECORDS]: ADJACENT })
    expect(adjacent.departmentWorkshopSnapshots?.[RECORDS]?.active).toEqual([
      { workOrderId: 'work:records', completedWork: 1 },
    ])
    expect(adjacent.departmentWorkshopCompletionOutcomes?.['work:records']).toBeUndefined()
    expect(adjacent.departmentWorkshopSnapshots?.[BIOHAZARD]?.active).toEqual([
      { workOrderId: 'work:biohazard', completedWork: 1 },
    ])
    expect(adjacent.departmentWorkshopCompletionOutcomes?.['work:biohazard']).toBeUndefined()

    const omitted = close(undefined)
    expect(omitted.departmentWorkshopSnapshots?.[RECORDS]?.active).toEqual([
      { workOrderId: 'work:records', completedWork: 1 },
    ])
    expect(omitted.departmentWorkshopSnapshots?.[BIOHAZARD]?.active).toEqual([
      { workOrderId: 'work:biohazard', completedWork: 1 },
    ])

    const remote = close({ [RECORDS]: REMOTE })
    expect(remote.departmentWorkshopSnapshots?.[RECORDS]?.active).toEqual([
      { workOrderId: 'work:records', completedWork: 1 },
    ])
    expect(remote.departmentWorkshopSnapshots?.[BIOHAZARD]?.active).toEqual([
      { workOrderId: 'work:biohazard', completedWork: 1 },
    ])

    const mixed = close({ [RECORDS]: MIXED })
    expect(mixed.departmentWorkshopSnapshots?.[RECORDS]?.active).toEqual([
      { workOrderId: 'work:records', completedWork: 1 },
    ])
    expect(mixed.departmentWorkshopSnapshots?.[BIOHAZARD]?.active).toEqual([
      { workOrderId: 'work:biohazard', completedWork: 1 },
    ])
  })

  it('hydratable malformed sibling does not grant adjacent throughput at week-close', () => {
    const state = createStartingState()
    attachTwoDepartmentWork(state)
    const hydrated = hydrateGame({
      ...state,
      departmentLocalStaging: {
        [RECORDS]: { inputStaging: 'nearby', outputStaging: 'adjacent' },
        [BIOHAZARD]: ADJACENT,
      },
    })
    const next = advanceWeek(hydrated, Date.UTC(2026, 0, 1))
    expect(next.departmentLocalStaging).toEqual({ [BIOHAZARD]: ADJACENT })
    expect(next.departmentWorkshopSnapshots?.[RECORDS]?.active).toEqual([
      { workOrderId: 'work:records', completedWork: 1 },
    ])
    expect(next.departmentWorkshopSnapshots?.[BIOHAZARD]?.active).toEqual([
      { workOrderId: 'work:biohazard', completedWork: 1 },
    ])
  })
})
