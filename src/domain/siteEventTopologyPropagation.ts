/**
 * SPE-2994 — one bounded site event over the SPE-2932 facility section graph.
 *
 * Traversal reads `readProductionFacilitySectionGraph` or a payload checked by
 * `validateFacilitySectionTopology`. Steps use `lookupSpatialNode` and
 * `queryDirectSpatialAdjacency`. This module does not author topology, persist
 * affected sections, or read a caller adjacency list.
 */

import {
  queryDirectSpatialAdjacency,
  readProductionFacilitySectionGraph,
  SPATIAL_ADJACENCY_EDGE_CLASS,
  validateFacilitySectionTopology,
  lookupSpatialNode,
  type FacilitySectionGraph,
  type FacilitySectionGraphRejection,
  type FacilitySpatialAdjacencyEdge,
} from './facilitySectionGraph'

export const SITE_EVENT_TOPOLOGY_FAILURES = [
  'malformed_event',
  'missing_topology',
  'malformed_topology',
  'duplicate_node',
  'dangling_edge',
  'unknown_placement',
  'malformed_edge_state',
  'missing_origin',
  'unknown_origin',
  'invalid_bound',
] as const
export type SiteEventTopologyFailure = (typeof SITE_EVENT_TOPOLOGY_FAILURES)[number]

export const SITE_EVENT_EDGE_ACCESS = ['open', 'inaccessible', 'removed'] as const
export type SiteEventEdgeAccess = (typeof SITE_EVENT_EDGE_ACCESS)[number]

export const SITE_EVENT_BLOCKED_EDGE_REASONS = ['inaccessible_edge', 'removed_edge'] as const
export type SiteEventBlockedEdgeReason = (typeof SITE_EVENT_BLOCKED_EDGE_REASONS)[number]

export interface BoundedSiteEvent {
  readonly eventId: string
  /** Stable SPE-2932 node id (`section:…`, `zone:…`, or `room:…`). */
  readonly originNodeId: string
  /** Maximum spatial hops from the origin. Zero stays on the origin. */
  readonly maxHops: number
  /**
   * Caller-owned affected ids. Propagation never writes this list.
   * Success returns a new affected sequence.
   */
  readonly affectedNodeIds?: readonly string[]
}

export type FacilityTopologyReference =
  { readonly source: 'production' } | { readonly source: 'authored'; readonly topology: unknown }

export interface TraversedFacilityEdge {
  readonly edgeClass: typeof SPATIAL_ADJACENCY_EDGE_CLASS
  readonly fromNodeId: string
  readonly toNodeId: string
}

export interface BlockedFacilityEdge {
  readonly edgeClass: typeof SPATIAL_ADJACENCY_EDGE_CLASS
  readonly fromNodeId: string
  readonly toNodeId: string
  readonly reason: SiteEventBlockedEdgeReason
}

export type SiteEventTopologyPropagationResult =
  | {
      readonly ok: true
      readonly eventId: string
      readonly originNodeId: string
      readonly traversedEdges: readonly TraversedFacilityEdge[]
      readonly affectedNodeIds: readonly string[]
      readonly blockedEdges: readonly BlockedFacilityEdge[]
      readonly failureReason: null
    }
  | {
      readonly ok: false
      readonly eventId: string | null
      readonly originNodeId: string | null
      readonly traversedEdges: readonly []
      readonly affectedNodeIds: readonly []
      readonly blockedEdges: readonly []
      readonly failureReason: SiteEventTopologyFailure
    }

const EMPTY_EDGES: readonly [] = Object.freeze([])
const EMPTY_NODES: readonly [] = Object.freeze([])
const EMPTY_BLOCKED: readonly [] = Object.freeze([])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function failure(
  reason: SiteEventTopologyFailure,
  eventId: string | null,
  originNodeId: string | null
): SiteEventTopologyPropagationResult {
  return Object.freeze({
    ok: false,
    eventId,
    originNodeId,
    traversedEdges: EMPTY_EDGES,
    affectedNodeIds: EMPTY_NODES,
    blockedEdges: EMPTY_BLOCKED,
    failureReason: reason,
  })
}

