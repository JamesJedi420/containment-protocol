import {
  readEnumParam,
  readStringParam,
  writeEnumParam,
  writeStringParam,
} from '../../app/searchParams'
import type { AgentRole, GameState } from '../../domain/models'
import { getAgentViews, type AgentView } from './agentView'

export const AGENT_ROLE_FILTERS = [
  'all',
  'hunter',
  'occultist',
  'investigator',
  'medium',
  'tech',
  'medic',
  'negotiator',
] as const
export const AGENT_STATUS_FILTERS = ['all', 'active', 'injured', 'recovering', 'dead'] as const
export const AGENT_FATIGUE_FILTERS = ['all', 'steady', 'strained', 'critical'] as const
export const AGENT_TRAINING_FILTERS = ['all', 'training', 'available'] as const

export type AgentRoleFilter = (typeof AGENT_ROLE_FILTERS)[number]
export type AgentStatusFilter = (typeof AGENT_STATUS_FILTERS)[number]
export type AgentFatigueFilter = (typeof AGENT_FATIGUE_FILTERS)[number]
export type AgentTrainingFilter = (typeof AGENT_TRAINING_FILTERS)[number]

export interface AgentListFilters {
  q: string
  role: AgentRoleFilter
  status: AgentStatusFilter
  team: 'all' | 'unassigned' | string
  fatigue: AgentFatigueFilter
  training: AgentTrainingFilter
}

export const DEFAULT_AGENT_LIST_FILTERS: AgentListFilters = {
  q: '',
  role: 'all',
  status: 'all',
  team: 'all',
  fatigue: 'all',
  training: 'all',
}

export function readAgentListFilters(
  game: GameState,
  searchParams: URLSearchParams
): AgentListFilters {
  const teamParam = readStringParam(searchParams, 'team')
  const team =
    teamParam === 'unassigned' || game.teams[teamParam]
      ? teamParam
      : DEFAULT_AGENT_LIST_FILTERS.team

  return {
    q: readStringParam(searchParams, 'q'),
    role: readEnumParam(searchParams, 'role', AGENT_ROLE_FILTERS, DEFAULT_AGENT_LIST_FILTERS.role),
    status: readEnumParam(
      searchParams,
      'status',
      AGENT_STATUS_FILTERS,
      DEFAULT_AGENT_LIST_FILTERS.status
    ),
    team,
    fatigue: readEnumParam(
      searchParams,
      'fatigue',
      AGENT_FATIGUE_FILTERS,
      DEFAULT_AGENT_LIST_FILTERS.fatigue
    ),
    training: readEnumParam(
      searchParams,
      'training',
      AGENT_TRAINING_FILTERS,
      DEFAULT_AGENT_LIST_FILTERS.training
    ),
  }
}

export function writeAgentListFilters(
  filters: AgentListFilters,
  baseSearchParams?: URLSearchParams
): URLSearchParams {
  const nextSearchParams = new URLSearchParams(baseSearchParams)

  writeStringParam(nextSearchParams, 'q', filters.q)
  writeEnumParam(nextSearchParams, 'role', filters.role, DEFAULT_AGENT_LIST_FILTERS.role)
  writeEnumParam(nextSearchParams, 'status', filters.status, DEFAULT_AGENT_LIST_FILTERS.status)
  writeEnumParam(nextSearchParams, 'fatigue', filters.fatigue, DEFAULT_AGENT_LIST_FILTERS.fatigue)
  writeEnumParam(
    nextSearchParams,
    'training',
    filters.training,
    DEFAULT_AGENT_LIST_FILTERS.training
  )

  if (filters.team === DEFAULT_AGENT_LIST_FILTERS.team) {
    nextSearchParams.delete('team')
  } else {
    writeStringParam(nextSearchParams, 'team', filters.team)
  }

  return nextSearchParams
}

export function getFilteredAgentViews(game: GameState, filters: AgentListFilters): AgentView[] {
  return getAgentViews(game).filter((view) => matchesAgentFilters(view, filters))
}

export function getRoleFilterOptions(game: GameState): AgentRole[] {
  return [...new Set(getAgentViews(game).map((view) => view.agent.role))]
}

function matchesAgentFilters(view: AgentView, filters: AgentListFilters): boolean {
  if (filters.role !== 'all' && view.agent.role !== filters.role) {
    return false
  }

  if (filters.status !== 'all' && view.agent.status !== filters.status) {
    return false
  }

  if (filters.team === 'unassigned') {
    if (view.team) {
      return false
    }
  } else if (filters.team !== 'all' && view.team?.id !== filters.team) {
    return false
  }

  if (filters.fatigue !== 'all' && view.capability.fatigueBand !== filters.fatigue) {
    return false
  }

  if (filters.training === 'training' && !view.trainingEntry) {
    return false
  }

  if (filters.training === 'available' && view.trainingEntry) {
    return false
  }

  if (!filters.q) {
    return true
  }

  const normalizedQuery = filters.q.toLowerCase()
  const searchableText = [
    view.agent.name,
    view.agent.role,
    view.agent.status,
    view.assignmentLabel,
    view.team?.name ?? 'reserve pool',
    view.team?.tags.join(' ') ?? '',
    view.domainTags.join(' '),
    view.traitLabels.join(' '),
    view.trainingEntry?.trainingName ?? '',
    view.materialized.identity.callsign ?? '',
    view.materialized.identity.codename ?? '',
  ]
    .join(' ')
    .toLowerCase()

  return searchableText.includes(normalizedQuery)
}
