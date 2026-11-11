import { describe, expect, it } from 'vitest'
import {
  resolveCaptureSecureOutcome,
  toCaptureSecureEvidence,
} from '../domain/captureSecureOutcome'
import {
  resolveRecoveryMovementOutcome,
  toRecoveryMovementEvidence,
} from '../domain/recoveryMovementOutcome'
import {
  assignBreachRecovery,
  buildBreachEscapeEvidenceFromLiveRegistry,
  confirmCaptureSecure,
  confirmRecoveryMovement,
  confirmSubjectLocated,
  createBreachOriginRecovery,
  type BreachRecoveryRecord,
} from '../domain/breachOriginRecovery'
import {
  createLiveRegistryEntry,
  deriveRegistryAlerts,
  updateLiveRegistryEntry,
} from '../domain/liveRegistry'
import { alertToWorkItem } from '../domain/liveRegistryAlertCenter'

function escapeFixture() {
  const contained = createLiveRegistryEntry({
    id: 'reg-escaped-move-1',
    entityId: 'subject:anomaly-a',
    entityClass: 'anomaly',
    label: 'Anomaly A',
    operationalState: 'contained',
    truthState: 'confirmed',
    confidence: 0.9,
    week: 4,
    linkedCaseIds: ['case:escape-move-1'],
  })
  const loose = updateLiveRegistryEntry(contained, {
    operationalState: 'loose',
    week: 5,
    reasonCode: 'contained-to-loose',
    triggerSource: 'containment-breach',
  })
  const escapeEvidence = buildBreachEscapeEvidenceFromLiveRegistry(
    contained,
    loose,
    'case:escape-move-1'
  )!
  const alerts = deriveRegistryAlerts(contained, loose)
  const escapeAlert = alerts.find((alert) => alert.type === 'escape')!
  const respondWorkItem = alertToWorkItem(escapeAlert, loose, 0, true)
  return { escapeEvidence, respondWorkItem }
}

function advanceToCaptureSecured(recoveryId = 'rec-move-seam-1'): BreachRecoveryRecord {
  const { escapeEvidence, respondWorkItem } = escapeFixture()
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
    assignmentClaimRef: 'claim:response-1',
    respondWorkItem,
  })
  expect(assigned.ok).toBe(true)
  const located = confirmSubjectLocated(assigned.recovery!, {
    operationKey: `op-locate-${recoveryId}`,
    locatedCommitted: true,
  })
  expect(located.ok).toBe(true)

  const capture = resolveCaptureSecureOutcome({
    attemptId: `capture-${recoveryId}`,
    subjectRef: located.recovery!.subjectRef,
    controlCommitted: true,
    restraintCompatible: true,
  })
  expect(capture.ok).toBe(true)
  if (!capture.ok) throw new Error('expected capture resolve ok')

  const secured = confirmCaptureSecure(located.recovery!, {
    operationKey: `op-capture-${recoveryId}`,
    week: 6,
    captureEvidence: toCaptureSecureEvidence(capture.outcome),
  })
  expect(secured.ok).toBe(true)
  expect(secured.recovery?.stage).toBe('capture_secured')
  return secured.recovery!
}

