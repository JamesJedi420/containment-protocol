import { useMemo } from 'react'
import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { COERCIVE_CONTAINED_PERSON_PROTOCOL_MIRROR_UI_TEXT } from '../../data/copy'
import { getCoerciveContainedPersonProtocolMirrorView } from './coerciveContainedPersonProtocolMirrorView'

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}

export default function CoerciveContainedPersonProtocolMirrorPage() {
  const { game } = useGameStore()
  const view = useMemo(() => getCoerciveContainedPersonProtocolMirrorView(game), [game])

  return (
    <section className="space-y-4" aria-label="Coercive contained person protocol registry mirror">
      <article className="panel panel-primary space-y-4" role="region" aria-label="Registry summary">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">
              {COERCIVE_CONTAINED_PERSON_PROTOCOL_MIRROR_UI_TEXT.pageEyebrow}
            </p>
            <h2 className="text-xl font-semibold">
              {COERCIVE_CONTAINED_PERSON_PROTOCOL_MIRROR_UI_TEXT.pageHeading}
            </h2>
            <p className="text-sm opacity-60">
              {COERCIVE_CONTAINED_PERSON_PROTOCOL_MIRROR_UI_TEXT.pageSubtitle}
            </p>
          </div>
          <Link to={APP_ROUTES.operationsDesk} className="btn btn-sm btn-ghost">
            {COERCIVE_CONTAINED_PERSON_PROTOCOL_MIRROR_UI_TEXT.backToDeskLabel}
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={COERCIVE_CONTAINED_PERSON_PROTOCOL_MIRROR_UI_TEXT.totalRecordsLabel}
            value={String(view.summary.totalRecords)}
          />
          <StatCard
            label={COERCIVE_CONTAINED_PERSON_PROTOCOL_MIRROR_UI_TEXT.stableContainmentLabel}
            value={String(view.summary.stableContainmentDominatesCareCount)}
          />
          <StatCard
            label={COERCIVE_CONTAINED_PERSON_PROTOCOL_MIRROR_UI_TEXT.abusivePostureLabel}
            value={String(view.summary.abusivePostureCount)}
          />
          <StatCard
            label={COERCIVE_CONTAINED_PERSON_PROTOCOL_MIRROR_UI_TEXT.weekLabel}
            value={`W${view.summary.week}`}
          />
        </div>

        <p className="text-xs opacity-55">
          {COERCIVE_CONTAINED_PERSON_PROTOCOL_MIRROR_UI_TEXT.readOnlyNote}
        </p>
      </article>

      {view.isEmpty ? (
        <article className="panel panel-support space-y-2" role="region" aria-label="Empty registry state">
          <h3 className="text-lg font-semibold">
            {COERCIVE_CONTAINED_PERSON_PROTOCOL_MIRROR_UI_TEXT.emptyTitle}
          </h3>
          <p className="text-sm opacity-70">{COERCIVE_CONTAINED_PERSON_PROTOCOL_MIRROR_UI_TEXT.emptyBody}</p>
        </article>
      ) : (
        <article
          className="panel panel-support space-y-3"
          role="region"
          aria-label="Persisted coercive contained person protocol records"
        >
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">
              {COERCIVE_CONTAINED_PERSON_PROTOCOL_MIRROR_UI_TEXT.recordsHeading}
            </h3>
            <p className="text-sm opacity-60">
              {COERCIVE_CONTAINED_PERSON_PROTOCOL_MIRROR_UI_TEXT.recordsSubtitle}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.18em] opacity-55">
                  <th className="px-2 py-2">
                    {COERCIVE_CONTAINED_PERSON_PROTOCOL_MIRROR_UI_TEXT.labelColumn}
                  </th>
                  <th className="px-2 py-2">
                    {COERCIVE_CONTAINED_PERSON_PROTOCOL_MIRROR_UI_TEXT.handlingColumn}
                  </th>
                  <th className="px-2 py-2">
                    {COERCIVE_CONTAINED_PERSON_PROTOCOL_MIRROR_UI_TEXT.tradeoffColumn}
                  </th>
                  <th className="px-2 py-2">
                    {COERCIVE_CONTAINED_PERSON_PROTOCOL_MIRROR_UI_TEXT.riskReviewColumn}
                  </th>
                  <th className="px-2 py-2">
                    {COERCIVE_CONTAINED_PERSON_PROTOCOL_MIRROR_UI_TEXT.ownerRefsColumn}
                  </th>
                  <th className="px-2 py-2">
                    {COERCIVE_CONTAINED_PERSON_PROTOCOL_MIRROR_UI_TEXT.confidenceColumn}
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
                        {COERCIVE_CONTAINED_PERSON_PROTOCOL_MIRROR_UI_TEXT.subjectRefPrefix}{' '}
                        {record.subjectRefLabel}
                      </p>
                    </td>
                    <td className="px-2 py-2">
                      <p>{record.handlingModeLabel}</p>
                      <p className="text-xs opacity-55">{record.handlingPostureLabel}</p>
                      <p className="text-xs opacity-45">
                        {COERCIVE_CONTAINED_PERSON_PROTOCOL_MIRROR_UI_TEXT.subjectFitPrefix}{' '}
                        {record.subjectFitStateLabel}
                      </p>
                      <p className="text-xs opacity-45">
                        {COERCIVE_CONTAINED_PERSON_PROTOCOL_MIRROR_UI_TEXT.consentPrefix}{' '}
                        {record.consentConfidenceLabel}
                      </p>
                    </td>
                    <td className="px-2 py-2">
                      <p className="text-xs opacity-55">
                        {COERCIVE_CONTAINED_PERSON_PROTOCOL_MIRROR_UI_TEXT.stabilityGainPrefix}{' '}
                        {record.containmentStabilityGainLabel}
                      </p>
                      <p className="text-xs opacity-45">
                        {COERCIVE_CONTAINED_PERSON_PROTOCOL_MIRROR_UI_TEXT.harmRiskPrefix}{' '}
                        {record.personhoodHarmRiskLabel} / {record.trustDamageRiskLabel} /{' '}
                        {record.legitimacyRiskLabel}
                      </p>
                      {record.stableContainmentDominatesCareLabel !== '—' ? (
                        <p className="text-xs opacity-45">
                          {COERCIVE_CONTAINED_PERSON_PROTOCOL_MIRROR_UI_TEXT.stableContainmentSuffix}
                        </p>
                      ) : null}
                      <p className="text-xs opacity-45">{record.welfareDebtImpactLabel}</p>
                      {record.redacted ? (
                        <p className="text-xs opacity-45">
                          {COERCIVE_CONTAINED_PERSON_PROTOCOL_MIRROR_UI_TEXT.redactedSuffix}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      <p className="text-xs opacity-55">
                        {COERCIVE_CONTAINED_PERSON_PROTOCOL_MIRROR_UI_TEXT.coercionRiskPrefix}{' '}
                        {record.coercionRiskScoreLabel}
                      </p>
                      {record.contradictionRiskFlagLabels.length > 0 ? (
                        <p className="text-xs opacity-45">
                          {record.contradictionRiskFlagLabels.join('; ')}
                        </p>
                      ) : null}
                      {record.contradictionCheckViews.length > 0 ? (
                        <div className="mt-1 space-y-1 text-xs opacity-45">
                          <p>
                            {COERCIVE_CONTAINED_PERSON_PROTOCOL_MIRROR_UI_TEXT.contradictionCheckPrefix}
                          </p>
                          {record.contradictionCheckViews.map((check) => (
                            <div key={check.flagLabel}>
                              <p className="opacity-55">{check.flagLabel}</p>
                              {check.issueDetailLabels.map((detail) => (
                                <p key={detail} className="pl-2 opacity-45">
                                  {detail}
                                </p>
                              ))}
                              {check.redacted ? (
                                <p className="pl-2 opacity-45">
                                  {COERCIVE_CONTAINED_PERSON_PROTOCOL_MIRROR_UI_TEXT.redactedSuffix}
                                </p>
                              ) : null}
                              {check.unknownFieldLabels.length > 0 ? (
                                <p className="pl-2 opacity-45">
                                  {
                                    COERCIVE_CONTAINED_PERSON_PROTOCOL_MIRROR_UI_TEXT.contradictionCheckUnknownFieldsPrefix
                                  }{' '}
                                  {check.unknownFieldLabels.join(', ')}
                                </p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <p className="text-xs opacity-45">
                        {record.forcePolicyLabel} · {record.refusalHandlingLabel}
                      </p>
                    </td>
                    <td className="px-2 py-2">
                      {record.medicationRegimenRefLabel !== '—' ? (
                        <p className="text-xs opacity-55">{record.medicationRegimenRefLabel}</p>
                      ) : null}
                      {record.custodyStatusRefLabel !== '—' ? (
                        <p className="text-xs opacity-45">{record.custodyStatusRefLabel}</p>
                      ) : null}
                      {record.procedureRefLabel !== '—' ? (
                        <p className="text-xs opacity-45">{record.procedureRefLabel}</p>
                      ) : null}
                      {record.subjectFitValidationRefLabel !== '—' ? (
                        <p className="text-xs opacity-45">{record.subjectFitValidationRefLabel}</p>
                      ) : null}
                      {record.medicationRegimenRefLabel === '—' &&
                      record.custodyStatusRefLabel === '—' &&
                      record.procedureRefLabel === '—' &&
                      record.subjectFitValidationRefLabel === '—' ? (
                        <p className="text-xs opacity-45">—</p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      {record.confidenceLabel}
                      {record.validationWarningLabels.length > 0 ? (
                        <p className="text-xs text-amber-200/80">
                          {COERCIVE_CONTAINED_PERSON_PROTOCOL_MIRROR_UI_TEXT.validationWarningPrefix}{' '}
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
