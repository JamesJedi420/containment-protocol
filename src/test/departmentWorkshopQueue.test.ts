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
  resolveDepartmentWorkshopCompletionSafety,
  resolveDepartmentWorkshopCertificationEligibility,
  resolveDepartmentWorkshopDependencyAvailability,
  resolveDepartmentWorkshopDependencyQuality,
  resolveDepartmentWorkshopEquipmentQuality,
  resolveDepartmentWorkshopReagentQuality,
  resolveDepartmentWorkshopLoadPressure,
  resolveDepartmentWorkshopOperatingModel,
  resolveDepartmentWorkshopStationEligibility,
  resolveDepartmentWorkshopThroughput,
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
  it('resolves only fully adjacent staging to accelerated throughput', () => {
    expect(
      resolveDepartmentWorkshopThroughput({
        inputStaging: 'adjacent',
        outputStaging: 'adjacent',
      })
    ).toEqual({ workUnits: 2, effect: 'adjacent_staging' })

    for (const conditions of [
      undefined,
      null,
      {},
      { inputStaging: 'adjacent' },
      { inputStaging: 'adjacent', outputStaging: 'remote' },
      { inputStaging: 'remote', outputStaging: 'adjacent' },
      { inputStaging: 'nearby', outputStaging: 'adjacent' },
    ]) {
      const result = resolveDepartmentWorkshopThroughput(conditions)
      expect(result).toEqual({ workUnits: 1, effect: 'baseline' })
      expect(Object.isFrozen(result)).toBe(true)
    }
  })

  it('resolves centralized, distributed, and malformed operating modes explicitly', () => {
    const centralized = resolveDepartmentWorkshopOperatingModel('centralized')
    expect(centralized).toEqual({
      mode: 'centralized',
      staffingWorkUnits: 1,
      staffingEffect: 'centralized_staffing',
      breachIsolation: 'baseline',
    })
    expect(Object.isFrozen(centralized)).toBe(true)

    const distributed = resolveDepartmentWorkshopOperatingModel('distributed')
    expect(distributed).toEqual({
      mode: 'distributed',
      staffingWorkUnits: 0,
      staffingEffect: 'baseline',
      breachIsolation: 'distributed_isolation',
    })
    expect(Object.isFrozen(distributed)).toBe(true)

    for (const mode of [undefined, null, '', 'central', 'DISTRIBUTED', {}]) {
      const fallback = resolveDepartmentWorkshopOperatingModel(mode)
      expect(fallback).toEqual({
        mode: 'baseline',
        staffingWorkUnits: 0,
        staffingEffect: 'baseline',
        breachIsolation: 'baseline',
      })
      expect(Object.isFrozen(fallback)).toBe(true)
    }
  })

  it('resolves normal, overloaded, and malformed load pressure explicitly', () => {
    const normal = resolveDepartmentWorkshopLoadPressure('normal')
    expect(normal).toEqual({ pressure: 'normal', throughputCap: 2, effect: 'baseline' })
    expect(Object.isFrozen(normal)).toBe(true)

    const overloaded = resolveDepartmentWorkshopLoadPressure('overloaded')
    expect(overloaded).toEqual({
      pressure: 'overloaded',
      throughputCap: 1,
      effect: 'overload_throughput_cap',
    })
    expect(Object.isFrozen(overloaded)).toBe(true)

    for (const pressure of [undefined, null, '', 'overload', 'OVERLOADED', {}]) {
      const fallback = resolveDepartmentWorkshopLoadPressure(pressure)
      expect(fallback).toEqual({ pressure: 'baseline', throughputCap: 2, effect: 'baseline' })
      expect(Object.isFrozen(fallback)).toBe(true)
    }
  })

  it('resolves ready, degraded, unavailable, and malformed dependency availability', () => {
    const ready = resolveDepartmentWorkshopDependencyAvailability('ready')
    expect(ready).toEqual({
      availability: 'ready',
      allowsProcessing: true,
      throughputCap: 2,
      effect: 'baseline',
    })
    expect(Object.isFrozen(ready)).toBe(true)

    const degraded = resolveDepartmentWorkshopDependencyAvailability('degraded')
    expect(degraded).toEqual({
      availability: 'degraded',
      allowsProcessing: true,
      throughputCap: 1,
      effect: 'degraded_dependency_cap',
    })
    expect(Object.isFrozen(degraded)).toBe(true)

    const unavailable = resolveDepartmentWorkshopDependencyAvailability('unavailable')
    expect(unavailable).toEqual({
      availability: 'unavailable',
      allowsProcessing: false,
      throughputCap: 0,
      effect: 'unavailable_dependency_block',
    })
    expect(Object.isFrozen(unavailable)).toBe(true)

    for (const availability of [undefined, null, '', 'blocked', 'READY', {}]) {
      const fallback = resolveDepartmentWorkshopDependencyAvailability(availability)
      expect(fallback).toEqual({
        availability: 'baseline',
        allowsProcessing: true,
        throughputCap: 2,
        effect: 'baseline',
      })
      expect(Object.isFrozen(fallback)).toBe(true)
    }
  })

  it('resolves certification profiles and work requirements with neutral fallbacks', () => {
    for (const profile of ['basic', 'certified', undefined, null, 'specialized', {}]) {
      const standard = resolveDepartmentWorkshopCertificationEligibility(profile, 'standard')
      expect(standard).toEqual({
        profile: profile === 'basic' || profile === 'certified' ? profile : 'baseline',
        requirement: 'standard',
        allowsStart: true,
        effect: 'baseline',
      })
      expect(Object.isFrozen(standard)).toBe(true)
    }

    const certified = resolveDepartmentWorkshopCertificationEligibility('certified', 'certified')
    expect(certified).toEqual({
      profile: 'certified',
      requirement: 'certified',
      allowsStart: true,
      effect: 'certified_work_allowed',
    })
    expect(Object.isFrozen(certified)).toBe(true)

    for (const profile of ['basic', undefined, null, 'CERTIFIED', {}]) {
      const blocked = resolveDepartmentWorkshopCertificationEligibility(profile, 'certified')
      expect(blocked).toEqual({
        profile: profile === 'basic' ? 'basic' : 'baseline',
        requirement: 'certified',
        allowsStart: false,
        effect: 'certification_required',
      })
      expect(Object.isFrozen(blocked)).toBe(true)
    }

    for (const requirement of [undefined, null, '', 'advanced', {}]) {
      expect(resolveDepartmentWorkshopCertificationEligibility('basic', requirement)).toEqual({
        profile: 'basic',
        requirement: 'standard',
        allowsStart: true,
        effect: 'baseline',
      })
    }
  })

  it('resolves station profiles and work requirements with neutral fallbacks', () => {
    for (const profile of ['basic', 'dedicated', undefined, null, 'specialized', {}]) {
      const standard = resolveDepartmentWorkshopStationEligibility(profile, 'standard')
      expect(standard).toEqual({
        profile: profile === 'basic' || profile === 'dedicated' ? profile : 'baseline',
        requirement: 'standard',
        allowsStart: true,
        effect: 'baseline',
      })
      expect(Object.isFrozen(standard)).toBe(true)
    }

    const dedicated = resolveDepartmentWorkshopStationEligibility('dedicated', 'dedicated')
    expect(dedicated).toEqual({
      profile: 'dedicated',
      requirement: 'dedicated',
      allowsStart: true,
      effect: 'dedicated_work_allowed',
    })
    expect(Object.isFrozen(dedicated)).toBe(true)

    for (const profile of ['basic', undefined, null, 'DEDICATED', {}]) {
      const blocked = resolveDepartmentWorkshopStationEligibility(profile, 'dedicated')
      expect(blocked).toEqual({
        profile: profile === 'basic' ? 'basic' : 'baseline',
        requirement: 'dedicated',
        allowsStart: false,
        effect: 'dedicated_station_required',
      })
      expect(Object.isFrozen(blocked)).toBe(true)
    }

    for (const requirement of [undefined, null, '', 'advanced', {}]) {
      expect(resolveDepartmentWorkshopStationEligibility('basic', requirement)).toEqual({
        profile: 'basic',
        requirement: 'standard',
        allowsStart: true,
        effect: 'baseline',
      })
    }

    const input = Object.freeze({ profile: 'dedicated', requirement: 'dedicated' })
    resolveDepartmentWorkshopStationEligibility(input.profile, input.requirement)
    expect(input).toEqual({ profile: 'dedicated', requirement: 'dedicated' })
  })

  it('caps adjacent and centralized staffing composition at two work units', () => {
    expect(resolveDepartmentWorkshopThroughput(undefined, 'centralized')).toEqual({
      workUnits: 2,
      effect: 'centralized_staffing',
    })

    const combined = resolveDepartmentWorkshopThroughput(
      { inputStaging: 'adjacent', outputStaging: 'adjacent' },
      'centralized'
    )
    expect(combined).toEqual({
      workUnits: 2,
      effect: 'capped_adjacent_and_centralized',
    })
    expect(Object.isFrozen(combined)).toBe(true)

    expect(
      resolveDepartmentWorkshopThroughput(
        { inputStaging: 'adjacent', outputStaging: 'adjacent' },
        'distributed'
      )
    ).toEqual({ workUnits: 2, effect: 'adjacent_staging' })
  })

  it('lets overload suppress every transient bonus without stalling baseline work', () => {
    const adjacent = { inputStaging: 'adjacent', outputStaging: 'adjacent' }

    for (const [staging, mode] of [
      [adjacent, undefined],
      [undefined, 'centralized'],
      [adjacent, 'centralized'],
      [undefined, undefined],
    ] as const) {
      const result = resolveDepartmentWorkshopThroughput(staging, mode, 'overloaded')
      expect(result).toEqual({ workUnits: 1, effect: 'overload_throughput_cap' })
      expect(Object.isFrozen(result)).toBe(true)
    }

    expect(resolveDepartmentWorkshopThroughput(adjacent, 'centralized', 'normal')).toEqual({
      workUnits: 2,
      effect: 'capped_adjacent_and_centralized',
    })
    expect(resolveDepartmentWorkshopThroughput(adjacent, 'distributed', 'overloaded')).toEqual({
      workUnits: 1,
      effect: 'overload_throughput_cap',
    })
    expect(resolveDepartmentWorkshopOperatingModel('distributed').breachIsolation).toBe(
      'distributed_isolation'
    )

    for (const pressure of [undefined, 'busy', {}]) {
      expect(resolveDepartmentWorkshopThroughput(adjacent, 'centralized', pressure)).toEqual({
        workUnits: 2,
        effect: 'capped_adjacent_and_centralized',
      })
    }
  })

  it('composes dependency availability after bonuses and load pressure', () => {
    const adjacent = { inputStaging: 'adjacent', outputStaging: 'adjacent' }

    for (const [staging, mode] of [
      [adjacent, undefined],
      [undefined, 'centralized'],
      [adjacent, 'centralized'],
      [undefined, undefined],
    ] as const) {
      expect(resolveDepartmentWorkshopThroughput(staging, mode, 'normal', 'degraded')).toEqual({
        workUnits: 1,
        effect: 'degraded_dependency_cap',
      })
    }

    expect(
      resolveDepartmentWorkshopThroughput(adjacent, 'centralized', 'overloaded', 'degraded')
    ).toEqual({
      workUnits: 1,
      effect: 'capped_degraded_dependency_and_overload',
    })
    expect(
      resolveDepartmentWorkshopThroughput(adjacent, 'centralized', 'overloaded', 'unavailable')
    ).toEqual({
      workUnits: 0,
      effect: 'unavailable_dependency_block',
    })
    expect(resolveDepartmentWorkshopThroughput(adjacent, 'centralized', 'normal', 'ready')).toEqual(
      {
        workUnits: 2,
        effect: 'capped_adjacent_and_centralized',
      }
    )
    expect(resolveDepartmentWorkshopOperatingModel('distributed').breachIsolation).toBe(
      'distributed_isolation'
    )

    for (const availability of [undefined, 'offline', {}]) {
      expect(
        resolveDepartmentWorkshopThroughput(adjacent, 'centralized', 'normal', availability)
      ).toEqual({ workUnits: 2, effect: 'capped_adjacent_and_centralized' })
    }
  })

  it('keeps capped combined acceleration from advancing its same-tick backfill', () => {
    const input = snapshot({
      queued: [{ workOrderId: 'order:b', completedWork: 0 }],
      active: [{ workOrderId: 'order:a', completedWork: 0 }],
    })
    const workOrders = [workOrder('order:a'), workOrder('order:b')]
    const before = structuredClone(input)

    const accelerated = advanceDepartmentWorkshopQueue(
      input,
      workOrders,
      TEST_REGISTRY,
      undefined,
      { inputStaging: 'adjacent', outputStaging: 'adjacent' },
      'centralized'
    )

    expect(accelerated.completedWorkOrderIds).toEqual(['order:a'])
    expect(accelerated.startedWorkOrderIds).toEqual(['order:b'])
    expect(accelerated.snapshot?.active).toEqual([{ workOrderId: 'order:b', completedWork: 0 }])
    expect(input).toEqual(before)
    expect(Object.isFrozen(accelerated.snapshot?.active)).toBe(true)
  })

  it('delays completion under overload and still backfills only after completion', () => {
    const input = snapshot({
      queued: [{ workOrderId: 'order:b', completedWork: 0 }],
      active: [{ workOrderId: 'order:a', completedWork: 0 }],
    })
    const workOrders = [workOrder('order:a'), workOrder('order:b')]

    const delayed = advanceDepartmentWorkshopQueue(
      input,
      workOrders,
      TEST_REGISTRY,
      undefined,
      { inputStaging: 'adjacent', outputStaging: 'adjacent' },
      'centralized',
      'overloaded'
    )
    expect(delayed.completedWorkOrderIds).toEqual([])
    expect(delayed.startedWorkOrderIds).toEqual([])
    expect(delayed.snapshot?.active).toEqual([{ workOrderId: 'order:a', completedWork: 1 }])
    expect(delayed.snapshot?.queued).toEqual([{ workOrderId: 'order:b', completedWork: 0 }])

    const completed = advanceDepartmentWorkshopQueue(
      delayed.snapshot as DepartmentWorkshopSnapshot,
      workOrders,
      TEST_REGISTRY,
      undefined,
      { inputStaging: 'adjacent', outputStaging: 'adjacent' },
      'centralized',
      'overloaded'
    )
    expect(completed.completedWorkOrderIds).toEqual(['order:a'])
    expect(completed.startedWorkOrderIds).toEqual(['order:b'])
    expect(completed.snapshot?.active).toEqual([{ workOrderId: 'order:b', completedWork: 0 }])
  })

  it('blocks unavailable dependencies before slot fill or progress', () => {
    const input = snapshot({
      slotCapacity: 2,
      queued: [{ workOrderId: 'order:b', completedWork: 0 }],
      active: [{ workOrderId: 'order:a', completedWork: 1 }],
      paused: [{ workOrderId: 'order:c', completedWork: 1 }],
    })
    const before = structuredClone(input)
    const result = advanceDepartmentWorkshopQueue(
      input,
      [workOrder('order:a'), workOrder('order:b'), workOrder('order:c', { requiredWork: 3 })],
      TEST_REGISTRY,
      undefined,
      { inputStaging: 'adjacent', outputStaging: 'adjacent' },
      'centralized',
      'normal',
      'unavailable'
    )

    expect(result.state).toBe('blocked')
    expect(reasonCode(result)).toBe('unavailable-workshop-dependency')
    expect(result.snapshot).toEqual(input)
    expect(result.startedWorkOrderIds).toEqual([])
    expect(result.completedWorkOrderIds).toEqual([])
    expect(input).toEqual(before)
    expect(Object.isFrozen(result.snapshot)).toBe(true)
    expect(Object.isFrozen(result.snapshot?.queued[0])).toBe(true)
  })

  it('preserves zero-slot validation precedence over unavailable dependencies', () => {
    const result = advanceDepartmentWorkshopQueue(
      snapshot({ slotCapacity: 0, queued: [{ workOrderId: 'order:a', completedWork: 0 }] }),
      [workOrder('order:a')],
      TEST_REGISTRY,
      undefined,
      undefined,
      undefined,
      undefined,
      'unavailable'
    )

    expect(result.state).toBe('blocked')
    expect(reasonCode(result)).toBe('zero-slot-capacity')
  })

  it('keeps degraded completion backfill timing unchanged', () => {
    const result = advanceDepartmentWorkshopQueue(
      snapshot({
        queued: [{ workOrderId: 'order:b', completedWork: 0 }],
        active: [{ workOrderId: 'order:a', completedWork: 1 }],
      }),
      [workOrder('order:a'), workOrder('order:b')],
      TEST_REGISTRY,
      undefined,
      { inputStaging: 'adjacent', outputStaging: 'adjacent' },
      'centralized',
      'normal',
      'degraded'
    )

    expect(result.completedWorkOrderIds).toEqual(['order:a'])
    expect(result.startedWorkOrderIds).toEqual(['order:b'])
    expect(result.snapshot?.active).toEqual([{ workOrderId: 'order:b', completedWork: 0 }])
  })

  it('starts certified-required work only under a certified profile', () => {
    const input = snapshot({ queued: [{ workOrderId: 'order:a', completedWork: 0 }] })
    const requirements = { 'order:a': 'certified' }

    const blocked = advanceDepartmentWorkshopQueue(
      input,
      [workOrder('order:a')],
      TEST_REGISTRY,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { profile: 'basic', requirementsByWorkOrderId: requirements }
    )
    expect(blocked.state).toBe('blocked')
    expect(blocked.snapshot).toEqual(input)
    expect(blocked.startedWorkOrderIds).toEqual([])
    expect(blocked.reasons).toEqual([
      {
        code: 'workshop-certification-required',
        departmentId: DEPARTMENT_ID,
        workOrderIds: ['order:a'],
      },
    ])
    expect(Object.isFrozen(blocked.reasons)).toBe(true)
    expect(Object.isFrozen(blocked.reasons[0]?.workOrderIds)).toBe(true)

    const allowed = advanceDepartmentWorkshopQueue(
      input,
      [workOrder('order:a')],
      TEST_REGISTRY,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { profile: 'certified', requirementsByWorkOrderId: requirements }
    )
    expect(allowed.state).toBe('advanced')
    expect(allowed.startedWorkOrderIds).toEqual(['order:a'])
    expect(allowed.snapshot?.active).toEqual([{ workOrderId: 'order:a', completedWork: 1 }])
    expect(allowed.reasons).toEqual([])

    const inheritedRequirements = Object.create({ 'order:a': 'certified' }) as Record<
      string,
      unknown
    >
    const inherited = advanceDepartmentWorkshopQueue(
      input,
      [workOrder('order:a')],
      TEST_REGISTRY,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { profile: 'basic', requirementsByWorkOrderId: inheritedRequirements }
    )
    expect(inherited.startedWorkOrderIds).toEqual(['order:a'])
    expect(inherited.reasons).toEqual([])
  })

  it('keeps throughput bonuses and same-tick backfill timing for eligible certified work', () => {
    const result = advanceDepartmentWorkshopQueue(
      snapshot({
        queued: [
          { workOrderId: 'order:a', completedWork: 0 },
          { workOrderId: 'order:b', completedWork: 0 },
        ],
      }),
      [workOrder('order:a'), workOrder('order:b', { requiredWork: 3 })],
      TEST_REGISTRY,
      undefined,
      { inputStaging: 'adjacent', outputStaging: 'adjacent' },
      'centralized',
      undefined,
      undefined,
      {
        profile: 'certified',
        requirementsByWorkOrderId: {
          'order:a': 'certified',
          'order:b': 'certified',
        },
      }
    )

    expect(result.completedWorkOrderIds).toEqual(['order:a'])
    expect(result.startedWorkOrderIds).toEqual(['order:a', 'order:b'])
    expect(result.snapshot?.active).toEqual([{ workOrderId: 'order:b', completedWork: 0 }])
    expect(result.reasons).toEqual([])
  })

  it('keeps strict FIFO when a certified-required head blocks later standard work', () => {
    const input = snapshot({
      slotCapacity: 2,
      queued: [
        { workOrderId: 'order:certified', completedWork: 0 },
        { workOrderId: 'order:standard', completedWork: 0 },
      ],
    })
    const result = advanceDepartmentWorkshopQueue(
      input,
      [workOrder('order:certified'), workOrder('order:standard')],
      TEST_REGISTRY,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        profile: 'basic',
        requirementsByWorkOrderId: { 'order:certified': 'certified' },
      }
    )

    expect(result.state).toBe('blocked')
    expect(result.snapshot).toEqual(input)
    expect(result.startedWorkOrderIds).toEqual([])
    expect(result.reasons[0]?.workOrderIds).toEqual(['order:certified'])

    const eligibleThenBlocked = advanceDepartmentWorkshopQueue(
      snapshot({
        slotCapacity: 2,
        queued: [
          { workOrderId: 'order:standard', completedWork: 0 },
          { workOrderId: 'order:certified', completedWork: 0 },
        ],
      }),
      [workOrder('order:certified'), workOrder('order:standard')],
      TEST_REGISTRY,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        profile: 'basic',
        requirementsByWorkOrderId: { 'order:certified': 'certified' },
      }
    )
    expect(eligibleThenBlocked.state).toBe('advanced')
    expect(eligibleThenBlocked.startedWorkOrderIds).toEqual(['order:standard'])
    expect(eligibleThenBlocked.snapshot?.active).toEqual([
      { workOrderId: 'order:standard', completedWork: 1 },
    ])
    expect(eligibleThenBlocked.snapshot?.queued).toEqual([
      { workOrderId: 'order:certified', completedWork: 0 },
    ])
    expect(eligibleThenBlocked.reasons).toHaveLength(1)
  })

  it('retains active progress and completion while certification blocks backfill', () => {
    const input = snapshot({
      queued: [{ workOrderId: 'order:certified', completedWork: 0 }],
      active: [{ workOrderId: 'order:active', completedWork: 0 }],
    })
    const context = {
      profile: 'basic',
      requirementsByWorkOrderId: { 'order:certified': 'certified' },
    }
    const workOrders = [
      workOrder('order:active', { requiredWork: 2 }),
      workOrder('order:certified'),
    ]

    const progressing = advanceDepartmentWorkshopQueue(
      input,
      workOrders,
      TEST_REGISTRY,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      context
    )
    expect(progressing.state).toBe('advanced')
    expect(progressing.snapshot?.active).toEqual([
      { workOrderId: 'order:active', completedWork: 1 },
    ])
    expect(progressing.snapshot?.queued).toEqual([
      { workOrderId: 'order:certified', completedWork: 0 },
    ])
    expect(progressing.reasons).toEqual([])

    const completing = advanceDepartmentWorkshopQueue(
      progressing.snapshot as DepartmentWorkshopSnapshot,
      workOrders,
      TEST_REGISTRY,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      context
    )
    expect(completing.state).toBe('advanced')
    expect(completing.completedWorkOrderIds).toEqual(['order:active'])
    expect(completing.startedWorkOrderIds).toEqual([])
    expect(completing.snapshot?.active).toEqual([])
    expect(completing.snapshot?.queued).toEqual([
      { workOrderId: 'order:certified', completedWork: 0 },
    ])
    expect(completing.reasons).toHaveLength(1)
  })

  it('grandfathers active certified work and preserves paused work', () => {
    const input = snapshot({
      active: [{ workOrderId: 'order:active', completedWork: 0 }],
      paused: [{ workOrderId: 'order:paused', completedWork: 1 }],
    })
    const result = advanceDepartmentWorkshopQueue(
      input,
      [
        workOrder('order:active', { requiredWork: 3 }),
        workOrder('order:paused', { requiredWork: 3 }),
      ],
      TEST_REGISTRY,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        profile: 'basic',
        requirementsByWorkOrderId: {
          'order:active': 'certified',
          'order:paused': 'certified',
        },
      }
    )

    expect(result.snapshot?.active).toEqual([{ workOrderId: 'order:active', completedWork: 1 }])
    expect(result.snapshot?.paused).toEqual([{ workOrderId: 'order:paused', completedWork: 1 }])
    expect(result.reasons).toEqual([])
  })

  it('keeps zero-slot and unavailable dependency precedence over certification', () => {
    const context = {
      profile: 'basic',
      requirementsByWorkOrderId: { 'order:a': 'certified' },
    }
    const zeroSlot = advanceDepartmentWorkshopQueue(
      snapshot({ slotCapacity: 0, queued: [{ workOrderId: 'order:a', completedWork: 0 }] }),
      [workOrder('order:a')],
      TEST_REGISTRY,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      context
    )
    expect(reasonCode(zeroSlot)).toBe('zero-slot-capacity')

    const unavailable = advanceDepartmentWorkshopQueue(
      snapshot({ queued: [{ workOrderId: 'order:a', completedWork: 0 }] }),
      [workOrder('order:a')],
      TEST_REGISTRY,
      undefined,
      undefined,
      undefined,
      undefined,
      'unavailable',
      context
    )
    expect(reasonCode(unavailable)).toBe('unavailable-workshop-dependency')
  })

  it('starts dedicated-required work only under a dedicated station profile', () => {
    const input = snapshot({ queued: [{ workOrderId: 'order:a', completedWork: 0 }] })
    const requirements = { 'order:a': 'dedicated' }

    const blocked = advanceDepartmentWorkshopQueue(
      input,
      [workOrder('order:a')],
      TEST_REGISTRY,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { profile: 'basic', requirementsByWorkOrderId: requirements }
    )
    expect(blocked.state).toBe('blocked')
    expect(blocked.snapshot).toEqual(input)
    expect(blocked.startedWorkOrderIds).toEqual([])
    expect(blocked.reasons).toEqual([
      {
        code: 'workshop-dedicated-station-required',
        departmentId: DEPARTMENT_ID,
        workOrderIds: ['order:a'],
      },
    ])
    expect(Object.isFrozen(blocked.reasons)).toBe(true)
    expect(Object.isFrozen(blocked.reasons[0]?.workOrderIds)).toBe(true)

    const allowed = advanceDepartmentWorkshopQueue(
      input,
      [workOrder('order:a')],
      TEST_REGISTRY,
      undefined,
      { inputStaging: 'adjacent', outputStaging: 'adjacent' },
      'centralized',
      undefined,
      undefined,
      undefined,
      { profile: 'dedicated', requirementsByWorkOrderId: requirements }
    )
    expect(allowed.state).toBe('advanced')
    expect(allowed.startedWorkOrderIds).toEqual(['order:a'])
    expect(allowed.completedWorkOrderIds).toEqual(['order:a'])
    expect(allowed.reasons).toEqual([])

    const inheritedRequirements = Object.create({ 'order:a': 'dedicated' }) as Record<
      string,
      unknown
    >
    const inherited = advanceDepartmentWorkshopQueue(
      input,
      [workOrder('order:a')],
      TEST_REGISTRY,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { profile: 'basic', requirementsByWorkOrderId: inheritedRequirements }
    )
    expect(inherited.startedWorkOrderIds).toEqual(['order:a'])
    expect(inherited.reasons).toEqual([])
  })

  it('keeps station eligibility strict FIFO and blocks ineligible backfill', () => {
    const stationContext = {
      profile: 'basic',
      requirementsByWorkOrderId: { 'order:dedicated': 'dedicated' },
    }
    const fifoInput = snapshot({
      slotCapacity: 2,
      queued: [
        { workOrderId: 'order:dedicated', completedWork: 0 },
        { workOrderId: 'order:standard', completedWork: 0 },
      ],
    })
    const fifo = advanceDepartmentWorkshopQueue(
      fifoInput,
      [workOrder('order:dedicated'), workOrder('order:standard')],
      TEST_REGISTRY,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      stationContext
    )
    expect(fifo.state).toBe('blocked')
    expect(fifo.snapshot).toEqual(fifoInput)
    expect(fifo.startedWorkOrderIds).toEqual([])
    expect(fifo.reasons[0]?.workOrderIds).toEqual(['order:dedicated'])

    const activeInput = snapshot({
      queued: [{ workOrderId: 'order:dedicated', completedWork: 0 }],
      active: [{ workOrderId: 'order:active', completedWork: 1 }],
      paused: [{ workOrderId: 'order:paused', completedWork: 1 }],
    })
    const completed = advanceDepartmentWorkshopQueue(
      activeInput,
      [
        workOrder('order:active'),
        workOrder('order:dedicated'),
        workOrder('order:paused', { requiredWork: 3 }),
      ],
      TEST_REGISTRY,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      stationContext
    )
    expect(completed.state).toBe('advanced')
    expect(completed.completedWorkOrderIds).toEqual(['order:active'])
    expect(completed.startedWorkOrderIds).toEqual([])
    expect(completed.snapshot?.active).toEqual([])
    expect(completed.snapshot?.queued).toEqual([
      { workOrderId: 'order:dedicated', completedWork: 0 },
    ])
    expect(completed.snapshot?.paused).toEqual([{ workOrderId: 'order:paused', completedWork: 1 }])
    expect(reasonCode(completed)).toBe('workshop-dedicated-station-required')
  })

  it('keeps validation and certification precedence over station eligibility', () => {
    const stationContext = {
      profile: 'basic',
      requirementsByWorkOrderId: { 'order:a': 'dedicated' },
    }
    const certificationContext = {
      profile: 'basic',
      requirementsByWorkOrderId: { 'order:a': 'certified' },
    }
    const bothBlocked = advanceDepartmentWorkshopQueue(
      snapshot({ queued: [{ workOrderId: 'order:a', completedWork: 0 }] }),
      [workOrder('order:a')],
      TEST_REGISTRY,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      certificationContext,
      stationContext
    )
    expect(reasonCode(bothBlocked)).toBe('workshop-certification-required')

    const stationBlocked = advanceDepartmentWorkshopQueue(
      snapshot({ queued: [{ workOrderId: 'order:a', completedWork: 0 }] }),
      [workOrder('order:a')],
      TEST_REGISTRY,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { profile: 'certified', requirementsByWorkOrderId: { 'order:a': 'certified' } },
      stationContext
    )
    expect(reasonCode(stationBlocked)).toBe('workshop-dedicated-station-required')

    const zeroSlot = advanceDepartmentWorkshopQueue(
      snapshot({ slotCapacity: 0, queued: [{ workOrderId: 'order:a', completedWork: 0 }] }),
      [workOrder('order:a')],
      TEST_REGISTRY,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      stationContext
    )
    expect(reasonCode(zeroSlot)).toBe('zero-slot-capacity')

    const unavailable = advanceDepartmentWorkshopQueue(
      snapshot({ queued: [{ workOrderId: 'order:a', completedWork: 0 }] }),
      [workOrder('order:a')],
      TEST_REGISTRY,
      undefined,
      undefined,
      undefined,
      undefined,
      'unavailable',
      undefined,
      stationContext
    )
    expect(reasonCode(unavailable)).toBe('unavailable-workshop-dependency')
  })

  it('keeps remote, partial, omitted, and malformed staging on baseline advancement', () => {
    const input = snapshot({
      active: [{ workOrderId: 'order:a', completedWork: 0 }],
    })
    const definitions = [workOrder('order:a')]
    const variants: unknown[] = [
      undefined,
      { inputStaging: 'adjacent' },
      { inputStaging: 'adjacent', outputStaging: 'remote' },
      { inputStaging: 'broken', outputStaging: 'adjacent' },
    ]

    for (const staging of variants) {
      const result = advanceDepartmentWorkshopQueue(
        input,
        definitions,
        TEST_REGISTRY,
        undefined,
        staging
      )
      expect(result.completedWorkOrderIds).toEqual([])
      expect(result.snapshot?.active).toEqual([{ workOrderId: 'order:a', completedWork: 1 }])
    }
  })

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
      TEST_REGISTRY,
      undefined,
      undefined,
      'distributed',
      'overloaded'
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

  it('places caller-composed dependency, equipment, and reagent quality after existing precedence', () => {
    expect(
      resolveDepartmentWorkshopCompletionQuality({
        inputQuality: 'good',
        specialistCondition: 'good',
        roomContamination: 'good',
        dependencyCondition: 'poor',
      })
    ).toEqual({ quality: 'degraded', qualityReason: 'poor_dependency_condition' })
    expect(
      resolveDepartmentWorkshopCompletionQuality({
        inputQuality: 'good',
        specialistCondition: 'poor',
        roomContamination: 'poor',
        dependencyCondition: 'poor',
      })
    ).toEqual({ quality: 'degraded', qualityReason: 'poor_specialist_condition' })
    expect(
      resolveDepartmentWorkshopCompletionQuality({
        inputQuality: 'good',
        specialistCondition: 'good',
        roomContamination: 'good',
        dependencyCondition: 'malformed',
      } as never)
    ).toEqual({ quality: 'nominal' })
    expect(
      resolveDepartmentWorkshopCompletionQuality({
        inputQuality: 'good',
        specialistCondition: 'good',
        roomContamination: 'poor',
        equipmentCondition: 'malformed',
      } as never)
    ).toEqual({ quality: 'degraded', qualityReason: 'poor_room_contamination' })
    expect(
      resolveDepartmentWorkshopCompletionQuality({
        inputQuality: 'good',
        specialistCondition: 'good',
        roomContamination: 'poor',
        dependencyCondition: 'malformed',
      } as never)
    ).toEqual({ quality: 'degraded', qualityReason: 'poor_room_contamination' })
    expect(
      resolveDepartmentWorkshopCompletionQuality({
        inputQuality: 'good',
        specialistCondition: 'good',
        roomContamination: 'good',
        dependencyCondition: 'good',
        equipmentCondition: 'poor',
      })
    ).toEqual({ quality: 'degraded', qualityReason: 'poor_equipment_condition' })
    expect(
      resolveDepartmentWorkshopCompletionQuality({
        inputQuality: 'good',
        specialistCondition: 'good',
        roomContamination: 'good',
        dependencyCondition: 'poor',
        equipmentCondition: 'poor',
      })
    ).toEqual({ quality: 'degraded', qualityReason: 'poor_dependency_condition' })
    expect(
      resolveDepartmentWorkshopCompletionQuality({
        inputQuality: 'good',
        specialistCondition: 'good',
        roomContamination: 'poor',
        dependencyCondition: 'poor',
        equipmentCondition: 'poor',
      })
    ).toEqual({ quality: 'degraded', qualityReason: 'poor_room_contamination' })
    expect(
      resolveDepartmentWorkshopCompletionQuality({
        inputQuality: 'good',
        specialistCondition: 'good',
        roomContamination: 'good',
        equipmentCondition: 'malformed',
      } as never)
    ).toEqual({ quality: 'nominal' })
    expect(
      resolveDepartmentWorkshopCompletionQuality({
        inputQuality: 'good',
        specialistCondition: 'good',
        roomContamination: 'good',
        dependencyCondition: 'good',
        equipmentCondition: 'good',
        reagentGrade: 'poor',
      })
    ).toEqual({ quality: 'degraded', qualityReason: 'poor_reagent_grade' })
    expect(
      resolveDepartmentWorkshopCompletionQuality({
        inputQuality: 'good',
        specialistCondition: 'good',
        roomContamination: 'good',
        dependencyCondition: 'good',
        equipmentCondition: 'poor',
        reagentGrade: 'poor',
      })
    ).toEqual({ quality: 'degraded', qualityReason: 'poor_equipment_condition' })
    expect(
      resolveDepartmentWorkshopCompletionQuality({
        inputQuality: 'good',
        specialistCondition: 'good',
        roomContamination: 'poor',
        reagentGrade: 'malformed',
      } as never)
    ).toEqual({ quality: 'degraded', qualityReason: 'poor_room_contamination' })
    expect(
      resolveDepartmentWorkshopCompletionQuality({
        inputQuality: 'good',
        specialistCondition: 'good',
        roomContamination: 'good',
        reagentGrade: 'malformed',
      } as never)
    ).toEqual({ quality: 'nominal' })
  })

  it('keeps every established axis ahead of reagent grade', () => {
    const earlierAxes = [
      ['inputQuality', 'poor_input_quality'],
      ['specialistCondition', 'poor_specialist_condition'],
      ['roomContamination', 'poor_room_contamination'],
      ['dependencyCondition', 'poor_dependency_condition'],
      ['equipmentCondition', 'poor_equipment_condition'],
    ] as const

    for (const [axis, qualityReason] of earlierAxes) {
      expect(
        resolveDepartmentWorkshopCompletionQuality({
          inputQuality: 'good',
          specialistCondition: 'good',
          roomContamination: 'good',
          dependencyCondition: 'good',
          equipmentCondition: 'good',
          reagentGrade: 'poor',
          [axis]: 'poor',
        })
      ).toEqual({ quality: 'degraded', qualityReason })
    }
  })
})

