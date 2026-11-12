import type { DepartmentWorkshopMirrorExplanationView } from './departmentWorkshopMirrorView'

export function DepartmentWorkshopExplanationPanel({
  explanations,
}: {
  explanations: readonly DepartmentWorkshopMirrorExplanationView[]
}) {
  return (
    <article
      className="panel panel-support space-y-3"
      role="region"
      aria-label="Operational workshop explanations"
    >
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Operational explanations</h3>
        <p className="text-sm opacity-60">
          Authoritative reasons and correction conditions reconstructed from current workshop state.
        </p>
      </div>

      {explanations.length === 0 ? (
        <p className="text-sm opacity-60">No active or recorded workshop degradation explanation.</p>
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
              {detail.correctionCondition ? (
                <p className="mt-2 text-sm">
                  <span className="font-medium">Correction:</span> {detail.correctionCondition}
                </p>
              ) : null}
              <p className="mt-2 text-xs opacity-50">Confidence: {detail.confidence}</p>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}
