import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE } from '../../domain/publishAutomationCreditingHooks'
import { buildPublishQueueExecutionReceiptKey } from '../../domain/publishQueueExecutionReceiptPersistence'
import type { PublishQueueExecutionReceipt } from '../../domain/publishQueueExecutor'
import { executePublishQueueRecordDryRun } from '../../domain/publishQueueExecutor'
import { getPublishQueueMirrorView } from './publishQueueMirrorView'
import { formatPublishQueueStatusLabel } from '../../domain/publishQueueSurfacing'

describe('publishQueueMirrorView (SPE-2485 slice 1)', () => {
  it('returns empty mirror when publishQueueRecords map is empty', () => {
    const game = createStartingState()

    expect(game.publishQueueRecords).toEqual({})

    const view = getPublishQueueMirrorView(game)

    expect(view.isEmpty).toBe(true)
    expect(view.summary.totalRecords).toBe(0)
    expect(view.summary.readyToPublishCount).toBe(0)
    expect(view.summary.publishedCount).toBe(0)
    expect(view.records).toEqual([])
  })

  it('discriminates ready_to_publish vs published status labels', () => {
    const game = createStartingState()
    game.publishQueueRecords = {
      [CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.id]: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
      'publish-queue:published': {
        ...CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
        id: 'publish-queue:published',
        label: 'Published batch',
        status: 'published',
      },
    }

    const view = getPublishQueueMirrorView(game)

    expect(view.isEmpty).toBe(false)
    expect(view.summary.readyToPublishCount).toBe(1)
    expect(view.summary.publishedCount).toBe(1)

    const readyRecord = view.records.find(
      (record) => record.id === CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.id
    )
    const publishedRecord = view.records.find((record) => record.id === 'publish-queue:published')

    expect(readyRecord?.statusLabel).toBe('Ready To Publish')
    expect(publishedRecord?.statusLabel).toBe('Published')
    expect(readyRecord?.releaseArtifactRef).toBe(
      CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.releaseArtifactRef
    )
  })

  it('formats enum labels for CP-neutral UI copy', () => {
    expect(formatPublishQueueStatusLabel('needs_revision')).toBe('Needs Revision')
  })

  it('is byte-stable for repeated mirror builds', () => {
    const game = createStartingState()
    game.publishQueueRecords = {
      [CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.id]: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
    }

    const first = JSON.stringify(getPublishQueueMirrorView(game))
    const second = JSON.stringify(getPublishQueueMirrorView(game))

    expect(first).toBe(second)
  })
})

