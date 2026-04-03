import {
  readEnumParam,
  readStringParam,
  writeEnumParam,
  writeStringParam,
} from '../../app/searchParams'
import {
  type Agent,
  type GameState,
  type StatBlock,
  type StatKey,
  type Team,
} from '../../domain/models'
import { getTeamAssignedCaseId, getTeamMemberIds } from '../../domain/teamSimulation'
import { getCoverageRolesForTeam } from '../../domain/validateTeam'

const STAT_KEYS: StatKey[] = ['combat', 'investigation', 'utility', 'social']

export const TEAM_ASSIGNMENT_FILTERS = ['all', 'assigned', 'unassigned'] as const
export const TEAM_FATIGUE_FILTERS = ['all', 'steady', 'strained', 'critical'] as const
export const TEAM_SORTS = ['fatigue', 'assignment', 'coverage', 'name'] as const

export type TeamAssignmentFilter = (typeof TEAM_ASSIGNMENT_FILTERS)[number]
export type TeamFatigueFilter = (typeof TEAM_FATIGUE_FILTERS)[number]
export type TeamSort = (typeof TEAM_SORTS)[number]
export type TeamFatigueBand = Exclude<TeamFatigueFilter, 'all'>

export interface TeamListFilters {
  q: string
  assignment: TeamAssignmentFilter
  fatigue: TeamFatigueFilter
  sort: TeamSort
}

export interface TeamListItemView {
  team: Team
  assignedCase?: GameState['cases'][string]
  capabilitySummary: ReturnType<typeof getCapabilitySummary>
  fatigueBand: TeamFatigueBand
}

export const DEFAULT_TEAM_LIST_FILTERS: TeamListFilters = {
  q: '',
  assignment: 'all',
  fatigue: 'all',
  sort: 'fatigue',
}

export function getTeamAgents(team: Team, game: GameState): Agent[] {
  return getTeamMemberIds(team).map((agentId) => game.agents[agentId]).filter(Boolean)
}

export function getAverageFatigue(agents: Agent[]) {
  return agents.length > 0
    ? Math.round(agents.reduce((sum, agent) => sum + agent.fatigue, 0) / agents.length)
    : 0
}

export function getCapabilitySummary(team: Team, game: GameState) {
  const agents = getTeamAgents(team, game)
  const activeAgents = agents.filter(
    (agent) => agent.status !== 'dead' && agent.assignment?.state !== 'training'
  )
  const statTotals = activeAgents.reduce<StatBlock>(
    (totals, agent) => ({
      combat: totals.combat + agent.baseStats.combat,
      investigation: totals.investigation + agent.baseStats.investigation,
      utility: totals.utility + agent.baseStats.utility,
      social: totals.social + agent.baseStats.social,
    }),
    { combat: 0, investigation: 0, utility: 0, social: 0 }
  )
  const strongestStat = [...STAT_KEYS].sort((a, b) => statTotals[b] - statTotals[a])[0]
  const coverageTags = [...new Set([...team.tags, ...activeAgents.flatMap((agent) => agent.tags)])]
  const roleCoverage = getCoverageRolesForTeam(team, game.agents)

  return {
    agents,
    activeAgents,
    statTotals,
    strongestStat,
    coverageTags,
    roleCoverage,
    averageFatigue: getAverageFatigue(agents),
  }
}

export function getTeamFatigueBand(value: number): TeamFatigueBand {
  if (value >= 45) {
    return 'critical'
  }

  if (value >= 20) {
    return 'strained'
  }

  return 'steady'
}

export function getTeamListItemView(team: Team, game: GameState): TeamListItemView {
  const capabilitySummary = getCapabilitySummary(team, game)
  const assignedCaseId = getTeamAssignedCaseId(team)

  return {
    team,
    assignedCase: assignedCaseId ? game.cases[assignedCaseId] : undefined,
    capabilitySummary,
    fatigueBand: getTeamFatigueBand(capabilitySummary.averageFatigue),
  }
}

export function getFilteredTeamViews(game: GameState, filters: TeamListFilters) {
  return Object.values(game.teams)
    .map((team) => getTeamListItemView(team, game))
    .filter((view) => matchesTeamFilters(view, filters))
    .sort((left, right) => compareTeamViews(left, right, filters.sort))
}

export function readTeamListFilters(searchParams: URLSearchParams): TeamListFilters {
  return {
    q: readStringParam(searchParams, 'q'),
    assignment: readEnumParam(
      searchParams,
      'assignment',
      TEAM_ASSIGNMENT_FILTERS,
      DEFAULT_TEAM_LIST_FILTERS.assignment
    ),
    fatigue: readEnumParam(
      searchParams,
      'fatigue',
      TEAM_FATIGUE_FILTERS,
      DEFAULT_TEAM_LIST_FILTERS.fatigue
    ),
    sort: readEnumParam(searchParams, 'sort', TEAM_SORTS, DEFAULT_TEAM_LIST_FILTERS.sort),
  }
}

export function writeTeamListFilters(filters: TeamListFilters, baseSearchParams?: URLSearchParams) {
  const nextSearchParams = new URLSearchParams(baseSearchParams)

  writeStringParam(nextSearchParams, 'q', filters.q)
  writeEnumParam(
    nextSearchParams,
    'assignment',
    filters.assignment,
    DEFAULT_TEAM_LIST_FILTERS.assignment
  )
  writeEnumParam(nextSearchParams, 'fatigue', filters.fatigue, DEFAULT_TEAM_LIST_FILTERS.fatigue)
  writeEnumParam(nextSearchParams, 'sort', filters.sort, DEFAULT_TEAM_LIST_FILTERS.sort)

  return nextSearchParams
}

function matchesTeamFilters(view: TeamListItemView, filters: TeamListFilters) {
  if (filters.assignment === 'assigned' && !view.assignedCase) {
    return false
  }

  if (filters.assignment === 'unassigned' && view.assignedCase) {
    return false
  }

  if (filters.fatigue !== 'all' && view.fatigueBand !== filters.fatigue) {
    return false
  }

  if (!filters.q) {
    return true
  }

  const normalizedQuery = filters.q.toLowerCase()
  const searchableText = [
    view.team.name,
    view.team.tags.join(' '),
    view.assignedCase?.title ?? '',
    view.capabilitySummary.coverageTags.join(' '),
    view.capabilitySummary.roleCoverage.join(' '),
    view.capabilitySummary.agents
      .map((agent) => `${agent.name} ${agent.role} ${agent.tags.join(' ')}`)
      .join(' '),
  ]
    .join(' ')
    .toLowerCase()

  return searchableText.includes(normalizedQuery)
}

function compareTeamViews(left: TeamListItemView, right: TeamListItemView, sort: TeamSort) {
  if (sort === 'name') {
    return left.team.name.localeCompare(right.team.name)
  }

  if (sort === 'assignment') {
    return (
      Number(Boolean(right.assignedCase)) - Number(Boolean(left.assignedCase)) ||
      left.team.name.localeCompare(right.team.name)
    )
  }

  if (sort === 'coverage') {
    return (
      right.capabilitySummary.coverageTags.length - left.capabilitySummary.coverageTags.length ||
      right.capabilitySummary.roleCoverage.length - left.capabilitySummary.roleCoverage.length ||
      left.team.name.localeCompare(right.team.name)
    )
  }

  return (
    right.capabilitySummary.averageFatigue - left.capabilitySummary.averageFatigue ||
    Number(Boolean(right.assignedCase)) - Number(Boolean(left.assignedCase)) ||
    left.team.name.localeCompare(right.team.name)
  )
}
