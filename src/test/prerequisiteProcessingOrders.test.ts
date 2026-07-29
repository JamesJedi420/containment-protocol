import { describe, expect, it } from 'vitest'
import {
  createCaseScopedPrerequisiteProcessingOrders,
  readCaseScopedPrerequisiteProcessingOrders,
  reserveAndEnqueueCaseScopedPrerequisiteProcessingOrder,
  reconcileCaseScopedPrerequisiteProcessingCompletions,
  reconcileCaseScopedPrerequisiteProcessingSuccessors,
  sanitizeCaseScopedPrerequisiteProcessingOrders,
} from '../domain/prerequisiteProcessingOrders'
import { planPrerequisiteProcessing } from '../domain/prerequisiteProcessing'
import { createStartingState } from '../data/startingState'

const source = { cases: { 'case:open': { id: 'case:open', status: 'open' } } }

describe('case-scoped prerequisite processing orders', () => {
  it('adapts planned drafts deterministically for a real open case', () => {
    const plan = planPrerequisiteProcessing(
      { recipeId: 'final', inputMaterials: { processed: 1 } },
      {},
      [
        {
          recipeId: 'process',
          outputMaterialId: 'processed',
          outputQuantity: 1,
          inputMaterials: [{ materialId: 'raw', quantity: 1 }],
          departmentId: 'department:records-analysis',
          taskType: 'records_review',
          requiredWork: 1,
        },
        {
          recipeId: 'extract',
          outputMaterialId: 'raw',
          outputQuantity: 1,
          inputMaterials: [],
          departmentId: 'department:records-analysis',
          taskType: 'records_review',
          requiredWork: 1,
        },
      ]
    )
    const records = createCaseScopedPrerequisiteProcessingOrders(plan, 'case:open', source)

    expect(Object.keys(records)).toHaveLength(plan.prerequisiteWorkOrders.length)
    expect(Object.keys(records).every((workOrderId) => workOrderId.startsWith('processing:'))).toBe(
      true
    )
    for (const draft of plan.prerequisiteWorkOrders) {
      const workOrderId = Object.keys(records).find(
        (candidate) => records[candidate]?.processingRecipeId === draft.recipeId
      )!
      expect(records[workOrderId]).toMatchObject({
        caseId: 'case:open',
        processingRecipeId: draft.recipeId,
        inputMaterials: draft.inputMaterials,
        outputMaterialId: draft.outputMaterialId,
        outputQuantity: draft.outputQuantity,
      })
      expect(records[workOrderId]?.prerequisiteWorkOrderIds).toHaveLength(
        draft.dependsOnWorkOrderIds.length
      )
    }
    expect(createCaseScopedPrerequisiteProcessingOrders(plan, 'case:missing', source)).toEqual({})
  })

  it('drops malformed, unsafe, duplicate, and closed-case siblings without touching valid records', () => {
    const valid = {
      workOrderId: 'work:valid',
      caseId: 'case:open',
      processingRecipeId: 'process',
      inputMaterials: [{ materialId: 'raw', quantity: 1 }],
      outputMaterialId: 'processed',
      outputQuantity: 1,
      departmentId: 'department:records-analysis',
      taskType: 'records_review',
      requiredWork: 1,
      prerequisiteWorkOrderIds: [],
    }
    const rawRecords = Object.assign(Object.create(null), {
      'work:valid': valid,
      wrong: valid,
      closed: { ...valid, workOrderId: 'closed', caseId: 'case:closed' },
      'work:unknown-prerequisite': {
        ...valid,
        workOrderId: 'work:unknown-prerequisite',
        prerequisiteWorkOrderIds: ['work:missing'],
      },
      'work:duplicate-prerequisite': {
        ...valid,
        workOrderId: 'work:duplicate-prerequisite',
        prerequisiteWorkOrderIds: ['work:valid', 'work:valid'],
      },
      'work:depends-on-invalid': {
        ...valid,
        workOrderId: 'work:depends-on-invalid',
        prerequisiteWorkOrderIds: ['work:unknown-prerequisite'],
      },
      'work:cycle-a': {
        ...valid,
        workOrderId: 'work:cycle-a',
        prerequisiteWorkOrderIds: ['work:cycle-b'],
      },
      'work:cycle-b': {
        ...valid,
        workOrderId: 'work:cycle-b',
        prerequisiteWorkOrderIds: ['work:cycle-a'],
      },
    }) as Record<string, unknown>
    rawRecords.__proto__ = { ...valid, workOrderId: '__proto__' }
    const records = sanitizeCaseScopedPrerequisiteProcessingOrders(rawRecords, {
      cases: { ...source.cases, 'case:closed': { id: 'case:closed', status: 'resolved' } },
    })

    expect(records).toEqual({ 'work:valid': valid })
    expect(Object.isFrozen(records)).toBe(true)
    expect(Object.isFrozen(records['work:valid'])).toBe(true)
    expect(
      readCaseScopedPrerequisiteProcessingOrders({
        ...source,
        caseScopedPrerequisiteProcessingOrders: records,
      })
    ).toEqual(records)
  })

  it('atomically reserves a ready order and enqueues it once', () => {
    const game = createStartingState()
    const caseId = Object.keys(game.cases).sort()[0]!
    const workOrderId = 'work:ready'
    const order = {
      workOrderId,
      caseId,
      processingRecipeId: 'process',
      inputMaterials: [{ materialId: 'medical-supplies', quantity: 1 }],
      outputMaterialId: 'processed',
      outputQuantity: 1,
      departmentId: 'department:records-analysis',
      taskType: 'records_review',
      requiredWork: 1,
      prerequisiteWorkOrderIds: [],
    }
    const result = reserveAndEnqueueCaseScopedPrerequisiteProcessingOrder(
      {
        ...game,
        inventory: { ...game.inventory, 'medical-supplies': 1 },
        departmentWorkshopSnapshots: {
          'department:records-analysis': {
            departmentId: 'department:records-analysis',
            slotCapacity: 1,
            queued: [],
            active: [],
            paused: [],
          },
        },
        caseScopedPrerequisiteProcessingOrders: { [workOrderId]: order },
      },
      workOrderId
    )
    expect(result.state).toBe('reserved-and-enqueued')
    if (result.state === 'reserved-and-enqueued') {
      expect(result.inventory['medical-supplies']).toBe(0)
      expect(result.reservations[workOrderId]?.caseId).toBe(caseId)
      expect((result.workshopWorkOrders as Record<string, unknown>)[workOrderId]).toBeDefined()
    }
  })

  it('credits completed reserved output once and releases its reservation', () => {
    const workOrderId = 'work:complete'
    const order = {
      workOrderId,
      caseId: 'case:open',
      processingRecipeId: 'process',
      inputMaterials: [],
      outputMaterialId: 'processed',
      outputQuantity: 2,
      departmentId: 'department:records-analysis',
      taskType: 'records_review',
      requiredWork: 1,
      prerequisiteWorkOrderIds: [],
    }
    const state = {
      ...source,
      inventory: { processed: 0 },
      caseScopedPrerequisiteProcessingOrders: { [workOrderId]: order },
      caseScopedPrerequisiteProcessingReservations: {
        [workOrderId]: { workOrderId, caseId: 'case:open', inputMaterials: [] },
      },
      departmentWorkshopWorkOrders: {
        [workOrderId]: {
          id: workOrderId,
          caseId: 'case:open',
          departmentId: 'department:records-analysis',
          taskType: 'records_review',
          requiredWork: 1,
        },
      },
      departmentWorkshopCompletionOutcomes: {
        [workOrderId]: {
          workOrderId,
          caseId: 'case:open',
          departmentId: 'department:records-analysis',
          taskType: 'records_review',
          completedWeek: 1,
          outcome: 'completed',
        },
      },
    }
    const first = reconcileCaseScopedPrerequisiteProcessingCompletions(state)
    const replay = reconcileCaseScopedPrerequisiteProcessingCompletions({
      ...state,
      inventory: first.inventory,
      caseScopedPrerequisiteProcessingReservations: first.reservations,
    })
    expect(first.inventory.processed).toBe(2)
    expect(first.reservations).toEqual({})
    expect(replay.inventory.processed).toBe(2)
  })

  it('selects one ready successor per case in stable order and never partially mutates a blocked case', () => {
    const leaf = {
      workOrderId: 'work:leaf',
      caseId: 'case:open',
      processingRecipeId: 'extract',
      inputMaterials: [],
      outputMaterialId: 'raw',
      outputQuantity: 1,
      departmentId: 'department:records-analysis',
      taskType: 'records_review',
      requiredWork: 1,
      prerequisiteWorkOrderIds: [],
    }
    const successor = (workOrderId: string, inputQuantity = 1) => ({
      ...leaf,
      workOrderId,
      processingRecipeId: 'process',
      inputMaterials: [{ materialId: 'medical-supplies', quantity: inputQuantity }],
      outputMaterialId: 'processed',
      prerequisiteWorkOrderIds: ['work:leaf'],
    })
    const state = {
      ...source,
      week: 1,
      inventory: { 'medical-supplies': 1 },
      caseScopedPrerequisiteProcessingOrders: {
        'work:leaf': leaf,
        'work:z-ready': successor('work:z-ready'),
        'work:a-ready': successor('work:a-ready'),
      },
      departmentWorkshopWorkOrders: {
        'work:leaf': {
          id: 'work:leaf',
          caseId: 'case:open',
          departmentId: 'department:records-analysis',
          taskType: 'records_review',
          requiredWork: 1,
        },
      },
      departmentWorkshopSnapshots: {
        'department:records-analysis': {
          departmentId: 'department:records-analysis',
          slotCapacity: 1,
          queued: [],
          active: [],
          paused: [],
        },
      },
      departmentWorkshopCompletionOutcomes: {
        'work:leaf': {
          workOrderId: 'work:leaf',
          caseId: 'case:open',
          departmentId: 'department:records-analysis',
          taskType: 'records_review',
          completedWeek: 1,
          outcome: 'completed',
        },
      },
    }
    const before = structuredClone(state)
    const first = reconcileCaseScopedPrerequisiteProcessingSuccessors(state)
    expect(first.activatedWorkOrderIds).toEqual(['work:a-ready'])
    expect(state).toEqual(before)
    expect(first.inventory?.['medical-supplies']).toBe(0)
    expect(first.reservations?.['work:a-ready']).toBeDefined()
    expect((first.workshopWorkOrders as Record<string, unknown>)['work:z-ready']).toBeUndefined()

    const blockedSource = {
      ...state,
      inventory: { 'medical-supplies': 1 },
      caseScopedPrerequisiteProcessingOrders: {
        'work:leaf': leaf,
        'work:a-ready': successor('work:a-ready', 2),
      },
    }
    const blockedBefore = structuredClone(blockedSource)
    const blocked = reconcileCaseScopedPrerequisiteProcessingSuccessors(blockedSource)
    expect(blocked.activatedWorkOrderIds).toEqual([])
    expect(blocked.inventory).toBeUndefined()
    expect(blockedSource).toEqual(blockedBefore)
  })

  it('isolates cases and remains idempotent after a successful replay', () => {
    const cases = { ...source.cases, 'case:other': { id: 'case:other', status: 'open' } }
    const leaf = (caseId: string) => ({
      workOrderId: `work:leaf:${caseId}`,
      caseId,
      processingRecipeId: 'extract',
      inputMaterials: [],
      outputMaterialId: 'raw',
      outputQuantity: 1,
      departmentId: 'department:records-analysis',
      taskType: 'records_review',
      requiredWork: 1,
      prerequisiteWorkOrderIds: [],
    })
    const successor = (caseId: string) => ({
      ...leaf(caseId),
      workOrderId: `work:successor:${caseId}`,
      processingRecipeId: 'process',
      inputMaterials: [{ materialId: `material:${caseId}`, quantity: 1 }],
      outputMaterialId: 'processed',
      prerequisiteWorkOrderIds: [`work:leaf:${caseId}`],
    })
    const openCaseIds = ['case:open', 'case:other']
    const state = {
      cases,
      week: 1,
      inventory: Object.fromEntries(openCaseIds.map((caseId) => [`material:${caseId}`, 1])),
      caseScopedPrerequisiteProcessingOrders: Object.fromEntries(
        openCaseIds.flatMap((caseId) => [
          [`work:leaf:${caseId}`, leaf(caseId)],
          [`work:successor:${caseId}`, successor(caseId)],
        ])
      ),
      departmentWorkshopWorkOrders: Object.fromEntries(
        openCaseIds.map((caseId) => [
          `work:leaf:${caseId}`,
          {
            id: `work:leaf:${caseId}`,
            caseId,
            departmentId: 'department:records-analysis',
            taskType: 'records_review',
            requiredWork: 1,
          },
        ])
      ),
      departmentWorkshopSnapshots: {
        'department:records-analysis': {
          departmentId: 'department:records-analysis',
          slotCapacity: 2,
          queued: [],
          active: [],
          paused: [],
        },
      },
      departmentWorkshopCompletionOutcomes: Object.fromEntries(
        openCaseIds.map((caseId) => [
          `work:leaf:${caseId}`,
          {
            workOrderId: `work:leaf:${caseId}`,
            caseId,
            departmentId: 'department:records-analysis',
            taskType: 'records_review',
            completedWeek: 1,
            outcome: 'completed',
          },
        ])
      ),
    }
    const first = reconcileCaseScopedPrerequisiteProcessingSuccessors(state)
    expect(first.activatedWorkOrderIds).toEqual([
      'work:successor:case:open',
      'work:successor:case:other',
    ])
    const replay = reconcileCaseScopedPrerequisiteProcessingSuccessors({
      ...state,
      inventory: first.inventory,
      caseScopedPrerequisiteProcessingReservations: first.reservations,
      departmentWorkshopWorkOrders: first.workshopWorkOrders,
      departmentWorkshopSnapshots: first.workshopSnapshots,
    })
    expect(replay.activatedWorkOrderIds).toEqual([])
  })
})
