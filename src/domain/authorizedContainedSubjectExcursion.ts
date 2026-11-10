/**
 * SPE-3500 — authorized contained-subject excursion and verified recontainment.
 *
 * Owns temporary leave/return/recontainment coordination stages and invariants only.
 * Consumes SPE-3189 outbound screening, SPE-2995 procedure-to-action readiness, optional
 * SPE-1892 person-custody identity refs, and caller-supplied canonical campaign time for
 * deadlines. Does not teleport subjects, invent custody/location truth, manufacture escape,
 * treat physical return as verified recontainment, or create a parallel procedure /
 * pathfinding / custody / incident engine.
 */

import type { GameState } from './models'
import { ensureNormalizedGameState } from './teamSimulation'
import {
  resolveOutboundScreening,
  type OutboundScreenResult,
} from './containmentZoneOutboundScreening'
import {
  evaluateCanonicalProcedureExecutionReadiness,
  type ProcedureToActionAdapterInput,
  type ProcedureExecutionReadinessResult,
} from './procedureToActionAdapter'
import {
  compareCodeUnitOrder,
  freezeCoordinationRecord,
  hasOwnEnumerableKey,
  isFiniteNonNegativeWeek,
  isNonEmptyTrimmedString,
  isPlainRecord,
  sortUniqueCodes,
  withSortedAppliedKey,
} from './facilityCoordinationHydrate'

export const AUTHORIZED_EXCURSION_STAGES = [
  'requested',
  'authorized',
  'released',
  'active_excursion',
  'return_due',
  'return_in_progress',
  'recontainment_verification',
  'completed',
  'blocked',
  'aborted',
  'overdue',
  'missing',
  'retrieval_required',
  'failed_return',
  'compromised',
] as const
export type AuthorizedExcursionStage = (typeof AUTHORIZED_EXCURSION_STAGES)[number]

export const AUTHORIZED_EXCURSION_SUBJECT_KINDS = ['person', 'non_person', 'unresolved'] as const
export type AuthorizedExcursionSubjectKind = (typeof AUTHORIZED_EXCURSION_SUBJECT_KINDS)[number]

export const AUTHORIZED_EXCURSION_REASON_CODES = [
  'malformed_input',
  'unauthorized_purpose',
  'staff_unauthorized',
  'movement_capability_invalid',
  'route_inaccessible',
  'permit_missing',
  'room_config_unsafe',
  'outbound_screen_blocked',
  'procedure_not_ready',
  'custody_unresolved',
  'illegal_transition',
  'stale_operation',
  'release_not_committed',
  'return_not_committed',
  'recontainment_not_verified',
  'deadline_exceeded',
  'subject_missing',
  'aborted_before_release',
  'interrupted_after_release',
] as const
export type AuthorizedExcursionReasonCode = (typeof AUTHORIZED_EXCURSION_REASON_CODES)[number]

export type AuthorizedExcursionId = string

export type AuthorizedExcursionRecord = Readonly<{
  excursionId: AuthorizedExcursionId
  subjectRef: string
  subjectKind: AuthorizedExcursionSubjectKind
  originNodeId: string
  originZoneRef?: string
  stage: AuthorizedExcursionStage
  reasonCodes: readonly AuthorizedExcursionReasonCode[]
  /** Operation keys already applied — prevents duplicate stage effects. */
  appliedOperationKeys: readonly string[]
  /** True once an owning subsystem confirmed physical release began. */
  physicalEffectsOccurred: boolean
  purposeRef: string
  authorizationRef?: string
  controllingAuthorityRef?: string
  /** Authoritative start week once released onto excursion. */
  startWeek?: number
  /** Optional/required return deadline in canonical campaign weeks. */
  returnDeadlineWeek?: number
  /** SPE-1892 continuity refs for person subjects only; never invented for non-persons. */
  custodyStatusId?: string
  formerRoleCategory?: string
  procedureExecutionKey?: string
  pendingCorrectiveAction?: string
  /** Existing tracking/incident/response owner hint — never invents escape/death. */
  responseOwnerHint?: string
}>

export type FacilityAuthorizedContainedSubjectExcursions = Readonly<
  Record<AuthorizedExcursionId, AuthorizedExcursionRecord>
>

export type AuthorizedExcursionExplainability = Readonly<{
  excursionId: AuthorizedExcursionId
  subjectRef: string
  stage: AuthorizedExcursionStage
  reasonCodes: readonly AuthorizedExcursionReasonCode[]
  returnDeadlineWeek?: number
  pendingCorrectiveAction?: string
  physicalEffectsOccurred: boolean
  outcome:
    | 'in_progress'
    | 'completed'
    | 'blocked'
    | 'aborted'
    | 'overdue'
    | 'missing'
    | 'retrieval_required'
    | 'failed_return'
    | 'compromised'
}>

