/**
 * SPE-3009 — route-bound historical replay over SPE-1392 memory.
 *
 * This is a narrow SPE-1606 propagation child. It consumes only an active
 * historical/nonlocal path resolved by SPE-1392. It does not read facility
 * adjacency, SPE-3007 route_link pairs, actor possession, role assignment,
 * pathfinding, or teleportation.
 */

import {
  resolveActiveHistoricalRoutePath,
  type HistoricalRouteMemoryGraph,
  type HistoricalRoutePath,
} from './historicalRouteMemory'

export const HISTORICAL_ROUTE_REPLAY_FAMILY = 'historical_route' as const

export const HISTORICAL_ROUTE_REPLAY_PHASES = [
  'approaching',
  'traversing',
  'terminal',
  'ended',
] as const
export type HistoricalRouteReplayPhase = (typeof HISTORICAL_ROUTE_REPLAY_PHASES)[number]

export const HISTORICAL_ROUTE_EXPOSURE_STATES = ['contact', 'post_contact'] as const
export type HistoricalRouteExposureState = (typeof HISTORICAL_ROUTE_EXPOSURE_STATES)[number]

export const HISTORICAL_ROUTE_OBSERVATION_STATES = ['external', 'altered'] as const
export type HistoricalRouteObservationState =
  (typeof HISTORICAL_ROUTE_OBSERVATION_STATES)[number]

export const HISTORICAL_ROUTE_CAUSAL_CLASSIFICATION = 'unresolved' as const

export interface HistoricalRouteObserverExposure {
  readonly observerId: string
  readonly contactAnchorId: string
  readonly exposureState: HistoricalRouteExposureState
  readonly observationState: HistoricalRouteObservationState
}

export interface HistoricalRouteOrdinaryConsequence {
  readonly consequenceId: string
  readonly kind: string
  readonly subjectId?: string
  readonly persistence: 'ordinary_world'
}

export interface HistoricalRouteReplayRecord {
  readonly eventId: string
  readonly propagationFamily: typeof HISTORICAL_ROUTE_REPLAY_FAMILY
  readonly activationId: string
  readonly originAnchorId: string
  readonly currentAnchorId: string
  readonly terminalAnchorId: string
  readonly routeAnchorIds: readonly string[]
  readonly routeEdgeIds: readonly string[]
  readonly currentRouteIndex: number
  readonly traversedAnchorIds: readonly string[]
  readonly traversedEdgeIds: readonly string[]
  readonly affectedAnchorIds: readonly string[]
  readonly exposedAnchorIds: readonly string[]
  readonly phase: HistoricalRouteReplayPhase
  readonly observerExposures: readonly HistoricalRouteObserverExposure[]
  readonly ordinaryConsequence: HistoricalRouteOrdinaryConsequence | null
  readonly causalClassification: typeof HISTORICAL_ROUTE_CAUSAL_CLASSIFICATION
}

export interface HistoricalRouteReplayConfig {
  readonly eventId: string
  readonly activationId: string
  readonly originAnchorId: string
  readonly terminalAnchorId: string
}

export interface HistoricalRouteOrdinaryConsequenceInput {
  readonly consequenceId: string
  readonly kind: string
  readonly subjectId?: string
}

function validId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function freezeExposure(
  exposure: HistoricalRouteObserverExposure
): HistoricalRouteObserverExposure {
  return Object.freeze({ ...exposure })
}

function freezeConsequence(
  consequence: HistoricalRouteOrdinaryConsequence
): HistoricalRouteOrdinaryConsequence {
  return Object.freeze({ ...consequence })
}

function freezeReplay(record: HistoricalRouteReplayRecord): HistoricalRouteReplayRecord {
  return Object.freeze({
    ...record,
    routeAnchorIds: Object.freeze([...record.routeAnchorIds]),
    routeEdgeIds: Object.freeze([...record.routeEdgeIds]),
    traversedAnchorIds: Object.freeze([...record.traversedAnchorIds]),
    traversedEdgeIds: Object.freeze([...record.traversedEdgeIds]),
    affectedAnchorIds: Object.freeze([...record.affectedAnchorIds]),
    exposedAnchorIds: Object.freeze([...record.exposedAnchorIds]),
    observerExposures: Object.freeze(record.observerExposures.map(freezeExposure)),
    ordinaryConsequence: record.ordinaryConsequence
      ? freezeConsequence(record.ordinaryConsequence)
      : null,
  })
}

function isResolvedReplayPath(
  path: HistoricalRoutePath,
  config: HistoricalRouteReplayConfig
): boolean {
  return (
    path.anchorIds.length >= 2 &&
    path.edgeIds.length === path.anchorIds.length - 1 &&
    path.anchorIds[0] === config.originAnchorId &&
    path.anchorIds[path.anchorIds.length - 1] === config.terminalAnchorId
  )
}

/**
 * Begin one route-bound historical replay.
 *
 * Missing/inactive historical route data fails closed as undefined. There is
 * deliberately no fallback to facility adjacency or SPE-3007 route_link.
 */
