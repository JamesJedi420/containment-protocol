import { describe, expect, it } from 'vitest'

import { CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE } from '../domain/publishAutomationCreditingHooks'
import type { PublishQueueExecutionReceipt } from '../domain/publishQueueExecutor'
import { buildWeeklyPublishQueueExecutionReportNotes } from '../domain/publishQueueWeeklyReportNotes'

describe('publishQueueWeeklyReportNotes (SPE-2485 slice 1)', () => {
  const completedReceipt: PublishQueueExecutionReceipt = {
    recordId: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.id,
    outcome: 'completed',
    executionWeek: 2,
    appliedHooks: [],
    publishChannelStub: 'dry-run:publish_channel:pr-merge:channel:pr-merge',
  }

  it('returns no notes when receipts are empty or only idempotent skips', () => {
    expect(
      buildWeeklyPublishQueueExecutionReportNotes({
        receipts: [],
        records: {},
        week: 2,
        sequenceStart: 1,
      })
    ).toEqual([])

    expect(
      buildWeeklyPublishQueueExecutionReportNotes({
        receipts: [
          {
            recordId: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.id,
            outcome: 'skipped',
            executionWeek: 2,
            appliedHooks: [],
            skipCode: 'already_published',
          },
        ],
        records: {
          [CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.id]: {
            ...CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
            status: 'published',
          },
        },
        week: 2,
        sequenceStart: 1,
      })
    ).toEqual([])
  })

  it('emits deterministic contribution_release notes for reportable receipts', () => {
    const notes = buildWeeklyPublishQueueExecutionReportNotes({
      receipts: [completedReceipt],
      records: {
        [CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.id]: {
          ...CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
          status: 'published',
        },
      },
      week: 2,
      sequenceStart: 3,
      baseTimestamp: 1_700_000_000_000,
    })

    expect(notes).toHaveLength(1)
    expect(notes[0]?.type).toBe('contribution_release.publish_queue_execution')
    expect(notes[0]?.content).toContain('Publish queue (dry-run)')
    expect(notes[0]?.metadata).toMatchObject({
      recordId: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.id,
      outcome: 'completed',
      executionWeek: 2,
      recordStatus: 'published',
      week: 2,
    })
  })
})
