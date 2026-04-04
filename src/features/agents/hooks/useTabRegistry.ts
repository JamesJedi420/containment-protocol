import { useMemo, useCallback } from 'react'
import { VitalsTab } from '../tabs/VitalsTab'
import { StatsTab } from '../tabs/StatsTab'
import { MoraleTab } from '../tabs/MoraleTab'
import { HistoryTab } from '../tabs/HistoryTab'
import { AGENT_DETAIL_TABS } from '../agentTabsModel'
import { TabRegistry, type TabConfig } from '../tabRegistry'
import type { AgentView } from '../agentView'
import { formatCompactLabel, formatNumber } from '../tabs/formatters'

export function useTabRegistry() {
  const registry = useMemo(() => {
    const tabConfigs: TabConfig[] = [
      {
        id: 'vitals',
        label: 'Vitals',
        generateMeta: (view: AgentView) =>
          `Health ${Math.round(view.materialized.vitals.health)} / Stress ${Math.round(view.materialized.vitals.stress)}`,
        component: VitalsTab,
        description: 'Agent health, stress, and status information',
      },
      {
        id: 'stats',
        label: 'Stats',
        generateMeta: (view: AgentView) =>
          `Contribution ${formatNumber(view.materialized.performance.contribution)}`,
        component: StatsTab,
        description: 'Performance metrics and tactical assessment',
      },
      {
        id: 'morale',
        label: 'Morale',
        generateMeta: (view: AgentView) =>
          formatCompactLabel(view.materialized.service.readinessBand),
        component: MoraleTab,
        description: 'Morale and readiness factors',
      },
      {
        id: 'history',
        label: 'History',
        generateMeta: (view: AgentView) => `Level ${view.materialized.progression.level}`,
        component: HistoryTab,
        description: 'Service history and progression',
      },
    ]

    return new TabRegistry({ tabs: tabConfigs })
  }, [])

  const getTabsInOrder = useCallback(
    () => registry.getTabsInOrder([...AGENT_DETAIL_TABS]),
    [registry]
  )

  return { registry, getTabsInOrder }
}
