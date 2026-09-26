/**
 * SPE-3031 — project SPE-3017 replays + SPE-3027 memory graphs into map/route chrome.
 *
 * Read/projection only. Reuses SPE-3026 visibility. Does not invent coordinates,
 * mutate registries, call SPE-3009 helpers, or import SPE-3024 activation.
 */

import {
  HISTORICAL_ROUTE_CAUSAL_CLASSIFICATION,
  normalizeHistoricalRouteReplayRegistry,
  type HistoricalRouteReplayPhase,
  type HistoricalRouteReplayRecord,
  type HistoricalRouteReplayRegistry,
} from '../../domain/historicalRouteReplay'
import {
  listHistoricalRouteMemoryGraphs,
  normalizeHistoricalRouteMemoryGraphRegistry,
  type HistoricalRouteAnchorKind,
  type HistoricalRouteKind,
  type HistoricalRouteKnowledgeState,
  type HistoricalRouteMemoryGraph,
  type HistoricalRouteMemoryGraphRegistry,
} from '../../domain/historicalRouteMemory'
import {
  defaultConservativeHistoricalRouteReplayVisibility,
  type HistoricalRouteReplayVisibility,
} from './historicalRouteReplayExplanationAdapter'

export type HistoricalRouteReplayMapAnchorRole =
  'origin' | 'terminal' | 'current' | 'traversed' | 'route'

export interface HistoricalRouteReplayMapAnchorView {
  readonly anchorId: string
  readonly roles: readonly HistoricalRouteReplayMapAnchorRole[]
  readonly kind: HistoricalRouteAnchorKind | null
  readonly knowledgeState: HistoricalRouteKnowledgeState | null
}

export interface HistoricalRouteReplayMapEdgeView {
  readonly edgeId: string
  readonly fromAnchorId: string
  readonly toAnchorId: string
  readonly routeKind: HistoricalRouteKind | null
  readonly traversed: boolean
}

