import type { AuthorityGraph } from './authorityGraph'
import {
  DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY,
  resolveDepartments,
  type DepartmentCapabilityRegistry,
  type DepartmentCasePacket,
  type DepartmentResolutionResult,
} from './departmentCapabilities'
import {
  evaluateDepartmentCoordination,
  type DepartmentCoordinationResult,
} from './departmentCoordination'
import {
  enqueueDepartmentWorkshopWorkOrder,
  projectDepartmentWorkshopWorkload,
  readDepartmentWorkshopState,
  type DepartmentWorkshopStateSource,
  type DepartmentWorkshopWorkloadProjectionResult,
  type DepartmentWorkshopWriteResult,
} from './departmentWorkshopQueue'

export interface DepartmentWorkshopRoutingRequest {
  readonly workOrderId: string
  readonly casePacket: DepartmentCasePacket
  readonly requiredWork: number
}

export type DepartmentWorkshopRoutingBlockStage =
  'routing' | 'workload-projection' | 'coordination' | 'enqueue'

export interface DepartmentWorkshopRoutingResult {
  readonly state: 'enqueued' | 'blocked'
  readonly blockStage: DepartmentWorkshopRoutingBlockStage | null
  readonly routingResolution: DepartmentResolutionResult
  readonly workloadProjections: readonly DepartmentWorkshopWorkloadProjectionResult[]
  readonly coordination: DepartmentCoordinationResult | null
  readonly writeResult: DepartmentWorkshopWriteResult | null
}

function compareCodeUnits(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0
}

function frozenResult(
  state: DepartmentWorkshopRoutingResult['state'],
  blockStage: DepartmentWorkshopRoutingResult['blockStage'],
  routingResolution: DepartmentResolutionResult,
  workloadProjections: readonly DepartmentWorkshopWorkloadProjectionResult[],
  coordination: DepartmentCoordinationResult | null,
  writeResult: DepartmentWorkshopWriteResult | null
): DepartmentWorkshopRoutingResult {
  return Object.freeze({
    state,
    blockStage,
    routingResolution,
    workloadProjections: Object.freeze([...workloadProjections]),
    coordination,
    writeResult,
  })
}

/**
 * Resolve one case to its specialized departments, evaluate their canonical
 * workshop workload, and enqueue one primary-department work order.
 */
export function routeAndEnqueueDepartmentWorkshopWorkOrder(
  source: DepartmentWorkshopStateSource,
  request: DepartmentWorkshopRoutingRequest,
  registry: DepartmentCapabilityRegistry = DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY,
  authorityGraph?: AuthorityGraph
): DepartmentWorkshopRoutingResult {
  const casePacket = request?.casePacket ?? ({} as DepartmentCasePacket)
  const routingResolution = resolveDepartments(casePacket, registry, authorityGraph)
  if (routingResolution.routeKind !== 'matched' || !routingResolution.primaryDepartment) {
    return frozenResult('blocked', 'routing', routingResolution, [], null, null)
  }

  const workshopState = readDepartmentWorkshopState(source, registry, authorityGraph)
  const departmentIds = [
    routingResolution.primaryDepartment.departmentId,
    ...routingResolution.supportingDepartments.map((assignment) => assignment.departmentId),
  ].sort(compareCodeUnits)
  const workloadProjections: DepartmentWorkshopWorkloadProjectionResult[] = []

  for (const departmentId of departmentIds) {
    const snapshot = workshopState.snapshots[departmentId]
    if (!snapshot) continue

    const workOrders = Object.values(workshopState.workOrders).filter(
      (workOrder) => workOrder.departmentId === departmentId
    )
    const projection = projectDepartmentWorkshopWorkload(
      snapshot,
      workOrders,
      registry,
      authorityGraph
    )
    workloadProjections.push(projection)
    if (projection.state === 'blocked') {
      return frozenResult(
        'blocked',
        'workload-projection',
        routingResolution,
        workloadProjections,
        null,
        null
      )
    }
  }

  const coordination = evaluateDepartmentCoordination(
    routingResolution,
    workloadProjections.flatMap((projection) =>
      projection.workloadSnapshot ? [projection.workloadSnapshot] : []
    ),
    registry,
    authorityGraph
  )
  if (coordination.state === 'blocked') {
    return frozenResult(
      'blocked',
      'coordination',
      routingResolution,
      workloadProjections,
      coordination,
      null
    )
  }

  const writeResult = enqueueDepartmentWorkshopWorkOrder(
    source,
    {
      id: request?.workOrderId,
      departmentId: routingResolution.primaryDepartment.departmentId,
      caseId: routingResolution.caseId,
      taskType: routingResolution.requirements.primaryTaskType,
      requiredWork: request?.requiredWork,
    },
    registry,
    authorityGraph
  )
  if (writeResult.state === 'blocked') {
    return frozenResult(
      'blocked',
      'enqueue',
      routingResolution,
      workloadProjections,
      coordination,
      writeResult
    )
  }

  return frozenResult(
    'enqueued',
    null,
    routingResolution,
    workloadProjections,
    coordination,
    writeResult
  )
}
