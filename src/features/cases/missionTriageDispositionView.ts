import { isMissionTriageDispositionActive } from '../../domain/missionIntakeRouting'
import type { GameState, MissionTriageDisposition } from '../../domain/models'
import { MISSION_TRIAGE_DISPOSITION_LABELS } from '../../data/copy'
import type { CaseListItemView } from './caseView'

export interface MissionTriageDispositionView {
  readonly visible: boolean
  readonly active: MissionTriageDisposition | null
  readonly activeLabel: string | null
  readonly routeEnabled: boolean
  readonly deferEnabled: boolean
  readonly ignoreEnabled: boolean
  readonly consequenceDetail: string | null
  readonly assignDistinctNote: string
}

export function buildMissionTriageDispositionView(
  view: CaseListItemView,
  game: GameState
): MissionTriageDispositionView {
  const assignDistinctNote = MISSION_TRIAGE_DISPOSITION_LABELS.assignDistinct
  const currentCase = view.currentCase

  if (
    view.isMajorIncident ||
    currentCase.status === 'resolved' ||
    !view.isUnassigned
  ) {
    return {
      visible: false,
      active: null,
      activeLabel: null,
      routeEnabled: false,
      deferEnabled: false,
      ignoreEnabled: false,
      consequenceDetail: null,
      assignDistinctNote,
    }
  }

  const mission = game.missionRouting?.missions[currentCase.id]
  const dispositionActive = isMissionTriageDispositionActive(mission, game.week)
  const active = dispositionActive ? (mission?.playerDisposition ?? null) : null
  const activeLabel =
    active === 'route'
      ? MISSION_TRIAGE_DISPOSITION_LABELS.activeRoute
      : active === 'defer'
        ? MISSION_TRIAGE_DISPOSITION_LABELS.activeDefer
        : active === 'ignore'
          ? MISSION_TRIAGE_DISPOSITION_LABELS.activeIgnore
          : null

  const deferralColumn = view.deferralCompare.columns.find((column) => column.id === 'deferralRisk')
  const consequenceDetail =
    active === 'defer'
      ? (deferralColumn?.detail ?? MISSION_TRIAGE_DISPOSITION_LABELS.deferDetail)
      : null

  return {
    visible: true,
    active,
    activeLabel,
    routeEnabled: true,
    deferEnabled: true,
    ignoreEnabled: true,
    consequenceDetail,
    assignDistinctNote,
  }
}
