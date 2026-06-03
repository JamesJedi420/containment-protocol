import {
  readEnumParam,
  readStringParam,
  writeEnumParam,
  writeStringParam,
} from '../../app/searchParams'
import { type CaseInstance, type GameState, type Team } from '../../domain/models'
import {
  getBestMajorIncidentPlanSuggestion,
  isOperationalMajorIncidentCase,
} from '../../domain/majorIncidentOperations'
import {
  buildResolutionPreviewState,
  previewResolutionForTeamIds,
  type OutcomeOdds,
} from '../../domain/sim/resolve'
import { isTeamBlockedByTraining } from '../../domain/sim/training'
import { getTeamAssignedCaseId } from '../../domain/teamSimulation'
import {
  buildMissionTriageDeferralCompareView,
  type MissionTriageDeferralCompareView,
} from './missionTriageDeferralCompareView'
import {
  deriveMissionCategory,
  missionTriageShowsEscalationDeferralRisk,
  isMissionTriageIgnoredThisWeek,
  triageMission,
} from '../../domain/missionIntakeRouting'
import {
  buildMissionTriageCovertPrepSignals,
  type MissionTriageCovertPrepSignals,
} from './missionTriageCovertPrepView'
import {
  buildMissionTriageModalitySignals,
  type MissionTriageModalitySignals,
} from './missionTriageModalitySignalView'

export const CASE_STATUS_FILTERS = ['all', 'open', 'in_progress', 'resolved'] as const
export const CASE_MODE_FILTERS = ['all', 'threshold', 'probability', 'deterministic'] as const
export const CASE_STAGE_FILTERS = ['all', '1', '2', '3', '4', '5'] as const
export const CASE_SORTS = ['priority', 'deadline', 'success', 'title'] as const
export const CASE_TRIAGE_TABS = [
  'all',
  'incidents',
  'contracts',
  'leads',
  'escalating',
  'assigned',
] as const

export type CaseStatusFilter = (typeof CASE_STATUS_FILTERS)[number]
export type CaseModeFilter = (typeof CASE_MODE_FILTERS)[number]
export type CaseStageFilter = (typeof CASE_STAGE_FILTERS)[number]
export type CaseSort = (typeof CASE_SORTS)[number]
export type CaseTriageTab = (typeof CASE_TRIAGE_TABS)[number]

export interface CaseListFilters {
  q: string
  status: CaseStatusFilter
  mode: CaseModeFilter
  stage: CaseStageFilter
  sort: CaseSort
  risk: boolean
  tab: CaseTriageTab
  selectedCaseId: string
}

export interface CaseTeamOddsView {
  team: Team
  odds: OutcomeOdds
  injuryChance: number
}

export interface CaseListItemView {
  currentCase: CaseInstance
  assignedTeams: Team[]
  availableTeams: CaseTeamOddsView[]
  bestSuccess: number
  isMajorIncident: boolean
  priorityScore: number
  maxTeams: number
  isUnassigned: boolean
  isCriticalStage: boolean
  hasDeadlineRisk: boolean
  isBlockedByRequiredRoles: boolean
  isBlockedByRequiredTags: boolean
  isRaidAtCapacity: boolean
  triageIgnored: boolean
  covertPrepSignals: MissionTriageCovertPrepSignals
  modalitySignals: MissionTriageModalitySignals
  deferralCompare: MissionTriageDeferralCompareView
}

export const DEFAULT_CASE_LIST_FILTERS: CaseListFilters = {
  q: '',
  status: 'all',
  mode: 'all',
  stage: 'all',
  sort: 'priority',
  risk: false,
  tab: 'all',
  selectedCaseId: '',
}

export interface CaseListItemViewOptions {
  readonly includeCovertPrepSignals?: boolean
  readonly includeModalitySignals?: boolean
}

