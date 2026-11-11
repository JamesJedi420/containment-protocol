import { describe, expect, it } from 'vitest'
import { hydrateGame } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import {
  resolveOperationalPersonnelClaimOutcome,
  toAssignmentClaimEvidence,
} from '../domain/operationalPersonnelClaimOutcome'
import { assignBreachRecovery, createBreachOriginRecovery } from '../domain/breachOriginRecovery'
import { createBreachEscapeRespondFixture } from './helpers/breachOriginRecoveryFixtures'

describe('SPE-3055 operational personnel claim outcome producer', () => {
  it('resolves held claim success with stable claimId', () => {
    const held = resolveOperationalPersonnelClaimOutcome({
      attemptId: ' attempt-1 ',
      operationRef: ' operation:recovery-a ',
      requirementRefs: [' personnel:a ', 'team:response-1'],
      claimCommitted: true,
    })
    const heldAgain = resolveOperationalPersonnelClaimOutcome({
      attemptId: 'attempt-1',
      operationRef: 'operation:recovery-a',
      requirementRefs: ['personnel:a', 'team:response-1'],
      claimCommitted: true,
    })
    expect(held.ok).toBe(true)
    expect(heldAgain.ok).toBe(true)
    if (!held.ok || !heldAgain.ok) return
    expect(held.outcome.claimed).toBe(true)
    expect(held.outcome.reasonCodes).toEqual(['claim_held'])
    expect(held.outcome.claimId).toBe('claim:attempt-1')
    expect(held.outcome.claimId).toBe(heldAgain.outcome.claimId)
    expect(held.outcome.operationRef).toBe('operation:recovery-a')
    expect(toAssignmentClaimEvidence(held.outcome)).toEqual({
      producerOwner: 'SPE-3055',
      claimId: 'claim:attempt-1',
      operationRef: 'operation:recovery-a',
      claimed: true,
    })
  })

  it('rejects malformed attempts without evidence', () => {
    expect(resolveOperationalPersonnelClaimOutcome(null).ok).toBe(false)
    expect(
      resolveOperationalPersonnelClaimOutcome({
        attemptId: '',
        operationRef: 'operation:recovery-a',
        requirementRefs: ['personnel:a'],
        claimCommitted: true,
      }).ok
    ).toBe(false)
    expect(
      resolveOperationalPersonnelClaimOutcome({
        attemptId: 'attempt-2',
        operationRef: '   ',
        requirementRefs: ['personnel:a'],
        claimCommitted: true,
      }).ok
    ).toBe(false)
    expect(
      resolveOperationalPersonnelClaimOutcome({
        attemptId: 'attempt-3',
        operationRef: 'operation:recovery-a',
        requirementRefs: [],
        claimCommitted: true,
      }).ok
    ).toBe(false)
    expect(
      resolveOperationalPersonnelClaimOutcome({
        attemptId: 'attempt-4',
        operationRef: 'operation:recovery-a',
        requirementRefs: ['  '],
        claimCommitted: true,
      }).ok
    ).toBe(false)
    expect(
      resolveOperationalPersonnelClaimOutcome({
        attemptId: 'attempt-5',
        operationRef: 'operation:recovery-a',
        requirementRefs: ['personnel:a'],
        claimCommitted: true as unknown as boolean,
        requirementSetSatisfied: 'yes' as unknown as boolean,
      }).ok
    ).toBe(false)
    expect(
      resolveOperationalPersonnelClaimOutcome({
        attemptId: 'attempt-6',
        operationRef: 'operation:recovery-a',
        requirementRefs: ['personnel:a'],
        claimCommitted: true,
        blockedByHigherPriorityCommitment: 'true' as unknown as boolean,
      }).ok
    ).toBe(false)
  })

  it('fails closed for uncommitted, unsatisfied set, and higher-priority block', () => {
    const uncommitted = resolveOperationalPersonnelClaimOutcome({
      attemptId: 'attempt-uncommitted',
      operationRef: 'operation:recovery-a',
      requirementRefs: ['personnel:a'],
      claimCommitted: false,
    })
    expect(uncommitted.ok).toBe(true)
    if (!uncommitted.ok) return
    expect(uncommitted.outcome.claimed).toBe(false)
    expect(uncommitted.outcome.reasonCodes).toEqual(['claim_not_committed'])

    const unsatisfied = resolveOperationalPersonnelClaimOutcome({
      attemptId: 'attempt-partial',
      operationRef: 'operation:recovery-a',
      requirementRefs: ['personnel:a', 'personnel:b'],
      claimCommitted: true,
      requirementSetSatisfied: false,
    })
    expect(unsatisfied.ok).toBe(true)
    if (!unsatisfied.ok) return
    expect(unsatisfied.outcome.claimed).toBe(false)
    expect(unsatisfied.outcome.reasonCodes).toEqual(['requirement_set_unsatisfied'])

    const blocked = resolveOperationalPersonnelClaimOutcome({
      attemptId: 'attempt-blocked',
      operationRef: 'operation:recovery-a',
      requirementRefs: ['personnel:a'],
      claimCommitted: true,
      blockedByHigherPriorityCommitment: true,
    })
    expect(blocked.ok).toBe(true)
    if (!blocked.ok) return
    expect(blocked.outcome.claimed).toBe(false)
    expect(blocked.outcome.reasonCodes).toEqual(['higher_priority_commitment'])
  })

  it('feeds real producer evidence into SPE-3735 assignBreachRecovery without completing recovery', () => {
    const fixture = createBreachEscapeRespondFixture({
      registryId: 'reg-escaped-claim-1',
      caseId: 'case:escape-claim-1',
    })
    const created = createBreachOriginRecovery({
      recoveryId: 'rec-claim-seam-ok',
      escapeEvidence: fixture.escapeEvidence,
      subjectKind: 'non_person',
      recoveryObjectiveRef: 'objective:recontain-anomaly-a',
      destinationNodeId: 'room:med_bay',
      operationKey: 'op-create-claim-seam',
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const held = resolveOperationalPersonnelClaimOutcome({
      attemptId: 'attempt-recovery-claim',
      operationRef: 'operation:breach-recovery-claim',
      requirementRefs: ['personnel:responder-a', 'team:response-alpha'],
      claimCommitted: true,
    })
    expect(held.ok).toBe(true)
    if (!held.ok) return

    const starting = createStartingState()
    const assigned = assignBreachRecovery(
      created.recovery!,
      {
        operationKey: 'op-assign-from-producer',
        assignmentClaim: toAssignmentClaimEvidence(held.outcome),
        respondWorkItem: fixture.respondWorkItem,
      },
      starting
    )
    expect(assigned.ok).toBe(true)
    expect(assigned.recovery?.stage).toBe('recovery_assigned')
    expect(assigned.recovery?.assignmentClaimRef).toBe('claim:attempt-recovery-claim')
    expect(assigned.recovery?.stage).not.toBe('completed')
    expect(assigned.state?.facilityBreachOriginRecoveries?.['rec-claim-seam-ok']?.assignmentClaimRef).toBe(
      'claim:attempt-recovery-claim'
    )

    const hydrated = hydrateGame(assigned.state!)
    expect(hydrated.facilityBreachOriginRecoveries?.['rec-claim-seam-ok']?.assignmentClaimRef).toBe(
      'claim:attempt-recovery-claim'
    )
    expect(hydrated.facilityBreachOriginRecoveries?.['rec-claim-seam-ok']?.stage).toBe(
      'recovery_assigned'
    )

    const failResolve = resolveOperationalPersonnelClaimOutcome({
      attemptId: 'attempt-recovery-claim-fail',
      operationRef: 'operation:breach-recovery-claim',
      requirementRefs: ['personnel:responder-a'],
      claimCommitted: false,
    })
    expect(failResolve.ok).toBe(true)
    if (!failResolve.ok) return

    const failFixture = createBreachEscapeRespondFixture({
      registryId: 'reg-escaped-claim-fail',
      caseId: 'case:escape-claim-fail',
    })
    const createdFail = createBreachOriginRecovery({
      recoveryId: 'rec-claim-seam-fail',
      escapeEvidence: failFixture.escapeEvidence,
      subjectKind: 'non_person',
      recoveryObjectiveRef: 'objective:recontain-anomaly-a',
      destinationNodeId: 'room:med_bay',
      operationKey: 'op-create-claim-fail',
    })
    expect(createdFail.ok).toBe(true)
    if (!createdFail.ok) return

    const failed = assignBreachRecovery(createdFail.recovery!, {
      operationKey: 'op-assign-from-producer-fail',
      assignmentClaim: toAssignmentClaimEvidence(failResolve.outcome),
      respondWorkItem: failFixture.respondWorkItem,
    })
    expect(failed.ok).toBe(false)
    expect(failed.code).toBe('assignment_claim_not_held')
    expect(failed.recovery?.stage).toBe('escape_reported')
    expect(failed.recovery?.stage).not.toBe('completed')
  })
})