export type AuthorizedExcursionResult =
  | { ok: true; excursion: AuthorizedExcursionRecord; state?: GameState }
  | {
      ok: false
      excursion?: AuthorizedExcursionRecord
      state?: GameState
      code: AuthorizedExcursionReasonCode
      reasonCodes: readonly AuthorizedExcursionReasonCode[]
    }

const ACTIVE_STAGES: ReadonlySet<AuthorizedExcursionStage> = new Set([
  'requested',
  'authorized',
  'released',
  'active_excursion',
  'return_due',
  'return_in_progress',
  'recontainment_verification',
  'overdue',
])

const TERMINAL_STAGES: ReadonlySet<AuthorizedExcursionStage> = new Set([
  'completed',
  'blocked',
  'aborted',
  'missing',
  'retrieval_required',
  'failed_return',
  'compromised',
])

const PRE_RELEASE_STAGES: ReadonlySet<AuthorizedExcursionStage> = new Set([
  'requested',
  'authorized',
])

const ON_EXCURSION_STAGES: ReadonlySet<AuthorizedExcursionStage> = new Set([
  'released',
  'active_excursion',
  'return_due',
  'overdue',
])

const isRecord = isPlainRecord
const hasOwnEnumerableProperty = hasOwnEnumerableKey
const isNonEmptyString = isNonEmptyTrimmedString
const isFiniteWeek = isFiniteNonNegativeWeek
const compareCodeUnit = compareCodeUnitOrder

function isStage(value: unknown): value is AuthorizedExcursionStage {
  return AUTHORIZED_EXCURSION_STAGES.some((stage) => stage === value)
}

function isSubjectKind(value: unknown): value is AuthorizedExcursionSubjectKind {
  return AUTHORIZED_EXCURSION_SUBJECT_KINDS.some((kind) => kind === value)
}

function isReasonCode(value: unknown): value is AuthorizedExcursionReasonCode {
  return AUTHORIZED_EXCURSION_REASON_CODES.some((reason) => reason === value)
}

function freezeExcursion(record: AuthorizedExcursionRecord): AuthorizedExcursionRecord {
  return freezeCoordinationRecord(record)
}

function sortUniqueReasons(
  reasons: readonly AuthorizedExcursionReasonCode[]
): readonly AuthorizedExcursionReasonCode[] {
  return sortUniqueCodes(reasons)
}

function withAppliedKey(
  record: AuthorizedExcursionRecord,
  operationKey: string
): readonly string[] {
  return withSortedAppliedKey(record.appliedOperationKeys, operationKey)
}

function rejectExcursion(
  code: AuthorizedExcursionReasonCode,
  excursion: AuthorizedExcursionRecord | undefined,
  state: GameState | undefined
): AuthorizedExcursionResult {
  return {
    ok: false,
    ...(excursion !== undefined ? { excursion } : {}),
    state,
    code,
    reasonCodes: Object.freeze([code] as const),
  }
}

const OPTIONAL_STRING_KEYS = [
  'originZoneRef',
  'authorizationRef',
  'controllingAuthorityRef',
  'custodyStatusId',
  'formerRoleCategory',
  'procedureExecutionKey',
  'pendingCorrectiveAction',
  'responseOwnerHint',
] as const

type OptionalStringKey = (typeof OPTIONAL_STRING_KEYS)[number]

function readOptionalStringBag(
  value: Record<string, unknown>
): Partial<Record<OptionalStringKey, string>> | undefined {
  const out: Partial<Record<OptionalStringKey, string>> = {}
  for (const key of OPTIONAL_STRING_KEYS) {
    if (!hasOwnEnumerableProperty(value, key)) continue
    const raw = value[key]
    if (!isNonEmptyString(raw)) return undefined
    out[key] = raw.trim()
  }
  return out
}

function readOptionalWeekField(
  value: Record<string, unknown>,
  key: 'startWeek' | 'returnDeadlineWeek'
): number | undefined | null {
  if (!hasOwnEnumerableProperty(value, key)) return undefined
  if (!isFiniteWeek(value[key])) return null
  return value[key]
}

function stageEvidenceValid(
  stage: AuthorizedExcursionStage,
  physicalEffectsOccurred: boolean,
  reasonCodes: readonly AuthorizedExcursionReasonCode[],
  startWeek: number | undefined,
  returnDeadlineWeek: number | undefined
): boolean {
  const prePhysical =
    stage === 'requested' || stage === 'authorized' || stage === 'blocked' || stage === 'aborted'
  if (prePhysical && physicalEffectsOccurred) return false
  if (!prePhysical && !physicalEffectsOccurred) return false
  if (!prePhysical && startWeek === undefined) return false
  const needsReason =
    stage === 'blocked' ||
    stage === 'aborted' ||
    stage === 'overdue' ||
    stage === 'missing' ||
    stage === 'retrieval_required' ||
    stage === 'failed_return' ||
    stage === 'compromised'
  if (needsReason && reasonCodes.length === 0) return false
  if (stage === 'overdue' && returnDeadlineWeek === undefined) return false
  return true
}

