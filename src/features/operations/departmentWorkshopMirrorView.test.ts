import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import type {
  DepartmentWorkshopCompletionOutcomeRegistry,
  DepartmentWorkshopSnapshotRegistry,
  DepartmentWorkshopWorkOrderRegistry,
} from '../../domain/departmentWorkshopQueue'
import {
  formatDepartmentWorkshopBlockerLabel,
  resolveDepartmentWorkshopBlockers,
} from '../../domain/departmentWorkshopSurfacing'
import { getDepartmentWorkshopMirrorView } from './departmentWorkshopMirrorView'

const WORK_ORDERS: DepartmentWorkshopWorkOrderRegistry = {
  'work:zulu': {
    id: 'work:zulu',
    departmentId: 'department:records-analysis',
    caseId: 'case-zulu',
    taskType: 'records_review',
    requiredWork: 3,
  },
  'work:alpha': {
    id: 'work:alpha',
    departmentId: 'department:biohazard-response',
    caseId: 'case-alpha',
    taskType: 'containment_response',
    requiredWork: 2,
  },
  'work:bravo': {
    id: 'work:bravo',
    departmentId: 'department:biohazard-response',
    caseId: 'case-bravo',
    taskType: 'containment_response',
    requiredWork: 2,
  },
  'work:paused': {
    id: 'work:paused',
    departmentId: 'department:biohazard-response',
    caseId: 'case-paused',
    taskType: 'containment_response',
    requiredWork: 4,
  },
}

const SNAPSHOTS: DepartmentWorkshopSnapshotRegistry = {
  'department:records-analysis': {
    departmentId: 'department:records-analysis',
    slotCapacity: 2,
    queued: [{ workOrderId: 'work:zulu', completedWork: 0 }],
    active: [],
    paused: [],
  },
  'department:biohazard-response': {
    departmentId: 'department:biohazard-response',
    slotCapacity: 1,
    queued: [{ workOrderId: 'work:bravo', completedWork: 0 }],
    active: [{ workOrderId: 'work:alpha', completedWork: 1 }],
    paused: [{ workOrderId: 'work:paused', completedWork: 2 }],
  },
}

const OUTCOMES: DepartmentWorkshopCompletionOutcomeRegistry = {
  'work:done-safe': {
    workOrderId: 'work:done-safe',
    departmentId: 'department:records-analysis',
    caseId: 'case-done',
    taskType: 'records_review',
    completedWeek: 4,
    outcome: 'completed',
    quality: 'degraded',
    qualityReason: 'poor_input_quality',
    safety: 'safe',
  },
  'work:done-unsafe': {
    workOrderId: 'work:done-unsafe',
    departmentId: 'department:biohazard-response',
    caseId: 'case-unsafe',
    taskType: 'containment_response',
    completedWeek: 5,
    outcome: 'completed',
    quality: 'nominal',
    safety: 'unsafe',
    safetyReason: 'inadequate_isolation',
  },
}

describe('departmentWorkshopSurfacing blockers (SPE-2773)', () => {
  it('resolves zero_slot_capacity when capacity is zero and work is waiting', () => {
    expect(
      resolveDepartmentWorkshopBlockers({
        departmentId: 'department:records-analysis',
        slotCapacity: 0,
        queued: [{ workOrderId: 'work:zulu', completedWork: 0 }],
        active: [],
        paused: [],
      })
    ).toEqual(['zero_slot_capacity'])
  })

  it('resolves slots_full and waiting_resume_slot from occupancy', () => {
    expect(
      resolveDepartmentWorkshopBlockers({
        departmentId: 'department:biohazard-response',
        slotCapacity: 1,
        queued: [{ workOrderId: 'work:bravo', completedWork: 0 }],
        active: [{ workOrderId: 'work:alpha', completedWork: 1 }],
        paused: [{ workOrderId: 'work:paused', completedWork: 2 }],
      })
    ).toEqual(['slots_full', 'waiting_resume_slot'])
  })

  it('formats blocker labels for UI copy', () => {
    expect(formatDepartmentWorkshopBlockerLabel('slots_full')).toBe('Slots full')
  })
})

