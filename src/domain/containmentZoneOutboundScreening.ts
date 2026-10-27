/**
 * SPE-3189 — containment-zone outbound screening and hold routing.
 *
 * Pure caller-owned egress-screen policies decide whether an actor (and carried
 * classes) may leave a controlled facility boundary. Does not own zoning
 * (SPE-292), exposure-duty lifecycle (SPE-3151), quarantine storage (SPE-2934),
 * restricted-asset checkout (SPE-3188), detector physics, or inventory mutation.
 * Hold / quarantine / custody outcomes request follow-up only.
 */

import type { GameState } from './models'
import { ensureNormalizedGameState } from './teamSimulation'

export const OUTBOUND_SCREEN_DIRECTIONS = ['outbound', 'inbound'] as const
export type OutboundScreenDirection = (typeof OUTBOUND_SCREEN_DIRECTIONS)[number]

export const OUTBOUND_SCREEN_DECISIONS = [
  'clear',
  'secondary_screen',
  'hold',
  'decontaminate',
  'quarantine',
  'custody_transfer_required',
  'escalate',
] as const
export type OutboundScreenDecision = (typeof OUTBOUND_SCREEN_DECISIONS)[number]

export const OUTBOUND_SCREEN_REASONS = [
  'ok',
  'ingress_not_outbound',
  'unknown_boundary',
  'malformed_input',
  'actor_exposed',
  'prohibited_carried_class',
  'restricted_asset_unauthorized',
  'restricted_asset_authorized',
  'screening_capability_unavailable',
  'policy_requires_secondary',
  'policy_requires_quarantine',
  'policy_requires_custody_transfer',
  'secondary_cleared',
  'secondary_escalated',
] as const
export type OutboundScreenReason = (typeof OUTBOUND_SCREEN_REASONS)[number]

export const OUTBOUND_SCREEN_FOLLOW_UP_OWNERS = [
  'SPE-3151',
  'SPE-2934',
  'SPE-3188',
  'custody',
  'procedure',
] as const
export type OutboundScreenFollowUpOwner = (typeof OUTBOUND_SCREEN_FOLLOW_UP_OWNERS)[number]

export const OUTBOUND_SCREEN_HOLD_STATES = [
  'active',
  'secondary_pending',
  'cleared',
  'escalated',
  'routed',
] as const
export type OutboundScreenHoldState = (typeof OUTBOUND_SCREEN_HOLD_STATES)[number]

export type OutboundScreenHoldId = string

/** Authored egress-screen policy keyed to a SPE-292-compatible boundary zone id. */
export interface OutboundScreenPolicy {
  readonly policyId: string
  readonly boundaryZoneId: string
  /** Capability id that must be present when screening this boundary. */
  readonly requiredScreeningCapability?: string
  readonly holdCarriedClasses?: readonly string[]
  readonly secondaryScreenCarriedClasses?: readonly string[]
  readonly quarantineCarriedClasses?: readonly string[]
  readonly custodyTransferCarriedClasses?: readonly string[]
  /** Carried class that requires SPE-3188 checkout authorization when present. */
  readonly restrictedAssetClass?: string
}

export interface OutboundScreenRequest {
  readonly direction: OutboundScreenDirection
  readonly boundaryZoneId: string
  readonly actorId: string
  readonly actorExposed?: boolean
  readonly carriedClasses?: readonly string[]
  /**
   * SPE-3188 authorization projection for a carried restricted asset.
   * `true` / `false` when a restricted asset is present; omit when none.
   */
  readonly restrictedAssetCheckoutAuthorized?: boolean
  readonly screeningCapabilities?: readonly string[]
  readonly policies: readonly OutboundScreenPolicy[]
}

export interface OutboundScreenResult {
  readonly decision: OutboundScreenDecision
  readonly reasons: readonly OutboundScreenReason[]
  readonly policyId?: string
  readonly boundaryZoneId: string
  readonly actorId: string
  readonly followUpOwner?: OutboundScreenFollowUpOwner
  /** True when this result requests follow-up without mutating inventory/custody. */
  readonly inventoryUnchanged: true
}

export type OutboundScreenHoldRecord = Readonly<{
  holdId: OutboundScreenHoldId
  idempotencyKey: string
  state: OutboundScreenHoldState
  boundaryZoneId: string
  actorId: string
  decision: OutboundScreenDecision
  reasons: readonly OutboundScreenReason[]
  policyId?: string
  followUpOwner?: OutboundScreenFollowUpOwner
}>

export type FacilityOutboundScreenHolds = Readonly<
  Record<OutboundScreenHoldId, OutboundScreenHoldRecord>
