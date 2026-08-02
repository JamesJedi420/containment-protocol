import { afterEach, describe, expect, it } from 'vitest'

import { useGameStore } from '../app/store/gameStore'
import { createStartingState } from '../data/startingState'
import {
  DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY,
  resolveDepartments,
  type DepartmentCapabilityRegistry,
  type DepartmentCasePacket,
} from '../domain/departmentCapabilities'
import type {
  DepartmentWorkshopSnapshot,
  DepartmentWorkshopStateSource,
  DepartmentWorkshopWorkOrder,
} from '../domain/departmentWorkshopQueue'
import { routeAndEnqueueDepartmentWorkshopWorkOrder } from '../domain/departmentWorkshopRouting'

function packet(overrides: Partial<DepartmentCasePacket> = {}): DepartmentCasePacket {
  return {
    caseId: 'case:routing',
    missionCategory: 'investigation_lead',
    caseTags: ['analysis'],
    ...overrides,
  }
}

function assignedDepartmentIds(casePacket: DepartmentCasePacket) {
  const resolution = resolveDepartments(casePacket, DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY)
  return [
    resolution.primaryDepartment?.departmentId,
    ...resolution.supportingDepartments.map((department) => department.departmentId),
  ].filter((departmentId): departmentId is string => Boolean(departmentId))
}

function snapshot(
  departmentId: string,
  slotCapacity = 1,
  overrides: Partial<DepartmentWorkshopSnapshot> = {}
): DepartmentWorkshopSnapshot {
  return {
    departmentId,
    slotCapacity,
    queued: [],
    active: [],
    paused: [],
    ...overrides,
  }
}

function sourceFor(
  casePacket: DepartmentCasePacket,
  overrides: {
    workOrders?: Record<string, DepartmentWorkshopWorkOrder>
    snapshots?: Record<string, DepartmentWorkshopSnapshot>
  } = {}
): DepartmentWorkshopStateSource {
  const snapshots = Object.fromEntries(
    assignedDepartmentIds(casePacket).map((departmentId) => [departmentId, snapshot(departmentId)])
  )
  return {
    departmentWorkshopWorkOrders: overrides.workOrders ?? {},
    departmentWorkshopSnapshots: { ...snapshots, ...overrides.snapshots },
  }
}

function request(casePacket: DepartmentCasePacket = packet()) {
  return { workOrderId: 'work:routing', casePacket, requiredWork: 3 }
}

afterEach(() => {
  useGameStore.getState().reset()
})

