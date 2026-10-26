/**
 * SPE-3188 — restricted-asset field checkout and verified return lifecycle.
 *
 * Owns temporary checkout transaction state only. Consumes SPE-2911 restricted-object
 * component-set custody/release for physical removal (`stored` → `inspection`) and
 * verified restoration (`inspection` → `stored`). Does not mint inventory, locations,
 * or a parallel custody ledger.
 */

import type { GameState } from './models'
import { ensureNormalizedGameState } from './teamSimulation'
import {
  isRestrictedObjectSetId,
  parseFacilityRestrictedObjectRelease,
  RELIQUARY_KEY_SET_COMPONENT_IDS,
  RELIQUARY_KEY_SET_ID,
  restoreRestrictedObjectToStored,
  RESTRICTED_OBJECT_SET_COMPONENTS,
  type RestrictedObjectComponentId,
  type RestrictedObjectSetId,
  transitionRestrictedObjectRelease,
} from './facilityRestrictedObjectRelease'

export const RESTRICTED_ASSET_CHECKOUT_STATES = [
  'authorized',
  'checked_out',
  'return_presented',
  'return_verified',
  'closed',
  'overdue',
  'lost',
  'compromised',
  'return_rejected',
] as const
export type RestrictedAssetCheckoutState = (typeof RESTRICTED_ASSET_CHECKOUT_STATES)[number]

export const RESTRICTED_ASSET_CHECKOUT_FAILURE_CODES = [
  'unauthorized',
  'invalid_input',
  'incomplete_set',
  'illegal_transition',
  'release_blocked',
  'verifier_ineligible',
  'not_found',
] as const
export type RestrictedAssetCheckoutFailureCode =
  (typeof RESTRICTED_ASSET_CHECKOUT_FAILURE_CODES)[number]

export type RestrictedAssetCheckoutId = string

export type RestrictedAssetCheckoutRecord = Readonly<{
  checkoutId: RestrictedAssetCheckoutId
  setId: RestrictedObjectSetId
  components: readonly RestrictedObjectComponentId[]
  state: RestrictedAssetCheckoutState
  custodianId: string
  purpose: string
  authorizationRef: string
  checkoutWeek: number
  returnDeadlineWeek?: number
  requiresIndependentVerifier: boolean
  attestedVerifierId?: string
  reason?: string
}>

export type FacilityRestrictedAssetCheckouts = Readonly<
  Record<RestrictedAssetCheckoutId, RestrictedAssetCheckoutRecord>
>

export type RestrictedAssetCheckoutResult =
  | {
      ok: true
      state: GameState
      checkout: RestrictedAssetCheckoutRecord
    }
  | {
      ok: false
      state: GameState
      code: RestrictedAssetCheckoutFailureCode
      reason?: string
    }

const ACTIVE_FIELD_STATES: ReadonlySet<RestrictedAssetCheckoutState> = new Set([
  'authorized',
  'checked_out',
  'return_presented',
  'overdue',
])

