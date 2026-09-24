/**
 * SPE-3001 — one zone-spanning record over the SPE-2994 facility walk.
 * SPE-3002 — one airflow rule on that record.
 *
 * Origin, affected zones, and the propagation rule are separate fields.
 * Adjacency calls `propagateSiteEventOverFacilityTopology`. Airflow reads an
 * optional source on the raw topology and crosses only existing
 * `spatial_adjacency` edges. Site-wide is a flag on the record. The pulse is
 * a pure week-index phase. This module does not author edges, persist
 * GameState, or register week-close.
 */

import {
  queryDirectSpatialAdjacency,
  readProductionFacilitySectionGraph,
  validateFacilitySectionTopology,
  type FacilitySectionGraph,
} from './facilitySectionGraph'
import { propagateSiteEventOverFacilityTopology } from './siteEventTopologyPropagation'
import type { BoundedSiteEvent, FacilityTopologyReference } from './siteEventTopologyPropagation'

export const ZONE_SPANNING_PROPAGATION_RULE = 'spatial_adjacency' as const
export const ZONE_SPANNING_AIRFLOW_RULE = 'airflow' as const
export const ZONE_SPANNING_PROPAGATION_RULES = [
  ZONE_SPANNING_PROPAGATION_RULE,
  ZONE_SPANNING_AIRFLOW_RULE,
] as const
export type ZoneSpanningPropagationRule = (typeof ZONE_SPANNING_PROPAGATION_RULES)[number]

export const ZONE_SPANNING_PULSE_PHASES = ['active', 'subsided', 'inactive'] as const
export type ZoneSpanningPulsePhase = (typeof ZONE_SPANNING_PULSE_PHASES)[number]

export interface ZoneSpanningPulseConfig {
  /** Weeks the pulse stays active at the start of each period. */
  readonly activeWeekCount: number
  /** Quiet weeks after the active span before the pulse returns. */
  readonly returnAfterWeekCount: number
}

export interface ZoneSpanningSiteEventRecord {
  readonly eventId: string
  readonly originNodeId: string
  readonly affectedNodeIds: readonly string[]
  readonly propagationRule: ZoneSpanningPropagationRule
  readonly siteWide: boolean
  readonly pulse: ZoneSpanningPulseConfig
}

interface AirflowPair {
  readonly fromNodeId: string
  readonly toNodeId: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0
}

function canonicalEdgeKey(left: string, right: string): string {
  return left < right ? `${left}|${right}` : `${right}|${left}`
}

function otherEndpoint(fromNodeId: string, toNodeId: string, nodeId: string): string | undefined {
  if (fromNodeId === nodeId) return toNodeId
  if (toNodeId === nodeId) return fromNodeId
  return undefined
}

/**
 * Optional `airflow` pairs on an authored topology. Production reads and a
 * missing or malformed list are a missing source.
 */
function readAirflowPairs(
  topologyReference: FacilityTopologyReference
): readonly AirflowPair[] | null {
  if (topologyReference.source !== 'authored') return null
  const topology = topologyReference.topology
  if (!isRecord(topology) || !Object.prototype.hasOwnProperty.call(topology, 'airflow')) return null
  if (!Array.isArray(topology.airflow) || topology.airflow.length === 0) return null
  const pairs: AirflowPair[] = []
  for (const entry of topology.airflow) {
    if (!isRecord(entry)) return null
    if (typeof entry.fromNodeId !== 'string' || typeof entry.toNodeId !== 'string') return null
    if (entry.fromNodeId.length === 0 || entry.toNodeId.length === 0) return null
    pairs.push({ fromNodeId: entry.fromNodeId, toNodeId: entry.toNodeId })
  }
  return pairs
}

function validatedGraph(
  topologyReference: FacilityTopologyReference
): FacilitySectionGraph | undefined {
  if (topologyReference.source !== 'authored') return undefined
  const validated = validateFacilitySectionTopology(topologyReference.topology)
  return validated.ok ? validated.graph : undefined
}

/**
 * Nodes reached from the origin along airflow pairs that are already spatial edges.
 * An empty allowed set is a missing source.
 */
