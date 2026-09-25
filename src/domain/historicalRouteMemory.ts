/**
 * SPE-1392 — historical route memory and nonlocal edge graph.
 *
 * This module owns site-scoped memory of prior activation anchors and
 * historical/nonlocal edges. It does not add facility spatial adjacency,
 * teleport actors, discover hidden routes for the player, or move actors.
 *
 * Historical edges become traversable only when explicitly reactivated for
 * an activation id. Knowledge and reconnaissance confidence are separate from
 * mechanical activation so an edge can exist and be active without being
 * fully known.
 */

export const HISTORICAL_NONLOCAL_EDGE_CLASS = 'historical_nonlocal' as const

export const HISTORICAL_ROUTE_KNOWLEDGE_STATES = ['unknown', 'inferred', 'verified'] as const
export type HistoricalRouteKnowledgeState = (typeof HISTORICAL_ROUTE_KNOWLEDGE_STATES)[number]

export const HISTORICAL_ROUTE_ANCHOR_KINDS = [
  'activation_point',
  'landmark',
  'historical_exit',
] as const
export type HistoricalRouteAnchorKind = (typeof HISTORICAL_ROUTE_ANCHOR_KINDS)[number]

export const HISTORICAL_ROUTE_KINDS = [
  'recurring_site',
  'historical_exit',
  'contamination_route',
] as const
export type HistoricalRouteKind = (typeof HISTORICAL_ROUTE_KINDS)[number]

export interface HistoricalRouteAnchorMemory {
  readonly id: string
  readonly kind: HistoricalRouteAnchorKind
  readonly firstSeenActivationId: string
  readonly lastSeenActivationId: string
  readonly activationIds: readonly string[]
  readonly contaminatedActivationIds: readonly string[]
  readonly knowledgeState: HistoricalRouteKnowledgeState
  readonly reconnaissanceConfidence: number
}

export interface HistoricalRouteEdgeMemory {
  readonly id: string
  readonly edgeClass: typeof HISTORICAL_NONLOCAL_EDGE_CLASS
  readonly routeKind: HistoricalRouteKind
  readonly fromAnchorId: string
  readonly toAnchorId: string
  readonly firstSeenActivationId: string
  readonly lastSeenActivationId: string
  readonly activationIds: readonly string[]
  readonly contaminatedActivationIds: readonly string[]
  readonly knowledgeState: HistoricalRouteKnowledgeState
  readonly reconnaissanceConfidence: number
}

export interface HistoricalRouteMemoryGraph {
  readonly siteId: string
  readonly anchors: readonly HistoricalRouteAnchorMemory[]
  readonly edges: readonly HistoricalRouteEdgeMemory[]
  readonly activeActivationId: string | null
  readonly activeEdgeIds: readonly string[]
}

export interface HistoricalRouteAnchorObservation {
  readonly id: string
  readonly kind: HistoricalRouteAnchorKind
  readonly contaminated?: boolean
  readonly knowledgeState?: HistoricalRouteKnowledgeState
  readonly reconnaissanceConfidence?: number
}

export interface HistoricalRouteEdgeObservation {
  readonly id: string
  readonly routeKind: HistoricalRouteKind
  readonly fromAnchorId: string
  readonly toAnchorId: string
  readonly contaminated?: boolean
  readonly knowledgeState?: HistoricalRouteKnowledgeState
  readonly reconnaissanceConfidence?: number
}

export interface HistoricalRouteActivationObservation {
  readonly activationId: string
  readonly anchors: readonly HistoricalRouteAnchorObservation[]
  readonly edges: readonly HistoricalRouteEdgeObservation[]
}

export interface HistoricalRouteKnowledgeUpdate {
  readonly edgeId: string
  readonly knowledgeState: HistoricalRouteKnowledgeState
  readonly reconnaissanceConfidence: number
}

export interface HistoricalRouteContaminationUpdate {
  readonly activationId: string
  readonly edgeIds: readonly string[]
}

export interface HistoricalRoutePath {
  readonly activationId: string
  readonly anchorIds: readonly string[]
  readonly edgeIds: readonly string[]
}

