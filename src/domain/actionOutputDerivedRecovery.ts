/**
 * SPE-3120 — action-output-derived recovery effect under SPE-41.
 *
 * Qualifying successful action output restores a bounded actor resource with
 * authoritative provenance, context eligibility, clamping, and idempotency.
 * Kill-trigger recovery remains SPE-1405 and is rejected from this contract.
 * No GameState persistence, parallel health system, or debrief UI.
 */

export const ACTION_OUTPUT_DERIVED_RECOVERY_OWNER = 'SPE-3120' as const
export const KILL_TRIGGER_RECOVERY_OWNER = 'SPE-1405' as const
export const ACTION_OUTPUT_DERIVED_RECOVERY_SCHEMA_VERSION = 'spe-3120.v1' as const

/** Abstract SPE-41-compatible output channels — not source-specific mode names. */
export const QUALIFYING_OUTPUT_CHANNELS = [
  'resolved_success_magnitude',
  'stabilization_output',
  'pressure_relief_output',
  'containment_progress_output',
] as const
export type QualifyingOutputChannel = (typeof QUALIFYING_OUTPUT_CHANNELS)[number]

/** Bounded actor resource kinds restored by this effect (caller owns authority). */
export const RECOVERABLE_RESOURCE_KINDS = [
  'vitality',
  'stamina',
  'focus',
  'morale',
] as const
export type RecoverableResourceKind = (typeof RECOVERABLE_RESOURCE_KINDS)[number]

export const RECOVERY_TRIGGER_KINDS = ['action_output', 'kill_trigger'] as const
export type RecoveryTriggerKind = (typeof RECOVERY_TRIGGER_KINDS)[number]

export const ACTION_OUTPUT_RECOVERY_REASON_CODES = [
  'applied',
  'clamped_at_maximum',
  'zero_converted_amount',
  'context_excluded',
  'context_not_allowed',
  'channel_mismatch',
  'invalid_target',
  'nonrecoverable_resource',
  'malformed_input',
  'idempotent_replay',
  'recursive_self_trigger_blocked',
  'kill_trigger_routed_to_spe_1405',
  'action_not_successful',
  'resource_kind_mismatch',
] as const
export type ActionOutputRecoveryReasonCode =
  (typeof ACTION_OUTPUT_RECOVERY_REASON_CODES)[number]

export const ACTION_OUTPUT_RECOVERY_STATUSES = [
  'applied',
  'suppressed',
  'rejected',
] as const
export type ActionOutputRecoveryStatus = (typeof ACTION_OUTPUT_RECOVERY_STATUSES)[number]

/**
 * Context eligibility without source-specific tournament/mode names.
 * Allowlist (when present) must include at least one active context id.
 * Exclusions always suppress when matched.
 */
export interface ActionOutputRecoveryContextPolicy {
  readonly allowedContextIds?: readonly string[]
  readonly excludedContextIds?: readonly string[]
}

/**
 * Authorable recovery effect: proportional conversion from qualifying output.
 * Ratio is numerator/denominator (integer floor); hardCap bounds per application.
 */
export interface ActionOutputDerivedRecoveryEffect {
  readonly effectId: string
  readonly qualifyingOutputChannel: QualifyingOutputChannel
  readonly targetResourceKind: RecoverableResourceKind
  /** Non-negative integer numerator of conversion ratio. */
  readonly conversionNumerator: number
  /** Positive integer denominator of conversion ratio. */
  readonly conversionDenominator: number
  /** Optional non-negative hard cap on converted amount before clamp-to-max. */
  readonly hardCap?: number
  readonly contextPolicy: ActionOutputRecoveryContextPolicy
  /**
   * Default false: recovery results of this effect cannot re-trigger it.
   * Explicit true allows recursion only when the caller also validates authorship.
   */
  readonly allowRecursiveSelfTrigger?: boolean
}

export interface ActorResourceSnapshot {
  readonly kind: RecoverableResourceKind
  readonly current: number
  readonly maximum: number
  readonly recoverable: boolean
}

/**
 * Caller-owned resolved action snapshot. This module does not invent output,
 * mutate GameState, or own ordinary health/injury authority.
 */
