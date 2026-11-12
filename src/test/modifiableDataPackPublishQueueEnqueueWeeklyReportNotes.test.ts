import { describe, expect, it } from 'vitest'

import {
  formatModifiableDataPackPublishQueueEnqueueNoteContent,
  listReportableModifiableDataPackPublishQueueEnqueueReceipts,
} from '../domain/modifiableDataPackSurfacing'
import { CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE } from '../domain/modifiableDataPackValidation'
import { buildWeeklyModifiableDataPackPublishQueueEnqueueReportNotes } from '../domain/modifiableDataPackPublishQueueEnqueueWeeklyReportNotes'

describe('modifiableDataPackPublishQueueEnqueueWeeklyReportNotes (SPE-2500 slice 4)', () => {
  it('returns no notes for skipped enqueue receipts', () => {
    const notes = buildWeeklyModifiableDataPackPublishQueueEnqueueReportNotes({
      receipts: [
        {
          packId: CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId,
          outcome: 'skipped',
          executionWeek: 4,
          skipCode: 'queue_record_exists',
          queueRecordId: 'publish-queue:modifiable-pack:datapack:tuning-containment-thresholds',
          reasonCodes: Object.freeze([]),
        },
      ],
      records: {
        [CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId]:
          CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
      },
      week: 4,
      sequenceStart: 1,
    })

    expect(notes).toEqual([])
  })

  it('builds enqueue notes for enqueued receipts only', () => {
    const queueRecordId = 'publish-queue:modifiable-pack:datapack:tuning-containment-thresholds'
    const notes = buildWeeklyModifiableDataPackPublishQueueEnqueueReportNotes({
      receipts: [
        {
          packId: CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId,
          outcome: 'enqueued',
          executionWeek: 4,
          queueRecordId,
          reasonCodes: Object.freeze([]),
        },
      ],
      records: {
        [CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId]:
          CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
      },
      week: 4,
      sequenceStart: 1,
    })

    expect(notes).toHaveLength(1)
    expect(notes[0]?.type).toBe('contribution_release.modifiable_data_pack_publish_enqueue')
    expect(notes[0]?.content).toBe(
      formatModifiableDataPackPublishQueueEnqueueNoteContent({
        receipt: listReportableModifiableDataPackPublishQueueEnqueueReceipts([
          {
            packId: CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId,
            outcome: 'enqueued',
            executionWeek: 4,
            queueRecordId,
            reasonCodes: Object.freeze([]),
          },
        ])[0]!,
        record: CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
      })
    )
    expect(notes[0]?.metadata).toMatchObject({
      packId: CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId,
      outcome: 'enqueued',
      queueRecordId,
      week: 4,
    })
  })
})
