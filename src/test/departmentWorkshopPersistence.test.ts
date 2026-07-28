import { afterEach, describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import {
  projectDepartmentWorkshopWorkload,
  readDepartmentWorkshopState,
  sanitizeDepartmentWorkshopSnapshots,
  sanitizeDepartmentWorkshopWorkOrders,
  type DepartmentWorkshopSnapshotRegistry,
  type DepartmentWorkshopWorkOrderRegistry,
} from '../domain/departmentWorkshopQueue'
import { useGameStore } from '../app/store/gameStore'
import { hydrateGame, stripGameTemplates } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import { advanceWeek } from '../domain/sim/advanceWeek'

const WORK_ORDERS: DepartmentWorkshopWorkOrderRegistry = {
  'work:zulu': {
    id: 'work:zulu',
    departmentId: 'department:records-analysis',
    caseId: 'case-zulu',
    taskType: 'records_review',
    requiredWork: 3,
  },
  'work:alpha': {
    id: 'work:alpha',
    departmentId: 'department:biohazard-response',
    caseId: 'case-alpha',
    taskType: 'containment_response',
    requiredWork: 2,
  },
}

const SNAPSHOTS: DepartmentWorkshopSnapshotRegistry = {
  'department:records-analysis': {
    departmentId: 'department:records-analysis',
    slotCapacity: 2,
    queued: [{ workOrderId: 'work:zulu', completedWork: 0 }],
    active: [],
    paused: [],
  },
  'department:biohazard-response': {
    departmentId: 'department:biohazard-response',
    slotCapacity: 1,
    queued: [],
    active: [{ workOrderId: 'work:alpha', completedWork: 1 }],
    paused: [],
  },
}

afterEach(() => {
  useGameStore.getState().reset()
})

describe('department workshop persistence', () => {
  it('supplies independent empty defaults for new games, legacy hydration, and fallback state', () => {
    const starting = createStartingState()
    expect(starting.departmentWorkshopWorkOrders).toEqual({})
    expect(starting.departmentWorkshopSnapshots).toEqual({})

    const fallback = {
      ...starting,
      departmentWorkshopWorkOrders: WORK_ORDERS,
      departmentWorkshopSnapshots: SNAPSHOTS,
    }
    const legacy = hydrateGame(
      {
        ...stripGameTemplates(starting),
        departmentWorkshopWorkOrders: undefined,
        departmentWorkshopSnapshots: undefined,
      },
      fallback
    )

    expect(legacy.departmentWorkshopWorkOrders).toEqual({})
    expect(legacy.departmentWorkshopSnapshots).toEqual({})
    expect(legacy.departmentWorkshopWorkOrders).not.toBe(fallback.departmentWorkshopWorkOrders)
    expect(legacy.departmentWorkshopSnapshots).not.toBe(fallback.departmentWorkshopSnapshots)
  })

  it('round-trips valid registries through save serialization in code-unit key order', () => {
    const game = {
      ...createStartingState(),
      departmentWorkshopWorkOrders: {
        'work:zulu': WORK_ORDERS['work:zulu'],
        'work:alpha': WORK_ORDERS['work:alpha'],
      },
      departmentWorkshopSnapshots: SNAPSHOTS,
    }

    const loaded = loadGameSave(serializeGameSave(game))

    expect(Object.keys(loaded.departmentWorkshopWorkOrders ?? {})).toEqual([
      'work:alpha',
      'work:zulu',
    ])
    expect(Object.keys(loaded.departmentWorkshopSnapshots ?? {})).toEqual([
      'department:biohazard-response',
      'department:records-analysis',
    ])
    expect(loaded.departmentWorkshopWorkOrders).toEqual(WORK_ORDERS)
    expect(loaded.departmentWorkshopSnapshots).toEqual(SNAPSHOTS)
  })

  it('isolates malformed entries, key mismatches, integer-index keys, and foreign membership', () => {
    const workOrders = sanitizeDepartmentWorkshopWorkOrders({
      ...WORK_ORDERS,
      mismatch: WORK_ORDERS['work:zulu'],
      '7': { ...WORK_ORDERS['work:alpha'], id: '7' },
      'work:bad-progress': {
        ...WORK_ORDERS['work:alpha'],
        id: 'work:bad-progress',
        requiredWork: 0,
      },
      'work:static-definition': {
        id: 'work:static-definition',
        departmentId: 'department:missing',
        caseId: 'case-static',
        taskType: 'records_review',
        requiredWork: 1,
      },
    })
    const snapshots = sanitizeDepartmentWorkshopSnapshots(
      {
        ...SNAPSHOTS,
        mismatch: SNAPSHOTS['department:records-analysis'],
        'department:emergency-response': {
          departmentId: 'department:emergency-response',
          slotCapacity: -1,
          queued: [],
          active: [],
          paused: [],
        },
        'department:ethics-review': {
          departmentId: 'department:ethics-review',
          slotCapacity: 1,
          queued: [{ workOrderId: 'work:zulu', completedWork: 0 }],
          active: [],
          paused: [],
        },
      },
      workOrders
    )

    expect(Object.keys(workOrders)).toEqual(['work:alpha', 'work:zulu'])
    expect(Object.keys(snapshots)).toEqual([
      'department:biohazard-response',
      'department:records-analysis',
    ])
  })

  it('is deterministic across input order and does not mutate or alias input data', () => {
    const inputA = {
      departmentWorkshopWorkOrders: {
        'work:zulu': WORK_ORDERS['work:zulu'],
        'work:alpha': WORK_ORDERS['work:alpha'],
      },
      departmentWorkshopSnapshots: {
        'department:records-analysis': SNAPSHOTS['department:records-analysis'],
        'department:biohazard-response': SNAPSHOTS['department:biohazard-response'],
      },
    }
    const inputB = {
      departmentWorkshopWorkOrders: {
        'work:alpha': WORK_ORDERS['work:alpha'],
        'work:zulu': WORK_ORDERS['work:zulu'],
      },
      departmentWorkshopSnapshots: {
        'department:biohazard-response': SNAPSHOTS['department:biohazard-response'],
        'department:records-analysis': SNAPSHOTS['department:records-analysis'],
      },
    }
    const before = structuredClone(inputA)

    const first = readDepartmentWorkshopState(inputA)
    const replay = readDepartmentWorkshopState(inputB)

    expect(first).toEqual(replay)
    expect(inputA).toEqual(before)
    expect(first.workOrders['work:alpha']).not.toBe(
      inputA.departmentWorkshopWorkOrders['work:alpha']
    )
    expect(first.snapshots['department:biohazard-response']).not.toBe(
      inputA.departmentWorkshopSnapshots['department:biohazard-response']
    )
    expect(Object.isFrozen(first.workOrders)).toBe(true)
    expect(Object.isFrozen(first.snapshots)).toBe(true)
  })

  it('keeps hydrated snapshots compatible with the SPE-2084 workload projection', () => {
    const hydrated = hydrateGame({
      ...stripGameTemplates(createStartingState()),
      departmentWorkshopWorkOrders: WORK_ORDERS,
      departmentWorkshopSnapshots: SNAPSHOTS,
    })
    const snapshot = hydrated.departmentWorkshopSnapshots?.['department:records-analysis']
    expect(snapshot).toBeDefined()

    const projection = projectDepartmentWorkshopWorkload(
      snapshot!,
      Object.values(hydrated.departmentWorkshopWorkOrders ?? {}).filter(
        (workOrder) => workOrder.departmentId === snapshot!.departmentId
      )
    )

    expect(projection).toMatchObject({
      state: 'projected',
      workloadSnapshot: {
        departmentId: 'department:records-analysis',
        queuedCaseIds: ['case-zulu'],
        weeklyCapacity: 2,
      },
    })
  })

  it('resets store-owned workshop registries to fresh empty defaults', () => {
    useGameStore.setState({
      game: {
        ...createStartingState(),
        departmentWorkshopWorkOrders: WORK_ORDERS,
        departmentWorkshopSnapshots: SNAPSHOTS,
      },
    })

    useGameStore.getState().reset()

    expect(useGameStore.getState().game.departmentWorkshopWorkOrders).toEqual({})
    expect(useGameStore.getState().game.departmentWorkshopSnapshots).toEqual({})
  })

  it('does not advance workshops or change existing week-close and global queue behavior', () => {
    const baseline = createStartingState()
    const withWorkshops = {
      ...structuredClone(baseline),
      departmentWorkshopWorkOrders: WORK_ORDERS,
      departmentWorkshopSnapshots: SNAPSHOTS,
    }

    const advancedBaseline = advanceWeek(baseline, Date.UTC(2026, 0, 1))
    const advancedWithWorkshops = advanceWeek(withWorkshops, Date.UTC(2026, 0, 1))
    const persistedWorkOrders = advancedWithWorkshops.departmentWorkshopWorkOrders
    const persistedSnapshots = advancedWithWorkshops.departmentWorkshopSnapshots
    const advancedWithoutWorkshopFields = { ...advancedWithWorkshops }
    const baselineWithoutWorkshopFields = { ...advancedBaseline }
    Reflect.deleteProperty(advancedWithoutWorkshopFields, 'departmentWorkshopWorkOrders')
    Reflect.deleteProperty(advancedWithoutWorkshopFields, 'departmentWorkshopSnapshots')
    Reflect.deleteProperty(baselineWithoutWorkshopFields, 'departmentWorkshopWorkOrders')
    Reflect.deleteProperty(baselineWithoutWorkshopFields, 'departmentWorkshopSnapshots')

    expect(persistedWorkOrders).toEqual(WORK_ORDERS)
    expect(persistedSnapshots).toEqual(SNAPSHOTS)
    expect(advancedWithoutWorkshopFields).toEqual(baselineWithoutWorkshopFields)
    expect(advancedWithWorkshops.caseQueue).toEqual(advancedBaseline.caseQueue)
  })
})
