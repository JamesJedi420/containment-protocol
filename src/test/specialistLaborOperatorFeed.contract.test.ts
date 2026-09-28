import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { BIOHAZARD_RESPONSE_FACILITY_ID } from '../domain/departmentWorkshopFacilityMapping'
import { runDepartmentWorkshopSpecialistLaborWeekClose } from '../domain/departmentWorkshopSpecialistLaborWeekClose'
import type { FacilityStatus, GameState } from '../domain/models'
import {
  PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS,
  projectSpecialistLaborGateInputsByWorkOrderId,
} from '../domain/specialistLaborOperatorFeed'
import type { SpecialistOperatorSlot } from '../domain/specialistLaborRegistry'

const RECORDS_DEPARTMENT_ID = 'department:records-analysis'
const BIO_DEPARTMENT_ID = 'department:biohazard-response'
const RECORDS_WORK_ORDER_ID = 'work:records-operator-feed'
const LATER_RECORDS_WORK_ORDER_ID = 'work:records-operator-feed-b'
const SIBLING_WORK_ORDER_ID = 'work:research-operator-feed'
const BIO_WORK_ORDER_ID = 'work:bio-operator-feed'

function makeFacility(status: FacilityStatus) {
  return {
    facilityId: BIOHAZARD_RESPONSE_FACILITY_ID,
    category: 'biohazard_response_lab',
    level: 1,
    maxLevel: 3,
    status,
    effects: {},
  }
}

function makeWorkshopState(options?: {
  includeSibling?: boolean
  includeLaterRecords?: boolean
  includeBio?: boolean
  facilityStatus?: FacilityStatus
  recordsTaskType?: 'records_review' | 'research_case'
}): GameState {
  const state = createStartingState()
  state.events = []
  state.reports = []
  state.facilityState = {
    facilities:
      options?.facilityStatus !== undefined
        ? { [BIOHAZARD_RESPONSE_FACILITY_ID]: makeFacility(options.facilityStatus) }
        : {},
  }

  const active = [
    { workOrderId: RECORDS_WORK_ORDER_ID, completedWork: 0 },
    ...(options?.includeSibling ? [{ workOrderId: SIBLING_WORK_ORDER_ID, completedWork: 0 }] : []),
    ...(options?.includeLaterRecords
      ? [{ workOrderId: LATER_RECORDS_WORK_ORDER_ID, completedWork: 0 }]
      : []),
  ]

  state.departmentWorkshopWorkOrders = {
    [RECORDS_WORK_ORDER_ID]: {
      id: RECORDS_WORK_ORDER_ID,
      departmentId: RECORDS_DEPARTMENT_ID,
      caseId: 'case-records-operator-feed',
      taskType: options?.recordsTaskType ?? 'records_review',
      requiredWork: 1,
    },
    ...(options?.includeSibling
      ? {
          [SIBLING_WORK_ORDER_ID]: {
            id: SIBLING_WORK_ORDER_ID,
            departmentId: RECORDS_DEPARTMENT_ID,
            caseId: 'case-research-operator-feed',
            taskType: 'research_case' as const,
            requiredWork: 1,
          },
        }
      : {}),
    ...(options?.includeLaterRecords
      ? {
          [LATER_RECORDS_WORK_ORDER_ID]: {
            id: LATER_RECORDS_WORK_ORDER_ID,
            departmentId: RECORDS_DEPARTMENT_ID,
            caseId: 'case-records-operator-feed-b',
            taskType: 'records_review' as const,
            requiredWork: 1,
          },
        }
      : {}),
  }
  state.departmentWorkshopSnapshots = {
    [RECORDS_DEPARTMENT_ID]: {
      departmentId: RECORDS_DEPARTMENT_ID,
      slotCapacity: active.length,
      queued: [],
      active,
      paused: [],
    },
  }

  if (options?.includeBio) {
    state.departmentWorkshopWorkOrders[BIO_WORK_ORDER_ID] = {
      id: BIO_WORK_ORDER_ID,
      departmentId: BIO_DEPARTMENT_ID,
      caseId: 'case-bio-operator-feed',
      taskType: 'research_case',
      requiredWork: 1,
    }
    state.departmentWorkshopSnapshots[BIO_DEPARTMENT_ID] = {
      departmentId: BIO_DEPARTMENT_ID,
      slotCapacity: 1,
      queued: [],
      active: [{ workOrderId: BIO_WORK_ORDER_ID, completedWork: 0 }],
      paused: [],
    }
  }

  state.departmentWorkshopCompletionOutcomes = {}
  return state
}

