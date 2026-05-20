import { Link, useLocation } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { CASE_UI_LABELS } from '../../data/copy'
import {
  buildDrillDownHrefWithFeedContext,
  getCaseWeeklyReportWeeks,
} from '../operations/operationsRouteDrillDown'

interface CaseWeeklyReportsPanelProps {
  caseId: string
}

export function CaseWeeklyReportsPanel({ caseId }: CaseWeeklyReportsPanelProps) {
  const { game } = useGameStore()
  const location = useLocation()
  const feedContextSearch = new URLSearchParams(location.search)
  const reportWeeks = getCaseWeeklyReportWeeks(game.reports, caseId)

  if (reportWeeks.length === 0) {
    return null
  }

  return (
    <article
      className="panel panel-support space-y-3"
      role="region"
      aria-label={CASE_UI_LABELS.caseWeeklyReports}
    >
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide opacity-50">{CASE_UI_LABELS.caseWeeklyReports}</p>
        <p className="text-sm opacity-60">{CASE_UI_LABELS.caseWeeklyReportsHint}</p>
      </div>
      <ul className="flex flex-wrap gap-2">
        {reportWeeks.map((week) => (
          <li key={week}>
            <Link
              to={buildDrillDownHrefWithFeedContext(
                APP_ROUTES.reportDetail(week),
                feedContextSearch
              )}
              className="btn btn-xs btn-ghost"
            >
              {CASE_UI_LABELS.caseWeeklyReportLink.replace('{week}', String(week))}
            </Link>
          </li>
        ))}
      </ul>
    </article>
  )
}
