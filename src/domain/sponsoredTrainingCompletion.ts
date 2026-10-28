/**
 * SPE-3124 — sponsored training completion and personnel transfer (pure domain).
 *
 * Deterministic completion/cancellation for externally sponsored personnel-development
 * assignments. Permanent inter-agency personnel ownership mutations route exclusively
 * through SPE-2738 `completeOwnershipTransfer`. Assignment lifecycle vocabulary aligns
 * with SPE-2794 (local enums until parent ships). SPE-14 training authority is consumed
 * as producer fixture refs only.
 */

import type { InterAgencyOwnershipTransferState, TransferAttemptResult } from './interAgencyOwnershipTransfer'
import {
  authorizeTransferRequest,
  completeOwnershipTransfer,
  createEmptyInterAgencyOwnershipTransferState,
} from './interAgencyOwnershipTransfer'

export const SPONSORED_TRAINING_COMPLETION_OWNER = 'SPE-3124' as const
export const SPONSORED_TRAINING_COMPLETION_SCHEMA_VERSION = 'spe-3124.v1' as const
export const SPONSORED_TRAINING_COMPLETION_MAX_ASSIGNMENTS = 128 as const

/** SPE-2794-shaped lifecycle states (local contract; parent is lifecycle owner). */
export const SPONSORED_ASSIGNMENT_LIFECYCLE_STATES = [
  'active',
  'paused',
  'blocked',
  'canceled',
  'completed',
  'commitment_locked',
] as const
export type SponsoredAssignmentLifecycleState =
  (typeof SPONSORED_ASSIGNMENT_LIFECYCLE_STATES)[number]

export const SPONSORED_COMPLETION_BRANCHES = ['retain_graduate', 'transfer_ownership'] as const
export type SponsoredCompletionBranch = (typeof SPONSORED_COMPLETION_BRANCHES)[number]

export const SPONSORED_CLOSEOUT_COMMAND_KINDS = [
  'complete_success',
  'fail_qualification',
  'cancel_voluntary',
  'cancel_target_unavailable',
  'invalidate_target',
] as const
export type SponsoredCloseoutCommandKind = (typeof SPONSORED_CLOSEOUT_COMMAND_KINDS)[number]

export const SPONSORED_OUTCOME_KINDS = [
  'retained_completion',
  'transfer_completion',
  'qualification_failure',
  'voluntary_cancellation',
  'target_unavailable_cancellation',
  'target_invalidation',
] as const
export type SponsoredOutcomeKind = (typeof SPONSORED_OUTCOME_KINDS)[number]

export const SPONSORED_CLOSEOUT_REJECTION_REASONS = [
  'malformed_command',
  'assignment_not_found',
  'assignment_not_active',
  'commitment_locked',
  'duplicate_trainee_assignment',
  'assignment_already_registered',
  'assignment_capacity_exceeded',
  'transfer_branch_misconfigured',
  'ownership_transfer_rejected',
  'closeout_conflict',
  'prototype_id',
] as const
export type SponsoredCloseoutRejectionReason =
  (typeof SPONSORED_CLOSEOUT_REJECTION_REASONS)[number]

export interface SponsoredOutcomeTierRefs {
  readonly paymentRef: string
  readonly reimbursementRef: string
  readonly relationshipConsequenceRef: string
}

export interface SponsoredTrainingAssignment {
  readonly id: string
  readonly traineePersonId: string
  /** SPE-2738 personnel asset id when completion branch may transfer ownership. */
  readonly personnelAssetId?: string
  readonly sponsoringAgencyId: string
  readonly beneficiaryAgencyId: string
  readonly qualificationTargetRef: string
  readonly completionBranch: SponsoredCompletionBranch
  readonly outcomeTierIndex: number
  readonly outcomeTiers: readonly SponsoredOutcomeTierRefs[]
  readonly failureConsequenceRef: string
  readonly voluntaryAbandonmentPenaltyRef: string
  readonly targetUnavailableConsequenceRef: string
  readonly transferAuthorizationRef: string
  readonly lifecycleState: SponsoredAssignmentLifecycleState
  readonly traineeOffRoster: boolean
  readonly registeredAtWeek: number
}

export interface SponsoredTrainingOutcomeRecord {
  readonly closeoutId: string
  readonly assignmentId: string
  readonly outcomeKind: SponsoredOutcomeKind
  readonly authoritativeWeek: number
  readonly lifecycleTerminal: 'completed' | 'canceled'
  readonly ownershipTransferRequestId?: string
  readonly ownershipTransferProvenanceEntryId?: string
  readonly paymentAppliedRef?: string
  readonly reimbursementAppliedRef?: string
  readonly relationshipConsequenceAppliedRef?: string
  readonly failureConsequenceAppliedRef?: string
  readonly cancellationConsequenceRef?: string
  readonly abandonmentPenaltyApplied: boolean
}

export interface SponsoredTrainingCompletionState {
  readonly schemaVersion: typeof SPONSORED_TRAINING_COMPLETION_SCHEMA_VERSION
  readonly assignments: Readonly<Record<string, SponsoredTrainingAssignment>>
  readonly appliedCloseouts: Readonly<Record<string, SponsoredTrainingOutcomeRecord>>
  /** Trainee person ids with a non-terminal sponsored assignment (spawn guard). */
  readonly activeTraineePersonIds: Readonly<Record<string, string>>
}

