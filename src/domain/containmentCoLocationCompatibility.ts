/**
 * SPE-3177 — containment co-location compatibility and placement constraints.
 *
 * Pure caller-owned evaluator: authored compatibility rules decide whether a
 * proposed same-site placement is permitted against current occupants, using
 * SPE-2932 spatial topology queries. Does not mutate placements, persist
 * GameState, own cross-site transfer (SPE-1020), or resolve runtime anomaly
 * interactions (SPE-1033).
 */

import {
  lookupSpatialNode,
  queryDirectSpatialAdjacency,
  type FacilitySectionGraph,
} from './facilitySectionGraph'

export const CO_LOCATION_CONSTRAINT_KINDS = [
  'prohibit_same_node',
  'prohibit_same_zone',
  'prohibit_direct_adjacency',
  'minimum_graph_separation',
  'required_isolation',
] as const
export type CoLocationConstraintKind = (typeof CO_LOCATION_CONSTRAINT_KINDS)[number]

export const CO_LOCATION_DECISIONS = ['permitted', 'rejected', 'conditionally_permitted'] as const
export type CoLocationDecision = (typeof CO_LOCATION_DECISIONS)[number]

export const CO_LOCATION_REASONS = [
  'ok',
  'same_node_prohibited',
  'same_zone_prohibited',
  'direct_adjacency_prohibited',
  'insufficient_separation',
  'isolation_required',
  'malformed_spatial_ref',
  'malformed_classification',
  'malformed_constraint',
  'waiver_applied',
] as const
export type CoLocationReason = (typeof CO_LOCATION_REASONS)[number]

export interface CoLocationConstraint {
  readonly id: string
  readonly kind: CoLocationConstraintKind
  /** Subject / category class the constraint applies to. */
  readonly subjectClass: string
  /** Pairwise counterpart class. Required except for `required_isolation`. */
  readonly againstClass?: string
  /** Minimum undirected hop distance for `minimum_graph_separation`. */
  readonly minSeparation?: number
  /** When present in the request's active waivers, this constraint is skipped. */
  readonly waiverId?: string
}

export interface ContainedSubjectPlacement {
  readonly subjectId: string
  readonly subjectClass: string
  readonly nodeId: string
  /** Caller-owned zone reference for same-zone constraints. */
  readonly zoneRef?: string
}

export interface CoLocationPlacementCandidate {
  readonly subjectId: string
  readonly subjectClass: string
  readonly proposedNodeId: string
  readonly zoneRef?: string
}

export interface CoLocationPlacementRequest {
  readonly graph: FacilitySectionGraph | undefined
  readonly constraints: readonly CoLocationConstraint[]
  readonly occupants: readonly ContainedSubjectPlacement[]
  readonly candidate: CoLocationPlacementCandidate
  readonly activeWaiverIds?: readonly string[]
}

export interface CoLocationPlacementResult {
  readonly decision: CoLocationDecision
  readonly reasons: readonly CoLocationReason[]
  readonly violatedConstraintIds: readonly string[]
  readonly waivedConstraintIds: readonly string[]
}

const KIND_SET = new Set<string>(CO_LOCATION_CONSTRAINT_KINDS)

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function compareCodeUnit(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function sortUnique(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort(compareCodeUnit))
}

function sortUniqueReasons(values: readonly CoLocationReason[]): readonly CoLocationReason[] {
  return Object.freeze(
    [...new Set(values)].sort((left, right) => compareCodeUnit(left, right))
  ) as readonly CoLocationReason[]
}

function isConstraintKind(value: unknown): value is CoLocationConstraintKind {
  return typeof value === 'string' && KIND_SET.has(value)
}

function normalizeConstraint(value: unknown): CoLocationConstraint | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const record = value as Record<string, unknown>
  if (!isNonEmptyString(record.id) || !isConstraintKind(record.kind)) return undefined
  if (!isNonEmptyString(record.subjectClass)) return undefined

  if (record.kind === 'required_isolation') {
    if (record.againstClass !== undefined && !isNonEmptyString(record.againstClass)) {
      return undefined
    }
    if (record.minSeparation !== undefined) return undefined
  } else {
    if (!isNonEmptyString(record.againstClass)) return undefined
  }

  if (record.kind === 'minimum_graph_separation') {
    if (
      typeof record.minSeparation !== 'number' ||
      !Number.isInteger(record.minSeparation) ||
      record.minSeparation < 1
    ) {
      return undefined
    }
  } else if (record.minSeparation !== undefined) {
    return undefined
  }

  if (record.waiverId !== undefined && !isNonEmptyString(record.waiverId)) return undefined

  return Object.freeze({
    id: record.id,
    kind: record.kind,
    subjectClass: record.subjectClass,
    ...(isNonEmptyString(record.againstClass) ? { againstClass: record.againstClass } : {}),
    ...(typeof record.minSeparation === 'number' ? { minSeparation: record.minSeparation } : {}),
    ...(isNonEmptyString(record.waiverId) ? { waiverId: record.waiverId } : {}),
  })
}