function parseExcursionRecord(
  value: unknown,
  expectedId: AuthorizedExcursionId
): AuthorizedExcursionRecord | undefined {
  if (!isRecord(value)) return undefined
  if (!hasOwnEnumerableProperty(value, 'excursionId') || value.excursionId !== expectedId) {
    return undefined
  }
  if (
    !isNonEmptyString(value.excursionId) ||
    !isNonEmptyString(value.subjectRef) ||
    !isSubjectKind(value.subjectKind) ||
    !isNonEmptyString(value.originNodeId) ||
    !isStage(value.stage) ||
    typeof value.physicalEffectsOccurred !== 'boolean' ||
    !isNonEmptyString(value.purposeRef) ||
    !Array.isArray(value.reasonCodes) ||
    !Array.isArray(value.appliedOperationKeys)
  ) {
    return undefined
  }

  const reasonCodes: AuthorizedExcursionReasonCode[] = []
  for (const reason of value.reasonCodes) {
    if (!isReasonCode(reason)) return undefined
    reasonCodes.push(reason)
  }
  const appliedOperationKeys: string[] = []
  for (const key of value.appliedOperationKeys) {
    if (!isNonEmptyString(key)) return undefined
    appliedOperationKeys.push(key.trim())
  }

  const optionalStrings = readOptionalStringBag(value)
  if (optionalStrings === undefined) return undefined
  const startWeek = readOptionalWeekField(value, 'startWeek')
  if (startWeek === null) return undefined
  const returnDeadlineWeek = readOptionalWeekField(value, 'returnDeadlineWeek')
  if (returnDeadlineWeek === null) return undefined

  const { custodyStatusId, formerRoleCategory, ...otherOptional } = optionalStrings
  if (value.subjectKind === 'person') {
    if (custodyStatusId === undefined || formerRoleCategory === undefined) return undefined
  } else if (custodyStatusId !== undefined || formerRoleCategory !== undefined) {
    return undefined
  }

  if (
    !stageEvidenceValid(
      value.stage,
      value.physicalEffectsOccurred,
      reasonCodes,
      startWeek,
      returnDeadlineWeek
    )
  ) {
    return undefined
  }

  return freezeExcursion({
    excursionId: value.excursionId.trim(),
    subjectRef: value.subjectRef.trim(),
    subjectKind: value.subjectKind,
    originNodeId: value.originNodeId.trim(),
    stage: value.stage,
    reasonCodes: sortUniqueReasons(reasonCodes),
    appliedOperationKeys: Object.freeze([...appliedOperationKeys].sort(compareCodeUnit)),
    physicalEffectsOccurred: value.physicalEffectsOccurred,
    purposeRef: value.purposeRef.trim(),
    ...otherOptional,
    ...(custodyStatusId !== undefined ? { custodyStatusId } : {}),
    ...(formerRoleCategory !== undefined ? { formerRoleCategory } : {}),
    ...(startWeek !== undefined ? { startWeek } : {}),
    ...(returnDeadlineWeek !== undefined ? { returnDeadlineWeek } : {}),
  })
}

/**
 * Hydrate optional `GameState.facilityAuthorizedContainedSubjectExcursions`.
 * Legacy omit / malformed non-records / empty after sanitize → undefined.
 */
export function parseFacilityAuthorizedContainedSubjectExcursions(
  value: unknown
): FacilityAuthorizedContainedSubjectExcursions | undefined {
  if (value === undefined) return undefined
  if (!isRecord(value)) return undefined
  const out: Record<string, AuthorizedExcursionRecord> = {}
  for (const key of Object.keys(value).sort(compareCodeUnit)) {
    if (!hasOwnEnumerableProperty(value, key)) continue
    if (!isNonEmptyString(key)) continue
    const parsed = parseExcursionRecord(value[key], key)
    if (parsed === undefined) continue
    out[key] = parsed
  }
  if (Object.keys(out).length === 0) return undefined
  return Object.freeze(out)
}

function readExcursions(state: GameState): FacilityAuthorizedContainedSubjectExcursions {
  return (
    parseFacilityAuthorizedContainedSubjectExcursions(
      state.facilityAuthorizedContainedSubjectExcursions
    ) ?? Object.freeze({})
  )
}

function writeExcursions(
  state: GameState,
  excursions: FacilityAuthorizedContainedSubjectExcursions
): GameState {
  const normalized = ensureNormalizedGameState(state)
  if (Object.keys(excursions).length === 0) {
    if (normalized.facilityAuthorizedContainedSubjectExcursions === undefined) return normalized
    const rest = { ...normalized }
    delete rest.facilityAuthorizedContainedSubjectExcursions
    return rest
  }
  return {
    ...normalized,
    facilityAuthorizedContainedSubjectExcursions: Object.freeze({ ...excursions }),
  }
}

