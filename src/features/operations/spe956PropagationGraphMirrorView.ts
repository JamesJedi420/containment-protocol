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
import { formatSpe947EnumLabel } from './spe947EvaluatorMirrorView'

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

function listSortedGraphs(
  map: Spe956PropagationGraphRecordsMap | undefined
): Spe956PersistedPropagationGraph[] {
  if (!map) {
    return []
  }

  return Object.values(map)
    .filter((entry): entry is Spe956PersistedPropagationGraph => entry != null)
    .sort((left, right) => left.id.localeCompare(right.id))
}

function toNodeRow(
  node: Spe956PersistedPropagationGraph['nodes'][number]
): Spe956PropagationGraphNodeMirrorRow {
  return Object.freeze({
    id: node.id,
    label: node.label,
    kindLabel: formatSpe947EnumLabel(node.kind),
    entityIdLabel: node.entityId?.trim() ? node.entityId : '—',
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
    .sort((left, right) => left.id.localeCompare(right.id))
    .map(toNodeRow)
  const edges = [...graph.edges]
    .filter((edge) => edge != null)
    .sort((left, right) => left.id.localeCompare(right.id))
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
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
  })
}

/** Read-only mirror over hydrated spe956PropagationGraphRecords; does not compose evaluators. */
export function getSpe956PropagationGraphMirrorView(game: GameState): Spe956PropagationGraphMirrorView {
  const records = extractSpe956PropagationGraphRecords(game)
  const graphs = listSortedGraphs(records).map(toGraphRow)

  const graphCount = graphs.length
  const totalNodeCount = graphs.reduce(
    (sum, graph) => sum + Number.parseInt(graph.nodeCountLabel, 10),
    0
  )
  const totalEdgeCount = graphs.reduce(
    (sum, graph) => sum + Number.parseInt(graph.edgeCountLabel, 10),
    0
  )

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