function rejectionFailure(
  rejection: FacilitySectionGraphRejection,
  eventId: string,
  originNodeId: string
): SiteEventTopologyPropagationResult {
  if (rejection === 'malformed') return failure('malformed_topology', eventId, originNodeId)
  return failure(rejection, eventId, originNodeId)
}

function canonicalEdgeKey(left: string, right: string): string {
  return left < right ? `${left}|${right}` : `${right}|${left}`
}

function isEdgeAccess(value: unknown): value is SiteEventEdgeAccess {
  return SITE_EVENT_EDGE_ACCESS.some((access) => access === value)
}

function readEdgeAccess(
  topology: unknown
): ReadonlyMap<string, SiteEventEdgeAccess> | 'malformed_edge_state' {
  if (!isRecord(topology) || !Array.isArray(topology.edges)) return new Map()
  const accessByEdge = new Map<string, SiteEventEdgeAccess>()
  for (const entry of topology.edges) {
    if (!isRecord(entry)) return 'malformed_edge_state'
    if (typeof entry.fromNodeId !== 'string' || typeof entry.toNodeId !== 'string') {
      return 'malformed_edge_state'
    }
    const hasAccess = Object.prototype.hasOwnProperty.call(entry, 'access')
    let access: SiteEventEdgeAccess = 'open'
    if (hasAccess) {
      if (!isEdgeAccess(entry.access)) return 'malformed_edge_state'
      access = entry.access
    }
    const key = canonicalEdgeKey(entry.fromNodeId, entry.toNodeId)
    const prior = accessByEdge.get(key)
    if (prior !== undefined && prior !== access) return 'malformed_edge_state'
    accessByEdge.set(key, access)
  }
  return accessByEdge
}

function blockedReason(access: SiteEventEdgeAccess): SiteEventBlockedEdgeReason | null {
  switch (access) {
    case 'open':
      return null
    case 'inaccessible':
      return 'inaccessible_edge'
    case 'removed':
      return 'removed_edge'
    default: {
      const unreachable: never = access
      return unreachable
    }
  }
}

interface ResolvedTopology {
  readonly graph: FacilitySectionGraph
  readonly accessByEdge: ReadonlyMap<string, SiteEventEdgeAccess>
}

function resolveTopology(
  reference: FacilityTopologyReference,
  eventId: string,
  originNodeId: string
): ResolvedTopology | SiteEventTopologyPropagationResult {
  if (reference.source === 'production') {
    return {
      graph: readProductionFacilitySectionGraph(),
      accessByEdge: new Map(),
    }
  }
  if (reference.topology === undefined || reference.topology === null) {
    return failure('missing_topology', eventId, originNodeId)
  }
  const validated = validateFacilitySectionTopology(reference.topology)
  if (!validated.ok) return rejectionFailure(validated.rejection, eventId, originNodeId)
  const accessByEdge = readEdgeAccess(reference.topology)
  if (accessByEdge === 'malformed_edge_state') {
    return failure('malformed_edge_state', eventId, originNodeId)
  }
  return { graph: validated.graph, accessByEdge }
}

function otherEndpoint(edge: FacilitySpatialAdjacencyEdge, nodeId: string): string | undefined {
  if (edge.fromNodeId === nodeId) return edge.toNodeId
  if (edge.toNodeId === nodeId) return edge.fromNodeId
  return undefined
}

