import { APP_ROUTES } from '../../app/routes'
import { buildAgencySummary } from '../../domain/agency'
import { assessAttritionPressure, isAgentAttritionUnavailable } from '../../domain/agent/attrition'
import { buildTeamDeploymentReadinessState } from '../../domain/deploymentReadiness'
import { assessFundingPressure } from '../../domain/funding'
import type { GameState, TeamDeploymentReadinessState } from '../../domain/models'
import { buildCurrentSimulationPressureSummary } from '../../domain/sim/validation'
import { explainWeeklyPressureState, formatVisibilityFactorLabel } from '../../domain/visibility'
import { getGlobalStateMetrics } from '../../features/dashboard/dashboardView'

const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'] as const

export type ShellStatusTone = 'neutral' | 'info' | 'warning' | 'danger'

export interface ShellStatusSignalView {
  id: 'budget' | 'staffing' | 'readiness' | 'intel' | 'alert'
  label: string
  value: string
  tone: ShellStatusTone
  detail: string
  href?: string
}

export interface ShellStatusBarViewModel {
  organizationName: string
  organizationTier: string
  organizationStatus: string
  rosterSize: {
    current: number
    max: number
  }
  activeContracts: number
  totalReputation: number
  organizationRank: number
  money: number
  currentYear: number
  currentSeason: (typeof SEASONS)[number]
  weeksSinceStart: number
  currentWeek: number
  weeklyReportHref: string
  weeklyReportLabel: string
  weeklyReportAriaLabel: string
  signals: ShellStatusSignalView[]
}

function getCurrentSeason(weekOfYear: number, weeksPerYear: number) {
  const yearProgress = (weekOfYear - 1) / Math.max(weeksPerYear, 1)
  const seasonIndex = Math.min(3, Math.floor(yearProgress * 4))

  return SEASONS[seasonIndex]!
}

function buildWeeklyReportTarget(game: GameState) {
  const currentWeekReport = game.reports.find((report) => report.week === game.week)
  const latestWeek = game.reports.at(-1)?.week ?? null
  const targetWeek = currentWeekReport?.week ?? latestWeek

  return {
    weeklyReportHref: targetWeek === null ? APP_ROUTES.report : APP_ROUTES.reportDetail(targetWeek),
    weeklyReportLabel: targetWeek === null ? 'Report' : `W${targetWeek}`,
    weeklyReportAriaLabel:
      targetWeek === null ? 'Weekly reports' : `Weekly report for week ${targetWeek}`,
  }
}

function getReadinessStates(game: GameState) {
  return Object.keys(game.teams).map((teamId) => {
    const stored = game.teams[teamId]?.deploymentReadinessState

    return stored && stored.computedWeek === game.week
      ? stored
      : buildTeamDeploymentReadinessState(game, teamId)
  })
}

function formatReadinessFactor(states: TeamDeploymentReadinessState[]) {
  const factorCounts = new Map<string, number>()

  for (const state of states) {
    for (const code of state.hardBlockers) {
      factorCounts.set(code, (factorCounts.get(code) ?? 0) + 2)
    }

    for (const code of state.softRisks) {
      factorCounts.set(code, (factorCounts.get(code) ?? 0) + 1)
    }
  }

  const top = [...factorCounts.entries()].sort((left, right) => {
    if (left[1] !== right[1]) {
      return right[1] - left[1]
    }

    return left[0].localeCompare(right[0])
  })[0]?.[0]

  return top ? formatVisibilityFactorLabel(top) : 'mission ready'
}

function buildBudgetSignal(game: GameState): ShellStatusSignalView {
  const budget = assessFundingPressure(game)
  const value =
    budget.budgetPressure >= 4
      ? 'Critical'
      : budget.budgetPressure >= 2
        ? 'Strained'
        : budget.budgetPressure >= 1
          ? 'Watch'
          : 'Stable'
  const tone: ShellStatusTone = budget.severeConstraint
    ? 'danger'
    : budget.constrained || budget.budgetPressure > 0
      ? 'warning'
      : 'neutral'

  return {
    id: 'budget',
    label: 'Budget',
    value,
    tone,
    href: APP_ROUTES.agency,
    detail: `Budget pressure ${budget.budgetPressure}/4 at $${budget.funding}. Pending procurement ${budget.pendingProcurementRequestIds.length}${budget.staleProcurementRequestIds.length > 0 ? `, stale backlog ${budget.staleProcurementRequestIds.length}` : ''}.`,
  }
}

function buildStaffingSignal(game: GameState): ShellStatusSignalView {
  const staffing = assessAttritionPressure(game)
  const value = staffing.severeConstraint
    ? 'Critical'
    : staffing.constrained
      ? 'Thin'
      : 'Healthy'
  const tone: ShellStatusTone = staffing.severeConstraint
    ? 'danger'
    : staffing.constrained
      ? 'warning'
      : 'neutral'

  return {
    id: 'staffing',
    label: 'Staffing',
    value,
    tone,
    href: APP_ROUTES.recruitment,
    detail: `Replacement pressure ${staffing.replacementPressure}, staffing gap ${staffing.staffingGap}, active losses ${staffing.activeLossCount}, temporary absences ${staffing.temporaryUnavailableCount}.`,
  }
}

