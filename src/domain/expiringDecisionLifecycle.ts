/**
 * SPE-2805 — expiring decision lifecycle and deterministic default resolution.
 *
 * Pure reusable contract for time-bounded decisions: stable identity, authoritative
 * clock domain + expiry, producer-declared options/default, exactly-once timeout
 * resolution, late-response rejection, and persistence/hydration safety.
 *
 * Does not recreate SPE-2187 phase held-action registry (SPE-62) or a second
 * universal timer queue (SPE-1287). Action-routing stubs name SPE-1127 / SPE-62
 * as destination owners without implementing those systems. No GameState field.
 */

export const EXPIRING_DECISION_LIFECYCLE_OWNER = 'SPE-2805' as const
export const EXPIRING_DECISION_LIFECYCLE_SCHEMA_VERSION = 'spe-2805.v1' as const
export const EXPIRING_DECISION_CORRESPONDENCE_REPAIR_VERSION =
  'spe-2805.repair-expired-correspondence.v1' as const

/** Lifecycle states for time-bounded decisions. */
export const EXPIRING_DECISION_STATES = [
  'open',
  'explicitly_resolved',
  'expired',
  'default_resolved',
  'canceled',
  'superseded',
] as const
export type ExpiringDecisionState = (typeof EXPIRING_DECISION_STATES)[number]

const TERMINAL_STATES: ReadonlySet<ExpiringDecisionState> = new Set([
  'explicitly_resolved',
  'expired',
  'default_resolved',
  'canceled',
  'superseded',
])

/** Authoritative clock domains — not wall-clock / UI countdown drift. */
export const EXPIRING_DECISION_CLOCK_DOMAINS = [
  'authoritative_week',
  'authoritative_tick',
  'phase_local',
] as const
export type ExpiringDecisionClockDomain = (typeof EXPIRING_DECISION_CLOCK_DOMAINS)[number]

/**
 * Producer-declared default contracts. No universal `defaultChoice = no`.
 * Named domain actions route to an authoritative executor stub, not UI/timer mutation.
 */
export const DEFAULT_RESOLUTION_CONTRACTS = [
  'expire_without_action',
  'maintain_status_quo',
  'decline',
  'continue_current_state',
  'named_domain_action',
] as const
export type DefaultResolutionContract = (typeof DEFAULT_RESOLUTION_CONTRACTS)[number]

/** Historical resolution provenance — distinguishable even when world effects match. */
export const RESOLUTION_PROVENANCE_KINDS = [
  'explicit_selection',
  'explicit_refusal',
  'timeout_default',
  'async_delivery_timeout',
  'canceled',
  'superseded',
  'invalidated',
] as const
export type ResolutionProvenanceKind = (typeof RESOLUTION_PROVENANCE_KINDS)[number]

/** SPE-1135 consumer-facing terminal provenance kinds (lifecycle owner: SPE-2805). */
export const TERMINAL_DECISION_PROVENANCE_KINDS = [
  'actionable',
  'expired',
  'explicit_refusal',
  'superseded',
  'canceled',
] as const
export type TerminalDecisionProvenanceKind = (typeof TERMINAL_DECISION_PROVENANCE_KINDS)[number]

export interface Spe2805TerminalDecisionProvenance {
  readonly decisionRef: string
  readonly kind: TerminalDecisionProvenanceKind
  readonly terminalReason?: string
}

/** Stub destination owners when a timeout default produces a real action. */
export const ACTION_ROUTE_OWNERS = ['SPE-1127', 'SPE-62', 'none'] as const
export type ActionRouteOwner = (typeof ACTION_ROUTE_OWNERS)[number]

export const EXPIRING_DECISION_PRODUCER_DOMAINS = [
  'correspondence_window',
  'operational_recommendation',
  'phase_held_response',
] as const
export type ExpiringDecisionProducerDomain = (typeof EXPIRING_DECISION_PRODUCER_DOMAINS)[number]

export interface ExpiringDecisionOption {
  readonly optionId: string
  readonly label: string
  /** Semantic kind — fallback must never be inferred from UI/array/lexical order. */
  readonly kind: 'accept' | 'decline' | 'defer' | 'custom'
}

export interface DefaultResolutionSpec {
  readonly contract: DefaultResolutionContract
  /**
   * Required when contract is `named_domain_action`. Identifies the declared
   * default option by id — never by position in `options`.
   */
  readonly defaultOptionId?: string
  /** Destination owner for real-action defaults; `none` for no-action contracts. */
  readonly actionRouteOwner: ActionRouteOwner
  /** Opaque action ref for the destination owner (stub only). */
  readonly actionRouteRef?: string
}

