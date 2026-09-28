import { describe, expect, it, vi } from 'vitest'
import { createStartingState } from '../data/startingState'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS } from '../domain/specialistLaborOperatorFeed'

const WORK_ORDER_ID = 'work:records-feed-wire'
const RECORDS_DEPARTMENT_ID = 'department:records-analysis'

const { projectSpy } = vi.hoisted(() => ({
  projectSpy: vi.fn(),
}))

vi.mock('../domain/specialistLaborOperatorFeed', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../domain/specialistLaborOperatorFeed')>()
  return {
    ...actual,
    projectSpecialistLaborGateInputsByWorkOrderId(
      ...args: Parameters<typeof actual.projectSpecialistLaborGateInputsByWorkOrderId>
    ) {
      return projectSpy(...args)
    },
  }
})

describe('SPE-3112 advanceWeek operator feed wire', () => {
  it('passes the projected gate map into week-close quality registration', () => {
    projectSpy.mockImplementation(() => ({
      [WORK_ORDER_ID]: {
        taskId: 'archive_classification',
        operators: [
          {
            roleFamily: 'archive_analyst',
            skillBand: 'novice',
            availabilityBand: 'fit',
          },
        ],
      },
    }))

    const state = createStartingState()
    state.events = []
    state.reports = []
    state.departmentWorkshopWorkOrders = {
      [WORK_ORDER_ID]: {
        id: WORK_ORDER_ID,
        departmentId: RECORDS_DEPARTMENT_ID,
        caseId: 'case-records-feed-wire',
        taskType: 'records_review',
        requiredWork: 1,
      },
    }
    state.departmentWorkshopSnapshots = {
      [RECORDS_DEPARTMENT_ID]: {
        departmentId: RECORDS_DEPARTMENT_ID,
        slotCapacity: 1,
        queued: [],
        active: [{ workOrderId: WORK_ORDER_ID, completedWork: 0 }],
        paused: [],
      },
    }
    state.departmentWorkshopCompletionOutcomes = {}

    const next = advanceWeek(state)

    expect(projectSpy).toHaveBeenCalledWith(
      state.departmentWorkshopWorkOrders,
      PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS
    )
    expect(next.departmentWorkshopCompletionOutcomes?.[WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'degraded',
      qualityReason: 'poor_specialist_condition',
    })
  })
})
