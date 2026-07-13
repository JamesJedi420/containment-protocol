/**
 * SPE-2604 / SPE-947: smallest deterministic pursuit-vector surface.
 *
 * Consumes SPE-2602 linkage + SPE-2111 pursuitState / targets / observer
 * escalation snapshot. Authored links only — no propagation graph, no
 * mid-week mutations, no evaluator contract changes.
 */

import {
  composeSpe947VisualTriggerHazardLinks,
  type Spe947VisualTriggerHazardLink,
  type Spe947VisualTriggerHazardLinkageMaps,
  type Spe947VisualTriggerHazardLinkStatus,
} from './spe947VisualTriggerHazardLinkage'
import {
  observerAwarenessEscalation,
  type ObserverAwarenessBand,
  type PursuitState,
  type VisualTriggerHazardRecordsMap,
} from './visualTriggerHazardRegistry'

export type Spe947PursuitVectorBand = 'none' | 'latent' | 'active' | 'unresolved_link'

export type Spe947PursuitVectorReasonCode =
  | 'unresolved_link'
  | 'missing_pursuit_targets'
  | 'pursuit_dormant'
  | 'pursuit_resolved'
  | 'pursuit_distressed'
  | 'pursuit_active'

export interface Spe947PursuitVectorReading {
  readonly bindingId: string
  readonly entityKind: Spe947VisualTriggerHazardLink['entityKind']
  readonly entityId: string
  readonly entityLabel: string | null
  readonly visualTriggerHazardId: string
  readonly registryLabel: string | null
  readonly linkStatus: Spe947VisualTriggerHazardLinkStatus
  readonly pursuitState: PursuitState | null
  readonly pursuitVectorBand: Spe947PursuitVectorBand
  readonly targetInstanceIds: readonly string[]
  readonly pursuitPressure: number | null
  readonly manifestationRisk: number | null
  readonly reasonCodes: readonly Spe947PursuitVectorReasonCode[]
}

function resolveAwarenessBand(record: NonNullable<Spe947VisualTriggerHazardLink['registryRecord']>): ObserverAwarenessBand {
  return record.observerAwarenessBand ?? 'unaware'
}

function resolveTargetInstanceIds(
  record: NonNullable<Spe947VisualTriggerHazardLink['registryRecord']>
): readonly string[] {
  const rawTargets = record.targetInstanceIds
  if (!Array.isArray(rawTargets)) {
    return Object.freeze([])
  }

  return Object.freeze(
    rawTargets.filter((id): id is string => typeof id === 'string' && id.length > 0)
  )
}

function mapPursuitStateToBand(
  pursuitState: PursuitState
): Exclude<Spe947PursuitVectorBand, 'unresolved_link'> {
  switch (pursuitState) {
    case 'active_pursuit':
      return 'active'
    case 'distressed':
      return 'latent'
    case 'dormant':
    case 'resolved':
      return 'none'
    default: {
      const _exhaustive: never = pursuitState
      return _exhaustive
    }
  }
}

function reasonCodeForPursuitState(pursuitState: PursuitState): Spe947PursuitVectorReasonCode {
  switch (pursuitState) {
    case 'active_pursuit':
      return 'pursuit_active'
    case 'distressed':
      return 'pursuit_distressed'
    case 'dormant':
      return 'pursuit_dormant'
    case 'resolved':
      return 'pursuit_resolved'
    default: {
      const _exhaustive: never = pursuitState
      return _exhaustive
    }
  }
}

/**
 * Resolve one pursuit-vector reading from a SPE-2602 link.
 * Unresolved links and missing targets never throw.
 */
export function resolveSpe947PursuitVector(input: {
  link: Spe947VisualTriggerHazardLink
}): Spe947PursuitVectorReading {
  const link = input.link
  const reasonCodes: Spe947PursuitVectorReasonCode[] = []

  if (link.status !== 'resolved' || !link.registryRecord) {
    reasonCodes.push('unresolved_link')
    return Object.freeze({
      bindingId: link.bindingId,
      entityKind: link.entityKind,
      entityId: link.entityId,
      entityLabel: link.entityLabel,
      visualTriggerHazardId: link.visualTriggerHazardId,
      registryLabel: link.registryLabel,
      linkStatus: link.status,
      pursuitState: null,
      pursuitVectorBand: 'unresolved_link',
      targetInstanceIds: Object.freeze([]),
      pursuitPressure: null,
      manifestationRisk: null,
      reasonCodes: Object.freeze(reasonCodes),
    })
  }

  const record = link.registryRecord
  const pursuitState = record.pursuitState
  const targetInstanceIds = resolveTargetInstanceIds(record)
  const pursuitVectorBand = mapPursuitStateToBand(pursuitState)
  reasonCodes.push(reasonCodeForPursuitState(pursuitState))

  if (
    (pursuitState === 'active_pursuit' || pursuitState === 'distressed') &&
    targetInstanceIds.length === 0
  ) {
    reasonCodes.push('missing_pursuit_targets')
  }

  const awarenessBand = resolveAwarenessBand(record)
  const escalation = observerAwarenessEscalation(record, awarenessBand, awarenessBand)

  return Object.freeze({
    bindingId: link.bindingId,
    entityKind: link.entityKind,
    entityId: link.entityId,
    entityLabel: link.entityLabel,
    visualTriggerHazardId: link.visualTriggerHazardId,
    registryLabel: link.registryLabel,
    linkStatus: link.status,
    pursuitState,
    pursuitVectorBand,
    targetInstanceIds,
    pursuitPressure: escalation.pursuitPressure,
    manifestationRisk: escalation.manifestationRisk,
    reasonCodes: Object.freeze(reasonCodes),
  })
}

/**
 * Compose pursuit-vector readings for all authored spe947 → SPE-2111 links.
 * Empty bindings → empty list (no-op). Deterministic order by binding id.
 */
export function composeSpe947PursuitVectors(input: {
  maps: Spe947VisualTriggerHazardLinkageMaps
  visualTriggerHazardRecords?: VisualTriggerHazardRecordsMap | null
}): readonly Spe947PursuitVectorReading[] {
  const links = composeSpe947VisualTriggerHazardLinks({
    maps: input.maps,
    visualTriggerHazardRecords: input.visualTriggerHazardRecords ?? {},
  })

  return Object.freeze(links.map((link) => resolveSpe947PursuitVector({ link })))
}
