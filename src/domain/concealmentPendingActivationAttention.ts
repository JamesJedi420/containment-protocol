/**
 * SPE-70 follow-up: Front Desk attention for pending concealment activation on open-posture cases.
 */

import { canShowConcealmentCasePrepOnCase } from './concealmentCasePrep'
import { formatConcealmentActivationPreviewNote } from './concealmentActivationFeed'
import { readGameStateManager } from './gameStateManager'
import { resolveConcealmentActivation, type ConcealmentActivationMode } from './hiddenStateActivation'
import type { CaseInstance, GameState } from './models'
import { countCaseHiddenModifiers } from './recon'

export type ConcealmentPendingActivationAttentionTone = 'info' | 'warning'

export interface ConcealmentPendingActivationCaseRow {
  readonly caseId: string
  readonly caseTitle: string
  readonly mode: ConcealmentActivationMode
  readonly previewNote: string
}

export interface ConcealmentPendingActivationAttentionProjection {
  readonly isEmpty: boolean
  readonly pendingCount: number
  readonly displacedCount: number
  readonly hiddenCount: number
  readonly cases: readonly ConcealmentPendingActivationCaseRow[]
  readonly frontDeskAttentionTone: ConcealmentPendingActivationAttentionTone
  readonly frontDeskAttentionSummary: string
  readonly frontDeskAttentionCaseId: string | null
}

function listOpenPostureCases(game: GameState): CaseInstance[] {
  return Object.values(game.cases)
    .filter((caseData) => canShowConcealmentCasePrepOnCase(caseData))
    .sort((left, right) => left.id.localeCompare(right.id))
}

function resolvePendingActivationRow(
  caseData: CaseInstance,
  game: GameState
): ConcealmentPendingActivationCaseRow | null {
  const globalFlags = readGameStateManager(game).globalFlags
  const hiddenModifierCount = countCaseHiddenModifiers(caseData, caseData.mapLayer)
  const preview = resolveConcealmentActivation(caseData, {
    globalFlags,
    hiddenModifierCount,
  })

  if (!preview.applied || preview.mode === undefined || preview.reason === undefined) {
    return null
  }

  return {
    caseId: caseData.id,
    caseTitle: caseData.title,
    mode: preview.mode,
    previewNote: formatConcealmentActivationPreviewNote(preview.mode, preview.reason),
  }
}

function resolveFrontDeskAttentionTone(
  rows: readonly ConcealmentPendingActivationCaseRow[]
): ConcealmentPendingActivationAttentionTone {
  return rows.some((row) => row.mode === 'displaced') ? 'warning' : 'info'
}

function formatCaseLabel(title: string): string {
  const trimmed = title.trim()
  return trimmed.length > 0 ? trimmed : 'Untitled operation'
}

function buildFrontDeskAttentionSummary(
  rows: readonly ConcealmentPendingActivationCaseRow[]
): string {
  if (rows.length === 0) {
    return 'No covert activation is queued on the next weekly tick.'
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

  return `${rows.length} in-progress operations will enter covert activation on the next weekly tick: ${leadTitles}${remainder}.`
}

/** Projects pending concealment activation rows from hydrated in-progress open-posture cases. */
export function projectConcealmentPendingActivationAttention(
  game: GameState
): ConcealmentPendingActivationAttentionProjection {
  const rows = listOpenPostureCases(game)
    .map((caseData) => resolvePendingActivationRow(caseData, game))
    .filter((row): row is ConcealmentPendingActivationCaseRow => row !== null)

  const displacedCount = rows.filter((row) => row.mode === 'displaced').length
  const hiddenCount = rows.filter((row) => row.mode === 'hidden').length

  return Object.freeze({
    isEmpty: rows.length === 0,
    pendingCount: rows.length,
    displacedCount,
    hiddenCount,
    cases: rows,
    frontDeskAttentionTone: resolveFrontDeskAttentionTone(rows),
    frontDeskAttentionSummary: buildFrontDeskAttentionSummary(rows),
    frontDeskAttentionCaseId: rows.length === 1 ? rows[0]!.caseId : null,
  })
}
