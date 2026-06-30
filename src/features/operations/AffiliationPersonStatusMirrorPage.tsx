import { useMemo } from 'react'
import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT } from '../../data/copy'
import { getAffiliationPersonStatusMirrorView } from './affiliationPersonStatusMirrorView'

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}

function LabelStack({ labels }: { labels: readonly string[] }) {
  return (
    <>
      {labels.map((label) => (
        <p key={label} className="text-xs opacity-55">
          {label}
        </p>
      ))}
    </>
  )
}

export default function AffiliationPersonStatusMirrorPage() {
  const game = useGameStore((state) => state.game)
  const recordAffiliationFileWorkQueueAction = useGameStore(
    (state) => state.recordAffiliationFileWorkQueueAction
  )
  const recordAffiliationFileWorkQueueEvidenceResolution = useGameStore(
    (state) => state.recordAffiliationFileWorkQueueEvidenceResolution
  )
  const view = useMemo(() => getAffiliationPersonStatusMirrorView(game), [game])

  return (
    <section className="space-y-4" aria-label="Affiliation person-status mirror">
      <article
        className="panel panel-primary space-y-4"
        role="region"
        aria-label="Person-status summary"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">
              {AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.pageEyebrow}
            </p>
            <h2 className="text-xl font-semibold">
              {AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.pageHeading}
            </h2>
            <p className="text-sm opacity-60">
              {AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.pageSubtitle}
            </p>
          </div>
          <Link to={APP_ROUTES.operationsDesk} className="btn btn-sm btn-ghost">
            {AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.backToDeskLabel}
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <StatCard
            label={AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.totalRecordsLabel}
            value={String(view.summary.totalRecords)}
          />
          <StatCard
            label={AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.candidateLinkedLabel}
            value={String(view.summary.candidateLinkedCount)}
          />
          <StatCard
            label={AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.welfareLinkedLabel}
            value={String(view.summary.welfareLinkedCount)}
          />
          <StatCard
            label={AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.restrictedOrBlockedLabel}
            value={String(view.summary.restrictedOrBlockedCount)}
          />
          <StatCard
            label={AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.missingReferenceLabel}
            value={String(view.summary.missingReferenceCount)}
          />
          <StatCard
            label={AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.weekLabel}
            value={`W${view.summary.week}`}
          />
        </div>

        <p className="text-xs opacity-55">
          {AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.readOnlyNote}
        </p>
      </article>

      {view.isEmpty ? (
        <article
          className="panel panel-support space-y-2"
          role="region"
          aria-label="Empty person-status state"
        >
          <h3 className="text-lg font-semibold">
            {AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.emptyTitle}
          </h3>
          <p className="text-sm opacity-70">{AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.emptyBody}</p>
        </article>
      ) : (
        <>
          <article
            className="panel panel-support space-y-3"
            role="region"
            aria-label="File access work queue"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">
                  {AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.fileAccessQueueHeading}
                </h3>
                <p className="text-sm opacity-60">
                  {AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.fileAccessQueueSubtitle}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-right text-xs sm:grid-cols-4">
                <p>
                  {AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.fileAccessQueueTotalLabel}{' '}
                  <span className="font-semibold">{view.summary.fileAccessWorkQueueCount}</span>
                </p>
                <p>
                  {AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.fileAccessQueueBlockedLabel}{' '}
                  <span className="font-semibold">{view.summary.fileAccessBlockedCount}</span>
                </p>
                <p>
                  {AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.fileAccessQueueRestrictedLabel}{' '}
                  <span className="font-semibold">{view.summary.fileAccessRestrictedCount}</span>
                </p>
                <p>
                  {AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.fileAccessQueueMissingLabel}{' '}
                  <span className="font-semibold">{view.summary.fileAccessMissingReviewCount}</span>
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.18em] opacity-55">
                    <th className="px-2 py-2">
                      {AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.fileAccessQueueStatusColumn}
                    </th>
                    <th className="px-2 py-2">
                      {AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.subjectColumn}
                    </th>
                    <th className="px-2 py-2">
                      {AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.fileAccessColumn}
                    </th>
                    <th className="px-2 py-2">
                      {AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.facilityFileAccessColumn}
                    </th>
                    <th className="px-2 py-2">
                      {AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.siteClearanceColumn}
                    </th>
                    <th className="px-2 py-2">
                      {AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.recommendedActionColumn}
                    </th>
                    <th className="px-2 py-2">
                      {AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.actionStatusColumn}
                    </th>
                    <th className="px-2 py-2">
                      {AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.reasonCodesColumn}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {view.fileAccessWorkQueue.map((entry) => (
                    <tr key={entry.id} className="border-b border-white/5 align-top">
                      <td className="px-2 py-2 font-medium">{entry.bucketLabel}</td>
                      <td className="px-2 py-2">
                        <p className="font-medium">{entry.subjectLabel}</p>
                        <p className="text-xs opacity-55">{entry.id}</p>
                        <p className="text-xs opacity-45">{entry.subjectId}</p>
                      </td>
                      <td className="px-2 py-2 text-xs opacity-55">{entry.fileAccessLabel}</td>
                      <td className="px-2 py-2 text-xs opacity-55">
                        {entry.facilityFileAccessLabel}
                      </td>
                      <td className="px-2 py-2">
                        <p className="text-xs opacity-55">{entry.siteLabel}</p>
                        <p className="text-xs opacity-55">{entry.facilityLabel}</p>
                      </td>
                      <td className="px-2 py-2">
                        <p className="text-xs font-medium">{entry.recommendedActionLabel}</p>
                        <p className="text-xs opacity-55">{entry.recommendedActionDetail}</p>
                      </td>
                      <td className="px-2 py-2">
                        {entry.isRecommendedActionRecorded ? (
                          <p className="text-xs font-medium">{entry.recordedActionLabel}</p>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-xs btn-primary whitespace-nowrap"
                            onClick={() => recordAffiliationFileWorkQueueAction(entry.id)}
                          >
                            {AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.recordActionButtonLabel}
                          </button>
                        )}
                        {!entry.isRecommendedActionRecorded ? (
                          <p className="mt-1 text-xs opacity-55">
                            {AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.pendingActionStatusLabel}
                          </p>
                        ) : null}
                        {entry.isEvidenceResolutionRecorded ? (
                          <p className="mt-2 text-xs font-medium">
                            {entry.evidenceResolutionLabel}
                          </p>
                        ) : entry.canRecordEvidenceResolution ? (
                          <button
                            type="button"
                            className="btn btn-xs btn-ghost mt-2 whitespace-nowrap"
                            onClick={() =>
                              recordAffiliationFileWorkQueueEvidenceResolution(entry.id)
                            }
                          >
                            {
                              AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.recordEvidenceResolutionButtonLabel
                            }
                          </button>
                        ) : null}
                        {entry.canRecordEvidenceResolution ? (
                          <p className="mt-1 text-xs opacity-55">
                            {
                              AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.pendingEvidenceResolutionStatusLabel
                            }
                          </p>
                        ) : null}
                      </td>
                      <td className="px-2 py-2">
                        <LabelStack labels={entry.reasonCodeLabels} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article
            className="panel panel-support space-y-3"
            role="region"
            aria-label="Persisted affiliation person-status records"
          >
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">
                {AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.recordsHeading}
              </h3>
              <p className="text-sm opacity-60">
                {AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.recordsSubtitle}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.18em] opacity-55">
                    <th className="px-2 py-2">
                      {AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.subjectColumn}
                    </th>
                    <th className="px-2 py-2">
                      {AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.linksColumn}
                    </th>
                    <th className="px-2 py-2">
                      {AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.onboardingColumn}
                    </th>
                    <th className="px-2 py-2">
                      {AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.permissionsColumn}
                    </th>
                    <th className="px-2 py-2">
                      {AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.roomAccessColumn}
                    </th>
                    <th className="px-2 py-2">
                      {AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.fileAccessColumn}
                    </th>
                    <th className="px-2 py-2">
                      {AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.facilityFileAccessColumn}
                    </th>
                    <th className="px-2 py-2">
                      {AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.housingAccessColumn}
                    </th>
                    <th className="px-2 py-2">
                      {AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.siteClearanceColumn}
                    </th>
                    <th className="px-2 py-2">
                      {AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.dualLoyaltyColumn}
                    </th>
                    <th className="px-2 py-2">
                      {AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.protectedStatusColumn}
                    </th>
                    <th className="px-2 py-2">
                      {AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.revocationColumn}
                    </th>
                    <th className="px-2 py-2">
                      {AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.reasonCodesColumn}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {view.records.map((record) => (
                    <tr key={record.id} className="border-b border-white/5 align-top">
                      <td className="px-2 py-2">
                        <p className="font-medium">{record.subjectLabel}</p>
                        <p className="text-xs opacity-55">{record.id}</p>
                        <p className="text-xs opacity-45">{record.subjectId}</p>
                      </td>
                      <td className="px-2 py-2">
                        <p className="text-xs opacity-55">
                          {AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.candidateRefPrefix}{' '}
                          {record.candidateRefLabel}
                        </p>
                        <p className="text-xs opacity-55">
                          {AFFILIATION_PERSON_STATUS_MIRROR_UI_TEXT.welfareRefPrefix}{' '}
                          {record.entityWelfareReclassificationRefLabel}
                        </p>
                      </td>
                      <td className="px-2 py-2">
                        <LabelStack labels={record.onboardingLabels} />
                      </td>
                      <td className="px-2 py-2">
                        <LabelStack labels={record.permissionDecisionLabels} />
                      </td>
                      <td className="px-2 py-2">
                        <LabelStack labels={record.roomAccessLabels} />
                      </td>
                      <td className="px-2 py-2">
                        <LabelStack labels={record.fileAccessLabels} />
                      </td>
                      <td className="px-2 py-2">
                        <LabelStack labels={record.facilityFileAccessLabels} />
                      </td>
                      <td className="px-2 py-2">
                        <LabelStack labels={record.housingAccessLabels} />
                      </td>
                      <td className="px-2 py-2">
                        <LabelStack labels={record.siteClearanceLabels} />
                      </td>
                      <td className="px-2 py-2">
                        <LabelStack labels={record.dualLoyaltyLabels} />
                      </td>
                      <td className="px-2 py-2">
                        <LabelStack labels={record.protectedStatusLabels} />
                      </td>
                      <td className="px-2 py-2">
                        <LabelStack labels={record.revocationLabels} />
                      </td>
                      <td className="px-2 py-2">
                        <LabelStack labels={record.reasonCodeLabels} />
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