>

export const CONTAINMENT_EGRESS_BOUNDARY_ZONE_ID = 'zone:containment-egress' as const
export const CONTAINMENT_EGRESS_SCREEN_CAPABILITY = 'capability:egress_screen' as const
export const RESTRICTED_ASSET_CARRIED_CLASS = 'restricted_asset' as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOwnEnumerableProperty(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.propertyIsEnumerable.call(value, key)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isMember<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
}

function compareCodeUnit(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function sortUnique(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort(compareCodeUnit))
}

function sortUniqueReasons(values: readonly OutboundScreenReason[]): readonly OutboundScreenReason[] {
  return Object.freeze(
    [...new Set(values)].sort((left, right) => compareCodeUnit(left, right))
  ) as readonly OutboundScreenReason[]
}

function freezeResult(result: OutboundScreenResult): OutboundScreenResult {
  return Object.freeze({
    ...result,
    reasons: sortUniqueReasons(result.reasons),
  })
}

function freezeHold(record: OutboundScreenHoldRecord): OutboundScreenHoldRecord {
  return Object.freeze({
    ...record,
    reasons: sortUniqueReasons(record.reasons),
  })
}

function normalizeStringList(value: unknown): readonly string[] | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) return undefined
  const out: string[] = []
  for (const entry of value) {
    if (!isNonEmptyString(entry)) return undefined
    out.push(entry.trim())
  }
  return sortUnique(out)
}

/** Normalize one authored egress-screen policy. Malformed → undefined. */
export function projectOutboundScreenPolicy(input: unknown): OutboundScreenPolicy | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.policyId) || !isNonEmptyString(input.boundaryZoneId)) return undefined

  const requiredScreeningCapability =
    input.requiredScreeningCapability === undefined
      ? undefined
      : isNonEmptyString(input.requiredScreeningCapability)
        ? input.requiredScreeningCapability.trim()
        : undefined
  if (
    input.requiredScreeningCapability !== undefined &&
    requiredScreeningCapability === undefined
  ) {
    return undefined
  }

  const holdCarriedClasses = normalizeStringList(input.holdCarriedClasses)
  if (input.holdCarriedClasses !== undefined && holdCarriedClasses === undefined) return undefined
  const secondaryScreenCarriedClasses = normalizeStringList(input.secondaryScreenCarriedClasses)
  if (
    input.secondaryScreenCarriedClasses !== undefined &&
    secondaryScreenCarriedClasses === undefined
  ) {
    return undefined
  }
  const quarantineCarriedClasses = normalizeStringList(input.quarantineCarriedClasses)
  if (input.quarantineCarriedClasses !== undefined && quarantineCarriedClasses === undefined) {
    return undefined
  }
  const custodyTransferCarriedClasses = normalizeStringList(input.custodyTransferCarriedClasses)
  if (
    input.custodyTransferCarriedClasses !== undefined &&
    custodyTransferCarriedClasses === undefined
  ) {
    return undefined
  }

  const restrictedAssetClass =
    input.restrictedAssetClass === undefined
      ? undefined
      : isNonEmptyString(input.restrictedAssetClass)
        ? input.restrictedAssetClass.trim()
        : undefined
  if (input.restrictedAssetClass !== undefined && restrictedAssetClass === undefined) {
    return undefined
  }

  return Object.freeze({
    policyId: input.policyId.trim(),
    boundaryZoneId: input.boundaryZoneId.trim(),
    ...(requiredScreeningCapability !== undefined ? { requiredScreeningCapability } : {}),
    ...(holdCarriedClasses !== undefined ? { holdCarriedClasses } : {}),
    ...(secondaryScreenCarriedClasses !== undefined ? { secondaryScreenCarriedClasses } : {}),
    ...(quarantineCarriedClasses !== undefined ? { quarantineCarriedClasses } : {}),
    ...(custodyTransferCarriedClasses !== undefined ? { custodyTransferCarriedClasses } : {}),
    ...(restrictedAssetClass !== undefined ? { restrictedAssetClass } : {}),
  })
}

function classHits(carried: ReadonlySet<string>, listed: readonly string[] | undefined): boolean {
  if (listed === undefined || listed.length === 0) return false
  return listed.some((entry) => carried.has(entry))
}

/**
 * Resolve outbound screening for one boundary crossing attempt.
 * Does not mutate inventory, exposure, quarantine, or checkout state.
 */
