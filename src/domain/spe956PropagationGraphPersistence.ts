/**
 * SPE-2621 / SPE-956 slice 2 + SPE-2624 slice 3: GameState persistence for authored propagation graphs.
 * Sanitize/hydrate authored graph records; optional weekly orchestration fields (SPE-2577 pattern).
 * Compose helper wires persisted graph + spe947* maps. No evaluator contract changes.
 */

import { extractSpe947EvaluatorPersistenceMaps } from './spe947EvaluatorPersistence'
import {
  composeSpe956PropagationGraph,
  SPE_956_EXAMPLE_PROPAGATION_GRAPH,
  SPE_956_PROPAGATION_GRAPH_NODE_KINDS,
  type AuthoredSpe956PropagationGraph,
  type Spe956PropagationGraphComposeResult,
  type Spe956PropagationGraphEdge,
  type Spe956PropagationGraphNode,
  type Spe956PropagationGraphNodeKind,
} from './spe956PropagationGraph'
import type { VisualTriggerHazardRecordsMap } from './visualTriggerHazardRegistry'

export const SPE_956_PROPAGATION_GRAPH_PERSISTENCE_SCHEMA_VERSION =
  'spe-956-propagation-graph.v1' as const

export type Spe956PropagationGraphPersistenceSchemaVersion =
  typeof SPE_956_PROPAGATION_GRAPH_PERSISTENCE_SCHEMA_VERSION

/** Persisted graph record: authored structure plus optional week-close orchestration fields. */
export interface Spe956PersistedPropagationGraph extends AuthoredSpe956PropagationGraph {
  /** Running elapsed propagation weeks counter (orchestration-owned when delta authored). */
  readonly elapsedPropagationWeeks?: number
  /** Optional authored week-close additive delta (SPE-2577 weeklyViewDelta pattern). */
  readonly weeklyElapsedWeeksDelta?: number
  /** Idempotency marker: last simulation week this record was ticked. */
  readonly lastWeeklyTickWeek?: number
}

export type Spe956PropagationGraphRecordsMap = Record<string, Spe956PersistedPropagationGraph>

type PlainRecord = Record<string, unknown>

function isPlainRecord(value: unknown): value is PlainRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeId(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

function normalizeLabel(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

function isNodeKind(value: unknown): value is Spe956PropagationGraphNodeKind {
  return (
    typeof value === 'string' &&
    (SPE_956_PROPAGATION_GRAPH_NODE_KINDS as readonly string[]).includes(value)
  )
}

function isNonNegativeFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isSafeMapKey(id: string): boolean {
  return id !== '__proto__' && id !== 'constructor' && id !== 'prototype'
}

function sanitizePositiveIntegerWeek(value: unknown): number | undefined {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 1 ||
    value !== Math.trunc(value)
  ) {
    return undefined
  }

  return value
}

function sanitizeSpreadFactor(value: unknown): number | undefined {
  if (value === undefined || value === null) {
    return undefined
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined
  }

  if (value < 0) {
    return 0
  }

  if (value > 1) {
    return 1
  }

  return value
}

function sanitizeSpe956PropagationGraphNodeEntry(value: unknown): Spe956PropagationGraphNode | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const id = normalizeId(value.id, '')
  const label = normalizeLabel(value.label, id)
  const entityId = normalizeId(value.entityId, '')
  if (id.length === 0 || label.length === 0 || entityId.length === 0 || !isNodeKind(value.kind)) {
    return null
  }

  return Object.freeze({
    id,
    label,
    kind: value.kind,
    entityId,
  })
}

function sanitizeSpe956PropagationGraphEdgeEntry(
  value: unknown,
  knownNodeIds: ReadonlySet<string>
): Spe956PropagationGraphEdge | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const id = normalizeId(value.id, '')
  const fromNodeId = normalizeId(value.fromNodeId, '')
  const toNodeId = normalizeId(value.toNodeId, '')
  if (
    id.length === 0 ||
    fromNodeId.length === 0 ||
    toNodeId.length === 0 ||
    !knownNodeIds.has(fromNodeId) ||
    !knownNodeIds.has(toNodeId)
  ) {
    return null
  }

  const spreadFactor = sanitizeSpreadFactor(value.spreadFactor)

  return Object.freeze({
    id,
    fromNodeId,
    toNodeId,
    ...(spreadFactor !== undefined ? { spreadFactor } : {}),
  })
}

