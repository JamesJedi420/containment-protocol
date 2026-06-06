import { useMemo } from 'react'
import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { CONTAINED_PERSON_INTEGRATED_HEALTH_BUNDLE_MIRROR_UI_TEXT } from '../../data/copy'
import { getContainedPersonIntegratedHealthBundleMirrorView } from './containedPersonIntegratedHealthBundleMirrorView'

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}

export default function ContainedPersonIntegratedHealthBundleMirrorPage() {
  const { game } = useGameStore()
  const view = useMemo(() => getContainedPersonIntegratedHealthBundleMirrorView(game), [game])

  return (
    <section className="space-y-4" aria-label="Contained person integrated health bundle mirror">
      <article className="panel panel-primary space-y-4" role="region" aria-label="Registry summary">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">
              {CONTAINED_PERSON_INTEGRATED_HEALTH_BUNDLE_MIRROR_UI_TEXT.pageEyebrow}
            </p>
            <h2 className="text-xl font-semibold">
              {CONTAINED_PERSON_INTEGRATED_HEALTH_BUNDLE_MIRROR_UI_TEXT.pageHeading}
            </h2>
            <p className="text-sm opacity-60">
              {CONTAINED_PERSON_INTEGRATED_HEALTH_BUNDLE_MIRROR_UI_TEXT.pageSubtitle}
            </p>
          </div>
          <Link to={APP_ROUTES.operationsDesk} className="btn btn-sm btn-ghost">
            {CONTAINED_PERSON_INTEGRATED_HEALTH_BUNDLE_MIRROR_UI_TEXT.backToDeskLabel}
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={CONTAINED_PERSON_INTEGRATED_HEALTH_BUNDLE_MIRROR_UI_TEXT.totalBundlesLabel}
            value={String(view.summary.totalBundles)}
          />
          <StatCard
            label={CONTAINED_PERSON_INTEGRATED_HEALTH_BUNDLE_MIRROR_UI_TEXT.criticalMentalStateLabel}
            value={String(view.summary.criticalMentalStateCount)}
          />
          <StatCard
            label={CONTAINED_PERSON_INTEGRATED_HEALTH_BUNDLE_MIRROR_UI_TEXT.distressedMentalStateLabel}
            value={String(view.summary.distressedMentalStateCount)}
          />
          <StatCard
            label={CONTAINED_PERSON_INTEGRATED_HEALTH_BUNDLE_MIRROR_UI_TEXT.weekLabel}
            value={`W${view.summary.week}`}
          />
        </div>

        <p className="text-xs opacity-55">
          {CONTAINED_PERSON_INTEGRATED_HEALTH_BUNDLE_MIRROR_UI_TEXT.readOnlyNote}
        </p>
      </article>

      {view.isEmpty ? (
        <article className="panel panel-support space-y-2" role="region" aria-label="Empty registry state">
          <h3 className="text-lg font-semibold">
            {CONTAINED_PERSON_INTEGRATED_HEALTH_BUNDLE_MIRROR_UI_TEXT.emptyTitle}
          </h3>
          <p className="text-sm opacity-70">
            {CONTAINED_PERSON_INTEGRATED_HEALTH_BUNDLE_MIRROR_UI_TEXT.emptyBody}
          </p>
        </article>
      ) : (
        <article
          className="panel panel-support space-y-3"
          role="region"
          aria-label="Persisted contained person integrated health bundles"
        >
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">
              {CONTAINED_PERSON_INTEGRATED_HEALTH_BUNDLE_MIRROR_UI_TEXT.recordsHeading}
            </h3>
            <p className="text-sm opacity-60">
              {CONTAINED_PERSON_INTEGRATED_HEALTH_BUNDLE_MIRROR_UI_TEXT.recordsSubtitle}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.18em] opacity-55">
                  <th className="px-2 py-2">
                    {CONTAINED_PERSON_INTEGRATED_HEALTH_BUNDLE_MIRROR_UI_TEXT.labelColumn}
                  </th>
                  <th className="px-2 py-2">
                    {CONTAINED_PERSON_INTEGRATED_HEALTH_BUNDLE_MIRROR_UI_TEXT.mentalStateColumn}
                  </th>
                  <th className="px-2 py-2">
                    {CONTAINED_PERSON_INTEGRATED_HEALTH_BUNDLE_MIRROR_UI_TEXT.humaneCareColumn}
                  </th>
                  <th className="px-2 py-2">
                    {CONTAINED_PERSON_INTEGRATED_HEALTH_BUNDLE_MIRROR_UI_TEXT.scheduleLinksColumn}
                  </th>
                  <th className="px-2 py-2">
                    {CONTAINED_PERSON_INTEGRATED_HEALTH_BUNDLE_MIRROR_UI_TEXT.confidenceColumn}
                  </th>
                </tr>
              </thead>
              <tbody>
                {view.records.map((record) => (
                  <tr key={record.id} className="border-b border-white/5 align-top">
                    <td className="px-2 py-2">
                      <p className="font-medium">{record.label}</p>
                      <p className="text-xs opacity-55">{record.id}</p>
                      <p className="text-xs opacity-45">
                        {CONTAINED_PERSON_INTEGRATED_HEALTH_BUNDLE_MIRROR_UI_TEXT.subjectRefPrefix}{' '}
                        {record.subjectRefLabel}
                      </p>
                    </td>
                    <td className="px-2 py-2">
                      <p>{record.mentalStateBandLabel}</p>
                    </td>
                    <td className="px-2 py-2">
                      <p className="text-xs opacity-55">
                        {CONTAINED_PERSON_INTEGRATED_HEALTH_BUNDLE_MIRROR_UI_TEXT.humaneCareRiskPrefix}{' '}
                        {record.humaneCareRiskScoreLabel}
                      </p>
                    </td>
                    <td className="px-2 py-2">
                      {record.therapeuticCareScheduleLinks.length > 0 ? (
                        record.therapeuticCareScheduleLinks.map((link) => (
                          <div key={link.scheduleRefLabel} className="mb-2 last:mb-0">
                            <p className="text-xs opacity-55">{link.scheduleRefLabel}</p>
                            <p>{link.careModeLabel}</p>
                            <p className="text-xs opacity-55">{link.channelStateLabel}</p>
                            <p className="text-xs opacity-45">
                              {CONTAINED_PERSON_INTEGRATED_HEALTH_BUNDLE_MIRROR_UI_TEXT.complianceRiskPrefix}{' '}
                              {link.complianceRiskScoreLabel}
                            </p>
                            {link.lockdownEscalationLikelyLabel !== '—' ? (
                              <p className="text-xs opacity-45">
                                {CONTAINED_PERSON_INTEGRATED_HEALTH_BUNDLE_MIRROR_UI_TEXT.lockdownEscalationSuffix}
                              </p>
                            ) : null}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs opacity-45">—</p>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {record.confidenceLabel}
                      {record.validationWarningLabels.length > 0 ? (
                        <p className="text-xs text-amber-200/80">
                          {CONTAINED_PERSON_INTEGRATED_HEALTH_BUNDLE_MIRROR_UI_TEXT.validationWarningPrefix}{' '}
                          {record.validationWarningLabels.length}
                        </p>
                      ) : null}
                      {record.redactedFieldLabels.length > 0 ? (
                        <p className="text-xs opacity-45">
                          {CONTAINED_PERSON_INTEGRATED_HEALTH_BUNDLE_MIRROR_UI_TEXT.redactedSuffix}
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
