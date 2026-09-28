import { describe, expect, it, vi } from 'vitest'
import { createStartingState } from '../data/startingState'
import { advanceWeek } from '../domain/sim/advanceWeek'
import {
  CAMPAIGN_SPECIALIST_LABOR_OPERATOR_SLOTS,
  PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS,
} from '../domain/specialistLaborOperatorFeed'
import type { GameState } from '../domain/models'

const WORK_ORDER_ID = 'work:records-feed-wire'
const CONTAINMENT_WORK_ORDER_ID = 'work:containment-feed-wire'
const SIBLING_WORK_ORDER_ID = 'work:research-feed-wire'
const RECORDS_DEPARTMENT_ID = 'department:records-analysis'
const FIELD_CONTAINMENT_DEPARTMENT_ID = 'department:field-containment'

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

function makePairedWorkshopState(options?: {
  includeContainment?: boolean
  includeSibling?: boolean
  /** Clear mapped investigators so week-close keeps the campaign roster. */
  clearMappedPersonnel?: boolean
}): GameState {
  const state = createStartingState()
  state.events = []
  state.reports = []
  if (options?.clearMappedPersonnel) {
    state.agents = Object.fromEntries(
      Object.entries(state.agents ?? {}).map(([id, agent]) => [
        id,
        { ...agent, role: agent.role === 'investigator' ? 'hunter' : agent.role },
      ])
    )
    state.staff = {}
  }
  state.departmentWorkshopWorkOrders = {
    [WORK_ORDER_ID]: {
      id: WORK_ORDER_ID,
      departmentId: RECORDS_DEPARTMENT_ID,
      caseId: 'case-records-feed-wire',
      taskType: 'records_review',
      requiredWork: 1,
    },
    ...(options?.includeSibling
      ? {
          [SIBLING_WORK_ORDER_ID]: {
            id: SIBLING_WORK_ORDER_ID,
            departmentId: RECORDS_DEPARTMENT_ID,
            caseId: 'case-research-feed-wire',
            taskType: 'research_case' as const,
            requiredWork: 1,
          },
        }
      : {}),
    ...(options?.includeContainment
      ? {
          [CONTAINMENT_WORK_ORDER_ID]: {
            id: CONTAINMENT_WORK_ORDER_ID,
            departmentId: FIELD_CONTAINMENT_DEPARTMENT_ID,
            caseId: 'case-containment-feed-wire',
            taskType: 'containment_response' as const,
            requiredWork: 1,
          },
        }
      : {}),
  }
  state.departmentWorkshopSnapshots = {
    [RECORDS_DEPARTMENT_ID]: {
      departmentId: RECORDS_DEPARTMENT_ID,
      slotCapacity: options?.includeSibling ? 2 : 1,
      queued: [],
      active: [
        { workOrderId: WORK_ORDER_ID, completedWork: 0 },
        ...(options?.includeSibling
          ? [{ workOrderId: SIBLING_WORK_ORDER_ID, completedWork: 0 }]
          : []),
      ],
      paused: [],
    },
    ...(options?.includeContainment
      ? {
          [FIELD_CONTAINMENT_DEPARTMENT_ID]: {
            departmentId: FIELD_CONTAINMENT_DEPARTMENT_ID,
            slotCapacity: 1,
            queued: [],
            active: [{ workOrderId: CONTAINMENT_WORK_ORDER_ID, completedWork: 0 }],
            paused: [],
          },
        }
      : {}),
  }
  state.departmentWorkshopCompletionOutcomes = {}
  return state
}

describe('SPE-3112 / SPE-3117 advanceWeek operator feed wire', () => {
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

    const state = makePairedWorkshopState({ clearMappedPersonnel: true })
    const next = advanceWeek(state)

    expect(projectSpy).toHaveBeenCalledWith(
      state.departmentWorkshopWorkOrders,
      CAMPAIGN_SPECIALIST_LABOR_OPERATOR_SLOTS
    )
    expect(next.departmentWorkshopCompletionOutcomes?.[WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'degraded',
      qualityReason: 'poor_specialist_condition',
    })
  })

  it('uses the real projector so absent slots complete both gated pairs', async () => {
    const actual = await vi.importActual<
      typeof import('../domain/specialistLaborOperatorFeed')
    >('../domain/specialistLaborOperatorFeed')
    projectSpy.mockImplementation(actual.projectSpecialistLaborGateInputsByWorkOrderId)

    const state = makePairedWorkshopState({
      includeContainment: true,
      includeSibling: true,
      clearMappedPersonnel: true,
    })
    expect(state.specialistOperatorSlots).toBeUndefined()

    const next = advanceWeek(state)
    expect(projectSpy).toHaveBeenCalledWith(
      state.departmentWorkshopWorkOrders,
      CAMPAIGN_SPECIALIST_LABOR_OPERATOR_SLOTS
    )
    expect(next.departmentWorkshopCompletionOutcomes?.[WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'nominal',
    })
    expect(next.departmentWorkshopCompletionOutcomes?.[CONTAINMENT_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'nominal',
    })
    expect(next.departmentWorkshopCompletionOutcomes?.[SIBLING_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'nominal',
    })
    expect(next.specialistOperatorSlots).toBeUndefined()
  })

  it('stalls both gated tasks on a present empty list while the sibling completes', async () => {
    const actual = await vi.importActual<
      typeof import('../domain/specialistLaborOperatorFeed')
    >('../domain/specialistLaborOperatorFeed')
    projectSpy.mockImplementation(actual.projectSpecialistLaborGateInputsByWorkOrderId)

    const state = makePairedWorkshopState({ includeContainment: true, includeSibling: true })
    state.specialistOperatorSlots = []

    const next = advanceWeek(state)
    expect(projectSpy).toHaveBeenCalledWith(state.departmentWorkshopWorkOrders, [])
    expect(next.departmentWorkshopCompletionOutcomes?.[WORK_ORDER_ID]).toBeUndefined()
    expect(next.departmentWorkshopCompletionOutcomes?.[CONTAINMENT_WORK_ORDER_ID]).toBeUndefined()
    expect(next.departmentWorkshopCompletionOutcomes?.[SIBLING_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'nominal',
    })
  })

  it('keeps an archive_analyst-only saved list and stalls only containment_response', async () => {
    const actual = await vi.importActual<
      typeof import('../domain/specialistLaborOperatorFeed')
    >('../domain/specialistLaborOperatorFeed')
    projectSpy.mockImplementation(actual.projectSpecialistLaborGateInputsByWorkOrderId)

    const state = makePairedWorkshopState({ includeContainment: true })
    state.specialistOperatorSlots = [...PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS]

    const next = advanceWeek(state)
    expect(projectSpy).toHaveBeenCalledWith(
      state.departmentWorkshopWorkOrders,
      PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS
    )
    expect(next.specialistOperatorSlots).toEqual(PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS)
    expect(next.departmentWorkshopCompletionOutcomes?.[WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'nominal',
    })
    expect(next.departmentWorkshopCompletionOutcomes?.[CONTAINMENT_WORK_ORDER_ID]).toBeUndefined()
  })
})
