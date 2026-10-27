/**
 * SPE-3440 — construction-stage accessibility and worksite isolation.
 *
 * Pure prospective feasibility over caller-owned topology, ordered steps,
 * occupants, and temporary access. Does not mutate authored geometry, invent
 * SPE-1095 movement physics, complete SPE-110, or persist SPE-3021/3022 deltas.
 */

import type { FacilitySectionGraph } from './facilitySectionGraph'

export const CONSTRUCTION_STAGE_OUTCOMES = ['permitted', 'blocked', 'unsafe'] as const
export type ConstructionStageOutcome = (typeof CONSTRUCTION_STAGE_OUTCOMES)[number]

export const CONSTRUCTION_STAGE_REASONS = [
  'ok',
  'malformed_request',
  'unknown_node',
  'unknown_edge',
  'work_location_unreachable',
  'personnel_class_ineligible',
  'occupant_egress_lost',
  'required_permanent_route_missing',
  'duplicate_step_id',
] as const
export type ConstructionStageReason = (typeof CONSTRUCTION_STAGE_REASONS)[number]

export interface ConstructionAdjacencyEdge {
  readonly fromNodeId: string
  readonly toNodeId: string
}

export interface ConstructionStageStep {
  readonly stepId: string
  readonly workLocationNodeId: string
  /** Edges removed after this step completes (hypothetical post-step geometry). */
  readonly removesEdges?: readonly ConstructionAdjacencyEdge[]
  /** Nodes removed after this step completes (also drops incident edges). */
  readonly removesNodeIds?: readonly string[]
}

export interface ConstructionOccupant {
  readonly occupantId: string
  readonly nodeId: string
  readonly egressTargetNodeId: string
}

export interface ConstructionTemporaryAccess {
  readonly accessId: string
  /** Temporary edges available while this provision is active. */
  readonly addsEdges: readonly ConstructionAdjacencyEdge[]
  /**
   * Inclusive last step index (0-based) while active.
   * After that index, temporary edges are removed for subsequent evaluation
   * and for the permanent-route check.
   */
  readonly activeThroughStepIndex: number
}

export interface ConstructionStageAccessibilityRequest {
  readonly nodeIds: readonly string[]
  readonly baseEdges: readonly ConstructionAdjacencyEdge[]
  /** Nodes from which work access is judged (staging / site entry). */
  readonly accessRootNodeIds: readonly string[]
  readonly steps: readonly ConstructionStageStep[]
  readonly occupants?: readonly ConstructionOccupant[]
  readonly temporaryAccess?: readonly ConstructionTemporaryAccess[]
  /** When set, work locations must be listed here for the step personnel class. */
  readonly personnelAllowedNodeIds?: readonly string[]
  /**
   * Permanent routes that must remain after all temporary access is removed.
   * Each route is a required undirected adjacency that finished layout needs.
   */
  readonly requiredPermanentEdges?: readonly ConstructionAdjacencyEdge[]
}

export interface ConstructionStageStepResult {
  readonly stepId: string
  readonly stepIndex: number
  readonly outcome: ConstructionStageOutcome
  readonly reasons: readonly ConstructionStageReason[]
  readonly affectedRoute?: ConstructionAdjacencyEdge
  readonly affectedOccupantId?: string
}

