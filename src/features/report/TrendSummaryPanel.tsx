
import { buildAgencyOverview } from '../../domain/strategicState'
import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
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
  // Get current game state from store for cadence/extra check surfacing
  // (Assume useGameStore is available in this context, as in other panels)
  const game = useGameStore().game;
  const overview = buildAgencyOverview(game);
  const urgentEscalations = overview.encounterStructure.urgentEscalations;
  const cadenceSummary = [
    `Pressure: ${overview.incidents.pressureScore} (${overview.incidents.severity})`,
    `Major incidents: ${overview.incidents.incidents.length}`,
    `Unresolved momentum: ${overview.incidents.unresolvedMomentum}`,
    `Endgame threshold: ${overview.endgame.nextThreshold ?? '—'} (${overview.endgame.pressureToNextThreshold > 0 ? `${overview.endgame.pressureToNextThreshold} to next` : 'at max'})`,
    `Extra checks: ${urgentEscalations.length > 0 ? urgentEscalations.map(e => `${e.caseTitle} (stage ${e.stage}→${e.nextStage}${e.convertsToRaid ? ', raid' : ''})`).join('; ') : 'None'}`
  ];
  return (
    <section className="panel space-y-4">
      {/* Escalation/Pressure Cadence & Extra Checks Section */}
      {cadenceSummary.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wide opacity-50 mb-1">Escalation & Pressure Cadence</h3>
          <ul className="text-xs opacity-80 space-y-1">
            {cadenceSummary.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}
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
        {/* Urgent Escalations (Extra Checks) Section */}
        {urgentEscalations.length > 0 && (
          <section className="rounded border border-cyan-400/20 bg-cyan-500/5 p-3">
            <p className="text-xs uppercase tracking-wide opacity-50 mb-1">Urgent Escalations (Extra Checks)</p>
            <ul className="space-y-1 text-xs">
              {urgentEscalations.map((e) => (
                <li key={e.caseId}>
                  {e.caseTitle} (stage {e.stage}&rarr;{e.nextStage}{e.convertsToRaid ? ', raid' : ''})
                </li>
              ))}
            </ul>
          </section>
        )}
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