export function getCaseListItemView(
  currentCase: CaseInstance,
  game: GameState,
  options?: CaseListItemViewOptions
): CaseListItemView {
  const previewState = buildResolutionPreviewState(game)
  const isMajorIncident = isOperationalMajorIncidentCase(currentCase)
  const assignedTeams = currentCase.assignedTeamIds
    .map((teamId) => game.teams[teamId])
    .filter((team): team is Team => Boolean(team))
  const maxTeams = currentCase.kind === 'raid' ? (currentCase.raid?.maxTeams ?? 2) : 1
  const isRaidAtCapacity = currentCase.kind === 'raid' && assignedTeams.length >= maxTeams
  const isUnassigned = assignedTeams.length === 0
  const isCriticalStage = currentCase.stage >= 4
  const hasDeadlineRisk = currentCase.deadlineRemaining <= 2
  const requiredRoles = currentCase.requiredRoles ?? []

  const availableTeams = isMajorIncident
    ? []
    : isRaidAtCapacity
    ? []
    : Object.values(game.teams)
        .filter((team) => isTeamAvailableForCase(team, currentCase, game))
        .map((team) => {
          const preview = previewResolutionForTeamIds(
            currentCase,
            previewState,
            currentCase.kind === 'raid' ? [...currentCase.assignedTeamIds, team.id] : [team.id]
          )

          return {
            team,
            odds: preview.odds,
            injuryChance: preview.injuryForecast.injuryChance,
          }
        })
        .filter(({ odds }) => !odds.blockedByRequiredTags && !odds.blockedByRequiredRoles)
        .sort(
          (left, right) =>
            right.odds.success - left.odds.success ||
            right.odds.partial - left.odds.partial ||
            left.injuryChance - right.injuryChance ||
            right.odds.chemistry - left.odds.chemistry ||
            left.team.name.localeCompare(right.team.name)
        )

  const eligibleTeams = Object.values(game.teams).filter(
    (team) =>
      (!getTeamAssignedCaseId(team) || getTeamAssignedCaseId(team) === currentCase.id) &&
      !isTeamBlockedByTraining(team, game.agents)
  )
  const isBlockedByRequiredTags =
    currentCase.requiredTags.length > 0 &&
    eligibleTeams.every(
      (team) =>
        previewResolutionForTeamIds(
          currentCase,
          previewState,
          currentCase.kind === 'raid' ? [...currentCase.assignedTeamIds, team.id] : [team.id]
        ).odds.blockedByRequiredTags
    )
  const isBlockedByRequiredRoles =
    requiredRoles.length > 0 &&
    eligibleTeams.every(
      (team) =>
        previewResolutionForTeamIds(
          currentCase,
          previewState,
          currentCase.kind === 'raid' ? [...currentCase.assignedTeamIds, team.id] : [team.id]
        ).odds.blockedByRequiredRoles
    )

  const assignedOdds =
    assignedTeams.length > 0
      ? previewResolutionForTeamIds(
          currentCase,
          previewState,
          currentCase.kind === 'raid'
            ? assignedTeams.map((team) => team.id)
            : [assignedTeams[0]!.id]
        ).odds
      : undefined

  const majorIncidentBestSuccess = isMajorIncident
    ? currentCase.majorIncident
      ? getBestMajorIncidentPlanSuggestion(game, currentCase, {
          strategy: currentCase.majorIncident.strategy,
          provisions: currentCase.majorIncident.provisions,
        })?.successChance ?? 0
      : getBestMajorIncidentPlanSuggestion(game, currentCase)?.successChance ?? 0
    : 0
  const bestSuccess = isMajorIncident
    ? majorIncidentBestSuccess
    : assignedOdds?.success ?? availableTeams.reduce((best, option) => Math.max(best, option.odds.success), 0)

  const covertPrepSignals =
    options?.includeCovertPrepSignals === true
      ? buildMissionTriageCovertPrepSignals(currentCase, game)
      : { visible: false, markers: [] }
  const modalitySignals =
    options?.includeModalitySignals === true
      ? buildMissionTriageModalitySignals(currentCase, game, assignedTeams)
      : { visible: false, markers: [] }

  return {
    currentCase,
    assignedTeams,
    availableTeams,
    bestSuccess,
    isMajorIncident,
    priorityScore: getPriorityScore({
      currentCase,
      bestSuccess,
      isUnassigned,
      isCriticalStage,
      hasDeadlineRisk,
      isBlockedByRequiredRoles,
      isBlockedByRequiredTags,
      isRaidAtCapacity,
      triageIgnored: isMissionTriageIgnoredThisWeek(game, currentCase.id),
    }),
    maxTeams,
    isUnassigned,
    isCriticalStage,
    hasDeadlineRisk,
    isBlockedByRequiredRoles,
    isBlockedByRequiredTags,
    isRaidAtCapacity,
    triageIgnored: isMissionTriageIgnoredThisWeek(game, currentCase.id),
    covertPrepSignals,
    modalitySignals,
    deferralCompare:
      options?.includeCovertPrepSignals === true
        ? buildMissionTriageDeferralCompareView(currentCase, game, { covertPrepSignals })
        : { visible: false, columns: [] },
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
      return (
        !currentCase.contract && deriveMissionCategory(currentCase) !== 'investigation_lead'
      )
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

  return visibleCaseIds.has(filters.selectedCaseId)
    ? filters
    : { ...filters, selectedCaseId: '' }
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

export function readCaseListFilters(searchParams: URLSearchParams): CaseListFilters {
  return {
    q: readStringParam(searchParams, 'q'),
    status: readEnumParam(
      searchParams,
      'status',
      CASE_STATUS_FILTERS,
      DEFAULT_CASE_LIST_FILTERS.status
    ),
    mode: readEnumParam(searchParams, 'mode', CASE_MODE_FILTERS, DEFAULT_CASE_LIST_FILTERS.mode),
    stage: readEnumParam(
      searchParams,
      'stage',
      CASE_STAGE_FILTERS,
      DEFAULT_CASE_LIST_FILTERS.stage
    ),
    sort: readEnumParam(searchParams, 'sort', CASE_SORTS, DEFAULT_CASE_LIST_FILTERS.sort),
    risk: searchParams.get('risk') === '1',
    tab: readEnumParam(searchParams, 'tab', CASE_TRIAGE_TABS, DEFAULT_CASE_LIST_FILTERS.tab),
    selectedCaseId: readStringParam(searchParams, 'case'),
  }
}

export function writeCaseListFilters(filters: CaseListFilters, baseSearchParams?: URLSearchParams) {
  const nextSearchParams = new URLSearchParams(baseSearchParams)

  writeStringParam(nextSearchParams, 'q', filters.q)
  writeEnumParam(nextSearchParams, 'status', filters.status, DEFAULT_CASE_LIST_FILTERS.status)
  writeEnumParam(nextSearchParams, 'mode', filters.mode, DEFAULT_CASE_LIST_FILTERS.mode)
  writeEnumParam(nextSearchParams, 'stage', filters.stage, DEFAULT_CASE_LIST_FILTERS.stage)
  writeEnumParam(nextSearchParams, 'sort', filters.sort, DEFAULT_CASE_LIST_FILTERS.sort)

  if (filters.risk) {
    nextSearchParams.set('risk', '1')
  } else {
    nextSearchParams.delete('risk')
  }

  writeEnumParam(nextSearchParams, 'tab', filters.tab, DEFAULT_CASE_LIST_FILTERS.tab)
  writeStringParam(nextSearchParams, 'case', filters.selectedCaseId)

  return nextSearchParams
}

function isTeamAvailableForCase(team: Team, currentCase: CaseInstance, game: GameState) {
  if (getTeamAssignedCaseId(team)) {
    return false
  }

  if (isTeamBlockedByTraining(team, game.agents)) {
    return false
  }

  if (currentCase.kind === 'raid' && currentCase.assignedTeamIds.includes(team.id)) {
    return false
  }

  return true
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

function getPriorityScore(view: {
  currentCase: Pick<CaseInstance, 'status' | 'stage' | 'deadlineRemaining'>
  bestSuccess: number
  isUnassigned: boolean
  isCriticalStage: boolean
  hasDeadlineRisk: boolean
  isBlockedByRequiredRoles: boolean
  isBlockedByRequiredTags: boolean
  isRaidAtCapacity: boolean
  triageIgnored: boolean
}) {
  const base =
    view.currentCase.stage * 100 +
    Math.max(0, 10 - view.currentCase.deadlineRemaining) * 10 +
    (view.currentCase.status === 'open' ? 15 : 0)

  const urgency =
    (view.isUnassigned ? 20 : 0) +
    (view.isCriticalStage ? 25 : 0) +
    (view.hasDeadlineRisk ? 20 : 0) +
    (view.isBlockedByRequiredRoles ? 35 : 0) +
    (view.isBlockedByRequiredTags ? 30 : 0) +
    (view.isRaidAtCapacity ? 10 : 0)

  const successPenalty = Math.round(view.bestSuccess * 40)
  const resolvedPenalty = view.currentCase.status === 'resolved' ? 1000 : 0
  const ignoredPenalty = view.triageIgnored ? 500 : 0

  return base + urgency - successPenalty - resolvedPenalty - ignoredPenalty
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
