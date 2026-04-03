import { useGameStore } from '../../app/store/gameStore'
import { buildAgencyRanking } from '../../domain/strategicState'

export default function RankingsPage() {
  const { game } = useGameStore()
  const ranking = buildAgencyRanking(game)

  return (
    <section className="space-y-4">
      <article className="panel panel-primary space-y-3">
        <h2 className="text-lg font-semibold">Agency Rankings</h2>
        <p className="text-sm opacity-60">
          Standing is derived from contained operations, major-incident response, failure
          penalties, agency reputation, and roster progression.
        </p>

        <div className="grid gap-3 md:grid-cols-3">
          <Metric label="Tier" value={ranking.tier} />
          <Metric label="Score" value={String(ranking.score)} />
          <Metric label="Reports logged" value={String(ranking.reportsLogged)} />
        </div>
      </article>

      <article className="panel space-y-3">
        <h3 className="text-base font-semibold">Ranking breakdown</h3>
        <div className="grid gap-3 xl:grid-cols-2">
          <FactorMetric
            label={ranking.breakdown.casesResolved.label}
            value={`${ranking.breakdown.casesResolved.resolvedCases} resolved / ${ranking.breakdown.casesResolved.partialCases} partial`}
            impact={`+${ranking.breakdown.casesResolved.points}`}
            detail={ranking.breakdown.casesResolved.detail}
          />
          <FactorMetric
            label={ranking.breakdown.majorIncidentsHandled.label}
            value={`${ranking.breakdown.majorIncidentsHandled.resolvedIncidents} resolved / ${ranking.breakdown.majorIncidentsHandled.partialIncidents} partial`}
            impact={`+${ranking.breakdown.majorIncidentsHandled.points}`}
            detail={ranking.breakdown.majorIncidentsHandled.detail}
          />
          <FactorMetric
            label={ranking.breakdown.reputation.label}
            value={`${ranking.breakdown.reputation.reputationDelta >= 0 ? '+' : ''}${ranking.breakdown.reputation.reputationDelta}`}
            impact={`${ranking.breakdown.reputation.points >= 0 ? '+' : ''}${ranking.breakdown.reputation.points}`}
            detail={ranking.breakdown.reputation.detail}
          />
          <FactorMetric
            label={ranking.breakdown.progression.label}
            value={`${ranking.breakdown.progression.xpGained} XP / ${ranking.breakdown.progression.promotions} promotions`}
            impact={`+${ranking.breakdown.progression.points}`}
            detail={ranking.breakdown.progression.detail}
          />
          <FactorMetric
            label={ranking.breakdown.failures.label}
            value={String(ranking.breakdown.failures.failedCases)}
            impact={`-${ranking.breakdown.failures.penalty}`}
            detail={ranking.breakdown.failures.detail}
          />
          <FactorMetric
            label={ranking.breakdown.unresolved.label}
            value={String(ranking.breakdown.unresolved.unresolvedCases)}
            impact={`-${ranking.breakdown.unresolved.penalty}`}
            detail={ranking.breakdown.unresolved.detail}
          />
        </div>
      </article>

      <article className="panel space-y-3">
        <h3 className="text-base font-semibold">Weekly assessment updates</h3>
        {ranking.history.length === 0 ? (
          <p className="text-sm opacity-60">No ranking updates yet.</p>
        ) : (
          <ul className="space-y-2">
            {ranking.history.map((entry) => (
              <li key={entry.week} className="rounded border border-white/10 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <span>Week {entry.week}</span>
                  <span className="text-sm opacity-70">
                    {entry.tier} / {entry.score}{' '}
                    <span className={entry.deltaFromPrevious >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                      ({entry.deltaFromPrevious >= 0 ? '+' : ''}
                      {entry.deltaFromPrevious})
                    </span>
                  </span>
                </div>
                <p className="mt-1 text-xs opacity-60">
                  Resolved {entry.summary.resolvedCases}, majors {entry.summary.majorIncidentsHandled},
                  failures {entry.summary.failures}, unresolved {entry.summary.unresolved}, reputation{' '}
                  {entry.summary.reputationDelta >= 0 ? '+' : ''}
                  {entry.summary.reputationDelta}.
                </p>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  )
}

function FactorMetric({
  label,
  value,
  impact,
  detail,
}: {
  label: string
  value: string
  impact: string
  detail: string
}) {
  return (
    <div className="rounded border border-white/10 px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
          <p className="mt-1 text-sm font-medium">{value}</p>
        </div>
        <p className="text-sm font-medium opacity-80">{impact}</p>
      </div>
      <p className="mt-2 text-xs opacity-60">{detail}</p>
    </div>
  )
}
