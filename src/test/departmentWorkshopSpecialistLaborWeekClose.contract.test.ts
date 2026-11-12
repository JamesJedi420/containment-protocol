import { describe, expect, it } from 'vitest'
import { BIOHAZARD_RESPONSE_FACILITY_ID } from '../domain/departmentWorkshopFacilityMapping'
import {
  runDepartmentWorkshopSpecialistLaborWeekClose,
} from '../domain/departmentWorkshopSpecialistLaborWeekClose'
import type { SpecialistLaborGateInput } from '../domain/specialistLaborRegistry'
import type { FacilityStatus, GameState } from '../domain/models'
import { createStartingState } from '../data/startingState'

const BIO_DEPARTMENT_ID = 'department:biohazard-response'
const RECORDS_DEPARTMENT_ID = 'department:records-analysis'
const BIO_WORK_ORDER_ID = 'work:bio-specialist-labor'
const RECORDS_WORK_ORDER_ID = 'work:records-specialist-labor'
const SIBLING_WORK_ORDER_ID = 'work:records-sibling-specialist-labor'

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
  facilityStatus?: FacilityStatus
  includeBio?: boolean
  includeSibling?: boolean
  recordsCompletedWork?: number
  recordsRequiredWork?: number
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

  const workOrders: NonNullable<GameState['departmentWorkshopWorkOrders']> = {
    [RECORDS_WORK_ORDER_ID]: {
      id: RECORDS_WORK_ORDER_ID,
      departmentId: RECORDS_DEPARTMENT_ID,
      caseId: 'case-records-specialist',
      taskType: 'records_review',
      requiredWork: options?.recordsRequiredWork ?? 1,
    },
  }
  const snapshots: NonNullable<GameState['departmentWorkshopSnapshots']> = {
    [RECORDS_DEPARTMENT_ID]: {
      departmentId: RECORDS_DEPARTMENT_ID,
      slotCapacity: options?.includeSibling ? 2 : 1,
      queued: [],
      active: [
        {
          workOrderId: RECORDS_WORK_ORDER_ID,
          completedWork: options?.recordsCompletedWork ?? 0,
        },
      ],
      paused: [],
    },
  }

  if (options?.includeSibling) {
    workOrders[SIBLING_WORK_ORDER_ID] = {
      id: SIBLING_WORK_ORDER_ID,
      departmentId: RECORDS_DEPARTMENT_ID,
      caseId: 'case-records-sibling',
      taskType: 'records_review',
      requiredWork: 1,
    }
    snapshots[RECORDS_DEPARTMENT_ID] = {
      ...snapshots[RECORDS_DEPARTMENT_ID]!,
      active: [
        ...snapshots[RECORDS_DEPARTMENT_ID]!.active,
        { workOrderId: SIBLING_WORK_ORDER_ID, completedWork: 0 },
      ],
    }
  }

  if (options?.includeBio) {
    workOrders[BIO_WORK_ORDER_ID] = {
      id: BIO_WORK_ORDER_ID,
      departmentId: BIO_DEPARTMENT_ID,
      caseId: 'case-bio-specialist',
      taskType: 'research_case',
      requiredWork: 1,
    }
    snapshots[BIO_DEPARTMENT_ID] = {
      departmentId: BIO_DEPARTMENT_ID,
      slotCapacity: 1,
      queued: [],
      active: [{ workOrderId: BIO_WORK_ORDER_ID, completedWork: 0 }],
      paused: [],
    }
  }

  state.departmentWorkshopWorkOrders = workOrders
  state.departmentWorkshopSnapshots = snapshots
  state.departmentWorkshopCompletionOutcomes = {}
  return state
}

function operableGate(): SpecialistLaborGateInput {
  return {
    taskId: 'archive_classification',
    operators: [
      {
        roleFamily: 'archive_analyst',
        skillBand: 'expert',
        availabilityBand: 'fit',
      },
    ],
    infrastructurePresent: true,
  }
}

function degradedGate(): SpecialistLaborGateInput {
  return {
    taskId: 'archive_classification',
    operators: [
      {
        roleFamily: 'archive_analyst',
        skillBand: 'novice',
        availabilityBand: 'fit',
      },
    ],
  }
}

function stalledMissingGate(): SpecialistLaborGateInput {
  return {
    taskId: 'archive_classification',
    operators: [],
    infrastructurePresent: true,
  }
}

function bioOperableGate(): SpecialistLaborGateInput {
  return {
    taskId: 'hazardous_artifact_intake',
    operators: [
      {
        roleFamily: 'hazardous_artifact_handler',
        skillBand: 'expert',
        availabilityBand: 'fit',
      },
    ],
    infrastructurePresent: true,
  }
}

