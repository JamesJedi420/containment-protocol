import { buildAgencySummary } from '../../domain/agency'
import { calcWeekScore } from '../../domain/sim/scoring'
import { type GameState } from '../../domain/models'
import { getVisibleReports } from '../../domain/reporting'

export interface ReportPageSummaryView {
  cumulativeScore: number
  agencySummaryLine: string
}

export interface ReportListEntryView {
  report: GameState['reports'][number]
  weekScore: number
}

export interface ReportPageView {
  isEmpty: boolean
  summary?: ReportPageSummaryView
  weeklyReports: ReportListEntryView[]
}

export function getReportPageView(game: GameState): ReportPageView {
  const reports = getVisibleReports(game.reports)

  if (reports.length === 0) {
    return {
      isEmpty: true,
      weeklyReports: [],
    }
  }

  const cumulativeScore = reports.reduce((sum, report) => sum + calcWeekScore(report), 0)
  const agencySummary = buildAgencySummary(game)

  // Expanded summary line to include new governance/economics fields
  const councilPower = Object.entries(agencySummary.councilPowerDistribution)
    .map(([council, pct]) => `${council}: ${pct}%`)
    .join(', ')
  const extendedSummaryLine =
    `${agencySummary.name}: reputation ${agencySummary.reputation}, ` +
    `pressure ${agencySummary.pressure.score} (${agencySummary.pressure.level}), ` +
    `stability ${agencySummary.stability.score} (${agencySummary.stability.level}), ` +
    `authority ${agencySummary.campaignGovernance.authority}, ` +
    `upkeep ${agencySummary.campaignGovernance.totalUpkeep}, ` +
    `chokepoint leverage ${agencySummary.chokepointLeverage}, ` +
    `council power [${councilPower}], ` +
    `external revenue share ${agencySummary.externalRevenueShare}`

  return {
    isEmpty: false,
    summary: {
      cumulativeScore,
      agencySummaryLine: extendedSummaryLine,
    },
    weeklyReports: [...reports].reverse().map((report) => ({
      report,
      weekScore: calcWeekScore(report),
    })),
  }
}
