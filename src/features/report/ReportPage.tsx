import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { REPORT_LABELS, EMPTY_STATES, REPORT_UI_TEXT, TOOLTIPS } from '../../data/copy'
import { TrendSummaryPanel } from './TrendSummaryPanel'
import { getRunTrendSummary } from './reportTrendView'
import { getReportPageView } from './reportView'

export default function ReportPage() {
  const { game } = useGameStore()
  const view = getReportPageView(game)

  if (view.isEmpty) {
    return (
      <section className="space-y-4">
        <div className="panel panel-support">
          <p className="opacity-50">{EMPTY_STATES.noReports}</p>
        </div>
      </section>
    )
  }

  const trendSummary = getRunTrendSummary(game)

  return (
    <section className="space-y-4">
      <div
        className="panel panel-primary flex items-center justify-between gap-4"
        role="region"
        aria-label="Report summary"
      >
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {REPORT_LABELS.cumulativeScore}: {view.summary!.cumulativeScore}
          </p>
          <p className="text-xs opacity-60">{view.summary!.agencySummaryLine}</p>
        </div>
      </div>

      <TrendSummaryPanel
        title="Run trends"
        subtitle="This slice reflects the full run so far."
        summary={trendSummary}
      />

      <ul className="space-y-3" aria-label="Weekly reports">
        {view.weeklyReports.map(({ report, weekScore }) => {
          return (
            <li key={report.week} className="panel panel-support space-y-2">
              <div className="flex justify-between gap-4">
                <p className="font-medium">
                  <Link to={APP_ROUTES.reportDetail(report.week)} className="hover:underline">
                    {REPORT_LABELS.week} {report.week}
                  </Link>
                </p>
                <p
                  className={`text-sm font-semibold ${
                    weekScore >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {weekScore >= 0 ? '+' : ''}
                  {weekScore} {REPORT_LABELS.points}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-1 text-sm opacity-70 sm:grid-cols-4">
                <span>
                  {REPORT_LABELS.new}: {report.newCases.length}
                </span>
                <span>
                  {REPORT_LABELS.progressed}: {report.progressedCases.length}
                </span>
                <span>
                  {REPORT_LABELS.partial}: {report.partialCases.length}
                </span>
                <span>
                  {REPORT_LABELS.resolved}: {report.resolvedCases.length}
                </span>
                <span>
                  {REPORT_LABELS.unresolved}: {report.unresolvedTriggers.length}
                </span>
                <span>
                  {REPORT_LABELS.spawned}: {report.spawnedCases.length}
                </span>
                <span>
                  {REPORT_LABELS.failed}: {report.failedCases.length}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1 text-sm opacity-60 sm:grid-cols-4">
                <span>
                  {REPORT_LABELS.avgFatigue}: {report.avgFatigue}
                </span>
                <span>
                  {REPORT_LABELS.maxStage}: {report.maxStage}
                </span>
                <span>
                  {REPORT_LABELS.rngBefore}: {report.rngStateBefore}
                </span>
                <span>
                  {REPORT_LABELS.rngAfter}: {report.rngStateAfter}
                </span>
              </div>

              {report.notes.length > 0 ? (
                <div className="space-y-1" title={TOOLTIPS['report.notes']}>
                  <p className="text-xs uppercase tracking-wide opacity-50">
                    {REPORT_UI_TEXT.notesHeader}
                  </p>
                  <ul className="space-y-1 text-sm opacity-60">
                    {report.notes.map((note) => (
                      <li key={note.id}>{note.content}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