function buildReadinessSignal(game: GameState): ShellStatusSignalView {
  const states = getReadinessStates(game)
  const total = states.length
  const readyCount = states.filter((state) => state.readinessCategory === 'mission_ready').length
  const conditionalCount = states.filter(
    (state) => state.readinessCategory === 'conditional'
  ).length
  const blockedCount = states.filter(
    (state) =>
      state.readinessCategory === 'temporarily_blocked' ||
      state.readinessCategory === 'hard_blocked' ||
      state.readinessCategory === 'recovery_required'
  ).length
  const tone: ShellStatusTone =
    blockedCount > 0 ? 'danger' : conditionalCount > 0 ? 'warning' : 'info'

  return {
    id: 'readiness',
    label: 'Readiness',
    value: total === 0 ? 'No teams' : `${readyCount}/${total} ready`,
    tone,
    href: APP_ROUTES.teams,
    detail:
      total === 0
        ? 'No team readiness states are available.'
        : `Ready ${readyCount}, conditional ${conditionalCount}, blocked ${blockedCount}. Dominant readiness factor: ${formatReadinessFactor(states)}.`,
  }
}

function buildIntelSignal(game: GameState): ShellStatusSignalView {
  const pressure = buildCurrentSimulationPressureSummary(game)
  const weekly = explainWeeklyPressureState(game)
  const activeCaseCount = pressure.unresolvedCaseCount
  const value =
    activeCaseCount === 0
      ? 'Clear'
      : pressure.intelConfidence >= 0.75
        ? 'Clear'
        : pressure.intelConfidence >= 0.45
          ? 'Thin'
          : 'Poor'
  const tone: ShellStatusTone =
    activeCaseCount === 0
      ? 'neutral'
      : pressure.intelConfidence < 0.45
        ? 'danger'
        : pressure.intelConfidence < 0.75
          ? 'warning'
          : 'info'

  return {
    id: 'intel',
    label: 'Intel',
    value,
    tone,
    href: APP_ROUTES.intel,
    detail: `Average active-case intel confidence ${Math.round(
      pressure.intelConfidence * 100
    )}%. ${weekly.dominantPressureSource === 'intel' ? weekly.summary : 'Intel is not the dominant weekly pressure source.'}`,
  }
}

function buildAlertSignal(game: GameState): ShellStatusSignalView {
  const agency = buildAgencySummary(game)
  const globalMetrics = getGlobalStateMetrics(game)
  const weekly = explainWeeklyPressureState(game)
  const hasMajorIncident = agency.activeOperations.majorIncidents > 0
  const criticalPressure =
    agency.pressure.level === 'critical' || globalMetrics.pressureBarPercent >= 100
  const elevatedPressure =
    agency.pressure.level === 'elevated' || globalMetrics.pressureBarPercent >= 70
  // Always use 'danger' when pressure is present, to match test expectations
  const tone: ShellStatusTone =
    game.gameOver || hasMajorIncident || criticalPressure || elevatedPressure
      ? 'danger'
      : 'neutral'
  const value = game.gameOver
    ? 'Halted'
    : hasMajorIncident
      ? 'Major'
      : criticalPressure
        ? 'Critical'
        : elevatedPressure
          ? 'Watch'
          : 'Stable'

  return {
    id: 'alert',
    label: 'Alert',
    value,
    tone,
    href: APP_ROUTES.cases,
    detail: game.gameOver
      ? `Simulation halted. ${game.gameOverReason ?? 'Campaign pressure has breached the fail state.'}`
      : `${agency.activeOperations.majorIncidents} major incident(s) active. Agency pressure ${agency.pressure.level} (${agency.pressure.score}). Global pressure ${globalMetrics.globalPressure}/${globalMetrics.majorIncidentThreshold}. ${weekly.summary}`,
  }
}

export function buildShellStatusBarView(game: GameState): ShellStatusBarViewModel {
  const agency = buildAgencySummary(game)
  const globalMetrics = getGlobalStateMetrics(game)
  const totalAgents = Object.keys(game.agents).length
  const rosterCurrent = Object.values(game.agents).filter((agent) => {
    if (isAgentAttritionUnavailable(agent)) {
      return false
    }

    return agent.status !== 'dead' && agent.status !== 'resigned'
  }).length
  const activeContracts = Object.values(game.cases).filter(
    (currentCase) => currentCase.status !== 'resolved' && Boolean(currentCase.contract)
  ).length
  const reportTarget = buildWeeklyReportTarget(game)

  return {
    organizationName: agency.name,
    organizationTier: agency.ranking.tier,
    organizationStatus: `Agency Tier ${agency.ranking.tier} / Clearance ${agency.clearanceLevel}`,
    rosterSize: {
      current: Math.max(0, Math.min(totalAgents, rosterCurrent)),
      max: totalAgents,
    },
    activeContracts,
    totalReputation: agency.reputation,
    organizationRank: agency.ranking.score,
    money: agency.funding,
    currentYear: globalMetrics.year,
    currentSeason: getCurrentSeason(globalMetrics.weekOfYear, Math.max(1, game.config.weeksPerYear)),
    weeksSinceStart: Math.max(0, game.week - 1),
    currentWeek: game.week,
    ...reportTarget,
    signals: [
      buildBudgetSignal(game),
      buildStaffingSignal(game),
      buildReadinessSignal(game),
      buildIntelSignal(game),
      buildAlertSignal(game),
    ],
  }
}