function upsertExcursion(
  state: GameState | undefined,
  excursion: AuthorizedExcursionRecord
): GameState | undefined {
  if (state === undefined) return undefined
  const excursions = { ...readExcursions(state), [excursion.excursionId]: excursion }
  return writeExcursions(state, Object.freeze(excursions))
}

function resolveCurrentExcursion(
  excursion: AuthorizedExcursionRecord,
  state: GameState | undefined
): AuthorizedExcursionRecord {
  if (state === undefined) return excursion
  return readExcursions(state)[excursion.excursionId] ?? excursion
}

export type AuthorizedExcursionCreateInput = {
  readonly excursionId: string
  readonly subjectRef: string
  readonly subjectKind: AuthorizedExcursionSubjectKind
  readonly originNodeId: string
  readonly purposeRef: string
  readonly originZoneRef?: string
  readonly controllingAuthorityRef?: string
  readonly returnDeadlineWeek?: number
  readonly custodyStatusId?: string
  readonly formerRoleCategory?: string
  readonly operationKey: string
}

/**
 * Open a requested excursion. Same operation key on an existing id is idempotent.
 */
export function createAuthorizedContainedSubjectExcursion(
  input: AuthorizedExcursionCreateInput,
  state?: GameState
): AuthorizedExcursionResult {
  if (
    !isNonEmptyString(input.excursionId) ||
    !isNonEmptyString(input.subjectRef) ||
    !isSubjectKind(input.subjectKind) ||
    !isNonEmptyString(input.originNodeId) ||
    !isNonEmptyString(input.purposeRef) ||
    !isNonEmptyString(input.operationKey)
  ) {
    return rejectExcursion('malformed_input', undefined, state)
  }

  if (input.subjectKind === 'unresolved') {
    return rejectExcursion('custody_unresolved', undefined, state)
  }

  if (input.subjectKind === 'person') {
    if (!isNonEmptyString(input.custodyStatusId) || !isNonEmptyString(input.formerRoleCategory)) {
      return rejectExcursion('custody_unresolved', undefined, state)
    }
  } else if (input.custodyStatusId !== undefined || input.formerRoleCategory !== undefined) {
    return rejectExcursion('malformed_input', undefined, state)
  }

  if (
    hasOwnEnumerableProperty(input as unknown as Record<string, unknown>, 'returnDeadlineWeek') &&
    !isFiniteWeek(input.returnDeadlineWeek)
  ) {
    return rejectExcursion('malformed_input', undefined, state)
  }

  const excursionId = input.excursionId.trim()
  const operationKey = input.operationKey.trim()
  if (state !== undefined) {
    const existing = readExcursions(state)[excursionId]
    if (existing) {
      if (existing.appliedOperationKeys.includes(operationKey)) {
        return { ok: true, excursion: existing, state }
      }
      return rejectExcursion('stale_operation', existing, state)
    }
  }

  const excursion = freezeExcursion({
    excursionId,
    subjectRef: input.subjectRef.trim(),
    subjectKind: input.subjectKind,
    originNodeId: input.originNodeId.trim(),
    purposeRef: input.purposeRef.trim(),
    stage: 'requested',
    reasonCodes: Object.freeze([]),
    appliedOperationKeys: Object.freeze([operationKey]),
    physicalEffectsOccurred: false,
    ...(isNonEmptyString(input.originZoneRef) ? { originZoneRef: input.originZoneRef.trim() } : {}),
    ...(isNonEmptyString(input.controllingAuthorityRef)
      ? { controllingAuthorityRef: input.controllingAuthorityRef.trim() }
      : {}),
    ...(isFiniteWeek(input.returnDeadlineWeek)
      ? { returnDeadlineWeek: input.returnDeadlineWeek }
      : {}),
    ...(input.subjectKind === 'person'
      ? {
          custodyStatusId: input.custodyStatusId!.trim(),
          formerRoleCategory: input.formerRoleCategory!.trim(),
        }
      : {}),
  })

  return { ok: true, excursion, state: upsertExcursion(state, excursion) }
}

export type AuthorizedExcursionPreflightGates = {
  readonly purposeAuthorized: boolean
  readonly staffAuthorized: boolean
  readonly movementCapabilityValid: boolean
  readonly routeAccessible: boolean
  readonly permitReady: boolean
  readonly roomConfigSafe: boolean
  readonly requiresOutboundScreen?: boolean
}

