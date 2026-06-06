import { useMemo } from 'react'
import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { MASS_ANOMALOUS_POPULATION_EMERGENCE_MIRROR_UI_TEXT } from '../../data/copy'
import { getMassAnomalousPopulationEmergenceMirrorView } from './massAnomalousPopulationEmergenceMirrorView'

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}

export default function MassAnomalousPopulationEmergenceMirrorPage() {
  const { game } = useGameStore()
  const view = useMemo(() => getMassAnomalousPopulationEmergenceMirrorView(game), [game])

  return (
    <section
      className="space-y-4"
      aria-label="Mass anomalous population emergence registry mirror"
    >
      <article className="panel panel-primary space-y-4" role="region" aria-label="Registry summary">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">
              {MASS_ANOMALOUS_POPULATION_EMERGENCE_MIRROR_UI_TEXT.pageEyebrow}
            </p>
            <h2 className="text-xl font-semibold">
              {MASS_ANOMALOUS_POPULATION_EMERGENCE_MIRROR_UI_TEXT.pageHeading}
            </h2>
            <p className="text-sm opacity-60">
              {MASS_ANOMALOUS_POPULATION_EMERGENCE_MIRROR_UI_TEXT.pageSubtitle}
            </p>
          </div>
          <Link to={APP_ROUTES.operationsDesk} className="btn btn-sm btn-ghost">
            {MASS_ANOMALOUS_POPULATION_EMERGENCE_MIRROR_UI_TEXT.backToDeskLabel}
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={MASS_ANOMALOUS_POPULATION_EMERGENCE_MIRROR_UI_TEXT.totalRecordsLabel}
            value={String(view.summary.totalRecords)}
          />
          <StatCard
            label={
              MASS_ANOMALOUS_POPULATION_EMERGENCE_MIRROR_UI_TEXT.registrationBacklogActiveLabel
            }
            value={String(view.summary.registrationBacklogActiveCount)}
          />
          <StatCard
            label={MASS_ANOMALOUS_POPULATION_EMERGENCE_MIRROR_UI_TEXT.collapsedMasqueradeLabel}
            value={String(view.summary.collapsedMasqueradeCount)}
          />
          <StatCard
            label={MASS_ANOMALOUS_POPULATION_EMERGENCE_MIRROR_UI_TEXT.weekLabel}
            value={`W${view.summary.week}`}
          />
        </div>

        <p className="text-xs opacity-55">
          {MASS_ANOMALOUS_POPULATION_EMERGENCE_MIRROR_UI_TEXT.readOnlyNote}
        </p>
      </article>

      {view.isEmpty ? (
        <article className="panel panel-support space-y-2" role="region" aria-label="Empty registry state">
          <h3 className="text-lg font-semibold">
            {MASS_ANOMALOUS_POPULATION_EMERGENCE_MIRROR_UI_TEXT.emptyTitle}
          </h3>
          <p className="text-sm opacity-70">
            {MASS_ANOMALOUS_POPULATION_EMERGENCE_MIRROR_UI_TEXT.emptyBody}
          </p>
        </article>
      ) : (
        <article
          className="panel panel-support space-y-3"
          role="region"
          aria-label="Persisted mass anomalous population emergence records"
        >
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">
              {MASS_ANOMALOUS_POPULATION_EMERGENCE_MIRROR_UI_TEXT.recordsHeading}
            </h3>
            <p className="text-sm opacity-60">
              {MASS_ANOMALOUS_POPULATION_EMERGENCE_MIRROR_UI_TEXT.recordsSubtitle}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.18em] opacity-55">
                  <th className="px-2 py-2">
                    {MASS_ANOMALOUS_POPULATION_EMERGENCE_MIRROR_UI_TEXT.labelColumn}
                  </th>
                  <th className="px-2 py-2">
                    {MASS_ANOMALOUS_POPULATION_EMERGENCE_MIRROR_UI_TEXT.magnitudeColumn}
                  </th>
                  <th className="px-2 py-2">
                    {MASS_ANOMALOUS_POPULATION_EMERGENCE_MIRROR_UI_TEXT.backlogColumn}
                  </th>
                  <th className="px-2 py-2">
                    {MASS_ANOMALOUS_POPULATION_EMERGENCE_MIRROR_UI_TEXT.governanceColumn}
                  </th>
                  <th className="px-2 py-2">
                    {MASS_ANOMALOUS_POPULATION_EMERGENCE_MIRROR_UI_TEXT.triageColumn}
                  </th>
                  <th className="px-2 py-2">
                    {MASS_ANOMALOUS_POPULATION_EMERGENCE_MIRROR_UI_TEXT.educationColumn}
                  </th>
                  <th className="px-2 py-2">
                    {MASS_ANOMALOUS_POPULATION_EMERGENCE_MIRROR_UI_TEXT.surgeColumn}
                  </th>
                  <th className="px-2 py-2">
                    {MASS_ANOMALOUS_POPULATION_EMERGENCE_MIRROR_UI_TEXT.confidenceColumn}
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
                        {MASS_ANOMALOUS_POPULATION_EMERGENCE_MIRROR_UI_TEXT.populationEstimatePrefix}{' '}
                        {record.newlyAnomalousCountLabel}
                      </p>
                    </td>
                    <td className="px-2 py-2">{record.magnitudeBandLabel}</td>
                    <td className="px-2 py-2">
                      {record.registrationBacklogWeeksLabel}
                      {record.registrationBacklogWeeksLabel !== '0' ? (
                        <p className="text-xs opacity-55">
                          {MASS_ANOMALOUS_POPULATION_EMERGENCE_MIRROR_UI_TEXT.backlogWeeksSuffix}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      {record.governanceModeLabel}
                      {record.securitySurgeRefLabels.length > 0 ? (
                        <p className="text-xs opacity-55">
                          {record.securitySurgeRefLabels.join('; ')}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      {record.triageLaneLabels.length > 0
                        ? record.triageLaneLabels.join('; ')
                        : '—'}
                      {record.rightsReviewQueueLabels.length > 0 ? (
                        <p className="text-xs opacity-55">
                          {MASS_ANOMALOUS_POPULATION_EMERGENCE_MIRROR_UI_TEXT.rightsReviewPrefix}{' '}
                          {record.rightsReviewQueueLabels.join('; ')}
                        </p>
                      ) : null}
                      {record.triageLaneSymptoms.length > 0 ? (
                        <p className="text-xs opacity-45">
                          {record.triageLaneSymptoms
                            .map((symptom) => symptom.symptomLabel)
                            .join('; ')}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      {record.publicEducationBurdenLabel}
                      {record.effectivePublicEducationBurdenLabel !==
                      record.publicEducationBurdenLabel ? (
                        <p className="text-xs opacity-55">
                          {MASS_ANOMALOUS_POPULATION_EMERGENCE_MIRROR_UI_TEXT.effectiveEducationPrefix}{' '}
                          {record.effectivePublicEducationBurdenLabel}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">{record.governanceSurgeBandLabel}</td>
                    <td className="px-2 py-2">
                      {record.confidenceLabel}
                      {record.redacted ? (
                        <p className="text-xs opacity-55">
                          {MASS_ANOMALOUS_POPULATION_EMERGENCE_MIRROR_UI_TEXT.redactedSuffix}
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
