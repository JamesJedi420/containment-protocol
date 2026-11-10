import { describe, expect, it } from 'vitest'
import { hydrateGame } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import { readProductionFacilitySectionGraph } from '../domain/facilitySectionGraph'
import {
  applyBreachRecoveryTerminalToLiveRegistry,
  assignBreachRecovery,
  buildBreachEscapeEvidenceFromLiveRegistry,
  confirmCaptureSecure,
  confirmContainmentVerification,
  confirmDestinationAdmission,
  confirmRecoveryMovement,
  confirmSubjectLocated,
  createBreachOriginRecovery,
  interruptBreachRecovery,
  isForbiddenDirectRecapturePatch,
  parseFacilityBreachOriginRecoveries,
  projectExplainableBreachRecovery,
  reportLostContact,
  type BreachRecoveryRecord,
} from '../domain/breachOriginRecovery'
import {
  createLiveRegistryEntry,
  deriveRegistryAlerts,
  updateLiveRegistryEntry,
} from '../domain/liveRegistry'
import { alertToWorkItem } from '../domain/liveRegistryAlertCenter'
import { buildCanonicalProcedureAdapterFixture } from './helpers/canonicalProcedureAdapterFixture'

const graph = readProductionFacilitySectionGraph()

function procedureAdapter(executionKey = 'exec-breach-verify-1') {
  return buildCanonicalProcedureAdapterFixture({
    procedureId: 'breach_recovery_recontainment',
    canonicalName: 'Breach Recovery Recontainment',
    executionKey,
    includeEnvironmentalConditions: true,
  })
}

function escapeFixture() {
  const contained = createLiveRegistryEntry({
    id: 'reg-escaped-1',
    entityId: 'subject:anomaly-a',
    entityClass: 'anomaly',
    label: 'Anomaly A',
    operationalState: 'contained',
    truthState: 'confirmed',
    confidence: 0.9,
    week: 4,
    linkedCaseIds: ['case:escape-1'],
  })
  const loose = updateLiveRegistryEntry(contained, {
    operationalState: 'loose',
    week: 5,
    reasonCode: 'contained-to-loose',
    triggerSource: 'containment-breach',
  })
  const evidence = buildBreachEscapeEvidenceFromLiveRegistry(contained, loose, 'case:escape-1')
  const alerts = deriveRegistryAlerts(contained, loose)
  const escapeAlert = alerts.find((alert) => alert.type === 'escape')!
  const respondWorkItem = alertToWorkItem(escapeAlert, loose, 0, true)
  return { contained, loose, evidence: evidence!, respondWorkItem }
}

function permittedCoLocation(destinationNodeId = 'room:med_bay') {
  return {
    graph,
    constraints: [
      {
        id: 'c-same-node',
        kind: 'prohibit_same_node' as const,
        subjectClass: 'volatile_sample',
        againstClass: 'reactive_catalyst',
      },
    ],
    occupants: [
      {
        subjectId: 'occ-other',
        subjectClass: 'reactive_catalyst',
        nodeId: 'room:containment_cell',
      },
    ],
    candidate: {
      subjectId: 'subject:anomaly-a',
      subjectClass: 'volatile_sample',
      proposedNodeId: destinationNodeId,
      zoneRef: 'zone:medical',
    },
  }
}

function rejectedCoLocation() {
  return {
    graph,
    constraints: [
      {
        id: 'c-same-node',
        kind: 'prohibit_same_node' as const,
        subjectClass: 'volatile_sample',
        againstClass: 'reactive_catalyst',
      },
    ],
    occupants: [
      {
        subjectId: 'occ-catalyst',
        subjectClass: 'reactive_catalyst',
        nodeId: 'room:med_bay',
      },
    ],
    candidate: {
      subjectId: 'subject:anomaly-a',
      subjectClass: 'volatile_sample',
      proposedNodeId: 'room:med_bay',
      zoneRef: 'zone:medical',
    },
  }
}

