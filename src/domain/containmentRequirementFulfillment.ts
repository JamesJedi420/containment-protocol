import type { GameState } from './models'

/**
 * SPE-3181 — recurring containment requirement fulfillment and deficiency.
 *
 * Pure caller-owned packets define subject-scoped recurring requirements,
 * evaluate fulfillment against referenced inputs (without copying inventory /
 * procedure / labor truth), track window state, emit deficiency hooks, and
 * expose seams for SPE-3041 activation intents and SPE-1135 duty consumption.
 *
 * Ownership boundaries:
 * - SPE-3181: requirement definition, window/fulfillment/deficiency contract
 * - SPE-1071: campaign time (caller-supplied week; no private clock)
 * - SPE-3041 / SPE-1287: task activation (intent emission only when createsWork)
 * - SPE-1135: duty registry (consumes outcomes; not requirement authority)
 * - SPE-874 / SPE-1058: procedure / labor eligibility remain external refs
 *
 * No GameState field, week-close wire, scheduler, or UI subsystem.
 */

export const REQUIREMENT_CLASSES = ['information_input', 'material_service'] as const
export type RequirementClass = (typeof REQUIREMENT_CLASSES)[number]

export const INPUT_SERVICE_CLASSES = [
  'information',
  'material',
  'service',
  'procedure',
] as const
export type InputServiceClass = (typeof INPUT_SERVICE_CLASSES)[number]

export const REQUIREMENT_STATES = [
  'pending',
  'satisfied',
  'deficient',
] as const
export type RequirementState = (typeof REQUIREMENT_STATES)[number]

export const DEFICIENCY_SEVERITIES = ['minor', 'major', 'critical'] as const
export type DeficiencySeverity = (typeof DEFICIENCY_SEVERITIES)[number]

export const FULFILLMENT_OUTCOMES = [
  'accepted',
  'rejected',
  'idempotent_noop',
] as const
export type FulfillmentOutcome = (typeof FULFILLMENT_OUTCOMES)[number]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isMember<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
}

function parseNonNegInt(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
    return undefined
  }
  if (value < 0) return undefined
  return value
}

function parseUnitScore(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  if (value < 0 || value > 1) return undefined
  return value
}

function parseStringList(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const out: string[] = []
  for (const item of value) {
    if (!isNonEmptyString(item)) return undefined
    out.push(item.trim())
  }
  return Object.freeze(out)
}

export interface CadenceWindowInput {
  readonly windowId: string
  readonly startWeek: number
  readonly endWeek: number
}

export interface RequirementConstraintsInput {
  readonly quantityMin?: number
  readonly qualityMin?: number
  readonly freshnessMaxAgeWeeks?: number
  readonly noveltyRequired?: boolean
  readonly repetitionMaxPerWindow?: number
}

export interface ContainmentRequirementDefinitionInput {
  readonly requirementId: string
  readonly subjectRef: string
  readonly requirementClass: RequirementClass
  readonly acceptableInputClasses: readonly InputServiceClass[]
  readonly prohibitedInputClasses?: readonly InputServiceClass[]
  readonly constraints?: RequirementConstraintsInput
  readonly deficiencySeverity: DeficiencySeverity
  readonly deficiencyConsequenceRef: string
  /** When true, a pending requirement may emit a SPE-3041 activation intent. */
  readonly createsWork: boolean
  readonly allowsRecoveryAfterDeficiency?: boolean
}

export interface ContainmentRequirementDefinition {
  readonly requirementId: string
  readonly subjectRef: string
  readonly requirementClass: RequirementClass
  readonly acceptableInputClasses: readonly InputServiceClass[]
  readonly prohibitedInputClasses: readonly InputServiceClass[]
  readonly constraints: {
    readonly quantityMin?: number
    readonly qualityMin?: number
    readonly freshnessMaxAgeWeeks?: number
    readonly noveltyRequired: boolean
    readonly repetitionMaxPerWindow?: number
  }
  readonly deficiencySeverity: DeficiencySeverity
  readonly deficiencyConsequenceRef: string
  readonly createsWork: boolean
  readonly allowsRecoveryAfterDeficiency: boolean
}

