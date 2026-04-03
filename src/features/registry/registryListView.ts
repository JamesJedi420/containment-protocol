import {
  readEnumParam,
  readStringParam,
  writeEnumParam,
  writeStringParam,
} from '../../app/searchParams'
import type { Agent, AgentRole, FatigueBand, GameState } from '../../domain/models'
import { getTeamMemberIds } from '../../domain/teamSimulation'
import { ROLE_LABELS } from '../../data/copy'

export const REGISTRY_ROLE_FILTERS = [
  'all',
  'hunter',
  'occultist',
  'investigator',
  'medium',
  'tech',
  'medic',
  'negotiator',
] as const
export const REGISTRY_STATUS_FILTERS = ['all', 'active', 'injured', 'recovering', 'dead'] as const
export const REGISTRY_FATIGUE_FILTERS = ['all', 'steady', 'strained', 'critical'] as const
export const REGISTRY_SORT_OPTIONS = ['name-asc', 'fatigue-desc', 'status', 'team'] as const

export type RegistryRoleFilter = (typeof REGISTRY_ROLE_FILTERS)[number]
export type RegistryStatusFilter = (typeof REGISTRY_STATUS_FILTERS)[number]
export type RegistryFatigueFilter = (typeof REGISTRY_FATIGUE_FILTERS)[number]
export type RegistrySortOption = (typeof REGISTRY_SORT_OPTIONS)[number]

export interface RegistryListFilters {
  q: string
  role: RegistryRoleFilter
  status: RegistryStatusFilter
  team: 'all' | 'unassigned' | string
  fatigue: RegistryFatigueFilter
  sort: RegistrySortOption
  page: number
}

export interface RegistryAgentView {
  agent: Agent
  teamId?: string
  teamName?: string
}

export const DEFAULT_REGISTRY_LIST_FILTERS: RegistryListFilters = {
  q: '',
  role: 'all',
  status: 'all',
  team: 'all',
  fatigue: 'all',
  sort: 'name-asc',
  page: 1,
}

export function readRegistryListFilters(
  game: GameState,
  searchParams: URLSearchParams
): RegistryListFilters {
  const teamParam = readStringParam(searchParams, 'team')
  const team =
    teamParam === 'unassigned' || game.teams[teamParam]
      ? teamParam
      : DEFAULT_REGISTRY_LIST_FILTERS.team

  return {
    q: readStringParam(searchParams, 'q'),
    role: readEnumParam(
      searchParams,
      'role',
      REGISTRY_ROLE_FILTERS,
      DEFAULT_REGISTRY_LIST_FILTERS.role
    ),
    status: readEnumParam(
      searchParams,
      'status',
      REGISTRY_STATUS_FILTERS,
      DEFAULT_REGISTRY_LIST_FILTERS.status
    ),
    team,
    fatigue: readEnumParam(
      searchParams,
      'fatigue',
      REGISTRY_FATIGUE_FILTERS,
      DEFAULT_REGISTRY_LIST_FILTERS.fatigue
    ),
    sort: readEnumParam(
      searchParams,
      'sort',
      REGISTRY_SORT_OPTIONS,
      DEFAULT_REGISTRY_LIST_FILTERS.sort
    ),
    page: readPositiveIntegerParam(searchParams, 'page', DEFAULT_REGISTRY_LIST_FILTERS.page),
  }
}

export function writeRegistryListFilters(
  filters: RegistryListFilters,
  baseSearchParams?: URLSearchParams
) {
  const nextSearchParams = new URLSearchParams(baseSearchParams)

  writeStringParam(nextSearchParams, 'q', filters.q)
  writeEnumParam(nextSearchParams, 'role', filters.role, DEFAULT_REGISTRY_LIST_FILTERS.role)
  writeEnumParam(nextSearchParams, 'status', filters.status, DEFAULT_REGISTRY_LIST_FILTERS.status)
  writeEnumParam(nextSearchParams, 'fatigue', filters.fatigue, DEFAULT_REGISTRY_LIST_FILTERS.fatigue)
  writeEnumParam(nextSearchParams, 'sort', filters.sort, DEFAULT_REGISTRY_LIST_FILTERS.sort)
  writePositiveIntegerParam(nextSearchParams, 'page', filters.page, DEFAULT_REGISTRY_LIST_FILTERS.page)

  if (filters.team === DEFAULT_REGISTRY_LIST_FILTERS.team) {
    nextSearchParams.delete('team')
  } else {
    writeStringParam(nextSearchParams, 'team', filters.team)
  }

  return nextSearchParams
}

