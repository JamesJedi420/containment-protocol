import { afterEach, describe, expect, it, vi } from 'vitest'
import { createStartingState } from '../data/startingState'
import type { GameState } from '../domain/models'
import * as capacity from '../domain/operationalStaffCapacity'
import {
  assignOperationalStaffPost,
  unassignOperationalStaffPost,
} from '../domain/operationalStaffPosts'
import { advanceWeek } from '../domain/sim/advanceWeek'
import {
  CAMPAIGN_SPECIALIST_LABOR_OPERATOR_SLOTS,
  PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS,
  resolveWeekCloseSpecialistLaborOperatorSlots,
} from '../domain/specialistLaborOperatorFeed'

function state(assigned = false): GameState {
  const game = createStartingState()
  game.agents = {}
  game.staff = {
    analyst: {
      role: 'staff',
      specialty: 'analysis',
      efficiency: 1,
      ...(assigned ? { operationalPostId: 'staff-post:analysis:1' as const } : {}),
    },
  }
  game.events = []
  game.reports = []
  game.departmentWorkshopWorkOrders = {
    archive: {
      id: 'archive',
      caseId: 'case-archive',
      departmentId: 'department:records-analysis',
      taskType: 'records_review',
      requiredWork: 1,
    },
    containment: {
      id: 'containment',
      caseId: 'case-containment',
      departmentId: 'department:field-containment',
      taskType: 'containment_response',
      requiredWork: 1,
    },
    sibling: {
      id: 'sibling',
      caseId: 'case-sibling',
      departmentId: 'department:records-analysis',
      taskType: 'research_case',
      requiredWork: 1,
    },
  }
  game.departmentWorkshopSnapshots = Object.fromEntries(
    (
      [
        ['department:records-analysis', ['archive', 'sibling']],
        ['department:field-containment', ['containment']],
      ] satisfies [string, string[]][]
    ).map(([departmentId, ids]) => [
      departmentId,
      {
        departmentId,
        slotCapacity: ids.length,
        queued: [],
        active: ids.map((workOrderId) => ({ workOrderId, completedWork: 0 })),
        paused: [],
      },
    ])
  ) as GameState['departmentWorkshopSnapshots']
  game.departmentWorkshopCompletionOutcomes = {}
  return game
}

afterEach(() => vi.restoreAllMocks())

