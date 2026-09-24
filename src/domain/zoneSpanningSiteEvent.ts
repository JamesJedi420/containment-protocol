/**
 * SPE-3001 — one zone-spanning record over the SPE-2994 facility walk.
 *
 * Origin, affected zones, and the adjacency rule are separate fields. The
 * only rule calls `propagateSiteEventOverFacilityTopology`. Site-wide is a
 * flag on the record. The pulse is a pure week-index phase. This module does
 * not author edges, persist GameState, or register week-close.
 */

import { propagateSiteEventOverFacilityTopology } from './siteEventTopologyPropagation'
import type { BoundedSiteEvent, FacilityTopologyReference } from './siteEventTopologyPropagation'

export const ZONE_SPANNING_PROPAGATION_RULE = 'spatial_adjacency' as const
export type ZoneSpanningPropagationRule = typeof ZONE_SPANNING_PROPAGATION_RULE

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

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0
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
