/**
 * SPE-2271 — patrol zones and escort-policy doctrine (slice 1).
 *
 * Pure caller-owned doctrine registry: patrol zones and escort policies
 * drive mobile-team response without per-unit player orders. Includes
 * doctrine failure hooks (decoy pursuit, glamoured victim, uncleared zone).
 * Parent SPE-1023 remains Backlog. SPE-102 owns alert propagation.
 * No GameState field.
 */

export const PATROL_DOCTRINE_OWNER = 'SPE-2271' as const

export type PursuitRule = 'hold_zone' | 'limited_pursuit' | 'aggressive_pursuit'
export type EscortStance = 'tight' | 'loose' | 'abandon_on_alarm'
export type DoctrineFailureKind = 'decoy_pursuit' | 'glamoured_victim' | 'uncleared_zone'
export type PatrolResponseAction =
  | 'patrol_zone'
  | 'pursue_contact'
  | 'escort_asset'
  | 'hold_position'
  | 'doctrine_failure'

export interface PatrolZoneRecord {
  readonly zoneId: string
  readonly geometryRef: string
  readonly priority: number
  readonly pursuitRule: PursuitRule
  readonly overrideConditions: readonly string[]
}

export interface EscortPolicyRecord {
  readonly policyId: string
  readonly assetTag: string
  readonly stance: EscortStance
  readonly abandonOnFailureKinds: readonly DoctrineFailureKind[]
}

export interface PatrolDoctrineRegistry {
  readonly zones: readonly PatrolZoneRecord[]
  readonly escorts: readonly EscortPolicyRecord[]
}

export interface PatrolStimulus {
  readonly activeZoneId: string
  readonly contactPresent: boolean
  readonly contactIsDecoy: boolean
  readonly contactIsGlamoured: boolean
  readonly zoneCleared: boolean
  readonly escortedAssetTag?: string
}

export interface PatrolDoctrineDecision {
  readonly action: PatrolResponseAction
  readonly zoneId: string | null
  readonly policyId: string | null
  readonly failureKind: DoctrineFailureKind | null
  readonly reasons: readonly string[]
}

const PURSUIT: readonly PursuitRule[] = ['hold_zone', 'limited_pursuit', 'aggressive_pursuit']
const STANCES: readonly EscortStance[] = ['tight', 'loose', 'abandon_on_alarm']
const FAILURES: readonly DoctrineFailureKind[] = ['decoy_pursuit', 'glamoured_victim', 'uncleared_zone']

function requireNonEmpty(value: string | null | undefined, label: string): string {
  if (typeof value !== 'string') {
    throw new Error(`patrol doctrine ${label} is required`)
  }
  const trimmed = value.trim()
  if (!trimmed) throw new Error(`patrol doctrine ${label} is required`)
  return trimmed
}

function compareAscii(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

function requirePositiveInt(value: number, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value < 1) {
    throw new Error(`patrol doctrine ${label} must be an integer >= 1`)
  }
  return value
}

function requirePursuit(value: string): PursuitRule {
  if ((PURSUIT as readonly string[]).includes(value)) return value as PursuitRule
  throw new Error('patrol doctrine pursuitRule is invalid')
}

function requireStance(value: string): EscortStance {
  if ((STANCES as readonly string[]).includes(value)) return value as EscortStance
  throw new Error('patrol doctrine stance is invalid')
}

function requireFailure(value: string): DoctrineFailureKind {
  if ((FAILURES as readonly string[]).includes(value)) return value as DoctrineFailureKind
  throw new Error('patrol doctrine failure kind is invalid')
}

export function createPatrolZoneRecord(input: PatrolZoneRecord): PatrolZoneRecord {
  const overrideConditions = [
    ...new Set((input.overrideConditions ?? []).map((c) => requireNonEmpty(c, 'overrideCondition'))),
  ].sort(compareAscii)
  return Object.freeze({
    zoneId: requireNonEmpty(input.zoneId, 'zoneId'),
    geometryRef: requireNonEmpty(input.geometryRef, 'geometryRef'),
    priority: requirePositiveInt(input.priority, 'priority'),
    pursuitRule: requirePursuit(input.pursuitRule),
    overrideConditions: Object.freeze(overrideConditions),
  })
}

export function createEscortPolicyRecord(input: EscortPolicyRecord): EscortPolicyRecord {
  const abandonOnFailureKinds = [
    ...new Set((input.abandonOnFailureKinds ?? []).map(requireFailure)),
  ].sort(compareAscii) as DoctrineFailureKind[]
  return Object.freeze({
    policyId: requireNonEmpty(input.policyId, 'policyId'),
    assetTag: requireNonEmpty(input.assetTag, 'assetTag'),
    stance: requireStance(input.stance),
    abandonOnFailureKinds: Object.freeze(abandonOnFailureKinds),
  })
}