function compareCodeUnit(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function validConfidence(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
}

function isKnowledgeState(value: unknown): value is HistoricalRouteKnowledgeState {
  return HISTORICAL_ROUTE_KNOWLEDGE_STATES.some((state) => state === value)
}

function isAnchorKind(value: unknown): value is HistoricalRouteAnchorKind {
  return HISTORICAL_ROUTE_ANCHOR_KINDS.some((kind) => kind === value)
}

function isRouteKind(value: unknown): value is HistoricalRouteKind {
  return HISTORICAL_ROUTE_KINDS.some((kind) => kind === value)
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort(compareCodeUnit)
}

function appendActivation(values: readonly string[], activationId: string): readonly string[] {
  return uniqueSorted([...values, activationId])
}

function knowledgeRank(state: HistoricalRouteKnowledgeState): number {
  if (state === 'verified') return 2
  if (state === 'inferred') return 1
  return 0
}

function strongestKnowledge(
  current: HistoricalRouteKnowledgeState,
  next: HistoricalRouteKnowledgeState
): HistoricalRouteKnowledgeState {
  return knowledgeRank(next) > knowledgeRank(current) ? next : current
}

function observationKnowledge(value: {
  readonly knowledgeState?: HistoricalRouteKnowledgeState
  readonly reconnaissanceConfidence?: number
}): { knowledgeState: HistoricalRouteKnowledgeState; reconnaissanceConfidence: number } | null {
  const knowledgeState = value.knowledgeState ?? 'unknown'
  const reconnaissanceConfidence = value.reconnaissanceConfidence ?? 0

  if (!isKnowledgeState(knowledgeState) || !validConfidence(reconnaissanceConfidence)) {
    return null
  }

  return { knowledgeState, reconnaissanceConfidence }
}

function frozenAnchor(anchor: HistoricalRouteAnchorMemory): HistoricalRouteAnchorMemory {
  return Object.freeze({
    ...anchor,
    activationIds: Object.freeze([...anchor.activationIds]),
    contaminatedActivationIds: Object.freeze([...anchor.contaminatedActivationIds]),
  })
}

function frozenEdge(edge: HistoricalRouteEdgeMemory): HistoricalRouteEdgeMemory {
  return Object.freeze({
    ...edge,
    activationIds: Object.freeze([...edge.activationIds]),
    contaminatedActivationIds: Object.freeze([...edge.contaminatedActivationIds]),
  })
}

function freezeGraph(graph: HistoricalRouteMemoryGraph): HistoricalRouteMemoryGraph {
  return Object.freeze({
    ...graph,
    anchors: Object.freeze(graph.anchors.map(frozenAnchor)),
    edges: Object.freeze(graph.edges.map(frozenEdge)),
    activeEdgeIds: Object.freeze([...graph.activeEdgeIds]),
  })
}

export function createHistoricalRouteMemoryGraph(
  siteId: string
): HistoricalRouteMemoryGraph | undefined {
  if (!validId(siteId)) return undefined

  return freezeGraph({
    siteId,
    anchors: [],
    edges: [],
    activeActivationId: null,
    activeEdgeIds: [],
  })
}

/**
 * Record one site activation into historical memory.
 *
 * The call fails closed and returns the original graph when the observation is
 * malformed or an observed edge points to an anchor that is neither already
 * remembered nor present in this activation observation.
 */
export function rememberHistoricalRouteActivation(
  graph: HistoricalRouteMemoryGraph,
  observation: HistoricalRouteActivationObservation
): HistoricalRouteMemoryGraph {
  if (!validId(observation.activationId)) return graph
  if (!Array.isArray(observation.anchors) || !Array.isArray(observation.edges)) return graph

  for (let index = 0; index < observation.anchors.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(observation.anchors, index)) return graph
    if (!isRecord(observation.anchors[index])) return graph
  }
  for (let index = 0; index < observation.edges.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(observation.edges, index)) return graph
    if (!isRecord(observation.edges[index])) return graph
  }

  const anchorIds = observation.anchors.map((anchor) => anchor.id)
  const edgeIds = observation.edges.map((edge) => edge.id)
  if (uniqueSorted(anchorIds).length !== anchorIds.length) return graph
  if (uniqueSorted(edgeIds).length !== edgeIds.length) return graph

  const anchors = new Map(graph.anchors.map((anchor) => [anchor.id, anchor]))

  for (const observed of observation.anchors) {
    if (!validId(observed.id) || !isAnchorKind(observed.kind)) return graph
    const knowledge = observationKnowledge(observed)
    if (!knowledge) return graph

    const current = anchors.get(observed.id)
    if (current && current.kind !== observed.kind) return graph

    anchors.set(
      observed.id,
      frozenAnchor({
        id: observed.id,
        kind: current?.kind ?? observed.kind,
        firstSeenActivationId: current?.firstSeenActivationId ?? observation.activationId,
        lastSeenActivationId: observation.activationId,
        activationIds: appendActivation(current?.activationIds ?? [], observation.activationId),
        contaminatedActivationIds: observed.contaminated
          ? appendActivation(current?.contaminatedActivationIds ?? [], observation.activationId)
          : (current?.contaminatedActivationIds ?? []),
        knowledgeState: strongestKnowledge(
          current?.knowledgeState ?? 'unknown',
          knowledge.knowledgeState
        ),
        reconnaissanceConfidence: Math.max(
          current?.reconnaissanceConfidence ?? 0,
          knowledge.reconnaissanceConfidence
        ),
      })
    )
  }

  const edges = new Map(graph.edges.map((edge) => [edge.id, edge]))

  for (const observed of observation.edges) {
    if (
      !validId(observed.id) ||
      !validId(observed.fromAnchorId) ||
      !validId(observed.toAnchorId) ||
      observed.fromAnchorId === observed.toAnchorId ||
      !isRouteKind(observed.routeKind)
    ) {
      return graph
    }
    if (!anchors.has(observed.fromAnchorId) || !anchors.has(observed.toAnchorId)) return graph

    const knowledge = observationKnowledge(observed)
    if (!knowledge) return graph

    const current = edges.get(observed.id)
    if (
      current &&
      (current.fromAnchorId !== observed.fromAnchorId ||
        current.toAnchorId !== observed.toAnchorId ||
        current.routeKind !== observed.routeKind)
    ) {
      return graph
    }

    edges.set(
      observed.id,
      frozenEdge({
        id: observed.id,
        edgeClass: HISTORICAL_NONLOCAL_EDGE_CLASS,
        routeKind: observed.routeKind,
        fromAnchorId: observed.fromAnchorId,
        toAnchorId: observed.toAnchorId,
        firstSeenActivationId: current?.firstSeenActivationId ?? observation.activationId,
        lastSeenActivationId: observation.activationId,
        activationIds: appendActivation(current?.activationIds ?? [], observation.activationId),
        contaminatedActivationIds: observed.contaminated
          ? appendActivation(current?.contaminatedActivationIds ?? [], observation.activationId)
          : (current?.contaminatedActivationIds ?? []),
        knowledgeState: strongestKnowledge(
          current?.knowledgeState ?? 'unknown',
          knowledge.knowledgeState
        ),
        reconnaissanceConfidence: Math.max(
          current?.reconnaissanceConfidence ?? 0,
          knowledge.reconnaissanceConfidence
        ),
      })
    )

    for (const anchorId of [observed.fromAnchorId, observed.toAnchorId]) {
      const endpoint = anchors.get(anchorId)
      if (!endpoint) return graph

      anchors.set(
        anchorId,
        frozenAnchor({
          ...endpoint,
          lastSeenActivationId: observation.activationId,
          activationIds: appendActivation(endpoint.activationIds, observation.activationId),
          contaminatedActivationIds: observed.contaminated
            ? appendActivation(endpoint.contaminatedActivationIds, observation.activationId)
            : endpoint.contaminatedActivationIds,
        })
      )
    }
  }

  return freezeGraph({
    ...graph,
    anchors: [...anchors.values()].sort((left, right) => compareCodeUnit(left.id, right.id)),
    edges: [...edges.values()].sort((left, right) => compareCodeUnit(left.id, right.id)),
  })
}

