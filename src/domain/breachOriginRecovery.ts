/**
 * SPE-3735 — breach-origin recovery and verified recontainment handoff.
 *
 * Owns coordinating stages for an already-escaped subject. Consumes live-registry
 * escape evidence, alert-center respond work items, SPE-3177 co-location,
 * SPE-3189 screening, SPE-2995 procedure readiness, and typed producer evidence
 * packets owned by SPE-3055 (assignment claim), SPE-104 (capture), and SPE-1095
 * (movement). Does not invent claim arbitration, capture, pathfinding, custody,
 * incident, or alert engines. Capture success, physical arrival, status patches,
 * and `recaptured` labels alone never complete the transaction; only authoritative
 * containment verification does.
 */

import type { GameState } from './models'
import {
  deriveRegistryAlerts,
  updateLiveRegistryEntry,
  type LiveRegistryEntry,
  type LiveRegistryOperationalState,
} from './liveRegistry'
import type { RegistryWorkItem } from './liveRegistryAlertCenter'
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
} from './procedureToActionAdapter'
import {
  compareCodeUnitOrder,
  freezeCoordinationRecord,
  hasOwnEnumerableKey,
  isNonEmptyTrimmedString,
  isPlainRecord,
  parseFacilityRecordMap,
  sortUniqueCodes,
  withSortedAppliedKey,
  writeOptionalFacilityMapField,
} from './facilityCoordinationHydrate'

export const BREACH_RECOVERY_STAGES = [
  'escape_reported',
  'recovery_assigned',
  'subject_located',
  'capture_secured',
  'in_transit',
  'admission_pending',
  'containment_verification',
  'completed',
  'interrupted',
  'lost_contact',
  'capture_failed',
  'transit_interrupted',
  'admission_denied',
  'verification_failed',
  'failed',
] as const
export type BreachRecoveryStage = (typeof BREACH_RECOVERY_STAGES)[number]

export const BREACH_RECOVERY_SUBJECT_KINDS = ['person', 'non_person', 'unresolved'] as const
export type BreachRecoverySubjectKind = (typeof BREACH_RECOVERY_SUBJECT_KINDS)[number]

export const BREACH_RECOVERY_REASON_CODES = [
  'malformed_input',
  'escape_not_authoritative',
  'assignment_claim_missing',
  'assignment_claim_producer_invalid',
  'assignment_claim_not_held',
  'respond_work_item_invalid',
  'located_not_committed',
  'capture_evidence_missing',
  'capture_not_secured',
  'capture_producer_invalid',
  'movement_evidence_missing',
  'movement_not_committed',
  'movement_producer_invalid',
  'incompatible_destination',
  'inbound_screen_blocked',
  'admission_not_committed',
  'procedure_not_ready',
  'recontainment_not_verified',
  'custody_unresolved',
  'illegal_transition',
  'stale_operation',
  'aborted_before_effects',
  'interrupted_after_effects',
  'lost_contact',
  'status_patch_forbidden',
  'terminal_already_reported',
] as const
export type BreachRecoveryReasonCode = (typeof BREACH_RECOVERY_REASON_CODES)[number]

export type BreachRecoveryId = string

export type BreachEscapeEvidence = Readonly<{
  subjectRef: string
  liveRegistryEntryId: string
  escapeAlertType: 'escape'
  escapeReasonCode: 'contained-to-loose'
  fromOperationalState: 'contained'
  toOperationalState: 'loose'
  week: number
  incidentCaseRef: string
}>

/** Typed SPE-3055 producer evidence — coordinator does not invent claim arbitration. */
export type AssignmentClaimEvidence = Readonly<{
  producerOwner: 'SPE-3055'
  claimId: string
  operationRef: string
  claimed: boolean
}>

/** Typed SPE-104 producer evidence — coordinator does not invent capture mechanics. */
export type CaptureSecureEvidence = Readonly<{
  producerOwner: 'SPE-104'
  outcomeId: string
  subjectRef: string
  secured: boolean
}>

/** Typed SPE-1095 producer evidence — coordinator does not invent movement. */
export type RecoveryMovementEvidence = Readonly<{
  producerOwner: 'SPE-1095'
  movementId: string
  subjectRef: string
  movementCommitted: boolean
  arrivedAtDestination: boolean
}>

export type BreachRecoveryTerminalOutcome =
  | 'completed'
  | 'verification_failed'
  | 'capture_failed'
  | 'admission_denied'
  | 'lost_contact'
  | 'transit_interrupted'
  | 'failed'
  | 'interrupted'

export type BreachRecoveryTerminalReport = Readonly<{
  recoveryId: BreachRecoveryId
  subjectRef: string
  incidentCaseRef: string
  liveRegistryEntryId: string
  outcome: BreachRecoveryTerminalOutcome
  week: number
  reportedOnce: true
}>

export type BreachRecoveryRecord = Readonly<{
  recoveryId: BreachRecoveryId
  subjectRef: string
  subjectKind: BreachRecoverySubjectKind
  escapeEvidenceRef: string
  incidentCaseRef: string
  recoveryObjectiveRef: string
  destinationNodeId: string
  destinationZoneRef?: string
  stage: BreachRecoveryStage
  reasonCodes: readonly BreachRecoveryReasonCode[]
  appliedOperationKeys: readonly string[]
  physicalEffectsOccurred: boolean
  terminalOutcomeReported: boolean
  custodyStatusId?: string
  formerRoleCategory?: string
  assignmentClaimRef?: string
  captureOutcomeId?: string
  movementId?: string
  procedureExecutionKey?: string
  pendingCorrectiveAction?: string
  incidentOwnerHint?: string
  terminalReport?: BreachRecoveryTerminalReport
}>

