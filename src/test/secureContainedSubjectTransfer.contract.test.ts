import { describe, expect, it } from 'vitest'
import { hydrateGame } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import { readProductionFacilitySectionGraph } from '../domain/facilitySectionGraph'
import {
  beginSecureTransferRelease,
  confirmSecureTransferDestinationSecure,
  confirmSecureTransferMovement,
  confirmSecureTransferRelease,
  createSecureContainedSubjectTransfer,
  interruptSecureTransfer,
  parseFacilitySecureContainedSubjectTransfers,
  projectExplainableSecureTransfer,
  runSecureTransferPreflight,
  type SecureTransferPreflightGates,
  type SecureTransferRecord,
} from '../domain/secureContainedSubjectTransfer'
import { buildCanonicalProcedureAdapterFixture } from './helpers/canonicalProcedureAdapterFixture'

const graph = readProductionFacilitySectionGraph()

const openGates: SecureTransferPreflightGates = Object.freeze({
  staffAuthorized: true,
  movementCapabilityValid: true,
  routeAccessible: true,
  permitReady: true,
  roomConfigSafe: true,
})

function procedureAdapter(executionKey = 'exec-transfer-1') {
  return buildCanonicalProcedureAdapterFixture({
    procedureId: 'secure_transfer_release',
    canonicalName: 'Secure Transfer Release',
    executionKey,
    includeEnvironmentalConditions: true,
  })
}

