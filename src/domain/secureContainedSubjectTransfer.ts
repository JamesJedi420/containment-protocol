/**
 * SPE-3439 — secure contained-subject transfer transaction.
 *
 * Owns same-site transfer coordination stages and invariants only. Consumes
 * SPE-3177 co-location, SPE-3189 outbound screening, SPE-2995 procedure-to-action
 * readiness, and optional SPE-1892 person-custody identity refs. Does not teleport
 * subjects, invent custody/location truth, roll back physical effects, or create a
 * parallel procedure/pathfinding/custody engine.
 */

import type { GameState } from './models'
import { ensureNormalizedGameState } from './teamSimulation'
import {
  evaluateContainmentCoLocationPlacement,
  type CoLocationPlacementRequest,
  type CoLocationPlacementResult,
} from './containmentCoLocationCompatibility'
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
  isNonEmptyTrimmedString,
  isPlainRecord,
  sortUniqueCodes,
  withSortedAppliedKey,
} from './facilityCoordinationHydrate'

export const SECURE_TRANSFER_STAGES = [
  'requested',
  'authorized',
  'release_in_progress',
  'in_transit',
  'destination_securing',
  'completed',
  'blocked',
  'aborted',
  'failed',
] as const
export type SecureTransferStage = (typeof SECURE_TRANSFER_STAGES)[number]

export const SECURE_TRANSFER_SUBJECT_KINDS = ['person', 'non_person', 'unresolved'] as const
export type SecureTransferSubjectKind = (typeof SECURE_TRANSFER_SUBJECT_KINDS)[number]

export const SECURE_TRANSFER_BLOCK_REASONS = [
  'malformed_input',
  'incompatible_destination',
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
  'movement_not_committed',
  'destination_not_secured',
  'interrupted_after_release',
  'aborted_before_release',
] as const
export type SecureTransferBlockReason = (typeof SECURE_TRANSFER_BLOCK_REASONS)[number]

export type SecureTransferId = string

export type SecureTransferRecord = Readonly<{
  transferId: SecureTransferId
  subjectRef: string
  subjectKind: SecureTransferSubjectKind
  originNodeId: string
  destinationNodeId: string
  originZoneRef?: string
  destinationZoneRef?: string
  stage: SecureTransferStage
  reasonCodes: readonly SecureTransferBlockReason[]
  /** Operation keys already applied — prevents duplicate stage effects. */
  appliedOperationKeys: readonly string[]
  /** True once an owning subsystem confirmed physical release/movement began. */
  physicalEffectsOccurred: boolean
  /** SPE-1892 continuity refs for person subjects only; never invented for non-persons. */
  custodyStatusId?: string
  formerRoleCategory?: string
  authorizationRef?: string
  procedureExecutionKey?: string
  controllingAuthorityRef?: string
  pendingCorrectiveAction?: string
  incidentOwnerHint?: string
}>

export type FacilitySecureContainedSubjectTransfers = Readonly<
  Record<SecureTransferId, SecureTransferRecord>
>

export type SecureTransferExplainability = Readonly<{
  transferId: SecureTransferId
  subjectRef: string
  stage: SecureTransferStage
  reasonCodes: readonly SecureTransferBlockReason[]
  pendingCorrectiveAction?: string
  physicalEffectsOccurred: boolean
  outcome: 'in_progress' | 'completed' | 'blocked' | 'aborted' | 'failed'
}>

export type SecureTransferResult =
  | { ok: true; transfer: SecureTransferRecord; state?: GameState }
  | {
      ok: false
      transfer?: SecureTransferRecord
      state?: GameState
      code: SecureTransferBlockReason
      reasonCodes: readonly SecureTransferBlockReason[]
    }

const ACTIVE_STAGES: ReadonlySet<SecureTransferStage> = new Set([
  'requested',
  'authorized',
  'release_in_progress',
  'in_transit',
  'destination_securing',
])

