import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router'

import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { getOperationsReportView } from '../report/operationsReportView'

export function OperationsReportPanel() {
  const { game } = useGameStore()
  const view = useMemo(() => getOperationsReportView(game), [game])

  return (
    <section className="panel panel-support space-y-4" aria-label="Operations report">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Operations report</h2>
        <p className="text-sm opacity-60">
          Compact derived explanations for routing, readiness, recent outcomes, and current
          campaign pressure.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="rounded border border-white/10 px-3 py-3" aria-label="Weekly operations summary">
          <div className="space-y-1">
            <h3 className="text-base font-semibold">Weekly operations summary</h3>
            <p className="text-sm opacity-70">{view.weeklySummary.summary}</p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Tag tone="info">Dominant: {view.weeklySummary.dominantPressureLabel}</Tag>
            {view.weeklySummary.secondaryPressureLabels.map((label) => (
              <Tag key={label}>Secondary: {label}</Tag>
            ))}
          </div>

          <div className="mt-3 grid gap-2 text-sm opacity-75">
            <p>Unresolved trend: {view.weeklySummary.unresolvedTrend.join(' -> ')}</p>
            <p>{view.weeklySummary.budgetPressureSummary}</p>
            <p>{view.weeklySummary.attritionPressureSummary}</p>
            <p>{view.weeklySummary.intelConfidenceSummary}</p>
          </div>

          {view.weeklySummary.details.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm opacity-65">
              {view.weeklySummary.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          ) : null}
        </article>

        <article className="rounded border border-white/10 px-3 py-3" aria-label="Mission routing report">
          <div className="space-y-1">
            <h3 className="text-base font-semibold">Mission routing report</h3>
            <p className="text-sm opacity-60">
              Why missions are routed, blocked, or deprioritized right now.
            </p>
          </div>

          {view.missionRouting.length > 0 ? (
            <ul className="mt-3 space-y-3">
              {view.missionRouting.map((entry) => (
                <li key={entry.missionId} className="rounded border border-white/10 px-3 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        <Link
                          to={APP_ROUTES.caseDetail(entry.missionId)}
                          className="hover:underline"
                        >
                          {entry.missionTitle}
                        </Link>
                      </p>
                      <p className="text-xs opacity-50">
                        {entry.routingStateLabel} / {entry.priorityLabel}
                      </p>
                    </div>
                    <Tag tone={entry.routingStateLabel === 'Blocked' ? 'danger' : 'warning'}>
                      {entry.dominantFactorLabel}
                    </Tag>
                  </div>

                  <p className="mt-2 text-sm opacity-75">{entry.summary}</p>

                  {entry.highlights.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {entry.highlights.map((highlight) => (
                        <Tag key={highlight}>{highlight}</Tag>
                      ))}
                    </div>
                  ) : null}

                  {entry.details.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-sm opacity-65">
                      {entry.details.map((detail) => (
                        <li key={detail}>{detail}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm opacity-60">No active routing explanations available.</p>
          )}
        </article>

        <article
          className="rounded border border-white/10 px-3 py-3"
          aria-label="Deployment readiness report"
        >
          <div className="space-y-1">
            <h3 className="text-base font-semibold">Deployment readiness report</h3>
            <p className="text-sm opacity-60">
              Why a team is ready, conditional, or blocked for a current mission pairing.
            </p>
          </div>

          {view.deploymentReadiness.length > 0 ? (
            <ul className="mt-3 space-y-3">
              {view.deploymentReadiness.map((entry) => (
                <li key={`${entry.missionId}:${entry.teamId}`} className="rounded border border-white/10 px-3 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        <Link
                          to={APP_ROUTES.teamDetail(entry.teamId)}
                          className="hover:underline"
                        >
                          {entry.teamName}
                        </Link>{' '}
                        <span className="opacity-50">for</span>{' '}
                        <Link
                          to={APP_ROUTES.caseDetail(entry.missionId)}
                          className="hover:underline"
                        >
                          {entry.missionTitle}
                        </Link>
                      </p>
                      <p className="text-xs opacity-50">
                        {entry.readinessCategoryLabel} / Score {entry.readinessScore}
                      </p>
                    </div>
                    <Tag
                      tone={entry.hardBlockers.length > 0 ? 'danger' : entry.softRisks.length > 0 ? 'warning' : 'info'}
                    >
                      {entry.dominantFactorLabel}
                    </Tag>
                  </div>

                  <p className="mt-2 text-sm opacity-75">{entry.summary}</p>

                  {entry.hardBlockers.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {entry.hardBlockers.map((blocker) => (
                        <Tag key={blocker} tone="danger">
                          Hard: {blocker}
                        </Tag>
                      ))}
                    </div>
                  ) : null}

                  {entry.softRisks.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {entry.softRisks.map((risk) => (
                        <Tag key={risk} tone="warning">
                          Risk: {risk}
                        </Tag>
                      ))}
                    </div>
                  ) : null}

                  {entry.details.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-sm opacity-65">
                      {entry.details.map((detail) => (
                        <li key={detail}>{detail}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm opacity-60">No deployment readiness pairings are available.</p>
          )}
        </article>

        <article className="rounded border border-white/10 px-3 py-3" aria-label="Recent outcome report">
          <div className="space-y-1">
            <h3 className="text-base font-semibold">Recent outcome report</h3>
            <p className="text-sm opacity-60">
              Compact weakest-link explanations from the most recent mission outcomes.
            </p>
          </div>

          {view.recentOutcomes.length > 0 ? (
            <ul className="mt-3 space-y-3">
              {view.recentOutcomes.map((entry) => (
                <li key={`${entry.week}:${entry.missionId}`} className="rounded border border-white/10 px-3 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        <Link
                          to={APP_ROUTES.caseDetail(entry.missionId)}
                          className="hover:underline"
                        >
                          {entry.missionTitle}
                        </Link>
                      </p>
                      <p className="text-xs opacity-50">
                        Week{' '}
                        <Link
                          to={APP_ROUTES.reportDetail(entry.week)}
                          className="hover:underline"
                        >
                          {entry.week}
                        </Link>{' '}
                        / {entry.outcomeLabel}
                      </p>
                    </div>
                    <Tag tone={entry.outcomeLabel === 'Fail' ? 'danger' : entry.outcomeLabel === 'Partial' ? 'warning' : 'info'}>
                      {entry.dominantFactorLabel}
                    </Tag>
                  </div>

                  <p className="mt-2 text-sm opacity-75">{entry.summary}</p>
                  <p className="mt-2 text-xs opacity-60">{entry.recoveryIndicator}</p>
                  <div className="mt-2 space-y-1 text-sm opacity-70">
                    <p>
                      <span className="font-medium">Gain:</span> {entry.gainSummary}
                    </p>
                    <p>
                      <span className="font-medium">Cost:</span> {entry.costSummary}
                    </p>
                    <p>
                      <span className="font-medium">Net:</span> {entry.netSummary}
                    </p>
                  </div>

                  {entry.contributors.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-sm opacity-65">
                      {entry.contributors.map((detail) => (
                        <li key={detail}>{detail}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm opacity-60">
              No recent weakest-link outcomes are available yet.
            </p>
          )}
        </article>
      </div>
    </section>
  )
}

function Tag({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'info' | 'warning' | 'danger'
}) {
  const className =
    tone === 'danger'
      ? 'border-red-400/30 bg-red-500/10 text-red-200'
      : tone === 'warning'
        ? 'border-amber-400/30 bg-amber-500/10 text-amber-200'
        : tone === 'info'
          ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100'
          : 'border-white/10 bg-white/5 text-white/80'

  return <span className={`rounded-full border px-2 py-0.5 ${className}`}>{children}</span>
}
