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
export type HistoricalRouteObservationState = (typeof HISTORICAL_ROUTE_OBSERVATION_STATES)[number]

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

/**
 * SPE-3017: canonical GameState registry of historical-route replay records,
 * keyed by embedded eventId. Legacy omit hydrates empty.
 */
export type HistoricalRouteReplayRegistry = Readonly<Record<string, HistoricalRouteReplayRecord>>

const PHASE_SET: ReadonlySet<string> = new Set(HISTORICAL_ROUTE_REPLAY_PHASES)
const EXPOSURE_STATE_SET: ReadonlySet<string> = new Set(HISTORICAL_ROUTE_EXPOSURE_STATES)
const OBSERVATION_STATE_SET: ReadonlySet<string> = new Set(HISTORICAL_ROUTE_OBSERVATION_STATES)

function validId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

/** Reject JavaScript integer-index keys that cannot retain code-unit object-key order. */
function isIntegerIndexId(value: string): boolean {
  const numeric = Number(value)
  return (
    Number.isInteger(numeric) &&
    numeric >= 0 &&
    numeric < 4_294_967_295 &&
    String(numeric) === value
  )
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function normalizeIdList(value: unknown): readonly string[] | null {
  if (!Array.isArray(value)) return null
  const ids: string[] = []
  for (const entry of value) {
    if (!validId(entry)) return null
    ids.push(entry)
  }
  return ids
}

function sameIdSequence(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false
  }
  return true
}

function normalizeObserverExposure(
  value: unknown,
  routeAnchorIds: readonly string[],
  exposedAnchorIds: readonly string[]
): HistoricalRouteObserverExposure | null {
  if (!isRecord(value)) return null
  if (
    !validId(value.observerId) ||
    !validId(value.contactAnchorId) ||
    !EXPOSURE_STATE_SET.has(value.exposureState as string) ||
    !OBSERVATION_STATE_SET.has(value.observationState as string)
  ) {
    return null
  }

  const contactAnchorId = value.contactAnchorId
  if (!routeAnchorIds.includes(contactAnchorId)) return null
  if (!exposedAnchorIds.includes(contactAnchorId)) return null

  const exposureState = value.exposureState as HistoricalRouteExposureState
  const observationState = value.observationState as HistoricalRouteObservationState
  if (exposureState === 'contact' && observationState !== 'external') return null
  if (exposureState === 'post_contact' && observationState !== 'altered') return null

  return freezeExposure({
    observerId: value.observerId,
    contactAnchorId,
    exposureState,
    observationState,
  })
}

function normalizeOrdinaryConsequence(value: unknown): HistoricalRouteOrdinaryConsequence | null {
  if (!isRecord(value)) return null
  if (
    !validId(value.consequenceId) ||
    !validId(value.kind) ||
    value.persistence !== 'ordinary_world'
  ) {
    return null
  }
  if (value.subjectId !== undefined && !validId(value.subjectId)) return null

  return freezeConsequence({
    consequenceId: value.consequenceId,
    kind: value.kind,
    ...(value.subjectId !== undefined ? { subjectId: value.subjectId } : {}),
    persistence: 'ordinary_world',
  })
}

/**
 * Fail-closed hydration for one persisted SPE-3009 replay record.
 *
 * Validates self-contained frozen route arrays only. Does not call SPE-1392
 * path resolution, facility adjacency, or SPE-3007 route_link, and never
 * invents missing edges.
 */
