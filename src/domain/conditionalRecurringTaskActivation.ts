/**
 * SPE-3041 — conditional recurring task activation contract.
 *
 * Pure caller-owned recurrence templates + composable condition packets evaluate
 * at declared simulation points and, when satisfied, emit a SPE-1287 lifecycle
 * envelope handoff. Producer systems retain authority over work requirements,
 * staffing, reservation, progress, cancellation, and completion.
 *
 * Ownership:
 * - SPE-3041: condition/recurrence evaluation, activation identity, diagnostics
 * - SPE-1287: shared timed-task lifecycle envelope (handoff record only here)
 * - SPE-3181: containment-requirement producer exemplar (intent → template)
 * - Obligation producer fixture: period-bound work vs action-only compliance
 *
 * No private resource/personnel/facility copies, no worker selection, no
 * parallel job engine, no opaque recurrence callbacks.
 */

import type { Spe3041ActivationIntent } from './containmentRequirementFulfillment'

export const CONDITION_GROUP_KINDS = ['all', 'any'] as const
export type ConditionGroupKind = (typeof CONDITION_GROUP_KINDS)[number]

export const COMPARISON_OPERATORS = [
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'truthy',
  'falsy',
] as const
export type ComparisonOperator = (typeof COMPARISON_OPERATORS)[number]

export const RECURRENCE_POLICIES = [
  'once_per_window',
  'repeat_after_completion',
  'repeat_after_cooldown',
  'repeat_while_condition_persists',
] as const
export type RecurrencePolicy = (typeof RECURRENCE_POLICIES)[number]

export const CONDITION_OUTCOMES = ['passed', 'failed', 'unavailable'] as const
export type ConditionOutcome = (typeof CONDITION_OUTCOMES)[number]

export const ACTIVATION_RESULTS = [
  'activated',
  'skipped_conditions',
  'skipped_recurrence',
  'idempotent_noop',
  'rejected_malformed',
] as const
export type ActivationResultKind = (typeof ACTIVATION_RESULTS)[number]

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

/** Authoritative source value snapshot supplied by the caller (no private copy). */
export interface ConditionSourceSnapshot {
  readonly sourceRef: string
  readonly value: unknown
  readonly available: boolean
}

export interface AtomicConditionInput {
  readonly conditionId: string
  readonly sourceRef: string
  readonly operator: ComparisonOperator
  readonly threshold?: unknown
}

export interface ConditionGroupInput {
  readonly kind: ConditionGroupKind
  readonly conditions: readonly AtomicConditionInput[]
}

export interface RecurrenceDefinitionInput {
  readonly templateId: string
  readonly producerId: string
  readonly producerKind: string
  readonly taskKind: string
  readonly windowId: string
  readonly recurrencePolicy: RecurrencePolicy
  readonly cooldownWeeks?: number
  readonly createsWork: boolean
  readonly conditionGroup: ConditionGroupInput
  /** Optional producer-owned subject / obligation / requirement refs. */
  readonly subjectRef?: string
  readonly obligationId?: string
  readonly requirementId?: string
}

export interface RecurrenceDefinition {
  readonly templateId: string
  readonly producerId: string
  readonly producerKind: string
  readonly taskKind: string
  readonly windowId: string
  readonly recurrencePolicy: RecurrencePolicy
  readonly cooldownWeeks: number
  readonly createsWork: boolean
  readonly conditionGroup: {
    readonly kind: ConditionGroupKind
    readonly conditions: readonly AtomicConditionInput[]
  }
  readonly subjectRef?: string
  readonly obligationId?: string
  readonly requirementId?: string
}

export interface ActivationMarkers {
  /** Windows that already produced an active envelope (once_per_window / persists). */
  readonly activatedWindowIds: readonly string[]
  /** Last campaign week an activation was emitted. */
  readonly lastActivatedWeek?: number
  /** Last campaign week the producer reported completion of the prior instance. */
  readonly lastCompletedWeek?: number
  /** Stable identity of the currently active envelope, if any. */
  readonly activeEnvelopeId?: string
}

export interface ConditionDiagnostic {
  readonly conditionId: string
  readonly sourceRef: string
  readonly outcome: ConditionOutcome
  readonly reasonCode: string
}

