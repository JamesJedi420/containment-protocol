/**
 * SPE-861 slice 3: weekly report notes for segmented public-disclosure trust divergence.
 *
 * Emits deterministic notes from post-tick disclosure records — no new persistence.
 */

import {
  formatPublicDisclosureSegmentedTrustOutcomeNoteContent,
  projectPublicDisclosureSegmentedTrustOutcome,
} from './publicDisclosureSegmentedTrustOutcomeProjection'
import type { ReportNote } from './models'
import type { PublicDisclosureRecordsMap } from './publicDisclosureStateRegistry'
import { createDeterministicReportNote } from './reportNotes'

/** Builds weekly report notes when active campaigns project divergent segment trust. */
export function buildWeeklyPublicDisclosureSegmentedTrustOutcomeReportNotes(input: {
  nextRecords: PublicDisclosureRecordsMap | null | undefined
  week: number
  sequenceStart: number
  baseTimestamp?: number
}): ReportNote[] {
  const projection = projectPublicDisclosureSegmentedTrustOutcome(input.nextRecords)

  if (projection.isInactive || !projection.hasDivergence) {
    return []
  }

  return [
    createDeterministicReportNote(
      formatPublicDisclosureSegmentedTrustOutcomeNoteContent(projection, input.week),
      input.week,
      input.sequenceStart,
      input.baseTimestamp,
      'public_disclosure.segment_trust_divergence',
      {
        activeCampaignCount: projection.activeCampaignCount,
        visibleSegmentCount: projection.visibleSegmentCount,
        hasDivergence: projection.hasDivergence,
        week: input.week,
      }
    ),
  ]
}