export interface ExpiringDecisionRecord {
  readonly schemaVersion: typeof EXPIRING_DECISION_LIFECYCLE_SCHEMA_VERSION
  readonly id: string
  readonly producerDomain: ExpiringDecisionProducerDomain
  readonly createdAt: number
  readonly clockDomain: ExpiringDecisionClockDomain
  readonly expiresAt: number
  readonly options: readonly ExpiringDecisionOption[]
  readonly defaultResolution: DefaultResolutionSpec
  readonly lifecycleState: ExpiringDecisionState
  readonly selectedOptionId?: string
  readonly resolvedAt?: number
  readonly resolutionProvenance?: ResolutionProvenanceKind
  readonly canceledByRef?: string
  readonly supersededByDecisionId?: string
  /** SPE-1585-shaped deadline source metadata consumed, not redefined. */
  readonly deadlineSourceRef?: string
  /**
   * Legacy save marker: expired correspondence was wrongly stored as explicit refusal.
   * Repair is versioned and idempotent; see `hydrateExpiringDecisionRecord`.
   */
  readonly legacyMisclassifiedExpiredAsRefusal?: true
  readonly hydrationRepairApplied?: typeof EXPIRING_DECISION_CORRESPONDENCE_REPAIR_VERSION
  /** Exactly-once guard: timeout default already invoked. */
  readonly timeoutResolvedOnce: boolean
}

export type ExpiringDecisionMutationResult =
  | { readonly ok: true; readonly record: ExpiringDecisionRecord }
  | {
      readonly ok: false
      readonly reason:
        | 'terminal'
        | 'not_open'
        | 'unknown_option'
        | 'malformed'
        | 'clock_mismatch'
        | 'deadline_not_before_expiry'
        | 'not_yet_expired'
        | 'already_timeout_resolved'
        | 'invalid_default_contract'
        | 'ui_order_forbidden'
        | 'past_expiry'
    }

export interface TimeoutResolutionEffect {
  readonly decisionId: string
  readonly contract: DefaultResolutionContract
  readonly actionRouteOwner: ActionRouteOwner
  readonly actionRouteRef?: string
  readonly defaultOptionId?: string
  readonly invokedOnce: true
}

export interface ExpiringDecisionPresentation {
  readonly decisionId: string
  readonly expiresAt: number
  readonly clockDomain: ExpiringDecisionClockDomain
  readonly defaultOutcomeSummary: string
  readonly lifecycleState: ExpiringDecisionState
  readonly resolutionWasExplicit: boolean | null
  readonly resolutionWasTimeout: boolean | null
  readonly replyActionAvailable: boolean
}

