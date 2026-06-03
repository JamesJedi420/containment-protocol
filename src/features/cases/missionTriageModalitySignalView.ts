import { evaluateBehaviorWeightedDisguiseValidation } from '../../domain/disguiseValidation'
import {
  formatModalityTellReadout,
  evaluateHiddenStateModalityTell,
  TELL_METADATA_SPOOF_TAG,
  TELL_ROUTE_TIMING_TAG,
  TELL_SIGNATURE_DRIFT_TAG,
  TELL_SPEECH_CADENCE_TAG,
  TELL_THERMAL_RESIDUAL_TAG,
  type HiddenStateTellKind,
} from '../../domain/hiddenStateModalityTells'
import {
  resolveIllusionKindFromCase,
  type HiddenStateIllusionKind,
  type HiddenStateIllusionPhase,
} from '../../domain/hiddenStateIllusionLifecycle'
import { resolveHiddenStateModality } from '../../domain/hiddenStateModality'
import type { Agent, CaseInstance, GameState, Team } from '../../domain/models'

const MAX_MODALITY_MARKERS = 2

const MARKER_STYLES = {
  tell: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-100',
  illusionActive: 'border-rose-500/40 bg-rose-500/10 text-rose-100',
  illusionDisproved: 'border-rose-400/30 bg-rose-400/5 text-rose-200',
} as const

export interface MissionTriageModalitySignalMarker {
  readonly id: string
  readonly label: string
  readonly className: string
  readonly title?: string
}

export interface MissionTriageModalitySignals {
  readonly visible: boolean
  readonly markers: readonly MissionTriageModalitySignalMarker[]
}

function pushMarker(
  markers: MissionTriageModalitySignalMarker[],
  marker: MissionTriageModalitySignalMarker
) {
  if (markers.length >= MAX_MODALITY_MARKERS) {
    return
  }

  markers.push(marker)
}

function agentsForTeams(game: GameState, teams: readonly Team[]): Agent[] {
  const agents: Agent[] = []

  for (const team of teams) {
    for (const agentId of team.agentIds) {
      const agent = game.agents[agentId]
      if (agent) {
        agents.push(agent)
      }
    }
  }

  return agents
}

function caseTagSet(caseData: CaseInstance): Set<string> {
  return new Set([
    ...(caseData.tags ?? []),
    ...(caseData.requiredTags ?? []),
    ...(caseData.preferredTags ?? []),
  ])
}

function tellKindForAuthoredTags(
  caseData: CaseInstance
): HiddenStateTellKind | null {
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

  return null
}

function tellChipLabel(kind: HiddenStateTellKind): string {
  switch (kind) {
    case 'thermal_residual':
      return 'Tell: thermal'
    case 'route_timing':
      return 'Tell: routing'
    case 'speech_cadence':
      return 'Tell: cadence'
    case 'metadata_spoof':
      return 'Tell: metadata'
    case 'signature_drift':
      return 'Tell: signature'
    default: {
      const _exhaustive: never = kind
      return _exhaustive
    }
  }
}

function illusionChipLabel(
  kind: HiddenStateIllusionKind,
  phase: HiddenStateIllusionPhase
): string {
  if (phase === 'disproved') {
    return 'Illusion disproved'
  }

  return kind === 'false_entity' ? 'False contact' : 'False terrain'
}

function appendIllusionMarker(
  markers: MissionTriageModalitySignalMarker[],
  caseData: CaseInstance
) {
  const kind = resolveIllusionKindFromCase(caseData)
  if (kind === null) {
    return
  }

  const phase = caseData.hiddenStateIllusionState?.phase ?? 'active'
  if (phase === 'collapsed') {
    return
  }

  pushMarker(markers, {
    id: `illusion:${kind}:${phase}`,
    label: illusionChipLabel(kind, phase),
    className:
      phase === 'disproved' ? MARKER_STYLES.illusionDisproved : MARKER_STYLES.illusionActive,
    title:
      phase === 'disproved'
        ? caseData.hiddenStateIllusionState?.disproofReason
        : kind === 'false_entity'
          ? 'Authored false-entity overlay may project fabricated contact readouts.'
          : 'Authored structural illusion may mislocate terrain or route anchors.',
  })
}

function appendTellMarker(
  markers: MissionTriageModalitySignalMarker[],
  caseData: CaseInstance,
  assignedAgents: readonly Agent[]
) {
  const disguiseValidation = evaluateBehaviorWeightedDisguiseValidation(caseData, [
    ...assignedAgents,
  ])

  const tell =
    assignedAgents.length > 0
      ? evaluateHiddenStateModalityTell({
          caseData,
          agents: assignedAgents,
          disguiseValidationActive: disguiseValidation.active,
        })
      : null

  if (tell?.active === true && tell.kind !== undefined) {
    pushMarker(markers, {
      id: `tell:${tell.kind}`,
      label: tellChipLabel(tell.kind),
      className: MARKER_STYLES.tell,
      title: tell.readoutLine,
    })
    return
  }

  const previewKind = tellKindForAuthoredTags(caseData)
  if (previewKind === null) {
    return
  }

  pushMarker(markers, {
    id: `tell-preview:${previewKind}`,
    label: tellChipLabel(previewKind),
    className: MARKER_STYLES.tell,
    title: formatModalityTellReadout(previewKind, caseData),
  })
}

export function buildMissionTriageModalitySignals(
  caseData: CaseInstance,
  game: GameState,
  assignedTeams: readonly Team[] = []
): MissionTriageModalitySignals {
  const resolvedCase = game.cases[caseData.id] ?? caseData

  if (resolvedCase.status === 'resolved') {
    return { visible: false, markers: [] }
  }

  const markers: MissionTriageModalitySignalMarker[] = []

  appendIllusionMarker(markers, resolvedCase)
  appendTellMarker(markers, resolvedCase, agentsForTeams(game, assignedTeams))

  return {
    visible: markers.length > 0,
    markers,
  }
}