export function createHistoricalRouteReplay(
  graph: HistoricalRouteMemoryGraph,
  config: HistoricalRouteReplayConfig
): HistoricalRouteReplayRecord | undefined {
  if (
    !validId(config.eventId) ||
    !validId(config.activationId) ||
    !validId(config.originAnchorId) ||
    !validId(config.terminalAnchorId) ||
    config.originAnchorId === config.terminalAnchorId
  ) {
    return undefined
  }

  const path = resolveActiveHistoricalRoutePath(
    graph,
    config.activationId,
    config.originAnchorId,
    config.terminalAnchorId
  )
  if (!path || !isResolvedReplayPath(path, config)) return undefined

  return freezeReplay({
    eventId: config.eventId,
    propagationFamily: HISTORICAL_ROUTE_REPLAY_FAMILY,
    activationId: config.activationId,
    originAnchorId: config.originAnchorId,
    currentAnchorId: config.originAnchorId,
    terminalAnchorId: config.terminalAnchorId,
    routeAnchorIds: path.anchorIds,
    routeEdgeIds: path.edgeIds,
    currentRouteIndex: 0,
    traversedAnchorIds: [config.originAnchorId],
    traversedEdgeIds: [],
    affectedAnchorIds: [config.originAnchorId],
    exposedAnchorIds: [],
    phase: 'approaching',
    observerExposures: [],
    ordinaryConsequence: null,
    causalClassification: HISTORICAL_ROUTE_CAUSAL_CLASSIFICATION,
  })
}

/**
 * Cross the explicit contact/interception threshold at the event's current
 * route position. This records exposure only; it does not move, possess, cast,
 * rename, or otherwise override the observer.
 */
export function interceptHistoricalRouteReplay(
  record: HistoricalRouteReplayRecord,
  observerId: string,
  observerAnchorId: string
): HistoricalRouteReplayRecord {
  if (!validId(observerId) || !validId(observerAnchorId)) return record
  if (record.phase !== 'approaching' && record.phase !== 'traversing') return record
  if (observerAnchorId !== record.currentAnchorId) return record
  if (record.observerExposures.some((exposure) => exposure.observerId === observerId)) {
    return record
  }

  return freezeReplay({
    ...record,
    exposedAnchorIds: record.exposedAnchorIds.includes(observerAnchorId)
      ? record.exposedAnchorIds
      : [...record.exposedAnchorIds, observerAnchorId],
    observerExposures: [
      ...record.observerExposures,
      {
        observerId,
        contactAnchorId: observerAnchorId,
        exposureState: 'contact',
        observationState: 'external',
      },
    ],
  })
}

/**
 * Expose one stronger post-contact observation state without changing route
 * progression or assigning a historical identity/role to the observer.
 */
export function revealHistoricalRoutePostContactObservation(
  record: HistoricalRouteReplayRecord,
  observerId: string
): HistoricalRouteReplayRecord {
  if (!validId(observerId)) return record

  let changed = false
  const observerExposures = record.observerExposures.map((exposure) => {
    if (exposure.observerId !== observerId || exposure.exposureState !== 'contact') {
      return exposure
    }

    changed = true
    return freezeExposure({
      ...exposure,
      exposureState: 'post_contact',
      observationState: 'altered',
    })
  })

  return changed ? freezeReplay({ ...record, observerExposures }) : record
}

/**
 * Advance exactly one ordered SPE-1392 route edge.
 *
 * The event never chooses a new edge here. Its route was fixed by the
 * authoritative historical path at creation.
 */
export function advanceHistoricalRouteReplay(
  record: HistoricalRouteReplayRecord
): HistoricalRouteReplayRecord {
  if (record.phase === 'terminal' || record.phase === 'ended') return record

  const nextRouteIndex = record.currentRouteIndex + 1
  const nextAnchorId = record.routeAnchorIds[nextRouteIndex]
  const traversedEdgeId = record.routeEdgeIds[record.currentRouteIndex]
  if (!nextAnchorId || !traversedEdgeId) return record

  const terminal = nextAnchorId === record.terminalAnchorId
  return freezeReplay({
    ...record,
    currentAnchorId: nextAnchorId,
    currentRouteIndex: nextRouteIndex,
    traversedAnchorIds: [...record.traversedAnchorIds, nextAnchorId],
    traversedEdgeIds: [...record.traversedEdgeIds, traversedEdgeId],
    affectedAnchorIds: [...record.affectedAnchorIds, nextAnchorId],
    phase: terminal ? 'terminal' : 'traversing',
  })
}

/**
 * Close a replay at its configured historical terminal location and emit one
 * ordinary-world consequence record. Causality remains explicitly unresolved.
 */
export function resolveHistoricalRouteReplayTerminal(
  record: HistoricalRouteReplayRecord,
  consequence: HistoricalRouteOrdinaryConsequenceInput
): HistoricalRouteReplayRecord {
  if (record.phase !== 'terminal' || record.currentAnchorId !== record.terminalAnchorId) {
    return record
  }
  if (!validId(consequence.consequenceId) || !validId(consequence.kind)) return record
  if (consequence.subjectId !== undefined && !validId(consequence.subjectId)) return record

  return freezeReplay({
    ...record,
    phase: 'ended',
    ordinaryConsequence: {
      consequenceId: consequence.consequenceId,
      kind: consequence.kind,
      ...(consequence.subjectId !== undefined ? { subjectId: consequence.subjectId } : {}),
      persistence: 'ordinary_world',
    },
    causalClassification: HISTORICAL_ROUTE_CAUSAL_CLASSIFICATION,
  })
}
