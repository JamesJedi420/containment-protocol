import type { HistoricalRouteReplayMapChromeView } from './historicalRouteReplayMapChromeAdapter'

function formatRoles(roles: readonly string[]): string {
  return roles.join(' · ')
}

export function HistoricalRouteReplayMapChromePanel({
  views,
}: {
  views: readonly HistoricalRouteReplayMapChromeView[]
}) {
  return (
    <article
      className="panel panel-support space-y-3"
      role="region"
      aria-label="Historical route replay map chrome"
    >
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Historical route map</h3>
        <p className="text-sm opacity-60">
          Bounded route-graph chrome from authorized replay anchors and remembered edges. No
          invented coordinates. Causality stays unresolved.
        </p>
      </div>

      {views.length === 0 ? (
        <p className="text-sm opacity-60">No historical-route map chrome is available.</p>
      ) : (
        <ul className="space-y-3">
          {views.map((view) => (
            <li key={view.eventId} className="rounded border border-white/10 bg-white/5 px-3 py-3">
              <p className="text-xs uppercase tracking-[0.18em] opacity-60">
                {view.phase} · {view.causalClassification}
                {view.siteId ? ` · ${view.siteId}` : ''}
              </p>
              <p className="mt-1 font-medium">{view.eventId}</p>

              {view.anchors.length === 0 ? (
                <p className="mt-2 text-sm opacity-60">No authorized anchors are visible.</p>
              ) : (
                <ul className="mt-2 space-y-1 text-sm opacity-80">
                  {view.anchors.map((anchor) => (
                    <li key={anchor.anchorId}>
                      <span className="font-medium">{anchor.anchorId}</span>
                      <span className="opacity-60"> — {formatRoles(anchor.roles)}</span>
                      {anchor.kind ? <span className="opacity-50"> ({anchor.kind})</span> : null}
                    </li>
                  ))}
                </ul>
              )}

              {view.edges.length > 0 ? (
                <ul className="mt-2 space-y-1 text-sm opacity-70">
                  {view.edges.map((edge) => (
                    <li key={edge.edgeId}>
                      {edge.fromAnchorId} → {edge.toAnchorId}
                      {edge.traversed ? ' (traversed)' : ''}
                      {edge.routeKind ? ` · ${edge.routeKind}` : ''}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}
