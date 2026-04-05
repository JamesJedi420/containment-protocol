import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { DASHBOARD_SECTIONS, EMPTY_STATES, OPERATIONS_DESK_TEXT } from '../../data/copy'
import { getOperationsDeskPanelsView } from './operationsDeskView'

export function OperationsDeskPanels() {
  const { game, queueFabrication } = useGameStore()
  const view = getOperationsDeskPanelsView(game)

  return (
    <div className="space-y-4">
      <section className="panel space-y-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{DASHBOARD_SECTIONS.fieldStatus}</h2>
          <p className="text-sm opacity-60">{OPERATIONS_DESK_TEXT.fieldStatusSubtitle}</p>
        </div>

        <ul className="space-y-3">
          {view.fieldStatusViews.map((entry) => {
            return (
              <li
                key={entry.team.id}
                className={`rounded border px-3 py-3 ${getFieldStatusToneClass(entry.status, entry.signals)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      <Link to={APP_ROUTES.teamDetail(entry.team.id)} className="hover:underline">
                        {entry.team.name}
                      </Link>
                    </p>
                    <p className="text-xs opacity-50">
                      {OPERATIONS_DESK_TEXT.agentsLabel}: {entry.agentCount}
                    </p>
                  </div>
                  <StatusBadge status={entry.status} />
                </div>

                <div className="mt-3 grid gap-2 text-sm">
                  <div className="flex flex-wrap gap-2 text-xs">
                    {entry.signals.deadlineRisk ? (
                      <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-amber-100">
                        Deadline risk
                      </span>
                    ) : null}
                    {entry.signals.criticalStage ? (
                      <span className="rounded-full border border-rose-400/30 bg-rose-500/10 px-2 py-0.5 text-rose-100">
                        Critical stage
                      </span>
                    ) : null}
                    {entry.signals.raidUnderstaffed ? (
                      <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-2 py-0.5 text-fuchsia-100">
                        Raid understaffed
                      </span>
                    ) : null}
                  </div>
                  <p className="opacity-70">
                    {OPERATIONS_DESK_TEXT.agentsLabel}:{' '}
                    {entry.agentNames.length > 0
                      ? entry.agentNames.join(', ')
                      : `${entry.agentCount} ${entry.agentCount === 1 ? 'agent' : 'agents'}`}
                  </p>
                  <p className="opacity-70">
                    {OPERATIONS_DESK_TEXT.assignedCaseLabel}:{' '}
                    {entry.assignedCase ? (
                      <Link
                        to={APP_ROUTES.caseDetail(entry.assignedCase.id)}
                        className="text-white/90 hover:underline"
                      >
                        {entry.assignedCase.title}
                      </Link>
                    ) : (
                      <span className="opacity-50">{EMPTY_STATES.noAssignment}</span>
                    )}
                  </p>
                  <p className="opacity-70">
                    {OPERATIONS_DESK_TEXT.progressLabel}: {entry.progressPercent}%
                  </p>
                  <progress
                    className="queue-progress"
                    max={100}
                    value={entry.progressPercent}
                    aria-label={`${entry.team.name} ${OPERATIONS_DESK_TEXT.progressLabel}`}
                  >
                    {entry.progressPercent}
                  </progress>
                  <p className="opacity-70">
                    {OPERATIONS_DESK_TEXT.remainingLabel}:{' '}
                    {entry.remainingWeeks !== undefined
                      ? `${entry.remainingWeeks}w`
                      : EMPTY_STATES.noAssignment}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="panel space-y-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{DASHBOARD_SECTIONS.advisory}</h2>
          <p className="text-sm opacity-60">{OPERATIONS_DESK_TEXT.advisorySubtitle}</p>
        </div>

        {view.advisories.length > 0 ? (
          <ul className="space-y-3">
            {view.advisories.map((advisory) => (
              <li
                key={advisory.id}
                className={`rounded border px-3 py-3 ${getAdvisoryToneClass(advisory.severity)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-medium">{advisory.title}</p>
                    <p className="text-sm opacity-70">{advisory.detail}</p>
                  </div>
                  <AdvisoryBadge severity={advisory.severity} />
                </div>

                {advisory.caseId || advisory.teamId || advisory.agentId ? (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {advisory.caseId ? (
                      <Link
                        to={APP_ROUTES.caseDetail(advisory.caseId)}
                        className="rounded border border-white/10 px-2 py-1 hover:bg-white/5"
                      >
                        {OPERATIONS_DESK_TEXT.openCaseAction}
                      </Link>
                    ) : null}
                    {advisory.teamId ? (
                      <Link
                        to={APP_ROUTES.teamDetail(advisory.teamId)}
                        className="rounded border border-white/10 px-2 py-1 hover:bg-white/5"
                      >
                        {OPERATIONS_DESK_TEXT.openTeamAction}
                      </Link>
                    ) : null}
                    {advisory.agentId ? (
                      <Link
                        to={APP_ROUTES.agentDetail(advisory.agentId)}
                        className="rounded border border-white/10 px-2 py-1 hover:bg-white/5"
                      >
                        {OPERATIONS_DESK_TEXT.openAgentAction}
                      </Link>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm opacity-60">{OPERATIONS_DESK_TEXT.noAdvisories}</p>
        )}
      </section>

      <section className="panel space-y-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{DASHBOARD_SECTIONS.fabrication}</h2>
          <p className="text-sm opacity-60">{OPERATIONS_DESK_TEXT.fabricationSubtitle}</p>
        </div>

        {view.fabricationQueue.length > 0 ? (
          <ul className="space-y-2">
            {view.fabricationQueue.map((entry) => (
              <li key={entry.id} className="rounded border border-white/10 px-3 py-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{entry.recipeName}</p>
                    <p className="text-xs opacity-50">{entry.outputLabel}</p>
                    <p className="text-xs opacity-50">{entry.timingLabel}</p>
                  </div>
                  <p className="text-xs opacity-60">{entry.remainingLabel}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm opacity-60">{OPERATIONS_DESK_TEXT.noQueue}</p>
        )}

        <div className="space-y-2 border-t border-white/10 pt-3">
          {view.fabricationRecipes.map((recipe) => {
            return (
              <div
                key={recipe.recipeId}
                className="flex items-start justify-between gap-3 rounded border border-white/10 px-3 py-2"
              >
                <div className="space-y-1">
                  <p className="font-medium">{recipe.name}</p>
                  <p className="text-xs opacity-50">{recipe.outputLabel}</p>
                </div>
                <button
                  type="button"
                  className="btn btn-xs btn-ghost"
                  aria-label={`Queue ${recipe.name}`}
                  onClick={() => queueFabrication(recipe.recipeId)}
                  disabled={!recipe.affordable}
                >
                  {OPERATIONS_DESK_TEXT.queueAction}
                </button>
              </div>
            )
          })}
        </div>
      </section>

      <section className="panel space-y-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{DASHBOARD_SECTIONS.market}</h2>
          <p className="text-sm opacity-60">{OPERATIONS_DESK_TEXT.marketSubtitle}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard
            label={OPERATIONS_DESK_TEXT.featuredRecipe}
            value={view.market.featuredRecipeName}
          />
          <MetricCard
            label={OPERATIONS_DESK_TEXT.supplyPressure}
            value={view.market.supplyPressureLabel}
          />
          <MetricCard
            label={OPERATIONS_DESK_TEXT.costMultiplier}
            value={view.market.costMultiplierLabel}
          />
        </div>
      </section>

      <section className="panel space-y-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{DASHBOARD_SECTIONS.performance}</h2>
          <p className="text-sm opacity-60">{OPERATIONS_DESK_TEXT.performanceSubtitle}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <MetricCard
            label={OPERATIONS_DESK_TEXT.resolutionRate}
            value={`${view.performance.resolutionRate}%`}
          />
          <MetricCard
            label={OPERATIONS_DESK_TEXT.queueThroughput}
            value={String(view.performance.queueThroughput)}
          />
          <MetricCard
            label={OPERATIONS_DESK_TEXT.activePressure}
            value={String(view.performance.activePressure)}
          />
          <MetricCard
            label={OPERATIONS_DESK_TEXT.fabricatedStock}
            value={String(view.performance.fabricatedStock)}
          />
        </div>

        <ul className="space-y-1 border-t border-white/10 pt-3 text-sm opacity-70">
          {view.inventoryRows.map((entry) => (
            <li key={entry.itemId} className="flex items-center justify-between gap-3">
              <span>{entry.label}</span>
              <span>{entry.quantity}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function StatusBadge({
  status,
}: {
  status: 'idle' | 'deploying' | 'recovering' | 'overstretched'
}) {
  const label =
    status === 'deploying'
      ? OPERATIONS_DESK_TEXT.deployingStatus
      : status === 'recovering'
        ? OPERATIONS_DESK_TEXT.recoveringStatus
        : status === 'overstretched'
          ? OPERATIONS_DESK_TEXT.overstretchedStatus
          : OPERATIONS_DESK_TEXT.idleStatus
  const className =
    status === 'overstretched'
      ? 'border-rose-400/30 bg-rose-500/10 text-rose-100'
      : status === 'recovering'
        ? 'border-amber-400/30 bg-amber-500/10 text-amber-100'
        : status === 'deploying'
          ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100'
          : 'border-white/10 bg-white/5 text-white/80'

  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.24em] ${className}`}
    >
      {label}
    </span>
  )
}

function AdvisoryBadge({ severity }: { severity: 'info' | 'warning' | 'danger' }) {
  const label = severity === 'danger' ? 'Danger' : severity === 'warning' ? 'Warning' : 'Info'
  const className =
    severity === 'danger'
      ? 'border-red-400/30 bg-red-500/10 text-red-200'
      : severity === 'warning'
        ? 'border-amber-400/30 bg-amber-500/10 text-amber-200'
        : 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100'

  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.24em] ${className}`}
    >
      {label}
    </span>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  )
}

function getFieldStatusToneClass(
  status: 'idle' | 'deploying' | 'recovering' | 'overstretched',
  signals: { deadlineRisk: boolean; criticalStage: boolean; raidUnderstaffed: boolean }
) {
  if (signals.criticalStage || status === 'overstretched') {
    return 'border-rose-400/30 bg-rose-500/8'
  }

  if (signals.deadlineRisk || signals.raidUnderstaffed || status === 'recovering') {
    return 'border-amber-400/30 bg-amber-500/8'
  }

  if (status === 'deploying') {
    return 'border-cyan-400/30 bg-cyan-500/8'
  }

  return 'border-white/10 bg-white/5'
}

function getAdvisoryToneClass(severity: 'info' | 'warning' | 'danger') {
  if (severity === 'danger') {
    return 'border-red-400/30 bg-red-500/8'
  }

  if (severity === 'warning') {
    return 'border-amber-400/30 bg-amber-500/8'
  }

  return 'border-cyan-400/30 bg-cyan-500/8'
}