/**
 * Reactivate remembered edges for a new/current site activation.
 *
 * Reactivation is explicit and site-scoped. It never derives links from
 * facility adjacency and never invents a missing historical edge.
 */
export function reactivateHistoricalRouteEdges(
  graph: HistoricalRouteMemoryGraph,
  activationId: string,
  edgeIds: readonly string[]
): HistoricalRouteMemoryGraph {
  if (!validId(activationId) || !Array.isArray(edgeIds) || edgeIds.length === 0) return graph

  const selectedEdgeIds = uniqueSorted(edgeIds)
  if (selectedEdgeIds.length !== edgeIds.length) return graph

  const edgeById = new Map(graph.edges.map((edge) => [edge.id, edge]))
  if (selectedEdgeIds.some((edgeId) => !validId(edgeId) || !edgeById.has(edgeId))) return graph

  const selected = new Set(selectedEdgeIds)
  const activeAnchorIds = new Set<string>()

  const edges = graph.edges.map((edge) => {
    if (!selected.has(edge.id)) return edge
    activeAnchorIds.add(edge.fromAnchorId)
    activeAnchorIds.add(edge.toAnchorId)
    return frozenEdge({
      ...edge,
      lastSeenActivationId: activationId,
      activationIds: appendActivation(edge.activationIds, activationId),
    })
  })

  const anchors = graph.anchors.map((anchor) =>
    activeAnchorIds.has(anchor.id)
      ? frozenAnchor({
          ...anchor,
          lastSeenActivationId: activationId,
          activationIds: appendActivation(anchor.activationIds, activationId),
        })
      : anchor
  )

  return freezeGraph({
    ...graph,
    anchors,
    edges,
    activeActivationId: activationId,
    activeEdgeIds: selectedEdgeIds,
  })
}

