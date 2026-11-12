import { useMemo } from 'react'
import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { SELF_CENSORING_INFORMATION_MIRROR_UI_TEXT } from '../../data/copy'
import { getSelfCensoringInformationMirrorView } from './selfCensoringInformationMirrorView'

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}

export default function SelfCensoringInformationMirrorPage() {
  const { game } = useGameStore()
  const view = useMemo(() => getSelfCensoringInformationMirrorView(game), [game])

  return (
    <section className="space-y-4" aria-label="Self-censoring information registry mirror">
      <article className="panel panel-primary space-y-4" role="region" aria-label="Registry summary">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">
              {SELF_CENSORING_INFORMATION_MIRROR_UI_TEXT.pageEyebrow}
            </p>
            <h2 className="text-xl font-semibold">
              {SELF_CENSORING_INFORMATION_MIRROR_UI_TEXT.pageHeading}
            </h2>
            <p className="text-sm opacity-60">
              {SELF_CENSORING_INFORMATION_MIRROR_UI_TEXT.pageSubtitle}
            </p>
          </div>
          <Link to={APP_ROUTES.operationsDesk} className="btn btn-sm btn-ghost">
            {SELF_CENSORING_INFORMATION_MIRROR_UI_TEXT.backToDeskLabel}
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={SELF_CENSORING_INFORMATION_MIRROR_UI_TEXT.totalRecordsLabel}
            value={String(view.summary.totalRecords)}
          />
          <StatCard
            label={SELF_CENSORING_INFORMATION_MIRROR_UI_TEXT.retentionActiveLabel}
            value={String(view.summary.retentionTimerActiveCount)}
          />
          <StatCard
            label={SELF_CENSORING_INFORMATION_MIRROR_UI_TEXT.rediscoveryActiveLabel}
            value={String(view.summary.rediscoveryLoopActiveCount)}
          />
          <StatCard
            label={SELF_CENSORING_INFORMATION_MIRROR_UI_TEXT.weekLabel}
            value={`W${view.summary.week}`}
          />
        </div>

        <p className="text-xs opacity-55">
          {SELF_CENSORING_INFORMATION_MIRROR_UI_TEXT.readOnlyNote}
        </p>
      </article>

      {view.isEmpty ? (
        <article className="panel panel-support space-y-2" role="region" aria-label="Empty registry state">
          <h3 className="text-lg font-semibold">
            {SELF_CENSORING_INFORMATION_MIRROR_UI_TEXT.emptyTitle}
          </h3>
          <p className="text-sm opacity-70">{SELF_CENSORING_INFORMATION_MIRROR_UI_TEXT.emptyBody}</p>
        </article>
      ) : (
        <article
          className="panel panel-support space-y-3"
          role="region"
          aria-label="Persisted self-censoring information records"
        >
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">
              {SELF_CENSORING_INFORMATION_MIRROR_UI_TEXT.recordsHeading}
            </h3>
            <p className="text-sm opacity-60">
              {SELF_CENSORING_INFORMATION_MIRROR_UI_TEXT.recordsSubtitle}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.18em] opacity-55">
                  <th className="px-2 py-2">{SELF_CENSORING_INFORMATION_MIRROR_UI_TEXT.labelColumn}</th>
                  <th className="px-2 py-2">{SELF_CENSORING_INFORMATION_MIRROR_UI_TEXT.resistanceColumn}</th>
                  <th className="px-2 py-2">{SELF_CENSORING_INFORMATION_MIRROR_UI_TEXT.negativeFactsColumn}</th>
                  <th className="px-2 py-2">{SELF_CENSORING_INFORMATION_MIRROR_UI_TEXT.retentionColumn}</th>
                  <th className="px-2 py-2">{SELF_CENSORING_INFORMATION_MIRROR_UI_TEXT.rediscoveryColumn}</th>
                  <th className="px-2 py-2">{SELF_CENSORING_INFORMATION_MIRROR_UI_TEXT.failureModeColumn}</th>
                  <th className="px-2 py-2">{SELF_CENSORING_INFORMATION_MIRROR_UI_TEXT.contradictionColumn}</th>
                  <th className="px-2 py-2">{SELF_CENSORING_INFORMATION_MIRROR_UI_TEXT.confidenceColumn}</th>
                </tr>
              </thead>
              <tbody>
                {view.records.map((record) => (
                  <tr key={record.id} className="border-b border-white/5 align-top">
                    <td className="px-2 py-2">
                      <p className="font-medium">{record.label}</p>
                      <p className="text-xs opacity-55">{record.id}</p>
                      <p className="text-xs opacity-45">{record.summaryLabel}</p>
                      {record.parentCaseRefLabel !== '—' ? (
                        <p className="text-xs opacity-45">
                          {SELF_CENSORING_INFORMATION_MIRROR_UI_TEXT.parentCasePrefix}{' '}
                          {record.parentCaseRefLabel}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      {record.propagationResistanceLabels.length > 0
                        ? record.propagationResistanceLabels.join(', ')
                        : '—'}
                    </td>
                    <td className="px-2 py-2">
                      {record.negativeFactLabels.length > 0
                        ? record.negativeFactLabels.join('; ')
                        : '—'}
                    </td>
                    <td className="px-2 py-2">{record.retentionDecayTimerLabel}</td>
                    <td className="px-2 py-2">
                      <p>{record.rediscoveryLoopCountLabel}</p>
                      {record.lastAlarmWeekLabel !== '—' ? (
                        <p className="text-xs opacity-55">
                          {SELF_CENSORING_INFORMATION_MIRROR_UI_TEXT.lastAlarmPrefix}{' '}
                          {record.lastAlarmWeekLabel}
                        </p>
                      ) : null}
                      {record.forgottenWarningRefCount > 0 ? (
                        <p className="text-xs opacity-55">
                          {record.forgottenWarningRefCount}{' '}
                          {SELF_CENSORING_INFORMATION_MIRROR_UI_TEXT.warningRefSuffix}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      {record.informationFailureModeLabel ?? '—'}
                      {record.usableArchiveStateLabel ? (
                        <p className="text-xs opacity-55">{record.usableArchiveStateLabel}</p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      {record.contradictionSignalLabels.length > 0
                        ? record.contradictionSignalLabels.join('; ')
                        : '—'}
                    </td>
                    <td className="px-2 py-2">
                      {record.confidenceLabel}
                      {record.redacted ? (
                        <p className="text-xs opacity-55">
                          {SELF_CENSORING_INFORMATION_MIRROR_UI_TEXT.redactedSuffix}
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
