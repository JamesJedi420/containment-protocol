/**
 * SPE-2084: pure cross-department coordination and workload evaluator.
 *
 * This module consumes SPE-2083 ownership results plus caller-provided queue
 * snapshots. It owns no durable queues, persistence, week-close mutation, team
 * ranking, or global SPE-95 coordination friction.
 */

import {
  DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY,
  validateDepartmentCapabilityRegistry,
} from './departmentCapabilities'
import type {
  DepartmentCapabilityRegistry,
  DepartmentDefinition,
  DepartmentDoctrineBias,
  DepartmentResolutionResult,
} from './departmentCapabilities'

export const DEPARTMENT_COORDINATION_STATES = ['aligned', 'delayed', 'disputed', 'blocked'] as const

export type DepartmentCoordinationState = (typeof DEPARTMENT_COORDINATION_STATES)[number]

/**
 * Read-only workload view supplied by a queue owner. `queuedCaseIds` preserves
 * queue order. `weeklyCapacity` is the number of cases the department can begin
 * per week; zero is a valid snapshot that blocks new coordination.
 */
export interface DepartmentWorkloadSnapshot {
  readonly departmentId: string
  readonly queuedCaseIds: readonly string[]
  readonly weeklyCapacity: number
}

export type DepartmentCoordinationReasonCode =
  | 'assignment-blocked'
  | 'invalid-department-assignment'
  | 'duplicate-department-assignment'
  | 'invalid-department-registry'
  | 'missing-department-definition'
  | 'missing-workload-snapshot'
  | 'duplicate-workload-snapshot'
  | 'invalid-workload-snapshot'
  | 'zero-department-capacity'
  | 'fallback-route'
  | 'queue-capacity-delay'
  | 'doctrine-conflict'
  | 'low-reputation-cooperation'
  | 'doctrine-aligned'

export interface DepartmentCoordinationReason {
  readonly code: DepartmentCoordinationReasonCode
  readonly departmentIds: readonly string[]
  readonly delayWeeks: number
}

export interface DepartmentCoordinationResult {
  readonly caseId: string
  readonly state: DepartmentCoordinationState
  readonly delayWeeks: number
  readonly departmentIds: readonly string[]
  readonly bottleneckDepartmentIds: readonly string[]
  readonly assignmentBlockerCodes: readonly string[]
  readonly reasons: readonly DepartmentCoordinationReason[]
}

export const DEPARTMENT_COORDINATION_CALIBRATION = Object.freeze({
  lowReputationThreshold: 50,
  doctrineConflictDelayWeeks: 1,
  fallbackDelayWeeks: 1,
  lowReputationDelayWeeks: 1,
})

export const DEPARTMENT_DOCTRINE_CONFLICT_PAIRS = Object.freeze([
  Object.freeze(['containment_first', 'evidence_first'] as const),
  Object.freeze(['containment_first', 'welfare_first'] as const),
  Object.freeze(['evidence_first', 'readiness_first'] as const),
  Object.freeze(['readiness_first', 'resource_conservative'] as const),
  Object.freeze(['readiness_first', 'welfare_first'] as const),
  Object.freeze(['resource_conservative', 'welfare_first'] as const),
])

function compareCodeUnits(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0
}

function uniqueCodeUnitSorted(values: readonly string[]) {
  return [...new Set(values)].sort(compareCodeUnits)
}

function frozenReason(
  code: DepartmentCoordinationReasonCode,
  departmentIds: readonly string[],
  delayWeeks = 0
): DepartmentCoordinationReason {
  return Object.freeze({
    code,
    departmentIds: Object.freeze(uniqueCodeUnitSorted(departmentIds)),
    delayWeeks,
  })
}

