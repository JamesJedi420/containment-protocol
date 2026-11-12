/**
 * SPE-521 follow-up: Front Desk attention for pending infiltration encounters on eligible in-progress cases.
 */

import {
  buildInfiltrationEncounterReportContext,
  buildInfiltrationPrepEncounterNotes,
  type InfiltrationEncounterReportContext,
} from './infiltrationEncounterReportNotes'
import {
  AWARENESS_COMPLICATION_THRESHOLD,
  isInfiltrationProbeEligible,
} from './infiltrationProbe'
import type { CaseInstance, GameState } from './models'

export type InfiltrationPendingEncounterAttentionTone = 'info' | 'warning'

export interface InfiltrationPendingEncounterCaseRow {
  readonly caseId: string
  readonly caseTitle: string
  readonly context: InfiltrationEncounterReportContext
  readonly previewNote: string
}

export interface InfiltrationPendingEncounterAttentionProjection {
  readonly isEmpty: boolean
  readonly pendingCount: number
  readonly elevatedCount: number
  readonly cases: readonly InfiltrationPendingEncounterCaseRow[]
  readonly frontDeskAttentionTone: InfiltrationPendingEncounterAttentionTone
  readonly frontDeskAttentionSummary: string
  readonly frontDeskAttentionCaseId: string | null
}

function canProjectInfiltrationPendingEncounter(caseData: CaseInstance) {
  return (
    caseData.status === 'in_progress' &&
    isInfiltrationProbeEligible(caseData) &&
    caseData.infiltrationProbePlan !== undefined
  )
}

function listEligibleCases(game: GameState): CaseInstance[] {
  return Object.values(game.cases)
    .filter((caseData) => canProjectInfiltrationPendingEncounter(caseData))
    .sort((left, right) => left.id.localeCompare(right.id))
}

function resolvePendingEncounterRow(
  caseData: CaseInstance
): InfiltrationPendingEncounterCaseRow | null {
  const context = buildInfiltrationEncounterReportContext(caseData)
  if (context === undefined) {
    return null
  }

  const previewNotes = buildInfiltrationPrepEncounterNotes(caseData)
  const previewNote = previewNotes[0]
  if (previewNote === undefined) {
    return null
  }

  return {
    caseId: caseData.id,
    caseTitle: caseData.title,
    context,
    previewNote,
  }
}

function isElevatedEncounterRow(row: InfiltrationPendingEncounterCaseRow) {
  return (
    row.context.stage !== 'probing' ||
    row.context.awareness >= AWARENESS_COMPLICATION_THRESHOLD
  )
}

function resolveFrontDeskAttentionTone(
  rows: readonly InfiltrationPendingEncounterCaseRow[]
): InfiltrationPendingEncounterAttentionTone {
  return rows.some(isElevatedEncounterRow) ? 'warning' : 'info'
}

function formatCaseLabel(title: string): string {
  const trimmed = title.trim()
  return trimmed.length > 0 ? trimmed : 'Untitled operation'
}

function buildFrontDeskAttentionSummary(
  rows: readonly InfiltrationPendingEncounterCaseRow[]
): string {
  if (rows.length === 0) {
    return 'No infiltration encounter is queued on the next weekly tick.'
  }

  if (rows.length === 1) {
    const row = rows[0]!
    return `${formatCaseLabel(row.caseTitle)} — ${row.previewNote}`
  }

  const leadTitles = rows
    .slice(0, 2)
    .map((row) => formatCaseLabel(row.caseTitle))
    .join('; ')
  const remainder = rows.length > 2 ? ` (+${rows.length - 2} more)` : ''

  return `${rows.length} in-progress operations will run infiltration encounters on the next weekly tick: ${leadTitles}${remainder}.`
}

/** Projects pending infiltration encounter rows from hydrated in-progress eligible cases. */
export function projectInfiltrationPendingEncounterAttention(
  game: GameState
): InfiltrationPendingEncounterAttentionProjection {
  const rows = listEligibleCases(game)
    .map((caseData) => resolvePendingEncounterRow(caseData))
    .filter((row): row is InfiltrationPendingEncounterCaseRow => row !== null)

  const elevatedCount = rows.filter(isElevatedEncounterRow).length

  return Object.freeze({
    isEmpty: rows.length === 0,
    pendingCount: rows.length,
    elevatedCount,
    cases: rows,
    frontDeskAttentionTone: resolveFrontDeskAttentionTone(rows),
    frontDeskAttentionSummary: buildFrontDeskAttentionSummary(rows),
    frontDeskAttentionCaseId: rows.length === 1 ? rows[0]!.caseId : null,
  })
}