function inboundScreenRequest() {
  return {
    direction: 'inbound' as const,
    boundaryZoneId: 'zone:medical',
    actorId: 'subject:anomaly-a',
    policies: [{ policyId: 'policy-clear', boundaryZoneId: 'zone:medical' }],
  }
}

function createRecovery(
  overrides: Partial<Parameters<typeof createBreachOriginRecovery>[0]> = {}
) {
  const { evidence } = escapeFixture()
  return createBreachOriginRecovery({
    recoveryId: 'rec-1',
    escapeEvidence: evidence,
    subjectKind: 'non_person',
    recoveryObjectiveRef: 'objective:recontain-anomaly-a',
    destinationNodeId: 'room:med_bay',
    destinationZoneRef: 'zone:medical',
    operationKey: 'op-create-1',
    ...overrides,
  })
}

function advanceToLocated(recovery: BreachRecoveryRecord): BreachRecoveryRecord {
  const { respondWorkItem } = escapeFixture()
  const assigned = assignBreachRecovery(recovery, {
    operationKey: 'op-assign-1',
    assignmentClaimRef: 'claim:response-1',
    respondWorkItem,
  })
  expect(assigned.ok).toBe(true)
  const located = confirmSubjectLocated(assigned.recovery!, {
    operationKey: 'op-locate-1',
    locatedCommitted: true,
  })
  expect(located.ok).toBe(true)
  return located.recovery!
}