export interface Spe1287LifecycleEnvelopeHandoff {
  readonly envelopeOwner: 'SPE-1287'
  readonly envelopeId: string
  readonly activationOwner: 'SPE-3041'
  readonly templateId: string
  readonly producerId: string
  readonly producerKind: string
  readonly taskKind: string
  readonly windowId: string
  readonly activationIdentity: string
  readonly campaignWeek: number
  readonly subjectRef?: string
  readonly obligationId?: string
  readonly requirementId?: string
  readonly reasonCodes: readonly string[]
}

export interface ActivationEvaluationResult {
  readonly result: ActivationResultKind
  readonly definition?: RecurrenceDefinition
  readonly markers: ActivationMarkers
  readonly conditionDiagnostics: readonly ConditionDiagnostic[]
  readonly envelope?: Spe1287LifecycleEnvelopeHandoff
  readonly reasonCodes: readonly string[]
}

export interface ActivationEvaluationInput {
  readonly definition: unknown
  readonly markers: unknown
  readonly campaignWeek: unknown
  readonly sources: readonly ConditionSourceSnapshot[]
  /**
   * When true, the producer reports the prior active instance completed this
   * evaluation (needed for repeat_after_completion).
   */
  readonly priorInstanceCompleted?: boolean
}

function emptyMarkers(): ActivationMarkers {
  return Object.freeze({ activatedWindowIds: Object.freeze([] as string[]) })
}

function parseMarkers(raw: unknown): ActivationMarkers | undefined {
  if (raw === undefined || raw === null) return emptyMarkers()
  if (!isRecord(raw)) return undefined
  const windowIdsRaw = raw.activatedWindowIds
  if (windowIdsRaw !== undefined && !Array.isArray(windowIdsRaw)) return undefined
  const activatedWindowIds: string[] = []
  if (Array.isArray(windowIdsRaw)) {
    for (const id of windowIdsRaw) {
      if (!isNonEmptyString(id)) return undefined
      activatedWindowIds.push(id.trim())
    }
  }
  const lastActivatedWeek =
    raw.lastActivatedWeek === undefined ? undefined : parseNonNegInt(raw.lastActivatedWeek)
  if (raw.lastActivatedWeek !== undefined && lastActivatedWeek === undefined) return undefined
  const lastCompletedWeek =
    raw.lastCompletedWeek === undefined ? undefined : parseNonNegInt(raw.lastCompletedWeek)
  if (raw.lastCompletedWeek !== undefined && lastCompletedWeek === undefined) return undefined
  const activeEnvelopeId =
    raw.activeEnvelopeId === undefined
      ? undefined
      : isNonEmptyString(raw.activeEnvelopeId)
        ? raw.activeEnvelopeId.trim()
        : undefined
  if (raw.activeEnvelopeId !== undefined && activeEnvelopeId === undefined) return undefined
  return Object.freeze({
    activatedWindowIds: Object.freeze(activatedWindowIds),
    ...(lastActivatedWeek !== undefined ? { lastActivatedWeek } : {}),
    ...(lastCompletedWeek !== undefined ? { lastCompletedWeek } : {}),
    ...(activeEnvelopeId !== undefined ? { activeEnvelopeId } : {}),
  })
}

function parseAtomicCondition(raw: unknown): AtomicConditionInput | undefined {
  if (!isRecord(raw)) return undefined
  if (!isNonEmptyString(raw.conditionId)) return undefined
  if (!isNonEmptyString(raw.sourceRef)) return undefined
  if (!isMember(raw.operator, COMPARISON_OPERATORS)) return undefined
  return Object.freeze({
    conditionId: raw.conditionId.trim(),
    sourceRef: raw.sourceRef.trim(),
    operator: raw.operator,
    ...(raw.threshold !== undefined ? { threshold: raw.threshold } : {}),
  })
}

function parseConditionGroup(raw: unknown): ConditionGroupInput | undefined {
  if (!isRecord(raw)) return undefined
  if (!isMember(raw.kind, CONDITION_GROUP_KINDS)) return undefined
  if (!Array.isArray(raw.conditions) || raw.conditions.length === 0) return undefined
  const conditions: AtomicConditionInput[] = []
  for (const item of raw.conditions) {
    const parsed = parseAtomicCondition(item)
    if (!parsed) return undefined
    conditions.push(parsed)
  }
  return Object.freeze({
    kind: raw.kind,
    conditions: Object.freeze(conditions),
  })
}