function propagateOnGraph(
  eventId: string,
  originNodeId: string,
  maxHops: number,
  resolved: ResolvedTopology
): SiteEventTopologyPropagationResult {
  const origin = lookupSpatialNode(resolved.graph, originNodeId)
  if (!origin) return failure('unknown_origin', eventId, originNodeId)

  const affected: string[] = [origin.id]
  const traversed: TraversedFacilityEdge[] = []
  const blocked: BlockedFacilityEdge[] = []
  const blockedKeys = new Set<string>()
  const seen = new Set<string>([origin.id])
  const queue: { readonly nodeId: string; readonly hops: number }[] = [
    { nodeId: origin.id, hops: 0 },
  ]

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index]
    if (!current || current.hops >= maxHops) continue
    for (const edge of resolved.graph.edges) {
      const nextNodeId = otherEndpoint(edge, current.nodeId)
      if (!nextNodeId) continue
      if (!queryDirectSpatialAdjacency(resolved.graph, current.nodeId, nextNodeId)) continue
      if (!lookupSpatialNode(resolved.graph, nextNodeId)) continue
      const key = canonicalEdgeKey(edge.fromNodeId, edge.toNodeId)
      const access = resolved.accessByEdge.get(key) ?? 'open'
      const reason = blockedReason(access)
      if (reason) {
        if (!blockedKeys.has(key)) {
          blockedKeys.add(key)
          blocked.push(
            Object.freeze({
              edgeClass: SPATIAL_ADJACENCY_EDGE_CLASS,
              fromNodeId: edge.fromNodeId,
              toNodeId: edge.toNodeId,
              reason,
            })
          )
        }
        continue
      }
      if (seen.has(nextNodeId)) continue
      seen.add(nextNodeId)
      affected.push(nextNodeId)
      traversed.push(
        Object.freeze({
          edgeClass: edge.edgeClass,
          fromNodeId: edge.fromNodeId,
          toNodeId: edge.toNodeId,
        })
      )
      queue.push({ nodeId: nextNodeId, hops: current.hops + 1 })
    }
  }

  return Object.freeze({
    ok: true,
    eventId,
    originNodeId: origin.id,
    traversedEdges: Object.freeze(traversed),
    affectedNodeIds: Object.freeze(affected),
    blockedEdges: Object.freeze(blocked),
    failureReason: null,
  })
}

function parseEvent(
  value: BoundedSiteEvent
):
  | { readonly eventId: string; readonly originNodeId: string; readonly maxHops: number }
  | SiteEventTopologyFailure {
  if (!isRecord(value)) return 'malformed_event'
  if (typeof value.eventId !== 'string' || value.eventId.length === 0) return 'malformed_event'
  if (typeof value.originNodeId !== 'string' || value.originNodeId.length === 0) {
    return 'missing_origin'
  }
  if (typeof value.maxHops !== 'number' || !Number.isInteger(value.maxHops) || value.maxHops < 0) {
    return 'invalid_bound'
  }
  if (value.affectedNodeIds !== undefined && !Array.isArray(value.affectedNodeIds)) {
    return 'malformed_event'
  }
  return {
    eventId: value.eventId,
    originNodeId: value.originNodeId,
    maxHops: value.maxHops,
  }
}

/**
 * Spread one bounded site event across authoritative `spatial_adjacency` edges.
 * Failure returns an empty affected list and leaves the caller event untouched.
 */
export function propagateSiteEventOverFacilityTopology(
  event: BoundedSiteEvent,
  topologyReference: FacilityTopologyReference
): SiteEventTopologyPropagationResult {
  const parsed = parseEvent(event)
  if (typeof parsed === 'string') {
    const eventId = isRecord(event) && typeof event.eventId === 'string' ? event.eventId : null
    const originNodeId =
      isRecord(event) && typeof event.originNodeId === 'string' && event.originNodeId.length > 0
        ? event.originNodeId
        : null
    return failure(parsed, eventId, originNodeId)
  }
  if (
    !isRecord(topologyReference) ||
    (topologyReference.source !== 'production' && topologyReference.source !== 'authored')
  ) {
    return failure('missing_topology', parsed.eventId, parsed.originNodeId)
  }
  const resolved = resolveTopology(topologyReference, parsed.eventId, parsed.originNodeId)
  if ('ok' in resolved) return resolved
  return propagateOnGraph(parsed.eventId, parsed.originNodeId, parsed.maxHops, resolved)
}