describe('publishQueueMirrorView receipts (SPE-2496 slice 1)', () => {
  const dryRunReceipt: PublishQueueExecutionReceipt = {
    recordId: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.id,
    outcome: 'completed',
    executionWeek: 4,
    appliedHooks: [],
    publishChannelStub: 'dry-run:publish_channel:pr-merge:channel:pr-merge',
  }
  const liveReceipt: PublishQueueExecutionReceipt = {
    recordId: 'publish-queue:published',
    outcome: 'completed',
    executionWeek: 5,
    appliedHooks: [],
    publishChannelRef: 'live:publish_channel:pr-merge:pr:2910:sha:abc123',
  }
  const rejectedReceipt: PublishQueueExecutionReceipt = {
    recordId: 'publish-queue:rejected',
    outcome: 'rejected',
    executionWeek: 4,
    appliedHooks: [],
    skipCode: 'record_not_ready_to_publish',
  }
  const skippedReceipt: PublishQueueExecutionReceipt = {
    recordId: 'publish-queue:skipped',
    outcome: 'skipped',
    executionWeek: 3,
    appliedHooks: [],
    skipCode: 'missing_publish_channel_hook',
  }

  it('returns empty receipts section when execution-receipt map is empty', () => {
    const game = createStartingState()

    const view = getPublishQueueMirrorView(game)

    expect(view.receiptsEmpty).toBe(true)
    expect(view.receiptSummary.totalReceipts).toBe(0)
    expect(view.receipts).toEqual([])
  })

  it('projects completed dry-run receipt with joined record label', () => {
    const game = createStartingState()
    game.publishQueueRecords = {
      [CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.id]: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
    }
    const receiptKey = buildPublishQueueExecutionReceiptKey(
      dryRunReceipt.recordId,
      dryRunReceipt.executionWeek
    )!
    game.publishQueueExecutionReceipts = {
      [receiptKey]: dryRunReceipt,
    }

    const view = getPublishQueueMirrorView(game)
    const receipt = view.receipts[0]

    expect(view.receiptsEmpty).toBe(false)
    expect(receipt?.recordLabel).toBe(CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.label)
    expect(receipt?.outcomeLabel).toBe('Completed (dry-run)')
    expect(receipt?.executionModeLabel).toBe('Dry-run')
    expect(receipt?.channelLabel).toContain('dry-run:publish_channel:pr-merge')
  })

  it('projects live receipt with channel ref and live mode labels', () => {
    const game = createStartingState()
    game.publishQueueRecords = {
      'publish-queue:published': {
        ...CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
        id: 'publish-queue:published',
        label: 'Published batch',
        status: 'published',
      },
    }
    const receiptKey = buildPublishQueueExecutionReceiptKey(
      liveReceipt.recordId,
      liveReceipt.executionWeek
    )!
    game.publishQueueExecutionReceipts = {
      [receiptKey]: liveReceipt,
    }

    const view = getPublishQueueMirrorView(game)
    const receipt = view.receipts[0]

    expect(receipt?.outcomeLabel).toBe('Completed (live)')
    expect(receipt?.executionModeLabel).toBe('Live')
    expect(receipt?.channelLabel).toContain('live:publish_channel:pr-merge')
    expect(view.receiptSummary.completedLiveCount).toBe(1)
  })

  it('surfaces rejected and reportable skipped receipts', () => {
    const game = createStartingState()
    game.publishQueueExecutionReceipts = {
      [buildPublishQueueExecutionReceiptKey(rejectedReceipt.recordId, rejectedReceipt.executionWeek)!]:
        rejectedReceipt,
      [buildPublishQueueExecutionReceiptKey(skippedReceipt.recordId, skippedReceipt.executionWeek)!]:
        skippedReceipt,
    }

    const view = getPublishQueueMirrorView(game)

    expect(view.receiptSummary.rejectedCount).toBe(1)
    expect(view.receiptSummary.skippedReportableCount).toBe(1)
    expect(view.receipts.find((entry) => entry.recordId === rejectedReceipt.recordId)?.outcomeLabel).toBe(
      'Rejected'
    )
    expect(
      view.receipts.find((entry) => entry.recordId === skippedReceipt.recordId)?.skipCodeLabel
    ).toBe('missing publish channel hook')
  })

  it('falls back to recordId when receipt has no matching queue record', () => {
    const game = createStartingState()
    const orphanReceipt: PublishQueueExecutionReceipt = {
      recordId: 'publish-queue:orphan',
      outcome: 'completed',
      executionWeek: 4,
      appliedHooks: [],
      publishChannelStub: 'dry-run:publish_channel:pr-merge:channel:pr-merge',
    }
    game.publishQueueExecutionReceipts = {
      [buildPublishQueueExecutionReceiptKey(orphanReceipt.recordId, orphanReceipt.executionWeek)!]:
        orphanReceipt,
    }

    const view = getPublishQueueMirrorView(game)

    expect(view.receipts[0]?.recordLabel).toBe('publish-queue:orphan')
  })

  it('sorts receipts by execution week descending then record id ascending', () => {
    const game = createStartingState()
    game.publishQueueExecutionReceipts = {
      [buildPublishQueueExecutionReceiptKey('publish-queue:b', 4)!]: {
        ...dryRunReceipt,
        recordId: 'publish-queue:b',
      },
      [buildPublishQueueExecutionReceiptKey('publish-queue:a', 5)!]: {
        ...dryRunReceipt,
        recordId: 'publish-queue:a',
        executionWeek: 5,
      },
      [buildPublishQueueExecutionReceiptKey('publish-queue:c', 4)!]: {
        ...dryRunReceipt,
        recordId: 'publish-queue:c',
      },
    }

    const view = getPublishQueueMirrorView(game)

    expect(view.receipts.map((receipt) => receipt.recordId)).toEqual([
      'publish-queue:a',
      'publish-queue:b',
      'publish-queue:c',
    ])
  })

  it('uses executor dry-run receipt fixture end-to-end', () => {
    const game = createStartingState()
    game.publishQueueRecords = {
      [CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.id]: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
    }
    const executorReceipt = executePublishQueueRecordDryRun(
      CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
      { week: 4 }
    ).receipt
    const receiptKey = buildPublishQueueExecutionReceiptKey(
      executorReceipt.recordId,
      executorReceipt.executionWeek
    )!
    game.publishQueueExecutionReceipts = {
      [receiptKey]: executorReceipt,
    }

    const view = getPublishQueueMirrorView(game)

    expect(view.receipts).toHaveLength(1)
    expect(view.receipts[0]?.outcomeLabel).toBe('Completed (dry-run)')
  })
})