export interface ContainmentRequirementRuntimeState {
  readonly definition: ContainmentRequirementDefinition
  readonly currentWindow: CadenceWindowInput
  readonly state: RequirementState
  readonly lastFulfillmentRef?: string
  readonly lastFulfillmentWeek?: number
  readonly lastFulfillmentInputRef?: string
  readonly fulfilledWindowIds: readonly string[]
  /** Closed windows, including misses without fulfillment or activation. */
  readonly processedWindowIds: readonly string[]
  readonly activationIntentEmittedForWindowIds: readonly string[]
  readonly inputClassCountsInWindow: Readonly<Record<string, number>>
  readonly reasonCodes: readonly string[]
}

function parseConstraints(
  value: unknown
): ContainmentRequirementDefinition['constraints'] | 'invalid' {
  if (value === undefined) {
    return Object.freeze({ noveltyRequired: false })
  }
  if (!isRecord(value)) return 'invalid'
  const quantityMin =
    value.quantityMin === undefined ? undefined : parseNonNegInt(value.quantityMin)
  if (value.quantityMin !== undefined && quantityMin === undefined) return 'invalid'
  const qualityMin =
    value.qualityMin === undefined ? undefined : parseUnitScore(value.qualityMin)
  if (value.qualityMin !== undefined && qualityMin === undefined) return 'invalid'
  const freshnessMaxAgeWeeks =
    value.freshnessMaxAgeWeeks === undefined
      ? undefined
      : parseNonNegInt(value.freshnessMaxAgeWeeks)
  if (value.freshnessMaxAgeWeeks !== undefined && freshnessMaxAgeWeeks === undefined) {
    return 'invalid'
  }
  if (value.noveltyRequired !== undefined && typeof value.noveltyRequired !== 'boolean') {
    return 'invalid'
  }
  const noveltyRequired =
    value.noveltyRequired === undefined ? false : value.noveltyRequired === true
  const repetitionMaxPerWindow =
    value.repetitionMaxPerWindow === undefined
      ? undefined
      : parseNonNegInt(value.repetitionMaxPerWindow)
  if (
    value.repetitionMaxPerWindow !== undefined &&
    repetitionMaxPerWindow === undefined
  ) {
    return 'invalid'
  }
  return Object.freeze({
    ...(quantityMin !== undefined ? { quantityMin } : {}),
    ...(qualityMin !== undefined ? { qualityMin } : {}),
    ...(freshnessMaxAgeWeeks !== undefined ? { freshnessMaxAgeWeeks } : {}),
    noveltyRequired,
    ...(repetitionMaxPerWindow !== undefined ? { repetitionMaxPerWindow } : {}),
  })
}

function parseInputClassList(
  value: unknown,
  options?: { readonly allowEmpty?: boolean }
): readonly InputServiceClass[] | undefined {
  if (!Array.isArray(value)) return undefined
  if (value.length === 0) {
    return options?.allowEmpty ? Object.freeze([]) : undefined
  }
  const out: InputServiceClass[] = []
  for (const item of value) {
    if (!isMember(item, INPUT_SERVICE_CLASSES)) return undefined
    out.push(item)
  }
  return Object.freeze(out)
}

function parseWindow(value: unknown): CadenceWindowInput | undefined {
  if (!isRecord(value)) return undefined
  if (!isNonEmptyString(value.windowId)) return undefined
  const startWeek = parseNonNegInt(value.startWeek)
  const endWeek = parseNonNegInt(value.endWeek)
  if (startWeek === undefined || endWeek === undefined) return undefined
  if (endWeek < startWeek) return undefined
  return Object.freeze({
    windowId: value.windowId.trim(),
    startWeek,
    endWeek,
  })
}

