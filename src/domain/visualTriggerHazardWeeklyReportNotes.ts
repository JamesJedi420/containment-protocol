/**
 * SPE-2489 slice 5: weekly report notes for visual-trigger hazard post-tick transitions.
 */

import type { VisualTriggerHazardRecordsMap } from './visualTriggerHazardRegistry'
import {
  composeVisualTriggerHazardWeeklyTransitionSummaries,
  formatVisualTriggerHazardWeeklyTransitionNoteContent,
} from './visualTriggerHazardSurfacing'
import type { ReportNote } from './models'
import { createDeterministicReportNote } from './reportNotes'

/**
 * Builds weekly report notes when persisted visual-trigger hazard records change during the tick.
 */
export function buildWeeklyVisualTriggerHazardTransitionReportNotes(input: {
  priorRecords: VisualTriggerHazardRecordsMap | null | undefined
  nextRecords: VisualTriggerHazardRecordsMap | null | undefined
  week: number
  sequenceStart: number
  baseTimestamp?: number
}): ReportNote[] {
  const summaries = composeVisualTriggerHazardWeeklyTransitionSummaries({
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
        formatVisualTriggerHazardWeeklyTransitionNoteContent(summary),
        input.week,
        sequence,
        input.baseTimestamp,
        'visual_trigger_hazard.weekly_transition',
        {
          recordId: summary.recordId,
          transitionKinds: [...summary.transitionKinds],
          priorPursuitState: summary.priorPursuitState,
          nextPursuitState: summary.nextPursuitState,
          priorObserverAwarenessBand: summary.priorObserverAwarenessBand,
          nextObserverAwarenessBand: summary.nextObserverAwarenessBand,
          advancedSweepMediaInstanceIds: [...summary.advancedSweepMediaInstanceIds],
          structuredReasons: [...summary.structuredReasons],
          week: input.week,
        }
      )
    )
    sequence += 1
  }

  return notes
}
