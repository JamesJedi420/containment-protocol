import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { hydrateGame } from '../app/store/runTransfer'
import { advanceWeek } from '../domain/sim/advanceWeek'
import type { GameState } from '../domain/models'
import {
  parseSpecialistOperatorSlots,
  PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS,
  resolveCampaignSpecialistLaborOperatorSlots,
} from '../domain/specialistLaborOperatorFeed'
import type { SpecialistOperatorSlot } from '../domain/specialistLaborRegistry'

const RECORDS_DEPARTMENT_ID = 'department:records-analysis'
const RECORDS_WORK_ORDER_ID = 'work:records-persist-feed'
const SIBLING_WORK_ORDER_ID = 'work:research-persist-feed'

const NOVICE_SLOT: SpecialistOperatorSlot = {
  roleFamily: 'archive_analyst',
  skillBand: 'novice',
  availabilityBand: 'fit',
}

function makeWorkshopState(options?: { includeSibling?: boolean }): GameState {
  const state = createStartingState()
  state.events = []
  state.reports = []

  const active = [
    { workOrderId: RECORDS_WORK_ORDER_ID, completedWork: 0 },
    ...(options?.includeSibling ? [{ workOrderId: SIBLING_WORK_ORDER_ID, completedWork: 0 }] : []),
  ]

  state.departmentWorkshopWorkOrders = {
    [RECORDS_WORK_ORDER_ID]: {
      id: RECORDS_WORK_ORDER_ID,
      departmentId: RECORDS_DEPARTMENT_ID,
      caseId: 'case-records-persist-feed',
      taskType: 'records_review',
      requiredWork: 1,
    },
    ...(options?.includeSibling
      ? {
          [SIBLING_WORK_ORDER_ID]: {
            id: SIBLING_WORK_ORDER_ID,
            departmentId: RECORDS_DEPARTMENT_ID,
            caseId: 'case-research-persist-feed',
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

describe('SPE-3113 parseSpecialistOperatorSlots', () => {
  it('keeps absent payloads undefined and empty arrays present', () => {
    expect(parseSpecialistOperatorSlots(undefined)).toBeUndefined()
    expect(parseSpecialistOperatorSlots([])).toEqual([])
    expect(Object.isFrozen(parseSpecialistOperatorSlots([]))).toBe(true)
  })

  it('accepts valid slots and fail-closes malformed payloads without becoming []', () => {
    expect(parseSpecialistOperatorSlots([NOVICE_SLOT])).toEqual([NOVICE_SLOT])
    expect(parseSpecialistOperatorSlots(null)).toBeUndefined()
    expect(parseSpecialistOperatorSlots({})).toBeUndefined()
    expect(parseSpecialistOperatorSlots('archive_analyst')).toBeUndefined()
    expect(
      parseSpecialistOperatorSlots([
        {
          roleFamily: 'archive_analyst',
          skillBand: 'novice',
          availabilityBand: 'fit',
        },
        {
          roleFamily: 'not_a_role',
          skillBand: 'novice',
          availabilityBand: 'fit',
        },
      ])
    ).toBeUndefined()
    expect(
      resolveCampaignSpecialistLaborOperatorSlots({
        roleFamily: 'archive_analyst',
        skillBand: 'novice',
        availabilityBand: 'fit',
      })
    ).toBe(PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS)
    expect(resolveCampaignSpecialistLaborOperatorSlots(undefined)).toBe(
      PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS
    )
    expect(resolveCampaignSpecialistLaborOperatorSlots([])).toEqual([])
  })

  it('does not inherit specialistOperatorSlots from hydration fallback when omitted', () => {
    const fallback = createStartingState()
    fallback.specialistOperatorSlots = [NOVICE_SLOT]
    const hydrated = hydrateGame({ ...createStartingState(), specialistOperatorSlots: undefined }, fallback)
    expect(hydrated.specialistOperatorSlots).toBeUndefined()
    expect(fallback.specialistOperatorSlots).toEqual([NOVICE_SLOT])
  })

  it('hydrates a valid saved list including empty and drops malformed to absent', () => {
    const withNovice = hydrateGame({
      ...createStartingState(),
      specialistOperatorSlots: [NOVICE_SLOT],
    })
    expect(withNovice.specialistOperatorSlots).toEqual([NOVICE_SLOT])

    const withEmpty = hydrateGame({
      ...createStartingState(),
      specialistOperatorSlots: [],
    })
    expect(withEmpty.specialistOperatorSlots).toEqual([])

    const malformed = hydrateGame({
      ...createStartingState(),
      specialistOperatorSlots: [{ roleFamily: 'archive_analyst' }],
    })
    expect(malformed.specialistOperatorSlots).toBeUndefined()
  })
})

describe('SPE-3113 persist specialist operator slots through advanceWeek', () => {
  it('keeps operable records_review when the field is absent', () => {
    const state = makeWorkshopState()
    expect(state.specialistOperatorSlots).toBeUndefined()

    const next = advanceWeek(state)
    expect(next.departmentWorkshopCompletionOutcomes?.[RECORDS_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'nominal',
    })
    expect(
      next.departmentWorkshopCompletionOutcomes?.[RECORDS_WORK_ORDER_ID]?.qualityReason
    ).toBeUndefined()
  })

  it('yields poor_specialist_condition for a saved novice slot', () => {
    const state = makeWorkshopState()
    state.specialistOperatorSlots = [NOVICE_SLOT]

    const next = advanceWeek(state)
    expect(next.departmentWorkshopCompletionOutcomes?.[RECORDS_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'degraded',
      qualityReason: 'poor_specialist_condition',
    })
  })

  it('stalls only records_review when a saved empty list is present', () => {
    const state = makeWorkshopState({ includeSibling: true })
    state.specialistOperatorSlots = []

    const next = advanceWeek(state)
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

  it('keeps the production fixture when the payload is malformed', () => {
    const state = makeWorkshopState()
    // Bypass hydrate: simulate a corrupt in-memory value. Resolve fail-closes.
    ;(state as { specialistOperatorSlots?: unknown }).specialistOperatorSlots = {
      roleFamily: 'archive_analyst',
      skillBand: 'novice',
      availabilityBand: 'fit',
    }

    const next = advanceWeek(state)
    expect(next.departmentWorkshopCompletionOutcomes?.[RECORDS_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'nominal',
    })
    expect(
      next.departmentWorkshopCompletionOutcomes?.[RECORDS_WORK_ORDER_ID]?.qualityReason
    ).toBeUndefined()
  })

  it('still completes a non-records_review sibling beside a gated records_review order', () => {
    const state = makeWorkshopState({ includeSibling: true })
    state.specialistOperatorSlots = [NOVICE_SLOT]

    const next = advanceWeek(state)
    expect(next.departmentWorkshopCompletionOutcomes?.[RECORDS_WORK_ORDER_ID]).toMatchObject({
      qualityReason: 'poor_specialist_condition',
    })
    expect(next.departmentWorkshopCompletionOutcomes?.[SIBLING_WORK_ORDER_ID]).toMatchObject({
      outcome: 'completed',
      quality: 'nominal',
    })
  })
})