export type FacilityBreachOriginRecoveries = Readonly<Record<BreachRecoveryId, BreachRecoveryRecord>>

export type BreachRecoveryExplainability = Readonly<{
  recoveryId: BreachRecoveryId
  subjectRef: string
  stage: BreachRecoveryStage
  reasonCodes: readonly BreachRecoveryReasonCode[]
  pendingCorrectiveAction?: string
  physicalEffectsOccurred: boolean
  terminalOutcomeReported: boolean
  outcome: 'in_progress' | BreachRecoveryTerminalOutcome
}>

export type BreachRecoveryResult =
  | { ok: true; recovery: BreachRecoveryRecord; state?: GameState }
  | {
      ok: false
      recovery?: BreachRecoveryRecord
      state?: GameState
      code: BreachRecoveryReasonCode
      reasonCodes: readonly BreachRecoveryReasonCode[]
    }

const ACTIVE_STAGES: ReadonlySet<BreachRecoveryStage> = new Set([
  'escape_reported',
  'recovery_assigned',
  'subject_located',
  'capture_secured',
  'in_transit',
  'admission_pending',
  'containment_verification',
])

const TERMINAL_STAGES: ReadonlySet<BreachRecoveryStage> = new Set([
  'completed',
  'interrupted',
  'lost_contact',
  'capture_failed',
  'transit_interrupted',
  'admission_denied',
  'verification_failed',
  'failed',
])

const isRecord = isPlainRecord
const hasOwnEnumerableProperty = hasOwnEnumerableKey
const isNonEmptyString = isNonEmptyTrimmedString
const compareCodeUnit = compareCodeUnitOrder

function isStage(value: unknown): value is BreachRecoveryStage {
  return BREACH_RECOVERY_STAGES.some((stage) => stage === value)
}

function isSubjectKind(value: unknown): value is BreachRecoverySubjectKind {
  return BREACH_RECOVERY_SUBJECT_KINDS.some((kind) => kind === value)
}

function isReasonCode(value: unknown): value is BreachRecoveryReasonCode {
  return BREACH_RECOVERY_REASON_CODES.some((reason) => reason === value)
}

function isTerminalOutcome(value: unknown): value is BreachRecoveryTerminalOutcome {
  return (
    value === 'completed' ||
    value === 'verification_failed' ||
    value === 'capture_failed' ||
    value === 'admission_denied' ||
    value === 'lost_contact' ||
    value === 'transit_interrupted' ||
    value === 'failed' ||
    value === 'interrupted'
  )
}

function freezeRecovery(record: BreachRecoveryRecord): BreachRecoveryRecord {
  return freezeCoordinationRecord(record)
}

function sortUniqueReasons(
  reasons: readonly BreachRecoveryReasonCode[]
): readonly BreachRecoveryReasonCode[] {
  return sortUniqueCodes(reasons)
}

function withAppliedKey(record: BreachRecoveryRecord, operationKey: string): readonly string[] {
  return withSortedAppliedKey(record.appliedOperationKeys, operationKey)
}

function parseOptionalString(
  value: Record<string, unknown>,
  key: string
): string | undefined | 'invalid' {
  if (!hasOwnEnumerableProperty(value, key)) return undefined
  if (!isNonEmptyString(value[key])) return 'invalid'
  return (value[key] as string).trim()
}

function parseTerminalReport(
  value: unknown,
  expectedRecoveryId: string
): BreachRecoveryTerminalReport | undefined {
  if (!isRecord(value)) return undefined
  if (!isNonEmptyString(value.recoveryId) || value.recoveryId !== expectedRecoveryId) {
    return undefined
  }
  if (!isNonEmptyString(value.subjectRef)) return undefined
  if (!isNonEmptyString(value.incidentCaseRef)) return undefined
  if (!isNonEmptyString(value.liveRegistryEntryId)) return undefined
  if (!isTerminalOutcome(value.outcome)) return undefined
  if (typeof value.week !== 'number' || !Number.isFinite(value.week) || value.week < 0) {
    return undefined
  }
  if (value.reportedOnce !== true) return undefined
  return Object.freeze({
    recoveryId: value.recoveryId.trim(),
    subjectRef: value.subjectRef.trim(),
    incidentCaseRef: value.incidentCaseRef.trim(),
    liveRegistryEntryId: value.liveRegistryEntryId.trim(),
    outcome: value.outcome,
    week: value.week,
    reportedOnce: true as const,
  })
}

