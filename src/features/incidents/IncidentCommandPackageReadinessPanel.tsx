import type {
  IncidentCommandKitItemStatus,
  IncidentCommandPackageReadinessView,
  IncidentCommandResponderRoute,
  IncidentCommandSlotStatus,
} from './incidentCommandPackageReadinessView'

export function IncidentCommandPackageReadinessPanel({
  view,
}: {
  view: IncidentCommandPackageReadinessView
}) {
  return (
    <article
      className="panel panel-primary space-y-3"
      role="region"
      aria-label="Incident command package readiness"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide opacity-50">Command package</p>
          <h3 className="text-lg font-semibold">Incident package readiness</h3>
          <p className="text-sm opacity-65">{view.summary}</p>
        </div>
        <div className="text-right text-xs opacity-60">
          <p>{view.scopeLabel}</p>
          <p>{view.mode === 'field-compact' ? 'Field compact' : view.mode}</p>
        </div>
      </div>

      {view.warnings.length > 0 ? (
        <ul
          className="space-y-1 rounded border border-amber-400/25 bg-amber-500/8 px-3 py-2 text-xs text-amber-100/90"
          aria-label="Command package warnings"
        >
          {view.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded border border-white/10 bg-white/5 px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-wide opacity-55">Role slots</p>
            <p className="text-xs opacity-50">{view.roleSlots.length} shown</p>
          </div>
          {view.roleSlots.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs">
              {view.roleSlots.map((slot) => (
                <li key={slot.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <span className="font-medium">{slot.label}</span>
                    <span className="opacity-55">
                      {' '}
                      /{' '}
                      {slot.coveredAgents.map((agent) => agent.agentName).join(', ') ||
                        slot.acceptedRoleLabels.join(' / ')}
                    </span>
                  </span>
                  <span className={`rounded-full border px-2 py-0.5 ${getSlotTone(slot.status)}`}>
                    {slot.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs opacity-50">No role-slot pressure is visible.</p>
          )}
        </section>

        <section className="rounded border border-white/10 bg-white/5 px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-wide opacity-55">Kit template</p>
            <p className="text-xs opacity-50">{view.kitTemplate.label}</p>
          </div>
          <ul className="mt-2 space-y-1 text-xs">
            {view.kitTemplate.items.map((item) => (
              <li key={item.itemId} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <span className="font-medium">{item.itemLabel}</span>
                  <span className="opacity-55">
                    {' '}
                    /{' '}
                    {item.holderNames.length > 0
                      ? item.holderNames.join(', ')
                      : `reserve ${item.reserveStock}`}
                  </span>
                </span>
                <span className={`rounded-full border px-2 py-0.5 ${getKitTone(item.status)}`}>
                  {formatKitStatus(item.status)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {view.supportBlockers.length > 0 ? (
        <section className="rounded border border-rose-400/25 bg-rose-500/8 px-3 py-2">
          <p className="text-xs uppercase tracking-wide opacity-60">Live support blockers</p>
          <ul className="mt-2 space-y-1 text-xs">
            {view.supportBlockers.map((action) => (
              <li key={action.id}>
                <span className="font-medium">{action.label}</span>
                {action.cause ? <span className="opacity-70"> - {action.cause}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {view.responderReadiness.length > 0 ? (
        <ul className="grid gap-2 text-xs sm:grid-cols-2">
          {view.responderReadiness.map((responder) => (
            <li
              key={responder.agentId}
              className="rounded border border-white/10 bg-white/5 px-3 py-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{responder.agentName}</p>
                  <p className="opacity-55">{responder.roleLabel}</p>
                </div>
                <span
                  className={`rounded-full border px-2 py-0.5 ${getResponderTone(responder.route)}`}
                >
                  {responder.route}
                </span>
              </div>
              <p className="mt-2 opacity-70">
                Score {responder.score} / Gear {responder.gearReadiness} / Condition{' '}
                {responder.conditionScore}
              </p>
              <p className="mt-1 opacity-60">
                Fit {responder.specializationFit} / Panic {responder.panicRisk} /{' '}
                {responder.primaryReason}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm opacity-50">No responders are visible in this command package.</p>
      )}
    </article>
  )
}

function getSlotTone(status: IncidentCommandSlotStatus) {
  return status === 'covered'
    ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
    : 'border-rose-400/30 bg-rose-500/10 text-rose-100'
}

function getKitTone(status: IncidentCommandKitItemStatus) {
  if (status === 'equipped') {
    return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
  }

  if (status === 'reserve-only') {
    return 'border-amber-400/30 bg-amber-500/10 text-amber-100'
  }

  return 'border-rose-400/30 bg-rose-500/10 text-rose-100'
}

function getResponderTone(route: IncidentCommandResponderRoute) {
  if (route === 'deploy') {
    return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
  }

  if (route === 'hold') {
    return 'border-amber-400/30 bg-amber-500/10 text-amber-100'
  }

  return 'border-rose-400/30 bg-rose-500/10 text-rose-100'
}

function formatKitStatus(status: IncidentCommandKitItemStatus) {
  if (status === 'reserve-only') {
    return 'reserve only'
  }

  return status
}
