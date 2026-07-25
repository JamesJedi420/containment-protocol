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

  // Expanded summary line to include new governance/economics fields
  const councilPower = Object.entries(agencySummary.councilPowerDistribution)
    .map(([council, pct]) => `${council}: ${pct}%`)
    .join(', ')
  const extendedSummaryLine =
    `${agencySummary.name}: reputation ${agencySummary.reputation}, ` +
    `pressure ${agencySummary.pressure.score} (${agencySummary.pressure.level}), ` +
    `rival pressure ${agencySummary.rivalPressure.score} (${agencySummary.rivalPressure.band}; ` +
    `standing scale ${agencySummary.rivalPressure.falloutPenaltyScale}×; ` +
    `post-exposure ${agencySummary.rivalPressure.postExposurePosture} ` +
    `${agencySummary.rivalPressure.postExposureTrustDelta > 0 ? '+' : ''}${agencySummary.rivalPressure.postExposureTrustDelta}), ` +
    `cross-jurisdiction packets ${agencySummary.crossJurisdictionCoordination.packetCount}, ` +
    `hidden-cell interference ${
      agencySummary.hiddenCellInterference.active
        ? (() => {
            const parts: string[] = []
            if (agencySummary.hiddenCellInterference.fundingStolen > 0) {
              parts.push(`theft ${agencySummary.hiddenCellInterference.fundingStolen}`)
            }
            if (
              agencySummary.hiddenCellInterference.progressTimeRolledBack > 0 &&
              agencySummary.hiddenCellInterference.researchProjectId
            ) {
              parts.push(
                `research -${agencySummary.hiddenCellInterference.progressTimeRolledBack}wk ` +
                  `(${agencySummary.hiddenCellInterference.researchProjectId})`
              )
            }
            if (agencySummary.hiddenCellInterference.pressureAmplified > 0) {
              parts.push(`panic +${agencySummary.hiddenCellInterference.pressureAmplified}`)
            }
            if (agencySummary.hiddenCellInterference.maintenanceCompromised > 0) {
              parts.push(
                `infra -${agencySummary.hiddenCellInterference.maintenanceCompromised} maint`
              )
            }
            if (
              agencySummary.hiddenCellInterference.covertGrowthApplied > 0 ||
              agencySummary.hiddenCellInterference.detectionNarrowingApplied > 0
            ) {
              parts.push(
                `covert +${agencySummary.hiddenCellInterference.covertGrowthApplied}` +
                  ` (${agencySummary.hiddenCellInterference.detectionNarrowingBand})`
              )
            }
            if (parts.length === 0) {
              return `${agencySummary.hiddenCellInterference.rivalPressureBand} (no diversion)`
            }
            return `${agencySummary.hiddenCellInterference.rivalPressureBand} ${parts.join('; ')}`
          })()
        : 'inactive'
    }, ` +
    `stability ${agencySummary.stability.score} (${agencySummary.stability.level}), ` +
    `chokepoint leverage ${agencySummary.chokepointLeverage}, ` +
    `council power [${councilPower}], ` +
    `external revenue share ${agencySummary.externalRevenueShare}`

  return {
    isEmpty: false,
    summary: {
      cumulativeScore,
      agencySummaryLine: extendedSummaryLine,
    },
    weeklyReports: [...game.reports].reverse().map((report) => ({
      report,
      weekScore: calcWeekScore(report),
    })),
  }
}
