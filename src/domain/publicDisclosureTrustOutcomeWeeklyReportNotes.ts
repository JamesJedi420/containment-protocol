/**
 * SPE-861 slice 2: weekly report notes for public-disclosure trust outcomes.
 *
 * Emits deterministic notes from post-tick disclosure records — no new persistence.
 */

import {
  formatPublicDisclosureTrustOutcomeNoteContent,
  projectPublicDisclosureTrustOutcome,
} from './publicDisclosureTrustOutcomeProjection'
import type { ReportNote } from './models'
import type { PublicDisclosurePostureChoicesMap } from './publicDisclosurePostureChoice'
import type { PublicDisclosureRecordsMap } from './publicDisclosureStateRegistry'
import { createDeterministicReportNote } from './reportNotes'

/** Builds weekly report notes when active disclosure campaigns project a trust outcome. */
export function buildWeeklyPublicDisclosureTrustOutcomeReportNotes(input: {
  nextRecords: PublicDisclosureRecordsMap | null | undefined
  postureChoices?: PublicDisclosurePostureChoicesMap | null
  postExposureTrustDelta?: number
  week: number
  sequenceStart: number
  baseTimestamp?: number
}): ReportNote[] {
  const projection = projectPublicDisclosureTrustOutcome(
    input.nextRecords,
    input.postureChoices,
    { postExposureTrustDelta: input.postExposureTrustDelta ?? 0 }
  )

  if (projection.activeCampaignCount === 0) {
    return []
  }

  return [
    createDeterministicReportNote(
      formatPublicDisclosureTrustOutcomeNoteContent(projection, input.week),
      input.week,
      input.sequenceStart,
      input.baseTimestamp,
      'public_disclosure.trust_outcome',
      {
        activeCampaignCount: projection.activeCampaignCount,
        dominantAwarenessLevel: projection.dominantAwarenessLevel,
        aggregateRegionalTrustBand: projection.aggregateRegionalTrustBand,
        cooperationBand: projection.cooperationBand,
        postExposureTrustDeltaApplied: projection.postExposureTrustDeltaApplied,
        rivalPosture: projection.rivalPosture,
        week: input.week,
      }
    ),
  ]
}