function airflowReach(
  graph: FacilitySectionGraph,
  originNodeId: string,
  pairs: readonly AirflowPair[],
  maxHops: number
): readonly string[] | null {
  const allowed = new Set<string>()
  for (const pair of pairs) {
    if (!queryDirectSpatialAdjacency(graph, pair.fromNodeId, pair.toNodeId)) continue
    allowed.add(canonicalEdgeKey(pair.fromNodeId, pair.toNodeId))
  }
  if (allowed.size === 0) return null

  const affected: string[] = []
  const seen = new Set<string>([originNodeId])
  const queue: { readonly nodeId: string; readonly hops: number }[] = [
    { nodeId: originNodeId, hops: 0 },
  ]

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index]
    if (!current || current.hops >= maxHops) continue
    for (const edge of graph.edges) {
      const nextNodeId = otherEndpoint(edge.fromNodeId, edge.toNodeId, current.nodeId)
      if (!nextNodeId) continue
      if (!allowed.has(canonicalEdgeKey(edge.fromNodeId, edge.toNodeId))) continue
      if (seen.has(nextNodeId)) continue
      seen.add(nextNodeId)
      affected.push(nextNodeId)
      queue.push({ nodeId: nextNodeId, hops: current.hops + 1 })
    }
  }

  return affected
}

function freezeRecord(
  record: ZoneSpanningSiteEventRecord,
  affectedNodeIds: readonly string[],
  propagationRule: ZoneSpanningPropagationRule
): ZoneSpanningSiteEventRecord {
  return Object.freeze({
    eventId: record.eventId,
    originNodeId: record.originNodeId,
    affectedNodeIds: Object.freeze(affectedNodeIds),
    propagationRule,
    siteWide: record.siteWide,
    pulse: Object.freeze({
      activeWeekCount: record.pulse.activeWeekCount,
      returnAfterWeekCount: record.pulse.returnAfterWeekCount,
    }),
  })
}

function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0
}

/**
 * Spread one record across authoritative `spatial_adjacency` edges.
 * Failure returns the same record. Success writes affected ids with the origin removed.
 */
export function applyZoneSpanningAdjacency(
  record: ZoneSpanningSiteEventRecord,
  topologyReference: FacilityTopologyReference,
  maxHops: number
): ZoneSpanningSiteEventRecord {
  if (record.propagationRule !== ZONE_SPANNING_PROPAGATION_RULE) return record

  const event: BoundedSiteEvent = {
    eventId: record.eventId,
    originNodeId: record.originNodeId,
    maxHops,
    affectedNodeIds: record.affectedNodeIds,
  }
  const result = propagateSiteEventOverFacilityTopology(event, topologyReference)
  if (!result.ok) return record

  const affectedNodeIds = result.affectedNodeIds.filter((nodeId) => nodeId !== record.originNodeId)
  return Object.freeze({
    eventId: record.eventId,
    originNodeId: record.originNodeId,
    affectedNodeIds: Object.freeze(affectedNodeIds),
    propagationRule: ZONE_SPANNING_PROPAGATION_RULE,
    siteWide: record.siteWide,
    pulse: Object.freeze({
      activeWeekCount: record.pulse.activeWeekCount,
      returnAfterWeekCount: record.pulse.returnAfterWeekCount,
    }),
  })
}

/**
 * Spread one record along airflow pairs that are already spatial edges.
 * A missing source returns the same record and does not write affected ids.
 */
export function applyZoneSpanningAirflow(
  record: ZoneSpanningSiteEventRecord,
  topologyReference: FacilityTopologyReference,
  maxHops: number
): ZoneSpanningSiteEventRecord {
  if (record.propagationRule !== ZONE_SPANNING_AIRFLOW_RULE) return record
  if (topologyReference.source === 'production') {
    readProductionFacilitySectionGraph()
    return record
  }

  const pairs = readAirflowPairs(topologyReference)
  if (!pairs) return record

  const event: BoundedSiteEvent = {
    eventId: record.eventId,
    originNodeId: record.originNodeId,
    maxHops,
    affectedNodeIds: record.affectedNodeIds,
  }
  const validated = propagateSiteEventOverFacilityTopology(event, topologyReference)
  if (!validated.ok) return record

  const graph = validatedGraph(topologyReference)
  if (!graph) return record
  const reached = airflowReach(graph, record.originNodeId, pairs, maxHops)
  if (!reached) return record

  return freezeRecord(record, reached, ZONE_SPANNING_AIRFLOW_RULE)
}

/**
 * Active, then subsided, then active again after `returnAfterWeekCount` quiet weeks.
 * A non-integer week index or a non-positive cadence is inactive.
 */
export function resolveZoneSpanningPulse(
  record: ZoneSpanningSiteEventRecord,
  weekIndex: number
): ZoneSpanningPulsePhase {
  if (!isNonNegativeInteger(weekIndex)) return 'inactive'
  if (!isPositiveInteger(record.pulse.activeWeekCount)) return 'inactive'
  if (!isPositiveInteger(record.pulse.returnAfterWeekCount)) return 'inactive'

  const period = record.pulse.activeWeekCount + record.pulse.returnAfterWeekCount
  const phase = weekIndex % period
  if (phase < record.pulse.activeWeekCount) return 'active'
  return 'subsided'
}