const TERMINAL_STAGES: ReadonlySet<SecureTransferStage> = new Set([
  'completed',
  'blocked',
  'aborted',
  'failed',
])

const PRE_RELEASE_STAGES: ReadonlySet<SecureTransferStage> = new Set(['requested', 'authorized'])

const isRecord = isPlainRecord
const hasOwnEnumerableProperty = hasOwnEnumerableKey
const isNonEmptyString = isNonEmptyTrimmedString
const compareCodeUnit = compareCodeUnitOrder

function isStage(value: unknown): value is SecureTransferStage {
  return SECURE_TRANSFER_STAGES.some((stage) => stage === value)
}

function isSubjectKind(value: unknown): value is SecureTransferSubjectKind {
  return SECURE_TRANSFER_SUBJECT_KINDS.some((kind) => kind === value)
}

function isBlockReason(value: unknown): value is SecureTransferBlockReason {
  return SECURE_TRANSFER_BLOCK_REASONS.some((reason) => reason === value)
}

function freezeTransfer(record: SecureTransferRecord): SecureTransferRecord {
  // Omit explicit `undefined` own keys so parseTransferRecord does not reject
  // completed/authorized in-memory records when readTransfers rebuilds the map.
  return freezeCoordinationRecord(record)
}

function sortUniqueReasons(
  reasons: readonly SecureTransferBlockReason[]
): readonly SecureTransferBlockReason[] {
  return sortUniqueCodes(reasons)
}

function withAppliedKey(record: SecureTransferRecord, operationKey: string): readonly string[] {
  return withSortedAppliedKey(record.appliedOperationKeys, operationKey)
}

