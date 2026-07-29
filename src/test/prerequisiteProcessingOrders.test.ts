import { describe, expect, it } from 'vitest'
import {
  createCaseScopedPrerequisiteProcessingOrders,
  readCaseScopedPrerequisiteProcessingOrders,
  sanitizeCaseScopedPrerequisiteProcessingOrders,
} from '../domain/prerequisiteProcessingOrders'
import { planPrerequisiteProcessing } from '../domain/prerequisiteProcessing'

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
    expect(Object.keys(records).every((workOrderId) => workOrderId.startsWith('processing:'))).toBe(true)
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
      'work:cycle-a': { ...valid, workOrderId: 'work:cycle-a', prerequisiteWorkOrderIds: ['work:cycle-b'] },
      'work:cycle-b': { ...valid, workOrderId: 'work:cycle-b', prerequisiteWorkOrderIds: ['work:cycle-a'] },
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
})
