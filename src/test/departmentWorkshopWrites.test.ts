import { afterEach, describe, expect, it } from 'vitest'

import { useGameStore } from '../app/store/gameStore'
import { createStartingState } from '../data/startingState'
import {
  enqueueDepartmentWorkshopWorkOrder,
  prioritizeDepartmentWorkshopWorkOrder,
  type DepartmentWorkshopStateSource,
} from '../domain/departmentWorkshopQueue'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'

const DEPARTMENT_ID = 'department:records-analysis'

function emptyWorkshopState(): DepartmentWorkshopStateSource {
  return {
    departmentWorkshopWorkOrders: {},
    departmentWorkshopSnapshots: {
      [DEPARTMENT_ID]: {
        departmentId: DEPARTMENT_ID,
        slotCapacity: 0,
        queued: [],
        active: [],
        paused: [],
      },
    },
  }
}

function order(id: string, caseId: string) {
  return {
    id,
    departmentId: DEPARTMENT_ID,
    caseId,
    taskType: 'records_review' as const,
    requiredWork: 2,
  }
}

afterEach(() => {
  useGameStore.getState().reset()
})

describe('canonical department workshop writes (SPE-2752 / SPE-1028)', () => {
  it('enqueues valid work immutably in stable queue and registry order, including zero-capacity departments', () => {
    const source = emptyWorkshopState()
    const before = structuredClone(source)
    const first = enqueueDepartmentWorkshopWorkOrder(source, order('work:zulu', 'case:zulu'))
    const second = enqueueDepartmentWorkshopWorkOrder(
      first.workshopState,
      order('work:alpha', 'case:alpha')
    )

    expect(first.state).toBe('enqueued')
    expect(second.state).toBe('enqueued')
    expect(Object.keys(second.workshopState.workOrders)).toEqual(['work:alpha', 'work:zulu'])
    expect(
      second.workshopState.snapshots[DEPARTMENT_ID].queued.map((item) => item.workOrderId)
    ).toEqual(['work:zulu', 'work:alpha'])
    expect(second.workshopState.snapshots[DEPARTMENT_ID].slotCapacity).toBe(0)
    expect(source).toEqual(before)
    expect(second.workshopState.workOrders).not.toBe(source.departmentWorkshopWorkOrders)
  })

  it('rejects malformed, unsupported, duplicate, and missing-snapshot writes without changing canonical state', () => {
    const source = emptyWorkshopState()
    const enqueued = enqueueDepartmentWorkshopWorkOrder(source, order('work:alpha', 'case:alpha'))
    const invalid = enqueueDepartmentWorkshopWorkOrder(enqueued.workshopState, {
      ...order('work:bad', 'case:bad'),
      requiredWork: 0,
    })
    const unsupported = enqueueDepartmentWorkshopWorkOrder(enqueued.workshopState, {
      ...order('work:unsupported', 'case:unsupported'),
      taskType: 'emergency_response',
    })
    const duplicateId = enqueueDepartmentWorkshopWorkOrder(
      enqueued.workshopState,
      order('work:alpha', 'case:other')
    )
    const duplicateCase = enqueueDepartmentWorkshopWorkOrder(
      enqueued.workshopState,
      order('work:other', 'case:alpha')
    )
    const missingSnapshot = enqueueDepartmentWorkshopWorkOrder(
      { departmentWorkshopWorkOrders: {}, departmentWorkshopSnapshots: {} },
      order('work:orphan', 'case:orphan')
    )

    expect(invalid.reasons[0].code).toBe('invalid-work-orders')
    expect(unsupported.reasons[0].code).toBe('unsupported-department-task')
    expect(duplicateId.reasons[0].code).toBe('duplicate-work-order')
    expect(duplicateCase.reasons[0].code).toBe('duplicate-case-workload')
    expect(missingSnapshot.reasons[0].code).toBe('missing-workshop-snapshot')
    for (const result of [invalid, unsupported, duplicateId, duplicateCase]) {
      expect(result.workshopState).toEqual(enqueued.workshopState)
    }
  })

  it('replays enqueue deterministically and only prioritizes an existing queued order', () => {
    const source = emptyWorkshopState()
    const first = enqueueDepartmentWorkshopWorkOrder(source, order('work:alpha', 'case:alpha'))
    const state = enqueueDepartmentWorkshopWorkOrder(
      first.workshopState,
      order('work:bravo', 'case:bravo')
    ).workshopState
    const replay = enqueueDepartmentWorkshopWorkOrder(
      first.workshopState,
      order('work:bravo', 'case:bravo')
    ).workshopState
    const prioritized = prioritizeDepartmentWorkshopWorkOrder(state, DEPARTMENT_ID, 'work:bravo')
    const active = prioritizeDepartmentWorkshopWorkOrder(
      {
        departmentWorkshopWorkOrders: state.workOrders,
        departmentWorkshopSnapshots: {
          [DEPARTMENT_ID]: {
            ...state.snapshots[DEPARTMENT_ID],
            slotCapacity: 1,
            queued: [],
            active: [{ workOrderId: 'work:alpha', completedWork: 0 }],
          },
        },
      },
      DEPARTMENT_ID,
      'work:alpha'
    )

    expect(state).toEqual(replay)
    expect(prioritized.state).toBe('prioritized')
    expect(
      prioritized.workshopState.snapshots[DEPARTMENT_ID].queued.map((item) => item.workOrderId)
    ).toEqual(['work:bravo', 'work:alpha'])
    expect(active.reasons[0].code).toBe('work-order-not-queued')
  })

  it('exempts only canonically completed, no-longer-laned same-case work', () => {
    const completed = order('work:completed', 'case:alpha')
    const source = {
      ...emptyWorkshopState(),
      week: 1,
      departmentWorkshopWorkOrders: { [completed.id]: completed },
      departmentWorkshopCompletionOutcomes: {
        [completed.id]: {
          workOrderId: completed.id,
          caseId: completed.caseId,
          departmentId: completed.departmentId,
          taskType: completed.taskType,
          completedWeek: 1,
          outcome: 'completed',
        },
      },
    } as const
    const next = order('work:next', completed.caseId)

    expect(enqueueDepartmentWorkshopWorkOrder(source, next).state).toBe('enqueued')
    expect(
      enqueueDepartmentWorkshopWorkOrder(
        { ...source, departmentWorkshopCompletionOutcomes: {} },
        next
      ).reasons[0].code
    ).toBe('duplicate-case-workload')
    expect(
      enqueueDepartmentWorkshopWorkOrder(
        {
          ...source,
          departmentWorkshopCompletionOutcomes: {
            [completed.id]: {
              ...source.departmentWorkshopCompletionOutcomes[completed.id],
              completedWeek: 2,
            },
          },
        },
        next
      ).reasons[0].code
    ).toBe('duplicate-case-workload')
    expect(
      enqueueDepartmentWorkshopWorkOrder(
        {
          ...source,
          departmentWorkshopCompletionOutcomes: {
            [completed.id]: {
              ...source.departmentWorkshopCompletionOutcomes[completed.id],
              departmentId: 'department:biohazard-response',
            },
          },
        },
        next
      ).reasons[0].code
    ).toBe('duplicate-case-workload')
    for (const lane of ['queued', 'active', 'paused'] as const) {
      expect(
        enqueueDepartmentWorkshopWorkOrder(
          {
            ...source,
            departmentWorkshopSnapshots: {
              [DEPARTMENT_ID]: {
                ...source.departmentWorkshopSnapshots[DEPARTMENT_ID],
                slotCapacity: 1,
                [lane]: [{ workOrderId: completed.id, completedWork: 0 }],
              },
            },
          },
          next
        ).reasons[0].code
      ).toBe('duplicate-case-workload')
    }
  })

  it('writes through the store, round-trips persistence, resets cleanly, and leaves week-close/global queue untouched', () => {
    const baseline = createStartingState()
    const game = {
      ...baseline,
      ...emptyWorkshopState(),
    }
    useGameStore.setState({ game })

    const beforeQueue = structuredClone(game.caseQueue)
    const result = useGameStore
      .getState()
      .enqueueDepartmentWorkshopWorkOrder(order('work:store', 'case:store'))
    const stored = useGameStore.getState().game
    const roundTripped = loadGameSave(serializeGameSave(stored))
    const advanced = advanceWeek(stored, Date.UTC(2026, 0, 1))

    expect(result.state).toBe('enqueued')
    expect(stored.caseQueue).toEqual(beforeQueue)
    expect(roundTripped.departmentWorkshopWorkOrders).toEqual(stored.departmentWorkshopWorkOrders)
    expect(roundTripped.departmentWorkshopSnapshots).toEqual(stored.departmentWorkshopSnapshots)
    expect(advanced.departmentWorkshopWorkOrders).toEqual(stored.departmentWorkshopWorkOrders)
    expect(advanced.departmentWorkshopSnapshots).toEqual(stored.departmentWorkshopSnapshots)

    useGameStore.getState().reset()
    expect(useGameStore.getState().game.departmentWorkshopWorkOrders).toEqual({})
    expect(useGameStore.getState().game.departmentWorkshopSnapshots).toEqual({})
  })
})