export interface SponsoredCloseoutCommand {
  readonly kind: SponsoredCloseoutCommandKind
  readonly closeoutId: string
  readonly assignmentId: string
  readonly authoritativeWeek: number
}

export interface SponsoredRegistrationResult {
  readonly outcome: 'applied' | 'rejected'
  readonly reasonCode: SponsoredCloseoutRejectionReason | 'applied'
  readonly state: SponsoredTrainingCompletionState
}

export interface SponsoredCloseoutResult {
  readonly outcome: 'applied' | 'rejected' | 'idempotent_replay'
  readonly reasonCode: SponsoredCloseoutRejectionReason | 'applied' | 'idempotent_replay'
  readonly trainingState: SponsoredTrainingCompletionState
  readonly ownershipState: InterAgencyOwnershipTransferState
  readonly outcomeRecord?: SponsoredTrainingOutcomeRecord
  readonly ownershipTransfer?: TransferAttemptResult
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

function isLifecycleState(value: unknown): value is SponsoredAssignmentLifecycleState {
  return (
    typeof value === 'string' &&
    (SPONSORED_ASSIGNMENT_LIFECYCLE_STATES as readonly string[]).includes(value)
  )
}

function isCompletionBranch(value: unknown): value is SponsoredCompletionBranch {
  return (
    typeof value === 'string' &&
    (SPONSORED_COMPLETION_BRANCHES as readonly string[]).includes(value)
  )
}

function isCloseoutKind(value: unknown): value is SponsoredCloseoutCommandKind {
  return (
    typeof value === 'string' &&
    (SPONSORED_CLOSEOUT_COMMAND_KINDS as readonly string[]).includes(value)
  )
}

function createAssignmentsBag(): Record<string, SponsoredTrainingAssignment> {
  return Object.create(null) as Record<string, SponsoredTrainingAssignment>
}

function createCloseoutsBag(): Record<string, SponsoredTrainingOutcomeRecord> {
  return Object.create(null) as Record<string, SponsoredTrainingOutcomeRecord>
}

function createTraineeBag(): Record<string, string> {
  return Object.create(null) as Record<string, string>
}

function freezeOutcomeTierRefs(tier: SponsoredOutcomeTierRefs): SponsoredOutcomeTierRefs {
  return Object.freeze({
    paymentRef: tier.paymentRef,
    reimbursementRef: tier.reimbursementRef,
    relationshipConsequenceRef: tier.relationshipConsequenceRef,
  })
}

function freezeAssignment(assignment: SponsoredTrainingAssignment): SponsoredTrainingAssignment {
  return Object.freeze({
    id: assignment.id,
    traineePersonId: assignment.traineePersonId,
    sponsoringAgencyId: assignment.sponsoringAgencyId,
    beneficiaryAgencyId: assignment.beneficiaryAgencyId,
    qualificationTargetRef: assignment.qualificationTargetRef,
    completionBranch: assignment.completionBranch,
    outcomeTierIndex: assignment.outcomeTierIndex,
    outcomeTiers: Object.freeze(assignment.outcomeTiers.map((t) => freezeOutcomeTierRefs(t))),
    failureConsequenceRef: assignment.failureConsequenceRef,
    voluntaryAbandonmentPenaltyRef: assignment.voluntaryAbandonmentPenaltyRef,
    targetUnavailableConsequenceRef: assignment.targetUnavailableConsequenceRef,
    transferAuthorizationRef: assignment.transferAuthorizationRef,
    lifecycleState: assignment.lifecycleState,
    traineeOffRoster: assignment.traineeOffRoster,
    registeredAtWeek: assignment.registeredAtWeek,
    ...(assignment.personnelAssetId !== undefined
      ? { personnelAssetId: assignment.personnelAssetId }
      : {}),
  })
}

function freezeOutcomeRecord(record: SponsoredTrainingOutcomeRecord): SponsoredTrainingOutcomeRecord {
  return Object.freeze({
    closeoutId: record.closeoutId,
    assignmentId: record.assignmentId,
    outcomeKind: record.outcomeKind,
    authoritativeWeek: record.authoritativeWeek,
    lifecycleTerminal: record.lifecycleTerminal,
    abandonmentPenaltyApplied: record.abandonmentPenaltyApplied,
    ...(record.ownershipTransferRequestId !== undefined
      ? { ownershipTransferRequestId: record.ownershipTransferRequestId }
      : {}),
    ...(record.ownershipTransferProvenanceEntryId !== undefined
      ? { ownershipTransferProvenanceEntryId: record.ownershipTransferProvenanceEntryId }
      : {}),
    ...(record.paymentAppliedRef !== undefined
      ? { paymentAppliedRef: record.paymentAppliedRef }
      : {}),
    ...(record.reimbursementAppliedRef !== undefined
      ? { reimbursementAppliedRef: record.reimbursementAppliedRef }
      : {}),
    ...(record.relationshipConsequenceAppliedRef !== undefined
      ? { relationshipConsequenceAppliedRef: record.relationshipConsequenceAppliedRef }
      : {}),
    ...(record.failureConsequenceAppliedRef !== undefined
      ? { failureConsequenceAppliedRef: record.failureConsequenceAppliedRef }
      : {}),
    ...(record.cancellationConsequenceRef !== undefined
      ? { cancellationConsequenceRef: record.cancellationConsequenceRef }
      : {}),
  })
}

function assertSafeId(key: string, label: string): void {
  if (!isSafeId(key)) {
    throw new Error(`SPE-3124 invariant: unsafe ${label} id ${JSON.stringify(key)}`)
  }
}

function freezeTrainingState(
  state: SponsoredTrainingCompletionState,
): SponsoredTrainingCompletionState {
  const assignments = createAssignmentsBag()
  for (const [key, assignment] of Object.entries(state.assignments)) {
    assertSafeId(key, 'assignment')
    assignments[key] = freezeAssignment(assignment)
  }

  const appliedCloseouts = createCloseoutsBag()
  for (const [key, record] of Object.entries(state.appliedCloseouts)) {
    assertSafeId(key, 'closeout')
    appliedCloseouts[key] = freezeOutcomeRecord(record)
  }

  const activeTraineePersonIds = createTraineeBag()
  for (const [key, assignmentId] of Object.entries(state.activeTraineePersonIds)) {
    assertSafeId(key, 'traineePerson')
    assertSafeId(assignmentId, 'activeTraineeAssignment')
    activeTraineePersonIds[key] = assignmentId
  }

  return Object.freeze({
    schemaVersion: SPONSORED_TRAINING_COMPLETION_SCHEMA_VERSION,
    assignments: Object.freeze(assignments),
    appliedCloseouts: Object.freeze(appliedCloseouts),
    activeTraineePersonIds: Object.freeze(activeTraineePersonIds),
  })
}

export function createEmptySponsoredTrainingCompletionState(): SponsoredTrainingCompletionState {
  return freezeTrainingState({
    schemaVersion: SPONSORED_TRAINING_COMPLETION_SCHEMA_VERSION,
    assignments: Object.freeze({}),
    appliedCloseouts: Object.freeze({}),
    activeTraineePersonIds: Object.freeze({}),
  })
}

function parseOutcomeTierRefs(raw: unknown): SponsoredOutcomeTierRefs | null {
  if (!isRecord(raw)) return null
  if (
    !isNonEmptyString(raw.paymentRef) ||
    !isNonEmptyString(raw.reimbursementRef) ||
    !isNonEmptyString(raw.relationshipConsequenceRef)
  ) {
    return null
  }
  return freezeOutcomeTierRefs({
    paymentRef: raw.paymentRef.trim(),
    reimbursementRef: raw.reimbursementRef.trim(),
    relationshipConsequenceRef: raw.relationshipConsequenceRef.trim(),
  })
}

export function parseSponsoredTrainingAssignment(
  raw: unknown,
): SponsoredTrainingAssignment | null {
  if (!isRecord(raw)) return null
  if (!isSafeId(raw.id) || !isSafeId(raw.traineePersonId)) return null
  if (!isSafeId(raw.sponsoringAgencyId) || !isSafeId(raw.beneficiaryAgencyId)) return null
  if (!isNonEmptyString(raw.qualificationTargetRef)) return null
  if (!isCompletionBranch(raw.completionBranch)) return null
  if (!isNonNegativeInt(raw.outcomeTierIndex)) return null
  if (!isNonEmptyString(raw.failureConsequenceRef)) return null
  if (!isNonEmptyString(raw.voluntaryAbandonmentPenaltyRef)) return null
  if (!isNonEmptyString(raw.targetUnavailableConsequenceRef)) return null
  if (!isNonEmptyString(raw.transferAuthorizationRef)) return null
  if (!isNonNegativeInt(raw.registeredAtWeek)) return null

  const lifecycleState =
    raw.lifecycleState === undefined ? 'active' : raw.lifecycleState
  if (!isLifecycleState(lifecycleState)) return null

  const traineeOffRoster = raw.traineeOffRoster === true

  if (!Array.isArray(raw.outcomeTiers) || raw.outcomeTiers.length === 0) return null
  if (raw.outcomeTierIndex >= raw.outcomeTiers.length) return null
  const outcomeTiers: SponsoredOutcomeTierRefs[] = []
  for (const tierRaw of raw.outcomeTiers) {
    const tier = parseOutcomeTierRefs(tierRaw)
    if (!tier) return null
    outcomeTiers.push(tier)
  }

  let personnelAssetId: string | undefined
  if (raw.personnelAssetId !== undefined) {
    if (!isSafeId(raw.personnelAssetId)) return null
    personnelAssetId = raw.personnelAssetId.trim()
  }

  if (raw.completionBranch === 'transfer_ownership' && personnelAssetId === undefined) {
    return null
  }

  return freezeAssignment({
    id: raw.id.trim(),
    traineePersonId: raw.traineePersonId.trim(),
    sponsoringAgencyId: raw.sponsoringAgencyId.trim(),
    beneficiaryAgencyId: raw.beneficiaryAgencyId.trim(),
    qualificationTargetRef: raw.qualificationTargetRef.trim(),
    completionBranch: raw.completionBranch,
    outcomeTierIndex: raw.outcomeTierIndex,
    outcomeTiers: Object.freeze(outcomeTiers),
    failureConsequenceRef: raw.failureConsequenceRef.trim(),
    voluntaryAbandonmentPenaltyRef: raw.voluntaryAbandonmentPenaltyRef.trim(),
    targetUnavailableConsequenceRef: raw.targetUnavailableConsequenceRef.trim(),
    transferAuthorizationRef: raw.transferAuthorizationRef.trim(),
    lifecycleState,
    traineeOffRoster,
    registeredAtWeek: raw.registeredAtWeek,
    ...(personnelAssetId !== undefined ? { personnelAssetId } : {}),
  })
}

export function parseSponsoredTrainingCompletionState(
  raw: unknown,
): SponsoredTrainingCompletionState | null {
  let parsed: unknown = raw
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw) as unknown
    } catch {
      return null
    }
  }
  if (!isRecord(parsed)) return null
  if (parsed.schemaVersion !== SPONSORED_TRAINING_COMPLETION_SCHEMA_VERSION) return null
  if (!isRecord(parsed.assignments) || !isRecord(parsed.appliedCloseouts)) return null
  if (!isRecord(parsed.activeTraineePersonIds)) return null

  const assignments = createAssignmentsBag()
  const keys = (
    Reflect.ownKeys(parsed.assignments).filter((k) => typeof k === 'string') as string[]
  ).sort((a, b) => a.localeCompare(b))
  if (keys.length > SPONSORED_TRAINING_COMPLETION_MAX_ASSIGNMENTS) return null
  for (const key of keys) {
    if (!isSafeId(key)) return null
    const assignment = parseSponsoredTrainingAssignment(parsed.assignments[key])
    if (!assignment || assignment.id !== key) return null
    assignments[key] = assignment
  }

  const appliedCloseouts = createCloseoutsBag()
  const closeoutKeys = (
    Reflect.ownKeys(parsed.appliedCloseouts).filter((k) => typeof k === 'string') as string[]
  ).sort((a, b) => a.localeCompare(b))
  for (const key of closeoutKeys) {
    if (!isSafeId(key)) return null
    const recordRaw = parsed.appliedCloseouts[key]
    if (!isRecord(recordRaw) || !isSafeId(recordRaw.closeoutId)) return null
    if (recordRaw.closeoutId.trim() !== key) return null
    const outcomeKind = recordRaw.outcomeKind
    if (
      typeof outcomeKind !== 'string' ||
      !(SPONSORED_OUTCOME_KINDS as readonly string[]).includes(outcomeKind)
    ) {
      return null
    }
    if (!isSafeId(recordRaw.assignmentId) || !isNonNegativeInt(recordRaw.authoritativeWeek)) {
      return null
    }
    if (recordRaw.lifecycleTerminal !== 'completed' && recordRaw.lifecycleTerminal !== 'canceled') {
      return null
    }
    if (typeof recordRaw.abandonmentPenaltyApplied !== 'boolean') return null
    appliedCloseouts[key] = freezeOutcomeRecord({
      closeoutId: key,
      assignmentId: recordRaw.assignmentId.trim(),
      outcomeKind: outcomeKind as SponsoredOutcomeKind,
      authoritativeWeek: recordRaw.authoritativeWeek,
      lifecycleTerminal: recordRaw.lifecycleTerminal,
      abandonmentPenaltyApplied: recordRaw.abandonmentPenaltyApplied,
      ...(typeof recordRaw.ownershipTransferRequestId === 'string'
        ? { ownershipTransferRequestId: recordRaw.ownershipTransferRequestId.trim() }
        : {}),
      ...(typeof recordRaw.ownershipTransferProvenanceEntryId === 'string'
        ? {
            ownershipTransferProvenanceEntryId:
              recordRaw.ownershipTransferProvenanceEntryId.trim(),
          }
        : {}),
      ...(typeof recordRaw.paymentAppliedRef === 'string'
        ? { paymentAppliedRef: recordRaw.paymentAppliedRef.trim() }
        : {}),
      ...(typeof recordRaw.reimbursementAppliedRef === 'string'
        ? { reimbursementAppliedRef: recordRaw.reimbursementAppliedRef.trim() }
        : {}),
      ...(typeof recordRaw.relationshipConsequenceAppliedRef === 'string'
        ? {
            relationshipConsequenceAppliedRef:
              recordRaw.relationshipConsequenceAppliedRef.trim(),
          }
        : {}),
      ...(typeof recordRaw.failureConsequenceAppliedRef === 'string'
        ? { failureConsequenceAppliedRef: recordRaw.failureConsequenceAppliedRef.trim() }
        : {}),
      ...(typeof recordRaw.cancellationConsequenceRef === 'string'
        ? { cancellationConsequenceRef: recordRaw.cancellationConsequenceRef.trim() }
        : {}),
    })
  }

  // Rebuild trainee occupancy from assignments — refuse stale/empty index drift.
  const activeTraineePersonIds = createTraineeBag()
  const assignmentEntries = Object.entries(assignments).sort(([a], [b]) => a.localeCompare(b))
  for (const [assignmentId, assignment] of assignmentEntries) {
    if (!occupiesTraineeSlot(assignment.lifecycleState)) continue
    const existing = activeTraineePersonIds[assignment.traineePersonId]
    if (existing !== undefined && existing !== assignmentId) return null
    activeTraineePersonIds[assignment.traineePersonId] = assignmentId
  }

  // Optional supplied index must match the rebuilt occupancy (fail closed on drift).
  for (const [personKey, assignmentId] of Object.entries(parsed.activeTraineePersonIds)) {
    if (!isSafeId(personKey) || !isSafeId(assignmentId)) return null
    const personId = personKey.trim()
    const claimedAssignmentId = (assignmentId as string).trim()
    if (activeTraineePersonIds[personId] !== claimedAssignmentId) return null
  }
  for (const personId of Object.keys(activeTraineePersonIds)) {
    if (!Object.prototype.hasOwnProperty.call(parsed.activeTraineePersonIds, personId)) {
      return null
    }
  }

  return freezeTrainingState({
    schemaVersion: SPONSORED_TRAINING_COMPLETION_SCHEMA_VERSION,
    assignments: Object.freeze(assignments),
    appliedCloseouts: Object.freeze(appliedCloseouts),
    activeTraineePersonIds: Object.freeze(activeTraineePersonIds),
  })
}

