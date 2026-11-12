/**
 * SPE-3471 — information-source access projection and handoff contract.
 *
 * Projects caller-owned producer access snapshots into typed handoffs for
 * evidence / intake / provenance / knowledge / research consumers. Does not
 * own credentials, clearance, infiltration, hacking, custody, CI mechanics,
 * knowledge truth, research capacity (SPE-3470), or GameState access ledgers.
 * Uses SPE-2273 object refs, translate morphisms, and composition traces.
 */

import {
  buildCompositionTrace,
  type CompositionTrace,
  type SimulationObjectRef,
  type TransformationMorphism,
} from './crossSystemTransformationRegistry'

export const ACCESS_AVAILABILITIES = ['unavailable', 'conditional', 'partial', 'usable'] as const
export type AccessAvailability = (typeof ACCESS_AVAILABILITIES)[number]

export const RETRIEVAL_COMPLETENESS = [
  'metadata_only',
  'fragmentary',
  'partial',
  'complete_for_request',
] as const
export type RetrievalCompleteness = (typeof RETRIEVAL_COMPLETENESS)[number]

export const ROUTE_STATES = ['open', 'conditional', 'revoked', 'blocked', 'compromised'] as const
export type RouteState = (typeof ROUTE_STATES)[number]

export const ACCESS_MODES = [
  'physical',
  'remote',
  'credentialed',
  'social',
  'digital',
  'anomalous',
  'archive',
  'evidence',
] as const
export type AccessMode = (typeof ACCESS_MODES)[number]

export const PRODUCER_SIMULATION_DEPTHS = ['lightweight', 'detailed'] as const
export type ProducerSimulationDepth = (typeof PRODUCER_SIMULATION_DEPTHS)[number]

/** SPE-1910-compatible confidence quality — not verified truth. */
export const HANDOFF_CONFIDENCE = ['compromised', 'low', 'nominal'] as const
export type HandoffConfidence = (typeof HANDOFF_CONFIDENCE)[number]

export const ACCESS_PROJECTION_REJECTIONS = [
  'malformed_input',
  'missing_source',
  'missing_route',
  'duplicate_route',
  'unknown_availability',
  'unknown_route_state',
  'unknown_completeness',
  'unknown_mode',
  'unknown_depth',
  'unknown_confidence',
  'detect_implies_mitigated',
] as const
export type AccessProjectionRejection = (typeof ACCESS_PROJECTION_REJECTIONS)[number]

export interface ProducerAccessRoute {
  readonly routeId: string
  readonly mode: AccessMode
  readonly state: RouteState
  readonly availability: AccessAvailability
  readonly retrievalCompleteness?: RetrievalCompleteness
  /** Producer-owned access breadth/depth — not SPE-3470 analytical capacity. */
  readonly accessBreadth?: number
  readonly accessDepth?: number
  readonly countermeasureDetected?: boolean
  readonly countermeasureMitigated?: boolean
  readonly constraintRefs?: readonly SimulationObjectRef[]
  readonly reasonCode?: string
  readonly reasonEventRef?: SimulationObjectRef
  readonly hiddenFromPlayer?: boolean
}

export interface ProducerAccessSnapshot {
  readonly sourceRef: SimulationObjectRef
  readonly producerFamily: string
  readonly simulationDepth: ProducerSimulationDepth
  readonly routes: readonly ProducerAccessRoute[]
  readonly sourceDestroyed?: boolean
  readonly handoffConfidence?: HandoffConfidence
  readonly mutationReasonCode?: string
}

export interface ProjectedAccessRoute {
  readonly routeId: string
  readonly mode: AccessMode
  readonly state: RouteState
  readonly availability: AccessAvailability
  readonly retrievalCompleteness?: RetrievalCompleteness
  readonly accessBreadth?: number
  readonly accessDepth?: number
  readonly countermeasureDetected?: boolean
  readonly countermeasureMitigated?: boolean
  readonly constraintRefs?: readonly SimulationObjectRef[]
  readonly reasonCode?: string
  readonly reasonEventRef?: SimulationObjectRef
  readonly hiddenFromPlayer: boolean
}

