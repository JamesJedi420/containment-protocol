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
  const weeklyScores = view.weeklyReports.map(({ report, weekScore }) => ({ week: report.week, weekScore }))
  const positiveWeeks = weeklyScores.filter(({ weekScore }) => weekScore > 0).length
  const negativeWeeks = weeklyScores.filter(({ weekScore }) => weekScore < 0).length
  const neutralWeeks = weeklyScores.length - positiveWeeks - negativeWeeks
  const bestWeek = weeklyScores.reduce((best, current) =>
    current.weekScore > best.weekScore ? current : best
  )
  const worstWeek = weeklyScores.reduce((worst, current) =>
    current.weekScore < worst.weekScore ? current : worst
  )

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

      <article className="panel panel-support space-y-3" role="region" aria-label="Weekly report timeline summary">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Weekly timeline</h2>
          <p className="text-sm opacity-70">
            Scan week-over-week momentum, then open a dossier for full notes and team outcomes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-200">
            Positive weeks: {positiveWeeks}
          </span>
          <span className="rounded-full border border-red-400/30 bg-red-500/10 px-2 py-0.5 text-red-200">
            Negative weeks: {negativeWeeks}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-white/80">
            Neutral weeks: {neutralWeeks}
          </span>
        </div>
        <p className="text-xs opacity-70">
          Best week: {bestWeek.week} ({bestWeek.weekScore >= 0 ? '+' : ''}
          {bestWeek.weekScore} pts) · Worst week: {worstWeek.week} ({worstWeek.weekScore >= 0 ? '+' : ''}
          {worstWeek.weekScore} pts)
        </p>
      </article>

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
              <p className="text-xs opacity-60">
                {weekScore > 0
                  ? 'Status cue: Positive week'
                  : weekScore < 0
                    ? 'Status cue: Negative week'
                    : 'Status cue: Neutral week'}
              </p>

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
