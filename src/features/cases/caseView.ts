import {
  readEnumParam,
  readStringParam,
  writeEnumParam,
  writeStringParam,
} from '../../app/searchParams'
import { type CaseInstance, type GameState, type Team } from '../../domain/models'
import {
  buildResolutionPreviewState,
  previewResolutionForTeamIds,
  type OutcomeOdds,
} from '../../domain/sim/resolve'
import { isTeamBlockedByTraining } from '../../domain/sim/training'
import { getTeamAssignedCaseId } from '../../domain/teamSimulation'

export const CASE_STATUS_FILTERS = ['all', 'open', 'in_progress', 'resolved'] as const
export const CASE_MODE_FILTERS = ['all', 'threshold', 'probability', 'deterministic'] as const
export const CASE_STAGE_FILTERS = ['all', '1', '2', '3', '4', '5'] as const
export const CASE_SORTS = ['priority', 'deadline', 'success', 'title'] as const

export type CaseStatusFilter = (typeof CASE_STATUS_FILTERS)[number]
export type CaseModeFilter = (typeof CASE_MODE_FILTERS)[number]
export type CaseStageFilter = (typeof CASE_STAGE_FILTERS)[number]
export type CaseSort = (typeof CASE_SORTS)[number]

export interface CaseListFilters {
  q: string
  status: CaseStatusFilter
  mode: CaseModeFilter
  stage: CaseStageFilter
  sort: CaseSort
  risk: boolean
}

export interface CaseTeamOddsView {
  team: Team
  odds: OutcomeOdds
}

export interface CaseListItemView {
  currentCase: CaseInstance
  assignedTeams: Team[]
  availableTeams: CaseTeamOddsView[]
  bestSuccess: number
  priorityScore: number
  maxTeams: number
  isUnassigned: boolean
  isCriticalStage: boolean
  hasDeadlineRisk: boolean
  isBlockedByRequiredRoles: boolean
  isBlockedByRequiredTags: boolean
  isRaidAtCapacity: boolean
}

export const DEFAULT_CASE_LIST_FILTERS: CaseListFilters = {
  q: '',
  status: 'all',
  mode: 'all',
  stage: 'all',
  sort: 'priority',
  risk: false,
}

export function getCaseListItemView(currentCase: CaseInstance, game: GameState): CaseListItemView {
  const previewState = buildResolutionPreviewState(game)
  const assignedTeams = currentCase.assignedTeamIds
    .map((teamId) => game.teams[teamId])
    .filter((team): team is Team => Boolean(team))
  const maxTeams = currentCase.kind === 'raid' ? (currentCase.raid?.maxTeams ?? 2) : 1
  const isRaidAtCapacity = currentCase.kind === 'raid' && assignedTeams.length >= maxTeams
  const isUnassigned = assignedTeams.length === 0
  const isCriticalStage = currentCase.stage >= 4
  const hasDeadlineRisk = currentCase.deadlineRemaining <= 2
  const requiredRoles = currentCase.requiredRoles ?? []

  const availableTeams = isRaidAtCapacity
    ? []
    : Object.values(game.teams)
        .filter((team) => isTeamAvailableForCase(team, currentCase, game))
        .map((team) => {
          const odds = previewResolutionForTeamIds(
            currentCase,
            previewState,
            currentCase.kind === 'raid' ? [...currentCase.assignedTeamIds, team.id] : [team.id]
          ).odds

          return { team, odds }
        })
        .filter(({ odds }) => !odds.blockedByRequiredTags && !odds.blockedByRequiredRoles)
        .sort(
          (left, right) =>
            right.odds.success - left.odds.success ||
            right.odds.partial - left.odds.partial ||
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

  const bestSuccess =
    assignedOdds?.success ??
    availableTeams.reduce((best, option) => Math.max(best, option.odds.success), 0)

  return {
    currentCase,
    assignedTeams,
    availableTeams,
    bestSuccess,
    priorityScore: getPriorityScore({
      currentCase,
      bestSuccess,
      isUnassigned,
      isCriticalStage,
      hasDeadlineRisk,
      isBlockedByRequiredRoles,
      isBlockedByRequiredTags,
      isRaidAtCapacity,
    }),
    maxTeams,
    isUnassigned,
    isCriticalStage,
    hasDeadlineRisk,
    isBlockedByRequiredRoles,
    isBlockedByRequiredTags,
    isRaidAtCapacity,
  }
}

export function getFilteredCaseViews(game: GameState, filters: CaseListFilters) {
  return Object.values(game.cases)
    .map((currentCase) => getCaseListItemView(currentCase, game))
    .filter((view) => matchesCaseFilters(view, filters))
    .sort((left, right) => compareCaseViews(left, right, filters.sort))
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

function matchesCaseFilters(view: CaseListItemView, filters: CaseListFilters) {
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

function compareCaseViews(left: CaseListItemView, right: CaseListItemView, sort: CaseSort) {
  if (sort === 'title') {
    return left.currentCase.title.localeCompare(right.currentCase.title)
  }

  if (sort === 'deadline') {
    return (
      left.currentCase.deadlineRemaining - right.currentCase.deadlineRemaining ||
      right.currentCase.stage - left.currentCase.stage ||
      left.currentCase.title.localeCompare(right.currentCase.title)
    )
  }

  if (sort === 'success') {
    return (
      right.bestSuccess - left.bestSuccess ||
      right.priorityScore - left.priorityScore ||
      left.currentCase.title.localeCompare(right.currentCase.title)
    )
  }

  return (
    right.priorityScore - left.priorityScore ||
    left.currentCase.deadlineRemaining - right.currentCase.deadlineRemaining ||
    left.currentCase.title.localeCompare(right.currentCase.title)
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

  return base + urgency - successPenalty - resolvedPenalty
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