/** Fail-closed parse of an authored requirement definition. */
export function projectContainmentRequirementDefinition(
  input: unknown
): ContainmentRequirementDefinition | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.requirementId)) return undefined
  if (!isNonEmptyString(input.subjectRef)) return undefined
  if (!isMember(input.requirementClass, REQUIREMENT_CLASSES)) return undefined
  const acceptableInputClasses = parseInputClassList(input.acceptableInputClasses)
  if (!acceptableInputClasses) return undefined
  const prohibitedRaw =
    input.prohibitedInputClasses === undefined
      ? Object.freeze([] as InputServiceClass[])
      : parseInputClassList(input.prohibitedInputClasses, { allowEmpty: true })
  if (prohibitedRaw === undefined) return undefined
  if (!isMember(input.deficiencySeverity, DEFICIENCY_SEVERITIES)) return undefined
  if (!isNonEmptyString(input.deficiencyConsequenceRef)) return undefined
  if (typeof input.createsWork !== 'boolean') return undefined
  const constraints = parseConstraints(input.constraints)
  if (constraints === 'invalid') return undefined
  if (
    input.allowsRecoveryAfterDeficiency !== undefined &&
    typeof input.allowsRecoveryAfterDeficiency !== 'boolean'
  ) {
    return undefined
  }
  const allowsRecoveryAfterDeficiency =
    input.allowsRecoveryAfterDeficiency === undefined
      ? false
      : input.allowsRecoveryAfterDeficiency === true

  return Object.freeze({
    requirementId: input.requirementId.trim(),
    subjectRef: input.subjectRef.trim(),
    requirementClass: input.requirementClass,
    acceptableInputClasses,
    prohibitedInputClasses: prohibitedRaw,
    constraints,
    deficiencySeverity: input.deficiencySeverity,
    deficiencyConsequenceRef: input.deficiencyConsequenceRef.trim(),
    createsWork: input.createsWork,
    allowsRecoveryAfterDeficiency,
  })
}

function parseCountMap(
  value: unknown
): Readonly<Record<string, number>> | undefined {
  if (value === undefined) return Object.freeze({})
  if (!isRecord(value)) return undefined
  const out: Record<string, number> = {}
  for (const [key, raw] of Object.entries(value)) {
    const n = parseNonNegInt(raw)
    if (n === undefined) return undefined
    out[key] = n
  }
  return Object.freeze(out)
}

