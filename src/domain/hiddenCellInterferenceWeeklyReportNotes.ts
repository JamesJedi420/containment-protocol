/**
 * SPE-2704 / SPE-2706 / SPE-2707 / SPE-2710: weekly report notes for hidden-cell strategic interference.
 *
 * Emits notes from applied fundingHistory theft, research-rollback markers,
 * panic-amplification markers, and infrastructure-compromise markers —
 * no parallel sabotage sim beyond SPE-94 maintenance capacity.
 */

import {
  findHiddenCellFundingTheftAmountForWeek,
  findHiddenCellInfrastructureCompromiseAmountForWeek,
  findHiddenCellPanicAmplificationAmountForWeek,
  findHiddenCellResearchRollbackAmountForWeek,
  findHiddenCellResearchRollbackProjectIdForWeek,
  resolveHiddenCellFundingTheftFromPressure,
  resolveHiddenCellInfrastructureCompromiseFromPressure,
  resolveHiddenCellPanicAmplificationFromPressure,
  resolveHiddenCellResearchRollbackFromPressure,
  type HiddenCellInfrastructureCompromiseEffect,
  type HiddenCellInterferenceEffect,
  type HiddenCellPanicAmplificationEffect,
  type HiddenCellResearchRollbackEffect,
} from './hiddenCellStrategicInterference'
import type { AgencyState, FundingState, GameState, ReportNote, ResearchState } from './models'
import { createDeterministicReportNote } from './reportNotes'
import type { RivalPressureView } from './rivalPressure'

export function formatHiddenCellInterferenceNoteContent(
  effect: Pick<HiddenCellInterferenceEffect, 'summary' | 'fundingStolen' | 'rivalPressureBand'>,
  week: number
): string {
  return `Week ${week} — ${effect.summary}`
}

export function formatHiddenCellResearchRollbackNoteContent(
  effect: Pick<
    HiddenCellResearchRollbackEffect,
    'summary' | 'progressTimeRolledBack' | 'rivalPressureBand' | 'targetProjectId'
  >,
  week: number
): string {
  return `Week ${week} — ${effect.summary}`
}

export function formatHiddenCellPanicAmplificationNoteContent(
  effect: Pick<
    HiddenCellPanicAmplificationEffect,
    'summary' | 'pressureAmplified' | 'rivalPressureBand'
  >,
  week: number
): string {
  return `Week ${week} — ${effect.summary}`
}

