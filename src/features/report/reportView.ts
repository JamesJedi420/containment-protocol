import { buildAgencySummary } from '../../domain/agency'
import { calcWeekScore } from '../../domain/sim/scoring'
import { type GameState } from '../../domain/models'

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
  if (game.reports.length === 0) {
    return {
      isEmpty: true,
      weeklyReports: [],
    }
  }

  const cumulativeScore = game.reports.reduce((sum, report) => sum + calcWeekScore(report), 0)
  const agencySummary = buildAgencySummary(game)

  return {
    isEmpty: false,
    summary: {
      cumulativeScore,
      agencySummaryLine: `${agencySummary.name}: reputation ${agencySummary.reputation}, pressure ${agencySummary.pressure.score} (${agencySummary.pressure.level}), stability ${agencySummary.stability.score} (${agencySummary.stability.level})`,
    },
    weeklyReports: [...game.reports]
      .reverse()
      .map((report) => ({
        report,
        weekScore: calcWeekScore(report),
      })),
  }
}
