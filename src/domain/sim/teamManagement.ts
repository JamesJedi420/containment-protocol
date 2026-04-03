import { type Agent, type GameState, type Id, type Team } from '../models'
import {
  ensureNormalizedGameState,
  getTeamAssignedCaseId,
  getTeamMemberIds,
  normalizeGameState,
} from '../teamSimulation'

export interface TeamEditability {
  editable: boolean
  reason?: string
}

export interface TeamMoveEligibility {
  allowed: boolean
  reasons: string[]
}

function normalizeTeamName(name: string) {
  return name.trim().replace(/\s+/g, ' ')
}

function getAgentCurrentTeam(state: GameState, agentId: Id) {
  return Object.values(state.teams).find((team) => getTeamMemberIds(team).includes(agentId))
}

function withTeamMembers(team: Team, memberIds: Id[]): Team {
  const uniqueMemberIds = [...new Set(memberIds)]
  const leaderId =
    team.leaderId && uniqueMemberIds.includes(team.leaderId)
      ? team.leaderId
      : (uniqueMemberIds[0] ?? null)

  return {
    ...team,
    memberIds: uniqueMemberIds,
    agentIds: uniqueMemberIds,
    leaderId,
  }
}

function nextTeamId(state: GameState) {
  const existingIds = new Set(Object.keys(state.teams))
  let index = Object.keys(state.teams).length + 1

  while (existingIds.has(`team-${index}`)) {
    index += 1
  }

  return `team-${index}`
}

export function getTeamEditability(team: Team, cases: GameState['cases']): TeamEditability {
  const assignedCaseId = getTeamAssignedCaseId(team)

  if (assignedCaseId) {
    const assignedCase = cases[assignedCaseId]
    if (!assignedCase) {
      return { editable: true }
    }

    return {
      editable: false,
      reason: `Locked while deployed to ${assignedCase.title}.`,
    }
  }

  return { editable: true }
}

export function getAgentTeamId(state: GameState, agentId: Id): Id | null {
  return getAgentCurrentTeam(state, agentId)?.id ?? null
}

export function getTeamMoveEligibility(
  state: GameState,
  agentId: Id,
  targetTeamId?: Id | null
): TeamMoveEligibility {
  const agent = state.agents[agentId]
  const reasons: string[] = []

  if (!agent) {
    return { allowed: false, reasons: ['Agent record is missing.'] }
  }

  const sourceTeam = getAgentCurrentTeam(state, agentId)
  const targetTeam = targetTeamId ? state.teams[targetTeamId] : undefined

  if (targetTeamId && !targetTeam) {
    reasons.push('Target team does not exist.')
  }

  if (sourceTeam && !getTeamEditability(sourceTeam, state.cases).editable) {
    reasons.push('Current team is deployed and cannot be edited.')
  }

  if (targetTeam && !getTeamEditability(targetTeam, state.cases).editable) {
    reasons.push('Target team is deployed and cannot receive transfers.')
  }

  if (targetTeam && sourceTeam?.id === targetTeam.id) {
    reasons.push('Agent is already in that team.')
  }

  if (agent.assignment?.state === 'training') {
    reasons.push('Agent is in training and cannot be reassigned.')
  }

  if (targetTeam && (agent.status === 'dead' || agent.status === 'resigned')) {
    reasons.push('Dead agents cannot be assigned to an active team.')
  }

  return {
    allowed: reasons.length === 0,
    reasons,
  }
}

export function isTeamNameAvailable(state: GameState, name: string, currentTeamId?: Id) {
  const normalizedName = normalizeTeamName(name)

  if (!normalizedName) {
    return false
  }

  return !Object.values(state.teams).some(
    (team) =>
      team.id !== currentTeamId && team.name.trim().toLowerCase() === normalizedName.toLowerCase()
  )
}