function isAssignmentCloseable(state: SponsoredAssignmentLifecycleState): boolean {
  return state === 'active' || state === 'paused' || state === 'blocked'
}

/** Non-terminal occupancy — includes commitment_locked (closeout blocked; spawn still blocked). */
function occupiesTraineeSlot(state: SponsoredAssignmentLifecycleState): boolean {
  return isAssignmentCloseable(state) || state === 'commitment_locked'
}

function expectedOutcomeKind(kind: SponsoredCloseoutCommandKind): SponsoredOutcomeKind {
  switch (kind) {
    case 'complete_success':
      // Branch-specific retained vs transfer is resolved at apply time; replay conflict
      // checks only that a success closeout was previously recorded under either success kind.
      return 'retained_completion'
    case 'fail_qualification':
      return 'qualification_failure'
    case 'cancel_voluntary':
      return 'voluntary_cancellation'
    case 'cancel_target_unavailable':
      return 'target_unavailable_cancellation'
    case 'invalidate_target':
      return 'target_invalidation'
    default: {
      const _exhaustive: never = kind
      return _exhaustive
    }
  }
}

function closeoutKindMatchesRecord(
  kind: SponsoredCloseoutCommandKind,
  record: SponsoredTrainingOutcomeRecord,
): boolean {
  if (kind === 'complete_success') {
    return (
      record.outcomeKind === 'retained_completion' ||
      record.outcomeKind === 'transfer_completion'
    )
  }
  return record.outcomeKind === expectedOutcomeKind(kind)
}

