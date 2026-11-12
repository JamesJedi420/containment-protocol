import { useGameStore } from '../../app/store/gameStore'
import { buildConcealCaseFlagId } from '../../domain/concealmentCasePrep'
import type { CaseInstance } from '../../domain/models'
import {
  buildConcealmentCasePrepView,
  type ConcealmentCasePrepView,
  type ConcealmentTriggerRowView,
} from './concealmentCasePrepView'

import type { CasePrepPanelLayout } from './casePrepPanelLayout'

export function ConcealmentCasePrepPanel({
  caseData,
  layout = 'standalone',
}: {
  caseData: CaseInstance
  layout?: CasePrepPanelLayout
}) {
  const game = useGameStore((state) => state.game)
  const setGlobalFlag = useGameStore((state) => state.setGlobalFlag)
  const view = buildConcealmentCasePrepView(caseData, game)

  if (!view.visible) {
    return null
  }

  const concealFlagId = buildConcealCaseFlagId(caseData.id)
  const embedded = layout === 'embedded'

  const content = (
    <>
      {embedded ? null : <PanelHeader />}

      <p className="text-sm opacity-60">
        Preview how concealment rules resolve before weekly resolution. Request covert posture to
        set the per-case flag used by weekly activation.
      </p>

      <PreviewSection view={view} />

      {view.activationPreviewNotes.length > 0 ? <ActivationPreview view={view} /> : null}

      {view.activationTags.length > 0 ? (
        <section className="space-y-1" aria-label="Concealment activation tags">
          <p className="text-xs uppercase tracking-wide opacity-50">Activation tags</p>
          <p className="text-sm">{view.activationTags.join(', ')}</p>
        </section>
      ) : null}

      {view.triggerRows.length > 0 ? (
        <section className="space-y-2" aria-label="Authored concealment triggers">
          <p className="text-xs uppercase tracking-wide opacity-50">Authored triggers</p>
          <ul className="space-y-2">
            {view.triggerRows.map((row) => (
              <TriggerRow key={row.id} row={row} />
            ))}
          </ul>
        </section>
      ) : null}

      {view.hiddenModifierCount !== undefined && view.hiddenModifierCount > 0 ? (
        <p className="text-xs opacity-55">
          Hidden map modifiers on case: {view.hiddenModifierCount}
        </p>
      ) : null}

      {view.canToggleConcealFlag ? (
        <section className="space-y-2" aria-label="Covert posture request">
          <button
            type="button"
            className="btn btn-sm"
            aria-pressed={view.playerConcealFlagActive}
            onClick={() =>
              setGlobalFlag(concealFlagId, view.playerConcealFlagActive ? false : true)
            }
          >
            {view.playerConcealFlagActive ? 'Clear covert request' : 'Request covert posture'}
          </button>
          <p className="text-xs opacity-55">
            Sets <span className="font-mono text-[0.7rem]">{concealFlagId}</span> for the next
            weekly tick.
          </p>
        </section>
      ) : null}
    </>
  )

  if (embedded) {
    return (
      <div className="space-y-4" role="group" aria-label="Concealment case prep">
        {content}
      </div>
    )
  }

  return (
    <article
      className="panel panel-support space-y-4"
      role="region"
      aria-label="Concealment case prep"
    >
      {content}
    </article>
  )
}

function PanelHeader() {
  return (
    <div className="space-y-1">
      <h3 className="text-lg font-semibold">Concealment prep</h3>
      <p className="text-xs uppercase tracking-wide opacity-50">Covert activation</p>
    </div>
  )
}

function ActivationPreview({ view }: { view: ConcealmentCasePrepView }) {
  return (
    <section className="space-y-1" aria-label="Activation preview">
      <p className="text-xs uppercase tracking-wide opacity-50">Activation preview</p>
      <ul className="list-disc space-y-1 pl-5 text-xs opacity-70">
        {view.activationPreviewNotes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </section>
  )
}

function PreviewSection({ view }: { view: ConcealmentCasePrepView }) {
  return (
    <section
      className={`rounded border px-3 py-2 text-sm ${
        view.previewApplied
          ? 'border-violet-400/35 bg-violet-500/8'
          : 'border-white/10 bg-white/5'
      }`}
      aria-label="Concealment activation preview"
    >
      <p className="font-medium">{view.previewStatusLabel}</p>
      <p className="mt-1 text-xs opacity-70">{view.previewReasonLabel}</p>
    </section>
  )
}

function TriggerRow({ row }: { row: ConcealmentTriggerRowView }) {
  return (
    <li className="rounded border border-white/10 bg-white/5 px-3 py-2 text-sm">
      <p className="font-medium">{row.id}</p>
      <p className="text-xs opacity-60">
        {row.modeLabel} — {row.whenSummary}
      </p>
    </li>
  )
}