function parseRecoveryRecord(
  value: unknown,
  expectedId: BreachRecoveryId
): BreachRecoveryRecord | undefined {
  if (!isRecord(value)) return undefined
  if (!hasOwnEnumerableProperty(value, 'recoveryId') || value.recoveryId !== expectedId) {
    return undefined
  }
  if (!isNonEmptyString(value.recoveryId)) return undefined
  if (!isNonEmptyString(value.subjectRef)) return undefined
  if (!isSubjectKind(value.subjectKind)) return undefined
  if (!isNonEmptyString(value.escapeEvidenceRef)) return undefined
  if (!isNonEmptyString(value.incidentCaseRef)) return undefined
  if (!isNonEmptyString(value.recoveryObjectiveRef)) return undefined
  if (!isNonEmptyString(value.destinationNodeId)) return undefined
  if (!isStage(value.stage)) return undefined
  if (typeof value.physicalEffectsOccurred !== 'boolean') return undefined
  if (typeof value.terminalOutcomeReported !== 'boolean') return undefined
  if (!Array.isArray(value.reasonCodes) || !Array.isArray(value.appliedOperationKeys)) {
    return undefined
  }

  const reasonCodes: BreachRecoveryReasonCode[] = []
  for (const reason of value.reasonCodes) {
    if (!isReasonCode(reason)) return undefined
    reasonCodes.push(reason)
  }
  const appliedOperationKeys: string[] = []
  for (const key of value.appliedOperationKeys) {
    if (!isNonEmptyString(key)) return undefined
    appliedOperationKeys.push(key.trim())
  }

  const destinationZoneRef = parseOptionalString(value, 'destinationZoneRef')
  if (destinationZoneRef === 'invalid') return undefined
  const custodyStatusId = parseOptionalString(value, 'custodyStatusId')
  if (custodyStatusId === 'invalid') return undefined
  const formerRoleCategory = parseOptionalString(value, 'formerRoleCategory')
  if (formerRoleCategory === 'invalid') return undefined
  const assignmentClaimRef = parseOptionalString(value, 'assignmentClaimRef')
  if (assignmentClaimRef === 'invalid') return undefined
  const captureOutcomeId = parseOptionalString(value, 'captureOutcomeId')
  if (captureOutcomeId === 'invalid') return undefined
  const movementId = parseOptionalString(value, 'movementId')
  if (movementId === 'invalid') return undefined
  const procedureExecutionKey = parseOptionalString(value, 'procedureExecutionKey')
  if (procedureExecutionKey === 'invalid') return undefined
  const pendingCorrectiveAction = parseOptionalString(value, 'pendingCorrectiveAction')
  if (pendingCorrectiveAction === 'invalid') return undefined
  const incidentOwnerHint = parseOptionalString(value, 'incidentOwnerHint')
  if (incidentOwnerHint === 'invalid') return undefined

  let terminalReport: BreachRecoveryTerminalReport | undefined
  if (hasOwnEnumerableProperty(value, 'terminalReport')) {
    terminalReport = parseTerminalReport(value.terminalReport, expectedId)
    if (terminalReport === undefined) return undefined
  }

  if (value.subjectKind === 'person') {
    if (custodyStatusId === undefined || formerRoleCategory === undefined) return undefined
  } else if (custodyStatusId !== undefined || formerRoleCategory !== undefined) {
    return undefined
  }

  if (value.terminalOutcomeReported === true && terminalReport === undefined) return undefined
  if (value.terminalOutcomeReported === false && terminalReport !== undefined) return undefined
  if (ACTIVE_STAGES.has(value.stage) && value.terminalOutcomeReported) return undefined
  if (TERMINAL_STAGES.has(value.stage) && !value.terminalOutcomeReported) return undefined
  if (terminalReport !== undefined) {
    if (terminalReport.subjectRef !== value.subjectRef.trim()) return undefined
    if (terminalReport.incidentCaseRef !== value.incidentCaseRef.trim()) return undefined
    if (terminalReport.liveRegistryEntryId !== value.escapeEvidenceRef.trim()) return undefined
    if (value.stage === 'completed' && terminalReport.outcome !== 'completed') return undefined
    if (value.stage !== 'completed' && terminalReport.outcome === 'completed') return undefined
  }

  return freezeRecovery({
    recoveryId: value.recoveryId.trim(),
    subjectRef: value.subjectRef.trim(),
    subjectKind: value.subjectKind,
    escapeEvidenceRef: value.escapeEvidenceRef.trim(),
    incidentCaseRef: value.incidentCaseRef.trim(),
    recoveryObjectiveRef: value.recoveryObjectiveRef.trim(),
    destinationNodeId: value.destinationNodeId.trim(),
    stage: value.stage,
    reasonCodes: sortUniqueReasons(reasonCodes),
    appliedOperationKeys: Object.freeze([...appliedOperationKeys].sort(compareCodeUnit)),
    physicalEffectsOccurred: value.physicalEffectsOccurred,
    terminalOutcomeReported: value.terminalOutcomeReported,
    ...(destinationZoneRef !== undefined ? { destinationZoneRef } : {}),
    ...(custodyStatusId !== undefined ? { custodyStatusId } : {}),
    ...(formerRoleCategory !== undefined ? { formerRoleCategory } : {}),
    ...(assignmentClaimRef !== undefined ? { assignmentClaimRef } : {}),
    ...(captureOutcomeId !== undefined ? { captureOutcomeId } : {}),
    ...(movementId !== undefined ? { movementId } : {}),
    ...(procedureExecutionKey !== undefined ? { procedureExecutionKey } : {}),
    ...(pendingCorrectiveAction !== undefined ? { pendingCorrectiveAction } : {}),
    ...(incidentOwnerHint !== undefined ? { incidentOwnerHint } : {}),
    ...(terminalReport !== undefined ? { terminalReport } : {}),
  })
}

function upsertRecovery(state: GameState | undefined, recovery: BreachRecoveryRecord): GameState | undefined {
  if (state === undefined) return undefined
  const current = state.facilityBreachOriginRecoveries ?? {}
  return writeOptionalFacilityMapField(
    state,
    'facilityBreachOriginRecoveries',
    Object.freeze({ ...current, [recovery.recoveryId]: recovery })
  )
}