export function createPatrolDoctrineRegistry(input: PatrolDoctrineRegistry): PatrolDoctrineRegistry {
  const zones: PatrolZoneRecord[] = []
  const seenZones = new Set<string>()
  for (const zone of input.zones ?? []) {
    const record = createPatrolZoneRecord(zone)
    if (seenZones.has(record.zoneId)) {
      throw new Error(`patrol doctrine duplicate zoneId ${record.zoneId}`)
    }
    seenZones.add(record.zoneId)
    zones.push(record)
  }
  zones.sort((a, b) => b.priority - a.priority || compareAscii(a.zoneId, b.zoneId))

  const escorts: EscortPolicyRecord[] = []
  const seenPolicies = new Set<string>()
  for (const escort of input.escorts ?? []) {
    const record = createEscortPolicyRecord(escort)
    if (seenPolicies.has(record.policyId)) {
      throw new Error(`patrol doctrine duplicate policyId ${record.policyId}`)
    }
    seenPolicies.add(record.policyId)
    escorts.push(record)
  }
  escorts.sort((a, b) => compareAscii(a.policyId, b.policyId))

  if (zones.length === 0 && escorts.length === 0) {
    throw new Error('patrol doctrine registry requires at least one zone or escort policy')
  }

  return Object.freeze({
    zones: Object.freeze(zones),
    escorts: Object.freeze(escorts),
  })
}

/**
 * Resolve a doctrine-driven response without per-unit player orders.
 */
export function resolvePatrolDoctrineResponse(args: {
  readonly registry: PatrolDoctrineRegistry
  readonly stimulus: PatrolStimulus
}): PatrolDoctrineDecision {
  const registry = createPatrolDoctrineRegistry(args.registry)
  const activeZoneId = requireNonEmpty(args.stimulus.activeZoneId, 'activeZoneId')
  const reasons: string[] = []

  const zone = registry.zones.find((z) => z.zoneId === activeZoneId) ?? null
  if (!zone) {
    return Object.freeze({
      action: 'hold_position',
      zoneId: null,
      policyId: null,
      failureKind: null,
      reasons: Object.freeze(['unknown-zone']),
    })
  }

  const escortedAssetTag = args.stimulus.escortedAssetTag?.trim() || ''
  let escort = null as ReturnType<typeof createEscortPolicyRecord> | null
  if (escortedAssetTag !== '') {
    escort = registry.escorts.find((e) => e.assetTag === escortedAssetTag) ?? null
    if (!escort) {
      return Object.freeze({
        action: 'hold_position',
        zoneId: zone.zoneId,
        policyId: null,
        failureKind: null,
        reasons: Object.freeze(['unknown-escort-asset']),
      })
    }
  }

  const failureKind = detectDoctrineFailure(args.stimulus, zone)

  // Escort policy takes precedence: abandon configured failure kinds, else stay on escort.
  if (escort) {
    if (failureKind && escort.abandonOnFailureKinds.includes(failureKind)) {
      reasons.push(`abandon:${failureKind}`, `escort:${escort.stance}`)
      return Object.freeze({
        action: 'hold_position',
        zoneId: zone.zoneId,
        policyId: escort.policyId,
        failureKind,
        reasons: Object.freeze([...reasons].sort(compareAscii)),
      })
    }
    if (failureKind) {
      reasons.push(`failure:${failureKind}`, `escort:${escort.stance}`)
      return Object.freeze({
        action: 'doctrine_failure',
        zoneId: zone.zoneId,
        policyId: escort.policyId,
        failureKind,
        reasons: Object.freeze([...reasons].sort(compareAscii)),
      })
    }
    if (escort.stance === 'abandon_on_alarm' && args.stimulus.contactPresent) {
      reasons.push('escort:abandon_on_alarm')
      return Object.freeze({
        action: 'hold_position',
        zoneId: zone.zoneId,
        policyId: escort.policyId,
        failureKind: null,
        reasons: Object.freeze([...reasons].sort(compareAscii)),
      })
    }
    reasons.push(`escort:${escort.stance}`)
    return Object.freeze({
      action: 'escort_asset',
      zoneId: zone.zoneId,
      policyId: escort.policyId,
      failureKind: null,
      reasons: Object.freeze([...reasons].sort(compareAscii)),
    })
  }

  if (failureKind) {
    reasons.push(`failure:${failureKind}`)
    if (failureKind === 'decoy_pursuit') reasons.push(`pursuit:${zone.pursuitRule}`)
    return Object.freeze({
      action: 'doctrine_failure',
      zoneId: zone.zoneId,
      policyId: null,
      failureKind,
      reasons: Object.freeze([...reasons].sort(compareAscii)),
    })
  }

  if (args.stimulus.contactPresent && zone.pursuitRule !== 'hold_zone') {
    reasons.push(`pursuit:${zone.pursuitRule}`)
    return Object.freeze({
      action: 'pursue_contact',
      zoneId: zone.zoneId,
      policyId: null,
      failureKind: null,
      reasons: Object.freeze([...reasons].sort(compareAscii)),
    })
  }

  reasons.push(`patrol:${zone.pursuitRule}`)
  return Object.freeze({
    action: 'patrol_zone',
    zoneId: zone.zoneId,
    policyId: null,
    failureKind: null,
    reasons: Object.freeze([...reasons].sort(compareAscii)),
  })
}

function detectDoctrineFailure(
  stimulus: PatrolStimulus,
  zone: PatrolZoneRecord,
): DoctrineFailureKind | null {
  if (stimulus.contactPresent && stimulus.contactIsDecoy && zone.pursuitRule !== 'hold_zone') {
    return 'decoy_pursuit'
  }
  if (stimulus.contactPresent && stimulus.contactIsGlamoured) {
    return 'glamoured_victim'
  }
  if (!stimulus.zoneCleared && zone.overrideConditions.includes('require_clearance')) {
    return 'uncleared_zone'
  }
  return null
}
