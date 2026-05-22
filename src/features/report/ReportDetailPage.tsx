import {
  explainDecay,
  explainDefeatConditionKnowledge,
  explainFusion,
  explainHazardKnowledge,
  explainRelayChain,
} from '../../domain/explanations'
import { getKnowledgeKey, type KnowledgeState, type KnowledgeStateMap } from '../../domain/knowledge'
import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import LocalNotFound from '../../app/LocalNotFound'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { REPORT_LABELS, REPORT_UI_TEXT, SHELL_UI_TEXT, TOOLTIPS } from '../../data/copy'
import { calcWeekScore } from '../../domain/sim/scoring'
import { TrendSummaryPanel } from './TrendSummaryPanel'
import { ReportCaseGroup, ReportTeamStatusList } from './reportDetailHelpers'
import { getCaseTemplateFamily } from './reportIntelProjection'
import { getRunTrendSummary } from './reportTrendView'
import {
  filterReportNotesByCategory,
  getAvailableReportNoteCategories,
  REPORT_NOTE_CATEGORY_LABELS,
  type ReportNoteCategory,
} from './reportNoteView'
import {
  buildDrillDownHrefWithFeedContext,
  resolveOperationsBackTarget,
} from '../operations/operationsRouteDrillDown'
import { buildReportWeekNavigation } from './reportWeekNavigation'
import { buildOperationalCertaintyView } from '../../domain/operationalCertainty'

// --- Real-data knowledge/relay/fusion/decay UI helpers ---
type TeamSubjectKnowledge = {
  subjectId: string
  state: KnowledgeState
}

type TeamKnowledgeGroup = {
  teamId: string
  anomalies: TeamSubjectKnowledge[]
  hazards: TeamSubjectKnowledge[]
}

function buildTeamKnowledgeGroups(
  knowledge: KnowledgeStateMap,
  teamIds: string[],
  anomalyIds: string[],
  hazardIds: string[]
): TeamKnowledgeGroup[] {
  const groups: TeamKnowledgeGroup[] = []

  for (const teamId of teamIds) {
    const anomalies: TeamSubjectKnowledge[] = []
    for (const subjectId of anomalyIds) {
      const state = knowledge[getKnowledgeKey(teamId, subjectId)]
      if (state) anomalies.push({ subjectId, state })
    }
    const hazards: TeamSubjectKnowledge[] = []
    for (const subjectId of hazardIds) {
      const state = knowledge[getKnowledgeKey(teamId, subjectId)]
      if (state) hazards.push({ subjectId, state })
    }
    if (anomalies.length > 0 || hazards.length > 0) {
      groups.push({ teamId, anomalies, hazards })
    }
  }

  return groups
}

function getRelayChainExplanation(knowledgeState: KnowledgeState) {
  return explainRelayChain(knowledgeState)
}

function getDecayExplanation(knowledgeState: KnowledgeState) {
  return explainDecay(knowledgeState)
}

function getFusionExplanation(knowledgeState: KnowledgeState) {
  return explainFusion(knowledgeState)
}

function KnowledgeStateAnnotations({ state }: { state: KnowledgeState }) {
  const relayExplanation = getRelayChainExplanation(state)
  const decayExplanation = getDecayExplanation(state)
  const fusionExplanation = getFusionExplanation(state)

  return (
    <>
      {relayExplanation ? (
        <span className="ml-2 text-amber-300/80">{relayExplanation}</span>
      ) : null}
      {decayExplanation ? (
        <span className="ml-2 opacity-50">{decayExplanation}</span>
      ) : null}
      {fusionExplanation ? (
        <span className="ml-2 text-emerald-300/80">{fusionExplanation}</span>
      ) : null}
    </>
  )
}

