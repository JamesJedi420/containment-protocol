import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { getFactionPageView, type FactionViewTone } from './factionView'

function toneSurfaceClass(tone: FactionViewTone) {
  if (tone === 'danger') return 'border-red-400/30 bg-red-500/8'
  if (tone === 'warning') return 'border-amber-400/30 bg-amber-500/8'
  if (tone === 'success') return 'border-emerald-400/30 bg-emerald-500/8'
  if (tone === 'info') return 'border-cyan-400/30 bg-cyan-500/8'
  return 'border-white/10 bg-white/5'
}

function toneChipClass(tone: FactionViewTone) {
  if (tone === 'danger') return 'border-red-400/35 bg-red-500/10 text-red-200'
  if (tone === 'warning') return 'border-amber-400/35 bg-amber-500/10 text-amber-200'
  if (tone === 'success') return 'border-emerald-400/35 bg-emerald-500/10 text-emerald-200'
  if (tone === 'info') return 'border-cyan-400/35 bg-cyan-500/10 text-cyan-100'
  return 'border-white/10 bg-white/5 text-white/80'
}

export default function FactionsPage() {
  const { game } = useGameStore()
  const view = getFactionPageView(game)

  return (
    <section className="space-y-4" aria-label="Faction contacts and relationships">
      <article className="panel panel-primary space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50">
              Player-facing faction contacts
            </p>
            <h2 className="text-xl font-semibold">Faction Contacts & Standing</h2>
            <p className="text-sm opacity-75">{view.summary}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {view.links.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className="rounded border border-white/10 bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10"
              >
                <p className="font-medium">{link.label}</p>
                <p className="mt-1 text-xs opacity-65">{link.description}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {view.metrics.map((metric) => (
            <div key={metric.label} className={`rounded border px-3 py-3 ${toneSurfaceClass(metric.tone ?? 'neutral')}`}>
              <p className="text-xs uppercase tracking-[0.24em] opacity-60">{metric.label}</p>
              <p className="mt-2 text-2xl font-semibold">{metric.value}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="panel space-y-3" aria-label="Recent faction activity">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Recent Faction Activity</h3>
          <Link to={APP_ROUTES.report} className="text-sm opacity-60 hover:opacity-100">
            Open reports
          </Link>
        </div>

        {view.recentActivity.length > 0 ? (
          <ul className="space-y-2">
            {view.recentActivity.map((item) => (
              <li key={item.id} className={`rounded border px-3 py-2 ${toneSurfaceClass(item.tone)}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {item.href ? <Link to={item.href}>{item.title}</Link> : item.title}
                    </p>
                    <p className="text-xs opacity-75">{item.detail}</p>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] ${toneChipClass(item.tone)}`}>
                    {item.tone}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm opacity-60">No faction-tagged activity has been logged yet.</p>
        )}
      </article>

      <ul className="space-y-4" aria-label="Faction dossiers">
        {view.factions.map((faction) => (
          <li key={faction.id} className={`panel space-y-4 ${toneSurfaceClass(faction.standingTone)}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-lg font-semibold">{faction.name}</p>
                <p className="text-sm opacity-70">{faction.description}</p>
                <p className="text-sm opacity-80">{faction.overview}</p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <span
                  aria-label={`${faction.name} standing band`}
                  className={`rounded-full border px-2.5 py-1 text-xs ${toneChipClass(faction.standingTone)}`}
                >
                  {faction.standingLabel}
                </span>
                <span
                  aria-label={`${faction.name} posture`}
                  className={`rounded-full border px-2.5 py-1 text-xs ${toneChipClass(faction.stanceTone)}`}
                >
                  {faction.stanceLabel}
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {faction.metrics.map((metric) => (
                <div key={`${faction.id}:${metric.label}`} className="rounded border border-white/10 bg-white/5 px-3 py-2">
                  <p className="text-xs uppercase tracking-[0.24em] opacity-50">{metric.label}</p>
                  <p className="mt-1 text-sm font-medium">{metric.value}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-3 xl:grid-cols-3">
              <article className="rounded border border-white/10 bg-white/5 px-3 py-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] opacity-70">
                  Contract posture
                </h3>
                <p className="mt-2 text-sm opacity-80">{faction.contractSummary}</p>
                <ul className="mt-3 space-y-2 text-sm opacity-70">
                  {faction.contractDetails.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              </article>

              <article className="rounded border border-white/10 bg-white/5 px-3 py-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] opacity-70">
                  Known / hidden effects
                </h3>
                <p className="mt-2 text-sm opacity-80">{faction.modifierSummary}</p>
                <ul className="mt-3 space-y-2 text-sm opacity-70">
                  {faction.modifierDetails.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
                <p className="mt-3 text-xs opacity-60">{faction.hiddenSummary}</p>
              </article>

              <article className="rounded border border-white/10 bg-white/5 px-3 py-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] opacity-70">
                  Contacts
                </h3>
                <ul className="mt-3 space-y-2">
                  {faction.contacts.map((contact) => (
                    <li key={contact.id} className="rounded border border-white/10 bg-black/10 px-3 py-2">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">
                            {contact.name} <span className="opacity-60">/ {contact.role}</span>
                          </p>
                          <p className="mt-1 text-xs opacity-75">{contact.summary}</p>
                        </div>
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] ${toneChipClass(contact.tone)}`}>
                          {contact.relationshipLabel}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            </div>

            <div className="grid gap-3 xl:grid-cols-3">
              <article className="rounded border border-white/10 bg-white/5 px-3 py-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] opacity-70">
                  History
                </h3>
                <p className="mt-2 text-sm opacity-80">{faction.historySummary}</p>
                {faction.historyItems.length > 0 ? (
                  <ul className="mt-3 space-y-2 text-sm opacity-70">
                    {faction.historyItems.map((item) => (
                      <li key={item.id}>
                        {item.href ? <Link to={item.href}>{item.title}</Link> : item.title}
                        <span className="opacity-60"> - {item.detail}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>

              <article className="rounded border border-white/10 bg-white/5 px-3 py-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] opacity-70">
                  Lore threads
                </h3>
                {faction.loreItems.length > 0 ? (
                  <ul className="mt-3 space-y-2 text-sm opacity-70">
                    {faction.loreItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm opacity-60">No additional lore is currently exposed.</p>
                )}
              </article>

              <article className="rounded border border-white/10 bg-white/5 px-3 py-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] opacity-70">
                  Benefits / channels
                </h3>
                {faction.benefitItems.length > 0 ? (
                  <ul className="mt-3 space-y-2 text-sm opacity-70">
                    {faction.benefitItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm opacity-60">
                    No current favors or recruit channels are open from this faction.
                  </p>
                )}
              </article>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
