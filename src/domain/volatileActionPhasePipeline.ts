import type { AgentReadinessBand } from './agent/models'
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

export const VOLATILE_ACTION_HAZARD_DECLARATION_PHASE_ID = 'posture_commit' as const

export const VOLATILE_ACTION_HAZARD_REDUCTION_STEP_IDS = ['expose', 'mitigate', 'apply'] as const

export type VolatileActionHazardReductionStepId =
  (typeof VOLATILE_ACTION_HAZARD_REDUCTION_STEP_IDS)[number]

export const VOLATILE_ACTION_HAZARD_REDUCTION_PHASE_BY_STEP = {
  expose: 'environmental_read',
  mitigate: 'clash_window',
  apply: 'effect_emission',
} as const satisfies Record<VolatileActionHazardReductionStepId, VolatileActionV1PhaseId>

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

export type VolatileActionHazardNone = {
  readonly kind: 'none'
}

export type VolatileActionHazardImpending = {
  readonly kind: 'impending'
  readonly hazardId: string
  readonly declaredAtPhaseId: typeof VOLATILE_ACTION_HAZARD_DECLARATION_PHASE_ID
}

export type VolatileActionHazardInput = VolatileActionHazardNone | VolatileActionHazardImpending

export const VOLATILE_ACTION_READINESS_BANDS = [
  'steady',
  'strained',
  'critical',
  'unavailable',
] as const satisfies readonly AgentReadinessBand[]

export const VOLATILE_ACTION_SPATIAL_VISIBILITY_STATES = ['clear', 'obstructed', 'exposed'] as const

export type VolatileActionSpatialVisibilityState =
  (typeof VOLATILE_ACTION_SPATIAL_VISIBILITY_STATES)[number]

export const VOLATILE_ACTION_WIRING_CONDITION_KINDS = [
  'flag',
  'progress_clock',
  'predicate',
] as const

export type VolatileActionWiringConditionKind =
  (typeof VOLATILE_ACTION_WIRING_CONDITION_KINDS)[number]

export type VolatileActionWiringNone = {
  readonly kind: 'none'
}

export interface VolatileActionReadinessWiringRecord {
  readonly actorId: string
  readonly band: AgentReadinessBand
}

export interface VolatileActionBudgetWiringRecord {
  readonly remaining: number
  readonly freeTrigger: boolean
}

export interface VolatileActionSpatialWiringRecord {
  readonly flags: readonly string[]
  readonly visibilityState?: VolatileActionSpatialVisibilityState
}

export interface VolatileActionConditionWiringRecord {
  readonly kind: VolatileActionWiringConditionKind
  readonly id: string
  readonly passes: boolean
}

export type VolatileActionWiringPresent = {
  readonly kind: 'present'
  readonly readiness: VolatileActionReadinessWiringRecord
  readonly actionBudget: VolatileActionBudgetWiringRecord
  readonly spatial: VolatileActionSpatialWiringRecord
  readonly condition: VolatileActionConditionWiringRecord
}

export type VolatileActionWiringInput = VolatileActionWiringNone | VolatileActionWiringPresent

export type VolatileActionHazardDeclarationStatus = 'none' | 'declared' | 'bypassed'

export interface VolatileActionHazardDeclaration {
  readonly declaredAtPhaseId: typeof VOLATILE_ACTION_HAZARD_DECLARATION_PHASE_ID
  readonly status: VolatileActionHazardDeclarationStatus
}

export interface VolatileActionHazardReductionStep {
  readonly id: VolatileActionHazardReductionStepId
  readonly phaseId: VolatileActionV1PhaseId
  readonly status: VolatileActionPhaseStatus
}

export type VolatileActionPhaseExplanationReason =
  | 'ran'
  | 'ran_posture_commit'
  | 'skipped_stakes_none'
  | 'skipped_readiness_unavailable'
  | 'skipped_action_budget_exhausted'
  | 'skipped_spatial_obstructed'
  | 'skipped_condition_unmet'
  | 'interrupt_prepend'
  | 'interrupt_truncate'
  | 'interrupt_redirect'
  | 'hold_aim'
  | 'hold_abort'
  | 'hold_delayed_emission'