export interface ResolveActionOutputDerivedRecoveryInput {
  readonly effect: ActionOutputDerivedRecoveryEffect
  readonly actorId: string
  readonly actionId: string
  readonly sourceEffectId: string
  readonly triggerKind: RecoveryTriggerKind
  readonly success: boolean
  readonly outputChannel: QualifyingOutputChannel | string
  readonly outputMagnitude: number
  readonly activeContextIds: readonly string[]
  readonly targetActorId: string
  readonly targetResource: ActorResourceSnapshot
  /** Prior originating action ids already applied for this effect (idempotency). */
  readonly previouslyAppliedActionIds?: readonly string[]
  /**
   * When set to this effect's id, the resolution is itself a recovery output
   * of the same effect — blocked unless allowRecursiveSelfTrigger is true.
   */
  readonly originatingFromRecoveryEffectId?: string
}

export interface ActionOutputRecoveryProvenance {
  readonly actorId: string
  readonly actionId: string
  readonly sourceEffectId: string
  readonly effectId: string
  readonly targetActorId: string
  readonly resourceKind: RecoverableResourceKind
  readonly appliedAmount: number
  readonly convertedAmount: number
  readonly previousValue: number
  readonly nextValue: number
  readonly outputChannel: string
  readonly outputMagnitude: number
  readonly clamped: boolean
}

/** Stable payload for SPE-1496 debrief / report consumers — no state reverse-engineering. */
export interface ActionOutputRecoveryReportAttribution {
  readonly kind: 'action_output_derived_recovery'
  readonly schemaVersion: typeof ACTION_OUTPUT_DERIVED_RECOVERY_SCHEMA_VERSION
  readonly owner: typeof ACTION_OUTPUT_DERIVED_RECOVERY_OWNER | typeof KILL_TRIGGER_RECOVERY_OWNER
  readonly effectId: string
  readonly status: ActionOutputRecoveryStatus
  readonly reasonCode: ActionOutputRecoveryReasonCode
  readonly appliedAmount: number
  readonly actorId: string
  readonly actionId: string
  readonly sourceEffectId: string
  readonly targetActorId: string
  readonly resourceKind: RecoverableResourceKind | null
}

export interface ActionOutputDerivedRecoveryResult {
  readonly status: ActionOutputRecoveryStatus
  readonly reasonCode: ActionOutputRecoveryReasonCode
  readonly owner: typeof ACTION_OUTPUT_DERIVED_RECOVERY_OWNER | typeof KILL_TRIGGER_RECOVERY_OWNER
  readonly provenance: ActionOutputRecoveryProvenance
  readonly reportAttribution: ActionOutputRecoveryReportAttribution
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isNonNegInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value >= 0
}

function isPositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value > 0
}

export function isQualifyingOutputChannel(value: unknown): value is QualifyingOutputChannel {
  return QUALIFYING_OUTPUT_CHANNELS.some((channel) => channel === value)
}

export function isRecoverableResourceKind(value: unknown): value is RecoverableResourceKind {
  return RECOVERABLE_RESOURCE_KINDS.some((kind) => kind === value)
}

export function isRecoveryTriggerKind(value: unknown): value is RecoveryTriggerKind {
  return RECOVERY_TRIGGER_KINDS.some((kind) => kind === value)
}

export function isActionOutputRecoveryReasonCode(
  value: unknown
): value is ActionOutputRecoveryReasonCode {
  return ACTION_OUTPUT_RECOVERY_REASON_CODES.some((code) => code === value)
}