/** Hydrate durable runtime state (save/load). Omits derived countdown values. */
export function hydrateContainmentRequirementState(
  input: unknown
): ContainmentRequirementRuntimeState | undefined {
  if (!isRecord(input)) return undefined
  const definition = projectContainmentRequirementDefinition(input.definition)
  if (!definition) return undefined
  const currentWindow = parseWindow(input.currentWindow)
  if (!currentWindow) return undefined
  if (!isMember(input.state, REQUIREMENT_STATES)) return undefined
  const fulfilledWindowIds = parseStringList(input.fulfilledWindowIds ?? [])
  if (!fulfilledWindowIds) return undefined
  // This contract is not shipped yet; require the new durable history marker
  // instead of silently defaulting missing deficient-window history to [].
  const processedWindowIds = parseStringList(input.processedWindowIds)
  if (!processedWindowIds) return undefined
  const activationIntentEmittedForWindowIds = parseStringList(
    input.activationIntentEmittedForWindowIds ?? []
  )
  if (!activationIntentEmittedForWindowIds) return undefined
  if (new Set(fulfilledWindowIds).size !== fulfilledWindowIds.length) return undefined
  if (new Set(processedWindowIds).size !== processedWindowIds.length) return undefined
  if (processedWindowIds.includes(currentWindow.windowId)) return undefined
  if (new Set(activationIntentEmittedForWindowIds).size !==
      activationIntentEmittedForWindowIds.length) return undefined
  if (fulfilledWindowIds.some((id) => id !== currentWindow.windowId &&
      !processedWindowIds.includes(id))) return undefined
  if (activationIntentEmittedForWindowIds.some((id) => id !== currentWindow.windowId &&
      !processedWindowIds.includes(id))) return undefined
  const inputClassCountsInWindow = parseCountMap(input.inputClassCountsInWindow)
  if (!inputClassCountsInWindow) return undefined
  // Each window accepts exactly one complete fulfillment; its counter is
  // updated atomically with the satisfied state. Do not hydrate fabricated
  // pending/deficient counts that can block a first legitimate attempt.
  const countEntries = Object.entries(inputClassCountsInWindow)
  if (input.state === 'satisfied') {
    if (countEntries.length !== 1 || countEntries[0][1] !== 1 ||
        definition.constraints.repetitionMaxPerWindow === 0 ||
        !definition.acceptableInputClasses.includes(countEntries[0][0] as InputServiceClass) ||
        definition.prohibitedInputClasses.includes(countEntries[0][0] as InputServiceClass)) {
      return undefined
    }
  } else if (countEntries.length !== 0) {
    return undefined
  }
  const reasonCodes = parseStringList(input.reasonCodes ?? [])
  if (!reasonCodes) return undefined

  let lastFulfillmentRef: string | undefined
  if (input.lastFulfillmentRef !== undefined) {
    if (!isNonEmptyString(input.lastFulfillmentRef)) return undefined
    lastFulfillmentRef = input.lastFulfillmentRef.trim()
  }
  let lastFulfillmentWeek: number | undefined
  if (input.lastFulfillmentWeek !== undefined) {
    lastFulfillmentWeek = parseNonNegInt(input.lastFulfillmentWeek)
    if (lastFulfillmentWeek === undefined) return undefined
  }
  let lastFulfillmentInputRef: string | undefined
  if (input.lastFulfillmentInputRef !== undefined) {
    if (!isNonEmptyString(input.lastFulfillmentInputRef)) return undefined
    lastFulfillmentInputRef = input.lastFulfillmentInputRef.trim()
  }
  // Persisted lifecycle, idempotency markers, and fulfillment evidence must
  // agree; never let a contradictory save replay a completed window.
  const currentWasFulfilled = fulfilledWindowIds.includes(currentWindow.windowId)
  if ((input.state === 'satisfied') !== currentWasFulfilled) return undefined
  const lastMetadataComplete =
    lastFulfillmentRef !== undefined &&
    lastFulfillmentWeek !== undefined &&
    lastFulfillmentInputRef !== undefined
  const lastMetadataAbsent =
    lastFulfillmentRef === undefined &&
    lastFulfillmentWeek === undefined &&
    lastFulfillmentInputRef === undefined
  if (!lastMetadataComplete && !lastMetadataAbsent) return undefined
  if ((fulfilledWindowIds.length > 0) !== lastMetadataComplete) return undefined
  if (input.state === 'satisfied' && lastFulfillmentWeek !== undefined &&
      (lastFulfillmentWeek < currentWindow.startWeek ||
       (lastFulfillmentWeek > currentWindow.endWeek &&
        !definition.allowsRecoveryAfterDeficiency))) return undefined

  return Object.freeze({
    definition,
    currentWindow,
    state: input.state,
    ...(lastFulfillmentRef !== undefined ? { lastFulfillmentRef } : {}),
    ...(lastFulfillmentWeek !== undefined ? { lastFulfillmentWeek } : {}),
    ...(lastFulfillmentInputRef !== undefined ? { lastFulfillmentInputRef } : {}),
    fulfilledWindowIds,
    processedWindowIds,
    activationIntentEmittedForWindowIds,
    inputClassCountsInWindow,
    reasonCodes,
  })
}

/**
 * Canonical SPE-3181 GameState save registry. The compound key makes two
 * distinct subjects with the same authored requirementId independent.
 */
export type ContainmentRequirementRegistry =
  Readonly<Record<string, ContainmentRequirementRuntimeState>>

export function containmentRequirementRegistryKey(
  subjectRef: string,
  requirementId: string
): string {
  return JSON.stringify([subjectRef, requirementId])
}

/**
 * Fail-closed import of the unshipped SPE-3181 packet registry. A single
 * malformed sibling invalidates the registry rather than silently erasing
 * fulfillment/deficiency history. Legacy saves without this optional field
 * are handled by the authoritative game hydrator, not by guessing history.
 */
export function parseContainmentRequirementRegistry(
  value: unknown
): ContainmentRequirementRegistry | undefined {
  if (!isRecord(value)) return undefined
  const prototype = Object.getPrototypeOf(value)
  // Frozen registries parsed previously use a null prototype. Both JSON
  // plain records and our own parsed output must survive repeated saves.
  if (prototype !== Object.prototype && prototype !== null) return undefined
  const entries = Object.entries(value)
  if (entries.length > 256) return undefined
  const out: Record<string, ContainmentRequirementRuntimeState> = Object.create(null)
  for (const [key, raw] of entries) {
    if (key.length === 0 || key.length > 512 || key === '__proto__') return undefined
    const packet = hydrateContainmentRequirementState(raw)
    if (!packet) return undefined
    if (key !== containmentRequirementRegistryKey(
      packet.definition.subjectRef, packet.definition.requirementId
    )) return undefined
    out[key] = packet
  }
  return Object.freeze(out)
}