export interface ConstructionStageAccessibilityResult {
  readonly outcome: ConstructionStageOutcome
  readonly steps: readonly ConstructionStageStepResult[]
  readonly reasons: readonly ConstructionStageReason[]
  readonly authoredTopologyUnchanged: true
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function parseEdge(
  value: ConstructionAdjacencyEdge | null | undefined
): ConstructionAdjacencyEdge | undefined {
  if (!value) return undefined
  if (!isNonEmptyString(value.fromNodeId) || !isNonEmptyString(value.toNodeId)) return undefined
  if (value.fromNodeId === value.toNodeId) return undefined
  return { fromNodeId: value.fromNodeId, toNodeId: value.toNodeId }
}

function buildAdjacency(
  nodeIds: ReadonlySet<string>,
  edges: readonly ConstructionAdjacencyEdge[]
): Map<string, Set<string>> {
  const adjacency = new Map<string, Set<string>>()
  for (const nodeId of nodeIds) {
    adjacency.set(nodeId, new Set())
  }
  for (const raw of edges) {
    const edge = parseEdge(raw)
    if (!edge) continue
    if (!nodeIds.has(edge.fromNodeId) || !nodeIds.has(edge.toNodeId)) continue
    adjacency.get(edge.fromNodeId)!.add(edge.toNodeId)
    adjacency.get(edge.toNodeId)!.add(edge.fromNodeId)
  }
  return adjacency
}

function cloneAdjacency(source: Map<string, Set<string>>): Map<string, Set<string>> {
  const next = new Map<string, Set<string>>()
  for (const [nodeId, neighbors] of source) {
    next.set(nodeId, new Set(neighbors))
  }
  return next
}

function addEdge(adjacency: Map<string, Set<string>>, edge: ConstructionAdjacencyEdge): void {
  if (!adjacency.has(edge.fromNodeId) || !adjacency.has(edge.toNodeId)) return
  adjacency.get(edge.fromNodeId)!.add(edge.toNodeId)
  adjacency.get(edge.toNodeId)!.add(edge.fromNodeId)
}

function removeEdge(adjacency: Map<string, Set<string>>, edge: ConstructionAdjacencyEdge): void {
  adjacency.get(edge.fromNodeId)?.delete(edge.toNodeId)
  adjacency.get(edge.toNodeId)?.delete(edge.fromNodeId)
}

function removeNode(adjacency: Map<string, Set<string>>, nodeId: string): void {
  const neighbors = adjacency.get(nodeId)
  if (!neighbors) return
  for (const neighbor of neighbors) {
    adjacency.get(neighbor)?.delete(nodeId)
  }
  adjacency.delete(nodeId)
}

function isReachable(
  adjacency: Map<string, Set<string>>,
  fromNodeIds: readonly string[],
  toNodeId: string
): boolean {
  if (!adjacency.has(toNodeId)) return false
  const queue: string[] = []
  const seen = new Set<string>()
  for (const root of fromNodeIds) {
    if (!adjacency.has(root) || seen.has(root)) continue
    seen.add(root)
    queue.push(root)
  }
  while (queue.length > 0) {
    const current = queue.shift()!
    if (current === toNodeId) return true
    const neighbors = adjacency.get(current)
    if (!neighbors) continue
    for (const neighbor of neighbors) {
      if (seen.has(neighbor)) continue
      seen.add(neighbor)
      queue.push(neighbor)
    }
  }
  return false
}

function worstOutcome(
  left: ConstructionStageOutcome,
  right: ConstructionStageOutcome
): ConstructionStageOutcome {
  if (left === 'unsafe' || right === 'unsafe') return 'unsafe'
  if (left === 'blocked' || right === 'blocked') return 'blocked'
  return 'permitted'
}

function malformedResult(reason: ConstructionStageReason): ConstructionStageAccessibilityResult {
  return {
    outcome: 'blocked',
    steps: [],
    reasons: [reason],
    authoredTopologyUnchanged: true,
  }
}

function activeTemporaryEdges(
  temporaryAccess: readonly ConstructionTemporaryAccess[],
  stepIndex: number
): ConstructionAdjacencyEdge[] {
  const edges: ConstructionAdjacencyEdge[] = []
  for (const provision of temporaryAccess) {
    if (!isNonEmptyString(provision.accessId)) continue
    if (!Number.isInteger(provision.activeThroughStepIndex)) continue
    if (stepIndex > provision.activeThroughStepIndex) continue
    for (const raw of provision.addsEdges) {
      const edge = parseEdge(raw)
      if (edge) edges.push(edge)
    }
  }
  return edges
}

/**
 * Project an SPE-2932 facility section graph into caller-owned topology inputs.
 * Does not claim SPE-1095 traversability — adjacency is structural reachability only.
 */
export function projectFacilitySectionGraphToConstructionTopology(
  graph: FacilitySectionGraph
): Pick<
  ConstructionStageAccessibilityRequest,
  'nodeIds' | 'baseEdges' | 'accessRootNodeIds'
> | undefined {
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) return undefined
  if (graph.nodes.length === 0) return undefined
  const nodeIds: string[] = []
  const seen = new Set<string>()
  for (const node of graph.nodes) {
    if (!node || !isNonEmptyString(node.id) || seen.has(node.id)) return undefined
    seen.add(node.id)
    nodeIds.push(node.id)
  }
  const baseEdges: ConstructionAdjacencyEdge[] = []
  for (const edge of graph.edges) {
    if (!edge || !isNonEmptyString(edge.fromNodeId) || !isNonEmptyString(edge.toNodeId)) {
      return undefined
    }
    if (!seen.has(edge.fromNodeId) || !seen.has(edge.toNodeId)) return undefined
    baseEdges.push({ fromNodeId: edge.fromNodeId, toNodeId: edge.toNodeId })
  }
  const accessRootNodeIds: string[] = []
  for (const placement of graph.placements ?? []) {
    if (
      placement?.placementKind === 'staging_location' &&
      isNonEmptyString(placement.nodeId) &&
      seen.has(placement.nodeId) &&
      !accessRootNodeIds.includes(placement.nodeId)
    ) {
      accessRootNodeIds.push(placement.nodeId)
    }
  }
  if (accessRootNodeIds.length === 0) {
    accessRootNodeIds.push(nodeIds[0]!)
  }
  return {
    nodeIds: Object.freeze(nodeIds),
    baseEdges: Object.freeze(baseEdges),
    accessRootNodeIds: Object.freeze(accessRootNodeIds),
  }
}

