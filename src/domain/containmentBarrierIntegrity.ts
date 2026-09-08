/** SPE-877 barrier-integrity coupling — SPE-1387 / SPE-471 blast-door consumer. */

import {
  parseContainmentDeficiency,
  type ContainmentDeficiency,
} from './containmentClassInspection'

export const BLAST_DOOR_MEMBRANE_ZONE_ID = 'blast_door_membrane' as const
export type BlastDoorMembraneZoneId = typeof BLAST_DOOR_MEMBRANE_ZONE_ID

export const BARRIER_INTEGRITY_WATCH_CONTROL_ID = 'barrier_integrity_watch' as const
export type BarrierIntegrityWatchControlId = typeof BARRIER_INTEGRITY_WATCH_CONTROL_ID

export type ContainmentBarrierIntegrityStatus = 'intact' | 'flow_restraint' | 'zone_breach'

export type RecordedContainmentBarrierStatus = Exclude<ContainmentBarrierIntegrityStatus, 'intact'>

export interface ContainmentBarrierIntegrity {
  zoneId: BlastDoorMembraneZoneId
  status: RecordedContainmentBarrierStatus
  sourceInstanceId: string
  sourceDeficiencyKind: 'hard_stop' | 'compensating_continue'
}

export type ContainmentBarrierParseResult =
  { ok: true; barrier: ContainmentBarrierIntegrity } | { ok: false; code: 'malformed_barrier' }

export type ContainmentBarrierCouplingResult =
  | {
      ok: true
      barrier: ContainmentBarrierIntegrity | undefined
      previousStatus: ContainmentBarrierIntegrityStatus
      changed: boolean
    }
  | { ok: false; code: 'malformed_deficiency' }

const BARRIER_STATUS_RANK: Record<ContainmentBarrierIntegrityStatus, number> = {
  intact: 0,
  flow_restraint: 1,
  zone_breach: 2,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]) {
  return Object.keys(value).every((key) => allowed.includes(key))
}

function isSafeBarrierSourceId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[a-z0-9][a-z0-9_-]{0,127}$/.test(value) &&
    value !== '__proto__' &&
    value !== 'constructor' &&
    value !== 'prototype'
  )
}

function proposedStatusForDeficiency(
  deficiency: ContainmentDeficiency
): ContainmentBarrierIntegrityStatus {
  if (deficiency.kind === 'hard_stop') return 'zone_breach'
  if (deficiency.kind === 'compensating_continue') return 'flow_restraint'
  return 'intact'
}

export function snapshotContainmentBarrierIntegrity(
  barrier: ContainmentBarrierIntegrity
): ContainmentBarrierIntegrity {
  return Object.freeze({
    zoneId: BLAST_DOOR_MEMBRANE_ZONE_ID,
    status: barrier.status,
    sourceInstanceId: barrier.sourceInstanceId,
    sourceDeficiencyKind: barrier.sourceDeficiencyKind,
  })
}

export function parseContainmentBarrierIntegrity(value: unknown): ContainmentBarrierParseResult {
  if (value === undefined) {
    return { ok: false, code: 'malformed_barrier' }
  }
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ['zoneId', 'status', 'sourceInstanceId', 'sourceDeficiencyKind'])
  ) {
    return { ok: false, code: 'malformed_barrier' }
  }
  if (value.zoneId !== BLAST_DOOR_MEMBRANE_ZONE_ID) {
    return { ok: false, code: 'malformed_barrier' }
  }
  if (value.status !== 'flow_restraint' && value.status !== 'zone_breach') {
    return { ok: false, code: 'malformed_barrier' }
  }
  if (!isSafeBarrierSourceId(value.sourceInstanceId)) {
    return { ok: false, code: 'malformed_barrier' }
  }
  if (value.status === 'zone_breach' && value.sourceDeficiencyKind !== 'hard_stop') {
    return { ok: false, code: 'malformed_barrier' }
  }
  if (value.status === 'flow_restraint' && value.sourceDeficiencyKind !== 'compensating_continue') {
    return { ok: false, code: 'malformed_barrier' }
  }
  return {
    ok: true,
    barrier: snapshotContainmentBarrierIntegrity({
      zoneId: BLAST_DOOR_MEMBRANE_ZONE_ID,
      status: value.status,
      sourceInstanceId: value.sourceInstanceId,
      sourceDeficiencyKind: value.sourceDeficiencyKind,
    }),
  }
}

export function readContainmentBarrierStatus(value: unknown): ContainmentBarrierIntegrityStatus {
  if (value === undefined) return 'intact'
  const parsed = parseContainmentBarrierIntegrity(value)
  return parsed.ok ? parsed.barrier.status : 'intact'
}

/**
 * Sticky SPE-1387 / SPE-471 pairing:
 * hard_stop → zone_breach (catastrophic wall-breach).
 * compensating_continue → flow_restraint (barrier_integrity_watch), not a full breach.
 * Recorded zone_breach never downgrades. SPE-2851 damaged is not an input.
 * SPE-2864: parse deficiency against `blast_door` so pressure-seal controls fail closed.
 */
export function resolveContainmentBarrierIntegrityCoupling(input: {
  existing: unknown
  deficiency: unknown
  sourceInstanceId: unknown
}): ContainmentBarrierCouplingResult {
  const deficiency = parseContainmentDeficiency(input.deficiency, 'blast_door')
  if (!deficiency) {
    return { ok: false, code: 'malformed_deficiency' }
  }
  if (!isSafeBarrierSourceId(input.sourceInstanceId)) {
    return { ok: false, code: 'malformed_deficiency' }
  }

  const existingParsed =
    input.existing === undefined ? undefined : parseContainmentBarrierIntegrity(input.existing)
  const existing = existingParsed?.ok ? existingParsed.barrier : undefined
  const previousStatus = existing?.status ?? 'intact'
  const proposed = proposedStatusForDeficiency(deficiency)

  if (
    proposed === 'intact' ||
    BARRIER_STATUS_RANK[proposed] <= BARRIER_STATUS_RANK[previousStatus]
  ) {
    return { ok: true, barrier: existing, previousStatus, changed: false }
  }

  return {
    ok: true,
    previousStatus,
    changed: true,
    barrier: snapshotContainmentBarrierIntegrity({
      zoneId: BLAST_DOOR_MEMBRANE_ZONE_ID,
      status: proposed,
      sourceInstanceId: input.sourceInstanceId,
      sourceDeficiencyKind: proposed === 'zone_breach' ? 'hard_stop' : 'compensating_continue',
    }),
  }
}
