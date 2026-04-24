import { clamp } from './math'
import type { CaseInstance, GameState, SupportStaffSummary } from './models'
import {
  isAggregateBattleCampaignSummary,
  rollupAggregateBattleCampaignSummaries,
} from './aggregateBattle'
import { buildFactionStates } from './factions'
import { buildLogisticsOverview } from './logistics'
import { buildMajorIncidentProfile } from './majorIncidents'
import { buildAgencyRanking, type AgencyRankingTier } from './rankings'
import { getTeamAssignedCaseId, getTeamMemberIds } from './teamSimulation'

const DEFAULT_AGENCY_NAME = 'Containment Protocol'

export interface AgencyTeamSummary {
  total: number
  ready: number
  assigned: number
  recovering: number
  understaffed: number
}

export interface AgencyOperationsSummary {
  activeCases: number
  inProgressCases: number
  majorIncidents: number
  activeTeams: number
  openOperationSlots: number
}

export interface AgencyPressureSummary {
  score: number
  level: 'low' | 'elevated' | 'critical'
  incident: number
  faction: number
  operations: number
  market: number
  unresolvedMomentum: number
}

export interface AgencyStabilitySummary {
  score: number
  level: 'stable' | 'strained' | 'fragile'
  containment: number
  funding: number
  readiness: number
  logistics: number
  pressureDrag: number
}

export interface AgencyReportSummary {
  latestWeek: number | null
  resolved: number
  partial: number
  failed: number
  unresolved: number
  notes: number
  battles: number
  friendlyRouted: number
  hostileRouted: number
  specialDamaged: number
}

export interface AgencySummary {
  name: string
  reputation: number
  funding: number
  containmentRating: number
  clearanceLevel: number
  supportStaff?: SupportStaffSummary
  teams: AgencyTeamSummary
  activeOperations: AgencyOperationsSummary
  pressure: AgencyPressureSummary
  stability: AgencyStabilitySummary
  ranking: {
    score: number
    tier: AgencyRankingTier
  }
  report: AgencyReportSummary
  // Commercial Chokepoint Statecraft & Council Power (issue #187)
  chokepointLeverage: number // 0-100, deterministic
  councilPowerDistribution: { [council: string]: number } // deterministic, sum to 100
  externalRevenueShare: number // 0-100, deterministic
}

function getAgencyState(game: GameState) {
  return (
    game.agency ?? {
      containmentRating: game.containmentRating,
      clearanceLevel: game.clearanceLevel,
      funding: game.funding,
    }
  )
}

function getOpenCases(game: GameState) {
  return Object.values(game.cases).filter((currentCase) => currentCase.status !== 'resolved')
}

function getCasePressureScore(currentCase: CaseInstance) {
  return (
    currentCase.stage * 12 +
    (currentCase.kind === 'raid' ? 18 : 0) +
    Math.max(0, 3 - currentCase.deadlineRemaining) * 8 +
    (currentCase.status === 'in_progress' ? 4 : 0)
  )
}

function getRecentUnresolvedMomentum(game: GameState) {
  return game.reports
    .slice(-3)
    .reduce((sum, report) => sum + report.unresolvedTriggers.length + report.failedCases.length, 0)
}

function getMarketPressureModifier(pressure: GameState['market']['pressure']) {
  if (pressure === 'tight') {
    return 18
  }

  if (pressure === 'discounted') {
    return -8
  }

  return 0
}

function buildAgencyTeamSummary(game: GameState): AgencyTeamSummary {
  const teams = Object.values(game.teams)

  return {
    total: teams.length,
    ready: teams.filter((team) => (team.status?.state ?? 'ready') === 'ready').length,
    assigned: teams.filter((team) =>
      ['deployed', 'resolving'].includes(team.status?.state ?? 'ready')
    ).length,
    recovering: teams.filter((team) => (team.status?.state ?? 'ready') === 'recovering').length,
    understaffed: teams.filter((team) => getTeamMemberIds(team).length < 2).length,
  }
}

function buildAgencyOperationsSummary(game: GameState): AgencyOperationsSummary {
  const openCases = getOpenCases(game)
  const majorIncidents = openCases.filter((currentCase) =>
    buildMajorIncidentProfile(currentCase)
  ).length
  const activeTeams = Object.values(game.teams).filter((team) =>
    Boolean(getTeamAssignedCaseId(team))
  ).length

  return {
    activeCases: openCases.length,
    inProgressCases: openCases.filter((currentCase) => currentCase.status === 'in_progress').length,
    majorIncidents,
    activeTeams,
    openOperationSlots: Math.max(0, game.config.maxActiveCases - openCases.length),
  }
}

function buildAgencyPressureSummary(game: GameState): AgencyPressureSummary {
  const openCases = getOpenCases(game)
  const majorIncidentPressure = clamp(
    Math.round(
      openCases
        .filter((currentCase) => buildMajorIncidentProfile(currentCase))
        .reduce((sum, currentCase) => sum + getCasePressureScore(currentCase), 0) * 0.7
    ),
    0,
    100
  )
  const factionPressure = clamp(
    Math.round(
      buildFactionStates(game)
        .slice(0, 3)
        .reduce((sum, faction) => sum + faction.pressureScore, 0) / 5
    ),
    0,
    100
  )
  const operationLoad = clamp(
    Math.round((openCases.length / Math.max(1, game.config.maxActiveCases)) * 100),
    0,
    100
  )
  const unresolvedMomentum = clamp(getRecentUnresolvedMomentum(game) * 10, 0, 100)
  const market = Math.max(getMarketPressureModifier(game.market.pressure), 0)
  const score = clamp(
    Math.round(
      majorIncidentPressure * 0.4 +
        factionPressure * 0.25 +
        operationLoad * 0.2 +
        unresolvedMomentum * 0.1 +
        market
    ),
    0,
    100
  )

  return {
    score,
    level: score >= 70 ? 'critical' : score >= 35 ? 'elevated' : 'low',
    incident: majorIncidentPressure,
    faction: factionPressure,
    operations: operationLoad,
    market,
    unresolvedMomentum,
  }
}

