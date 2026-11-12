/**
 * SPE-2493 slice 2: weekly report notes for modifiable data-pack governance receipts.
 */

import {
  formatModifiableDataPackWeeklyTickNoteContent,
  listReportableModifiableDataPackWeeklyTickReceipts,
} from './modifiableDataPackSurfacing'
import type { ModifiableDataPackRecordsMap } from './modifiableDataPackValidation'
import type { ModifiableDataPackWeeklyTickReceipt } from './modifiableDataPackWeeklyOrchestration'
import type { ReportNote } from './models'
import { createDeterministicReportNote } from './reportNotes'

/**
 * Builds weekly report notes for reportable modifiable data-pack governance receipts.
 */
export function buildWeeklyModifiableDataPackGovernanceReportNotes(input: {
  receipts: readonly ModifiableDataPackWeeklyTickReceipt[] | null | undefined
  records: ModifiableDataPackRecordsMap | null | undefined
  week: number
  sequenceStart: number
  baseTimestamp?: number
}): ReportNote[] {
  const reportableReceipts = listReportableModifiableDataPackWeeklyTickReceipts(input.receipts)

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
        formatModifiableDataPackWeeklyTickNoteContent({ receipt, record }),
        input.week,
        sequence,
        input.baseTimestamp,
        'contribution_release.modifiable_data_pack_governance',
        {
          packId: receipt.packId,
          outcome: receipt.outcome,
          executionWeek: receipt.executionWeek,
          importStatus: receipt.importStatus,
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
