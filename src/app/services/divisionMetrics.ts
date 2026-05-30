import { type Agent, type GameState } from '../../domain/models'
import { getTeamAssignedCaseId, getTeamMemberIds } from '../../domain/teamSimulation'

function getAssignedAgentIds(game: GameState) {
  return new Set(
    Object.values(game.teams)
      .filter((team) => Boolean(getTeamAssignedCaseId(team)))
      .flatMap((team) => getTeamMemberIds(team))
  )
}

export function getNonFieldStaff(game: GameState): Agent[] {
  const assignedAgentIds = getAssignedAgentIds(game)
  return Object.values(game.agents).filter((agent) => !assignedAgentIds.has(agent.id))
}

function isQueuedForTraining(game: GameState, agentId: string) {
  return game.trainingQueue.some((entry) => entry.agentId === agentId)
}

export function isDeployableReserveAgent(
  agent: Agent,
  game: GameState,
  assignedAgentIds: ReadonlySet<string>
): boolean {
  if (assignedAgentIds.has(agent.id)) {
    return false
  }

  if (agent.status === 'dead' || agent.status === 'resigned') {
    return false
  }

  if (agent.status === 'recovering' || agent.assignment?.state === 'recovery') {
    return false
  }

  const readiness = agent.readinessProfile
  if (
    readiness?.state === 'training' ||
    readiness?.availabilityState === 'training'
  ) {
    return false
  }

  if (readiness?.deploymentEligible === false || readiness?.deployable === false) {
    return false
  }

  if (isQueuedForTraining(game, agent.id)) {
    return false
  }

  return agent.status === 'active'
}

export function getDeployableReserveStaff(game: GameState): Agent[] {
  const assignedAgentIds = getAssignedAgentIds(game)
  return Object.values(game.agents).filter((agent) =>
    isDeployableReserveAgent(agent, game, assignedAgentIds)
  )
}

export function getAssignmentSummary(game: GameState) {
  const cases = Object.values(game.cases)
  const teams = Object.values(game.teams)
  const assignedTeams = teams.filter((team) => Boolean(getTeamAssignedCaseId(team))).length

  return {
    activeCases: cases.filter((currentCase) => currentCase.status !== 'resolved').length,
    openCases: cases.filter((currentCase) => currentCase.status === 'open').length,
    assignedTeams,
    availableTeams: teams.length - assignedTeams,
  }
}

export function getTimeQueueSummary(game: GameState) {
  const queued = game.productionQueue.length + game.trainingQueue.length
  const remainingWeeks =
    game.productionQueue.reduce((sum, entry) => sum + entry.remainingWeeks, 0) +
    game.trainingQueue.reduce((sum, entry) => sum + entry.remainingWeeks, 0)

  return {
    queued,
    remainingWeeks,
    completedEvents: game.events.filter(
      (event) =>
        event.type === 'production.queue_completed' || event.type === 'agent.training_completed'
    ).length,
  }
}

export function getFieldIntelligenceSummary(game: GameState) {
  const recentEvents = [...game.events].slice(-5).reverse()

  return {
    recentEvents,
    reports: game.reports.length,
    latestReportWeek: game.reports.at(-1)?.week,
    unresolvedPressure: game.reports.reduce(
      (sum, report) => sum + report.unresolvedTriggers.length,
      0
    ),
  }
}
