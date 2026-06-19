/**
 * SPE-2485 slice 1: weekly report notes for publish-queue dry-run execution receipts.
 */

import type { PublishQueueRecordsMap } from './publishAutomationCreditingHooks'
import type { PublishQueueExecutionReceipt } from './publishQueueExecutor'
import type { ReportNote } from './models'
import { createDeterministicReportNote } from './reportNotes'
import {
  formatPublishQueueExecutionReceiptNoteContent,
  listReportablePublishQueueReceipts,
  resolvePublishQueueReceiptExecutionMode,
} from './publishQueueSurfacing'

/**
 * Builds weekly report notes for reportable publish-queue dry-run execution receipts.
 */
export function buildWeeklyPublishQueueExecutionReportNotes(input: {
  receipts: readonly PublishQueueExecutionReceipt[] | null | undefined
  records: PublishQueueRecordsMap | null | undefined
  week: number
  sequenceStart: number
  baseTimestamp?: number
}): ReportNote[] {
  const reportableReceipts = listReportablePublishQueueReceipts(input.receipts)

  if (reportableReceipts.length === 0) {
    return []
  }

  const safeRecords = input.records ?? {}
  const notes: ReportNote[] = []
  let sequence = input.sequenceStart

  for (const receipt of reportableReceipts) {
    const record = safeRecords[receipt.recordId]

    notes.push(
      createDeterministicReportNote(
        formatPublishQueueExecutionReceiptNoteContent({ receipt, record }),
        input.week,
        sequence,
        input.baseTimestamp,
        'contribution_release.publish_queue_execution',
        {
          recordId: receipt.recordId,
          outcome: receipt.outcome,
          executionWeek: receipt.executionWeek,
          skipCode: receipt.skipCode,
          publishChannelStub: receipt.publishChannelStub,
          publishChannelRef: receipt.publishChannelRef,
          executionMode: resolvePublishQueueReceiptExecutionMode(receipt),
          recordStatus: record?.status,
          week: input.week,
        }
      )
    )
    sequence += 1
  }

  return notes
}
