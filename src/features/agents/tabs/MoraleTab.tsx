import { memo } from 'react'
import type { AgentView } from '../agentView'
import { DetailMetric } from './DetailMetric'
import { formatNumber } from './formatters'

export const MoraleTab = memo(function MoraleTab({ view }: { view: AgentView }) {
  const { agent, materialized } = view

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        <DetailMetric label="Morale" value={formatNumber(materialized.vitals.morale)} />
      </div>

      <div className="space-y-2 rounded border border-white/10 px-4 py-3">
        <p className="text-xs uppercase tracking-[0.24em] opacity-50">Fatigue impact</p>
        <p className="text-sm opacity-80">
          Current fatigue: {agent.fatigue}% - morale is inversely affected by fatigue levels.
        </p>
      </div>

      <div className="space-y-2 rounded border border-white/10 px-4 py-3">
        <p className="text-xs uppercase tracking-[0.24em] opacity-50">Stress impact</p>
        <p className="text-sm opacity-80">
          Current stress: {materialized.vitals.stress}% - high stress levels degrade morale and
          decision-making performance.
        </p>
      </div>

      <div className="space-y-2 rounded border border-white/10 px-4 py-3">
        <p className="text-xs uppercase tracking-[0.24em] opacity-50">Progression context</p>
        <p className="text-sm opacity-80">
          Level {materialized.progression.level} operative - {materialized.progression.growthProfile}{' '}
          profile. Potential tier: {materialized.progression.potentialTier}.
        </p>
      </div>
    </div>
  )
})
