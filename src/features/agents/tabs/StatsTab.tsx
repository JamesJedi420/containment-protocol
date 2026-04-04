import { memo } from 'react'
import type { AgentView } from '../agentView'
import { DetailMetric } from './DetailMetric'
import { formatNumber } from './formatters'

export const StatsTab = memo(function StatsTab({ view }: { view: AgentView }) {
  const { materialized } = view
  const statCaps = materialized.progression.displayStatCaps
  const projectedStatCapRanges = materialized.progression.projectedStatCapRanges
  const potentialTierLabel = materialized.progression.exactPotentialKnown
    ? materialized.progression.actualPotentialTier
    : materialized.progression.visiblePotentialTier
      ? `Projected ${materialized.progression.visiblePotentialTier}`
      : 'Unknown'
  const formatRange = (range?: { min: number; max: number }) =>
    range ? `${range.min}-${range.max}` : 'Unknown'

  return (
    <div className="space-y-4">
      <div>
        <h4 className="mb-3 text-sm font-semibold">Potential ceiling intel</h4>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <DetailMetric label="Potential tier" value={potentialTierLabel} />
          <DetailMetric
            label="Intel confidence"
            value={materialized.progression.potentialConfidence}
          />
          <DetailMetric
            label="Discovery progress"
            value={`${materialized.progression.discoveryProgress}%`}
          />
          <DetailMetric
            label={
              materialized.progression.exactPotentialKnown
                ? 'Combat ceiling'
                : 'Projected combat ceiling band'
            }
            value={
              materialized.progression.exactPotentialKnown
                ? statCaps
                  ? String(statCaps.combat)
                  : 'Unknown'
                : formatRange(projectedStatCapRanges?.combat)
            }
          />
          <DetailMetric
            label={
              materialized.progression.exactPotentialKnown
                ? 'Investigation ceiling'
                : 'Projected investigation ceiling band'
            }
            value={
              materialized.progression.exactPotentialKnown
                ? statCaps
                  ? String(statCaps.investigation)
                  : 'Unknown'
                : formatRange(projectedStatCapRanges?.investigation)
            }
          />
          <DetailMetric
            label={
              materialized.progression.exactPotentialKnown
                ? 'Utility ceiling'
                : 'Projected utility ceiling band'
            }
            value={
              materialized.progression.exactPotentialKnown
                ? statCaps
                  ? String(statCaps.utility)
                  : 'Unknown'
                : formatRange(projectedStatCapRanges?.utility)
            }
          />
          <DetailMetric
            label={
              materialized.progression.exactPotentialKnown
                ? 'Social ceiling'
                : 'Projected social ceiling band'
            }
            value={
              materialized.progression.exactPotentialKnown
                ? statCaps
                  ? String(statCaps.social)
                  : 'Unknown'
                : formatRange(projectedStatCapRanges?.social)
            }
          />
        </div>
      </div>

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