export type VolatileActionBypassExplanationReason = 'stakes_none' | 'stakes_present'

export type VolatileActionInterruptExplanationReason =
  'interrupt_none' | 'interrupt_prepend' | 'interrupt_truncate' | 'interrupt_redirect'

export type VolatileActionHoldExplanationReason =
  'hold_none' | 'hold_aim' | 'hold_abort' | 'hold_delayed_emission'

export type VolatileActionHazardDeclarationExplanationReason =
  'hazard_none' | 'hazard_declared_at_posture_commit' | 'hazard_bypassed_stakes_none'

export type VolatileActionHazardReductionExplanationReason =
  VolatileActionPhaseExplanationReason | 'ladder_skipped_stakes_none'

export type VolatileActionWiringExplanationReason = 'wiring_none' | 'wiring_present'

export type VolatileActionReadinessWiringExplanationReason =
  'readiness_steady' | 'readiness_strained' | 'readiness_critical' | 'readiness_unavailable'

export type VolatileActionBudgetWiringExplanationReason =
  'budget_available' | 'budget_free_trigger' | 'budget_exhausted'

export type VolatileActionSpatialWiringExplanationReason = 'spatial_clear' | 'spatial_obstructed'

export type VolatileActionConditionWiringExplanationReason = 'condition_passed' | 'condition_unmet'

export interface VolatileActionReadinessWiringExplanation {
  readonly actorId: string
  readonly band: AgentReadinessBand
  readonly reason: VolatileActionReadinessWiringExplanationReason
}

export interface VolatileActionBudgetWiringExplanation {
  readonly remaining: number
  readonly freeTrigger: boolean
  readonly constrained: boolean
  readonly reason: VolatileActionBudgetWiringExplanationReason
}

export interface VolatileActionSpatialWiringExplanation {
  readonly flags: readonly string[]
  readonly visibilityState?: VolatileActionSpatialVisibilityState
  readonly reason: VolatileActionSpatialWiringExplanationReason
}

export interface VolatileActionConditionWiringExplanation {
  readonly kind: VolatileActionWiringConditionKind
  readonly id: string
  readonly passes: boolean
  readonly reason: VolatileActionConditionWiringExplanationReason
}

export type VolatileActionWiringExplanation =
  | {
      readonly kind: 'none'
      readonly reason: 'wiring_none'
    }
  | {
      readonly kind: 'present'
      readonly reason: 'wiring_present'
      readonly readiness: VolatileActionReadinessWiringExplanation
      readonly actionBudget: VolatileActionBudgetWiringExplanation
      readonly spatial: VolatileActionSpatialWiringExplanation
      readonly condition: VolatileActionConditionWiringExplanation
    }

export interface VolatileActionPhaseExplanation {
  readonly id: VolatileActionV1PhaseId
  readonly status: VolatileActionPhaseStatus
  readonly reason: VolatileActionPhaseExplanationReason
}

export interface VolatileActionBypassExplanation {
  readonly bypassed: boolean
  readonly reason: VolatileActionBypassExplanationReason
}

export interface VolatileActionInterruptExplanation {
  readonly kind: VolatileActionInterruptInput['kind']
  readonly reason: VolatileActionInterruptExplanationReason
}

export interface VolatileActionHoldExplanation {
  readonly kind: VolatileActionHoldInput['kind']
  readonly reason: VolatileActionHoldExplanationReason
}

export interface VolatileActionHazardDeclarationExplanation {
  readonly status: VolatileActionHazardDeclarationStatus
  readonly reason: VolatileActionHazardDeclarationExplanationReason
}

export interface VolatileActionHazardReductionExplanation {
  readonly id: VolatileActionHazardReductionStepId
  readonly phaseId: VolatileActionV1PhaseId
  readonly status: VolatileActionPhaseStatus
  readonly reason: VolatileActionHazardReductionExplanationReason
}

/**
 * Always-emitted inspectable record derived from already-resolved pipeline fields.
 * No authored explanation input; callers read this instead of inferring from scores.
 */
