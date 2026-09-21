import {
  resolveVolatileActionPriority,
  type VolatileActionPriorityRequest,
  type VolatileActionPriorityResult,
  type VolatileActionPrioritySequence,
} from './volatileActionPriority'

export const VOLATILE_ACTION_PHASE_VARIANT_ID = 'volatile_action_v1' as const
export const VOLATILE_ACTION_PROCEDURE_VARIANT_ID = 'volatile_action_procedure_v1' as const

export const VOLATILE_ACTION_PHASE_VARIANT_IDS = [
  VOLATILE_ACTION_PHASE_VARIANT_ID,
  VOLATILE_ACTION_PROCEDURE_VARIANT_ID,
] as const

export type VolatileActionPhaseVariantId = (typeof VOLATILE_ACTION_PHASE_VARIANT_IDS)[number]

export const VOLATILE_ACTION_PHASE_MODES = ['task', 'test', 'advanced_action'] as const

export type VolatileActionPhaseMode = (typeof VOLATILE_ACTION_PHASE_MODES)[number]

export const VOLATILE_ACTION_V1_PHASE_IDS = [
  'posture_commit',
  'environmental_read',
  'clash_window',
  'effect_emission',
  'cleanup',
] as const

export type VolatileActionV1PhaseId = (typeof VOLATILE_ACTION_V1_PHASE_IDS)[number]

export type VolatileActionPhaseStatus =
  'ran' | 'skipped' | 'prepended' | 'truncated' | 'redirected' | 'held' | 'aborted' | 'delayed'

export type VolatileActionStakes = 'none' | 'present'

export const VOLATILE_ACTION_REACTION_WINDOW_ID = 'after_posture_commit' as const

const NO_STAKES_SKIPPED_PHASE_IDS = new Set<VolatileActionV1PhaseId>([
  'clash_window',
  'effect_emission',
])

const HOLD_AIM_OR_ABORT_PHASE_IDS = new Set<VolatileActionV1PhaseId>([
  'clash_window',
  'effect_emission',
])

const PROTOTYPE_SENSITIVE_IDS = new Set(['__proto__', 'constructor', 'prototype'])

export type VolatileActionInterruptNone = {
  readonly kind: 'none'
}

export type VolatileActionInterruptRewrite = {
  readonly kind: 'prepend' | 'truncate' | 'redirect'
  readonly windowId: typeof VOLATILE_ACTION_REACTION_WINDOW_ID
}

export type VolatileActionInterruptInput =
  VolatileActionInterruptNone | VolatileActionInterruptRewrite

export type VolatileActionHoldNone = {
  readonly kind: 'none'
}

export type VolatileActionHoldAim = {
  readonly kind: 'hold_aim'
  readonly instanceId: string
}

export type VolatileActionHoldAbort = {
  readonly kind: 'abort'
  readonly instanceId: string
  readonly reason: string
}

export type VolatileActionHoldDelayed = {
  readonly kind: 'delayed_emission'
  readonly instanceId: string
}

export type VolatileActionHoldInput =
  | VolatileActionHoldNone
  | VolatileActionHoldAim
  | VolatileActionHoldAbort
  | VolatileActionHoldDelayed

export interface VolatileActionPhaseRecord {
  readonly id: VolatileActionV1PhaseId
  readonly status: VolatileActionPhaseStatus
}

export interface VolatileActionReactionWindow {
  readonly id: typeof VOLATILE_ACTION_REACTION_WINDOW_ID
  readonly attachAfterPhaseId: 'posture_commit'
  readonly actorIds: readonly string[]
}

export interface VolatileActionPhasePipelineInput {
  readonly encounterId: string
  readonly variantId: VolatileActionPhaseVariantId
  readonly mode: VolatileActionPhaseMode
  readonly stakes: VolatileActionStakes
  readonly actionPriority: VolatileActionPriorityRequest & {
    readonly encounterId?: string
  }
  readonly interrupt?: VolatileActionInterruptInput
  readonly hold?: VolatileActionHoldInput
}

export interface VolatileActionPhasePipelineResult {
  readonly encounterId: string
  readonly variantId: VolatileActionPhaseVariantId
  readonly mode: VolatileActionPhaseMode
  readonly actorIds: readonly string[]
  readonly phases: readonly VolatileActionPhaseRecord[]
  readonly reactionWindow: VolatileActionReactionWindow
  readonly interrupt: VolatileActionInterruptInput
  readonly hold: VolatileActionHoldInput
  readonly bypassed: boolean
  readonly actionPriority: VolatileActionPriorityResult
}

