import { describe, expect, it } from 'vitest'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import { createStartingState } from '../data/startingState'
import {
  BIOHAZARD_RESPONSE_FACILITY_ID,
  DEFAULT_DEPARTMENT_WORKSHOP_FACILITY_MAPPINGS,
  deriveDepartmentWorkshopSafetyFromFacilities,
} from '../domain/departmentWorkshopFacilityMapping'
import {
  composeDepartmentWorkshopLiveSafetyConditions,
  deriveDepartmentWorkshopSafetyByWorkOrderIdFromFacilities,
  registerDepartmentWorkshopCompletionOutcomes,
} from '../domain/departmentWorkshopLiveFacilitySafety'
import { WORKSHOP_OPERATIONAL_ASSIGNMENT_TAG } from '../domain/departmentWorkshopOperationalSafety'
import { createStarterAgent } from '../domain/templates/classTables'
import type { Agent, FacilityStatus, GameState } from '../domain/models'
import { advanceWeek } from '../domain/sim/advanceWeek'

const BIO_DEPARTMENT_ID = 'department:biohazard-response'
const RECORDS_DEPARTMENT_ID = 'department:records-analysis'
const BIO_WORK_ORDER_ID = 'work:biohazard-live-safety'
const RECORDS_WORK_ORDER_ID = 'work:records-live-safety'

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
    facilityId: BIOHAZARD_RESPONSE_FACILITY_ID,
    category: 'biohazard_response_lab',
    level: 1,
    maxLevel: 3,
    status,
    effects: {},
  }
}

function makeWorkshopState(status?: FacilityStatus) {
  const state = createStartingState()
  state.cases = resolveAllCases(state)
  state.events = []
  state.reports = []
  state.facilityState = {
    facilities: status
      ? { [BIOHAZARD_RESPONSE_FACILITY_ID]: makeFacility(status) }
      : {},
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
  it('maps the production biohazard department to isolation and ventilation facility axes', () => {
    expect(DEFAULT_DEPARTMENT_WORKSHOP_FACILITY_MAPPINGS).toEqual([
      {
        departmentId: BIO_DEPARTMENT_ID,
        axisBindings: [
          { facilityId: BIOHAZARD_RESPONSE_FACILITY_ID, axis: 'isolation' },
          { facilityId: BIOHAZARD_RESPONSE_FACILITY_ID, axis: 'ventilation' },
        ],
      },
    ])
  })

  it('projects active, non-active, absent, and unmapped facility behavior deterministically', () => {
    expect(
      deriveDepartmentWorkshopSafetyFromFacilities(makeWorkshopState('active'), BIO_DEPARTMENT_ID)
    ).toEqual({
      isolation: 'good',
      ventilation: 'good',
      ppe: 'good',
      dualAuth: 'good',
    })
    expect(
      deriveDepartmentWorkshopSafetyFromFacilities(makeWorkshopState('inactive'), BIO_DEPARTMENT_ID)
    ).toEqual({
      isolation: 'poor',
      ventilation: 'poor',
      ppe: 'good',
      dualAuth: 'good',
    })
    expect(
      deriveDepartmentWorkshopSafetyFromFacilities(makeWorkshopState(), BIO_DEPARTMENT_ID)
    ).toEqual({
      isolation: 'poor',
      ventilation: 'poor',
      ppe: 'good',
      dualAuth: 'good',
    })
    expect(
      deriveDepartmentWorkshopSafetyFromFacilities(
        makeWorkshopState('inactive'),
        RECORDS_DEPARTMENT_ID
      )
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
      ppe: 'good',
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

  it('composes staff PPE and clearance dualAuth onto facility isolation/ventilation', () => {
    const base = makeWorkshopState('active')
    const medic = {
      ...createStarterAgent({
        id: 'agent-live-medic',
        name: 'Live Medic',
        role: 'medic',
      }),
      tags: [WORKSHOP_OPERATIONAL_ASSIGNMENT_TAG],
    } as Agent
    const unmet: GameState = {
      ...base,
      clearanceLevel: 1,
      agency: base.agency ? { ...base.agency, clearanceLevel: 1 } : base.agency,
      agents: { ...base.agents, [medic.id]: medic },
    }
    const unmetProjection = composeDepartmentWorkshopLiveSafetyConditions(
      unmet,
      BIO_DEPARTMENT_ID
    )
    expect(unmetProjection.conditions).toEqual({
      isolation: 'good',
      ventilation: 'good',
      ppe: 'poor',
      dualAuth: 'poor',
    })
    expect(unmetProjection.operational.ppeDeficitReasons).toContain('missing_assignment')

    const met: GameState = {
      ...unmet,
      clearanceLevel: 3,
      agency: unmet.agency ? { ...unmet.agency, clearanceLevel: 3 } : unmet.agency,
      agents: {
        ...unmet.agents,
        [medic.id]: { ...medic, equipmentSlots: { armor: 'hazmat_suit' } },
      },
    }
    expect(composeDepartmentWorkshopLiveSafetyConditions(met, BIO_DEPARTMENT_ID).conditions).toEqual(
      {
        isolation: 'good',
        ventilation: 'good',
        ppe: 'good',
        dualAuth: 'good',
      }
    )
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

  it('registers inadequate_ppe at week-close when workshop-ops medic lacks hazmat', () => {
    const base = makeWorkshopState('active')
    const medic = {
      ...createStarterAgent({
        id: 'agent-week-close-medic',
        name: 'Week Close Medic',
        role: 'medic',
      }),
      tags: [WORKSHOP_OPERATIONAL_ASSIGNMENT_TAG],
    } as Agent
    const next = advanceWeek({
      ...base,
      clearanceLevel: 3,
      agency: base.agency ? { ...base.agency, clearanceLevel: 3 } : base.agency,
      agents: { ...base.agents, [medic.id]: medic },
    })

    expect(next.departmentWorkshopCompletionOutcomes?.[BIO_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      safety: 'unsafe',
      safetyReason: 'inadequate_ppe',
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
      facilities: {
        [BIOHAZARD_RESPONSE_FACILITY_ID]: makeFacility('active'),
      },
    }

    const replay = advanceWeek(loaded)

    expect(replay.departmentWorkshopCompletionOutcomes?.[BIO_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      safety: 'unsafe',
      safetyReason: 'inadequate_isolation',
    })
  })
})