function resolveCurrentRecovery(
  recoveryInput: BreachRecoveryRecord,
  state?: GameState
): BreachRecoveryRecord {
  if (state?.facilityBreachOriginRecoveries !== undefined) {
    const map = parseFacilityBreachOriginRecoveries(state.facilityBreachOriginRecoveries)
    const current = map?.[recoveryInput.recoveryId]
    if (current !== undefined) return current
  }
  return recoveryInput
}

function rejectRecovery(
  code: BreachRecoveryReasonCode,
  recovery?: BreachRecoveryRecord,
  state?: GameState
): BreachRecoveryResult {
  return {
    ok: false,
    recovery,
    state,
    code,
    reasonCodes: Object.freeze([code]),
  }
}

function commitRecovery(
  recovery: BreachRecoveryRecord,
  state?: GameState
): BreachRecoveryResult {
  return { ok: true, recovery, state: upsertRecovery(state, recovery) }
}

type PrepareReady = {
  kind: 'ready'
  recovery: BreachRecoveryRecord
  key: string
}

type PrepareResult = PrepareReady | { kind: 'result'; result: BreachRecoveryResult }

function prepareMutation(
  recoveryInput: BreachRecoveryRecord,
  operationKey: string,
  state: GameState | undefined,
  options: {
    readonly idempotentStages: readonly BreachRecoveryStage[]
    readonly allowedStages: readonly BreachRecoveryStage[]
  }
): PrepareResult {
  if (!isNonEmptyString(operationKey)) {
    return { kind: 'result', result: rejectRecovery('malformed_input', recoveryInput, state) }
  }
  const key = operationKey.trim()
  const recovery = resolveCurrentRecovery(recoveryInput, state)
  if (recovery.appliedOperationKeys.includes(key)) {
    if (options.idempotentStages.some((stage) => stage === recovery.stage)) {
      return { kind: 'result', result: { ok: true, recovery, state } }
    }
    return { kind: 'result', result: rejectRecovery('stale_operation', recovery, state) }
  }
  if (!options.allowedStages.some((stage) => stage === recovery.stage)) {
    return { kind: 'result', result: rejectRecovery('illegal_transition', recovery, state) }
  }
  return { kind: 'ready', recovery, key }
}

function emitTerminalOnce(
  recovery: BreachRecoveryRecord,
  outcome: BreachRecoveryTerminalOutcome,
  week: number,
  operationKey: string
): BreachRecoveryRecord {
  if (recovery.terminalOutcomeReported && recovery.terminalReport !== undefined) {
    return freezeRecovery({
      ...recovery,
      appliedOperationKeys: withAppliedKey(recovery, operationKey),
    })
  }
  const terminalReport: BreachRecoveryTerminalReport = Object.freeze({
    recoveryId: recovery.recoveryId,
    subjectRef: recovery.subjectRef,
    incidentCaseRef: recovery.incidentCaseRef,
    liveRegistryEntryId: recovery.escapeEvidenceRef,
    outcome,
    week,
    reportedOnce: true as const,
  })
  return freezeRecovery({
    ...recovery,
    terminalOutcomeReported: true,
    terminalReport,
    appliedOperationKeys: withAppliedKey(recovery, operationKey),
    pendingCorrectiveAction: undefined,
    incidentOwnerHint: recovery.incidentOwnerHint ?? 'incident',
  })
}

/**
 * Build authoritative escape evidence from a live-registry contained→loose transition.
 */
export function buildBreachEscapeEvidenceFromLiveRegistry(
  previous: LiveRegistryEntry,
  next: LiveRegistryEntry,
  incidentCaseRef: string
): BreachEscapeEvidence | undefined {
  if (!isNonEmptyString(incidentCaseRef)) return undefined
  if (previous.id !== next.id) return undefined
  if (previous.operationalState !== 'contained' || next.operationalState !== 'loose') {
    return undefined
  }
  const alerts = deriveRegistryAlerts(previous, next)
  const escape = alerts.find(
    (alert) => alert.type === 'escape' && alert.reasonCode === 'contained-to-loose'
  )
  if (escape === undefined) return undefined
  const subjectRef = isNonEmptyString(next.entityId) ? next.entityId.trim() : next.id.trim()
  return Object.freeze({
    subjectRef,
    liveRegistryEntryId: next.id.trim(),
    escapeAlertType: 'escape' as const,
    escapeReasonCode: 'contained-to-loose' as const,
    fromOperationalState: 'contained' as const,
    toOperationalState: 'loose' as const,
    week: escape.week,
    incidentCaseRef: incidentCaseRef.trim(),
  })
}

/**
 * Direct loose→contained / `recaptured` patches cannot complete SPE-3735 recovery.
 */
export function isForbiddenDirectRecapturePatch(input: {
  readonly fromOperationalState: LiveRegistryOperationalState
  readonly toOperationalState: LiveRegistryOperationalState
  readonly reasonCode: string
}): boolean {
  return (
    input.fromOperationalState === 'loose' &&
    input.toOperationalState === 'contained' &&
    (input.reasonCode === 'recaptured' ||
      input.reasonCode === 'status-patch' ||
      input.reasonCode === 'voice-report')
  )
}

