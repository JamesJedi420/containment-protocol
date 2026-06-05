import {
  deriveMissionCategory,
  missionTriageShowsEscalationDeferralRisk,
  triageMission,
  type MissionTriageResult,
} from '../../domain/missionIntakeRouting'
import type { GameState, MissionCategory, MissionPriorityBand } from '../../domain/models'
import { isTeamBlockedByTraining } from '../../domain/sim/training'
import { getTeamAssignedCaseId } from '../../domain/teamSimulation'
import { MISSION_TRIAGE_DISPOSITION_LABELS } from '../../data/copy'
import {
  CASE_TRIAGE_TABS,
  matchesCaseTriageTab,
  type CaseListItemView,
  type CaseTriageTab,
} from './caseView'
import {
  buildMissionTriageDispositionView,
  type MissionTriageDispositionView,
} from './missionTriageDispositionView'

export const CASE_TRIAGE_TAB_LABELS: Record<CaseTriageTab, string> = {
  all: 'All',
  incidents: 'Incidents',
  contracts: 'Contracts',
  leads: 'Leads',
  escalating: 'Escalating',
  assigned: 'Assigned',
}

const MISSION_CATEGORY_LABELS: Record<MissionCategory, string> = {
  containment_breach: 'Incident',
  investigation_lead: 'Lead',
  civilian_infrastructure_incident: 'Incident',
  faction_hostile_activity: 'Incident',
  strategic_opportunity: 'Opportunity',
}

export function missionTriageItemTypeLabel(category: MissionCategory): string {
  return MISSION_CATEGORY_LABELS[category]
}

export interface MissionTriageListRowChip {
  readonly id: string
  readonly label: string
  readonly className: string
  readonly title?: string
}

const MAX_LIST_ROW_CHIPS = 5

const DISPOSITION_CHIP_CLASS: Record<
  NonNullable<MissionTriageDispositionView['active']>,
  string
> = {
  route: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  defer: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  ignore: 'border-slate-500/40 bg-slate-500/10 text-slate-300',
}

export interface MissionTriageCompactRowView {
  readonly caseId: string
  readonly title: string
  readonly typeLabel: string
  readonly priority: MissionPriorityBand
  readonly priorityScore: number
  readonly chips: readonly MissionTriageListRowChip[]
  readonly isSelected: boolean
}

function pushListRowChip(chips: MissionTriageListRowChip[], chip: MissionTriageListRowChip) {
  if (chips.length >= MAX_LIST_ROW_CHIPS) {
    return
  }

  chips.push(chip)
}

function appendUrgencyListRowChips(chips: MissionTriageListRowChip[], view: CaseListItemView) {
  if (view.isUnassigned) {
    pushListRowChip(chips, {
      id: 'urgency:unassigned',
      label: 'Unassigned',
      className: 'border-slate-500/40 bg-slate-500/10 text-slate-200',
    })
  }

  if (view.isCriticalStage) {
    pushListRowChip(chips, {
      id: 'urgency:high-stage',
      label: 'High stage',
      className: 'border-red-500/40 bg-red-500/10 text-red-200',
    })
  }

  if (view.hasDeadlineRisk) {
    pushListRowChip(chips, {
      id: 'urgency:deadline',
      label: 'Deadline risk',
      className: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
    })
  }

  if (view.isBlockedByRequiredRoles) {
    pushListRowChip(chips, {
      id: 'urgency:role-blocked',
      label: 'Required-role blocked',
      className: 'border-violet-500/40 bg-violet-500/10 text-violet-200',
    })
  }

  if (view.isBlockedByRequiredTags) {
    pushListRowChip(chips, {
      id: 'urgency:tag-blocked',
      label: 'Required-tag blocked',
      className: 'border-orange-500/40 bg-orange-500/10 text-orange-200',
    })
  }

  if (view.isRaidAtCapacity) {
    pushListRowChip(chips, {
      id: 'urgency:raid-capacity',
      label: 'Raid at capacity',
      className: 'border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-200',
    })
  }
}

export function buildMissionTriageListRowChips(
  view: CaseListItemView,
  disposition: MissionTriageDispositionView
): readonly MissionTriageListRowChip[] {
  const chips: MissionTriageListRowChip[] = []

  if (disposition.active && disposition.activeLabel) {
    pushListRowChip(chips, {
      id: `disposition:${disposition.active}`,
      label: disposition.activeLabel,
      className: DISPOSITION_CHIP_CLASS[disposition.active],
      title:
        disposition.active === 'route'
          ? MISSION_TRIAGE_DISPOSITION_LABELS.routeDetail
          : disposition.active === 'defer'
            ? MISSION_TRIAGE_DISPOSITION_LABELS.deferDetail
            : MISSION_TRIAGE_DISPOSITION_LABELS.ignoreDetail,
    })
  }

  appendUrgencyListRowChips(chips, view)

  for (const marker of view.intakeSignals.markers) {
    pushListRowChip(chips, {
      id: marker.id,
      label: marker.label,
      className: marker.className,
      title: marker.title,
    })
  }

  for (const marker of view.modalitySignals.markers) {
    pushListRowChip(chips, {
      id: marker.id,
      label: marker.label,
      className: marker.className,
      title: marker.title,
    })
  }

  for (const marker of view.covertPrepSignals.markers) {
    pushListRowChip(chips, {
      id: marker.id,
      label: marker.label,
      className: marker.className,
      title: marker.title,
    })
  }

  return chips
}