export function normalizeHistoricalRouteReplayRecord(
  value: unknown
): HistoricalRouteReplayRecord | null {
  if (!isRecord(value)) return null

  if (
    !validId(value.eventId) ||
    isIntegerIndexId(value.eventId) ||
    value.propagationFamily !== HISTORICAL_ROUTE_REPLAY_FAMILY ||
    !validId(value.activationId) ||
    !validId(value.originAnchorId) ||
    !validId(value.currentAnchorId) ||
    !validId(value.terminalAnchorId) ||
    value.originAnchorId === value.terminalAnchorId ||
    !isNonNegativeInteger(value.currentRouteIndex) ||
    !PHASE_SET.has(value.phase as string) ||
    value.causalClassification !== HISTORICAL_ROUTE_CAUSAL_CLASSIFICATION
  ) {
    return null
  }

  const routeAnchorIds = normalizeIdList(value.routeAnchorIds)
  const routeEdgeIds = normalizeIdList(value.routeEdgeIds)
  const traversedAnchorIds = normalizeIdList(value.traversedAnchorIds)
  const traversedEdgeIds = normalizeIdList(value.traversedEdgeIds)
  const affectedAnchorIds = normalizeIdList(value.affectedAnchorIds)
  const exposedAnchorIds = normalizeIdList(value.exposedAnchorIds)
  if (
    !routeAnchorIds ||
    !routeEdgeIds ||
    !traversedAnchorIds ||
    !traversedEdgeIds ||
    !affectedAnchorIds ||
    !exposedAnchorIds
  ) {
    return null
  }

  if (routeAnchorIds.length < 2) return null
  if (routeEdgeIds.length !== routeAnchorIds.length - 1) return null
  if (routeAnchorIds[0] !== value.originAnchorId) return null
  if (routeAnchorIds[routeAnchorIds.length - 1] !== value.terminalAnchorId) return null
  if (value.currentRouteIndex >= routeAnchorIds.length) return null
  if (routeAnchorIds[value.currentRouteIndex] !== value.currentAnchorId) return null

  const expectedTraversedAnchors = routeAnchorIds.slice(0, value.currentRouteIndex + 1)
  const expectedTraversedEdges = routeEdgeIds.slice(0, value.currentRouteIndex)
  if (!sameIdSequence(traversedAnchorIds, expectedTraversedAnchors)) return null
  if (!sameIdSequence(traversedEdgeIds, expectedTraversedEdges)) return null
  if (!sameIdSequence(affectedAnchorIds, expectedTraversedAnchors)) return null

  for (const exposedAnchorId of exposedAnchorIds) {
    if (!routeAnchorIds.includes(exposedAnchorId)) return null
  }

  if (!Array.isArray(value.observerExposures)) return null
  const observerExposures: HistoricalRouteObserverExposure[] = []
  const seenObserverIds = new Set<string>()
  for (const rawExposure of value.observerExposures) {
    const exposure = normalizeObserverExposure(rawExposure, routeAnchorIds, exposedAnchorIds)
    if (!exposure) return null
    if (seenObserverIds.has(exposure.observerId)) return null
    seenObserverIds.add(exposure.observerId)
    observerExposures.push(exposure)
  }

  for (const exposedAnchorId of exposedAnchorIds) {
    if (!observerExposures.some((exposure) => exposure.contactAnchorId === exposedAnchorId)) {
      return null
    }
  }

  const phase = value.phase as HistoricalRouteReplayPhase
  const ordinaryConsequence =
    value.ordinaryConsequence === null || value.ordinaryConsequence === undefined
      ? null
      : normalizeOrdinaryConsequence(value.ordinaryConsequence)
  if (value.ordinaryConsequence != null && ordinaryConsequence === null) return null

  if (phase === 'approaching') {
    if (value.currentRouteIndex !== 0 || ordinaryConsequence !== null) return null
  } else if (phase === 'traversing') {
    if (
      value.currentRouteIndex === 0 ||
      value.currentAnchorId === value.terminalAnchorId ||
      ordinaryConsequence !== null
    ) {
      return null
    }
  } else if (phase === 'terminal') {
    if (value.currentAnchorId !== value.terminalAnchorId || ordinaryConsequence !== null) {
      return null
    }
  } else if (phase === 'ended') {
    if (value.currentAnchorId !== value.terminalAnchorId || ordinaryConsequence === null) {
      return null
    }
  } else {
    const _exhaustive: never = phase
    void _exhaustive
    return null
  }

  return freezeReplay({
    eventId: value.eventId,
    propagationFamily: HISTORICAL_ROUTE_REPLAY_FAMILY,
    activationId: value.activationId,
    originAnchorId: value.originAnchorId,
    currentAnchorId: value.currentAnchorId,
    terminalAnchorId: value.terminalAnchorId,
    routeAnchorIds,
    routeEdgeIds,
    currentRouteIndex: value.currentRouteIndex,
    traversedAnchorIds,
    traversedEdgeIds,
    affectedAnchorIds,
    exposedAnchorIds,
    phase,
    observerExposures,
    ordinaryConsequence,
    causalClassification: HISTORICAL_ROUTE_CAUSAL_CLASSIFICATION,
  })
}

/**
 * Normalize a replay map by embedded eventId in deterministic code-unit order.
 * Malformed, key-mismatched, and integer-index siblings drop independently.
 * Missing/non-record input hydrates to an empty frozen registry.
 */
