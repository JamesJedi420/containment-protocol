import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { BIOHAZARD_RESPONSE_FACILITY_ID } from '../domain/departmentWorkshopFacilityMapping'
import { runDepartmentWorkshopSpecialistLaborWeekClose } from '../domain/departmentWorkshopSpecialistLaborWeekClose'
import type { FacilityStatus, GameState } from '../domain/models'
import {
  CAMPAIGN_SPECIALIST_LABOR_OPERATOR_SLOTS,
  PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS,
  projectSpecialistLaborGateInputsByWorkOrderId,
  shouldClearStaleMappedProductionSpecialistOperatorSlots,
} from '../domain/specialistLaborOperatorFeed'
import type { SpecialistOperatorSlot } from '../domain/specialistLaborRegistry'

const RECORDS_DEPARTMENT_ID = 'department:records-analysis'
const BIO_DEPARTMENT_ID = 'department:biohazard-response'
const FIELD_CONTAINMENT_DEPARTMENT_ID = 'department:field-containment'
const RECORDS_WORK_ORDER_ID = 'work:records-operator-feed'
const LATER_RECORDS_WORK_ORDER_ID = 'work:records-operator-feed-b'
const SIBLING_WORK_ORDER_ID = 'work:research-operator-feed'
const BIO_WORK_ORDER_ID = 'work:bio-operator-feed'
const CONTAINMENT_WORK_ORDER_ID = 'work:containment-operator-feed'

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
  includeContainment?: boolean
  facilityStatus?: FacilityStatus
  recordsTaskType?: 'records_review' | 'research_case'
  omitRecords?: boolean
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
    ...(options?.omitRecords
      ? []
      : [{ workOrderId: RECORDS_WORK_ORDER_ID, completedWork: 0 }]),
    ...(options?.includeSibling ? [{ workOrderId: SIBLING_WORK_ORDER_ID, completedWork: 0 }] : []),
    ...(options?.includeLaterRecords
      ? [{ workOrderId: LATER_RECORDS_WORK_ORDER_ID, completedWork: 0 }]
      : []),
    ...(options?.includeContainment
      ? [{ workOrderId: CONTAINMENT_WORK_ORDER_ID, completedWork: 0 }]
      : []),
  ]

  state.departmentWorkshopWorkOrders = {
    ...(options?.omitRecords
      ? {}
      : {
          [RECORDS_WORK_ORDER_ID]: {
            id: RECORDS_WORK_ORDER_ID,
            departmentId: RECORDS_DEPARTMENT_ID,
            caseId: 'case-records-operator-feed',
            taskType: options?.recordsTaskType ?? 'records_review',
            requiredWork: 1,
          },
        }),
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
    ...(options?.includeContainment
      ? {
          [CONTAINMENT_WORK_ORDER_ID]: {
            id: CONTAINMENT_WORK_ORDER_ID,
            departmentId: FIELD_CONTAINMENT_DEPARTMENT_ID,
            caseId: 'case-containment-operator-feed',
            taskType: 'containment_response' as const,
            requiredWork: 1,
          },
        }
      : {}),
  }
  state.departmentWorkshopSnapshots = {
    ...(options?.omitRecords && !options?.includeSibling && !options?.includeLaterRecords
      ? {}
      : {
          [RECORDS_DEPARTMENT_ID]: {
            departmentId: RECORDS_DEPARTMENT_ID,
            slotCapacity: Math.max(
              1,
              active.filter(
                (entry) =>
                  entry.workOrderId !== CONTAINMENT_WORK_ORDER_ID &&
                  entry.workOrderId !== BIO_WORK_ORDER_ID
              ).length
            ),
            queued: [],
            active: active.filter(
              (entry) =>
                entry.workOrderId !== CONTAINMENT_WORK_ORDER_ID &&
                entry.workOrderId !== BIO_WORK_ORDER_ID
            ),
            paused: [],
          },
        }),
  }

  if (options?.includeContainment) {
    state.departmentWorkshopSnapshots[FIELD_CONTAINMENT_DEPARTMENT_ID] = {
      departmentId: FIELD_CONTAINMENT_DEPARTMENT_ID,
      slotCapacity: 1,
      queued: [],
      active: [{ workOrderId: CONTAINMENT_WORK_ORDER_ID, completedWork: 0 }],
      paused: [],
    }
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

describe('SPE-3112 / SPE-3117 specialist operator feed', () => {
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

  it('omits the map when no work order is a paired department task', () => {
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

  it('projects containment_response onto containment_cell_repair with the same operator list', () => {
    const state = makeWorkshopState({ includeContainment: true, includeSibling: true })
    const gateInputs = projectSpecialistLaborGateInputsByWorkOrderId(
      state.departmentWorkshopWorkOrders,
      CAMPAIGN_SPECIALIST_LABOR_OPERATOR_SLOTS
    )

    expect(Object.keys(gateInputs!)).toEqual([CONTAINMENT_WORK_ORDER_ID, RECORDS_WORK_ORDER_ID])
    expect(gateInputs![CONTAINMENT_WORK_ORDER_ID]).toEqual({
      taskId: 'containment_cell_repair',
      operators: [
        {
          roleFamily: 'archive_analyst',
          skillBand: 'competent',
          availabilityBand: 'fit',
        },
        {
          roleFamily: 'containment_engineer',
          skillBand: 'competent',
          availabilityBand: 'fit',
        },
      ],
    })
    expect(gateInputs![RECORDS_WORK_ORDER_ID]?.taskId).toBe('archive_classification')
    expect(gateInputs![RECORDS_WORK_ORDER_ID]?.operators).toBe(
      gateInputs![CONTAINMENT_WORK_ORDER_ID]?.operators
    )
    expect(gateInputs).not.toHaveProperty(SIBLING_WORK_ORDER_ID)
  })

  it('completes both gated pairs on the two-slot campaign roster', () => {
    const state = makeWorkshopState({ includeContainment: true })
    const gateInputs = projectSpecialistLaborGateInputsByWorkOrderId(
      state.departmentWorkshopWorkOrders,
      CAMPAIGN_SPECIALIST_LABOR_OPERATOR_SLOTS
    )
    const result = runDepartmentWorkshopSpecialistLaborWeekClose(
      state,
      state.week,
      undefined,
      gateInputs
    )

    expect(result.tick.completedWorkOrderIds).toContain(RECORDS_WORK_ORDER_ID)
    expect(result.tick.completedWorkOrderIds).toContain(CONTAINMENT_WORK_ORDER_ID)
    expect(result.completionOutcomes.outcomes[RECORDS_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'nominal',
    })
    expect(result.completionOutcomes.outcomes[CONTAINMENT_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'nominal',
    })
  })

  it('stalls containment_response on an archive_analyst-only list while records_review stays operable', () => {
    const state = makeWorkshopState({ includeContainment: true })
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
    expect(result.tick.completedWorkOrderIds).not.toContain(CONTAINMENT_WORK_ORDER_ID)
    expect(result.completionOutcomes.outcomes[CONTAINMENT_WORK_ORDER_ID]).toBeUndefined()
    expect(result.tick.workshopState.snapshots[FIELD_CONTAINMENT_DEPARTMENT_ID]?.active).toEqual([
      { workOrderId: CONTAINMENT_WORK_ORDER_ID, completedWork: 0 },
    ])
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
    const state = makeWorkshopState({ includeContainment: true })
    const gateInputs = projectSpecialistLaborGateInputsByWorkOrderId(
      state.departmentWorkshopWorkOrders,
      []
    )
    expect(gateInputs?.[RECORDS_WORK_ORDER_ID]?.operators).toEqual([])
    expect(gateInputs?.[CONTAINMENT_WORK_ORDER_ID]?.operators).toEqual([])

    const result = runDepartmentWorkshopSpecialistLaborWeekClose(
      state,
      state.week,
      undefined,
      gateInputs
    )
    expect(result.tick.completedWorkOrderIds).not.toContain(RECORDS_WORK_ORDER_ID)
    expect(result.tick.completedWorkOrderIds).not.toContain(CONTAINMENT_WORK_ORDER_ID)
    expect(result.completionOutcomes.outcomes[RECORDS_WORK_ORDER_ID]).toBeUndefined()
    expect(result.completionOutcomes.outcomes[CONTAINMENT_WORK_ORDER_ID]).toBeUndefined()
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

  it('still completes a non-paired sibling when gated tasks are stalled', () => {
    const state = makeWorkshopState({ includeSibling: true, includeContainment: true })
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
    expect(result.tick.completedWorkOrderIds).not.toContain(CONTAINMENT_WORK_ORDER_ID)
    expect(result.tick.completedWorkOrderIds).toContain(SIBLING_WORK_ORDER_ID)
    expect(result.completionOutcomes.outcomes[SIBLING_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'nominal',
    })
  })

  it('projects containment_response alone without requiring records_review', () => {
    const state = makeWorkshopState({ omitRecords: true, includeContainment: true })
    const gateInputs = projectSpecialistLaborGateInputsByWorkOrderId(
      state.departmentWorkshopWorkOrders,
      CAMPAIGN_SPECIALIST_LABOR_OPERATOR_SLOTS
    )
    expect(Object.keys(gateInputs!)).toEqual([CONTAINMENT_WORK_ORDER_ID])
    expect(gateInputs![CONTAINMENT_WORK_ORDER_ID]?.taskId).toBe('containment_cell_repair')
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

describe('SPE-3118 shouldClearStaleMappedProductionSpecialistOperatorSlots', () => {
  const NOVICE_SLOT: SpecialistOperatorSlot = {
    roleFamily: 'archive_analyst',
    skillBand: 'novice',
    availabilityBand: 'fit',
  }

  it('clears when the present list matches the production shape and no mapped personnel remain', () => {
    expect(
      shouldClearStaleMappedProductionSpecialistOperatorSlots(
        { a: { role: 'hunter' } },
        { s: { specialty: 'intel' } },
        [...PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS]
      )
    ).toBe(true)
    expect(
      shouldClearStaleMappedProductionSpecialistOperatorSlots(
        {},
        {},
        PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS
      )
    ).toBe(true)
  })

  it('keeps intentional [] and does not clear absent or malformed payloads', () => {
    expect(shouldClearStaleMappedProductionSpecialistOperatorSlots({}, {}, [])).toBe(false)
    expect(shouldClearStaleMappedProductionSpecialistOperatorSlots({}, {}, undefined)).toBe(false)
    expect(
      shouldClearStaleMappedProductionSpecialistOperatorSlots({}, {}, { not: 'an-array' })
    ).toBe(false)
  })

  it('keeps the list when mapped investigator or analysis staff remain', () => {
    expect(
      shouldClearStaleMappedProductionSpecialistOperatorSlots(
        { a: { role: 'investigator' } },
        {},
        [...PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS]
      )
    ).toBe(false)
    expect(
      shouldClearStaleMappedProductionSpecialistOperatorSlots(
        { a: { role: 'hunter' } },
        { s: { specialty: 'analysis' } },
        [...PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS]
      )
    ).toBe(false)
  })

  it('keeps non-production shapes including campaign roster and novice bands', () => {
    expect(
      shouldClearStaleMappedProductionSpecialistOperatorSlots(
        {},
        {},
        CAMPAIGN_SPECIALIST_LABOR_OPERATOR_SLOTS
      )
    ).toBe(false)
    expect(shouldClearStaleMappedProductionSpecialistOperatorSlots({}, {}, [NOVICE_SLOT])).toBe(
      false
    )
  })
})
