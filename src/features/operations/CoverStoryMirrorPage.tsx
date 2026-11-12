import { useMemo } from 'react'
import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { COVER_STORY_MIRROR_UI_TEXT } from '../../data/copy'
import { getCoverStoryMirrorView } from './coverStoryMirrorView'

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}

export default function CoverStoryMirrorPage() {
  const { game } = useGameStore()
  const view = useMemo(() => getCoverStoryMirrorView(game), [game])

  return (
    <section className="space-y-4" aria-label="Cover-story lifecycle registry mirror">
      <article className="panel panel-primary space-y-4" role="region" aria-label="Registry summary">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">
              {COVER_STORY_MIRROR_UI_TEXT.pageEyebrow}
            </p>
            <h2 className="text-xl font-semibold">{COVER_STORY_MIRROR_UI_TEXT.pageHeading}</h2>
            <p className="text-sm opacity-60">{COVER_STORY_MIRROR_UI_TEXT.pageSubtitle}</p>
          </div>
          <Link to={APP_ROUTES.operationsDesk} className="btn btn-sm btn-ghost">
            {COVER_STORY_MIRROR_UI_TEXT.backToDeskLabel}
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label={COVER_STORY_MIRROR_UI_TEXT.totalRecordsLabel}
            value={String(view.summary.totalRecords)}
          />
          <StatCard
            label={COVER_STORY_MIRROR_UI_TEXT.coverStressActiveLabel}
            value={String(view.summary.coverStressActiveCount)}
          />
          <StatCard
            label={COVER_STORY_MIRROR_UI_TEXT.coverCollapsedLabel}
            value={String(view.summary.coverCollapsedCount)}
          />
          <StatCard
            label={COVER_STORY_MIRROR_UI_TEXT.repairInProgressLabel}
            value={String(view.summary.repairInProgressCount)}
          />
          <StatCard
            label={COVER_STORY_MIRROR_UI_TEXT.weekLabel}
            value={`W${view.summary.week}`}
          />
        </div>

        <p className="text-xs opacity-55">{COVER_STORY_MIRROR_UI_TEXT.readOnlyNote}</p>
      </article>

      {view.isEmpty ? (
        <article className="panel panel-support space-y-2" role="region" aria-label="Empty registry state">
          <h3 className="text-lg font-semibold">{COVER_STORY_MIRROR_UI_TEXT.emptyTitle}</h3>
          <p className="text-sm opacity-70">{COVER_STORY_MIRROR_UI_TEXT.emptyBody}</p>
        </article>
      ) : (
        <article
          className="panel panel-support space-y-3"
          role="region"
          aria-label="Persisted cover-story records"
        >
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">{COVER_STORY_MIRROR_UI_TEXT.recordsHeading}</h3>
            <p className="text-sm opacity-60">{COVER_STORY_MIRROR_UI_TEXT.recordsSubtitle}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.18em] opacity-55">
                  <th className="px-2 py-2">{COVER_STORY_MIRROR_UI_TEXT.labelColumn}</th>
                  <th className="px-2 py-2">{COVER_STORY_MIRROR_UI_TEXT.lifecycleColumn}</th>
                  <th className="px-2 py-2">{COVER_STORY_MIRROR_UI_TEXT.contradictionColumn}</th>
                  <th className="px-2 py-2">{COVER_STORY_MIRROR_UI_TEXT.opsFlagsColumn}</th>
                  <th className="px-2 py-2">{COVER_STORY_MIRROR_UI_TEXT.weeklySnapshotColumn}</th>
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
                        {record.subjectKindLabel}: {record.subjectRef}
                      </p>
                      <p className="text-xs opacity-45">
                        {COVER_STORY_MIRROR_UI_TEXT.motivationPrefix} {record.coverMotivationLabel}
                      </p>
                      <p className="text-xs opacity-45">
                        {COVER_STORY_MIRROR_UI_TEXT.exposurePrefix} {record.exposureKindLabel}
                      </p>
                      <p className="text-xs opacity-45">
                        {COVER_STORY_MIRROR_UI_TEXT.confidenceColumn}: {record.confidenceLabel}
                      </p>
                      {record.unknownFieldsLabel !== '—' ? (
                        <p className="text-xs opacity-45">
                          {COVER_STORY_MIRROR_UI_TEXT.unknownFieldsPrefix}{' '}
                          {record.unknownFieldsLabel}
                        </p>
                      ) : null}
                      {record.redacted ? (
                        <p className="text-xs opacity-55">
                          {COVER_STORY_MIRROR_UI_TEXT.redactedSuffix}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2 align-top">
                      <p className="font-medium">{record.lifecyclePhaseLabel}</p>
                      <p className="text-xs opacity-45">
                        {COVER_STORY_MIRROR_UI_TEXT.latestRepairPrefix}{' '}
                        {record.latestRepairActionLabel}
                      </p>
                    </td>
                    <td className="px-2 py-2 align-top">
                      <p className="text-xs">
                        {COVER_STORY_MIRROR_UI_TEXT.contradictionPressureLabel}:{' '}
                        {record.contradictionPressureLabel}
                      </p>
                      <p className="text-xs">
                        {COVER_STORY_MIRROR_UI_TEXT.coverCapacityScoreLabel}:{' '}
                        {record.coverCapacityScoreLabel}
                      </p>
                      <p className="text-xs">
                        {COVER_STORY_MIRROR_UI_TEXT.channelCountPrefix}{' '}
                        {record.activeContradictionChannelCount}
                      </p>
                      <p className="text-xs opacity-45">{record.contradictionChannelHintsLabel}</p>
                    </td>
                    <td className="px-2 py-2 align-top">
                      <p className="text-xs">
                        {COVER_STORY_MIRROR_UI_TEXT.coverStressActiveLabel}:{' '}
                        {record.coverStressActiveLabel}
                      </p>
                      <p className="text-xs">
                        {COVER_STORY_MIRROR_UI_TEXT.coverCollapsedLabel}: {record.coverCollapsedLabel}
                      </p>
                      <p className="text-xs">
                        {COVER_STORY_MIRROR_UI_TEXT.repairInProgressLabel}:{' '}
                        {record.repairInProgressLabel}
                      </p>
                    </td>
                    <td className="px-2 py-2 align-top">
                      {record.weeklySnapshot ? (
                        <>
                          <p className="text-xs">
                            {COVER_STORY_MIRROR_UI_TEXT.snapshotWeekPrefix} W
                            {record.weeklySnapshot.week}
                          </p>
                          <p className="text-xs">
                            {COVER_STORY_MIRROR_UI_TEXT.lifecycleColumn}:{' '}
                            {record.weeklySnapshot.lifecyclePhaseLabel}
                          </p>
                          <p className="text-xs">
                            {COVER_STORY_MIRROR_UI_TEXT.coverStressActiveLabel}:{' '}
                            {record.weeklySnapshot.coverStressActiveLabel}
                          </p>
                          <p className="text-xs">
                            {COVER_STORY_MIRROR_UI_TEXT.contradictionPressureLabel}:{' '}
                            {record.weeklySnapshot.contradictionPressureLabel}
                          </p>
                          {record.weeklySnapshot.redacted ? (
                            <p className="text-xs opacity-55">
                              {COVER_STORY_MIRROR_UI_TEXT.redactedSuffix}
                            </p>
                          ) : null}
                        </>
                      ) : (
                        '—'
                      )}
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
