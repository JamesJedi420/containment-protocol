import type {
  MissionTriageDeferralCompareTone,
  MissionTriageDeferralCompareView,
} from './missionTriageDeferralCompareView'

const TONE_VALUE_CLASS: Record<MissionTriageDeferralCompareTone, string> = {
  low: 'text-emerald-200/90',
  medium: 'text-amber-200/90',
  high: 'text-rose-200/90',
}

export function MissionTriageDeferralCompareTable({
  view,
}: {
  view: MissionTriageDeferralCompareView
}) {
  if (!view.visible || view.columns.length === 0) {
    return null
  }

  return (
    <div
      className="rounded border border-white/10 bg-white/5 px-3 py-2 text-xs"
      role="table"
      aria-label="Deferral and covert prep comparison"
    >
      <div role="rowgroup">
        <div role="row" className="grid grid-cols-3 gap-3 border-b border-white/10 pb-2">
          {view.columns.map((column) => (
            <div key={column.id} role="columnheader" className="font-medium uppercase tracking-wide opacity-60">
              {column.label}
            </div>
          ))}
        </div>
      </div>
      <div role="rowgroup" className="pt-2">
        <div role="row" className="grid grid-cols-3 gap-3">
          {view.columns.map((column) => (
            <div key={column.id} role="cell" className="space-y-0.5">
              <p className={`font-medium ${TONE_VALUE_CLASS[column.tone]}`}>{column.value}</p>
              {column.detail ? <p className="opacity-70">{column.detail}</p> : null}
            </div>
          ))}
        </div>
      </div>
      {view.carryoverLink ? (
        <p className="mt-2 border-t border-white/10 pt-2 text-amber-200/90">
          <span className="font-medium">{view.carryoverLink.label}: </span>
          {view.carryoverLink.detail}
        </p>
      ) : null}
    </div>
  )
}