/** Open a new pending window for a known definition. */
export function openContainmentRequirementWindow(input: unknown): ContainmentRequirementRuntimeState | undefined {
  if (!isRecord(input)) return undefined
  const definition = projectContainmentRequirementDefinition(input.definition)
  if (!definition) return undefined
  const currentWindow = parseWindow(input.currentWindow)
  if (!currentWindow) return undefined
  return Object.freeze({
    definition,
    currentWindow,
    state: 'pending' as const,
    fulfilledWindowIds: Object.freeze([] as string[]),
    processedWindowIds: Object.freeze([] as string[]),
    activationIntentEmittedForWindowIds: Object.freeze([] as string[]),
    inputClassCountsInWindow: Object.freeze({}),
    reasonCodes: Object.freeze(['window_opened'] as const),
  })
}

/**
 * Open a later authoritative cadence window without discarding cross-window
 * novelty or idempotency history. The previous window must first be resolved
 * as satisfied or deficient; pending windows cannot silently skip deficiency.
 * The SPE-1071 caller must supply each successive authoritative cadence
 * window; this pure packet cannot infer missing windows or schedule gaps.
 */
export function advanceContainmentRequirementWindow(
  state: ContainmentRequirementRuntimeState,
  nextWindow: unknown
): ContainmentRequirementRuntimeState | undefined {
  const currentWindow = parseWindow(nextWindow)
  if (!currentWindow || currentWindow.startWeek <= state.currentWindow.endWeek) return undefined
  // An earlier missed window may still need evaluation after a late recovery.
  // Preserve the later last-fulfillment timestamp, and forbid backdated
  // attempts instead of skipping that window and its deficiency consequences.
  if (currentWindow.windowId === state.currentWindow.windowId) return undefined
  if (state.processedWindowIds.includes(currentWindow.windowId)) return undefined
  if (state.fulfilledWindowIds.includes(currentWindow.windowId)) return undefined
  if (state.activationIntentEmittedForWindowIds.includes(currentWindow.windowId)) return undefined
  if (state.state !== 'satisfied' && state.state !== 'deficient') return undefined
  return Object.freeze({
    ...state,
    currentWindow,
    state: 'pending' as const,
    // The outgoing window was settled, even if it was deficient and passive.
    processedWindowIds: Object.freeze([
      ...state.processedWindowIds,
      state.currentWindow.windowId,
    ]),
    inputClassCountsInWindow: Object.freeze({}),
    reasonCodes: Object.freeze(['window_opened'] as const),
  })
}

function weekInWindow(week: number, window: CadenceWindowInput): boolean {
  return week >= window.startWeek && week <= window.endWeek
}

/**
 * Advance window lifecycle from canonical campaign week (SPE-1071).
 * A missed window becomes deficient after the deadline; no implicit
 * grace period or synthetic overdue state is invented.
 */
export function evaluateRequirementAgainstCampaignWeek(
  state: ContainmentRequirementRuntimeState,
  campaignWeek: unknown
): ContainmentRequirementRuntimeState | undefined {
  const week = parseNonNegInt(campaignWeek)
  if (week === undefined) return undefined
  if (state.state === 'satisfied' || state.state === 'deficient') {
    return state
  }

  const inWindow = weekInWindow(week, state.currentWindow)
  if (inWindow) {
    if (state.reasonCodes.includes('before_window')) {
      return Object.freeze({
        ...state,
        reasonCodes: Object.freeze(['still_in_window'] as const),
      })
    }
    return state
  }

  if (week > state.currentWindow.endWeek) {
    if (state.state === 'pending') {
      return Object.freeze({
        ...state,
        state: 'deficient' as const,
        reasonCodes: Object.freeze([
          'missed_window',
          `deficiency:${state.definition.deficiencySeverity}`,
          `consequence:${state.definition.deficiencyConsequenceRef}`,
        ]),
      })
    }
  }

  if (week < state.currentWindow.startWeek && state.state === 'pending') {
    return Object.freeze({
      ...state,
      reasonCodes: Object.freeze(['before_window'] as const),
    })
  }

  return state
}

