/**
 * SPE-2490 slice 5: weekly report notes for entity welfare reclassification post-tick transitions.
 */

import type { EntityWelfareReclassificationRecordsMap } from './entityWelfareReclassificationRegistry'
import {
  composeEntityWelfareReclassificationWeeklyTransitionSummaries,
  formatEntityWelfareReclassificationWeeklyTransitionNoteContent,
} from './entityWelfareReclassificationSurfacing'
import type { ReportNote } from './models'
import { createDeterministicReportNote } from './reportNotes'

/**
 * Builds weekly report notes when persisted entity welfare reclassification records change during the tick.
 */
export function buildWeeklyEntityWelfareReclassificationTransitionReportNotes(input: {
  priorRecords: EntityWelfareReclassificationRecordsMap | null | undefined
  nextRecords: EntityWelfareReclassificationRecordsMap | null | undefined
  week: number
  sequenceStart: number
  baseTimestamp?: number
}): ReportNote[] {
  const summaries = composeEntityWelfareReclassificationWeeklyTransitionSummaries({
    priorRecords: input.priorRecords,
    nextRecords: input.nextRecords,
  })

  if (summaries.length === 0) {
    return []
  }

  const notes: ReportNote[] = []
  let sequence = input.sequenceStart

  for (const summary of summaries) {
    notes.push(
      createDeterministicReportNote(
        formatEntityWelfareReclassificationWeeklyTransitionNoteContent(summary),
        input.week,
        sequence,
        input.baseTimestamp,
        'entity_welfare_reclassification.weekly_transition',
        {
          recordId: summary.recordId,
          transitionKinds: [...summary.transitionKinds],
          priorReclassificationState: summary.priorReclassificationState,
          nextReclassificationState: summary.nextReclassificationState,
          priorReviewGate: summary.priorReviewGate ?? null,
          nextReviewGate: summary.nextReviewGate ?? null,
          structuredReasons: [...summary.structuredReasons],
          week: input.week,
        }
      )
    )
    sequence += 1
  }

  return notes
}
