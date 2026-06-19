import { useMemo } from 'react'
import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { MODIFIABLE_DATA_PACK_MIRROR_UI_TEXT } from '../../data/copy'
import { getModifiableDataPackMirrorView } from './modifiableDataPackMirrorView'

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}

export default function ModifiableDataPackMirrorPage() {
  const { game } = useGameStore()
  const view = useMemo(() => getModifiableDataPackMirrorView(game), [game])

  return (
    <section className="space-y-4" aria-label="Modifiable data-pack mirror">
      <article
        className="panel panel-primary space-y-4"
        role="region"
        aria-label="Modifiable data-pack summary"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">
              {MODIFIABLE_DATA_PACK_MIRROR_UI_TEXT.pageEyebrow}
            </p>
            <h2 className="text-xl font-semibold">
              {MODIFIABLE_DATA_PACK_MIRROR_UI_TEXT.pageHeading}
            </h2>
            <p className="text-sm opacity-60">{MODIFIABLE_DATA_PACK_MIRROR_UI_TEXT.pageSubtitle}</p>
          </div>
          <Link to={APP_ROUTES.operationsDesk} className="btn btn-sm btn-ghost">
            {MODIFIABLE_DATA_PACK_MIRROR_UI_TEXT.backToDeskLabel}
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={MODIFIABLE_DATA_PACK_MIRROR_UI_TEXT.totalRecordsLabel}
            value={String(view.summary.totalRecords)}
          />
          <StatCard
            label={MODIFIABLE_DATA_PACK_MIRROR_UI_TEXT.appliedLabel}
            value={String(view.summary.appliedCount)}
          />
          <StatCard
            label={MODIFIABLE_DATA_PACK_MIRROR_UI_TEXT.needsRevisionLabel}
            value={String(view.summary.needsRevisionCount)}
          />
          <StatCard
            label={MODIFIABLE_DATA_PACK_MIRROR_UI_TEXT.weekLabel}
            value={`W${view.summary.week}`}
          />
        </div>

        <p className="text-xs opacity-55">{MODIFIABLE_DATA_PACK_MIRROR_UI_TEXT.readOnlyNote}</p>
      </article>

      {view.isEmpty ? (
        <article
          className="panel panel-support space-y-2"
          role="region"
          aria-label="Empty data-pack state"
        >
          <h3 className="text-lg font-semibold">{MODIFIABLE_DATA_PACK_MIRROR_UI_TEXT.emptyTitle}</h3>
          <p className="text-sm opacity-70">{MODIFIABLE_DATA_PACK_MIRROR_UI_TEXT.emptyBody}</p>
        </article>
      ) : (
        <article
          className="panel panel-support space-y-3"
          role="region"
          aria-label="Persisted modifiable data-pack records"
        >
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">
              {MODIFIABLE_DATA_PACK_MIRROR_UI_TEXT.recordsHeading}
            </h3>
            <p className="text-sm opacity-60">{MODIFIABLE_DATA_PACK_MIRROR_UI_TEXT.recordsSubtitle}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.18em] opacity-55">
                  <th className="px-2 py-2">{MODIFIABLE_DATA_PACK_MIRROR_UI_TEXT.packIdColumn}</th>
                  <th className="px-2 py-2">{MODIFIABLE_DATA_PACK_MIRROR_UI_TEXT.statusColumn}</th>
                  <th className="px-2 py-2">{MODIFIABLE_DATA_PACK_MIRROR_UI_TEXT.kindColumn}</th>
                  <th className="px-2 py-2">{MODIFIABLE_DATA_PACK_MIRROR_UI_TEXT.schemaColumn}</th>
                  <th className="px-2 py-2">{MODIFIABLE_DATA_PACK_MIRROR_UI_TEXT.sectionsColumn}</th>
                </tr>
              </thead>
              <tbody>
                {view.records.map((record) => (
                  <tr key={record.packId} className="border-b border-white/5 align-top">
                    <td className="px-2 py-2">
                      <p className="font-medium">{record.packId}</p>
                      <p className="text-xs opacity-55">{record.authorRef}</p>
                      <p className="text-xs opacity-45">{record.issueLinkLabel}</p>
                    </td>
                    <td className="px-2 py-2">{record.importStatusLabel}</td>
                    <td className="px-2 py-2">{record.packKindLabel}</td>
                    <td className="px-2 py-2">{record.schemaVersion}</td>
                    <td className="px-2 py-2">
                      {record.sectionSummaryLabel}
                      {record.reasonCodeCount > 0
                        ? ` · ${record.reasonCodeCount} reason code(s)`
                        : ''}
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