/** Validate and freeze a recurrence definition. Malformed input returns undefined. */
export function parseRecurrenceDefinition(raw: unknown): RecurrenceDefinition | undefined {
  if (!isRecord(raw)) return undefined
  if (!isNonEmptyString(raw.templateId)) return undefined
  if (!isNonEmptyString(raw.producerId)) return undefined
  if (!isNonEmptyString(raw.producerKind)) return undefined
  if (!isNonEmptyString(raw.taskKind)) return undefined
  if (!isNonEmptyString(raw.windowId)) return undefined
  if (!isMember(raw.recurrencePolicy, RECURRENCE_POLICIES)) return undefined
  if (typeof raw.createsWork !== 'boolean') return undefined
  const conditionGroup = parseConditionGroup(raw.conditionGroup)
  if (!conditionGroup) return undefined

  let cooldownWeeks = 0
  if (raw.cooldownWeeks !== undefined) {
    const parsed = parseNonNegInt(raw.cooldownWeeks)
    if (parsed === undefined) return undefined
    cooldownWeeks = parsed
  }
  if (raw.recurrencePolicy === 'repeat_after_cooldown' && cooldownWeeks < 1) {
    return undefined
  }

  const subjectRef =
    raw.subjectRef === undefined
      ? undefined
      : isNonEmptyString(raw.subjectRef)
        ? raw.subjectRef.trim()
        : undefined
  if (raw.subjectRef !== undefined && subjectRef === undefined) return undefined

  const obligationId =
    raw.obligationId === undefined
      ? undefined
      : isNonEmptyString(raw.obligationId)
        ? raw.obligationId.trim()
        : undefined
  if (raw.obligationId !== undefined && obligationId === undefined) return undefined

  const requirementId =
    raw.requirementId === undefined
      ? undefined
      : isNonEmptyString(raw.requirementId)
        ? raw.requirementId.trim()
        : undefined
  if (raw.requirementId !== undefined && requirementId === undefined) return undefined

  return Object.freeze({
    templateId: raw.templateId.trim(),
    producerId: raw.producerId.trim(),
    producerKind: raw.producerKind.trim(),
    taskKind: raw.taskKind.trim(),
    windowId: raw.windowId.trim(),
    recurrencePolicy: raw.recurrencePolicy,
    cooldownWeeks,
    createsWork: raw.createsWork,
    conditionGroup,
    ...(subjectRef !== undefined ? { subjectRef } : {}),
    ...(obligationId !== undefined ? { obligationId } : {}),
    ...(requirementId !== undefined ? { requirementId } : {}),
  })
}

/**
 * Build a SPE-3041 recurrence definition from a SPE-3181 activation intent.
 * Intent already means work is due; the condition packet is a single truthy
 * source the caller must supply as `spe-3181:intent:{idempotencyKey}`.
 */
export function recurrenceDefinitionFromSpe3181Intent(
  intent: Spe3041ActivationIntent
): RecurrenceDefinition {
  const sourceRef = `spe-3181:intent:${intent.idempotencyKey}`
  return Object.freeze({
    templateId: `spe-3181:${intent.requirementId}:${intent.windowId}`,
    producerId: 'SPE-3181',
    producerKind: 'containment_requirement',
    taskKind: 'containment_requirement_fulfillment',
    windowId: intent.windowId,
    recurrencePolicy: 'once_per_window' as const,
    cooldownWeeks: 0,
    createsWork: true,
    conditionGroup: Object.freeze({
      kind: 'all' as const,
      conditions: Object.freeze([
        Object.freeze({
          conditionId: 'intent_present',
          sourceRef,
          operator: 'truthy' as const,
        }),
      ]),
    }),
    subjectRef: intent.subjectRef,
    requirementId: intent.requirementId,
  })
}

/**
 * Obligation-backed recurring work template (second producer exemplar).
 * `createsWork: false` models period-bound compliance satisfied by an ordinary
 * qualifying action without minting a task.
 */