function createNonPerson(
  overrides: Partial<Parameters<typeof createSecureContainedSubjectTransfer>[0]> = {}
) {
  return createSecureContainedSubjectTransfer({
    transferId: 'xfer-1',
    subjectRef: 'subject:anomaly-a',
    subjectKind: 'non_person',
    originNodeId: 'room:containment_cell',
    destinationNodeId: 'room:med_bay',
    originZoneRef: 'zone:containment',
    destinationZoneRef: 'zone:medical',
    operationKey: 'op-create-1',
    ...overrides,
  })
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
        // Must be a SPE-2932 production node; unknown nodes fail closed.
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

function clearOutboundScreen() {
  return {
    direction: 'outbound',
    boundaryZoneId: 'zone:containment',
    actorId: 'subject:anomaly-a',
    policies: [
      {
        policyId: 'policy-clear',
        boundaryZoneId: 'zone:containment',
      },
    ],
  }
}

function holdOutboundScreen() {
  return {
    direction: 'outbound',
    boundaryZoneId: 'zone:containment',
    actorId: 'subject:anomaly-a',
    carriedClasses: ['biohazard_sample'],
    policies: [
      {
        policyId: 'policy-hold',
        boundaryZoneId: 'zone:containment',
        holdCarriedClasses: ['biohazard_sample'],
      },
    ],
  }
}

function runHappyPath(transfer: SecureTransferRecord): SecureTransferRecord {
  const preflight = runSecureTransferPreflight({
    transfer,
    operationKey: 'op-preflight-1',
    gates: openGates,
    coLocation: permittedCoLocation(),
    procedureAdapter: procedureAdapter(),
    authorizationRef: 'auth:release-1',
  })
  expect(preflight.ok).toBe(true)
  const releasing = beginSecureTransferRelease(preflight.transfer!, 'op-begin-release')
  expect(releasing.ok).toBe(true)
  const released = confirmSecureTransferRelease(releasing.transfer!, {
    operationKey: 'op-confirm-release',
    releaseCommitted: true,
  })
  expect(released.ok).toBe(true)
  const moved = confirmSecureTransferMovement(released.transfer!, {
    operationKey: 'op-confirm-move',
    movementCommitted: true,
  })
  expect(moved.ok).toBe(true)
  const secured = confirmSecureTransferDestinationSecure(moved.transfer!, {
    operationKey: 'op-confirm-secure',
    destinationSecured: true,
    custodyPlacementCommitted: true,
  })
  expect(secured.ok).toBe(true)
  return secured.transfer!
}

describe('SPE-3439 secure contained-subject transfer', () => {
  it('completes a valid same-site transfer through distinct owner-evidenced stages', () => {
    const created = createNonPerson()
    expect(created.ok).toBe(true)
    expect(created.transfer?.stage).toBe('requested')

    const completed = runHappyPath(created.transfer!)
    expect(completed.stage).toBe('completed')
    expect(completed.physicalEffectsOccurred).toBe(true)
    expect(completed.authorizationRef).toBe('auth:release-1')
    expect(completed.procedureExecutionKey).toBe('exec-transfer-1')
    expect(projectExplainableSecureTransfer(completed)).toMatchObject({
      stage: 'completed',
      outcome: 'completed',
      physicalEffectsOccurred: true,
    })
  })

  it('fail-closes incompatible destination preflight without claiming physical effects', () => {
    const created = createNonPerson()
    const blocked = runSecureTransferPreflight({
      transfer: created.transfer!,
      operationKey: 'op-preflight-reject',
      gates: openGates,
      coLocation: rejectedCoLocation(),
    })
    expect(blocked.ok).toBe(false)
    expect(blocked.transfer?.stage).toBe('blocked')
    expect(blocked.reasonCodes).toContain('incompatible_destination')
    expect(blocked.transfer?.physicalEffectsOccurred).toBe(false)
  })

  it('separates outbound screening hold from transfer permission', () => {
    const created = createNonPerson()
    const blocked = runSecureTransferPreflight({
      transfer: created.transfer!,
      operationKey: 'op-screen-hold',
      gates: { ...openGates, requiresOutboundScreen: true },
      coLocation: permittedCoLocation(),
      outboundScreen: holdOutboundScreen(),
    })
    expect(blocked.ok).toBe(false)
    expect(blocked.reasonCodes).toContain('outbound_screen_blocked')
    expect(blocked.evidence?.outboundScreen?.decision).toBe('hold')

    const cleared = runSecureTransferPreflight({
      transfer: created.transfer!,
      operationKey: 'op-screen-clear',
      gates: { ...openGates, requiresOutboundScreen: true },
      coLocation: permittedCoLocation(),
      outboundScreen: clearOutboundScreen(),
    })
    expect(cleared.ok).toBe(true)
    expect(cleared.transfer?.stage).toBe('authorized')
  })

  it('preserves physical effects on post-release interruption without rollback success', () => {
    const created = createNonPerson()
    const preflight = runSecureTransferPreflight({
      transfer: created.transfer!,
      operationKey: 'op-preflight-2',
      gates: openGates,
      coLocation: permittedCoLocation(),
    })
    const releasing = beginSecureTransferRelease(preflight.transfer!, 'op-begin-2')
    const released = confirmSecureTransferRelease(releasing.transfer!, {
      operationKey: 'op-released-2',
      releaseCommitted: true,
    })
    expect(released.transfer?.stage).toBe('in_transit')
    expect(released.transfer?.physicalEffectsOccurred).toBe(true)

    const failed = interruptSecureTransfer(released.transfer!, {
      operationKey: 'op-interrupt-2',
      incidentOwnerHint: 'SPE-1023',
    })
    expect(failed.ok).toBe(false)
    expect(failed.transfer?.stage).toBe('failed')
    expect(failed.transfer?.physicalEffectsOccurred).toBe(true)
    expect(failed.transfer?.incidentOwnerHint).toBe('SPE-1023')
    expect(failed.reasonCodes).toContain('interrupted_after_release')
  })

  it('aborts before release without inventing physical movement', () => {
    const created = createNonPerson()
    const aborted = interruptSecureTransfer(created.transfer!, {
      operationKey: 'op-abort-1',
    })
    expect(aborted.transfer?.stage).toBe('aborted')
    expect(aborted.transfer?.physicalEffectsOccurred).toBe(false)
  })

  it('preserves person custody identity refs and rejects unresolved subjects', () => {
    const unresolved = createSecureContainedSubjectTransfer({
      transferId: 'xfer-unresolved',
      subjectRef: 'subject:unknown',
      subjectKind: 'unresolved',
      originNodeId: 'room:containment_cell',
      destinationNodeId: 'room:med_bay',
      operationKey: 'op-unresolved',
    })
    expect(unresolved.ok).toBe(false)
    expect(unresolved.code).toBe('custody_unresolved')

    const person = createSecureContainedSubjectTransfer({
      transferId: 'xfer-person',
      subjectRef: 'person:42',
      subjectKind: 'person',
      originNodeId: 'room:containment_cell',
      destinationNodeId: 'room:med_bay',
      custodyStatusId: 'custody:42',
      formerRoleCategory: 'field_agent',
      operationKey: 'op-person-create',
    })
    expect(person.ok).toBe(true)
    expect(person.transfer?.custodyStatusId).toBe('custody:42')
    expect(person.transfer?.formerRoleCategory).toBe('field_agent')

    const completed = runHappyPath(person.transfer!)
    expect(completed.custodyStatusId).toBe('custody:42')
    expect(completed.formerRoleCategory).toBe('field_agent')
  })

  it('rejects non-person records that smuggle person-custody fields', () => {
    const smuggled = createSecureContainedSubjectTransfer({
      transferId: 'xfer-smuggle',
      subjectRef: 'subject:anomaly-b',
      subjectKind: 'non_person',
      originNodeId: 'room:containment_cell',
      destinationNodeId: 'room:med_bay',
      custodyStatusId: 'custody:should-not-exist',
      formerRoleCategory: 'not-a-person',
      operationKey: 'op-smuggle',
    })
    expect(smuggled.ok).toBe(false)
    expect(smuggled.code).toBe('malformed_input')
  })

  it('is idempotent on repeated operation keys and refuses stale duplicates', () => {
    const withState = createSecureContainedSubjectTransfer(
      {
        transferId: 'xfer-1',
        subjectRef: 'subject:anomaly-a',
        subjectKind: 'non_person',
        originNodeId: 'room:containment_cell',
        destinationNodeId: 'room:med_bay',
        operationKey: 'op-create-1',
      },
      createStartingState()
    )
    expect(withState.ok).toBe(true)
    expect(withState.transfer?.appliedOperationKeys).toEqual(['op-create-1'])

    const replay = createSecureContainedSubjectTransfer(
      {
        transferId: 'xfer-1',
        subjectRef: 'subject:anomaly-a',
        subjectKind: 'non_person',
        originNodeId: 'room:containment_cell',
        destinationNodeId: 'room:med_bay',
        operationKey: 'op-create-1',
      },
      withState.state
    )
    expect(replay.ok).toBe(true)
    expect(replay.transfer?.appliedOperationKeys).toEqual(['op-create-1'])

    const stale = createSecureContainedSubjectTransfer(
      {
        transferId: 'xfer-1',
        subjectRef: 'subject:anomaly-a',
        subjectKind: 'non_person',
        originNodeId: 'room:containment_cell',
        destinationNodeId: 'room:med_bay',
        operationKey: 'op-create-2',
      },
      withState.state
    )
    expect(stale.ok).toBe(false)
    expect(stale.code).toBe('stale_operation')
  })

  it('round-trips durable in-progress transfers through parse hydration', () => {
    const created = createSecureContainedSubjectTransfer(
      {
        transferId: 'xfer-1',
        subjectRef: 'subject:anomaly-a',
        subjectKind: 'non_person',
        originNodeId: 'room:containment_cell',
        destinationNodeId: 'room:med_bay',
        operationKey: 'op-create-persist',
      },
      createStartingState()
    )
    expect(created.ok).toBe(true)
    const preflight = runSecureTransferPreflight(
      {
        transfer: created.transfer!,
        operationKey: 'op-preflight-persist',
        gates: openGates,
        coLocation: permittedCoLocation(),
      },
      created.state
    )
    const releasing = beginSecureTransferRelease(
      preflight.transfer!,
      'op-begin-persist',
      preflight.state
    )
    expect(releasing.state?.facilitySecureContainedSubjectTransfers?.['xfer-1']?.stage).toBe(
      'release_in_progress'
    )

    const loaded = hydrateGame(structuredClone(releasing.state!))
    expect(loaded.facilitySecureContainedSubjectTransfers?.['xfer-1']?.stage).toBe(
      'release_in_progress'
    )
    expect(loaded.facilitySecureContainedSubjectTransfers?.['xfer-1']?.subjectRef).toBe(
      'subject:anomaly-a'
    )

    const parsed = parseFacilitySecureContainedSubjectTransfers({
      'xfer-1': releasing.transfer!,
      bad: { transferId: 'mismatch' },
    })
    expect(parsed?.['xfer-1']?.stage).toBe('release_in_progress')
    expect(parsed?.bad).toBeUndefined()
  })

  it('keeps completed transfers in registry after authorizing another transfer', () => {
    const first = createSecureContainedSubjectTransfer(
      {
        transferId: 'xfer-a',
        subjectRef: 'subject:anomaly-a',
        subjectKind: 'non_person',
        originNodeId: 'room:containment_cell',
        destinationNodeId: 'room:med_bay',
        operationKey: 'op-a-create',
      },
      createStartingState()
    )
    expect(first.ok).toBe(true)
    const completed = runHappyPath(first.transfer!)
    const withCompleted = {
      ...first.state!,
      facilitySecureContainedSubjectTransfers: {
        'xfer-a': completed,
      },
    }
    const second = createSecureContainedSubjectTransfer(
      {
        transferId: 'xfer-b',
        subjectRef: 'subject:anomaly-b',
        subjectKind: 'non_person',
        originNodeId: 'room:containment_cell',
        destinationNodeId: 'room:med_bay',
        operationKey: 'op-b-create',
      },
      withCompleted
    )
    expect(second.ok).toBe(true)
    expect(second.state?.facilitySecureContainedSubjectTransfers?.['xfer-a']?.stage).toBe(
      'completed'
    )
    expect(second.state?.facilitySecureContainedSubjectTransfers?.['xfer-b']?.stage).toBe(
      'requested'
    )

    const loaded = hydrateGame(structuredClone(second.state!))
    expect(Object.isFrozen(loaded.facilitySecureContainedSubjectTransfers)).toBe(true)
    expect(loaded.facilitySecureContainedSubjectTransfers?.['xfer-a']?.stage).toBe('completed')
  })

  it('does not advance on uncommitted release or destination evidence', () => {
    const created = createNonPerson()
    const preflight = runSecureTransferPreflight({
      transfer: created.transfer!,
      operationKey: 'op-preflight-unc',
      gates: openGates,
      coLocation: permittedCoLocation(),
    })
    const releasing = beginSecureTransferRelease(preflight.transfer!, 'op-begin-unc')
    const uncommitted = confirmSecureTransferRelease(releasing.transfer!, {
      operationKey: 'op-unc-release',
      releaseCommitted: false,
    })
    expect(uncommitted.ok).toBe(false)
    expect(uncommitted.code).toBe('release_not_committed')
    expect(releasing.transfer?.stage).toBe('release_in_progress')
  })
})
