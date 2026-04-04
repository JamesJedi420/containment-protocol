import { buildAgencySummary } from '../../domain/agency'
import { calcWeekScore } from '../../domain/sim/scoring'
import { type GameState } from '../../domain/models'
import { getAdvisories } from '../../domain/advisory'
import { getResponseGridConfig } from '../../domain/pressure'
import { getTeamAssignedCaseId, getTeamMemberIds } from '../../domain/teamSimulation'
import { DEFAULT_CASE_LIST_FILTERS, getFilteredCaseViews } from '../cases/caseView'
import { DEFAULT_TEAM_LIST_FILTERS, getFilteredTeamViews } from '../teams/teamView'

export function getDashboardMetrics(game: GameState) {
  const cases = Object.values(game.cases)
  const agents = Object.values(game.agents)
  const fieldStatusViews = getFieldStatusViews(game)

  return {
    open: cases.filter((currentCase) => currentCase.status === 'open').length,
    inProgress: cases.filter((currentCase) => currentCase.status === 'in_progress').length,
    resolved: cases.filter((currentCase) => currentCase.status === 'resolved').length,
    totalScore: game.reports.reduce((sum, report) => sum + calcWeekScore(report), 0),
    avgFatigue:
      agents.length > 0
        ? Math.round(agents.reduce((sum, agent) => sum + agent.fatigue, 0) / agents.length)
        : 0,
    maxStage: Math.max(...cases.map((currentCase) => currentCase.stage), 0),
    deadlineRiskCount: fieldStatusViews.filter((view) => view.signals.deadlineRisk).length,
    criticalStageCount: fieldStatusViews.filter((view) => view.signals.criticalStage).length,
    raidUnderstaffedCount: fieldStatusViews.filter((view) => view.signals.raidUnderstaffed).length,
    overstretchedTeamCount: fieldStatusViews.filter((view) => view.status === 'overstretched')
      .length,
  }
}

export function getPriorityCaseViews(game: GameState, limit = 4) {
  return getFilteredCaseViews(game, DEFAULT_CASE_LIST_FILTERS)
    .filter((view) => view.currentCase.status !== 'resolved')
    .slice(0, limit)
}

export function getAtRiskTeamViews(game: GameState, limit = 4) {
  return getFilteredTeamViews(game, DEFAULT_TEAM_LIST_FILTERS)
    .filter((view) => view.assignedCase || view.fatigueBand !== 'steady')
    .slice(0, limit)
}

export function getLatestReportSummary(game: GameState) {
  const latestReport = game.reports.at(-1)

  if (!latestReport) {
    return undefined
  }

  return {
    report: latestReport,
    score: calcWeekScore(latestReport),
  }
}

export function getFieldStatusViews(game: GameState) {
  return Object.values(game.teams)
    .map((team) => {
      const assignedCaseId = getTeamAssignedCaseId(team)
      const assignedCase = assignedCaseId ? game.cases[assignedCaseId] : undefined
      const agents = getTeamMemberIds(team)
        .map((agentId) => game.agents[agentId])
        .filter(Boolean)
      const averageFatigue =
        agents.length > 0
          ? Math.round(agents.reduce((sum, agent) => sum + agent.fatigue, 0) / agents.length)
          : 0
      const remainingWeeks = assignedCase?.weeksRemaining ?? assignedCase?.durationWeeks
      const progressPercent = assignedCase
        ? Math.round(
            ((assignedCase.durationWeeks - (remainingWeeks ?? assignedCase.durationWeeks)) /
              Math.max(assignedCase.durationWeeks, 1)) *
              100
          )
        : 0
      const status: 'idle' | 'deploying' | 'recovering' | 'overstretched' = assignedCase
        ? averageFatigue >= 45
          ? 'overstretched'
          : 'deploying'
        : averageFatigue >= 45
          ? 'recovering'
          : 'idle'
      const deadlineRisk = Boolean(assignedCase && assignedCase.deadlineRemaining <= 1)
      const criticalStage = Boolean(assignedCase && assignedCase.stage >= 4)
      const raidUnderstaffed = Boolean(
        assignedCase &&
        assignedCase.kind === 'raid' &&
        assignedCase.raid &&
        assignedCase.assignedTeamIds.length < assignedCase.raid.minTeams
      )

      return {
        team,
        assignedCase,
        agentCount: agents.length,
        progressPercent: Math.max(0, Math.min(progressPercent, 100)),
        remainingWeeks,
        status,
        signals: {
          deadlineRisk,
          criticalStage,
          raidUnderstaffed,
        },
      }
    })
    .sort((left, right) => {
      return (
        Number(Boolean(right.assignedCase)) - Number(Boolean(left.assignedCase)) ||
        right.progressPercent - left.progressPercent ||
        left.team.name.localeCompare(right.team.name)
      )
    })
}