function buildAgencyStabilitySummary(
  game: GameState,
  pressure: AgencyPressureSummary,
  teams: AgencyTeamSummary
): AgencyStabilitySummary {
  const agency = getAgencyState(game)
  const logistics = buildLogisticsOverview(game)
  const funding = clamp(Math.round(agency.funding / 2), 0, 100)
  const readiness =
    teams.total > 0 ? Math.round((teams.ready / Math.max(1, teams.total)) * 100) : 100
  const logisticsSupport = clamp(
    (logistics.totalStock >= 30
      ? 12
      : logistics.totalStock >= 15
        ? 8
        : logistics.totalStock >= 5
          ? 3
          : -6) +
      (game.market.pressure === 'discounted' ? 8 : game.market.pressure === 'stable' ? 4 : -8) -
      Math.min(logistics.queuedOrders, 4),
    -15,
    20
  )
  const pressureDrag = Math.round(pressure.score * 0.4)
  const score = clamp(
    Math.round(
      agency.containmentRating * 0.35 +
        funding * 0.2 +
        readiness * 0.25 +
        20 +
        logisticsSupport -
        pressureDrag
    ),
    0,
    100
  )

  return {
    score,
    level: score >= 70 ? 'stable' : score >= 45 ? 'strained' : 'fragile',
    containment: agency.containmentRating,
    funding,
    readiness,
    logistics: logisticsSupport,
    pressureDrag,
  }
}

function buildAgencyReportSummary(game: GameState): AgencyReportSummary {
  const latestReport = game.reports.at(-1)

  if (!latestReport) {
    return {
      latestWeek: null,
      resolved: 0,
      partial: 0,
      failed: 0,
      unresolved: 0,
      notes: 0,
      battles: 0,
      friendlyRouted: 0,
      hostileRouted: 0,
      specialDamaged: 0,
    }
  }

  const aggregateBattles = Object.values(latestReport.caseSnapshots ?? {}).flatMap((snapshot) =>
    isAggregateBattleCampaignSummary(snapshot.aggregateBattle) ? [snapshot.aggregateBattle] : []
  )
  const battleRollup = rollupAggregateBattleCampaignSummaries(aggregateBattles)

  return {
    latestWeek: latestReport.week,
    resolved: latestReport.resolvedCases.length,
    partial: latestReport.partialCases.length,
    failed: latestReport.failedCases.length,
    unresolved: latestReport.unresolvedTriggers.length,
    notes: latestReport.notes.length,
    battles: battleRollup.battleCount,
    friendlyRouted: battleRollup.friendlyRoutedCount,
    hostileRouted: battleRollup.hostileRoutedCount,
    specialDamaged: battleRollup.specialDamageCount,
  }
}

export function buildAgencySummary(game: GameState): AgencySummary {
  const agency = getAgencyState(game)
  const teams = buildAgencyTeamSummary(game)
  const pressure = buildAgencyPressureSummary(game)
  const stability = buildAgencyStabilitySummary(game, pressure, teams)
  const ranking = buildAgencyRanking(game)
  const averageFactionStanding = (() => {
    const factions = buildFactionStates(game)
    if (factions.length === 0) {
      return 0
    }
    return factions.reduce((sum, faction) => sum + faction.standing, 0) / factions.length
  })()

  // --- Deterministic placeholder logic for new fields ---
  // Chokepoint leverage: based on market pressure and major incidents
  const chokepointLeverage = clamp(Math.round((pressure.market + pressure.incident) / 2), 0, 100)
  // Council power: distribute based on top 3 factions' standing
  const factions = buildFactionStates(game)
  const councilPowerDistribution: { [council: string]: number } = {}
  const councilNames = factions.slice(0, 3).map((f) => f.name)
  const totalStanding =
    factions.slice(0, 3).reduce((sum, f) => sum + Math.max(0, f.standing), 0) || 1
  councilNames.forEach((name, i) => {
    const standing = Math.max(0, factions[i]?.standing ?? 0)
    councilPowerDistribution[name] = Math.round((standing / totalStanding) * 100)
  })
  // Normalize to sum to 100
  const sum = Object.values(councilPowerDistribution).reduce((a, b) => a + b, 0)
  if (sum !== 100 && sum > 0) {
    // Adjust the largest to make sum exactly 100
    const maxKey = Object.keys(councilPowerDistribution).reduce((a, b) =>
      councilPowerDistribution[a] > councilPowerDistribution[b] ? a : b
    )
    councilPowerDistribution[maxKey] += 100 - sum
  }
  // External revenue share: based on market pressure and funding
  const externalRevenueShare = clamp(
    Math.round((pressure.market + agency.funding / 1000) / 2),
    0,
    100
  )

  return {
    name: DEFAULT_AGENCY_NAME,
    reputation: clamp(
      Math.round(50 + ranking.breakdown.reputation.reputationDelta + averageFactionStanding * 2),
      0,
      100
    ),
    funding: agency.funding,
    containmentRating: agency.containmentRating,
    clearanceLevel: agency.clearanceLevel,
    ...(game.supportStaff ? { supportStaff: { ...game.supportStaff } } : {}),
    teams,
    activeOperations: buildAgencyOperationsSummary(game),
    pressure,
    stability,
    ranking: {
      score: ranking.score,
      tier: ranking.tier,
    },
    report: buildAgencyReportSummary(game),
    chokepointLeverage,
    councilPowerDistribution,
    externalRevenueShare,
  }
}