describe('SPE-1095 recovery-movement outcome producer', () => {
  it('resolves in-transit and arrived success with stable movementId', () => {
    const inTransit = resolveRecoveryMovementOutcome({
      attemptId: ' attempt-1 ',
      subjectRef: ' subject:anomaly-a ',
      movementCommitted: true,
      arrivedAtDestination: false,
    })
    const inTransitAgain = resolveRecoveryMovementOutcome({
      attemptId: 'attempt-1',
      subjectRef: 'subject:anomaly-a',
      movementCommitted: true,
      arrivedAtDestination: false,
    })
    expect(inTransit.ok).toBe(true)
    expect(inTransitAgain.ok).toBe(true)
    if (!inTransit.ok || !inTransitAgain.ok) return
    expect(inTransit.outcome.movementCommitted).toBe(true)
    expect(inTransit.outcome.arrivedAtDestination).toBe(false)
    expect(inTransit.outcome.reasonCodes).toEqual(['movement_in_transit'])
    expect(inTransit.outcome.movementId).toBe('move:attempt-1')
    expect(inTransit.outcome.movementId).toBe(inTransitAgain.outcome.movementId)
    expect(toRecoveryMovementEvidence(inTransit.outcome)).toEqual({
      producerOwner: 'SPE-1095',
      movementId: 'move:attempt-1',
      subjectRef: 'subject:anomaly-a',
      movementCommitted: true,
      arrivedAtDestination: false,
    })

    const arrived = resolveRecoveryMovementOutcome({
      attemptId: 'attempt-arrive',
      subjectRef: 'subject:anomaly-a',
      movementCommitted: true,
      arrivedAtDestination: true,
    })
    expect(arrived.ok).toBe(true)
    if (!arrived.ok) return
    expect(arrived.outcome.movementCommitted).toBe(true)
    expect(arrived.outcome.arrivedAtDestination).toBe(true)
    expect(arrived.outcome.reasonCodes).toEqual(['movement_arrived'])
    expect(toRecoveryMovementEvidence(arrived.outcome)).toEqual({
      producerOwner: 'SPE-1095',
      movementId: 'move:attempt-arrive',
      subjectRef: 'subject:anomaly-a',
      movementCommitted: true,
      arrivedAtDestination: true,
    })
  })

  it('rejects malformed attempts without evidence', () => {
    expect(resolveRecoveryMovementOutcome(null).ok).toBe(false)
    expect(
      resolveRecoveryMovementOutcome({
        attemptId: '',
        subjectRef: 'subject:anomaly-a',
        movementCommitted: true,
        arrivedAtDestination: false,
      }).ok
    ).toBe(false)
    expect(
      resolveRecoveryMovementOutcome({
        attemptId: 'attempt-2',
        subjectRef: '   ',
        movementCommitted: true,
        arrivedAtDestination: false,
      }).ok
    ).toBe(false)
    expect(
      resolveRecoveryMovementOutcome({
        attemptId: 'attempt-3',
        subjectRef: 'subject:anomaly-a',
        movementCommitted: true as unknown as boolean,
        arrivedAtDestination: 'yes' as unknown as boolean,
      }).ok
    ).toBe(false)
  })

  it('fails closed for ineligible route, transit interrupted, and uncommitted movement', () => {
    const ineligible = resolveRecoveryMovementOutcome({
      attemptId: 'attempt-ineligible',
      subjectRef: 'subject:anomaly-a',
      movementCommitted: true,
      arrivedAtDestination: true,
      routeEligible: false,
    })
    expect(ineligible.ok).toBe(true)
    if (!ineligible.ok) return
    expect(ineligible.outcome.movementCommitted).toBe(false)
    expect(ineligible.outcome.arrivedAtDestination).toBe(false)
    expect(ineligible.outcome.reasonCodes).toEqual(['route_ineligible'])

    const interrupted = resolveRecoveryMovementOutcome({
      attemptId: 'attempt-interrupted',
      subjectRef: 'subject:anomaly-a',
      movementCommitted: true,
      arrivedAtDestination: false,
      transitInterrupted: true,
    })
    expect(interrupted.ok).toBe(true)
    if (!interrupted.ok) return
    expect(interrupted.outcome.movementCommitted).toBe(false)
    expect(interrupted.outcome.arrivedAtDestination).toBe(false)
    expect(interrupted.outcome.reasonCodes).toEqual(['transit_interrupted'])

    const uncommitted = resolveRecoveryMovementOutcome({
      attemptId: 'attempt-uncommitted',
      subjectRef: 'subject:anomaly-a',
      movementCommitted: false,
      arrivedAtDestination: false,
    })
    expect(uncommitted.ok).toBe(true)
    if (!uncommitted.ok) return
    expect(uncommitted.outcome.movementCommitted).toBe(false)
    expect(uncommitted.outcome.reasonCodes).toEqual(['movement_not_committed'])

    const arrivedWithoutCommit = resolveRecoveryMovementOutcome({
      attemptId: 'attempt-fake-arrive',
      subjectRef: 'subject:anomaly-a',
      movementCommitted: false,
      arrivedAtDestination: true,
    })
    expect(arrivedWithoutCommit.ok).toBe(true)
    if (!arrivedWithoutCommit.ok) return
    expect(arrivedWithoutCommit.outcome.movementCommitted).toBe(false)
    expect(arrivedWithoutCommit.outcome.arrivedAtDestination).toBe(false)
    expect(arrivedWithoutCommit.outcome.reasonCodes).toEqual(['movement_not_committed'])
  })

  it('feeds real producer evidence into SPE-3735 confirmRecoveryMovement without completing recovery', () => {
    const captured = advanceToCaptureSecured('rec-move-seam-ok')

    const inTransitResolve = resolveRecoveryMovementOutcome({
      attemptId: 'attempt-recovery-transit',
      subjectRef: captured.subjectRef,
      movementCommitted: true,
      arrivedAtDestination: false,
    })
    expect(inTransitResolve.ok).toBe(true)
    if (!inTransitResolve.ok) return

    const inTransit = confirmRecoveryMovement(captured, {
      operationKey: 'op-move-from-producer-transit',
      movementEvidence: toRecoveryMovementEvidence(inTransitResolve.outcome),
    })
    expect(inTransit.ok).toBe(true)
    expect(inTransit.recovery?.stage).toBe('in_transit')
    expect(inTransit.recovery?.movementId).toBe('move:attempt-recovery-transit')
    expect(inTransit.recovery?.stage).not.toBe('completed')

    const arriveResolve = resolveRecoveryMovementOutcome({
      attemptId: 'attempt-recovery-arrive',
      subjectRef: captured.subjectRef,
      movementCommitted: true,
      arrivedAtDestination: true,
    })
    expect(arriveResolve.ok).toBe(true)
    if (!arriveResolve.ok) return

    const arrived = confirmRecoveryMovement(inTransit.recovery!, {
      operationKey: 'op-move-from-producer-arrive',
      movementEvidence: toRecoveryMovementEvidence(arriveResolve.outcome),
    })
    expect(arrived.ok).toBe(true)
    expect(arrived.recovery?.stage).toBe('admission_pending')
    expect(arrived.recovery?.movementId).toBe('move:attempt-recovery-arrive')
    expect(arrived.recovery?.stage).not.toBe('completed')

    const failResolve = resolveRecoveryMovementOutcome({
      attemptId: 'attempt-recovery-fail',
      subjectRef: captured.subjectRef,
      movementCommitted: false,
      arrivedAtDestination: false,
    })
    expect(failResolve.ok).toBe(true)
    if (!failResolve.ok) return

    const capturedFail = advanceToCaptureSecured('rec-move-seam-fail')
    const failed = confirmRecoveryMovement(capturedFail, {
      operationKey: 'op-move-from-producer-fail',
      movementEvidence: toRecoveryMovementEvidence(failResolve.outcome),
    })
    expect(failed.ok).toBe(false)
    expect(failed.code).toBe('movement_not_committed')
    expect(failed.recovery?.stage).toBe('capture_secured')
    expect(failed.recovery?.stage).not.toBe('completed')
  })
})
