import { afterEach, describe, expect, it } from 'vitest'

import { useGameStore } from '../app/store/gameStore'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import { createStartingState } from '../data/startingState'
import {
  activateCaseScopedPrerequisiteProcessingOrder,
  type CaseScopedPrerequisiteProcessingOrder,
} from '../domain/prerequisiteProcessingOrders'
import type { GameState } from '../domain/models'

const DEPARTMENT_ID = 'department:records-analysis'
const LEAF_ID = 'work:leaf'
const SUCCESSOR_ID = 'work:successor'

function createActivationState(): GameState {
  const game = createStartingState()
  const caseId = Object.keys(game.cases).sort()[0]!
  const leaf: CaseScopedPrerequisiteProcessingOrder = {
    workOrderId: LEAF_ID,
    caseId,
    processingRecipeId: 'extract',
    inputMaterials: [],
    outputMaterialId: 'raw',
    outputQuantity: 1,
    departmentId: DEPARTMENT_ID,
    taskType: 'records_review',
    requiredWork: 1,
    prerequisiteWorkOrderIds: [],
  }
  const successor: CaseScopedPrerequisiteProcessingOrder = {
    ...leaf,
    workOrderId: SUCCESSOR_ID,
    processingRecipeId: 'process',
    inputMaterials: [{ materialId: 'medical-supplies', quantity: 1 }],
    outputMaterialId: 'processed',
    prerequisiteWorkOrderIds: [LEAF_ID],
  }

  return {
    ...game,
    inventory: { ...game.inventory, 'medical-supplies': 2 },
    caseScopedPrerequisiteProcessingOrders: {
      [LEAF_ID]: leaf,
      [SUCCESSOR_ID]: successor,
    },
    departmentWorkshopWorkOrders: {
      [LEAF_ID]: {
        id: LEAF_ID,
        caseId,
        departmentId: DEPARTMENT_ID,
        taskType: 'records_review',
        requiredWork: 1,
      },
    },
    departmentWorkshopSnapshots: {
      [DEPARTMENT_ID]: {
        departmentId: DEPARTMENT_ID,
        slotCapacity: 1,
        queued: [],
        active: [],
        paused: [],
      },
    },
    departmentWorkshopCompletionOutcomes: {
      [LEAF_ID]: {
        workOrderId: LEAF_ID,
        caseId,
        departmentId: DEPARTMENT_ID,
        taskType: 'records_review',
        completedWeek: 1,
        outcome: 'completed',
      },
    },
  }
}

afterEach(() => {
  useGameStore.getState().reset()
})

describe('explicit dependent prerequisite activation (SPE-2759)', () => {
  it('survives save/load, reserves once, enqueues once, and matches the store action', () => {
    const persisted = loadGameSave(serializeGameSave(createActivationState()))
    const before = structuredClone(persisted)
    const result = activateCaseScopedPrerequisiteProcessingOrder(persisted, SUCCESSOR_ID)

    expect(result.state).toBe('reserved-and-enqueued')
    expect(persisted).toEqual(before)
    if (result.state !== 'reserved-and-enqueued') return

    expect(result.inventory['medical-supplies']).toBe(1)
    expect(result.reservations[SUCCESSOR_ID]?.inputMaterials).toEqual([
      { materialId: 'medical-supplies', quantity: 1 },
    ])
    expect(
      result.workshopSnapshots[DEPARTMENT_ID]?.queued.map((item) => item.workOrderId)
    ).toEqual([SUCCESSOR_ID])
    expect(
      activateCaseScopedPrerequisiteProcessingOrder(
        {
          ...persisted,
          inventory: result.inventory,
          caseScopedPrerequisiteProcessingReservations: result.reservations,
          departmentWorkshopWorkOrders: result.workshopWorkOrders,
          departmentWorkshopSnapshots: result.workshopSnapshots,
        },
        SUCCESSOR_ID
      )
    ).toEqual({ state: 'blocked', reasons: ['already-reserved'] })

    useGameStore.setState({ game: persisted })
    expect(
      useGameStore.getState().activateCaseScopedPrerequisiteProcessingOrder(SUCCESSOR_ID)
    ).toEqual(result)
    expect(useGameStore.getState().game.inventory['medical-supplies']).toBe(1)
  })

  it('fails closed for missing, cross-case, or active dependency proof', () => {
    const state = createActivationState()
    expect(activateCaseScopedPrerequisiteProcessingOrder(state, LEAF_ID)).toEqual({
      state: 'blocked',
      reasons: ['no-prerequisites'],
    })
    const withoutReceipt = { ...state, departmentWorkshopCompletionOutcomes: {} }
    const before = structuredClone(withoutReceipt)
    expect(
      activateCaseScopedPrerequisiteProcessingOrder(withoutReceipt, SUCCESSOR_ID)
    ).toEqual({ state: 'blocked', reasons: ['prerequisites-not-complete'] })
    expect(withoutReceipt).toEqual(before)

    const crossCaseReceipt = {
      ...state,
      departmentWorkshopCompletionOutcomes: {
        [LEAF_ID]: {
          ...state.departmentWorkshopCompletionOutcomes[LEAF_ID],
          caseId: 'case:cross-owner',
        },
      },
    }
    expect(
      activateCaseScopedPrerequisiteProcessingOrder(crossCaseReceipt, SUCCESSOR_ID)
    ).toEqual({ state: 'blocked', reasons: ['prerequisites-not-complete'] })

    const futureReceipt = {
      ...state,
      departmentWorkshopCompletionOutcomes: {
        [LEAF_ID]: {
          ...state.departmentWorkshopCompletionOutcomes[LEAF_ID],
          completedWeek: state.week + 1,
        },
      },
    }
    expect(
      activateCaseScopedPrerequisiteProcessingOrder(futureReceipt, SUCCESSOR_ID)
    ).toEqual({ state: 'blocked', reasons: ['prerequisites-not-complete'] })

    const activePriorWork = {
      ...state,
      departmentWorkshopSnapshots: {
        [DEPARTMENT_ID]: {
          ...state.departmentWorkshopSnapshots[DEPARTMENT_ID],
          active: [{ workOrderId: LEAF_ID, completedWork: 0 }],
        },
      },
    }
    expect(
      activateCaseScopedPrerequisiteProcessingOrder(activePriorWork, SUCCESSOR_ID)
    ).toEqual({ state: 'blocked', reasons: ['duplicate-case-workload'] })
  })
})
