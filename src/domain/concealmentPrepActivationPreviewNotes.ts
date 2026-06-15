/**
 * SPE-70 follow-up: deterministic concealment prep preview bullets (mirrors infiltration encounter preview).
 */

import { canShowConcealmentCasePrepOnCase } from './concealmentCasePrep'
import { formatConcealmentActivationPreviewNote } from './concealmentActivationFeed'
import { evaluateBehaviorWeightedDisguiseValidation } from './disguiseValidation'
import { readGameStateManager } from './gameStateManager'
import {
  evaluateHiddenStateModalityTell,
  formatModalityTellReadout,
  TELL_METADATA_SPOOF_TAG,
  TELL_ROUTE_TIMING_TAG,
  TELL_SIGNATURE_DRIFT_TAG,
  TELL_SPEECH_CADENCE_TAG,
  TELL_THERMAL_RESIDUAL_TAG,
  tellReadoutPrefixForModality,
  type HiddenStateTellKind,
} from './hiddenStateModalityTells'
import { resolveConcealmentActivation } from './hiddenStateActivation'
import {
  resolveIllusionKindFromCase,
  type HiddenStateIllusionKind,
  type HiddenStateIllusionPhase,
} from './hiddenStateIllusionLifecycle'
import { resolveHiddenStateModality } from './hiddenStateModality'
import type { Agent, CaseInstance, GameState } from './models'
import { countCaseHiddenModifiers } from './recon'
import { getUniqueTeamMembers } from './teamSimulation'

function caseTagSet(caseData: CaseInstance): Set<string> {
  return new Set([
    ...(caseData.tags ?? []),
    ...(caseData.requiredTags ?? []),
    ...(caseData.preferredTags ?? []),
  ])
}

function tellModalityForKind(kind: HiddenStateTellKind): HiddenStateModalityKind {
  switch (kind) {
    case 'thermal_residual':
      return 'concealed_presence'
    case 'route_timing':
      return 'false_position'
    case 'speech_cadence':
    case 'metadata_spoof':
      return 'disguised_identity'
    case 'signature_drift':
      return 'signature_masking'
    default: {
      const _exhaustive: never = kind
      return _exhaustive
    }
  }
}

function tellKindForAuthoredTags(caseData: CaseInstance): HiddenStateTellKind | null {
  const modality = resolveHiddenStateModality(caseData)
  const tags = caseTagSet(caseData)

  if (modality === 'disguised_identity') {
    if (tags.has(TELL_SPEECH_CADENCE_TAG)) {
      return 'speech_cadence'
    }

    if (tags.has(TELL_METADATA_SPOOF_TAG)) {
      return 'metadata_spoof'
    }
  }

  if (modality === 'false_position' && tags.has(TELL_ROUTE_TIMING_TAG)) {
    return 'route_timing'
  }

  if (modality === 'signature_masking' && tags.has(TELL_SIGNATURE_DRIFT_TAG)) {
    return 'signature_drift'
  }

  if (modality === 'concealed_presence' && tags.has(TELL_THERMAL_RESIDUAL_TAG)) {
    return 'thermal_residual'
  }

  if (modality !== 'none') {
    return null
  }

  if (tags.has(TELL_SPEECH_CADENCE_TAG)) {
    return 'speech_cadence'
  }

  if (tags.has(TELL_METADATA_SPOOF_TAG)) {
    return 'metadata_spoof'
  }

  if (tags.has(TELL_ROUTE_TIMING_TAG)) {
    return 'route_timing'
  }

  if (tags.has(TELL_SIGNATURE_DRIFT_TAG)) {
    return 'signature_drift'
  }

  if (tags.has(TELL_THERMAL_RESIDUAL_TAG)) {
    return 'thermal_residual'
  }

  return null
}

function agentsForCase(game: GameState, caseData: CaseInstance): Agent[] {
  const teamIds = caseData.assignedTeamIds ?? []
  if (teamIds.length === 0) {
    return []
  }

  return getUniqueTeamMembers(teamIds, game.teams, game.agents)
}

function illusionKindForPreview(caseData: CaseInstance): HiddenStateIllusionKind | null {
  const resolved = resolveIllusionKindFromCase(caseData)
  if (resolved !== null) {
    return resolved
  }

  const tags = caseTagSet(caseData)
  if (tags.has('false-entity')) {
    return 'false_entity'
  }

  if (tags.has('structural-illusion')) {
    return 'structural_illusion'
  }

  return null
}

function illusionPreviewNote(
  kind: HiddenStateIllusionKind,
  phase: HiddenStateIllusionPhase,
  caseData: CaseInstance
): string {
  if (phase === 'disproved') {
    const reason = caseData.hiddenStateIllusionState?.disproofReason?.trim()
    return reason !== undefined && reason.length > 0
      ? `Illusion disproved: ${reason}`
      : 'Illusion overlay disproved; fabricated readouts should collapse on the next pass.'
  }

  return kind === 'false_entity'
    ? 'False-entity overlay may project fabricated contact readouts while active.'
    : 'Structural illusion may mislocate terrain or route anchors while active.'
}

function appendTellPreviewNotes(notes: string[], caseData: CaseInstance, agents: readonly Agent[]) {
  const disguiseValidation = evaluateBehaviorWeightedDisguiseValidation(caseData, [...agents])

  if (agents.length > 0) {
    const tell = evaluateHiddenStateModalityTell({
      caseData,
      agents,
      disguiseValidationActive: disguiseValidation.active,
    })

    if (tell.active && tell.readoutLine !== undefined) {
      notes.push(tell.readoutLine)
    }

    return
  }

  const previewKind = tellKindForAuthoredTags(caseData)
  if (previewKind === null) {
    return
  }

  const modality = resolveHiddenStateModality(caseData)
  const prefix = tellReadoutPrefixForModality(
    modality === 'none' ? tellModalityForKind(previewKind) : modality
  )
  const sentence = formatModalityTellReadout(previewKind, caseData)

  if (prefix !== null && sentence.length > 0) {
    notes.push(`${prefix} ${sentence}`)
  }
}

export function buildConcealmentPrepActivationPreviewNotes(
  caseData: CaseInstance,
  game: GameState
): readonly string[] {
  if (!canShowConcealmentCasePrepOnCase(caseData)) {
    return []
  }

  const notes: string[] = []
  const globalFlags = readGameStateManager(game).globalFlags
  const hiddenModifierCount = countCaseHiddenModifiers(caseData, caseData.mapLayer)
  const preview = resolveConcealmentActivation(caseData, {
    globalFlags,
    hiddenModifierCount,
  })

  if (preview.applied && preview.mode !== undefined && preview.reason !== undefined) {
    notes.push(formatConcealmentActivationPreviewNote(preview.mode, preview.reason))
  }

  appendTellPreviewNotes(notes, caseData, agentsForCase(game, caseData))

  const illusionKind = illusionKindForPreview(caseData)
  if (illusionKind !== null) {
    const phase = caseData.hiddenStateIllusionState?.phase ?? 'active'
    if (phase !== 'collapsed') {
      notes.push(illusionPreviewNote(illusionKind, phase, caseData))
    }
  }

  return notes
}
