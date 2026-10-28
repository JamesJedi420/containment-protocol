import { describe, expect, it } from 'vitest'
import {
  DEMO_AGENCY_ALPHA,
  DEMO_AGENCY_BETA,
  DEMO_PERSONNEL_ASSET_ID,
  createDemoInterAgencyOwnershipTransferState,
} from './interAgencyOwnershipTransfer'
import {
  DEMO_SPONSORED_ASSIGNMENT_ID,
  DEMO_TRAINEE_PERSON_ID,
  SPONSORED_TRAINING_COMPLETION_OWNER,
  SPONSORED_TRAINING_COMPLETION_SCHEMA_VERSION,
  applySponsoredTrainingCloseout,
  createDemoCommitmentLockedAssignment,
  createDemoRetainGraduateAssignment,
  createDemoTransferOwnershipAssignment,
  createEmptyInterAgencyOwnershipTransferState,
  createEmptySponsoredTrainingCompletionState,
  isTraineePersonBlockedForSpawn,
  parseSponsoredTrainingAssignment,
  parseSponsoredTrainingCompletionState,
  registerSponsoredTrainingAssignment,
} from './sponsoredTrainingCompletion'

function registerRetainAssignment() {
  let training = createEmptySponsoredTrainingCompletionState()
  const reg = registerSponsoredTrainingAssignment(training, createDemoRetainGraduateAssignment())
  expect(reg.outcome).toBe('applied')
  training = reg.state
  return training
}

