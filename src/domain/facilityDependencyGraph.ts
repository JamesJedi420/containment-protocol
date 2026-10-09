/**
 * SPE-3383 — pure facility dependency-graph kernel.
 *
 * Caller-supplied functional nodes and directed `requires` edges resolve to
 * ready, degraded, or unavailable availability. This module does not persist
 * GameState, read facility lifecycle or installed effects, or mutate the
 * SPE-2932 spatial graph. Resolution walks each node and incoming edge once,
 * so a validated graph is linear in nodes plus edges. Graphs above the closed
 * bounds reject before that walk.
 */

export const FACILITY_DEPENDENCY_NODE_ROLES = ['core', 'service', 'capability'] as const
export type FacilityDependencyNodeRole = (typeof FACILITY_DEPENDENCY_NODE_ROLES)[number]

export const FUNCTIONAL_DEPENDENCY_EDGE_CLASS = 'functional_dependency' as const
export const FACILITY_DEPENDENCY_RELATION = 'requires' as const

export const FACILITY_DEPENDENCY_AVAILABILITIES = ['ready', 'degraded', 'unavailable'] as const
export type FacilityDependencyAvailability = (typeof FACILITY_DEPENDENCY_AVAILABILITIES)[number]

export const FACILITY_DEPENDENCY_MAX_NODES = 32
export const FACILITY_DEPENDENCY_MAX_EDGES = 64

export const FACILITY_DEPENDENCY_REJECTIONS = [
  'malformed',
  'graph_too_large',
  'duplicate_node',
  'invalid_core',
  'forbidden_edge_kind',
  'missing_endpoint',
  'cycle',
  'invalid_source',
  'unsupported_state',
] as const
export type FacilityDependencyRejection = (typeof FACILITY_DEPENDENCY_REJECTIONS)[number]

export const FACILITY_DEPENDENCY_REASONS = [
  'source_condition',
  'upstream_degraded',
  'upstream_unavailable',
] as const
export type FacilityDependencyReason = (typeof FACILITY_DEPENDENCY_REASONS)[number]

export interface FacilityDependencyNode {
  readonly id: string
  readonly role: FacilityDependencyNodeRole
}

export interface FacilityDependencyEdge {
  readonly edgeClass: typeof FUNCTIONAL_DEPENDENCY_EDGE_CLASS
  readonly relation: typeof FACILITY_DEPENDENCY_RELATION
  readonly fromNodeId: string
  readonly toNodeId: string
}

export interface FacilityDependencyGraph {
  readonly nodes: readonly FacilityDependencyNode[]
  readonly edges: readonly FacilityDependencyEdge[]
}

export interface FacilityDependencyAvailabilityResult {
  readonly nodeId: string
  readonly availability: FacilityDependencyAvailability
  readonly reason: FacilityDependencyReason
  readonly causeChain: readonly string[]
  readonly immediateUpstreamId?: string
  readonly rootUpstreamId?: string
}

export type FacilityDependencyGraphValidation =
  | { readonly ok: true; readonly graph: FacilityDependencyGraph }
  | { readonly ok: false; readonly rejection: FacilityDependencyRejection }

export type FacilityDependencyResolution =
  | { readonly ok: true; readonly results: readonly FacilityDependencyAvailabilityResult[] }
  | { readonly ok: false; readonly rejection: FacilityDependencyRejection }

const validatedGraphs = new WeakSet<object>()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key)
}

