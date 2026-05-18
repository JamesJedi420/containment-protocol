import type { ReactNode } from 'react'
import { useGameStore } from '../../app/store/gameStore'
import type { CaseInstance } from '../../domain/models'
import { ConcealmentCasePrepPanel } from './ConcealmentCasePrepPanel'
import { ForensicInvestigationBudgetStrip } from './ForensicInvestigationBudgetStrip'
import { InfiltrationCasePrepPanel } from './InfiltrationCasePrepPanel'
import { InvestigationCasePrepPanel } from './InvestigationCasePrepPanel'
import { StealthLeaveBehindSelectionPanel } from './StealthLeaveBehindSelectionPanel'
import { buildWeeklyCasePrepView } from './weeklyCasePrepView'

export function WeeklyCasePrepPanel({ caseData }: { caseData: CaseInstance }) {
  const game = useGameStore((state) => state.game)
  const view = buildWeeklyCasePrepView(caseData, game)

  if (!view.visible) {
    return null
  }

  return (
    <article
      className="panel panel-support space-y-4"
      role="region"
      aria-label="Weekly case prep"
    >
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Weekly prep</h3>
        <p className="text-xs uppercase tracking-wide opacity-50">Covert operations</p>
      </div>

      <p className="text-sm opacity-60">
        Configure concealment, infiltration, extraction tradeoffs, and investigation questions before
        weekly resolution. Sections collapse for a shorter dossier view.
      </p>

      {view.showSharedForensicBudget ? (
        <ForensicInvestigationBudgetStrip
          budget={view.forensicBudget}
          custodyMarkerCount={view.custodyMarkerCount}
        />
      ) : null}

      <div className="space-y-3">
        {view.sections.concealment ? (
          <WeeklyPrepSection title="Concealment" defaultOpen>
            <ConcealmentCasePrepPanel caseData={caseData} layout="embedded" />
          </WeeklyPrepSection>
        ) : null}

        {view.sections.infiltration ? (
          <WeeklyPrepSection title="Infiltration" defaultOpen>
            <InfiltrationCasePrepPanel caseData={caseData} layout="embedded" />
          </WeeklyPrepSection>
        ) : null}

        {view.sections.stealthLeaveBehind ? (
          <WeeklyPrepSection title="Stealth leave-behind" defaultOpen>
            <StealthLeaveBehindSelectionPanel caseData={caseData} layout="embedded" />
          </WeeklyPrepSection>
        ) : null}

        {view.sections.investigation ? (
          <WeeklyPrepSection title="Investigation questions" defaultOpen>
            <InvestigationCasePrepPanel caseData={caseData} layout="embedded" />
          </WeeklyPrepSection>
        ) : null}
      </div>
    </article>
  )
}

function WeeklyPrepSection({
  title,
  defaultOpen,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  return (
    <details className="weekly-prep-section rounded border border-white/10 bg-white/[0.03]" open={defaultOpen}>
      <summary className="cursor-pointer px-3 py-2 text-sm font-semibold marker:opacity-60">
        {title}
      </summary>
      <div className="space-y-4 border-t border-white/10 px-3 py-3">{children}</div>
    </details>
  )
}
