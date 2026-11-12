/**
 * SPE-2646 / SPE-956: weekly report notes for participatory channel post-tick transitions.
 */

import type { Spe956ParticipatoryChannelPersistenceMaps } from './spe956ParticipatoryChannelWeeklyOrchestration'
import {
  composeSpe956ParticipatoryChannelWeeklyTransitionSummaries,
  formatSpe956ParticipatoryChannelWeeklyTransitionNoteContent,
} from './spe956ParticipatoryChannelSurfacing'
import type { ReportNote } from './models'
import { createDeterministicReportNote } from './reportNotes'

/**
 * Builds weekly report notes when persisted SPE-956 participatory channel maps change
 * during the SPE-2643 tick. Empty / unchanged maps emit [].
 */
export function buildWeeklySpe956ParticipatoryChannelTransitionReportNotes(input: {
  priorMaps: Spe956ParticipatoryChannelPersistenceMaps | null | undefined
  nextMaps: Spe956ParticipatoryChannelPersistenceMaps | null | undefined
  week: number
  sequenceStart: number
  baseTimestamp?: number
}): ReportNote[] {
  const summaries = composeSpe956ParticipatoryChannelWeeklyTransitionSummaries({
    priorMaps: input.priorMaps,
    nextMaps: input.nextMaps,
  })

  if (summaries.length === 0) {
    return []
  }

  const notes: ReportNote[] = []
  let sequence = input.sequenceStart

  for (const summary of summaries) {
    notes.push(
      createDeterministicReportNote(
        formatSpe956ParticipatoryChannelWeeklyTransitionNoteContent(summary),
        input.week,
        sequence,
        input.baseTimestamp,
        'spe956_participatory_channel.weekly_transition',
        {
          channelKind: summary.channelKind,
          recordId: summary.recordId,
          transitionKinds: [...summary.transitionKinds],
          priorElapsedChannelWeeks: summary.priorElapsedChannelWeeks,
          nextElapsedChannelWeeks: summary.nextElapsedChannelWeeks,
          structuredReasons: [...summary.structuredReasons],
          week: input.week,
        }
      )
    )
    sequence += 1
  }

  return notes
}
