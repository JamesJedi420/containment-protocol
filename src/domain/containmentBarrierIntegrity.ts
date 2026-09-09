/** SPE-877 barrier-integrity coupling — SPE-1387 / SPE-471 zone consumer. */

import {
  parseContainmentDeficiency,
  type ContainmentClassId,
  type ContainmentDeficiency,
} from './containmentClassInspection'

export const BLAST_DOOR_MEMBRANE_ZONE_ID = 'blast_door_membrane' as const
export type BlastDoorMembraneZoneId = typeof BLAST_DOOR_MEMBRANE_ZONE_ID

export const PRESSURE_SEAL_MEMBRANE_ZONE_ID = 'pressure_seal_membrane' as const
export type PressureSealMembraneZoneId = typeof PRESSURE_SEAL_MEMBRANE_ZONE_ID

export const CONTAINMENT_BARRIER_ZONE_IDS = [
  BLAST_DOOR_MEMBRANE_ZONE_ID,
  PRESSURE_SEAL_MEMBRANE_ZONE_ID,
] as const
export type ContainmentBarrierZoneId = (typeof CONTAINMENT_BARRIER_ZONE_IDS)[number]

export const BARRIER_INTEGRITY_WATCH_CONTROL_ID = 'barrier_integrity_watch' as const
export type BarrierIntegrityWatchControlId = typeof BARRIER_INTEGRITY_WATCH_CONTROL_ID

export type ContainmentBarrierIntegrityStatus = 'intact' | 'flow_restraint' | 'zone_breach'

export type RecordedContainmentBarrierStatus = Exclude<ContainmentBarrierIntegrityStatus, 'intact'>

export interface ContainmentBarrierIntegrity {
  zoneId: ContainmentBarrierZoneId
  status: RecordedContainmentBarrierStatus
  sourceInstanceId: string
  sourceDeficiencyKind: 'hard_stop' | 'compensating_continue'
}

export type ContainmentBarrierIntegrityRegistry = {
  [K in ContainmentBarrierZoneId]?: ContainmentBarrierIntegrity
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

const BARRIER_RECORD_KEYS = [
  'zoneId',
  'status',
  'sourceInstanceId',
  'sourceDeficiencyKind',
] as const

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

function isContainmentBarrierZoneId(value: unknown): value is ContainmentBarrierZoneId {
  return value === BLAST_DOOR_MEMBRANE_ZONE_ID || value === PRESSURE_SEAL_MEMBRANE_ZONE_ID
}

function proposedStatusForDeficiency(
  deficiency: ContainmentDeficiency
): ContainmentBarrierIntegrityStatus {
  if (deficiency.kind === 'hard_stop') return 'zone_breach'
  if (deficiency.kind === 'compensating_continue') return 'flow_restraint'
  return 'intact'
}

export function zoneIdForContainmentClass(
  classId: ContainmentClassId
): ContainmentBarrierZoneId | undefined {
  switch (classId) {
    case 'blast_door':
      return BLAST_DOOR_MEMBRANE_ZONE_ID
    case 'pressure_seal':
      return PRESSURE_SEAL_MEMBRANE_ZONE_ID
    case 'interlock':
      return undefined
    default: {
      const exhaustive: never = classId
      return exhaustive
    }
  }
}

export function labelContainmentBarrierZone(zoneId: ContainmentBarrierZoneId): string {
  switch (zoneId) {
    case BLAST_DOOR_MEMBRANE_ZONE_ID:
      return 'Blast door membrane'
    case PRESSURE_SEAL_MEMBRANE_ZONE_ID:
      return 'Pressure seal membrane'
    default: {
      const exhaustive: never = zoneId
      return exhaustive
    }
  }
}

export function snapshotContainmentBarrierIntegrity(
  barrier: ContainmentBarrierIntegrity
): ContainmentBarrierIntegrity {
  return Object.freeze({
    zoneId: barrier.zoneId,
    status: barrier.status,
    sourceInstanceId: barrier.sourceInstanceId,
    sourceDeficiencyKind: barrier.sourceDeficiencyKind,
  })
}

export function snapshotContainmentBarrierIntegrityRegistry(
  registry: ContainmentBarrierIntegrityRegistry
): ContainmentBarrierIntegrityRegistry | undefined {
  const next: ContainmentBarrierIntegrityRegistry = {}
  for (const zoneId of CONTAINMENT_BARRIER_ZONE_IDS) {
    const record = registry[zoneId]
    if (!record) continue
    next[zoneId] = snapshotContainmentBarrierIntegrity(record)
  }
  return Object.keys(next).length > 0 ? Object.freeze(next) : undefined
}

export function parseContainmentBarrierIntegrity(value: unknown): ContainmentBarrierParseResult {
  if (value === undefined) {
    return { ok: false, code: 'malformed_barrier' }
  }
  if (!isRecord(value) || !hasOnlyKeys(value, BARRIER_RECORD_KEYS)) {
    return { ok: false, code: 'malformed_barrier' }
  }
  if (!isContainmentBarrierZoneId(value.zoneId)) {
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
      zoneId: value.zoneId,
      status: value.status,
      sourceInstanceId: value.sourceInstanceId,
      sourceDeficiencyKind: value.sourceDeficiencyKind,
    }),
  }
}

