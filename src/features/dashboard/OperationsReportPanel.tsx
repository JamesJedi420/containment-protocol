import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router'

import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { getOperationsReportView } from '../report/operationsReportView'

export function OperationsReportPanel() {
  const { game, setContractNextIntent, clearContractNextIntent } = useGameStore()
  const view = useMemo(() => getOperationsReportView(game), [game])
  const debrief = view.contractDebrief

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
            {view.weeklySummary.crossSessionAttritionContinuitySummary ? (
              <p className="opacity-90">{view.weeklySummary.crossSessionAttritionContinuitySummary}</p>
            ) : null}
            {view.weeklySummary.deploymentMomentumSummary ? (
              <p className="opacity-90">{view.weeklySummary.deploymentMomentumSummary}</p>
            ) : null}
          </div>

          {view.weeklySummary.details.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm opacity-65">
              {view.weeklySummary.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          ) : null}
        </article>

        <article className="rounded border border-white/10 px-3 py-3" aria-label="Operational certainty">
          <div className="space-y-1">
            <h3 className="text-base font-semibold">Operational certainty</h3>
            <p className="text-sm opacity-70">{view.operationalCertainty.summary}</p>
          </div>

          <div className="mt-3 space-y-2">
            <p className="text-xs uppercase tracking-wide opacity-50">Map facts</p>
            <div className="flex flex-wrap gap-2 text-xs">
              {view.operationalCertainty.map.map((bucket) => (
                <Tag key={bucket.id} tone={getCertaintyTone(bucket.level)}>
                  {bucket.label}: {bucket.count} · {bucket.reasonLabel}
                </Tag>
              ))}
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <p className="text-xs uppercase tracking-wide opacity-50">Registry facts</p>
            <div className="flex flex-wrap gap-2 text-xs">
              {view.operationalCertainty.registry.map((bucket) => (
                <Tag key={bucket.id} tone={getCertaintyTone(bucket.level)}>
                  {bucket.label}: {bucket.count} · {bucket.reasonLabel}
                </Tag>
              ))}
            </div>
          </div>
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

        <article
          className="rounded border border-white/10 px-3 py-3"
          aria-label="Post-contract debrief"
        >
          <div className="space-y-1">
            <h3 className="text-base font-semibold">Post-contract debrief</h3>
            <p className="text-sm opacity-60">
              Compact deterministic digest of completed contracts and the captured next-intent
              focus.
            </p>
          </div>

          {debrief.records.length > 0 ? (
            <ul className="mt-3 space-y-3">
              {debrief.records.map((record) => (
                <li
                  key={`${record.week}:${record.caseId}`}
                  className="rounded border border-white/10 px-3 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        <Link
                          to={APP_ROUTES.caseDetail(record.caseId)}
                          className="hover:underline"
                        >
                          {record.caseTitle}
                        </Link>
                      </p>
                      <p className="text-xs opacity-50">
                        Week{' '}
                        <Link
                          to={APP_ROUTES.reportDetail(record.week)}
                          className="hover:underline"
                        >
                          {record.week}
                        </Link>{' '}
                        / {record.outcomeLabel}
                        {record.factionLabel ? ` / ${record.factionLabel}` : null}
                      </p>
                    </div>
                    <Tag
                      tone={
                        record.outcomeLabel === 'Fail'
                          ? 'danger'
                          : record.outcomeLabel === 'Partial' || record.outcomeLabel === 'Unresolved'
                            ? 'warning'
                            : 'info'
                      }
                    >
                      {record.outcomeLabel}
                    </Tag>
                  </div>
                  <p className="mt-2 text-sm opacity-75">{record.summary}</p>

                  {record.changedEntities.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-sm opacity-70">
                      {record.changedEntities.map((entity) => (
                        <li key={entity.id}>
                          <span className="font-medium">{entity.label}:</span> {entity.detail}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {record.unresolvedClocks.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-sm opacity-65">
                      {record.unresolvedClocks.map((clock) => (
                        <li key={clock.id}>
                          <span className="font-medium">Clock:</span> {clock.label} — {clock.detail}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm opacity-60">
              No completed contracts in the latest report. Captured next intent applies to the next
              board refresh.
            </p>
          )}

          <div className="mt-3 space-y-2" aria-label="Next-intent picker">
            <p className="text-sm font-medium opacity-80">
              Captured next intent:{' '}
              {debrief.selectedIntent
                ? debrief.intentChoices.find((choice) => choice.selected)?.label
                : 'None'}
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              {debrief.intentChoices.map((choice) => (
                <button
                  key={choice.intent}
                  type="button"
                  onClick={() => setContractNextIntent(choice.intent)}
                  className={`rounded-full border px-2 py-1 transition ${
                    choice.selected
                      ? 'border-cyan-300/60 bg-cyan-500/20 text-cyan-50'
                      : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
                  }`}
                  title={choice.reason ?? 'Bias next contract suggestion ordering.'}
                  aria-pressed={choice.selected}
                >
                  {choice.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => clearContractNextIntent()}
                className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/80 hover:bg-white/10"
                aria-pressed={debrief.selectedIntent === null}
              >
                Clear
              </button>
            </div>
          </div>
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

function getCertaintyTone(level: 'confirmed' | 'suspected' | 'inferred' | 'contradicted') {
  if (level === 'contradicted') {
    return 'danger' as const
  }
  if (level === 'suspected' || level === 'inferred') {
    return 'warning' as const
  }
  return 'info' as const
}
