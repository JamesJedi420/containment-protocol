import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import { hydrateGame } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import {
  CANONICAL_CONTRIBUTION_SUBMISSION_FIXTURE,
  evaluateContributionIntakeCuration,
} from '../domain/contributionIntakeCuration'
import {
  CANONICAL_RELEASE_ARTIFACT_MANIFEST_FIXTURE,
  evaluateModularReleasePackaging,
} from '../domain/modularReleasePackaging'
import {
  CANONICAL_PUBLISH_CREDITING_MANIFEST_FIXTURE,
  CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
  composePublishQueueRecord,
  evaluatePublishAutomationCreditingHooks,
  sanitizePublishQueueRecords,
} from '../domain/publishAutomationCreditingHooks'
import {
  CANONICAL_SUBMISSION_GOVERNANCE_FIXTURE,
  evaluateSubmissionGovernanceRights,
} from '../domain/submissionGovernanceRights'

describe('publishQueue persistence (SPE-2483 slice 1)', () => {
  it('defaults starting state to an empty publish-queue map', () => {
    expect(createStartingState().publishQueueRecords).toEqual({})
  })

  it('composes a valid queue record read-only from a publish-automation decision', () => {
    const acceptedCuration = evaluateContributionIntakeCuration(
      CANONICAL_CONTRIBUTION_SUBMISSION_FIXTURE
    )
    const packagedRelease = evaluateModularReleasePackaging(
      acceptedCuration,
      CANONICAL_RELEASE_ARTIFACT_MANIFEST_FIXTURE
    )
    const appliedGovernance = evaluateSubmissionGovernanceRights(
      CANONICAL_SUBMISSION_GOVERNANCE_FIXTURE
    )
    const decision = evaluatePublishAutomationCreditingHooks(
      packagedRelease,
      appliedGovernance,
      CANONICAL_PUBLISH_CREDITING_MANIFEST_FIXTURE
    )

    const composed = composePublishQueueRecord({
      id: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.id,
      label: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.label,
      releaseArtifactRef: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.releaseArtifactRef,
      decision,
      summary: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.summary,
      queuedWeek: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.queuedWeek,
    })

    expect(composed).toEqual(CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE)
  })

  it('drops invalid and duplicate-id entries during sanitize without throwing', () => {
    const fallback = {}
    const sanitized = sanitizePublishQueueRecords(
      {
        valid: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
        duplicate: {
          ...CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
          label: 'duplicate label should lose',
        },
        'wrong-key': {
          ...CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
          id: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.id,
          label: 'wrong map key should lose to canonical id',
        },
        missingLabel: {
          id: 'publish-queue:missing-label',
          releaseArtifactRef: 'release:missing-label',
          status: 'ready_to_publish',
          creditingHooks: [],
          publishHooks: [],
          reasonCodes: [],
        },
        invalidStatus: {
          id: 'publish-queue:invalid-status',
          label: 'Invalid status',
          releaseArtifactRef: 'release:invalid-status',
          status: 'not_a_status',
          creditingHooks: [],
          publishHooks: [],
          reasonCodes: [],
        },
        invalidHook: {
          id: 'publish-queue:invalid-hook',
          label: 'Invalid hook',
          releaseArtifactRef: '',
          status: 'ready_to_publish',
          creditingHooks: [{ kind: 'not_a_kind', target: 'x', payload: 'y' }],
          publishHooks: [],
          reasonCodes: [],
        },
      },
      fallback
    )

    expect(sanitized[CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.id]).toEqual(
      CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE
    )
    expect(sanitized.duplicate).toBeUndefined()
    expect(sanitized['wrong-key']).toBeUndefined()
    expect(sanitized.missingLabel).toBeUndefined()
    expect(sanitized.invalidStatus).toBeUndefined()
    expect(sanitized.invalidHook).toBeUndefined()
    expect(Object.keys(sanitized)).toEqual([CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.id])
  })

  it('round-trips fixture records byte-stable through save/load', () => {
    const state = createStartingState()
    state.publishQueueRecords = {
      [CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.id]: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
    }

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.publishQueueRecords).toEqual(state.publishQueueRecords)
  })

  it('hydrates persisted publish-queue records through import parsing', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...fallback,
        publishQueueRecords: {
          [CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.id]: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
          invalid: {
            id: 'publish-queue:invalid',
            label: 'Invalid queue entry',
            releaseArtifactRef: '',
            status: 'ready_to_publish',
            creditingHooks: [],
            publishHooks: [],
            reasonCodes: [],
          },
        },
      },
      fallback
    )

    expect(hydrated.publishQueueRecords).toEqual({
      [CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.id]: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
    })
  })
})
