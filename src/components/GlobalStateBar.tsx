import { type GameState } from '../domain/models'
import { getGlobalStateMetrics } from '../features/dashboard/dashboardView'
import { DetailProgressStat, DetailStat } from './StatCard'

export function GlobalStateBar({ game }: { game: GameState }) {
  const metrics = getGlobalStateMetrics(game)
  const liveSummary = `Containment ${metrics.containmentRating} percent, ${metrics.activeCases} active cases, funding ${metrics.funding}, clearance level ${metrics.clearanceLevel}.`

  return (
    <section className="panel space-y-3" aria-label="Operations desk global state">
      <p className="text-xs uppercase tracking-[0.22em] opacity-60">Operations Desk</p>
      <p role="status" aria-live="polite" className="sr-only">
        {liveSummary}
      </p>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <DetailProgressStat
          label="Agents"
          value={`${metrics.agentCapacity.used}/${metrics.agentCapacity.total}`}
          progressValue={metrics.agentCapacity.used}
          progressMax={metrics.agentCapacity.total}
          progressAriaLabel="Agent capacity utilization"
        />
        <DetailStat label="Active Cases" value={metrics.activeCases} />
        <DetailProgressStat
          label="Containment"
          value={`${metrics.containmentRating}%`}
          progressValue={metrics.containmentRating}
          progressMax={100}
          progressAriaLabel="Containment rating"
        />
        <DetailStat label="Clearance" value={`Level ${metrics.clearanceLevel}`} />
        <DetailStat label="Funding" value={`$${metrics.funding}`} />
        <DetailStat label="Year / Week" value={`${metrics.year} / ${metrics.weekOfYear}`} />
      </div>
    </section>
  )
}
