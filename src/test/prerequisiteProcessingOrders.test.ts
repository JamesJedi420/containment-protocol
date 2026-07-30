import { describe, expect, it } from 'vitest'
import {
  createCaseScopedPrerequisiteProcessingOrders,
  createCaseScopedWorkshopFinalizationRequest,
  readCaseScopedPrerequisiteProcessingOrders,
  reconcileCaseScopedPrerequisiteProcessingReservationReleases,
  reserveAndEnqueueCaseScopedPrerequisiteProcessingOrder,
  reconcileCaseScopedPrerequisiteProcessingCompletions,
  reconcileCaseScopedPrerequisiteProcessingSuccessors,
  reconcileCaseScopedWorkshopFinalizationHandoffs,
  registerCaseScopedPrerequisiteProcessingTerminalSignal,
  sanitizeCaseScopedPrerequisiteProcessingOrders,
  sanitizeCaseScopedPrerequisiteProcessingTerminalSignals,
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
    const finalizationRequest = createCaseScopedWorkshopFinalizationRequest(
      plan,
      'case:open',
      source
    )

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
    expect(finalizationRequest).toEqual({
      finalRecipeId: 'final',
      requiredWorkOrderIds: [
        Object.keys(records).find(
          (workOrderId) => records[workOrderId]?.processingRecipeId === 'process'
        ),
      ],
    })
    expect(Object.isFrozen(finalizationRequest)).toBe(true)
    expect(Object.isFrozen(finalizationRequest?.requiredWorkOrderIds)).toBe(true)
    expect(createCaseScopedPrerequisiteProcessingOrders(plan, 'case:missing', source)).toEqual({})
    expect(
      createCaseScopedWorkshopFinalizationRequest(plan, 'case:missing', source)
    ).toBeUndefined()
  })

  it('creates one catalog-derived finalization handoff from exact case completion proof', () => {
    const workOrderId = 'work:final-input'
    const order = {
      workOrderId,
      caseId: 'case:open',
      processingRecipeId: 'prepare-medical-supplies',
      inputMaterials: [],
      outputMaterialId: 'medical_supplies',
      outputQuantity: 2,
      departmentId: 'department:records-analysis',
      taskType: 'records_review',
      requiredWork: 1,
      prerequisiteWorkOrderIds: [],
    }
    const game = {
      cases: {
        'case:open': {
          id: 'case:open',
          status: 'open',
          departmentWorkshopCompletionWorkOrderIds: [workOrderId],
          departmentWorkshopFinalizationRequest: {
            finalRecipeId: 'med-kits',
            requiredWorkOrderIds: [workOrderId],
          },
        },
      },
      caseScopedPrerequisiteProcessingOrders: { [workOrderId]: order },
      departmentWorkshopWorkOrders: {
        [workOrderId]: {
          id: workOrderId,
          caseId: 'case:open',
          departmentId: order.departmentId,
          taskType: order.taskType,
          requiredWork: order.requiredWork,
        },
      },
      departmentWorkshopCompletionOutcomes: {
        [workOrderId]: {
          workOrderId,
          caseId: 'case:open',
          departmentId: order.departmentId,
          taskType: order.taskType,
          completedWeek: 4,
          outcome: 'completed',
        },
      },
    }
    const recipes = [
      {
        recipeId: 'med-kits',
        outputItemId: 'medkits',
        outputQuantity: 1,
        inputMaterials: { medical_supplies: 2 },
      },
    ]

    const result = reconcileCaseScopedWorkshopFinalizationHandoffs(game, recipes)
    const replay = reconcileCaseScopedWorkshopFinalizationHandoffs(
      { ...game, cases: result.cases },
      recipes
    )

    expect(result.handedOffCaseIds).toEqual(['case:open'])
    expect(result.cases['case:open']).toMatchObject({
      departmentWorkshopFinalizationHandoff: {
        finalRecipeId: 'med-kits',
        outputItemId: 'medkits',
        outputQuantity: 1,
        sourceWorkOrderIds: [workOrderId],
        handoffWeek: 4,
      },
    })
    expect(replay.handedOffCaseIds).toEqual([])
    expect(replay.cases).toBe(result.cases)
  })

  it('isolates malformed, cross-case, resolved, and overflow finalization mappings', () => {
    const validWorkOrderId = 'work:valid-final-input'
    const validOrder = {
      workOrderId: validWorkOrderId,
      caseId: 'case:valid',
      processingRecipeId: 'prepare-medical-supplies',
      inputMaterials: [],
      outputMaterialId: 'medical_supplies',
      outputQuantity: 2,
      departmentId: 'department:records-analysis',
      taskType: 'records_review',
      requiredWork: 1,
      prerequisiteWorkOrderIds: [],
    }
    const cases = Object.fromEntries(
      ['case:valid', 'case:cross', 'case:resolved'].map((caseId) => [
        caseId,
        {
          id: caseId,
          status: caseId === 'case:resolved' ? 'resolved' : 'open',
          departmentWorkshopCompletionWorkOrderIds: [validWorkOrderId],
          departmentWorkshopFinalizationRequest: {
            finalRecipeId: 'med-kits',
            requiredWorkOrderIds: [validWorkOrderId],
          },
        },
      ])
    )
    const game = {
      cases,
      caseScopedPrerequisiteProcessingOrders: { [validWorkOrderId]: validOrder },
      departmentWorkshopWorkOrders: {
        [validWorkOrderId]: {
          id: validWorkOrderId,
          caseId: validOrder.caseId,
          departmentId: validOrder.departmentId,
          taskType: validOrder.taskType,
          requiredWork: validOrder.requiredWork,
        },
      },
      departmentWorkshopCompletionOutcomes: {
        [validWorkOrderId]: {
          workOrderId: validWorkOrderId,
          caseId: validOrder.caseId,
          departmentId: validOrder.departmentId,
          taskType: validOrder.taskType,
          completedWeek: 2,
          outcome: 'completed',
        },
      },
    }
    const recipes = [
      {
        recipeId: 'med-kits',
        outputItemId: 'medkits',
        outputQuantity: 1,
        inputMaterials: { medical_supplies: 2 },
      },
      {
        recipeId: 'overflow',
        outputItemId: 'bad',
        outputQuantity: Number.MAX_SAFE_INTEGER + 1,
        inputMaterials: { medical_supplies: 2 },
      },
    ]

    const result = reconcileCaseScopedWorkshopFinalizationHandoffs(game, recipes)

    expect(result.handedOffCaseIds).toEqual(['case:valid'])
    expect(result.cases['case:cross']).not.toHaveProperty('departmentWorkshopFinalizationHandoff')
    expect(result.cases['case:resolved']).not.toHaveProperty(
      'departmentWorkshopFinalizationHandoff'
    )
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

  it.each(['failed', 'cancelled'] as const)(
    'registers %s proof and refunds exact reserved inputs once',
    (reason) => {
      const workOrderId = `work:${reason}`
      const order = {
        workOrderId,
        caseId: 'case:open',
        processingRecipeId: 'process',
        inputMaterials: [
          { materialId: 'raw', quantity: 2 },
          { materialId: 'reagent', quantity: 1 },
        ],
        outputMaterialId: 'processed',
        outputQuantity: 1,
        departmentId: 'department:records-analysis',
        taskType: 'records_review',
        requiredWork: 2,
        prerequisiteWorkOrderIds: [],
      }
      const state = {
        ...source,
        week: 2,
        inventory: { raw: 0, reagent: 3 },
        caseScopedPrerequisiteProcessingOrders: { [workOrderId]: order },
        caseScopedPrerequisiteProcessingReservations: {
          [workOrderId]: {
            workOrderId,
            caseId: 'case:open',
            inputMaterials: order.inputMaterials,
          },
        },
        departmentWorkshopWorkOrders: {
          [workOrderId]: {
            id: workOrderId,
            caseId: 'case:open',
            departmentId: 'department:records-analysis',
            taskType: 'records_review',
            requiredWork: 2,
          },
        },
      }
      const registered = registerCaseScopedPrerequisiteProcessingTerminalSignal(
        state,
        workOrderId,
        reason,
        2
      )
      const withSignal = {
        ...state,
        caseScopedPrerequisiteProcessingTerminalSignals: registered.signals,
      }
      const registrationReplay = registerCaseScopedPrerequisiteProcessingTerminalSignal(
        withSignal,
        workOrderId,
        reason,
        2
      )
      const before = structuredClone(withSignal)
      const released = reconcileCaseScopedPrerequisiteProcessingReservationReleases(withSignal)
      const replay = reconcileCaseScopedPrerequisiteProcessingReservationReleases({
        ...withSignal,
        inventory: released.inventory,
        caseScopedPrerequisiteProcessingReservations: released.reservations,
      })

      expect(registered.registeredWorkOrderIds).toEqual([workOrderId])
      expect(registrationReplay.registeredWorkOrderIds).toEqual([])
      expect(registrationReplay.reasons).toEqual([])
      expect(registrationReplay.signals).toEqual(registered.signals)
      expect(
        registerCaseScopedPrerequisiteProcessingTerminalSignal(
          withSignal,
          workOrderId,
          reason === 'failed' ? 'cancelled' : 'failed',
          2
        ).reasons
      ).toEqual(['already-terminal'])
      expect(registered.signals[workOrderId]).toEqual({
        workOrderId,
        caseId: 'case:open',
        departmentId: 'department:records-analysis',
        taskType: 'records_review',
        terminalWeek: 2,
        reason,
      })
      expect(released.releasedWorkOrderIds).toEqual([workOrderId])
      expect(released.inventory).toEqual({ raw: 2, reagent: 4 })
      expect(released.reservations).toEqual({})
      expect(replay.releasedWorkOrderIds).toEqual([])
      expect(replay.inventory).toEqual(released.inventory)
      expect(withSignal).toEqual(before)
    }
  )

  it('rejects invalid registration proof and never refunds a canonically completed order', () => {
    const workOrderId = 'work:terminal-race'
    const order = {
      workOrderId,
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
    const state = {
      ...source,
      week: 2,
      inventory: { raw: 0 },
      caseScopedPrerequisiteProcessingOrders: { [workOrderId]: order },
      caseScopedPrerequisiteProcessingReservations: {
        [workOrderId]: {
          workOrderId,
          caseId: 'case:open',
          inputMaterials: order.inputMaterials,
        },
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
    }
    expect(
      registerCaseScopedPrerequisiteProcessingTerminalSignal(state, workOrderId, 'abandoned', 2)
        .reasons
    ).toEqual(['invalid-terminal-reason'])
    expect(
      registerCaseScopedPrerequisiteProcessingTerminalSignal(state, workOrderId, 'failed', 3)
        .reasons
    ).toEqual(['invalid-terminal-week'])

    const terminal = {
      workOrderId,
      caseId: 'case:open',
      departmentId: 'department:records-analysis',
      taskType: 'records_review',
      terminalWeek: 2,
      reason: 'failed',
    }
    const completedState = {
      ...state,
      caseScopedPrerequisiteProcessingTerminalSignals: { [workOrderId]: terminal },
      departmentWorkshopCompletionOutcomes: {
        [workOrderId]: {
          workOrderId,
          caseId: 'case:open',
          departmentId: 'department:records-analysis',
          taskType: 'records_review',
          completedWeek: 2,
          outcome: 'completed',
        },
      },
    }
    const released = reconcileCaseScopedPrerequisiteProcessingReservationReleases(completedState)
    expect(released.releasedWorkOrderIds).toEqual([])
    expect(released.inventory.raw).toBe(0)
    expect(released.reservations[workOrderId]).toBeDefined()
    expect(
      registerCaseScopedPrerequisiteProcessingTerminalSignal(
        completedState,
        workOrderId,
        'cancelled',
        2
      ).reasons
    ).toEqual(['already-completed'])
  })

  it('isolates invalid provenance, inflated inputs, and inventory overflow by work order', () => {
    const cases = {
      ...source.cases,
      'case:other': { id: 'case:other', status: 'open' },
      'case:third': { id: 'case:third', status: 'open' },
    }
    const order = (workOrderId: string, caseId: string, materialId: string) => ({
      workOrderId,
      caseId,
      processingRecipeId: 'process',
      inputMaterials: [{ materialId, quantity: 1 }],
      outputMaterialId: 'processed',
      outputQuantity: 1,
      departmentId: 'department:records-analysis',
      taskType: 'records_review',
      requiredWork: 1,
      prerequisiteWorkOrderIds: [],
    })
    const orders = {
      'work:a-overflow': order('work:a-overflow', 'case:open', 'overflow'),
      'work:m-mismatch': order('work:m-mismatch', 'case:other', 'mismatch'),
      'work:z-valid': order('work:z-valid', 'case:third', 'valid'),
    }
    const workshops = Object.fromEntries(
      Object.values(orders).map((entry) => [
        entry.workOrderId,
        {
          id: entry.workOrderId,
          caseId: entry.caseId,
          departmentId: entry.departmentId,
          taskType: entry.taskType,
          requiredWork: entry.requiredWork,
        },
      ])
    )
    const signals = Object.fromEntries(
      Object.values(orders).map((entry) => [
        entry.workOrderId,
        {
          workOrderId: entry.workOrderId,
          caseId: entry.caseId,
          departmentId: entry.departmentId,
          taskType: entry.taskType,
          terminalWeek: 1,
          reason: 'failed',
        },
      ])
    )
    const state = {
      cases,
      week: 1,
      inventory: { overflow: Number.MAX_SAFE_INTEGER, mismatch: 0, valid: 0 },
      caseScopedPrerequisiteProcessingOrders: orders,
      caseScopedPrerequisiteProcessingReservations: {
        'work:a-overflow': {
          workOrderId: 'work:a-overflow',
          caseId: 'case:open',
          inputMaterials: orders['work:a-overflow'].inputMaterials,
        },
        'work:m-mismatch': {
          workOrderId: 'work:m-mismatch',
          caseId: 'case:other',
          inputMaterials: [{ materialId: 'mismatch', quantity: 2 }],
        },
        'work:z-valid': {
          workOrderId: 'work:z-valid',
          caseId: 'case:third',
          inputMaterials: orders['work:z-valid'].inputMaterials,
        },
      },
      caseScopedPrerequisiteProcessingTerminalSignals: signals,
      departmentWorkshopWorkOrders: workshops,
    }
    const released = reconcileCaseScopedPrerequisiteProcessingReservationReleases(state)
    expect(released.releasedWorkOrderIds).toEqual(['work:z-valid'])
    expect(released.inventory).toEqual({
      overflow: Number.MAX_SAFE_INTEGER,
      mismatch: 0,
      valid: 1,
    })
    expect(Object.keys(released.reservations)).toEqual(['work:a-overflow', 'work:m-mismatch'])
    const invalidInventory = reconcileCaseScopedPrerequisiteProcessingReservationReleases({
      ...state,
      inventory: undefined,
    })
    expect(invalidInventory.releasedWorkOrderIds).toEqual([])
    expect(Object.keys(invalidInventory.reservations)).toEqual([
      'work:a-overflow',
      'work:m-mismatch',
      'work:z-valid',
    ])
  })

  it('sanitizes terminal signals in stable order and drops malformed or future siblings', () => {
    const valid = {
      workOrderId: 'work:valid',
      caseId: 'case:open',
      departmentId: 'department:records-analysis',
      taskType: 'records_review',
      terminalWeek: 2,
      reason: 'cancelled',
    }
    const sanitized = sanitizeCaseScopedPrerequisiteProcessingTerminalSignals(
      {
        'work:zulu': { ...valid, workOrderId: 'work:zulu' },
        'work:future': { ...valid, workOrderId: 'work:future', terminalWeek: 3 },
        'work:bad-reason': { ...valid, workOrderId: 'work:bad-reason', reason: 'abandoned' },
        mismatch: valid,
        'work:valid': valid,
      },
      { week: 2 }
    )
    expect(Object.keys(sanitized)).toEqual(['work:valid', 'work:zulu'])
    expect(Object.isFrozen(sanitized)).toBe(true)
    expect(Object.isFrozen(sanitized['work:valid'])).toBe(true)
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

  it('skips a canonically terminalled successor instead of reactivating it', () => {
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
    const terminalled = {
      ...leaf,
      workOrderId: 'work:a-terminalled',
      processingRecipeId: 'process',
      inputMaterials: [{ materialId: 'raw', quantity: 1 }],
      outputMaterialId: 'processed',
      prerequisiteWorkOrderIds: ['work:leaf'],
    }
    const eligible = { ...terminalled, workOrderId: 'work:z-eligible' }
    const state = {
      ...source,
      week: 1,
      inventory: { raw: 1 },
      caseScopedPrerequisiteProcessingOrders: {
        'work:leaf': leaf,
        'work:a-terminalled': terminalled,
        'work:z-eligible': eligible,
      },
      caseScopedPrerequisiteProcessingTerminalSignals: {
        'work:a-terminalled': {
          workOrderId: 'work:a-terminalled',
          caseId: 'case:open',
          departmentId: 'department:records-analysis',
          taskType: 'records_review',
          terminalWeek: 1,
          reason: 'failed',
        },
      },
      departmentWorkshopWorkOrders: {
        'work:leaf': {
          id: 'work:leaf',
          caseId: 'case:open',
          departmentId: 'department:records-analysis',
          taskType: 'records_review',
          requiredWork: 1,
        },
        'work:a-terminalled': {
          id: 'work:a-terminalled',
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
    const result = reconcileCaseScopedPrerequisiteProcessingSuccessors(state)
    expect(result.activatedWorkOrderIds).toEqual([])
    expect(result.reservations?.['work:a-terminalled']).toBeUndefined()
    expect(
      reserveAndEnqueueCaseScopedPrerequisiteProcessingOrder(state, 'work:a-terminalled')
    ).toEqual({ state: 'blocked', reasons: ['terminal-processing-order'] })
  })
})