function parseTransferRecord(
  value: unknown,
  expectedId: SecureTransferId
): SecureTransferRecord | undefined {
  if (!isRecord(value)) return undefined
  if (!hasOwnEnumerableProperty(value, 'transferId') || value.transferId !== expectedId) {
    return undefined
  }
  if (!isNonEmptyString(value.transferId)) return undefined
  if (!isNonEmptyString(value.subjectRef)) return undefined
  if (!isSubjectKind(value.subjectKind)) return undefined
  if (!isNonEmptyString(value.originNodeId) || !isNonEmptyString(value.destinationNodeId)) {
    return undefined
  }
  if (!isStage(value.stage)) return undefined
  if (typeof value.physicalEffectsOccurred !== 'boolean') return undefined
  if (!Array.isArray(value.reasonCodes) || !Array.isArray(value.appliedOperationKeys)) {
    return undefined
  }

  const reasonCodes: SecureTransferBlockReason[] = []
  for (const reason of value.reasonCodes) {
    if (!isBlockReason(reason)) return undefined
    reasonCodes.push(reason)
  }
  const appliedOperationKeys: string[] = []
  for (const key of value.appliedOperationKeys) {
    if (!isNonEmptyString(key)) return undefined
    appliedOperationKeys.push(key.trim())
  }

  let originZoneRef: string | undefined
  if (hasOwnEnumerableProperty(value, 'originZoneRef')) {
    if (!isNonEmptyString(value.originZoneRef)) return undefined
    originZoneRef = value.originZoneRef.trim()
  }
  let destinationZoneRef: string | undefined
  if (hasOwnEnumerableProperty(value, 'destinationZoneRef')) {
    if (!isNonEmptyString(value.destinationZoneRef)) return undefined
    destinationZoneRef = value.destinationZoneRef.trim()
  }
  let custodyStatusId: string | undefined
  if (hasOwnEnumerableProperty(value, 'custodyStatusId')) {
    if (!isNonEmptyString(value.custodyStatusId)) return undefined
    custodyStatusId = value.custodyStatusId.trim()
  }
  let formerRoleCategory: string | undefined
  if (hasOwnEnumerableProperty(value, 'formerRoleCategory')) {
    if (!isNonEmptyString(value.formerRoleCategory)) return undefined
    formerRoleCategory = value.formerRoleCategory.trim()
  }
  let authorizationRef: string | undefined
  if (hasOwnEnumerableProperty(value, 'authorizationRef')) {
    if (!isNonEmptyString(value.authorizationRef)) return undefined
    authorizationRef = value.authorizationRef.trim()
  }
  let procedureExecutionKey: string | undefined
  if (hasOwnEnumerableProperty(value, 'procedureExecutionKey')) {
    if (!isNonEmptyString(value.procedureExecutionKey)) return undefined
    procedureExecutionKey = value.procedureExecutionKey.trim()
  }
  let controllingAuthorityRef: string | undefined
  if (hasOwnEnumerableProperty(value, 'controllingAuthorityRef')) {
    if (!isNonEmptyString(value.controllingAuthorityRef)) return undefined
    controllingAuthorityRef = value.controllingAuthorityRef.trim()
  }
  let pendingCorrectiveAction: string | undefined
  if (hasOwnEnumerableProperty(value, 'pendingCorrectiveAction')) {
    if (!isNonEmptyString(value.pendingCorrectiveAction)) return undefined
    pendingCorrectiveAction = value.pendingCorrectiveAction.trim()
  }
  let incidentOwnerHint: string | undefined
  if (hasOwnEnumerableProperty(value, 'incidentOwnerHint')) {
    if (!isNonEmptyString(value.incidentOwnerHint)) return undefined
    incidentOwnerHint = value.incidentOwnerHint.trim()
  }

  if (value.subjectKind === 'person') {
    if (custodyStatusId === undefined || formerRoleCategory === undefined) return undefined
  } else if (custodyStatusId !== undefined || formerRoleCategory !== undefined) {
    // Non-person / unresolved must not inherit person-custody fields.
    return undefined
  }

  return freezeTransfer({
    transferId: value.transferId.trim(),
    subjectRef: value.subjectRef.trim(),
    subjectKind: value.subjectKind,
    originNodeId: value.originNodeId.trim(),
    destinationNodeId: value.destinationNodeId.trim(),
    stage: value.stage,
    reasonCodes: sortUniqueReasons(reasonCodes),
    appliedOperationKeys: Object.freeze([...appliedOperationKeys].sort(compareCodeUnit)),
    physicalEffectsOccurred: value.physicalEffectsOccurred,
    ...(originZoneRef !== undefined ? { originZoneRef } : {}),
    ...(destinationZoneRef !== undefined ? { destinationZoneRef } : {}),
    ...(custodyStatusId !== undefined ? { custodyStatusId } : {}),
    ...(formerRoleCategory !== undefined ? { formerRoleCategory } : {}),
    ...(authorizationRef !== undefined ? { authorizationRef } : {}),
    ...(procedureExecutionKey !== undefined ? { procedureExecutionKey } : {}),
    ...(controllingAuthorityRef !== undefined ? { controllingAuthorityRef } : {}),
    ...(pendingCorrectiveAction !== undefined ? { pendingCorrectiveAction } : {}),
    ...(incidentOwnerHint !== undefined ? { incidentOwnerHint } : {}),
  })
}

/**
 * Hydrate optional `GameState.facilitySecureContainedSubjectTransfers`.
 * Legacy omit / malformed non-records / empty after sanitize → undefined.
 */
export function parseFacilitySecureContainedSubjectTransfers(
  value: unknown
): FacilitySecureContainedSubjectTransfers | undefined {
  if (value === undefined) return undefined
  if (!isRecord(value)) return undefined
  const out: Record<string, SecureTransferRecord> = {}
  for (const key of Object.keys(value).sort(compareCodeUnit)) {
    if (!hasOwnEnumerableProperty(value, key)) continue
    if (!isNonEmptyString(key)) continue
    const parsed = parseTransferRecord(value[key], key)
    if (parsed === undefined) continue
    out[key] = parsed
  }
  if (Object.keys(out).length === 0) return undefined
  return Object.freeze(out)
}