export interface VolatileActionPhasePipelineExplanation {
  readonly phases: readonly VolatileActionPhaseExplanation[]
  readonly bypass: VolatileActionBypassExplanation
  readonly interrupt: VolatileActionInterruptExplanation
  readonly hold: VolatileActionHoldExplanation
  readonly hazardDeclaration: VolatileActionHazardDeclarationExplanation
  readonly consequenceReduction: readonly VolatileActionHazardReductionExplanation[]
  readonly wiring: VolatileActionWiringExplanation
}

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
  readonly hazard?: VolatileActionHazardInput
  readonly wiring?: VolatileActionWiringInput
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
  readonly hazard: VolatileActionHazardInput
  readonly hazardDeclaration: VolatileActionHazardDeclaration
  readonly consequenceReduction: readonly VolatileActionHazardReductionStep[]
  readonly wiring: VolatileActionWiringInput
  readonly bypassed: boolean
  readonly explanation: VolatileActionPhasePipelineExplanation
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

function assertHazardId(value: unknown): string {
  if (value === undefined || value === null) {
    throw new Error('hazard hazardId is required.')
  }
  if (typeof value !== 'string') {
    throw new Error('hazard hazardId must be a non-empty trimmed string.')
  }
  assertId(value, 'hazard hazardId')
  if (isUnsafeVolatileActionHoldId(value)) {
    throw new Error('hazard hazardId is unsafe.')
  }
  return value
}

function parseHazard(value: unknown): VolatileActionHazardInput {
  if (value === undefined) {
    return { kind: 'none' }
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('hazard is required.')
  }

  const candidate = value as {
    readonly kind?: unknown
    readonly hazardId?: unknown
    readonly declaredAtPhaseId?: unknown
  }
  switch (candidate.kind) {
    case 'none':
      return { kind: 'none' }
    case 'impending': {
      const hazardId = assertHazardId(candidate.hazardId)
      if (candidate.declaredAtPhaseId === undefined || candidate.declaredAtPhaseId === null) {
        throw new Error('hazard declaredAtPhaseId is required.')
      }
      if (typeof candidate.declaredAtPhaseId !== 'string') {
        throw new Error('hazard declaredAtPhaseId must be a non-empty trimmed string.')
      }
      assertId(candidate.declaredAtPhaseId, 'hazard declaredAtPhaseId')
      if (candidate.declaredAtPhaseId !== VOLATILE_ACTION_HAZARD_DECLARATION_PHASE_ID) {
        throw new Error('hazard declaredAtPhaseId must be posture_commit.')
      }
      return {
        kind: 'impending',
        hazardId,
        declaredAtPhaseId: VOLATILE_ACTION_HAZARD_DECLARATION_PHASE_ID,
      }
    }
    default:
      throw new Error('hazard kind must be none or impending.')
  }
}

function assertWiringId(value: unknown, field: string): string {
  if (value === undefined || value === null) {
    throw new Error(`${field} is required.`)
  }
  if (typeof value !== 'string') {
    throw new Error(`${field} must be a non-empty trimmed string.`)
  }
  assertId(value, field)
  if (isUnsafeVolatileActionHoldId(value)) {
    throw new Error(`${field} is unsafe.`)
  }
  return value
}

function assertReadinessBand(value: unknown): AgentReadinessBand {
  if (value === undefined || value === null) {
    throw new Error('wiring readiness band is required.')
  }
  if (typeof value !== 'string') {
    throw new Error('wiring readiness band must be a non-empty trimmed string.')
  }
  assertId(value, 'wiring readiness band')
  switch (value) {
    case 'steady':
    case 'strained':
    case 'critical':
    case 'unavailable':
      return value
    default:
      throw new Error('wiring readiness band must be steady, strained, critical, or unavailable.')
  }
}

function parseReadinessWiring(value: unknown): VolatileActionReadinessWiringRecord {
  if (value === undefined || value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('wiring readiness is required.')
  }
  const candidate = value as { readonly actorId?: unknown; readonly band?: unknown }
  return {
    actorId: assertWiringId(candidate.actorId, 'wiring readiness actorId'),
    band: assertReadinessBand(candidate.band),
  }
}