function frozenResult(
  caseId: string,
  state: DepartmentCoordinationState,
  delayWeeks: number,
  departmentIds: readonly string[],
  bottleneckDepartmentIds: readonly string[],
  assignmentBlockerCodes: readonly string[],
  reasons: readonly DepartmentCoordinationReason[]
): DepartmentCoordinationResult {
  return Object.freeze({
    caseId,
    state,
    delayWeeks,
    departmentIds: Object.freeze(uniqueCodeUnitSorted(departmentIds)),
    bottleneckDepartmentIds: Object.freeze(uniqueCodeUnitSorted(bottleneckDepartmentIds)),
    assignmentBlockerCodes: Object.freeze([...assignmentBlockerCodes].sort(compareCodeUnits)),
    reasons: Object.freeze([...reasons]),
  })
}

function blockedResult(
  assignment: DepartmentResolutionResult,
  code: DepartmentCoordinationReasonCode,
  departmentIds: readonly string[] = [],
  assignmentBlockerCodes: readonly string[] = assignment?.blockerCodes ?? [],
  reasonDepartmentIds: readonly string[] = departmentIds
) {
  return frozenResult(
    typeof assignment?.caseId === 'string' ? assignment.caseId : '',
    'blocked',
    0,
    departmentIds,
    [],
    assignmentBlockerCodes,
    [frozenReason(code, reasonDepartmentIds)]
  )
}

function assignedDepartmentIds(assignment: DepartmentResolutionResult): readonly string[] | null {
  if (
    !assignment ||
    typeof assignment !== 'object' ||
    typeof assignment.caseId !== 'string' ||
    assignment.caseId.length === 0 ||
    assignment.caseId !== assignment.caseId.trim()
  ) {
    return null
  }

  if (assignment.routeKind === 'matched') {
    if (
      assignment.misfitRoute !== null ||
      !Array.isArray(assignment.blockerCodes) ||
      assignment.blockerCodes.length > 0 ||
      !assignment.primaryDepartment ||
      typeof assignment.primaryDepartment.departmentId !== 'string' ||
      assignment.primaryDepartment.departmentId.trim().length === 0 ||
      assignment.primaryDepartment.departmentId !==
        assignment.primaryDepartment.departmentId.trim() ||
      !Array.isArray(assignment.supportingDepartments)
    ) {
      return null
    }

    const ids = [
      assignment.primaryDepartment.departmentId,
      ...assignment.supportingDepartments.map((entry) => entry?.departmentId),
    ]
    return ids.every((id) => typeof id === 'string' && id.trim().length > 0 && id === id.trim())
      ? (ids as string[])
      : null
  }

  if (assignment.routeKind === 'fallback') {
    if (
      !Array.isArray(assignment.blockerCodes) ||
      assignment.blockerCodes.length > 0 ||
      assignment.primaryDepartment !== null ||
      !Array.isArray(assignment.supportingDepartments) ||
      assignment.supportingDepartments.length > 0 ||
      !assignment.misfitRoute ||
      typeof assignment.misfitRoute.departmentId !== 'string' ||
      assignment.misfitRoute.departmentId.trim().length === 0 ||
      assignment.misfitRoute.departmentId !== assignment.misfitRoute.departmentId.trim() ||
      assignment.misfitRoute.reasonCode !== 'no-primary-capability-match' ||
      assignment.misfitRoute.lowPriority !== true ||
      assignment.misfitRoute.stigmaTag !== 'capability-misfit'
    ) {
      return null
    }

    return [assignment.misfitRoute.departmentId]
  }

  return null
}

function doctrinePairKey(left: DepartmentDoctrineBias, right: DepartmentDoctrineBias) {
  return [left, right].sort(compareCodeUnits).join('|')
}

const CONFLICTING_DOCTRINE_PAIRS = new Set<string>(
  DEPARTMENT_DOCTRINE_CONFLICT_PAIRS.map(([left, right]) => doctrinePairKey(left, right))
)