export function buildObligationRecurrenceDefinition(input: {
  readonly obligationId: string
  readonly windowId: string
  readonly createsWork: boolean
  readonly subjectRef?: string
  readonly recurrencePolicy?: RecurrencePolicy
  readonly conditionSourceRef?: string
}): RecurrenceDefinition {
  const sourceRef = input.conditionSourceRef ?? `obligation:${input.obligationId}:requires_work`
  return Object.freeze({
    templateId: `obligation:${input.obligationId}:${input.windowId}`,
    producerId: 'obligation_fixture',
    producerKind: 'period_bound_obligation',
    taskKind: 'obligation_recurring_work',
    windowId: input.windowId,
    recurrencePolicy: input.recurrencePolicy ?? 'once_per_window',
    cooldownWeeks: 0,
    createsWork: input.createsWork,
    conditionGroup: Object.freeze({
      kind: 'all' as const,
      conditions: Object.freeze([
        Object.freeze({
          conditionId: 'obligation_requires_work',
          sourceRef,
          operator: 'truthy' as const,
        }),
      ]),
    }),
    ...(input.subjectRef !== undefined ? { subjectRef: input.subjectRef } : {}),
    obligationId: input.obligationId,
  })
}

function compareValues(
  operator: ComparisonOperator,
  value: unknown,
  threshold: unknown
): boolean | undefined {
  switch (operator) {
    case 'truthy':
      return Boolean(value)
    case 'falsy':
      return !value
    case 'eq':
      return value === threshold
    case 'neq':
      return value !== threshold
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      if (typeof value !== 'number' || typeof threshold !== 'number') return undefined
      if (!Number.isFinite(value) || !Number.isFinite(threshold)) return undefined
      if (operator === 'gt') return value > threshold
      if (operator === 'gte') return value >= threshold
      if (operator === 'lt') return value < threshold
      return value <= threshold
    }
    default: {
      const _exhaustive: never = operator
      return _exhaustive
    }
  }
}

function evaluateAtomicCondition(
  condition: AtomicConditionInput,
  sourceByRef: ReadonlyMap<string, ConditionSourceSnapshot>
): ConditionDiagnostic {
  const source = sourceByRef.get(condition.sourceRef)
  if (!source || !source.available) {
    return Object.freeze({
      conditionId: condition.conditionId,
      sourceRef: condition.sourceRef,
      outcome: 'unavailable' as const,
      reasonCode: 'source_unavailable',
    })
  }
  const compared = compareValues(condition.operator, source.value, condition.threshold)
  if (compared === undefined) {
    return Object.freeze({
      conditionId: condition.conditionId,
      sourceRef: condition.sourceRef,
      outcome: 'unavailable' as const,
      reasonCode: 'incomparable_value',
    })
  }
  return Object.freeze({
    conditionId: condition.conditionId,
    sourceRef: condition.sourceRef,
    outcome: compared ? ('passed' as const) : ('failed' as const),
    reasonCode: compared ? 'condition_passed' : 'condition_failed',
  })
}

function groupSatisfied(
  kind: ConditionGroupKind,
  diagnostics: readonly ConditionDiagnostic[]
): boolean {
  if (kind === 'all') {
    return diagnostics.every((d) => d.outcome === 'passed')
  }
  return diagnostics.some((d) => d.outcome === 'passed')
}

/** Stable activation identity — must not change across re-evaluation of same qualifying state. */
export function buildActivationIdentity(definition: RecurrenceDefinition): string {
  return JSON.stringify([
    'spe-3041',
    definition.producerId,
    definition.templateId,
    definition.windowId,
    definition.taskKind,
  ])
}