function selectedOutcomeTier(assignment: SponsoredTrainingAssignment): SponsoredOutcomeTierRefs {
  return assignment.outcomeTiers[assignment.outcomeTierIndex]!
}

function rejectCloseout(
  trainingState: SponsoredTrainingCompletionState,
  ownershipState: InterAgencyOwnershipTransferState,
  reason: SponsoredCloseoutRejectionReason,
): SponsoredCloseoutResult {
  return Object.freeze({
    outcome: 'rejected',
    reasonCode: reason,
    trainingState,
    ownershipState,
  })
}

function rejectRegistration(
  state: SponsoredTrainingCompletionState,
  reason: SponsoredCloseoutRejectionReason,
): SponsoredRegistrationResult {
  return Object.freeze({
    outcome: 'rejected',
    reasonCode: reason,
    state,
  })
}

export function registerSponsoredTrainingAssignment(
  state: SponsoredTrainingCompletionState,
  assignment: SponsoredTrainingAssignment | unknown,
): SponsoredRegistrationResult {
  const parsed = parseSponsoredTrainingAssignment(assignment)
  if (!parsed) {
    return rejectRegistration(state, 'malformed_command')
  }

  if (Object.prototype.hasOwnProperty.call(state.assignments, parsed.id)) {
    return rejectRegistration(state, 'assignment_already_registered')
  }

  if (Object.keys(state.assignments).length >= SPONSORED_TRAINING_COMPLETION_MAX_ASSIGNMENTS) {
    return rejectRegistration(state, 'assignment_capacity_exceeded')
  }

  const existingTraineeAssignment = state.activeTraineePersonIds[parsed.traineePersonId]
  if (
    existingTraineeAssignment !== undefined &&
    existingTraineeAssignment !== parsed.id &&
    occupiesTraineeSlot(state.assignments[existingTraineeAssignment]?.lifecycleState ?? 'canceled')
  ) {
    return rejectRegistration(state, 'duplicate_trainee_assignment')
  }

  const nextAssignments = createAssignmentsBag()
  for (const [key, existing] of Object.entries(state.assignments)) {
    nextAssignments[key] = existing
  }
  nextAssignments[parsed.id] = parsed

  const nextTrainees = createTraineeBag()
  for (const [key, value] of Object.entries(state.activeTraineePersonIds)) {
    nextTrainees[key] = value
  }
  if (occupiesTraineeSlot(parsed.lifecycleState)) {
    nextTrainees[parsed.traineePersonId] = parsed.id
  }

  const nextState = freezeTrainingState({
    schemaVersion: SPONSORED_TRAINING_COMPLETION_SCHEMA_VERSION,
    assignments: Object.freeze(nextAssignments),
    appliedCloseouts: state.appliedCloseouts,
    activeTraineePersonIds: Object.freeze(nextTrainees),
  })

  return Object.freeze({
    outcome: 'applied',
    reasonCode: 'applied',
    state: nextState,
  })
}