describe('SPE-3124 sponsored training completion and personnel transfer', () => {
  it('exports frozen contract metadata', () => {
    expect(SPONSORED_TRAINING_COMPLETION_OWNER).toBe('SPE-3124')
    expect(SPONSORED_TRAINING_COMPLETION_SCHEMA_VERSION).toBe('spe-3124.v1')
  })

  it('completes with trainee retained — no ownership mutation', () => {
    const training = registerRetainAssignment()
    const ownership = createDemoInterAgencyOwnershipTransferState()
    const beforeOwner = ownership.ownership[DEMO_PERSONNEL_ASSET_ID]?.owningAgencyId

    const result = applySponsoredTrainingCloseout(training, ownership, {
      kind: 'complete_success',
      closeoutId: 'closeout:retain-001',
      assignmentId: DEMO_SPONSORED_ASSIGNMENT_ID,
      authoritativeWeek: 12,
    })

    expect(result.outcome).toBe('applied')
    expect(result.outcomeRecord?.outcomeKind).toBe('retained_completion')
    expect(result.outcomeRecord?.paymentAppliedRef).toBe('economy:sponsored-training:payment-tier-0')
    expect(result.outcomeRecord?.ownershipTransferRequestId).toBeUndefined()
    expect(result.ownershipTransfer).toBeUndefined()
    expect(result.ownershipState.ownership[DEMO_PERSONNEL_ASSET_ID]?.owningAgencyId).toBe(
      beforeOwner,
    )
    expect(result.trainingState.assignments[DEMO_SPONSORED_ASSIGNMENT_ID]?.lifecycleState).toBe(
      'completed',
    )
    expect(isTraineePersonBlockedForSpawn(result.trainingState, DEMO_TRAINEE_PERSON_ID)).toBe(
      false,
    )
  })

  it('transfer branch invokes SPE-2738 and records provenance once', () => {
    let training = createEmptySponsoredTrainingCompletionState()
    const transferAssignment = createDemoTransferOwnershipAssignment(DEMO_PERSONNEL_ASSET_ID)
    training = registerSponsoredTrainingAssignment(training, transferAssignment).state

    const ownership = createDemoInterAgencyOwnershipTransferState()
    const result = applySponsoredTrainingCloseout(training, ownership, {
      kind: 'complete_success',
      closeoutId: 'closeout:transfer-001',
      assignmentId: transferAssignment.id,
      authoritativeWeek: 14,
    })

    expect(result.outcome).toBe('applied')
    expect(result.outcomeRecord?.outcomeKind).toBe('transfer_completion')
    expect(result.outcomeRecord?.ownershipTransferRequestId).toBe(
      'closeout:transfer-001:ownership-transfer',
    )
    expect(result.outcomeRecord?.ownershipTransferProvenanceEntryId).toBe(
      'closeout:transfer-001:ownership-transfer:prov',
    )
    expect(result.outcomeRecord?.relationshipConsequenceAppliedRef).toBe(
      'trust:sponsor-transfer-tier-1',
    )
    expect(result.ownershipTransfer?.outcome).toBe('completed')
    expect(result.ownershipState.ownership[DEMO_PERSONNEL_ASSET_ID]?.owningAgencyId).toBe(
      DEMO_AGENCY_BETA,
    )
    expect(result.ownershipState.provenance[DEMO_PERSONNEL_ASSET_ID]).toHaveLength(1)
  })

  it('qualification failure retains trainee with bounded consequence only', () => {
    let training = registerRetainAssignment()
    const ownership = createDemoInterAgencyOwnershipTransferState()
    const beforeOwner = ownership.ownership[DEMO_PERSONNEL_ASSET_ID]?.owningAgencyId

    const result = applySponsoredTrainingCloseout(training, ownership, {
      kind: 'fail_qualification',
      closeoutId: 'closeout:fail-001',
      assignmentId: DEMO_SPONSORED_ASSIGNMENT_ID,
      authoritativeWeek: 11,
    })

    expect(result.outcome).toBe('applied')
    expect(result.outcomeRecord?.outcomeKind).toBe('qualification_failure')
    expect(result.outcomeRecord?.failureConsequenceAppliedRef).toBe(
      'consequence:qualification-failure-bounded',
    )
    expect(result.outcomeRecord?.paymentAppliedRef).toBeUndefined()
    expect(result.outcomeRecord?.ownershipTransferRequestId).toBeUndefined()
    expect(result.ownershipState.ownership[DEMO_PERSONNEL_ASSET_ID]?.owningAgencyId).toBe(
      beforeOwner,
    )
    training = result.trainingState
    expect(training.assignments[DEMO_SPONSORED_ASSIGNMENT_ID]?.lifecycleState).toBe('completed')
  })

  it('transfer bundle applies terminal state and effect refs exactly once', () => {
    let training = createEmptySponsoredTrainingCompletionState()
    const transferAssignment = createDemoTransferOwnershipAssignment(DEMO_PERSONNEL_ASSET_ID)
    training = registerSponsoredTrainingAssignment(training, transferAssignment).state
    let ownership = createDemoInterAgencyOwnershipTransferState()

    const first = applySponsoredTrainingCloseout(training, ownership, {
      kind: 'complete_success',
      closeoutId: 'closeout:bundle-once',
      assignmentId: transferAssignment.id,
      authoritativeWeek: 15,
    })
    expect(first.outcome).toBe('applied')
    training = first.trainingState
    ownership = first.ownershipState

    const replay = applySponsoredTrainingCloseout(training, ownership, {
      kind: 'complete_success',
      closeoutId: 'closeout:bundle-once',
      assignmentId: transferAssignment.id,
      authoritativeWeek: 15,
    })
    expect(replay.outcome).toBe('idempotent_replay')
    expect(replay.ownershipState).toBe(ownership)
    expect(replay.outcomeRecord).toEqual(first.outcomeRecord)
    expect(replay.ownershipState.provenance[DEMO_PERSONNEL_ASSET_ID]).toHaveLength(1)
  })

  it('target invalidation terminates assignment without dangling live reference', () => {
    let training = registerRetainAssignment()
    expect(isTraineePersonBlockedForSpawn(training, DEMO_TRAINEE_PERSON_ID)).toBe(true)

    const ownership = createEmptyInterAgencyOwnershipTransferState()
    const result = applySponsoredTrainingCloseout(training, ownership, {
      kind: 'invalidate_target',
      closeoutId: 'closeout:invalidate-001',
      assignmentId: DEMO_SPONSORED_ASSIGNMENT_ID,
      authoritativeWeek: 10,
    })

    expect(result.outcome).toBe('applied')
    expect(result.outcomeRecord?.outcomeKind).toBe('target_invalidation')
    training = result.trainingState
    expect(training.assignments[DEMO_SPONSORED_ASSIGNMENT_ID]?.lifecycleState).toBe('canceled')
    expect(training.activeTraineePersonIds[DEMO_TRAINEE_PERSON_ID]).toBeUndefined()
    expect(isTraineePersonBlockedForSpawn(training, DEMO_TRAINEE_PERSON_ID)).toBe(false)
  })

  it('target-unavailable cancellation uses producer consequence without full abandonment penalty', () => {
    let training = registerRetainAssignment()
    const ownership = createEmptyInterAgencyOwnershipTransferState()

    const result = applySponsoredTrainingCloseout(training, ownership, {
      kind: 'cancel_target_unavailable',
      closeoutId: 'closeout:unavail-001',
      assignmentId: DEMO_SPONSORED_ASSIGNMENT_ID,
      authoritativeWeek: 10,
    })

    expect(result.outcome).toBe('applied')
    expect(result.outcomeRecord?.outcomeKind).toBe('target_unavailable_cancellation')
    expect(result.outcomeRecord?.cancellationConsequenceRef).toBe(
      'consequence:target-unavailable-producer',
    )
    expect(result.outcomeRecord?.abandonmentPenaltyApplied).toBe(false)
    training = result.trainingState
    expect(training.assignments[DEMO_SPONSORED_ASSIGNMENT_ID]?.lifecycleState).toBe('canceled')
  })

  it('voluntary cancellation applies abandonment penalty ref', () => {
    const training = registerRetainAssignment()
    const ownership = createEmptyInterAgencyOwnershipTransferState()

    const result = applySponsoredTrainingCloseout(training, ownership, {
      kind: 'cancel_voluntary',
      closeoutId: 'closeout:voluntary-001',
      assignmentId: DEMO_SPONSORED_ASSIGNMENT_ID,
      authoritativeWeek: 10,
    })

    expect(result.outcome).toBe('applied')
    expect(result.outcomeRecord?.outcomeKind).toBe('voluntary_cancellation')
    expect(result.outcomeRecord?.abandonmentPenaltyApplied).toBe(true)
    expect(result.outcomeRecord?.cancellationConsequenceRef).toBe(
      'consequence:voluntary-abandonment-full',
    )
  })

  it('commitment-locked assignments reject cancellation', () => {
    const locked = createDemoCommitmentLockedAssignment()
    const training = registerSponsoredTrainingAssignment(
      createEmptySponsoredTrainingCompletionState(),
      locked,
    ).state
    expect(training.assignments[locked.id]?.lifecycleState).toBe('commitment_locked')

    const ownership = createEmptyInterAgencyOwnershipTransferState()
    const result = applySponsoredTrainingCloseout(training, ownership, {
      kind: 'cancel_voluntary',
      closeoutId: 'closeout:locked-attempt',
      assignmentId: locked.id,
      authoritativeWeek: 10,
    })

    expect(result.outcome).toBe('rejected')
    expect(result.reasonCode).toBe('commitment_locked')
    expect(training.assignments[locked.id]?.lifecycleState).toBe('commitment_locked')
  })

  it('blocks duplicate trainee registration while assignment is active', () => {
    const training = registerRetainAssignment()
    const duplicate = registerSponsoredTrainingAssignment(training, {
      ...createDemoRetainGraduateAssignment(),
      id: 'sponsored-training:duplicate',
    })
    expect(duplicate.outcome).toBe('rejected')
    expect(duplicate.reasonCode).toBe('duplicate_trainee_assignment')
  })

  it('parse/hydrate round-trip preserves closeouts for save-load idempotency', () => {
    let training = createEmptySponsoredTrainingCompletionState()
    const transferAssignment = createDemoTransferOwnershipAssignment(DEMO_PERSONNEL_ASSET_ID)
    training = registerSponsoredTrainingAssignment(training, transferAssignment).state
    let ownership = createDemoInterAgencyOwnershipTransferState()

    const applied = applySponsoredTrainingCloseout(training, ownership, {
      kind: 'complete_success',
      closeoutId: 'closeout:persist-001',
      assignmentId: transferAssignment.id,
      authoritativeWeek: 16,
    })
    training = applied.trainingState
    ownership = applied.ownershipState

    const hydrated = parseSponsoredTrainingCompletionState(JSON.parse(JSON.stringify(training)))
    expect(hydrated).not.toBeNull()
    expect(hydrated!.appliedCloseouts['closeout:persist-001']?.outcomeKind).toBe(
      'transfer_completion',
    )

    const replay = applySponsoredTrainingCloseout(hydrated!, ownership, {
      kind: 'complete_success',
      closeoutId: 'closeout:persist-001',
      assignmentId: transferAssignment.id,
      authoritativeWeek: 16,
    })
    expect(replay.outcome).toBe('idempotent_replay')
    expect(replay.ownershipState.provenance[DEMO_PERSONNEL_ASSET_ID]).toHaveLength(1)
  })

  it('rejects prototype ids on parse', () => {
    const forbidden = {
      ...createDemoRetainGraduateAssignment(),
      id: '__proto__',
    }
    expect(parseSponsoredTrainingAssignment(forbidden)).toBeNull()

    const retain = createDemoRetainGraduateAssignment()
    const raw = {
      schemaVersion: SPONSORED_TRAINING_COMPLETION_SCHEMA_VERSION,
      assignments: {
        [retain.id]: retain,
      },
      appliedCloseouts: {
        constructor: {
          closeoutId: 'constructor',
          assignmentId: DEMO_SPONSORED_ASSIGNMENT_ID,
          outcomeKind: 'retained_completion',
          authoritativeWeek: 1,
          lifecycleTerminal: 'completed',
          abandonmentPenaltyApplied: false,
        },
      },
      activeTraineePersonIds: {},
    }
    expect(parseSponsoredTrainingCompletionState(raw)).toBeNull()
  })

  it('off-roster trainee remains blocked for spawn until terminal closeout', () => {
    const training = registerRetainAssignment()
    const assignment = training.assignments[DEMO_SPONSORED_ASSIGNMENT_ID]
    expect(assignment?.traineeOffRoster).toBe(true)
    expect(isTraineePersonBlockedForSpawn(training, DEMO_TRAINEE_PERSON_ID)).toBe(true)
  })

  it('preserves sponsoring agency on retained completion', () => {
    const training = registerRetainAssignment()
    const ownership = createDemoInterAgencyOwnershipTransferState()
    const result = applySponsoredTrainingCloseout(training, ownership, {
      kind: 'complete_success',
      closeoutId: 'closeout:agency-check',
      assignmentId: DEMO_SPONSORED_ASSIGNMENT_ID,
      authoritativeWeek: 12,
    })
    expect(
      result.ownershipState.ownership[DEMO_PERSONNEL_ASSET_ID]?.owningAgencyId,
    ).toBe(DEMO_AGENCY_ALPHA)
  })

  it('rejects re-registration that would resurrect a terminal assignment', () => {
    let training = registerRetainAssignment()
    const ownership = createEmptyInterAgencyOwnershipTransferState()
    training = applySponsoredTrainingCloseout(training, ownership, {
      kind: 'complete_success',
      closeoutId: 'closeout:terminal-once',
      assignmentId: DEMO_SPONSORED_ASSIGNMENT_ID,
      authoritativeWeek: 12,
    }).trainingState
    expect(training.assignments[DEMO_SPONSORED_ASSIGNMENT_ID]?.lifecycleState).toBe('completed')

    const resurrect = registerSponsoredTrainingAssignment(
      training,
      createDemoRetainGraduateAssignment(),
    )
    expect(resurrect.outcome).toBe('rejected')
    expect(resurrect.reasonCode).toBe('assignment_already_registered')
    expect(training.assignments[DEMO_SPONSORED_ASSIGNMENT_ID]?.lifecycleState).toBe('completed')
  })

  it('blocks spawn for commitment-locked trainees', () => {
    const locked = createDemoCommitmentLockedAssignment()
    const training = registerSponsoredTrainingAssignment(
      createEmptySponsoredTrainingCompletionState(),
      locked,
    ).state
    expect(isTraineePersonBlockedForSpawn(training, locked.traineePersonId)).toBe(true)
  })

  it('rejects hydration when trainee index drifts from live assignments', () => {
    const training = registerRetainAssignment()
    const drifted = {
      ...JSON.parse(JSON.stringify(training)),
      activeTraineePersonIds: {},
    }
    expect(parseSponsoredTrainingCompletionState(drifted)).toBeNull()
  })

  it('rejects hydration when closeout conflicts with assignment lifecycle', () => {
    let training = registerRetainAssignment()
    const ownership = createEmptyInterAgencyOwnershipTransferState()
    training = applySponsoredTrainingCloseout(training, ownership, {
      kind: 'complete_success',
      closeoutId: 'closeout:hydrate-conflict',
      assignmentId: DEMO_SPONSORED_ASSIGNMENT_ID,
      authoritativeWeek: 12,
    }).trainingState

    const raw = JSON.parse(JSON.stringify(training)) as {
      assignments: Record<string, { lifecycleState: string }>
      activeTraineePersonIds: Record<string, string>
    }
    raw.assignments[DEMO_SPONSORED_ASSIGNMENT_ID]!.lifecycleState = 'active'
    raw.activeTraineePersonIds[DEMO_TRAINEE_PERSON_ID] = DEMO_SPONSORED_ASSIGNMENT_ID
    expect(parseSponsoredTrainingCompletionState(raw)).toBeNull()
  })

  it('rejects closeoutId reuse with conflicting assignment or kind', () => {
    let training = registerRetainAssignment()
    const ownership = createEmptyInterAgencyOwnershipTransferState()
    training = applySponsoredTrainingCloseout(training, ownership, {
      kind: 'complete_success',
      closeoutId: 'closeout:shared-id',
      assignmentId: DEMO_SPONSORED_ASSIGNMENT_ID,
      authoritativeWeek: 12,
    }).trainingState

    const conflictKind = applySponsoredTrainingCloseout(training, ownership, {
      kind: 'cancel_voluntary',
      closeoutId: 'closeout:shared-id',
      assignmentId: DEMO_SPONSORED_ASSIGNMENT_ID,
      authoritativeWeek: 12,
    })
    expect(conflictKind.outcome).toBe('rejected')
    expect(conflictKind.reasonCode).toBe('closeout_conflict')

    const second = registerSponsoredTrainingAssignment(training, {
      ...createDemoRetainGraduateAssignment(),
      id: 'sponsored-training:other',
      traineePersonId: 'person:trainee-other',
    })
    expect(second.outcome).toBe('applied')
    const conflictAssignment = applySponsoredTrainingCloseout(second.state, ownership, {
      kind: 'complete_success',
      closeoutId: 'closeout:shared-id',
      assignmentId: 'sponsored-training:other',
      authoritativeWeek: 13,
    })
    expect(conflictAssignment.outcome).toBe('rejected')
    expect(conflictAssignment.reasonCode).toBe('closeout_conflict')
  })
})
