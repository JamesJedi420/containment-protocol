import { describe, expect, it } from 'vitest'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import { createStartingState } from '../data/startingState'
import {
  DEFAULT_DEPARTMENT_WORKSHOP_FACILITY_MAPPINGS,
  deriveDepartmentWorkshopSafetyFromFacilities,
} from '../domain/departmentWorkshopFacilityMapping'
import {
  deriveDepartmentWorkshopSafetyByWorkOrderIdFromFacilities,
  registerDepartmentWorkshopCompletionOutcomes,
} from '../domain/departmentWorkshopLiveFacilitySafety'
import type { FacilityStatus, GameState } from '../domain/models'
import { advanceWeek } from '../domain/sim/advanceWeek'

const BIO_DEPARTMENT_ID = 'department:biohazard-response'
const RECORDS_DEPARTMENT_ID = 'department:records-analysis'
const BIO_WORK_ORDER_ID = 'work:biohazard-live-safety'
const RECORDS_WORK_ORDER_ID = 'work:records-live-safety'
const FACILITY_ID = 'research_lab'

function resolveAllCases(state: GameState): GameState['cases'] {
  return Object.fromEntries(
    Object.entries(state.cases).map(([caseId, currentCase]) => [
      caseId,
      {
        ...currentCase,
        status: 'resolved' as const,
        assignedTeamIds: [],
        weeksRemaining: 0,
      },
    ])
  )
}

function makeFacility(status: FacilityStatus) {
  return {
    facilityId: FACILITY_ID,
    category: 'research_lab',
    level: 1,
    maxLevel: 3,
    status,
    effects: { researchSpeedMultiplier: 1 },
  }
}

function makeWorkshopState(status?: FacilityStatus) {
  const state = createStartingState()
  state.cases = resolveAllCases(state)
  state.events = []
  state.reports = []
  state.facilityState = {
    facilities: status ? { [FACILITY_ID]: makeFacility(status) } : {},
  }
  state.departmentWorkshopWorkOrders = {
    [BIO_WORK_ORDER_ID]: {
      id: BIO_WORK_ORDER_ID,
      departmentId: BIO_DEPARTMENT_ID,
      caseId: 'case-001',
      taskType: 'research_case',
      requiredWork: 1,
    },
    [RECORDS_WORK_ORDER_ID]: {
      id: RECORDS_WORK_ORDER_ID,
      departmentId: RECORDS_DEPARTMENT_ID,
      caseId: 'case-002',
      taskType: 'records_review',
      requiredWork: 1,
    },
  }
  state.departmentWorkshopSnapshots = {
    [BIO_DEPARTMENT_ID]: {
      departmentId: BIO_DEPARTMENT_ID,
      slotCapacity: 1,
      queued: [],
      active: [{ workOrderId: BIO_WORK_ORDER_ID, completedWork: 0 }],
      paused: [],
    },
    [RECORDS_DEPARTMENT_ID]: {
      departmentId: RECORDS_DEPARTMENT_ID,
      slotCapacity: 1,
      queued: [],
      active: [{ workOrderId: RECORDS_WORK_ORDER_ID, completedWork: 0 }],
      paused: [],
    },
  }
  state.departmentWorkshopCompletionOutcomes = {}
  return state
}