function conflictingDepartmentPairs(definitions: readonly DepartmentDefinition[]) {
  const pairs: string[][] = []

  for (let leftIndex = 0; leftIndex < definitions.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < definitions.length; rightIndex += 1) {
      const left = definitions[leftIndex]
      const right = definitions[rightIndex]
      if (CONFLICTING_DOCTRINE_PAIRS.has(doctrinePairKey(left.doctrineBias, right.doctrineBias))) {
        pairs.push([left.id, right.id])
      }
    }
  }

  return pairs
}

function isValidWorkloadSnapshot(
  snapshot: DepartmentWorkloadSnapshot,
  departmentId: string
): boolean {
  if (
    !snapshot ||
    typeof snapshot !== 'object' ||
    snapshot.departmentId !== departmentId ||
    !Array.isArray(snapshot.queuedCaseIds) ||
    !Number.isInteger(snapshot.weeklyCapacity) ||
    snapshot.weeklyCapacity < 0
  ) {
    return false
  }

  const queuedCaseIds = snapshot.queuedCaseIds
  return (
    queuedCaseIds.every(
      (caseId) => typeof caseId === 'string' && caseId.length > 0 && caseId === caseId.trim()
    ) && new Set(queuedCaseIds).size === queuedCaseIds.length
  )
}

/**
 * Evaluate one SPE-2083 department assignment against caller-owned workload
 * snapshots.
 *
 * Departments work in parallel, so queue delay is the maximum wait across
 * assigned departments rather than the sum. If the case is already present in
 * a snapshot, its current queue position is used; otherwise it is evaluated as
 * the next queue entry.
 */
