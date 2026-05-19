import type { WeeklyReport } from '../../domain/models'

export interface ReportWeekNavigationView {
  readonly previousWeek?: number
  readonly nextWeek?: number
}

/** Adjacent report weeks that exist in `reports`, sorted ascending. */
export function buildReportWeekNavigation(
  reports: readonly Pick<WeeklyReport, 'week'>[],
  currentWeek: number
): ReportWeekNavigationView {
  const weeks = [...new Set(reports.map((entry) => entry.week))].sort((left, right) => left - right)
  const index = weeks.indexOf(currentWeek)

  if (index === -1) {
    return {}
  }

  return {
    previousWeek: index > 0 ? weeks[index - 1] : undefined,
    nextWeek: index < weeks.length - 1 ? weeks[index + 1] : undefined,
  }
}
