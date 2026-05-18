import {
  buildConcealCaseFlagId,
  canPlayerSetConcealCaseFlag,
  canShowConcealmentCasePrepOnCase,
  listConcealmentActivationTagsOnCase,
  summarizeConcealmentTriggerWhen,
} from '../../domain/concealmentCasePrep'
import { isPersistentFlagSet } from '../../domain/flagSystem'
import { readGameStateManager } from '../../domain/gameStateManager'
import {
  resolveConcealmentActivation,
  type ConcealmentActivationMode,
} from '../../domain/hiddenStateActivation'
import { countCaseHiddenModifiers } from '../../domain/recon'
import type { CaseInstance, GameState } from '../../domain/models'

export interface ConcealmentTriggerRowView {
  readonly id: string
  readonly modeLabel: string
  readonly whenSummary: string
}

export interface ConcealmentCasePrepView {
  readonly visible: boolean
  readonly activationTags: readonly string[]
  readonly triggerRows: readonly ConcealmentTriggerRowView[]
  readonly previewApplied: boolean
  readonly previewMode?: ConcealmentActivationMode
  readonly previewReason?: string
  readonly previewReasonLabel: string
  readonly previewStatusLabel: string
  readonly playerConcealFlagActive: boolean
  readonly canToggleConcealFlag: boolean
  readonly hiddenModifierCount?: number
}

const MODE_LABELS: Record<ConcealmentActivationMode, string> = {
  hidden: 'Hidden presence',
  displaced: 'Displaced cover',
}

function humanizePreviewReason(reason: string | undefined): string {
  if (reason === undefined || reason.length === 0) {
    return 'No activation rule matched yet'
  }

  if (reason.startsWith('global-flag:conceal.case.')) {
    return 'Covert request flag on this case'
  }

  if (reason.startsWith('global-flag:conceal.displace.')) {
    return 'Displacement flag on this case'
  }

  if (reason === 'global-flag-prefix:conceal.') {
    return 'Agency-wide covert activation flag'
  }

  if (reason === 'case-tag') {
    return 'Concealment activation tags on the case'
  }

  if (reason.startsWith('authored-trigger:')) {
    return `Authored trigger (${reason.slice('authored-trigger:'.length)})`
  }

  if (reason === 'recon-hidden-modifiers') {
    return 'Recon hidden-modifier bridge'
  }

  return reason
}

function buildPreviewStatusLabel(applied: boolean, mode?: ConcealmentActivationMode) {
  if (!applied) {
    return 'Open posture — no covert activation on the next weekly tick'
  }

  if (mode === 'displaced') {
    return 'Next weekly tick will mark this case as displaced cover'
  }

  return 'Next weekly tick will mark this case as hidden presence'
}

export function buildConcealmentCasePrepView(
  caseData: CaseInstance,
  game: GameState
): ConcealmentCasePrepView {
  const emptyView: ConcealmentCasePrepView = {
    visible: false,
    activationTags: [],
    triggerRows: [],
    previewApplied: false,
    previewReasonLabel: 'No activation rule matched yet',
    previewStatusLabel: 'Open posture — no covert activation on the next weekly tick',
    playerConcealFlagActive: false,
    canToggleConcealFlag: false,
  }

  if (!canShowConcealmentCasePrepOnCase(caseData)) {
    return emptyView
  }

  const globalFlags = readGameStateManager(game).globalFlags
  const hiddenModifierCount = countCaseHiddenModifiers(caseData, caseData.mapLayer)
  const preview = resolveConcealmentActivation(caseData, {
    globalFlags,
    hiddenModifierCount,
  })

  const concealFlagId = buildConcealCaseFlagId(caseData.id)
  const playerConcealFlagActive = isPersistentFlagSet(game, concealFlagId)

  return {
    visible: true,
    activationTags: listConcealmentActivationTagsOnCase(caseData),
    triggerRows: (caseData.concealmentTriggers ?? []).map((trigger) => ({
      id: trigger.id,
      modeLabel: MODE_LABELS[trigger.mode ?? 'hidden'],
      whenSummary: summarizeConcealmentTriggerWhen(trigger),
    })),
    previewApplied: preview.applied,
    previewMode: preview.mode,
    previewReason: preview.reason,
    previewReasonLabel: humanizePreviewReason(preview.reason),
    previewStatusLabel: buildPreviewStatusLabel(preview.applied, preview.mode),
    playerConcealFlagActive,
    canToggleConcealFlag: canPlayerSetConcealCaseFlag(caseData),
    hiddenModifierCount,
  }
}