export function createBreachOriginRecovery(
  input: {
    readonly recoveryId: string
    readonly escapeEvidence: BreachEscapeEvidence
    readonly subjectKind: BreachRecoverySubjectKind
    readonly recoveryObjectiveRef: string
    readonly destinationNodeId: string
    readonly destinationZoneRef?: string
    readonly operationKey: string
    readonly custodyStatusId?: string
    readonly formerRoleCategory?: string
    /** Forbidden completion path — always rejected. */
    readonly statusPatchComplete?: boolean
  },
  state?: GameState
): BreachRecoveryResult {
  if (input.statusPatchComplete === true) {
    return rejectRecovery('status_patch_forbidden', undefined, state)
  }
  if (
    !isNonEmptyString(input.recoveryId) ||
    !isNonEmptyString(input.operationKey) ||
    !isNonEmptyString(input.recoveryObjectiveRef) ||
    !isNonEmptyString(input.destinationNodeId) ||
    !isSubjectKind(input.subjectKind)
  ) {
    return rejectRecovery('malformed_input', undefined, state)
  }
  const evidence = input.escapeEvidence
  if (
    evidence === undefined ||
    evidence.escapeAlertType !== 'escape' ||
    evidence.escapeReasonCode !== 'contained-to-loose' ||
    evidence.fromOperationalState !== 'contained' ||
    evidence.toOperationalState !== 'loose' ||
    !isNonEmptyString(evidence.subjectRef) ||
    !isNonEmptyString(evidence.liveRegistryEntryId) ||
    !isNonEmptyString(evidence.incidentCaseRef)
  ) {
    return rejectRecovery('escape_not_authoritative', undefined, state)
  }

  if (input.subjectKind === 'unresolved') {
    return rejectRecovery('custody_unresolved', undefined, state)
  }
  if (input.subjectKind === 'person') {
    if (!isNonEmptyString(input.custodyStatusId) || !isNonEmptyString(input.formerRoleCategory)) {
      return rejectRecovery('custody_unresolved', undefined, state)
    }
  } else if (
    isNonEmptyString(input.custodyStatusId) ||
    isNonEmptyString(input.formerRoleCategory)
  ) {
    return rejectRecovery('custody_unresolved', undefined, state)
  }

  const recoveryId = input.recoveryId.trim()
  if (state?.facilityBreachOriginRecoveries?.[recoveryId] !== undefined) {
    const existing = resolveCurrentRecovery(
      state.facilityBreachOriginRecoveries[recoveryId] as BreachRecoveryRecord,
      state
    )
    if (existing.appliedOperationKeys.includes(input.operationKey.trim())) {
      return { ok: true, recovery: existing, state }
    }
    return rejectRecovery('stale_operation', existing, state)
  }

  const recovery = freezeRecovery({
    recoveryId,
    subjectRef: evidence.subjectRef.trim(),
    subjectKind: input.subjectKind,
    escapeEvidenceRef: evidence.liveRegistryEntryId.trim(),
    incidentCaseRef: evidence.incidentCaseRef.trim(),
    recoveryObjectiveRef: input.recoveryObjectiveRef.trim(),
    destinationNodeId: input.destinationNodeId.trim(),
    stage: 'escape_reported',
    reasonCodes: Object.freeze([]),
    appliedOperationKeys: withSortedAppliedKey([], input.operationKey.trim()),
    physicalEffectsOccurred: false,
    terminalOutcomeReported: false,
    ...(isNonEmptyString(input.destinationZoneRef)
      ? { destinationZoneRef: input.destinationZoneRef.trim() }
      : {}),
    ...(input.subjectKind === 'person'
      ? {
          custodyStatusId: input.custodyStatusId!.trim(),
          formerRoleCategory: input.formerRoleCategory!.trim(),
        }
      : {}),
  })
  return commitRecovery(recovery, state)
}

export function assignBreachRecovery(
  recoveryInput: BreachRecoveryRecord,
  input: {
    readonly operationKey: string
    readonly assignmentClaim: AssignmentClaimEvidence
    readonly respondWorkItem: RegistryWorkItem
  },
  state?: GameState
): BreachRecoveryResult {
  const prepared = prepareMutation(recoveryInput, input.operationKey, state, {
    idempotentStages: ['recovery_assigned'],
    allowedStages: ['escape_reported'],
  })
  if (prepared.kind !== 'ready') return prepared.result
  const { recovery, key } = prepared
  const claim = input.assignmentClaim
  if (claim === undefined || !isNonEmptyString(claim.claimId)) {
    return rejectRecovery('assignment_claim_missing', recovery, state)
  }
  if (claim.producerOwner !== 'SPE-3055') {
    return rejectRecovery('assignment_claim_producer_invalid', recovery, state)
  }
  if (claim.claimed !== true) {
    return rejectRecovery('assignment_claim_not_held', recovery, state)
  }
  const workItem = input.respondWorkItem
  if (
    workItem === undefined ||
    workItem.kind !== 'respond' ||
    workItem.entryId !== recovery.escapeEvidenceRef ||
    !isNonEmptyString(workItem.id)
  ) {
    return rejectRecovery('respond_work_item_invalid', recovery, state)
  }
  return commitRecovery(
    freezeRecovery({
      ...recovery,
      stage: 'recovery_assigned',
      assignmentClaimRef: claim.claimId.trim(),
      appliedOperationKeys: withAppliedKey(recovery, key),
      pendingCorrectiveAction: 'locate_escaped_subject',
    }),
    state
  )
}

