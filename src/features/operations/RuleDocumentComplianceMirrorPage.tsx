import { useMemo } from 'react'
import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { RULE_DOCUMENT_COMPLIANCE_MIRROR_UI_TEXT } from '../../data/copy'
import { getRuleDocumentComplianceMirrorView } from './ruleDocumentComplianceMirrorView'

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}

export default function RuleDocumentComplianceMirrorPage() {
  const { game } = useGameStore()
  const view = useMemo(() => getRuleDocumentComplianceMirrorView(game), [game])

  return (
    <section className="space-y-4" aria-label="Rule document compliance registry mirror">
      <article className="panel panel-primary space-y-4" role="region" aria-label="Registry summary">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">
              {RULE_DOCUMENT_COMPLIANCE_MIRROR_UI_TEXT.pageEyebrow}
            </p>
            <h2 className="text-xl font-semibold">
              {RULE_DOCUMENT_COMPLIANCE_MIRROR_UI_TEXT.pageHeading}
            </h2>
            <p className="text-sm opacity-60">{RULE_DOCUMENT_COMPLIANCE_MIRROR_UI_TEXT.pageSubtitle}</p>
          </div>
          <Link to={APP_ROUTES.operationsDesk} className="btn btn-sm btn-ghost">
            {RULE_DOCUMENT_COMPLIANCE_MIRROR_UI_TEXT.backToDeskLabel}
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={RULE_DOCUMENT_COMPLIANCE_MIRROR_UI_TEXT.totalRecordsLabel}
            value={String(view.summary.totalRecords)}
          />
          <StatCard
            label={RULE_DOCUMENT_COMPLIANCE_MIRROR_UI_TEXT.breachCountLabel}
            value={String(view.summary.breachCount)}
          />
          <StatCard
            label={RULE_DOCUMENT_COMPLIANCE_MIRROR_UI_TEXT.criticalBandLabel}
            value={String(view.summary.criticalBandCount)}
          />
          <StatCard
            label={RULE_DOCUMENT_COMPLIANCE_MIRROR_UI_TEXT.weekLabel}
            value={`W${view.summary.week}`}
          />
        </div>

        <p className="text-xs opacity-55">{RULE_DOCUMENT_COMPLIANCE_MIRROR_UI_TEXT.readOnlyNote}</p>
      </article>

      {view.isEmpty ? (
        <article className="panel panel-support space-y-2" role="region" aria-label="Empty registry state">
          <h3 className="text-lg font-semibold">{RULE_DOCUMENT_COMPLIANCE_MIRROR_UI_TEXT.emptyTitle}</h3>
          <p className="text-sm opacity-70">{RULE_DOCUMENT_COMPLIANCE_MIRROR_UI_TEXT.emptyBody}</p>
        </article>
      ) : (
        <article
          className="panel panel-support space-y-3"
          role="region"
          aria-label="Persisted rule document compliance records"
        >
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">
              {RULE_DOCUMENT_COMPLIANCE_MIRROR_UI_TEXT.recordsHeading}
            </h3>
            <p className="text-sm opacity-60">{RULE_DOCUMENT_COMPLIANCE_MIRROR_UI_TEXT.recordsSubtitle}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.18em] opacity-55">
                  <th className="px-2 py-2">{RULE_DOCUMENT_COMPLIANCE_MIRROR_UI_TEXT.labelColumn}</th>
                  <th className="px-2 py-2">{RULE_DOCUMENT_COMPLIANCE_MIRROR_UI_TEXT.bindingColumn}</th>
                  <th className="px-2 py-2">{RULE_DOCUMENT_COMPLIANCE_MIRROR_UI_TEXT.complianceColumn}</th>
                  <th className="px-2 py-2">{RULE_DOCUMENT_COMPLIANCE_MIRROR_UI_TEXT.decayColumn}</th>
                  <th className="px-2 py-2">{RULE_DOCUMENT_COMPLIANCE_MIRROR_UI_TEXT.auditColumn}</th>
                  <th className="px-2 py-2">{RULE_DOCUMENT_COMPLIANCE_MIRROR_UI_TEXT.confidenceColumn}</th>
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
                        {RULE_DOCUMENT_COMPLIANCE_MIRROR_UI_TEXT.documentRefPrefix}{' '}
                        {record.documentRefLabel}
                      </p>
                    </td>
                    <td className="px-2 py-2">
                      {record.bindingStrengthLabel}
                      <p className="text-xs opacity-55">
                        {RULE_DOCUMENT_COMPLIANCE_MIRROR_UI_TEXT.physicalCopyPrefix}{' '}
                        {record.physicalCopyRequiredLabel}
                      </p>
                      {record.auditorAssigneeLabels.length > 0 ? (
                        <p className="text-xs opacity-45">
                          {RULE_DOCUMENT_COMPLIANCE_MIRROR_UI_TEXT.auditorPrefix}{' '}
                          {record.auditorAssigneeLabels.join('; ')}
                        </p>
                      ) : null}
                      {record.validationWarningLabels.length > 0 ? (
                        <p className="text-xs text-amber-200/80">
                          {RULE_DOCUMENT_COMPLIANCE_MIRROR_UI_TEXT.validationWarningPrefix}{' '}
                          {record.validationWarningLabels.length}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      {record.complianceStateLabel}
                      {record.breachConsequenceLabel ? (
                        <p className="text-xs opacity-55">
                          {RULE_DOCUMENT_COMPLIANCE_MIRROR_UI_TEXT.breachConsequencePrefix}{' '}
                          {record.breachConsequenceLabel}
                        </p>
                      ) : null}
                      {record.revisionHistoryLabels.length > 0 ? (
                        <p className="text-xs opacity-45">
                          {record.revisionHistoryLabels.join('; ')}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      {record.complianceDecayBandLabel}
                      <p className="text-xs opacity-55">
                        {RULE_DOCUMENT_COMPLIANCE_MIRROR_UI_TEXT.driftProbabilityPrefix}{' '}
                        {record.driftProbabilityLabel}
                      </p>
                      {record.redacted ? (
                        <p className="text-xs opacity-55">
                          {RULE_DOCUMENT_COMPLIANCE_MIRROR_UI_TEXT.redactedSuffix}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      {record.revisionAuditSymptoms.length > 0
                        ? record.revisionAuditSymptoms.map((symptom) => (
                            <p key={`${record.id}:${symptom.ref}`} className="text-xs">
                              {symptom.symptomDescriptor}
                              {symptom.auditGapHintLabel !== '—' ? (
                                <span className="opacity-55"> ({symptom.auditGapHintLabel})</span>
                              ) : null}
                            </p>
                          ))
                        : '—'}
                    </td>
                    <td className="px-2 py-2">{record.confidenceLabel}</td>
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
