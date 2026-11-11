import { expect } from 'vitest'
import {
  resolveCaptureSecureOutcome,
  toCaptureSecureEvidence,
} from '../../domain/captureSecureOutcome'
import {
  resolveOperationalPersonnelClaimOutcome,
  toAssignmentClaimEvidence,
} from '../../domain/operationalPersonnelClaimOutcome'
import {
  assignBreachRecovery,
  buildBreachEscapeEvidenceFromLiveRegistry,
  confirmCaptureSecure,
  confirmSubjectLocated,
  createBreachOriginRecovery,
  type AssignmentClaimEvidence,
  type BreachRecoveryRecord,
  type BreachEscapeEvidence,
} from '../../domain/breachOriginRecovery'
import {
  createLiveRegistryEntry,
  deriveRegistryAlerts,
  updateLiveRegistryEntry,
} from '../../domain/liveRegistry'
import { alertToWorkItem, type RegistryWorkItem } from '../../domain/liveRegistryAlertCenter'

export type BreachEscapeRespondFixture = Readonly<{
  escapeEvidence: BreachEscapeEvidence
  respondWorkItem: RegistryWorkItem
}>

/** Deterministic SPE-3055 claim evidence for SPE-3735 assignment fixtures. */
export function createHeldAssignmentClaimEvidence(
  attemptId = 'response-1',
  operationRef = 'operation:breach-recovery'
): AssignmentClaimEvidence {
  const resolved = resolveOperationalPersonnelClaimOutcome({
    attemptId,
    operationRef,
    requirementRefs: ['personnel:responder-a'],
    claimCommitted: true,
  })
  if (!resolved.ok) {
    throw new Error('expected held assignment claim resolve ok')
  }
  return toAssignmentClaimEvidence(resolved.outcome)
}

/**
 * Shared SPE-3735 escape → respond work-item fixture for producer seam tests.
 */
export function createBreachEscapeRespondFixture(
  ids: Readonly<{
    registryId: string
    entityId?: string
    caseId: string
  }>
): BreachEscapeRespondFixture {
  const entityId = ids.entityId ?? 'subject:anomaly-a'
  const contained = createLiveRegistryEntry({
    id: ids.registryId,
    entityId,
    entityClass: 'anomaly',
    label: 'Anomaly A',
    operationalState: 'contained',
    truthState: 'confirmed',
    confidence: 0.9,
    week: 4,
    linkedCaseIds: [ids.caseId],
  })
  const loose = updateLiveRegistryEntry(contained, {
    operationalState: 'loose',
    week: 5,
    reasonCode: 'contained-to-loose',
    triggerSource: 'containment-breach',
  })
  const escapeEvidence = buildBreachEscapeEvidenceFromLiveRegistry(contained, loose, ids.caseId)!
  const alerts = deriveRegistryAlerts(contained, loose)
  const escapeAlert = alerts.find((alert) => alert.type === 'escape')!
  const respondWorkItem = alertToWorkItem(escapeAlert, loose, 0, true)
  return { escapeEvidence, respondWorkItem }
}

export function advanceBreachRecoveryToLocated(
  recoveryId: string,
  fixture: BreachEscapeRespondFixture = createBreachEscapeRespondFixture({
    registryId: 'reg-escaped-shared-1',
    caseId: 'case:escape-shared-1',
  })
): BreachRecoveryRecord {
  const { escapeEvidence, respondWorkItem } = fixture
  const created = createBreachOriginRecovery({
    recoveryId,
    escapeEvidence,
    subjectKind: 'non_person',
    recoveryObjectiveRef: 'objective:recontain-anomaly-a',
    destinationNodeId: 'room:med_bay',
    destinationZoneRef: 'zone:medical',
    operationKey: `op-create-${recoveryId}`,
  })
  expect(created.ok).toBe(true)
  const assigned = assignBreachRecovery(created.recovery!, {
    operationKey: `op-assign-${recoveryId}`,
    assignmentClaim: createHeldAssignmentClaimEvidence(`response-${recoveryId}`),
    respondWorkItem,
  })
  expect(assigned.ok).toBe(true)
  const located = confirmSubjectLocated(assigned.recovery!, {
    operationKey: `op-locate-${recoveryId}`,
    locatedCommitted: true,
  })
  expect(located.ok).toBe(true)
  return located.recovery!
}

export function advanceBreachRecoveryToCaptureSecured(
  recoveryId: string,
  fixture?: BreachEscapeRespondFixture
): BreachRecoveryRecord {
  const located = advanceBreachRecoveryToLocated(recoveryId, fixture)
  const capture = resolveCaptureSecureOutcome({
    attemptId: `capture-${recoveryId}`,
    subjectRef: located.subjectRef,
    controlCommitted: true,
    restraintCompatible: true,
  })
  expect(capture.ok).toBe(true)
  if (!capture.ok) throw new Error('expected capture resolve ok')

  const secured = confirmCaptureSecure(located, {
    operationKey: `op-capture-${recoveryId}`,
    week: 6,
    captureEvidence: toCaptureSecureEvidence(capture.outcome),
  })
  expect(secured.ok).toBe(true)
  expect(secured.recovery?.stage).toBe('capture_secured')
  return secured.recovery!
}
