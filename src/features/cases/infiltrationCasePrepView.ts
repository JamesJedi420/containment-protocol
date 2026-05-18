import {
  evaluateCoverRoleMismatchPressure,
  type InfiltrationCoverRole,
} from '../../domain/infiltrationCover'
import {
  AWARENESS_COMPLICATION_THRESHOLD,
  isInfiltrationProbeEligible,
  readInfiltrationProbeState,
  resolveWeeklyInfiltrationProbeAction,
  type InfiltrationProbeAction,
  type InfiltrationStage,
} from '../../domain/infiltrationProbe'
import { readInfiltrationWeeklyProbeActionOverride } from '../../domain/infiltrationProbeOverride'
import type { CaseInstance } from '../../domain/models'

export const INFILTRATION_PROBE_ACTION_LABELS: Record<InfiltrationProbeAction, string> = {
  probe_access: 'Probe access',
  probe_route: 'Probe route',
  cleanup: 'Clean up cover',
}

export const INFILTRATION_PROBE_ACTION_SUMMARIES: Record<InfiltrationProbeAction, string> = {
  probe_access: 'Push objective access; moderate awareness gain.',
  probe_route: 'Map movement and logistics; higher awareness gain.',
  cleanup: 'Reduce awareness; minimal probe progress.',
}

const INFILTRATION_STAGE_LABELS: Record<InfiltrationStage, string> = {
  probing: 'Probing',
  exposed: 'Exposed',
  violent: 'Violent escalation',
}

const COVER_ROLE_LABELS: Record<InfiltrationCoverRole, string> = {
  uniform_guard: 'Uniform guard',
  civilian_staff: 'Civilian staff',
  courier: 'Courier',
  maintenance: 'Maintenance',
  official_inspector: 'Official inspector',
}

export interface InfiltrationProbeActionOptionView {
  readonly id: InfiltrationProbeAction
  readonly label: string
  readonly summary: string
  readonly selected: boolean
}

export interface InfiltrationCasePrepView {
  readonly visible: boolean
  readonly probeProgressPercent: number
  readonly awarenessPercent: number
  readonly stageLabel: string
  readonly awarenessComplicationBandPercent: number
  readonly coverRoleLabel?: string
  readonly documentTier?: number
  readonly doctrineBand?: number
  readonly coverStrainNotes: readonly string[]
  readonly plannedAction: InfiltrationProbeAction
  readonly plannedActionLabel: string
  readonly overrideAction?: InfiltrationProbeAction
  readonly overrideActionLabel?: string
  readonly effectiveAction: InfiltrationProbeAction
  readonly effectiveActionLabel: string
  readonly actionOptions: readonly InfiltrationProbeActionOptionView[]
  readonly usingOverride: boolean
}

export function canShowInfiltrationCasePrepOnCase(caseData: CaseInstance) {
  return caseData.status === 'in_progress' && isInfiltrationProbeEligible(caseData)
}

function formatPercent(value: number) {
  return Math.round(value * 100)
}

function buildCoverStrainNotes(caseData: CaseInstance): string[] {
  const profile = caseData.infiltrationCoverProfile
  if (profile === undefined) {
    return []
  }

  const notes: string[] = []
  const mismatch = evaluateCoverRoleMismatchPressure(caseData, profile.claimedRole)

  if (mismatch.hasRoleMismatch) {
    notes.push(`Claimed ${COVER_ROLE_LABELS[profile.claimedRole]} clashes with site tags.`)
  }

  if (mismatch.hasExtraRouteViolation) {
    notes.push('Route or venue tags contradict the cover story.')
  }

  if (notes.length === 0) {
    notes.push('Cover posture is stable for current site context.')
  }

  return notes
}

const PROBE_ACTIONS: readonly InfiltrationProbeAction[] = [
  'probe_access',
  'probe_route',
  'cleanup',
]

export function buildInfiltrationCasePrepView(caseData: CaseInstance): InfiltrationCasePrepView {
  const emptyOptions = PROBE_ACTIONS.map((id) => ({
    id,
    label: INFILTRATION_PROBE_ACTION_LABELS[id],
    summary: INFILTRATION_PROBE_ACTION_SUMMARIES[id],
    selected: false,
  }))

  if (!canShowInfiltrationCasePrepOnCase(caseData)) {
    return {
      visible: false,
      probeProgressPercent: 0,
      awarenessPercent: 0,
      stageLabel: INFILTRATION_STAGE_LABELS.probing,
      awarenessComplicationBandPercent: formatPercent(AWARENESS_COMPLICATION_THRESHOLD),
      coverStrainNotes: [],
      plannedAction: 'probe_access',
      plannedActionLabel: INFILTRATION_PROBE_ACTION_LABELS.probe_access,
      effectiveAction: 'probe_access',
      effectiveActionLabel: INFILTRATION_PROBE_ACTION_LABELS.probe_access,
      actionOptions: emptyOptions,
      usingOverride: false,
    }
  }

  const tracks = readInfiltrationProbeState(caseData)
  const plannedAction = resolveWeeklyInfiltrationProbeAction(caseData)
  const overrideAction = readInfiltrationWeeklyProbeActionOverride(caseData)
  const effectiveAction = overrideAction ?? plannedAction
  const profile = caseData.infiltrationCoverProfile

  return {
    visible: true,
    probeProgressPercent: formatPercent(tracks.probeProgress),
    awarenessPercent: formatPercent(tracks.awareness),
    stageLabel: INFILTRATION_STAGE_LABELS[tracks.stage],
    awarenessComplicationBandPercent: formatPercent(AWARENESS_COMPLICATION_THRESHOLD),
    coverRoleLabel:
      profile !== undefined ? COVER_ROLE_LABELS[profile.claimedRole] : undefined,
    documentTier: profile?.documentTier,
    doctrineBand: profile?.doctrineBand,
    coverStrainNotes: buildCoverStrainNotes(caseData),
    plannedAction,
    plannedActionLabel: INFILTRATION_PROBE_ACTION_LABELS[plannedAction],
    overrideAction,
    overrideActionLabel:
      overrideAction !== undefined
        ? INFILTRATION_PROBE_ACTION_LABELS[overrideAction]
        : undefined,
    effectiveAction,
    effectiveActionLabel: INFILTRATION_PROBE_ACTION_LABELS[effectiveAction],
    actionOptions: PROBE_ACTIONS.map((id) => ({
      id,
      label: INFILTRATION_PROBE_ACTION_LABELS[id],
      summary: INFILTRATION_PROBE_ACTION_SUMMARIES[id],
      selected: overrideAction === id,
    })),
    usingOverride: overrideAction !== undefined,
  }
}
