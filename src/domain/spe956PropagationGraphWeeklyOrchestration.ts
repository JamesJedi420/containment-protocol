/**
 * SPE-2624 / SPE-956 slice 3: weekly orchestration for persisted propagation graph records.
 *
 * Pure deterministic week-close tick:
 * - Apply optional authored weeklyElapsedWeeksDelta to elapsedPropagationWeeks
 *
 * Does not mutate mid-week, invent graph growth, or wire UI/store.
 */

import type {
  Spe956PersistedPropagationGraph,
  Spe956PropagationGraphRecordsMap,
} from './spe956PropagationGraphPersistence'
import { extractSpe956PropagationGraphRecords } from './spe956PropagationGraphPersistence'

function normalizeWeek(week: number): number {
  if (!Number.isFinite(week)) {
    return 1
  }

  return Math.max(1, Math.trunc(week))
}

function isNonNegativeFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function freezeGraph(
  graph: Spe956PersistedPropagationGraph
): Spe956PersistedPropagationGraph {
  return Object.freeze({ ...graph })
}

/** True when at least one authored weekly delta field is present. */
export function hasSpe956PropagationGraphWeeklyDelta(
  graph: Pick<Spe956PersistedPropagationGraph, 'weeklyElapsedWeeksDelta'>
): boolean {
  return isNonNegativeFinite(graph.weeklyElapsedWeeksDelta)
}

/**
 * Advances one persisted graph record for the simulation week.
 * Returns the same reference when no delta authored, already ticked this week, or unchanged.
 */
export function advanceSpe956PropagationGraphForWeek(
  graph: Spe956PersistedPropagationGraph,
  week: number
): Spe956PersistedPropagationGraph {
  const normalizedWeek = normalizeWeek(week)
  if (!hasSpe956PropagationGraphWeeklyDelta(graph)) {
    return graph
  }

  if (graph.lastWeeklyTickWeek === normalizedWeek) {
    return graph
  }

  const priorElapsedWeeks = graph.elapsedPropagationWeeks ?? 0
  const nextElapsedWeeks = priorElapsedWeeks + graph.weeklyElapsedWeeksDelta!

  if (nextElapsedWeeks === priorElapsedWeeks) {
    return freezeGraph({
      ...graph,
      lastWeeklyTickWeek: normalizedWeek,
    })
  }

  return freezeGraph({
    ...graph,
    elapsedPropagationWeeks: nextElapsedWeeks,
    lastWeeklyTickWeek: normalizedWeek,
  })
}

function applyGraphMapTick(
  records: Spe956PropagationGraphRecordsMap,
  week: number
): Spe956PropagationGraphRecordsMap {
  const graphIds = Object.keys(records)
  if (graphIds.length === 0) {
    return records
  }

  const next: Spe956PropagationGraphRecordsMap = { ...records }
  let changed = false

  for (const graphId of graphIds.sort((left, right) => left.localeCompare(right))) {
    const graph = records[graphId]
    if (!graph) {
      continue
    }

    const advanced = advanceSpe956PropagationGraphForWeek(graph, week)
    if (advanced !== graph) {
      next[graphId] = advanced
      changed = true
    }
  }

  return changed ? next : records
}

/**
 * Applies one weekly orchestration pass over persisted propagation graph records.
 * Empty maps are a no-op. Re-applying after advance is idempotent for the same week.
 * Returns the same map reference when no nested field changes.
 */
export function applyWeeklySpe956PropagationGraphTick(
  records: Spe956PropagationGraphRecordsMap | null | undefined,
  week: number
): Spe956PropagationGraphRecordsMap {
  if (records == null) {
    return extractSpe956PropagationGraphRecords({})
  }

  return applyGraphMapTick(records, normalizeWeek(week))
}
