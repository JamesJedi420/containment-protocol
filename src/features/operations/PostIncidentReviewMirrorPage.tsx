import { useMemo } from 'react'
import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { POST_INCIDENT_REVIEW_MIRROR_UI_TEXT } from '../../data/copy'
import { getPostIncidentReviewMirrorView } from './postIncidentReviewMirrorView'

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}

export default function PostIncidentReviewMirrorPage() {
  const { game } = useGameStore()
  const view = useMemo(() => getPostIncidentReviewMirrorView(game), [game])

  return (
    <section className="space-y-4" aria-label="Post-incident review registry mirror">
      <article
        className="panel panel-primary space-y-4"
        role="region"
        aria-label="Registry summary"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">
              {POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.pageEyebrow}
            </p>
            <h2 className="text-xl font-semibold">
              {POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.pageHeading}
            </h2>
            <p className="text-sm opacity-60">{POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.pageSubtitle}</p>
          </div>
          <Link to={APP_ROUTES.operationsDesk} className="btn btn-sm btn-ghost">
            {POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.backToDeskLabel}
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <StatCard
            label={POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.totalRecordsLabel}
            value={String(view.summary.totalRecords)}
          />
          <StatCard
            label={POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.qualifyingCaseCloseoutLabel}
            value={String(view.summary.qualifyingCaseCloseoutCount)}
          />
          <StatCard
            label={POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.qualifyingNearCatastropheLabel}
            value={String(view.summary.qualifyingNearCatastropheCount)}
          />
          <StatCard
            label={POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.orchestrationCreatedLabel}
            value={String(view.summary.orchestrationCreatedCount)}
          />
          <StatCard
            label={POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.stubFixtureLabel}
            value={String(view.summary.stubFixtureCount)}
          />
          <StatCard
            label={POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.weekLabel}
            value={`W${view.summary.week}`}
          />
        </div>

        <p className="text-xs opacity-55">{POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.readOnlyNote}</p>
      </article>

      {view.isEmpty ? (
        <article
          className="panel panel-support space-y-2"
          role="region"
          aria-label="Empty registry state"
        >
          <h3 className="text-lg font-semibold">
            {POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.emptyTitle}
          </h3>
          <p className="text-sm opacity-70">{POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.emptyBody}</p>
        </article>
      ) : (
        <>
          {view.hasQualifyingIncidentRecords ? (
            <article
              className="panel panel-support space-y-3"
              role="region"
              aria-label="Qualifying incident review records"
            >
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">
                  {POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.qualifyingRecordsHeading}
                </h3>
                <p className="text-sm opacity-60">
                  {POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.qualifyingRecordsSubtitle}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.18em] opacity-55">
                      <th className="px-2 py-2">{POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.labelColumn}</th>
                      <th className="px-2 py-2">{POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.sourceColumn}</th>
                      <th className="px-2 py-2">{POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.caseIdColumn}</th>
                      <th className="px-2 py-2">
                        {POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.orchestrationWeekColumn}
                      </th>
                      <th className="px-2 py-2">{POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.routeColumn}</th>
                      <th className="px-2 py-2">{POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.closureColumn}</th>
                      <th className="px-2 py-2">
                        {POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.milestoneColumn}
                      </th>
                      <th className="px-2 py-2">
                        {POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.adherenceColumn}
                      </th>
                      <th className="px-2 py-2">
                        {POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.recurrenceColumn}
                      </th>
                      <th className="px-2 py-2">
                        {POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.confidenceColumn}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.qualifyingIncidentRecords.map((record) => (
                      <tr key={record.id} className="border-b border-white/5 align-top">
                        <td className="px-2 py-2">
                          <p className="font-medium">{record.label}</p>
                          <p className="text-xs opacity-55">{record.id}</p>
                          <p className="text-xs opacity-45">{record.summaryLabel}</p>
                        </td>
                        <td className="px-2 py-2">{record.sourceLabel}</td>
                        <td className="px-2 py-2">{record.linkedCaseIdLabel}</td>
                        <td className="px-2 py-2">{record.orchestrationWeekLabel}</td>
                        <td className="px-2 py-2">{record.reviewRouteLabel}</td>
                        <td className="px-2 py-2">{record.closureOutcomeLabel}</td>
                        <td className="px-2 py-2">
                          <p>
                            {POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.milestoneSpanPrefix}{' '}
                            {record.milestoneSpanWeeksLabel}
                          </p>
                          <p className="text-xs opacity-55">
                            {POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.reportingPrefix}{' '}
                            {record.reportingWeekLabel}
                          </p>
                        </td>
                        <td className="px-2 py-2">{record.procedureAdherenceScoreLabel}</td>
                        <td className="px-2 py-2">{record.recurrenceObservedLabel}</td>
                        <td className="px-2 py-2">{record.confidenceLabel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ) : null}

          <article
            className="panel panel-support space-y-3"
            role="region"
            aria-label="Persisted post-incident review records"
          >
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">
              {POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.recordsHeading}
            </h3>
            <p className="text-sm opacity-60">
              {POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.recordsSubtitle}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.18em] opacity-55">
                  <th className="px-2 py-2">{POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.labelColumn}</th>
                  <th className="px-2 py-2">{POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.sourceColumn}</th>
                  <th className="px-2 py-2">{POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.routeColumn}</th>
                  <th className="px-2 py-2">{POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.closureColumn}</th>
                  <th className="px-2 py-2">
                    {POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.milestoneColumn}
                  </th>
                  <th className="px-2 py-2">
                    {POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.adherenceColumn}
                  </th>
                  <th className="px-2 py-2">
                    {POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.recurrenceColumn}
                  </th>
                  <th className="px-2 py-2">
                    {POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.confidenceColumn}
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
                      {record.unknownFieldLabels.length > 0 ? (
                        <p className="text-xs opacity-45">
                          {POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.unknownFieldsPrefix}{' '}
                          {record.unknownFieldLabels.join('; ')}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      <p>{record.sourceLabel}</p>
                      {record.orchestrationWeekLabel !== '—' ? (
                        <p className="text-xs opacity-55">{record.orchestrationWeekLabel}</p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">{record.reviewRouteLabel}</td>
                    <td className="px-2 py-2">{record.closureOutcomeLabel}</td>
                    <td className="px-2 py-2">
                      <p>
                        {POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.milestoneSpanPrefix}{' '}
                        {record.milestoneSpanWeeksLabel}
                      </p>
                      <p className="text-xs opacity-55">
                        {POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.discoveryPrefix}{' '}
                        {record.discoveryWeekLabel}
                      </p>
                      <p className="text-xs opacity-55">
                        {POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.responsePrefix}{' '}
                        {record.responseWeekLabel}
                      </p>
                      <p className="text-xs opacity-55">
                        {POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.containmentPrefix}{' '}
                        {record.containmentWeekLabel}
                      </p>
                      <p className="text-xs opacity-55">
                        {POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.recoveryPrefix}{' '}
                        {record.recoveryWeekLabel}
                      </p>
                      <p className="text-xs opacity-55">
                        {POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.reportingPrefix}{' '}
                        {record.reportingWeekLabel}
                      </p>
                    </td>
                    <td className="px-2 py-2">
                      {record.procedureAdherenceScoreLabel}
                      {record.redacted ? (
                        <p className="text-xs opacity-55">
                          {POST_INCIDENT_REVIEW_MIRROR_UI_TEXT.redactedSuffix}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">{record.recurrenceObservedLabel}</td>
                    <td className="px-2 py-2">{record.confidenceLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
        </>
      )}
    </section>
  )
}
