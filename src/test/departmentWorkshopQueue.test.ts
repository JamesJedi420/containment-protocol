import { describe, expect, it } from 'vitest'

import type {
  DepartmentCapabilityRegistry,
  DepartmentDefinition,
  DepartmentResolutionResult,
} from '../domain/departmentCapabilities'
import { evaluateDepartmentCoordination } from '../domain/departmentCoordination'
import {
  advanceDepartmentWorkshopQueue,
  pauseDepartmentWorkshopWork,
  projectDepartmentWorkshopWorkload,
  resolveDepartmentWorkshopCompletionQuality,
  resumeDepartmentWorkshopWork,
  type DepartmentWorkshopSnapshot,
  type DepartmentWorkshopWorkOrder,
} from '../domain/departmentWorkshopQueue'

const DEPARTMENT_ID = 'department:records'

function department(
  id: string,
  overrides: Partial<DepartmentDefinition> = {}
): DepartmentDefinition {
  return {
    id,
    label: id,
    capabilities: ['research', 'records'],
    taskTypes: ['research_case', 'records_review'],
    reviewAuthorities: ['research_release', 'records_release'],
    reputation: 70,
    fundingTier: 3,
    hqSiteId: `site:${id}`,
    doctrineBias: 'evidence_first',
    doctrineTags: ['analysis'],
    limits: { capabilityLimits: [] },
    failureModes: ['review_bottleneck'],
    ...overrides,
  }
}

function registry(...departments: DepartmentDefinition[]): DepartmentCapabilityRegistry {
  return {
    departments: [
      ...departments,
      department('department:fallback', {
        capabilities: [],
        taskTypes: [],
        reviewAuthorities: [],
        reputation: 50,
        doctrineBias: 'balanced',
        doctrineTags: ['general_intake'],
        failureModes: ['capability_gap'],
      }),
    ],
    fallbackDepartmentRefs: ['department:fallback'],
  }
}

const TEST_REGISTRY = registry(department(DEPARTMENT_ID))

function workOrder(
  id: string,
  overrides: Partial<DepartmentWorkshopWorkOrder> = {}
): DepartmentWorkshopWorkOrder {
  return {
    id,
    departmentId: DEPARTMENT_ID,
    caseId: `case:${id}`,
    taskType: 'records_review',
    requiredWork: 2,
    ...overrides,
  }
}

function snapshot(overrides: Partial<DepartmentWorkshopSnapshot> = {}): DepartmentWorkshopSnapshot {
  return {
    departmentId: DEPARTMENT_ID,
    slotCapacity: 1,
    queued: [],
    active: [],
    paused: [],
    ...overrides,
  }
}

function reasonCode(result: { reasons: readonly { code: string }[] }) {
  return result.reasons[0]?.code
}