export function normalizeHistoricalRouteReplayRegistry(
  value: unknown
): HistoricalRouteReplayRegistry {
  if (!isRecord(value)) {
    return Object.freeze({})
  }

  const entries: [string, HistoricalRouteReplayRecord][] = []
  for (const [registryId, rawRecord] of Object.entries(value)) {
    if (isIntegerIndexId(registryId)) continue
    const record = normalizeHistoricalRouteReplayRecord(rawRecord)
    if (record && registryId === record.eventId) {
      entries.push([record.eventId, record])
    }
  }
  entries.sort(([left], [right]) => compareCodeUnits(left, right))

  return Object.freeze(Object.fromEntries(entries))
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
 * SPE-3018: advance every eligible persisted replay exactly once at week-close.
 *
 * Normalizes via SPE-3017, calls SPE-3009 `advanceHistoricalRouteReplay` once
 * per sibling in deterministic code-unit `eventId` order, then re-normalizes.
 * Terminal/ended records stay identity no-ops here. SPE-3020 owns terminal →
 * ended resolve after this advance. Call only from campaign week-close
 * (never mid-week).
 */
export function advanceHistoricalRouteReplayRegistryAtWeekClose(
  registry: unknown
): HistoricalRouteReplayRegistry {
  const normalized = normalizeHistoricalRouteReplayRegistry(registry)
  const nextEntries: Array<[string, HistoricalRouteReplayRecord]> = []

  for (const eventId of Object.keys(normalized)) {
    const record = normalized[eventId]
    if (!record) continue
    nextEntries.push([eventId, advanceHistoricalRouteReplay(record)])
  }

  return normalizeHistoricalRouteReplayRegistry(Object.fromEntries(nextEntries))
}

/**
 * SPE-3020 week-close ownership: deterministic ordinary-world consequence for a
 * terminal historical-route replay. IDs derive only from the record's eventId
 * and (when present) the first exposed observer by code-unit observerId order.
 * Does not invent SPE-950 possession subjects or SPE-3007 adjacency.
 */
export const HISTORICAL_ROUTE_WEEK_CLOSE_TERMINAL_CONSEQUENCE_KIND =
  'historical_route_terminal' as const

export function ownedHistoricalRouteReplayTerminalConsequence(
  record: HistoricalRouteReplayRecord
): HistoricalRouteOrdinaryConsequenceInput {
  const subjectId = [...record.observerExposures]
    .map((exposure) => exposure.observerId)
    .sort(compareCodeUnits)[0]

  return {
    consequenceId: `historical-route-replay:${record.eventId}:terminal-ordinary-consequence`,
    kind: HISTORICAL_ROUTE_WEEK_CLOSE_TERMINAL_CONSEQUENCE_KIND,
    ...(subjectId !== undefined ? { subjectId } : {}),
  }
}

/**
 * SPE-3020: resolve every terminal sibling once via SPE-3009
 * `resolveHistoricalRouteReplayTerminal` using the owned week-close
 * consequence-id policy. Ended / non-terminal siblings stay identity no-ops.
 * Call only after SPE-3018 advance in the same campaign week-close.
 */
export function resolveHistoricalRouteReplayRegistryTerminalsAtWeekClose(
  registry: unknown
): HistoricalRouteReplayRegistry {
  const normalized = normalizeHistoricalRouteReplayRegistry(registry)
  const nextEntries: Array<[string, HistoricalRouteReplayRecord]> = []

  for (const eventId of Object.keys(normalized)) {
    const record = normalized[eventId]
    if (!record) continue
    nextEntries.push([
      eventId,
      resolveHistoricalRouteReplayTerminal(
        record,
        ownedHistoricalRouteReplayTerminalConsequence(record)
      ),
    ])
  }

  return normalizeHistoricalRouteReplayRegistry(Object.fromEntries(nextEntries))
}

/**
 * SPE-3020: campaign week-close entry — SPE-3018 advance once, then SPE-3020
 * terminal → ended resolve with the owned consequence policy.
 */
export function applyHistoricalRouteReplayRegistryAtWeekClose(
  registry: unknown
): HistoricalRouteReplayRegistry {
  return resolveHistoricalRouteReplayRegistryTerminalsAtWeekClose(
    advanceHistoricalRouteReplayRegistryAtWeekClose(registry)
  )
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
