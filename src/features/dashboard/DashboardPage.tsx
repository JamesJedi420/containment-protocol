import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { IconAdvance, IconCopy, IconReset } from '../../components/icons'
import {
  CONFIG_FIELDS,
  DASHBOARD_ACTIONS,
  DASHBOARD_CONFIRM,
  DASHBOARD_HALT_GUIDANCE,
  DASHBOARD_PRESET_LABELS,
  DASHBOARD_SECTIONS,
  DASHBOARD_STAT_LABELS,
  EMPTY_STATES,
  FEEDBACK_MESSAGES,
  GAME_OVER_REASONS,
} from '../../data/copy'
import { createStartingState } from '../../data/startingState'
import {
  getWeeklyDirectiveDefinition,
  getWeeklyDirectiveDefinitions,
} from '../../domain/directives'
import { formatLatestReportRollup } from '../../domain/reportNotes'
import { RunTransferPanel } from './RunTransferPanel'
import { buildAgencyOverview, formatCadenceSummary } from '../../domain/strategicState'
import { EventFeedPanel } from './EventFeedPanel'
import { OperationsDeskPanels } from './OperationsDeskPanels'
import {
  getDashboardMetrics,
  getLatestReportSummary,
  getPriorityCaseViews,
  getAtRiskTeamViews,
} from './dashboardView'
import { TrendSummaryPanel } from './TrendSummaryPanelProjection'
import { getDashboardRunTrendSummary } from './dashboardReportProjection'
import { OperationsLeftPanel } from './OperationsLeftPanelProjection'

const presetConfigs = {
  forgiving: {
    ...createStartingState().config,
    maxActiveCases: 9,
    partialMargin: 18,
    stageScalar: 1.05,
    attritionPerWeek: 3,
    probabilityK: 2.2,
    raidCoordinationPenaltyPerExtraTeam: 0.05,
  },
  standard: createStartingState().config,
  nightmare: {
    ...createStartingState().config,
    maxActiveCases: 5,
    partialMargin: 12,
    stageScalar: 1.35,
    challengeModeEnabled: true,
    durationModel: 'attrition' as const,
    attritionPerWeek: 5,
    probabilityK: 2.75,
    raidCoordinationPenaltyPerExtraTeam: 0.12,
  },
} as const

type StatusMessage = {
  kind: 'info' | 'success' | 'error'
  message: string
}