/**
 * Evaluate a construction step sequence against caller-owned topology.
 * Returns the first failing step's severity as overall outcome when any step fails;
 * otherwise `permitted`. Authored input topology is never mutated.
 */
export function evaluateConstructionStageAccessibility(
  request: ConstructionStageAccessibilityRequest
): ConstructionStageAccessibilityResult {
  if (!request || typeof request !== 'object') {
    return malformedResult('malformed_request')
  }
  if (!Array.isArray(request.nodeIds) || request.nodeIds.length === 0) {
    return malformedResult('malformed_request')
  }
  if (!Array.isArray(request.baseEdges) || !Array.isArray(request.accessRootNodeIds)) {
    return malformedResult('malformed_request')
  }
  if (!Array.isArray(request.steps)) {
    return malformedResult('malformed_request')
  }

  const nodeIds = new Set<string>()
  for (const nodeId of request.nodeIds) {
    if (!isNonEmptyString(nodeId)) return malformedResult('malformed_request')
    if (nodeIds.has(nodeId)) return malformedResult('malformed_request')
    nodeIds.add(nodeId)
  }

  for (const root of request.accessRootNodeIds) {
    if (!isNonEmptyString(root)) return malformedResult('malformed_request')
    if (!nodeIds.has(root)) return malformedResult('unknown_node')
  }

  for (const raw of request.baseEdges) {
    const edge = parseEdge(raw)
    if (!edge) return malformedResult('malformed_request')
    if (!nodeIds.has(edge.fromNodeId) || !nodeIds.has(edge.toNodeId)) {
      return malformedResult('unknown_edge')
    }
  }

  const seenStepIds = new Set<string>()
  for (const step of request.steps) {
    if (!step || !isNonEmptyString(step.stepId) || !isNonEmptyString(step.workLocationNodeId)) {
      return malformedResult('malformed_request')
    }
    if (seenStepIds.has(step.stepId)) return malformedResult('duplicate_step_id')
    seenStepIds.add(step.stepId)
    if (!nodeIds.has(step.workLocationNodeId)) return malformedResult('unknown_node')
  }

  const occupants = request.occupants ?? []
  for (const occupant of occupants) {
    if (
      !occupant ||
      !isNonEmptyString(occupant.occupantId) ||
      !isNonEmptyString(occupant.nodeId) ||
      !isNonEmptyString(occupant.egressTargetNodeId)
    ) {
      return malformedResult('malformed_request')
    }
    if (!nodeIds.has(occupant.nodeId) || !nodeIds.has(occupant.egressTargetNodeId)) {
      return malformedResult('unknown_node')
    }
  }

  const temporaryAccess = request.temporaryAccess ?? []
  for (const provision of temporaryAccess) {
    if (!provision || !isNonEmptyString(provision.accessId)) {
      return malformedResult('malformed_request')
    }
    if (!Array.isArray(provision.addsEdges)) return malformedResult('malformed_request')
    for (const raw of provision.addsEdges) {
      const edge = parseEdge(raw)
      if (!edge) return malformedResult('malformed_request')
      if (!nodeIds.has(edge.fromNodeId) || !nodeIds.has(edge.toNodeId)) {
        return malformedResult('unknown_edge')
      }
    }
  }

  const personnelAllowed =
    request.personnelAllowedNodeIds === undefined
      ? null
      : new Set(request.personnelAllowedNodeIds.filter(isNonEmptyString))

  const requiredPermanent = request.requiredPermanentEdges ?? []
  for (const raw of requiredPermanent) {
    const edge = parseEdge(raw)
    if (!edge) return malformedResult('malformed_request')
    if (!nodeIds.has(edge.fromNodeId) || !nodeIds.has(edge.toNodeId)) {
      return malformedResult('unknown_edge')
    }
  }

  const working = buildAdjacency(nodeIds, request.baseEdges)
  const stepResults: ConstructionStageStepResult[] = []
  let overall: ConstructionStageOutcome = 'permitted'
  const overallReasons: ConstructionStageReason[] = []

  for (let stepIndex = 0; stepIndex < request.steps.length; stepIndex += 1) {
    const step = request.steps[stepIndex]!
    const view = cloneAdjacency(working)
    for (const edge of activeTemporaryEdges(temporaryAccess, stepIndex)) {
      addEdge(view, edge)
    }

    const reasons: ConstructionStageReason[] = []
    let outcome: ConstructionStageOutcome = 'permitted'
    let affectedRoute: ConstructionAdjacencyEdge | undefined
    let affectedOccupantId: string | undefined

    if (personnelAllowed && !personnelAllowed.has(step.workLocationNodeId)) {
      outcome = 'blocked'
      reasons.push('personnel_class_ineligible')
    }

    if (!isReachable(view, request.accessRootNodeIds, step.workLocationNodeId)) {
      outcome = worstOutcome(outcome, 'blocked')
      reasons.push('work_location_unreachable')
      affectedRoute = {
        fromNodeId: request.accessRootNodeIds[0] ?? step.workLocationNodeId,
        toNodeId: step.workLocationNodeId,
      }
    }

    // Preview post-step geometry for occupant isolation (after this step's removals).
    const postStep = cloneAdjacency(view)
    for (const raw of step.removesEdges ?? []) {
      const edge = parseEdge(raw)
      if (edge) removeEdge(postStep, edge)
    }
    for (const removeNodeId of step.removesNodeIds ?? []) {
      if (isNonEmptyString(removeNodeId)) removeNode(postStep, removeNodeId)
    }

    for (const occupant of occupants) {
      if (!postStep.has(occupant.nodeId)) {
        outcome = 'unsafe'
        reasons.push('occupant_egress_lost')
        affectedOccupantId = occupant.occupantId
        affectedRoute = {
          fromNodeId: occupant.nodeId,
          toNodeId: occupant.egressTargetNodeId,
        }
        break
      }
      if (!isReachable(postStep, [occupant.nodeId], occupant.egressTargetNodeId)) {
        outcome = 'unsafe'
        reasons.push('occupant_egress_lost')
        affectedOccupantId = occupant.occupantId
        affectedRoute = {
          fromNodeId: occupant.nodeId,
          toNodeId: occupant.egressTargetNodeId,
        }
        break
      }
    }

    if (reasons.length === 0) reasons.push('ok')

    stepResults.push({
      stepId: step.stepId,
      stepIndex,
      outcome,
      reasons: Object.freeze([...reasons]),
      ...(affectedRoute ? { affectedRoute } : {}),
      ...(affectedOccupantId ? { affectedOccupantId } : {}),
    })

    overall = worstOutcome(overall, outcome)
    for (const reason of reasons) {
      if (reason !== 'ok' && !overallReasons.includes(reason)) overallReasons.push(reason)
    }

    // Commit this step's permanent removals for subsequent steps (authored base unchanged).
    for (const raw of step.removesEdges ?? []) {
      const edge = parseEdge(raw)
      if (edge) removeEdge(working, edge)
    }
    for (const removeNodeId of step.removesNodeIds ?? []) {
      if (isNonEmptyString(removeNodeId)) removeNode(working, removeNodeId)
    }
  }

  // After the sequence, temporary access is gone — permanent required routes must remain.
  if (requiredPermanent.length > 0) {
    const finished = cloneAdjacency(working)
    for (const raw of requiredPermanent) {
      const edge = parseEdge(raw)!
      if (!isReachable(finished, [edge.fromNodeId], edge.toNodeId)) {
        overall = worstOutcome(overall, 'blocked')
        if (!overallReasons.includes('required_permanent_route_missing')) {
          overallReasons.push('required_permanent_route_missing')
        }
        stepResults.push({
          stepId: '__permanent_route_check__',
          stepIndex: request.steps.length,
          outcome: 'blocked',
          reasons: Object.freeze(['required_permanent_route_missing']),
          affectedRoute: edge,
        })
        break
      }
    }
  }

  if (overall === 'permitted' && overallReasons.length === 0) {
    overallReasons.push('ok')
  }

  return {
    outcome: overall,
    steps: Object.freeze(stepResults),
    reasons: Object.freeze(overallReasons),
    authoredTopologyUnchanged: true,
  }
}
