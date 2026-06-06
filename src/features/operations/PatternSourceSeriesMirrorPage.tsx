import { useMemo } from 'react'
import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { PATTERN_SOURCE_SERIES_MIRROR_UI_TEXT } from '../../data/copy'
import { getPatternSourceSeriesMirrorView } from './patternSourceSeriesMirrorView'

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}

export default function PatternSourceSeriesMirrorPage() {
  const { game } = useGameStore()
  const view = useMemo(() => getPatternSourceSeriesMirrorView(game), [game])

  return (
    <section className="space-y-4" aria-label="Pattern source series intake mirror">
      <article className="panel panel-primary space-y-4" role="region" aria-label="Series intake summary">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">
              {PATTERN_SOURCE_SERIES_MIRROR_UI_TEXT.pageEyebrow}
            </p>
            <h2 className="text-xl font-semibold">
              {PATTERN_SOURCE_SERIES_MIRROR_UI_TEXT.pageHeading}
            </h2>
            <p className="text-sm opacity-60">{PATTERN_SOURCE_SERIES_MIRROR_UI_TEXT.pageSubtitle}</p>
          </div>
          <Link to={APP_ROUTES.operationsDesk} className="btn btn-sm btn-ghost">
            {PATTERN_SOURCE_SERIES_MIRROR_UI_TEXT.backToDeskLabel}
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={PATTERN_SOURCE_SERIES_MIRROR_UI_TEXT.totalRecordsLabel}
            value={String(view.summary.totalRecords)}
          />
          <StatCard
            label={PATTERN_SOURCE_SERIES_MIRROR_UI_TEXT.queueEligibleLabel}
            value={String(view.summary.queueEligibleCount)}
          />
          <StatCard
            label={PATTERN_SOURCE_SERIES_MIRROR_UI_TEXT.pipelineActiveLabel}
            value={String(view.summary.pipelineActiveCount)}
          />
          <StatCard
            label={PATTERN_SOURCE_SERIES_MIRROR_UI_TEXT.weekLabel}
            value={`W${view.summary.week}`}
          />
        </div>

        <p className="text-xs opacity-55">{PATTERN_SOURCE_SERIES_MIRROR_UI_TEXT.readOnlyNote}</p>
      </article>

      {view.isEmpty ? (
        <article className="panel panel-support space-y-2" role="region" aria-label="Empty intake state">
          <h3 className="text-lg font-semibold">{PATTERN_SOURCE_SERIES_MIRROR_UI_TEXT.emptyTitle}</h3>
          <p className="text-sm opacity-70">{PATTERN_SOURCE_SERIES_MIRROR_UI_TEXT.emptyBody}</p>
        </article>
      ) : (
        <>
          <article
            className="panel panel-primary space-y-3"
            role="region"
            aria-label="Processing queue projection"
          >
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">
                {PATTERN_SOURCE_SERIES_MIRROR_UI_TEXT.queueHeading}
              </h3>
              <p className="text-sm opacity-60">{PATTERN_SOURCE_SERIES_MIRROR_UI_TEXT.queueSubtitle}</p>
            </div>

            {view.queueEntries.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.18em] opacity-55">
                      <th className="px-2 py-2">{PATTERN_SOURCE_SERIES_MIRROR_UI_TEXT.rankColumn}</th>
                      <th className="px-2 py-2">{PATTERN_SOURCE_SERIES_MIRROR_UI_TEXT.titleColumn}</th>
                      <th className="px-2 py-2">{PATTERN_SOURCE_SERIES_MIRROR_UI_TEXT.readinessColumn}</th>
                      <th className="px-2 py-2">{PATTERN_SOURCE_SERIES_MIRROR_UI_TEXT.utilityColumn}</th>
                      <th className="px-2 py-2">{PATTERN_SOURCE_SERIES_MIRROR_UI_TEXT.statusColumn}</th>
                      <th className="px-2 py-2">{PATTERN_SOURCE_SERIES_MIRROR_UI_TEXT.familyColumn}</th>
                      <th className="px-2 py-2">{PATTERN_SOURCE_SERIES_MIRROR_UI_TEXT.publicationColumn}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.queueEntries.map((entry) => (
                      <tr key={entry.recordId} className="border-b border-white/5">
                        <td className="px-2 py-2 font-medium">{entry.rank}</td>
                        <td className="px-2 py-2">
                          <p className="font-medium">{entry.title}</p>
                          <p className="text-xs opacity-55">{entry.slug}</p>
                        </td>
                        <td className="px-2 py-2">{entry.readinessScoreLabel}</td>
                        <td className="px-2 py-2">{entry.cpUtilityScoreLabel}</td>
                        <td className="px-2 py-2">{entry.processingStatusLabel}</td>
                        <td className="px-2 py-2">{entry.sourceFamilyLabel}</td>
                        <td className="px-2 py-2">{entry.publicationOrder}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm opacity-60">{PATTERN_SOURCE_SERIES_MIRROR_UI_TEXT.emptyQueueBody}</p>
            )}
          </article>

          <article
            className="panel panel-support space-y-3"
            role="region"
            aria-label="Persisted intake records"
          >
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">
                {PATTERN_SOURCE_SERIES_MIRROR_UI_TEXT.recordsHeading}
              </h3>
              <p className="text-sm opacity-60">{PATTERN_SOURCE_SERIES_MIRROR_UI_TEXT.recordsSubtitle}</p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.18em] opacity-55">
                    <th className="px-2 py-2">{PATTERN_SOURCE_SERIES_MIRROR_UI_TEXT.queueRankColumn}</th>
                    <th className="px-2 py-2">{PATTERN_SOURCE_SERIES_MIRROR_UI_TEXT.titleColumn}</th>
                    <th className="px-2 py-2">{PATTERN_SOURCE_SERIES_MIRROR_UI_TEXT.statusColumn}</th>
                    <th className="px-2 py-2">{PATTERN_SOURCE_SERIES_MIRROR_UI_TEXT.readinessColumn}</th>
                    <th className="px-2 py-2">{PATTERN_SOURCE_SERIES_MIRROR_UI_TEXT.publicationColumn}</th>
                    <th className="px-2 py-2">{PATTERN_SOURCE_SERIES_MIRROR_UI_TEXT.editorialColumn}</th>
                    <th className="px-2 py-2">{PATTERN_SOURCE_SERIES_MIRROR_UI_TEXT.domainsColumn}</th>
                  </tr>
                </thead>
                <tbody>
                  {view.records.map((record) => (
                    <tr key={record.id} className="border-b border-white/5 align-top">
                      <td className="px-2 py-2 font-medium">{record.queueRankLabel}</td>
                      <td className="px-2 py-2">
                        <p className="font-medium">{record.title}</p>
                        <p className="text-xs opacity-55">{record.slug}</p>
                        <p className="text-xs opacity-45">{record.sourceFamilyLabel}</p>
                      </td>
                      <td className="px-2 py-2">{record.processingStatusLabel}</td>
                      <td className="px-2 py-2">{record.readinessScoreLabel}</td>
                      <td className="px-2 py-2">{record.publicationOrder}</td>
                      <td className="px-2 py-2">
                        {record.editorialStatusLabels.length > 0
                          ? record.editorialStatusLabels.join(', ')
                          : '—'}
                      </td>
                      <td className="px-2 py-2">
                        {record.blurbDomainHintLabels.length > 0
                          ? record.blurbDomainHintLabels.join(', ')
                          : '—'}
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
