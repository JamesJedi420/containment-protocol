/**
 * SPE-854 / SPE-2406 slice 1: weekly report notes for intake ↔ naming-hazard cross-links.
 *
 * Emits deterministic notes when the cross-link fingerprint changes — no new persistence.
 */

import {
  composeAllIntakeNamingHazardCrossLinkSummaries,
  formatIntakeNamingHazardCrossLinkNoteContent,
} from './informationIntakeNamingHazardCrossLinkSurfacing'
import type { InformationIntakeReportsMap } from './informationIntakeReport'
import type { ReportNote } from './models'
import type { NamingHazardDescriptorRecordsMap } from './namingHazardDescriptorRegistry'
import { createDeterministicReportNote } from './reportNotes'

/**
 * Builds weekly report notes when intake reports and naming-hazard descriptors co-exist with links.
 */
export function buildWeeklyIntakeNamingHazardCrossLinkReportNotes(input: {
  nextReports: InformationIntakeReportsMap | null | undefined
  nextDescriptors: NamingHazardDescriptorRecordsMap | null | undefined
  week: number
  sequenceStart: number
  baseTimestamp?: number
}): ReportNote[] {
  const nextSummaries = composeAllIntakeNamingHazardCrossLinkSummaries({
    reports: input.nextReports ?? undefined,
    descriptors: input.nextDescriptors ?? undefined,
  })

  if (nextSummaries.length === 0) {
    return []
  }

  const notes: ReportNote[] = []
  let sequence = input.sequenceStart

  for (const summary of nextSummaries) {
    notes.push(
      createDeterministicReportNote(
        formatIntakeNamingHazardCrossLinkNoteContent({
          summary,
          reports: input.nextReports ?? undefined,
          descriptors: input.nextDescriptors ?? undefined,
        }),
        input.week,
        sequence,
        input.baseTimestamp,
        'information_intake.naming_hazard_cross_link',
        {
          topicRef: summary.topicRef,
          linkedReportCount: summary.linkedReportCount,
          linkedDescriptorCount: summary.linkedDescriptorCount,
          structuredReasons: [...summary.structuredReasons],
          week: input.week,
        }
      )
    )
    sequence += 1
  }

  return notes
}
