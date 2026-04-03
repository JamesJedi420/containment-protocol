import { memo } from 'react'
import type { AgentView } from '../agentView'
import { SHELL_UI_TEXT } from '../../../data/copy'
import { DetailMetric } from './DetailMetric'
import { formatNumber } from './formatters'

export const VitalsTab = memo(function VitalsTab({ view }: { view: AgentView }) {
  const { agent, materialized } = view

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <DetailMetric label="Status" value={agent.status} />
        <DetailMetric label="Fatigue" value={formatNumber(agent.fatigue)} />
        <DetailMetric label="Stress" value={formatNumber(materialized.vitals.stress)} />
        <DetailMetric label="Health" value={formatNumber(materialized.vitals.health)} />
        <DetailMetric label="Morale" value={formatNumber(materialized.vitals.morale)} />
        <DetailMetric label="Wounds" value={formatNumber(materialized.vitals.wounds)} />
      </div>

      <div>
        <p className="text-xs uppercase tracking-[0.24em] opacity-50">Status flags</p>
        <p className="mt-2 text-sm opacity-80">
          {materialized.vitals.statusFlags.length > 0
            ? materialized.vitals.statusFlags.join(', ')
            : SHELL_UI_TEXT.none}
        </p>
      </div>
    </div>
  )
})