describe('specialized department workshop routing (SPE-2787)', () => {
  it('derives specialized primary departments and task types before enqueuing', () => {
    const analysis = packet()
    const biohazard = packet({
      caseId: 'case:biohazard',
      missionCategory: 'containment_breach',
      caseTags: ['biohazard'],
    })

    const analysisResult = routeAndEnqueueDepartmentWorkshopWorkOrder(
      sourceFor(analysis),
      request(analysis)
    )
    const biohazardResult = routeAndEnqueueDepartmentWorkshopWorkOrder(sourceFor(biohazard), {
      ...request(biohazard),
      workOrderId: 'work:biohazard',
    })

    expect(analysisResult.state).toBe('enqueued')
    expect(analysisResult.coordination?.state).toBe('aligned')
    expect(analysisResult.workloadProjections).toHaveLength(assignedDepartmentIds(analysis).length)
    expect(analysisResult.routingResolution.primaryDepartment?.departmentId).toBe(
      'department:records-analysis'
    )
    expect(analysisResult.writeResult?.workshopState.workOrders['work:routing']).toMatchObject({
      departmentId: 'department:records-analysis',
      caseId: analysis.caseId,
      taskType: 'research_case',
    })
    expect(Object.keys(analysisResult.writeResult?.workshopState.workOrders ?? {})).toEqual([
      'work:routing',
    ])
    expect(biohazardResult.routingResolution.primaryDepartment?.departmentId).toBe(
      'department:biohazard-response'
    )
    expect(biohazardResult.writeResult?.workshopState.workOrders['work:biohazard']).toMatchObject({
      departmentId: 'department:biohazard-response',
      taskType: 'containment_response',
    })
  })

  it('uses canonical occupancy for delay while enqueuing only the primary order', () => {
    const casePacket = packet()
    const resolution = resolveDepartments(casePacket, DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY)
    const primaryId = resolution.primaryDepartment!.departmentId
    const existing: DepartmentWorkshopWorkOrder = {
      id: 'work:existing',
      departmentId: primaryId,
      caseId: 'case:existing',
      taskType: resolution.requirements.primaryTaskType,
      requiredWork: 2,
    }
    const source = sourceFor(casePacket, {
      workOrders: { [existing.id]: existing },
      snapshots: {
        [primaryId]: snapshot(primaryId, 1, {
          active: [{ workOrderId: existing.id, completedWork: 0 }],
        }),
      },
    })
    const before = structuredClone(source)

    const result = routeAndEnqueueDepartmentWorkshopWorkOrder(source, request(casePacket))

    expect(result.state).toBe('enqueued')
    expect(result.coordination?.state).not.toBe('blocked')
    expect(result.coordination?.delayWeeks).toBeGreaterThanOrEqual(1)
    expect(result.coordination?.reasons.map((reason) => reason.code)).toContain(
      'queue-capacity-delay'
    )
    expect(
      result.writeResult?.workshopState.snapshots[primaryId].queued.map((item) => item.workOrderId)
    ).toEqual(['work:routing'])
    expect(Object.keys(result.writeResult?.workshopState.workOrders ?? {})).toEqual([
      'work:existing',
      'work:routing',
    ])
    expect(source).toEqual(before)
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.workloadProjections)).toBe(true)
  })

  it('replays independently of registry and persisted-map insertion order', () => {
    const casePacket = packet()
    const source = sourceFor(casePacket)
    const reversedSource = {
      departmentWorkshopWorkOrders: Object.fromEntries(
        Object.entries(source.departmentWorkshopWorkOrders as Record<string, unknown>).reverse()
      ),
      departmentWorkshopSnapshots: Object.fromEntries(
        Object.entries(source.departmentWorkshopSnapshots as Record<string, unknown>).reverse()
      ),
    }
    const reversedRegistry: DepartmentCapabilityRegistry = {
      departments: [...DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY.departments].reverse(),
      fallbackDepartmentRefs: [
        ...DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY.fallbackDepartmentRefs,
      ].reverse(),
    }

    const first = routeAndEnqueueDepartmentWorkshopWorkOrder(source, request(casePacket))
    const replay = routeAndEnqueueDepartmentWorkshopWorkOrder(
      reversedSource,
      request(casePacket),
      reversedRegistry
    )

    expect(replay).toEqual(first)
  })

  it('blocks zero capacity and missing assigned snapshots before enqueue', () => {
    const casePacket = packet()
    const primaryId = resolveDepartments(casePacket, DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY)
      .primaryDepartment!.departmentId
    const zeroCapacity = sourceFor(casePacket, {
      snapshots: { [primaryId]: snapshot(primaryId, 0) },
    })
    const missingSnapshot = sourceFor(casePacket)
    delete (missingSnapshot.departmentWorkshopSnapshots as Record<string, unknown>)[primaryId]

    const zeroResult = routeAndEnqueueDepartmentWorkshopWorkOrder(zeroCapacity, request(casePacket))
    const missingResult = routeAndEnqueueDepartmentWorkshopWorkOrder(
      missingSnapshot,
      request(casePacket)
    )

    expect(zeroResult).toMatchObject({ state: 'blocked', blockStage: 'coordination' })
    expect(zeroResult.coordination?.reasons[0].code).toBe('zero-department-capacity')
    expect(zeroResult.writeResult).toBeNull()
    expect(missingResult).toMatchObject({ state: 'blocked', blockStage: 'coordination' })
    expect(missingResult.coordination?.reasons[0].code).toBe('missing-workload-snapshot')
  })

  it('blocks fallback routing and malformed projected case occupancy', () => {
    const fallback = DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY.departments.find(
      (department) => department.id === 'department:general-intake'
    )!
    const fallbackRegistry: DepartmentCapabilityRegistry = {
      departments: [fallback],
      fallbackDepartmentRefs: [fallback.id],
    }
    const fallbackResult = routeAndEnqueueDepartmentWorkshopWorkOrder(
      {},
      request(packet()),
      fallbackRegistry
    )

    const casePacket = packet()
    const resolution = resolveDepartments(casePacket, DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY)
    const primaryId = resolution.primaryDepartment!.departmentId
    const duplicateCaseOrders: Record<string, DepartmentWorkshopWorkOrder> = {
      'work:first': {
        id: 'work:first',
        departmentId: primaryId,
        caseId: 'case:duplicate',
        taskType: resolution.requirements.primaryTaskType,
        requiredWork: 2,
      },
      'work:second': {
        id: 'work:second',
        departmentId: primaryId,
        caseId: 'case:duplicate',
        taskType: resolution.requirements.primaryTaskType,
        requiredWork: 2,
      },
    }
    const malformed = sourceFor(casePacket, {
      workOrders: duplicateCaseOrders,
      snapshots: {
        [primaryId]: snapshot(primaryId, 1, {
          active: [{ workOrderId: 'work:first', completedWork: 0 }],
          queued: [{ workOrderId: 'work:second', completedWork: 0 }],
        }),
      },
    })
    const malformedResult = routeAndEnqueueDepartmentWorkshopWorkOrder(
      malformed,
      request(casePacket)
    )

    expect(fallbackResult).toMatchObject({ state: 'blocked', blockStage: 'routing' })
    expect(fallbackResult.routingResolution.routeKind).toBe('fallback')
    expect(malformedResult).toMatchObject({
      state: 'blocked',
      blockStage: 'workload-projection',
    })
    expect(malformedResult.workloadProjections.at(-1)?.reasons[0].code).toBe(
      'duplicate-case-workload'
    )
  })

  it('delegates invalid and duplicate request writes to the canonical enqueue reasons', () => {
    const casePacket = packet()
    const resolution = resolveDepartments(casePacket, DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY)
    const primaryId = resolution.primaryDepartment!.departmentId
    const duplicate: DepartmentWorkshopWorkOrder = {
      id: 'work:routing',
      departmentId: primaryId,
      caseId: 'case:other',
      taskType: resolution.requirements.primaryTaskType,
      requiredWork: 2,
    }
    const duplicateSource = sourceFor(casePacket, {
      workOrders: { [duplicate.id]: duplicate },
      snapshots: {
        [primaryId]: snapshot(primaryId, 1, {
          queued: [{ workOrderId: duplicate.id, completedWork: 0 }],
        }),
      },
    })

    const invalid = routeAndEnqueueDepartmentWorkshopWorkOrder(sourceFor(casePacket), {
      ...request(casePacket),
      requiredWork: 0,
    })
    const invalidCase = routeAndEnqueueDepartmentWorkshopWorkOrder(
      sourceFor(casePacket),
      request({ ...casePacket, caseId: '' })
    )
    const duplicateResult = routeAndEnqueueDepartmentWorkshopWorkOrder(
      duplicateSource,
      request(casePacket)
    )

    expect(invalid).toMatchObject({ state: 'blocked', blockStage: 'enqueue' })
    expect(invalid.writeResult?.reasons[0].code).toBe('invalid-work-orders')
    expect(invalidCase).toMatchObject({ state: 'blocked', blockStage: 'routing' })
    expect(invalidCase.routingResolution.blockerCodes).toEqual(['invalid-case-packet'])
    expect(duplicateResult).toMatchObject({ state: 'blocked', blockStage: 'enqueue' })
    expect(duplicateResult.writeResult?.reasons[0].code).toBe('duplicate-work-order')
  })

  it('persists only successful routed writes through the store', () => {
    const casePacket = packet()
    const successfulGame = { ...createStartingState(), ...sourceFor(casePacket) }
    useGameStore.setState({ game: successfulGame })

    const success = useGameStore
      .getState()
      .routeAndEnqueueDepartmentWorkshopWorkOrder(request(casePacket))
    const stored = useGameStore.getState().game

    expect(success.state).toBe('enqueued')
    expect(stored.departmentWorkshopWorkOrders['work:routing']).toBeDefined()

    const beforeBlocked = stored
    const blocked = useGameStore.getState().routeAndEnqueueDepartmentWorkshopWorkOrder({
      ...request(casePacket),
      workOrderId: 'work:invalid',
      requiredWork: 0,
    })
    expect(blocked.state).toBe('blocked')
    expect(useGameStore.getState().game).toBe(beforeBlocked)
  })
})
