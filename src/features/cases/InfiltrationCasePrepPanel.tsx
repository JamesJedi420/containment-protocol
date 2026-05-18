import { useGameStore } from '../../app/store/gameStore'
import type { CaseInstance } from '../../domain/models'
import {
  buildInfiltrationCasePrepView,
  type InfiltrationCasePrepView,
  type InfiltrationProbeActionOptionView,
} from './infiltrationCasePrepView'

export function InfiltrationCasePrepPanel({ caseData }: { caseData: CaseInstance }) {
  const setInfiltrationWeeklyProbeAction = useGameStore(
    (state) => state.setInfiltrationWeeklyProbeAction
  )
  const view = buildInfiltrationCasePrepView(caseData)

  if (!view.visible) {
    return null
  }

  return (
    <article
      className="panel panel-support space-y-4"
      role="region"
      aria-label="Infiltration case prep"
    >
      <PanelHeader />

      <p className="text-sm opacity-60">
        Review probe tracks and cover posture before weekly resolution. Override the next weekly
        probe action or use the authored plan default.
      </p>

      <TrackSummary view={view} />

      {view.coverRoleLabel ? <CoverSummary view={view} /> : null}

      <section className="space-y-2" aria-label="Weekly probe action">
        <div className="space-y-1">
          <h4 className="font-semibold">Next weekly probe action</h4>
          <p className="text-xs opacity-55">
            Plan default: {view.plannedActionLabel}
            {view.usingOverride ? (
              <>
                {' '}
                / Override: <span className="text-amber-200/90">{view.overrideActionLabel}</span>
              </>
            ) : null}
            {' '}
            / Resolves as: <span className="font-medium">{view.effectiveActionLabel}</span>
          </p>
        </div>

        <ul className="space-y-2">
          {view.actionOptions.map((option) => (
            <li
              key={option.id}
              className={`rounded border px-3 py-2 ${
                option.selected
                  ? 'border-amber-400/40 bg-amber-500/10'
                  : 'border-white/10 bg-white/5'
              }`}
            >
              <ProbeActionRow
                option={option}
                onSelect={() => setInfiltrationWeeklyProbeAction(caseData.id, option.id)}
              />
            </li>
          ))}
        </ul>

        {view.usingOverride ? (
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setInfiltrationWeeklyProbeAction(caseData.id, null)}
          >
            Use plan default
          </button>
        ) : null}
      </section>
    </article>
  )
}

function PanelHeader() {
  return (
    <div className="space-y-1">
      <h3 className="text-lg font-semibold">Infiltration prep</h3>
      <p className="text-xs uppercase tracking-wide opacity-50">Covert tracks</p>
    </div>
  )
}

function TrackSummary({ view }: { view: InfiltrationCasePrepView }) {
  return (
    <section className="space-y-1" aria-label="Probe and awareness tracks">
      <p className="text-xs uppercase tracking-wide opacity-50">Tracks</p>
      <p className="text-sm">
        Probe progress {view.probeProgressPercent}% / Awareness {view.awarenessPercent}% (
        {view.stageLabel})
      </p>
      <p className="text-xs opacity-55">
        Complication band begins at {view.awarenessComplicationBandPercent}% awareness.
      </p>
    </section>
  )
}

function CoverSummary({ view }: { view: InfiltrationCasePrepView }) {
  return (
    <section className="space-y-1" aria-label="Cover posture">
      <p className="text-xs uppercase tracking-wide opacity-50">Cover posture</p>
      <p className="text-sm">
        {view.coverRoleLabel}
        {view.documentTier !== undefined ? ` / Documents tier ${view.documentTier}` : ''}
        {view.doctrineBand !== undefined
          ? ` / Doctrine ${Math.round((view.doctrineBand ?? 0) * 100)}%`
          : ''}
      </p>
      <ul className="list-disc space-y-1 pl-5 text-xs opacity-70">
        {view.coverStrainNotes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </section>
  )
}

function ProbeActionRow({
  option,
  onSelect,
}: {
  option: InfiltrationProbeActionOptionView
  onSelect: () => void
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <p className="text-sm font-medium">{option.label}</p>
        <p className="text-xs opacity-65">{option.summary}</p>
      </div>
      <button
        type="button"
        className="btn btn-sm"
        aria-pressed={option.selected}
        onClick={onSelect}
      >
        {option.selected ? 'Selected' : 'Select'}
      </button>
    </div>
  )
}