/**
 * SPE-3181 lifecycle consumption at the existing authoritative weekly boundary.
 * The GameState calendar week was already advanced by settleWeekState; this
 * resolves expiration of persisted, explicitly authored current windows only.
 * It does not create missing cadence windows, a private scheduler, task queue,
 * duty registry, resource mutations, or synthetic operation events.
 */
export function advanceContainmentRequirementsAtWeekClose(state: GameState): GameState {
  const registry = state.containmentRequirementStates
  if (!registry) return state
  if (!Number.isSafeInteger(state.week) || state.week < 0) return state

  let changed = false
  const next: Record<string, ContainmentRequirementRuntimeState> = Object.assign(
    Object.create(null),
    registry
  )
  for (const key of Object.keys(registry).sort()) {
    const previous = registry[key]
    if (!previous) continue
    const evaluated = evaluateRequirementAgainstCampaignWeek(previous, state.week)
    if (evaluated && evaluated !== previous) {
      next[key] = evaluated
      changed = true
    }
  }
  if (!changed) return state
  return {
    ...state,
    containmentRequirementStates: Object.freeze(next),
  }
}

export interface FulfillmentAttemptInput {
  readonly fulfillmentRef: string
  readonly inputClass: InputServiceClass
  readonly inputRef: string
  readonly campaignWeek: number
  readonly quantity?: number
  readonly quality?: number
  readonly inputAgeWeeks?: number
}

export interface FulfillmentAttemptResult {
  readonly outcome: FulfillmentOutcome
  readonly state: ContainmentRequirementRuntimeState
  readonly reasonCodes: readonly string[]
}