export function parseSponsoredCloseoutCommand(raw: unknown): SponsoredCloseoutCommand | null {
  if (!isRecord(raw)) return null
  if (!isCloseoutKind(raw.kind)) return null
  if (!isSafeId(raw.closeoutId) || !isSafeId(raw.assignmentId)) return null
  if (!isNonNegativeInt(raw.authoritativeWeek)) return null
  return Object.freeze({
    kind: raw.kind,
    closeoutId: raw.closeoutId.trim(),
    assignmentId: raw.assignmentId.trim(),
    authoritativeWeek: raw.authoritativeWeek,
  })
}

/** True when recruitment/spawn must not mint a second canonical person for this trainee. */
export function isTraineePersonBlockedForSpawn(
  state: SponsoredTrainingCompletionState,
  traineePersonId: string,
): boolean {
  if (!isSafeId(traineePersonId)) return false
  const assignmentId = state.activeTraineePersonIds[traineePersonId.trim()]
  if (assignmentId === undefined) return false
  const assignment = state.assignments[assignmentId]
  if (!assignment) return false
  return occupiesTraineeSlot(assignment.lifecycleState)
}

function updateAssignmentLifecycle(
  assignment: SponsoredTrainingAssignment,
  lifecycleState: SponsoredAssignmentLifecycleState,
): SponsoredTrainingAssignment {
  return freezeAssignment({ ...assignment, lifecycleState })
}

