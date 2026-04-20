import type { RegionalState } from '../../domain/models'
import { buildAgencySummary } from '../../domain/agency'
import { buildCampaignGovernanceSummary } from '../../domain/campaignGovernance'
import { calcWeekScore } from '../../domain/sim/scoring'
import { type GameState } from '../../domain/models'
import { getVisibleReports } from '../../domain/reporting'
import { getAdvisories } from '../../domain/advisory'
import { getResponseGridConfig } from '../../domain/pressure'
import { buildTerritorialPowerSummary } from '../../domain/territorialPower'
import { buildSupplyNetworkSummary } from '../../domain/supplyNetwork'
import { getTeamAssignedCaseId, getTeamMemberIds } from '../../domain/teamSimulation'
import { getCaseListItemView, type CaseListItemView } from '../cases/caseView'
import { getTeamListItemView, type TeamListItemView } from '../teams/teamView'

export function getPriorityCaseViews(game: GameState, limit = 5): CaseListItemView[] {
  return Object.values(game.cases)
    .map((currentCase) => getCaseListItemView(currentCase, game))
    .filter((view) => view.currentCase.status !== 'resolved')
    .sort(
      (left, right) =>
        right.priorityScore - left.priorityScore ||
        right.currentCase.stage - left.currentCase.stage ||
        left.currentCase.deadlineRemaining - right.currentCase.deadlineRemaining ||
        left.currentCase.title.localeCompare(right.currentCase.title)
    )
    .slice(0, limit)
}

export function getAtRiskTeamViews(game: GameState, limit = 5): TeamListItemView[] {
  return Object.values(game.teams)
    .map((team) => getTeamListItemView(team, game))
    .filter((view) => view.assignedCase || view.fatigueBand !== 'steady')
    .sort(
      (left, right) =>
        right.capabilitySummary.averageFatigue - left.capabilitySummary.averageFatigue ||
        Number(Boolean(right.assignedCase)) - Number(Boolean(left.assignedCase)) ||
        left.team.name.localeCompare(right.team.name)
    )
    .slice(0, limit)
}

export function getDashboardMetrics(game: GameState) {
  const cases = Object.values(game.cases)
  const agents = Object.values(game.agents)
  const fieldStatusViews = getFieldStatusViews(game)
  const emergency = game.emergencyGovernance || { active: false }
  const territorialPower = buildTerritorialPowerSummary(game.territorialPower)
  const supplyNetwork = buildSupplyNetworkSummary(game.supplyNetwork)
  const campaignGovernance = buildCampaignGovernanceSummary(game.campaignGovernance)

  // Minimal regional summary: count, agency-controlled, hostile-controlled, known regions
  const regional = (() => {
    const state: RegionalState | undefined = game.regionalState
    if (!state) return { regionCount: 0, agencyControlled: 0, hostileControlled: 0, knownRegions: 0 }
    const regionCount = state.regions.length
    let agencyControlled = 0, hostileControlled = 0, knownRegions = 0
    for (const region of state.regions) {
      if (state.control[region] === 'agency') agencyControlled++
      if (state.control[region] === 'hostile') hostileControlled++
      if (state.knowledge[region]?.tier === 'confirmed') knownRegions++
    }
    return { regionCount, agencyControlled, hostileControlled, knownRegions }
  })()

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
    overstretchedTeamCount: fieldStatusViews.filter((view) => view.status === 'overstretched').length,
    // Emergency governance surfacing
    emergencyActive: !!emergency.active,
    emergencyExpiresWeek: emergency.expiresWeek,
    emergencyActivatedWeek: emergency.activatedWeek,
    emergencyEffects: emergency.effects,
    emergencyTriggeredBy: emergency.triggeredBy,
    campaignGovernance,
    territorialPower,
    supplyNetwork,
    regional,
  }
}



export function getLatestReportSummary(game: GameState) {
  const latestReport = getVisibleReports(game.reports).at(-1)

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
  const reports = getVisibleReports(game.reports)
  const resolvedCount = reports.reduce((sum, report) => sum + report.resolvedCases.length, 0)
  const failedCount = reports.reduce((sum, report) => sum + report.failedCases.length, 0)
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
