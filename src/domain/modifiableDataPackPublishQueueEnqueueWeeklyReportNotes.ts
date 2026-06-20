/**
 * SPE-2500 slice 4: weekly report notes for modifiable data-pack publish-queue enqueue receipts.
 */

import {
  formatModifiableDataPackPublishQueueEnqueueNoteContent,
  listReportableModifiableDataPackPublishQueueEnqueueReceipts,
} from './modifiableDataPackSurfacing'
import type { ModifiableDataPackRecordsMap } from './modifiableDataPackValidation'
import type { ModifiableDataPackPublishQueueEnqueueReceipt } from './modifiableDataPackPublishQueueEnqueue'
import type { ReportNote } from './models'
import { createDeterministicReportNote } from './reportNotes'

/**
 * Builds weekly report notes for reportable modifiable data-pack publish-queue enqueue receipts.
 */
export function buildWeeklyModifiableDataPackPublishQueueEnqueueReportNotes(input: {
  receipts: readonly ModifiableDataPackPublishQueueEnqueueReceipt[] | null | undefined
  records: ModifiableDataPackRecordsMap | null | undefined
  week: number
  sequenceStart: number
  baseTimestamp?: number
}): ReportNote[] {
  const reportableReceipts = listReportableModifiableDataPackPublishQueueEnqueueReceipts(
    input.receipts
  )

  if (reportableReceipts.length === 0) {
    return []
  }

  const safeRecords = input.records ?? {}
  const notes: ReportNote[] = []
  let sequence = input.sequenceStart

  for (const receipt of reportableReceipts) {
    const record = safeRecords[receipt.packId]

    notes.push(
      createDeterministicReportNote(
        formatModifiableDataPackPublishQueueEnqueueNoteContent({ receipt, record }),
        input.week,
        sequence,
        input.baseTimestamp,
        'contribution_release.modifiable_data_pack_publish_enqueue',
        {
          packId: receipt.packId,
          outcome: receipt.outcome,
          executionWeek: receipt.executionWeek,
          queueRecordId: receipt.queueRecordId ?? null,
          skipCode: receipt.skipCode ?? null,
          reasonCodes: [...receipt.reasonCodes],
          week: input.week,
        }
      )
    )
    sequence += 1
  }

  return notes
}