function removeActiveTrainee(
  state: SponsoredTrainingCompletionState,
  traineePersonId: string,
): Record<string, string> {
  const nextTrainees = createTraineeBag()
  for (const [key, value] of Object.entries(state.activeTraineePersonIds)) {
    if (key !== traineePersonId) nextTrainees[key] = value
  }
  return nextTrainees
}

function commitCloseout(
  trainingState: SponsoredTrainingCompletionState,
  ownershipState: InterAgencyOwnershipTransferState,
  assignment: SponsoredTrainingAssignment,
  outcomeRecord: SponsoredTrainingOutcomeRecord,
  terminalLifecycle: SponsoredAssignmentLifecycleState,
  ownershipTransfer?: TransferAttemptResult,
): SponsoredCloseoutResult {
  const nextAssignments = createAssignmentsBag()
  for (const [key, existing] of Object.entries(trainingState.assignments)) {
    nextAssignments[key] =
      key === assignment.id
        ? updateAssignmentLifecycle(existing, terminalLifecycle)
        : existing
  }

  const nextCloseouts = createCloseoutsBag()
  for (const [key, record] of Object.entries(trainingState.appliedCloseouts)) {
    nextCloseouts[key] = record
  }
  nextCloseouts[outcomeRecord.closeoutId] = outcomeRecord

  const nextTrainees = removeActiveTrainee(trainingState, assignment.traineePersonId)

  const nextTrainingState = freezeTrainingState({
    schemaVersion: SPONSORED_TRAINING_COMPLETION_SCHEMA_VERSION,
    assignments: Object.freeze(nextAssignments),
    appliedCloseouts: Object.freeze(nextCloseouts),
    activeTraineePersonIds: Object.freeze(nextTrainees),
  })

  return Object.freeze({
    outcome: 'applied',
    reasonCode: 'applied',
    trainingState: nextTrainingState,
    ownershipState,
    outcomeRecord,
    ...(ownershipTransfer !== undefined ? { ownershipTransfer } : {}),
  })
}

function buildTransferRequest(
  assignment: SponsoredTrainingAssignment,
  closeoutId: string,
  week: number,
) {
  return Object.freeze({
    requestId: `${closeoutId}:ownership-transfer`,
    assetId: assignment.personnelAssetId!,
    assetClass: 'personnel' as const,
    fromAgencyId: assignment.sponsoringAgencyId,
    toAgencyId: assignment.beneficiaryAgencyId,
    authoritativeWeek: week,
    mode: 'standard' as const,
    authorizationRef: assignment.transferAuthorizationRef,
  })
}

function applySuccessBundle(
  trainingState: SponsoredTrainingCompletionState,
  ownershipState: InterAgencyOwnershipTransferState,
  assignment: SponsoredTrainingAssignment,
  command: SponsoredCloseoutCommand,
): SponsoredCloseoutResult {
  const tier = selectedOutcomeTier(assignment)

  if (assignment.completionBranch === 'retain_graduate') {
    const outcomeRecord = freezeOutcomeRecord({
      closeoutId: command.closeoutId,
      assignmentId: assignment.id,
      outcomeKind: 'retained_completion',
      authoritativeWeek: command.authoritativeWeek,
      lifecycleTerminal: 'completed',
      paymentAppliedRef: tier.paymentRef,
      reimbursementAppliedRef: tier.reimbursementRef,
      relationshipConsequenceAppliedRef: tier.relationshipConsequenceRef,
      abandonmentPenaltyApplied: false,
    })
    return commitCloseout(
      trainingState,
      ownershipState,
      assignment,
      outcomeRecord,
      'completed',
    )
  }

  if (assignment.personnelAssetId === undefined) {
    return rejectCloseout(trainingState, ownershipState, 'transfer_branch_misconfigured')
  }

  const transferRequest = buildTransferRequest(assignment, command.closeoutId, command.authoritativeWeek)
  const authorization = authorizeTransferRequest(ownershipState, transferRequest)
  const transferResult = completeOwnershipTransfer(ownershipState, transferRequest, authorization)
  if (transferResult.outcome !== 'completed') {
    return rejectCloseout(trainingState, ownershipState, 'ownership_transfer_rejected')
  }

  const provenanceEntry =
    transferResult.state.provenance[assignment.personnelAssetId]?.at(-1) ?? undefined

  const outcomeRecord = freezeOutcomeRecord({
    closeoutId: command.closeoutId,
    assignmentId: assignment.id,
    outcomeKind: 'transfer_completion',
    authoritativeWeek: command.authoritativeWeek,
    lifecycleTerminal: 'completed',
    ownershipTransferRequestId: transferRequest.requestId,
    ownershipTransferProvenanceEntryId: provenanceEntry?.entryId,
    paymentAppliedRef: tier.paymentRef,
    reimbursementAppliedRef: tier.reimbursementRef,
    relationshipConsequenceAppliedRef: tier.relationshipConsequenceRef,
    abandonmentPenaltyApplied: false,
  })

  return commitCloseout(
    trainingState,
    transferResult.state,
    assignment,
    outcomeRecord,
    'completed',
    transferResult,
  )
}