describe('SPE-3148 canonical specialist capacity', () => {
  it('derives once, is immutable and deterministic, and does not multiply staff slots', () => {
    const game = state(true)
    game.staff.second = {
      role: 'staff',
      specialty: 'analysis',
      efficiency: 1,
      operationalPostId: 'staff-post:analysis:2',
    }
    const before = structuredClone(game)
    const spy = vi.spyOn(capacity, 'deriveOperationalStaffCapacity')
    const result = resolveWeekCloseSpecialistLaborOperatorSlots(game)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(result.operators).toEqual(PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS)
    expect(resolveWeekCloseSpecialistLaborOperatorSlots(game)).toEqual(result)
    game.staff = Object.fromEntries(Object.entries(game.staff).reverse())
    expect(resolveWeekCloseSpecialistLaborOperatorSlots(game)).toEqual(result)
    expect(game).toEqual(before)
  })

  it.each([undefined, 'staff-post:intel:1', 'missing'])(
    'rejects unassigned or incompatible assignment %s without campaign archive bypass',
    (post) => {
      const game = state()
      Object.assign(game.staff.analyst, { operationalPostId: post, assignmentType: 'analysis' })
      const result = resolveWeekCloseSpecialistLaborOperatorSlots(game)
      expect(result.derivedSlots).toBeUndefined()
      expect(result.operators).toEqual([CAMPAIGN_SPECIALIST_LABOR_OPERATOR_SLOTS[1]])
    }
  )

  it('bounds roster traversal and capacity derivation for a large unassigned roster', () => {
    const game = state()
    const roster = Object.fromEntries(
      Array.from({ length: 2000 }, (_, id) => [
        String(id),
        { role: 'staff' as const, specialty: 'analysis' as const, efficiency: 1 },
      ])
    )
    let enumerations = 0
    let reads = 0
    game.staff = new Proxy(roster, {
      ownKeys(target) {
        enumerations++
        return Reflect.ownKeys(target)
      },
      get(target, key, receiver) {
        reads++
        return Reflect.get(target, key, receiver)
      },
    })
    const spy = vi.spyOn(capacity, 'deriveOperationalStaffCapacity')
    expect(resolveWeekCloseSpecialistLaborOperatorSlots(game).operators).toEqual([
      CAMPAIGN_SPECIALIST_LABOR_OPERATOR_SLOTS[1],
    ])
    expect(spy).toHaveBeenCalledTimes(1)
    expect(enumerations).toBe(2)
    expect(reads).toBeLessThanOrEqual(6000)
    spy.mockClear()
    advanceWeek(state(true))
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('rejects duplicate occupancy including malformed claimants', () => {
    const game = state(true)
    game.staff.bad = {
      role: 'instructor',
      operationalPostId: 'staff-post:analysis:1',
    } as unknown as GameState['staff'][string]
    expect(resolveWeekCloseSpecialistLaborOperatorSlots(game).operators).toEqual([
      CAMPAIGN_SPECIALIST_LABOR_OPERATOR_SLOTS[1],
    ])
  })

  it.each([
    [0, 1],
    [1, 0],
    [0, 0],
  ])(
    'consumes canonical availability %s and capacity %s rather than rechecking assignments',
    (available, effectiveCapacity) => {
      const game = state(true)
      const canonical = capacity.deriveOperationalStaffCapacity(game)
      vi.spyOn(capacity, 'deriveOperationalStaffCapacity').mockReturnValue({
        ...canonical,
        byStaffId: {
          analyst: { ...canonical.byStaffId.analyst!, available, effectiveCapacity },
        },
      })
      expect(resolveWeekCloseSpecialistLaborOperatorSlots(game).operators).toEqual([
        CAMPAIGN_SPECIALIST_LABOR_OPERATOR_SLOTS[1],
      ])
      const next = advanceWeek(game)
      expect(next.departmentWorkshopCompletionOutcomes?.archive).toBeUndefined()
    }
  )

  it('clears stale cache on unassignment and restores materialization through canonical commands', () => {
    let game = state(true)
    game.specialistOperatorSlots = PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS
    game = unassignOperationalStaffPost(game, {
      staffId: 'analyst',
      expectedPreviousPostId: 'staff-post:analysis:1',
    }).game
    const next = advanceWeek(game)
    expect(next.specialistOperatorSlots).toBeUndefined()
    expect(next.departmentWorkshopCompletionOutcomes?.archive).toBeUndefined()
    expect(next.departmentWorkshopCompletionOutcomes?.containment?.outcome).toBe('completed')
    expect(next.departmentWorkshopCompletionOutcomes?.sibling?.outcome).toBe('completed')
    const restored = assignOperationalStaffPost(next, {
      staffId: 'analyst',
      expectedPreviousPostId: null,
      postId: 'staff-post:analysis:1',
    }).game
    const completed = advanceWeek(restored)
    expect(completed.specialistOperatorSlots).toEqual(PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS)
    expect(completed.departmentWorkshopCompletionOutcomes?.archive?.outcome).toBe('completed')
  })

  it('filters custom saved slots transiently and preserves intentional empty lists', () => {
    const game = state()
    game.specialistOperatorSlots = CAMPAIGN_SPECIALIST_LABOR_OPERATOR_SLOTS
    const next = advanceWeek(game)
    expect(next.specialistOperatorSlots).toEqual(CAMPAIGN_SPECIALIST_LABOR_OPERATOR_SLOTS)
    expect(next.departmentWorkshopCompletionOutcomes?.archive).toBeUndefined()
    expect(next.departmentWorkshopCompletionOutcomes?.containment?.outcome).toBe('completed')
    game.specialistOperatorSlots = []
    expect(resolveWeekCloseSpecialistLaborOperatorSlots(game)).toEqual({
      operators: [],
      derivedSlots: undefined,
      clearCache: false,
    })
  })

  it('preserves investigator precedence and no-personnel campaign recovery', () => {
    const game = state()
    game.agents = {
      investigator: {
        ...Object.values(createStartingState().agents)[0]!,
        id: 'investigator',
        name: 'Investigator',
        role: 'investigator',
      },
    }
    expect(resolveWeekCloseSpecialistLaborOperatorSlots(game).operators).toEqual(
      PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS
    )
    game.agents = {}
    game.staff = {}
    game.specialistOperatorSlots = PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS
    expect(resolveWeekCloseSpecialistLaborOperatorSlots(game)).toEqual({
      operators: CAMPAIGN_SPECIALIST_LABOR_OPERATOR_SLOTS,
      derivedSlots: undefined,
      clearCache: true,
    })
  })

  it('keeps malformed and instructor records from materializing capacity', () => {
    const game = state()
    game.staff = {
      bad: null,
      instructor: { role: 'instructor', specialty: 'analysis' },
    } as unknown as GameState['staff']
    expect(resolveWeekCloseSpecialistLaborOperatorSlots(game).derivedSlots).toBeUndefined()
    expect(resolveWeekCloseSpecialistLaborOperatorSlots(game).operators).toEqual([
      CAMPAIGN_SPECIALIST_LABOR_OPERATOR_SLOTS[1],
    ])
    ;(game as unknown as { specialistOperatorSlots: unknown }).specialistOperatorSlots = {
      invalid: true,
    }
    expect(resolveWeekCloseSpecialistLaborOperatorSlots(game).operators).toEqual([
      CAMPAIGN_SPECIALIST_LABOR_OPERATOR_SLOTS[1],
    ])
  })
})
