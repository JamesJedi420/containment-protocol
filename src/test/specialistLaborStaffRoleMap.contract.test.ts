import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { advanceWeek } from '../domain/sim/advanceWeek'
import type { GameState, StaffData } from '../domain/models'
import type { Agent } from '../domain/agent/models'
import {
  ARCHIVE_ANALYST_MAPPED_AGENT_ROLE,
  ARCHIVE_ANALYST_MAPPED_STAFF_SPECIALTY,
  deriveArchiveAnalystSlotsFromMappedPersonnel,
  deriveArchiveAnalystSlotsFromMappedStaff,
  PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS,
} from '../domain/specialistLaborOperatorFeed'
import type { SpecialistOperatorSlot } from '../domain/specialistLaborRegistry'

const RECORDS_DEPARTMENT_ID = 'department:records-analysis'
const RECORDS_WORK_ORDER_ID = 'work:records-staff-role-map'
const SIBLING_WORK_ORDER_ID = 'work:research-staff-role-map'

const NOVICE_SLOT: SpecialistOperatorSlot = {
  roleFamily: 'archive_analyst',
  skillBand: 'novice',
  availabilityBand: 'fit',
}

function makeWorkshopState(options?: {
  includeSibling?: boolean
  agents?: GameState['agents']
  staff?: GameState['staff']
}): GameState {
  const state = createStartingState()
  state.events = []
  state.reports = []
  if (options?.agents !== undefined) {
    state.agents = options.agents
  }
  if (options?.staff !== undefined) {
    state.staff = options.staff
  }

  const active = [
    { workOrderId: RECORDS_WORK_ORDER_ID, completedWork: 0 },
    ...(options?.includeSibling ? [{ workOrderId: SIBLING_WORK_ORDER_ID, completedWork: 0 }] : []),
  ]

  state.departmentWorkshopWorkOrders = {
    [RECORDS_WORK_ORDER_ID]: {
      id: RECORDS_WORK_ORDER_ID,
      departmentId: RECORDS_DEPARTMENT_ID,
      caseId: 'case-records-staff-role-map',
      taskType: 'records_review',
      requiredWork: 1,
    },
    ...(options?.includeSibling
      ? {
          [SIBLING_WORK_ORDER_ID]: {
            id: SIBLING_WORK_ORDER_ID,
            departmentId: RECORDS_DEPARTMENT_ID,
            caseId: 'case-research-staff-role-map',
            taskType: 'research_case' as const,
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
  state.departmentWorkshopCompletionOutcomes = {}
  return state
}

function staffWithSpecialties(
  specialties: ReadonlyArray<'intel' | 'logistics' | 'fabrication' | 'analysis'>,
  assigned = false
): GameState['staff'] {
  return Object.fromEntries(
    specialties.map((specialty, index) => [
      `staff:map-${index}`,
      {
        specialty,
        efficiency: 1,
        operationalPostId: `staff-post:${specialty}:${(index % 2) + 1}` as const,
        role: 'staff',
      } satisfies StaffData,
    ])
  )
}

function agentsWithRoles(roles: ReadonlyArray<Agent['role']>): GameState['agents'] {
  return Object.fromEntries(
    roles.map((role, index) => [
      `agent:staff-map-${index}`,
      {
        id: `agent:staff-map-${index}`,
        name: `Mapped ${role}`,
        role,
      } satisfies Agent,
    ])
  )
}

describe('SPE-3116 deriveArchiveAnalystSlotsFromMappedStaff', () => {
  it('returns undefined when the field is already present, including []', () => {
    const staff = staffWithSpecialties([ARCHIVE_ANALYST_MAPPED_STAFF_SPECIALTY])
    expect(deriveArchiveAnalystSlotsFromMappedStaff(staff, [])).toBeUndefined()
    expect(deriveArchiveAnalystSlotsFromMappedStaff(staff, [NOVICE_SLOT])).toBeUndefined()
  })

  it('returns undefined for empty roster or unmapped specialties without writing []', () => {
    expect(deriveArchiveAnalystSlotsFromMappedStaff({}, undefined)).toBeUndefined()
    expect(
      deriveArchiveAnalystSlotsFromMappedStaff(
        staffWithSpecialties(['intel', 'logistics']),
        undefined
      )
    ).toBeUndefined()
  })

  it('returns undefined for instructors (no specialty) without writing []', () => {
    const staff: GameState['staff'] = {
      'staff:instructor-1': {
        role: 'instructor',
        name: 'Coach',
        efficiency: 1,
        instructorSpecialty: 'investigation',
      },
    }
    expect(deriveArchiveAnalystSlotsFromMappedStaff(staff, undefined)).toBeUndefined()
  })

  it('returns one archive_analyst production slot when analysis staff is present and the field is absent', () => {
    const derived = deriveArchiveAnalystSlotsFromMappedStaff(
      staffWithSpecialties([ARCHIVE_ANALYST_MAPPED_STAFF_SPECIALTY, 'intel']),
      undefined
    )
    expect(derived).toEqual(PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS)
    expect(derived).toHaveLength(1)
    expect(derived?.[0]).toMatchObject({
      roleFamily: 'archive_analyst',
      skillBand: 'competent',
      availabilityBand: 'fit',
    })
    expect(Object.isFrozen(derived)).toBe(true)
  })

  it('still returns one slot when several analysis staff are present', () => {
    const derived = deriveArchiveAnalystSlotsFromMappedStaff(
      staffWithSpecialties([
        ARCHIVE_ANALYST_MAPPED_STAFF_SPECIALTY,
        ARCHIVE_ANALYST_MAPPED_STAFF_SPECIALTY,
      ]),
      undefined
    )
    expect(derived).toEqual(PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS)
    expect(derived).toHaveLength(1)
  })
})

describe('SPE-3116 deriveArchiveAnalystSlotsFromMappedPersonnel compose', () => {
  it('prefers agent map over staff map when both match and the field is absent', () => {
    const derived = deriveArchiveAnalystSlotsFromMappedPersonnel(
      agentsWithRoles([ARCHIVE_ANALYST_MAPPED_AGENT_ROLE]),
      staffWithSpecialties([ARCHIVE_ANALYST_MAPPED_STAFF_SPECIALTY]),
      undefined
    )
    expect(derived).toEqual(PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS)
  })

  it('falls through to staff when no investigator is present', () => {
    const derived = deriveArchiveAnalystSlotsFromMappedPersonnel(
      agentsWithRoles(['hunter']),
      staffWithSpecialties([ARCHIVE_ANALYST_MAPPED_STAFF_SPECIALTY]),
      undefined
    )
    expect(derived).toEqual(PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS)
  })

  it('returns undefined when neither agent nor staff matches', () => {
    expect(
      deriveArchiveAnalystSlotsFromMappedPersonnel(
        agentsWithRoles(['hunter']),
        staffWithSpecialties(['intel']),
        undefined
      )
    ).toBeUndefined()
  })
})

describe('SPE-3116 staff role map through advanceWeek', () => {
  it('leaves the field absent and keeps records_review operable when no matching staff or investigator is present', () => {
    const state = makeWorkshopState({
      agents: agentsWithRoles(['hunter', 'medic']),
      staff: staffWithSpecialties(['intel', 'logistics'], true),
    })
    expect(state.specialistOperatorSlots).toBeUndefined()

    const next = advanceWeek(state)
    expect(next.specialistOperatorSlots).toBeUndefined()
    expect(next.departmentWorkshopCompletionOutcomes?.[RECORDS_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'nominal',
    })
    expect(
      next.departmentWorkshopCompletionOutcomes?.[RECORDS_WORK_ORDER_ID]?.qualityReason
    ).toBeUndefined()
  })

  it('writes one archive_analyst slot from analysis staff and week-close consumes it', () => {
    const state = makeWorkshopState({
      agents: agentsWithRoles(['hunter']),
      staff: staffWithSpecialties([ARCHIVE_ANALYST_MAPPED_STAFF_SPECIALTY], true),
    })
    expect(state.specialistOperatorSlots).toBeUndefined()

    const next = advanceWeek(state)
    expect(next.specialistOperatorSlots).toEqual(PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS)
    expect(next.specialistOperatorSlots).toHaveLength(1)
    expect(next.departmentWorkshopCompletionOutcomes?.[RECORDS_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'nominal',
    })
  })

  it('does not overwrite a saved empty list when analysis staff is also present', () => {
    const state = makeWorkshopState({
      includeSibling: true,
      agents: agentsWithRoles(['hunter']),
      staff: staffWithSpecialties([ARCHIVE_ANALYST_MAPPED_STAFF_SPECIALTY], true),
    })
    state.specialistOperatorSlots = []

    const next = advanceWeek(state)
    expect(next.specialistOperatorSlots).toEqual([])
    expect(next.departmentWorkshopCompletionOutcomes?.[RECORDS_WORK_ORDER_ID]).toBeUndefined()
    expect(
      next.departmentWorkshopSnapshots?.[RECORDS_DEPARTMENT_ID]?.active.some(
        (lane) => lane.workOrderId === RECORDS_WORK_ORDER_ID && lane.completedWork === 0
      )
    ).toBe(true)
    expect(next.departmentWorkshopCompletionOutcomes?.[SIBLING_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'nominal',
    })
  })

  it('does not overwrite a saved novice slot when analysis staff is also present', () => {
    const state = makeWorkshopState({
      agents: agentsWithRoles(['hunter']),
      staff: staffWithSpecialties([ARCHIVE_ANALYST_MAPPED_STAFF_SPECIALTY], true),
    })
    state.specialistOperatorSlots = [NOVICE_SLOT]

    const next = advanceWeek(state)
    expect(next.specialistOperatorSlots).toEqual([NOVICE_SLOT])
    expect(next.departmentWorkshopCompletionOutcomes?.[RECORDS_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'degraded',
      qualityReason: 'poor_specialist_condition',
    })
  })

  it('does not overwrite agent-derived slots already present when analysis staff is also present', () => {
    const state = makeWorkshopState({
      agents: agentsWithRoles([ARCHIVE_ANALYST_MAPPED_AGENT_ROLE]),
      staff: staffWithSpecialties([ARCHIVE_ANALYST_MAPPED_STAFF_SPECIALTY], true),
    })
    state.specialistOperatorSlots = [...PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS]

    const next = advanceWeek(state)
    expect(next.specialistOperatorSlots).toEqual(PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS)
    expect(next.departmentWorkshopCompletionOutcomes?.[RECORDS_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'nominal',
    })
  })

  it('still completes a non-records_review sibling beside mapped analysis staff', () => {
    const state = makeWorkshopState({
      includeSibling: true,
      agents: agentsWithRoles(['hunter']),
      staff: staffWithSpecialties([ARCHIVE_ANALYST_MAPPED_STAFF_SPECIALTY], true),
    })

    const next = advanceWeek(state)
    expect(next.specialistOperatorSlots).toEqual(PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS)
    expect(next.departmentWorkshopCompletionOutcomes?.[RECORDS_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'nominal',
    })
    expect(next.departmentWorkshopCompletionOutcomes?.[SIBLING_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'nominal',
    })
  })
})
