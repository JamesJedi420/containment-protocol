/**
 * SPE-2626 / SPE-956: read-only planning mirror over persisted propagation graph records.
 * Surfaces authored graph structure and week-close orchestration fields as labels only —
 * does not call composeSpe956PropagationGraph or SPE-947 evaluators from UI paths.
 */

import type { GameState } from '../../domain/models'
import type {
  Spe956PersistedPropagationGraph,
  Spe956PropagationGraphRecordsMap,
} from '../../domain/spe956PropagationGraphPersistence'
import { extractSpe956PropagationGraphRecords } from '../../domain/spe956PropagationGraphPersistence'
import { formatMirrorEnumLabel } from './mirrorFormatting'

export interface Spe956PropagationGraphNodeMirrorRow {
  readonly id: string
  readonly label: string
  readonly kindLabel: string
  readonly entityIdLabel: string
}

export interface Spe956PropagationGraphEdgeMirrorRow {
  readonly id: string
  readonly fromNodeIdLabel: string
  readonly toNodeIdLabel: string
  readonly spreadFactorLabel: string
}

export interface Spe956PropagationGraphMirrorRow {
  readonly id: string
  readonly label: string
  readonly seedNodeIdLabel: string
  readonly nodeCountLabel: string
  readonly edgeCountLabel: string
  readonly elapsedPropagationWeeksLabel: string
  readonly weeklyElapsedWeeksDeltaLabel: string
  readonly lastWeeklyTickWeekLabel: string
  readonly isEdgeEmpty: boolean
  readonly nodes: readonly Spe956PropagationGraphNodeMirrorRow[]
  readonly edges: readonly Spe956PropagationGraphEdgeMirrorRow[]
}

export interface Spe956PropagationGraphMirrorSummaryView {
  readonly graphCount: number
  readonly totalNodeCount: number
  readonly totalEdgeCount: number
  readonly week: number
}

export interface Spe956PropagationGraphMirrorView {
  readonly isEmpty: boolean
  readonly summary: Spe956PropagationGraphMirrorSummaryView
  readonly graphs: readonly Spe956PropagationGraphMirrorRow[]
}

function formatOptionalNumber(value: number | undefined): string {
  if (value === undefined) {
    return '—'
  }

  return String(value)
}

/** Code-unit order (not localeCompare) keeps mirror output deterministic across runtimes. */
function compareIdsByCodeUnit(
  left: { readonly id: string },
  right: { readonly id: string }
): number {
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0
}

function listSortedGraphs(
  map: Spe956PropagationGraphRecordsMap | undefined
): Spe956PersistedPropagationGraph[] {
  if (!map) {
    return []
  }

  return Object.values(map)
    .filter((entry): entry is Spe956PersistedPropagationGraph => entry != null)
    .sort(compareIdsByCodeUnit)
}

function toNodeRow(
  node: Spe956PersistedPropagationGraph['nodes'][number]
): Spe956PropagationGraphNodeMirrorRow {
  return Object.freeze({
    id: node.id,
    label: node.label,
    kindLabel: formatMirrorEnumLabel(node.kind),
    entityIdLabel: node.entityId?.trim() || '—',
  })
}

function toEdgeRow(
  edge: Spe956PersistedPropagationGraph['edges'][number]
): Spe956PropagationGraphEdgeMirrorRow {
  return Object.freeze({
    id: edge.id,
    fromNodeIdLabel: edge.fromNodeId,
    toNodeIdLabel: edge.toNodeId,
    spreadFactorLabel: formatOptionalNumber(edge.spreadFactor),
  })
}

function toGraphRow(graph: Spe956PersistedPropagationGraph): Spe956PropagationGraphMirrorRow {
  const nodes = [...graph.nodes]
    .filter((node) => node != null)
    .sort(compareIdsByCodeUnit)
    .map(toNodeRow)
  const edges = [...graph.edges]
    .filter((edge) => edge != null)
    .sort(compareIdsByCodeUnit)
    .map(toEdgeRow)

  return Object.freeze({
    id: graph.id,
    label: graph.label,
    seedNodeIdLabel: graph.seedNodeId,
    nodeCountLabel: String(nodes.length),
    edgeCountLabel: String(edges.length),
    elapsedPropagationWeeksLabel: formatOptionalNumber(graph.elapsedPropagationWeeks),
    weeklyElapsedWeeksDeltaLabel: formatOptionalNumber(graph.weeklyElapsedWeeksDelta),
    lastWeeklyTickWeekLabel: formatOptionalNumber(graph.lastWeeklyTickWeek),
    isEdgeEmpty: edges.length === 0,
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
  })
}

/** Read-only mirror over hydrated spe956PropagationGraphRecords; does not compose evaluators. */
export function getSpe956PropagationGraphMirrorView(
  game: GameState
): Spe956PropagationGraphMirrorView {
  const records = extractSpe956PropagationGraphRecords(game)
  const graphRecords = listSortedGraphs(records)
  const graphs = graphRecords.map(toGraphRow)

  const graphCount = graphs.length
  const totalNodeCount = graphRecords.reduce((sum, graph) => sum + graph.nodes.length, 0)
  const totalEdgeCount = graphRecords.reduce((sum, graph) => sum + graph.edges.length, 0)

  return Object.freeze({
    isEmpty: graphCount === 0,
    summary: Object.freeze({
      graphCount,
      totalNodeCount,
      totalEdgeCount,
      week: game.week,
    }),
    graphs: Object.freeze(graphs),
  })
}