export function confirmSubjectLocated(
  recoveryInput: BreachRecoveryRecord,
  input: { readonly operationKey: string; readonly locatedCommitted: boolean },
  state?: GameState
): BreachRecoveryResult {
  const prepared = prepareMutation(recoveryInput, input.operationKey, state, {
    idempotentStages: ['subject_located'],
    allowedStages: ['recovery_assigned'],
  })
  if (prepared.kind !== 'ready') return prepared.result
  if (!input.locatedCommitted) {
    return rejectRecovery('located_not_committed', prepared.recovery, state)
  }
  return commitRecovery(
    freezeRecovery({
      ...prepared.recovery,
      stage: 'subject_located',
      appliedOperationKeys: withAppliedKey(prepared.recovery, prepared.key),
      pendingCorrectiveAction: 'await_capture_secure_evidence',
    }),
    state
  )
}

export function confirmCaptureSecure(
  recoveryInput: BreachRecoveryRecord,
  input: {
    readonly operationKey: string
    readonly captureEvidence: CaptureSecureEvidence
    readonly week: number
  },
  state?: GameState
): BreachRecoveryResult {
  if (
    typeof input.week !== 'number' ||
    !Number.isFinite(input.week) ||
    !Number.isInteger(input.week) ||
    input.week < 0
  ) {
    return rejectRecovery('malformed_input', recoveryInput, state)
  }
  const prepared = prepareMutation(recoveryInput, input.operationKey, state, {
    idempotentStages: ['capture_secured', 'capture_failed'],
    allowedStages: ['subject_located'],
  })
  if (prepared.kind !== 'ready') return prepared.result
  const { recovery, key } = prepared
  const evidence = input.captureEvidence
  if (evidence === undefined || !isNonEmptyString(evidence.outcomeId)) {
    return rejectRecovery('capture_evidence_missing', recovery, state)
  }
  if (evidence.producerOwner !== 'SPE-104') {
    return rejectRecovery('capture_producer_invalid', recovery, state)
  }
  if (evidence.subjectRef !== recovery.subjectRef) {
    return rejectRecovery('capture_evidence_missing', recovery, state)
  }
  if (!evidence.secured) {
    const failed = emitTerminalOnce(
      freezeRecovery({
        ...recovery,
        stage: 'capture_failed',
        reasonCodes: sortUniqueReasons(['capture_not_secured']),
        captureOutcomeId: evidence.outcomeId.trim(),
        physicalEffectsOccurred: true,
        pendingCorrectiveAction: 'retry_capture_or_route_response',
        incidentOwnerHint: recovery.incidentOwnerHint ?? 'response',
      }),
      'capture_failed',
      input.week,
      key
    )
    return {
      ok: false,
      recovery: failed,
      code: 'capture_not_secured',
      reasonCodes: failed.reasonCodes,
      state: upsertRecovery(state, failed),
    }
  }
  return commitRecovery(
    freezeRecovery({
      ...recovery,
      stage: 'capture_secured',
      captureOutcomeId: evidence.outcomeId.trim(),
      physicalEffectsOccurred: true,
      appliedOperationKeys: withAppliedKey(recovery, key),
      pendingCorrectiveAction: 'await_canonical_movement',
      reasonCodes: Object.freeze([]),
    }),
    state
  )
}

export function confirmRecoveryMovement(
  recoveryInput: BreachRecoveryRecord,
  input: {
    readonly operationKey: string
    readonly movementEvidence: RecoveryMovementEvidence
  },
  state?: GameState
): BreachRecoveryResult {
  const prepared = prepareMutation(recoveryInput, input.operationKey, state, {
    idempotentStages: ['admission_pending', 'in_transit'],
    allowedStages: ['capture_secured', 'in_transit'],
  })
  if (prepared.kind !== 'ready') return prepared.result
  const { recovery, key } = prepared
  const evidence = input.movementEvidence
  if (evidence === undefined || !isNonEmptyString(evidence.movementId)) {
    return rejectRecovery('movement_evidence_missing', recovery, state)
  }
  if (evidence.producerOwner !== 'SPE-1095') {
    return rejectRecovery('movement_producer_invalid', recovery, state)
  }
  if (evidence.subjectRef !== recovery.subjectRef) {
    return rejectRecovery('movement_evidence_missing', recovery, state)
  }
  if (!evidence.movementCommitted) {
    return rejectRecovery('movement_not_committed', recovery, state)
  }
  if (!evidence.arrivedAtDestination) {
    return commitRecovery(
      freezeRecovery({
        ...recovery,
        stage: 'in_transit',
        movementId: evidence.movementId.trim(),
        physicalEffectsOccurred: true,
        appliedOperationKeys: withAppliedKey(recovery, key),
        pendingCorrectiveAction: 'await_arrival_then_admission',
      }),
      state
    )
  }
  return commitRecovery(
    freezeRecovery({
      ...recovery,
      stage: 'admission_pending',
      movementId: evidence.movementId.trim(),
      physicalEffectsOccurred: true,
      appliedOperationKeys: withAppliedKey(recovery, key),
      pendingCorrectiveAction: 'await_destination_admission',
      reasonCodes: Object.freeze([]),
    }),
    state
  )
}

