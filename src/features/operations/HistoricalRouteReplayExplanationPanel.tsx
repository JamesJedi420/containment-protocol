import type { OperationalExplanationProjection } from '../../domain/operationalExplanation'

export interface HistoricalRouteReplayExplanationView {
  readonly summary: OperationalExplanationProjection
  readonly detail: OperationalExplanationProjection
}

export function HistoricalRouteReplayExplanationPanel({
  explanations,
}: {
  explanations: readonly HistoricalRouteReplayExplanationView[]
}) {
  return (
    <article
      className="panel panel-support space-y-3"
      role="region"
      aria-label="Historical route replay explanations"
    >
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Historical route replays</h3>
        <p className="text-sm opacity-60">
          Bounded operational explanations reconstructed from authoritative replay state. Causality
          stays unresolved.
        </p>
      </div>

      {explanations.length === 0 ? (
        <p className="text-sm opacity-60">No historical-route replay explanations are available.</p>
      ) : (
        <ul className="space-y-3">
          {explanations.map(({ summary, detail }) => (
            <li key={summary.id} className="rounded border border-white/10 bg-white/5 px-3 py-3">
              <p className="text-xs uppercase tracking-[0.18em] opacity-60">
                {summary.lifecycle} · {summary.severity}
              </p>
              <p className="mt-1 font-medium">{summary.reasonText}</p>
              <p className="mt-2 text-sm opacity-80">{detail.cause}</p>
              <p className="mt-1 text-sm opacity-70">{detail.currentEffect}</p>
              <p className="mt-2 text-xs opacity-50">Confidence: {detail.confidence}</p>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}
