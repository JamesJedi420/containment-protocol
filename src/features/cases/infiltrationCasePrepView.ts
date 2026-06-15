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
import { buildInfiltrationPrepEncounterNotes } from '../../domain/infiltrationEncounterReportNotes'
import {
  projectInfiltrationEncounterStateCover,
  type InfiltrationEncounterCoverBand,
  type InfiltrationEncounterAwarenessBand,
} from '../../domain/infiltrationEncounterStateCover'
import type { InfiltrationEncounterCoverStance } from '../../domain/infiltrationEncounterCoverStance'
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

export interface InfiltrationEncounterCoverStanceOptionView {
  readonly id: InfiltrationEncounterCoverStance
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
  readonly doctrineBandPercent?: number
  readonly coverStrainNotes: readonly string[]
  readonly hasCoverStrain: boolean
  readonly plannedAction: InfiltrationProbeAction
  readonly plannedActionLabel: string
  readonly overrideAction?: InfiltrationProbeAction
  readonly overrideActionLabel?: string
  readonly effectiveAction: InfiltrationProbeAction
  readonly effectiveActionLabel: string
  readonly actionOptions: readonly InfiltrationProbeActionOptionView[]
  readonly usingOverride: boolean
  readonly encounterPreviewNotes: readonly string[]
  readonly encounterStateCoverVisible: boolean
  readonly encounterCoverBand: InfiltrationEncounterCoverBand
  readonly encounterCoverBandLabel: string
  readonly encounterCoverStatusLabel: string
  readonly encounterAwarenessBand: InfiltrationEncounterAwarenessBand
  readonly encounterAwarenessBandLabel: string
  readonly encounterCoverFactorLabels: readonly string[]
  readonly encounterCoverHasElevatedPosture: boolean
  readonly encounterCoverStance: InfiltrationEncounterCoverStance
  readonly encounterCoverUsingStanceOverride: boolean
  readonly encounterCoverStanceOptions: readonly InfiltrationEncounterCoverStanceOptionView[]
}

export function canShowInfiltrationCasePrepOnCase(caseData: CaseInstance) {
  return caseData.status === 'in_progress' && isInfiltrationProbeEligible(caseData)
}

function formatPercent(value: number) {
  return Math.round(value * 100)
}

function resolveCoverRoleMismatch(caseData: CaseInstance) {
  const profile = caseData.infiltrationCoverProfile
  if (profile === undefined) {
    return { hasRoleMismatch: false, hasExtraRouteViolation: false }
  }

  return evaluateCoverRoleMismatchPressure(caseData, profile.claimedRole)
}

function buildCoverStrainNotes(caseData: CaseInstance): string[] {
  const profile = caseData.infiltrationCoverProfile
  if (profile === undefined) {
    return []
  }

  const notes: string[] = []
  const mismatch = resolveCoverRoleMismatch(caseData)

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

const COVER_STANCE_LABELS: Record<InfiltrationEncounterCoverStance, string> = {
  maintain: 'Maintain cover',
  reinforce: 'Reinforce cover',
  low_profile: 'Low profile',
}

const COVER_STANCE_SUMMARIES: Record<InfiltrationEncounterCoverStance, string> = {
  maintain: 'Hold the current cover story through the next encounter.',
  reinforce: 'Prioritize paperwork and doctrine checks before observers engage.',
  low_profile: 'Minimize exposure and defer high-visibility moves.',
}

const COVER_STANCES: readonly InfiltrationEncounterCoverStance[] = [
  'maintain',
  'reinforce',
  'low_profile',
]

const PROBE_ACTIONS: readonly InfiltrationProbeAction[] = [
  'probe_access',
  'probe_route',
  'cleanup',
]

function buildEncounterCoverStanceOptions(
  selectedStance: InfiltrationEncounterCoverStance
): readonly InfiltrationEncounterCoverStanceOptionView[] {
  return COVER_STANCES.map((id) => ({
    id,
    label: COVER_STANCE_LABELS[id],
    summary: COVER_STANCE_SUMMARIES[id],
    selected: selectedStance === id,
  }))
}

const EMPTY_ENCOUNTER_STATE_COVER = {
  encounterStateCoverVisible: false,
  encounterCoverBand: 'stable' as const,
  encounterCoverBandLabel: 'Stable cover',
  encounterCoverStatusLabel: 'Cover posture holds for routine encounter checks.',
  encounterAwarenessBand: 'routine' as const,
  encounterAwarenessBandLabel: 'Routine awareness band',
  encounterCoverFactorLabels: [] as readonly string[],
  encounterCoverHasElevatedPosture: false,
  encounterCoverStance: 'maintain' as const,
  encounterCoverUsingStanceOverride: false,
  encounterCoverStanceOptions: buildEncounterCoverStanceOptions('maintain'),
}

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
      hasCoverStrain: false,
      plannedAction: 'probe_access',
      plannedActionLabel: INFILTRATION_PROBE_ACTION_LABELS.probe_access,
      effectiveAction: 'probe_access',
      effectiveActionLabel: INFILTRATION_PROBE_ACTION_LABELS.probe_access,
      actionOptions: emptyOptions,
      usingOverride: false,
      encounterPreviewNotes: [],
      ...EMPTY_ENCOUNTER_STATE_COVER,
    }
  }

  const tracks = readInfiltrationProbeState(caseData)
  const plannedAction = resolveWeeklyInfiltrationProbeAction(caseData)
  const overrideAction = readInfiltrationWeeklyProbeActionOverride(caseData)
  const effectiveAction = overrideAction ?? plannedAction
  const profile = caseData.infiltrationCoverProfile
  const encounterStateCover = projectInfiltrationEncounterStateCover(caseData)

  return {
    visible: true,
    probeProgressPercent: formatPercent(tracks.probeProgress),
    awarenessPercent: formatPercent(tracks.awareness),
    stageLabel: INFILTRATION_STAGE_LABELS[tracks.stage],
    awarenessComplicationBandPercent: formatPercent(AWARENESS_COMPLICATION_THRESHOLD),
    coverRoleLabel:
      profile !== undefined ? COVER_ROLE_LABELS[profile.claimedRole] : undefined,
    documentTier: profile?.documentTier,
    doctrineBandPercent: profile?.doctrineBand !== undefined ? formatPercent(profile.doctrineBand) : undefined,
    coverStrainNotes: buildCoverStrainNotes(caseData),
    hasCoverStrain: (() => {
      const mismatch = resolveCoverRoleMismatch(caseData)
      return mismatch.hasRoleMismatch || mismatch.hasExtraRouteViolation
    })(),
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
    encounterPreviewNotes: buildInfiltrationPrepEncounterNotes(caseData),
    encounterStateCoverVisible: encounterStateCover.visible,
    encounterCoverBand: encounterStateCover.band,
    encounterCoverBandLabel: encounterStateCover.bandLabel,
    encounterCoverStatusLabel: encounterStateCover.statusLabel,
    encounterAwarenessBand: encounterStateCover.awarenessBand,
    encounterAwarenessBandLabel: encounterStateCover.awarenessBandLabel,
    encounterCoverFactorLabels: encounterStateCover.factorLabels,
    encounterCoverHasElevatedPosture: encounterStateCover.hasElevatedPosture,
    encounterCoverStance: encounterStateCover.playerStance,
    encounterCoverUsingStanceOverride: encounterStateCover.usingStanceOverride,
    encounterCoverStanceOptions: buildEncounterCoverStanceOptions(encounterStateCover.playerStance),
  }
}
