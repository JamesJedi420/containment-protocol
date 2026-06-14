import { useMemo } from 'react'
import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { COGNITIVE_HAZARD_EXPOSURE_MIRROR_UI_TEXT } from '../../data/copy'
import { getCognitiveHazardExposureMirrorView } from './cognitiveHazardExposureMirrorView'

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}

export default function CognitiveHazardExposureMirrorPage() {
  const { game } = useGameStore()
  const view = useMemo(() => getCognitiveHazardExposureMirrorView(game), [game])

  return (
    <section className="space-y-4" aria-label="Cognitive hazard exposure registry mirror">
      <article className="panel panel-primary space-y-4" role="region" aria-label="Registry summary">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">
              {COGNITIVE_HAZARD_EXPOSURE_MIRROR_UI_TEXT.pageEyebrow}
            </p>
            <h2 className="text-xl font-semibold">
              {COGNITIVE_HAZARD_EXPOSURE_MIRROR_UI_TEXT.pageHeading}
            </h2>
            <p className="text-sm opacity-60">
              {COGNITIVE_HAZARD_EXPOSURE_MIRROR_UI_TEXT.pageSubtitle}
            </p>
          </div>
          <Link to={APP_ROUTES.operationsDesk} className="btn btn-sm btn-ghost">
            {COGNITIVE_HAZARD_EXPOSURE_MIRROR_UI_TEXT.backToDeskLabel}
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={COGNITIVE_HAZARD_EXPOSURE_MIRROR_UI_TEXT.totalRecordsLabel}
            value={String(view.summary.totalRecords)}
          />
          <StatCard
            label={COGNITIVE_HAZARD_EXPOSURE_MIRROR_UI_TEXT.elevatedExposureLabel}
            value={String(view.summary.elevatedExposureCount)}
          />
          <StatCard
            label={COGNITIVE_HAZARD_EXPOSURE_MIRROR_UI_TEXT.simulationTriggerSubjectsLabel}
            value={String(view.summary.simulationTriggerSubjectCount)}
          />
          <StatCard
            label={COGNITIVE_HAZARD_EXPOSURE_MIRROR_UI_TEXT.weekLabel}
            value={`W${view.summary.week}`}
          />
        </div>

        <p className="text-xs opacity-55">
          {COGNITIVE_HAZARD_EXPOSURE_MIRROR_UI_TEXT.readOnlyNote}
        </p>
      </article>

      {view.isEmpty ? (
        <article className="panel panel-support space-y-2" role="region" aria-label="Empty registry state">
          <h3 className="text-lg font-semibold">
            {COGNITIVE_HAZARD_EXPOSURE_MIRROR_UI_TEXT.emptyTitle}
          </h3>
          <p className="text-sm opacity-70">{COGNITIVE_HAZARD_EXPOSURE_MIRROR_UI_TEXT.emptyBody}</p>
        </article>
      ) : (
        <article
          className="panel panel-support space-y-3"
          role="region"
          aria-label="Persisted cognitive hazard exposure records"
        >
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">
              {COGNITIVE_HAZARD_EXPOSURE_MIRROR_UI_TEXT.recordsHeading}
            </h3>
            <p className="text-sm opacity-60">
              {COGNITIVE_HAZARD_EXPOSURE_MIRROR_UI_TEXT.recordsSubtitle}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.18em] opacity-55">
                  <th className="px-2 py-2">{COGNITIVE_HAZARD_EXPOSURE_MIRROR_UI_TEXT.labelColumn}</th>
                  <th className="px-2 py-2">{COGNITIVE_HAZARD_EXPOSURE_MIRROR_UI_TEXT.subjectColumn}</th>
                  <th className="px-2 py-2">{COGNITIVE_HAZARD_EXPOSURE_MIRROR_UI_TEXT.exposureColumn}</th>
                  <th className="px-2 py-2">{COGNITIVE_HAZARD_EXPOSURE_MIRROR_UI_TEXT.memoryColumn}</th>
                  <th className="px-2 py-2">{COGNITIVE_HAZARD_EXPOSURE_MIRROR_UI_TEXT.reviewColumn}</th>
                  <th className="px-2 py-2">{COGNITIVE_HAZARD_EXPOSURE_MIRROR_UI_TEXT.triggerColumn}</th>
                  <th className="px-2 py-2">{COGNITIVE_HAZARD_EXPOSURE_MIRROR_UI_TEXT.confidenceColumn}</th>
                </tr>
              </thead>
              <tbody>
                {view.records.map((record) => (
                  <tr key={record.id} className="border-b border-white/5 align-top">
                    <td className="px-2 py-2">
                      <p className="font-medium">{record.label}</p>
                      <p className="text-xs opacity-55">{record.id}</p>
                      <p className="text-xs opacity-45">{record.summaryLabel}</p>
                    </td>
                    <td className="px-2 py-2">
                      <p className="text-xs opacity-55">
                        {COGNITIVE_HAZARD_EXPOSURE_MIRROR_UI_TEXT.subjectRefPrefix}{' '}
                        {record.subjectRefLabel}
                      </p>
                      <p className="text-xs opacity-45">
                        {record.triggerChannelLabels.length > 0
                          ? record.triggerChannelLabels.join('; ')
                          : '—'}
                      </p>
                    </td>
                    <td className="px-2 py-2">
                      <p className="text-xs opacity-55">
                        {COGNITIVE_HAZARD_EXPOSURE_MIRROR_UI_TEXT.fearPressurePrefix}{' '}
                        {record.fearPressureLabel}
                      </p>
                      <p className="text-xs opacity-55">
                        {COGNITIVE_HAZARD_EXPOSURE_MIRROR_UI_TEXT.memeticExposurePrefix}{' '}
                        {record.memeticExposureLabel}
                      </p>
                      <p className="text-xs opacity-45">
                        {COGNITIVE_HAZARD_EXPOSURE_MIRROR_UI_TEXT.aggregateExposurePrefix}{' '}
                        {record.aggregateExposurePressureLabel}
                      </p>
                    </td>
                    <td className="px-2 py-2">
                      <p>{record.memoryImpairmentBandLabel}</p>
                      <p className="text-xs opacity-55">{record.countermeasurePostureLabel}</p>
                      {record.countermeasureFailedLabel === 'Yes' ? (
                        <p className="text-xs opacity-45">
                          {COGNITIVE_HAZARD_EXPOSURE_MIRROR_UI_TEXT.countermeasureFailedSuffix}
                        </p>
                      ) : null}
                      {record.countermeasureShieldingActiveLabel === 'Yes' ? (
                        <p className="text-xs opacity-45">
                          {COGNITIVE_HAZARD_EXPOSURE_MIRROR_UI_TEXT.countermeasureShieldingSuffix}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      <p>{record.exposureReviewBandLabel}</p>
                      {record.agentDutyDegradedLabel === 'Yes' ? (
                        <p className="text-xs opacity-55">
                          {COGNITIVE_HAZARD_EXPOSURE_MIRROR_UI_TEXT.agentDutySuffix}
                        </p>
                      ) : null}
                      {record.knowledgeIntegrityDegradedLabel === 'Yes' ? (
                        <p className="text-xs opacity-55">
                          {COGNITIVE_HAZARD_EXPOSURE_MIRROR_UI_TEXT.knowledgeIntegritySuffix}
                        </p>
                      ) : null}
                      {record.procedureRestrictionActiveLabel === 'Yes' ? (
                        <p className="text-xs opacity-55">
                          {COGNITIVE_HAZARD_EXPOSURE_MIRROR_UI_TEXT.procedureRestrictionSuffix}
                        </p>
                      ) : null}
                      {record.memoryImpairmentAdvancedLabel === 'Yes' ? (
                        <p className="text-xs opacity-45">
                          {COGNITIVE_HAZARD_EXPOSURE_MIRROR_UI_TEXT.memoryImpairmentAdvancedSuffix}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      {record.simulationTriggerKindLabels.length > 0
                        ? record.simulationTriggerKindLabels.join('; ')
                        : '—'}
                      {record.simulationTriggerChannelLabels.length > 0 ? (
                        <p className="text-xs opacity-45">
                          {record.simulationTriggerChannelLabels.join('; ')}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      {record.confidenceLabel}
                      {record.redacted ? (
                        <p className="text-xs opacity-55">
                          {COGNITIVE_HAZARD_EXPOSURE_MIRROR_UI_TEXT.redactedSuffix}
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