describe('department workshop queue kernel (SPE-2745 / SPE-1028)', () => {
  it('keeps an empty valid workshop idle', () => {
    const result = advanceDepartmentWorkshopQueue(snapshot(), [], TEST_REGISTRY)

    expect(result).toEqual({
      state: 'advanced',
      snapshot: snapshot(),
      startedWorkOrderIds: [],
      completedWorkOrderIds: [],
      reasons: [],
    })
  })

  it('fills bounded slots in authored queue order and backfills completed work', () => {
    const workOrders = [
      workOrder('order:a', { requiredWork: 1 }),
      workOrder('order:b'),
      workOrder('order:c'),
    ]
    const result = advanceDepartmentWorkshopQueue(
      snapshot({
        slotCapacity: 2,
        queued: [
          { workOrderId: 'order:a', completedWork: 0 },
          { workOrderId: 'order:b', completedWork: 0 },
          { workOrderId: 'order:c', completedWork: 0 },
        ],
      }),
      workOrders,
      TEST_REGISTRY
    )

    expect(result.state).toBe('advanced')
    expect(result.startedWorkOrderIds).toEqual(['order:a', 'order:b', 'order:c'])
    expect(result.completedWorkOrderIds).toEqual(['order:a'])
    expect(result.snapshot).toEqual(
      snapshot({
        slotCapacity: 2,
        queued: [],
        active: [
          { workOrderId: 'order:b', completedWork: 1 },
          { workOrderId: 'order:c', completedWork: 0 },
        ],
      })
    )
  })

  it('is replay-stable when work-order definition input order changes', () => {
    const input = snapshot({
      queued: [
        { workOrderId: 'order:b', completedWork: 0 },
        { workOrderId: 'order:a', completedWork: 0 },
      ],
    })
    const a = workOrder('order:a')
    const b = workOrder('order:b')

    const first = advanceDepartmentWorkshopQueue(input, [a, b], TEST_REGISTRY)
    const replay = advanceDepartmentWorkshopQueue(input, [b, a], TEST_REGISTRY)

    expect(replay).toEqual(first)
    expect(first.snapshot?.active).toEqual([{ workOrderId: 'order:b', completedWork: 1 }])
    expect(first.snapshot?.queued).toEqual([{ workOrderId: 'order:a', completedWork: 0 }])
  })

  it('reports malformed work-order definitions independently of caller input order', () => {
    const a = workOrder('order:a', { departmentId: 'department:other-a' })
    const b = workOrder('order:b', { departmentId: 'department:other-b' })

    const first = advanceDepartmentWorkshopQueue(snapshot(), [b, a], TEST_REGISTRY)
    const replay = advanceDepartmentWorkshopQueue(snapshot(), [a, b], TEST_REGISTRY)

    expect(replay).toEqual(first)
    expect(first.reasons[0]).toEqual({
      code: 'work-order-department-mismatch',
      departmentId: DEPARTMENT_ID,
      workOrderIds: ['order:a'],
    })
  })

  it('reports every duplicate definition in code-unit order regardless of caller input order', () => {
    const a = workOrder('order:a')
    const b = workOrder('order:b')

    const first = advanceDepartmentWorkshopQueue(snapshot(), [b, b, a, a], TEST_REGISTRY)
    const replay = advanceDepartmentWorkshopQueue(snapshot(), [a, a, b, b], TEST_REGISTRY)

    expect(replay).toEqual(first)
    expect(first.reasons[0]).toEqual({
      code: 'duplicate-work-order',
      departmentId: DEPARTMENT_ID,
      workOrderIds: ['order:a', 'order:b'],
    })
  })

  it('blocks zero capacity without discarding a valid caller snapshot', () => {
    const input = snapshot({
      slotCapacity: 0,
      queued: [{ workOrderId: 'order:a', completedWork: 0 }],
    })
    const result = advanceDepartmentWorkshopQueue(input, [workOrder('order:a')], TEST_REGISTRY)

    expect(result.state).toBe('blocked')
    expect(reasonCode(result)).toBe('zero-slot-capacity')
    expect(result.snapshot).toEqual(input)
    expect(Object.isFrozen(result.snapshot)).toBe(true)
  })

  it('pauses and resumes active work without losing progress', () => {
    const input = snapshot({
      active: [{ workOrderId: 'order:a', completedWork: 1 }],
    })
    const workOrders = [workOrder('order:a', { requiredWork: 3 })]

    const paused = pauseDepartmentWorkshopWork(input, 'order:a', workOrders, TEST_REGISTRY)
    expect(paused.state).toBe('updated')
    expect(paused.snapshot?.active).toEqual([])
    expect(paused.snapshot?.paused).toEqual([{ workOrderId: 'order:a', completedWork: 1 }])

    const resumed = resumeDepartmentWorkshopWork(
      paused.snapshot as DepartmentWorkshopSnapshot,
      'order:a',
      workOrders,
      TEST_REGISTRY
    )
    expect(resumed.state).toBe('updated')
    expect(resumed.snapshot?.active).toEqual([{ workOrderId: 'order:a', completedWork: 1 }])
    expect(resumed.snapshot?.paused).toEqual([])
  })

  it('does not advance paused work during a processing tick', () => {
    const result = advanceDepartmentWorkshopQueue(
      snapshot({
        active: [{ workOrderId: 'order:a', completedWork: 0 }],
        paused: [{ workOrderId: 'order:b', completedWork: 1 }],
      }),
      [workOrder('order:a', { requiredWork: 3 }), workOrder('order:b', { requiredWork: 4 })],
      TEST_REGISTRY
    )

    expect(result.snapshot?.active).toEqual([{ workOrderId: 'order:a', completedWork: 1 }])
    expect(result.snapshot?.paused).toEqual([{ workOrderId: 'order:b', completedWork: 1 }])
  })

  it('keeps paused progress intact when resume has no open slot', () => {
    const input = snapshot({
      active: [{ workOrderId: 'order:a', completedWork: 0 }],
      paused: [{ workOrderId: 'order:b', completedWork: 1 }],
    })
    const result = resumeDepartmentWorkshopWork(
      input,
      'order:b',
      [workOrder('order:a'), workOrder('order:b', { requiredWork: 3 })],
      TEST_REGISTRY
    )

    expect(result.state).toBe('blocked')
    expect(reasonCode(result)).toBe('no-open-slot')
    expect(result.snapshot).toEqual(input)
  })

  it('fails malformed pause/resume identifiers closed without changing the snapshot', () => {
    const input = snapshot({
      active: [{ workOrderId: 'order:a', completedWork: 0 }],
    })
    const workOrders = [workOrder('order:a')]

    const paused = pauseDepartmentWorkshopWork(input, ' ', workOrders, TEST_REGISTRY)
    const resumed = resumeDepartmentWorkshopWork(input, '', workOrders, TEST_REGISTRY)

    expect(paused.state).toBe('blocked')
    expect(reasonCode(paused)).toBe('invalid-work-order-id')
    expect(paused.snapshot).toEqual(input)
    expect(resumed.state).toBe('blocked')
    expect(reasonCode(resumed)).toBe('invalid-work-order-id')
    expect(resumed.snapshot).toEqual(input)
  })

  it.each([
    {
      name: 'duplicate work-order definitions',
      input: snapshot({ queued: [{ workOrderId: 'order:a', completedWork: 0 }] }),
      workOrders: [workOrder('order:a'), workOrder('order:a')],
      expected: 'duplicate-work-order',
    },
    {
      name: 'malformed required work',
      input: snapshot(),
      workOrders: [workOrder('order:a', { requiredWork: 0 })],
      expected: 'invalid-work-orders',
    },
    {
      name: 'unsafe required work',
      input: snapshot(),
      workOrders: [workOrder('order:a', { requiredWork: Number.MAX_SAFE_INTEGER + 1 })],
      expected: 'invalid-work-orders',
    },
    {
      name: 'unsafe completed work',
      input: snapshot({
        active: [
          {
            workOrderId: 'order:a',
            completedWork: Number.MAX_SAFE_INTEGER + 1,
          },
        ],
      }),
      workOrders: [
        workOrder('order:a', {
          requiredWork: Number.MAX_SAFE_INTEGER,
        }),
      ],
      expected: 'invalid-workshop-snapshot',
    },
    {
      name: 'unsafe slot capacity',
      input: snapshot({
        slotCapacity: Number.MAX_SAFE_INTEGER + 1,
      }),
      workOrders: [],
      expected: 'invalid-workshop-snapshot',
    },
    {
      name: 'active and queued overlap',
      input: snapshot({
        queued: [{ workOrderId: 'order:a', completedWork: 0 }],
        active: [{ workOrderId: 'order:a', completedWork: 0 }],
      }),
      workOrders: [workOrder('order:a')],
      expected: 'duplicate-work-order-membership',
    },
    {
      name: 'completed work remains active',
      input: snapshot({ active: [{ workOrderId: 'order:a', completedWork: 2 }] }),
      workOrders: [workOrder('order:a')],
      expected: 'invalid-work-progress',
    },
    {
      name: 'active work exceeds slots',
      input: snapshot({
        active: [
          { workOrderId: 'order:a', completedWork: 0 },
          { workOrderId: 'order:b', completedWork: 0 },
        ],
      }),
      workOrders: [workOrder('order:a'), workOrder('order:b')],
      expected: 'active-slot-overflow',
    },
    {
      name: 'referenced work order is missing',
      input: snapshot({ queued: [{ workOrderId: 'order:missing', completedWork: 0 }] }),
      workOrders: [workOrder('order:a')],
      expected: 'missing-work-order',
    },
    {
      name: 'work order targets another department',
      input: snapshot(),
      workOrders: [workOrder('order:a', { departmentId: 'department:other' })],
      expected: 'work-order-department-mismatch',
    },
    {
      name: 'department does not support task',
      input: snapshot(),
      workOrders: [workOrder('order:a', { taskType: 'procurement_support' })],
      expected: 'unsupported-department-task',
    },
    {
      name: 'snapshot department is missing',
      input: snapshot({ departmentId: 'department:missing' }),
      workOrders: [],
      expected: 'missing-department-definition',
    },
  ])('fails closed for $name', ({ input, workOrders, expected }) => {
    const result = advanceDepartmentWorkshopQueue(input, workOrders, TEST_REGISTRY)

    expect(result.state).toBe('blocked')
    expect(reasonCode(result)).toBe(expected)
    expect(result.snapshot).toBeNull()
  })

  it('rejects sparse queue arrays before they can create phantom work', () => {
    const queued = new Array(2) as Array<{ workOrderId: string; completedWork: number }>
    queued[1] = { workOrderId: 'order:a', completedWork: 0 }
    const result = advanceDepartmentWorkshopQueue(
      snapshot({ queued }),
      [workOrder('order:a')],
      TEST_REGISTRY
    )

    expect(result.state).toBe('blocked')
    expect(reasonCode(result)).toBe('invalid-workshop-snapshot')
  })

  it('rejects an invalid SPE-2083 registry before resolving workshop ownership', () => {
    const result = advanceDepartmentWorkshopQueue(snapshot(), [], {
      departments: [],
      fallbackDepartmentRefs: [],
    })

    expect(result.state).toBe('blocked')
    expect(reasonCode(result)).toBe('invalid-department-registry')
  })

  it('does not mutate work orders or any nested snapshot collection', () => {
    const workOrders = [workOrder('order:a'), workOrder('order:b')]
    const input = snapshot({
      queued: [{ workOrderId: 'order:b', completedWork: 0 }],
      active: [{ workOrderId: 'order:a', completedWork: 0 }],
    })
    const beforeOrders = structuredClone(workOrders)
    const beforeSnapshot = structuredClone(input)

    const result = advanceDepartmentWorkshopQueue(input, workOrders, TEST_REGISTRY)

    expect(workOrders).toEqual(beforeOrders)
    expect(input).toEqual(beforeSnapshot)
    expect(result.snapshot).not.toBe(input)
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.snapshot?.active)).toBe(true)
  })

  it('projects active occupancy then queued cases while excluding paused work', () => {
    const workOrders = [
      workOrder('order:active', { caseId: 'case:active' }),
      workOrder('order:queued', { caseId: 'case:queued' }),
      workOrder('order:paused', { caseId: 'case:paused' }),
    ]
    const result = projectDepartmentWorkshopWorkload(
      snapshot({
        slotCapacity: 2,
        active: [{ workOrderId: 'order:active', completedWork: 1 }],
        queued: [{ workOrderId: 'order:queued', completedWork: 0 }],
        paused: [{ workOrderId: 'order:paused', completedWork: 1 }],
      }),
      workOrders,
      TEST_REGISTRY
    )

    expect(result).toEqual({
      state: 'projected',
      workloadSnapshot: {
        departmentId: DEPARTMENT_ID,
        queuedCaseIds: ['case:active', 'case:queued'],
        weeklyCapacity: 2,
      },
      reasons: [],
    })
    expect(Object.isFrozen(result.workloadSnapshot?.queuedCaseIds)).toBe(true)
  })

  it('projects zero slot capacity so SPE-2084 retains canonical blocking ownership', () => {
    const result = projectDepartmentWorkshopWorkload(
      snapshot({
        slotCapacity: 0,
        queued: [{ workOrderId: 'order:a', completedWork: 0 }],
      }),
      [workOrder('order:a')],
      TEST_REGISTRY
    )

    expect(result).toEqual({
      state: 'projected',
      workloadSnapshot: {
        departmentId: DEPARTMENT_ID,
        queuedCaseIds: ['case:order:a'],
        weeklyCapacity: 0,
      },
      reasons: [],
    })
  })

  it('fails projection closed when multiple work orders would duplicate a case', () => {
    const result = projectDepartmentWorkshopWorkload(
      snapshot({
        active: [{ workOrderId: 'order:a', completedWork: 0 }],
        queued: [{ workOrderId: 'order:b', completedWork: 0 }],
      }),
      [
        workOrder('order:a', { caseId: 'case:shared' }),
        workOrder('order:b', { caseId: 'case:shared' }),
      ],
      TEST_REGISTRY
    )

    expect(result.state).toBe('blocked')
    expect(reasonCode(result)).toBe('duplicate-case-workload')
  })

  it('feeds the projected queue into SPE-2084 without changing coordination ownership', () => {
    const assignment: DepartmentResolutionResult = {
      caseId: 'case:target',
      routeKind: 'matched',
      requirements: {
        primaryCapability: 'records',
        primaryTaskType: 'records_review',
        supportingCapabilities: [],
      },
      primaryDepartment: {
        departmentId: DEPARTMENT_ID,
        matchedCapabilities: ['records'],
        doctrineMatches: [],
      },
      supportingDepartments: [],
      misfitRoute: null,
      blockerCodes: [],
    }
    const projection = projectDepartmentWorkshopWorkload(
      snapshot({
        active: [{ workOrderId: 'order:active', completedWork: 0 }],
        queued: [{ workOrderId: 'order:target', completedWork: 0 }],
      }),
      [
        workOrder('order:active', { caseId: 'case:active' }),
        workOrder('order:target', { caseId: 'case:target' }),
      ],
      TEST_REGISTRY
    )

    expect(projection.state).toBe('projected')
    const coordination = evaluateDepartmentCoordination(
      assignment,
      [projection.workloadSnapshot!],
      TEST_REGISTRY
    )
    expect(coordination.state).toBe('delayed')
    expect(coordination.delayWeeks).toBe(1)
    expect(coordination.bottleneckDepartmentIds).toEqual([DEPARTMENT_ID])
  })
})