function normalizeOccupant(value: unknown): ContainedSubjectPlacement | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const record = value as Record<string, unknown>
  if (
    !isNonEmptyString(record.subjectId) ||
    !isNonEmptyString(record.subjectClass) ||
    !isNonEmptyString(record.nodeId)
  ) {
    return undefined
  }
  if (record.zoneRef !== undefined && !isNonEmptyString(record.zoneRef)) return undefined
  return Object.freeze({
    subjectId: record.subjectId,
    subjectClass: record.subjectClass,
    nodeId: record.nodeId,
    ...(isNonEmptyString(record.zoneRef) ? { zoneRef: record.zoneRef } : {}),
  })
}

function normalizeCandidate(value: unknown): CoLocationPlacementCandidate | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const record = value as Record<string, unknown>
  if (
    !isNonEmptyString(record.subjectId) ||
    !isNonEmptyString(record.subjectClass) ||
    !isNonEmptyString(record.proposedNodeId)
  ) {
    return undefined
  }
  if (record.zoneRef !== undefined && !isNonEmptyString(record.zoneRef)) return undefined
  return Object.freeze({
    subjectId: record.subjectId,
    subjectClass: record.subjectClass,
    proposedNodeId: record.proposedNodeId,
    ...(isNonEmptyString(record.zoneRef) ? { zoneRef: record.zoneRef } : {}),
  })
}

/** Undirected hop distance on SPE-2932 spatial adjacency. Same node → 0. */
export function querySpatialGraphSeparation(
  graph: FacilitySectionGraph | undefined,
  leftNodeId: string,
  rightNodeId: string
): number | undefined {
  if (leftNodeId === rightNodeId) return 0
  if (!lookupSpatialNode(graph, leftNodeId) || !lookupSpatialNode(graph, rightNodeId)) {
    return undefined
  }
  if (!graph) return undefined

  const queue: Array<{ nodeId: string; distance: number }> = [{ nodeId: leftNodeId, distance: 0 }]
  const visited = new Set<string>([leftNodeId])

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) break
    for (const edge of graph.edges) {
      const neighbor =
        edge.fromNodeId === current.nodeId
          ? edge.toNodeId
          : edge.toNodeId === current.nodeId
            ? edge.fromNodeId
            : undefined
      if (!neighbor || visited.has(neighbor)) continue
      const nextDistance = current.distance + 1
      if (neighbor === rightNodeId) return nextDistance
      visited.add(neighbor)
      queue.push({ nodeId: neighbor, distance: nextDistance })
    }
  }
  return undefined
}

function constraintAppliesToPair(
  constraint: CoLocationConstraint,
  candidateClass: string,
  occupantClass: string
): boolean {
  if (constraint.kind === 'required_isolation') return false
  const against = constraint.againstClass
  if (!against) return false
  return (
    (constraint.subjectClass === candidateClass && against === occupantClass) ||
    (constraint.subjectClass === occupantClass && against === candidateClass)
  )
}

function evaluatePairConstraint(
  constraint: CoLocationConstraint,
  graph: FacilitySectionGraph | undefined,
  candidate: CoLocationPlacementCandidate,
  occupant: ContainedSubjectPlacement
): CoLocationReason | undefined {
  switch (constraint.kind) {
    case 'prohibit_same_node':
      return candidate.proposedNodeId === occupant.nodeId ? 'same_node_prohibited' : undefined
    case 'prohibit_same_zone': {
      if (!candidate.zoneRef || !occupant.zoneRef) return 'malformed_spatial_ref'
      return candidate.zoneRef === occupant.zoneRef ? 'same_zone_prohibited' : undefined
    }
    case 'prohibit_direct_adjacency': {
      if (
        !lookupSpatialNode(graph, candidate.proposedNodeId) ||
        !lookupSpatialNode(graph, occupant.nodeId)
      ) {
        return 'malformed_spatial_ref'
      }
      return queryDirectSpatialAdjacency(graph, candidate.proposedNodeId, occupant.nodeId)
        ? 'direct_adjacency_prohibited'
        : undefined
    }
    case 'minimum_graph_separation': {
      const separation = querySpatialGraphSeparation(
        graph,
        candidate.proposedNodeId,
        occupant.nodeId
      )
      if (separation === undefined) return 'malformed_spatial_ref'
      const min = constraint.minSeparation ?? 1
      return separation < min ? 'insufficient_separation' : undefined
    }
    case 'required_isolation':
      return undefined
  }
}

