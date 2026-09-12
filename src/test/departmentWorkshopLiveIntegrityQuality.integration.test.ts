import { describe, expect, it } from 'vitest'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import { createStartingState } from '../data/startingState'
import {
  BLAST_DOOR_COMPENSATING_CONTROL_ID,
  INTERLOCK_COMPENSATING_CONTROL_ID,
  PRESSURE_SEAL_COMPENSATING_CONTROL_ID,
  type ContainmentClassIntegrity,
} from '../domain/containmentClassInspection'
import { BIOHAZARD_RESPONSE_FACILITY_ID } from '../domain/departmentWorkshopFacilityMapping'
import {
  DEFAULT_DEPARTMENT_WORKSHOP_INTEGRITY_QUALITY_MAPPINGS,
  EMERGENCY_RESPONSE_DEPARTMENT_ID,
  EMERGENCY_RESPONSE_PRESSURE_SEAL_INSTANCE_ID,
  FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID,
  FIELD_CONTAINMENT_DEPARTMENT_ID,
  PROCUREMENT_LOGISTICS_DEPARTMENT_ID,
  PROCUREMENT_LOGISTICS_INTERLOCK_INSTANCE_ID,
  deriveDepartmentWorkshopEquipmentConditionFromIntegrity,
} from '../domain/departmentWorkshopIntegrityQualityMapping'
import {
  composeDepartmentWorkshopQualityConditionsWithEquipmentCondition,
  deriveDepartmentWorkshopQualityByWorkOrderIdFromFacilities,
  registerDepartmentWorkshopCompletionOutcomes,
} from '../domain/departmentWorkshopLiveFacilitySafety'
import type { EquipmentInstance } from '../domain/equipmentInstance'
import type { DepartmentWorkshopQualityConditions } from '../domain/departmentWorkshopQueue'
import type { FacilityStatus, GameState } from '../domain/models'
import { advanceWeek } from '../domain/sim/advanceWeek'

const BIO_DEPARTMENT_ID = 'department:biohazard-response'
const RECORDS_DEPARTMENT_ID = 'department:records-analysis'
const BIO_WORK_ORDER_ID = 'work:biohazard-live-integrity'
const RECORDS_WORK_ORDER_ID = 'work:records-live-integrity'
const FIELD_WORK_ORDER_ID = 'work:field-containment-live-integrity'
const EMERGENCY_WORK_ORDER_ID = 'work:emergency-response-live-integrity'
const PROCUREMENT_WORK_ORDER_ID = 'work:procurement-logistics-live-integrity'

function blastDoorIntegrity(
  overrides: Partial<ContainmentClassIntegrity> = {}
): ContainmentClassIntegrity {
  return {
    classId: 'blast_door',
    lastInspectionWeek: 1,
    cycleCount: 0,
    deficiency: { kind: 'none' },
    ...overrides,
  }
}

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

function makeAuthoredInstance(
  instanceId: string,
  integrity?: ContainmentClassIntegrity | Record<string, unknown>,
  condition: EquipmentInstance['condition'] = 'operational'
): EquipmentInstance {
  return {
    instanceId,
    definitionId: 'ward_seals',
    location: { state: 'stored' },
    condition,
    ...(integrity !== undefined
      ? { containmentIntegrity: integrity as ContainmentClassIntegrity }
      : {}),
  }
}

