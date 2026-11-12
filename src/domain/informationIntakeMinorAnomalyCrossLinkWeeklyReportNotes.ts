/**
 * SPE-854 slice 1: weekly report notes for intake ↔ minor anomaly item cross-links.
 *
 * Emits deterministic notes when linked maps coexist — no new persistence.
 */

import {
  composeAllIntakeMinorAnomalyCrossLinkSummaries,
  formatIntakeMinorAnomalyCrossLinkNoteContent,
} from './informationIntakeMinorAnomalyCrossLinkSurfacing'
import type { InformationIntakeReportsMap } from './informationIntakeReport'
import type { MinorAnomalyItemRecordsMap } from './minorAnomalyItemRegistry'
import type { ReportNote } from './models'
import { createDeterministicReportNote } from './reportNotes'

/**
 * Builds weekly report notes when intake reports and minor anomaly items co-exist with links.
 */
export function buildWeeklyIntakeMinorAnomalyCrossLinkReportNotes(input: {
  nextReports: InformationIntakeReportsMap | null | undefined
  nextItems: MinorAnomalyItemRecordsMap | null | undefined
  week: number
  sequenceStart: number
  baseTimestamp?: number
}): ReportNote[] {
  const nextSummaries = composeAllIntakeMinorAnomalyCrossLinkSummaries({
    reports: input.nextReports ?? undefined,
    items: input.nextItems ?? undefined,
  })

  if (nextSummaries.length === 0) {
    return []
  }

  const notes: ReportNote[] = []
  let sequence = input.sequenceStart

  for (const summary of nextSummaries) {
    notes.push(
      createDeterministicReportNote(
        formatIntakeMinorAnomalyCrossLinkNoteContent({
          summary,
          reports: input.nextReports ?? undefined,
          items: input.nextItems ?? undefined,
        }),
        input.week,
        sequence,
        input.baseTimestamp,
        'information_intake.minor_anomaly_cross_link',
        {
          topicRef: summary.topicRef,
          linkedReportCount: summary.linkedReportCount,
          linkedItemCount: summary.linkedItemCount,
          structuredReasons: [...summary.structuredReasons],
          week: input.week,
        }
      )
    )
    sequence += 1
  }

  return notes
}
