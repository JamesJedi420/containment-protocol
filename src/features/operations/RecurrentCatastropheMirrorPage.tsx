import { useMemo } from 'react'
import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { RECURRENT_CATASTROPHE_MIRROR_UI_TEXT } from '../../data/copy'
import { getRecurrentCatastropheMirrorView } from './recurrentCatastropheMirrorView'
import { getRecurrentCatastrophePostIncidentReviewLinksView } from './recurrentCatastrophePostIncidentReviewLinksView'

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}

export default function RecurrentCatastropheMirrorPage() {
  const { game } = useGameStore()
  const view = useMemo(() => getRecurrentCatastropheMirrorView(game), [game])
  const linksView = useMemo(
    () => getRecurrentCatastrophePostIncidentReviewLinksView(game),
    [game]
  )
  const linksByRecordId = useMemo(() => {
    const map = new Map<string, (typeof linksView.records)[number]>()
    for (const record of linksView.records) {
      map.set(record.recordId, record)
    }
    return map
  }, [linksView])

  return (
    <section className="space-y-4" aria-label="Recurrent catastrophe amelioration registry mirror">
      <article className="panel panel-primary space-y-4" role="region" aria-label="Registry summary">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">
              {RECURRENT_CATASTROPHE_MIRROR_UI_TEXT.pageEyebrow}
            </p>
            <h2 className="text-xl font-semibold">
              {RECURRENT_CATASTROPHE_MIRROR_UI_TEXT.pageHeading}
            </h2>
            <p className="text-sm opacity-60">{RECURRENT_CATASTROPHE_MIRROR_UI_TEXT.pageSubtitle}</p>
          </div>
          <Link to={APP_ROUTES.operationsDesk} className="btn btn-sm btn-ghost">
            {RECURRENT_CATASTROPHE_MIRROR_UI_TEXT.backToDeskLabel}
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <StatCard
            label={RECURRENT_CATASTROPHE_MIRROR_UI_TEXT.totalRecordsLabel}
            value={String(view.summary.totalRecords)}
          />
          <StatCard
            label={RECURRENT_CATASTROPHE_MIRROR_UI_TEXT.impossiblePreventionLabel}
            value={String(view.summary.impossiblePreventionCount)}
          />
          <StatCard
            label={RECURRENT_CATASTROPHE_MIRROR_UI_TEXT.criticalSeverityLabel}
            value={String(view.summary.criticalSeverityCount)}
          />
          <StatCard
            label={RECURRENT_CATASTROPHE_MIRROR_UI_TEXT.linkedReviewsLabel}
            value={String(linksView.summary.totalLinkedReviews)}
          />
          <StatCard
            label={RECURRENT_CATASTROPHE_MIRROR_UI_TEXT.unresolvedReviewRefsLabel}
            value={String(linksView.summary.totalUnresolvedReviewRefs)}
          />
          <StatCard
            label={RECURRENT_CATASTROPHE_MIRROR_UI_TEXT.weekLabel}
            value={`W${view.summary.week}`}
          />
        </div>

        <p className="text-xs opacity-55">{RECURRENT_CATASTROPHE_MIRROR_UI_TEXT.readOnlyNote}</p>
      </article>

      {view.isEmpty ? (
        <article className="panel panel-support space-y-2" role="region" aria-label="Empty registry state">
          <h3 className="text-lg font-semibold">{RECURRENT_CATASTROPHE_MIRROR_UI_TEXT.emptyTitle}</h3>
          <p className="text-sm opacity-70">{RECURRENT_CATASTROPHE_MIRROR_UI_TEXT.emptyBody}</p>
        </article>
      ) : (
        <article
          className="panel panel-support space-y-3"
          role="region"
          aria-label="Persisted recurrent catastrophe amelioration records"
        >
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">
              {RECURRENT_CATASTROPHE_MIRROR_UI_TEXT.recordsHeading}
            </h3>
            <p className="text-sm opacity-60">{RECURRENT_CATASTROPHE_MIRROR_UI_TEXT.recordsSubtitle}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.18em] opacity-55">
                  <th className="px-2 py-2">{RECURRENT_CATASTROPHE_MIRROR_UI_TEXT.labelColumn}</th>
                  <th className="px-2 py-2">{RECURRENT_CATASTROPHE_MIRROR_UI_TEXT.cadenceColumn}</th>
                  <th className="px-2 py-2">{RECURRENT_CATASTROPHE_MIRROR_UI_TEXT.preventionColumn}</th>
                  <th className="px-2 py-2">{RECURRENT_CATASTROPHE_MIRROR_UI_TEXT.recurrenceColumn}</th>
                  <th className="px-2 py-2">{RECURRENT_CATASTROPHE_MIRROR_UI_TEXT.riskColumn}</th>
                  <th className="px-2 py-2">
                    {RECURRENT_CATASTROPHE_MIRROR_UI_TEXT.reviewLinksColumn}
                  </th>
                  <th className="px-2 py-2">{RECURRENT_CATASTROPHE_MIRROR_UI_TEXT.confidenceColumn}</th>
                </tr>
              </thead>
              <tbody>
                {view.records.map((record) => {
                  const linkRecord = linksByRecordId.get(record.id)

                  return (
                  <tr key={record.id} className="border-b border-white/5 align-top">
                    <td className="px-2 py-2">
                      <p className="font-medium">{record.label}</p>
                      <p className="text-xs opacity-55">{record.id}</p>
                      <p className="text-xs opacity-45">{record.summaryLabel}</p>
                      <p className="text-xs opacity-45">
                        {RECURRENT_CATASTROPHE_MIRROR_UI_TEXT.failureModePrefix}{' '}
                        {record.failureModeLabel}
                      </p>
                    </td>
                    <td className="px-2 py-2">
                      {record.recurrenceCadenceLabel}
                      {record.activeAmeliorationLabels.length > 0 ? (
                        <p className="text-xs opacity-55">
                          {RECURRENT_CATASTROPHE_MIRROR_UI_TEXT.ameliorationPrefix}{' '}
                          {record.activeAmeliorationLabels.join('; ')}
                        </p>
                      ) : null}
                      {record.validationWarningLabels.length > 0 ? (
                        <p className="text-xs text-amber-200/80">
                          {RECURRENT_CATASTROPHE_MIRROR_UI_TEXT.validationWarningPrefix}{' '}
                          {record.validationWarningLabels.length}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      {record.preventionCeilingLabel}
                      {record.activePreventionLabels.length > 0 ? (
                        <p className="text-xs opacity-55">
                          {RECURRENT_CATASTROPHE_MIRROR_UI_TEXT.preventionTacticPrefix}{' '}
                          {record.activePreventionLabels.join('; ')}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      {record.recurrenceCountLabel}
                      <p className="text-xs opacity-55">
                        {RECURRENT_CATASTROPHE_MIRROR_UI_TEXT.lastOccurrencePrefix}{' '}
                        {record.lastOccurrenceWeekLabel}
                      </p>
                      {record.damageLedgerRefLabels.length > 0 ? (
                        <p className="text-xs opacity-45">
                          {RECURRENT_CATASTROPHE_MIRROR_UI_TEXT.damageLedgerPrefix}{' '}
                          {record.damageLedgerRefLabels.join('; ')}
                        </p>
                      ) : null}
                      {record.postIncidentReviewRefLabels.length > 0 ? (
                        <p className="text-xs opacity-45">
                          {RECURRENT_CATASTROPHE_MIRROR_UI_TEXT.reviewRefPrefix}{' '}
                          {record.postIncidentReviewRefLabels.join('; ')}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      {record.severityBandLabel}
                      <p className="text-xs opacity-55">
                        {RECURRENT_CATASTROPHE_MIRROR_UI_TEXT.riskScorePrefix}{' '}
                        {record.recurrenceRiskScoreLabel}
                      </p>
                      <p className="text-xs opacity-55">
                        {RECURRENT_CATASTROPHE_MIRROR_UI_TEXT.activeAmeliorationCountPrefix}{' '}
                        {record.activeAmeliorationCountLabel}
                      </p>
                      {record.redacted ? (
                        <p className="text-xs opacity-55">
                          {RECURRENT_CATASTROPHE_MIRROR_UI_TEXT.redactedSuffix}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      {linkRecord && linkRecord.reviewLinks.length > 0 ? (
                        linkRecord.reviewLinks.map((link) => (
                          <div key={link.reviewRefLabel} className="mb-2 last:mb-0">
                            <p className="text-xs opacity-55">{link.reviewRefLabel}</p>
                            <p>{link.reviewRouteLabel}</p>
                            <p className="text-xs opacity-55">{link.closureOutcomeLabel}</p>
                            {link.redacted ? (
                              <p className="text-xs opacity-45">
                                {RECURRENT_CATASTROPHE_MIRROR_UI_TEXT.redactedSuffix}
                              </p>
                            ) : null}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs opacity-45">—</p>
                      )}
                      {linkRecord && linkRecord.unresolvedReviewRefLabels.length > 0 ? (
                        <p className="text-xs text-amber-200/80">
                          {RECURRENT_CATASTROPHE_MIRROR_UI_TEXT.unresolvedReviewRefPrefix}{' '}
                          {linkRecord.unresolvedReviewRefLabels.join('; ')}
                        </p>
                      ) : null}
                      {linkRecord && linkRecord.reviewRefValidationWarningLabels.length > 0 ? (
                        <p className="text-xs text-amber-200/80">
                          {RECURRENT_CATASTROPHE_MIRROR_UI_TEXT.validationWarningPrefix}{' '}
                          {linkRecord.reviewRefValidationWarningLabels.length}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">{record.confidenceLabel}</td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </article>
      )}
    </section>
  )
}
