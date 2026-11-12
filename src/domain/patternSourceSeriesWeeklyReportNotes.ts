/**
 * SPE-2497 slice 5: weekly report notes for pattern source series post-tick transitions.
 */

import type { PatternSourceSeriesRecordsMap } from './patternSourceSeriesRegistry'
import {
  composePatternSourceSeriesWeeklyTransitionSummaries,
  formatPatternSourceSeriesWeeklyTransitionNoteContent,
} from './patternSourceSeriesSurfacing'
import type { ReportNote } from './models'
import { createDeterministicReportNote } from './reportNotes'

/**
 * Builds weekly report notes when persisted pattern source series records change during the tick.
 */
export function buildWeeklyPatternSourceSeriesTransitionReportNotes(input: {
  priorRecords: PatternSourceSeriesRecordsMap | null | undefined
  nextRecords: PatternSourceSeriesRecordsMap | null | undefined
  week: number
  sequenceStart: number
  baseTimestamp?: number
}): ReportNote[] {
  const summaries = composePatternSourceSeriesWeeklyTransitionSummaries({
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
        formatPatternSourceSeriesWeeklyTransitionNoteContent(summary),
        input.week,
        sequence,
        input.baseTimestamp,
        'pattern_source_series.weekly_transition',
        {
          recordId: summary.recordId,
          transitionKinds: [...summary.transitionKinds],
          priorProcessingStatus: summary.priorProcessingStatus,
          nextProcessingStatus: summary.nextProcessingStatus,
          priorReadinessScore: summary.priorReadinessScore,
          nextReadinessScore: summary.nextReadinessScore,
          structuredReasons: [...summary.structuredReasons],
          week: input.week,
        }
      )
    )
    sequence += 1
  }

  return notes
}
