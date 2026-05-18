import type { InvestigationBudgetView } from './investigationCasePrepView'

export function ForensicInvestigationBudgetStrip({
  budget,
  custodyMarkerCount,
}: {
  budget: InvestigationBudgetView
  custodyMarkerCount: number
}) {
  return (
    <div
      className="rounded border border-sky-400/25 bg-sky-500/6 px-3 py-2 text-sm"
      aria-label="Forensic investigation budget"
    >
      <p className="text-xs uppercase tracking-wide opacity-60">Forensic investigation budget</p>
      <p className="mt-1">
        <span className="opacity-60">Remaining:</span>{' '}
        <span className="font-medium">{budget.remaining}</span>
        <span className="opacity-50">
          {' '}
          (granted {budget.granted}, spent {budget.spent}, custody burden {budget.custodyLossBurden}
          {custodyMarkerCount === 1 ? ' / 1 marker' : custodyMarkerCount > 1 ? ` / ${custodyMarkerCount} markers` : ''}
          )
        </span>
      </p>
    </div>
  )
}
