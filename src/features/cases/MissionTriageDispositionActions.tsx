import { MISSION_TRIAGE_DISPOSITION_LABELS } from '../../data/copy'
import type { MissionTriageDisposition } from '../../domain/models'
import type { MissionTriageDispositionView } from './missionTriageDispositionView'

export function MissionTriageDispositionActions({
  dispositionView,
  onDisposition,
  onClear,
}: {
  dispositionView: MissionTriageDispositionView
  onDisposition: (disposition: MissionTriageDisposition) => void
  onClear: () => void
}) {
  if (!dispositionView.visible) {
    return null
  }

  return (
    <div className="space-y-2 rounded border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-60">Triage disposition</p>
      <div className="flex flex-wrap gap-2" aria-label="Triage disposition">
        <button
          type="button"
          className="btn btn-sm btn-ghost focus-ring"
          disabled={!dispositionView.routeEnabled}
          aria-pressed={dispositionView.active === 'route'}
          title={MISSION_TRIAGE_DISPOSITION_LABELS.routeDetail}
          onClick={() => onDisposition('route')}
        >
          {MISSION_TRIAGE_DISPOSITION_LABELS.routeNow}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-ghost focus-ring"
          disabled={!dispositionView.deferEnabled}
          aria-pressed={dispositionView.active === 'defer'}
          title={MISSION_TRIAGE_DISPOSITION_LABELS.deferDetail}
          onClick={() => onDisposition('defer')}
        >
          {MISSION_TRIAGE_DISPOSITION_LABELS.defer}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-ghost focus-ring"
          disabled={!dispositionView.ignoreEnabled}
          aria-pressed={dispositionView.active === 'ignore'}
          title={MISSION_TRIAGE_DISPOSITION_LABELS.ignoreDetail}
          onClick={() => onDisposition('ignore')}
        >
          {MISSION_TRIAGE_DISPOSITION_LABELS.ignore}
        </button>
      </div>
      {dispositionView.activeLabel ? (
        <p className="text-xs font-medium text-sky-200/90">{dispositionView.activeLabel}</p>
      ) : null}
      {dispositionView.consequenceDetail ? (
        <p className="text-xs text-amber-200/90">{dispositionView.consequenceDetail}</p>
      ) : null}
      <p className="text-xs opacity-60">{dispositionView.assignDistinctNote}</p>
      {dispositionView.active ? (
        <button type="button" className="btn btn-sm btn-ghost focus-ring" onClick={onClear}>
          {MISSION_TRIAGE_DISPOSITION_LABELS.clear}
        </button>
      ) : null}
    </div>
  )
}