function parseBudgetWiring(value: unknown): VolatileActionBudgetWiringRecord {
  if (value === undefined || value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('wiring actionBudget is required.')
  }
  const candidate = value as { readonly remaining?: unknown; readonly freeTrigger?: unknown }
  if (candidate.remaining === undefined || candidate.remaining === null) {
    throw new Error('wiring actionBudget remaining is required.')
  }
  if (
    typeof candidate.remaining !== 'number' ||
    !Number.isSafeInteger(candidate.remaining) ||
    candidate.remaining < 0
  ) {
    throw new Error('wiring actionBudget remaining must be a non-negative safe integer.')
  }
  if (candidate.freeTrigger === undefined || candidate.freeTrigger === null) {
    throw new Error('wiring actionBudget freeTrigger is required.')
  }
  if (typeof candidate.freeTrigger !== 'boolean') {
    throw new Error('wiring actionBudget freeTrigger must be a boolean.')
  }
  return {
    remaining: candidate.remaining,
    freeTrigger: candidate.freeTrigger,
  }
}

function parseSpatialVisibility(value: unknown): VolatileActionSpatialVisibilityState | undefined {
  if (value === undefined) {
    return undefined
  }
  if (value === null) {
    throw new Error('wiring spatial visibilityState is required.')
  }
  if (typeof value !== 'string') {
    throw new Error('wiring spatial visibilityState must be a non-empty trimmed string.')
  }
  assertId(value, 'wiring spatial visibilityState')
  switch (value) {
    case 'clear':
    case 'obstructed':
    case 'exposed':
      return value
    default:
      throw new Error('wiring spatial visibilityState must be clear, obstructed, or exposed.')
  }
}

function parseSpatialWiring(value: unknown): VolatileActionSpatialWiringRecord {
  if (value === undefined || value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('wiring spatial is required.')
  }
  const candidate = value as { readonly flags?: unknown; readonly visibilityState?: unknown }
  if (candidate.flags === undefined || candidate.flags === null) {
    throw new Error('wiring spatial flags is required.')
  }
  if (!Array.isArray(candidate.flags)) {
    throw new Error('wiring spatial flags must be an array.')
  }
  const flags = candidate.flags.map((flag, index) =>
    assertWiringId(flag, `wiring spatial flags[${index}]`)
  )
  const visibilityState = parseSpatialVisibility(candidate.visibilityState)
  return visibilityState === undefined ? { flags } : { flags, visibilityState }
}

function parseConditionKind(value: unknown): VolatileActionWiringConditionKind {
  if (value === undefined || value === null) {
    throw new Error('wiring condition kind is required.')
  }
  if (typeof value !== 'string') {
    throw new Error('wiring condition kind must be a non-empty trimmed string.')
  }
  assertId(value, 'wiring condition kind')
  switch (value) {
    case 'flag':
    case 'progress_clock':
    case 'predicate':
      return value
    default:
      throw new Error('wiring condition kind must be flag, progress_clock, or predicate.')
  }
}

function parseConditionWiring(value: unknown): VolatileActionConditionWiringRecord {
  if (value === undefined || value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('wiring condition is required.')
  }
  const candidate = value as {
    readonly kind?: unknown
    readonly id?: unknown
    readonly passes?: unknown
  }
  if (candidate.passes === undefined || candidate.passes === null) {
    throw new Error('wiring condition passes is required.')
  }
  if (typeof candidate.passes !== 'boolean') {
    throw new Error('wiring condition passes must be a boolean.')
  }
  return {
    kind: parseConditionKind(candidate.kind),
    id: assertWiringId(candidate.id, 'wiring condition id'),
    passes: candidate.passes,
  }
}

function parseWiring(value: unknown): VolatileActionWiringInput {
  if (value === undefined) {
    return { kind: 'none' }
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('wiring is required.')
  }

  const candidate = value as {
    readonly kind?: unknown
    readonly readiness?: unknown
    readonly actionBudget?: unknown
    readonly spatial?: unknown
    readonly condition?: unknown
  }
  switch (candidate.kind) {
    case 'none':
      return { kind: 'none' }
    case 'present':
      return {
        kind: 'present',
        readiness: parseReadinessWiring(candidate.readiness),
        actionBudget: parseBudgetWiring(candidate.actionBudget),
        spatial: parseSpatialWiring(candidate.spatial),
        condition: parseConditionWiring(candidate.condition),
      }
    default:
      throw new Error('wiring kind must be none or present.')
  }
}

