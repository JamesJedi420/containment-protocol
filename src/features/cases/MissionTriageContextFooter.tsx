import {
  MISSION_TRIAGE_FOOTER_LOAD_LABELS,
  type MissionTriageContextFooterView,
} from './missionTriageLayoutView'

export function MissionTriageContextFooter({ footer }: { footer: MissionTriageContextFooterView }) {
  return (
    <footer
      className="rounded border border-white/10 bg-white/5 px-4 py-3 text-sm"
      aria-label="Mission triage context"
    >
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
        <p>
          <span className="opacity-60">Projected support load:</span>{' '}
          <span className="font-medium">
            {MISSION_TRIAGE_FOOTER_LOAD_LABELS[footer.projectedSupportLoad]}
          </span>
        </p>
        <p>
          <span className="opacity-60">Teams available:</span>{' '}
          <span className="font-medium">{footer.teamsAvailable}</span>
        </p>
        <p>
          <span className="opacity-60">Urgent if deferred:</span>{' '}
          <span className="font-medium">{footer.urgentIfDeferred}</span>
        </p>
        <p>
          <span className="opacity-60">Escalation carryover risk:</span>{' '}
          <span className="font-medium">{footer.escalationCarryoverRisk}</span>
        </p>
      </div>
      <p className="mt-2 text-xs opacity-65">
        Routable this week: {footer.routableCount} — open cases without role/tag blockers.
      </p>
    </footer>
  )
}
