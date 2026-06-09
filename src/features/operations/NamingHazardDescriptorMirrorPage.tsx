import { useMemo } from 'react'
import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { NAMING_HAZARD_DESCRIPTOR_MIRROR_UI_TEXT } from '../../data/copy'
import { getNamingHazardDescriptorMirrorView } from './namingHazardDescriptorMirrorView'

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}

export default function NamingHazardDescriptorMirrorPage() {
  const { game } = useGameStore()
  const view = useMemo(() => getNamingHazardDescriptorMirrorView(game), [game])

  return (
    <section className="space-y-4" aria-label="Naming-hazard descriptor registry mirror">
      <article className="panel panel-primary space-y-4" role="region" aria-label="Registry summary">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">
              {NAMING_HAZARD_DESCRIPTOR_MIRROR_UI_TEXT.pageEyebrow}
            </p>
            <h2 className="text-xl font-semibold">
              {NAMING_HAZARD_DESCRIPTOR_MIRROR_UI_TEXT.pageHeading}
            </h2>
            <p className="text-sm opacity-60">
              {NAMING_HAZARD_DESCRIPTOR_MIRROR_UI_TEXT.pageSubtitle}
            </p>
          </div>
          <Link to={APP_ROUTES.operationsDesk} className="btn btn-sm btn-ghost">
            {NAMING_HAZARD_DESCRIPTOR_MIRROR_UI_TEXT.backToDeskLabel}
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label={NAMING_HAZARD_DESCRIPTOR_MIRROR_UI_TEXT.totalRecordsLabel}
            value={String(view.summary.totalRecords)}
          />
          <StatCard
            label={NAMING_HAZARD_DESCRIPTOR_MIRROR_UI_TEXT.redactedSubstitutionLabel}
            value={String(view.summary.redactedSubstitutionCount)}
          />
          <StatCard
            label={NAMING_HAZARD_DESCRIPTOR_MIRROR_UI_TEXT.crossLinkedLabel}
            value={String(view.summary.crossLinkedCount)}
          />
          <StatCard
            label={NAMING_HAZARD_DESCRIPTOR_MIRROR_UI_TEXT.orchestratedLabel}
            value={String(view.summary.orchestratedCount)}
          />
          <StatCard
            label={NAMING_HAZARD_DESCRIPTOR_MIRROR_UI_TEXT.weekLabel}
            value={`W${view.summary.week}`}
          />
        </div>

        <p className="text-xs opacity-55">{NAMING_HAZARD_DESCRIPTOR_MIRROR_UI_TEXT.readOnlyNote}</p>
      </article>

      {view.isEmpty ? (
        <article className="panel panel-support space-y-2" role="region" aria-label="Empty registry state">
          <h3 className="text-lg font-semibold">
            {NAMING_HAZARD_DESCRIPTOR_MIRROR_UI_TEXT.emptyTitle}
          </h3>
          <p className="text-sm opacity-70">{NAMING_HAZARD_DESCRIPTOR_MIRROR_UI_TEXT.emptyBody}</p>
        </article>
      ) : (
        <article
          className="panel panel-support space-y-3"
          role="region"
          aria-label="Persisted naming-hazard descriptor records"
        >
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">
              {NAMING_HAZARD_DESCRIPTOR_MIRROR_UI_TEXT.recordsHeading}
            </h3>
            <p className="text-sm opacity-60">
              {NAMING_HAZARD_DESCRIPTOR_MIRROR_UI_TEXT.recordsSubtitle}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.18em] opacity-55">
                  <th className="px-2 py-2">{NAMING_HAZARD_DESCRIPTOR_MIRROR_UI_TEXT.labelColumn}</th>
                  <th className="px-2 py-2">
                    {NAMING_HAZARD_DESCRIPTOR_MIRROR_UI_TEXT.substitutionColumn}
                  </th>
                  <th className="px-2 py-2">
                    {NAMING_HAZARD_DESCRIPTOR_MIRROR_UI_TEXT.crossLinkColumn}
                  </th>
                  <th className="px-2 py-2">
                    {NAMING_HAZARD_DESCRIPTOR_MIRROR_UI_TEXT.orchestrationColumn}
                  </th>
                  <th className="px-2 py-2">
                    {NAMING_HAZARD_DESCRIPTOR_MIRROR_UI_TEXT.confidenceColumn}
                  </th>
                </tr>
              </thead>
              <tbody>
                {view.records.map((record) => (
                  <tr key={record.id} className="border-b border-white/5 align-top">
                    <td className="px-2 py-2">
                      <p className="font-medium">{record.displayLabel}</p>
                      <p className="text-xs opacity-55">{record.id}</p>
                      <p className="text-xs opacity-45">{record.summaryLabel}</p>
                      {record.safeDescriptorPoolLabels.length > 0 ? (
                        <p className="text-xs opacity-45">
                          {NAMING_HAZARD_DESCRIPTOR_MIRROR_UI_TEXT.poolPrefix}{' '}
                          {record.safeDescriptorPoolLabels.join('; ')}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      <p>{record.uiSubstitutionPolicyLabel}</p>
                      <p className="text-xs opacity-55">
                        {NAMING_HAZARD_DESCRIPTOR_MIRROR_UI_TEXT.mapModePrefix}{' '}
                        {record.mapLabelModeLabel}
                      </p>
                      <p className="text-xs opacity-45">
                        {NAMING_HAZARD_DESCRIPTOR_MIRROR_UI_TEXT.briefingLabelPrefix}{' '}
                        {record.safeBriefingLabel}
                      </p>
                      <p className="text-xs opacity-45">
                        {NAMING_HAZARD_DESCRIPTOR_MIRROR_UI_TEXT.mapLabelPrefix}{' '}
                        {record.safeMapLabel}
                      </p>
                      {record.redacted ? (
                        <p className="text-xs opacity-45">
                          {NAMING_HAZARD_DESCRIPTOR_MIRROR_UI_TEXT.redactedSuffix}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      {record.intakeTopicRefLabel !== '—' ? (
                        <p className="text-xs opacity-55">
                          {NAMING_HAZARD_DESCRIPTOR_MIRROR_UI_TEXT.intakeTopicPrefix}{' '}
                          {record.intakeTopicRefLabel}
                        </p>
                      ) : (
                        <p className="text-xs opacity-45">—</p>
                      )}
                      {record.crossLinkLabels.length > 0 ? (
                        <p className="text-xs opacity-45">{record.crossLinkLabels.join('; ')}</p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      {record.orchestrationWeekLabels.length > 0 ? (
                        <p className="text-xs opacity-55">{record.orchestrationWeekLabels.join('; ')}</p>
                      ) : (
                        <p className="text-xs opacity-45">—</p>
                      )}
                      {record.redactedFieldLabels.length > 0 ? (
                        <p className="text-xs opacity-45">
                          {NAMING_HAZARD_DESCRIPTOR_MIRROR_UI_TEXT.redactedFieldsPrefix}{' '}
                          {record.redactedFieldLabels.join(', ')}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      {record.confidenceLabel}
                      {record.confidenceRedacted ? (
                        <p className="text-xs opacity-45">
                          {NAMING_HAZARD_DESCRIPTOR_MIRROR_UI_TEXT.confidenceRedactedSuffix}
                        </p>
                      ) : null}
                      {record.validationWarningLabels.length > 0 ? (
                        <p className="text-xs text-amber-200/80">
                          {NAMING_HAZARD_DESCRIPTOR_MIRROR_UI_TEXT.validationWarningPrefix}{' '}
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