export function confirmDestinationAdmission(
  recoveryInput: BreachRecoveryRecord,
  input: {
    readonly operationKey: string
    readonly admissionCommitted: boolean
    readonly coLocation: CoLocationPlacementRequest
    readonly week: number
    readonly inboundScreen?: unknown
  },
  state?: GameState
): BreachRecoveryResult {
  if (
    typeof input.week !== 'number' ||
    !Number.isFinite(input.week) ||
    !Number.isInteger(input.week) ||
    input.week < 0
  ) {
    return rejectRecovery('malformed_input', recoveryInput, state)
  }
  const prepared = prepareMutation(recoveryInput, input.operationKey, state, {
    idempotentStages: ['containment_verification', 'admission_denied'],
    allowedStages: ['admission_pending'],
  })
  if (prepared.kind !== 'ready') return prepared.result
  const { recovery, key } = prepared
  if (!input.admissionCommitted) {
    return rejectRecovery('admission_not_committed', recovery, state)
  }

  const coLocation: CoLocationPlacementResult = evaluateContainmentCoLocationPlacement(
    input.coLocation
  )
  if (coLocation.decision === 'rejected') {
    const denied = emitTerminalOnce(
      freezeRecovery({
        ...recovery,
        stage: 'admission_denied',
        reasonCodes: sortUniqueReasons(['incompatible_destination']),
        pendingCorrectiveAction: 'select_compatible_destination',
        incidentOwnerHint: recovery.incidentOwnerHint ?? 'facility',
      }),
      'admission_denied',
      input.week,
      key
    )
    return {
      ok: false,
      recovery: denied,
      code: 'incompatible_destination',
      reasonCodes: denied.reasonCodes,
      state: upsertRecovery(state, denied),
    }
  }

  let inboundScreen: OutboundScreenResult | undefined
  if (input.inboundScreen !== undefined) {
    inboundScreen = resolveOutboundScreening(input.inboundScreen)
    if (inboundScreen === undefined || inboundScreen.decision !== 'clear') {
      const denied = emitTerminalOnce(
        freezeRecovery({
          ...recovery,
          stage: 'admission_denied',
          reasonCodes: sortUniqueReasons(['inbound_screen_blocked']),
          pendingCorrectiveAction: 'clear_inbound_screen',
          incidentOwnerHint: recovery.incidentOwnerHint ?? 'facility',
        }),
        'admission_denied',
        input.week,
        key
      )
      return {
        ok: false,
        recovery: denied,
        code: 'inbound_screen_blocked',
        reasonCodes: denied.reasonCodes,
        state: upsertRecovery(state, denied),
      }
    }
  }

  return commitRecovery(
    freezeRecovery({
      ...recovery,
      stage: 'containment_verification',
      appliedOperationKeys: withAppliedKey(recovery, key),
      pendingCorrectiveAction: 'await_containment_verification',
      reasonCodes: Object.freeze([]),
    }),
    state
  )
}

export function confirmContainmentVerification(
  recoveryInput: BreachRecoveryRecord,
  input: {
    readonly operationKey: string
    readonly recontainmentVerified: boolean
    readonly week: number
    readonly procedureAdapter?: ProcedureToActionAdapterInput
  },
  state?: GameState
): BreachRecoveryResult {
  const prepared = prepareMutation(recoveryInput, input.operationKey, state, {
    idempotentStages: ['completed', 'verification_failed'],
    allowedStages: ['containment_verification'],
  })
  if (prepared.kind !== 'ready') return prepared.result
  const { recovery, key } = prepared

  if (!input.recontainmentVerified) {
    const failed = emitTerminalOnce(
      freezeRecovery({
        ...recovery,
        stage: 'verification_failed',
        reasonCodes: sortUniqueReasons(['recontainment_not_verified']),
        pendingCorrectiveAction: 'retry_verification_or_route_incident',
        incidentOwnerHint: recovery.incidentOwnerHint ?? 'facility',
      }),
      'verification_failed',
      input.week,
      key
    )
    return {
      ok: false,
      recovery: failed,
      code: 'recontainment_not_verified',
      reasonCodes: failed.reasonCodes,
      state: upsertRecovery(state, failed),
    }
  }

  if (input.procedureAdapter !== undefined) {
    const readiness = evaluateCanonicalProcedureExecutionReadiness(input.procedureAdapter)
    if (!readiness.ok) {
      return rejectRecovery('procedure_not_ready', recovery, state)
    }
  }

  const completed = emitTerminalOnce(
    freezeRecovery({
      ...recovery,
      stage: 'completed',
      reasonCodes: Object.freeze([]),
      physicalEffectsOccurred: true,
      ...(input.procedureAdapter !== undefined
        ? { procedureExecutionKey: input.procedureAdapter.executionKey }
        : {}),
    }),
    'completed',
    input.week,
    key
  )
  return commitRecovery(completed, state)
}

export function reportLostContact(
  recoveryInput: BreachRecoveryRecord,
  input: {
    readonly operationKey: string
    readonly week: number
    readonly incidentOwnerHint?: string
  },
  state?: GameState
): BreachRecoveryResult {
  const prepared = prepareMutation(recoveryInput, input.operationKey, state, {
    idempotentStages: ['lost_contact'],
    allowedStages: ['recovery_assigned', 'subject_located', 'capture_secured', 'in_transit'],
  })
  if (prepared.kind !== 'ready') return prepared.result
  const lost = emitTerminalOnce(
    freezeRecovery({
      ...prepared.recovery,
      stage: 'lost_contact',
      reasonCodes: sortUniqueReasons(['lost_contact']),
      pendingCorrectiveAction: 'resume_search_via_response_owner',
      incidentOwnerHint:
        (isNonEmptyString(input.incidentOwnerHint) ? input.incidentOwnerHint.trim() : undefined) ??
        prepared.recovery.incidentOwnerHint ??
        'response',
    }),
    'lost_contact',
    input.week,
    prepared.key
  )
  return commitRecovery(lost, state)
}

