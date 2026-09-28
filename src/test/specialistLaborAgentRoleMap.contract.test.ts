import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { advanceWeek } from '../domain/sim/advanceWeek'
import type { GameState } from '../domain/models'
import type { Agent } from '../domain/agent/models'
import {
  ARCHIVE_ANALYST_MAPPED_AGENT_ROLE,
  deriveArchiveAnalystSlotsFromMappedAgents,
  PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS,
} from '../domain/specialistLaborOperatorFeed'
import type { SpecialistOperatorSlot } from '../domain/specialistLaborRegistry'

const RECORDS_DEPARTMENT_ID = 'department:records-analysis'
const RECORDS_WORK_ORDER_ID = 'work:records-agent-role-map'
const SIBLING_WORK_ORDER_ID = 'work:research-agent-role-map'

const NOVICE_SLOT: SpecialistOperatorSlot = {
  roleFamily: 'archive_analyst',
  skillBand: 'novice',
  availabilityBand: 'fit',
}

function makeWorkshopState(options?: {
  includeSibling?: boolean
  agents?: GameState['agents']
}): GameState {
  const state = createStartingState()
  state.events = []
  state.reports = []
  if (options?.agents !== undefined) {
    state.agents = options.agents
  }

  const active = [
    { workOrderId: RECORDS_WORK_ORDER_ID, completedWork: 0 },
    ...(options?.includeSibling ? [{ workOrderId: SIBLING_WORK_ORDER_ID, completedWork: 0 }] : []),
  ]

  state.departmentWorkshopWorkOrders = {
    [RECORDS_WORK_ORDER_ID]: {
      id: RECORDS_WORK_ORDER_ID,
      departmentId: RECORDS_DEPARTMENT_ID,
      caseId: 'case-records-agent-role-map',
      taskType: 'records_review',
      requiredWork: 1,
    },
    ...(options?.includeSibling
      ? {
          [SIBLING_WORK_ORDER_ID]: {
            id: SIBLING_WORK_ORDER_ID,
            departmentId: RECORDS_DEPARTMENT_ID,
            caseId: 'case-research-agent-role-map',
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

function agentsWithRoles(
  roles: ReadonlyArray<Agent['role']>
): GameState['agents'] {
  return Object.fromEntries(
    roles.map((role, index) => [
      `agent:map-${index}`,
      {
        id: `agent:map-${index}`,
        name: `Mapped ${role}`,
        role,
      } satisfies Agent,
    ])
  )
}

describe('SPE-3115 deriveArchiveAnalystSlotsFromMappedAgents', () => {
  it('returns undefined when the field is already present, including []', () => {
    const agents = agentsWithRoles([ARCHIVE_ANALYST_MAPPED_AGENT_ROLE])
    expect(deriveArchiveAnalystSlotsFromMappedAgents(agents, [])).toBeUndefined()
    expect(deriveArchiveAnalystSlotsFromMappedAgents(agents, [NOVICE_SLOT])).toBeUndefined()
  })

  it('returns undefined for empty roster or unmapped roles without writing []', () => {
    expect(deriveArchiveAnalystSlotsFromMappedAgents({}, undefined)).toBeUndefined()
    expect(
      deriveArchiveAnalystSlotsFromMappedAgents(agentsWithRoles(['hunter', 'tech']), undefined)
    ).toBeUndefined()
  })

  it('returns one archive_analyst production slot when an investigator is present and the field is absent', () => {
    const derived = deriveArchiveAnalystSlotsFromMappedAgents(
      agentsWithRoles([ARCHIVE_ANALYST_MAPPED_AGENT_ROLE, 'hunter']),
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

  it('still returns one slot when several investigators are present', () => {
    const derived = deriveArchiveAnalystSlotsFromMappedAgents(
      agentsWithRoles([ARCHIVE_ANALYST_MAPPED_AGENT_ROLE, ARCHIVE_ANALYST_MAPPED_AGENT_ROLE]),
      undefined
    )
    expect(derived).toEqual(PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS)
    expect(derived).toHaveLength(1)
  })
})

describe('SPE-3115 agent role map through advanceWeek', () => {
  it('leaves the field absent and keeps records_review operable when no investigator is present', () => {
    const state = makeWorkshopState({ agents: agentsWithRoles(['hunter', 'medic']) })
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

  it('writes one archive_analyst slot from an investigator and week-close consumes it', () => {
    const state = makeWorkshopState({
      agents: agentsWithRoles([ARCHIVE_ANALYST_MAPPED_AGENT_ROLE]),
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

  it('does not overwrite a saved empty list when an investigator is also present', () => {
    const state = makeWorkshopState({
      includeSibling: true,
      agents: agentsWithRoles([ARCHIVE_ANALYST_MAPPED_AGENT_ROLE]),
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

  it('does not overwrite a saved novice slot when an investigator is also present', () => {
    const state = makeWorkshopState({
      agents: agentsWithRoles([ARCHIVE_ANALYST_MAPPED_AGENT_ROLE]),
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

  it('still completes a non-records_review sibling beside a mapped investigator', () => {
    const state = makeWorkshopState({
      includeSibling: true,
      agents: agentsWithRoles([ARCHIVE_ANALYST_MAPPED_AGENT_ROLE]),
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
