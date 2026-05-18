import { useGameStore } from '../../app/store/gameStore'
import type { CaseInstance } from '../../domain/models'
import {
  buildStealthLeaveBehindSelectionView,
  type StealthLeaveBehindOptionView,
} from './stealthLeaveBehindSelectionView'

export function StealthLeaveBehindSelectionPanel({ caseData }: { caseData: CaseInstance }) {
  const game = useGameStore((state) => state.game)
  const selectStealthLeaveBehind = useGameStore((state) => state.selectStealthLeaveBehind)
  const view = buildStealthLeaveBehindSelectionView(caseData, game)

  if (!view.visible) {
    return null
  }

  return (
    <article
      className="panel panel-support space-y-3"
      role="region"
      aria-label="Stealth leave-behind tradeoff"
    >
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Stealth leave-behind</h3>
        <p className="text-xs uppercase tracking-wide opacity-50">Extraction tradeoff</p>
      </div>

      <p className="text-sm opacity-60">
        Choose the extraction tradeoff before weekly resolution. Discovery risk feeds mission score
        pressure; custody refs strain forensic investigation budget after resolution.
      </p>

      <div
        className="rounded border border-sky-400/25 bg-sky-500/6 px-3 py-2 text-sm"
        aria-label="Forensic investigation budget"
      >
        <p className="text-xs uppercase tracking-wide opacity-60">Forensic investigation budget</p>
        <p className="mt-1">
          <span className="opacity-60">Remaining:</span>{' '}
          <span className="font-medium">{view.forensicBudget.remaining}</span>
          <span className="opacity-50">
            {' '}
            (granted {view.forensicBudget.granted}, spent {view.forensicBudget.spent}, custody
            burden {view.forensicBudget.custodyLossBurden}
            {view.forensicBudget.markerCount === 1 ? ' marker' : ' markers'})
          </span>
        </p>
      </div>

      <ul className="space-y-2">
        {view.options.map((option) => (
          <li
            key={option.id}
            className={`rounded border px-3 py-2 ${
              option.selected
                ? 'border-amber-400/40 bg-amber-500/10'
                : 'border-white/10 bg-white/5'
            }`}
          >
            <StealthLeaveBehindOptionRow
              option={option}
              onSelect={() => selectStealthLeaveBehind(caseData.id, option.id)}
            />
          </li>
        ))}
      </ul>
    </article>
  )
}

function StealthLeaveBehindOptionRow({
  option,
  onSelect,
}: {
  option: StealthLeaveBehindOptionView
  onSelect: () => void
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <StealthLeaveBehindOptionBody option={option} />
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

function StealthLeaveBehindOptionBody({ option }: { option: StealthLeaveBehindOptionView }) {
  return (
    <div className="space-y-1">
      <p className="font-medium">{option.label}</p>
      {option.summary ? <p className="text-xs opacity-60">{option.summary}</p> : null}
      <p className="text-xs opacity-55">
        Discovery risk {Math.round(option.discoveryRisk * 100)}% / Mission malus +
        {option.scoreAdjustmentPreview.toFixed(1)} / Custody refs {option.custodyLossRefCount}
      </p>
      <p className="text-xs opacity-55">
        If resolved with this tradeoff: forensic custody burden {option.projectedCustodyLossBurden}{' '}
        / {option.projectedForensicRemaining} forensic questions remaining
      </p>
    </div>
  )
}