describe('SPE-3110 specialist labor week-close wire', () => {
  it('completes an operable gate without poor_specialist_condition', () => {
    const state = makeWorkshopState()
    const result = runDepartmentWorkshopSpecialistLaborWeekClose(state, state.week, undefined, {
      [RECORDS_WORK_ORDER_ID]: operableGate(),
    })

    expect(result.tick.completedWorkOrderIds).toContain(RECORDS_WORK_ORDER_ID)
    expect(result.completionOutcomes.outcomes[RECORDS_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'nominal',
    })
    expect(result.completionOutcomes.outcomes[RECORDS_WORK_ORDER_ID]?.qualityReason).toBeUndefined()
  })

  it('completes a degraded gate with poor_specialist_condition on an unmapped department', () => {
    const state = makeWorkshopState()
    const result = runDepartmentWorkshopSpecialistLaborWeekClose(state, state.week, undefined, {
      [RECORDS_WORK_ORDER_ID]: degradedGate(),
    })

    expect(result.tick.completedWorkOrderIds).toContain(RECORDS_WORK_ORDER_ID)
    expect(result.completionOutcomes.outcomes[RECORDS_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'degraded',
      qualityReason: 'poor_specialist_condition',
    })
  })

  it('does not complete a stalled gate and leaves completedWork unchanged', () => {
    const state = makeWorkshopState({ recordsCompletedWork: 0, recordsRequiredWork: 1 })
    const result = runDepartmentWorkshopSpecialistLaborWeekClose(state, state.week, undefined, {
      [RECORDS_WORK_ORDER_ID]: stalledMissingGate(),
    })

    expect(result.tick.completedWorkOrderIds).not.toContain(RECORDS_WORK_ORDER_ID)
    expect(result.completionOutcomes.outcomes[RECORDS_WORK_ORDER_ID]).toBeUndefined()
    expect(
      result.tick.workshopState.snapshots[RECORDS_DEPARTMENT_ID]?.active
    ).toEqual([{ workOrderId: RECORDS_WORK_ORDER_ID, completedWork: 0 }])
  })

  it('lets a later operable call finish an order that previously stalled', () => {
    const state = makeWorkshopState({ recordsCompletedWork: 0, recordsRequiredWork: 1 })
    const stalled = runDepartmentWorkshopSpecialistLaborWeekClose(state, state.week, undefined, {
      [RECORDS_WORK_ORDER_ID]: stalledMissingGate(),
    })
    expect(stalled.tick.completedWorkOrderIds).not.toContain(RECORDS_WORK_ORDER_ID)

    const nextState: GameState = {
      ...state,
      departmentWorkshopWorkOrders: stalled.tick.workshopState.workOrders,
      departmentWorkshopSnapshots: stalled.tick.workshopState.snapshots,
      departmentWorkshopCompletionOutcomes: stalled.completionOutcomes.outcomes,
    }
    const operable = runDepartmentWorkshopSpecialistLaborWeekClose(
      nextState,
      state.week + 1,
      undefined,
      { [RECORDS_WORK_ORDER_ID]: operableGate() }
    )

    expect(operable.tick.completedWorkOrderIds).toContain(RECORDS_WORK_ORDER_ID)
    expect(operable.completionOutcomes.outcomes[RECORDS_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'nominal',
    })
  })

  it('fail-closes present undefined and malformed gate entries without inventing poor quality', () => {
    const state = makeWorkshopState({ includeSibling: true })
    const result = runDepartmentWorkshopSpecialistLaborWeekClose(state, state.week, undefined, {
      [RECORDS_WORK_ORDER_ID]: undefined,
      [SIBLING_WORK_ORDER_ID]: { taskId: 'not-a-task' } as never,
    })

    expect(result.tick.completedWorkOrderIds).not.toContain(RECORDS_WORK_ORDER_ID)
    expect(result.tick.completedWorkOrderIds).not.toContain(SIBLING_WORK_ORDER_ID)
    expect(result.completionOutcomes.outcomes[RECORDS_WORK_ORDER_ID]).toBeUndefined()
    expect(result.completionOutcomes.outcomes[SIBLING_WORK_ORDER_ID]).toBeUndefined()
  })

  it('keeps today completion when the gate map is omitted or the work-order id is absent', () => {
    const omitted = runDepartmentWorkshopSpecialistLaborWeekClose(
      makeWorkshopState(),
      1,
      undefined,
      undefined
    )
    expect(omitted.tick.completedWorkOrderIds).toContain(RECORDS_WORK_ORDER_ID)
    expect(omitted.completionOutcomes.outcomes[RECORDS_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'nominal',
    })

    const absentKey = runDepartmentWorkshopSpecialistLaborWeekClose(
      makeWorkshopState(),
      1,
      undefined,
      { 'work:other': operableGate() }
    )
    expect(absentKey.tick.completedWorkOrderIds).toContain(RECORDS_WORK_ORDER_ID)
    expect(absentKey.completionOutcomes.outcomes[RECORDS_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'nominal',
    })
  })

  it('still completes a sibling when only one work order is stalled', () => {
    const state = makeWorkshopState({ includeSibling: true })
    const result = runDepartmentWorkshopSpecialistLaborWeekClose(state, state.week, undefined, {
      [RECORDS_WORK_ORDER_ID]: stalledMissingGate(),
    })

    expect(result.tick.completedWorkOrderIds).not.toContain(RECORDS_WORK_ORDER_ID)
    expect(result.tick.completedWorkOrderIds).toContain(SIBLING_WORK_ORDER_ID)
    expect(result.completionOutcomes.outcomes[SIBLING_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'nominal',
    })
    expect(
      result.tick.workshopState.snapshots[RECORDS_DEPARTMENT_ID]?.active
    ).toEqual([{ workOrderId: RECORDS_WORK_ORDER_ID, completedWork: 0 }])
  })

  it('preserves facility-owned poor room when an operable specialist gate sets good', () => {
    const state = makeWorkshopState({
      includeBio: true,
      facilityStatus: 'inactive',
    })
    // Drop the records order so only bio is under test for room precedence.
    delete state.departmentWorkshopWorkOrders![RECORDS_WORK_ORDER_ID]
    delete state.departmentWorkshopSnapshots![RECORDS_DEPARTMENT_ID]

    const result = runDepartmentWorkshopSpecialistLaborWeekClose(state, state.week, undefined, {
      [BIO_WORK_ORDER_ID]: bioOperableGate(),
    })

    expect(result.tick.completedWorkOrderIds).toContain(BIO_WORK_ORDER_ID)
    expect(result.completionOutcomes.outcomes[BIO_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'degraded',
      qualityReason: 'poor_room_contamination',
    })
  })
})
