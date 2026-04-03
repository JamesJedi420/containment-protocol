import { memo } from 'react'
import type { AgentView } from '../agentView'
import { DetailMetric } from './DetailMetric'
import { formatNumber } from './formatters'

export const StatsTab = memo(function StatsTab({ view }: { view: AgentView }) {
  const { materialized } = view

  return (
    <div className="space-y-4">
      <div>
        <h4 className="mb-3 text-sm font-semibold">Live performance model</h4>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <DetailMetric
            label="Field power"
            value={formatNumber(materialized.performance.fieldPower)}
          />
          <DetailMetric
            label="Containment"
            value={formatNumber(materialized.performance.containment)}
          />
          <DetailMetric
            label="Investigation"
            value={formatNumber(materialized.performance.investigation)}
          />
          <DetailMetric label="Support" value={formatNumber(materialized.performance.support)} />
          <DetailMetric
            label="Stress impact"
            value={formatNumber(materialized.performance.stressImpact)}
          />
        </div>
      </div>

      <div>
        <h4 className="mb-3 text-sm font-semibold">Current action metrics</h4>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <DetailMetric
            label="Contribution"
            value={formatNumber(materialized.performance.contribution)}
          />
          <DetailMetric
            label="Threat handled"
            value={formatNumber(materialized.performance.threatHandled)}
          />
          <DetailMetric
            label="Damage taken"
            value={formatNumber(materialized.performance.damageTaken)}
          />
          <DetailMetric
            label="Healing / stabilization"
            value={formatNumber(materialized.performance.healingPerformed)}
          />
          <DetailMetric
            label="Evidence gathered"
            value={formatNumber(materialized.performance.evidenceGathered)}
          />
          <DetailMetric
            label="Containment actions"
            value={formatNumber(materialized.performance.containmentActionsCompleted)}
          />
        </div>
      </div>
    </div>
  )
})
