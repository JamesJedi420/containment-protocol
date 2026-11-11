import { describe, expect, it } from 'vitest'
import { hydrateGame } from '../app/store/runTransfer'
import { useGameStore } from '../app/store/gameStore'
import { readProductionFacilitySectionGraph } from '../domain/facilitySectionGraph'
import {
  createLiveRegistryEntry,
  updateLiveRegistryEntry,
} from '../domain/liveRegistry'
import {
  applyBreachOriginRecoveryStep,
  buildBreachRecoveryRespondWorkItem,
} from '../domain/breachOriginRecoveryLivePath'
import { buildCanonicalProcedureAdapterFixture } from './helpers/canonicalProcedureAdapterFixture'
import { resetGameStoreFixture } from './storeFixtures'

const graph = readProductionFacilitySectionGraph()

function escapeEntries() {
  const previousEntry = createLiveRegistryEntry({
    id: 'reg-live-escape-1',
    entityId: 'subject:anomaly-live',
    entityClass: 'anomaly',
    label: 'Anomaly Live',
    operationalState: 'contained',
    truthState: 'confirmed',
    confidence: 0.9,
    week: 4,
    linkedCaseIds: ['case:escape-live-1'],
  })
  const nextEntry = updateLiveRegistryEntry(previousEntry, {
    operationalState: 'loose',
    week: 5,
    reasonCode: 'contained-to-loose',
    triggerSource: 'containment-breach',
  })
  const respondWorkItem = buildBreachRecoveryRespondWorkItem(previousEntry, nextEntry)
  if (respondWorkItem === undefined) {
    throw new Error('expected escape respond work item')
  }
  return { previousEntry, nextEntry, respondWorkItem }
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
      subjectId: 'subject:anomaly-live',
      subjectClass: 'volatile_sample',
      proposedNodeId: destinationNodeId,
      zoneRef: 'zone:medical',
    },
  }
}

function procedureAdapter(executionKey = 'exec-breach-live-verify-1') {
  return buildCanonicalProcedureAdapterFixture({
    procedureId: 'breach_recovery_recontainment',
    canonicalName: 'Breach Recovery Recontainment',
    executionKey,
    includeEnvironmentalConditions: true,
  })
}

