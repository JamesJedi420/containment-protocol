import type {
  SupportIncidentActionStatus,
  SupportIncidentReferenceView,
} from './supportIncidentReferenceView'

export function SupportIncidentReferencePanel({ view }: { view: SupportIncidentReferenceView }) {
  return (
    <article
      className="panel panel-support space-y-3"
      role="region"
      aria-label="Support incident reference"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide opacity-50">Support reference</p>
          <h3 className="text-lg font-semibold">Field support panel</h3>
          <p className="text-sm opacity-65">{view.summary}</p>
        </div>
        <div className="text-right text-xs opacity-60">
          <p>{view.scopeLabel}</p>
          <p>Field compact</p>
        </div>
      </div>

      {view.warnings.length > 0 ? (
        <ul
          className="space-y-1 rounded border border-amber-400/25 bg-amber-500/8 px-3 py-2 text-xs text-amber-100/90"
          aria-label="Support warnings"
        >
          {view.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

      {view.blockedActions.length > 0 ? (
        <div className="rounded border border-rose-400/25 bg-rose-500/8 px-3 py-2">
          <p className="text-xs uppercase tracking-wide opacity-60">Blocked / unavailable</p>
          <ul className="mt-2 space-y-1 text-xs">
            {view.blockedActions.map((action) => (
              <li key={action.id}>
                <span className="font-medium">{action.label}</span>
                {action.cause ? <span className="opacity-70"> - {action.cause}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {view.rows.length > 0 ? (
        <ul className="grid gap-2 text-xs sm:grid-cols-2">
          {view.rows.map((row) => (
            <li key={row.agentId} className="rounded border border-white/10 bg-white/5 px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{row.agentName}</p>
                  <p className="opacity-55">{row.roleLabel}</p>
                </div>
                <span className="rounded-full border border-white/10 px-2 py-0.5 opacity-70">
                  {row.prepared.statusLabel}
                </span>
              </div>

              <p className="mt-2 opacity-75">
                Prepared: {row.prepared.familyLabel} / {row.prepared.statusLabel} /{' '}
                {row.prepared.itemLabel} / reserve {row.prepared.reserveStock}
              </p>
              <p className="mt-1 opacity-65">
                Refresh: {formatActionStatus(row.prepared.refresh.status)}
                {row.prepared.refresh.cause ? ` - ${row.prepared.refresh.cause}` : ''}
              </p>

              {row.runtime.length > 0 ? (
                <p className="mt-1 opacity-65">
                  Runtime:{' '}
                  {row.runtime.map((entry) => `${entry.label} ${entry.status}`).join(' / ')}
                </p>
              ) : null}

              <div className="mt-2 flex flex-wrap gap-1">
                {row.actions.slice(0, 3).map((action) => (
                  <span
                    key={action.id}
                    className={`rounded-full border px-2 py-0.5 ${getActionToneClass(action.status)}`}
                    title={action.cause}
                  >
                    {action.label}: {formatActionStatus(action.status)}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm opacity-50">
          No selected support-capable agents or runtime support tools are visible for this incident.
        </p>
      )}
    </article>
  )
}

function formatActionStatus(status: SupportIncidentActionStatus) {
  if (status === 'available') {
    return 'available'
  }

  if (status === 'blocked') {
    return 'blocked'
  }

  return 'unavailable'
}

function getActionToneClass(status: SupportIncidentActionStatus) {
  if (status === 'available') {
    return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
  }

  if (status === 'blocked') {
    return 'border-amber-400/30 bg-amber-500/10 text-amber-100'
  }

  return 'border-rose-400/30 bg-rose-500/10 text-rose-100'
}
