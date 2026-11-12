/**
 * SPE-854 slice 1: weekly report notes for intake ↔ unexplained location cross-links.
 *
 * Emits deterministic notes when linked maps coexist — no new persistence.
 */

import {
  composeAllIntakeUnexplainedLocationCrossLinkSummaries,
  formatIntakeUnexplainedLocationCrossLinkNoteContent,
} from './informationIntakeUnexplainedLocationCrossLinkSurfacing'
import type { InformationIntakeReportsMap } from './informationIntakeReport'
import type { ReportNote } from './models'
import { createDeterministicReportNote } from './reportNotes'
import type { UnexplainedLocationRecordsMap } from './unexplainedLocationRegistry'

/**
 * Builds weekly report notes when intake reports and unexplained locations co-exist with links.
 */
export function buildWeeklyIntakeUnexplainedLocationCrossLinkReportNotes(input: {
  nextReports: InformationIntakeReportsMap | null | undefined
  nextLocations: UnexplainedLocationRecordsMap | null | undefined
  week: number
  sequenceStart: number
  baseTimestamp?: number
}): ReportNote[] {
  const nextSummaries = composeAllIntakeUnexplainedLocationCrossLinkSummaries({
    reports: input.nextReports ?? undefined,
    locations: input.nextLocations ?? undefined,
  })

  if (nextSummaries.length === 0) {
    return []
  }

  const notes: ReportNote[] = []
  let sequence = input.sequenceStart

  for (const summary of nextSummaries) {
    notes.push(
      createDeterministicReportNote(
        formatIntakeUnexplainedLocationCrossLinkNoteContent({
          summary,
          reports: input.nextReports ?? undefined,
          locations: input.nextLocations ?? undefined,
        }),
        input.week,
        sequence,
        input.baseTimestamp,
        'information_intake.unexplained_location_cross_link',
        {
          topicRef: summary.topicRef,
          linkedReportCount: summary.linkedReportCount,
          linkedLocationCount: summary.linkedLocationCount,
          structuredReasons: [...summary.structuredReasons],
          week: input.week,
        }
      )
    )
    sequence += 1
  }

  return notes
}
