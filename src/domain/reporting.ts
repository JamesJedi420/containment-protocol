import type { WeeklyReport } from './models'

function hasBootstrapSnapshots(report: WeeklyReport) {
  if (!report.caseSnapshots) {
    return true
  }

  return Object.values(report.caseSnapshots).every(
    (snapshot) =>
      snapshot.status === 'open' &&
      snapshot.missionResult === undefined &&
      snapshot.rewardBreakdown === undefined &&
      snapshot.performanceSummary === undefined &&
      snapshot.powerImpact === undefined
  )
}

export function isBootstrapWeeklyReport(report: WeeklyReport) {
  return (
    report.week === 1 &&
    report.rngStateBefore === 1000 &&
    report.rngStateAfter === 1001 &&
    report.newCases.length === 0 &&
    report.progressedCases.length === 0 &&
    report.resolvedCases.length === 0 &&
    report.failedCases.length === 0 &&
    report.partialCases.length === 0 &&
    report.unresolvedTriggers.length === 0 &&
    report.spawnedCases.length === 0 &&
    report.maxStage === 1 &&
    report.avgFatigue === 0 &&
    report.teamStatus.length === 0 &&
    report.notes.length === 0 &&
    hasBootstrapSnapshots(report)
  )
}

export function getVisibleReports(reports: WeeklyReport[]) {
  if (reports.length === 0) {
    return reports
  }

  return isBootstrapWeeklyReport(reports[0]) ? reports.slice(1) : reports
}