export function clearHistoricalRouteReactivation(
  graph: HistoricalRouteMemoryGraph
): HistoricalRouteMemoryGraph {
  if (graph.activeActivationId === null && graph.activeEdgeIds.length === 0) return graph

  return freezeGraph({
    ...graph,
    activeActivationId: null,
    activeEdgeIds: [],
  })
}

/**
 * Update what investigators know about one remembered edge.
 *
 * Knowledge and confidence only become stronger through this seam. This avoids
 * a later low-confidence observation silently erasing verified route memory.
 */
export function updateHistoricalRouteKnowledge(
  graph: HistoricalRouteMemoryGraph,
  update: HistoricalRouteKnowledgeUpdate
): HistoricalRouteMemoryGraph {
  if (
    !validId(update.edgeId) ||
    !isKnowledgeState(update.knowledgeState) ||
    !validConfidence(update.reconnaissanceConfidence)
  ) {
    return graph
  }

  let changed = false
  const edges = graph.edges.map((edge) => {
    if (edge.id !== update.edgeId) return edge

    const knowledgeState = strongestKnowledge(edge.knowledgeState, update.knowledgeState)
    const reconnaissanceConfidence = Math.max(
      edge.reconnaissanceConfidence,
      update.reconnaissanceConfidence
    )
    if (
      knowledgeState === edge.knowledgeState &&
      reconnaissanceConfidence === edge.reconnaissanceConfidence
    ) {
      return edge
    }

    changed = true
    return frozenEdge({
      ...edge,
      knowledgeState,
      reconnaissanceConfidence,
    })
  })

  return changed ? freezeGraph({ ...graph, edges }) : graph
}

/**
 * Record contamination moving over remembered historical edges.
 *
 * Contamination is history attached to an existing route. It cannot author an
 * edge. Recording contamination also records that the edge and its anchors
 * participated in that activation.
 */
export function recordHistoricalRouteContamination(
  graph: HistoricalRouteMemoryGraph,
  update: HistoricalRouteContaminationUpdate
): HistoricalRouteMemoryGraph {
  if (!validId(update.activationId) || !Array.isArray(update.edgeIds) || update.edgeIds.length === 0) {
    return graph
  }

  const edgeIds = uniqueSorted(update.edgeIds)
  if (edgeIds.length !== update.edgeIds.length) return graph

  const edgeById = new Map(graph.edges.map((edge) => [edge.id, edge]))
  if (edgeIds.some((edgeId) => !validId(edgeId) || !edgeById.has(edgeId))) return graph

  const selected = new Set(edgeIds)
  const contaminatedAnchorIds = new Set<string>()
  const edges = graph.edges.map((edge) => {
    if (!selected.has(edge.id)) return edge

    contaminatedAnchorIds.add(edge.fromAnchorId)
    contaminatedAnchorIds.add(edge.toAnchorId)
    return frozenEdge({
      ...edge,
      lastSeenActivationId: update.activationId,
      activationIds: appendActivation(edge.activationIds, update.activationId),
      contaminatedActivationIds: appendActivation(
        edge.contaminatedActivationIds,
        update.activationId
      ),
    })
  })

  const anchors = graph.anchors.map((anchor) =>
    contaminatedAnchorIds.has(anchor.id)
      ? frozenAnchor({
          ...anchor,
          lastSeenActivationId: update.activationId,
          activationIds: appendActivation(anchor.activationIds, update.activationId),
          contaminatedActivationIds: appendActivation(
            anchor.contaminatedActivationIds,
            update.activationId
          ),
        })
      : anchor
  )

  return freezeGraph({ ...graph, anchors, edges })
}

