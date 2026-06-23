import { useMemo } from 'react'
import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { ENTITY_WELFARE_RECLASSIFICATION_MIRROR_UI_TEXT } from '../../data/copy'
import { getEntityWelfareReclassificationMirrorView } from './entityWelfareReclassificationMirrorView'

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}

export default function EntityWelfareReclassificationMirrorPage() {
  const { game } = useGameStore()
  const view = useMemo(() => getEntityWelfareReclassificationMirrorView(game), [game])

  return (
    <section className="space-y-4" aria-label="Entity welfare reclassification registry mirror">
      <article
        className="panel panel-primary space-y-4"
        role="region"
        aria-label="Registry summary"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">
              {ENTITY_WELFARE_RECLASSIFICATION_MIRROR_UI_TEXT.pageEyebrow}
            </p>
            <h2 className="text-xl font-semibold">
              {ENTITY_WELFARE_RECLASSIFICATION_MIRROR_UI_TEXT.pageHeading}
            </h2>
            <p className="text-sm opacity-60">
              {ENTITY_WELFARE_RECLASSIFICATION_MIRROR_UI_TEXT.pageSubtitle}
            </p>
          </div>
          <Link to={APP_ROUTES.operationsDesk} className="btn btn-sm btn-ghost">
            {ENTITY_WELFARE_RECLASSIFICATION_MIRROR_UI_TEXT.backToDeskLabel}
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={ENTITY_WELFARE_RECLASSIFICATION_MIRROR_UI_TEXT.totalRecordsLabel}
            value={String(view.summary.totalRecords)}
          />
          <StatCard
            label={ENTITY_WELFARE_RECLASSIFICATION_MIRROR_UI_TEXT.pendingCountLabel}
            value={String(view.summary.pendingCount)}
          />
          <StatCard
            label={ENTITY_WELFARE_RECLASSIFICATION_MIRROR_UI_TEXT.terminalCountLabel}
            value={String(view.summary.terminalCount)}
          />
          <StatCard
            label={ENTITY_WELFARE_RECLASSIFICATION_MIRROR_UI_TEXT.weekLabel}
            value={`W${view.summary.week}`}
          />
        </div>

        <p className="text-xs opacity-55">
          {ENTITY_WELFARE_RECLASSIFICATION_MIRROR_UI_TEXT.readOnlyNote}
        </p>
      </article>

      {view.isEmpty ? (
        <article
          className="panel panel-support space-y-2"
          role="region"
          aria-label="Empty registry state"
        >
          <h3 className="text-lg font-semibold">
            {ENTITY_WELFARE_RECLASSIFICATION_MIRROR_UI_TEXT.emptyTitle}
          </h3>
          <p className="text-sm opacity-70">
            {ENTITY_WELFARE_RECLASSIFICATION_MIRROR_UI_TEXT.emptyBody}
          </p>
        </article>
      ) : (
        <article
          className="panel panel-support space-y-3"
          role="region"
          aria-label="Persisted entity welfare reclassification records"
        >
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">
              {ENTITY_WELFARE_RECLASSIFICATION_MIRROR_UI_TEXT.recordsHeading}
            </h3>
            <p className="text-sm opacity-60">
              {ENTITY_WELFARE_RECLASSIFICATION_MIRROR_UI_TEXT.recordsSubtitle}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.18em] opacity-55">
                  <th className="px-2 py-2">
                    {ENTITY_WELFARE_RECLASSIFICATION_MIRROR_UI_TEXT.labelColumn}
                  </th>
                  <th className="px-2 py-2">
                    {ENTITY_WELFARE_RECLASSIFICATION_MIRROR_UI_TEXT.dispositionColumn}
                  </th>
                  <th className="px-2 py-2">
                    {ENTITY_WELFARE_RECLASSIFICATION_MIRROR_UI_TEXT.permissionsColumn}
                  </th>
                  <th className="px-2 py-2">
                    {ENTITY_WELFARE_RECLASSIFICATION_MIRROR_UI_TEXT.accessOutcomeColumn}
                  </th>
                  <th className="px-2 py-2">
                    {ENTITY_WELFARE_RECLASSIFICATION_MIRROR_UI_TEXT.siteClearanceColumn}
                  </th>
                  <th className="px-2 py-2">
                    {ENTITY_WELFARE_RECLASSIFICATION_MIRROR_UI_TEXT.dualLoyaltyColumn}
                  </th>
                  <th className="px-2 py-2">
                    {ENTITY_WELFARE_RECLASSIFICATION_MIRROR_UI_TEXT.pressureColumn}
                  </th>
                  <th className="px-2 py-2">
                    {ENTITY_WELFARE_RECLASSIFICATION_MIRROR_UI_TEXT.reviewColumn}
                  </th>
                  <th className="px-2 py-2">
                    {ENTITY_WELFARE_RECLASSIFICATION_MIRROR_UI_TEXT.confidenceColumn}
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
                        {ENTITY_WELFARE_RECLASSIFICATION_MIRROR_UI_TEXT.priorThreatPrefix}{' '}
                        {record.priorThreatLabel}
                      </p>
                    </td>
                    <td className="px-2 py-2">
                      {record.proposedDispositionLabel}
                      <p className="text-xs opacity-55">{record.reclassificationStateLabel}</p>
                      <p className="text-xs opacity-45">
                        {ENTITY_WELFARE_RECLASSIFICATION_MIRROR_UI_TEXT.reviewGatePrefix}{' '}
                        {record.reviewGateLabel}
                      </p>
                      {record.welfareDebtLinkedLabel !== '—' ? (
                        <p className="text-xs opacity-45">
                          {ENTITY_WELFARE_RECLASSIFICATION_MIRROR_UI_TEXT.welfareDebtLinkedSuffix}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      {record.permissionDecisionLabels.map((label) => (
                        <p key={label} className="text-xs opacity-55">
                          {label}
                        </p>
                      ))}
                    </td>
                    <td className="px-2 py-2">
                      {record.accessOutcomeLabels.map((label) => (
                        <p key={label} className="text-xs opacity-55">
                          {label}
                        </p>
                      ))}
                    </td>
                    <td className="px-2 py-2">
                      {record.siteClearanceLabels.map((label) => (
                        <p key={label} className="text-xs opacity-55">
                          {label}
                        </p>
                      ))}
                    </td>
                    <td className="px-2 py-2">
                      {record.dualLoyaltyRiskLabels.map((label) => (
                        <p key={label} className="text-xs opacity-55">
                          {label}
                        </p>
                      ))}
                    </td>
                    <td className="px-2 py-2">
                      <p className="text-xs opacity-55">
                        {ENTITY_WELFARE_RECLASSIFICATION_MIRROR_UI_TEXT.staffMoralePrefix}{' '}
                        {record.staffMoraleForecastLabel}
                      </p>
                      <p className="text-xs opacity-55">
                        {ENTITY_WELFARE_RECLASSIFICATION_MIRROR_UI_TEXT.liabilityPrefix}{' '}
                        {record.liabilityForecastLabel}
                      </p>
                      <p className="text-xs opacity-45">
                        {ENTITY_WELFARE_RECLASSIFICATION_MIRROR_UI_TEXT.publicRiskPrefix}{' '}
                        {record.publicRiskForecastLabel}
                      </p>
                      {record.redacted ? (
                        <p className="text-xs opacity-45">
                          {ENTITY_WELFARE_RECLASSIFICATION_MIRROR_UI_TEXT.redactedSuffix}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      {record.evidenceBundleRefLabels.length > 0 ? (
                        <p className="text-xs opacity-55">
                          {record.evidenceBundleRefLabels.join('; ')}
                        </p>
                      ) : (
                        <p className="text-xs opacity-45">—</p>
                      )}
                      {record.containmentRevisionRefLabels.length > 0 ? (
                        <p className="text-xs opacity-45">
                          {ENTITY_WELFARE_RECLASSIFICATION_MIRROR_UI_TEXT.containmentRevisionPrefix}{' '}
                          {record.containmentRevisionRefLabels.join('; ')}
                        </p>
                      ) : null}
                      {record.transitionHistoryLabels.length > 0 ? (
                        <p className="text-xs opacity-45">
                          {record.transitionHistoryLabels.join('; ')}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      {record.confidenceLabel}
                      {record.validationWarningLabels.length > 0 ? (
                        <p className="text-xs text-amber-200/80">
                          {ENTITY_WELFARE_RECLASSIFICATION_MIRROR_UI_TEXT.validationWarningPrefix}{' '}
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