function isIntegerIndexId(value: string): boolean {
  const numeric = Number(value)
  return (
    Number.isInteger(numeric) &&
    numeric >= 0 &&
    numeric < 4_294_967_295 &&
    String(numeric) === value
  )
}

export function isUnsafeVolatileActionHoldId(value: string): boolean {
  return isIntegerIndexId(value) || PROTOTYPE_SENSITIVE_IDS.has(value)
}

function assertId(value: string, field: string) {
  if (typeof value !== 'string' || value.length === 0 || value !== value.trim()) {
    throw new Error(`${field} must be a non-empty trimmed string.`)
  }
}

function assertHoldInstanceId(value: unknown): string {
  if (value === undefined || value === null) {
    throw new Error('hold instanceId is required.')
  }
  if (typeof value !== 'string') {
    throw new Error('hold instanceId must be a non-empty trimmed string.')
  }
  assertId(value, 'hold instanceId')
  if (isUnsafeVolatileActionHoldId(value)) {
    throw new Error('hold instanceId is unsafe.')
  }
  return value
}

function assertStakes(value: string): asserts value is VolatileActionStakes {
  if (value === 'none' || value === 'present') return
  throw new Error('stakes must be none or present.')
}

function assertVariantId(value: unknown): asserts value is VolatileActionPhaseVariantId {
  switch (value) {
    case VOLATILE_ACTION_PHASE_VARIANT_ID:
    case VOLATILE_ACTION_PROCEDURE_VARIANT_ID:
      return
    default:
      throw new Error('variantId must be volatile_action_v1 or volatile_action_procedure_v1.')
  }
}

function assertMode(value: unknown): asserts value is VolatileActionPhaseMode {
  switch (value) {
    case 'task':
    case 'test':
    case 'advanced_action':
      return
    default:
      throw new Error('mode must be task, test, or advanced_action.')
  }
}

function eligibleActorIds(sequence: VolatileActionPrioritySequence): readonly string[] {
  switch (sequence.kind) {
    case 'per_actor':
      return [...sequence.actorIds]
    case 'side_phase':
      return sequence.sideGroups.flatMap((group) => group.actorIds)
    default: {
      const exhaustive: never = sequence
      throw new Error(`unsupported sequence kind: ${String(exhaustive)}`)
    }
  }
}

function parseInterrupt(value: unknown): VolatileActionInterruptInput {
  if (value === undefined) {
    return { kind: 'none' }
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('interrupt is required.')
  }

  const candidate = value as { readonly kind?: unknown; readonly windowId?: unknown }
  switch (candidate.kind) {
    case 'none':
      return { kind: 'none' }
    case 'prepend':
    case 'truncate':
    case 'redirect': {
      if (candidate.windowId === undefined || candidate.windowId === null) {
        throw new Error('interrupt windowId is required.')
      }
      if (typeof candidate.windowId !== 'string') {
        throw new Error('interrupt windowId must be a non-empty trimmed string.')
      }
      assertId(candidate.windowId, 'interrupt windowId')
      if (candidate.windowId !== VOLATILE_ACTION_REACTION_WINDOW_ID) {
        throw new Error('interrupt windowId must be after_posture_commit.')
      }
      return { kind: candidate.kind, windowId: VOLATILE_ACTION_REACTION_WINDOW_ID }
    }
    default:
      throw new Error('interrupt kind must be none, prepend, truncate, or redirect.')
  }
}