function compareCodeUnit(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function isNodeRole(value: unknown): value is FacilityDependencyNodeRole {
  return FACILITY_DEPENDENCY_NODE_ROLES.some((role) => role === value)
}

function isAvailability(value: unknown): value is FacilityDependencyAvailability {
  return FACILITY_DEPENDENCY_AVAILABILITIES.some((availability) => availability === value)
}

function reject(rejection: FacilityDependencyRejection): {
  readonly ok: false
  readonly rejection: FacilityDependencyRejection
} {
  return Object.freeze({ ok: false, rejection })
}

function availabilityRank(value: FacilityDependencyAvailability): number {
  switch (value) {
    case 'unavailable':
      return 0
    case 'degraded':
      return 1
    case 'ready':
      return 2
    default: {
      const exhaustive: never = value
      return exhaustive
    }
  }
}

function availabilityFromRank(rank: number): FacilityDependencyAvailability {
  switch (rank) {
    case 0:
      return 'unavailable'
    case 1:
      return 'degraded'
    case 2:
      return 'ready'
    default: {
      const exhaustive: never = rank as never
      return exhaustive
    }
  }
}

function upstreamReason(availability: 'degraded' | 'unavailable'): FacilityDependencyReason {
  switch (availability) {
    case 'unavailable':
      return 'upstream_unavailable'
    case 'degraded':
      return 'upstream_degraded'
    default: {
      const exhaustive: never = availability
      return exhaustive
    }
  }
}

function parseNode(value: unknown): FacilityDependencyNode | 'malformed' {
  if (!isRecord(value)) return 'malformed'
  if (!hasOwn(value, 'id') || !hasOwn(value, 'role')) return 'malformed'
  if (typeof value.id !== 'string' || value.id.length === 0) return 'malformed'
  if (!isNodeRole(value.role)) return 'malformed'
  return Object.freeze({ id: value.id, role: value.role })
}

function parseEdge(value: unknown): FacilityDependencyEdge | 'malformed' | 'forbidden_edge_kind' {
  if (!isRecord(value)) return 'malformed'
  if (
    !hasOwn(value, 'fromNodeId') ||
    !hasOwn(value, 'toNodeId') ||
    !hasOwn(value, 'edgeClass') ||
    !hasOwn(value, 'relation')
  ) {
    return 'malformed'
  }
  if (typeof value.fromNodeId !== 'string' || typeof value.toNodeId !== 'string') {
    return 'malformed'
  }
  if (value.fromNodeId.length === 0 || value.toNodeId.length === 0) return 'malformed'
  if (
    value.edgeClass !== FUNCTIONAL_DEPENDENCY_EDGE_CLASS ||
    value.relation !== FACILITY_DEPENDENCY_RELATION
  ) {
    return 'forbidden_edge_kind'
  }
  return Object.freeze({
    edgeClass: FUNCTIONAL_DEPENDENCY_EDGE_CLASS,
    relation: FACILITY_DEPENDENCY_RELATION,
    fromNodeId: value.fromNodeId,
    toNodeId: value.toNodeId,
  })
}

function hasDirectedCycle(
  nodeIds: readonly string[],
  edges: readonly FacilityDependencyEdge[]
): boolean {
  const incoming = new Map<string, number>()
  const outgoing = new Map<string, string[]>()
  for (const id of nodeIds) {
    incoming.set(id, 0)
    outgoing.set(id, [])
  }
  for (const edge of edges) {
    const next = outgoing.get(edge.fromNodeId)
    if (!next) return true
    next.push(edge.toNodeId)
    incoming.set(edge.toNodeId, (incoming.get(edge.toNodeId) ?? 0) + 1)
  }
  const ready = nodeIds.filter((id) => incoming.get(id) === 0).sort(compareCodeUnit)
  let processed = 0
  while (ready.length > 0) {
    const id = ready.shift()
    if (id === undefined) break
    processed += 1
    const dependents = [...(outgoing.get(id) ?? [])].sort(compareCodeUnit)
    for (const dependent of dependents) {
      const count = (incoming.get(dependent) ?? 0) - 1
      incoming.set(dependent, count)
      if (count === 0) {
        ready.push(dependent)
        ready.sort(compareCodeUnit)
      }
    }
  }
  return processed !== nodeIds.length
}

/**
 * Validate and normalize a caller-supplied functional dependency graph.
 * Equivalent graphs match after normalization regardless of insertion order.
 * Duplicate nodes, missing endpoints, forbidden edge kinds, a core count other
 * than one, and directed cycles reject the whole graph.
 */
export function validateFacilityDependencyGraph(value: unknown): FacilityDependencyGraphValidation {
  if (!isRecord(value)) return reject('malformed')
  if (!hasOwn(value, 'nodes') || !hasOwn(value, 'edges')) return reject('malformed')
  if (!Array.isArray(value.nodes) || !Array.isArray(value.edges)) return reject('malformed')
  if (
    value.nodes.length > FACILITY_DEPENDENCY_MAX_NODES ||
    value.edges.length > FACILITY_DEPENDENCY_MAX_EDGES
  ) {
    return reject('graph_too_large')
  }

  const nodesById = new Map<string, FacilityDependencyNode>()
  for (const entry of value.nodes) {
    const node = parseNode(entry)
    if (node === 'malformed') return reject('malformed')
    if (nodesById.has(node.id)) return reject('duplicate_node')
    nodesById.set(node.id, node)
  }

  const coreCount = [...nodesById.values()].filter((node) => node.role === 'core').length
  if (coreCount !== 1) return reject('invalid_core')

  const edgeKeys = new Set<string>()
  const edges: FacilityDependencyEdge[] = []
  for (const entry of value.edges) {
    const edge = parseEdge(entry)
    if (edge === 'malformed') return reject('malformed')
    if (edge === 'forbidden_edge_kind') return reject('forbidden_edge_kind')
    if (!nodesById.has(edge.fromNodeId) || !nodesById.has(edge.toNodeId)) {
      return reject('missing_endpoint')
    }
    const key = JSON.stringify([edge.fromNodeId, edge.toNodeId])
    if (edgeKeys.has(key)) continue
    edgeKeys.add(key)
    edges.push(edge)
  }

  if (hasDirectedCycle([...nodesById.keys()], edges)) return reject('cycle')

  const nodes = [...nodesById.values()].sort((left, right) => compareCodeUnit(left.id, right.id))
  edges.sort((left, right) => {
    const from = compareCodeUnit(left.fromNodeId, right.fromNodeId)
    if (from !== 0) return from
    return compareCodeUnit(left.toNodeId, right.toNodeId)
  })

  const graph: FacilityDependencyGraph = Object.freeze({
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
  })
  validatedGraphs.add(graph)
  return Object.freeze({ ok: true, graph })
}

export function normalizeFacilityDependencyGraph(
  value: unknown
): FacilityDependencyGraph | undefined {
  const validated = validateFacilityDependencyGraph(value)
  return validated.ok ? validated.graph : undefined
}

function isValidatedGraph(value: unknown): value is FacilityDependencyGraph {
  return isRecord(value) && validatedGraphs.has(value)
}

/**
 * Representative functional fixture. Immutable authored input, not GameState.
 * One hub feeds routing and logistics freshness. Alert timing depends on
 * routing. Archive integrity has no edge to the hub.
 */
export const REPRESENTATIVE_FACILITY_DEPENDENCY_TOPOLOGY = Object.freeze({
  nodes: Object.freeze([
    Object.freeze({ id: 'core:facility_hub', role: 'core' as const }),
    Object.freeze({ id: 'service:routing', role: 'service' as const }),
    Object.freeze({ id: 'capability:alert_timing', role: 'capability' as const }),
    Object.freeze({ id: 'capability:logistics_freshness', role: 'capability' as const }),
    Object.freeze({ id: 'service:archive_integrity', role: 'service' as const }),
  ]),
  edges: Object.freeze([
    Object.freeze({
      edgeClass: FUNCTIONAL_DEPENDENCY_EDGE_CLASS,
      relation: FACILITY_DEPENDENCY_RELATION,
      fromNodeId: 'core:facility_hub',
      toNodeId: 'service:routing',
    }),
    Object.freeze({
      edgeClass: FUNCTIONAL_DEPENDENCY_EDGE_CLASS,
      relation: FACILITY_DEPENDENCY_RELATION,
      fromNodeId: 'service:routing',
      toNodeId: 'capability:alert_timing',
    }),
    Object.freeze({
      edgeClass: FUNCTIONAL_DEPENDENCY_EDGE_CLASS,
      relation: FACILITY_DEPENDENCY_RELATION,
      fromNodeId: 'core:facility_hub',
      toNodeId: 'capability:logistics_freshness',
    }),
  ]),
})

export function readRepresentativeFacilityDependencyGraph(): FacilityDependencyGraph {
  const graph = normalizeFacilityDependencyGraph(REPRESENTATIVE_FACILITY_DEPENDENCY_TOPOLOGY)
  if (!graph) {
    throw new Error('SPE-3383 representative facility dependency graph failed validation')
  }
  return graph
}

function validateSources(
  graph: FacilityDependencyGraph,
  sources: unknown
): FacilityDependencyRejection | undefined {
  if (!isRecord(sources)) return 'invalid_source'
  const nodeIds = new Set(graph.nodes.map((node) => node.id))
  const sourceIds = Object.keys(sources).sort(compareCodeUnit)
  for (const sourceId of sourceIds) {
    if (!nodeIds.has(sourceId)) return 'invalid_source'
  }
  for (const node of graph.nodes) {
    if (!hasOwn(sources, node.id)) return 'invalid_source'
    if (!isAvailability(sources[node.id])) return 'unsupported_state'
  }
  return undefined
}

function incomingEdges(graph: FacilityDependencyGraph, nodeId: string): FacilityDependencyEdge[] {
  return graph.edges.filter((edge) => edge.toNodeId === nodeId)
}

function topologicalNodeIds(graph: FacilityDependencyGraph): readonly string[] {
  const incoming = new Map<string, number>()
  const outgoing = new Map<string, string[]>()
  for (const node of graph.nodes) {
    incoming.set(node.id, 0)
    outgoing.set(node.id, [])
  }
  for (const edge of graph.edges) {
    outgoing.get(edge.fromNodeId)?.push(edge.toNodeId)
    incoming.set(edge.toNodeId, (incoming.get(edge.toNodeId) ?? 0) + 1)
  }
  const ready = graph.nodes
    .map((node) => node.id)
    .filter((id) => incoming.get(id) === 0)
    .sort(compareCodeUnit)
  const order: string[] = []
  while (ready.length > 0) {
    const id = ready.shift()
    if (id === undefined) break
    order.push(id)
    const dependents = [...(outgoing.get(id) ?? [])].sort(compareCodeUnit)
    for (const dependent of dependents) {
      const count = (incoming.get(dependent) ?? 0) - 1
      incoming.set(dependent, count)
      if (count === 0) {
        ready.push(dependent)
        ready.sort(compareCodeUnit)
      }
    }
  }
  return order
}

/**
 * Resolve caller-supplied source conditions over a functional graph.
 * Worst availability wins. An upstream changes a node only when it is strictly
 * worse than that node's own source. Tied worse upstreams use the smallest id.
 * A rejected graph returns the same validation error and no node results.
 */
export function resolveFacilityDependencyAvailability(
  graph: unknown,
  sources: unknown
): FacilityDependencyResolution {
  const validated = isValidatedGraph(graph)
    ? { ok: true as const, graph }
    : validateFacilityDependencyGraph(graph)
  if (!validated.ok) return validated

  const sourceRejection = validateSources(validated.graph, sources)
  if (sourceRejection) return reject(sourceRejection)
  if (!isRecord(sources)) return reject('invalid_source')

  const byId = new Map<string, FacilityDependencyAvailabilityResult>()
  for (const nodeId of topologicalNodeIds(validated.graph)) {
    const own = sources[nodeId]
    if (!isAvailability(own)) return reject('unsupported_state')
    let worstRank = availabilityRank(own)
    let causeUpstream: FacilityDependencyAvailabilityResult | undefined
    const upstreams: FacilityDependencyAvailabilityResult[] = []
    for (const edge of incomingEdges(validated.graph, nodeId)) {
      const upstream = byId.get(edge.fromNodeId)
      if (!upstream) return reject('cycle')
      upstreams.push(upstream)
    }
    upstreams.sort((left, right) => compareCodeUnit(left.nodeId, right.nodeId))
    for (const upstream of upstreams) {
      const rank = availabilityRank(upstream.availability)
      if (rank < worstRank) {
        worstRank = rank
        causeUpstream = upstream
      }
    }
    const availability = availabilityFromRank(worstRank)
    if (
      causeUpstream &&
      (availability === 'degraded' || availability === 'unavailable') &&
      availabilityRank(availability) < availabilityRank(own)
    ) {
      byId.set(
        nodeId,
        Object.freeze({
          nodeId,
          availability,
          reason: upstreamReason(availability),
          causeChain: Object.freeze(
            [...causeUpstream.causeChain, causeUpstream.nodeId].sort(compareCodeUnit)
          ),
          immediateUpstreamId: causeUpstream.nodeId,
          rootUpstreamId: causeUpstream.rootUpstreamId ?? causeUpstream.nodeId,
        })
      )
      continue
    }
    byId.set(
      nodeId,
      Object.freeze({
        nodeId,
        availability: own,
        reason: 'source_condition',
        causeChain: Object.freeze([]),
      })
    )
  }

  const results = [...byId.values()].sort((left, right) =>
    compareCodeUnit(left.nodeId, right.nodeId)
  )
  return Object.freeze({ ok: true, results: Object.freeze(results) })
}