export function getOperationsDeskAdvisories(game: GameState, limit = 5) {
  return getAdvisories(game, limit)
}

export function getOperationsDeskPerformance(game: GameState) {
  const resolvedCount = game.reports.reduce((sum, report) => sum + report.resolvedCases.length, 0)
  const failedCount = game.reports.reduce((sum, report) => sum + report.failedCases.length, 0)
  const completedQueueCount = game.events.filter(
    (event) => event.type === 'production.queue_completed'
  ).length
  const activePressure = Object.values(game.cases).filter(
    (currentCase) => currentCase.status !== 'resolved'
  ).length
  const fabricatedStock = Object.values(game.inventory).reduce((sum, quantity) => sum + quantity, 0)
  const totalOutcomes = resolvedCount + failedCount

  return {
    resolutionRate:
      totalOutcomes > 0 ? Math.round((resolvedCount / Math.max(totalOutcomes, 1)) * 100) : 0,
    queueThroughput: completedQueueCount,
    activePressure,
    fabricatedStock,
  }
}

export function getGlobalStateMetrics(game: GameState) {
  const agency = buildAgencySummary(game)
  const responseGrid = getResponseGridConfig(game)

  const activeCases = Object.values(game.cases).filter(
    (currentCase) => currentCase.status !== 'resolved'
  )
  const assignedTeamIds = new Set(
    Object.values(game.teams)
      .filter((team) => Boolean(getTeamAssignedCaseId(team)))
      .map((team) => team.id)
  )
  const usedAgentIds = new Set(
    [...assignedTeamIds].flatMap((teamId) =>
      getTeamMemberIds(game.teams[teamId] ?? { memberIds: [], agentIds: [] })
    )
  )

  const weeksPerYear = Math.max(1, game.config.weeksPerYear)
  const zeroBasedWeek = Math.max(game.week - 1, 0)
  const year = Math.floor(zeroBasedWeek / weeksPerYear) + 1
  const weekOfYear = (zeroBasedWeek % weeksPerYear) + 1

  const globalPressure = game.globalPressure ?? 0
  const majorIncidentThreshold = responseGrid.majorIncidentThreshold
  const pressureBarPercent = Math.min(
    100,
    Math.round((globalPressure / majorIncidentThreshold) * 100)
  )

  return {
    year,
    weekOfYear,
    week: game.week,
    agencyName: agency.name,
    activeCases: activeCases.length,
    containmentRating: agency.containmentRating,
    clearanceLevel: agency.clearanceLevel,
    funding: agency.funding,
    reputation: agency.reputation,
    pressureScore: agency.pressure.score,
    pressureLevel: agency.pressure.level,
    stabilityScore: agency.stability.score,
    stabilityLevel: agency.stability.level,
    agentCapacity: {
      used: usedAgentIds.size,
      total: Object.keys(game.agents).length,
    },
    globalPressure,
    majorIncidentThreshold,
    pressureBarPercent,
  }
}
