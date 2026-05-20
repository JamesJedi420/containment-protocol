import { triageMission } from '../../domain/missionIntakeRouting'
import type { CaseInstance, GameState } from '../../domain/models'
import { buildConcealmentCasePrepView } from './concealmentCasePrepView'
import {
  buildInfiltrationCasePrepView,
  canShowInfiltrationCasePrepOnCase,
} from './infiltrationCasePrepView'
import {
  buildInvestigationCasePrepView,
  canShowInvestigationCasePrepOnCase,
} from './investigationCasePrepView'
import { buildStealthLeaveBehindSelectionView } from './stealthLeaveBehindSelectionView'

const MAX_COVER_MARKERS = 4
const HIGH_ESCALATION_RISK_THRESHOLD = 14

const MARKER_STYLES = {
  concealment: 'border-violet-500/40 bg-violet-500/10 text-violet-100',
  infiltration: 'border-sky-500/40 bg-sky-500/10 text-sky-100',
  leaveBehind: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100',
  forensic: 'border-amber-600/40 bg-amber-600/10 text-amber-100',
  coverStrain: 'border-orange-500/40 bg-orange-500/10 text-orange-100',
} as const

export interface MissionTriageCovertPrepMarker {
  readonly id: string
  readonly label: string
  readonly className: string
  readonly title?: string
}

export interface MissionTriageCovertPrepSignals {
  readonly visible: boolean
  readonly markers: readonly MissionTriageCovertPrepMarker[]
  readonly deferralNote?: string
}

function hasCoverStrain(infiltration: ReturnType<typeof buildInfiltrationCasePrepView>) {
  const note = infiltration.coverStrainNotes[0]
  if (note === undefined) {
    return false
  }

  return !note.toLowerCase().includes('stable')
}

function pushMarker(
  markers: MissionTriageCovertPrepMarker[],
  marker: MissionTriageCovertPrepMarker
) {
  if (markers.length >= MAX_COVER_MARKERS) {
    return
  }

  markers.push(marker)
}

export function buildMissionTriageCovertPrepSignals(
  caseData: CaseInstance,
  game: GameState
): MissionTriageCovertPrepSignals {
  const resolvedCase = game.cases[caseData.id] ?? caseData

  if (resolvedCase.status !== 'in_progress') {
    return { visible: false, markers: [] }
  }
  const markers: MissionTriageCovertPrepMarker[] = []
  const concealment =
    resolvedCase.hiddenState === undefined
      ? buildConcealmentCasePrepView(resolvedCase, game)
      : null
  const infiltration = canShowInfiltrationCasePrepOnCase(resolvedCase)
    ? buildInfiltrationCasePrepView(resolvedCase)
    : null
  const leaveBehind = buildStealthLeaveBehindSelectionView(resolvedCase, game)
  const investigation = canShowInvestigationCasePrepOnCase(resolvedCase)
    ? buildInvestigationCasePrepView(resolvedCase, game)
    : null

  if (concealment?.visible) {
    if (concealment.playerConcealFlagActive) {
      pushMarker(markers, {
        id: 'concealment-requested',
        label: 'Covert requested',
        className: MARKER_STYLES.concealment,
        title: concealment.previewReasonLabel,
      })
    } else if (concealment.previewApplied) {
      pushMarker(markers, {
        id: 'concealment-preview',
        label: 'Covert next week',
        className: MARKER_STYLES.concealment,
        title: concealment.previewReasonLabel,
      })
    }
  }

  if (infiltration?.visible) {
    pushMarker(markers, {
      id: 'infiltration-tracks',
      label: `Probe ${infiltration.probeProgressPercent}% · awareness ${infiltration.awarenessPercent}%`,
      className: MARKER_STYLES.infiltration,
      title: `${infiltration.stageLabel} · planned ${infiltration.plannedActionLabel}`,
    })

    if (hasCoverStrain(infiltration)) {
      pushMarker(markers, {
        id: 'infiltration-cover-strain',
        label: 'Cover strain',
        className: MARKER_STYLES.coverStrain,
        title: infiltration.coverStrainNotes[0],
      })
    }
  }

  if (leaveBehind.visible && leaveBehind.selectedLeaveBehindId !== undefined) {
    pushMarker(markers, {
      id: 'leave-behind-staged',
      label: 'Leave-behind staged',
      className: MARKER_STYLES.leaveBehind,
    })
  }

  if (investigation?.visible) {
    const forensicBudget = investigation.forensic.budget
    const forensicStrain =
      investigation.custodyMarkers.length > 0 ||
      (forensicBudget.granted > 0 && forensicBudget.remaining === 0)

    if (forensicStrain) {
      pushMarker(markers, {
        id: 'forensic-strain',
        label: 'Forensic strain',
        className: MARKER_STYLES.forensic,
        title:
          investigation.custodyMarkers.length > 0
            ? `${investigation.custodyMarkers.length} custody marker(s); ${forensicBudget.remaining} forensic question(s) left`
            : `Forensic budget exhausted (${forensicBudget.spent}/${forensicBudget.granted})`,
      })
    }
  }

  let deferralNote: string | undefined
  if (infiltration?.visible) {
    const triage = triageMission(game, resolvedCase)
    if (triage.dimensions.escalationRisk >= HIGH_ESCALATION_RISK_THRESHOLD) {
      deferralNote =
        'Deferring may let infiltration exposure escalate before you can prep covert follow-up on case detail.'
    }
  }

  return {
    visible: markers.length > 0 || deferralNote !== undefined,
    markers,
    deferralNote,
  }
}