describe('SPE-3735 breach-origin recovery handoff', () => {
  it('builds escape evidence only from contained→loose live-registry transitions', () => {
    const { contained, loose, evidence } = escapeFixture()
    expect(evidence.escapeAlertType).toBe('escape')
    expect(evidence.escapeReasonCode).toBe('contained-to-loose')
    expect(
      buildBreachEscapeEvidenceFromLiveRegistry(loose, contained, 'case:escape-1')
    ).toBeUndefined()
  })

  it('rejects status-patch initiation and missing escape evidence', () => {
    const { evidence } = escapeFixture()
    const patched = createBreachOriginRecovery({
      recoveryId: 'rec-patch',
      escapeEvidence: evidence,
      subjectKind: 'non_person',
      recoveryObjectiveRef: 'objective:x',
      destinationNodeId: 'room:med_bay',
      operationKey: 'op-patch',
      statusPatchComplete: true,
    })
    expect(patched.ok).toBe(false)
    expect(patched.code).toBe('status_patch_forbidden')

    const badEvidence = createBreachOriginRecovery({
      recoveryId: 'rec-bad',
      escapeEvidence: {
        ...evidence,
        escapeReasonCode: 'contained-to-loose',
        fromOperationalState: 'contained',
        toOperationalState: 'loose',
        escapeAlertType: 'escape',
        subjectRef: '',
      },
      subjectKind: 'non_person',
      recoveryObjectiveRef: 'objective:x',
      destinationNodeId: 'room:med_bay',
      operationKey: 'op-bad',
    })
    expect(badEvidence.ok).toBe(false)
    expect(badEvidence.code).toBe('escape_not_authoritative')
  })

  it('rejects alert-only assignment without a claim and respond work item', () => {
    const created = createRecovery()
    expect(created.ok).toBe(true)
    const { respondWorkItem } = escapeFixture()
    const noClaim = assignBreachRecovery(created.recovery!, {
      operationKey: 'op-assign-missing',
      assignmentClaimRef: '',
      respondWorkItem,
    })
    expect(noClaim.ok).toBe(false)
    expect(noClaim.code).toBe('assignment_claim_missing')

    const badKind = assignBreachRecovery(created.recovery!, {
      operationKey: 'op-assign-bad-kind',
      assignmentClaimRef: 'claim:1',
      respondWorkItem: { ...respondWorkItem, kind: 'investigate' },
    })
    expect(badKind.ok).toBe(false)
    expect(badKind.code).toBe('respond_work_item_invalid')
  })

  it('capture alone cannot complete; failed capture terminals once', () => {
    const located = advanceToLocated(createRecovery().recovery!)
    const failed = confirmCaptureSecure(located, {
      operationKey: 'op-capture-fail',
      week: 6,
      captureEvidence: {
        producerOwner: 'SPE-104',
        outcomeId: 'cap-1',
        subjectRef: 'subject:anomaly-a',
        secured: false,
      },
    })
    expect(failed.ok).toBe(false)
    expect(failed.recovery?.stage).toBe('capture_failed')
    expect(failed.recovery?.terminalOutcomeReported).toBe(true)
    expect(failed.recovery?.terminalReport?.outcome).toBe('capture_failed')
    expect(failed.recovery?.terminalReport?.week).toBe(6)

    const secured = confirmCaptureSecure(advanceToLocated(createRecovery({
      recoveryId: 'rec-cap-ok',
      operationKey: 'op-create-cap-ok',
    }).recovery!), {
      operationKey: 'op-capture-ok',
      week: 6,
      captureEvidence: {
        producerOwner: 'SPE-104',
        outcomeId: 'cap-2',
        subjectRef: 'subject:anomaly-a',
        secured: true,
      },
    })
    expect(secured.ok).toBe(true)
    expect(secured.recovery?.stage).toBe('capture_secured')
    expect(secured.recovery?.stage).not.toBe('completed')
  })

  it('arrival alone cannot complete; admission and verification are separate', () => {
    const located = advanceToLocated(createRecovery().recovery!)
    const captured = confirmCaptureSecure(located, {
      operationKey: 'op-capture',
      week: 6,
      captureEvidence: {
        producerOwner: 'SPE-104',
        outcomeId: 'cap-3',
        subjectRef: 'subject:anomaly-a',
        secured: true,
      },
    })
    const inTransit = confirmRecoveryMovement(captured.recovery!, {
      operationKey: 'op-move-partial',
      movementEvidence: {
        producerOwner: 'SPE-1095',
        movementId: 'move-1',
        subjectRef: 'subject:anomaly-a',
        movementCommitted: true,
        arrivedAtDestination: false,
      },
    })
    expect(inTransit.recovery?.stage).toBe('in_transit')

    const arrived = confirmRecoveryMovement(inTransit.recovery!, {
      operationKey: 'op-move-arrive',
      movementEvidence: {
        producerOwner: 'SPE-1095',
        movementId: 'move-1',
        subjectRef: 'subject:anomaly-a',
        movementCommitted: true,
        arrivedAtDestination: true,
      },
    })
    expect(arrived.recovery?.stage).toBe('admission_pending')
    expect(arrived.recovery?.stage).not.toBe('completed')

    // SPE-3189 currently escalates inbound crossings (`ingress_not_outbound`);
    // happy-path admission uses co-location without forcing an inbound screen clear.
    const admitted = confirmDestinationAdmission(arrived.recovery!, {
      operationKey: 'op-admit',
      week: 6,
      admissionCommitted: true,
      coLocation: permittedCoLocation(),
    })
    expect(admitted.ok).toBe(true)
    expect(admitted.recovery?.stage).toBe('containment_verification')

    const completed = confirmContainmentVerification(admitted.recovery!, {
      operationKey: 'op-verify',
      recontainmentVerified: true,
      week: 7,
      procedureAdapter: procedureAdapter(),
    })
    expect(completed.ok).toBe(true)
    expect(completed.recovery?.stage).toBe('completed')
    expect(completed.recovery?.terminalOutcomeReported).toBe(true)
    expect(completed.recovery?.terminalReport?.reportedOnce).toBe(true)
    expect(projectExplainableBreachRecovery(completed.recovery!).outcome).toBe('completed')
  })

  it('denies incompatible destination and blocked inbound screening', () => {
    const located = advanceToLocated(createRecovery().recovery!)
    const captured = confirmCaptureSecure(located, {
      operationKey: 'op-capture',
      week: 6,
      captureEvidence: {
        producerOwner: 'SPE-104',
        outcomeId: 'cap-4',
        subjectRef: 'subject:anomaly-a',
        secured: true,
      },
    })
    const arrived = confirmRecoveryMovement(captured.recovery!, {
      operationKey: 'op-arrive',
      movementEvidence: {
        producerOwner: 'SPE-1095',
        movementId: 'move-2',
        subjectRef: 'subject:anomaly-a',
        movementCommitted: true,
        arrivedAtDestination: true,
      },
    })
    const denied = confirmDestinationAdmission(arrived.recovery!, {
      operationKey: 'op-deny-colo',
      week: 6,
      admissionCommitted: true,
      coLocation: rejectedCoLocation(),
    })
    expect(denied.ok).toBe(false)
    expect(denied.recovery?.stage).toBe('admission_denied')
    expect(denied.reasonCodes).toContain('incompatible_destination')

    const located2 = advanceToLocated(
      createRecovery({ recoveryId: 'rec-screen', operationKey: 'op-create-screen' }).recovery!
    )
    const captured2 = confirmCaptureSecure(located2, {
      operationKey: 'op-capture-2',
      week: 6,
      captureEvidence: {
        producerOwner: 'SPE-104',
        outcomeId: 'cap-5',
        subjectRef: 'subject:anomaly-a',
        secured: true,
      },
    })
    const arrived2 = confirmRecoveryMovement(captured2.recovery!, {
      operationKey: 'op-arrive-2',
      movementEvidence: {
        producerOwner: 'SPE-1095',
        movementId: 'move-3',
        subjectRef: 'subject:anomaly-a',
        movementCommitted: true,
        arrivedAtDestination: true,
      },
    })
    // SPE-3189 fail-closes inbound as escalate (`ingress_not_outbound`); recovery must not invent a clear.
    const screened = confirmDestinationAdmission(arrived2.recovery!, {
      operationKey: 'op-deny-screen',
      week: 6,
      admissionCommitted: true,
      coLocation: permittedCoLocation(),
      inboundScreen: inboundScreenRequest(),
    })
    expect(screened.ok).toBe(false)
    expect(screened.reasonCodes).toContain('inbound_screen_blocked')
  })

  it('forbids direct recapture patches from completing recovery or registry restore', () => {
    expect(
      isForbiddenDirectRecapturePatch({
        fromOperationalState: 'loose',
        toOperationalState: 'contained',
        reasonCode: 'recaptured',
      })
    ).toBe(true)

    const { loose } = escapeFixture()
    const created = createRecovery()
    const applied = applyBreachRecoveryTerminalToLiveRegistry(loose, created.recovery!, 8)
    expect(applied.ok).toBe(false)
    expect(applied.ok === false && applied.code).toBe('illegal_transition')
  })

  it('applies live-registry contained restore only after verified completion, once', () => {
    const { loose } = escapeFixture()
    const located = advanceToLocated(createRecovery().recovery!)
    const captured = confirmCaptureSecure(located, {
      operationKey: 'op-capture',
      week: 6,
      captureEvidence: {
        producerOwner: 'SPE-104',
        outcomeId: 'cap-6',
        subjectRef: 'subject:anomaly-a',
        secured: true,
      },
    })
    const arrived = confirmRecoveryMovement(captured.recovery!, {
      operationKey: 'op-arrive',
      movementEvidence: {
        producerOwner: 'SPE-1095',
        movementId: 'move-4',
        subjectRef: 'subject:anomaly-a',
        movementCommitted: true,
        arrivedAtDestination: true,
      },
    })
    const admitted = confirmDestinationAdmission(arrived.recovery!, {
      operationKey: 'op-admit',
      week: 6,
      admissionCommitted: true,
      coLocation: permittedCoLocation(),
    })
    const completed = confirmContainmentVerification(admitted.recovery!, {
      operationKey: 'op-verify',
      recontainmentVerified: true,
      week: 9,
      procedureAdapter: procedureAdapter('exec-final'),
    })
    expect(completed.recovery?.terminalOutcomeReported).toBe(true)

    const again = confirmContainmentVerification(completed.recovery!, {
      operationKey: 'op-verify',
      recontainmentVerified: true,
      week: 9,
      procedureAdapter: procedureAdapter('exec-final'),
    })
    expect(again.ok).toBe(true)
    expect(again.recovery?.terminalReport).toEqual(completed.recovery?.terminalReport)

    const applied = applyBreachRecoveryTerminalToLiveRegistry(loose, completed.recovery!, 9)
    expect(applied.ok).toBe(true)
    if (applied.ok) {
      expect(applied.entry.operationalState).toBe('contained')
      expect(applied.entry.transitionLog.at(-1)?.reasonCode).toBe('breach-recovery-verified')
      expect(applied.report.reportedOnce).toBe(true)
    }
  })

  it('preserves person custody through hydrate and rejects non-person custody smuggle', () => {
    const { evidence } = escapeFixture()
    const person = createBreachOriginRecovery({
      recoveryId: 'rec-person',
      escapeEvidence: evidence,
      subjectKind: 'person',
      recoveryObjectiveRef: 'objective:person',
      destinationNodeId: 'room:med_bay',
      operationKey: 'op-person',
      custodyStatusId: 'custody:1',
      formerRoleCategory: 'staff',
    })
    expect(person.ok).toBe(true)

    const base = createStartingState()
    const withMap = {
      ...base,
      facilityBreachOriginRecoveries: {
        [person.recovery!.recoveryId]: person.recovery!,
      },
    }
    const hydrated = hydrateGame(withMap)
    expect(hydrated.facilityBreachOriginRecoveries?.['rec-person']?.custodyStatusId).toBe(
      'custody:1'
    )

    const smuggle = createBreachOriginRecovery({
      recoveryId: 'rec-smuggle',
      escapeEvidence: evidence,
      subjectKind: 'non_person',
      recoveryObjectiveRef: 'objective:x',
      destinationNodeId: 'room:med_bay',
      operationKey: 'op-smuggle',
      custodyStatusId: 'custody:nope',
      formerRoleCategory: 'staff',
    })
    expect(smuggle.ok).toBe(false)
    expect(smuggle.code).toBe('custody_unresolved')
  })

  it('idempotent keys succeed; stale keys fail; lost contact and interrupt are stable', () => {
    const created = createRecovery()
    const { respondWorkItem } = escapeFixture()
    const assigned = assignBreachRecovery(created.recovery!, {
      operationKey: 'op-assign',
      assignmentClaimRef: 'claim:a',
      respondWorkItem,
    })
    const again = assignBreachRecovery(assigned.recovery!, {
      operationKey: 'op-assign',
      assignmentClaimRef: 'claim:a',
      respondWorkItem,
    })
    expect(again.ok).toBe(true)
    expect(again.recovery?.stage).toBe('recovery_assigned')

    const stale = confirmSubjectLocated(assigned.recovery!, {
      operationKey: 'op-assign',
      locatedCommitted: true,
    })
    expect(stale.ok).toBe(false)
    expect(stale.code).toBe('stale_operation')

    const lost = reportLostContact(assigned.recovery!, {
      operationKey: 'op-lost',
      week: 6,
    })
    expect(lost.recovery?.stage).toBe('lost_contact')
    expect(lost.recovery?.terminalOutcomeReported).toBe(true)

    const aborted = interruptBreachRecovery(createRecovery({
      recoveryId: 'rec-abort',
      operationKey: 'op-create-abort',
    }).recovery!, {
      operationKey: 'op-abort',
      week: 6,
    })
    expect(aborted.recovery?.stage).toBe('interrupted')
    expect(aborted.recovery?.physicalEffectsOccurred).toBe(false)
  })

  it('parse drops malformed siblings', () => {
    const created = createRecovery()
    const parsed = parseFacilityBreachOriginRecoveries({
      [created.recovery!.recoveryId]: created.recovery!,
      bad: { recoveryId: 'bad' },
    })
    expect(Object.keys(parsed ?? {})).toEqual(['rec-1'])
  })
})
