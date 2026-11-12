import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import { hydrateGame } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import {
  CANONICAL_PUBLISH_CREDITING_MANIFEST_FIXTURE,
  CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
  composePublishQueueRecord,
  evaluatePublishAutomationCreditingHooks,
} from '../domain/publishAutomationCreditingHooks'
import {
  CANONICAL_CONTRIBUTION_SUBMISSION_FIXTURE,
  evaluateContributionIntakeCuration,
} from '../domain/contributionIntakeCuration'
import {
  CANONICAL_RELEASE_ARTIFACT_MANIFEST_FIXTURE,
  evaluateModularReleasePackaging,
} from '../domain/modularReleasePackaging'
import {
  buildPublishQueueExecutionReceiptKey,
  composePublishQueueExecutionReceipt,
  MAX_PUBLISH_QUEUE_EXECUTION_RECEIPTS,
  mergePublishQueueExecutionReceipts,
  sanitizePublishQueueExecutionReceipts,
} from '../domain/publishQueueExecutionReceiptPersistence'
import { executePublishQueueRecordDryRun } from '../domain/publishQueueExecutor'
import {
  CANONICAL_SUBMISSION_GOVERNANCE_FIXTURE,
  evaluateSubmissionGovernanceRights,
} from '../domain/submissionGovernanceRights'

function buildCanonicalReadyQueueRecord() {
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

  return composePublishQueueRecord({
    id: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.id,
    label: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.label,
    releaseArtifactRef: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.releaseArtifactRef,
    decision,
    summary: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.summary,
    queuedWeek: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.queuedWeek,
  })!
}

describe('publishQueue execution-receipt persistence (SPE-2495 slice 1)', () => {
  const composedRecord = buildCanonicalReadyQueueRecord()
  const completedReceipt = executePublishQueueRecordDryRun(composedRecord, { week: 4 }).receipt
  const receiptKey = buildPublishQueueExecutionReceiptKey(
    completedReceipt.recordId,
    completedReceipt.executionWeek
  )!

  it('defaults starting state to an empty execution-receipt map', () => {
    expect(createStartingState().publishQueueExecutionReceipts).toEqual({})
  })

  it('composes a valid executor receipt for persistence', () => {
    expect(composePublishQueueExecutionReceipt(completedReceipt)).toEqual(completedReceipt)
  })

  it('rejects malformed receipts during compose', () => {
    expect(
      composePublishQueueExecutionReceipt({
        ...completedReceipt,
        outcome: 'not_an_outcome' as 'completed',
      })
    ).toBeNull()
    expect(
      composePublishQueueExecutionReceipt({
        ...completedReceipt,
        appliedHooks: [
          {
            kind: 'not_a_kind' as 'publish_channel',
            target: 'x',
            payload: 'y',
            channelStub: 'z',
          },
        ],
      })
    ).toBeNull()
  })

  it('drops invalid, duplicate, and orphan entries during sanitize without throwing', () => {
    const fallback = {}
    const sanitized = sanitizePublishQueueExecutionReceipts(
      {
        [receiptKey]: completedReceipt,
        duplicate: completedReceipt,
        'wrong-key@4': completedReceipt,
        orphan: {
          ...completedReceipt,
          recordId: 'publish-queue:orphan',
        },
        invalidOutcome: {
          ...completedReceipt,
          recordId: 'publish-queue:invalid-outcome',
          outcome: 'not_an_outcome',
        },
      },
      fallback,
      new Set([CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.id])
    )

    expect(sanitized[receiptKey]).toEqual(completedReceipt)
    expect(sanitized.duplicate).toBeUndefined()
    expect(sanitized['wrong-key@4']).toBeUndefined()
    expect(sanitized.orphan).toBeUndefined()
    expect(sanitized.invalidOutcome).toBeUndefined()
    expect(Object.keys(sanitized)).toEqual([receiptKey])
  })

  it('sorts receipt keys deterministically on hydrate', () => {
    const otherRecordId = 'publish-queue:other-record'
    const otherReceipt = {
      ...completedReceipt,
      recordId: otherRecordId,
      executionWeek: 3,
    }
    const otherKey = buildPublishQueueExecutionReceiptKey(otherRecordId, 3)!

    const sanitized = sanitizePublishQueueExecutionReceipts(
      {
        [receiptKey]: completedReceipt,
        [otherKey]: otherReceipt,
      },
      {},
      new Set([CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.id, otherRecordId])
    )

    expect(Object.keys(sanitized)).toEqual([otherKey, receiptKey])
  })

  it('merges only reportable receipts aligned with post-tick record status', () => {
    const publishedRecord = executePublishQueueRecordDryRun(composedRecord, { week: 4 }).record
    const merged = mergePublishQueueExecutionReceipts(
      {},
      [completedReceipt, { ...completedReceipt, outcome: 'skipped', skipCode: 'already_published' }],
      { records: { [publishedRecord.id]: publishedRecord } }
    )

    expect(merged[receiptKey]).toEqual(completedReceipt)
    expect(Object.keys(merged)).toEqual([receiptKey])
  })

  it('drops completed receipts when the queue record is not published', () => {
    const merged = mergePublishQueueExecutionReceipts({}, [completedReceipt], {
      records: { [composedRecord.id]: composedRecord },
    })

    expect(merged).toEqual({})
  })

  it('enforces the bounded receipt ledger cap', () => {
    const receipts = Array.from({ length: MAX_PUBLISH_QUEUE_EXECUTION_RECEIPTS + 4 }, (_, index) => ({
      ...completedReceipt,
      recordId: `publish-queue:record-${index}`,
      executionWeek: index + 1,
    }))

    const records = Object.fromEntries(
      receipts.map((receipt) => [
        receipt.recordId,
        { ...composedRecord, id: receipt.recordId, status: 'published' as const },
      ])
    )

    const merged = mergePublishQueueExecutionReceipts({}, receipts, { records })
    expect(Object.keys(merged)).toHaveLength(MAX_PUBLISH_QUEUE_EXECUTION_RECEIPTS)

    const weeks = Object.values(merged).map((receipt) => receipt.executionWeek)
    expect(Math.min(...weeks)).toBe(5)
  })

  it('round-trips fixture receipts byte-stable through save/load', () => {
    const state = createStartingState()
    state.publishQueueRecords = {
      [composedRecord.id]: composedRecord,
    }
    state.publishQueueExecutionReceipts = {
      [receiptKey]: completedReceipt,
    }

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.publishQueueExecutionReceipts).toEqual(state.publishQueueExecutionReceipts)
  })

  it('hydrates persisted receipts through import parsing', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...fallback,
        publishQueueRecords: {
          [composedRecord.id]: composedRecord,
        },
        publishQueueExecutionReceipts: {
          [receiptKey]: completedReceipt,
          invalid: {
            ...completedReceipt,
            recordId: 'publish-queue:invalid',
            outcome: 'not_an_outcome',
          },
        },
      },
      fallback
    )

    expect(hydrated.publishQueueExecutionReceipts).toEqual({
      [receiptKey]: completedReceipt,
    })
  })
})
