/**
 * SPE-3001 — one zone-spanning record over the SPE-2994 facility walk.
 * SPE-3002 — one airflow rule on that record.
 * SPE-3003 — one visibility rule on that record.
 * SPE-3004 — one panic rule on that record.
 * SPE-3005 — one alarm rule on that record.
 * SPE-3006 — one contamination rule on that record.
 * SPE-3007 — one route-link rule on that record.
 * SPE-3010 — one apply that sets site-wide affected state from `full_site_alert`.
 * SPE-3012 — one hazard event-kind token on that record.
 * SPE-3013 — one hostile event-kind token beside that hazard kind.
 * SPE-3014 — one social event-kind token beside those kinds.
 * SPE-3015 — spread success copies an existing eventKind.
 * SPE-3016 — full-site-alert success copies an existing eventKind.
 *
 * Origin, affected zones, and the propagation rule are separate fields.
 * Adjacency calls `propagateSiteEventOverFacilityTopology`. Airflow,
 * visibility, panic, alarm, contamination, and route link each read an
 * optional source on the raw topology and cross only existing
 * `spatial_adjacency` edges.
 * Site-wide affected state is `siteWide` on the record. SPE-3010 sets it
 * only when `readFullSiteAlertStage` returns `full_site_alert`.
 * The pulse is a pure week-index phase.
 * This module does not author edges, persist GameState, or register week-close.
 */

import {
  queryDirectSpatialAdjacency,
  readProductionFacilitySectionGraph,
  validateFacilitySectionTopology,
  type FacilitySectionGraph,
} from './facilitySectionGraph'
import { readFullSiteAlertStage } from './siteAlertStage'
import { propagateSiteEventOverFacilityTopology } from './siteEventTopologyPropagation'
import type { BoundedSiteEvent, FacilityTopologyReference } from './siteEventTopologyPropagation'

export const ZONE_SPANNING_PROPAGATION_RULE = 'spatial_adjacency' as const
export const ZONE_SPANNING_AIRFLOW_RULE = 'airflow' as const
export const ZONE_SPANNING_VISIBILITY_RULE = 'visibility' as const
export const ZONE_SPANNING_PANIC_RULE = 'panic' as const
export const ZONE_SPANNING_ALARM_RULE = 'alarm' as const
export const ZONE_SPANNING_CONTAMINATION_RULE = 'contamination' as const
export const ZONE_SPANNING_ROUTE_LINK_RULE = 'route_link' as const
export const ZONE_SPANNING_HAZARD_KIND = 'hazard' as const
export const ZONE_SPANNING_HOSTILE_KIND = 'hostile' as const
export const ZONE_SPANNING_SOCIAL_KIND = 'social' as const
export const ZONE_SPANNING_PROPAGATION_RULES = [
  ZONE_SPANNING_PROPAGATION_RULE,
  ZONE_SPANNING_AIRFLOW_RULE,
  ZONE_SPANNING_VISIBILITY_RULE,
  ZONE_SPANNING_PANIC_RULE,
  ZONE_SPANNING_ALARM_RULE,
  ZONE_SPANNING_CONTAMINATION_RULE,
  ZONE_SPANNING_ROUTE_LINK_RULE,
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
  readonly eventKind?:
    | typeof ZONE_SPANNING_HAZARD_KIND
    | typeof ZONE_SPANNING_HOSTILE_KIND
    | typeof ZONE_SPANNING_SOCIAL_KIND
  readonly pulse: ZoneSpanningPulseConfig
}

type TopologyPairField =
  'airflow' | 'visibility' | 'panic' | 'alarm' | 'contamination' | 'route_link'

