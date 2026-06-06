import { useMemo } from 'react'
import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { PUBLIC_DISCLOSURE_MIRROR_UI_TEXT } from '../../data/copy'
import { getPublicDisclosureMirrorView } from './publicDisclosureMirrorView'

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}

export default function PublicDisclosureMirrorPage() {
  const { game } = useGameStore()
  const view = useMemo(() => getPublicDisclosureMirrorView(game), [game])

  return (
    <section className="space-y-4" aria-label="Public disclosure state registry mirror">
      <article className="panel panel-primary space-y-4" role="region" aria-label="Registry summary">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">
              {PUBLIC_DISCLOSURE_MIRROR_UI_TEXT.pageEyebrow}
            </p>
            <h2 className="text-xl font-semibold">
              {PUBLIC_DISCLOSURE_MIRROR_UI_TEXT.pageHeading}
            </h2>
            <p className="text-sm opacity-60">{PUBLIC_DISCLOSURE_MIRROR_UI_TEXT.pageSubtitle}</p>
          </div>
          <Link to={APP_ROUTES.operationsDesk} className="btn btn-sm btn-ghost">
            {PUBLIC_DISCLOSURE_MIRROR_UI_TEXT.backToDeskLabel}
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={PUBLIC_DISCLOSURE_MIRROR_UI_TEXT.totalRecordsLabel}
            value={String(view.summary.totalRecords)}
          />
          <StatCard
            label={PUBLIC_DISCLOSURE_MIRROR_UI_TEXT.disclosureActiveLabel}
            value={String(view.summary.disclosureActiveCount)}
          />
          <StatCard
            label={PUBLIC_DISCLOSURE_MIRROR_UI_TEXT.normalizationInputLabel}
            value={String(view.summary.normalizationInputCount)}
          />
          <StatCard
            label={PUBLIC_DISCLOSURE_MIRROR_UI_TEXT.weekLabel}
            value={`W${view.summary.week}`}
          />
        </div>

        <p className="text-xs opacity-55">{PUBLIC_DISCLOSURE_MIRROR_UI_TEXT.readOnlyNote}</p>
      </article>

      {view.isEmpty ? (
        <article className="panel panel-support space-y-2" role="region" aria-label="Empty registry state">
          <h3 className="text-lg font-semibold">{PUBLIC_DISCLOSURE_MIRROR_UI_TEXT.emptyTitle}</h3>
          <p className="text-sm opacity-70">{PUBLIC_DISCLOSURE_MIRROR_UI_TEXT.emptyBody}</p>
        </article>
      ) : (
        <article
          className="panel panel-support space-y-3"
          role="region"
          aria-label="Persisted public disclosure records"
        >
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">
              {PUBLIC_DISCLOSURE_MIRROR_UI_TEXT.recordsHeading}
            </h3>
            <p className="text-sm opacity-60">{PUBLIC_DISCLOSURE_MIRROR_UI_TEXT.recordsSubtitle}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.18em] opacity-55">
                  <th className="px-2 py-2">{PUBLIC_DISCLOSURE_MIRROR_UI_TEXT.labelColumn}</th>
                  <th className="px-2 py-2">{PUBLIC_DISCLOSURE_MIRROR_UI_TEXT.awarenessColumn}</th>
                  <th className="px-2 py-2">{PUBLIC_DISCLOSURE_MIRROR_UI_TEXT.falloutColumn}</th>
                  <th className="px-2 py-2">{PUBLIC_DISCLOSURE_MIRROR_UI_TEXT.regionalTrustColumn}</th>
                  <th className="px-2 py-2">{PUBLIC_DISCLOSURE_MIRROR_UI_TEXT.oversightColumn}</th>
                  <th className="px-2 py-2">{PUBLIC_DISCLOSURE_MIRROR_UI_TEXT.transitionColumn}</th>
                  <th className="px-2 py-2">{PUBLIC_DISCLOSURE_MIRROR_UI_TEXT.normalizationColumn}</th>
                  <th className="px-2 py-2">{PUBLIC_DISCLOSURE_MIRROR_UI_TEXT.confidenceColumn}</th>
                </tr>
              </thead>
              <tbody>
                {view.records.map((record) => (
                  <tr key={record.id} className="border-b border-white/5 align-top">
                    <td className="px-2 py-2">
                      <p className="font-medium">{record.label}</p>
                      <p className="text-xs opacity-55">{record.id}</p>
                      <p className="text-xs opacity-45">{record.summaryLabel}</p>
                      {record.campaignObjectivePivotLabel ? (
                        <p className="text-xs opacity-45">
                          {PUBLIC_DISCLOSURE_MIRROR_UI_TEXT.campaignPivotPrefix}{' '}
                          {record.campaignObjectivePivotLabel}
                        </p>
                      ) : null}
                      {record.coverCapacityFailureLabel === 'Yes' ? (
                        <p className="text-xs opacity-45">
                          {PUBLIC_DISCLOSURE_MIRROR_UI_TEXT.coverCapacityFailureSuffix}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">{record.awarenessLevelLabel}</td>
                    <td className="px-2 py-2">{record.falloutPhaseLabel}</td>
                    <td className="px-2 py-2">
                      {record.regionalTrustViews.length > 0
                        ? record.regionalTrustViews.map((entry) => (
                            <p key={`${record.id}:${entry.regionRef}`} className="text-xs">
                              {entry.regionRef}: {entry.trustScoreLabel}
                              {entry.redacted ? (
                                <span className="opacity-55">
                                  {' '}
                                  {PUBLIC_DISCLOSURE_MIRROR_UI_TEXT.redactedSuffix}
                                </span>
                              ) : null}
                            </p>
                          ))
                        : '—'}
                    </td>
                    <td className="px-2 py-2">{record.oversightPressureLabel}</td>
                    <td className="px-2 py-2">
                      {record.transitionHistoryLabels.length > 0
                        ? record.transitionHistoryLabels.join('; ')
                        : '—'}
                    </td>
                    <td className="px-2 py-2">
                      {record.normalizationInputLabels.length > 0
                        ? record.normalizationInputLabels.join('; ')
                        : '—'}
                      {record.linkedContractCount > 0 ? (
                        <p className="text-xs opacity-55">
                          {record.linkedContractCount}{' '}
                          {PUBLIC_DISCLOSURE_MIRROR_UI_TEXT.linkedContractSuffix}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      {record.confidenceLabel}
                      {record.redacted ? (
                        <p className="text-xs opacity-55">
                          {PUBLIC_DISCLOSURE_MIRROR_UI_TEXT.redactedSuffix}
                        </p>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}
    </section>
  )
}