function applyQualificationFailure(
  trainingState: SponsoredTrainingCompletionState,
  ownershipState: InterAgencyOwnershipTransferState,
  assignment: SponsoredTrainingAssignment,
  command: SponsoredCloseoutCommand,
): SponsoredCloseoutResult {
  const outcomeRecord = freezeOutcomeRecord({
    closeoutId: command.closeoutId,
    assignmentId: assignment.id,
    outcomeKind: 'qualification_failure',
    authoritativeWeek: command.authoritativeWeek,
    lifecycleTerminal: 'completed',
    failureConsequenceAppliedRef: assignment.failureConsequenceRef,
    abandonmentPenaltyApplied: false,
  })
  return commitCloseout(
    trainingState,
    ownershipState,
    assignment,
    outcomeRecord,
    'completed',
  )
}

function applyVoluntaryCancel(
  trainingState: SponsoredTrainingCompletionState,
  ownershipState: InterAgencyOwnershipTransferState,
  assignment: SponsoredTrainingAssignment,
  command: SponsoredCloseoutCommand,
): SponsoredCloseoutResult {
  const outcomeRecord = freezeOutcomeRecord({
    closeoutId: command.closeoutId,
    assignmentId: assignment.id,
    outcomeKind: 'voluntary_cancellation',
    authoritativeWeek: command.authoritativeWeek,
    lifecycleTerminal: 'canceled',
    cancellationConsequenceRef: assignment.voluntaryAbandonmentPenaltyRef,
    abandonmentPenaltyApplied: true,
  })
  return commitCloseout(
    trainingState,
    ownershipState,
    assignment,
    outcomeRecord,
    'canceled',
  )
}

function applyTargetUnavailableCancel(
  trainingState: SponsoredTrainingCompletionState,
  ownershipState: InterAgencyOwnershipTransferState,
  assignment: SponsoredTrainingAssignment,
  command: SponsoredCloseoutCommand,
): SponsoredCloseoutResult {
  const outcomeRecord = freezeOutcomeRecord({
    closeoutId: command.closeoutId,
    assignmentId: assignment.id,
    outcomeKind: 'target_unavailable_cancellation',
    authoritativeWeek: command.authoritativeWeek,
    lifecycleTerminal: 'canceled',
    cancellationConsequenceRef: assignment.targetUnavailableConsequenceRef,
    abandonmentPenaltyApplied: false,
  })
  return commitCloseout(
    trainingState,
    ownershipState,
    assignment,
    outcomeRecord,
    'canceled',
  )
}

function applyTargetInvalidation(
  trainingState: SponsoredTrainingCompletionState,
  ownershipState: InterAgencyOwnershipTransferState,
  assignment: SponsoredTrainingAssignment,
  command: SponsoredCloseoutCommand,
): SponsoredCloseoutResult {
  const outcomeRecord = freezeOutcomeRecord({
    closeoutId: command.closeoutId,
    assignmentId: assignment.id,
    outcomeKind: 'target_invalidation',
    authoritativeWeek: command.authoritativeWeek,
    lifecycleTerminal: 'canceled',
    cancellationConsequenceRef: assignment.targetUnavailableConsequenceRef,
    abandonmentPenaltyApplied: false,
  })
  return commitCloseout(
    trainingState,
    ownershipState,
    assignment,
    outcomeRecord,
    'canceled',
  )
}

/**
 * Idempotent closeout orchestrator — one authoritative outcome record per closeoutId.
 */
export function applySponsoredTrainingCloseout(
  trainingState: SponsoredTrainingCompletionState,
  ownershipState: InterAgencyOwnershipTransferState,
  command: SponsoredCloseoutCommand | unknown,
): SponsoredCloseoutResult {
  const parsed = parseSponsoredCloseoutCommand(command)
  if (!parsed) {
    return rejectCloseout(
      trainingState,
      ownershipState,
      'malformed_command',
    )
  }

  const existingOutcome = trainingState.appliedCloseouts[parsed.closeoutId]
  if (existingOutcome !== undefined) {
    if (
      existingOutcome.assignmentId !== parsed.assignmentId ||
      !closeoutKindMatchesRecord(parsed.kind, existingOutcome)
    ) {
      return rejectCloseout(trainingState, ownershipState, 'closeout_conflict')
    }
    return Object.freeze({
      outcome: 'idempotent_replay',
      reasonCode: 'idempotent_replay',
      trainingState,
      ownershipState,
      outcomeRecord: existingOutcome,
    })
  }

  const assignment = trainingState.assignments[parsed.assignmentId]
  if (!assignment) {
    return rejectCloseout(trainingState, ownershipState, 'assignment_not_found')
  }

  if (assignment.lifecycleState === 'commitment_locked') {
    return rejectCloseout(trainingState, ownershipState, 'commitment_locked')
  }

  if (!isAssignmentCloseable(assignment.lifecycleState)) {
    return rejectCloseout(trainingState, ownershipState, 'assignment_not_active')
  }

  switch (parsed.kind) {
    case 'complete_success':
      return applySuccessBundle(trainingState, ownershipState, assignment, parsed)
    case 'fail_qualification':
      return applyQualificationFailure(trainingState, ownershipState, assignment, parsed)
    case 'cancel_voluntary':
      return applyVoluntaryCancel(trainingState, ownershipState, assignment, parsed)
    case 'cancel_target_unavailable':
      return applyTargetUnavailableCancel(trainingState, ownershipState, assignment, parsed)
    case 'invalidate_target':
      return applyTargetInvalidation(trainingState, ownershipState, assignment, parsed)
    default: {
      const _exhaustive: never = parsed.kind
      void _exhaustive
      return rejectCloseout(trainingState, ownershipState, 'malformed_command')
    }
  }
}

