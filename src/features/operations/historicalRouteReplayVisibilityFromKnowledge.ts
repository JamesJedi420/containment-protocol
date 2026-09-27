/**
 * SPE-3032 — project SPE-1392/SPE-3027 memory-graph knowledge into SPE-3026 visibility.
 *
 * Read/projection only. Does not mutate registries, invent graph rows, bridge SPE-22
 * KnowledgeStateMap, or import SPE-3024 activation. Map-chrome `knowledgeState` remains
 * display metadata elsewhere — this projector is the visibility gate.
 */

import type { HistoricalRouteReplayRecord } from '../../domain/historicalRouteReplay'
import {
  listHistoricalRouteMemoryGraphs,
  normalizeHistoricalRouteMemoryGraphRegistry,
  type HistoricalRouteMemoryGraph,
  type HistoricalRouteMemoryGraphRegistry,
} from '../../domain/historicalRouteMemory'
import {
  defaultConservativeHistoricalRouteReplayVisibility,
  type HistoricalRouteReplayVisibility,
} from './historicalRouteReplayExplanationAdapter'

/**
 * Existing graph `reconnaissanceConfidence` at or above this threshold may authorize
 * full-route / observer-exposure visibility (alongside `verified` knowledgeState).
 * Fail closed below this — inferred/low knowledge must not leak the full route.
 */
export const HIGH_HISTORICAL_ROUTE_RECONNAISSANCE_CONFIDENCE = 0.75

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
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

function toGraphList(
  graphs: HistoricalRouteMemoryGraphRegistry | readonly HistoricalRouteMemoryGraph[] | unknown
): readonly HistoricalRouteMemoryGraph[] {
  if (Array.isArray(graphs)) {
    return Object.freeze([...graphs])
  }
  return listHistoricalRouteMemoryGraphs(normalizeHistoricalRouteMemoryGraphRegistry(graphs))
}

function authorizesFullRouteDisclosure(graph: HistoricalRouteMemoryGraph): boolean {
  for (const anchor of graph.anchors) {
    if (anchor.knowledgeState === 'verified') return true
    if (anchor.reconnaissanceConfidence >= HIGH_HISTORICAL_ROUTE_RECONNAISSANCE_CONFIDENCE) {
      return true
    }
  }
  for (const edge of graph.edges) {
    if (edge.knowledgeState === 'verified') return true
    if (edge.reconnaissanceConfidence >= HIGH_HISTORICAL_ROUTE_RECONNAISSANCE_CONFIDENCE) {
      return true
    }
  }
  return false
}

/**
 * Build SPE-3026 visibility from SPE-3027 memory-graph knowledge for one replay.
 *
 * - Seeds known anchors from exposed ∪ current/origin/terminal (conservative seed).
 * - Expands only with existing graph anchors whose knowledge is `inferred` or `verified`.
 * - Full route / observer exposures stay false unless `verified` or high reconnaissance
 *   confidence on the matching graph authorizes them.
 * - Missing graph, empty registry, or all-`unknown` → conservative default.
 */
export function historicalRouteReplayVisibilityFromKnowledge(
  record: HistoricalRouteReplayRecord,
  graphs: HistoricalRouteMemoryGraphRegistry | readonly HistoricalRouteMemoryGraph[] | unknown
): HistoricalRouteReplayVisibility {
  const conservative = defaultConservativeHistoricalRouteReplayVisibility(record)
  const graphList = toGraphList(graphs)
  if (graphList.length === 0) return conservative

  const siteGraph = resolveSiteGraph(record, graphList)
  if (!siteGraph) return conservative

  const expandable = siteGraph.anchors.filter(
    (anchor) => anchor.knowledgeState === 'inferred' || anchor.knowledgeState === 'verified'
  )
  if (expandable.length === 0) return conservative

  const known = new Set(conservative.knownAnchorIds)
  for (const anchor of expandable) {
    known.add(anchor.id)
  }

  const includeFull = authorizesFullRouteDisclosure(siteGraph)

  return Object.freeze({
    knownAnchorIds: Object.freeze([...known].sort(compareCodeUnits)),
    includeObserverExposures: includeFull,
    includeFullRoute: includeFull,
  })
}

/**
 * Shared `visibilityFor` factory for SPE-3026 explanation + SPE-3031 map chrome consumers.
 */
export function createHistoricalRouteReplayVisibilityForFromKnowledge(
  graphs: HistoricalRouteMemoryGraphRegistry | readonly HistoricalRouteMemoryGraph[] | unknown
): (record: HistoricalRouteReplayRecord) => HistoricalRouteReplayVisibility {
  return (record) => historicalRouteReplayVisibilityFromKnowledge(record, graphs)
}