describe('resolveDepartmentWorkshopDependencyQuality (SPE-2781)', () => {
  it('maps only degraded availability to poor dependency quality', () => {
    expect(resolveDepartmentWorkshopDependencyQuality('degraded')).toEqual({
      dependencyCondition: 'poor',
      effect: 'degraded_dependency_quality',
    })
    for (const availability of ['ready', 'unavailable', undefined, null, 'malformed']) {
      expect(resolveDepartmentWorkshopDependencyQuality(availability)).toEqual({
        dependencyCondition: 'good',
        effect: 'baseline',
      })
    }
  })

  it('returns frozen results without mutating caller input', () => {
    const input = Object.freeze({ availability: 'degraded' })
    const result = resolveDepartmentWorkshopDependencyQuality(input.availability)

    expect(input).toEqual({ availability: 'degraded' })
    expect(Object.isFrozen(result)).toBe(true)
  })
})

describe('resolveDepartmentWorkshopEquipmentQuality (SPE-2782)', () => {
  it('maps only explicit poor equipment condition to degraded quality', () => {
    expect(resolveDepartmentWorkshopEquipmentQuality('poor')).toEqual({
      equipmentCondition: 'poor',
      effect: 'degraded_equipment_quality',
    })
    for (const condition of ['good', undefined, null, 'degraded', 'malformed', 1, {}]) {
      const result = resolveDepartmentWorkshopEquipmentQuality(condition)
      expect(result).toEqual({
        equipmentCondition: 'good',
        effect: 'baseline',
      })
      expect(Object.isFrozen(result)).toBe(true)
    }
  })

  it('returns frozen results without mutating caller input', () => {
    const input = Object.freeze({ equipmentCondition: 'poor' })
    const result = resolveDepartmentWorkshopEquipmentQuality(input.equipmentCondition)

    expect(input).toEqual({ equipmentCondition: 'poor' })
    expect(Object.isFrozen(result)).toBe(true)
  })
})