export interface HistoricalRouteReplayMapChromeView {
  readonly eventId: string
  readonly phase: HistoricalRouteReplayPhase
  readonly siteId: string | null
  readonly anchors: readonly HistoricalRouteReplayMapAnchorView[]
  readonly edges: readonly HistoricalRouteReplayMapEdgeView[]
  readonly causalClassification: typeof HISTORICAL_ROUTE_CAUSAL_CLASSIFICATION
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function knownSet(visibility: HistoricalRouteReplayVisibility): ReadonlySet<string> {
  return new Set(
    visibility.knownAnchorIds.filter((id) => typeof id === 'string' && id.trim().length > 0)
  )
}

function visibleRouteAnchorIds(
  record: HistoricalRouteReplayRecord,
  visibility: HistoricalRouteReplayVisibility,
  known: ReadonlySet<string>
): readonly string[] {
  if (visibility.includeFullRoute) {
    return Object.freeze([...record.routeAnchorIds])
  }
  return Object.freeze(record.routeAnchorIds.filter((id) => known.has(id)))
}

function resolveSiteGraph(
  record: HistoricalRouteReplayRecord,
  graphs: readonly HistoricalRouteMemoryGraph[]
): HistoricalRouteMemoryGraph | null {
  const routeEdgeIds = new Set(record.routeEdgeIds)
  const routeAnchorIds = new Set(record.routeAnchorIds)

  for (const graph of graphs) {
    if (graph.edges.some((edge) => routeEdgeIds.has(edge.id))) {
      return graph
    }
    if (graph.anchors.some((anchor) => routeAnchorIds.has(anchor.id))) {
      return graph
    }
  }
  return null
}

function buildAnchorIndex(graphs: readonly HistoricalRouteMemoryGraph[]): ReadonlyMap<
  string,
  {
    readonly kind: HistoricalRouteAnchorKind
    readonly knowledgeState: HistoricalRouteKnowledgeState
  }
> {
  const index = new Map<
    string,
    {
      readonly kind: HistoricalRouteAnchorKind
      readonly knowledgeState: HistoricalRouteKnowledgeState
    }
  >()
  for (const graph of graphs) {
    for (const anchor of graph.anchors) {
      if (!index.has(anchor.id)) {
        index.set(anchor.id, {
          kind: anchor.kind,
          knowledgeState: anchor.knowledgeState,
        })
      }
    }
  }
  return index
}

function buildEdgeIndex(graphs: readonly HistoricalRouteMemoryGraph[]): ReadonlyMap<
  string,
  {
    readonly fromAnchorId: string
    readonly toAnchorId: string
    readonly routeKind: HistoricalRouteKind
  }
> {
  const index = new Map<
    string,
    {
      readonly fromAnchorId: string
      readonly toAnchorId: string
      readonly routeKind: HistoricalRouteKind
    }
  >()
  for (const graph of graphs) {
    for (const edge of graph.edges) {
      if (!index.has(edge.id)) {
        index.set(edge.id, {
          fromAnchorId: edge.fromAnchorId,
          toAnchorId: edge.toAnchorId,
          routeKind: edge.routeKind,
        })
      }
    }
  }
  return index
}

function projectAnchorRoles(
  record: HistoricalRouteReplayRecord,
  anchorId: string
): readonly HistoricalRouteReplayMapAnchorRole[] {
  const roles: HistoricalRouteReplayMapAnchorRole[] = ['route']
  if (anchorId === record.originAnchorId) roles.push('origin')
  if (anchorId === record.terminalAnchorId) roles.push('terminal')
  if (anchorId === record.currentAnchorId) roles.push('current')
  if (record.traversedAnchorIds.includes(anchorId)) roles.push('traversed')
  return Object.freeze(roles)
}

/**
 * Project one replay into bounded map/route chrome using SPE-3026 visibility.
 * Missing memory-graph edges are omitted (no invent). No coordinates.
 */
export function projectHistoricalRouteReplayMapChrome(
  record: HistoricalRouteReplayRecord,
  graphs: HistoricalRouteMemoryGraphRegistry | readonly HistoricalRouteMemoryGraph[] | unknown,
  visibility: HistoricalRouteReplayVisibility
): HistoricalRouteReplayMapChromeView {
  const graphList = Array.isArray(graphs)
    ? Object.freeze([...graphs])
    : listHistoricalRouteMemoryGraphs(normalizeHistoricalRouteMemoryGraphRegistry(graphs))
  const known = knownSet(visibility)
  const visibleAnchors = visibleRouteAnchorIds(record, visibility, known)
  const visibleSet = new Set(visibleAnchors)
  const traversedEdges = new Set(record.traversedEdgeIds)
  const anchorIndex = buildAnchorIndex(graphList)
  const edgeIndex = buildEdgeIndex(graphList)
  const siteGraph = resolveSiteGraph(record, graphList)

  const anchors: HistoricalRouteReplayMapAnchorView[] = visibleAnchors
    .slice()
    .sort(compareCodeUnits)
    .map((anchorId) => {
      const memory = anchorIndex.get(anchorId)
      return Object.freeze({
        anchorId,
        roles: projectAnchorRoles(record, anchorId),
        kind: memory?.kind ?? null,
        knowledgeState: memory?.knowledgeState ?? null,
      })
    })

  const edges: HistoricalRouteReplayMapEdgeView[] = []
  for (const edgeId of [...record.routeEdgeIds].sort(compareCodeUnits)) {
    const memory = edgeIndex.get(edgeId)
    if (!memory) continue
    if (!visibleSet.has(memory.fromAnchorId) || !visibleSet.has(memory.toAnchorId)) {
      continue
    }
    edges.push(
      Object.freeze({
        edgeId,
        fromAnchorId: memory.fromAnchorId,
        toAnchorId: memory.toAnchorId,
        routeKind: memory.routeKind,
        traversed: traversedEdges.has(edgeId),
      })
    )
  }

  return Object.freeze({
    eventId: record.eventId,
    phase: record.phase,
    siteId: siteGraph?.siteId ?? null,
    anchors: Object.freeze(anchors),
    edges: Object.freeze(edges),
    causalClassification: HISTORICAL_ROUTE_CAUSAL_CLASSIFICATION,
  })
}

export function getHistoricalRouteReplayMapChromeViews(
  replayRegistry: HistoricalRouteReplayRegistry | unknown,
  memoryGraphs: HistoricalRouteMemoryGraphRegistry | unknown,
  visibilityFor: (
    record: HistoricalRouteReplayRecord
  ) => HistoricalRouteReplayVisibility = defaultConservativeHistoricalRouteReplayVisibility
): readonly HistoricalRouteReplayMapChromeView[] {
  const normalizedReplays = normalizeHistoricalRouteReplayRegistry(replayRegistry)
  const normalizedGraphs = normalizeHistoricalRouteMemoryGraphRegistry(memoryGraphs)
  const graphList = listHistoricalRouteMemoryGraphs(normalizedGraphs)
  const views: HistoricalRouteReplayMapChromeView[] = []

  for (const eventId of Object.keys(normalizedReplays).sort(compareCodeUnits)) {
    const replay = normalizedReplays[eventId]
    if (!replay) continue
    views.push(projectHistoricalRouteReplayMapChrome(replay, graphList, visibilityFor(replay)))
  }

  return Object.freeze(views)
}
