import { useGameStore } from '../../app/store/gameStore'
import type { CaseInstance } from '../../domain/models'
import {
  buildInvestigationCasePrepView,
  type InvestigationBudgetView,
  type InvestigationDomainPrepView,
  type InvestigationQuestionRowView,
} from './investigationCasePrepView'

import type { CasePrepPanelLayout } from './casePrepPanelLayout'

export function InvestigationCasePrepPanel({
  caseData,
  layout = 'standalone',
}: {
  caseData: CaseInstance
  layout?: CasePrepPanelLayout
}) {
  const game = useGameStore((state) => state.game)
  const askInvestigationQuestion = useGameStore((state) => state.askInvestigationQuestion)
  const view = buildInvestigationCasePrepView(caseData, game)

  if (!view.visible) {
    return null
  }

  const embedded = layout === 'embedded'
  const hasAnyBudget =
    view.forensic.budget.granted > 0 ||
    view.forensic.budget.spent > 0 ||
    view.tactical.budget.granted > 0 ||
    view.tactical.budget.spent > 0

  const content = (
    <>
      {embedded ? null : <PanelHeader />}

      <p className="text-sm opacity-60">
        Spend investigation question budget before weekly resolution. Forensic custody strain from
        leave-behind fallout reduces forensic headroom.
      </p>

      {!hasAnyBudget ? (
        <p className="text-sm opacity-50">
          No investigation budget on this case yet. Successful investigation during weekly
          resolution grants forensic and tactical questions.
        </p>
      ) : (
        <>
          <InvestigationDomainSection
            domainView={view.forensic}
            showCustodyBurden={!embedded}
            onAsk={(questionId) => askInvestigationQuestion(caseData.id, 'forensic', questionId)}
          />

          <InvestigationDomainSection
            domainView={view.tactical}
            onAsk={(questionId) => askInvestigationQuestion(caseData.id, 'tactical', questionId)}
          />
        </>
      )}

      {view.namingHazardDescriptors.length > 0 ? (
        <section className="space-y-2" aria-label="Naming-hazard descriptor labels">
          <p className="text-xs uppercase tracking-wide opacity-50">Naming-hazard descriptors</p>
          <ul className="space-y-2">
            {view.namingHazardDescriptors.map((descriptor) => (
              <li
                key={descriptor.descriptorId}
                className="rounded border border-indigo-400/25 bg-indigo-500/6 px-3 py-2 text-sm"
              >
                <p className="font-medium">{descriptor.safeLabel}</p>
                {descriptor.summary ? (
                  <p className="text-xs opacity-70">{descriptor.summary}</p>
                ) : null}
                <p className="text-xs opacity-60">
                  {descriptor.topicRef}
                  {descriptor.usedGridFallback ? ' / grid fallback' : ''}
                  {descriptor.redacted ? ' / redacted' : ''}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {view.custodyMarkers.length > 0 ? (
        <section className="space-y-2" aria-label="Investigation custody strain">
          <p className="text-xs uppercase tracking-wide opacity-50">Custody strain markers</p>
          <ul className="space-y-2">
            {view.custodyMarkers.map((marker) => (
              <li
                key={marker.ref}
                className="rounded border border-rose-400/25 bg-rose-500/6 px-3 py-2 text-sm"
              >
                <p className="font-medium">{marker.ref}</p>
                <p className="text-xs opacity-60">
                  {marker.leaveBehindLabel} / applied week {marker.appliedWeek}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  )

  if (embedded) {
    return (
      <div className="space-y-4" role="group" aria-label="Investigation question prep">
        {content}
      </div>
    )
  }

  return (
    <article
      className="panel panel-support space-y-4"
      role="region"
      aria-label="Investigation question prep"
    >
      {content}
    </article>
  )
}

function PanelHeader() {
  return (
    <div className="space-y-1">
      <h3 className="text-lg font-semibold">Investigation questions</h3>
      <p className="text-xs uppercase tracking-wide opacity-50">Case prep</p>
    </div>
  )
}

function InvestigationDomainSection({
  domainView,
  showCustodyBurden = false,
  onAsk,
}: {
  domainView: InvestigationDomainPrepView
  showCustodyBurden?: boolean
  onAsk: (questionId: string) => void
}) {
  return (
    <section className="space-y-2" aria-label={domainView.domainLabel}>
      <DomainHeader domainView={domainView} showCustodyBurden={showCustodyBurden} />

      <ul className="space-y-2">
        {domainView.questions.map((question) => (
          <li
            key={question.id}
            className={`rounded border px-3 py-2 ${
              question.asked
                ? 'border-emerald-400/30 bg-emerald-500/8'
                : 'border-white/10 bg-white/5'
            }`}
          >
            <InvestigationQuestionRow
              question={question}
              onAsk={() => {
                if (question.canAsk) {
                  onAsk(question.id)
                }
              }}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

function DomainHeader({
  domainView,
  showCustodyBurden,
}: {
  domainView: InvestigationDomainPrepView
  showCustodyBurden: boolean
}) {
  return (
    <div className="space-y-1">
      <h4 className="font-semibold">{domainView.domainLabel}</h4>
      <BudgetLine budget={domainView.budget} showCustodyBurden={showCustodyBurden} />
    </div>
  )
}

function BudgetLine({
  budget,
  showCustodyBurden,
}: {
  budget: InvestigationBudgetView
  showCustodyBurden: boolean
}) {
  return (
    <p className="text-xs opacity-55">
      Remaining {budget.remaining} (granted {budget.granted}, spent {budget.spent}
      {showCustodyBurden ? `, custody burden ${budget.custodyLossBurden}` : ''}
      )
    </p>
  )
}

function InvestigationQuestionRow({
  question,
  onAsk,
}: {
  question: InvestigationQuestionRowView
  onAsk: () => void
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <p className="text-sm font-medium">{question.prompt}</p>
        {question.asked ? (
          <>
            <p className="text-xs opacity-70">{question.answer}</p>
            {question.leverageLabel ? (
              <p className="text-xs text-sky-200/90">
                Leverage: {question.leverageLabel}
                {question.leverageDescription ? ` — ${question.leverageDescription}` : ''}
              </p>
            ) : null}
          </>
        ) : null}
      </div>
      <button
        type="button"
        className="btn btn-sm"
        disabled={!question.canAsk}
        aria-pressed={question.asked}
        onClick={onAsk}
      >
        {question.asked ? 'Asked' : 'Ask'}
      </button>
    </div>
  )
}
