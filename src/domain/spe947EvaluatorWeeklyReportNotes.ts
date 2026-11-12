/**
 * SPE-2596 / SPE-947: weekly report notes for SPE-947 evaluator post-tick transitions.
 */

import type {
  Spe947CounterMemeticPlanRecordsMap,
  Spe947PlatformRecordsMap,
} from './spe947EvaluatorPersistence'
import {
  composeSpe947EvaluatorWeeklyTransitionSummaries,
  formatSpe947EvaluatorWeeklyTransitionNoteContent,
} from './spe947EvaluatorSurfacing'
import type { ReportNote } from './models'
import { createDeterministicReportNote } from './reportNotes'

/**
 * Builds weekly report notes when persisted spe947* maps change during the SPE-2577 tick.
 * Empty / unchanged maps emit [].
 */
export function buildWeeklySpe947EvaluatorTransitionReportNotes(input: {
  priorPlatforms: Spe947PlatformRecordsMap | null | undefined
  nextPlatforms: Spe947PlatformRecordsMap | null | undefined
  priorPlans: Spe947CounterMemeticPlanRecordsMap | null | undefined
  nextPlans: Spe947CounterMemeticPlanRecordsMap | null | undefined
  week: number
  sequenceStart: number
  baseTimestamp?: number
}): ReportNote[] {
  const summaries = composeSpe947EvaluatorWeeklyTransitionSummaries({
    priorPlatforms: input.priorPlatforms,
    nextPlatforms: input.nextPlatforms,
    priorPlans: input.priorPlans,
    nextPlans: input.nextPlans,
  })

  if (summaries.length === 0) {
    return []
  }

  const notes: ReportNote[] = []
  let sequence = input.sequenceStart

  for (const summary of summaries) {
    notes.push(
      createDeterministicReportNote(
        formatSpe947EvaluatorWeeklyTransitionNoteContent(summary),
        input.week,
        sequence,
        input.baseTimestamp,
        'spe947_evaluator.weekly_transition',
        {
          entityKind: summary.entityKind,
          recordId: summary.recordId,
          transitionKinds: [...summary.transitionKinds],
          priorElapsedPropagationWeeks: summary.priorElapsedPropagationWeeks,
          nextElapsedPropagationWeeks: summary.nextElapsedPropagationWeeks,
          priorViewCount: summary.priorViewCount,
          nextViewCount: summary.nextViewCount,
          priorUptimeState: summary.priorUptimeState,
          nextUptimeState: summary.nextUptimeState,
          structuredReasons: [...summary.structuredReasons],
          week: input.week,
        }
      )
    )
    sequence += 1
  }

  return notes
}
