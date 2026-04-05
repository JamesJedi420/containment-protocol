import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { type RunTrendSummary, type TrendCaseRef } from './reportTrendView'

export function TrendSummaryPanel({
  title,
  subtitle,
  summary,
}: {
  title: string
  subtitle?: string
  summary: RunTrendSummary
}) {
  return (
    <section className="panel space-y-4">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide opacity-50">Trend summary</p>
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle ? <p className="text-sm opacity-60">{subtitle}</p> : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <TrendBucket
          title="Recurring template families"
          emptyLabel="No recurring families yet."
          items={summary.recurringFamilies.map((item) => ({
            title: item.family,
            count: item.count,
            caseRefs: item.caseRefs,
            templateIds: item.templateIds,
          }))}
        />
        <TrendBucket
          title="Raid conversions"
          emptyLabel="No raid conversions surfaced in this slice."
          items={summary.raidConversions}
        />
        <TrendBucket
          title="Unresolved hotspots"
          emptyLabel="No unresolved hotspots surfaced in this slice."
          items={summary.unresolvedHotspots}
        />
        <TrendTagBucket
          title="Dominant tag pressure"
          emptyLabel="No tag pressure surfaced in this slice."
          items={summary.dominantTags}
        />
      </div>
    </section>
  )
}

function TrendBucket({
  title,
  emptyLabel,
  items,
}: {
  title: string
  emptyLabel: string
  items: Array<{
    title: string
    count: number
    caseRefs: TrendCaseRef[]
    templateIds: string[]
  }>
}) {
  return (
    <section className="rounded border border-white/10 p-3">
      <p className="text-xs uppercase tracking-wide opacity-50">{title}</p>
      {items.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {items.map((item) => (
            <li key={item.title} className="rounded border border-white/10 px-3 py-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs opacity-50">Count: {item.count}</p>
                </div>
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs opacity-70">
                  {item.count}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {item.caseRefs.map((ref) => renderCaseRef(ref))}
                {item.templateIds.map((templateId) => (
                  <Link
                    key={templateId}
                    to={APP_ROUTES.intelDetail(templateId)}
                    className="rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-2 py-0.5 text-fuchsia-100 hover:underline"
                  >
                    intel {templateId}
                  </Link>
                ))}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm opacity-50">{emptyLabel}</p>
      )}
    </section>
  )
}

function TrendTagBucket({
  title,
  emptyLabel,
  items,
}: {
  title: string
  emptyLabel: string
  items: Array<{
    tag: string
    score: number
    requiredCount: number
    preferredCount: number
    caseRefs: TrendCaseRef[]
    templateIds: string[]
  }>
}) {
  return (
    <section className="rounded border border-white/10 p-3">
      <p className="text-xs uppercase tracking-wide opacity-50">{title}</p>
      {items.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {items.map((item) => (
            <li key={item.tag} className="rounded border border-white/10 px-3 py-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-medium">{item.tag}</p>
                  <p className="text-xs opacity-50">
                    Required {item.requiredCount} / Preferred {item.preferredCount}
                  </p>
                </div>
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs opacity-70">
                  {item.score}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {item.caseRefs.map((ref) => renderCaseRef(ref))}
                {item.templateIds.map((templateId) => (
                  <Link
                    key={templateId}
                    to={APP_ROUTES.intelDetail(templateId)}
                    className="rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-2 py-0.5 text-fuchsia-100 hover:underline"
                  >
                    intel {templateId}
                  </Link>
                ))}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm opacity-50">{emptyLabel}</p>
      )}
    </section>
  )
}

function renderCaseRef(ref: TrendCaseRef) {
  if (ref.isLive) {
    return (
      <Link
        key={ref.caseId}
        to={APP_ROUTES.caseDetail(ref.caseId)}
        className="rounded-full border border-white/10 px-2 py-0.5 hover:underline"
      >
        {ref.title}
      </Link>
    )
  }

  return (
    <span key={ref.caseId} className="rounded-full border border-white/10 px-2 py-0.5 opacity-60">
      {ref.title}
    </span>
  )
}