export function getFilteredRegistryAgentViews(game: GameState, filters: RegistryListFilters) {
  const teamByAgentId = getTeamByAgentId(game)

  return Object.values(game.agents)
    .map((agent) => ({
      agent,
      teamId: teamByAgentId.get(agent.id)?.id,
      teamName: teamByAgentId.get(agent.id)?.name,
    }))
    .filter((view) => matchesRegistryFilters(view, filters))
    .sort((left, right) => compareRegistryAgentViews(left, right, filters.sort))
}

function getTeamByAgentId(game: GameState) {
  const map = new Map<string, { id: string; name: string }>()

  for (const team of Object.values(game.teams)) {
    for (const agentId of getTeamMemberIds(team)) {
      map.set(agentId, { id: team.id, name: team.name })
    }
  }

  return map
}

function matchesRegistryFilters(view: RegistryAgentView, filters: RegistryListFilters) {
  if (filters.role !== 'all' && view.agent.role !== filters.role) {
    return false
  }

  if (filters.status !== 'all' && view.agent.status !== filters.status) {
    return false
  }

  if (filters.team === 'unassigned') {
    if (view.teamId) {
      return false
    }
  } else if (filters.team !== 'all' && view.teamId !== filters.team) {
    return false
  }

  if (filters.fatigue !== 'all' && getFatigueBand(view.agent.fatigue) !== filters.fatigue) {
    return false
  }

  if (!filters.q) {
    return true
  }

  const searchableText = [
    view.agent.name,
    ROLE_LABELS[view.agent.role],
    view.agent.status,
    ...view.agent.tags,
    view.teamName ?? '',
    getFatigueBand(view.agent.fatigue),
  ]
    .join(' ')
    .toLowerCase()

  const queryTokens = filters.q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)

  if (queryTokens.length === 0) {
    return true
  }

  return queryTokens.every((token) => searchableText.includes(token))
}

function compareRegistryAgentViews(
  left: RegistryAgentView,
  right: RegistryAgentView,
  sort: RegistrySortOption
) {
  switch (sort) {
    case 'fatigue-desc':
      return right.agent.fatigue - left.agent.fatigue || compareByName(left, right)
    case 'status':
      return compareByStatus(left.agent.status, right.agent.status) || compareByName(left, right)
    case 'team':
      return compareByTeamName(left.teamName, right.teamName) || compareByName(left, right)
    case 'name-asc':
    default:
      return compareByName(left, right)
  }
}

function compareByName(left: RegistryAgentView, right: RegistryAgentView) {
  return left.agent.name.localeCompare(right.agent.name)
}

function compareByStatus(
  leftStatus: RegistryAgentView['agent']['status'],
  rightStatus: RegistryAgentView['agent']['status']
) {
  return getStatusSortIndex(leftStatus) - getStatusSortIndex(rightStatus)
}

function getStatusSortIndex(status: RegistryAgentView['agent']['status']) {
  switch (status) {
    case 'active':
      return 0
    case 'injured':
      return 1
    case 'recovering':
      return 2
    case 'dead':
      return 3
    default:
      return 4
  }
}

function compareByTeamName(leftTeamName?: string, rightTeamName?: string) {
  const left = leftTeamName ?? 'zzzzzzzz-reserve-pool'
  const right = rightTeamName ?? 'zzzzzzzz-reserve-pool'
  return left.localeCompare(right)
}

function getFatigueBand(fatigue: number): FatigueBand {
  if (fatigue >= 45) {
    return 'critical'
  }

  if (fatigue >= 20) {
    return 'strained'
  }

  return 'steady'
}

export function getRegistryRoleFilterOptions(game: GameState): AgentRole[] {
  return [...new Set(Object.values(game.agents).map((agent) => agent.role))]
}

function readPositiveIntegerParam(
  searchParams: URLSearchParams,
  key: string,
  fallback: number
) {
  const value = readStringParam(searchParams, key)
  if (!value) {
    return fallback
  }

  const parsed = Number.parseInt(value, 10)

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback
  }

  return parsed
}

function writePositiveIntegerParam(
  searchParams: URLSearchParams,
  key: string,
  value: number,
  fallback: number
) {
  if (!Number.isFinite(value) || value < 1 || value === fallback) {
    searchParams.delete(key)
    return
  }

  writeStringParam(searchParams, key, String(Math.floor(value)))
}
