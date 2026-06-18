import { describe, expect, it } from 'vitest'

import { CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE } from '../domain/publishAutomationCreditingHooks'
import type { PublishQueueExecutionReceipt } from '../domain/publishQueueExecutor'
import {
  formatPublishQueueExecutionReceiptNoteContent,
  formatPublishQueueStatusLabel,
  isReportablePublishQueueReceipt,
  listReportablePublishQueueReceipts,
  summarizePublishQueueRecords,
} from '../domain/publishQueueSurfacing'

describe('publishQueueSurfacing (SPE-2485 slice 1)', () => {
  it('returns empty summary for empty queue map without throwing', () => {
    expect(summarizePublishQueueRecords({})).toEqual({
      totalRecords: 0,
      readyToPublishCount: 0,
      publishedCount: 0,
      terminalCount: 0,
    })
    expect(summarizePublishQueueRecords(undefined)).toEqual({
      totalRecords: 0,
      readyToPublishCount: 0,
      publishedCount: 0,
      terminalCount: 0,
    })
  })

  it('discriminates ready_to_publish vs published vs terminal statuses', () => {
    const summary = summarizePublishQueueRecords({
      [CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.id]: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
      'publish-queue:published': {
        ...CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
        id: 'publish-queue:published',
        status: 'published',
      },
      'publish-queue:needs-revision': {
        ...CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
        id: 'publish-queue:needs-revision',
        status: 'needs_revision',
      },
    })

    expect(summary).toEqual({
      totalRecords: 3,
      readyToPublishCount: 1,
      publishedCount: 1,
      terminalCount: 1,
    })
    expect(formatPublishQueueStatusLabel('ready_to_publish')).toBe('Ready To Publish')
    expect(formatPublishQueueStatusLabel('published')).toBe('Published')
  })

  it('filters reportable receipts and omits idempotent already_published skips', () => {
    const completedReceipt: PublishQueueExecutionReceipt = {
      recordId: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.id,
      outcome: 'completed',
      executionWeek: 2,
      appliedHooks: [],
      publishChannelStub: 'dry-run:publish_channel:pr-merge:channel:pr-merge',
    }
    const skippedReceipt: PublishQueueExecutionReceipt = {
      recordId: 'publish-queue:published',
      outcome: 'skipped',
      executionWeek: 2,
      appliedHooks: [],
      skipCode: 'already_published',
    }
    const rejectedReceipt: PublishQueueExecutionReceipt = {
      recordId: 'publish-queue:rejected',
      outcome: 'rejected',
      executionWeek: 2,
      appliedHooks: [],
      skipCode: 'record_not_ready_to_publish',
    }

    expect(isReportablePublishQueueReceipt(completedReceipt)).toBe(true)
    expect(isReportablePublishQueueReceipt(skippedReceipt)).toBe(false)
    expect(isReportablePublishQueueReceipt(rejectedReceipt)).toBe(true)

    expect(listReportablePublishQueueReceipts([skippedReceipt, rejectedReceipt, completedReceipt])).toEqual([
      completedReceipt,
      rejectedReceipt,
    ])
  })

  it('formats dry-run receipt note content with safe labels only', () => {
    const receipt: PublishQueueExecutionReceipt = {
      recordId: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.id,
      outcome: 'completed',
      executionWeek: 2,
      appliedHooks: [],
      publishChannelStub: 'dry-run:publish_channel:pr-merge:channel:pr-merge',
    }

    const content = formatPublishQueueExecutionReceiptNoteContent({
      receipt,
      record: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
    })

    expect(content).toContain('Publish queue (dry-run)')
    expect(content).toContain(CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.label)
    expect(content).toContain('[Ready To Publish]')
    expect(content).toContain('Completed (dry-run)')
    expect(content).toContain('dry-run:publish_channel:pr-merge:channel:pr-merge')
  })

  it('formats live receipt note content with channel ref labels', () => {
    const receipt: PublishQueueExecutionReceipt = {
      recordId: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.id,
      outcome: 'completed',
      executionWeek: 2,
      appliedHooks: [],
      publishChannelRef: 'live:publish_channel:pr-merge:pr:2890:sha:abc123',
    }

    const content = formatPublishQueueExecutionReceiptNoteContent({
      receipt,
      record: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
    })

    expect(content).toContain('Publish queue (live)')
    expect(content).toContain('Completed (live)')
    expect(content).toContain('live:publish_channel:pr-merge:pr:2890:sha:abc123')
  })
})