export type AuthorizedExcursionPreflightInput = {
  readonly excursion: AuthorizedExcursionRecord
  readonly operationKey: string
  readonly gates: AuthorizedExcursionPreflightGates
  readonly outboundScreen?: unknown
  readonly procedureAdapter?: ProcedureToActionAdapterInput
  readonly authorizationRef?: string
}

export type AuthorizedExcursionPreflightEvidence = Readonly<{
  outboundScreen?: OutboundScreenResult
  procedureReadiness?: ProcedureExecutionReadinessResult
}>

/**
 * Evaluate preflight against authoritative owner seams. Fail-closed before release.
 * Preflight is a synchronous evaluation phase, not a durable persisted stage.
 */
export function runAuthorizedExcursionPreflight(
  input: AuthorizedExcursionPreflightInput,
  state?: GameState
): AuthorizedExcursionResult & { evidence?: AuthorizedExcursionPreflightEvidence } {
  const excursion = resolveCurrentExcursion(input.excursion, state)
  const { operationKey, gates } = input
  if (!isNonEmptyString(operationKey)) {
    return rejectExcursion('malformed_input', excursion, state)
  }
  if (excursion.stage !== 'requested') {
    if (excursion.appliedOperationKeys.includes(operationKey.trim())) {
      return { ok: true, excursion, state }
    }
    return rejectExcursion('illegal_transition', excursion, state)
  }
  if (excursion.appliedOperationKeys.includes(operationKey.trim())) {
    return { ok: true, excursion, state }
  }

  const reasons: AuthorizedExcursionReasonCode[] = []
  if (!gates.purposeAuthorized) reasons.push('unauthorized_purpose')
  if (!gates.staffAuthorized) reasons.push('staff_unauthorized')
  if (!gates.movementCapabilityValid) reasons.push('movement_capability_invalid')
  if (!gates.routeAccessible) reasons.push('route_inaccessible')
  if (!gates.permitReady) reasons.push('permit_missing')
  if (!gates.roomConfigSafe) reasons.push('room_config_unsafe')

  let outboundScreen: OutboundScreenResult | undefined
  if (gates.requiresOutboundScreen) {
    outboundScreen = resolveOutboundScreening(input.outboundScreen)
    if (outboundScreen === undefined || outboundScreen.decision !== 'clear') {
      reasons.push('outbound_screen_blocked')
    }
  }

  let procedureReadiness: ProcedureExecutionReadinessResult | undefined
  if (input.procedureAdapter !== undefined) {
    procedureReadiness = evaluateCanonicalProcedureExecutionReadiness(input.procedureAdapter)
    if (!procedureReadiness.ok) {
      reasons.push('procedure_not_ready')
    }
  }

  const evidence = Object.freeze({
    ...(outboundScreen !== undefined ? { outboundScreen } : {}),
    ...(procedureReadiness !== undefined ? { procedureReadiness } : {}),
  })

  const uniqueReasons = sortUniqueReasons(reasons)
  if (uniqueReasons.length > 0) {
    const blocked = freezeExcursion({
      ...excursion,
      stage: 'blocked',
      reasonCodes: uniqueReasons,
      appliedOperationKeys: withAppliedKey(excursion, operationKey.trim()),
      pendingCorrectiveAction: 'resolve_preflight_blockers',
      physicalEffectsOccurred: false,
    })
    return {
      ok: false,
      excursion: blocked,
      code: uniqueReasons[0]!,
      reasonCodes: uniqueReasons,
      state: upsertExcursion(state, blocked),
      evidence,
    }
  }

  const authorized = freezeExcursion({
    ...excursion,
    stage: 'authorized',
    reasonCodes: Object.freeze([]),
    appliedOperationKeys: withAppliedKey(excursion, operationKey.trim()),
    pendingCorrectiveAction: undefined,
    ...(isNonEmptyString(input.authorizationRef)
      ? { authorizationRef: input.authorizationRef.trim() }
      : {}),
    ...(input.procedureAdapter !== undefined
      ? { procedureExecutionKey: input.procedureAdapter.executionKey }
      : {}),
  })
  return {
    ok: true,
    excursion: authorized,
    state: upsertExcursion(state, authorized),
    evidence,
  }
}

/**
 * Confirm owner-reported release onto excursion. Authorization alone does not move.
 */
