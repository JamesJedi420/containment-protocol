import { useMemo } from 'react'
import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { VISUAL_TRIGGER_HAZARD_MIRROR_UI_TEXT } from '../../data/copy'
import { getVisualTriggerHazardMirrorView } from './visualTriggerHazardMirrorView'

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}

export default function VisualTriggerHazardMirrorPage() {
  const { game } = useGameStore()
  const view = useMemo(() => getVisualTriggerHazardMirrorView(game), [game])

  return (
    <section className="space-y-4" aria-label="Visual trigger hazard registry mirror">
      <article className="panel panel-primary space-y-4" role="region" aria-label="Registry summary">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">
              {VISUAL_TRIGGER_HAZARD_MIRROR_UI_TEXT.pageEyebrow}
            </p>
            <h2 className="text-xl font-semibold">
              {VISUAL_TRIGGER_HAZARD_MIRROR_UI_TEXT.pageHeading}
            </h2>
            <p className="text-sm opacity-60">{VISUAL_TRIGGER_HAZARD_MIRROR_UI_TEXT.pageSubtitle}</p>
          </div>
          <Link to={APP_ROUTES.operationsDesk} className="btn btn-sm btn-ghost">
            {VISUAL_TRIGGER_HAZARD_MIRROR_UI_TEXT.backToDeskLabel}
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={VISUAL_TRIGGER_HAZARD_MIRROR_UI_TEXT.totalRecordsLabel}
            value={String(view.summary.totalRecords)}
          />
          <StatCard
            label={VISUAL_TRIGGER_HAZARD_MIRROR_UI_TEXT.activePursuitLabel}
            value={String(view.summary.activePursuitCount)}
          />
          <StatCard
            label={VISUAL_TRIGGER_HAZARD_MIRROR_UI_TEXT.disposalCompliancePendingLabel}
            value={String(view.summary.disposalCompliancePendingCount)}
          />
          <StatCard
            label={VISUAL_TRIGGER_HAZARD_MIRROR_UI_TEXT.weekLabel}
            value={`W${view.summary.week}`}
          />
        </div>

        <p className="text-xs opacity-55">{VISUAL_TRIGGER_HAZARD_MIRROR_UI_TEXT.readOnlyNote}</p>
      </article>

      {view.isEmpty ? (
        <article className="panel panel-support space-y-2" role="region" aria-label="Empty registry state">
          <h3 className="text-lg font-semibold">{VISUAL_TRIGGER_HAZARD_MIRROR_UI_TEXT.emptyTitle}</h3>
          <p className="text-sm opacity-70">{VISUAL_TRIGGER_HAZARD_MIRROR_UI_TEXT.emptyBody}</p>
        </article>
      ) : (
        <article
          className="panel panel-support space-y-3"
          role="region"
          aria-label="Persisted visual trigger hazard records"
        >
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">
              {VISUAL_TRIGGER_HAZARD_MIRROR_UI_TEXT.recordsHeading}
            </h3>
            <p className="text-sm opacity-60">{VISUAL_TRIGGER_HAZARD_MIRROR_UI_TEXT.recordsSubtitle}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.18em] opacity-55">
                  <th className="px-2 py-2">{VISUAL_TRIGGER_HAZARD_MIRROR_UI_TEXT.labelColumn}</th>
                  <th className="px-2 py-2">{VISUAL_TRIGGER_HAZARD_MIRROR_UI_TEXT.triggerColumn}</th>
                  <th className="px-2 py-2">{VISUAL_TRIGGER_HAZARD_MIRROR_UI_TEXT.pursuitColumn}</th>
                  <th className="px-2 py-2">{VISUAL_TRIGGER_HAZARD_MIRROR_UI_TEXT.disposalColumn}</th>
                  <th className="px-2 py-2">{VISUAL_TRIGGER_HAZARD_MIRROR_UI_TEXT.exposureColumn}</th>
                  <th className="px-2 py-2">{VISUAL_TRIGGER_HAZARD_MIRROR_UI_TEXT.awarenessColumn}</th>
                  <th className="px-2 py-2">{VISUAL_TRIGGER_HAZARD_MIRROR_UI_TEXT.confidenceColumn}</th>
                </tr>
              </thead>
              <tbody>
                {view.records.map((record) => (
                  <tr key={record.id} className="border-b border-white/5 align-top">
                    <td className="px-2 py-2">
                      <p className="font-medium">{record.label}</p>
                      <p className="text-xs opacity-55">{record.id}</p>
                      <p className="text-xs opacity-45">{record.summaryLabel}</p>
                      {record.targetInstanceLabels.length > 0 ? (
                        <p className="text-xs opacity-45">
                          {VISUAL_TRIGGER_HAZARD_MIRROR_UI_TEXT.targetPrefix}{' '}
                          {record.targetInstanceLabels.join('; ')}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      {record.triggerMediumLabel}
                      <p className="text-xs opacity-55">{record.awarenessRequirementLabel}</p>
                      <p className="text-xs opacity-45">{record.derivativeHazardProfileLabel}</p>
                      <p className="text-xs opacity-45">{record.occlusionStateLabel}</p>
                    </td>
                    <td className="px-2 py-2">
                      {record.pursuitStateLabel}
                      <p className="text-xs opacity-55">
                        {VISUAL_TRIGGER_HAZARD_MIRROR_UI_TEXT.projectedPursuitPrefix}{' '}
                        {record.projectedPursuitStateLabel}
                      </p>
                      <p className="text-xs opacity-45">
                        {VISUAL_TRIGGER_HAZARD_MIRROR_UI_TEXT.pursuitPressurePrefix}{' '}
                        {record.pursuitPressureLabel}
                      </p>
                    </td>
                    <td className="px-2 py-2">
                      {record.disposalCompliantLabel}
                      {record.disposalRequiredActionLabels.length > 0 ? (
                        <p className="text-xs opacity-55">
                          {record.disposalRequiredActionLabels.join('; ')}
                        </p>
                      ) : null}
                      {record.disposalPendingMediaLabels.length > 0 ? (
                        <p className="text-xs opacity-45">
                          {VISUAL_TRIGGER_HAZARD_MIRROR_UI_TEXT.pendingMediaPrefix}{' '}
                          {record.disposalPendingMediaLabels.join('; ')}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      {record.escalationBandLabel}
                      <p className="text-xs opacity-55">
                        {VISUAL_TRIGGER_HAZARD_MIRROR_UI_TEXT.broadcastRiskPrefix}{' '}
                        {record.broadcastRiskScoreLabel}
                      </p>
                      {record.requiredCountermeasureLabels.length > 0 ? (
                        <p className="text-xs opacity-45">
                          {record.requiredCountermeasureLabels.join('; ')}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      {record.observerAwarenessBandLabel}
                      <p className="text-xs opacity-55">
                        {VISUAL_TRIGGER_HAZARD_MIRROR_UI_TEXT.manifestationRiskPrefix}{' '}
                        {record.manifestationRiskLabel}
                      </p>
                      {record.dreamIntrusionLabel !== '—' ? (
                        <p className="text-xs opacity-45">
                          {VISUAL_TRIGGER_HAZARD_MIRROR_UI_TEXT.dreamIntrusionSuffix}
                        </p>
                      ) : null}
                      {record.validationWarningLabels.length > 0 ? (
                        <p className="text-xs text-amber-200/80">
                          {VISUAL_TRIGGER_HAZARD_MIRROR_UI_TEXT.validationWarningPrefix}{' '}
                          {record.validationWarningLabels.length}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      {record.confidenceLabel}
                      {record.filterFailureModeLabel ? (
                        <p className="text-xs opacity-55">{record.filterFailureModeLabel}</p>
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
