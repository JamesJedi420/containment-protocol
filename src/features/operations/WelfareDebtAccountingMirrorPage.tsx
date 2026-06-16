import { useMemo } from 'react'
import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { WELFARE_DEBT_ACCOUNTING_MIRROR_UI_TEXT } from '../../data/copy'
import { getWelfareDebtAccountingMirrorView } from './welfareDebtAccountingMirrorView'

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}

export default function WelfareDebtAccountingMirrorPage() {
  const { game } = useGameStore()
  const view = useMemo(() => getWelfareDebtAccountingMirrorView(game), [game])

  return (
    <section className="space-y-4" aria-label="Welfare debt accounting registry mirror">
      <article className="panel panel-primary space-y-4" role="region" aria-label="Registry summary">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">
              {WELFARE_DEBT_ACCOUNTING_MIRROR_UI_TEXT.pageEyebrow}
            </p>
            <h2 className="text-xl font-semibold">
              {WELFARE_DEBT_ACCOUNTING_MIRROR_UI_TEXT.pageHeading}
            </h2>
            <p className="text-sm opacity-60">
              {WELFARE_DEBT_ACCOUNTING_MIRROR_UI_TEXT.pageSubtitle}
            </p>
          </div>
          <Link to={APP_ROUTES.operationsDesk} className="btn btn-sm btn-ghost">
            {WELFARE_DEBT_ACCOUNTING_MIRROR_UI_TEXT.backToDeskLabel}
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={WELFARE_DEBT_ACCOUNTING_MIRROR_UI_TEXT.totalRecordsLabel}
            value={String(view.summary.totalRecords)}
          />
          <StatCard
            label={WELFARE_DEBT_ACCOUNTING_MIRROR_UI_TEXT.unresolvedCountLabel}
            value={String(view.summary.unresolvedCount)}
          />
          <StatCard
            label={WELFARE_DEBT_ACCOUNTING_MIRROR_UI_TEXT.escalatedCountLabel}
            value={String(view.summary.escalatedCount)}
          />
          <StatCard
            label={WELFARE_DEBT_ACCOUNTING_MIRROR_UI_TEXT.mitigatedCountLabel}
            value={String(view.summary.mitigatedCount)}
          />
          <StatCard
            label={WELFARE_DEBT_ACCOUNTING_MIRROR_UI_TEXT.crossLinkedCountLabel}
            value={String(view.summary.crossLinkedCount)}
          />
          <StatCard
            label={WELFARE_DEBT_ACCOUNTING_MIRROR_UI_TEXT.weekLabel}
            value={`W${view.summary.week}`}
          />
        </div>

        <p className="text-xs opacity-55">
          {WELFARE_DEBT_ACCOUNTING_MIRROR_UI_TEXT.readOnlyNote}
        </p>
      </article>

      {view.isEmpty ? (
        <article className="panel panel-support space-y-2" role="region" aria-label="Empty registry state">
          <h3 className="text-lg font-semibold">
            {WELFARE_DEBT_ACCOUNTING_MIRROR_UI_TEXT.emptyTitle}
          </h3>
          <p className="text-sm opacity-70">{WELFARE_DEBT_ACCOUNTING_MIRROR_UI_TEXT.emptyBody}</p>
        </article>
      ) : (
        <article
          className="panel panel-support space-y-3"
          role="region"
          aria-label="Persisted welfare debt accounting records"
        >
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">
              {WELFARE_DEBT_ACCOUNTING_MIRROR_UI_TEXT.recordsHeading}
            </h3>
            <p className="text-sm opacity-60">
              {WELFARE_DEBT_ACCOUNTING_MIRROR_UI_TEXT.recordsSubtitle}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.18em] opacity-55">
                  <th className="px-2 py-2">
                    {WELFARE_DEBT_ACCOUNTING_MIRROR_UI_TEXT.labelColumn}
                  </th>
                  <th className="px-2 py-2">
                    {WELFARE_DEBT_ACCOUNTING_MIRROR_UI_TEXT.debtColumn}
                  </th>
                  <th className="px-2 py-2">
                    {WELFARE_DEBT_ACCOUNTING_MIRROR_UI_TEXT.procedureColumn}
                  </th>
                  <th className="px-2 py-2">
                    {WELFARE_DEBT_ACCOUNTING_MIRROR_UI_TEXT.reviewColumn}
                  </th>
                  <th className="px-2 py-2">
                    {WELFARE_DEBT_ACCOUNTING_MIRROR_UI_TEXT.crossLinkColumn}
                  </th>
                  <th className="px-2 py-2">
                    {WELFARE_DEBT_ACCOUNTING_MIRROR_UI_TEXT.confidenceColumn}
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
                        {WELFARE_DEBT_ACCOUNTING_MIRROR_UI_TEXT.subjectRefPrefix}{' '}
                        {record.subjectRefLabel}
                      </p>
                    </td>
                    <td className="px-2 py-2">
                      {record.debtCategoryLabel}
                      <p className="text-xs opacity-55">{record.severityBandLabel}</p>
                      <p className="text-xs opacity-45">{record.mitigationStateLabel}</p>
                    </td>
                    <td className="px-2 py-2">
                      {record.sourceProcedureLabel}
                      <p className="text-xs opacity-55">
                        {WELFARE_DEBT_ACCOUNTING_MIRROR_UI_TEXT.containmentBenefitPrefix}{' '}
                        {record.containmentBenefitScoreLabel}
                      </p>
                      {record.redacted ? (
                        <p className="text-xs opacity-45">
                          {WELFARE_DEBT_ACCOUNTING_MIRROR_UI_TEXT.redactedSuffix}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      <p className="text-xs opacity-55">
                        {WELFARE_DEBT_ACCOUNTING_MIRROR_UI_TEXT.reviewOwnerPrefix}{' '}
                        {record.reviewOwnerLabel}
                      </p>
                      <p className="text-xs opacity-45">
                        {WELFARE_DEBT_ACCOUNTING_MIRROR_UI_TEXT.mitigationPathPrefix}{' '}
                        {record.mitigationPathLabel}
                      </p>
                      {record.factionEthicsProjectionLabels.length > 0 ? (
                        <p className="text-xs opacity-45">
                          {WELFARE_DEBT_ACCOUNTING_MIRROR_UI_TEXT.factionEthicsProjectionPrefix}{' '}
                          {record.factionEthicsProjectionLabels.join('; ')}
                        </p>
                      ) : null}
                      {record.accountabilityMatrixProjectionLabels.length > 0 ? (
                        <p className="text-xs opacity-45">
                          {
                            WELFARE_DEBT_ACCOUNTING_MIRROR_UI_TEXT.accountabilityMatrixProjectionPrefix
                          }{' '}
                          {record.accountabilityMatrixProjectionLabels.join('; ')}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      {record.crossLinkLabels.length > 0 ? (
                        <p className="text-xs opacity-45">{record.crossLinkLabels.join('; ')}</p>
                      ) : (
                        <p className="text-xs opacity-45">—</p>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {record.confidenceLabel}
                      {record.validationWarningLabels.length > 0 ? (
                        <p className="text-xs text-amber-200/80">
                          {WELFARE_DEBT_ACCOUNTING_MIRROR_UI_TEXT.validationWarningPrefix}{' '}
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
