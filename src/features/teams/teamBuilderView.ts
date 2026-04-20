// cspell:words editability
import { evaluateAgent } from '../../domain/evaluateAgent'
import { type Agent, type GameState, type Team } from '../../domain/models'
import {
  getAgentTeamId,
  getTeamEditability,
  getTeamMoveEligibility,
  isTeamNameAvailable,
} from '../../domain/sim/teamManagement'
import { isAgentTraining } from '../../domain/sim/training'
import { getTeamMemberIds } from '../../domain/teamSimulation'

export interface TeamBuilderSummary {
  reserveAgents: number
  editableTeams: number
  deployedTeams: number
  movableAgents: number
}

export interface TeamSeedCandidateView {
  agent: Agent
  currentTeam?: Team
  label: string
}

export interface TeamTransferCandidateView {
  agent: Agent
  currentTeam?: Team
  label: string
}

export interface TeamManagementStateView {
  editable: boolean
  reason?: string
  warnings: string[]
}

export function getTeamBuilderSummary(game: GameState): TeamBuilderSummary {
  const teams = Object.values(game.teams)
  const teamAgentIds = new Set(teams.flatMap((team) => getTeamMemberIds(team)))
  const agents = Object.values(game.agents)

  return {
    reserveAgents: agents.filter((agent) => !teamAgentIds.has(agent.id)).length,
    editableTeams: teams.filter((team) => getTeamEditability(team, game.cases).editable).length,
    deployedTeams: teams.filter((team) => !getTeamEditability(team, game.cases).editable).length,
    movableAgents: agents.filter((agent) => getTeamMoveEligibility(game, agent.id, null).allowed)
      .length,
  }
}

export function getTeamCreationSeedViews(game: GameState): TeamSeedCandidateView[] {
  return Object.values(game.agents)
    .filter((agent) => agent.status !== 'dead')
    .filter((agent) => getTeamMoveEligibility(game, agent.id, null).allowed)
    .map((agent) => {
      const currentTeamId = getAgentTeamId(game, agent.id)
      const currentTeam = currentTeamId ? game.teams[currentTeamId] : undefined

      return {
        agent,
        currentTeam,
        label: currentTeam ? `${agent.name} (${currentTeam.name})` : `${agent.name} (Reserve pool)`,
      }
    })
    .sort((left, right) => {
      const leftReserve = Number(!left.currentTeam)
      const rightReserve = Number(!right.currentTeam)

      return (
        rightReserve - leftReserve ||
        (left.currentTeam?.name ?? '').localeCompare(right.currentTeam?.name ?? '') ||
        left.agent.name.localeCompare(right.agent.name)
      )
    })
}

export function getTeamTransferCandidateViews(
  game: GameState,
  targetTeamId: string
): TeamTransferCandidateView[] {
  return Object.values(game.agents)
    .filter((agent) => getTeamMoveEligibility(game, agent.id, targetTeamId).allowed)
    .map((agent) => {
      const currentTeamId = getAgentTeamId(game, agent.id)
      const currentTeam = currentTeamId ? game.teams[currentTeamId] : undefined

      return {
        agent,
        currentTeam,
        label: currentTeam ? `${agent.name} (${currentTeam.name})` : `${agent.name} (Reserve pool)`,
      }
    })
    .sort((left, right) => {
      const leftReserve = Number(!left.currentTeam)
      const rightReserve = Number(!right.currentTeam)

      return (
        rightReserve - leftReserve ||
        scoreLeaderCandidate(right.agent) - scoreLeaderCandidate(left.agent) ||
        left.agent.name.localeCompare(right.agent.name)
      )
    })
}

export function getTeamManagementState(team: Team, game: GameState): TeamManagementStateView {
  const editability = getTeamEditability(team, game.cases)
  const memberIds = getTeamMemberIds(team)
  const warnings: string[] = []

  if (memberIds.length === 0) {
    warnings.push('No agents assigned. Add at least one agent before deployment.')
  }

  if ((team.derivedStats?.readiness ?? 0) < 45 && memberIds.length > 0) {
    warnings.push('Readiness is low. Fatigue and downtime are suppressing squad output.')
  }

  const trainingAgents = memberIds
    .map((agentId) => game.agents[agentId])
    .filter((agent) => Boolean(agent) && isAgentTraining(agent))

  if (trainingAgents.length > 0) {
    warnings.push('One or more members are in training, so this squad cannot deploy right now.')
  }

  const inactiveAgents = memberIds
    .map((agentId) => game.agents[agentId])
    .filter((agent) => Boolean(agent) && (agent.status === 'dead' || agent.status === 'resigned'))

  if (inactiveAgents.length > 0) {
    warnings.push('Inactive agents still occupy this squad container. Move them out before reuse.')
  }

  return {
    editable: editability.editable,
    reason: editability.reason,
    warnings,
  }
}

export function getTeamLeaderOptions(team: Team, game: GameState) {
  return getTeamMemberIds(team)
    .map((agentId) => game.agents[agentId])
    .filter(
      (agent): agent is Agent =>
        Boolean(agent) && agent.status !== 'dead' && agent.status !== 'resigned'
    )
    .sort(
      (left, right) =>
        scoreLeaderCandidate(right) - scoreLeaderCandidate(left) ||
        left.name.localeCompare(right.name)
    )
}

export function getTeamMemberRemovalBlockReason(game: GameState, agentId: string) {
  const move = getTeamMoveEligibility(game, agentId, null)
  return move.allowed ? undefined : move.reasons[0]
}

export function canUseTeamName(game: GameState, name: string, currentTeamId?: string) {
  return isTeamNameAvailable(game, name, currentTeamId)
}

function scoreLeaderCandidate(agent: Agent) {
  return Math.round(evaluateAgent(agent))
}
