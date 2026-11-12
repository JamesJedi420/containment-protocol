import { getCaseListItemBaseView, type CaseListItemView } from '../shared/caseListItemView'
import type { CaseListFilters, CaseSort, CaseTriageTab } from '../shared/caseListFilters'
export type { CaseTeamOddsView, CaseListItemView } from '../shared/caseListItemView'
export * from '../shared/caseListFilters'
import type { CaseInstance, GameState } from '../../domain/models'
import { buildMissionTriageDeferralCompareView } from './missionTriageDeferralCompareView'
import {
  deriveMissionCategory,
  missionTriageShowsEscalationDeferralRisk,
  triageMission,
} from '../../domain/missionIntakeRouting'
import { buildMissionTriageCovertPrepSignals } from './missionTriageCovertPrepView'
import { buildMissionTriageIntakeSignals } from './missionTriageIntakeSignalView'
import { buildMissionTriageCloseoutRewardPayoutSignals } from './missionTriageCloseoutRewardPayoutSignalView'
import { buildMissionTriageModalitySignals } from './missionTriageModalitySignalView'

export interface CaseListItemViewOptions {
  readonly includeCovertPrepSignals?: boolean
  readonly includeIntakeSignals?: boolean
  readonly includeModalitySignals?: boolean
  readonly includeCloseoutRewardPayoutSignals?: boolean
}

export function getCaseListItemView(
  currentCase: CaseInstance,
  game: GameState,
  options?: CaseListItemViewOptions
): CaseListItemView {
  const base = getCaseListItemBaseView(currentCase, game)
  const assignedTeams = base.assignedTeams
  const covertPrepSignals =
    options?.includeCovertPrepSignals === true
      ? buildMissionTriageCovertPrepSignals(currentCase, game)
      : base.covertPrepSignals
  const intakeSignals =
    options?.includeIntakeSignals === true
      ? buildMissionTriageIntakeSignals(currentCase, game)
      : base.intakeSignals
  const modalitySignals =
    options?.includeModalitySignals === true
      ? buildMissionTriageModalitySignals(currentCase, game, assignedTeams)
      : base.modalitySignals
  const closeoutRewardPayoutSignals =
    options?.includeCloseoutRewardPayoutSignals === true
      ? buildMissionTriageCloseoutRewardPayoutSignals(currentCase, game)
      : base.closeoutRewardPayoutSignals

  return {
    ...base,
    covertPrepSignals,
    intakeSignals,
    modalitySignals,
    closeoutRewardPayoutSignals,
    deferralCompare:
      options?.includeCovertPrepSignals === true
        ? buildMissionTriageDeferralCompareView(currentCase, game, { covertPrepSignals })
        : base.deferralCompare,
  }
}

export function matchesCaseTriageTab(
  view: CaseListItemView,
  tab: CaseTriageTab,
  game: GameState
): boolean {
  const currentCase = view.currentCase

  switch (tab) {
    case 'all':
      return true
    case 'contracts':
      return Boolean(currentCase.contract)
    case 'assigned':
      return view.assignedTeams.length > 0
    case 'leads':
      return deriveMissionCategory(currentCase) === 'investigation_lead'
    case 'incidents':
      return !currentCase.contract && deriveMissionCategory(currentCase) !== 'investigation_lead'
    case 'escalating': {
      const triage = triageMission(game, currentCase)
      return (
        currentCase.stage > 1 ||
        view.isCriticalStage ||
        view.hasDeadlineRisk ||
        missionTriageShowsEscalationDeferralRisk(triage.reasonCodes)
      )
    }
    default: {
      const _exhaustive: never = tab
      return _exhaustive
    }
  }
}

export function normalizeCaseListFilters(
  game: GameState,
  filters: CaseListFilters,
  options?: CaseListItemViewOptions
): CaseListFilters {
  if (!filters.selectedCaseId) {
    return filters
  }

  const visibleCaseIds = new Set(
    getFilteredCaseViews(game, filters, options).map((view) => view.currentCase.id)
  )

  return visibleCaseIds.has(filters.selectedCaseId) ? filters : { ...filters, selectedCaseId: '' }
}

export function getFilteredCaseViews(
  game: GameState,
  filters: CaseListFilters,
  options?: CaseListItemViewOptions
) {
  return Object.values(game.cases)
    .map((currentCase) => getCaseListItemView(currentCase, game, options))
    .filter((view) => matchesCaseFilters(view, filters, game))
    .sort((left, right) => compareCaseViews(left, right, filters.sort))
}

/** Board-wide triage views for tab counts, context footer, and shell extensions (tab forced to `all`). */
export function buildMissionTriageBoardViews(
  game: GameState,
  filters: CaseListFilters,
  options?: CaseListItemViewOptions
) {
  return getFilteredCaseViews(game, { ...filters, tab: 'all' }, options)
}

function matchesCaseFilters(view: CaseListItemView, filters: CaseListFilters, game: GameState) {
  if (!matchesCaseTriageTab(view, filters.tab, game)) {
    return false
  }

  if (filters.status !== 'all' && view.currentCase.status !== filters.status) {
    return false
  }

  if (filters.mode !== 'all' && view.currentCase.mode !== filters.mode) {
    return false
  }

  if (filters.stage !== 'all' && view.currentCase.stage !== Number(filters.stage)) {
    return false
  }

  if (filters.risk && !isAtRiskCase(view)) {
    return false
  }

  if (!filters.q) {
    return true
  }

  const normalizedQuery = filters.q.toLowerCase()
  const searchableText = [
    view.currentCase.title,
    view.currentCase.description,
    view.currentCase.tags.join(' '),
    (view.currentCase.requiredRoles ?? []).join(' '),
    view.currentCase.requiredTags.join(' '),
    view.currentCase.preferredTags.join(' '),
    view.assignedTeams.map((team) => `${team.name} ${team.tags.join(' ')}`).join(' '),
    view.availableTeams.map(({ team }) => `${team.name} ${team.tags.join(' ')}`).join(' '),
  ]
    .join(' ')
    .toLowerCase()

  return searchableText.includes(normalizedQuery)
}

function compareCaseTitle(left: CaseListItemView, right: CaseListItemView) {
  return String(left.currentCase.title).localeCompare(String(right.currentCase.title))
}

function compareCaseViews(left: CaseListItemView, right: CaseListItemView, sort: CaseSort) {
  if (sort === 'title') {
    return compareCaseTitle(left, right)
  }

  if (sort === 'deadline') {
    return (
      left.currentCase.deadlineRemaining - right.currentCase.deadlineRemaining ||
      right.currentCase.stage - left.currentCase.stage ||
      compareCaseTitle(left, right)
    )
  }

  if (sort === 'success') {
    return (
      right.bestSuccess - left.bestSuccess ||
      right.priorityScore - left.priorityScore ||
      compareCaseTitle(left, right)
    )
  }

  return (
    right.priorityScore - left.priorityScore ||
    left.currentCase.deadlineRemaining - right.currentCase.deadlineRemaining ||
    compareCaseTitle(left, right)
  )
}

function isAtRiskCase(view: CaseListItemView) {
  return (
    view.currentCase.status !== 'resolved' &&
    (view.hasDeadlineRisk ||
      view.isCriticalStage ||
      view.isBlockedByRequiredRoles ||
      view.isBlockedByRequiredTags ||
      (view.isUnassigned && view.currentCase.stage >= 2))
  )
}
