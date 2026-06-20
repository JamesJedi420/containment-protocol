import { useMemo } from 'react'
import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { PUBLISH_QUEUE_MIRROR_UI_TEXT } from '../../data/copy'
import { getPublishQueueMirrorView } from './publishQueueMirrorView'

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}

export default function PublishQueueMirrorPage() {
  const { game } = useGameStore()
  const view = useMemo(() => getPublishQueueMirrorView(game), [game])

  return (
    <section className="space-y-4" aria-label="Publish queue mirror">
      <article className="panel panel-primary space-y-4" role="region" aria-label="Publish queue summary">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">
              {PUBLISH_QUEUE_MIRROR_UI_TEXT.pageEyebrow}
            </p>
            <h2 className="text-xl font-semibold">{PUBLISH_QUEUE_MIRROR_UI_TEXT.pageHeading}</h2>
            <p className="text-sm opacity-60">{PUBLISH_QUEUE_MIRROR_UI_TEXT.pageSubtitle}</p>
          </div>
          <Link to={APP_ROUTES.operationsDesk} className="btn btn-sm btn-ghost">
            {PUBLISH_QUEUE_MIRROR_UI_TEXT.backToDeskLabel}
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={PUBLISH_QUEUE_MIRROR_UI_TEXT.totalRecordsLabel}
            value={String(view.summary.totalRecords)}
          />
          <StatCard
            label={PUBLISH_QUEUE_MIRROR_UI_TEXT.readyToPublishLabel}
            value={String(view.summary.readyToPublishCount)}
          />
          <StatCard
            label={PUBLISH_QUEUE_MIRROR_UI_TEXT.publishedLabel}
            value={String(view.summary.publishedCount)}
          />
          <StatCard
            label={PUBLISH_QUEUE_MIRROR_UI_TEXT.weekLabel}
            value={`W${view.summary.week}`}
          />
        </div>

        <p className="text-xs opacity-55">{PUBLISH_QUEUE_MIRROR_UI_TEXT.readOnlyNote}</p>
      </article>

      {view.isEmpty ? (
        <article className="panel panel-support space-y-2" role="region" aria-label="Empty queue state">
          <h3 className="text-lg font-semibold">{PUBLISH_QUEUE_MIRROR_UI_TEXT.emptyTitle}</h3>
          <p className="text-sm opacity-70">{PUBLISH_QUEUE_MIRROR_UI_TEXT.emptyBody}</p>
        </article>
      ) : (
        <article
          className="panel panel-support space-y-3"
          role="region"
          aria-label="Persisted publish queue records"
        >
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">{PUBLISH_QUEUE_MIRROR_UI_TEXT.recordsHeading}</h3>
            <p className="text-sm opacity-60">{PUBLISH_QUEUE_MIRROR_UI_TEXT.recordsSubtitle}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.18em] opacity-55">
                  <th className="px-2 py-2">{PUBLISH_QUEUE_MIRROR_UI_TEXT.labelColumn}</th>
                  <th className="px-2 py-2">{PUBLISH_QUEUE_MIRROR_UI_TEXT.statusColumn}</th>
                  <th className="px-2 py-2">{PUBLISH_QUEUE_MIRROR_UI_TEXT.artifactColumn}</th>
                  <th className="px-2 py-2">{PUBLISH_QUEUE_MIRROR_UI_TEXT.queuedWeekColumn}</th>
                  <th className="px-2 py-2">{PUBLISH_QUEUE_MIRROR_UI_TEXT.hooksColumn}</th>
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
                    <td className="px-2 py-2">{record.statusLabel}</td>
                    <td className="px-2 py-2">{record.releaseArtifactRef}</td>
                    <td className="px-2 py-2">{record.queuedWeekLabel}</td>
                    <td className="px-2 py-2">
                      {record.creditingHookCount} crediting / {record.publishHookCount} publish
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}

      <article
        className="panel panel-support space-y-4"
        role="region"
        aria-label="Execution receipt ledger"
      >
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">{PUBLISH_QUEUE_MIRROR_UI_TEXT.receiptsHeading}</h3>
          <p className="text-sm opacity-60">{PUBLISH_QUEUE_MIRROR_UI_TEXT.receiptsSubtitle}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={PUBLISH_QUEUE_MIRROR_UI_TEXT.totalReceiptsLabel}
            value={String(view.receiptSummary.totalReceipts)}
          />
          <StatCard
            label={PUBLISH_QUEUE_MIRROR_UI_TEXT.completedDryRunLabel}
            value={String(view.receiptSummary.completedDryRunCount)}
          />
          <StatCard
            label={PUBLISH_QUEUE_MIRROR_UI_TEXT.completedLiveLabel}
            value={String(view.receiptSummary.completedLiveCount)}
          />
          <StatCard
            label={PUBLISH_QUEUE_MIRROR_UI_TEXT.rejectedOrSkippedLabel}
            value={String(
              view.receiptSummary.rejectedCount + view.receiptSummary.skippedReportableCount
            )}
          />
        </div>

        {view.receiptsEmpty ? (
          <div className="space-y-2" role="region" aria-label="Empty execution receipt ledger">
            <h4 className="font-semibold">{PUBLISH_QUEUE_MIRROR_UI_TEXT.receiptsEmptyTitle}</h4>
            <p className="text-sm opacity-70">{PUBLISH_QUEUE_MIRROR_UI_TEXT.receiptsEmptyBody}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.18em] opacity-55">
                  <th className="px-2 py-2">{PUBLISH_QUEUE_MIRROR_UI_TEXT.receiptLabelColumn}</th>
                  <th className="px-2 py-2">{PUBLISH_QUEUE_MIRROR_UI_TEXT.receiptWeekColumn}</th>
                  <th className="px-2 py-2">{PUBLISH_QUEUE_MIRROR_UI_TEXT.receiptOutcomeColumn}</th>
                  <th className="px-2 py-2">{PUBLISH_QUEUE_MIRROR_UI_TEXT.receiptModeColumn}</th>
                  <th className="px-2 py-2">{PUBLISH_QUEUE_MIRROR_UI_TEXT.receiptChannelColumn}</th>
                  <th className="px-2 py-2">{PUBLISH_QUEUE_MIRROR_UI_TEXT.receiptHooksColumn}</th>
                </tr>
              </thead>
              <tbody>
                {view.receipts.map((receipt) => (
                  <tr key={receipt.mapKey} className="border-b border-white/5 align-top">
                    <td className="px-2 py-2">
                      <p className="font-medium">{receipt.recordLabel}</p>
                      <p className="text-xs opacity-55">{receipt.recordId}</p>
                    </td>
                    <td className="px-2 py-2">{receipt.executionWeekLabel}</td>
                    <td className="px-2 py-2">
                      {receipt.outcomeLabel}
                      {receipt.skipCodeLabel ? (
                        <span className="block text-xs opacity-55">({receipt.skipCodeLabel})</span>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">{receipt.executionModeLabel}</td>
                    <td className="px-2 py-2">{receipt.channelLabel}</td>
                    <td className="px-2 py-2">{receipt.appliedHookCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  )
}
