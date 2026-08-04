import { describe, expect, it } from 'vitest'

import {
  registerDepartmentWorkshopCompletionOutcomes,
  type DepartmentWorkshopCompletionOutcome,
  type DepartmentWorkshopSafetyConditionsByDepartment,
} from './departmentWorkshopQueue'

describe('registerDepartmentWorkshopCompletionOutcomes', () => {
  it('uses department-scoped safety conditions for new receipts while preserving existing outcomes', () => {
    const existingOutcome: DepartmentWorkshopCompletionOutcome = {
      workOrderId: 'existing-order',
      departmentId: 'department:concept-embodiment-research',
      caseId: 'case-a',
      taskType: 'research_case',
      completedWeek: 2,
      outcome: 'completed',
      quality: 'degraded',
      qualityReason: 'poor_input_quality',
      safety: 'safe',
    }

    const source = {
      departmentWorkshopWorkOrders: {
        'existing-order': {
          id: 'existing-order',
          departmentId: 'department:concept-embodiment-research',
          caseId: 'case-a',
          taskType: 'research_case',
          requiredWork: 1,
        },
        'new-order': {
          id: 'new-order',
          departmentId: 'department:concept-embodiment-research',
          caseId: 'case-b',
          taskType: 'research_case',
          requiredWork: 1,
        },
      },
      departmentWorkshopSnapshots: {
        'department:biohazard-response': {
          departmentId: 'department:biohazard-response',
          slotCapacity: 1,
          queued: [],
          active: [],
          paused: [],
        },
      },
      departmentWorkshopCompletionOutcomes: {
        'existing-order': existingOutcome,
      },
    }

    const safetyConditionsByDepartment: DepartmentWorkshopSafetyConditionsByDepartment = {
      'department:biohazard-response': [
        {
          departmentId: 'department:concept-embodiment-research',
          workOrderId: 'new-order',
          isolation: 'poor',
          ventilation: 'good',
          ppe: 'good',
          dualAuth: 'good',
        },
      ],
    }

    const result = registerDepartmentWorkshopCompletionOutcomes(
      source,
      ['new-order'],
      3,
      undefined,
      undefined,
      safetyConditionsByDepartment,
    )

    expect(result.registeredWorkOrderIds).toEqual(['new-order'])
    expect(result.outcomes['existing-order']).toEqual(existingOutcome)
    expect(result.outcomes['new-order']).toMatchObject({
      safety: 'unsafe',
      safetyReason: 'inadequate_isolation',
      quality: 'nominal',
    })
  })
})