export default function ReportDetailPage() {
  const { week } = useParams()
  const location = useLocation()
  const { game } = useGameStore()
  const [selectedNoteCategory, setSelectedNoteCategory] = useState<ReportNoteCategory | 'all'>(
    'all'
  )
  const locationSearch = new URLSearchParams(location.search)
  const reportWeek = Number(week)
  const report = Number.isInteger(reportWeek)
    ? game.reports.find((entry) => entry.week === reportWeek)
    : undefined

  if (!report) {
    const backTarget = resolveOperationsBackTarget(locationSearch, APP_ROUTES.report)

    return (
      <LocalNotFound
        title={SHELL_UI_TEXT.reportNotFoundTitle}
        message={SHELL_UI_TEXT.reportNotFoundMessage}
        backTo={backTarget.href}
        backLabel={
          backTarget.label || SHELL_UI_TEXT.backToTemplate.replace('{label}', 'Reports')
        }
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
  const weekNavigation = buildReportWeekNavigation(game.reports, report.week)
  const reportBackTarget = resolveOperationsBackTarget(locationSearch, APP_ROUTES.report)
  const certainty = buildOperationalCertaintyView(game)

  // --- Real-data knowledge/relay/ladder UI wiring ---
  // For each team in the report, show knowledge ladders and relay/decay/fusion for each anomaly/hazard
  const teamIds = Object.keys(game.teams)
  const anomalyIds = Object.keys(game.cases)
  // Hazards are cases whose template family is 'hazard-incident' or have a 'hazard' tag
  const hazardIds = Object.values(game.cases)
    .filter((currentCase) => {
      const template = game.templates[currentCase.templateId]
      return (
        getCaseTemplateFamily(currentCase.templateId) === 'hazard' ||
        template?.tags?.includes('hazard')
      )
    })
    .map((currentCase) => currentCase.id)
  const teamKnowledgeGroups = buildTeamKnowledgeGroups(
    game.knowledge,
    teamIds,
    anomalyIds,
    hazardIds
  )

  return (
    <section className="space-y-4">
      {reportBackTarget.label ? (
        <Link to={reportBackTarget.href} className="btn btn-sm btn-ghost w-fit">
          {reportBackTarget.label}
        </Link>
      ) : null}
      <article className="panel panel-primary space-y-4" role="region" aria-label="Weekly report dossier">
        {/* Knowledge ladders and relay/decay/fusion status — only rendered when data exists */}
        {teamKnowledgeGroups.length > 0 ? (
          <div className="rounded border border-white/10 bg-white/5 px-3 py-3 text-xs">
            <p className="font-semibold uppercase tracking-wide opacity-50">
              Knowledge Ladders &amp; Relay Status
            </p>
            <ul className="mt-2 space-y-2">
              {teamKnowledgeGroups.map(({ teamId, anomalies, hazards }) => (
                <li key={teamId}>
                  <p className="font-semibold opacity-70">Team {teamId}</p>
                  <ul className="ml-2 mt-1 space-y-1">
                    {anomalies.map(({ subjectId, state }) => (
                      <li key={subjectId}>
                        <span className="opacity-60">Anomaly {subjectId}:</span>{' '}
                        <span className="opacity-80">
                          {explainDefeatConditionKnowledge(game.knowledge, teamId, subjectId)}
                        </span>
                        <KnowledgeStateAnnotations state={state} />
                      </li>
                    ))}
                    {hazards.map(({ subjectId, state }) => (
                      <li key={subjectId}>
                        <span className="text-red-300/70">Hazard {subjectId}:</span>{' '}
                        <span className="opacity-80">{explainHazardKnowledge(state)}</span>
                        <KnowledgeStateAnnotations state={state} />
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {REPORT_LABELS.week} {report.week}
            </p>
            {weekNavigation.previousWeek !== undefined ||
            weekNavigation.nextWeek !== undefined ? (
              <nav
                className="flex flex-wrap items-center gap-3 text-sm"
                aria-label="Weekly report navigation"
              >
                {weekNavigation.previousWeek !== undefined ? (
                  <Link
                    to={buildDrillDownHrefWithFeedContext(
                      APP_ROUTES.reportDetail(weekNavigation.previousWeek),
                      locationSearch
                    )}
                    className="opacity-70 hover:underline"
                  >
                    {REPORT_UI_TEXT.previousWeekLink} ({weekNavigation.previousWeek})
                  </Link>
                ) : null}
                {weekNavigation.nextWeek !== undefined ? (
                  <Link
                    to={buildDrillDownHrefWithFeedContext(
                      APP_ROUTES.reportDetail(weekNavigation.nextWeek),
                      locationSearch
                    )}
                    className="opacity-70 hover:underline"
                  >
                    {REPORT_UI_TEXT.nextWeekLink} ({weekNavigation.nextWeek})
                  </Link>
                ) : null}
              </nav>
            ) : null}
          </div>
          <p className={`text-sm font-semibold ${weekScore >= 0 ? 'text-green-400' : 'text-red-400'}`}>
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

      <article
        className="panel panel-support space-y-3"
        role="region"
        aria-label="Operational certainty summary"
      >
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide opacity-50">Operational certainty</p>
          <p className="text-sm opacity-70">{certainty.summary}</p>
        </div>

        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide opacity-50">Map facts</p>
          <div className="flex flex-wrap gap-2 text-xs">
            {certainty.mapBuckets.map((bucket) => (
              <span
                key={bucket.id}
                className={`rounded-full border px-2 py-0.5 ${getCertaintyChipClassName(bucket.level)}`}
              >
                {bucket.label}: {bucket.count} · {bucket.reasonLabel}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide opacity-50">Registry facts</p>
          <div className="flex flex-wrap gap-2 text-xs">
            {certainty.registryBuckets.map((bucket) => (
              <span
                key={bucket.id}
                className={`rounded-full border px-2 py-0.5 ${getCertaintyChipClassName(bucket.level)}`}
              >
                {bucket.label}: {bucket.count} · {bucket.reasonLabel}
              </span>
            ))}
          </div>
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

function getCertaintyChipClassName(level: 'confirmed' | 'suspected' | 'inferred' | 'contradicted') {
  if (level === 'contradicted') {
    return 'border-red-400/30 bg-red-500/10 text-red-200'
  }
  if (level === 'suspected' || level === 'inferred') {
    return 'border-amber-400/30 bg-amber-500/10 text-amber-200'
  }
  if (level === 'confirmed') {
    return 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100'
  }
  return 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100'
}
