import {
  appendAgentHistoryEntry,
  createAgentHistoryEntry,
  setAgentAssignment,
} from '../agent/lifecycle'
import type { GameState, Team } from '../models'
import { getTeamMemberIds } from '../teamSimulation'

interface ReleaseAssignedAgentsInput {
  agents: GameState['agents']
  teams: GameState['teams']
  teamIds: readonly string[]
  caseId: string
  caseTitle: string
  week: number
}

interface AssignAgentsToTeamInput {
  agents: GameState['agents']
  team: Team
  caseId: string
  teamId: string
  caseTitle: string
  week: number
}

export function releaseAssignedAgentsFromTeams({
  agents,
  teams,
  teamIds,
  caseId,
  caseTitle,
  week,
}: ReleaseAssignedAgentsInput): GameState['agents'] {
  if (teamIds.length === 0) {
    return agents
  }

  const nextAgents = { ...agents }
  let changed = false

  for (const releasedTeamId of teamIds) {
    for (const agentId of getTeamMemberIds(
      teams[releasedTeamId] ?? { memberIds: [], agentIds: [] }
    )) {
      const agent = nextAgents[agentId]

      if (agent?.assignment?.state !== 'assigned' || agent.assignment.caseId !== caseId) {
        continue
      }

      nextAgents[agentId] = appendAgentHistoryEntry(
        setAgentAssignment(agent, { state: 'idle' }),
        createAgentHistoryEntry(week, 'assignment.team_unassigned', `Released from ${caseTitle}.`)
      )
      changed = true
    }
  }

  return changed ? nextAgents : agents
}

export function assignActiveAgentsToTeam({
  agents,
  team,
  caseId,
  teamId,
  caseTitle,
  week,
}: AssignAgentsToTeamInput): GameState['agents'] {
  const nextAgents = { ...agents }
  let changed = false

  for (const agentId of getTeamMemberIds(team)) {
    const agent = nextAgents[agentId]

    if (!agent || agent.status !== 'active' || agent.assignment?.state === 'training') {
      continue
    }

    nextAgents[agentId] = appendAgentHistoryEntry(
      setAgentAssignment(agent, { state: 'assigned', caseId, teamId, startedWeek: week }),
      createAgentHistoryEntry(week, 'assignment.team_assigned', `Assigned to ${caseTitle}.`)
    )
    changed = true
  }

  return changed ? nextAgents : agents
}