describe('resolveDepartmentWorkshopCompletionQuality (SPE-2768)', () => {
  it('defaults missing or all-good conditions to nominal', () => {
    expect(resolveDepartmentWorkshopCompletionQuality()).toEqual({ quality: 'nominal' })
    expect(resolveDepartmentWorkshopCompletionQuality(null)).toEqual({ quality: 'nominal' })
    expect(
      resolveDepartmentWorkshopCompletionQuality({
        inputQuality: 'good',
        specialistCondition: 'good',
        roomContamination: 'good',
      })
    ).toEqual({ quality: 'nominal' })
  })

  it('degrades with stable primary reason order input then specialist then room', () => {
    expect(
      resolveDepartmentWorkshopCompletionQuality({
        inputQuality: 'poor',
        specialistCondition: 'poor',
        roomContamination: 'poor',
      })
    ).toEqual({ quality: 'degraded', qualityReason: 'poor_input_quality' })
    expect(
      resolveDepartmentWorkshopCompletionQuality({
        inputQuality: 'good',
        specialistCondition: 'poor',
        roomContamination: 'poor',
      })
    ).toEqual({ quality: 'degraded', qualityReason: 'poor_specialist_condition' })
    expect(
      resolveDepartmentWorkshopCompletionQuality({
        inputQuality: 'good',
        specialistCondition: 'good',
        roomContamination: 'poor',
      })
    ).toEqual({ quality: 'degraded', qualityReason: 'poor_room_contamination' })
  })
})