function sanitizeSpe956PropagationGraphEntry(
  value: unknown
): Spe956PersistedPropagationGraph | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const id = normalizeId(value.id, '')
  const label = normalizeLabel(value.label, id)
  const seedNodeId = normalizeId(value.seedNodeId, '')
  if (id.length === 0 || !isSafeMapKey(id) || label.length === 0 || seedNodeId.length === 0) {
    return null
  }

  const nodes: Spe956PropagationGraphNode[] = []
  const seenNodeIds = new Set<string>()

  if (Array.isArray(value.nodes)) {
    for (const entry of value.nodes) {
      const node = sanitizeSpe956PropagationGraphNodeEntry(entry)
      if (!node || seenNodeIds.has(node.id)) {
        continue
      }

      seenNodeIds.add(node.id)
      nodes.push(node)
    }
  }

  if (nodes.length === 0 || !seenNodeIds.has(seedNodeId)) {
    return null
  }

  if (
    value.elapsedPropagationWeeks !== undefined &&
    !isNonNegativeFinite(value.elapsedPropagationWeeks)
  ) {
    return null
  }

  if (
    value.weeklyElapsedWeeksDelta !== undefined &&
    !isNonNegativeFinite(value.weeklyElapsedWeeksDelta)
  ) {
    return null
  }

  const lastWeeklyTickWeek = sanitizePositiveIntegerWeek(value.lastWeeklyTickWeek)
  if (value.lastWeeklyTickWeek !== undefined && lastWeeklyTickWeek === undefined) {
    return null
  }

  const knownNodeIds = new Set(nodes.map((node) => node.id))
  const edges: Spe956PropagationGraphEdge[] = []
  const seenEdgeIds = new Set<string>()

  if (Array.isArray(value.edges)) {
    for (const entry of value.edges) {
      const edge = sanitizeSpe956PropagationGraphEdgeEntry(entry, knownNodeIds)
      if (!edge || seenEdgeIds.has(edge.id)) {
        continue
      }

      seenEdgeIds.add(edge.id)
      edges.push(edge)
    }
  }

  return Object.freeze({
    id,
    label,
    seedNodeId,
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
    ...(value.elapsedPropagationWeeks !== undefined
      ? { elapsedPropagationWeeks: value.elapsedPropagationWeeks }
      : {}),
    ...(value.weeklyElapsedWeeksDelta !== undefined
      ? { weeklyElapsedWeeksDelta: value.weeklyElapsedWeeksDelta }
      : {}),
    ...(lastWeeklyTickWeek !== undefined ? { lastWeeklyTickWeek } : {}),
  })
}

/** Hydration: canonical authored graph map keyed by graph id. */
export function sanitizeSpe956PropagationGraphRecords(
  value: unknown,
  fallback: Spe956PropagationGraphRecordsMap = {}
): Spe956PropagationGraphRecordsMap {
  if (!isPlainRecord(value)) {
    return fallback
  }

  const next = Object.create(null) as Spe956PropagationGraphRecordsMap
  const seenIds = new Set<string>()

  for (const entry of Object.values(value)) {
    const record = sanitizeSpe956PropagationGraphEntry(entry)
    if (!record || seenIds.has(record.id)) {
      continue
    }

    seenIds.add(record.id)
    next[record.id] = record
  }

  // Plain-record input (including authored `{}`) wins over fallback so cleared
  // maps survive Zustand rehydration when current state still holds records.
  return next
}

export function extractSpe956PropagationGraphRecords(
  game: Partial<{ spe956PropagationGraphRecords?: Spe956PropagationGraphRecordsMap }>
): Spe956PropagationGraphRecordsMap {
  return game.spe956PropagationGraphRecords ?? {}
}

export function resolvePersistedPropagationGraph(
  game: Partial<{ spe956PropagationGraphRecords?: Spe956PropagationGraphRecordsMap }>,
  graphId: string
): Spe956PersistedPropagationGraph | null {
  if (!isSafeMapKey(graphId)) {
    return null
  }

  const records = extractSpe956PropagationGraphRecords(game)
  if (!Object.prototype.hasOwnProperty.call(records, graphId)) {
    return null
  }

  return records[graphId] ?? null
}

export interface Spe956PropagationGraphGameStateLike {
  readonly spe956PropagationGraphRecords?: Spe956PropagationGraphRecordsMap
  readonly visualTriggerHazardRecords?: VisualTriggerHazardRecordsMap
  readonly spe947PlatformRecords?: Parameters<typeof extractSpe947EvaluatorPersistenceMaps>[0]['spe947PlatformRecords']
  readonly spe947OperationRecords?: Parameters<typeof extractSpe947EvaluatorPersistenceMaps>[0]['spe947OperationRecords']
  readonly spe947ContentArtifacts?: Parameters<typeof extractSpe947EvaluatorPersistenceMaps>[0]['spe947ContentArtifacts']
  readonly spe947CounterMemeticPlans?: Parameters<typeof extractSpe947EvaluatorPersistenceMaps>[0]['spe947CounterMemeticPlans']
  readonly spe947ContentOwners?: Parameters<typeof extractSpe947EvaluatorPersistenceMaps>[0]['spe947ContentOwners']
  readonly spe947PostCaseMediaCases?: Parameters<typeof extractSpe947EvaluatorPersistenceMaps>[0]['spe947PostCaseMediaCases']
  readonly spe947FootageExposureBindings?: Parameters<typeof extractSpe947EvaluatorPersistenceMaps>[0]['spe947FootageExposureBindings']
  readonly spe947TakedownResistanceBindings?: Parameters<typeof extractSpe947EvaluatorPersistenceMaps>[0]['spe947TakedownResistanceBindings']
  readonly spe947VisualTriggerHazardBindings?: Parameters<typeof extractSpe947EvaluatorPersistenceMaps>[0]['spe947VisualTriggerHazardBindings']
}

/** Read helper: compose persisted graph + spe947* maps from GameState shape. */
export function composeSpe956PropagationGraphFromGameState(
  game: Partial<Spe956PropagationGraphGameStateLike>,
  graphId: string
): Spe956PropagationGraphComposeResult {
  return composeSpe956PropagationGraph({
    graph: resolvePersistedPropagationGraph(game, graphId),
    maps: extractSpe947EvaluatorPersistenceMaps(game),
    visualTriggerHazardRecords: game.visualTriggerHazardRecords ?? {},
  })
}

/** EXAMPLE persisted graph fixture (mirrors slice 1 authored graph). */
export const SPE_956_EXAMPLE_PROPAGATION_GRAPH_RECORDS: Spe956PropagationGraphRecordsMap =
  Object.freeze({
    [SPE_956_EXAMPLE_PROPAGATION_GRAPH.id]: SPE_956_EXAMPLE_PROPAGATION_GRAPH,
  })