describe('authored department workshop facility safety mapping', () => {
  it('maps the production biohazard department to the canonical research lab axes', () => {
    expect(DEFAULT_DEPARTMENT_WORKSHOP_FACILITY_MAPPINGS).toEqual([
      {
        departmentId: BIO_DEPARTMENT_ID,
        axisBindings: [
          { facilityId: FACILITY_ID, axis: 'isolation' },
          { facilityId: FACILITY_ID, axis: 'ventilation' },
          { facilityId: FACILITY_ID, axis: 'ppe' },
        ],
      },
    ])
  })

  it('projects active, non-active, absent, and unmapped facility behavior deterministically', () => {
    expect(deriveDepartmentWorkshopSafetyFromFacilities(makeWorkshopState('active'), BIO_DEPARTMENT_ID)).toEqual({
      isolation: 'good',
      ventilation: 'good',
      ppe: 'good',
      dualAuth: 'good',
    })
    expect(deriveDepartmentWorkshopSafetyFromFacilities(makeWorkshopState('inactive'), BIO_DEPARTMENT_ID)).toEqual({
      isolation: 'poor',
      ventilation: 'poor',
      ppe: 'poor',
      dualAuth: 'good',
    })
    expect(deriveDepartmentWorkshopSafetyFromFacilities(makeWorkshopState(), BIO_DEPARTMENT_ID)).toEqual({
      isolation: 'poor',
      ventilation: 'poor',
      ppe: 'poor',
      dualAuth: 'good',
    })
    expect(
      deriveDepartmentWorkshopSafetyFromFacilities(makeWorkshopState('inactive'), RECORDS_DEPARTMENT_ID)
    ).toEqual({
      isolation: 'good',
      ventilation: 'good',
      ppe: 'good',
      dualAuth: 'good',
    })
  })
})

describe('live facility completion registration', () => {
  it('projects only exact completed work orders and preserves sibling fallback', () => {
    const state = makeWorkshopState('inactive')
    const conditions = deriveDepartmentWorkshopSafetyByWorkOrderIdFromFacilities(state, [
      RECORDS_WORK_ORDER_ID,
      BIO_WORK_ORDER_ID,
      'work:missing',
      BIO_WORK_ORDER_ID,
    ])

    expect(Object.keys(conditions)).toEqual([BIO_WORK_ORDER_ID, RECORDS_WORK_ORDER_ID])
    expect(conditions[BIO_WORK_ORDER_ID]).toEqual({
      isolation: 'poor',
      ventilation: 'poor',
      ppe: 'poor',
      dualAuth: 'good',
    })
    expect(conditions[RECORDS_WORK_ORDER_ID]).toEqual({
      isolation: 'good',
      ventilation: 'good',
      ppe: 'good',
      dualAuth: 'good',
    })
  })

  it('delegates projected conditions to the sole completion safety grader', () => {
    const state = makeWorkshopState('inactive')
    const result = registerDepartmentWorkshopCompletionOutcomes(
      state,
      [BIO_WORK_ORDER_ID, RECORDS_WORK_ORDER_ID],
      state.week
    )

    expect(result.outcomes[BIO_WORK_ORDER_ID]).toMatchObject({
      safety: 'unsafe',
      safetyReason: 'inadequate_isolation',
    })
    expect(result.outcomes[RECORDS_WORK_ORDER_ID]).toMatchObject({ safety: 'safe' })
  })
})

describe('canonical week-close live facility safety integration', () => {
  it('registers safe receipts for an active mapped facility', () => {
    const next = advanceWeek(makeWorkshopState('active'))

    expect(next.departmentWorkshopCompletionOutcomes?.[BIO_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      safety: 'safe',
    })
    expect(next.departmentWorkshopCompletionOutcomes?.[RECORDS_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      safety: 'safe',
    })
  })

  it('registers mapped poor conditions as unsafe without affecting an unmapped sibling', () => {
    const next = advanceWeek(makeWorkshopState('inactive'))

    expect(next.departmentWorkshopCompletionOutcomes?.[BIO_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      safety: 'unsafe',
      safetyReason: 'inadequate_isolation',
    })
    expect(next.departmentWorkshopCompletionOutcomes?.[RECORDS_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      safety: 'safe',
    })
  })

  it('preserves the stored unsafe disposition across save/load and replay', () => {
    const completed = advanceWeek(makeWorkshopState('inactive'))
    const loaded = loadGameSave(serializeGameSave(completed))
    loaded.facilityState = {
      facilities: { [FACILITY_ID]: makeFacility('active') },
    }

    const replay = advanceWeek(loaded)

    expect(replay.departmentWorkshopCompletionOutcomes?.[BIO_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      safety: 'unsafe',
      safetyReason: 'inadequate_isolation',
    })
  })
})