function readTransfers(state: GameState): FacilitySecureContainedSubjectTransfers {
  return (
    parseFacilitySecureContainedSubjectTransfers(state.facilitySecureContainedSubjectTransfers) ??
    Object.freeze({})
  )
}

function writeTransfers(
  state: GameState,
  transfers: FacilitySecureContainedSubjectTransfers
): GameState {
  const normalized = ensureNormalizedGameState(state)
  if (Object.keys(transfers).length === 0) {
    if (normalized.facilitySecureContainedSubjectTransfers === undefined) return normalized
    const rest = { ...normalized }
    delete rest.facilitySecureContainedSubjectTransfers
    return rest
  }
  return {
    ...normalized,
    facilitySecureContainedSubjectTransfers: Object.freeze({ ...transfers }),
  }
}

function upsertTransfer(
  state: GameState | undefined,
  transfer: SecureTransferRecord
): GameState | undefined {
  if (state === undefined) return undefined
  const transfers = { ...readTransfers(state), [transfer.transferId]: transfer }
  return writeTransfers(state, Object.freeze(transfers))
}

/** Prefer the durable registry copy when present so idempotent replays stay consistent. */
function resolveCurrentTransfer(
  transfer: SecureTransferRecord,
  state: GameState | undefined
): SecureTransferRecord {
  if (state === undefined) return transfer
  return readTransfers(state)[transfer.transferId] ?? transfer
}

export type SecureTransferCreateInput = {
  readonly transferId: string
  readonly subjectRef: string
  readonly subjectKind: SecureTransferSubjectKind
  readonly originNodeId: string
  readonly destinationNodeId: string
  readonly originZoneRef?: string
  readonly destinationZoneRef?: string
  readonly controllingAuthorityRef?: string
  readonly custodyStatusId?: string
  readonly formerRoleCategory?: string
  readonly operationKey: string
}

/**
 * Open a requested transfer. Same operation key on an existing id is idempotent.
 */
export function createSecureContainedSubjectTransfer(
  input: SecureTransferCreateInput,
  state?: GameState
): SecureTransferResult {
  if (
    !isNonEmptyString(input.transferId) ||
    !isNonEmptyString(input.subjectRef) ||
    !isSubjectKind(input.subjectKind) ||
    !isNonEmptyString(input.originNodeId) ||
    !isNonEmptyString(input.destinationNodeId) ||
    !isNonEmptyString(input.operationKey)
  ) {
    return {
      ok: false,
      code: 'malformed_input',
      reasonCodes: Object.freeze(['malformed_input'] as const),
      state,
    }
  }

  if (input.subjectKind === 'unresolved') {
    return {
      ok: false,
      code: 'custody_unresolved',
      reasonCodes: Object.freeze(['custody_unresolved'] as const),
      state,
    }
  }

  if (input.subjectKind === 'person') {
    if (!isNonEmptyString(input.custodyStatusId) || !isNonEmptyString(input.formerRoleCategory)) {
      return {
        ok: false,
        code: 'custody_unresolved',
        reasonCodes: Object.freeze(['custody_unresolved'] as const),
        state,
      }
    }
  } else if (input.custodyStatusId !== undefined || input.formerRoleCategory !== undefined) {
    return {
      ok: false,
      code: 'malformed_input',
      reasonCodes: Object.freeze(['malformed_input'] as const),
      state,
    }
  }

  const transferId = input.transferId.trim()
  const operationKey = input.operationKey.trim()
  if (state !== undefined) {
    const existing = readTransfers(state)[transferId]
    if (existing) {
      if (existing.appliedOperationKeys.includes(operationKey)) {
        return { ok: true, transfer: existing, state }
      }
      return {
        ok: false,
        transfer: existing,
        code: 'stale_operation',
        reasonCodes: Object.freeze(['stale_operation'] as const),
        state,
      }
    }
  }

  const transfer = freezeTransfer({
    transferId,
    subjectRef: input.subjectRef.trim(),
    subjectKind: input.subjectKind,
    originNodeId: input.originNodeId.trim(),
    destinationNodeId: input.destinationNodeId.trim(),
    stage: 'requested',
    reasonCodes: Object.freeze([]),
    appliedOperationKeys: Object.freeze([operationKey]),
    physicalEffectsOccurred: false,
    ...(isNonEmptyString(input.originZoneRef) ? { originZoneRef: input.originZoneRef.trim() } : {}),
    ...(isNonEmptyString(input.destinationZoneRef)
      ? { destinationZoneRef: input.destinationZoneRef.trim() }
      : {}),
    ...(isNonEmptyString(input.controllingAuthorityRef)
      ? { controllingAuthorityRef: input.controllingAuthorityRef.trim() }
      : {}),
    ...(input.subjectKind === 'person'
      ? {
          custodyStatusId: input.custodyStatusId!.trim(),
          formerRoleCategory: input.formerRoleCategory!.trim(),
        }
      : {}),
  })

  return { ok: true, transfer, state: upsertTransfer(state, transfer) }
}

