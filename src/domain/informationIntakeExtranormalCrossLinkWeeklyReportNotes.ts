/**
 * SPE-854 slice 1: weekly report notes for intake ↔ extranormal event cross-links.
 *
 * Emits deterministic notes when linked maps coexist — no new persistence.
 */

import {
  composeAllIntakeExtranormalCrossLinkSummaries,
  formatIntakeExtranormalCrossLinkNoteContent,
} from './informationIntakeExtranormalCrossLinkSurfacing'
import type { ExtranormalEventRecordsMap } from './extranormalEventRegistry'
import type { InformationIntakeReportsMap } from './informationIntakeReport'
import type { ReportNote } from './models'
import { createDeterministicReportNote } from './reportNotes'

/**
 * Builds weekly report notes when intake reports and extranormal events co-exist with links.
 */
export function buildWeeklyIntakeExtranormalCrossLinkReportNotes(input: {
  nextReports: InformationIntakeReportsMap | null | undefined
  nextEvents: ExtranormalEventRecordsMap | null | undefined
  week: number
  sequenceStart: number
  baseTimestamp?: number
}): ReportNote[] {
  const nextSummaries = composeAllIntakeExtranormalCrossLinkSummaries({
    reports: input.nextReports ?? undefined,
    events: input.nextEvents ?? undefined,
  })

  if (nextSummaries.length === 0) {
    return []
  }

  const notes: ReportNote[] = []
  let sequence = input.sequenceStart

  for (const summary of nextSummaries) {
    notes.push(
      createDeterministicReportNote(
        formatIntakeExtranormalCrossLinkNoteContent({
          summary,
          reports: input.nextReports ?? undefined,
          events: input.nextEvents ?? undefined,
        }),
        input.week,
        sequence,
        input.baseTimestamp,
        'information_intake.extranormal_cross_link',
        {
          topicRef: summary.topicRef,
          linkedReportCount: summary.linkedReportCount,
          linkedEventCount: summary.linkedEventCount,
          structuredReasons: [...summary.structuredReasons],
          week: input.week,
        }
      )
    )
    sequence += 1
  }

  return notes
}