export function interruptBreachRecovery(
  recoveryInput: BreachRecoveryRecord,
  input: {
    readonly operationKey: string
    readonly week: number
    readonly incidentOwnerHint?: string
  },
  state?: GameState
): BreachRecoveryResult {
  const recovery = resolveCurrentRecovery(recoveryInput, state)
  if (!isNonEmptyString(input.operationKey)) {
    return rejectRecovery('malformed_input', recovery, state)
  }
  const key = input.operationKey.trim()
  if (recovery.appliedOperationKeys.includes(key) && TERMINAL_STAGES.has(recovery.stage)) {
    return { ok: true, recovery, state }
  }
  if (TERMINAL_STAGES.has(recovery.stage) && recovery.stage !== 'interrupted') {
    return rejectRecovery('illegal_transition', recovery, state)
  }
  if (recovery.physicalEffectsOccurred) {
    const failed = emitTerminalOnce(
      freezeRecovery({
        ...recovery,
        stage: 'failed',
        reasonCodes: sortUniqueReasons(['interrupted_after_effects']),
        pendingCorrectiveAction: 'preserve_effects_route_incident',
        incidentOwnerHint:
          (isNonEmptyString(input.incidentOwnerHint) ? input.incidentOwnerHint.trim() : undefined) ??
          recovery.incidentOwnerHint ??
          'incident',
      }),
      'failed',
      input.week,
      key
    )
    return commitRecovery(failed, state)
  }
  const aborted = emitTerminalOnce(
    freezeRecovery({
      ...recovery,
      stage: 'interrupted',
      reasonCodes: sortUniqueReasons(['aborted_before_effects']),
      pendingCorrectiveAction: 'reopen_recovery_if_escape_persists',
      incidentOwnerHint:
        (isNonEmptyString(input.incidentOwnerHint) ? input.incidentOwnerHint.trim() : undefined) ??
        recovery.incidentOwnerHint ??
        'response',
    }),
    'interrupted',
    input.week,
    key
  )
  return commitRecovery(aborted, state)
}

/**
 * Apply verified recovery completion to live registry. Forbidden status patches
 * (`recaptured` / voice report) are rejected; only completed recovery with a
 * terminal report may restore contained.
 */
export function applyBreachRecoveryTerminalToLiveRegistry(
  entry: LiveRegistryEntry,
  recovery: BreachRecoveryRecord,
  week: number
):
  | { ok: true; entry: LiveRegistryEntry; report: BreachRecoveryTerminalReport }
  | { ok: false; code: BreachRecoveryReasonCode } {
  if (recovery.stage !== 'completed' || !recovery.terminalOutcomeReported) {
    return { ok: false, code: 'illegal_transition' }
  }
  if (recovery.terminalReport === undefined || recovery.terminalReport.outcome !== 'completed') {
    return { ok: false, code: 'malformed_input' }
  }
  if (entry.id !== recovery.escapeEvidenceRef) {
    return { ok: false, code: 'malformed_input' }
  }
  const next = updateLiveRegistryEntry(entry, {
    operationalState: 'contained',
    week,
    reasonCode: 'breach-recovery-verified',
    triggerSource: recovery.recoveryId,
  })
  return { ok: true, entry: next, report: recovery.terminalReport }
}

export function parseFacilityBreachOriginRecoveries(
  value: unknown
): FacilityBreachOriginRecoveries | undefined {
  return parseFacilityRecordMap(value, parseRecoveryRecord)
}

export function projectExplainableBreachRecovery(
  recovery: BreachRecoveryRecord
): BreachRecoveryExplainability {
  let outcome: BreachRecoveryExplainability['outcome'] = 'in_progress'
  if (recovery.stage === 'completed') outcome = 'completed'
  else if (recovery.stage === 'verification_failed') outcome = 'verification_failed'
  else if (recovery.stage === 'capture_failed') outcome = 'capture_failed'
  else if (recovery.stage === 'admission_denied') outcome = 'admission_denied'
  else if (recovery.stage === 'lost_contact') outcome = 'lost_contact'
  else if (recovery.stage === 'transit_interrupted') outcome = 'transit_interrupted'
  else if (recovery.stage === 'failed') outcome = 'failed'
  else if (recovery.stage === 'interrupted') outcome = 'interrupted'

  return Object.freeze({
    recoveryId: recovery.recoveryId,
    subjectRef: recovery.subjectRef,
    stage: recovery.stage,
    reasonCodes: recovery.reasonCodes,
    physicalEffectsOccurred: recovery.physicalEffectsOccurred,
    terminalOutcomeReported: recovery.terminalOutcomeReported,
    outcome,
    ...(recovery.pendingCorrectiveAction !== undefined
      ? { pendingCorrectiveAction: recovery.pendingCorrectiveAction }
      : {}),
  })
}

export function isBreachRecoveryActive(stage: BreachRecoveryStage): boolean {
  return ACTIVE_STAGES.has(stage)
}

export function isBreachRecoveryTerminal(stage: BreachRecoveryStage): boolean {
  return TERMINAL_STAGES.has(stage)
}