export interface InformationSourceAccessHandoff {
  readonly accessPointId: string
  readonly sourceRef: SimulationObjectRef
  readonly producerFamily: string
  readonly simulationDepth: ProducerSimulationDepth
  readonly sourceDestroyed: boolean
  readonly overallAvailability: AccessAvailability
  readonly routes: readonly ProjectedAccessRoute[]
  readonly usableRouteIds: readonly string[]
  readonly alternateRouteIds: readonly string[]
  readonly handoffConfidence: HandoffConfidence
  readonly compositionTrace: CompositionTrace
  /** Player-safe reason codes only (no hidden route/CM/monitoring leakage). */
  readonly playerFacingReasonCodes: readonly string[]
  /** Full authoritative reasons for debug/validation consumers. */
  readonly authoritativeReasonCodes: readonly string[]
}

export type ProjectInformationSourceAccessResult =
  | { readonly ok: true; readonly handoff: InformationSourceAccessHandoff }
  | { readonly ok: false; readonly rejection: AccessProjectionRejection; readonly detail?: string }

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isValidRef(ref: SimulationObjectRef | null | undefined): ref is SimulationObjectRef {
  return !!ref && isNonEmptyString(ref.family) && isNonEmptyString(ref.id)
}

function freezeRef(ref: SimulationObjectRef): SimulationObjectRef {
  return Object.freeze({ family: ref.family, id: ref.id })
}