/**
 * Evaluate whether a proposed containment placement is compatible with
 * authored co-location constraints and current occupants.
 */
export function evaluateContainmentCoLocationPlacement(
  request: CoLocationPlacementRequest
): CoLocationPlacementResult {
  const candidate = normalizeCandidate(request.candidate)
  if (!candidate) {
    return Object.freeze({
      decision: 'rejected',
      reasons: Object.freeze(['malformed_classification'] as const),
      violatedConstraintIds: Object.freeze([] as const),
      waivedConstraintIds: Object.freeze([] as const),
    })
  }

  if (!lookupSpatialNode(request.graph, candidate.proposedNodeId)) {
    return Object.freeze({
      decision: 'rejected',
      reasons: Object.freeze(['malformed_spatial_ref'] as const),
      violatedConstraintIds: Object.freeze([] as const),
      waivedConstraintIds: Object.freeze([] as const),
    })
  }

  const activeWaivers = new Set(
    (request.activeWaiverIds ?? []).filter((id): id is string => isNonEmptyString(id))
  )

  const normalizedConstraints: CoLocationConstraint[] = []
  let hadMalformedConstraint = false
  for (const entry of request.constraints) {
    const constraint = normalizeConstraint(entry)
    if (!constraint) {
      hadMalformedConstraint = true
      continue
    }
    normalizedConstraints.push(constraint)
  }
  normalizedConstraints.sort((left, right) => compareCodeUnit(left.id, right.id))

  const occupants: ContainedSubjectPlacement[] = []
  let hadMalformedOccupant = false
  for (const entry of request.occupants) {
    const occupant = normalizeOccupant(entry)
    if (!occupant) {
      hadMalformedOccupant = true
      continue
    }
    if (occupant.subjectId === candidate.subjectId) continue
    occupants.push(occupant)
  }
  occupants.sort((left, right) => {
    const byId = compareCodeUnit(left.subjectId, right.subjectId)
    if (byId !== 0) return byId
    return compareCodeUnit(left.nodeId, right.nodeId)
  })

  const reasons: CoLocationReason[] = []
  const violated: string[] = []
  const waived: string[] = []

  if (hadMalformedConstraint) reasons.push('malformed_constraint')
  if (hadMalformedOccupant) reasons.push('malformed_classification')

  for (const constraint of normalizedConstraints) {
    const waiverActive =
      Boolean(constraint.waiverId) && activeWaivers.has(constraint.waiverId as string)

    if (
      constraint.kind === 'required_isolation' &&
      constraint.subjectClass === candidate.subjectClass
    ) {
      const conflict = occupants.some((occupant) => occupant.nodeId === candidate.proposedNodeId)
      if (!conflict) continue
      if (waiverActive) {
        waived.push(constraint.id)
        reasons.push('waiver_applied')
      } else {
        violated.push(constraint.id)
        reasons.push('isolation_required')
      }
      continue
    }

    let pairWouldReject = false
    const pairReasons: CoLocationReason[] = []
    for (const occupant of occupants) {
      if (!constraintAppliesToPair(constraint, candidate.subjectClass, occupant.subjectClass)) {
        continue
      }
      const reason = evaluatePairConstraint(constraint, request.graph, candidate, occupant)
      if (reason) {
        pairWouldReject = true
        pairReasons.push(reason)
      }
    }
    if (!pairWouldReject) continue

    if (waiverActive) {
      waived.push(constraint.id)
      reasons.push('waiver_applied')
      continue
    }

    violated.push(constraint.id)
    reasons.push(...pairReasons)
  }

  const uniqueViolated = sortUnique(violated)
  const uniqueWaived = sortUnique(waived)
  let uniqueReasons = sortUniqueReasons(reasons)

  if (uniqueViolated.length === 0 && uniqueReasons.length === 0) {
    uniqueReasons = Object.freeze(['ok'] as const)
  }

  const hasMalformed = uniqueReasons.some(
    (reason) =>
      reason === 'malformed_constraint' ||
      reason === 'malformed_classification' ||
      reason === 'malformed_spatial_ref'
  )

  let decision: CoLocationDecision
  if (uniqueViolated.length > 0 || hasMalformed) {
    decision = 'rejected'
  } else if (uniqueWaived.length > 0) {
    decision = 'conditionally_permitted'
  } else {
    decision = 'permitted'
  }

  return Object.freeze({
    decision,
    reasons: uniqueReasons,
    violatedConstraintIds: uniqueViolated,
    waivedConstraintIds: uniqueWaived,
  })
}
