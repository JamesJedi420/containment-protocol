import { useMemo } from 'react'
import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { PSYCHOLOGICAL_RESILIENCE_MIRROR_UI_TEXT } from '../../data/copy'
import { getPsychologicalResilienceMirrorView } from './psychologicalResilienceMirrorView'

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}

export default function PsychologicalResilienceMirrorPage() {
  const { game } = useGameStore()
  const view = useMemo(() => getPsychologicalResilienceMirrorView(game), [game])

  return (
    <section className="space-y-4" aria-label="Psychological resilience registry mirror">
      <article className="panel panel-primary space-y-4" role="region" aria-label="Registry summary">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">
              {PSYCHOLOGICAL_RESILIENCE_MIRROR_UI_TEXT.pageEyebrow}
            </p>
            <h2 className="text-xl font-semibold">
              {PSYCHOLOGICAL_RESILIENCE_MIRROR_UI_TEXT.pageHeading}
            </h2>
            <p className="text-sm opacity-60">
              {PSYCHOLOGICAL_RESILIENCE_MIRROR_UI_TEXT.pageSubtitle}
            </p>
          </div>
          <Link to={APP_ROUTES.operationsDesk} className="btn btn-sm btn-ghost">
            {PSYCHOLOGICAL_RESILIENCE_MIRROR_UI_TEXT.backToDeskLabel}
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={PSYCHOLOGICAL_RESILIENCE_MIRROR_UI_TEXT.totalRecordsLabel}
            value={String(view.summary.totalRecords)}
          />
          <StatCard
            label={PSYCHOLOGICAL_RESILIENCE_MIRROR_UI_TEXT.exposureElevatedLabel}
            value={String(view.summary.exposureElevatedCount)}
          />
          <StatCard
            label={PSYCHOLOGICAL_RESILIENCE_MIRROR_UI_TEXT.treatmentGatedLabel}
            value={String(view.summary.treatmentGatedCount)}
          />
          <StatCard
            label={PSYCHOLOGICAL_RESILIENCE_MIRROR_UI_TEXT.weekLabel}
            value={`W${view.summary.week}`}
          />
        </div>

        <p className="text-xs opacity-55">
          {PSYCHOLOGICAL_RESILIENCE_MIRROR_UI_TEXT.readOnlyNote}
        </p>
      </article>

      {view.isEmpty ? (
        <article className="panel panel-support space-y-2" role="region" aria-label="Empty registry state">
          <h3 className="text-lg font-semibold">
            {PSYCHOLOGICAL_RESILIENCE_MIRROR_UI_TEXT.emptyTitle}
          </h3>
          <p className="text-sm opacity-70">{PSYCHOLOGICAL_RESILIENCE_MIRROR_UI_TEXT.emptyBody}</p>
        </article>
      ) : (
        <article
          className="panel panel-support space-y-3"
          role="region"
          aria-label="Persisted psychological resilience records"
        >
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">
              {PSYCHOLOGICAL_RESILIENCE_MIRROR_UI_TEXT.recordsHeading}
            </h3>
            <p className="text-sm opacity-60">
              {PSYCHOLOGICAL_RESILIENCE_MIRROR_UI_TEXT.recordsSubtitle}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.18em] opacity-55">
                  <th className="px-2 py-2">
                    {PSYCHOLOGICAL_RESILIENCE_MIRROR_UI_TEXT.labelColumn}
                  </th>
                  <th className="px-2 py-2">
                    {PSYCHOLOGICAL_RESILIENCE_MIRROR_UI_TEXT.depletionColumn}
                  </th>
                  <th className="px-2 py-2">
                    {PSYCHOLOGICAL_RESILIENCE_MIRROR_UI_TEXT.exposureColumn}
                  </th>
                  <th className="px-2 py-2">
                    {PSYCHOLOGICAL_RESILIENCE_MIRROR_UI_TEXT.recoveryColumn}
                  </th>
                  <th className="px-2 py-2">
                    {PSYCHOLOGICAL_RESILIENCE_MIRROR_UI_TEXT.projectionColumn}
                  </th>
                  <th className="px-2 py-2">
                    {PSYCHOLOGICAL_RESILIENCE_MIRROR_UI_TEXT.confidenceColumn}
                  </th>
                </tr>
              </thead>
              <tbody>
                {view.records.map((record) => (
                  <tr key={record.id} className="border-b border-white/5 align-top">
                    <td className="px-2 py-2">
                      <p className="font-medium">{record.label}</p>
                      <p className="text-xs opacity-55">{record.id}</p>
                      <p className="text-xs opacity-45">{record.summaryLabel}</p>
                      <p className="text-xs opacity-45">
                        {PSYCHOLOGICAL_RESILIENCE_MIRROR_UI_TEXT.operatorRefPrefix}{' '}
                        {record.operatorRefLabel}
                      </p>
                    </td>
                    <td className="px-2 py-2">
                      <p>{record.depletionBandLabel}</p>
                      {record.complicationLabels.length > 0 ? (
                        <p className="text-xs opacity-55">
                          {PSYCHOLOGICAL_RESILIENCE_MIRROR_UI_TEXT.complicationsPrefix}{' '}
                          {record.complicationLabels.join('; ')}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      <p className="text-xs opacity-55">
                        {PSYCHOLOGICAL_RESILIENCE_MIRROR_UI_TEXT.exposureScorePrefix}{' '}
                        {record.exposureScoreLabel}
                      </p>
                      <p className="text-xs opacity-55">
                        {PSYCHOLOGICAL_RESILIENCE_MIRROR_UI_TEXT.exposureEventPrefix}{' '}
                        {record.exposureEventCountLabel}
                      </p>
                      {record.exposureSourceLabels.length > 0 ? (
                        <p className="text-xs opacity-45">
                          {PSYCHOLOGICAL_RESILIENCE_MIRROR_UI_TEXT.exposureSourcesPrefix}{' '}
                          {record.exposureSourceLabels.join('; ')}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      <p>{record.recoveryChannelLabel}</p>
                      {record.counselingRefLabel !== '—' ? (
                        <p className="text-xs opacity-45">
                          {PSYCHOLOGICAL_RESILIENCE_MIRROR_UI_TEXT.counselingRefPrefix}{' '}
                          {record.counselingRefLabel}
                        </p>
                      ) : null}
                      {record.restRecoveryEligibleLabel !== '—' ? (
                        <p className="text-xs opacity-45">
                          {PSYCHOLOGICAL_RESILIENCE_MIRROR_UI_TEXT.restRecoverySuffix}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      {record.exposureElevatedLabel !== '—' ? (
                        <p className="text-xs opacity-55">
                          {PSYCHOLOGICAL_RESILIENCE_MIRROR_UI_TEXT.exposureElevatedSuffix}
                        </p>
                      ) : null}
                      {record.treatmentGatedLabel !== '—' ? (
                        <p className="text-xs opacity-55">
                          {PSYCHOLOGICAL_RESILIENCE_MIRROR_UI_TEXT.treatmentGatedSuffix}
                        </p>
                      ) : null}
                      {record.depletionAdvancedLabel !== '—' ? (
                        <p className="text-xs opacity-45">
                          {PSYCHOLOGICAL_RESILIENCE_MIRROR_UI_TEXT.depletionAdvancedSuffix}
                        </p>
                      ) : null}
                      {record.dutyReliabilityDegradedLabel !== '—' ? (
                        <p className="text-xs opacity-45">
                          {PSYCHOLOGICAL_RESILIENCE_MIRROR_UI_TEXT.dutyReliabilitySuffix}
                        </p>
                      ) : null}
                      {record.redacted ? (
                        <p className="text-xs opacity-45">
                          {PSYCHOLOGICAL_RESILIENCE_MIRROR_UI_TEXT.redactedSuffix}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      {record.confidenceLabel}
                      {record.validationWarningLabels.length > 0 ? (
                        <p className="text-xs text-amber-200/80">
                          {PSYCHOLOGICAL_RESILIENCE_MIRROR_UI_TEXT.validationWarningPrefix}{' '}
                          {record.validationWarningLabels.length}
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
