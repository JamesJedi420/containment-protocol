import {
  deriveMissionCategory,
  missionTriageShowsEscalationDeferralRisk,
  triageMission,
  type MissionTriageResult,
} from '../../domain/missionIntakeRouting'
import type { GameState, MissionCategory, MissionPriorityBand } from '../../domain/models'
import { isTeamBlockedByTraining } from '../../domain/sim/training'
import { getTeamAssignedCaseId } from '../../domain/teamSimulation'
import {
  CASE_TRIAGE_TABS,
  matchesCaseTriageTab,
  type CaseListItemView,
  type CaseTriageTab,
} from './caseView'

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

export interface MissionTriageCompactRowView {
  readonly caseId: string
  readonly title: string
  readonly typeLabel: string
  readonly priority: MissionPriorityBand
  readonly priorityScore: number
  readonly markerPreview: string
  readonly isSelected: boolean
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
  markerPreview: string
): MissionTriageCompactRowView {
  return {
    caseId: view.currentCase.id,
    title: view.currentCase.title,
    typeLabel: view.currentCase.contract
      ? 'Contract'
      : missionTriageItemTypeLabel(deriveMissionCategory(view.currentCase)),
    priority: triage.priority,
    priorityScore: triage.score,
    markerPreview,
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
  if (view.currentCase.status === 'resolved') {
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
