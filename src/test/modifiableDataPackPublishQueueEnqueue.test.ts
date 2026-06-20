import { describe, expect, it } from 'vitest'

import {
  BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
  CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
} from '../domain/modifiableDataPackValidation'
import {
  applyWeeklyModifiableDataPackPublishQueueEnqueueTick,
  modifiableDataPackPublishQueueRecordId,
  modifiableDataPackPublishReleaseArtifactRef,
} from '../domain/modifiableDataPackPublishQueueEnqueue'
import { CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE } from '../domain/publishAutomationCreditingHooks'

describe('modifiableDataPackPublishQueueEnqueue (SPE-2500 slice 4)', () => {
  it('is a no-op for empty pack and queue maps without throwing', () => {
    const result = applyWeeklyModifiableDataPackPublishQueueEnqueueTick({}, {}, 4)

    expect(result.records).toEqual({})
    expect(result.receipts).toEqual([])
  })

  it('enqueues a ready_to_publish queue record for an applied pack', () => {
    const queueRecordId = modifiableDataPackPublishQueueRecordId(
      CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId
    )

    const result = applyWeeklyModifiableDataPackPublishQueueEnqueueTick(
      {
        [CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId]:
          CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
      },
      {},
      4
    )

    expect(result.receipts).toHaveLength(1)
    expect(result.receipts[0]).toMatchObject({
      packId: CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId,
      outcome: 'enqueued',
      executionWeek: 4,
      queueRecordId,
    })

    const queueRecord = result.records[queueRecordId]
    expect(queueRecord).toBeDefined()
    expect(queueRecord?.status).toBe('ready_to_publish')
    expect(queueRecord?.releaseArtifactRef).toBe(
      modifiableDataPackPublishReleaseArtifactRef(
        CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId
      )
    )
    expect(queueRecord?.publishHooks.length).toBeGreaterThan(0)
  })

  it('skips when the deterministic queue record already exists', () => {
    const queueRecordId = modifiableDataPackPublishQueueRecordId(
      CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId
    )
    const existingQueue = {
      [queueRecordId]: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
    }

    const result = applyWeeklyModifiableDataPackPublishQueueEnqueueTick(
      {
        [CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId]:
          CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
      },
      existingQueue,
      4
    )

    expect(result.records).toBe(existingQueue)
    expect(result.receipts[0]).toMatchObject({
      outcome: 'skipped',
      skipCode: 'queue_record_exists',
      queueRecordId,
    })
  })

  it('skips needs_revision packs without enqueueing', () => {
    const result = applyWeeklyModifiableDataPackPublishQueueEnqueueTick(
      {
        [BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId]:
          BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
      },
      {},
      4
    )

    expect(Object.keys(result.records)).toHaveLength(0)
    expect(result.receipts[0]).toMatchObject({
      packId: BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId,
      outcome: 'skipped',
      skipCode: 'import_status_not_applied',
    })
  })

  it('returns byte-stable output on repeated tick calls', () => {
    const packRecords = {
      [CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId]:
        CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
    }

    const first = applyWeeklyModifiableDataPackPublishQueueEnqueueTick(packRecords, {}, 4)
    const second = applyWeeklyModifiableDataPackPublishQueueEnqueueTick(packRecords, {}, 4)

    expect(first).toEqual(second)
  })

  it('is idempotent when re-ticking with an enqueued queue record from a prior pass', () => {
    const packRecords = {
      [CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId]:
        CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
    }

    const first = applyWeeklyModifiableDataPackPublishQueueEnqueueTick(packRecords, {}, 4)
    const second = applyWeeklyModifiableDataPackPublishQueueEnqueueTick(
      packRecords,
      first.records,
      4
    )

    expect(second.records).toBe(first.records)
    expect(second.receipts[0]?.outcome).toBe('skipped')
    expect(second.receipts[0]?.skipCode).toBe('queue_record_exists')
  })
})