export function resolveOutboundScreening(input: unknown): OutboundScreenResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isMember(input.direction, OUTBOUND_SCREEN_DIRECTIONS)) return undefined
  if (!isNonEmptyString(input.boundaryZoneId) || !isNonEmptyString(input.actorId)) return undefined
  if (input.actorExposed !== undefined && typeof input.actorExposed !== 'boolean') return undefined
  if (
    input.restrictedAssetCheckoutAuthorized !== undefined &&
    typeof input.restrictedAssetCheckoutAuthorized !== 'boolean'
  ) {
    return undefined
  }

  let carriedClasses: readonly string[] = Object.freeze([])
  if (input.carriedClasses !== undefined) {
    const normalized = normalizeStringList(input.carriedClasses)
    if (normalized === undefined) return undefined
    carriedClasses = normalized
  }

  const screeningCapabilities =
    input.screeningCapabilities === undefined
      ? Object.freeze([])
      : normalizeStringList(input.screeningCapabilities)
  if (screeningCapabilities === undefined) return undefined

  if (!Array.isArray(input.policies)) return undefined
  const policies: OutboundScreenPolicy[] = []
  for (const entry of input.policies) {
    const policy = projectOutboundScreenPolicy(entry)
    if (policy === undefined) return undefined
    policies.push(policy)
  }

  const boundaryZoneId = input.boundaryZoneId.trim()
  const actorId = input.actorId.trim()
  const direction = input.direction

  if (direction === 'inbound') {
    return freezeResult({
      decision: 'escalate',
      reasons: ['ingress_not_outbound'],
      boundaryZoneId,
      actorId,
      inventoryUnchanged: true,
    })
  }

  const matching = policies
    .filter((policy) => policy.boundaryZoneId === boundaryZoneId)
    .sort((left, right) => compareCodeUnit(left.policyId, right.policyId))
  if (matching.length === 0) {
    return freezeResult({
      decision: 'escalate',
      reasons: ['unknown_boundary'],
      boundaryZoneId,
      actorId,
      inventoryUnchanged: true,
    })
  }

  const policy = matching[0]!
  const carried = new Set(carriedClasses)

  if (input.actorExposed === true) {
    return freezeResult({
      decision: 'decontaminate',
      reasons: ['actor_exposed'],
      policyId: policy.policyId,
      boundaryZoneId,
      actorId,
      followUpOwner: 'SPE-3151',
      inventoryUnchanged: true,
    })
  }

  if (
    policy.requiredScreeningCapability !== undefined &&
    !screeningCapabilities.includes(policy.requiredScreeningCapability)
  ) {
    return freezeResult({
      decision: 'escalate',
      reasons: ['screening_capability_unavailable'],
      policyId: policy.policyId,
      boundaryZoneId,
      actorId,
      followUpOwner: 'procedure',
      inventoryUnchanged: true,
    })
  }

  const restrictedClass = policy.restrictedAssetClass ?? RESTRICTED_ASSET_CARRIED_CLASS
  const carriesRestricted = carried.has(restrictedClass)
  if (carriesRestricted) {
    if (input.restrictedAssetCheckoutAuthorized !== true) {
      return freezeResult({
        decision: 'hold',
        reasons: ['restricted_asset_unauthorized'],
        policyId: policy.policyId,
        boundaryZoneId,
        actorId,
        followUpOwner: 'SPE-3188',
        inventoryUnchanged: true,
      })
    }
  }

  if (classHits(carried, policy.custodyTransferCarriedClasses)) {
    return freezeResult({
      decision: 'custody_transfer_required',
      reasons: ['policy_requires_custody_transfer'],
      policyId: policy.policyId,
      boundaryZoneId,
      actorId,
      followUpOwner: 'custody',
      inventoryUnchanged: true,
    })
  }

  if (classHits(carried, policy.quarantineCarriedClasses)) {
    return freezeResult({
      decision: 'quarantine',
      reasons: ['policy_requires_quarantine'],
      policyId: policy.policyId,
      boundaryZoneId,
      actorId,
      followUpOwner: 'SPE-2934',
      inventoryUnchanged: true,
    })
  }

  if (classHits(carried, policy.holdCarriedClasses)) {
    return freezeResult({
      decision: 'hold',
      reasons: ['prohibited_carried_class'],
      policyId: policy.policyId,
      boundaryZoneId,
      actorId,
      followUpOwner: 'procedure',
      inventoryUnchanged: true,
    })
  }

  if (classHits(carried, policy.secondaryScreenCarriedClasses)) {
    return freezeResult({
      decision: 'secondary_screen',
      reasons: ['policy_requires_secondary'],
      policyId: policy.policyId,
      boundaryZoneId,
      actorId,
      followUpOwner: 'procedure',
      inventoryUnchanged: true,
    })
  }

  const reasons: OutboundScreenReason[] = ['ok']
  if (carriesRestricted && input.restrictedAssetCheckoutAuthorized === true) {
    reasons.push('restricted_asset_authorized')
  }

  return freezeResult({
    decision: 'clear',
    reasons,
    policyId: policy.policyId,
    boundaryZoneId,
    actorId,
    inventoryUnchanged: true,
  })
}

