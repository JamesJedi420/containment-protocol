/**
 * SPE-2718: weekly report notes for status upkeep / public-display ranking costs.
 *
 * Emits when underfunded so the player sees why comparative standing shifted.
 * Prefers agency week-close markers (pre-cost affordability); funding-history is fallback.
 */

import type { AgencyState, FundingState, ReportNote } from './models'
import { createDeterministicReportNote } from './reportNotes'
import {
  findStatusUpkeepMarkersForWeek,
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
  agency: AgencyState | null | undefined
  fundingState: FundingState | null | undefined
  week: number
  sequenceStart: number
  baseTimestamp?: number
}): ReportNote[] {
  const effect =
    findStatusUpkeepMarkersForWeek(input.agency ?? undefined, input.week) ??
    resolveStatusUpkeepDisplayEffect(input.fundingState ?? undefined, input.week)

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
        operatingCostAmount: effect.operatingCostAmount,
        fundingBeforeOperatingCost: effect.fundingBeforeOperatingCost,
        rankingDelta: effect.rankingDelta,
        standingGainScale: effect.standingGainScale,
        week: input.week,
      }
    ),
  ]
}