function isBudgetExhausted(budget: VolatileActionBudgetWiringRecord): boolean {
  return budget.remaining === 0 && !budget.freeTrigger
}

function isSpatialObstructed(spatial: VolatileActionSpatialWiringRecord): boolean {
  return spatial.visibilityState === 'obstructed'
}

function wiringSkipReason(
  id: VolatileActionV1PhaseId,
  wiring: VolatileActionWiringInput
): Extract<
  VolatileActionPhaseExplanationReason,
  | 'skipped_readiness_unavailable'
  | 'skipped_action_budget_exhausted'
  | 'skipped_spatial_obstructed'
  | 'skipped_condition_unmet'
> | null {
  if (wiring.kind === 'none') {
    return null
  }
  switch (id) {
    case 'posture_commit':
    case 'cleanup':
      return null
    case 'environmental_read':
      return isSpatialObstructed(wiring.spatial) ? 'skipped_spatial_obstructed' : null
    case 'clash_window':
      if (wiring.readiness.band === 'unavailable') {
        return 'skipped_readiness_unavailable'
      }
      return isBudgetExhausted(wiring.actionBudget) ? 'skipped_action_budget_exhausted' : null
    case 'effect_emission':
      return wiring.condition.passes ? null : 'skipped_condition_unmet'
    default: {
      const exhaustive: never = id
      throw new Error(`unsupported phase id: ${String(exhaustive)}`)
    }
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
  hold: VolatileActionHoldInput,
  wiring: VolatileActionWiringInput
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
  const held = holdStatus(id, hold)
  if (held !== 'ran') {
    return held
  }
  return wiringSkipReason(id, wiring) ? 'skipped' : 'ran'
}

function resolveHazardDeclaration(
  hazard: VolatileActionHazardInput,
  bypassed: boolean
): VolatileActionHazardDeclaration {
  switch (hazard.kind) {
    case 'none':
      return {
        declaredAtPhaseId: VOLATILE_ACTION_HAZARD_DECLARATION_PHASE_ID,
        status: 'none',
      }
    case 'impending':
      return {
        declaredAtPhaseId: VOLATILE_ACTION_HAZARD_DECLARATION_PHASE_ID,
        status: bypassed ? 'bypassed' : 'declared',
      }
    default: {
      const exhaustive: never = hazard.kind
      throw new Error(`unsupported hazard kind: ${String(exhaustive)}`)
    }
  }
}

function resolveConsequenceReduction(
  hazard: VolatileActionHazardInput,
  phases: readonly VolatileActionPhaseRecord[],
  bypassed: boolean
): readonly VolatileActionHazardReductionStep[] {
  switch (hazard.kind) {
    case 'none':
      return []
    case 'impending':
      return VOLATILE_ACTION_HAZARD_REDUCTION_STEP_IDS.map((id) => {
        const phaseId = VOLATILE_ACTION_HAZARD_REDUCTION_PHASE_BY_STEP[id]
        const phase = phases.find((record) => record.id === phaseId)
        if (!phase) {
          throw new Error(`missing phase ${phaseId}.`)
        }
        return {
          id,
          phaseId,
          status: bypassed ? 'skipped' : phase.status,
        }
      })
    default: {
      const exhaustive: never = hazard.kind
      throw new Error(`unsupported hazard kind: ${String(exhaustive)}`)
    }
  }
}

function explainPhaseStatus(
  id: VolatileActionV1PhaseId,
  status: VolatileActionPhaseStatus,
  bypassed: boolean,
  wiring: VolatileActionWiringInput
): VolatileActionPhaseExplanationReason {
  switch (status) {
    case 'ran':
      return id === 'posture_commit' ? 'ran_posture_commit' : 'ran'
    case 'skipped': {
      if (bypassed && NO_STAKES_SKIPPED_PHASE_IDS.has(id)) {
        return 'skipped_stakes_none'
      }
      const wiringReason = wiringSkipReason(id, wiring)
      if (wiringReason) {
        return wiringReason
      }
      throw new Error(`unsupported skipped phase: ${id}`)
    }
    case 'prepended':
      return 'interrupt_prepend'
    case 'truncated':
      return 'interrupt_truncate'
    case 'redirected':
      return 'interrupt_redirect'
    case 'held':
      return 'hold_aim'
    case 'aborted':
      return 'hold_abort'
    case 'delayed':
      return 'hold_delayed_emission'
    default: {
      const exhaustive: never = status
      throw new Error(`unsupported phase status: ${String(exhaustive)}`)
    }
  }
}

function explainInterrupt(
  interrupt: VolatileActionInterruptInput
): VolatileActionInterruptExplanation {
  switch (interrupt.kind) {
    case 'none':
      return { kind: 'none', reason: 'interrupt_none' }
    case 'prepend':
      return { kind: 'prepend', reason: 'interrupt_prepend' }
    case 'truncate':
      return { kind: 'truncate', reason: 'interrupt_truncate' }
    case 'redirect':
      return { kind: 'redirect', reason: 'interrupt_redirect' }
    default: {
      const exhaustive: never = interrupt.kind
      throw new Error(`unsupported interrupt kind: ${String(exhaustive)}`)
    }
  }
}

function explainHold(hold: VolatileActionHoldInput): VolatileActionHoldExplanation {
  switch (hold.kind) {
    case 'none':
      return { kind: 'none', reason: 'hold_none' }
    case 'hold_aim':
      return { kind: 'hold_aim', reason: 'hold_aim' }
    case 'abort':
      return { kind: 'abort', reason: 'hold_abort' }
    case 'delayed_emission':
      return { kind: 'delayed_emission', reason: 'hold_delayed_emission' }
    default: {
      const exhaustive: never = hold.kind
      throw new Error(`unsupported hold kind: ${String(exhaustive)}`)
    }
  }
}

function explainHazardDeclaration(
  hazardDeclaration: VolatileActionHazardDeclaration
): VolatileActionHazardDeclarationExplanation {
  switch (hazardDeclaration.status) {
    case 'none':
      return { status: 'none', reason: 'hazard_none' }
    case 'declared':
      return { status: 'declared', reason: 'hazard_declared_at_posture_commit' }
    case 'bypassed':
      return { status: 'bypassed', reason: 'hazard_bypassed_stakes_none' }
    default: {
      const exhaustive: never = hazardDeclaration.status
      throw new Error(`unsupported hazard declaration status: ${String(exhaustive)}`)
    }
  }
}

function explainConsequenceReduction(
  hazardDeclaration: VolatileActionHazardDeclaration,
  consequenceReduction: readonly VolatileActionHazardReductionStep[],
  bypassed: boolean,
  wiring: VolatileActionWiringInput
): readonly VolatileActionHazardReductionExplanation[] {
  return consequenceReduction.map((step) => ({
    id: step.id,
    phaseId: step.phaseId,
    status: step.status,
    reason:
      hazardDeclaration.status === 'bypassed'
        ? 'ladder_skipped_stakes_none'
        : explainPhaseStatus(step.phaseId, step.status, bypassed, wiring),
  }))
}

function explainReadinessBand(
  band: AgentReadinessBand
): VolatileActionReadinessWiringExplanationReason {
  switch (band) {
    case 'steady':
      return 'readiness_steady'
    case 'strained':
      return 'readiness_strained'
    case 'critical':
      return 'readiness_critical'
    case 'unavailable':
      return 'readiness_unavailable'
    default: {
      const exhaustive: never = band
      throw new Error(`unsupported readiness band: ${String(exhaustive)}`)
    }
  }
}

function explainBudget(
  budget: VolatileActionBudgetWiringRecord
): VolatileActionBudgetWiringExplanation {
  const constrained = isBudgetExhausted(budget)
  const reason: VolatileActionBudgetWiringExplanationReason = budget.freeTrigger
    ? 'budget_free_trigger'
    : constrained
      ? 'budget_exhausted'
      : 'budget_available'
  return {
    remaining: budget.remaining,
    freeTrigger: budget.freeTrigger,
    constrained,
    reason,
  }
}

function explainSpatial(
  spatial: VolatileActionSpatialWiringRecord
): VolatileActionSpatialWiringExplanation {
  return {
    flags: spatial.flags,
    ...(spatial.visibilityState !== undefined ? { visibilityState: spatial.visibilityState } : {}),
    reason: isSpatialObstructed(spatial) ? 'spatial_obstructed' : 'spatial_clear',
  }
}

function explainWiring(wiring: VolatileActionWiringInput): VolatileActionWiringExplanation {
  switch (wiring.kind) {
    case 'none':
      return { kind: 'none', reason: 'wiring_none' }
    case 'present':
      return {
        kind: 'present',
        reason: 'wiring_present',
        readiness: {
          actorId: wiring.readiness.actorId,
          band: wiring.readiness.band,
          reason: explainReadinessBand(wiring.readiness.band),
        },
        actionBudget: explainBudget(wiring.actionBudget),
        spatial: explainSpatial(wiring.spatial),
        condition: {
          kind: wiring.condition.kind,
          id: wiring.condition.id,
          passes: wiring.condition.passes,
          reason: wiring.condition.passes ? 'condition_passed' : 'condition_unmet',
        },
      }
    default: {
      const exhaustive: never = wiring
      throw new Error(`unsupported wiring kind: ${String(exhaustive)}`)
    }
  }
}

function explainVolatileActionPhasePipeline(input: {
  readonly phases: readonly VolatileActionPhaseRecord[]
  readonly bypassed: boolean
  readonly interrupt: VolatileActionInterruptInput
  readonly hold: VolatileActionHoldInput
  readonly hazardDeclaration: VolatileActionHazardDeclaration
  readonly consequenceReduction: readonly VolatileActionHazardReductionStep[]
  readonly wiring: VolatileActionWiringInput
}): VolatileActionPhasePipelineExplanation {
  return {
    phases: input.phases.map((phase) => ({
      id: phase.id,
      status: phase.status,
      reason: explainPhaseStatus(phase.id, phase.status, input.bypassed, input.wiring),
    })),
    bypass: {
      bypassed: input.bypassed,
      reason: input.bypassed ? 'stakes_none' : 'stakes_present',
    },
    interrupt: explainInterrupt(input.interrupt),
    hold: explainHold(input.hold),
    hazardDeclaration: explainHazardDeclaration(input.hazardDeclaration),
    consequenceReduction: explainConsequenceReduction(
      input.hazardDeclaration,
      input.consequenceReduction,
      input.bypassed,
      input.wiring
    ),
    wiring: explainWiring(input.wiring),
  }
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
  const hazard = parseHazard(input.hazard)
  const wiring = parseWiring(input.wiring)
  const actionPriority = resolveVolatileActionPriority({
    ...input.actionPriority,
    encounterId: input.encounterId,
  })
  const actorIds = eligibleActorIds(actionPriority.sequence)
  const bypassed = input.stakes === 'none'
  const phases = VOLATILE_ACTION_V1_PHASE_IDS.map((id) => ({
    id,
    status: resolvePhaseStatus(id, bypassed, interrupt, hold, wiring),
  }))
  const hazardDeclaration = resolveHazardDeclaration(hazard, bypassed)
  const consequenceReduction = resolveConsequenceReduction(hazard, phases, bypassed)
  const explanation = explainVolatileActionPhasePipeline({
    phases,
    bypassed,
    interrupt,
    hold,
    hazardDeclaration,
    consequenceReduction,
    wiring,
  })
  const reactionWindowConstrained =
    wiring.kind === 'present' && isBudgetExhausted(wiring.actionBudget)

  return {
    encounterId: input.encounterId,
    variantId: input.variantId,
    mode: input.mode,
    actorIds,
    phases,
    reactionWindow: {
      id: VOLATILE_ACTION_REACTION_WINDOW_ID,
      attachAfterPhaseId: 'posture_commit',
      actorIds: reactionWindowConstrained ? [] : actorIds,
    },
    interrupt,
    hold,
    hazard,
    hazardDeclaration,
    consequenceReduction,
    wiring,
    bypassed,
    explanation,
    actionPriority,
  }
}
