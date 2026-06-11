import { useMemo } from 'react'
import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { SURVEILLANCE_INTERVENTION_TUNING_MIRROR_UI_TEXT } from '../../data/copy'
import { getSurveillanceInterventionTuningMirrorView } from './surveillanceInterventionTuningMirrorView'

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}

export default function SurveillanceInterventionTuningMirrorPage() {
  const { game } = useGameStore()
  const view = useMemo(() => getSurveillanceInterventionTuningMirrorView(game), [game])

  return (
    <section className="space-y-4" aria-label="Surveillance intervention tuning registry mirror">
      <article className="panel panel-primary space-y-4" role="region" aria-label="Registry summary">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">
              {SURVEILLANCE_INTERVENTION_TUNING_MIRROR_UI_TEXT.pageEyebrow}
            </p>
            <h2 className="text-xl font-semibold">
              {SURVEILLANCE_INTERVENTION_TUNING_MIRROR_UI_TEXT.pageHeading}
            </h2>
            <p className="text-sm opacity-60">
              {SURVEILLANCE_INTERVENTION_TUNING_MIRROR_UI_TEXT.pageSubtitle}
            </p>
          </div>
          <Link to={APP_ROUTES.operationsDesk} className="btn btn-sm btn-ghost">
            {SURVEILLANCE_INTERVENTION_TUNING_MIRROR_UI_TEXT.backToDeskLabel}
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={SURVEILLANCE_INTERVENTION_TUNING_MIRROR_UI_TEXT.totalRecordsLabel}
            value={String(view.summary.totalRecords)}
          />
          <StatCard
            label={SURVEILLANCE_INTERVENTION_TUNING_MIRROR_UI_TEXT.monitoringExceedsContactLabel}
            value={String(view.summary.monitoringExceedsContactCount)}
          />
          <StatCard
            label={
              SURVEILLANCE_INTERVENTION_TUNING_MIRROR_UI_TEXT.sustainedUnderCollateralStrainLabel
            }
            value={String(view.summary.sustainedUnderCollateralStrainCount)}
          />
          <StatCard
            label={SURVEILLANCE_INTERVENTION_TUNING_MIRROR_UI_TEXT.weekLabel}
            value={`W${view.summary.week}`}
          />
        </div>

        <p className="text-xs opacity-55">
          {SURVEILLANCE_INTERVENTION_TUNING_MIRROR_UI_TEXT.readOnlyNote}
        </p>
      </article>

      {view.isEmpty ? (
        <article className="panel panel-support space-y-2" role="region" aria-label="Empty registry state">
          <h3 className="text-lg font-semibold">
            {SURVEILLANCE_INTERVENTION_TUNING_MIRROR_UI_TEXT.emptyTitle}
          </h3>
          <p className="text-sm opacity-70">{SURVEILLANCE_INTERVENTION_TUNING_MIRROR_UI_TEXT.emptyBody}</p>
        </article>
      ) : (
        <article
          className="panel panel-support space-y-3"
          role="region"
          aria-label="Persisted surveillance intervention tuning records"
        >
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">
              {SURVEILLANCE_INTERVENTION_TUNING_MIRROR_UI_TEXT.recordsHeading}
            </h3>
            <p className="text-sm opacity-60">
              {SURVEILLANCE_INTERVENTION_TUNING_MIRROR_UI_TEXT.recordsSubtitle}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.18em] opacity-55">
                  <th className="px-2 py-2">
                    {SURVEILLANCE_INTERVENTION_TUNING_MIRROR_UI_TEXT.labelColumn}
                  </th>
                  <th className="px-2 py-2">
                    {SURVEILLANCE_INTERVENTION_TUNING_MIRROR_UI_TEXT.interventionColumn}
                  </th>
                  <th className="px-2 py-2">
                    {SURVEILLANCE_INTERVENTION_TUNING_MIRROR_UI_TEXT.signalsColumn}
                  </th>
                  <th className="px-2 py-2">
                    {SURVEILLANCE_INTERVENTION_TUNING_MIRROR_UI_TEXT.horizonColumn}
                  </th>
                  <th className="px-2 py-2">
                    {SURVEILLANCE_INTERVENTION_TUNING_MIRROR_UI_TEXT.projectionColumn}
                  </th>
                  <th className="px-2 py-2">
                    {SURVEILLANCE_INTERVENTION_TUNING_MIRROR_UI_TEXT.confidenceColumn}
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
                        {SURVEILLANCE_INTERVENTION_TUNING_MIRROR_UI_TEXT.subjectRefPrefix}{' '}
                        {record.subjectRefLabel}
                      </p>
                    </td>
                    <td className="px-2 py-2">
                      <p>{record.interventionLevelLabel}</p>
                      {record.tuningRationaleRefLabel !== '—' ? (
                        <p className="text-xs opacity-45">
                          {SURVEILLANCE_INTERVENTION_TUNING_MIRROR_UI_TEXT.tuningRationalePrefix}{' '}
                          {record.tuningRationaleRefLabel}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      <p className="text-xs opacity-55">
                        {SURVEILLANCE_INTERVENTION_TUNING_MIRROR_UI_TEXT.surveillanceSignalPrefix}{' '}
                        {record.surveillanceSignalScoreLabel}
                      </p>
                      <p className="text-xs opacity-55">
                        {SURVEILLANCE_INTERVENTION_TUNING_MIRROR_UI_TEXT.meaningfulContactPrefix}{' '}
                        {record.meaningfulContactScoreLabel}
                      </p>
                      {record.healthcareLoadScoreLabel !== '—' ? (
                        <p className="text-xs opacity-45">
                          {SURVEILLANCE_INTERVENTION_TUNING_MIRROR_UI_TEXT.healthcareLoadPrefix}{' '}
                          {record.healthcareLoadScoreLabel}
                        </p>
                      ) : null}
                      {record.collateralStrainScoreLabel !== '—' ? (
                        <p className="text-xs opacity-45">
                          {SURVEILLANCE_INTERVENTION_TUNING_MIRROR_UI_TEXT.collateralStrainPrefix}{' '}
                          {record.collateralStrainScoreLabel}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      {record.horizonOutcomeLabels.length > 0 ? (
                        record.horizonOutcomeLabels.map((label) => (
                          <p key={label} className="text-xs opacity-55">
                            {label}
                          </p>
                        ))
                      ) : (
                        <p className="text-xs opacity-45">—</p>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {record.monitoringExceedsContactLabel !== '—' ? (
                        <p className="text-xs opacity-55">
                          {SURVEILLANCE_INTERVENTION_TUNING_MIRROR_UI_TEXT.monitoringExceedsContactSuffix}
                        </p>
                      ) : null}
                      {record.sustainedUnderCollateralStrainLabel !== '—' ? (
                        <p className="text-xs opacity-45">
                          {
                            SURVEILLANCE_INTERVENTION_TUNING_MIRROR_UI_TEXT.sustainedUnderCollateralStrainSuffix
                          }
                        </p>
                      ) : null}
                      {record.redacted ? (
                        <p className="text-xs opacity-45">
                          {SURVEILLANCE_INTERVENTION_TUNING_MIRROR_UI_TEXT.redactedSuffix}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      {record.confidenceLabel}
                      {record.validationWarningLabels.length > 0 ? (
                        <p className="text-xs text-amber-200/80">
                          {SURVEILLANCE_INTERVENTION_TUNING_MIRROR_UI_TEXT.validationWarningPrefix}{' '}
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