/** Read mechanically active historical edges, independent of player knowledge. */
export function readActiveHistoricalRouteEdges(
  graph: HistoricalRouteMemoryGraph,
  activationId: string
): readonly HistoricalRouteEdgeMemory[] {
  if (!validId(activationId) || graph.activeActivationId !== activationId) return []

  const active = new Set(graph.activeEdgeIds)
  return graph.edges.filter((edge) => active.has(edge.id))
}

/** Read the remembered route frontier visible to investigation systems. */
export function readKnownHistoricalRouteEdges(
  graph: HistoricalRouteMemoryGraph,
  minimumConfidence = 0
): readonly HistoricalRouteEdgeMemory[] {
  if (!validConfidence(minimumConfidence)) return []

  return graph.edges.filter(
    (edge) =>
      edge.knowledgeState !== 'unknown' && edge.reconnaissanceConfidence >= minimumConfidence
  )
}

/**
 * Resolve one deterministic directed path over the currently active historical
 * edges. The resolver is graph-memory only; it does not move an actor.
 */
export function resolveActiveHistoricalRoutePath(
  graph: HistoricalRouteMemoryGraph,
  activationId: string,
  fromAnchorId: string,
  toAnchorId: string
): HistoricalRoutePath | null {
  if (
    !validId(activationId) ||
    !validId(fromAnchorId) ||
    !validId(toAnchorId) ||
    graph.activeActivationId !== activationId
  ) {
    return null
  }

  const knownAnchors = new Set(graph.anchors.map((anchor) => anchor.id))
  if (!knownAnchors.has(fromAnchorId) || !knownAnchors.has(toAnchorId)) return null

  const activeEdges = readActiveHistoricalRouteEdges(graph, activationId)

  if (fromAnchorId === toAnchorId) {
    const anchorIsActive = activeEdges.some(
      (edge) => edge.fromAnchorId === fromAnchorId || edge.toAnchorId === fromAnchorId
    )
    if (!anchorIsActive) return null

    return Object.freeze({
      activationId,
      anchorIds: Object.freeze([fromAnchorId]),
      edgeIds: Object.freeze([]),
    })
  }

  const outgoing = new Map<string, HistoricalRouteEdgeMemory[]>()

  for (const edge of activeEdges) {
    const bucket = outgoing.get(edge.fromAnchorId) ?? []
    bucket.push(edge)
    outgoing.set(edge.fromAnchorId, bucket)
  }

  for (const bucket of outgoing.values()) {
    bucket.sort((left, right) => {
      const edgeOrder = compareCodeUnit(left.id, right.id)
      return edgeOrder !== 0 ? edgeOrder : compareCodeUnit(left.toAnchorId, right.toAnchorId)
    })
  }

  const queue: Array<{ anchorIds: string[]; edgeIds: string[] }> = [
    { anchorIds: [fromAnchorId], edgeIds: [] },
  ]
  const visited = new Set([fromAnchorId])

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) break

    const currentAnchorId = current.anchorIds[current.anchorIds.length - 1]
    for (const edge of outgoing.get(currentAnchorId) ?? []) {
      if (visited.has(edge.toAnchorId)) continue

      const anchorIds = [...current.anchorIds, edge.toAnchorId]
      const edgeIds = [...current.edgeIds, edge.id]
      if (edge.toAnchorId === toAnchorId) {
        return Object.freeze({
          activationId,
          anchorIds: Object.freeze(anchorIds),
          edgeIds: Object.freeze(edgeIds),
        })
      }

      visited.add(edge.toAnchorId)
      queue.push({ anchorIds, edgeIds })
    }
  }

  return null
}
