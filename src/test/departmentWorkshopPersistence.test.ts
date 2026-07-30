import { afterEach, describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import {
  processDepartmentWorkshopTick,
  projectDepartmentWorkshopWorkload,
  readDepartmentWorkshopState,
  reconcileDepartmentWorkshopTerminalLanes,
  registerDepartmentWorkshopCompletionOutcomes,
  sanitizeDepartmentWorkshopCompletionOutcomes,
  sanitizeDepartmentWorkshopSnapshots,
  sanitizeDepartmentWorkshopWorkOrders,
  type DepartmentWorkshopSnapshotRegistry,
  type DepartmentWorkshopWorkOrderRegistry,
} from '../domain/departmentWorkshopQueue'
import { useGameStore } from '../app/store/gameStore'
import { hydrateGame, stripGameTemplates } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import type { GameState } from '../domain/models'
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
    expect(starting.departmentWorkshopCompletionOutcomes).toEqual({})
    expect(starting.caseScopedPrerequisiteProcessingOrders).toEqual({})
    expect(starting.caseScopedPrerequisiteProcessingReservations).toEqual({})
    expect(starting.caseScopedPrerequisiteProcessingTerminalSignals).toEqual({})

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
    expect(legacy.departmentWorkshopCompletionOutcomes).toEqual({})
    expect(legacy.caseScopedPrerequisiteProcessingOrders).toEqual({})
    expect(legacy.caseScopedPrerequisiteProcessingReservations).toEqual({})
    expect(legacy.caseScopedPrerequisiteProcessingTerminalSignals).toEqual({})
    expect(legacy.departmentWorkshopWorkOrders).not.toBe(fallback.departmentWorkshopWorkOrders)
    expect(legacy.departmentWorkshopSnapshots).not.toBe(fallback.departmentWorkshopSnapshots)
  })

  it('round-trips case-scoped processing envelopes without changing workshop or case queues', () => {
    const baseline = createStartingState()
    const caseId = Object.keys(baseline.cases).sort()[0]!
    const game = {
      ...baseline,
      caseScopedPrerequisiteProcessingOrders: {
        'work:prerequisite': {
          workOrderId: 'work:prerequisite',
          caseId,
          processingRecipeId: 'recipe:processing',
          inputMaterials: [{ materialId: 'material:raw', quantity: 1 }],
          outputMaterialId: 'material:processed',
          outputQuantity: 1,
          departmentId: 'department:records-analysis',
          taskType: 'records_review',
          requiredWork: 1,
          prerequisiteWorkOrderIds: [],
        },
      },
    }

    const loaded = loadGameSave(serializeGameSave(game))

    expect(loaded.caseScopedPrerequisiteProcessingOrders).toEqual(
      game.caseScopedPrerequisiteProcessingOrders
    )
    expect(loaded.departmentWorkshopWorkOrders).toEqual(baseline.departmentWorkshopWorkOrders)
    expect(loaded.departmentWorkshopSnapshots).toEqual(baseline.departmentWorkshopSnapshots)
    expect(loaded.caseQueue).toEqual(baseline.caseQueue)
  })

  it('normalizes case-scoped finalization contracts and drops malformed handoffs', () => {
    const baseline = createStartingState()
    const caseId = Object.keys(baseline.cases).sort()[0]!
    const rawGame = {
      ...baseline,
      cases: {
        ...baseline.cases,
        [caseId]: {
          ...baseline.cases[caseId],
          departmentWorkshopFinalizationRequest: {
            finalRecipeId: ' med-kits ',
            requiredWorkOrderIds: ['work:zulu', 'work:alpha', 'work:zulu'],
          },
          departmentWorkshopFinalizationHandoff: {
            finalRecipeId: 'med-kits',
            outputItemId: 'medkits',
            outputQuantity: Number.MAX_SAFE_INTEGER + 1,
            sourceWorkOrderIds: ['work:alpha'],
            handoffWeek: 1,
          },
        },
      },
    }
    const fallback = {
      ...baseline,
      cases: {
        ...baseline.cases,
        [caseId]: {
          ...baseline.cases[caseId],
          departmentWorkshopFinalizationRequest: {
            finalRecipeId: 'fallback-recipe',
            requiredWorkOrderIds: ['work:fallback'],
          },
          departmentWorkshopFinalizationHandoff: {
            finalRecipeId: 'fallback-recipe',
            outputItemId: 'fallback-output',
            outputQuantity: 1,
            sourceWorkOrderIds: ['work:fallback'],
            handoffWeek: 1,
          },
        },
      },
    }

    const loaded = hydrateGame(stripGameTemplates(rawGame as GameState), fallback)
    const invalidRequestLoaded = hydrateGame(
      {
        ...stripGameTemplates(rawGame as GameState),
        cases: {
          ...rawGame.cases,
          [caseId]: {
            ...rawGame.cases[caseId],
            departmentWorkshopFinalizationRequest: {
              finalRecipeId: '',
              requiredWorkOrderIds: [],
            },
          },
        },
      },
      fallback
    )

    expect(loaded.cases[caseId]?.departmentWorkshopFinalizationRequest).toEqual({
      finalRecipeId: 'med-kits',
      requiredWorkOrderIds: ['work:alpha', 'work:zulu'],
    })
    expect(loaded.cases[caseId]?.departmentWorkshopFinalizationHandoff).toBeUndefined()
    expect(
      invalidRequestLoaded.cases[caseId]?.departmentWorkshopFinalizationRequest
    ).toBeUndefined()
  })

  it('round-trips terminal signals in stable order and isolates malformed siblings', () => {
    const baseline = createStartingState()
    const caseId = Object.keys(baseline.cases).sort()[0]!
    const terminalSignal = (workOrderId: string, reason: 'failed' | 'cancelled') => ({
      workOrderId,
      caseId,
      departmentId: 'department:records-analysis',
      taskType: 'records_review',
      terminalWeek: baseline.week,
      reason,
    })
    const rawGame = {
      ...baseline,
      caseScopedPrerequisiteProcessingTerminalSignals: {
        'work:zulu': terminalSignal('work:zulu', 'cancelled'),
        mismatch: terminalSignal('work:mismatch', 'failed'),
        'work:alpha': terminalSignal('work:alpha', 'failed'),
        'work:future': {
          ...terminalSignal('work:future', 'failed'),
          terminalWeek: baseline.week + 1,
        },
        'work:bad-reason': {
          ...terminalSignal('work:bad-reason', 'failed'),
          reason: 'abandoned',
        },
      },
    } as unknown as GameState
    const loaded = loadGameSave(serializeGameSave(rawGame))

    expect(Object.keys(loaded.caseScopedPrerequisiteProcessingTerminalSignals ?? {})).toEqual([
      'work:alpha',
      'work:zulu',
    ])
    expect(loaded.caseScopedPrerequisiteProcessingTerminalSignals).toEqual({
      'work:alpha': terminalSignal('work:alpha', 'failed'),
      'work:zulu': terminalSignal('work:zulu', 'cancelled'),
    })
    expect(Object.isFrozen(loaded.caseScopedPrerequisiteProcessingTerminalSignals)).toBe(true)
    expect(
      Object.isFrozen(loaded.caseScopedPrerequisiteProcessingTerminalSignals?.['work:alpha'])
    ).toBe(true)
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
    expect(useGameStore.getState().game.caseScopedPrerequisiteProcessingOrders).toEqual({})
    expect(useGameStore.getState().game.caseScopedPrerequisiteProcessingReservations).toEqual({})
    expect(useGameStore.getState().game.caseScopedPrerequisiteProcessingTerminalSignals).toEqual({})
  })

  it('processes persisted workshops once per week-close without changing the global queue', () => {
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
    Reflect.deleteProperty(advancedWithoutWorkshopFields, 'departmentWorkshopCompletionOutcomes')
    Reflect.deleteProperty(baselineWithoutWorkshopFields, 'departmentWorkshopWorkOrders')
    Reflect.deleteProperty(baselineWithoutWorkshopFields, 'departmentWorkshopSnapshots')
    Reflect.deleteProperty(baselineWithoutWorkshopFields, 'departmentWorkshopCompletionOutcomes')

    expect(persistedWorkOrders).toEqual(WORK_ORDERS)
    expect(persistedSnapshots).toEqual({
      'department:biohazard-response': {
        ...SNAPSHOTS['department:biohazard-response'],
        active: [],
      },
      'department:records-analysis': {
        ...SNAPSHOTS['department:records-analysis'],
        queued: [],
        active: [{ workOrderId: 'work:zulu', completedWork: 1 }],
      },
    })
    expect(advancedWithoutWorkshopFields).toEqual(baselineWithoutWorkshopFields)
    expect(advancedWithWorkshops.caseQueue).toEqual(advancedBaseline.caseQueue)
    const loaded = loadGameSave(serializeGameSave(advancedWithWorkshops))
    expect(loaded.departmentWorkshopSnapshots).toEqual(persistedSnapshots)
    expect(loaded.departmentWorkshopCompletionOutcomes).toEqual({
      'work:alpha': {
        workOrderId: 'work:alpha',
        departmentId: 'department:biohazard-response',
        caseId: 'case-alpha',
        taskType: 'containment_response',
        completedWeek: 1,
        outcome: 'completed',
      },
    })
    expect(advanceWeek(loaded, Date.UTC(2026, 0, 8)).departmentWorkshopCompletionOutcomes).toEqual(
      loaded.departmentWorkshopCompletionOutcomes
    )
  })

  it('consumes completed workshop receipts into one case ledger once, without queue mutation', () => {
    const baseline = createStartingState()
    const caseId = Object.keys(baseline.cases).sort()[0]
    expect(caseId).toBeDefined()
    const before = structuredClone(baseline)
    const source = {
      ...baseline,
      departmentWorkshopWorkOrders: {
        'work:case-receipt': {
          id: 'work:case-receipt',
          departmentId: 'department:biohazard-response',
          caseId,
          taskType: 'containment_response' as const,
          requiredWork: 1,
        },
      },
      departmentWorkshopSnapshots: {
        'department:biohazard-response': {
          departmentId: 'department:biohazard-response',
          slotCapacity: 1,
          queued: [],
          active: [{ workOrderId: 'work:case-receipt', completedWork: 0 }],
          paused: [],
        },
      },
    }

    const advanced = advanceWeek(source, Date.UTC(2026, 0, 1))
    const replay = advanceWeek(advanced, Date.UTC(2026, 0, 8))
    const loaded = loadGameSave(serializeGameSave(advanced))

    expect(baseline).toEqual(before)
    expect(advanced.cases[caseId]?.departmentWorkshopCompletionWorkOrderIds).toEqual([
      'work:case-receipt',
    ])
    expect(replay.cases[caseId]?.departmentWorkshopCompletionWorkOrderIds).toEqual([
      'work:case-receipt',
    ])
    expect(loaded.cases[caseId]?.departmentWorkshopCompletionWorkOrderIds).toEqual([
      'work:case-receipt',
    ])
    expect(advanced.caseQueue).toEqual(baseline.caseQueue)
    expect(advanced.departmentWorkshopCompletionOutcomes).toEqual({
      'work:case-receipt': {
        workOrderId: 'work:case-receipt',
        departmentId: 'department:biohazard-response',
        caseId,
        taskType: 'containment_response',
        completedWeek: 1,
        outcome: 'completed',
      },
    })
  })

  it('hands off a completed case-owned prerequisite once without starting Fabrication', () => {
    const baseline = createStartingState()
    const caseId = Object.keys(baseline.cases).sort()[0]!
    const workOrderId = 'work:finalization-input'
    const control = advanceWeek(baseline, Date.UTC(2026, 0, 1))
    const source = {
      ...baseline,
      cases: {
        ...baseline.cases,
        [caseId]: {
          ...baseline.cases[caseId],
          departmentWorkshopFinalizationRequest: {
            finalRecipeId: 'med-kits',
            requiredWorkOrderIds: [workOrderId],
          },
        },
      },
      caseScopedPrerequisiteProcessingOrders: {
        [workOrderId]: {
          workOrderId,
          caseId,
          processingRecipeId: 'prepare-medical-supplies',
          inputMaterials: [],
          outputMaterialId: 'medical_supplies',
          outputQuantity: 2,
          departmentId: 'department:biohazard-response',
          taskType: 'containment_response' as const,
          requiredWork: 1,
          prerequisiteWorkOrderIds: [],
        },
      },
      departmentWorkshopWorkOrders: {
        [workOrderId]: {
          id: workOrderId,
          departmentId: 'department:biohazard-response',
          caseId,
          taskType: 'containment_response' as const,
          requiredWork: 1,
        },
      },
      departmentWorkshopSnapshots: {
        'department:biohazard-response': {
          departmentId: 'department:biohazard-response',
          slotCapacity: 1,
          queued: [],
          active: [{ workOrderId, completedWork: 0 }],
          paused: [],
        },
      },
    }

    const advanced = advanceWeek(source, Date.UTC(2026, 0, 1))
    const replay = advanceWeek(advanced, Date.UTC(2026, 0, 8))
    const controlReplay = advanceWeek(control, Date.UTC(2026, 0, 8))
    const loaded = loadGameSave(serializeGameSave(advanced))

    expect(advanced.cases[caseId]?.departmentWorkshopFinalizationHandoff).toEqual({
      finalRecipeId: 'med-kits',
      outputItemId: 'medkits',
      outputQuantity: 1,
      sourceWorkOrderIds: [workOrderId],
      handoffWeek: 1,
    })
    expect(advanced.inventory.medical_supplies).toBe(control.inventory.medical_supplies)
    expect(advanced.inventory.medkits).toBe(control.inventory.medkits)
    expect(advanced.productionQueue).toEqual(control.productionQueue)
    expect(replay.cases[caseId]?.departmentWorkshopFinalizationHandoff).toEqual(
      advanced.cases[caseId]?.departmentWorkshopFinalizationHandoff
    )
    expect(replay.inventory.medical_supplies).toBe(controlReplay.inventory.medical_supplies)
    expect(loaded.cases[caseId]?.departmentWorkshopFinalizationRequest).toEqual(
      source.cases[caseId]?.departmentWorkshopFinalizationRequest
    )
    expect(loaded.cases[caseId]?.departmentWorkshopFinalizationHandoff).toEqual(
      advanced.cases[caseId]?.departmentWorkshopFinalizationHandoff
    )
  })

  it('reconciles only authored receipts when game-over short-circuits the normal close', () => {
    const baseline = createStartingState()
    const caseId = Object.keys(baseline.cases).sort()[0]!
    const source = {
      ...baseline,
      gameOver: true,
      cases: {
        ...baseline.cases,
        [caseId]: {
          ...baseline.cases[caseId],
          departmentWorkshopCompletionWorkOrderIds: ['work:trusted'],
          departmentWorkshopFinalizationRequest: {
            finalRecipeId: 'med-kits',
            requiredWorkOrderIds: ['work:trusted'],
          },
        },
      },
      caseScopedPrerequisiteProcessingOrders: {
        'work:trusted': {
          workOrderId: 'work:trusted',
          caseId,
          processingRecipeId: 'prepare-medical-supplies',
          inputMaterials: [],
          outputMaterialId: 'medical_supplies',
          outputQuantity: 2,
          departmentId: 'department:biohazard-response',
          taskType: 'containment_response' as const,
          requiredWork: 1,
          prerequisiteWorkOrderIds: [],
        },
      },
      departmentWorkshopWorkOrders: {
        'work:trusted': {
          id: 'work:trusted',
          departmentId: 'department:biohazard-response',
          caseId,
          taskType: 'containment_response' as const,
          requiredWork: 1,
        },
      },
      departmentWorkshopCompletionOutcomes: {
        'work:trusted': {
          workOrderId: 'work:trusted',
          departmentId: 'department:biohazard-response',
          caseId,
          taskType: 'containment_response' as const,
          completedWeek: 1,
          outcome: 'completed' as const,
        },
        'work:forged': {
          workOrderId: 'work:forged',
          departmentId: 'department:biohazard-response',
          caseId,
          taskType: 'containment_response' as const,
          completedWeek: 1,
          outcome: 'completed' as const,
        },
      },
    }

    expect(advanceWeek(source).cases[caseId]?.departmentWorkshopCompletionWorkOrderIds).toEqual([
      'work:trusted',
    ])
    expect(advanceWeek(source).cases[caseId]?.departmentWorkshopFinalizationHandoff).toEqual({
      finalRecipeId: 'med-kits',
      outputItemId: 'medkits',
      outputQuantity: 1,
      sourceWorkOrderIds: ['work:trusted'],
      handoffWeek: 1,
    })
  })

  it('replays in canonical department order without mutating input and keeps zero-capacity work queued', () => {
    const input = {
      departmentWorkshopWorkOrders: {
        'work:zulu': WORK_ORDERS['work:zulu'],
        'work:alpha': WORK_ORDERS['work:alpha'],
      },
      departmentWorkshopSnapshots: {
        'department:records-analysis': {
          ...SNAPSHOTS['department:records-analysis'],
          slotCapacity: 0,
        },
        'department:biohazard-response': SNAPSHOTS['department:biohazard-response'],
      },
    }
    const reordered = {
      departmentWorkshopWorkOrders: {
        'work:alpha': WORK_ORDERS['work:alpha'],
        'work:zulu': WORK_ORDERS['work:zulu'],
      },
      departmentWorkshopSnapshots: {
        'department:biohazard-response': SNAPSHOTS['department:biohazard-response'],
        'department:records-analysis': {
          ...SNAPSHOTS['department:records-analysis'],
          slotCapacity: 0,
        },
      },
    }
    const before = structuredClone(input)

    const first = processDepartmentWorkshopTick(input)
    const replay = processDepartmentWorkshopTick(reordered)

    expect(first).toEqual(replay)
    expect(input).toEqual(before)
    expect(first.startedWorkOrderIds).toEqual([])
    expect(first.completedWorkOrderIds).toEqual(['work:alpha'])
    expect(first.reasons).toEqual([
      { code: 'zero-slot-capacity', departmentId: 'department:records-analysis', workOrderIds: [] },
    ])
    expect(first.workshopState.snapshots['department:records-analysis']).toEqual({
      ...SNAPSHOTS['department:records-analysis'],
      slotCapacity: 0,
    })
  })

  it('does not advance completed work again on the next processing tick', () => {
    const input = {
      departmentWorkshopWorkOrders: {
        'work:alpha': { ...WORK_ORDERS['work:alpha'], requiredWork: 1 },
      },
      departmentWorkshopSnapshots: {
        'department:biohazard-response': {
          ...SNAPSHOTS['department:biohazard-response'],
          active: [{ workOrderId: 'work:alpha', completedWork: 0 }],
        },
      },
    }

    const completed = processDepartmentWorkshopTick(input)
    const repeated = processDepartmentWorkshopTick(completed.workshopState)

    expect(completed.completedWorkOrderIds).toEqual(['work:alpha'])
    expect(completed.workshopState.snapshots['department:biohazard-response']?.active).toEqual([])
    expect(repeated.state).toBe('unchanged')
    expect(repeated.completedWorkOrderIds).toEqual([])
  })

  it('removes proven terminal work from every lane while retaining provenance and siblings', () => {
    const recordsOrder = (id: string, caseId: string) => ({
      id,
      departmentId: 'department:records-analysis',
      caseId,
      taskType: 'records_review' as const,
      requiredWork: 3,
    })
    const input = {
      departmentWorkshopWorkOrders: {
        'work:active-terminal': recordsOrder('work:active-terminal', 'case-terminal'),
        'work:queued-terminal': recordsOrder('work:queued-terminal', 'case-terminal'),
        'work:paused-terminal': recordsOrder('work:paused-terminal', 'case-terminal'),
        'work:records-sibling': recordsOrder('work:records-sibling', 'case-sibling'),
        'work:other-department': {
          ...WORK_ORDERS['work:alpha'],
          id: 'work:other-department',
        },
      },
      departmentWorkshopSnapshots: {
        'department:records-analysis': {
          departmentId: 'department:records-analysis',
          slotCapacity: 2,
          queued: [
            { workOrderId: 'work:queued-terminal', completedWork: 0 },
            { workOrderId: 'work:records-sibling', completedWork: 0 },
          ],
          active: [{ workOrderId: 'work:active-terminal', completedWork: 1 }],
          paused: [{ workOrderId: 'work:paused-terminal', completedWork: 2 }],
        },
        'department:biohazard-response': {
          departmentId: 'department:biohazard-response',
          slotCapacity: 1,
          queued: [],
          active: [{ workOrderId: 'work:other-department', completedWork: 1 }],
          paused: [],
        },
      },
    }
    const before = structuredClone(input)

    const cleaned = reconcileDepartmentWorkshopTerminalLanes(input, [
      'work:paused-terminal',
      'work:active-terminal',
      'work:queued-terminal',
      'work:active-terminal',
      '',
    ])

    expect(cleaned.state).toBe('cleaned')
    expect(cleaned.removedWorkOrderIds).toEqual([
      'work:active-terminal',
      'work:paused-terminal',
      'work:queued-terminal',
    ])
    expect(cleaned.workshopState.snapshots['department:records-analysis']).toEqual({
      departmentId: 'department:records-analysis',
      slotCapacity: 2,
      queued: [{ workOrderId: 'work:records-sibling', completedWork: 0 }],
      active: [],
      paused: [],
    })
    expect(cleaned.workshopState.snapshots['department:biohazard-response']).toEqual(
      input.departmentWorkshopSnapshots['department:biohazard-response']
    )
    expect(cleaned.workshopState.workOrders).toEqual(input.departmentWorkshopWorkOrders)
    expect(input).toEqual(before)

    const replay = reconcileDepartmentWorkshopTerminalLanes(
      cleaned.workshopState,
      cleaned.removedWorkOrderIds
    )
    expect(replay.state).toBe('unchanged')
    expect(replay.removedWorkOrderIds).toEqual([])
    expect(replay.workshopState).toEqual(cleaned.workshopState)
  })

  it('registers completion outcomes in canonical order without mutation or duplicate receipts', () => {
    const input = {
      departmentWorkshopWorkOrders: WORK_ORDERS,
      departmentWorkshopSnapshots: SNAPSHOTS,
      departmentWorkshopCompletionOutcomes: {
        'work:alpha': {
          workOrderId: 'work:alpha',
          departmentId: 'department:biohazard-response',
          caseId: 'case-alpha',
          taskType: 'containment_response',
          completedWeek: 1,
          outcome: 'completed' as const,
        },
        'work:zulu': {
          workOrderId: 'work:zulu',
          departmentId: 'department:records-analysis',
          caseId: 'case-forged',
          taskType: 'records_review',
          completedWeek: 1,
          outcome: 'completed' as const,
        },
      },
    }
    const before = structuredClone(input)

    const result = registerDepartmentWorkshopCompletionOutcomes(
      input,
      ['work:zulu', 'work:alpha', 'work:zulu'],
      2
    )

    expect(result.registeredWorkOrderIds).toEqual(['work:zulu'])
    expect(Object.keys(result.outcomes)).toEqual(['work:alpha', 'work:zulu'])
    expect(result.outcomes['work:zulu']).toMatchObject({
      caseId: 'case-zulu',
      completedWeek: 2,
      outcome: 'completed',
    })
    expect(input).toEqual(before)
    expect(Object.isFrozen(result.outcomes)).toBe(true)
    expect(Object.isFrozen(result.outcomes['work:zulu'])).toBe(true)
    expect(sanitizeDepartmentWorkshopCompletionOutcomes({ bad: {} })).toEqual({})
  })
})