export function confirmAuthorizedExcursionRelease(
  excursionInput: AuthorizedExcursionRecord,
  input: {
    readonly operationKey: string
    readonly releaseCommitted: boolean
    readonly campaignWeek: number
  },
  state?: GameState
): AuthorizedExcursionResult {
  const excursion = resolveCurrentExcursion(excursionInput, state)
  if (!isNonEmptyString(input.operationKey) || !isFiniteWeek(input.campaignWeek)) {
    return rejectExcursion('malformed_input', excursion, state)
  }
  const key = input.operationKey.trim()
  if (excursion.appliedOperationKeys.includes(key) && excursion.stage === 'active_excursion') {
    return { ok: true, excursion, state }
  }
  if (excursion.stage !== 'authorized' && excursion.stage !== 'released') {
    return rejectExcursion('illegal_transition', excursion, state)
  }
  if (!input.releaseCommitted) {
    return rejectExcursion('release_not_committed', excursion, state)
  }
  const next = freezeExcursion({
    ...excursion,
    stage: 'active_excursion',
    physicalEffectsOccurred: true,
    startWeek: excursion.startWeek ?? input.campaignWeek,
    appliedOperationKeys: withAppliedKey(excursion, key),
    pendingCorrectiveAction: 'monitor_return_obligation',
  })
  return { ok: true, excursion: next, state: upsertExcursion(state, next) }
}

/**
 * Advance return obligation from canonical campaign time. Does not create a scheduler.
 * Overdue is not escape.
 */
export function evaluateAuthorizedExcursionReturnObligation(
  excursionInput: AuthorizedExcursionRecord,
  input: { readonly operationKey: string; readonly campaignWeek: number },
  state?: GameState
): AuthorizedExcursionResult {
  const excursion = resolveCurrentExcursion(excursionInput, state)
  if (!isNonEmptyString(input.operationKey) || !isFiniteWeek(input.campaignWeek)) {
    return rejectExcursion('malformed_input', excursion, state)
  }
  const key = input.operationKey.trim()
  if (
    excursion.appliedOperationKeys.includes(key) &&
    (excursion.stage === 'return_due' || excursion.stage === 'overdue')
  ) {
    return { ok: true, excursion, state }
  }
  if (excursion.stage !== 'active_excursion' && excursion.stage !== 'return_due') {
    return rejectExcursion('illegal_transition', excursion, state)
  }
  if (excursion.returnDeadlineWeek === undefined) {
    return { ok: true, excursion, state }
  }
  if (input.campaignWeek < excursion.returnDeadlineWeek) {
    return { ok: true, excursion, state }
  }
  if (input.campaignWeek === excursion.returnDeadlineWeek) {
    if (excursion.stage === 'return_due') {
      return { ok: true, excursion, state }
    }
    const due = freezeExcursion({
      ...excursion,
      stage: 'return_due',
      appliedOperationKeys: withAppliedKey(excursion, key),
      pendingCorrectiveAction: 'begin_authorized_return',
      reasonCodes: Object.freeze([]),
    })
    return { ok: true, excursion: due, state: upsertExcursion(state, due) }
  }

  const overdue = freezeExcursion({
    ...excursion,
    stage: 'overdue',
    reasonCodes: sortUniqueReasons(['deadline_exceeded']),
    appliedOperationKeys: withAppliedKey(excursion, key),
    pendingCorrectiveAction: 'route_overdue_to_response_owner',
    responseOwnerHint: excursion.responseOwnerHint ?? 'response',
  })
  return { ok: true, excursion: overdue, state: upsertExcursion(state, overdue) }
}

/**
 * Begin return after active/return_due/overdue. Physical arrival is a later owner commit.
 */
export function beginAuthorizedExcursionReturn(
  excursionInput: AuthorizedExcursionRecord,
  operationKey: string,
  state?: GameState
): AuthorizedExcursionResult {
  const excursion = resolveCurrentExcursion(excursionInput, state)
  if (!isNonEmptyString(operationKey)) {
    return rejectExcursion('malformed_input', excursion, state)
  }
  const key = operationKey.trim()
  if (excursion.appliedOperationKeys.includes(key) && excursion.stage === 'return_in_progress') {
    return { ok: true, excursion, state }
  }
  if (
    excursion.stage !== 'active_excursion' &&
    excursion.stage !== 'return_due' &&
    excursion.stage !== 'overdue'
  ) {
    return rejectExcursion('illegal_transition', excursion, state)
  }
  const next = freezeExcursion({
    ...excursion,
    stage: 'return_in_progress',
    appliedOperationKeys: withAppliedKey(excursion, key),
    pendingCorrectiveAction: 'await_owner_return_commit',
  })
  return { ok: true, excursion: next, state: upsertExcursion(state, next) }
}

/**
 * Confirm owner-reported physical return to origin. Does not complete the excursion.
 */