describe('resolveDepartmentWorkshopReagentQuality (SPE-2783)', () => {
  it('maps only explicit poor reagent grade to degraded quality', () => {
    expect(resolveDepartmentWorkshopReagentQuality('poor')).toEqual({
      reagentGrade: 'poor',
      effect: 'degraded_reagent_quality',
    })
    for (const grade of ['good', undefined, null, 'degraded', 'malformed', 1, {}]) {
      const result = resolveDepartmentWorkshopReagentQuality(grade)
      expect(result).toEqual({ reagentGrade: 'good', effect: 'baseline' })
      expect(Object.isFrozen(result)).toBe(true)
    }
  })

  it('returns frozen results without mutating caller input', () => {
    const input = Object.freeze({ reagentGrade: 'poor' })
    const result = resolveDepartmentWorkshopReagentQuality(input.reagentGrade)

    expect(input).toEqual({ reagentGrade: 'poor' })
    expect(Object.isFrozen(result)).toBe(true)
  })
})

describe('resolveDepartmentWorkshopCompletionSafety', () => {
  it('defaults missing or all-good conditions to safe', () => {
    expect(resolveDepartmentWorkshopCompletionSafety()).toEqual({ safety: 'safe' })
    expect(resolveDepartmentWorkshopCompletionSafety(null)).toEqual({ safety: 'safe' })
    expect(
      resolveDepartmentWorkshopCompletionSafety({
        isolation: 'good',
        ventilation: 'good',
        ppe: 'good',
        dualAuth: 'good',
      })
    ).toEqual({ safety: 'safe' })
  })

  it('marks unsafe with stable primary reason isolation then ventilation then ppe then dualAuth', () => {
    expect(
      resolveDepartmentWorkshopCompletionSafety({
        isolation: 'poor',
        ventilation: 'poor',
        ppe: 'poor',
        dualAuth: 'poor',
      })
    ).toEqual({ safety: 'unsafe', safetyReason: 'inadequate_isolation' })
    expect(
      resolveDepartmentWorkshopCompletionSafety({
        isolation: 'good',
        ventilation: 'poor',
        ppe: 'poor',
        dualAuth: 'poor',
      })
    ).toEqual({ safety: 'unsafe', safetyReason: 'inadequate_ventilation' })
    expect(
      resolveDepartmentWorkshopCompletionSafety({
        isolation: 'good',
        ventilation: 'good',
        ppe: 'poor',
        dualAuth: 'poor',
      })
    ).toEqual({ safety: 'unsafe', safetyReason: 'inadequate_ppe' })
    expect(
      resolveDepartmentWorkshopCompletionSafety({
        isolation: 'good',
        ventilation: 'good',
        ppe: 'good',
        dualAuth: 'poor',
      })
    ).toEqual({ safety: 'unsafe', safetyReason: 'missing_dual_auth' })
  })

  it('stays orthogonal to quality room-contamination axes', () => {
    expect(
      resolveDepartmentWorkshopCompletionQuality({
        inputQuality: 'good',
        specialistCondition: 'good',
        roomContamination: 'poor',
      })
    ).toEqual({ quality: 'degraded', qualityReason: 'poor_room_contamination' })
    expect(
      resolveDepartmentWorkshopCompletionSafety({
        isolation: 'good',
        ventilation: 'good',
        ppe: 'good',
        dualAuth: 'good',
      })
    ).toEqual({ safety: 'safe' })
    expect(
      resolveDepartmentWorkshopCompletionSafety({
        isolation: 'poor',
        ventilation: 'good',
        ppe: 'good',
        dualAuth: 'good',
      })
    ).toEqual({ safety: 'unsafe', safetyReason: 'inadequate_isolation' })
    expect(
      resolveDepartmentWorkshopCompletionQuality({
        inputQuality: 'good',
        specialistCondition: 'good',
        roomContamination: 'good',
      })
    ).toEqual({ quality: 'nominal' })
  })
})