function normalizeToken(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeContextIds(ids: readonly string[] | undefined): readonly string[] {
  if (!ids) return Object.freeze([])
  const seen = new Set<string>()
  const out: string[] = []
  for (const id of ids) {
    const token = normalizeToken(id)
    if (!token || seen.has(token)) continue
    seen.add(token)
    out.push(token)
  }
  return Object.freeze(out)
}

/**
 * Convert qualifying output magnitude → recovery amount.
 * floor(magnitude * numerator / denominator), then optional hardCap.
 * Never negative; malformed ratio yields 0.
 */
export function convertActionOutputToRecoveryAmount(
  outputMagnitude: number,
  numerator: number,
  denominator: number,
  hardCap?: number
): number {
  if (!isNonNegInt(outputMagnitude) || !isNonNegInt(numerator) || !isPositiveInt(denominator)) {
    return 0
  }
  const converted = Math.floor((outputMagnitude * numerator) / denominator)
  if (hardCap === undefined) return converted
  if (!isNonNegInt(hardCap)) return converted
  return Math.min(converted, hardCap)
}

function emptyProvenance(
  partial: Partial<ActionOutputRecoveryProvenance> &
    Pick<
      ActionOutputRecoveryProvenance,
      'actorId' | 'actionId' | 'sourceEffectId' | 'effectId' | 'targetActorId' | 'resourceKind'
    >
): ActionOutputRecoveryProvenance {
  return Object.freeze({
    actorId: partial.actorId,
    actionId: partial.actionId,
    sourceEffectId: partial.sourceEffectId,
    effectId: partial.effectId,
    targetActorId: partial.targetActorId,
    resourceKind: partial.resourceKind,
    appliedAmount: partial.appliedAmount ?? 0,
    convertedAmount: partial.convertedAmount ?? 0,
    previousValue: partial.previousValue ?? 0,
    nextValue: partial.nextValue ?? partial.previousValue ?? 0,
    outputChannel: partial.outputChannel ?? '',
    outputMagnitude: partial.outputMagnitude ?? 0,
    clamped: partial.clamped ?? false,
  })
}

function buildResult(args: {
  status: ActionOutputRecoveryStatus
  reasonCode: ActionOutputRecoveryReasonCode
  owner: typeof ACTION_OUTPUT_DERIVED_RECOVERY_OWNER | typeof KILL_TRIGGER_RECOVERY_OWNER
  provenance: ActionOutputRecoveryProvenance
}): ActionOutputDerivedRecoveryResult {
  const { status, reasonCode, owner, provenance } = args
  return Object.freeze({
    status,
    reasonCode,
    owner,
    provenance,
    reportAttribution: Object.freeze({
      kind: 'action_output_derived_recovery' as const,
      schemaVersion: ACTION_OUTPUT_DERIVED_RECOVERY_SCHEMA_VERSION,
      owner,
      effectId: provenance.effectId,
      status,
      reasonCode,
      appliedAmount: provenance.appliedAmount,
      actorId: provenance.actorId,
      actionId: provenance.actionId,
      sourceEffectId: provenance.sourceEffectId,
      targetActorId: provenance.targetActorId,
      resourceKind: provenance.resourceKind,
    }),
  })
}

export function validateActionOutputDerivedRecoveryEffect(
  effect: unknown
): effect is ActionOutputDerivedRecoveryEffect {
  if (!isRecord(effect)) return false
  if (!isNonEmptyString(effect.effectId)) return false
  if (!isQualifyingOutputChannel(effect.qualifyingOutputChannel)) return false
  if (!isRecoverableResourceKind(effect.targetResourceKind)) return false
  if (!isNonNegInt(effect.conversionNumerator)) return false
  if (!isPositiveInt(effect.conversionDenominator)) return false
  if (effect.hardCap !== undefined && !isNonNegInt(effect.hardCap)) return false
  if (
    effect.allowRecursiveSelfTrigger !== undefined &&
    typeof effect.allowRecursiveSelfTrigger !== 'boolean'
  ) {
    return false
  }
  if (!isRecord(effect.contextPolicy)) return false
  const policy = effect.contextPolicy
  if (policy.allowedContextIds !== undefined) {
    if (!Array.isArray(policy.allowedContextIds)) return false
    if (!policy.allowedContextIds.every((id) => typeof id === 'string')) return false
  }
  if (policy.excludedContextIds !== undefined) {
    if (!Array.isArray(policy.excludedContextIds)) return false
    if (!policy.excludedContextIds.every((id) => typeof id === 'string')) return false
  }
  return true
}

function validateTargetResource(resource: unknown): resource is ActorResourceSnapshot {
  if (!isRecord(resource)) return false
  if (!isRecoverableResourceKind(resource.kind)) return false
  if (!isNonNegInt(resource.current)) return false
  if (!isNonNegInt(resource.maximum)) return false
  if (resource.current > resource.maximum) return false
  if (typeof resource.recoverable !== 'boolean') return false
  return true
}

/**
 * Resolve one action-output-derived recovery application.
 * Deterministic, side-effect free; callers apply `nextValue` to authoritative state.
 */
export function resolveActionOutputDerivedRecovery(
  input: ResolveActionOutputDerivedRecoveryInput | null | undefined
): ActionOutputDerivedRecoveryResult {
  if (input == null || !isRecord(input)) {
    return buildResult({
      status: 'rejected',
      reasonCode: 'malformed_input',
      owner: ACTION_OUTPUT_DERIVED_RECOVERY_OWNER,
      provenance: emptyProvenance({
        actorId: '',
        actionId: '',
        sourceEffectId: '',
        effectId: '',
        targetActorId: '',
        resourceKind: 'vitality',
      }),
    })
  }

  const effect = input.effect
  const actorId = normalizeToken(input.actorId)
  const actionId = normalizeToken(input.actionId)
  const sourceEffectId = normalizeToken(input.sourceEffectId)
  const targetActorId = normalizeToken(input.targetActorId)
  const effectId = validateActionOutputDerivedRecoveryEffect(effect)
    ? normalizeToken(effect.effectId)
    : ''

  const baseProv = {
    actorId,
    actionId,
    sourceEffectId,
    effectId,
    targetActorId,
    resourceKind: (validateActionOutputDerivedRecoveryEffect(effect)
      ? effect.targetResourceKind
      : 'vitality') as RecoverableResourceKind,
    outputChannel: typeof input.outputChannel === 'string' ? input.outputChannel : '',
    outputMagnitude: isNonNegInt(input.outputMagnitude) ? input.outputMagnitude : 0,
    previousValue: validateTargetResource(input.targetResource) ? input.targetResource.current : 0,
  }

  if (
    !validateActionOutputDerivedRecoveryEffect(effect) ||
    !actorId ||
    !actionId ||
    !sourceEffectId ||
    !targetActorId ||
    !isRecoveryTriggerKind(input.triggerKind) ||
    typeof input.success !== 'boolean' ||
    !Array.isArray(input.activeContextIds) ||
    !input.activeContextIds.every((id) => typeof id === 'string') ||
    !isNonNegInt(input.outputMagnitude) ||
    (input.previouslyAppliedActionIds !== undefined &&
      (!Array.isArray(input.previouslyAppliedActionIds) ||
        !input.previouslyAppliedActionIds.every((id) => typeof id === 'string'))) ||
    (input.originatingFromRecoveryEffectId !== undefined &&
      typeof input.originatingFromRecoveryEffectId !== 'string')
  ) {
    return buildResult({
      status: 'rejected',
      reasonCode: 'malformed_input',
      owner: ACTION_OUTPUT_DERIVED_RECOVERY_OWNER,
      provenance: emptyProvenance(baseProv),
    })
  }

  if (input.triggerKind === 'kill_trigger') {
    return buildResult({
      status: 'rejected',
      reasonCode: 'kill_trigger_routed_to_spe_1405',
      owner: KILL_TRIGGER_RECOVERY_OWNER,
      provenance: emptyProvenance(baseProv),
    })
  }

  if (!validateTargetResource(input.targetResource)) {
    return buildResult({
      status: 'rejected',
      reasonCode: 'invalid_target',
      owner: ACTION_OUTPUT_DERIVED_RECOVERY_OWNER,
      provenance: emptyProvenance(baseProv),
    })
  }

  const resource = input.targetResource
  baseProv.resourceKind = resource.kind
  baseProv.previousValue = resource.current

  if (resource.kind !== effect.targetResourceKind) {
    return buildResult({
      status: 'suppressed',
      reasonCode: 'resource_kind_mismatch',
      owner: ACTION_OUTPUT_DERIVED_RECOVERY_OWNER,
      provenance: emptyProvenance(baseProv),
    })
  }

  if (!resource.recoverable) {
    return buildResult({
      status: 'suppressed',
      reasonCode: 'nonrecoverable_resource',
      owner: ACTION_OUTPUT_DERIVED_RECOVERY_OWNER,
      provenance: emptyProvenance({
        ...baseProv,
        nextValue: resource.current,
      }),
    })
  }

  const priorIds = normalizeContextIds(input.previouslyAppliedActionIds)
  if (priorIds.includes(actionId)) {
    return buildResult({
      status: 'suppressed',
      reasonCode: 'idempotent_replay',
      owner: ACTION_OUTPUT_DERIVED_RECOVERY_OWNER,
      provenance: emptyProvenance({
        ...baseProv,
        nextValue: resource.current,
      }),
    })
  }

  const originatingFrom = normalizeToken(input.originatingFromRecoveryEffectId)
  if (
    originatingFrom.length > 0 &&
    originatingFrom === effectId &&
    effect.allowRecursiveSelfTrigger !== true
  ) {
    return buildResult({
      status: 'suppressed',
      reasonCode: 'recursive_self_trigger_blocked',
      owner: ACTION_OUTPUT_DERIVED_RECOVERY_OWNER,
      provenance: emptyProvenance({
        ...baseProv,
        nextValue: resource.current,
      }),
    })
  }

  if (!input.success) {
    return buildResult({
      status: 'suppressed',
      reasonCode: 'action_not_successful',
      owner: ACTION_OUTPUT_DERIVED_RECOVERY_OWNER,
      provenance: emptyProvenance({
        ...baseProv,
        nextValue: resource.current,
      }),
    })
  }

  if (input.outputChannel !== effect.qualifyingOutputChannel) {
    return buildResult({
      status: 'suppressed',
      reasonCode: 'channel_mismatch',
      owner: ACTION_OUTPUT_DERIVED_RECOVERY_OWNER,
      provenance: emptyProvenance({
        ...baseProv,
        nextValue: resource.current,
      }),
    })
  }

  const activeContexts = normalizeContextIds(input.activeContextIds)
  const excluded = normalizeContextIds(effect.contextPolicy.excludedContextIds)
  if (excluded.some((id) => activeContexts.includes(id))) {
    return buildResult({
      status: 'suppressed',
      reasonCode: 'context_excluded',
      owner: ACTION_OUTPUT_DERIVED_RECOVERY_OWNER,
      provenance: emptyProvenance({
        ...baseProv,
        nextValue: resource.current,
      }),
    })
  }

  const allowed = normalizeContextIds(effect.contextPolicy.allowedContextIds)
  if (allowed.length > 0 && !allowed.some((id) => activeContexts.includes(id))) {
    return buildResult({
      status: 'suppressed',
      reasonCode: 'context_not_allowed',
      owner: ACTION_OUTPUT_DERIVED_RECOVERY_OWNER,
      provenance: emptyProvenance({
        ...baseProv,
        nextValue: resource.current,
      }),
    })
  }

  const converted = convertActionOutputToRecoveryAmount(
    input.outputMagnitude,
    effect.conversionNumerator,
    effect.conversionDenominator,
    effect.hardCap
  )

  if (converted <= 0) {
    return buildResult({
      status: 'suppressed',
      reasonCode: 'zero_converted_amount',
      owner: ACTION_OUTPUT_DERIVED_RECOVERY_OWNER,
      provenance: emptyProvenance({
        ...baseProv,
        convertedAmount: 0,
        nextValue: resource.current,
      }),
    })
  }

  const room = Math.max(0, resource.maximum - resource.current)
  const appliedAmount = Math.min(converted, room)
  const clamped = appliedAmount < converted
  const nextValue = resource.current + appliedAmount

  if (appliedAmount === 0) {
    return buildResult({
      status: 'suppressed',
      reasonCode: 'clamped_at_maximum',
      owner: ACTION_OUTPUT_DERIVED_RECOVERY_OWNER,
      provenance: emptyProvenance({
        ...baseProv,
        convertedAmount: converted,
        nextValue: resource.current,
        clamped: true,
      }),
    })
  }

  return buildResult({
    status: 'applied',
    reasonCode: clamped ? 'clamped_at_maximum' : 'applied',
    owner: ACTION_OUTPUT_DERIVED_RECOVERY_OWNER,
    provenance: emptyProvenance({
      ...baseProv,
      appliedAmount,
      convertedAmount: converted,
      nextValue,
      clamped,
    }),
  })
}