export function confirmAuthorizedExcursionReturn(
  excursionInput: AuthorizedExcursionRecord,
  input: {
    readonly operationKey: string
    readonly returnCommitted: boolean
    readonly arrivedAtOrigin: boolean
  },
  state?: GameState
): AuthorizedExcursionResult {
  const excursion = resolveCurrentExcursion(excursionInput, state)
  if (!isNonEmptyString(input.operationKey)) {
    return rejectExcursion('malformed_input', excursion, state)
  }
  const key = input.operationKey.trim()
  if (
    excursion.appliedOperationKeys.includes(key) &&
    excursion.stage === 'recontainment_verification'
  ) {
    return { ok: true, excursion, state }
  }
  if (excursion.stage !== 'return_in_progress') {
    return rejectExcursion('illegal_transition', excursion, state)
  }
  if (!input.returnCommitted || !input.arrivedAtOrigin) {
    return rejectExcursion('return_not_committed', excursion, state)
  }
  const next = freezeExcursion({
    ...excursion,
    stage: 'recontainment_verification',
    physicalEffectsOccurred: true,
    appliedOperationKeys: withAppliedKey(excursion, key),
    pendingCorrectiveAction: 'await_recontainment_verification',
  })
  return { ok: true, excursion: next, state: upsertExcursion(state, next) }
}

/**
 * Complete only after authoritative recontainment verification succeeds.
 */
export function confirmAuthorizedExcursionRecontainment(
  excursionInput: AuthorizedExcursionRecord,
  input: {
    readonly operationKey: string
    readonly recontainmentVerified: boolean
    readonly procedureAdapter?: ProcedureToActionAdapterInput
  },
  state?: GameState
): AuthorizedExcursionResult {
  const excursion = resolveCurrentExcursion(excursionInput, state)
  if (!isNonEmptyString(input.operationKey)) {
    return rejectExcursion('malformed_input', excursion, state)
  }
  const key = input.operationKey.trim()
  if (excursion.appliedOperationKeys.includes(key) && excursion.stage === 'completed') {
    return { ok: true, excursion, state }
  }
  if (excursion.stage !== 'recontainment_verification') {
    return rejectExcursion('illegal_transition', excursion, state)
  }

  if (!input.recontainmentVerified) {
    const failed = freezeExcursion({
      ...excursion,
      stage: 'failed_return',
      reasonCodes: sortUniqueReasons(['recontainment_not_verified']),
      appliedOperationKeys: withAppliedKey(excursion, key),
      pendingCorrectiveAction: 'retry_recontainment_or_route_incident',
      responseOwnerHint: excursion.responseOwnerHint ?? 'incident',
    })
    return {
      ok: false,
      excursion: failed,
      code: 'recontainment_not_verified',
      reasonCodes: failed.reasonCodes,
      state: upsertExcursion(state, failed),
    }
  }

  if (input.procedureAdapter !== undefined) {
    const readiness = evaluateCanonicalProcedureExecutionReadiness(input.procedureAdapter)
    if (!readiness.ok) {
      return rejectExcursion('procedure_not_ready', excursion, state)
    }
  }

  const next = freezeExcursion({
    ...excursion,
    stage: 'completed',
    physicalEffectsOccurred: true,
    appliedOperationKeys: withAppliedKey(excursion, key),
    pendingCorrectiveAction: undefined,
    reasonCodes: Object.freeze([]),
    ...(input.procedureAdapter !== undefined
      ? { procedureExecutionKey: input.procedureAdapter.executionKey }
      : {}),
  })
  return { ok: true, excursion: next, state: upsertExcursion(state, next) }
}

/**
 * Route disappearance / failed return to existing owners without asserting escape/death.
 */
export function reportAuthorizedExcursionMissing(
  excursionInput: AuthorizedExcursionRecord,
  input: {
    readonly operationKey: string
    readonly responseOwnerHint?: string
    readonly escalateToRetrieval?: boolean
  },
  state?: GameState
): AuthorizedExcursionResult {
  const excursion = resolveCurrentExcursion(excursionInput, state)
  if (!isNonEmptyString(input.operationKey)) {
    return rejectExcursion('malformed_input', excursion, state)
  }
  const key = input.operationKey.trim()
  const terminal =
    input.escalateToRetrieval === true ? ('retrieval_required' as const) : ('missing' as const)
  if (excursion.appliedOperationKeys.includes(key) && excursion.stage === terminal) {
    return { ok: true, excursion, state }
  }
  if (!ON_EXCURSION_STAGES.has(excursion.stage) && excursion.stage !== 'return_in_progress') {
    return rejectExcursion('illegal_transition', excursion, state)
  }
  const next = freezeExcursion({
    ...excursion,
    stage: terminal,
    reasonCodes: sortUniqueReasons(['subject_missing']),
    appliedOperationKeys: withAppliedKey(excursion, key),
    physicalEffectsOccurred: true,
    pendingCorrectiveAction:
      terminal === 'retrieval_required'
        ? 'route_retrieval_to_response_owner'
        : 'route_missing_to_tracking_owner',
    responseOwnerHint:
      (isNonEmptyString(input.responseOwnerHint) ? input.responseOwnerHint.trim() : undefined) ??
      excursion.responseOwnerHint ??
      (terminal === 'retrieval_required' ? 'response' : 'tracking'),
  })
  return { ok: true, excursion: next, state: upsertExcursion(state, next) }
}

