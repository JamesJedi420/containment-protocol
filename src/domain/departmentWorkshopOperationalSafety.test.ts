import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { createStarterAgent } from './templates/classTables'
import type { Agent, GameState } from './models'
import {
  DEPARTMENT_WORKSHOP_OPERATIONAL_SAFETY_OWNER,
  DEFAULT_DEPARTMENT_WORKSHOP_OPERATIONAL_SAFETY_MAPPINGS,
  WORKSHOP_OPERATIONAL_ASSIGNMENT_TAG,
  projectDepartmentWorkshopOperationalSafety,
} from './departmentWorkshopOperationalSafety'

const BIO_DEPARTMENT_ID = 'department:biohazard-response'
const RECORDS_DEPARTMENT_ID = 'department:records-analysis'
const MEDIC_PPE = 'ppe:medic:armor:hazmat_suit'

function withoutMedics(state: GameState): GameState {
  return {
    ...state,
    agents: Object.fromEntries(
      Object.entries(state.agents).filter(([, agent]) => agent.role !== 'medic')
    ),
  }
}

function withMedic(
  state: GameState,
  options: { equipmentSlots?: Agent['equipmentSlots']; clearanceLevel?: number } = {}
) {
  const cleared = withoutMedics(state)
  const base = createStarterAgent({
    id: 'agent-ops-medic',
    name: 'Ops Medic',
    role: 'medic',
  })
  const medic: Agent = {
    ...base,
    tags: [...(base.tags ?? []), WORKSHOP_OPERATIONAL_ASSIGNMENT_TAG],
    ...(options.equipmentSlots ? { equipmentSlots: options.equipmentSlots } : {}),
  }
  return {
    ...cleared,
    clearanceLevel: options.clearanceLevel ?? cleared.clearanceLevel,
    agency: cleared.agency
      ? {
          ...cleared.agency,
          clearanceLevel: options.clearanceLevel ?? cleared.agency.clearanceLevel,
        }
      : cleared.agency,
    agents: {
      ...cleared.agents,
      [medic.id]: medic,
    },
  } satisfies GameState
}

describe('SPE-2771 department workshop operational safety', () => {
  it('authors biohazard PPE + dualAuth mapping and owns the slice boundary', () => {
    expect(DEPARTMENT_WORKSHOP_OPERATIONAL_SAFETY_OWNER).toBe('SPE-2771')
    expect(DEFAULT_DEPARTMENT_WORKSHOP_OPERATIONAL_SAFETY_MAPPINGS).toEqual([
      {
        departmentId: BIO_DEPARTMENT_ID,
        ppeRequirementIds: [MEDIC_PPE],
        assignedRoles: ['medic'],
        dualAuthMinClearanceLevel: 2,
      },
    ])
  })

  it('defaults safely with inspectable fallbacks when no workshop-ops tagged staff', () => {
    // Starter medics lack WORKSHOP_OPERATIONAL_ASSIGNMENT_TAG, so they do not count.
    const state = createStartingState()

    const projection = projectDepartmentWorkshopOperationalSafety(state, BIO_DEPARTMENT_ID)

    expect(projection).toMatchObject({
      ownsPpe: true,
      ownsDualAuth: true,
      ppe: 'good',
      dualAuth: 'good',
      assignedAgentIds: [],
      fallbackReasons: ['ppe_no_assigned_staff', 'dual_auth_no_assigned_staff'],
    })
  })

  it('projects poor PPE when assigned medic lacks required loadout', () => {
    const state = withMedic(createStartingState(), { clearanceLevel: 3 })
    const projection = projectDepartmentWorkshopOperationalSafety(state, BIO_DEPARTMENT_ID)

    expect(projection.ppe).toBe('poor')
    expect(projection.ppeDeficitReasons).toContain('missing_assignment')
    expect(projection.dualAuth).toBe('good')
    expect(projection.assignedAgentIds).toEqual(['agent-ops-medic'])
  })

  it('projects good PPE when assigned medic wears required hazmat', () => {
    const state = withMedic(createStartingState(), {
      clearanceLevel: 3,
      equipmentSlots: { armor: 'hazmat_suit' },
    })
    const projection = projectDepartmentWorkshopOperationalSafety(state, BIO_DEPARTMENT_ID)

    expect(projection.ppe).toBe('good')
    expect(projection.ppeDeficitReasons).toEqual([])
    expect(projection.dualAuth).toBe('good')
  })

  it('projects poor dualAuth when clearance is below authored minimum', () => {
    const state = withMedic(createStartingState(), {
      clearanceLevel: 1,
      equipmentSlots: { armor: 'hazmat_suit' },
    })
    const projection = projectDepartmentWorkshopOperationalSafety(state, BIO_DEPARTMENT_ID)

    expect(projection.ppe).toBe('good')
    expect(projection.dualAuth).toBe('poor')
    expect(projection.fallbackReasons).toEqual([])
  })

  it('exposes unmapped-department fallback reasons without owning axes', () => {
    const projection = projectDepartmentWorkshopOperationalSafety(
      createStartingState(),
      RECORDS_DEPARTMENT_ID
    )

    expect(projection.ownsPpe).toBe(false)
    expect(projection.ownsDualAuth).toBe(false)
    expect(projection.fallbackReasons).toEqual([
      'ppe_unmapped_department',
      'dual_auth_unmapped_department',
    ])
  })
})
