import { describe, expect, it } from 'vitest'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import { createStartingState } from '../data/startingState'
import { BIOHAZARD_RESPONSE_FACILITY_ID } from '../domain/departmentWorkshopFacilityMapping'
import {
  DEFAULT_DEPARTMENT_WORKSHOP_ROOM_QUALITY_MAPPINGS,
  deriveDepartmentWorkshopRoomContaminationFromFacilities,
} from '../domain/departmentWorkshopFacilityQualityMapping'
import {
  composeDepartmentWorkshopQualityConditionsWithRoomContamination,
  deriveDepartmentWorkshopQualityByWorkOrderIdFromFacilities,
  registerDepartmentWorkshopCompletionOutcomes,
} from '../domain/departmentWorkshopLiveFacilitySafety'
import type { DepartmentWorkshopQualityConditions } from '../domain/departmentWorkshopQueue'
import type { FacilityStatus, GameState } from '../domain/models'
import { advanceWeek } from '../domain/sim/advanceWeek'

const BIO_DEPARTMENT_ID = 'department:biohazard-response'
const RECORDS_DEPARTMENT_ID = 'department:records-analysis'
const BIO_WORK_ORDER_ID = 'work:biohazard-live-quality'
const RECORDS_WORK_ORDER_ID = 'work:records-live-quality'

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

const EXPLICIT_CALLER_CONDITIONS: DepartmentWorkshopQualityConditions = {
  inputQuality: 'poor',
  specialistCondition: 'poor',
  roomContamination: 'good',
  dependencyCondition: 'poor',
  equipmentCondition: 'good',
  reagentGrade: 'poor',
}

describe('authored department workshop room-quality mapping', () => {
  it('maps the production biohazard department to the authored facility', () => {
    expect(DEFAULT_DEPARTMENT_WORKSHOP_ROOM_QUALITY_MAPPINGS).toEqual([
      {
        departmentId: BIO_DEPARTMENT_ID,
        facilityId: BIOHAZARD_RESPONSE_FACILITY_ID,
      },
    ])
  })

  it('projects active, inactive, upgrading, absent, and unmapped behavior deterministically', () => {
    expect(
      deriveDepartmentWorkshopRoomContaminationFromFacilities(
        makeWorkshopState('active'),
        BIO_DEPARTMENT_ID
      )
    ).toBe('good')
    expect(
      deriveDepartmentWorkshopRoomContaminationFromFacilities(
        makeWorkshopState('inactive'),
        BIO_DEPARTMENT_ID
      )
    ).toBe('poor')
    expect(
      deriveDepartmentWorkshopRoomContaminationFromFacilities(
        makeWorkshopState('upgrading'),
        BIO_DEPARTMENT_ID
      )
    ).toBe('poor')
    expect(
      deriveDepartmentWorkshopRoomContaminationFromFacilities(
        makeWorkshopState(),
        BIO_DEPARTMENT_ID
      )
    ).toBe('poor')
    expect(
      deriveDepartmentWorkshopRoomContaminationFromFacilities(
        makeWorkshopState('inactive'),
        RECORDS_DEPARTMENT_ID
      )
    ).toBeUndefined()
  })

  it('owns only room contamination while preserving every caller-owned quality axis', () => {
    expect(
      composeDepartmentWorkshopQualityConditionsWithRoomContamination(
        'poor',
        EXPLICIT_CALLER_CONDITIONS
      )
    ).toEqual({
      inputQuality: 'poor',
      specialistCondition: 'poor',
      roomContamination: 'poor',
      dependencyCondition: 'poor',
      equipmentCondition: 'good',
      reagentGrade: 'poor',
    })

    expect(composeDepartmentWorkshopQualityConditionsWithRoomContamination('good')).toEqual({
      inputQuality: 'good',
      specialistCondition: 'good',
      roomContamination: 'good',
    })
  })
})