function recurrenceAllowsActivation(
  definition: RecurrenceDefinition,
  markers: ActivationMarkers,
  campaignWeek: number,
  priorInstanceCompleted: boolean
): { allowed: boolean; reasonCode: string } {
  switch (definition.recurrencePolicy) {
    case 'once_per_window': {
      if (markers.activatedWindowIds.includes(definition.windowId)) {
        return { allowed: false, reasonCode: 'already_activated_this_window' }
      }
      if (markers.activeEnvelopeId !== undefined) {
        return { allowed: false, reasonCode: 'active_envelope_present' }
      }
      return { allowed: true, reasonCode: 'once_per_window_open' }
    }
    case 'repeat_after_completion': {
      if (markers.activeEnvelopeId !== undefined && !priorInstanceCompleted) {
        return { allowed: false, reasonCode: 'awaiting_prior_completion' }
      }
      if (
        markers.lastCompletedWeek === undefined &&
        markers.activatedWindowIds.includes(definition.windowId) &&
        !priorInstanceCompleted
      ) {
        return { allowed: false, reasonCode: 'awaiting_prior_completion' }
      }
      return { allowed: true, reasonCode: 'repeat_after_completion_open' }
    }
    case 'repeat_after_cooldown': {
      if (markers.activeEnvelopeId !== undefined && !priorInstanceCompleted) {
        return { allowed: false, reasonCode: 'awaiting_prior_completion' }
      }
      if (markers.lastActivatedWeek !== undefined) {
        const nextAllowed = markers.lastActivatedWeek + definition.cooldownWeeks
        if (campaignWeek < nextAllowed) {
          return { allowed: false, reasonCode: 'cooldown_active' }
        }
      }
      return { allowed: true, reasonCode: 'cooldown_elapsed' }
    }
    case 'repeat_while_condition_persists': {
      if (markers.activeEnvelopeId !== undefined) {
        return { allowed: false, reasonCode: 'active_envelope_present' }
      }
      return { allowed: true, reasonCode: 'condition_persist_open' }
    }
    default: {
      const _exhaustive: never = definition.recurrencePolicy
      return _exhaustive
    }
  }
}

function rejected(
  markers: ActivationMarkers,
  reasonCodes: readonly string[],
  diagnostics: readonly ConditionDiagnostic[] = []
): ActivationEvaluationResult {
  return Object.freeze({
    result: 'rejected_malformed' as const,
    markers,
    conditionDiagnostics: Object.freeze([...diagnostics]),
    reasonCodes: Object.freeze([...reasonCodes]),
  })
}

/**
 * Evaluate a recurrence definition at a declared simulation point.
 * Returns an updated marker snapshot and optional SPE-1287 envelope handoff.
 */