export function formatHiddenCellInfrastructureCompromiseNoteContent(
  effect: Pick<
    HiddenCellInfrastructureCompromiseEffect,
    'summary' | 'maintenanceCompromised' | 'rivalPressureBand'
  >,
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

/** Builds weekly report notes when hidden-cell research rollback was applied for the closed week. */
export function buildWeeklyHiddenCellResearchRollbackReportNotes(input: {
  researchState: ResearchState | null | undefined
  rivalPressure: Pick<RivalPressureView, 'score' | 'band'>
  week: number
  sequenceStart: number
  baseTimestamp?: number
}): ReportNote[] {
  const appliedAmount = findHiddenCellResearchRollbackAmountForWeek(
    input.researchState ?? undefined,
    input.week
  )
  const projectId = findHiddenCellResearchRollbackProjectIdForWeek(
    input.researchState ?? undefined,
    input.week
  )
  if (appliedAmount <= 0 || !projectId) {
    return []
  }

  const effect = resolveHiddenCellResearchRollbackFromPressure(
    input.rivalPressure,
    input.researchState ?? undefined
  )

  // After apply, progress is already reduced — rebuild summary from applied markers.
  const noteEffect: Pick<
    HiddenCellResearchRollbackEffect,
    | 'summary'
    | 'progressTimeRolledBack'
    | 'rivalPressureBand'
    | 'targetProjectId'
    | 'kind'
    | 'rivalPressureScore'
    | 'active'
    | 'baseRollbackAmount'
  > = {
    active: true,
    kind: 'research_rollback',
    rivalPressureScore: input.rivalPressure.score,
    rivalPressureBand: input.rivalPressure.band,
    baseRollbackAmount: effect.baseRollbackAmount,
    progressTimeRolledBack: appliedAmount,
    targetProjectId: projectId,
    summary:
      `Hidden-cell interference rolled back ${appliedAmount} week` +
      `${appliedAmount === 1 ? '' : 's'} of research on ${projectId} ` +
      `(${input.rivalPressure.band} cell pressure; strategic sabotage before open confrontation).`,
  }

  return [
    createDeterministicReportNote(
      formatHiddenCellResearchRollbackNoteContent(noteEffect, input.week),
      input.week,
      input.sequenceStart,
      input.baseTimestamp,
      'agency.hidden_cell_interference',
      {
        kind: 'research_rollback',
        progressTimeRolledBack: appliedAmount,
        researchProjectId: projectId,
        rivalPressureBand: input.rivalPressure.band,
        rivalPressureScore: input.rivalPressure.score,
        week: input.week,
      }
    ),
  ]
}

/** Builds weekly report notes when hidden-cell panic amplification was applied for the closed week. */
export function buildWeeklyHiddenCellPanicAmplificationReportNotes(input: {
  gameState: Pick<
    GameState,
    'lastHiddenCellPanicAmplificationWeek' | 'lastHiddenCellPanicAmplificationAmount'
  >
  rivalPressure: Pick<RivalPressureView, 'score' | 'band'>
  week: number
  sequenceStart: number
  baseTimestamp?: number
}): ReportNote[] {
  const appliedAmount = findHiddenCellPanicAmplificationAmountForWeek(input.gameState, input.week)
  if (appliedAmount <= 0) {
    return []
  }

  const effect = resolveHiddenCellPanicAmplificationFromPressure(input.rivalPressure)
  const noteEffect: Pick<
    HiddenCellPanicAmplificationEffect,
    | 'summary'
    | 'pressureAmplified'
    | 'rivalPressureBand'
    | 'kind'
    | 'rivalPressureScore'
    | 'active'
    | 'baseAmplificationAmount'
  > = {
    active: true,
    kind: 'panic_amplification',
    rivalPressureScore: input.rivalPressure.score,
    rivalPressureBand: input.rivalPressure.band,
    baseAmplificationAmount: effect.baseAmplificationAmount,
    pressureAmplified: appliedAmount,
    summary:
      `Hidden-cell interference amplified ambient panic pressure by ${appliedAmount} ` +
      `(${input.rivalPressure.band} cell pressure; strategic unrest before open confrontation).`,
  }

  return [
    createDeterministicReportNote(
      formatHiddenCellPanicAmplificationNoteContent(noteEffect, input.week),
      input.week,
      input.sequenceStart,
      input.baseTimestamp,
      'agency.hidden_cell_interference',
      {
        kind: 'panic_amplification',
        pressureAmplified: appliedAmount,
        rivalPressureBand: input.rivalPressure.band,
        rivalPressureScore: input.rivalPressure.score,
        week: input.week,
      }
    ),
  ]
}

/** Builds weekly report notes when hidden-cell infrastructure compromise was applied for the closed week. */
export function buildWeeklyHiddenCellInfrastructureCompromiseReportNotes(input: {
  agency: Pick<
    AgencyState,
    | 'lastHiddenCellInfrastructureCompromiseWeek'
    | 'lastHiddenCellInfrastructureCompromiseAmount'
    | 'maintenanceSpecialistsAvailable'
  > | null | undefined
  rivalPressure: Pick<RivalPressureView, 'score' | 'band'>
  /** Pre-compromise maintenance capacity used to rebuild the effect summary deterministically. */
  maintenanceBeforeCompromise: number
  week: number
  sequenceStart: number
  baseTimestamp?: number
}): ReportNote[] {
  const appliedAmount = findHiddenCellInfrastructureCompromiseAmountForWeek(
    input.agency ?? undefined,
    input.week
  )
  if (appliedAmount <= 0) {
    return []
  }

  const effect = resolveHiddenCellInfrastructureCompromiseFromPressure(
    input.rivalPressure,
    input.maintenanceBeforeCompromise
  )
  const noteEffect: Pick<
    HiddenCellInfrastructureCompromiseEffect,
    | 'summary'
    | 'maintenanceCompromised'
    | 'rivalPressureBand'
    | 'kind'
    | 'rivalPressureScore'
    | 'active'
    | 'baseCompromiseAmount'
  > = {
    active: true,
    kind: 'infrastructure_compromise',
    rivalPressureScore: input.rivalPressure.score,
    rivalPressureBand: input.rivalPressure.band,
    baseCompromiseAmount: effect.baseCompromiseAmount,
    maintenanceCompromised: appliedAmount,
    summary:
      `Hidden-cell interference compromised ${appliedAmount} maintenance specialist` +
      `${appliedAmount === 1 ? '' : 's'} ` +
      `(${input.rivalPressure.band} cell pressure; strategic infrastructure sabotage before open confrontation).`,
  }

  return [
    createDeterministicReportNote(
      formatHiddenCellInfrastructureCompromiseNoteContent(noteEffect, input.week),
      input.week,
      input.sequenceStart,
      input.baseTimestamp,
      'agency.hidden_cell_interference',
      {
        kind: 'infrastructure_compromise',
        maintenanceCompromised: appliedAmount,
        rivalPressureBand: input.rivalPressure.band,
        rivalPressureScore: input.rivalPressure.score,
        week: input.week,
      }
    ),
  ]
}