/**
 * Interrupt or abort. After release, physical effects are preserved (no rollback).
 */
export function interruptAuthorizedExcursion(
  excursionInput: AuthorizedExcursionRecord,
  input: {
    readonly operationKey: string
    readonly responseOwnerHint?: string
    readonly pendingCorrectiveAction?: string
    readonly compromised?: boolean
  },
  state?: GameState
): AuthorizedExcursionResult {
  const excursion = resolveCurrentExcursion(excursionInput, state)
  if (!isNonEmptyString(input.operationKey)) {
    return rejectExcursion('malformed_input', excursion, state)
  }
  const key = input.operationKey.trim()
  if (TERMINAL_STAGES.has(excursion.stage) && excursion.appliedOperationKeys.includes(key)) {
    return { ok: true, excursion, state }
  }
  if (TERMINAL_STAGES.has(excursion.stage)) {
    return rejectExcursion('illegal_transition', excursion, state)
  }

  const interruptedAfterRelease =
    excursion.physicalEffectsOccurred ||
    ON_EXCURSION_STAGES.has(excursion.stage) ||
    excursion.stage === 'return_in_progress' ||
    excursion.stage === 'recontainment_verification'

  if (interruptedAfterRelease) {
    const stage = input.compromised === true ? ('compromised' as const) : ('failed_return' as const)
    const failed = freezeExcursion({
      ...excursion,
      stage,
      reasonCodes: sortUniqueReasons(['interrupted_after_release']),
      appliedOperationKeys: withAppliedKey(excursion, key),
      physicalEffectsOccurred: true,
      pendingCorrectiveAction:
        input.pendingCorrectiveAction?.trim() || 'route_incident_to_owning_system',
      ...(isNonEmptyString(input.responseOwnerHint)
        ? { responseOwnerHint: input.responseOwnerHint.trim() }
        : { responseOwnerHint: excursion.responseOwnerHint ?? 'incident' }),
    })
    return {
      ok: false,
      excursion: failed,
      code: 'interrupted_after_release',
      reasonCodes: failed.reasonCodes,
      state: upsertExcursion(state, failed),
    }
  }

  if (PRE_RELEASE_STAGES.has(excursion.stage)) {
    const aborted = freezeExcursion({
      ...excursion,
      stage: 'aborted',
      reasonCodes: sortUniqueReasons(['aborted_before_release']),
      appliedOperationKeys: withAppliedKey(excursion, key),
      physicalEffectsOccurred: false,
      pendingCorrectiveAction: input.pendingCorrectiveAction?.trim() || 'retry_or_cancel',
    })
    return {
      ok: false,
      excursion: aborted,
      code: 'aborted_before_release',
      reasonCodes: aborted.reasonCodes,
      state: upsertExcursion(state, aborted),
    }
  }

  return rejectExcursion('illegal_transition', excursion, state)
}

/**
 * Read-only explainability for existing surfaces. Never invents omniscient truth.
 */
function explainabilityOutcome(
  stage: AuthorizedExcursionStage
): AuthorizedExcursionExplainability['outcome'] {
  switch (stage) {
    case 'completed':
      return 'completed'
    case 'blocked':
      return 'blocked'
    case 'aborted':
      return 'aborted'
    case 'overdue':
      return 'overdue'
    case 'missing':
      return 'missing'
    case 'retrieval_required':
      return 'retrieval_required'
    case 'failed_return':
      return 'failed_return'
    case 'compromised':
      return 'compromised'
    case 'requested':
    case 'authorized':
    case 'released':
    case 'active_excursion':
    case 'return_due':
    case 'return_in_progress':
    case 'recontainment_verification':
      return 'in_progress'
    default: {
      const _exhaustive: never = stage
      return _exhaustive
    }
  }
}

export function projectExplainableAuthorizedExcursion(
  excursion: AuthorizedExcursionRecord
): AuthorizedExcursionExplainability {
  return Object.freeze({
    excursionId: excursion.excursionId,
    subjectRef: excursion.subjectRef,
    stage: excursion.stage,
    reasonCodes: excursion.reasonCodes,
    physicalEffectsOccurred: excursion.physicalEffectsOccurred,
    outcome: explainabilityOutcome(excursion.stage),
    ...(excursion.returnDeadlineWeek !== undefined
      ? { returnDeadlineWeek: excursion.returnDeadlineWeek }
      : {}),
    ...(excursion.pendingCorrectiveAction !== undefined
      ? { pendingCorrectiveAction: excursion.pendingCorrectiveAction }
      : {}),
  })
}

export function isAuthorizedExcursionActive(stage: AuthorizedExcursionStage): boolean {
  return ACTIVE_STAGES.has(stage)
}

export function isAuthorizedExcursionTerminal(stage: AuthorizedExcursionStage): boolean {
  return TERMINAL_STAGES.has(stage)
}