export function createTeam(state: GameState, name: string, seedAgentId: Id): GameState {
  const normalizedName = normalizeTeamName(name)
  const seedAgent = state.agents[seedAgentId]

  if (
    !normalizedName ||
    !seedAgent ||
    seedAgent.status === 'dead' ||
    seedAgent.status === 'resigned' ||
    !isTeamNameAvailable(state, normalizedName)
  ) {
    return ensureNormalizedGameState(state)
  }

  const moveEligibility = getTeamMoveEligibility(state, seedAgentId, null)
  if (!moveEligibility.allowed) {
    return ensureNormalizedGameState(state)
  }

  const sourceTeamId = getAgentTeamId(state, seedAgentId)
  const nextTeams = Object.fromEntries(
    Object.entries(state.teams).map(([teamId, team]) => {
      if (teamId !== sourceTeamId) {
        return [teamId, team]
      }

      return [
        teamId,
        withTeamMembers(
          team,
          getTeamMemberIds(team).filter((memberId) => memberId !== seedAgentId)
        ),
      ]
    })
  )

  const teamId = nextTeamId(state)

  nextTeams[teamId] = {
    id: teamId,
    name: normalizedName,
    memberIds: [seedAgentId],
    agentIds: [seedAgentId],
    leaderId: seedAgentId,
    tags: [],
  }

  return normalizeGameState({
    ...state,
    teams: nextTeams,
  })
}

export function renameTeam(state: GameState, teamId: Id, name: string): GameState {
  const team = state.teams[teamId]
  const normalizedName = normalizeTeamName(name)

  if (!team || !normalizedName || !isTeamNameAvailable(state, normalizedName, teamId)) {
    return ensureNormalizedGameState(state)
  }

  if (!getTeamEditability(team, state.cases).editable) {
    return ensureNormalizedGameState(state)
  }

  if (team.name === normalizedName) {
    return ensureNormalizedGameState(state)
  }

  return normalizeGameState({
    ...state,
    teams: {
      ...state.teams,
      [teamId]: {
        ...team,
        name: normalizedName,
      },
    },
  })
}

export function setTeamLeader(state: GameState, teamId: Id, leaderId: Id | null): GameState {
  const team = state.teams[teamId]

  if (!team || !getTeamEditability(team, state.cases).editable) {
    return state
  }

  const memberIds = getTeamMemberIds(team)

  if (leaderId !== null) {
    const agent = state.agents[leaderId]
    if (!memberIds.includes(leaderId) || !agent || agent.status === 'dead' || agent.status === 'resigned') {
      return state
    }
  }

  return normalizeGameState({
    ...state,
    teams: {
      ...state.teams,
      [teamId]: {
        ...team,
        leaderId,
      },
    },
  })
}

export function moveAgentBetweenTeams(
  state: GameState,
  agentId: Id,
  targetTeamId?: Id | null
): GameState {
  const moveEligibility = getTeamMoveEligibility(state, agentId, targetTeamId)
  if (!moveEligibility.allowed) {
    return state
  }

  const nextTeams = Object.fromEntries(
    Object.entries(state.teams).map(([teamId, team]) => {
      let memberIds = getTeamMemberIds(team).filter((memberId) => memberId !== agentId)

      if (targetTeamId && teamId === targetTeamId) {
        memberIds = [...memberIds, agentId]
      }

      return [teamId, withTeamMembers(team, memberIds)]
    })
  )

  return normalizeGameState({
    ...state,
    teams: nextTeams,
  })
}

export function deleteEmptyTeam(state: GameState, teamId: Id): GameState {
  const team = state.teams[teamId]

  if (
    !team ||
    !getTeamEditability(team, state.cases).editable ||
    getTeamMemberIds(team).length > 0
  ) {
    return ensureNormalizedGameState(state)
  }

  const nextTeams = { ...state.teams }
  delete nextTeams[teamId]

  return normalizeGameState({
    ...state,
    teams: nextTeams,
  })
}

export function getReserveAgents(state: GameState): Agent[] {
  const assignedAgentIds = new Set(
    Object.values(state.teams).flatMap((team) => getTeamMemberIds(team))
  )

  return Object.values(state.agents)
    .filter((agent) => !assignedAgentIds.has(agent.id))
    .sort((left, right) => left.name.localeCompare(right.name))
}
