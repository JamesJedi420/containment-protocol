/**
 * SPE-2718: weekly report notes for status upkeep / public-display ranking costs.
 *
 * Emits when underfunded so the player sees why comparative standing shifted.
 */

import type { FundingState, ReportNote } from './models'
import { createDeterministicReportNote } from './reportNotes'
import {
  resolveStatusUpkeepDisplayEffect,
  type StatusUpkeepDisplayEffect,
} from './statusUpkeepDisplayCost'

export function formatStatusUpkeepDisplayNoteContent(
  effect: Pick<StatusUpkeepDisplayEffect, 'summary'>,
  week: number
): string {
  return `Week ${week} — ${effect.summary}`
}

/** Builds weekly report notes when public-display upkeep underfunding affects ranking. */
export function buildWeeklyStatusUpkeepDisplayReportNotes(input: {
  fundingState: FundingState | null | undefined
  week: number
  sequenceStart: number
  baseTimestamp?: number
}): ReportNote[] {
  const effect = resolveStatusUpkeepDisplayEffect(input.fundingState ?? undefined, input.week)
  if (effect.band !== 'underfunded') {
    return []
  }

  return [
    createDeterministicReportNote(
      formatStatusUpkeepDisplayNoteContent(effect, input.week),
      input.week,
      input.sequenceStart,
      input.baseTimestamp,
      'agency.status_upkeep_display',
      {
        band: effect.band,
        displayCost: effect.displayCost,
        fundingAfterOperatingCost: effect.fundingAfterOperatingCost,
        rankingDelta: effect.rankingDelta,
        standingGainScale: effect.standingGainScale,
        week: input.week,
      }
    ),
  ]
}
