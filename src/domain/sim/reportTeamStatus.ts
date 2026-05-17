import type { GameState, Team, WeeklyReportTeamStatus } from '../models'
import { getTeamAssignedCaseId, getTeamMemberIds } from '../teamSimulation'
import { buildDeployedRecoveryLegibilityForCase } from './expeditionRecoveryNode'

/** Week-open / pre-resolution case+team snapshot for deployed recovery legibility. */
export interface ReportTeamStatusRecoveryLookup {
  teams: GameState['teams']
  cases: GameState['cases']
}

export interface BuildReportTeamStatusOptions {
  recoveryLookup?: ReportTeamStatusRecoveryLookup
}

export function getReportFatigueBand(value: number): WeeklyReportTeamStatus['fatigueBand'] {
  if (value >= 45) {
    return 'critical'
  }

  if (value >= 20) {
    return 'strained'
  }

  return 'steady'
}

function getTeamAverageFatigue(team: Team, agents: GameState['agents']): number {
  const memberIds = getTeamMemberIds(team)

  if (memberIds.length === 0) {
    return 0
  }

  const totalFatigue = memberIds.reduce((sum, agentId) => sum + (agents[agentId]?.fatigue ?? 0), 0)

  return Math.round(totalFatigue / memberIds.length)
}

function resolveRecoveryCaseForTeam(
  team: Team,
  options?: BuildReportTeamStatusOptions
): GameState['cases'][string] | undefined {
  const lookup = options?.recoveryLookup
  if (!lookup) {
    return undefined
  }

  const recoveryTeam = lookup.teams[team.id]
  if (!recoveryTeam) {
    return undefined
  }

  const recoveryCaseId = getTeamAssignedCaseId(recoveryTeam)
  return recoveryCaseId ? lookup.cases[recoveryCaseId] : undefined
}

export function buildReportTeamStatusEntry(
  team: Team,
  agents: GameState['agents'],
  cases: GameState['cases'],
  options?: BuildReportTeamStatusOptions
): WeeklyReportTeamStatus {
  const avgFatigue = getTeamAverageFatigue(team, agents)
  const assignedCaseId = getTeamAssignedCaseId(team)
  const assignedCase = assignedCaseId ? cases[assignedCaseId] : undefined
  const recoveryCase = resolveRecoveryCaseForTeam(team, options) ?? assignedCase
  const recoveryFields = buildDeployedRecoveryLegibilityForCase(recoveryCase)
  const displayCaseId = assignedCaseId ?? (recoveryCase ? recoveryCase.id : undefined)
  const displayCase = assignedCase ?? recoveryCase

  return {
    teamId: team.id,
    teamName: team.name,
    assignedCaseId: displayCaseId,
    assignedCaseTitle: displayCase?.title,
    avgFatigue,
    fatigueBand: getReportFatigueBand(avgFatigue),
    ...(recoveryFields ?? {}),
  }
}

export function buildReportTeamStatus(
  teams: GameState['teams'],
  agents: GameState['agents'],
  cases: GameState['cases'],
  options?: BuildReportTeamStatusOptions
): WeeklyReportTeamStatus[] {
  return Object.values(teams).map((team) =>
    buildReportTeamStatusEntry(team, agents, cases, options)
  )
}