function looksLikeSingularBarrierRecord(value: Record<string, unknown>) {
  return hasOnlyKeys(value, BARRIER_RECORD_KEYS) && isContainmentBarrierZoneId(value.zoneId)
}

export function parseContainmentBarrierIntegrityRegistry(
  value: unknown
): ContainmentBarrierIntegrityRegistry | undefined {
  if (value === undefined) return undefined
  if (!isRecord(value)) return undefined
  if (looksLikeSingularBarrierRecord(value)) {
    const parsed = parseContainmentBarrierIntegrity(value)
    return parsed.ok
      ? snapshotContainmentBarrierIntegrityRegistry({ [parsed.barrier.zoneId]: parsed.barrier })
      : undefined
  }
  const next: ContainmentBarrierIntegrityRegistry = {}
  for (const zoneId of CONTAINMENT_BARRIER_ZONE_IDS) {
    if (!(zoneId in value)) continue
    const parsed = parseContainmentBarrierIntegrity(value[zoneId])
    if (!parsed.ok || parsed.barrier.zoneId !== zoneId) continue
    next[zoneId] = parsed.barrier
  }
  return snapshotContainmentBarrierIntegrityRegistry(next)
}

export function readContainmentBarrierStatus(
  value: unknown,
  zoneId: ContainmentBarrierZoneId = BLAST_DOOR_MEMBRANE_ZONE_ID
): ContainmentBarrierIntegrityStatus {
  const registry = parseContainmentBarrierIntegrityRegistry(value)
  return registry?.[zoneId]?.status ?? 'intact'
}

/**
 * Sticky SPE-1387 / SPE-471 pairing:
 * hard_stop → zone_breach (catastrophic wall-breach).
 * compensating_continue → flow_restraint (barrier_integrity_watch), not a full breach.
 * Recorded zone_breach never downgrades. SPE-2851 damaged is not an input.
 * `blast_door` writes `blast_door_membrane`; `pressure_seal` writes `pressure_seal_membrane`.
 * Interlock has no zone this child. Mixed class/control pairings fail closed.
 */
export function resolveContainmentBarrierIntegrityCoupling(input: {
  existing: unknown
  deficiency: unknown
  sourceInstanceId: unknown
  classId?: unknown
}): ContainmentBarrierCouplingResult {
  const classId = input.classId === undefined ? 'blast_door' : input.classId
  if (classId !== 'blast_door' && classId !== 'pressure_seal') {
    const existingParsed =
      input.existing === undefined ? undefined : parseContainmentBarrierIntegrity(input.existing)
    const existing = existingParsed?.ok ? existingParsed.barrier : undefined
    return {
      ok: true,
      barrier: existing,
      previousStatus: existing?.status ?? 'intact',
      changed: false,
    }
  }
  const zoneId = zoneIdForContainmentClass(classId)
  if (!zoneId) {
    return { ok: false, code: 'malformed_deficiency' }
  }
  const deficiency = parseContainmentDeficiency(input.deficiency, classId)
  if (!deficiency) {
    return { ok: false, code: 'malformed_deficiency' }
  }
  if (!isSafeBarrierSourceId(input.sourceInstanceId)) {
    return { ok: false, code: 'malformed_deficiency' }
  }

  const existingParsed =
    input.existing === undefined ? undefined : parseContainmentBarrierIntegrity(input.existing)
  const existing = existingParsed?.ok ? existingParsed.barrier : undefined
  if (existing && existing.zoneId !== zoneId) {
    return { ok: false, code: 'malformed_deficiency' }
  }
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
      zoneId,
      status: proposed,
      sourceInstanceId: input.sourceInstanceId,
      sourceDeficiencyKind: proposed === 'zone_breach' ? 'hard_stop' : 'compensating_continue',
    }),
  }
}