function parseHoldRecord(
  value: unknown,
  expectedId: OutboundScreenHoldId
): OutboundScreenHoldRecord | undefined {
  if (!isRecord(value)) return undefined
  if (!hasOwnEnumerableProperty(value, 'holdId') || value.holdId !== expectedId) return undefined
  if (!isNonEmptyString(value.holdId) || !isNonEmptyString(value.idempotencyKey)) return undefined
  if (!isMember(value.state, OUTBOUND_SCREEN_HOLD_STATES)) return undefined
  if (!isNonEmptyString(value.boundaryZoneId) || !isNonEmptyString(value.actorId)) return undefined
  if (!isMember(value.decision, OUTBOUND_SCREEN_DECISIONS)) return undefined
  if (!Array.isArray(value.reasons)) return undefined
  const reasons: OutboundScreenReason[] = []
  for (const reason of value.reasons) {
    if (!isMember(reason, OUTBOUND_SCREEN_REASONS)) return undefined
    reasons.push(reason)
  }
  const policyId =
    value.policyId === undefined
      ? undefined
      : isNonEmptyString(value.policyId)
        ? value.policyId
        : undefined
  if (value.policyId !== undefined && policyId === undefined) return undefined
  const followUpOwner =
    value.followUpOwner === undefined
      ? undefined
      : isMember(value.followUpOwner, OUTBOUND_SCREEN_FOLLOW_UP_OWNERS)
        ? value.followUpOwner
        : undefined
  if (value.followUpOwner !== undefined && followUpOwner === undefined) return undefined

  return freezeHold({
    holdId: value.holdId,
    idempotencyKey: value.idempotencyKey,
    state: value.state,
    boundaryZoneId: value.boundaryZoneId,
    actorId: value.actorId,
    decision: value.decision,
    reasons,
    ...(policyId !== undefined ? { policyId } : {}),
    ...(followUpOwner !== undefined ? { followUpOwner } : {}),
  })
}

/**
 * Hydrate optional `GameState.facilityOutboundScreenHolds`.
 * Legacy omit / malformed non-records / empty after sanitize → undefined.
 */
export function parseFacilityOutboundScreenHolds(
  value: unknown
): FacilityOutboundScreenHolds | undefined {
  if (value === undefined) return undefined
  if (!isRecord(value)) return undefined
  const out: Record<string, OutboundScreenHoldRecord> = {}
  for (const key of Object.keys(value).sort(compareCodeUnit)) {
    if (!hasOwnEnumerableProperty(value, key)) continue
    if (!isNonEmptyString(key)) continue
    const parsed = parseHoldRecord(value[key], key)
    if (parsed === undefined) continue
    out[key] = parsed
  }
  if (Object.keys(out).length === 0) return undefined
  return Object.freeze(out)
}

function readHolds(state: GameState): FacilityOutboundScreenHolds {
  return parseFacilityOutboundScreenHolds(state.facilityOutboundScreenHolds) ?? Object.freeze({})
}

function writeHolds(state: GameState, holds: FacilityOutboundScreenHolds): GameState {
  const normalized = ensureNormalizedGameState(state)
  if (Object.keys(holds).length === 0) {
    if (normalized.facilityOutboundScreenHolds === undefined) return normalized
    const rest = { ...normalized }
    delete rest.facilityOutboundScreenHolds
    return rest
  }
  return {
    ...normalized,
    facilityOutboundScreenHolds: Object.freeze({ ...holds }),
  }
}

export type OutboundScreenHoldResult =
  | { ok: true; state: GameState; hold: OutboundScreenHoldRecord }
  | { ok: false; state: GameState; code: 'invalid_input' | 'not_found' | 'illegal_transition' }

function initialHoldState(decision: OutboundScreenDecision): OutboundScreenHoldState {
  if (decision === 'secondary_screen') return 'secondary_pending'
  if (decision === 'clear') return 'cleared'
  return 'active'
}

/**
 * Open or resume a durable hold/secondary-screen transaction from a screening result.
 * Same idempotency key returns the existing hold without duplication.
 */