export function evaluateDepartmentCoordination(
  assignment: DepartmentResolutionResult,
  workloadSnapshots: readonly DepartmentWorkloadSnapshot[],
  registry: DepartmentCapabilityRegistry = DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY
): DepartmentCoordinationResult {
  if (assignment?.routeKind === 'blocked') {
    return blockedResult(assignment, 'assignment-blocked')
  }

  const departmentIds = assignedDepartmentIds(assignment)
  if (!departmentIds) {
    return blockedResult(assignment, 'invalid-department-assignment')
  }

  const orderedDepartmentIds = [...departmentIds].sort(compareCodeUnits)
  if (new Set(orderedDepartmentIds).size !== orderedDepartmentIds.length) {
    return blockedResult(assignment, 'duplicate-department-assignment', orderedDepartmentIds)
  }

  if (
    !registry ||
    typeof registry !== 'object' ||
    !Array.isArray(registry.departments) ||
    !Array.isArray(registry.fallbackDepartmentRefs) ||
    !validateDepartmentCapabilityRegistry(registry).valid
  ) {
    return blockedResult(assignment, 'invalid-department-registry', orderedDepartmentIds)
  }

  const definitions = orderedDepartmentIds.map((departmentId) =>
    registry.departments.find((department) => department.id === departmentId)
  )
  if (definitions.some((definition) => !definition)) {
    return blockedResult(assignment, 'missing-department-definition', orderedDepartmentIds)
  }
  const assignedDefinitions = definitions as DepartmentDefinition[]

  if (!Array.isArray(workloadSnapshots)) {
    return blockedResult(assignment, 'invalid-workload-snapshot', orderedDepartmentIds)
  }

  const snapshotsByDepartment = new Map<string, DepartmentWorkloadSnapshot>()
  for (const departmentId of orderedDepartmentIds) {
    const matches = workloadSnapshots.filter(
      (snapshot) =>
        typeof snapshot?.departmentId === 'string' && snapshot.departmentId.trim() === departmentId
    )
    if (matches.length === 0) {
      return blockedResult(
        assignment,
        'missing-workload-snapshot',
        orderedDepartmentIds,
        [],
        [departmentId]
      )
    }
    if (matches.length > 1) {
      return blockedResult(
        assignment,
        'duplicate-workload-snapshot',
        orderedDepartmentIds,
        [],
        [departmentId]
      )
    }
    if (!isValidWorkloadSnapshot(matches[0], departmentId)) {
      return blockedResult(
        assignment,
        'invalid-workload-snapshot',
        orderedDepartmentIds,
        [],
        [departmentId]
      )
    }
    if (matches[0].weeklyCapacity === 0) {
      return blockedResult(
        assignment,
        'zero-department-capacity',
        orderedDepartmentIds,
        [],
        [departmentId]
      )
    }
    snapshotsByDepartment.set(departmentId, matches[0])
  }

  const reasons: DepartmentCoordinationReason[] = []
  const queueDelays = new Map<string, number>()
  for (const departmentId of orderedDepartmentIds) {
    const snapshot = snapshotsByDepartment.get(departmentId)
    if (!snapshot) {
      return blockedResult(
        assignment,
        'missing-workload-snapshot',
        orderedDepartmentIds,
        [],
        [departmentId]
      )
    }
    const currentPosition = snapshot.queuedCaseIds.indexOf(assignment.caseId)
    const queuePosition = currentPosition >= 0 ? currentPosition : snapshot.queuedCaseIds.length
    const delayWeeks = Math.floor(queuePosition / snapshot.weeklyCapacity)
    queueDelays.set(departmentId, delayWeeks)
    if (delayWeeks > 0) {
      reasons.push(frozenReason('queue-capacity-delay', [departmentId], delayWeeks))
    }
  }

  const maximumQueueDelay = Math.max(0, ...queueDelays.values())
  const bottleneckDepartmentIds =
    maximumQueueDelay > 0
      ? orderedDepartmentIds.filter(
          (departmentId) => queueDelays.get(departmentId) === maximumQueueDelay
        )
      : []

  let coordinationDelay = 0
  if (assignment.routeKind === 'fallback') {
    coordinationDelay += DEPARTMENT_COORDINATION_CALIBRATION.fallbackDelayWeeks
    reasons.push(
      frozenReason(
        'fallback-route',
        orderedDepartmentIds,
        DEPARTMENT_COORDINATION_CALIBRATION.fallbackDelayWeeks
      )
    )
  }

  const conflictPairs = conflictingDepartmentPairs(assignedDefinitions)
  if (conflictPairs.length > 0) {
    coordinationDelay += DEPARTMENT_COORDINATION_CALIBRATION.doctrineConflictDelayWeeks
    for (const pair of conflictPairs) {
      reasons.push(
        frozenReason(
          'doctrine-conflict',
          pair,
          DEPARTMENT_COORDINATION_CALIBRATION.doctrineConflictDelayWeeks
        )
      )
    }
  }

  const lowReputationDepartments =
    assignedDefinitions.length > 1
      ? assignedDefinitions
          .filter(
            (department) =>
              department.reputation < DEPARTMENT_COORDINATION_CALIBRATION.lowReputationThreshold
          )
          .map((department) => department.id)
          .sort(compareCodeUnits)
      : []
  if (lowReputationDepartments.length > 0) {
    coordinationDelay += DEPARTMENT_COORDINATION_CALIBRATION.lowReputationDelayWeeks
    reasons.push(
      frozenReason(
        'low-reputation-cooperation',
        lowReputationDepartments,
        DEPARTMENT_COORDINATION_CALIBRATION.lowReputationDelayWeeks
      )
    )
  }

  const delayWeeks = maximumQueueDelay + coordinationDelay
  const state: DepartmentCoordinationState =
    conflictPairs.length > 0 ? 'disputed' : delayWeeks > 0 ? 'delayed' : 'aligned'

  if (state === 'aligned') {
    reasons.push(frozenReason('doctrine-aligned', orderedDepartmentIds))
  }

  return frozenResult(
    assignment.caseId,
    state,
    delayWeeks,
    orderedDepartmentIds,
    bottleneckDepartmentIds,
    [],
    reasons
  )
}