function noviceSlots(): readonly SpecialistOperatorSlot[] {
  return [
    {
      roleFamily: 'archive_analyst',
      skillBand: 'novice',
      availabilityBand: 'fit',
    },
  ]
}

function wrongRoleSlots(): readonly SpecialistOperatorSlot[] {
  return [
    {
      roleFamily: 'refinement_technician',
      skillBand: 'expert',
      availabilityBand: 'fit',
    },
  ]
}

describe('SPE-3112 specialist operator feed', () => {
  it('omits the gate map when operator slots are undefined', () => {
    const state = makeWorkshopState()
    expect(
      projectSpecialistLaborGateInputsByWorkOrderId(state.departmentWorkshopWorkOrders, undefined)
    ).toBeUndefined()

    const result = runDepartmentWorkshopSpecialistLaborWeekClose(
      state,
      state.week,
      undefined,
      undefined
    )
    expect(result.tick.completedWorkOrderIds).toContain(RECORDS_WORK_ORDER_ID)
    expect(result.completionOutcomes.outcomes[RECORDS_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'nominal',
    })
  })

  it('omits the map when no work order is records_review', () => {
    const state = makeWorkshopState({ recordsTaskType: 'research_case' })
    expect(
      projectSpecialistLaborGateInputsByWorkOrderId(
        state.departmentWorkshopWorkOrders,
        PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS
      )
    ).toBeUndefined()
  })

  it('projects production slots onto records_review ids in code-unit order', () => {
    const state = makeWorkshopState({ includeLaterRecords: true, includeSibling: true })
    state.departmentWorkshopWorkOrders!['work:malformed'] = {
      id: '  ',
      departmentId: RECORDS_DEPARTMENT_ID,
      caseId: 'case-malformed',
      taskType: 'records_review',
      requiredWork: 1,
    }
    state.departmentWorkshopWorkOrders![LATER_RECORDS_WORK_ORDER_ID] = {
      ...state.departmentWorkshopWorkOrders![LATER_RECORDS_WORK_ORDER_ID]!,
      id: LATER_RECORDS_WORK_ORDER_ID,
    }

    const first = projectSpecialistLaborGateInputsByWorkOrderId(
      state.departmentWorkshopWorkOrders,
      PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS
    )
    const replay = projectSpecialistLaborGateInputsByWorkOrderId(
      state.departmentWorkshopWorkOrders,
      PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS
    )

    expect(first).toBeDefined()
    expect(Object.keys(first!)).toEqual([RECORDS_WORK_ORDER_ID, LATER_RECORDS_WORK_ORDER_ID])
    expect(first![RECORDS_WORK_ORDER_ID]).toEqual({
      taskId: 'archive_classification',
      operators: [
        {
          roleFamily: 'archive_analyst',
          skillBand: 'competent',
          availabilityBand: 'fit',
        },
      ],
    })
    expect(first![RECORDS_WORK_ORDER_ID]).not.toHaveProperty('infrastructurePresent')
    expect(first![RECORDS_WORK_ORDER_ID]?.operators).toBe(
      first![LATER_RECORDS_WORK_ORDER_ID]?.operators
    )
    expect(Object.isFrozen(first)).toBe(true)
    expect(Object.isFrozen(first![RECORDS_WORK_ORDER_ID])).toBe(true)
    expect(replay).toEqual(first)
  })

  it('completes an operable production feed without poor_specialist_condition', () => {
    const state = makeWorkshopState()
    const gateInputs = projectSpecialistLaborGateInputsByWorkOrderId(
      state.departmentWorkshopWorkOrders,
      PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS
    )
    const result = runDepartmentWorkshopSpecialistLaborWeekClose(
      state,
      state.week,
      undefined,
      gateInputs
    )

    expect(result.tick.completedWorkOrderIds).toContain(RECORDS_WORK_ORDER_ID)
    expect(result.completionOutcomes.outcomes[RECORDS_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'nominal',
    })
    expect(result.completionOutcomes.outcomes[RECORDS_WORK_ORDER_ID]?.qualityReason).toBeUndefined()
  })

  it('completes a novice feed with poor_specialist_condition', () => {
    const state = makeWorkshopState()
    const gateInputs = projectSpecialistLaborGateInputsByWorkOrderId(
      state.departmentWorkshopWorkOrders,
      noviceSlots()
    )
    const result = runDepartmentWorkshopSpecialistLaborWeekClose(
      state,
      state.week,
      undefined,
      gateInputs
    )

    expect(result.tick.completedWorkOrderIds).toContain(RECORDS_WORK_ORDER_ID)
    expect(result.completionOutcomes.outcomes[RECORDS_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'degraded',
      qualityReason: 'poor_specialist_condition',
    })
  })

  it('does not complete a present empty roster and leaves completedWork unchanged', () => {
    const state = makeWorkshopState()
    const gateInputs = projectSpecialistLaborGateInputsByWorkOrderId(
      state.departmentWorkshopWorkOrders,
      []
    )
    expect(gateInputs?.[RECORDS_WORK_ORDER_ID]?.operators).toEqual([])

    const result = runDepartmentWorkshopSpecialistLaborWeekClose(
      state,
      state.week,
      undefined,
      gateInputs
    )
    expect(result.tick.completedWorkOrderIds).not.toContain(RECORDS_WORK_ORDER_ID)
    expect(result.completionOutcomes.outcomes[RECORDS_WORK_ORDER_ID]).toBeUndefined()
    expect(result.tick.workshopState.snapshots[RECORDS_DEPARTMENT_ID]?.active).toEqual([
      { workOrderId: RECORDS_WORK_ORDER_ID, completedWork: 0 },
    ])
  })

  it('stalls a wrong-role feed without treating it as operable', () => {
    const state = makeWorkshopState()
    const gateInputs = projectSpecialistLaborGateInputsByWorkOrderId(
      state.departmentWorkshopWorkOrders,
      wrongRoleSlots()
    )
    const result = runDepartmentWorkshopSpecialistLaborWeekClose(
      state,
      state.week,
      undefined,
      gateInputs
    )

    expect(result.tick.completedWorkOrderIds).not.toContain(RECORDS_WORK_ORDER_ID)
    expect(result.completionOutcomes.outcomes[RECORDS_WORK_ORDER_ID]).toBeUndefined()
  })

  it('still completes a non-records_review sibling when records_review is stalled', () => {
    const state = makeWorkshopState({ includeSibling: true })
    const gateInputs = projectSpecialistLaborGateInputsByWorkOrderId(
      state.departmentWorkshopWorkOrders,
      []
    )
    expect(gateInputs).not.toHaveProperty(SIBLING_WORK_ORDER_ID)

    const result = runDepartmentWorkshopSpecialistLaborWeekClose(
      state,
      state.week,
      undefined,
      gateInputs
    )
    expect(result.tick.completedWorkOrderIds).not.toContain(RECORDS_WORK_ORDER_ID)
    expect(result.tick.completedWorkOrderIds).toContain(SIBLING_WORK_ORDER_ID)
    expect(result.completionOutcomes.outcomes[SIBLING_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'nominal',
    })
  })

  it('keeps facility poor room on an ungated biohazard order while records_review is gated', () => {
    const state = makeWorkshopState({
      includeBio: true,
      facilityStatus: 'inactive',
    })
    const gateInputs = projectSpecialistLaborGateInputsByWorkOrderId(
      state.departmentWorkshopWorkOrders,
      PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS
    )
    expect(gateInputs).not.toHaveProperty(BIO_WORK_ORDER_ID)
    expect(gateInputs).toHaveProperty(RECORDS_WORK_ORDER_ID)

    const result = runDepartmentWorkshopSpecialistLaborWeekClose(
      state,
      state.week,
      undefined,
      gateInputs
    )
    expect(result.tick.completedWorkOrderIds).toContain(BIO_WORK_ORDER_ID)
    expect(result.completionOutcomes.outcomes[BIO_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'degraded',
      qualityReason: 'poor_room_contamination',
    })
    expect(result.tick.completedWorkOrderIds).toContain(RECORDS_WORK_ORDER_ID)
    expect(result.completionOutcomes.outcomes[RECORDS_WORK_ORDER_ID]?.qualityReason).toBeUndefined()
  })
})