/** Attempt to fulfill the current window against a referenced authoritative input. */
export function attemptContainmentRequirementFulfillment(
  state: ContainmentRequirementRuntimeState,
  attempt: unknown
): FulfillmentAttemptResult | undefined {
  if (!isRecord(attempt)) return undefined
  if (!isNonEmptyString(attempt.fulfillmentRef)) return undefined
  if (!isMember(attempt.inputClass, INPUT_SERVICE_CLASSES)) return undefined
  if (!isNonEmptyString(attempt.inputRef)) return undefined
  const campaignWeek = parseNonNegInt(attempt.campaignWeek)
  if (campaignWeek === undefined) return undefined
  const fulfillmentRef = attempt.fulfillmentRef.trim()
  const inputRef = attempt.inputRef.trim()
  const inputClass = attempt.inputClass

  // Settled-window deliveries are idempotent even when an older attempt
  // arrives out of order. Chronology matters only for an unsettled window.
  if (state.fulfilledWindowIds.includes(state.currentWindow.windowId)) {
    return Object.freeze({
      outcome: 'idempotent_noop' as const,
      state,
      reasonCodes: Object.freeze(['already_fulfilled_this_window'] as const),
    })
  }
  // Never overwrite durable fulfillment history with an earlier dated attempt.
  if (state.lastFulfillmentWeek !== undefined &&
      campaignWeek < state.lastFulfillmentWeek) {
    return Object.freeze({
      outcome: 'rejected' as const,
      state,
      reasonCodes: Object.freeze(['backdated_fulfillment'] as const),
    })
  }

  if (state.state === 'deficient' && !state.definition.allowsRecoveryAfterDeficiency) {
    return Object.freeze({
      outcome: 'rejected' as const,
      state,
      reasonCodes: Object.freeze(['deficient_no_recovery'] as const),
    })
  }

  const recovering =
    state.state === 'deficient' && state.definition.allowsRecoveryAfterDeficiency
  if ((recovering && campaignWeek <= state.currentWindow.endWeek) ||
      (!recovering && !weekInWindow(campaignWeek, state.currentWindow))) {
    return Object.freeze({
      outcome: 'rejected' as const,
      state,
      reasonCodes: Object.freeze(['outside_fulfillment_window'] as const),
    })
  }

  if (state.definition.prohibitedInputClasses.includes(inputClass)) {
    return Object.freeze({
      outcome: 'rejected' as const,
      state,
      reasonCodes: Object.freeze(['prohibited_input_class'] as const),
    })
  }
  if (!state.definition.acceptableInputClasses.includes(inputClass)) {
    return Object.freeze({
      outcome: 'rejected' as const,
      state,
      reasonCodes: Object.freeze(['unacceptable_input_class'] as const),
    })
  }

  const { constraints } = state.definition
  if (constraints.quantityMin !== undefined) {
    const quantity = parseNonNegInt(attempt.quantity)
    if (quantity === undefined || quantity < constraints.quantityMin) {
      return Object.freeze({
        outcome: 'rejected' as const,
        state,
        reasonCodes: Object.freeze(['quantity_below_minimum'] as const),
      })
    }
  }
  if (constraints.qualityMin !== undefined) {
    const quality = parseUnitScore(attempt.quality)
    if (quality === undefined || quality < constraints.qualityMin) {
      return Object.freeze({
        outcome: 'rejected' as const,
        state,
        reasonCodes: Object.freeze(['quality_below_minimum'] as const),
      })
    }
  }
  if (constraints.freshnessMaxAgeWeeks !== undefined) {
    const age = parseNonNegInt(attempt.inputAgeWeeks)
    if (age === undefined || age > constraints.freshnessMaxAgeWeeks) {
      return Object.freeze({
        outcome: 'rejected' as const,
        state,
        reasonCodes: Object.freeze(['freshness_exceeded'] as const),
      })
    }
  }
  if (
    constraints.noveltyRequired &&
    state.lastFulfillmentInputRef !== undefined &&
    state.lastFulfillmentInputRef === inputRef
  ) {
    return Object.freeze({
      outcome: 'rejected' as const,
      state,
      reasonCodes: Object.freeze(['novelty_required'] as const),
    })
  }
  // One accepted fulfillment settles the entire window. A zero limit can
  // prohibit an attempt; positive repetition limits are nonbinding without
  // introducing a separately approved multi-contribution fulfillment model.
  if (constraints.repetitionMaxPerWindow !== undefined) {
    const prior = state.inputClassCountsInWindow[inputClass] ?? 0
    if (prior >= constraints.repetitionMaxPerWindow) {
      return Object.freeze({
        outcome: 'rejected' as const,
        state,
        reasonCodes: Object.freeze(['repetition_max_exceeded'] as const),
      })
    }
  }

  const nextCounts: Record<string, number> = {
    ...state.inputClassCountsInWindow,
    [inputClass]: (state.inputClassCountsInWindow[inputClass] ?? 0) + 1,
  }
  const acceptReasons = recovering
    ? (['fulfillment_accepted', 'recovered_from_deficiency'] as const)
    : (['fulfillment_accepted'] as const)
  const nextState: ContainmentRequirementRuntimeState = Object.freeze({
    definition: state.definition,
    currentWindow: state.currentWindow,
    state: 'satisfied' as const,
    lastFulfillmentRef: fulfillmentRef,
    lastFulfillmentWeek: campaignWeek,
    lastFulfillmentInputRef: inputRef,
    fulfilledWindowIds: Object.freeze([...state.fulfilledWindowIds, state.currentWindow.windowId]),
    processedWindowIds: state.processedWindowIds,
    activationIntentEmittedForWindowIds: state.activationIntentEmittedForWindowIds,
    inputClassCountsInWindow: Object.freeze(nextCounts),
    reasonCodes: Object.freeze([...acceptReasons]),
  })

  return Object.freeze({
    outcome: 'accepted' as const,
    state: nextState,
    reasonCodes: Object.freeze([...acceptReasons]),
  })
}

export interface Spe3041ActivationIntent {
  readonly activationOwner: 'SPE-3041'
  readonly requirementId: string
  readonly subjectRef: string
  readonly windowId: string
  readonly idempotencyKey: string
  readonly reasonCodes: readonly string[]
}

/**
 * Emit a SPE-3041 activation intent only when real work is due in its active
 * caller-supplied campaign window. Passive requirements never mint tasks.
 * Idempotent per window.
 */