describe('live facility quality completion registration', () => {
  it('projects exact IDs in code-unit order, deduplicates, ignores unknown IDs, and isolates siblings', () => {
    const state = makeWorkshopState('inactive')
    const conditions = deriveDepartmentWorkshopQualityByWorkOrderIdFromFacilities(
      state,
      [RECORDS_WORK_ORDER_ID, BIO_WORK_ORDER_ID, 'work:missing', BIO_WORK_ORDER_ID],
      {
        [BIO_WORK_ORDER_ID]: EXPLICIT_CALLER_CONDITIONS,
        [RECORDS_WORK_ORDER_ID]: {
          inputQuality: 'good',
          specialistCondition: 'poor',
          roomContamination: 'poor',
          equipmentCondition: 'poor',
        },
      }
    )

    expect(Object.keys(conditions)).toEqual([BIO_WORK_ORDER_ID, RECORDS_WORK_ORDER_ID])
    expect(conditions[BIO_WORK_ORDER_ID]).toEqual({
      inputQuality: 'poor',
      specialistCondition: 'poor',
      roomContamination: 'poor',
      dependencyCondition: 'poor',
      equipmentCondition: 'good',
      reagentGrade: 'poor',
    })
    expect(conditions[RECORDS_WORK_ORDER_ID]).toEqual({
      inputQuality: 'good',
      specialistCondition: 'poor',
      roomContamination: 'poor',
      equipmentCondition: 'poor',
    })
  })

  it('uses neutral required axes for a mapped work order and leaves an unmapped sibling on baseline', () => {
    const conditions = deriveDepartmentWorkshopQualityByWorkOrderIdFromFacilities(
      makeWorkshopState('active'),
      [BIO_WORK_ORDER_ID, RECORDS_WORK_ORDER_ID]
    )

    expect(conditions).toEqual({
      [BIO_WORK_ORDER_ID]: {
        inputQuality: 'good',
        specialistCondition: 'good',
        roomContamination: 'good',
      },
    })
  })

  it('preserves caller reason precedence while adding authoritative poor room state', () => {
    const state = makeWorkshopState('inactive')
    const result = registerDepartmentWorkshopCompletionOutcomes(
      state,
      [BIO_WORK_ORDER_ID],
      state.week,
      { [BIO_WORK_ORDER_ID]: EXPLICIT_CALLER_CONDITIONS }
    )

    expect(result.outcomes[BIO_WORK_ORDER_ID]).toMatchObject({
      quality: 'degraded',
      qualityReason: 'poor_input_quality',
    })
  })

  it('keeps an active mapped room nominal', () => {
    const state = makeWorkshopState('active')
    const result = registerDepartmentWorkshopCompletionOutcomes(
      state,
      [BIO_WORK_ORDER_ID, RECORDS_WORK_ORDER_ID],
      state.week
    )

    expect(result.outcomes[BIO_WORK_ORDER_ID]).toMatchObject({ quality: 'nominal' })
    expect(result.outcomes[RECORDS_WORK_ORDER_ID]).toMatchObject({ quality: 'nominal' })
  })

  it.each(['inactive', 'upgrading'] as const)(
    'grades a %s mapped room as poor_room_contamination without affecting the sibling',
    (status) => {
      const state = makeWorkshopState(status)
      const result = registerDepartmentWorkshopCompletionOutcomes(
        state,
        [BIO_WORK_ORDER_ID, RECORDS_WORK_ORDER_ID],
        state.week
      )

      expect(result.outcomes[BIO_WORK_ORDER_ID]).toMatchObject({
        quality: 'degraded',
        qualityReason: 'poor_room_contamination',
      })
      expect(result.outcomes[RECORDS_WORK_ORDER_ID]).toMatchObject({ quality: 'nominal' })
    }
  )

  it('grades an absent mapped room as poor_room_contamination', () => {
    const state = makeWorkshopState()
    const result = registerDepartmentWorkshopCompletionOutcomes(
      state,
      [BIO_WORK_ORDER_ID],
      state.week
    )

    expect(result.outcomes[BIO_WORK_ORDER_ID]).toMatchObject({
      quality: 'degraded',
      qualityReason: 'poor_room_contamination',
    })
  })
})

describe('canonical week-close live facility quality integration', () => {
  it('registers nominal quality for an active mapped facility', () => {
    const next = advanceWeek(makeWorkshopState('active'))

    expect(next.departmentWorkshopCompletionOutcomes?.[BIO_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'nominal',
    })
    expect(next.departmentWorkshopCompletionOutcomes?.[RECORDS_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'nominal',
    })
  })

  it('registers absent room state as degraded without affecting an unmapped sibling', () => {
    const next = advanceWeek(makeWorkshopState())

    expect(next.departmentWorkshopCompletionOutcomes?.[BIO_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'degraded',
      qualityReason: 'poor_room_contamination',
    })
    expect(next.departmentWorkshopCompletionOutcomes?.[RECORDS_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'nominal',
    })
  })

  it('preserves the stored degraded receipt across save/load and replay', () => {
    const completed = advanceWeek(makeWorkshopState())
    const loaded = loadGameSave(serializeGameSave(completed))
    loaded.facilityState = {
      facilities: {
        [BIOHAZARD_RESPONSE_FACILITY_ID]: makeFacility('active'),
      },
    }

    const replay = advanceWeek(loaded)

    expect(replay.departmentWorkshopCompletionOutcomes?.[BIO_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'degraded',
      qualityReason: 'poor_room_contamination',
    })
  })
})
