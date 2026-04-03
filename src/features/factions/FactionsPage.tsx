import { useGameStore } from '../../app/store/gameStore'
import { buildFactionStates } from '../../domain/factions'

export default function FactionsPage() {
  const { game } = useGameStore()
  const factions = buildFactionStates(game)

  return (
    <section className="space-y-4">
      <article className="panel panel-primary space-y-3">
        <h2 className="text-lg font-semibold">External Actors</h2>
        <p className="text-sm opacity-60">
          Government offices, contractors, research bodies, occult networks, and hostile cults feed
          pressure back into operations. Standing and influence are derived from deterministic
          outcomes, live incident tags, unresolved momentum, and procurement posture.
        </p>
      </article>

      <ul className="space-y-3">
        {factions.map((faction) => (
          <li key={faction.id} className="panel space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">{faction.name}</p>
                <p className="text-sm opacity-60">{faction.feedback}</p>
              </div>
              <div className="text-right text-sm">
                <p>Standing {faction.standing >= 0 ? '+' : ''}{faction.standing}</p>
                <p>Pressure {faction.pressureScore}</p>
                <p className="opacity-60">{faction.stance}</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded border border-white/10 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.24em] opacity-50">Active incidents</p>
                <p className="mt-1 text-sm font-medium">{faction.matchingCases}</p>
              </div>
              <div className="rounded border border-white/10 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.24em] opacity-50">Incident pressure</p>
                <p className="mt-1 text-sm font-medium">
                  {faction.influenceModifiers.caseGenerationWeight.toFixed(2)}x
                </p>
              </div>
              <div className="rounded border border-white/10 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.24em] opacity-50">Operational leverage</p>
                <p className="mt-1 text-sm font-medium">
                  {faction.influenceModifiers.rewardModifier >= 0 ? '+' : ''}
                  {(faction.influenceModifiers.rewardModifier * 100).toFixed(0)}%
                </p>
              </div>
              <div className="rounded border border-white/10 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.24em] opacity-50">Access channel</p>
                <p className="mt-1 text-sm font-medium">{faction.influenceModifiers.opportunityAccess}</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded border border-white/10 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.24em] opacity-50">Current drivers</p>
                <p className="mt-1 text-sm opacity-70">
                  {faction.reasons.length > 0 ? faction.reasons.join(', ') : 'No active case pressure.'}
                </p>
              </div>
              <div className="rounded border border-white/10 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.24em] opacity-50">Open channels</p>
                <p className="mt-1 text-sm opacity-70">
                  {faction.opportunities.length > 0
                    ? faction.opportunities.map((entry) => entry.label).join(', ')
                    : 'No active liaison or leverage openings.'}
                </p>
              </div>
            </div>

            {faction.opportunities.length > 0 ? (
              <ul className="space-y-2 text-sm opacity-80">
                {faction.opportunities.map((opportunity) => (
                  <li
                    key={opportunity.id}
                    className="rounded border border-white/10 px-3 py-2"
                  >
                    <span className="font-medium">{opportunity.label}:</span> {opportunity.detail}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