export function openOutboundScreenHold(
  state: GameState,
  input: unknown
): OutboundScreenHoldResult {
  if (!isRecord(input)) return { ok: false, state, code: 'invalid_input' }
  if (!isNonEmptyString(input.holdId) || !isNonEmptyString(input.idempotencyKey)) {
    return { ok: false, state, code: 'invalid_input' }
  }
  const screening = resolveOutboundScreening(input.screening)
  if (screening === undefined) return { ok: false, state, code: 'invalid_input' }
  if (
    screening.decision !== 'hold' &&
    screening.decision !== 'secondary_screen' &&
    screening.decision !== 'quarantine' &&
    screening.decision !== 'custody_transfer_required' &&
    screening.decision !== 'decontaminate' &&
    screening.decision !== 'escalate'
  ) {
    return { ok: false, state, code: 'invalid_input' }
  }

  const holds = { ...readHolds(state) }
  const existingByKey = Object.values(holds).find(
    (hold) => hold.idempotencyKey === input.idempotencyKey
  )
  if (existingByKey) {
    return { ok: true, state, hold: existingByKey }
  }
  if (holds[input.holdId]) {
    return { ok: false, state, code: 'illegal_transition' }
  }

  const hold = freezeHold({
    holdId: input.holdId.trim(),
    idempotencyKey: input.idempotencyKey.trim(),
    state: initialHoldState(screening.decision),
    boundaryZoneId: screening.boundaryZoneId,
    actorId: screening.actorId,
    decision: screening.decision,
    reasons: screening.reasons,
    ...(screening.policyId !== undefined ? { policyId: screening.policyId } : {}),
    ...(screening.followUpOwner !== undefined ? { followUpOwner: screening.followUpOwner } : {}),
  })
  holds[hold.holdId] = hold
  return { ok: true, state: writeHolds(state, Object.freeze(holds)), hold }
}

/**
 * Resolve a secondary-screen hold to clear or escalate. Idempotent on terminal states.
 */
export function resolveOutboundSecondaryScreen(
  state: GameState,
  input: unknown
): OutboundScreenHoldResult {
  if (!isRecord(input) || !isNonEmptyString(input.holdId)) {
    return { ok: false, state, code: 'invalid_input' }
  }
  if (input.outcome !== 'clear' && input.outcome !== 'escalate') {
    return { ok: false, state, code: 'invalid_input' }
  }

  const holds = { ...readHolds(state) }
  const current = holds[input.holdId]
  if (!current) return { ok: false, state, code: 'not_found' }

  if (input.outcome === 'clear' && current.state === 'cleared') {
    return { ok: true, state, hold: current }
  }
  if (input.outcome === 'escalate' && current.state === 'escalated') {
    return { ok: true, state, hold: current }
  }
  if (current.state !== 'secondary_pending' && current.state !== 'active') {
    return { ok: false, state, code: 'illegal_transition' }
  }

  const hold =
    input.outcome === 'clear'
      ? freezeHold({
          ...current,
          state: 'cleared',
          decision: 'clear',
          reasons: sortUniqueReasons([...current.reasons, 'secondary_cleared']),
        })
      : freezeHold({
          ...current,
          state: 'escalated',
          decision: 'escalate',
          reasons: sortUniqueReasons([...current.reasons, 'secondary_escalated']),
          followUpOwner: current.followUpOwner ?? 'procedure',
        })
  holds[hold.holdId] = hold
  return { ok: true, state: writeHolds(state, Object.freeze(holds)), hold }
}

/** Representative acceptance fixture for a containment egress boundary. */
export function authoredContainmentEgressScreenPolicy(
  overrides?: Partial<OutboundScreenPolicy>
): OutboundScreenPolicy {
  return Object.freeze({
    policyId: overrides?.policyId ?? 'policy:containment-egress-screen',
    boundaryZoneId: overrides?.boundaryZoneId ?? CONTAINMENT_EGRESS_BOUNDARY_ZONE_ID,
    requiredScreeningCapability:
      overrides?.requiredScreeningCapability ?? CONTAINMENT_EGRESS_SCREEN_CAPABILITY,
    holdCarriedClasses: overrides?.holdCarriedClasses ?? Object.freeze(['contraband_sample']),
    secondaryScreenCarriedClasses:
      overrides?.secondaryScreenCarriedClasses ?? Object.freeze(['controlled_tool']),
    quarantineCarriedClasses:
      overrides?.quarantineCarriedClasses ?? Object.freeze(['cursed_residue']),
    custodyTransferCarriedClasses:
      overrides?.custodyTransferCarriedClasses ?? Object.freeze(['custody_parcel']),
    restrictedAssetClass: overrides?.restrictedAssetClass ?? RESTRICTED_ASSET_CARRIED_CLASS,
  })
}
