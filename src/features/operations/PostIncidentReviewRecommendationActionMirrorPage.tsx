import { useMemo } from 'react'
import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { POST_INCIDENT_REVIEW_RECOMMENDATION_ACTION_MIRROR_UI_TEXT } from '../../data/copy'
import { getPostIncidentReviewRecommendationActionMirrorView } from './postIncidentReviewRecommendationActionMirrorView'

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}

export default function PostIncidentReviewRecommendationActionMirrorPage() {
  const { game } = useGameStore()
  const view = useMemo(() => getPostIncidentReviewRecommendationActionMirrorView(game), [game])

  return (
    <section className="space-y-4" aria-label="Post-incident recommendation action registry mirror">
      <article
        className="panel panel-primary space-y-4"
        role="region"
        aria-label="Registry summary"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">
              {POST_INCIDENT_REVIEW_RECOMMENDATION_ACTION_MIRROR_UI_TEXT.pageEyebrow}
            </p>
            <h2 className="text-xl font-semibold">
              {POST_INCIDENT_REVIEW_RECOMMENDATION_ACTION_MIRROR_UI_TEXT.pageHeading}
            </h2>
            <p className="text-sm opacity-60">
              {POST_INCIDENT_REVIEW_RECOMMENDATION_ACTION_MIRROR_UI_TEXT.pageSubtitle}
            </p>
          </div>
          <Link to={APP_ROUTES.operationsDesk} className="btn btn-sm btn-ghost">
            {POST_INCIDENT_REVIEW_RECOMMENDATION_ACTION_MIRROR_UI_TEXT.backToDeskLabel}
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={POST_INCIDENT_REVIEW_RECOMMENDATION_ACTION_MIRROR_UI_TEXT.totalRecordsLabel}
            value={String(view.summary.totalRecords)}
          />
          <StatCard
            label={
              POST_INCIDENT_REVIEW_RECOMMENDATION_ACTION_MIRROR_UI_TEXT.linkedRecommendationLabel
            }
            value={String(view.summary.linkedRecommendationCount)}
          />
          <StatCard
            label={
              POST_INCIDENT_REVIEW_RECOMMENDATION_ACTION_MIRROR_UI_TEXT.linkedQualifyingReviewLabel
            }
            value={String(view.summary.linkedQualifyingReviewCount)}
          />
          <StatCard
            label={POST_INCIDENT_REVIEW_RECOMMENDATION_ACTION_MIRROR_UI_TEXT.weekLabel}
            value={`W${view.summary.week}`}
          />
        </div>

        <p className="text-xs opacity-55">
          {POST_INCIDENT_REVIEW_RECOMMENDATION_ACTION_MIRROR_UI_TEXT.readOnlyNote}
        </p>
      </article>

      {view.isEmpty ? (
        <article
          className="panel panel-support space-y-2"
          role="region"
          aria-label="Empty registry state"
        >
          <h3 className="text-lg font-semibold">
            {POST_INCIDENT_REVIEW_RECOMMENDATION_ACTION_MIRROR_UI_TEXT.emptyTitle}
          </h3>
          <p className="text-sm opacity-70">
            {POST_INCIDENT_REVIEW_RECOMMENDATION_ACTION_MIRROR_UI_TEXT.emptyBody}
          </p>
        </article>
      ) : (
        <>
          {view.hasLinkedQualifyingReviews ? (
            <article
              className="panel panel-support space-y-3"
              role="region"
              aria-label="Actions linked to qualifying incident reviews"
            >
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">
                  {POST_INCIDENT_REVIEW_RECOMMENDATION_ACTION_MIRROR_UI_TEXT.linkedRecordsHeading}
                </h3>
                <p className="text-sm opacity-60">
                  {POST_INCIDENT_REVIEW_RECOMMENDATION_ACTION_MIRROR_UI_TEXT.linkedRecordsSubtitle}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.18em] opacity-55">
                      <th className="px-2 py-2">
                        {POST_INCIDENT_REVIEW_RECOMMENDATION_ACTION_MIRROR_UI_TEXT.labelColumn}
                      </th>
                      <th className="px-2 py-2">
                        {
                          POST_INCIDENT_REVIEW_RECOMMENDATION_ACTION_MIRROR_UI_TEXT.recommendationRefColumn
                        }
                      </th>
                      <th className="px-2 py-2">
                        {POST_INCIDENT_REVIEW_RECOMMENDATION_ACTION_MIRROR_UI_TEXT.reviewRefColumn}
                      </th>
                      <th className="px-2 py-2">
                        {
                          POST_INCIDENT_REVIEW_RECOMMENDATION_ACTION_MIRROR_UI_TEXT.linkedReviewColumn
                        }
                      </th>
                      <th className="px-2 py-2">
                        {POST_INCIDENT_REVIEW_RECOMMENDATION_ACTION_MIRROR_UI_TEXT.stubSuffixColumn}
                      </th>
                      <th className="px-2 py-2">
                        {
                          POST_INCIDENT_REVIEW_RECOMMENDATION_ACTION_MIRROR_UI_TEXT.orchestrationWeekColumn
                        }
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.linkedQualifyingRecords.map((record) => (
                      <tr key={record.id} className="border-b border-white/5 align-top">
                        <td className="px-2 py-2">
                          <p className="font-medium">{record.label}</p>
                          <p className="text-xs opacity-55">{record.id}</p>
                        </td>
                        <td className="px-2 py-2">
                          <p>{record.recommendationRefLabel}</p>
                          {record.linkedRecommendation ? (
                            <Link
                              to={APP_ROUTES.postIncidentReviewRecommendations}
                              className="text-xs opacity-55 underline-offset-2 hover:underline"
                            >
                              {
                                POST_INCIDENT_REVIEW_RECOMMENDATION_ACTION_MIRROR_UI_TEXT.openRecommendationMirrorLabel
                              }
                            </Link>
                          ) : null}
                        </td>
                        <td className="px-2 py-2">
                          <p>{record.reviewRefLabel}</p>
                          <Link
                            to={APP_ROUTES.postIncidentReview}
                            className="text-xs opacity-55 underline-offset-2 hover:underline"
                          >
                            {
                              POST_INCIDENT_REVIEW_RECOMMENDATION_ACTION_MIRROR_UI_TEXT.openReviewMirrorLabel
                            }
                          </Link>
                        </td>
                        <td className="px-2 py-2">
                          <p>{record.linkedQualifyingReview?.reviewLabel}</p>
                          <p className="text-xs opacity-55">
                            {record.linkedQualifyingReview?.sourceLabel}
                          </p>
                          <p className="text-xs opacity-45">
                            {POST_INCIDENT_REVIEW_RECOMMENDATION_ACTION_MIRROR_UI_TEXT.caseIdPrefix}{' '}
                            {record.linkedQualifyingReview?.linkedCaseIdLabel}
                          </p>
                        </td>
                        <td className="px-2 py-2">{record.stubSuffixLabel}</td>
                        <td className="px-2 py-2">{record.orchestrationWeekLabel}</td>
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
            aria-label="Persisted post-incident recommendation action records"
          >
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">
                {POST_INCIDENT_REVIEW_RECOMMENDATION_ACTION_MIRROR_UI_TEXT.recordsHeading}
              </h3>
              <p className="text-sm opacity-60">
                {POST_INCIDENT_REVIEW_RECOMMENDATION_ACTION_MIRROR_UI_TEXT.recordsSubtitle}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.18em] opacity-55">
                    <th className="px-2 py-2">
                      {POST_INCIDENT_REVIEW_RECOMMENDATION_ACTION_MIRROR_UI_TEXT.labelColumn}
                    </th>
                    <th className="px-2 py-2">
                      {
                        POST_INCIDENT_REVIEW_RECOMMENDATION_ACTION_MIRROR_UI_TEXT.recommendationRefColumn
                      }
                    </th>
                    <th className="px-2 py-2">
                      {POST_INCIDENT_REVIEW_RECOMMENDATION_ACTION_MIRROR_UI_TEXT.reviewRefColumn}
                    </th>
                    <th className="px-2 py-2">
                      {POST_INCIDENT_REVIEW_RECOMMENDATION_ACTION_MIRROR_UI_TEXT.stubSuffixColumn}
                    </th>
                    <th className="px-2 py-2">
                      {
                        POST_INCIDENT_REVIEW_RECOMMENDATION_ACTION_MIRROR_UI_TEXT.orchestrationWeekColumn
                      }
                    </th>
                    <th className="px-2 py-2">
                      {POST_INCIDENT_REVIEW_RECOMMENDATION_ACTION_MIRROR_UI_TEXT.actionTokenColumn}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {view.records.map((record) => (
                    <tr key={record.id} className="border-b border-white/5 align-top">
                      <td className="px-2 py-2">
                        <p className="font-medium">{record.label}</p>
                        <p className="text-xs opacity-55">{record.id}</p>
                        {record.linkedRecommendation ? (
                          <p className="text-xs opacity-45">
                            {
                              POST_INCIDENT_REVIEW_RECOMMENDATION_ACTION_MIRROR_UI_TEXT.linkedRecommendationPrefix
                            }{' '}
                            {record.linkedRecommendation.recommendationLabel}
                          </p>
                        ) : null}
                        {record.linkedQualifyingReview ? (
                          <p className="text-xs opacity-45">
                            {POST_INCIDENT_REVIEW_RECOMMENDATION_ACTION_MIRROR_UI_TEXT.linkedReviewPrefix}{' '}
                            {record.linkedQualifyingReview.reviewLabel}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-2 py-2">
                        <p>{record.recommendationRefLabel}</p>
                        {record.linkedRecommendation ? (
                          <Link
                            to={APP_ROUTES.postIncidentReviewRecommendations}
                            className="text-xs opacity-55 underline-offset-2 hover:underline"
                          >
                            {
                              POST_INCIDENT_REVIEW_RECOMMENDATION_ACTION_MIRROR_UI_TEXT.openRecommendationMirrorLabel
                            }
                          </Link>
                        ) : null}
                      </td>
                      <td className="px-2 py-2">
                        <p>{record.reviewRefLabel}</p>
                        {record.linkedQualifyingReview ? (
                          <Link
                            to={APP_ROUTES.postIncidentReview}
                            className="text-xs opacity-55 underline-offset-2 hover:underline"
                          >
                            {
                              POST_INCIDENT_REVIEW_RECOMMENDATION_ACTION_MIRROR_UI_TEXT.openReviewMirrorLabel
                            }
                          </Link>
                        ) : null}
                      </td>
                      <td className="px-2 py-2">{record.stubSuffixLabel}</td>
                      <td className="px-2 py-2">{record.orchestrationWeekLabel}</td>
                      <td className="px-2 py-2">
                        <p className="text-xs opacity-55">{record.actionTokenLabel}</p>
                      </td>
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