const TERMINAL_STATES: ReadonlySet<RestrictedAssetCheckoutState> = new Set([
  'closed',
  'lost',
  'compromised',
  'return_rejected',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOwnEnumerableProperty(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.propertyIsEnumerable.call(value, key)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function isFiniteWeek(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value >= 0
}

function isCheckoutState(value: unknown): value is RestrictedAssetCheckoutState {
  return RESTRICTED_ASSET_CHECKOUT_STATES.some((state) => state === value)
}

function isExactAuthoredMembership(
  value: unknown,
  setId: RestrictedObjectSetId
): value is readonly RestrictedObjectComponentId[] {
  if (!Array.isArray(value)) return false
  const expected = RESTRICTED_OBJECT_SET_COMPONENTS[setId]
  if (value.length !== expected.length) return false
  const seen = new Set<string>()
  for (const entry of value) {
    if (!expected.some((componentId) => componentId === entry)) return false
    if (seen.has(entry)) return false
    seen.add(entry)
  }
  return seen.size === expected.length
}

function authoredComponents(setId: RestrictedObjectSetId): readonly RestrictedObjectComponentId[] {
  return Object.freeze([...RESTRICTED_OBJECT_SET_COMPONENTS[setId]])
}

function freezeCheckout(record: RestrictedAssetCheckoutRecord): RestrictedAssetCheckoutRecord {
  return Object.freeze({
    ...record,
    components: Object.freeze([...record.components]),
  })
}

function parseCheckoutRecord(
  value: unknown,
  expectedId: RestrictedAssetCheckoutId
): RestrictedAssetCheckoutRecord | undefined {
  if (!isRecord(value)) return undefined
  if (!hasOwnEnumerableProperty(value, 'checkoutId') || value.checkoutId !== expectedId) {
    return undefined
  }
  if (!isNonEmptyString(value.checkoutId)) return undefined
  if (!hasOwnEnumerableProperty(value, 'setId') || !isRestrictedObjectSetId(value.setId)) {
    return undefined
  }
  const setId = value.setId
  if (
    !hasOwnEnumerableProperty(value, 'components') ||
    !isExactAuthoredMembership(value.components, setId)
  ) {
    return undefined
  }
  if (!hasOwnEnumerableProperty(value, 'state') || !isCheckoutState(value.state)) return undefined
  if (!hasOwnEnumerableProperty(value, 'custodianId') || !isNonEmptyString(value.custodianId)) {
    return undefined
  }
  if (!hasOwnEnumerableProperty(value, 'purpose') || !isNonEmptyString(value.purpose)) {
    return undefined
  }
  if (
    !hasOwnEnumerableProperty(value, 'authorizationRef') ||
    !isNonEmptyString(value.authorizationRef)
  ) {
    return undefined
  }
  if (!hasOwnEnumerableProperty(value, 'checkoutWeek') || !isFiniteWeek(value.checkoutWeek)) {
    return undefined
  }
  if (
    !hasOwnEnumerableProperty(value, 'requiresIndependentVerifier') ||
    typeof value.requiresIndependentVerifier !== 'boolean'
  ) {
    return undefined
  }

  let returnDeadlineWeek: number | undefined
  if (hasOwnEnumerableProperty(value, 'returnDeadlineWeek')) {
    if (!isFiniteWeek(value.returnDeadlineWeek)) return undefined
    returnDeadlineWeek = value.returnDeadlineWeek
  }
  let attestedVerifierId: string | undefined
  if (hasOwnEnumerableProperty(value, 'attestedVerifierId')) {
    if (!isNonEmptyString(value.attestedVerifierId)) return undefined
    attestedVerifierId = value.attestedVerifierId
  }
  let reason: string | undefined
  if (hasOwnEnumerableProperty(value, 'reason')) {
    if (!isNonEmptyString(value.reason)) return undefined
    reason = value.reason
  }

  return freezeCheckout({
    checkoutId: value.checkoutId,
    setId,
    components: authoredComponents(setId),
    state: value.state,
    custodianId: value.custodianId,
    purpose: value.purpose,
    authorizationRef: value.authorizationRef,
    checkoutWeek: value.checkoutWeek,
    requiresIndependentVerifier: value.requiresIndependentVerifier,
    ...(returnDeadlineWeek !== undefined ? { returnDeadlineWeek } : {}),
    ...(attestedVerifierId !== undefined ? { attestedVerifierId } : {}),
    ...(reason !== undefined ? { reason } : {}),
  })
}

/**
 * Hydrate optional `GameState.facilityRestrictedAssetCheckouts`.
 * Omit / non-record / empty after sanitizing → undefined.
 * Malformed siblings drop independently; valid entries rebuild frozen.
 */
export function parseFacilityRestrictedAssetCheckouts(
  value: unknown
): FacilityRestrictedAssetCheckouts | undefined {
  if (value === undefined) return undefined
  if (!isRecord(value)) return undefined

  const next: Record<string, RestrictedAssetCheckoutRecord> = {}
  for (const key of Object.keys(value)) {
    if (!hasOwnEnumerableProperty(value, key)) continue
    if (!isNonEmptyString(key)) continue
    const parsed = parseCheckoutRecord(value[key], key)
    if (!parsed) continue
    next[key] = parsed
  }
  return Object.keys(next).length === 0 ? undefined : Object.freeze(next)
}

function readRegistry(state: GameState): FacilityRestrictedAssetCheckouts {
  return parseFacilityRestrictedAssetCheckouts(state.facilityRestrictedAssetCheckouts) ?? Object.freeze({})
}

function writeRegistry(
  state: GameState,
  registry: Record<string, RestrictedAssetCheckoutRecord>
): GameState {
  const frozen = Object.freeze(
    Object.fromEntries(
      Object.entries(registry).map(([id, record]) => [id, freezeCheckout(record)])
    )
  ) as FacilityRestrictedAssetCheckouts
  return {
    ...ensureNormalizedGameState(state),
    facilityRestrictedAssetCheckouts: frozen,
  }
}

function activeCheckoutForSet(
  registry: FacilityRestrictedAssetCheckouts,
  setId: RestrictedObjectSetId
): RestrictedAssetCheckoutRecord | undefined {
  for (const record of Object.values(registry)) {
    if (record.setId === setId && ACTIVE_FIELD_STATES.has(record.state)) return record
  }
  return undefined
}

function fail(
  state: GameState,
  code: RestrictedAssetCheckoutFailureCode,
  reason?: string
): RestrictedAssetCheckoutResult {
  return reason === undefined ? { ok: false, state, code } : { ok: false, state, code, reason }
}

/**
 * Authorize a temporary field checkout for one complete stored restricted set.
 * Unauthorized or incomplete membership fail closed without mutation.
 */
export function authorizeRestrictedAssetCheckout(
  state: GameState,
  input: unknown
): RestrictedAssetCheckoutResult {
  if (!isRecord(input)) return fail(state, 'invalid_input')
  if (!hasOwnEnumerableProperty(input, 'authorized') || input.authorized !== true) {
    return fail(state, 'unauthorized', 'authorization_required')
  }
  if (!hasOwnEnumerableProperty(input, 'checkoutId') || !isNonEmptyString(input.checkoutId)) {
    return fail(state, 'invalid_input', 'checkout_id_required')
  }
  if (!hasOwnEnumerableProperty(input, 'setId') || !isRestrictedObjectSetId(input.setId)) {
    return fail(state, 'invalid_input', 'set_id_required')
  }
  const setId = input.setId
  if (
    !hasOwnEnumerableProperty(input, 'components') ||
    !isExactAuthoredMembership(input.components, setId)
  ) {
    return fail(state, 'incomplete_set')
  }
  if (!hasOwnEnumerableProperty(input, 'custodianId') || !isNonEmptyString(input.custodianId)) {
    return fail(state, 'invalid_input', 'custodian_required')
  }
  if (!hasOwnEnumerableProperty(input, 'purpose') || !isNonEmptyString(input.purpose)) {
    return fail(state, 'invalid_input', 'purpose_required')
  }
  if (
    !hasOwnEnumerableProperty(input, 'authorizationRef') ||
    !isNonEmptyString(input.authorizationRef)
  ) {
    return fail(state, 'invalid_input', 'authorization_ref_required')
  }

  let requiresIndependentVerifier = true
  if (hasOwnEnumerableProperty(input, 'requiresIndependentVerifier')) {
    if (typeof input.requiresIndependentVerifier !== 'boolean') {
      return fail(state, 'invalid_input', 'verifier_policy_malformed')
    }
    requiresIndependentVerifier = input.requiresIndependentVerifier
  }

  let returnDeadlineWeek: number | undefined
  if (hasOwnEnumerableProperty(input, 'returnDeadlineWeek')) {
    if (!isFiniteWeek(input.returnDeadlineWeek)) {
      return fail(state, 'invalid_input', 'deadline_malformed')
    }
    returnDeadlineWeek = input.returnDeadlineWeek
  }

  const release = parseFacilityRestrictedObjectRelease(state.facilityRestrictedObjectRelease)?.[setId]
  if (!release || release.mode !== 'stored') {
    return fail(state, 'release_blocked', 'set_not_stored')
  }

  const registry = { ...readRegistry(state) }
  if (registry[input.checkoutId]) {
    const existing = registry[input.checkoutId]
    if (existing.state === 'authorized') {
      return { ok: true, state, checkout: existing }
    }
    return fail(state, 'illegal_transition', 'checkout_id_in_use')
  }
  if (activeCheckoutForSet(registry, setId)) {
    return fail(state, 'illegal_transition', 'set_already_checked_out')
  }

  const checkout = freezeCheckout({
    checkoutId: input.checkoutId,
    setId,
    components: authoredComponents(setId),
    state: 'authorized',
    custodianId: input.custodianId,
    purpose: input.purpose,
    authorizationRef: input.authorizationRef,
    checkoutWeek: state.week,
    ...(returnDeadlineWeek !== undefined ? { returnDeadlineWeek } : {}),
    requiresIndependentVerifier,
  })
  registry[checkout.checkoutId] = checkout
  return { ok: true, state: writeRegistry(state, registry), checkout }
}

/**
 * Move an authorized checkout into field custody and transition SPE-2911 to `inspection`.
 */
export function startRestrictedAssetCheckout(
  state: GameState,
  input: unknown
): RestrictedAssetCheckoutResult {
  if (!isRecord(input) || !hasOwnEnumerableProperty(input, 'checkoutId') || !isNonEmptyString(input.checkoutId)) {
    return fail(state, 'invalid_input', 'checkout_id_required')
  }
  const registry = { ...readRegistry(state) }
  const current = registry[input.checkoutId]
  if (!current) return fail(state, 'not_found')
  if (current.state === 'checked_out') {
    return { ok: true, state, checkout: current }
  }
  if (current.state !== 'authorized') {
    return fail(state, 'illegal_transition', `cannot_start_from_${current.state}`)
  }

  const releaseResult = transitionRestrictedObjectRelease(state, {
    setId: current.setId,
    mode: 'inspection',
    components: [...current.components],
  })
  if (!releaseResult.ok) {
    return fail(state, 'release_blocked', releaseResult.code)
  }

  const checkout = freezeCheckout({
    ...current,
    state: 'checked_out',
    checkoutWeek: releaseResult.state.week,
  })
  registry[checkout.checkoutId] = checkout
  return { ok: true, state: writeRegistry(releaseResult.state, registry), checkout }
}

/**
 * Evaluate overdue against an authoritative campaign week without inventing a scheduler.
 */
export function evaluateRestrictedAssetCheckoutOverdue(
  state: GameState,
  input: unknown
): RestrictedAssetCheckoutResult {
  if (!isRecord(input) || !hasOwnEnumerableProperty(input, 'checkoutId') || !isNonEmptyString(input.checkoutId)) {
    return fail(state, 'invalid_input', 'checkout_id_required')
  }
  const campaignWeek = hasOwnEnumerableProperty(input, 'campaignWeek')
    ? input.campaignWeek
    : state.week
  if (!isFiniteWeek(campaignWeek)) {
    return fail(state, 'invalid_input', 'campaign_week_malformed')
  }

  const registry = { ...readRegistry(state) }
  const current = registry[input.checkoutId]
  if (!current) return fail(state, 'not_found')
  if (current.state === 'overdue') {
    return { ok: true, state, checkout: current }
  }
  if (current.state !== 'checked_out') {
    return fail(state, 'illegal_transition', `cannot_mark_overdue_from_${current.state}`)
  }
  if (current.returnDeadlineWeek === undefined || campaignWeek <= current.returnDeadlineWeek) {
    return fail(state, 'illegal_transition', 'deadline_not_elapsed')
  }

  const checkout = freezeCheckout({
    ...current,
    state: 'overdue',
    reason: 'return_deadline_elapsed',
  })
  registry[checkout.checkoutId] = checkout
  return { ok: true, state: writeRegistry(state, registry), checkout }
}

/**
 * Physical return presentation. Does not restore SPE-2911 secure custody.
 */
export function presentRestrictedAssetReturn(
  state: GameState,
  input: unknown
): RestrictedAssetCheckoutResult {
  if (!isRecord(input) || !hasOwnEnumerableProperty(input, 'checkoutId') || !isNonEmptyString(input.checkoutId)) {
    return fail(state, 'invalid_input', 'checkout_id_required')
  }
  const registry = { ...readRegistry(state) }
  const current = registry[input.checkoutId]
  if (!current) return fail(state, 'not_found')
  if (current.state === 'return_presented') {
    return { ok: true, state, checkout: current }
  }
  if (current.state !== 'checked_out' && current.state !== 'overdue') {
    return fail(state, 'illegal_transition', `cannot_present_from_${current.state}`)
  }

  const { reason: _priorReason, ...rest } = current
  void _priorReason
  const checkout = freezeCheckout({
    ...rest,
    state: 'return_presented',
    ...(current.state === 'overdue' ? { reason: 'presented_after_deadline' } : {}),
  })
  registry[checkout.checkoutId] = checkout
  return { ok: true, state: writeRegistry(state, registry), checkout }
}

/**
 * Independent verification closes the checkout exactly once and restores SPE-2911 `stored`.
 */
export function verifyRestrictedAssetReturn(
  state: GameState,
  input: unknown
): RestrictedAssetCheckoutResult {
  if (!isRecord(input) || !hasOwnEnumerableProperty(input, 'checkoutId') || !isNonEmptyString(input.checkoutId)) {
    return fail(state, 'invalid_input', 'checkout_id_required')
  }
  if (!hasOwnEnumerableProperty(input, 'verifierId') || !isNonEmptyString(input.verifierId)) {
    return fail(state, 'verifier_ineligible', 'verifier_required')
  }

  const registry = { ...readRegistry(state) }
  const current = registry[input.checkoutId]
  if (!current) return fail(state, 'not_found')
  if (current.state === 'closed') {
    return { ok: true, state, checkout: current }
  }
  if (current.state !== 'return_presented') {
    return fail(state, 'illegal_transition', `cannot_verify_from_${current.state}`)
  }
  if (current.requiresIndependentVerifier && input.verifierId === current.custodianId) {
    return fail(state, 'verifier_ineligible', 'verifier_must_be_independent')
  }

  const restored = restoreRestrictedObjectToStored(state, {
    setId: current.setId,
    components: [...current.components],
  })
  if (!restored.ok) {
    return fail(state, 'release_blocked', restored.code)
  }

  const checkout = freezeCheckout({
    ...current,
    state: 'closed',
    attestedVerifierId: input.verifierId,
    reason: 'return_verified',
  })
  registry[checkout.checkoutId] = checkout
  return { ok: true, state: writeRegistry(restored.state, registry), checkout }
}

/**
 * Reject a presented return without restoring secure custody.
 */
export function rejectRestrictedAssetReturn(
  state: GameState,
  input: unknown
): RestrictedAssetCheckoutResult {
  if (!isRecord(input) || !hasOwnEnumerableProperty(input, 'checkoutId') || !isNonEmptyString(input.checkoutId)) {
    return fail(state, 'invalid_input', 'checkout_id_required')
  }
  const registry = { ...readRegistry(state) }
  const current = registry[input.checkoutId]
  if (!current) return fail(state, 'not_found')
  if (current.state === 'return_rejected') {
    return { ok: true, state, checkout: current }
  }
  if (current.state !== 'return_presented') {
    return fail(state, 'illegal_transition', `cannot_reject_from_${current.state}`)
  }
  const checkout = freezeCheckout({
    ...current,
    state: 'return_rejected',
    reason: 'return_rejected',
  })
  registry[checkout.checkoutId] = checkout
  return { ok: true, state: writeRegistry(state, registry), checkout }
}

/**
 * Terminal lost/compromised failure. Does not recreate or credit inventory.
 */
export function resolveRestrictedAssetCheckoutFailure(
  state: GameState,
  input: unknown
): RestrictedAssetCheckoutResult {
  if (!isRecord(input) || !hasOwnEnumerableProperty(input, 'checkoutId') || !isNonEmptyString(input.checkoutId)) {
    return fail(state, 'invalid_input', 'checkout_id_required')
  }
  if (!hasOwnEnumerableProperty(input, 'outcome') || (input.outcome !== 'lost' && input.outcome !== 'compromised')) {
    return fail(state, 'invalid_input', 'outcome_required')
  }

  const registry = { ...readRegistry(state) }
  const current = registry[input.checkoutId]
  if (!current) return fail(state, 'not_found')
  if (current.state === input.outcome) {
    return { ok: true, state, checkout: current }
  }
  if (
    current.state !== 'checked_out' &&
    current.state !== 'overdue' &&
    current.state !== 'return_presented' &&
    current.state !== 'return_rejected'
  ) {
    return fail(state, 'illegal_transition', `cannot_fail_from_${current.state}`)
  }

  const checkout = freezeCheckout({
    ...current,
    state: input.outcome,
    reason: input.outcome === 'lost' ? 'asset_lost' : 'asset_compromised',
  })
  registry[checkout.checkoutId] = checkout
  return { ok: true, state: writeRegistry(state, registry), checkout }
}

/** Read-only projection: whether a checkout currently authorizes outbound transfer predicates. */
export function resolveRestrictedAssetCheckoutAuthorization(
  state: GameState,
  input: unknown
): { ok: true; authorized: boolean; checkoutId?: RestrictedAssetCheckoutId; state?: RestrictedAssetCheckoutState } | { ok: false; code: RestrictedAssetCheckoutFailureCode } {
  if (!isRecord(input) || !hasOwnEnumerableProperty(input, 'checkoutId') || !isNonEmptyString(input.checkoutId)) {
    return { ok: false, code: 'invalid_input' }
  }
  const current = readRegistry(state)[input.checkoutId]
  if (!current) return { ok: false, code: 'not_found' }
  const authorized =
    current.state === 'authorized' ||
    current.state === 'checked_out' ||
    current.state === 'overdue'
  return {
    ok: true,
    authorized,
    checkoutId: current.checkoutId,
    state: current.state,
  }
}

/** Representative acceptance fixture for the reliquary key set. */
export function authoredReliquaryFieldCheckoutFixture(overrides?: {
  checkoutId?: string
  custodianId?: string
  verifierId?: string
  returnDeadlineWeek?: number
}): {
  setId: typeof RELIQUARY_KEY_SET_ID
  components: readonly RestrictedObjectComponentId[]
  checkoutId: string
  custodianId: string
  verifierId: string
  purpose: string
  authorizationRef: string
  returnDeadlineWeek: number
} {
  return {
    setId: RELIQUARY_KEY_SET_ID,
    components: [...RELIQUARY_KEY_SET_COMPONENT_IDS],
    checkoutId: overrides?.checkoutId ?? 'checkout:reliquary:field-1',
    custodianId: overrides?.custodianId ?? 'custodian:agent-a',
    verifierId: overrides?.verifierId ?? 'verifier:agent-b',
    purpose: 'field_inspection',
    authorizationRef: 'auth:spe-3188:fixture',
    returnDeadlineWeek: overrides?.returnDeadlineWeek ?? 3,
  }
}

export function isTerminalRestrictedAssetCheckoutState(
  state: RestrictedAssetCheckoutState
): boolean {
  return TERMINAL_STATES.has(state)
}
