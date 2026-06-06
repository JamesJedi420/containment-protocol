import { useMemo } from 'react'
import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { CONTAINED_PERSON_THERAPEUTIC_CARE_MIRROR_UI_TEXT } from '../../data/copy'
import { getContainedPersonTherapeuticCareMirrorView } from './containedPersonTherapeuticCareMirrorView'

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}

export default function ContainedPersonTherapeuticCareMirrorPage() {
  const { game } = useGameStore()
  const view = useMemo(() => getContainedPersonTherapeuticCareMirrorView(game), [game])

  return (
    <section className="space-y-4" aria-label="Contained person therapeutic care registry mirror">
      <article className="panel panel-primary space-y-4" role="region" aria-label="Registry summary">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">
              {CONTAINED_PERSON_THERAPEUTIC_CARE_MIRROR_UI_TEXT.pageEyebrow}
            </p>
            <h2 className="text-xl font-semibold">
              {CONTAINED_PERSON_THERAPEUTIC_CARE_MIRROR_UI_TEXT.pageHeading}
            </h2>
            <p className="text-sm opacity-60">
              {CONTAINED_PERSON_THERAPEUTIC_CARE_MIRROR_UI_TEXT.pageSubtitle}
            </p>
          </div>
          <Link to={APP_ROUTES.operationsDesk} className="btn btn-sm btn-ghost">
            {CONTAINED_PERSON_THERAPEUTIC_CARE_MIRROR_UI_TEXT.backToDeskLabel}
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={CONTAINED_PERSON_THERAPEUTIC_CARE_MIRROR_UI_TEXT.totalRecordsLabel}
            value={String(view.summary.totalRecords)}
          />
          <StatCard
            label={CONTAINED_PERSON_THERAPEUTIC_CARE_MIRROR_UI_TEXT.degradedChannelLabel}
            value={String(view.summary.degradedChannelCount)}
          />
          <StatCard
            label={CONTAINED_PERSON_THERAPEUTIC_CARE_MIRROR_UI_TEXT.suspendedChannelLabel}
            value={String(view.summary.suspendedChannelCount)}
          />
          <StatCard
            label={CONTAINED_PERSON_THERAPEUTIC_CARE_MIRROR_UI_TEXT.weekLabel}
            value={`W${view.summary.week}`}
          />
        </div>

        <p className="text-xs opacity-55">
          {CONTAINED_PERSON_THERAPEUTIC_CARE_MIRROR_UI_TEXT.readOnlyNote}
        </p>
      </article>

      {view.isEmpty ? (
        <article className="panel panel-support space-y-2" role="region" aria-label="Empty registry state">
          <h3 className="text-lg font-semibold">
            {CONTAINED_PERSON_THERAPEUTIC_CARE_MIRROR_UI_TEXT.emptyTitle}
          </h3>
          <p className="text-sm opacity-70">{CONTAINED_PERSON_THERAPEUTIC_CARE_MIRROR_UI_TEXT.emptyBody}</p>
        </article>
      ) : (
        <article
          className="panel panel-support space-y-3"
          role="region"
          aria-label="Persisted contained person therapeutic care records"
        >
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">
              {CONTAINED_PERSON_THERAPEUTIC_CARE_MIRROR_UI_TEXT.recordsHeading}
            </h3>
            <p className="text-sm opacity-60">
              {CONTAINED_PERSON_THERAPEUTIC_CARE_MIRROR_UI_TEXT.recordsSubtitle}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.18em] opacity-55">
                  <th className="px-2 py-2">
                    {CONTAINED_PERSON_THERAPEUTIC_CARE_MIRROR_UI_TEXT.labelColumn}
                  </th>
                  <th className="px-2 py-2">
                    {CONTAINED_PERSON_THERAPEUTIC_CARE_MIRROR_UI_TEXT.scheduleColumn}
                  </th>
                  <th className="px-2 py-2">
                    {CONTAINED_PERSON_THERAPEUTIC_CARE_MIRROR_UI_TEXT.channelColumn}
                  </th>
                  <th className="px-2 py-2">
                    {CONTAINED_PERSON_THERAPEUTIC_CARE_MIRROR_UI_TEXT.complianceColumn}
                  </th>
                  <th className="px-2 py-2">
                    {CONTAINED_PERSON_THERAPEUTIC_CARE_MIRROR_UI_TEXT.staffColumn}
                  </th>
                  <th className="px-2 py-2">
                    {CONTAINED_PERSON_THERAPEUTIC_CARE_MIRROR_UI_TEXT.confidenceColumn}
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
                        {CONTAINED_PERSON_THERAPEUTIC_CARE_MIRROR_UI_TEXT.subjectRefPrefix}{' '}
                        {record.subjectRefLabel}
                      </p>
                    </td>
                    <td className="px-2 py-2">
                      <p>{record.careModeLabel}</p>
                      <p className="text-xs opacity-55">{record.cadenceLabel}</p>
                      {record.containmentDependencyLabel !== '—' ? (
                        <p className="text-xs opacity-45">
                          {CONTAINED_PERSON_THERAPEUTIC_CARE_MIRROR_UI_TEXT.containmentDependencySuffix}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      <p>{record.channelStateLabel}</p>
                      <p className="text-xs opacity-55">
                        {CONTAINED_PERSON_THERAPEUTIC_CARE_MIRROR_UI_TEXT.missedStreakPrefix}{' '}
                        {record.missedSessionStreakLabel}
                      </p>
                      {record.suspensionCauseRefLabel !== '—' ? (
                        <p className="text-xs opacity-45">
                          {CONTAINED_PERSON_THERAPEUTIC_CARE_MIRROR_UI_TEXT.suspensionCausePrefix}{' '}
                          {record.suspensionCauseRefLabel}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      <p className="text-xs opacity-55">
                        {CONTAINED_PERSON_THERAPEUTIC_CARE_MIRROR_UI_TEXT.complianceRiskPrefix}{' '}
                        {record.complianceRiskScoreLabel}
                      </p>
                      {record.lockdownEscalationLikelyLabel !== '—' ? (
                        <p className="text-xs opacity-45">
                          {CONTAINED_PERSON_THERAPEUTIC_CARE_MIRROR_UI_TEXT.lockdownEscalationSuffix}
                        </p>
                      ) : null}
                      {record.redacted ? (
                        <p className="text-xs opacity-45">
                          {CONTAINED_PERSON_THERAPEUTIC_CARE_MIRROR_UI_TEXT.redactedSuffix}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      {record.staffAssigneeRefLabels.length > 0 ? (
                        <p className="text-xs opacity-55">{record.staffAssigneeRefLabels.join('; ')}</p>
                      ) : (
                        <p className="text-xs opacity-45">—</p>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {record.confidenceLabel}
                      {record.validationWarningLabels.length > 0 ? (
                        <p className="text-xs text-amber-200/80">
                          {CONTAINED_PERSON_THERAPEUTIC_CARE_MIRROR_UI_TEXT.validationWarningPrefix}{' '}
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
