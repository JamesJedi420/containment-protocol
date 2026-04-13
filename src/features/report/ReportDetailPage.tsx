import { useState } from 'react'
import { useParams } from 'react-router'
import LocalNotFound from '../../app/LocalNotFound'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { calcWeekScore } from '../../domain/sim/scoring'
import { ReportCaseGroup, ReportTeamStatusList } from './reportDetailHelpers'
import { REPORT_LABELS, REPORT_UI_TEXT, SHELL_UI_TEXT, TOOLTIPS } from '../../data/copy'
import { TrendSummaryPanel } from './TrendSummaryPanel'
import { getRunTrendSummary } from './reportTrendView'
import {
  filterReportNotesByCategory,
  getAvailableReportNoteCategories,
  REPORT_NOTE_CATEGORY_LABELS,
  type ReportNoteCategory,
} from './reportNoteView'

export default function ReportDetailPage() {
  const { week } = useParams()
  const { game } = useGameStore()
  const [selectedNoteCategory, setSelectedNoteCategory] = useState<ReportNoteCategory | 'all'>(
    'all'
  )
  const reportWeek = Number(week)
  const report = Number.isInteger(reportWeek)
    ? game.reports.find((entry) => entry.week === reportWeek)
    : undefined

  if (!report) {
    return (
      <LocalNotFound
        title={SHELL_UI_TEXT.reportNotFoundTitle}
        message={SHELL_UI_TEXT.reportNotFoundMessage}
        backTo={APP_ROUTES.report}
        backLabel={SHELL_UI_TEXT.backToTemplate.replace('{label}', 'Reports')}
      />
    )
  }

  const existingCaseIds = new Set(Object.keys(game.cases))
  const currentCases = game.cases
  const caseSnapshots = report.caseSnapshots ?? {}
  const weekScore = calcWeekScore(report)
  const trendSummary = getRunTrendSummary(game, [report])
  const noteCategoryOptions = getAvailableReportNoteCategories(report.notes)
  const filteredNotes = filterReportNotesByCategory(report.notes, selectedNoteCategory)

  return (
    <section className="space-y-4">
      <article
        className="panel panel-primary space-y-4"
        role="region"
        aria-label="Weekly report dossier"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium">
            {REPORT_LABELS.week} {report.week}
          </p>
          <p
            className={`text-sm font-semibold ${weekScore >= 0 ? 'text-green-400' : 'text-red-400'}`}
          >
            {weekScore >= 0 ? '+' : ''}
            {weekScore} {REPORT_LABELS.points}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm opacity-70 sm:grid-cols-4">
          <span className="font-bold text-cyan-200">
            {REPORT_LABELS.new}: {report.newCases.length}
          </span>
          <span className="font-bold text-amber-200">
            {REPORT_LABELS.progressed}: {report.progressedCases.length}
          </span>
          <span className="font-bold text-rose-200">
            {REPORT_LABELS.partial}: {report.partialCases.length}
          </span>
          <span className="font-bold text-emerald-200">
            {REPORT_LABELS.resolved}: {report.resolvedCases.length}
          </span>
          <span>
            {REPORT_LABELS.failed}: {report.failedCases.length}
          </span>
          <span>
            {REPORT_LABELS.spawned}: {report.spawnedCases.length}
          </span>
          <span>
            {REPORT_LABELS.unresolved}: {report.unresolvedTriggers.length}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm opacity-60 sm:grid-cols-4">
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
          <span>
            Directive:{' '}
            {(report.notes.find((n) => n.type === 'directive.applied')?.metadata?.directiveLabel as
              | string
              | null
              | undefined) ?? 'None'}
          </span>
        </div>
      </article>

      <div className="detail-layout" role="region" aria-label="Report analysis layout">
        <div className="detail-main">
          <article
            className="panel panel-support space-y-2"
            role="region"
            aria-label="Weekly notes"
          >
            <div className="space-y-2" title={TOOLTIPS['report.notes']}>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <p className="text-xs uppercase tracking-wide opacity-50">
                  {REPORT_UI_TEXT.notesHeader}
                </p>
                <div className="space-y-1">
                  <label
                    htmlFor="report-note-category"
                    className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50"
                  >
                    {REPORT_UI_TEXT.noteCategoryLabel}
                  </label>
                  <select
                    id="report-note-category"
                    className="form-select"
                    value={selectedNoteCategory}
                    onChange={(event) =>
                      setSelectedNoteCategory(event.target.value as ReportNoteCategory | 'all')
                    }
                  >
                    <option value="all">{REPORT_UI_TEXT.allNoteCategories}</option>
                    {noteCategoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {REPORT_NOTE_CATEGORY_LABELS[category]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {filteredNotes.length > 0 ? (
                <ul className="space-y-1 text-sm opacity-60">
                  {filteredNotes.map((note) => (
                    <li key={note.id}>{note.content}</li>
                  ))}
                </ul>
              ) : report.notes.length > 0 ? (
                <p className="text-sm opacity-50">No notes match the selected category.</p>
              ) : (
                <p className="text-sm opacity-50">{REPORT_UI_TEXT.noNotesWeek}</p>
              )}
            </div>
          </article>

          <article className="panel panel-support space-y-2" role="region" aria-label="Trend brief">
            <TrendSummaryPanel
              title={`Week ${report.week} trend brief`}
              subtitle="This section uses only the current week's report slice and live state."
              summary={trendSummary}
            />
          </article>

          <article
            className="panel panel-support space-y-4"
            role="region"
            aria-label="Case outcomes"
          >
            <ReportCaseGroup
              title={REPORT_UI_TEXT.newCasesHeader}
              emptyLabel={REPORT_UI_TEXT.noNewCases}
              caseIds={report.newCases}
              existingCaseIds={existingCaseIds}
              currentCases={currentCases}
              snapshots={caseSnapshots}
            />
            <ReportCaseGroup
              title={REPORT_UI_TEXT.progressedCasesHeader}
              emptyLabel={REPORT_UI_TEXT.noProgressedCases}
              caseIds={report.progressedCases}
              existingCaseIds={existingCaseIds}
              currentCases={currentCases}
              snapshots={caseSnapshots}
            />
            <ReportCaseGroup
              title={REPORT_UI_TEXT.partialCasesHeader}
              emptyLabel={REPORT_UI_TEXT.noPartialCases}
              caseIds={report.partialCases}
              existingCaseIds={existingCaseIds}
              currentCases={currentCases}
              snapshots={caseSnapshots}
            />
            <ReportCaseGroup
              title={REPORT_UI_TEXT.resolvedCasesHeader}
              emptyLabel={REPORT_UI_TEXT.noResolvedCases}
              caseIds={report.resolvedCases}
              existingCaseIds={existingCaseIds}
              currentCases={currentCases}
              snapshots={caseSnapshots}
            />
            <ReportCaseGroup
              title={REPORT_UI_TEXT.failedCasesHeader}
              emptyLabel={REPORT_UI_TEXT.noFailedCases}
              caseIds={report.failedCases}
              existingCaseIds={existingCaseIds}
              currentCases={currentCases}
              snapshots={caseSnapshots}
            />
            <ReportCaseGroup
              title={REPORT_UI_TEXT.unresolvedCasesHeader}
              emptyLabel={REPORT_UI_TEXT.noUnresolvedCases}
              caseIds={report.unresolvedTriggers}
              existingCaseIds={existingCaseIds}
              currentCases={currentCases}
              snapshots={caseSnapshots}
            />
            <ReportCaseGroup
              title={REPORT_UI_TEXT.spawnedCasesHeader}
              emptyLabel={REPORT_UI_TEXT.noSpawnedCases}
              caseIds={report.spawnedCases}
              existingCaseIds={existingCaseIds}
              currentCases={currentCases}
              snapshots={caseSnapshots}
            />
          </article>
        </div>

        <aside className="detail-side" aria-label="Team status summary">
          <article className="panel panel-primary space-y-2" role="region" aria-label="Team status">
            <p className="text-xs uppercase tracking-wide opacity-50">
              {REPORT_UI_TEXT.teamStatusHeader}
            </p>
            <ReportTeamStatusList
              teamStatus={report.teamStatus}
              emptyLabel={REPORT_UI_TEXT.noTeamStatus}
              existingCaseIds={existingCaseIds}
              currentCases={currentCases}
              snapshots={caseSnapshots}
            />
          </article>
        </aside>
      </div>
    </section>
  )
}