export function buildMissionTriageResultsByCaseId(
  views: readonly CaseListItemView[],
  game: GameState
): ReadonlyMap<string, MissionTriageResult> {
  return new Map(
    views.map((view) => [view.currentCase.id, triageMission(game, view.currentCase)]),
  )
}

export function buildMissionTriageCompactRowView(
  view: CaseListItemView,
  triage: MissionTriageResult,
  selectedCaseId: string,
  game: GameState
): MissionTriageCompactRowView {
  const disposition = buildMissionTriageDispositionView(view, game)

  return {
    caseId: view.currentCase.id,
    title: view.currentCase.title,
    typeLabel: view.currentCase.contract
      ? 'Contract'
      : missionTriageItemTypeLabel(deriveMissionCategory(view.currentCase)),
    priority: triage.priority,
    priorityScore: triage.score,
    chips: buildMissionTriageListRowChips(view, disposition),
    isSelected: selectedCaseId === view.currentCase.id,
  }
}

export type MissionTriageFooterLoadBand = 'low' | 'medium' | 'high'

export interface MissionTriageContextFooterView {
  readonly projectedSupportLoad: MissionTriageFooterLoadBand
  readonly teamsAvailable: number
  readonly urgentIfDeferred: number
  readonly escalationCarryoverRisk: number
  readonly routableCount: number
}

/** Capacity reason codes are global (same for every open case in a week), not per-row. */
function projectedSupportLoadFromCapacityCodes(
  reasonCodes: readonly string[]
): MissionTriageFooterLoadBand {
  if (reasonCodes.includes('capacity-high')) {
    return 'high'
  }

  if (reasonCodes.includes('capacity-medium')) {
    return 'medium'
  }

  return 'low'
}

function countTeamsAvailable(game: GameState) {
  return Object.values(game.teams).filter((team) => {
    if (getTeamAssignedCaseId(team)) {
      return false
    }

    return !isTeamBlockedByTraining(team, game.agents)
  }).length
}

function isUrgentIfDeferred(view: CaseListItemView, triage: MissionTriageResult) {
  if (view.currentCase.status === 'resolved' || view.triageIgnored) {
    return false
  }

  return (
    view.isUnassigned &&
    (view.hasDeadlineRisk ||
      view.isCriticalStage ||
      missionTriageShowsEscalationDeferralRisk(triage.reasonCodes))
  )
}

function hasEscalationCarryoverRisk(view: CaseListItemView, triage: MissionTriageResult) {
  if (view.currentCase.status === 'resolved') {
    return false
  }

  return (
    view.isCriticalStage ||
    triage.reasonCodes.includes('escalation-high') ||
    (view.isUnassigned && view.currentCase.stage >= 3)
  )
}

export function buildMissionTriageContextFooterView(
  views: readonly CaseListItemView[],
  game: GameState
): MissionTriageContextFooterView {
  const activeViews = views.filter((view) => view.currentCase.status !== 'resolved')
  const triageByCaseId = new Map(
    activeViews.map((view) => [view.currentCase.id, triageMission(game, view.currentCase)] as const)
  )

  let urgentIfDeferred = 0
  let escalationCarryoverRisk = 0
  let routableCount = 0

  for (const view of activeViews) {
    const triage = triageByCaseId.get(view.currentCase.id)!

    if (isUrgentIfDeferred(view, triage)) {
      urgentIfDeferred += 1
    }

    if (hasEscalationCarryoverRisk(view, triage)) {
      escalationCarryoverRisk += 1
    }

    if (view.currentCase.status === 'open' && !view.isBlockedByRequiredRoles && !view.isBlockedByRequiredTags) {
      routableCount += 1
    }
  }

  const sampleTriage = activeViews[0] ? triageByCaseId.get(activeViews[0].currentCase.id) : undefined

  return {
    projectedSupportLoad: sampleTriage
      ? projectedSupportLoadFromCapacityCodes(sampleTriage.reasonCodes)
      : 'low',
    teamsAvailable: countTeamsAvailable(game),
    urgentIfDeferred,
    escalationCarryoverRisk,
    routableCount,
  }
}

export function buildTriageTabCounts(
  views: readonly CaseListItemView[],
  game: GameState
): Record<CaseTriageTab, number> {
  return CASE_TRIAGE_TABS.reduce(
    (counts, tab) => {
      counts[tab] = views.filter((view) => matchesCaseTriageTab(view, tab, game)).length
      return counts
    },
    {} as Record<CaseTriageTab, number>
  )
}

export const MISSION_TRIAGE_FOOTER_LOAD_LABELS: Record<MissionTriageFooterLoadBand, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}