const FORBIDDEN_IDS = new Set(['__proto__', 'constructor', 'prototype', 'toString', 'valueOf'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isSafeId(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false
  const id = value.trim()
  if (FORBIDDEN_IDS.has(id)) return false
  if (id.includes('\0')) return false
  return true
}

function isNonNegativeInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isState(value: unknown): value is ExpiringDecisionState {
  return typeof value === 'string' && (EXPIRING_DECISION_STATES as readonly string[]).includes(value)
}

function isClockDomain(value: unknown): value is ExpiringDecisionClockDomain {
  return (
    typeof value === 'string' &&
    (EXPIRING_DECISION_CLOCK_DOMAINS as readonly string[]).includes(value)
  )
}

function isProducerDomain(value: unknown): value is ExpiringDecisionProducerDomain {
  return (
    typeof value === 'string' &&
    (EXPIRING_DECISION_PRODUCER_DOMAINS as readonly string[]).includes(value)
  )
}

function isContract(value: unknown): value is DefaultResolutionContract {
  return (
    typeof value === 'string' && (DEFAULT_RESOLUTION_CONTRACTS as readonly string[]).includes(value)
  )
}

function isRouteOwner(value: unknown): value is ActionRouteOwner {
  return typeof value === 'string' && (ACTION_ROUTE_OWNERS as readonly string[]).includes(value)
}

function isProvenance(value: unknown): value is ResolutionProvenanceKind {
  return (
    typeof value === 'string' && (RESOLUTION_PROVENANCE_KINDS as readonly string[]).includes(value)
  )
}

function isOptionKind(value: unknown): value is ExpiringDecisionOption['kind'] {
  return (
    value === 'accept' || value === 'decline' || value === 'defer' || value === 'custom'
  )
}

function isTerminal(state: ExpiringDecisionState): boolean {
  return TERMINAL_STATES.has(state)
}

function freezeOption(option: ExpiringDecisionOption): ExpiringDecisionOption {
  return Object.freeze({
    optionId: option.optionId,
    label: option.label,
    kind: option.kind,
  })
}

function freezeDefault(spec: DefaultResolutionSpec): DefaultResolutionSpec {
  return Object.freeze({
    contract: spec.contract,
    ...(spec.defaultOptionId !== undefined ? { defaultOptionId: spec.defaultOptionId } : {}),
    actionRouteOwner: spec.actionRouteOwner,
    ...(spec.actionRouteRef !== undefined ? { actionRouteRef: spec.actionRouteRef } : {}),
  })
}

function freezeRecord(record: ExpiringDecisionRecord): ExpiringDecisionRecord {
  return Object.freeze({
    schemaVersion: EXPIRING_DECISION_LIFECYCLE_SCHEMA_VERSION,
    id: record.id,
    producerDomain: record.producerDomain,
    createdAt: record.createdAt,
    clockDomain: record.clockDomain,
    expiresAt: record.expiresAt,
    options: Object.freeze(record.options.map(freezeOption)),
    defaultResolution: freezeDefault(record.defaultResolution),
    lifecycleState: record.lifecycleState,
    ...(record.selectedOptionId !== undefined
      ? { selectedOptionId: record.selectedOptionId }
      : {}),
    ...(record.resolvedAt !== undefined ? { resolvedAt: record.resolvedAt } : {}),
    ...(record.resolutionProvenance !== undefined
      ? { resolutionProvenance: record.resolutionProvenance }
      : {}),
    ...(record.canceledByRef !== undefined ? { canceledByRef: record.canceledByRef } : {}),
    ...(record.supersededByDecisionId !== undefined
      ? { supersededByDecisionId: record.supersededByDecisionId }
      : {}),
    ...(record.deadlineSourceRef !== undefined
      ? { deadlineSourceRef: record.deadlineSourceRef }
      : {}),
    ...(record.legacyMisclassifiedExpiredAsRefusal === true
      ? { legacyMisclassifiedExpiredAsRefusal: true as const }
      : {}),
    ...(record.hydrationRepairApplied !== undefined
      ? { hydrationRepairApplied: record.hydrationRepairApplied }
      : {}),
    timeoutResolvedOnce: record.timeoutResolvedOnce,
  })
}

function validateDefaultContract(
  options: readonly ExpiringDecisionOption[],
  defaultResolution: DefaultResolutionSpec
): string | null {
  const optionIds = new Set(options.map((o) => o.optionId))
  if (defaultResolution.contract === 'named_domain_action') {
    if (!isSafeId(defaultResolution.defaultOptionId)) {
      return 'named_domain_action requires defaultOptionId'
    }
    if (!optionIds.has(defaultResolution.defaultOptionId)) {
      return 'defaultOptionId must reference a declared option'
    }
    if (
      defaultResolution.actionRouteOwner === 'none' ||
      !isSafeId(defaultResolution.actionRouteRef)
    ) {
      return 'named_domain_action requires action route owner and ref'
    }
    return null
  }
  if (defaultResolution.actionRouteOwner !== 'none') {
    return 'no-action contracts must use actionRouteOwner none'
  }
  if (defaultResolution.defaultOptionId !== undefined) {
    if (!optionIds.has(defaultResolution.defaultOptionId)) {
      return 'optional defaultOptionId must reference a declared option'
    }
  }
  return null
}

function defaultOutcomeSummary(spec: DefaultResolutionSpec): string {
  switch (spec.contract) {
    case 'expire_without_action':
      return 'Expires without further action; status quo preserved.'
    case 'maintain_status_quo':
      return 'Unanswered choice maintains the current status quo.'
    case 'decline':
      return 'Unanswered choice is treated as a declared decline.'
    case 'continue_current_state':
      return 'Unanswered choice continues the current state.'
    case 'named_domain_action':
      return `Unanswered choice routes declared default action to ${spec.actionRouteOwner}.`
    default: {
      const _exhaustive: never = spec.contract
      return _exhaustive
    }
  }
}

/**
 * Create an open expiring decision. Producer must declare options + default contract
 * before the decision is actionable. Options may be presented in any UI order.
 */
export function createExpiringDecision(input: {
  readonly id: string
  readonly producerDomain: ExpiringDecisionProducerDomain
  readonly createdAt: number
  readonly clockDomain: ExpiringDecisionClockDomain
  readonly expiresAt: number
  readonly options: readonly ExpiringDecisionOption[]
  readonly defaultResolution: DefaultResolutionSpec
  readonly deadlineSourceRef?: string
  /** Deliberately reverse UI presentation order vs declaration — must not affect fallback. */
  readonly uiPresentationOrder?: readonly string[]
}): ExpiringDecisionMutationResult {
  if (!isSafeId(input.id)) return { ok: false, reason: 'malformed' }
  if (!isNonNegativeInt(input.createdAt) || !isNonNegativeInt(input.expiresAt)) {
    return { ok: false, reason: 'malformed' }
  }
  if (input.expiresAt < input.createdAt) return { ok: false, reason: 'malformed' }
  if (input.options.length === 0) return { ok: false, reason: 'malformed' }

  const normalizedOptions: ExpiringDecisionOption[] = []
  const seen = new Set<string>()
  for (const option of input.options) {
    if (!isSafeId(option.optionId) || !isNonEmptyString(option.label) || !isOptionKind(option.kind)) {
      return { ok: false, reason: 'malformed' }
    }
    const optionId = option.optionId.trim()
    if (seen.has(optionId)) return { ok: false, reason: 'malformed' }
    seen.add(optionId)
    normalizedOptions.push(
      freezeOption({
        optionId,
        label: option.label.trim(),
        kind: option.kind,
      })
    )
  }

  const normalizedDefault: DefaultResolutionSpec = freezeDefault({
    contract: input.defaultResolution.contract,
    actionRouteOwner: input.defaultResolution.actionRouteOwner,
    ...(input.defaultResolution.defaultOptionId !== undefined
      ? { defaultOptionId: input.defaultResolution.defaultOptionId.trim() }
      : {}),
    ...(input.defaultResolution.actionRouteRef !== undefined
      ? { actionRouteRef: input.defaultResolution.actionRouteRef.trim() }
      : {}),
  })

  const contractError = validateDefaultContract(normalizedOptions, normalizedDefault)
  if (contractError !== null) return { ok: false, reason: 'invalid_default_contract' }

  if (input.uiPresentationOrder !== undefined) {
    for (const id of input.uiPresentationOrder) {
      if (!seen.has(id.trim())) return { ok: false, reason: 'ui_order_forbidden' }
    }
    // Presentation order is intentionally ignored for fallback selection.
  }

  return {
    ok: true,
    record: freezeRecord({
      schemaVersion: EXPIRING_DECISION_LIFECYCLE_SCHEMA_VERSION,
      id: input.id.trim(),
      producerDomain: input.producerDomain,
      createdAt: input.createdAt,
      clockDomain: input.clockDomain,
      expiresAt: input.expiresAt,
      options: normalizedOptions,
      defaultResolution: normalizedDefault,
      lifecycleState: 'open',
      timeoutResolvedOnce: false,
      ...(input.deadlineSourceRef !== undefined && isSafeId(input.deadlineSourceRef)
        ? { deadlineSourceRef: input.deadlineSourceRef.trim() }
        : {}),
    }),
  }
}

/** Explicit selection before expiry — suppresses timeout behavior. */
export function resolveExplicitly(
  record: ExpiringDecisionRecord,
  input: {
    readonly optionId: string
    readonly at: number
  }
): ExpiringDecisionMutationResult {
  if (isTerminal(record.lifecycleState)) return { ok: false, reason: 'terminal' }
  if (record.lifecycleState !== 'open') return { ok: false, reason: 'not_open' }
  if (!isNonNegativeInt(input.at)) return { ok: false, reason: 'malformed' }
  // Authoritative clock at/after expiresAt belongs to timeout resolution, not late reply.
  if (input.at >= record.expiresAt) return { ok: false, reason: 'past_expiry' }
  const optionId = input.optionId.trim()
  const option = record.options.find((o) => o.optionId === optionId)
  if (option === undefined) return { ok: false, reason: 'unknown_option' }

  return {
    ok: true,
    record: freezeRecord({
      ...record,
      lifecycleState: 'explicitly_resolved',
      selectedOptionId: option.optionId,
      resolvedAt: input.at,
      resolutionProvenance: 'explicit_selection',
      timeoutResolvedOnce: record.timeoutResolvedOnce,
    }),
  }
}

/** Explicit refusal before expiry — historically distinct from timeout. */
export function refuseExplicitly(
  record: ExpiringDecisionRecord,
  input: { readonly at: number }
): ExpiringDecisionMutationResult {
  if (isTerminal(record.lifecycleState)) return { ok: false, reason: 'terminal' }
  if (record.lifecycleState !== 'open') return { ok: false, reason: 'not_open' }
  if (!isNonNegativeInt(input.at)) return { ok: false, reason: 'malformed' }
  if (input.at >= record.expiresAt) return { ok: false, reason: 'past_expiry' }

  return {
    ok: true,
    record: freezeRecord({
      ...record,
      lifecycleState: 'explicitly_resolved',
      resolvedAt: input.at,
      resolutionProvenance: 'explicit_refusal',
      timeoutResolvedOnce: record.timeoutResolvedOnce,
    }),
  }
}

/** Authoritative deadline shift (SPE-1585 source) before terminal expiry. */
export function shiftDeadline(
  record: ExpiringDecisionRecord,
  input: {
    readonly newExpiresAt: number
    readonly clockDomain: ExpiringDecisionClockDomain
    readonly deadlineSourceRef?: string
  }
): ExpiringDecisionMutationResult {
  if (isTerminal(record.lifecycleState)) return { ok: false, reason: 'terminal' }
  if (record.lifecycleState !== 'open') return { ok: false, reason: 'not_open' }
  if (input.clockDomain !== record.clockDomain) return { ok: false, reason: 'clock_mismatch' }
  if (!isNonNegativeInt(input.newExpiresAt)) return { ok: false, reason: 'malformed' }
  if (input.newExpiresAt < record.createdAt) {
    return { ok: false, reason: 'deadline_not_before_expiry' }
  }

  return {
    ok: true,
    record: freezeRecord({
      ...record,
      expiresAt: input.newExpiresAt,
      ...(input.deadlineSourceRef !== undefined && isSafeId(input.deadlineSourceRef)
        ? { deadlineSourceRef: input.deadlineSourceRef.trim() }
        : {}),
    }),
  }
}

export function cancelDecision(
  record: ExpiringDecisionRecord,
  input: { readonly at: number; readonly canceledByRef: string }
): ExpiringDecisionMutationResult {
  if (isTerminal(record.lifecycleState)) return { ok: false, reason: 'terminal' }
  if (!isNonNegativeInt(input.at) || !isSafeId(input.canceledByRef)) {
    return { ok: false, reason: 'malformed' }
  }
  return {
    ok: true,
    record: freezeRecord({
      ...record,
      lifecycleState: 'canceled',
      resolvedAt: input.at,
      resolutionProvenance: 'canceled',
      canceledByRef: input.canceledByRef.trim(),
    }),
  }
}

export function supersedeDecision(
  record: ExpiringDecisionRecord,
  input: { readonly at: number; readonly supersededByDecisionId: string }
): ExpiringDecisionMutationResult {
  if (isTerminal(record.lifecycleState)) return { ok: false, reason: 'terminal' }
  if (!isNonNegativeInt(input.at) || !isSafeId(input.supersededByDecisionId)) {
    return { ok: false, reason: 'malformed' }
  }
  return {
    ok: true,
    record: freezeRecord({
      ...record,
      lifecycleState: 'superseded',
      resolvedAt: input.at,
      resolutionProvenance: 'superseded',
      supersededByDecisionId: input.supersededByDecisionId.trim(),
    }),
  }
}

function terminalStateForTimeout(contract: DefaultResolutionContract): ExpiringDecisionState {
  switch (contract) {
    case 'expire_without_action':
    case 'maintain_status_quo':
    case 'continue_current_state':
      return 'expired'
    case 'decline':
    case 'named_domain_action':
      return 'default_resolved'
    default: {
      const _exhaustive: never = contract
      return _exhaustive
    }
  }
}

/**
 * Resolve unanswered decision exactly once when authoritative clock reaches expiry.
 * Late responses after this remain rejected. Does not mutate world state — emits a
 * route stub for named_domain_action producers.
 */
export function resolveTimeoutIfDue(
  record: ExpiringDecisionRecord,
  input: {
    readonly clockDomain: ExpiringDecisionClockDomain
    readonly now: number
    /** When timeout is caused by SPE-1093 async delivery failure/delay. */
    readonly causedByAsyncDeliveryFailure?: boolean
  }
): ExpiringDecisionMutationResult & {
  readonly effect?: TimeoutResolutionEffect
} {
  // Exactly-once: timeoutResolvedOnce alone means the default already invoked,
  // even if persisted state is inconsistent (e.g. open + flag).
  if (record.timeoutResolvedOnce) {
    return { ok: false, reason: 'already_timeout_resolved' }
  }
  if (isTerminal(record.lifecycleState)) return { ok: false, reason: 'terminal' }
  if (record.lifecycleState !== 'open') return { ok: false, reason: 'not_open' }
  if (input.clockDomain !== record.clockDomain) return { ok: false, reason: 'clock_mismatch' }
  if (!isNonNegativeInt(input.now)) return { ok: false, reason: 'malformed' }
  if (input.now < record.expiresAt) return { ok: false, reason: 'not_yet_expired' }

  const contract = record.defaultResolution.contract
  const nextState = terminalStateForTimeout(contract)
  const provenance: ResolutionProvenanceKind = input.causedByAsyncDeliveryFailure
    ? 'async_delivery_timeout'
    : 'timeout_default'

  const next = freezeRecord({
    ...record,
    lifecycleState: nextState,
    resolvedAt: input.now,
    resolutionProvenance: provenance,
    timeoutResolvedOnce: true,
    ...(contract === 'named_domain_action' && record.defaultResolution.defaultOptionId !== undefined
      ? { selectedOptionId: record.defaultResolution.defaultOptionId }
      : contract === 'decline' && record.defaultResolution.defaultOptionId !== undefined
        ? { selectedOptionId: record.defaultResolution.defaultOptionId }
        : {}),
  })

  const effect: TimeoutResolutionEffect = Object.freeze({
    decisionId: record.id,
    contract,
    actionRouteOwner: record.defaultResolution.actionRouteOwner,
    ...(record.defaultResolution.actionRouteRef !== undefined
      ? { actionRouteRef: record.defaultResolution.actionRouteRef }
      : {}),
    ...(record.defaultResolution.defaultOptionId !== undefined
      ? { defaultOptionId: record.defaultResolution.defaultOptionId }
      : {}),
    invokedOnce: true as const,
  })

  return { ok: true, record: next, effect }
}

/** Late response after terminal resolution — reject without mutation. */
export function attemptLateResponse(
  record: ExpiringDecisionRecord,
  input: { readonly optionId: string; readonly at: number }
): ExpiringDecisionMutationResult {
  if (isTerminal(record.lifecycleState)) return { ok: false, reason: 'terminal' }
  return resolveExplicitly(record, input)
}

/**
 * Project SPE-1135-compatible terminal provenance. Open decisions remain actionable;
 * timeout/expired are never classified as explicit refusal.
 */
export function projectTerminalProvenanceForDuty(
  record: ExpiringDecisionRecord
): Spe2805TerminalDecisionProvenance {
  if (record.lifecycleState === 'open') {
    return Object.freeze({
      decisionRef: record.id,
      kind: 'actionable' as const,
    })
  }
  if (record.resolutionProvenance === 'explicit_refusal') {
    return Object.freeze({
      decisionRef: record.id,
      kind: 'explicit_refusal' as const,
      terminalReason: 'explicit_refusal',
    })
  }
  if (record.lifecycleState === 'canceled' || record.resolutionProvenance === 'canceled') {
    return Object.freeze({
      decisionRef: record.id,
      kind: 'canceled' as const,
      terminalReason: 'canceled',
    })
  }
  if (record.lifecycleState === 'superseded' || record.resolutionProvenance === 'superseded') {
    return Object.freeze({
      decisionRef: record.id,
      kind: 'superseded' as const,
      terminalReason: 'superseded',
    })
  }
  if (
    record.resolutionProvenance === 'timeout_default' ||
    record.resolutionProvenance === 'async_delivery_timeout' ||
    record.lifecycleState === 'expired' ||
    record.lifecycleState === 'default_resolved'
  ) {
    return Object.freeze({
      decisionRef: record.id,
      kind: 'expired' as const,
      terminalReason: record.resolutionProvenance ?? 'timeout',
    })
  }
  if (record.resolutionProvenance === 'explicit_selection') {
    // SPE-1135 has no "fulfilled" kind. Closed explicit selection must not stay
    // `actionable` (that yields false actionable_omission when actObserved is false).
    // Terminal non-actionable → no_omission_terminal_window; distinguish via terminalReason.
    return Object.freeze({
      decisionRef: record.id,
      kind: 'expired' as const,
      terminalReason: 'explicit_selection_closed',
    })
  }
  return Object.freeze({
    decisionRef: record.id,
    kind: 'expired' as const,
    terminalReason: 'terminal',
  })
}

export function parseSpe2805TerminalDecisionProvenance(
  raw: unknown
): Spe2805TerminalDecisionProvenance | undefined {
  if (!isRecord(raw)) return undefined
  if (!isNonEmptyString(raw.decisionRef)) return undefined
  if (
    typeof raw.kind !== 'string' ||
    !(TERMINAL_DECISION_PROVENANCE_KINDS as readonly string[]).includes(raw.kind)
  ) {
    return undefined
  }
  const terminalReason =
    raw.terminalReason === undefined
      ? undefined
      : isNonEmptyString(raw.terminalReason)
        ? raw.terminalReason.trim()
        : undefined
  if (raw.terminalReason !== undefined && terminalReason === undefined) return undefined
  return Object.freeze({
    decisionRef: raw.decisionRef.trim(),
    kind: raw.kind as TerminalDecisionProvenanceKind,
    ...(terminalReason !== undefined ? { terminalReason } : {}),
  })
}

/** Downstream obligation consumer: reply action available only while open. */
export function isReplyActionAvailable(record: ExpiringDecisionRecord): boolean {
  return record.lifecycleState === 'open' && !record.timeoutResolvedOnce
}

export function projectExpiringDecisionPresentation(
  record: ExpiringDecisionRecord
): ExpiringDecisionPresentation {
  const timeoutDriven =
    record.resolutionProvenance === 'timeout_default' ||
    record.resolutionProvenance === 'async_delivery_timeout'
  const explicit =
    record.resolutionProvenance === 'explicit_selection' ||
    record.resolutionProvenance === 'explicit_refusal'
  return Object.freeze({
    decisionId: record.id,
    expiresAt: record.expiresAt,
    clockDomain: record.clockDomain,
    defaultOutcomeSummary: defaultOutcomeSummary(record.defaultResolution),
    lifecycleState: record.lifecycleState,
    resolutionWasExplicit: record.lifecycleState === 'open' ? null : explicit,
    resolutionWasTimeout: record.lifecycleState === 'open' ? null : timeoutDriven,
    replyActionAvailable: isReplyActionAvailable(record),
  })
}

function parseOption(raw: unknown): ExpiringDecisionOption | undefined {
  if (!isRecord(raw)) return undefined
  if (!isSafeId(raw.optionId) || !isNonEmptyString(raw.label) || !isOptionKind(raw.kind)) {
    return undefined
  }
  return freezeOption({
    optionId: raw.optionId.trim(),
    label: raw.label.trim(),
    kind: raw.kind,
  })
}

function parseDefaultResolution(raw: unknown): DefaultResolutionSpec | undefined {
  if (!isRecord(raw)) return undefined
  if (!isContract(raw.contract) || !isRouteOwner(raw.actionRouteOwner)) return undefined
  const defaultOptionId =
    raw.defaultOptionId === undefined
      ? undefined
      : isSafeId(raw.defaultOptionId)
        ? raw.defaultOptionId.trim()
        : undefined
  if (raw.defaultOptionId !== undefined && defaultOptionId === undefined) return undefined
  const actionRouteRef =
    raw.actionRouteRef === undefined
      ? undefined
      : isSafeId(raw.actionRouteRef)
        ? raw.actionRouteRef.trim()
        : undefined
  if (raw.actionRouteRef !== undefined && actionRouteRef === undefined) return undefined
  return freezeDefault({
    contract: raw.contract,
    ...(defaultOptionId !== undefined ? { defaultOptionId } : {}),
    actionRouteOwner: raw.actionRouteOwner,
    ...(actionRouteRef !== undefined ? { actionRouteRef } : {}),
  })
}

/**
 * Normalize/hydrate a persisted record. Absent/malformed → undefined (no inventing
 * historical timeouts). Applies narrowly versioned correspondence misclassification
 * repair exactly once when legacy evidence is present.
 */
export function hydrateExpiringDecisionRecord(raw: unknown): ExpiringDecisionRecord | undefined {
  if (raw === undefined || raw === null) return undefined
  if (!isRecord(raw)) return undefined
  if (raw.schemaVersion !== EXPIRING_DECISION_LIFECYCLE_SCHEMA_VERSION) return undefined
  if (!isSafeId(raw.id) || !isProducerDomain(raw.producerDomain)) return undefined
  if (!isNonNegativeInt(raw.createdAt) || !isNonNegativeInt(raw.expiresAt)) return undefined
  if (!isClockDomain(raw.clockDomain) || !isState(raw.lifecycleState)) return undefined
  if (typeof raw.timeoutResolvedOnce !== 'boolean') return undefined
  if (!Array.isArray(raw.options) || raw.options.length === 0) return undefined

  const options: ExpiringDecisionOption[] = []
  const seen = new Set<string>()
  for (const item of raw.options) {
    const parsed = parseOption(item)
    if (parsed === undefined || seen.has(parsed.optionId)) return undefined
    seen.add(parsed.optionId)
    options.push(parsed)
  }

  const defaultResolution = parseDefaultResolution(raw.defaultResolution)
  if (defaultResolution === undefined) return undefined
  if (validateDefaultContract(options, defaultResolution) !== null) return undefined

  const selectedOptionId =
    raw.selectedOptionId === undefined
      ? undefined
      : isSafeId(raw.selectedOptionId)
        ? raw.selectedOptionId.trim()
        : undefined
  if (raw.selectedOptionId !== undefined && selectedOptionId === undefined) return undefined
  if (selectedOptionId !== undefined && !seen.has(selectedOptionId)) return undefined

  const resolvedAt =
    raw.resolvedAt === undefined
      ? undefined
      : isNonNegativeInt(raw.resolvedAt)
        ? raw.resolvedAt
        : undefined
  if (raw.resolvedAt !== undefined && resolvedAt === undefined) return undefined

  const resolutionProvenance =
    raw.resolutionProvenance === undefined
      ? undefined
      : isProvenance(raw.resolutionProvenance)
        ? raw.resolutionProvenance
        : undefined
  if (raw.resolutionProvenance !== undefined && resolutionProvenance === undefined) return undefined

  const canceledByRef =
    raw.canceledByRef === undefined
      ? undefined
      : isSafeId(raw.canceledByRef)
        ? raw.canceledByRef.trim()
        : undefined
  if (raw.canceledByRef !== undefined && canceledByRef === undefined) return undefined

  const supersededByDecisionId =
    raw.supersededByDecisionId === undefined
      ? undefined
      : isSafeId(raw.supersededByDecisionId)
        ? raw.supersededByDecisionId.trim()
        : undefined
  if (raw.supersededByDecisionId !== undefined && supersededByDecisionId === undefined) {
    return undefined
  }

  const deadlineSourceRef =
    raw.deadlineSourceRef === undefined
      ? undefined
      : isSafeId(raw.deadlineSourceRef)
        ? raw.deadlineSourceRef.trim()
        : undefined
  if (raw.deadlineSourceRef !== undefined && deadlineSourceRef === undefined) return undefined

  const legacyMisclassifiedExpiredAsRefusal =
    raw.legacyMisclassifiedExpiredAsRefusal === true ? true : undefined
  if (
    raw.hydrationRepairApplied !== undefined &&
    raw.hydrationRepairApplied !== EXPIRING_DECISION_CORRESPONDENCE_REPAIR_VERSION
  ) {
    return undefined
  }
  const hydrationRepairApplied =
    raw.hydrationRepairApplied === EXPIRING_DECISION_CORRESPONDENCE_REPAIR_VERSION
      ? EXPIRING_DECISION_CORRESPONDENCE_REPAIR_VERSION
      : undefined

  // Fail closed on inconsistent timeout/lifecycle combinations.
  if (raw.lifecycleState === 'open' && raw.timeoutResolvedOnce === true) {
    return undefined
  }
  // Terminal records require resolution provenance (repair path always carries it).
  if (isTerminal(raw.lifecycleState) && resolutionProvenance === undefined) {
    return undefined
  }

  let record = freezeRecord({
    schemaVersion: EXPIRING_DECISION_LIFECYCLE_SCHEMA_VERSION,
    id: raw.id.trim(),
    producerDomain: raw.producerDomain,
    createdAt: raw.createdAt,
    clockDomain: raw.clockDomain,
    expiresAt: raw.expiresAt,
    options,
    defaultResolution,
    lifecycleState: raw.lifecycleState,
    ...(selectedOptionId !== undefined ? { selectedOptionId } : {}),
    ...(resolvedAt !== undefined ? { resolvedAt } : {}),
    ...(resolutionProvenance !== undefined ? { resolutionProvenance } : {}),
    ...(canceledByRef !== undefined ? { canceledByRef } : {}),
    ...(supersededByDecisionId !== undefined ? { supersededByDecisionId } : {}),
    ...(deadlineSourceRef !== undefined ? { deadlineSourceRef } : {}),
    ...(legacyMisclassifiedExpiredAsRefusal === true
      ? { legacyMisclassifiedExpiredAsRefusal: true as const }
      : {}),
    ...(hydrationRepairApplied !== undefined ? { hydrationRepairApplied } : {}),
    timeoutResolvedOnce: raw.timeoutResolvedOnce,
  })

  record = applyCorrespondenceMisclassificationRepair(record)
  return record
}

/**
 * Narrow repair: correspondence expired windows wrongly stored as explicit refusal.
 * Identified only by explicit legacy evidence; legitimate refusals untouched.
 * Idempotent under the repair version marker.
 */
export function applyCorrespondenceMisclassificationRepair(
  record: ExpiringDecisionRecord
): ExpiringDecisionRecord {
  if (record.hydrationRepairApplied === EXPIRING_DECISION_CORRESPONDENCE_REPAIR_VERSION) {
    return record
  }
  if (record.producerDomain !== 'correspondence_window') return record
  if (record.legacyMisclassifiedExpiredAsRefusal !== true) return record
  if (record.resolutionProvenance !== 'explicit_refusal') return record

  return freezeRecord({
    ...record,
    lifecycleState: terminalStateForTimeout(record.defaultResolution.contract),
    resolutionProvenance: 'timeout_default',
    timeoutResolvedOnce: true,
    selectedOptionId: undefined,
    hydrationRepairApplied: EXPIRING_DECISION_CORRESPONDENCE_REPAIR_VERSION,
    legacyMisclassifiedExpiredAsRefusal: true,
  })
}

/** Serialize for persistence tests — round-trip stable. */
export function serializeExpiringDecisionRecord(
  record: ExpiringDecisionRecord
): Record<string, unknown> {
  return {
    schemaVersion: record.schemaVersion,
    id: record.id,
    producerDomain: record.producerDomain,
    createdAt: record.createdAt,
    clockDomain: record.clockDomain,
    expiresAt: record.expiresAt,
    options: record.options.map((o) => ({ ...o })),
    defaultResolution: { ...record.defaultResolution },
    lifecycleState: record.lifecycleState,
    ...(record.selectedOptionId !== undefined ? { selectedOptionId: record.selectedOptionId } : {}),
    ...(record.resolvedAt !== undefined ? { resolvedAt: record.resolvedAt } : {}),
    ...(record.resolutionProvenance !== undefined
      ? { resolutionProvenance: record.resolutionProvenance }
      : {}),
    ...(record.canceledByRef !== undefined ? { canceledByRef: record.canceledByRef } : {}),
    ...(record.supersededByDecisionId !== undefined
      ? { supersededByDecisionId: record.supersededByDecisionId }
      : {}),
    ...(record.deadlineSourceRef !== undefined
      ? { deadlineSourceRef: record.deadlineSourceRef }
      : {}),
    ...(record.legacyMisclassifiedExpiredAsRefusal === true
      ? { legacyMisclassifiedExpiredAsRefusal: true }
      : {}),
    ...(record.hydrationRepairApplied !== undefined
      ? { hydrationRepairApplied: record.hydrationRepairApplied }
      : {}),
    timeoutResolvedOnce: record.timeoutResolvedOnce,
  }
}

// ---------------------------------------------------------------------------
// Stub producers (two unrelated domains + phase-local SPE-62 routing example)
// ---------------------------------------------------------------------------

export function createCorrespondenceWindowDecision(input: {
  readonly id: string
  readonly createdAt: number
  readonly expiresAt: number
  readonly uiPresentationOrder?: readonly string[]
}): ExpiringDecisionMutationResult {
  const options: ExpiringDecisionOption[] = [
    { optionId: 'reply_acknowledge', label: 'Acknowledge', kind: 'accept' },
    { optionId: 'reply_decline', label: 'Decline', kind: 'decline' },
    { optionId: 'reply_defer', label: 'Defer', kind: 'defer' },
  ]
  return createExpiringDecision({
    id: input.id,
    producerDomain: 'correspondence_window',
    createdAt: input.createdAt,
    clockDomain: 'authoritative_week',
    expiresAt: input.expiresAt,
    options,
    defaultResolution: {
      contract: 'expire_without_action',
      actionRouteOwner: 'none',
    },
    deadlineSourceRef: 'spe-1585:correspondence-window',
    ...(input.uiPresentationOrder !== undefined
      ? { uiPresentationOrder: input.uiPresentationOrder }
      : {}),
  })
}

export function createOperationalRecommendationDecision(input: {
  readonly id: string
  readonly createdAt: number
  readonly expiresAt: number
  readonly uiPresentationOrder?: readonly string[]
}): ExpiringDecisionMutationResult {
  const options: ExpiringDecisionOption[] = [
    { optionId: 'adopt_recommendation', label: 'Adopt', kind: 'accept' },
    { optionId: 'reject_recommendation', label: 'Reject', kind: 'decline' },
    { optionId: 'hold_recommendation', label: 'Hold', kind: 'defer' },
  ]
  return createExpiringDecision({
    id: input.id,
    producerDomain: 'operational_recommendation',
    createdAt: input.createdAt,
    clockDomain: 'authoritative_tick',
    expiresAt: input.expiresAt,
    options,
    defaultResolution: {
      contract: 'named_domain_action',
      defaultOptionId: 'adopt_recommendation',
      actionRouteOwner: 'SPE-1127',
      actionRouteRef: 'vetoable:recommendation-default-adopt',
    },
    deadlineSourceRef: 'spe-1585:operational-recommendation',
    ...(input.uiPresentationOrder !== undefined
      ? { uiPresentationOrder: input.uiPresentationOrder }
      : {}),
  })
}

/**
 * Phase-local held-response window: uses this lifecycle for expiry bookkeeping
 * only; timeout routes into SPE-62 (not a parallel SPE-2187 registry).
 */
export function createPhaseHeldResponseDecision(input: {
  readonly id: string
  readonly createdAt: number
  readonly expiresAt: number
}): ExpiringDecisionMutationResult {
  return createExpiringDecision({
    id: input.id,
    producerDomain: 'phase_held_response',
    createdAt: input.createdAt,
    clockDomain: 'phase_local',
    expiresAt: input.expiresAt,
    options: [
      { optionId: 'release_held', label: 'Release', kind: 'accept' },
      { optionId: 'abort_held', label: 'Abort', kind: 'decline' },
    ],
    defaultResolution: {
      contract: 'named_domain_action',
      defaultOptionId: 'abort_held',
      actionRouteOwner: 'SPE-62',
      actionRouteRef: 'phase:held-response-timeout',
    },
    deadlineSourceRef: 'spe-1585:phase-local-hold',
  })
}
