/**
 * SPE-2704: weekly report notes for hidden-cell strategic interference (funding theft).
 *
 * Emits notes from applied fundingHistory theft entries — no new GameState persistence.
 */

import {
  findHiddenCellFundingTheftAmountForWeek,
  resolveHiddenCellFundingTheftFromPressure,
  type HiddenCellInterferenceEffect,
} from './hiddenCellStrategicInterference'
import type { FundingState, ReportNote } from './models'
import { createDeterministicReportNote } from './reportNotes'
import type { RivalPressureView } from './rivalPressure'

export function formatHiddenCellInterferenceNoteContent(
  effect: Pick<HiddenCellInterferenceEffect, 'summary' | 'fundingStolen' | 'rivalPressureBand'>,
  week: number
): string {
  return `Week ${week} — ${effect.summary}`
}

/** Builds weekly report notes when hidden-cell funding theft was applied for the closed week. */
export function buildWeeklyHiddenCellInterferenceReportNotes(input: {
  fundingState: FundingState | null | undefined
  rivalPressure: Pick<RivalPressureView, 'score' | 'band'>
  /** Pre-theft funding used to rebuild the effect summary deterministically. */
  fundingBeforeTheft: number
  week: number
  sequenceStart: number
  baseTimestamp?: number
}): ReportNote[] {
  const appliedAmount = findHiddenCellFundingTheftAmountForWeek(input.fundingState ?? undefined, input.week)
  if (appliedAmount <= 0) {
    return []
  }

  const effect = resolveHiddenCellFundingTheftFromPressure(
    input.rivalPressure,
    input.fundingBeforeTheft
  )

  if (effect.fundingStolen <= 0) {
    return []
  }

  return [
    createDeterministicReportNote(
      formatHiddenCellInterferenceNoteContent(effect, input.week),
      input.week,
      input.sequenceStart,
      input.baseTimestamp,
      'agency.hidden_cell_interference',
      {
        kind: effect.kind,
        fundingStolen: effect.fundingStolen,
        rivalPressureBand: effect.rivalPressureBand,
        rivalPressureScore: effect.rivalPressureScore,
        week: input.week,
      }
    ),
  ]
}