function compareCodeUnit(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function includesString<T extends string>(values: readonly T[], value: string): value is T {
  return (values as readonly string[]).includes(value)
}

function availabilityRank(value: AccessAvailability): number {
  switch (value) {
    case 'unavailable':
      return 0
    case 'conditional':
      return 1
    case 'partial':
      return 2
    case 'usable':
      return 3
    default: {
      const exhaustive: never = value
      throw new Error(`unexpected access availability: ${String(exhaustive)}`)
    }
  }
}

function bestAvailability(values: readonly AccessAvailability[]): AccessAvailability {
  if (values.length === 0) return 'unavailable'
  let best: AccessAvailability = 'unavailable'
  for (const value of values) {
    if (availabilityRank(value) > availabilityRank(best)) best = value
  }
  return best
}

function routeIsTerminal(state: RouteState): boolean {
  return state === 'revoked' || state === 'blocked' || state === 'compromised'
}

function routeIsUsable(route: Pick<ProjectedAccessRoute, 'state' | 'availability'>): boolean {
  if (routeIsTerminal(route.state)) return false
  return (
    route.availability === 'usable' ||
    route.availability === 'partial' ||
    route.availability === 'conditional'
  )
}

function normalizeReasonCode(
  value: string | undefined,
  fallback: string
): string | AccessProjectionRejection {
  if (value === undefined) return fallback
  if (!isNonEmptyString(value)) return 'malformed_input'
  return value
}

function reject(
  rejection: AccessProjectionRejection,
  detail?: string
): { readonly ok: false; readonly rejection: AccessProjectionRejection; readonly detail?: string } {
  return Object.freeze({
    ok: false as const,
    rejection,
    ...(detail !== undefined ? { detail } : {}),
  })
}

function validateRoute(route: ProducerAccessRoute): AccessProjectionRejection | null {
  if (!route || typeof route !== 'object') return 'malformed_input'
  if (!isNonEmptyString(route.routeId)) return 'missing_route'
  if (!includesString(ACCESS_MODES, route.mode)) return 'unknown_mode'
  if (!includesString(ROUTE_STATES, route.state)) return 'unknown_route_state'
  if (!includesString(ACCESS_AVAILABILITIES, route.availability)) return 'unknown_availability'
  if (
    route.retrievalCompleteness !== undefined &&
    !includesString(RETRIEVAL_COMPLETENESS, route.retrievalCompleteness)
  ) {
    return 'unknown_completeness'
  }
  if (route.countermeasureMitigated === true && route.countermeasureDetected !== true) {
    return 'detect_implies_mitigated'
  }
  if (route.reasonCode !== undefined && !isNonEmptyString(route.reasonCode)) {
    return 'malformed_input'
  }
  if (route.accessBreadth !== undefined && typeof route.accessBreadth !== 'number') {
    return 'malformed_input'
  }
  if (route.accessDepth !== undefined && typeof route.accessDepth !== 'number') {
    return 'malformed_input'
  }
  if (route.constraintRefs) {
    for (const ref of route.constraintRefs) {
      if (!isValidRef(ref)) return 'malformed_input'
    }
  }
  if (route.reasonEventRef && !isValidRef(route.reasonEventRef)) return 'malformed_input'
  return null
}

function projectRoute(route: ProducerAccessRoute): ProjectedAccessRoute {
  return Object.freeze({
    routeId: route.routeId,
    mode: route.mode,
    state: route.state,
    availability: route.availability,
    ...(route.retrievalCompleteness !== undefined
      ? { retrievalCompleteness: route.retrievalCompleteness }
      : {}),
    ...(route.accessBreadth !== undefined ? { accessBreadth: route.accessBreadth } : {}),
    ...(route.accessDepth !== undefined ? { accessDepth: route.accessDepth } : {}),
    ...(route.countermeasureDetected !== undefined
      ? { countermeasureDetected: route.countermeasureDetected }
      : {}),
    ...(route.countermeasureMitigated !== undefined
      ? { countermeasureMitigated: route.countermeasureMitigated }
      : {}),
    ...(route.constraintRefs
      ? { constraintRefs: Object.freeze(route.constraintRefs.map(freezeRef)) }
      : {}),
    ...(route.reasonCode !== undefined ? { reasonCode: route.reasonCode } : {}),
    ...(route.reasonEventRef ? { reasonEventRef: freezeRef(route.reasonEventRef) } : {}),
    hiddenFromPlayer: route.hiddenFromPlayer === true,
  })
}

function buildHandoffTrace(
  snapshot: ProducerAccessSnapshot,
  accessPointId: string,
  sourceReason: string,
  routeReasons: ReadonlyMap<string, string>
): CompositionTrace {
  const morphisms: TransformationMorphism[] = [
    Object.freeze({
      id: `morph:access-source:${snapshot.sourceRef.id}`,
      kind: 'translate' as const,
      input: snapshot.sourceRef,
      output: Object.freeze({
        family: 'information_source_access_handoff',
        id: accessPointId,
      }),
      provenance: Object.freeze({
        sourceFamily: snapshot.producerFamily,
        sourceRef: freezeRef(snapshot.sourceRef),
        reasonCode: sourceReason,
      }),
    }),
  ]
  for (const route of [...snapshot.routes].sort((a, b) => compareCodeUnit(a.routeId, b.routeId))) {
    morphisms.push(
      Object.freeze({
        id: `morph:access-route:${route.routeId}`,
        kind: 'translate' as const,
        input: Object.freeze({ family: 'access_route', id: route.routeId }),
        output: Object.freeze({
          family: 'information_source_access_route',
          id: `${accessPointId}/${route.routeId}`,
        }),
        provenance: Object.freeze({
          sourceFamily: snapshot.producerFamily,
          sourceRef: freezeRef(snapshot.sourceRef),
          reasonCode: routeReasons.get(route.routeId) ?? `route_${route.state}`,
        }),
      })
    )
  }
  return buildCompositionTrace(morphisms)
}

/**
 * Project a caller-owned producer access snapshot into a typed handoff.
 * Route revocation does not destroy the source or other routes. Detection does
 * not auto-mitigate. No SPE-3470 analytical capacity fields are minted.
 */
export function projectInformationSourceAccess(
  snapshot: ProducerAccessSnapshot | null | undefined
): ProjectInformationSourceAccessResult {
  if (!snapshot || typeof snapshot !== 'object') return reject('malformed_input')
  if (!isValidRef(snapshot.sourceRef)) return reject('missing_source')
  if (!isNonEmptyString(snapshot.producerFamily)) return reject('malformed_input')
  if (!includesString(PRODUCER_SIMULATION_DEPTHS, snapshot.simulationDepth)) {
    return reject('unknown_depth')
  }
  if (!Array.isArray(snapshot.routes) || snapshot.routes.length === 0) {
    return reject('missing_route')
  }
  if (
    snapshot.handoffConfidence !== undefined &&
    !includesString(HANDOFF_CONFIDENCE, snapshot.handoffConfidence)
  ) {
    return reject('unknown_confidence')
  }
  if (snapshot.mutationReasonCode !== undefined && !isNonEmptyString(snapshot.mutationReasonCode)) {
    return reject('malformed_input', 'mutationReasonCode')
  }

  const seen = new Set<string>()
  const projected: ProjectedAccessRoute[] = []
  const routeReasons = new Map<string, string>()
  for (const route of snapshot.routes) {
    const issue = validateRoute(route)
    if (issue) return reject(issue, route?.routeId)
    if (seen.has(route.routeId)) return reject('duplicate_route', route.routeId)
    seen.add(route.routeId)
    const reason = normalizeReasonCode(route.reasonCode, `route_${route.state}`)
    if (typeof reason !== 'string') return reject(reason, route.routeId)
    routeReasons.set(route.routeId, reason)
    projected.push(projectRoute(route))
  }

  projected.sort((left, right) => compareCodeUnit(left.routeId, right.routeId))

  const sourceDestroyed = snapshot.sourceDestroyed === true
  const liveRoutes = projected.filter((route) => !routeIsTerminal(route.state))
  const usableRouteIds = Object.freeze(
    sourceDestroyed
      ? []
      : liveRoutes.filter((route) => routeIsUsable(route)).map((route) => route.routeId)
  )
  const overallAvailability = sourceDestroyed
    ? 'unavailable'
    : bestAvailability(liveRoutes.map((route) => route.availability))

  const alternateRouteIds = Object.freeze(
    usableRouteIds.length > 1 ? usableRouteIds.slice(1) : Object.freeze([])
  )

  const accessPointId = `access:${snapshot.sourceRef.family}/${snapshot.sourceRef.id}`
  const sourceReason = normalizeReasonCode(snapshot.mutationReasonCode, 'project_access_handoff')
  if (typeof sourceReason !== 'string') return reject(sourceReason, 'mutationReasonCode')
  const compositionTrace = buildHandoffTrace(snapshot, accessPointId, sourceReason, routeReasons)

  const authoritativeReasonCodes: string[] = []
  const playerFacingReasonCodeBuffer: string[] = []
  const addReasonCode = (code: string, route?: ProjectedAccessRoute): void => {
    authoritativeReasonCodes.push(code)
    if (route?.hiddenFromPlayer === true) return
    playerFacingReasonCodeBuffer.push(code)
  }

  if (snapshot.mutationReasonCode) addReasonCode(snapshot.mutationReasonCode)
  for (const route of projected) {
    if (route.reasonCode) addReasonCode(route.reasonCode, route)
    if (route.state === 'revoked') addReasonCode(`revoked:${route.routeId}`, route)
    if (route.countermeasureDetected === true) {
      addReasonCode(`cm_detected:${route.routeId}`, route)
    }
    if (route.countermeasureMitigated === true) {
      addReasonCode(`cm_mitigated:${route.routeId}`, route)
    }
    if (route.constraintRefs) {
      for (const ref of route.constraintRefs) {
        addReasonCode(`constraint:${route.routeId}:${ref.family}/${ref.id}`, route)
      }
    }
  }

  const playerFacingReasonCodes = Object.freeze(playerFacingReasonCodeBuffer)

  return Object.freeze({
    ok: true as const,
    handoff: Object.freeze({
      accessPointId,
      sourceRef: freezeRef(snapshot.sourceRef),
      producerFamily: snapshot.producerFamily,
      simulationDepth: snapshot.simulationDepth,
      sourceDestroyed,
      overallAvailability,
      routes: Object.freeze(projected),
      usableRouteIds,
      alternateRouteIds,
      handoffConfidence: snapshot.handoffConfidence ?? 'nominal',
      compositionTrace,
      playerFacingReasonCodes,
      authoritativeReasonCodes: Object.freeze([...authoritativeReasonCodes].sort(compareCodeUnit)),
    }),
  })
}

/**
 * Recompose after an authoritative producer mutation. Same projector — no
 * cached mutable access ledger.
 */
export function reprojectInformationSourceAccess(
  snapshot: ProducerAccessSnapshot
): ProjectInformationSourceAccessResult {
  return projectInformationSourceAccess(snapshot)
}