export type SecureTransferPreflightGates = {
  readonly staffAuthorized: boolean
  readonly movementCapabilityValid: boolean
  readonly routeAccessible: boolean
  readonly permitReady: boolean
  readonly roomConfigSafe: boolean
  /** When true, SPE-3189 screening must clear before authorization. */
  readonly requiresOutboundScreen?: boolean
}

export type SecureTransferPreflightInput = {
  readonly transfer: SecureTransferRecord
  readonly operationKey: string
  readonly gates: SecureTransferPreflightGates
  readonly coLocation: CoLocationPlacementRequest
  readonly outboundScreen?: unknown
  readonly procedureAdapter?: ProcedureToActionAdapterInput
  readonly authorizationRef?: string
}

export type SecureTransferPreflightEvidence = Readonly<{
  coLocation: CoLocationPlacementResult
  outboundScreen?: OutboundScreenResult
  procedureReadiness?: ProcedureExecutionReadinessResult
}>

/**
 * Evaluate preflight against authoritative owner seams. Fail-closed before release.
 * Does not mutate subject location or custody.
 */
export function runSecureTransferPreflight(
  input: SecureTransferPreflightInput,
  state?: GameState
): SecureTransferResult & { evidence?: SecureTransferPreflightEvidence } {
  const transfer = resolveCurrentTransfer(input.transfer, state)
  const { operationKey, gates } = input
  if (!isNonEmptyString(operationKey)) {
    return {
      ok: false,
      transfer,
      code: 'malformed_input',
      reasonCodes: Object.freeze(['malformed_input'] as const),
      state,
    }
  }
  // Preflight is a synchronous evaluation phase (evidence below), not a durable stage.
  if (transfer.stage !== 'requested') {
    if (transfer.appliedOperationKeys.includes(operationKey.trim())) {
      return { ok: true, transfer, state }
    }
    return {
      ok: false,
      transfer,
      code: 'illegal_transition',
      reasonCodes: Object.freeze(['illegal_transition'] as const),
      state,
    }
  }
  if (transfer.appliedOperationKeys.includes(operationKey.trim())) {
    return { ok: true, transfer, state }
  }

  const reasons: SecureTransferBlockReason[] = []
  const coLocation = evaluateContainmentCoLocationPlacement(input.coLocation)
  if (coLocation.decision === 'rejected') {
    reasons.push('incompatible_destination')
  }
  if (!gates.staffAuthorized) reasons.push('staff_unauthorized')
  if (!gates.movementCapabilityValid) reasons.push('movement_capability_invalid')
  if (!gates.routeAccessible) reasons.push('route_inaccessible')
  if (!gates.permitReady) reasons.push('permit_missing')
  if (!gates.roomConfigSafe) reasons.push('room_config_unsafe')

  let outboundScreen: OutboundScreenResult | undefined
  if (gates.requiresOutboundScreen) {
    outboundScreen = resolveOutboundScreening(input.outboundScreen)
    if (outboundScreen === undefined) {
      reasons.push('outbound_screen_blocked')
    } else if (outboundScreen.decision !== 'clear') {
      // Screening hold/quarantine/etc. is not transfer permission.
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
    coLocation,
    ...(outboundScreen !== undefined ? { outboundScreen } : {}),
    ...(procedureReadiness !== undefined ? { procedureReadiness } : {}),
  })

  const uniqueReasons = sortUniqueReasons(reasons)
  if (uniqueReasons.length > 0) {
    const blocked = freezeTransfer({
      ...transfer,
      stage: 'blocked',
      reasonCodes: uniqueReasons,
      appliedOperationKeys: withAppliedKey(transfer, operationKey.trim()),
      pendingCorrectiveAction: 'resolve_preflight_blockers',
      physicalEffectsOccurred: false,
    })
    return {
      ok: false,
      transfer: blocked,
      code: uniqueReasons[0]!,
      reasonCodes: uniqueReasons,
      state: upsertTransfer(state, blocked),
      evidence,
    }
  }

  const authorized = freezeTransfer({
    ...transfer,
    stage: 'authorized',
    reasonCodes: Object.freeze([]),
    appliedOperationKeys: withAppliedKey(transfer, operationKey.trim()),
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
    transfer: authorized,
    state: upsertTransfer(state, authorized),
    evidence,
  }
}

/**
 * Begin release after authorization. Stage alone does not prove release occurred.
 */
export function beginSecureTransferRelease(
  transferInput: SecureTransferRecord,
  operationKey: string,
  state?: GameState
): SecureTransferResult {
  const transfer = resolveCurrentTransfer(transferInput, state)
  if (!isNonEmptyString(operationKey)) {
    return {
      ok: false,
      transfer,
      code: 'malformed_input',
      reasonCodes: Object.freeze(['malformed_input'] as const),
      state,
    }
  }
  const key = operationKey.trim()
  if (transfer.appliedOperationKeys.includes(key) && transfer.stage === 'release_in_progress') {
    return { ok: true, transfer, state }
  }
  if (transfer.stage !== 'authorized') {
    return {
      ok: false,
      transfer,
      code: 'illegal_transition',
      reasonCodes: Object.freeze(['illegal_transition'] as const),
      state,
    }
  }
  const next = freezeTransfer({
    ...transfer,
    stage: 'release_in_progress',
    appliedOperationKeys: withAppliedKey(transfer, key),
    pendingCorrectiveAction: 'await_owner_release_commit',
  })
  return { ok: true, transfer: next, state: upsertTransfer(state, next) }
}

/**
 * Confirm owner-reported release. Without commit evidence, stay fail-closed.
 */
export function confirmSecureTransferRelease(
  transferInput: SecureTransferRecord,
  input: { readonly operationKey: string; readonly releaseCommitted: boolean },
  state?: GameState
): SecureTransferResult {
  const transfer = resolveCurrentTransfer(transferInput, state)
  if (!isNonEmptyString(input.operationKey)) {
    return {
      ok: false,
      transfer,
      code: 'malformed_input',
      reasonCodes: Object.freeze(['malformed_input'] as const),
      state,
    }
  }
  const key = input.operationKey.trim()
  if (transfer.appliedOperationKeys.includes(key) && transfer.stage === 'in_transit') {
    return { ok: true, transfer, state }
  }
  if (transfer.stage !== 'release_in_progress') {
    return {
      ok: false,
      transfer,
      code: 'illegal_transition',
      reasonCodes: Object.freeze(['illegal_transition'] as const),
      state,
    }
  }
  if (!input.releaseCommitted) {
    return {
      ok: false,
      transfer,
      code: 'release_not_committed',
      reasonCodes: Object.freeze(['release_not_committed'] as const),
      state,
    }
  }
  const next = freezeTransfer({
    ...transfer,
    stage: 'in_transit',
    physicalEffectsOccurred: true,
    appliedOperationKeys: withAppliedKey(transfer, key),
    pendingCorrectiveAction: 'await_owner_movement_commit',
  })
  return { ok: true, transfer: next, state: upsertTransfer(state, next) }
}

export function confirmSecureTransferMovement(
  transferInput: SecureTransferRecord,
  input: { readonly operationKey: string; readonly movementCommitted: boolean },
  state?: GameState
): SecureTransferResult {
  const transfer = resolveCurrentTransfer(transferInput, state)
  if (!isNonEmptyString(input.operationKey)) {
    return {
      ok: false,
      transfer,
      code: 'malformed_input',
      reasonCodes: Object.freeze(['malformed_input'] as const),
      state,
    }
  }
  const key = input.operationKey.trim()
  if (transfer.appliedOperationKeys.includes(key) && transfer.stage === 'destination_securing') {
    return { ok: true, transfer, state }
  }
  if (transfer.stage !== 'in_transit') {
    return {
      ok: false,
      transfer,
      code: 'illegal_transition',
      reasonCodes: Object.freeze(['illegal_transition'] as const),
      state,
    }
  }
  if (!input.movementCommitted) {
    return {
      ok: false,
      transfer,
      code: 'movement_not_committed',
      reasonCodes: Object.freeze(['movement_not_committed'] as const),
      state,
    }
  }
  const next = freezeTransfer({
    ...transfer,
    stage: 'destination_securing',
    physicalEffectsOccurred: true,
    appliedOperationKeys: withAppliedKey(transfer, key),
    pendingCorrectiveAction: 'await_destination_secure_commit',
  })
  return { ok: true, transfer: next, state: upsertTransfer(state, next) }
}

export function confirmSecureTransferDestinationSecure(
  transferInput: SecureTransferRecord,
  input: {
    readonly operationKey: string
    readonly destinationSecured: boolean
    readonly custodyPlacementCommitted: boolean
  },
  state?: GameState
): SecureTransferResult {
  const transfer = resolveCurrentTransfer(transferInput, state)
  if (!isNonEmptyString(input.operationKey)) {
    return {
      ok: false,
      transfer,
      code: 'malformed_input',
      reasonCodes: Object.freeze(['malformed_input'] as const),
      state,
    }
  }
  const key = input.operationKey.trim()
  if (transfer.appliedOperationKeys.includes(key) && transfer.stage === 'completed') {
    return { ok: true, transfer, state }
  }
  if (transfer.stage !== 'destination_securing') {
    return {
      ok: false,
      transfer,
      code: 'illegal_transition',
      reasonCodes: Object.freeze(['illegal_transition'] as const),
      state,
    }
  }
  if (!input.destinationSecured || !input.custodyPlacementCommitted) {
    return {
      ok: false,
      transfer,
      code: 'destination_not_secured',
      reasonCodes: Object.freeze(['destination_not_secured'] as const),
      state,
    }
  }
  const next = freezeTransfer({
    ...transfer,
    stage: 'completed',
    physicalEffectsOccurred: true,
    appliedOperationKeys: withAppliedKey(transfer, key),
    pendingCorrectiveAction: undefined,
    reasonCodes: Object.freeze([]),
  })
  return { ok: true, transfer: next, state: upsertTransfer(state, next) }
}

/**
 * Interrupt or abort. After release, physical effects are preserved (no rollback).
 */
export function interruptSecureTransfer(
  transferInput: SecureTransferRecord,
  input: {
    readonly operationKey: string
    readonly incidentOwnerHint?: string
    readonly pendingCorrectiveAction?: string
  },
  state?: GameState
): SecureTransferResult {
  const transfer = resolveCurrentTransfer(transferInput, state)
  if (!isNonEmptyString(input.operationKey)) {
    return {
      ok: false,
      transfer,
      code: 'malformed_input',
      reasonCodes: Object.freeze(['malformed_input'] as const),
      state,
    }
  }
  const key = input.operationKey.trim()
  if (TERMINAL_STAGES.has(transfer.stage) && transfer.appliedOperationKeys.includes(key)) {
    return { ok: true, transfer, state }
  }
  if (TERMINAL_STAGES.has(transfer.stage)) {
    return {
      ok: false,
      transfer,
      code: 'illegal_transition',
      reasonCodes: Object.freeze(['illegal_transition'] as const),
      state,
    }
  }

  // Physical release/movement already committed → failed, no imaginary rollback.
  const interruptedAfterRelease =
    transfer.physicalEffectsOccurred ||
    transfer.stage === 'in_transit' ||
    transfer.stage === 'destination_securing'

  if (interruptedAfterRelease) {
    const failed = freezeTransfer({
      ...transfer,
      stage: 'failed',
      reasonCodes: sortUniqueReasons(['interrupted_after_release']),
      appliedOperationKeys: withAppliedKey(transfer, key),
      physicalEffectsOccurred: true,
      pendingCorrectiveAction:
        input.pendingCorrectiveAction?.trim() || 'route_incident_to_owning_system',
      ...(isNonEmptyString(input.incidentOwnerHint)
        ? { incidentOwnerHint: input.incidentOwnerHint.trim() }
        : { incidentOwnerHint: 'incident' }),
    })
    return {
      ok: false,
      transfer: failed,
      code: 'interrupted_after_release',
      reasonCodes: failed.reasonCodes,
      state: upsertTransfer(state, failed),
    }
  }

  // Pre-release (including release_in_progress before owner commit) → abort cleanly.
  if (PRE_RELEASE_STAGES.has(transfer.stage) || transfer.stage === 'release_in_progress') {
    const aborted = freezeTransfer({
      ...transfer,
      stage: 'aborted',
      reasonCodes: sortUniqueReasons(['aborted_before_release']),
      appliedOperationKeys: withAppliedKey(transfer, key),
      physicalEffectsOccurred: false,
      pendingCorrectiveAction: input.pendingCorrectiveAction?.trim() || 'retry_or_cancel',
    })
    return {
      ok: false,
      transfer: aborted,
      code: 'aborted_before_release',
      reasonCodes: aborted.reasonCodes,
      state: upsertTransfer(state, aborted),
    }
  }

  return {
    ok: false,
    transfer,
    code: 'illegal_transition',
    reasonCodes: Object.freeze(['illegal_transition'] as const),
    state,
  }
}

/**
 * Read-only explainability for existing surfaces. Never invents omniscient truth.
 */
export function projectExplainableSecureTransfer(
  transfer: SecureTransferRecord
): SecureTransferExplainability {
  let outcome: SecureTransferExplainability['outcome'] = 'in_progress'
  if (transfer.stage === 'completed') outcome = 'completed'
  else if (transfer.stage === 'blocked') outcome = 'blocked'
  else if (transfer.stage === 'aborted') outcome = 'aborted'
  else if (transfer.stage === 'failed') outcome = 'failed'

  return Object.freeze({
    transferId: transfer.transferId,
    subjectRef: transfer.subjectRef,
    stage: transfer.stage,
    reasonCodes: transfer.reasonCodes,
    physicalEffectsOccurred: transfer.physicalEffectsOccurred,
    outcome,
    ...(transfer.pendingCorrectiveAction !== undefined
      ? { pendingCorrectiveAction: transfer.pendingCorrectiveAction }
      : {}),
  })
}

export function isSecureTransferActive(stage: SecureTransferStage): boolean {
  return ACTIVE_STAGES.has(stage)
}

export function isSecureTransferTerminal(stage: SecureTransferStage): boolean {
  return TERMINAL_STAGES.has(stage)
}
