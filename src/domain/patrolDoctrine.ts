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

function requireToken(value: string | null | undefined, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`patrol doctrine ${label} is required`)
  }
  return value.trim()
}

function asciiCmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

function requireEnum<T extends string>(value: string, allowed: readonly T[], label: string): T {
  if ((allowed as readonly string[]).includes(value)) return value as T
  throw new Error(`patrol doctrine ${label} is invalid`)
}

function requirePriority(value: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value < 1) {
    throw new Error('patrol doctrine priority must be an integer >= 1')
  }
  return value
}

function uniqueSortedTokens(values: readonly string[], label: string): readonly string[] {
  return Object.freeze(
    [...new Set(values.map((v) => requireToken(v, label)))].sort(asciiCmp),
  )
}

export function createPatrolZoneRecord(input: PatrolZoneRecord): PatrolZoneRecord {
  return Object.freeze({
    zoneId: requireToken(input.zoneId, 'zoneId'),
    geometryRef: requireToken(input.geometryRef, 'geometryRef'),
    priority: requirePriority(input.priority),
    pursuitRule: requireEnum(input.pursuitRule, PURSUIT, 'pursuitRule'),
    overrideConditions: uniqueSortedTokens(input.overrideConditions ?? [], 'overrideCondition'),
  })
}

export function createEscortPolicyRecord(input: EscortPolicyRecord): EscortPolicyRecord {
  return Object.freeze({
    policyId: requireToken(input.policyId, 'policyId'),
    assetTag: requireToken(input.assetTag, 'assetTag'),
    stance: requireEnum(input.stance, STANCES, 'stance'),
    abandonOnFailureKinds: Object.freeze(
      uniqueSortedTokens(input.abandonOnFailureKinds ?? [], 'abandonOnFailureKind').map((k) =>
        requireEnum(k, FAILURES, 'abandonOnFailureKind'),
      ),
    ),
  })
}

function mapUniqueById<T>(
  items: readonly T[],
  idOf: (item: T) => string,
  label: string,
): T[] {
  const out: T[] = []
  const seen = new Set<string>()
  for (const item of items) {
    const id = idOf(item)
    if (seen.has(id)) throw new Error(`patrol doctrine duplicate ${label} ${id}`)
    seen.add(id)
    out.push(item)
  }
  return out
}

export function createPatrolDoctrineRegistry(input: PatrolDoctrineRegistry): PatrolDoctrineRegistry {
  const zones = mapUniqueById(
    (input.zones ?? []).map(createPatrolZoneRecord),
    (z) => z.zoneId,
    'zoneId',
  ).sort((a, b) => b.priority - a.priority || asciiCmp(a.zoneId, b.zoneId))

  const escorts = mapUniqueById(
    (input.escorts ?? []).map(createEscortPolicyRecord),
    (e) => e.policyId,
    'policyId',
  ).sort((a, b) => asciiCmp(a.policyId, b.policyId))

  if (zones.length === 0 && escorts.length === 0) {
    throw new Error('patrol doctrine registry requires at least one zone or escort policy')
  }

  return Object.freeze({
    zones: Object.freeze(zones),
    escorts: Object.freeze(escorts),
  })
}

function decision(args: {
  readonly action: PatrolResponseAction
  readonly zoneId: string | null
  readonly policyId: string | null
  readonly failureKind: DoctrineFailureKind | null
  readonly reasons: readonly string[]
}): PatrolDoctrineDecision {
  return Object.freeze({
    action: args.action,
    zoneId: args.zoneId,
    policyId: args.policyId,
    failureKind: args.failureKind,
    reasons: Object.freeze([...args.reasons].sort(asciiCmp)),
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
  const activeZoneId = requireToken(args.stimulus.activeZoneId, 'activeZoneId')

  const zone = registry.zones.find((z) => z.zoneId === activeZoneId) ?? null
  if (!zone) {
    return decision({
      action: 'hold_position',
      zoneId: null,
      policyId: null,
      failureKind: null,
      reasons: ['unknown-zone'],
    })
  }

  const escortedAssetTag = args.stimulus.escortedAssetTag?.trim() || ''
  let escort: EscortPolicyRecord | null = null
  if (escortedAssetTag !== '') {
    escort = registry.escorts.find((e) => e.assetTag === escortedAssetTag) ?? null
    if (!escort) {
      return decision({
        action: 'hold_position',
        zoneId: zone.zoneId,
        policyId: null,
        failureKind: null,
        reasons: ['unknown-escort-asset'],
      })
    }
  }

  // Escort overrides bare pursuit: skip decoy_pursuit while escorting (unit is not pursuing).
  const failureKind = detectDoctrineFailure(args.stimulus, zone, escort !== null)

  // Escort policy takes precedence: abandon configured failure kinds, else stay on escort.
  if (escort) {
    if (failureKind && escort.abandonOnFailureKinds.includes(failureKind)) {
      return decision({
        action: 'hold_position',
        zoneId: zone.zoneId,
        policyId: escort.policyId,
        failureKind,
        reasons: [`abandon:${failureKind}`, `escort:${escort.stance}`],
      })
    }
    if (escort.stance === 'abandon_on_alarm' && args.stimulus.contactPresent) {
      return decision({
        action: 'hold_position',
        zoneId: zone.zoneId,
        policyId: escort.policyId,
        failureKind: null,
        reasons: ['escort:abandon_on_alarm'],
      })
    }
    return decision({
      action: 'escort_asset',
      zoneId: zone.zoneId,
      policyId: escort.policyId,
      failureKind: null,
      reasons: [`escort:${escort.stance}`],
    })
  }

  if (failureKind) {
    const reasons = [`failure:${failureKind}`]
    if (failureKind === 'decoy_pursuit') reasons.push(`pursuit:${zone.pursuitRule}`)
    return decision({
      action: 'doctrine_failure',
      zoneId: zone.zoneId,
      policyId: null,
      failureKind,
      reasons,
    })
  }

  if (args.stimulus.contactPresent && zone.pursuitRule !== 'hold_zone') {
    return decision({
      action: 'pursue_contact',
      zoneId: zone.zoneId,
      policyId: null,
      failureKind: null,
      reasons: [`pursuit:${zone.pursuitRule}`],
    })
  }

  return decision({
    action: 'patrol_zone',
    zoneId: zone.zoneId,
    policyId: null,
    failureKind: null,
    reasons: [`patrol:${zone.pursuitRule}`],
  })
}

function detectDoctrineFailure(
  stimulus: PatrolStimulus,
  zone: PatrolZoneRecord,
  escorting: boolean,
): DoctrineFailureKind | null {
  // Glamour is a contact classification; evaluate before decoy so abandon lists can fire.
  if (stimulus.contactPresent && stimulus.contactIsGlamoured) {
    return 'glamoured_victim'
  }
  // Decoy only fools pursuit — escorting units are not pursuing.
  if (
    !escorting &&
    stimulus.contactPresent &&
    stimulus.contactIsDecoy &&
    zone.pursuitRule !== 'hold_zone'
  ) {
    return 'decoy_pursuit'
  }
  if (!stimulus.zoneCleared && zone.overrideConditions.includes('require_clearance')) {
    return 'uncleared_zone'
  }
  return null
}