export default function DashboardPage() {
  const { game, advanceWeek, reset, setSeed, setWeeklyDirective, updateConfig } = useGameStore()
  const [seedFeedback, setSeedFeedback] = useState<StatusMessage>({
    kind: 'info',
    message: FEEDBACK_MESSAGES.seedInfo,
  })
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const feedbackTimeoutRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current !== undefined) {
        window.clearTimeout(feedbackTimeoutRef.current)
      }
    }
  }, [])

  const metrics = getDashboardMetrics(game)
  // Use the real or mocked dashboard view selectors
  const priorityCases = getPriorityCaseViews(game)
  const atRiskTeams = getAtRiskTeamViews(game)
  const latestReportSummary = getLatestReportSummary(game)
  const trendSummary = getDashboardRunTrendSummary(game)
  const directiveDefinitions = getWeeklyDirectiveDefinitions()
  const haltedReason = game.gameOverReason ?? GAME_OVER_REASONS.breachState
  const haltGuidance = DASHBOARD_HALT_GUIDANCE[haltedReason] ?? DASHBOARD_HALT_GUIDANCE.default

  function queueSeedFeedback(kind: StatusMessage['kind'], message: string) {
    if (feedbackTimeoutRef.current !== undefined) {
      window.clearTimeout(feedbackTimeoutRef.current)
    }

    setSeedFeedback({ kind, message })

    feedbackTimeoutRef.current = window.setTimeout(() => {
      setSeedFeedback({
        kind: 'info',
        message: FEEDBACK_MESSAGES.seedInfo,
      })
    }, 1200)
  }

  async function handleCopySeed() {
    try {
      if (!navigator.clipboard?.writeText) {
        queueSeedFeedback('error', FEEDBACK_MESSAGES.seedUnavailable)
        return
      }

      await navigator.clipboard.writeText(String(game.rngSeed))
      queueSeedFeedback('success', FEEDBACK_MESSAGES.seedCopied)
    } catch {
      queueSeedFeedback('error', FEEDBACK_MESSAGES.seedUnavailable)
    }
  }

  function handleSeedChange(value: string) {
    setSeed(Number(value))
  }

  function handleNewSeed() {
    setSeed(Date.now())
  }

  function applyPreset(preset: keyof typeof presetConfigs) {
    setShowResetConfirm(false)
    updateConfig(presetConfigs[preset])
  }

  function updateNumberField<K extends NumericConfigField>(field: K, value: string) {
    setShowResetConfirm(false)
    updateConfig({
      [field]: Number(value),
    } as Pick<typeof game.config, K>)
  }

  // Build agency overview for cadence/extra check surfacing
  const overview = buildAgencyOverview(game)
  const cadenceSummary = formatCadenceSummary(overview)

  return (
    <section className="space-y-6">
      {/* Escalation/Pressure Cadence & Extra Checks Summary Panel */}
      <section className="panel space-y-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Escalation & Pressure Cadence</h2>
          <p className="text-sm opacity-60">Systemic cadence, bounded checks, and urgent escalations surfaced for this week.</p>
        </div>
        <ul className="text-xs opacity-80 space-y-1">
          {cadenceSummary.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </section>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStatLink
          label={DASHBOARD_STAT_LABELS.open}
          value={metrics.open}
          to={APP_ROUTES.cases}
          tone="warning"
        />
        <DashboardStatLink
          label={DASHBOARD_STAT_LABELS.inProgress}
          value={metrics.inProgress}
          to={APP_ROUTES.cases}
          tone="info"
        />
        <DashboardStatLink
          label={DASHBOARD_STAT_LABELS.resolved}
          value={metrics.resolved}
          to={APP_ROUTES.report}
          tone="neutral"
        />
        <DashboardStatLink
          label={DASHBOARD_STAT_LABELS.score}
          value={metrics.totalScore}
          to={APP_ROUTES.report}
          tone="neutral"
        />
        <DashboardStatLink
          label={DASHBOARD_STAT_LABELS.avgFatigue}
          value={metrics.avgFatigue}
          to={APP_ROUTES.teams}
          tone="warning"
        />
        <DashboardStatLink
          label={DASHBOARD_STAT_LABELS.maxStage}
          value={metrics.maxStage}
          to={APP_ROUTES.cases}
          tone={metrics.maxStage >= 4 ? 'danger' : metrics.maxStage >= 3 ? 'warning' : 'neutral'}
        />
        <DashboardStatLink
          label={DASHBOARD_STAT_LABELS.deadlineRisk}
          value={metrics.deadlineRiskCount}
          to={APP_ROUTES.cases}
          tone={metrics.deadlineRiskCount > 0 ? 'warning' : 'neutral'}
        />
        <DashboardStatLink
          label={DASHBOARD_STAT_LABELS.criticalStage}
          value={metrics.criticalStageCount}
          to={APP_ROUTES.cases}
          tone={metrics.criticalStageCount > 0 ? 'danger' : 'neutral'}
        />
        <DashboardStatLink
          label={DASHBOARD_STAT_LABELS.raidUnderstaffed}
          value={metrics.raidUnderstaffedCount}
          to={APP_ROUTES.cases}
          tone={metrics.raidUnderstaffedCount > 0 ? 'danger' : 'neutral'}
        />
        <DashboardStatLink
          label={DASHBOARD_STAT_LABELS.overstretchedTeams}
          value={metrics.overstretchedTeamCount}
          to={APP_ROUTES.teams}
          tone={metrics.overstretchedTeamCount > 0 ? 'danger' : 'neutral'}
        />
      </div>

      <section
        className="panel panel-primary space-y-4"
        role="region"
        aria-label="Simulation controls"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">{DASHBOARD_SECTIONS.simulationControls}</h2>
            <p className="text-sm opacity-60">
              Tune balance, advance the calendar, and manage reproducible seeds.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyPreset('forgiving')}
              className="btn btn-sm btn-ghost"
            >
              {DASHBOARD_PRESET_LABELS.forgiving}
            </button>
            <button
              type="button"
              onClick={() => applyPreset('standard')}
              className="btn btn-sm btn-ghost"
            >
              {DASHBOARD_PRESET_LABELS.standard}
            </button>
            <button
              type="button"
              onClick={() => applyPreset('nightmare')}
              className="btn btn-sm btn-ghost"
            >
              {DASHBOARD_PRESET_LABELS.nightmare}
            </button>
          </div>
        </div>

        <div className="space-y-3 rounded border border-white/10 px-3 py-3">
          <div className="space-y-1">
            <h3 className="text-base font-semibold">Weekly directive</h3>
            <p className="text-sm opacity-60">
              Choose one command posture to apply on the next weekly tick.
            </p>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {directiveDefinitions.map((directive) => {
              const selected = game.directiveState.selectedId === directive.id

              return (
                <button
                  key={directive.id}
                  type="button"
                  onClick={() => setWeeklyDirective(selected ? null : directive.id)}
                  className={`rounded border px-3 py-3 text-left transition ${
                    selected
                      ? 'border-cyan-300/50 bg-cyan-500/10'
                      : 'border-white/10 bg-transparent hover:bg-white/5'
                  }`}
                  data-selected={selected ? 'true' : 'false'}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{directive.label}</p>
                      <p className="text-sm opacity-70">{directive.summary}</p>
                    </div>
                    <span className="text-xs uppercase tracking-wide opacity-50">
                      {selected ? 'Selected' : 'Available'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm opacity-70">{directive.detail}</p>
                  <ul className="mt-2 space-y-1 text-xs opacity-60">
                    {directive.effects.map((effect) => (
                      <li key={effect}>• {effect}</li>
                    ))}
                  </ul>
                </button>
              )
            })}
          </div>
          {game.directiveState.history.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide opacity-40">Recent directives</p>
              <div className="flex flex-wrap gap-2">
                {game.directiveState.history
                  .slice(-3)
                  .reverse()
                  .map((entry) => {
                    const def = getWeeklyDirectiveDefinition(entry.directiveId)
                    return (
                      <span
                        key={`${entry.week}-${entry.directiveId}`}
                        className="rounded-full border border-white/10 px-2 py-0.5 text-xs opacity-60"
                      >
                        Week {entry.week} — {def?.label ?? entry.directiveId}
                      </span>
                    )
                  })}
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <label
              htmlFor="dashboard-seed"
              className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50"
            >
              {CONFIG_FIELDS.seed}
            </label>
            <input
              id="dashboard-seed"
              type="number"
              className="form-input"
              value={game.rngSeed}
              onChange={(event) => {
                setShowResetConfirm(false)
                handleSeedChange(event.target.value)
              }}
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="dashboard-stage-scalar"
              className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50"
            >
              {CONFIG_FIELDS.stageScalar}
            </label>
            <input
              id="dashboard-stage-scalar"
              type="number"
              step="0.01"
              className="form-input"
              value={game.config.stageScalar}
              onChange={(event) => updateNumberField('stageScalar', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="dashboard-partial-margin"
              className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50"
            >
              {CONFIG_FIELDS.partialMargin}
            </label>
            <input
              id="dashboard-partial-margin"
              type="number"
              className="form-input"
              value={game.config.partialMargin}
              onChange={(event) => updateNumberField('partialMargin', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="dashboard-active-cap"
              className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50"
            >
              {CONFIG_FIELDS.activeCap}
            </label>
            <input
              id="dashboard-active-cap"
              type="number"
              className="form-input"
              value={game.config.maxActiveCases}
              onChange={(event) => updateNumberField('maxActiveCases', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="dashboard-attrition-per-week"
              className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50"
            >
              {CONFIG_FIELDS.attritionPerWeek}
            </label>
            <input
              id="dashboard-attrition-per-week"
              type="number"
              className="form-input"
              value={game.config.attritionPerWeek}
              onChange={(event) => updateNumberField('attritionPerWeek', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="dashboard-probability-k"
              className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50"
            >
              {CONFIG_FIELDS.probabilityK}
            </label>
            <input
              id="dashboard-probability-k"
              type="number"
              step="0.01"
              className="form-input"
              value={game.config.probabilityK}
              onChange={(event) => updateNumberField('probabilityK', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="dashboard-raid-team-penalty"
              className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50"
            >
              {CONFIG_FIELDS.raidTeamPenalty}
            </label>
            <input
              id="dashboard-raid-team-penalty"
              type="number"
              step="0.01"
              className="form-input"
              value={game.config.raidCoordinationPenaltyPerExtraTeam}
              onChange={(event) =>
                updateNumberField('raidCoordinationPenaltyPerExtraTeam', event.target.value)
              }
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="dashboard-duration-model"
              className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50"
            >
              {CONFIG_FIELDS.durationModel}
            </label>
            <select
              id="dashboard-duration-model"
              className="form-select"
              value={game.config.durationModel}
              disabled={!game.config.challengeModeEnabled}
              onChange={(event) =>
                updateConfig({
                  durationModel: event.target.value as typeof game.config.durationModel,
                })
              }
            >
              <option value="capacity">{CONFIG_FIELDS.durationModelCapacity}</option>
              <option value="attrition">{CONFIG_FIELDS.durationModelAttrition}</option>
            </select>
          </div>
        </div>

        <p className="text-sm opacity-60">
          {game.config.challengeModeEnabled
            ? CONFIG_FIELDS.durationModelUnlockedHint
            : CONFIG_FIELDS.durationModelLockedHint}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={handleCopySeed} className="btn btn-sm btn-ghost">
            <IconCopy className="h-4 w-4" aria-hidden="true" />
            {DASHBOARD_ACTIONS.copySeed}
          </button>
          <button type="button" onClick={handleNewSeed} className="btn btn-sm btn-ghost">
            {DASHBOARD_ACTIONS.newSeed}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowResetConfirm(false)
              advanceWeek()
            }}
            disabled={game.gameOver}
            className="btn btn-sm"
          >
            <IconAdvance className="h-4 w-4" aria-hidden="true" />
            {DASHBOARD_ACTIONS.advanceWeek}
          </button>
          <button
            type="button"
            onClick={() => setShowResetConfirm((current) => !current)}
            className="btn btn-sm btn-ghost"
          >
            <IconReset className="h-4 w-4" aria-hidden="true" />
            {DASHBOARD_ACTIONS.reset}
          </button>
        </div>

        {showResetConfirm ? (
          <div className="flex flex-wrap items-center gap-2 rounded border border-white/10 px-3 py-2">
            <p className="text-sm opacity-70">{DASHBOARD_CONFIRM.resetPrompt}</p>
            <button
              type="button"
              onClick={() => {
                reset()
                setShowResetConfirm(false)
              }}
              className="btn btn-sm"
            >
              {DASHBOARD_CONFIRM.confirmReset}
            </button>
            <button
              type="button"
              onClick={() => setShowResetConfirm(false)}
              className="btn btn-sm btn-ghost"
            >
              {DASHBOARD_CONFIRM.cancelReset}
            </button>
          </div>
        ) : null}

        {game.gameOver ? (
          <div
            className="rounded border border-red-300/30 bg-red-500/10 px-3 py-3"
            role="status"
            aria-label="Simulation halted guidance"
          >
            <p className="text-sm font-semibold text-red-200">{haltGuidance.title}</p>
            <p className="mt-1 text-sm text-red-100/90">{haltedReason}</p>
            <p className="mt-1 text-xs text-red-100/85">Next step: {haltGuidance.action}</p>
          </div>
        ) : null}

        <p
          aria-live="polite"
          className={
            seedFeedback.kind === 'error'
              ? 'text-sm text-red-300'
              : seedFeedback.kind === 'success'
                ? 'text-sm text-green-300'
                : 'text-sm opacity-60'
          }
        >
          {seedFeedback.message}
        </p>
      </section>

      <section
        className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]"
        role="region"
        aria-label="Priority operations"
      >
        <section className="panel panel-primary space-y-3">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Priority Queue</h2>
            <Link to={APP_ROUTES.cases} className="text-sm opacity-60 hover:opacity-100">
              Open cases
            </Link>
          </div>

          {priorityCases.length > 0 ? (
            <ul className="space-y-3">
              {priorityCases.map((view) => (
                <li key={view.currentCase.id} className="rounded border border-white/10 px-3 py-2">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium">
                        <Link
                          to={APP_ROUTES.caseDetail(view.currentCase.id)}
                          className="hover:underline"
                        >
                          {view.currentCase.title}
                        </Link>
                      </p>
                      <p className="text-sm opacity-60">
                        Stage {view.currentCase.stage} / Deadline{' '}
                        {view.currentCase.deadlineRemaining} / Success{' '}
                        {Math.round(view.bestSuccess * 100)}%
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {view.isUnassigned ? <Chip>Unassigned</Chip> : null}
                      {view.hasDeadlineRisk ? <Chip tone="warning">Deadline risk</Chip> : null}
                      {view.isBlockedByRequiredTags ? <Chip tone="danger">Tag blocked</Chip> : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm opacity-60">No urgent case pressure right now.</p>
          )}
        </section>

        <section className="panel panel-support space-y-3">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">At-risk Teams</h2>
            <Link to={APP_ROUTES.teams} className="text-sm opacity-60 hover:opacity-100">
              Open teams
            </Link>
          </div>

          {atRiskTeams.length > 0 ? (
            <ul className="space-y-3">
              {atRiskTeams.map((view) => (
                <li key={view.team.id} className="rounded border border-white/10 px-3 py-2">
                  <div className="space-y-1">
                    <p className="font-medium">
                      <Link to={APP_ROUTES.teamDetail(view.team.id)} className="hover:underline">
                        Response Unit {view.team.name}
                      </Link>
                    </p>
                    <p className="text-sm opacity-60">
                      Avg fatigue {view.capabilitySummary.averageFatigue} / {view.fatigueBand}
                    </p>
                    {view.assignedCase && 'id' in view.assignedCase ? (
                      <p className="text-sm opacity-60">
                        Assigned to:{' '}
                        <Link
                          to={APP_ROUTES.caseDetail(view.assignedCase.id)}
                          className="hover:underline"
                        >
                          {view.assignedCase.title}
                        </Link>
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm opacity-60">No stressed teams are currently flagged.</p>
          )}
        </section>
      </section>

      <section
        className="region-secondary grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)]"
        role="region"
        aria-label="Operations systems"
      >
        <div className="region-primary space-y-4">
          <OperationsLeftPanel />
          <EventFeedPanel />
        </div>
        <OperationsDeskPanels />
      </section>

      <RunTransferPanel />

      <section className="panel space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">{DASHBOARD_SECTIONS.latestReport}</h2>
          <Link to={APP_ROUTES.report} className="text-sm opacity-60 hover:opacity-100">
            All reports
          </Link>
        </div>

        {latestReportSummary ? (
        <LatestReportSummary score={latestReportSummary.score} />
      ) : (
          <p className="text-sm opacity-60">{EMPTY_STATES.noReports}</p>
        )}
      </section>

      <TrendSummaryPanel
        title="Run trends"
        subtitle="Recurring families, raid pressure, unresolved pressure points, and tag load across the current run."
        summary={trendSummary}
      />
    </section>
  )
}

function DashboardStatLink({
  label,
  value,
  to,
  tone = 'neutral',
}: {
  label: string
  value: number
  to: string
  tone?: 'neutral' | 'info' | 'warning' | 'danger'
}) {
  const toneClass =
    tone === 'danger'
      ? 'border-rose-400/30 bg-rose-500/8'
      : tone === 'warning'
        ? 'border-amber-400/30 bg-amber-500/8'
        : tone === 'info'
          ? 'border-cyan-400/30 bg-cyan-500/8'
          : 'border-white/10 bg-white/5'

  return (
    <div className={`panel panel-hi ${toneClass}`}>
      <Link to={to} className="block transition hover:opacity-100">
        <p className="text-label opacity-80">{label}</p>
        <p className="mt-2 text-stat">{value}</p>
      </Link>
    </div>
  )
}

function Chip({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'warning' | 'danger'
}) {
  const className =
    tone === 'danger'
      ? 'border-red-400/30 bg-red-500/10 text-red-200'
      : tone === 'warning'
        ? 'border-amber-400/30 bg-amber-500/10 text-amber-200'
        : 'border-white/10 bg-white/5 text-white/80'

  return <span className={`rounded-full border px-2 py-0.5 ${className}`}>{children}</span>
}

function LatestReportSummary({ score }: { score: number }) {
  const { game } = useGameStore()
  const latestReportSummary = getLatestReportSummary(game)

  if (!latestReportSummary) {
    return null
  }

  const { report } = latestReportSummary

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-medium">
          <Link to={APP_ROUTES.reportDetail(report.week)} className="hover:underline">
            Week {report.week}
          </Link>
        </p>
        <p className={score >= 0 ? 'text-green-300' : 'text-red-300'}>
          {score >= 0 ? '+' : ''}
          {score} {Math.abs(score) === 1 ? 'pt' : 'pts'}
        </p>
      </div>

      <p className="text-sm opacity-70">
        {formatLatestReportRollup(report)}
      </p>

      <p className="text-sm opacity-60">
        Avg Fatigue {report.avgFatigue} / Max Stage {report.maxStage} / RNG Before{' '}
        {report.rngStateBefore} -&gt; {report.rngStateAfter}
      </p>
    </div>
  )
}

type NumericConfigField =
  | 'stageScalar'
  | 'partialMargin'
  | 'maxActiveCases'
  | 'attritionPerWeek'
  | 'probabilityK'
  | 'raidCoordinationPenaltyPerExtraTeam'