describe('departmentWorkshopMirrorView (SPE-2773)', () => {
  it('returns empty mirror when workshop registries are empty', () => {
    const game = createStartingState()
    const view = getDepartmentWorkshopMirrorView(game)

    expect(view.isEmpty).toBe(true)
    expect(view.summary.departmentCount).toBe(0)
    expect(view.departments).toEqual([])
    expect(view.outcomesEmpty).toBe(true)
    expect(view.consequencesEmpty).toBe(true)
  })

  it('orders departments by code-unit id and projects lanes with progress', () => {
    const game = {
      ...createStartingState(),
      departmentWorkshopWorkOrders: WORK_ORDERS,
      departmentWorkshopSnapshots: SNAPSHOTS,
    }

    const view = getDepartmentWorkshopMirrorView(game)

    expect(view.isEmpty).toBe(false)
    expect(view.departments.map((department) => department.departmentId)).toEqual([
      'department:biohazard-response',
      'department:records-analysis',
    ])

    const bio = view.departments[0]!
    expect(bio.slotCapacity).toBe(1)
    expect(bio.freeSlots).toBe(0)
    expect(bio.workItems.map((item) => item.workOrderId)).toEqual([
      'work:alpha',
      'work:bravo',
      'work:paused',
    ])
    expect(bio.workItems[0]?.progressLabel).toBe('1/2')
    expect(bio.workItems[0]?.laneLabel).toBe('Active')
    expect(bio.blockers.map((blocker) => blocker.code)).toEqual([
      'slots_full',
      'waiting_resume_slot',
    ])
  })

  it('projects stored completion quality/safety without re-grading', () => {
    const game = {
      ...createStartingState(),
      departmentWorkshopCompletionOutcomes: OUTCOMES,
    }

    const view = getDepartmentWorkshopMirrorView(game)

    expect(view.outcomesEmpty).toBe(false)
    expect(view.outcomes.map((outcome) => outcome.workOrderId)).toEqual([
      'work:done-safe',
      'work:done-unsafe',
    ])
    expect(view.outcomes[0]?.qualityLabel).toBe('Degraded')
    expect(view.outcomes[0]?.qualityReasonLabel).toBe('Poor input quality')
    expect(view.outcomes[0]?.safetyLabel).toBe('Safe')
    expect(view.outcomes[1]?.safetyLabel).toBe('Unsafe')
    expect(view.outcomes[1]?.safetyReasonLabel).toBe('Inadequate isolation')
  })

  it('joins unsafe secondary-incident markers as consequences', () => {
    const game = {
      ...createStartingState(),
      departmentWorkshopCompletionOutcomes: OUTCOMES,
      departmentWorkshopUnsafeSecondaryIncidents: {
        'work:done-unsafe': 'case:spawned-secondary',
      },
    }

    const view = getDepartmentWorkshopMirrorView(game)

    expect(view.consequencesEmpty).toBe(false)
    expect(view.consequences).toHaveLength(1)
    expect(view.consequences[0]?.spawnedCaseId).toBe('case:spawned-secondary')
    expect(view.consequences[0]?.safetyLabel).toBe('Unsafe')
  })

  it('does not mutate input registries and is byte-stable', () => {
    const game = {
      ...createStartingState(),
      departmentWorkshopWorkOrders: WORK_ORDERS,
      departmentWorkshopSnapshots: SNAPSHOTS,
      departmentWorkshopCompletionOutcomes: OUTCOMES,
      departmentWorkshopUnsafeSecondaryIncidents: {
        'work:done-unsafe': 'case:spawned-secondary',
      },
    }
    const ordersBefore = JSON.stringify(game.departmentWorkshopWorkOrders)
    const snapshotsBefore = JSON.stringify(game.departmentWorkshopSnapshots)

    const first = JSON.stringify(getDepartmentWorkshopMirrorView(game))
    const second = JSON.stringify(getDepartmentWorkshopMirrorView(game))

    expect(first).toBe(second)
    expect(JSON.stringify(game.departmentWorkshopWorkOrders)).toBe(ordersBefore)
    expect(JSON.stringify(game.departmentWorkshopSnapshots)).toBe(snapshotsBefore)
  })
})