export function evaluateConditionalRecurringActivation(
  input: ActivationEvaluationInput
): ActivationEvaluationResult {
  const markers = parseMarkers(input.markers)
  if (!markers) {
    return rejected(emptyMarkers(), ['malformed_markers'])
  }

  const campaignWeek = parseNonNegInt(input.campaignWeek)
  if (campaignWeek === undefined) {
    return rejected(markers, ['malformed_campaign_week'])
  }

  const definition = parseRecurrenceDefinition(input.definition)
  if (!definition) {
    return rejected(markers, ['malformed_definition'])
  }

  if (!definition.createsWork) {
    return Object.freeze({
      result: 'skipped_recurrence' as const,
      definition,
      markers,
      conditionDiagnostics: Object.freeze([] as ConditionDiagnostic[]),
      reasonCodes: Object.freeze(['creates_work_false', 'no_task_for_compliance_only']),
    })
  }

  if (!Array.isArray(input.sources)) {
    return rejected(markers, ['malformed_sources'])
  }

  const sourceByRef = new Map<string, ConditionSourceSnapshot>()
  for (const source of input.sources) {
    if (!isRecord(source) || !isNonEmptyString(source.sourceRef)) {
      return rejected(markers, ['malformed_source_entry'])
    }
    if (typeof source.available !== 'boolean') {
      return rejected(markers, ['malformed_source_entry'])
    }
    sourceByRef.set(source.sourceRef.trim(), Object.freeze({
      sourceRef: source.sourceRef.trim(),
      value: source.value,
      available: source.available,
    }))
  }

  const diagnostics = definition.conditionGroup.conditions.map((c) =>
    evaluateAtomicCondition(c, sourceByRef)
  )
  const frozenDiagnostics = Object.freeze(diagnostics)

  if (!groupSatisfied(definition.conditionGroup.kind, diagnostics)) {
    return Object.freeze({
      result: 'skipped_conditions' as const,
      definition,
      markers,
      conditionDiagnostics: frozenDiagnostics,
      reasonCodes: Object.freeze(['conditions_not_satisfied']),
    })
  }

  const priorCompleted = input.priorInstanceCompleted === true
  const recurrence = recurrenceAllowsActivation(
    definition,
    markers,
    campaignWeek,
    priorCompleted
  )
  if (!recurrence.allowed) {
    const isIdempotent =
      recurrence.reasonCode === 'already_activated_this_window' ||
      recurrence.reasonCode === 'active_envelope_present'
    return Object.freeze({
      result: isIdempotent ? ('idempotent_noop' as const) : ('skipped_recurrence' as const),
      definition,
      markers,
      conditionDiagnostics: frozenDiagnostics,
      reasonCodes: Object.freeze([recurrence.reasonCode]),
    })
  }

  const activationIdentity = buildActivationIdentity(definition)
  if (
    markers.activeEnvelopeId !== undefined &&
    markers.activeEnvelopeId === activationIdentity &&
    !priorCompleted
  ) {
    return Object.freeze({
      result: 'idempotent_noop' as const,
      definition,
      markers,
      conditionDiagnostics: frozenDiagnostics,
      reasonCodes: Object.freeze(['duplicate_activation_identity']),
    })
  }

  const envelope: Spe1287LifecycleEnvelopeHandoff = Object.freeze({
    envelopeOwner: 'SPE-1287' as const,
    envelopeId: activationIdentity,
    activationOwner: 'SPE-3041' as const,
    templateId: definition.templateId,
    producerId: definition.producerId,
    producerKind: definition.producerKind,
    taskKind: definition.taskKind,
    windowId: definition.windowId,
    activationIdentity,
    campaignWeek,
    ...(definition.subjectRef !== undefined ? { subjectRef: definition.subjectRef } : {}),
    ...(definition.obligationId !== undefined ? { obligationId: definition.obligationId } : {}),
    ...(definition.requirementId !== undefined
      ? { requirementId: definition.requirementId }
      : {}),
    reasonCodes: Object.freeze(['activated', recurrence.reasonCode]),
  })

  const nextWindowIds = markers.activatedWindowIds.includes(definition.windowId)
    ? markers.activatedWindowIds
    : Object.freeze([...markers.activatedWindowIds, definition.windowId])

  const nextMarkers: ActivationMarkers = Object.freeze({
    activatedWindowIds: nextWindowIds,
    lastActivatedWeek: campaignWeek,
    ...(priorCompleted || markers.lastCompletedWeek !== undefined
      ? {
          lastCompletedWeek: priorCompleted
            ? campaignWeek
            : markers.lastCompletedWeek,
        }
      : {}),
    activeEnvelopeId: activationIdentity,
  })

  return Object.freeze({
    result: 'activated' as const,
    definition,
    markers: nextMarkers,
    conditionDiagnostics: frozenDiagnostics,
    envelope,
    reasonCodes: Object.freeze(['activated', recurrence.reasonCode]),
  })
}

/** Mark prior active envelope completed (producer-owned completion signal). */
export function markActivationCompleted(
  markers: unknown,
  campaignWeek: unknown
): ActivationMarkers | undefined {
  const parsed = parseMarkers(markers)
  const week = parseNonNegInt(campaignWeek)
  if (!parsed || week === undefined) return undefined
  return Object.freeze({
    activatedWindowIds: parsed.activatedWindowIds,
    ...(parsed.lastActivatedWeek !== undefined
      ? { lastActivatedWeek: parsed.lastActivatedWeek }
      : {}),
    lastCompletedWeek: week,
    // Clear active envelope so recurrence policies may fire again.
  })
}

/** Serialize markers for save/load without inventing new fields. */
export function serializeActivationMarkers(markers: ActivationMarkers): ActivationMarkers {
  return Object.freeze({
    activatedWindowIds: Object.freeze([...markers.activatedWindowIds]),
    ...(markers.lastActivatedWeek !== undefined
      ? { lastActivatedWeek: markers.lastActivatedWeek }
      : {}),
    ...(markers.lastCompletedWeek !== undefined
      ? { lastCompletedWeek: markers.lastCompletedWeek }
      : {}),
    ...(markers.activeEnvelopeId !== undefined
      ? { activeEnvelopeId: markers.activeEnvelopeId }
      : {}),
  })
}