// ---------------------------------------------------------------------------
// Deterministic fixtures (SPE-14 producer refs only)
// ---------------------------------------------------------------------------

export const DEMO_TRAINEE_PERSON_ID = 'person:trainee-morgan' as const
export const DEMO_SPONSORED_ASSIGNMENT_ID = 'sponsored-training:demo-001' as const
export const DEMO_QUALIFICATION_TARGET_REF = 'training-producer:qual-analyst-tier-2' as const

export const DEMO_OUTCOME_TIERS: readonly SponsoredOutcomeTierRefs[] = Object.freeze([
  Object.freeze({
    paymentRef: 'economy:sponsored-training:payment-tier-0',
    reimbursementRef: 'economy:sponsored-training:reimburse-tier-0',
    relationshipConsequenceRef: 'trust:sponsor-graduate-tier-0',
  }),
  Object.freeze({
    paymentRef: 'economy:sponsored-training:payment-tier-1',
    reimbursementRef: 'economy:sponsored-training:reimburse-tier-1',
    relationshipConsequenceRef: 'trust:sponsor-transfer-tier-1',
  }),
])

export function createDemoRetainGraduateAssignment(): SponsoredTrainingAssignment {
  return freezeAssignment({
    id: DEMO_SPONSORED_ASSIGNMENT_ID,
    traineePersonId: DEMO_TRAINEE_PERSON_ID,
    sponsoringAgencyId: 'agency:alpha-field-office',
    beneficiaryAgencyId: 'agency:beta-research-lab',
    qualificationTargetRef: DEMO_QUALIFICATION_TARGET_REF,
    completionBranch: 'retain_graduate',
    outcomeTierIndex: 0,
    outcomeTiers: DEMO_OUTCOME_TIERS,
    failureConsequenceRef: 'consequence:qualification-failure-bounded',
    voluntaryAbandonmentPenaltyRef: 'consequence:voluntary-abandonment-full',
    targetUnavailableConsequenceRef: 'consequence:target-unavailable-producer',
    transferAuthorizationRef: 'gov:sponsored-training-transfer-memo',
    lifecycleState: 'active',
    traineeOffRoster: true,
    registeredAtWeek: 8,
  })
}

export function createDemoTransferOwnershipAssignment(
  personnelAssetId: string,
): SponsoredTrainingAssignment {
  return freezeAssignment({
    id: `${DEMO_SPONSORED_ASSIGNMENT_ID}:transfer`,
    traineePersonId: DEMO_TRAINEE_PERSON_ID,
    personnelAssetId,
    sponsoringAgencyId: 'agency:alpha-field-office',
    beneficiaryAgencyId: 'agency:beta-research-lab',
    qualificationTargetRef: DEMO_QUALIFICATION_TARGET_REF,
    completionBranch: 'transfer_ownership',
    outcomeTierIndex: 1,
    outcomeTiers: DEMO_OUTCOME_TIERS,
    failureConsequenceRef: 'consequence:qualification-failure-bounded',
    voluntaryAbandonmentPenaltyRef: 'consequence:voluntary-abandonment-full',
    targetUnavailableConsequenceRef: 'consequence:target-unavailable-producer',
    transferAuthorizationRef: 'gov:sponsored-training-transfer-memo',
    lifecycleState: 'active',
    traineeOffRoster: true,
    registeredAtWeek: 8,
  })
}

export function createDemoCommitmentLockedAssignment(): SponsoredTrainingAssignment {
  return freezeAssignment({
    id: `${DEMO_SPONSORED_ASSIGNMENT_ID}:locked`,
    traineePersonId: 'person:trainee-locked',
    sponsoringAgencyId: 'agency:alpha-field-office',
    beneficiaryAgencyId: 'agency:beta-research-lab',
    qualificationTargetRef: DEMO_QUALIFICATION_TARGET_REF,
    completionBranch: 'retain_graduate',
    outcomeTierIndex: 0,
    outcomeTiers: DEMO_OUTCOME_TIERS,
    failureConsequenceRef: 'consequence:qualification-failure-bounded',
    voluntaryAbandonmentPenaltyRef: 'consequence:voluntary-abandonment-full',
    targetUnavailableConsequenceRef: 'consequence:target-unavailable-producer',
    transferAuthorizationRef: 'gov:sponsored-training-transfer-memo',
    lifecycleState: 'commitment_locked',
    traineeOffRoster: false,
    registeredAtWeek: 9,
  })
}

export { createEmptyInterAgencyOwnershipTransferState }