export function projectSpe3041ActivationIntent(
  state: ContainmentRequirementRuntimeState,
  campaignWeek: unknown
): Spe3041ActivationIntent | undefined {
  const week = parseNonNegInt(campaignWeek)
  // SPE-1071 is the authority for campaign time. Without a caller-supplied
  // active week, do not emit an early intent that consumes window idempotency.
  if (week === undefined || !weekInWindow(week, state.currentWindow)) return undefined
  // A late fulfillment may precede retrospective evaluation of a missed
  // window. Its historical week must not enqueue new work after that event.
  if (state.lastFulfillmentWeek !== undefined && week < state.lastFulfillmentWeek) {
    return undefined
  }
  if (!state.definition.createsWork) return undefined
  if (state.state !== 'pending') return undefined
  if (state.fulfilledWindowIds.includes(state.currentWindow.windowId)) return undefined
  if (
    state.activationIntentEmittedForWindowIds.includes(state.currentWindow.windowId)
  ) {
    return undefined
  }

  const idempotencyKey = JSON.stringify([
    'spe-3041',
    state.definition.subjectRef,
    state.definition.requirementId,
    state.currentWindow.windowId,
  ])
  return Object.freeze({
    activationOwner: 'SPE-3041' as const,
    requirementId: state.definition.requirementId,
    subjectRef: state.definition.subjectRef,
    windowId: state.currentWindow.windowId,
    idempotencyKey,
    reasonCodes: Object.freeze(['work_activation_required'] as const),
  })
}

/** Record a valid, currently emit-able SPE-3041 intent (idempotency). */
export function markSpe3041ActivationIntentEmitted(
  state: ContainmentRequirementRuntimeState,
  campaignWeek: unknown
): ContainmentRequirementRuntimeState {
  // A malformed caller must not consume an intent before it could be emitted.
  if (!projectSpe3041ActivationIntent(state, campaignWeek)) return state
  return Object.freeze({
    ...state,
    activationIntentEmittedForWindowIds: Object.freeze([
      ...state.activationIntentEmittedForWindowIds,
      state.currentWindow.windowId,
    ]),
    reasonCodes: Object.freeze(['spe_3041_intent_recorded'] as const),
  })
}

export interface DutyConsumptionProjection {
  readonly dutyOwner: 'SPE-1135'
  readonly requirementId: string
  readonly subjectRef: string
  readonly windowId: string
  readonly requirementState: RequirementState
  readonly requirementRemainsAuthority: true
  readonly fulfillmentOutcome:
    | 'satisfied'
    | 'pending'
    | 'deficient'
    | 'unknown'
  readonly reasonCodes: readonly string[]
}

/**
 * Project requirement outcome for SPE-1135 duty/responsibility evaluation.
 * Duty state must not become requirement authority.
 */
export function projectDutyConsumptionFromRequirement(
  state: ContainmentRequirementRuntimeState
): DutyConsumptionProjection {
  return Object.freeze({
    dutyOwner: 'SPE-1135' as const,
    requirementId: state.definition.requirementId,
    subjectRef: state.definition.subjectRef,
    windowId: state.currentWindow.windowId,
    requirementState: state.state,
    requirementRemainsAuthority: true as const,
    fulfillmentOutcome: state.state,
    reasonCodes: Object.freeze([
      'duty_consumes_requirement_outcome',
      `state:${state.state}`,
    ]),
  })
}

export interface ExplainableRequirementStatus {
  readonly requirementId: string
  readonly subjectRef: string
  readonly requirementClass: RequirementClass
  readonly windowId: string
  readonly windowStartWeek: number
  readonly windowEndWeek: number
  readonly state: RequirementState
  readonly createsWork: boolean
  readonly lastFulfillmentRef?: string
  readonly deficiencyConsequenceRef?: string
  readonly reasonCodes: readonly string[]
}

/** Compact status packet for existing planning/containment surfaces. */
export function projectExplainableRequirementStatus(
  state: ContainmentRequirementRuntimeState
): ExplainableRequirementStatus {
  return Object.freeze({
    requirementId: state.definition.requirementId,
    subjectRef: state.definition.subjectRef,
    requirementClass: state.definition.requirementClass,
    windowId: state.currentWindow.windowId,
    windowStartWeek: state.currentWindow.startWeek,
    windowEndWeek: state.currentWindow.endWeek,
    state: state.state,
    createsWork: state.definition.createsWork,
    ...(state.lastFulfillmentRef !== undefined
      ? { lastFulfillmentRef: state.lastFulfillmentRef }
      : {}),
    ...(state.state === 'deficient'
      ? { deficiencyConsequenceRef: state.definition.deficiencyConsequenceRef }
      : {}),
    reasonCodes: state.reasonCodes,
  })
}