describe('SPE-3735 breach-origin recovery live wiring', () => {
  it('store path: SPE-3055 claim producer → assign → locate mutates durable recoveries', () => {
    resetGameStoreFixture()
    const { previousEntry, nextEntry, respondWorkItem } = escapeEntries()
    const store = useGameStore.getState()

    const created = store.applyBreachOriginRecoveryStep({
      kind: 'create',
      recoveryId: 'rec-live-assign-locate',
      previousEntry,
      nextEntry,
      incidentCaseRef: 'case:escape-live-1',
      subjectKind: 'non_person',
      recoveryObjectiveRef: 'objective:recontain-anomaly-live',
      destinationNodeId: 'room:med_bay',
      destinationZoneRef: 'zone:medical',
      operationKey: 'op-live-create',
    })
    expect(created.ok).toBe(true)
    expect(created.recovery?.stage).toBe('escape_reported')
    expect(
      useGameStore.getState().game.facilityBreachOriginRecoveries?.['rec-live-assign-locate']
        ?.stage
    ).toBe('escape_reported')

    const assigned = useGameStore.getState().applyBreachOriginRecoveryStep({
      kind: 'assign',
      recoveryId: 'rec-live-assign-locate',
      operationKey: 'op-live-assign',
      claimAttempt: {
        attemptId: 'response-live-1',
        operationRef: 'operation:breach-recovery-live',
        requirementRefs: ['personnel:responder-a'],
        claimCommitted: true,
      },
      respondWorkItem,
    })
    expect(assigned.ok).toBe(true)
    expect(assigned.recovery?.stage).toBe('recovery_assigned')
    expect(assigned.recovery?.assignmentClaimRef).toBe('claim:response-live-1')

    const located = useGameStore.getState().applyBreachOriginRecoveryStep({
      kind: 'locate',
      recoveryId: 'rec-live-assign-locate',
      operationKey: 'op-live-locate',
      locatedCommitted: true,
    })
    expect(located.ok).toBe(true)
    expect(located.recovery?.stage).toBe('subject_located')
    expect(
      useGameStore.getState().game.facilityBreachOriginRecoveries?.['rec-live-assign-locate']
        ?.stage
    ).toBe('subject_located')
  })

  it('store path: full §1 producer → assign → locate → capture → move → admit → verify → completed', () => {
    resetGameStoreFixture()
    const { previousEntry, nextEntry, respondWorkItem } = escapeEntries()

    expect(
      useGameStore.getState().applyBreachOriginRecoveryStep({
        kind: 'create',
        recoveryId: 'rec-live-full-path',
        previousEntry,
        nextEntry,
        incidentCaseRef: 'case:escape-live-1',
        subjectKind: 'non_person',
        recoveryObjectiveRef: 'objective:recontain-anomaly-live',
        destinationNodeId: 'room:med_bay',
        destinationZoneRef: 'zone:medical',
        operationKey: 'op-live-create-full',
      }).ok
    ).toBe(true)

    expect(
      useGameStore.getState().applyBreachOriginRecoveryStep({
        kind: 'assign',
        recoveryId: 'rec-live-full-path',
        operationKey: 'op-live-assign-full',
        claimAttempt: {
          attemptId: 'response-live-full',
          operationRef: 'operation:breach-recovery-live',
          requirementRefs: ['personnel:responder-a'],
          claimCommitted: true,
        },
        respondWorkItem,
      }).ok
    ).toBe(true)

    expect(
      useGameStore.getState().applyBreachOriginRecoveryStep({
        kind: 'locate',
        recoveryId: 'rec-live-full-path',
        operationKey: 'op-live-locate-full',
        locatedCommitted: true,
      }).ok
    ).toBe(true)

    const captured = useGameStore.getState().applyBreachOriginRecoveryStep({
      kind: 'capture',
      recoveryId: 'rec-live-full-path',
      operationKey: 'op-live-capture',
      week: 6,
      captureAttempt: {
        attemptId: 'capture-live-1',
        subjectRef: 'subject:anomaly-live',
        controlCommitted: true,
        restraintCompatible: true,
      },
    })
    expect(captured.ok).toBe(true)
    expect(captured.recovery?.stage).toBe('capture_secured')
    expect(captured.recovery?.stage).not.toBe('completed')

    const arrived = useGameStore.getState().applyBreachOriginRecoveryStep({
      kind: 'move',
      recoveryId: 'rec-live-full-path',
      operationKey: 'op-live-arrive',
      movementAttempt: {
        attemptId: 'move-live-1',
        subjectRef: 'subject:anomaly-live',
        movementCommitted: true,
        arrivedAtDestination: true,
        routeEligible: true,
      },
    })
    expect(arrived.ok).toBe(true)
    expect(arrived.recovery?.stage).toBe('admission_pending')
    expect(arrived.recovery?.stage).not.toBe('completed')

    const admitted = useGameStore.getState().applyBreachOriginRecoveryStep({
      kind: 'admit',
      recoveryId: 'rec-live-full-path',
      operationKey: 'op-live-admit',
      week: 6,
      admissionCommitted: true,
      coLocation: permittedCoLocation(),
    })
    expect(admitted.ok).toBe(true)
    expect(admitted.recovery?.stage).toBe('containment_verification')

    const completed = useGameStore.getState().applyBreachOriginRecoveryStep({
      kind: 'verify',
      recoveryId: 'rec-live-full-path',
      operationKey: 'op-live-verify',
      week: 7,
      recontainmentVerified: true,
      procedureAdapter: procedureAdapter(),
    })
    expect(completed.ok).toBe(true)
    expect(completed.recovery?.stage).toBe('completed')
    expect(completed.recovery?.terminalOutcomeReported).toBe(true)

    const durable =
      useGameStore.getState().game.facilityBreachOriginRecoveries?.['rec-live-full-path']
    expect(durable?.stage).toBe('completed')

    const hydrated = hydrateGame(useGameStore.getState().game)
    expect(hydrated.facilityBreachOriginRecoveries?.['rec-live-full-path']?.stage).toBe(
      'completed'
    )
    expect(
      hydrated.facilityBreachOriginRecoveries?.['rec-live-full-path']?.assignmentClaimRef
    ).toBe('claim:response-live-full')
    expect(
      hydrated.facilityBreachOriginRecoveries?.['rec-live-full-path']?.captureOutcomeId
    ).toBe('capture:capture-live-1')
    expect(hydrated.facilityBreachOriginRecoveries?.['rec-live-full-path']?.movementId).toBe(
      'move:move-live-1'
    )
  })

  it('rejects status-patch create and claim-without-respond through the live step API', () => {
    resetGameStoreFixture()
    const { previousEntry, nextEntry, respondWorkItem } = escapeEntries()

    const patched = applyBreachOriginRecoveryStep(useGameStore.getState().game, {
      kind: 'create',
      recoveryId: 'rec-live-patch',
      previousEntry,
      nextEntry,
      incidentCaseRef: 'case:escape-live-1',
      subjectKind: 'non_person',
      recoveryObjectiveRef: 'objective:recontain-anomaly-live',
      destinationNodeId: 'room:med_bay',
      operationKey: 'op-live-patch',
      statusPatchComplete: true,
    })
    expect(patched.ok).toBe(false)
    expect(patched.ok === false && patched.code).toBe('status_patch_forbidden')

    const created = useGameStore.getState().applyBreachOriginRecoveryStep({
      kind: 'create',
      recoveryId: 'rec-live-gates',
      previousEntry,
      nextEntry,
      incidentCaseRef: 'case:escape-live-1',
      subjectKind: 'non_person',
      recoveryObjectiveRef: 'objective:recontain-anomaly-live',
      destinationNodeId: 'room:med_bay',
      operationKey: 'op-live-create-gates',
    })
    expect(created.ok).toBe(true)

    const unclaimed = useGameStore.getState().applyBreachOriginRecoveryStep({
      kind: 'assign',
      recoveryId: 'rec-live-gates',
      operationKey: 'op-live-assign-unclaimed',
      claimAttempt: {
        attemptId: 'response-unclaimed',
        operationRef: 'operation:breach-recovery-live',
        requirementRefs: ['personnel:responder-a'],
        claimCommitted: false,
      },
      respondWorkItem,
    })
    expect(unclaimed.ok).toBe(false)
    expect(unclaimed.ok === false && unclaimed.code).toBe('assignment_claim_not_held')
    expect(
      useGameStore.getState().game.facilityBreachOriginRecoveries?.['rec-live-gates']?.stage
    ).toBe('escape_reported')
  })

  it('capture alone through the live path cannot complete recovery', () => {
    resetGameStoreFixture()
    const { previousEntry, nextEntry, respondWorkItem } = escapeEntries()
    const store = useGameStore.getState()

    store.applyBreachOriginRecoveryStep({
      kind: 'create',
      recoveryId: 'rec-live-capture-only',
      previousEntry,
      nextEntry,
      incidentCaseRef: 'case:escape-live-1',
      subjectKind: 'non_person',
      recoveryObjectiveRef: 'objective:recontain-anomaly-live',
      destinationNodeId: 'room:med_bay',
      operationKey: 'op-live-create-cap',
    })
    useGameStore.getState().applyBreachOriginRecoveryStep({
      kind: 'assign',
      recoveryId: 'rec-live-capture-only',
      operationKey: 'op-live-assign-cap',
      claimAttempt: {
        attemptId: 'response-cap',
        operationRef: 'operation:breach-recovery-live',
        requirementRefs: ['personnel:responder-a'],
        claimCommitted: true,
      },
      respondWorkItem,
    })
    useGameStore.getState().applyBreachOriginRecoveryStep({
      kind: 'locate',
      recoveryId: 'rec-live-capture-only',
      operationKey: 'op-live-locate-cap',
      locatedCommitted: true,
    })

    const captured = useGameStore.getState().applyBreachOriginRecoveryStep({
      kind: 'capture',
      recoveryId: 'rec-live-capture-only',
      operationKey: 'op-live-capture-only',
      week: 6,
      captureAttempt: {
        attemptId: 'capture-only',
        subjectRef: 'subject:anomaly-live',
        controlCommitted: true,
        restraintCompatible: true,
      },
    })
    expect(captured.ok).toBe(true)
    expect(captured.recovery?.stage).toBe('capture_secured')
    expect(captured.recovery?.terminalOutcomeReported).toBe(false)
  })
})