export function parseVolatileActionHoldInput(value: unknown): VolatileActionHoldInput {
  if (value === undefined) {
    return { kind: 'none' }
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('hold is required.')
  }

  const candidate = value as {
    readonly kind?: unknown
    readonly instanceId?: unknown
    readonly reason?: unknown
  }
  switch (candidate.kind) {
    case 'none':
      return { kind: 'none' }
    case 'hold_aim':
      return { kind: 'hold_aim', instanceId: assertHoldInstanceId(candidate.instanceId) }
    case 'delayed_emission':
      return {
        kind: 'delayed_emission',
        instanceId: assertHoldInstanceId(candidate.instanceId),
      }
    case 'abort': {
      const instanceId = assertHoldInstanceId(candidate.instanceId)
      if (candidate.reason === undefined || candidate.reason === null) {
        throw new Error('hold reason is required.')
      }
      if (typeof candidate.reason !== 'string') {
        throw new Error('hold reason must be a non-empty trimmed string.')
      }
      assertId(candidate.reason, 'hold reason')
      return { kind: 'abort', instanceId, reason: candidate.reason }
    }
    default:
      throw new Error('hold kind must be none, hold_aim, abort, or delayed_emission.')
  }
}

function interruptStatus(
  interrupt: VolatileActionInterruptInput
): Exclude<VolatileActionPhaseStatus, 'skipped' | 'held' | 'aborted' | 'delayed'> {
  switch (interrupt.kind) {
    case 'none':
      return 'ran'
    case 'prepend':
      return 'prepended'
    case 'truncate':
      return 'truncated'
    case 'redirect':
      return 'redirected'
    default: {
      const exhaustive: never = interrupt.kind
      throw new Error(`unsupported interrupt kind: ${String(exhaustive)}`)
    }
  }
}

function holdStatus(
  id: VolatileActionV1PhaseId,
  hold: VolatileActionHoldInput
): VolatileActionPhaseStatus {
  switch (hold.kind) {
    case 'none':
      return 'ran'
    case 'hold_aim':
      return HOLD_AIM_OR_ABORT_PHASE_IDS.has(id) ? 'held' : 'ran'
    case 'abort':
      return HOLD_AIM_OR_ABORT_PHASE_IDS.has(id) ? 'aborted' : 'ran'
    case 'delayed_emission':
      return id === 'effect_emission' ? 'delayed' : 'ran'
    default: {
      const exhaustive: never = hold.kind
      throw new Error(`unsupported hold kind: ${String(exhaustive)}`)
    }
  }
}

function resolvePhaseStatus(
  id: VolatileActionV1PhaseId,
  bypassed: boolean,
  interrupt: VolatileActionInterruptInput,
  hold: VolatileActionHoldInput
): VolatileActionPhaseStatus {
  if (bypassed && NO_STAKES_SKIPPED_PHASE_IDS.has(id)) {
    return 'skipped'
  }
  if (id === 'posture_commit') {
    return 'ran'
  }
  const rewritten = interruptStatus(interrupt)
  if (rewritten !== 'ran') {
    return rewritten
  }
  return holdStatus(id, hold)
}

/** Pure SPE-62 phase spine. It chooses no action and applies no encounter state. */
export function resolveVolatileActionPhasePipeline(
  input: VolatileActionPhasePipelineInput
): VolatileActionPhasePipelineResult {
  if (!input || typeof input !== 'object') {
    throw new Error('phase pipeline input is required.')
  }

  assertId(input.encounterId, 'encounterId')
  assertVariantId(input.variantId)
  assertMode(input.mode)
  assertStakes(input.stakes)

  if (!input.actionPriority || typeof input.actionPriority !== 'object') {
    throw new Error('actionPriority is required.')
  }

  if (
    input.actionPriority.encounterId !== undefined &&
    input.actionPriority.encounterId !== input.encounterId
  ) {
    throw new Error('actionPriority encounterId must match the pipeline encounterId.')
  }

  const interrupt = parseInterrupt(input.interrupt)
  const hold = parseVolatileActionHoldInput(input.hold)
  const actionPriority = resolveVolatileActionPriority({
    ...input.actionPriority,
    encounterId: input.encounterId,
  })
  const actorIds = eligibleActorIds(actionPriority.sequence)
  const bypassed = input.stakes === 'none'
  const phases = VOLATILE_ACTION_V1_PHASE_IDS.map((id) => ({
    id,
    status: resolvePhaseStatus(id, bypassed, interrupt, hold),
  }))

  return {
    encounterId: input.encounterId,
    variantId: input.variantId,
    mode: input.mode,
    actorIds,
    phases,
    reactionWindow: {
      id: VOLATILE_ACTION_REACTION_WINDOW_ID,
      attachAfterPhaseId: 'posture_commit',
      actorIds,
    },
    interrupt,
    hold,
    bypassed,
    actionPriority,
  }
}