function makeWorkshopState(options?: {
  integrity?: ContainmentClassIntegrity | Record<string, unknown>
  omitInstance?: boolean
  condition?: EquipmentInstance['condition']
  facilityStatus?: FacilityStatus
}): GameState {
  const state = createStartingState()
  state.cases = resolveAllCases(state)
  state.events = []
  state.reports = []
  state.facilityState = {
    facilities: options?.facilityStatus
      ? { [BIOHAZARD_RESPONSE_FACILITY_ID]: makeFacility(options.facilityStatus) }
      : { [BIOHAZARD_RESPONSE_FACILITY_ID]: makeFacility('active') },
  }
  if (!options?.omitInstance) {
    state.equipmentInstances = {
      [FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID]: makeAuthoredInstance(
        FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID,
        options?.integrity ?? blastDoorIntegrity(),
        options?.condition
      ),
    }
  } else {
    state.equipmentInstances = {}
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
    [FIELD_WORK_ORDER_ID]: {
      id: FIELD_WORK_ORDER_ID,
      departmentId: FIELD_CONTAINMENT_DEPARTMENT_ID,
      caseId: 'case-003',
      taskType: 'containment_response',
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
    [FIELD_CONTAINMENT_DEPARTMENT_ID]: {
      departmentId: FIELD_CONTAINMENT_DEPARTMENT_ID,
      slotCapacity: 1,
      queued: [],
      active: [{ workOrderId: FIELD_WORK_ORDER_ID, completedWork: 0 }],
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

describe('authored department workshop integrity-quality mapping', () => {
  it('resolves field-containment workshop equipment condition from the starting-state seed', () => {
    expect(
      deriveDepartmentWorkshopEquipmentConditionFromIntegrity(
        createStartingState(),
        FIELD_CONTAINMENT_DEPARTMENT_ID
      )
    ).toBe('good')
  })

  it('maps the production field-containment department to the authored blast-door instance', () => {
    expect(DEFAULT_DEPARTMENT_WORKSHOP_INTEGRITY_QUALITY_MAPPINGS).toEqual([
      {
        departmentId: FIELD_CONTAINMENT_DEPARTMENT_ID,
        instanceId: FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID,
        classId: 'blast_door',
      },
      {
        departmentId: EMERGENCY_RESPONSE_DEPARTMENT_ID,
        instanceId: EMERGENCY_RESPONSE_PRESSURE_SEAL_INSTANCE_ID,
        classId: 'pressure_seal',
      },
      {
        departmentId: PROCUREMENT_LOGISTICS_DEPARTMENT_ID,
        instanceId: PROCUREMENT_LOGISTICS_INTERLOCK_INSTANCE_ID,
        classId: 'interlock',
      },
    ])
  })

  it('projects none, compensating continue, hard-stop, absent, malformed, and unmapped behavior deterministically', () => {
    expect(
      deriveDepartmentWorkshopEquipmentConditionFromIntegrity(
        makeWorkshopState({ integrity: blastDoorIntegrity() }),
        FIELD_CONTAINMENT_DEPARTMENT_ID
      )
    ).toBe('good')
    expect(
      deriveDepartmentWorkshopEquipmentConditionFromIntegrity(
        makeWorkshopState({
          integrity: blastDoorIntegrity({
            deficiency: {
              kind: 'compensating_continue',
              compensatingControlId: BLAST_DOOR_COMPENSATING_CONTROL_ID,
            },
          }),
        }),
        FIELD_CONTAINMENT_DEPARTMENT_ID
      )
    ).toBe('good')
    expect(
      deriveDepartmentWorkshopEquipmentConditionFromIntegrity(
        makeWorkshopState({
          integrity: blastDoorIntegrity({ deficiency: { kind: 'hard_stop' } }),
        }),
        FIELD_CONTAINMENT_DEPARTMENT_ID
      )
    ).toBe('poor')
    expect(
      deriveDepartmentWorkshopEquipmentConditionFromIntegrity(
        makeWorkshopState({ omitInstance: true }),
        FIELD_CONTAINMENT_DEPARTMENT_ID
      )
    ).toBe('poor')
    expect(
      deriveDepartmentWorkshopEquipmentConditionFromIntegrity(
        makeWorkshopState({ integrity: { classId: 'blast_door' } }),
        FIELD_CONTAINMENT_DEPARTMENT_ID
      )
    ).toBe('poor')
    expect(
      deriveDepartmentWorkshopEquipmentConditionFromIntegrity(
        makeWorkshopState({
          integrity: blastDoorIntegrity({ deficiency: { kind: 'hard_stop' } }),
        }),
        RECORDS_DEPARTMENT_ID
      )
    ).toBeUndefined()
  })

  it('does not treat SPE-2851 damaged condition as the mapped signal', () => {
    expect(
      deriveDepartmentWorkshopEquipmentConditionFromIntegrity(
        makeWorkshopState({
          integrity: blastDoorIntegrity(),
          condition: 'damaged',
        }),
        FIELD_CONTAINMENT_DEPARTMENT_ID
      )
    ).toBe('good')
    expect(
      deriveDepartmentWorkshopEquipmentConditionFromIntegrity(
        makeWorkshopState({
          integrity: blastDoorIntegrity({ deficiency: { kind: 'hard_stop' } }),
          condition: 'operational',
        }),
        FIELD_CONTAINMENT_DEPARTMENT_ID
      )
    ).toBe('poor')
  })

  it('does not satisfy the authored mapping with pressure-seal or interlock identities', () => {
    expect(
      deriveDepartmentWorkshopEquipmentConditionFromIntegrity(
        makeWorkshopState({
          integrity: {
            classId: 'pressure_seal',
            lastInspectionWeek: 1,
            cycleCount: 0,
            deficiency: { kind: 'none' },
          },
        }),
        FIELD_CONTAINMENT_DEPARTMENT_ID
      )
    ).toBe('poor')
    expect(
      deriveDepartmentWorkshopEquipmentConditionFromIntegrity(
        makeWorkshopState({
          integrity: {
            classId: 'interlock',
            lastInspectionWeek: 1,
            cycleCount: 0,
            deficiency: {
              kind: 'compensating_continue',
              compensatingControlId: INTERLOCK_COMPENSATING_CONTROL_ID,
            },
          },
        }),
        FIELD_CONTAINMENT_DEPARTMENT_ID
      )
    ).toBe('poor')
    expect(
      deriveDepartmentWorkshopEquipmentConditionFromIntegrity(
        makeWorkshopState({
          integrity: {
            classId: 'pressure_seal',
            lastInspectionWeek: 1,
            cycleCount: 0,
            deficiency: {
              kind: 'compensating_continue',
              compensatingControlId: PRESSURE_SEAL_COMPENSATING_CONTROL_ID,
            },
          },
        }),
        FIELD_CONTAINMENT_DEPARTMENT_ID
      )
    ).toBe('poor')
  })

  it('owns only equipment condition while preserving every caller-owned quality axis', () => {
    expect(
      composeDepartmentWorkshopQualityConditionsWithEquipmentCondition(
        'poor',
        EXPLICIT_CALLER_CONDITIONS
      )
    ).toEqual({
      inputQuality: 'poor',
      specialistCondition: 'poor',
      roomContamination: 'good',
      dependencyCondition: 'poor',
      equipmentCondition: 'poor',
      reagentGrade: 'poor',
    })

    expect(composeDepartmentWorkshopQualityConditionsWithEquipmentCondition('good')).toEqual({
      inputQuality: 'good',
      specialistCondition: 'good',
      roomContamination: 'good',
      equipmentCondition: 'good',
    })
  })
})

describe('SPE-877 extra-class workshop integrity-quality mapping', () => {
  function extraClassState(options: {
    instanceId: string
    integrity?: ContainmentClassIntegrity | Record<string, unknown>
    omitInstance?: boolean
    condition?: EquipmentInstance['condition']
  }): GameState {
    const state = makeWorkshopState()
    if (options.omitInstance) {
      const current = state.equipmentInstances ?? {}
      state.equipmentInstances = Object.fromEntries(
        Object.entries(current).filter(([instanceId]) => instanceId !== options.instanceId)
      )
      return state
    }
    state.equipmentInstances = {
      ...state.equipmentInstances,
      [options.instanceId]: makeAuthoredInstance(
        options.instanceId,
        options.integrity,
        options.condition
      ),
    }
    return state
  }

  function attachExtraClassWorkOrders(state: GameState): GameState {
    state.departmentWorkshopWorkOrders = {
      ...state.departmentWorkshopWorkOrders,
      [EMERGENCY_WORK_ORDER_ID]: {
        id: EMERGENCY_WORK_ORDER_ID,
        departmentId: EMERGENCY_RESPONSE_DEPARTMENT_ID,
        caseId: 'case-004',
        taskType: 'containment_response',
        requiredWork: 1,
      },
      [PROCUREMENT_WORK_ORDER_ID]: {
        id: PROCUREMENT_WORK_ORDER_ID,
        departmentId: PROCUREMENT_LOGISTICS_DEPARTMENT_ID,
        caseId: 'case-005',
        taskType: 'procurement_support',
        requiredWork: 1,
      },
    }
    state.departmentWorkshopSnapshots = {
      ...state.departmentWorkshopSnapshots,
      [EMERGENCY_RESPONSE_DEPARTMENT_ID]: {
        departmentId: EMERGENCY_RESPONSE_DEPARTMENT_ID,
        slotCapacity: 1,
        queued: [],
        active: [{ workOrderId: EMERGENCY_WORK_ORDER_ID, completedWork: 0 }],
        paused: [],
      },
      [PROCUREMENT_LOGISTICS_DEPARTMENT_ID]: {
        departmentId: PROCUREMENT_LOGISTICS_DEPARTMENT_ID,
        slotCapacity: 1,
        queued: [],
        active: [{ workOrderId: PROCUREMENT_WORK_ORDER_ID, completedWork: 0 }],
        paused: [],
      },
    }
    return state
  }

  it('resolves extra-class workshop equipment condition from the starting-state seeds', () => {
    const state = createStartingState()
    expect(
      deriveDepartmentWorkshopEquipmentConditionFromIntegrity(
        state,
        EMERGENCY_RESPONSE_DEPARTMENT_ID
      )
    ).toBe('good')
    expect(
      deriveDepartmentWorkshopEquipmentConditionFromIntegrity(
        state,
        PROCUREMENT_LOGISTICS_DEPARTMENT_ID
      )
    ).toBe('good')
    expect(
      deriveDepartmentWorkshopEquipmentConditionFromIntegrity(
        state,
        FIELD_CONTAINMENT_DEPARTMENT_ID
      )
    ).toBe('good')
  })

  it('projects pressure-seal none, compensating continue, hard-stop, absent, malformed, and wrong class', () => {
    expect(
      deriveDepartmentWorkshopEquipmentConditionFromIntegrity(
        extraClassState({
          instanceId: EMERGENCY_RESPONSE_PRESSURE_SEAL_INSTANCE_ID,
          integrity: {
            classId: 'pressure_seal',
            lastInspectionWeek: 1,
            cycleCount: 0,
            deficiency: { kind: 'none' },
          },
        }),
        EMERGENCY_RESPONSE_DEPARTMENT_ID
      )
    ).toBe('good')
    expect(
      deriveDepartmentWorkshopEquipmentConditionFromIntegrity(
        extraClassState({
          instanceId: EMERGENCY_RESPONSE_PRESSURE_SEAL_INSTANCE_ID,
          integrity: {
            classId: 'pressure_seal',
            lastInspectionWeek: 1,
            cycleCount: 0,
            deficiency: {
              kind: 'compensating_continue',
              compensatingControlId: PRESSURE_SEAL_COMPENSATING_CONTROL_ID,
            },
          },
        }),
        EMERGENCY_RESPONSE_DEPARTMENT_ID
      )
    ).toBe('good')
    expect(
      deriveDepartmentWorkshopEquipmentConditionFromIntegrity(
        extraClassState({
          instanceId: EMERGENCY_RESPONSE_PRESSURE_SEAL_INSTANCE_ID,
          integrity: {
            classId: 'pressure_seal',
            lastInspectionWeek: 1,
            cycleCount: 0,
            deficiency: { kind: 'hard_stop' },
          },
        }),
        EMERGENCY_RESPONSE_DEPARTMENT_ID
      )
    ).toBe('poor')
    expect(
      deriveDepartmentWorkshopEquipmentConditionFromIntegrity(
        extraClassState({
          instanceId: EMERGENCY_RESPONSE_PRESSURE_SEAL_INSTANCE_ID,
          omitInstance: true,
        }),
        EMERGENCY_RESPONSE_DEPARTMENT_ID
      )
    ).toBe('poor')
    expect(
      deriveDepartmentWorkshopEquipmentConditionFromIntegrity(
        extraClassState({
          instanceId: EMERGENCY_RESPONSE_PRESSURE_SEAL_INSTANCE_ID,
          integrity: { classId: 'pressure_seal' },
        }),
        EMERGENCY_RESPONSE_DEPARTMENT_ID
      )
    ).toBe('poor')
    expect(
      deriveDepartmentWorkshopEquipmentConditionFromIntegrity(
        extraClassState({
          instanceId: EMERGENCY_RESPONSE_PRESSURE_SEAL_INSTANCE_ID,
          integrity: blastDoorIntegrity(),
        }),
        EMERGENCY_RESPONSE_DEPARTMENT_ID
      )
    ).toBe('poor')
  })

  it('projects interlock none, compensating continue, hard-stop, absent, malformed, and wrong class', () => {
    expect(
      deriveDepartmentWorkshopEquipmentConditionFromIntegrity(
        extraClassState({
          instanceId: PROCUREMENT_LOGISTICS_INTERLOCK_INSTANCE_ID,
          integrity: {
            classId: 'interlock',
            lastInspectionWeek: 1,
            cycleCount: 0,
            deficiency: { kind: 'none' },
          },
        }),
        PROCUREMENT_LOGISTICS_DEPARTMENT_ID
      )
    ).toBe('good')
    expect(
      deriveDepartmentWorkshopEquipmentConditionFromIntegrity(
        extraClassState({
          instanceId: PROCUREMENT_LOGISTICS_INTERLOCK_INSTANCE_ID,
          integrity: {
            classId: 'interlock',
            lastInspectionWeek: 1,
            cycleCount: 0,
            deficiency: {
              kind: 'compensating_continue',
              compensatingControlId: INTERLOCK_COMPENSATING_CONTROL_ID,
            },
          },
        }),
        PROCUREMENT_LOGISTICS_DEPARTMENT_ID
      )
    ).toBe('good')
    expect(
      deriveDepartmentWorkshopEquipmentConditionFromIntegrity(
        extraClassState({
          instanceId: PROCUREMENT_LOGISTICS_INTERLOCK_INSTANCE_ID,
          integrity: {
            classId: 'interlock',
            lastInspectionWeek: 1,
            cycleCount: 0,
            deficiency: { kind: 'hard_stop' },
          },
        }),
        PROCUREMENT_LOGISTICS_DEPARTMENT_ID
      )
    ).toBe('poor')
    expect(
      deriveDepartmentWorkshopEquipmentConditionFromIntegrity(
        extraClassState({
          instanceId: PROCUREMENT_LOGISTICS_INTERLOCK_INSTANCE_ID,
          omitInstance: true,
        }),
        PROCUREMENT_LOGISTICS_DEPARTMENT_ID
      )
    ).toBe('poor')
    expect(
      deriveDepartmentWorkshopEquipmentConditionFromIntegrity(
        extraClassState({
          instanceId: PROCUREMENT_LOGISTICS_INTERLOCK_INSTANCE_ID,
          integrity: { classId: 'interlock' },
        }),
        PROCUREMENT_LOGISTICS_DEPARTMENT_ID
      )
    ).toBe('poor')
    expect(
      deriveDepartmentWorkshopEquipmentConditionFromIntegrity(
        extraClassState({
          instanceId: PROCUREMENT_LOGISTICS_INTERLOCK_INSTANCE_ID,
          integrity: {
            classId: 'pressure_seal',
            lastInspectionWeek: 1,
            cycleCount: 0,
            deficiency: { kind: 'none' },
          },
        }),
        PROCUREMENT_LOGISTICS_DEPARTMENT_ID
      )
    ).toBe('poor')
  })

  it('does not treat SPE-2851 damaged condition as the extra-class mapped signal', () => {
    expect(
      deriveDepartmentWorkshopEquipmentConditionFromIntegrity(
        extraClassState({
          instanceId: EMERGENCY_RESPONSE_PRESSURE_SEAL_INSTANCE_ID,
          integrity: {
            classId: 'pressure_seal',
            lastInspectionWeek: 1,
            cycleCount: 0,
            deficiency: { kind: 'none' },
          },
          condition: 'damaged',
        }),
        EMERGENCY_RESPONSE_DEPARTMENT_ID
      )
    ).toBe('good')
  })

  it('keeps extra-class identities on the blast-door slot poor and leaves records unmapped', () => {
    expect(
      deriveDepartmentWorkshopEquipmentConditionFromIntegrity(
        makeWorkshopState({
          integrity: {
            classId: 'pressure_seal',
            lastInspectionWeek: 1,
            cycleCount: 0,
            deficiency: { kind: 'none' },
          },
        }),
        FIELD_CONTAINMENT_DEPARTMENT_ID
      )
    ).toBe('poor')
    expect(
      deriveDepartmentWorkshopEquipmentConditionFromIntegrity(
        extraClassState({
          instanceId: EMERGENCY_RESPONSE_PRESSURE_SEAL_INSTANCE_ID,
          integrity: {
            classId: 'pressure_seal',
            lastInspectionWeek: 1,
            cycleCount: 0,
            deficiency: { kind: 'hard_stop' },
          },
        }),
        RECORDS_DEPARTMENT_ID
      )
    ).toBeUndefined()
    expect(
      deriveDepartmentWorkshopEquipmentConditionFromIntegrity(
        extraClassState({
          instanceId: EMERGENCY_RESPONSE_PRESSURE_SEAL_INSTANCE_ID,
          integrity: {
            classId: 'pressure_seal',
            lastInspectionWeek: 1,
            cycleCount: 0,
            deficiency: { kind: 'hard_stop' },
          },
        }),
        BIO_DEPARTMENT_ID
      )
    ).toBeUndefined()
  })

  it('grades extra-class hard-stop as poor_equipment_condition without affecting biohazard or records', () => {
    const state = attachExtraClassWorkOrders(
      extraClassState({
        instanceId: EMERGENCY_RESPONSE_PRESSURE_SEAL_INSTANCE_ID,
        integrity: {
          classId: 'pressure_seal',
          lastInspectionWeek: 1,
          cycleCount: 0,
          deficiency: { kind: 'hard_stop' },
        },
      })
    )
    state.equipmentInstances = {
      ...state.equipmentInstances,
      [PROCUREMENT_LOGISTICS_INTERLOCK_INSTANCE_ID]: makeAuthoredInstance(
        PROCUREMENT_LOGISTICS_INTERLOCK_INSTANCE_ID,
        {
          classId: 'interlock',
          lastInspectionWeek: 1,
          cycleCount: 0,
          deficiency: { kind: 'none' },
        }
      ),
    }

    const next = advanceWeek(state)

    expect(next.departmentWorkshopCompletionOutcomes?.[EMERGENCY_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'degraded',
      qualityReason: 'poor_equipment_condition',
    })
    expect(next.departmentWorkshopCompletionOutcomes?.[PROCUREMENT_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'nominal',
    })
    expect(next.departmentWorkshopCompletionOutcomes?.[BIO_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'nominal',
    })
    expect(next.departmentWorkshopCompletionOutcomes?.[RECORDS_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'nominal',
    })
    expect(next.departmentWorkshopCompletionOutcomes?.[FIELD_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'nominal',
    })
  })

  it('preserves extra-class degraded receipts across save/load and replay', () => {
    const completed = advanceWeek(
      attachExtraClassWorkOrders(
        extraClassState({
          instanceId: PROCUREMENT_LOGISTICS_INTERLOCK_INSTANCE_ID,
          integrity: {
            classId: 'interlock',
            lastInspectionWeek: 1,
            cycleCount: 0,
            deficiency: { kind: 'hard_stop' },
          },
        })
      )
    )
    const loaded = loadGameSave(serializeGameSave(completed))
    loaded.equipmentInstances = {
      ...loaded.equipmentInstances,
      [PROCUREMENT_LOGISTICS_INTERLOCK_INSTANCE_ID]: makeAuthoredInstance(
        PROCUREMENT_LOGISTICS_INTERLOCK_INSTANCE_ID,
        {
          classId: 'interlock',
          lastInspectionWeek: 1,
          cycleCount: 0,
          deficiency: { kind: 'none' },
        }
      ),
    }

    const replay = advanceWeek(loaded)

    expect(replay.departmentWorkshopCompletionOutcomes?.[PROCUREMENT_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'degraded',
      qualityReason: 'poor_equipment_condition',
    })
  })
})

describe('live integrity quality completion registration', () => {
  it('projects exact IDs in code-unit order, deduplicates, ignores unknown IDs, and isolates siblings', () => {
    const state = makeWorkshopState({
      integrity: blastDoorIntegrity({ deficiency: { kind: 'hard_stop' } }),
    })
    const conditions = deriveDepartmentWorkshopQualityByWorkOrderIdFromFacilities(
      state,
      [RECORDS_WORK_ORDER_ID, FIELD_WORK_ORDER_ID, 'work:missing', FIELD_WORK_ORDER_ID],
      {
        [FIELD_WORK_ORDER_ID]: EXPLICIT_CALLER_CONDITIONS,
        [RECORDS_WORK_ORDER_ID]: {
          inputQuality: 'good',
          specialistCondition: 'poor',
          roomContamination: 'poor',
          equipmentCondition: 'poor',
        },
      }
    )

    expect(Object.keys(conditions)).toEqual([FIELD_WORK_ORDER_ID, RECORDS_WORK_ORDER_ID])
    expect(conditions[FIELD_WORK_ORDER_ID]).toEqual({
      inputQuality: 'poor',
      specialistCondition: 'poor',
      roomContamination: 'good',
      dependencyCondition: 'poor',
      equipmentCondition: 'poor',
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
      makeWorkshopState({ integrity: blastDoorIntegrity() }),
      [FIELD_WORK_ORDER_ID, RECORDS_WORK_ORDER_ID]
    )

    expect(conditions).toEqual({
      [FIELD_WORK_ORDER_ID]: {
        inputQuality: 'good',
        specialistCondition: 'good',
        roomContamination: 'good',
        equipmentCondition: 'good',
      },
    })
  })

  it('preserves caller reason precedence while adding authoritative poor equipment state', () => {
    const state = makeWorkshopState({
      integrity: blastDoorIntegrity({ deficiency: { kind: 'hard_stop' } }),
    })
    const result = registerDepartmentWorkshopCompletionOutcomes(
      state,
      [FIELD_WORK_ORDER_ID],
      state.week,
      { [FIELD_WORK_ORDER_ID]: EXPLICIT_CALLER_CONDITIONS }
    )

    expect(result.outcomes[FIELD_WORK_ORDER_ID]).toMatchObject({
      quality: 'degraded',
      qualityReason: 'poor_input_quality',
    })
  })

  it('keeps none and compensating continue as a nominal equipment axis', () => {
    const noneState = makeWorkshopState({ integrity: blastDoorIntegrity() })
    const continueState = makeWorkshopState({
      integrity: blastDoorIntegrity({
        deficiency: {
          kind: 'compensating_continue',
          compensatingControlId: BLAST_DOOR_COMPENSATING_CONTROL_ID,
        },
      }),
    })

    expect(
      registerDepartmentWorkshopCompletionOutcomes(
        noneState,
        [FIELD_WORK_ORDER_ID, RECORDS_WORK_ORDER_ID],
        noneState.week
      ).outcomes[FIELD_WORK_ORDER_ID]
    ).toMatchObject({ quality: 'nominal' })
    expect(
      registerDepartmentWorkshopCompletionOutcomes(
        continueState,
        [FIELD_WORK_ORDER_ID],
        continueState.week
      ).outcomes[FIELD_WORK_ORDER_ID]
    ).toMatchObject({ quality: 'nominal' })
  })

  it('grades hard-stop as poor_equipment_condition without affecting unmapped siblings', () => {
    const state = makeWorkshopState({
      integrity: blastDoorIntegrity({ deficiency: { kind: 'hard_stop' } }),
    })
    const result = registerDepartmentWorkshopCompletionOutcomes(
      state,
      [FIELD_WORK_ORDER_ID, RECORDS_WORK_ORDER_ID, BIO_WORK_ORDER_ID],
      state.week
    )

    expect(result.outcomes[FIELD_WORK_ORDER_ID]).toMatchObject({
      quality: 'degraded',
      qualityReason: 'poor_equipment_condition',
    })
    expect(result.outcomes[RECORDS_WORK_ORDER_ID]).toMatchObject({ quality: 'nominal' })
    expect(result.outcomes[BIO_WORK_ORDER_ID]).toMatchObject({ quality: 'nominal' })
  })

  it('grades an absent mapped instance as poor_equipment_condition', () => {
    const state = makeWorkshopState({ omitInstance: true })
    const result = registerDepartmentWorkshopCompletionOutcomes(
      state,
      [FIELD_WORK_ORDER_ID],
      state.week
    )

    expect(result.outcomes[FIELD_WORK_ORDER_ID]).toMatchObject({
      quality: 'degraded',
      qualityReason: 'poor_equipment_condition',
    })
  })
})

describe('canonical week-close live integrity quality integration', () => {
  it('grades same-close workshop completions from post-inspection integrity', () => {
    const state = makeWorkshopState({
      integrity: blastDoorIntegrity({ lastInspectionWeek: 1 }),
      facilityStatus: 'active',
    })
    state.week = 6

    const next = advanceWeek(state, 1_725_000_000_000)

    expect(
      next.equipmentInstances?.[FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID]?.containmentIntegrity
        ?.deficiency
    ).toEqual({ kind: 'hard_stop' })
    expect(next.departmentWorkshopCompletionOutcomes?.[FIELD_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'degraded',
      qualityReason: 'poor_equipment_condition',
    })
  })

  it('registers nominal quality for compensating continue and keeps the SPE-2792 biohazard room path green', () => {
    const next = advanceWeek(
      makeWorkshopState({
        integrity: blastDoorIntegrity({
          deficiency: {
            kind: 'compensating_continue',
            compensatingControlId: BLAST_DOOR_COMPENSATING_CONTROL_ID,
          },
        }),
        facilityStatus: 'active',
      })
    )

    expect(next.departmentWorkshopCompletionOutcomes?.[FIELD_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'nominal',
    })
    expect(next.departmentWorkshopCompletionOutcomes?.[BIO_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'nominal',
    })
    expect(next.departmentWorkshopCompletionOutcomes?.[RECORDS_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'nominal',
    })
  })

  it('registers hard-stop as degraded without affecting biohazard room or unmapped siblings', () => {
    const next = advanceWeek(
      makeWorkshopState({
        integrity: blastDoorIntegrity({ deficiency: { kind: 'hard_stop' } }),
        facilityStatus: 'active',
      })
    )

    expect(next.departmentWorkshopCompletionOutcomes?.[FIELD_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'degraded',
      qualityReason: 'poor_equipment_condition',
    })
    expect(next.departmentWorkshopCompletionOutcomes?.[BIO_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'nominal',
    })
    expect(next.departmentWorkshopCompletionOutcomes?.[RECORDS_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'nominal',
    })
  })

  it('preserves the stored degraded receipt across save/load and replay', () => {
    const completed = advanceWeek(
      makeWorkshopState({
        integrity: blastDoorIntegrity({ deficiency: { kind: 'hard_stop' } }),
      })
    )
    const loaded = loadGameSave(serializeGameSave(completed))
    loaded.equipmentInstances = {
      [FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID]: makeAuthoredInstance(
        FIELD_CONTAINMENT_BLAST_DOOR_INSTANCE_ID,
        blastDoorIntegrity()
      ),
    }

    const replay = advanceWeek(loaded)

    expect(replay.departmentWorkshopCompletionOutcomes?.[FIELD_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'degraded',
      qualityReason: 'poor_equipment_condition',
    })
  })
})
