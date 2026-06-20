/**
 * SPE-2500 slice 4: weekly enqueue of applied modifiable data-packs into publishQueueRecords.
 *
 * Pure deterministic tick: integration → composePublishQueueRecord → merge queue map.
 * No publish execution side effects.
 */

import { evaluateModifiableDataPackPublishIntegrationFromRecord } from './modifiableDataPackPublishIntegration'
import type { ModifiableDataPackRecord, ModifiableDataPackRecordsMap } from './modifiableDataPackValidation'
import {
  composePublishQueueRecord,
  type PublishQueueRecord,
  type PublishQueueRecordsMap,
} from './publishAutomationCreditingHooks'

export type ModifiableDataPackPublishQueueEnqueueOutcome = 'enqueued' | 'skipped' | 'rejected'

export type ModifiableDataPackPublishQueueEnqueueSkipCode =
  | 'queue_record_exists'
  | 'import_status_not_applied'
  | 'publish_intent_not_ready'
  | 'compose_publish_queue_record_failed'

export interface ModifiableDataPackPublishQueueEnqueueReceipt {
  readonly packId: string
  readonly outcome: ModifiableDataPackPublishQueueEnqueueOutcome
  readonly executionWeek: number
  readonly queueRecordId?: string
  readonly skipCode?: ModifiableDataPackPublishQueueEnqueueSkipCode
  readonly reasonCodes: readonly string[]
}

export interface ModifiableDataPackPublishQueueEnqueueTickResult {
  readonly records: PublishQueueRecordsMap
  readonly receipts: readonly ModifiableDataPackPublishQueueEnqueueReceipt[]
}

function normalizeWeek(week: number): number {
  if (!Number.isFinite(week)) {
    return 1
  }

  return Math.max(1, Math.trunc(week))
}

function freezeReceipt(
  receipt: ModifiableDataPackPublishQueueEnqueueReceipt
): ModifiableDataPackPublishQueueEnqueueReceipt {
  return Object.freeze({
    ...receipt,
    reasonCodes: Object.freeze([...receipt.reasonCodes]),
  })
}

/**
 * Deterministic publish-queue record id for a modifiable data-pack enqueue.
 */
export function modifiableDataPackPublishQueueRecordId(packId: string): string {
  return `publish-queue:modifiable-pack:${packId}`
}

/**
 * Deterministic release artifact ref for a modifiable data-pack publish enqueue.
 */
export function modifiableDataPackPublishReleaseArtifactRef(packId: string): string {
  return `release:modifiable-pack:${packId}`
}

function formatModifiableDataPackPublishQueueLabel(record: ModifiableDataPackRecord): string {
  return `Modifiable data pack ${record.packId}`
}

function enqueueAppliedModifiableDataPackRecord(input: {
  readonly record: ModifiableDataPackRecord
  readonly existingQueue: PublishQueueRecordsMap
  readonly week: number
}): {
  readonly queueRecord: PublishQueueRecord | null
  readonly receipt: ModifiableDataPackPublishQueueEnqueueReceipt
} {
  const normalizedWeek = normalizeWeek(input.week)
  const queueRecordId = modifiableDataPackPublishQueueRecordId(input.record.packId)

  if (input.record.importStatus !== 'applied') {
    return {
      queueRecord: null,
      receipt: freezeReceipt({
        packId: input.record.packId,
        outcome: 'skipped',
        executionWeek: normalizedWeek,
        skipCode: 'import_status_not_applied',
        reasonCodes: Object.freeze([...input.record.reasonCodes]),
      }),
    }
  }

  if (input.existingQueue[queueRecordId]) {
    return {
      queueRecord: null,
      receipt: freezeReceipt({
        packId: input.record.packId,
        outcome: 'skipped',
        executionWeek: normalizedWeek,
        queueRecordId,
        skipCode: 'queue_record_exists',
        reasonCodes: Object.freeze([]),
      }),
    }
  }

  const integration = evaluateModifiableDataPackPublishIntegrationFromRecord(input.record)

  if (integration.publishDecision?.status !== 'ready_to_publish') {
    return {
      queueRecord: null,
      receipt: freezeReceipt({
        packId: input.record.packId,
        outcome: 'rejected',
        executionWeek: normalizedWeek,
        skipCode: 'publish_intent_not_ready',
        reasonCodes: Object.freeze([...integration.reasonCodes]),
      }),
    }
  }

  const queueRecord = composePublishQueueRecord({
    id: queueRecordId,
    label: formatModifiableDataPackPublishQueueLabel(input.record),
    releaseArtifactRef: modifiableDataPackPublishReleaseArtifactRef(input.record.packId),
    decision: integration.publishDecision,
    summary: `Queued publish intent for modifiable data pack ${input.record.packId}.`,
    queuedWeek: normalizedWeek,
  })

  if (!queueRecord) {
    return {
      queueRecord: null,
      receipt: freezeReceipt({
        packId: input.record.packId,
        outcome: 'rejected',
        executionWeek: normalizedWeek,
        skipCode: 'compose_publish_queue_record_failed',
        reasonCodes: Object.freeze([...integration.reasonCodes]),
      }),
    }
  }

  return {
    queueRecord,
    receipt: freezeReceipt({
      packId: input.record.packId,
      outcome: 'enqueued',
      executionWeek: normalizedWeek,
      queueRecordId,
      reasonCodes: Object.freeze([...integration.reasonCodes]),
    }),
  }
}

/**
 * One deterministic weekly enqueue pass over persisted modifiable data-pack records.
 * Empty pack map is a no-op. Re-applying for the same week on stable applied records is idempotent.
 */
export function applyWeeklyModifiableDataPackPublishQueueEnqueueTick(
  packRecords: ModifiableDataPackRecordsMap | null | undefined,
  existingQueue: PublishQueueRecordsMap | null | undefined,
  week: number
): ModifiableDataPackPublishQueueEnqueueTickResult {
  const safePackRecords = packRecords ?? {}
  const safeExistingQueue = existingQueue ?? {}
  const packIds = Object.keys(safePackRecords).sort((left, right) => left.localeCompare(right))

  if (packIds.length === 0) {
    return {
      records: safeExistingQueue,
      receipts: Object.freeze([]),
    }
  }

  const nextQueue: PublishQueueRecordsMap = { ...safeExistingQueue }
  const receipts: ModifiableDataPackPublishQueueEnqueueReceipt[] = []
  let changed = false

  for (const packId of packIds) {
    const record = safePackRecords[packId]
    if (!record) {
      continue
    }

    const advanced = enqueueAppliedModifiableDataPackRecord({
      record,
      existingQueue: nextQueue,
      week,
    })

    receipts.push(advanced.receipt)

    if (advanced.queueRecord) {
      nextQueue[advanced.queueRecord.id] = advanced.queueRecord
      changed = true
    }
  }

  return {
    records: changed ? nextQueue : safeExistingQueue,
    receipts: Object.freeze(receipts.map((receipt) => freezeReceipt(receipt))),
  }
}