interface TopologyPair {
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
 * Optional `airflow`, `visibility`, `panic`, `alarm`, `contamination`, or `route_link` pairs on an authored topology.
 * Production reads and a missing or malformed list are a missing source.
 */
function readAuthoredPairs(
  topologyReference: FacilityTopologyReference,
  field: TopologyPairField
): readonly TopologyPair[] | null {
  if (topologyReference.source !== 'authored') return null
  const topology = topologyReference.topology
  if (!isRecord(topology) || !Object.prototype.hasOwnProperty.call(topology, field)) return null
  const list = topology[field]
  if (!Array.isArray(list) || list.length === 0) return null
  const pairs: TopologyPair[] = []
  for (const entry of list) {
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
 * Nodes reached from the origin along pairs that are already spatial edges.
 * An empty allowed set is a missing source.
 */
function pairReach(
  graph: FacilitySectionGraph,
  originNodeId: string,
  pairs: readonly TopologyPair[],
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

function reservedEventKind(
  record: ZoneSpanningSiteEventRecord
): ZoneSpanningSiteEventRecord['eventKind'] {
  if (record.eventKind === ZONE_SPANNING_HAZARD_KIND) return record.eventKind
  if (record.eventKind === ZONE_SPANNING_HOSTILE_KIND) return record.eventKind
  if (record.eventKind === ZONE_SPANNING_SOCIAL_KIND) return record.eventKind
  return undefined
}

function freezeRecord(
  record: ZoneSpanningSiteEventRecord,
  affectedNodeIds: readonly string[],
  propagationRule: ZoneSpanningPropagationRule
): ZoneSpanningSiteEventRecord {
  const eventKind = reservedEventKind(record)
  return Object.freeze({
    eventId: record.eventId,
    originNodeId: record.originNodeId,
    affectedNodeIds: Object.freeze(affectedNodeIds),
    propagationRule,
    siteWide: record.siteWide,
    ...(eventKind === undefined ? {} : { eventKind }),
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
  return freezeRecord(record, affectedNodeIds, ZONE_SPANNING_PROPAGATION_RULE)
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

  const pairs = readAuthoredPairs(topologyReference, 'airflow')
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
  const reached = pairReach(graph, record.originNodeId, pairs, maxHops)
  if (!reached) return record

  return freezeRecord(record, reached, ZONE_SPANNING_AIRFLOW_RULE)
}

/**
 * Spread one record along visibility pairs that are already spatial edges.
 * A missing source returns the same record and does not write affected ids.
 */
export function applyZoneSpanningVisibility(
  record: ZoneSpanningSiteEventRecord,
  topologyReference: FacilityTopologyReference,
  maxHops: number
): ZoneSpanningSiteEventRecord {
  if (record.propagationRule !== ZONE_SPANNING_VISIBILITY_RULE) return record
  if (topologyReference.source === 'production') {
    readProductionFacilitySectionGraph()
    return record
  }

  const pairs = readAuthoredPairs(topologyReference, 'visibility')
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
  const reached = pairReach(graph, record.originNodeId, pairs, maxHops)
  if (!reached) return record

  return freezeRecord(record, reached, ZONE_SPANNING_VISIBILITY_RULE)
}

/**
 * Spread one record along panic pairs that are already spatial edges.
 * A missing source returns the same record and does not write affected ids.
 */
export function applyZoneSpanningPanic(
  record: ZoneSpanningSiteEventRecord,
  topologyReference: FacilityTopologyReference,
  maxHops: number
): ZoneSpanningSiteEventRecord {
  if (record.propagationRule !== ZONE_SPANNING_PANIC_RULE) return record
  if (topologyReference.source === 'production') {
    readProductionFacilitySectionGraph()
    return record
  }

  const pairs = readAuthoredPairs(topologyReference, 'panic')
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
  const reached = pairReach(graph, record.originNodeId, pairs, maxHops)
  if (!reached) return record

  return freezeRecord(record, reached, ZONE_SPANNING_PANIC_RULE)
}

/**
 * Spread one record along alarm pairs that are already spatial edges.
 * A missing source returns the same record and does not write affected ids.
 */
export function applyZoneSpanningAlarm(
  record: ZoneSpanningSiteEventRecord,
  topologyReference: FacilityTopologyReference,
  maxHops: number
): ZoneSpanningSiteEventRecord {
  if (record.propagationRule !== ZONE_SPANNING_ALARM_RULE) return record
  if (topologyReference.source === 'production') {
    readProductionFacilitySectionGraph()
    return record
  }

  const pairs = readAuthoredPairs(topologyReference, 'alarm')
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
  const reached = pairReach(graph, record.originNodeId, pairs, maxHops)
  if (!reached) return record

  return freezeRecord(record, reached, ZONE_SPANNING_ALARM_RULE)
}

/**
 * Spread one record along contamination pairs that are already spatial edges.
 * A missing source returns the same record and does not write affected ids.
 */
export function applyZoneSpanningContamination(
  record: ZoneSpanningSiteEventRecord,
  topologyReference: FacilityTopologyReference,
  maxHops: number
): ZoneSpanningSiteEventRecord {
  if (record.propagationRule !== ZONE_SPANNING_CONTAMINATION_RULE) return record
  if (topologyReference.source === 'production') {
    readProductionFacilitySectionGraph()
    return record
  }

  const pairs = readAuthoredPairs(topologyReference, 'contamination')
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
  const reached = pairReach(graph, record.originNodeId, pairs, maxHops)
  if (!reached) return record

  return freezeRecord(record, reached, ZONE_SPANNING_CONTAMINATION_RULE)
}

/**
 * Spread one record along route-link pairs that are already spatial edges.
 * A missing source returns the same record and does not write affected ids.
 */
export function applyZoneSpanningRouteLink(
  record: ZoneSpanningSiteEventRecord,
  topologyReference: FacilityTopologyReference,
  maxHops: number
): ZoneSpanningSiteEventRecord {
  if (record.propagationRule !== ZONE_SPANNING_ROUTE_LINK_RULE) return record
  if (topologyReference.source === 'production') {
    readProductionFacilitySectionGraph()
    return record
  }

  const pairs = readAuthoredPairs(topologyReference, 'route_link')
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
  const reached = pairReach(graph, record.originNodeId, pairs, maxHops)
  if (!reached) return record

  return freezeRecord(record, reached, ZONE_SPANNING_ROUTE_LINK_RULE)
}

/**
 * Stamp event kind `hazard` on one record.
 * A missing or unknown kind returns the same record. An existing `hazard`,
 * `hostile`, or `social` kind returns the same record. This does not add a
 * propagation rule.
 */
export function applyZoneSpanningHazardKind(
  record: ZoneSpanningSiteEventRecord,
  kind: unknown
): ZoneSpanningSiteEventRecord {
  if (kind !== ZONE_SPANNING_HAZARD_KIND) return record
  if (record.eventKind === ZONE_SPANNING_HAZARD_KIND) return record
  if (record.eventKind === ZONE_SPANNING_HOSTILE_KIND) return record
  if (record.eventKind === ZONE_SPANNING_SOCIAL_KIND) return record
  return Object.freeze({
    eventId: record.eventId,
    originNodeId: record.originNodeId,
    affectedNodeIds: record.affectedNodeIds,
    propagationRule: record.propagationRule,
    siteWide: record.siteWide,
    eventKind: ZONE_SPANNING_HAZARD_KIND,
    pulse: Object.freeze({
      activeWeekCount: record.pulse.activeWeekCount,
      returnAfterWeekCount: record.pulse.returnAfterWeekCount,
    }),
  })
}

/**
 * Stamp event kind `hostile` on one record.
 * A missing or unknown kind returns the same record. An existing `hazard`,
 * `hostile`, or `social` kind returns the same record. This does not add a
 * propagation rule.
 */
export function applyZoneSpanningHostileKind(
  record: ZoneSpanningSiteEventRecord,
  kind: unknown
): ZoneSpanningSiteEventRecord {
  if (kind !== ZONE_SPANNING_HOSTILE_KIND) return record
  if (record.eventKind === ZONE_SPANNING_HAZARD_KIND) return record
  if (record.eventKind === ZONE_SPANNING_HOSTILE_KIND) return record
  if (record.eventKind === ZONE_SPANNING_SOCIAL_KIND) return record
  return Object.freeze({
    eventId: record.eventId,
    originNodeId: record.originNodeId,
    affectedNodeIds: record.affectedNodeIds,
    propagationRule: record.propagationRule,
    siteWide: record.siteWide,
    eventKind: ZONE_SPANNING_HOSTILE_KIND,
    pulse: Object.freeze({
      activeWeekCount: record.pulse.activeWeekCount,
      returnAfterWeekCount: record.pulse.returnAfterWeekCount,
    }),
  })
}

/**
 * Stamp event kind `social` on one record.
 * A missing or unknown kind returns the same record. An existing `hazard`,
 * `hostile`, or `social` kind returns the same record. This does not add a
 * propagation rule.
 */
export function applyZoneSpanningSocialKind(
  record: ZoneSpanningSiteEventRecord,
  kind: unknown
): ZoneSpanningSiteEventRecord {
  if (kind !== ZONE_SPANNING_SOCIAL_KIND) return record
  if (record.eventKind === ZONE_SPANNING_HAZARD_KIND) return record
  if (record.eventKind === ZONE_SPANNING_HOSTILE_KIND) return record
  if (record.eventKind === ZONE_SPANNING_SOCIAL_KIND) return record
  return Object.freeze({
    eventId: record.eventId,
    originNodeId: record.originNodeId,
    affectedNodeIds: record.affectedNodeIds,
    propagationRule: record.propagationRule,
    siteWide: record.siteWide,
    eventKind: ZONE_SPANNING_SOCIAL_KIND,
    pulse: Object.freeze({
      activeWeekCount: record.pulse.activeWeekCount,
      returnAfterWeekCount: record.pulse.returnAfterWeekCount,
    }),
  })
}

/**
 * Set site-wide affected state only when the SPE-3008 stage qualifies.
 * A null read returns the same record. This does not add a propagation rule.
 * SPE-3016 copies an existing hazard, hostile, or social kind onto that freeze.
 */
export function applyZoneSpanningFullSiteAlert(
  record: ZoneSpanningSiteEventRecord,
  stage: unknown
): ZoneSpanningSiteEventRecord {
  if (readFullSiteAlertStage(stage) === null) return record
  const eventKind = reservedEventKind(record)
  return Object.freeze({
    eventId: record.eventId,
    originNodeId: record.originNodeId,
    affectedNodeIds: record.affectedNodeIds,
    propagationRule: record.propagationRule,
    siteWide: true,
    ...(eventKind === undefined ? {} : { eventKind }),
    pulse: Object.freeze({
      activeWeekCount: record.pulse.activeWeekCount,
      returnAfterWeekCount: record.pulse.returnAfterWeekCount,
    }),
  })
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
