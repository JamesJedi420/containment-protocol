// cspell:words callsign
import {
  readEnumParam,
  readStringParam,
  writeEnumParam,
  writeStringParam,
} from '../../app/searchParams'
import type { GameState } from '../../domain/models'
import type { PersonnelQueryFilters, PersonnelQueryRecord } from '../shared/personnelQueryView'
import type { AgentView } from './agentView'

export const AGENT_ROLE_FILTERS = [
  'all',
  'hunter',
  'occultist',
  'investigator',
  'field_recon',
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

export type AgentListFilters = PersonnelQueryFilters

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
    teamParam === 'unassigned' || Object.hasOwn(game.teams, teamParam)
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

export function projectAgentQueryRecord(view: AgentView): PersonnelQueryRecord {
  const { agent, team, trainingEntry } = view
  const { callsign, codename } = view.materialized.identity
  return {
    id: agent.id,
    name: agent.name,
    role: agent.role,
    status: agent.status,
    teamId: team?.id,
    fatigue: view.capability.fatigueBand,
    training: trainingEntry ? 'training' : 'available',
    // Keep this allowlist explicit. AgentView also carries internal state for other consumers.
    searchText: [
      agent.name,
      agent.role,
      agent.status,
      view.assignmentLabel,
      team?.name ?? 'reserve pool',
      team?.tags.join(' ') ?? '',
      view.domainTags.join(' '),
      view.traitLabels.join(' '),
      trainingEntry?.trainingName ?? '',
      callsign ?? '',
      codename ?? '',
    ]
      .join(' ')
      .toLowerCase(),
  }
}
