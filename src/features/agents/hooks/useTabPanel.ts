import { useMemo } from 'react'
import type { TabType } from '../agentTabsModel'
import { useTabRegistry } from './useTabRegistry'

export function useTabPanel(activeTab: TabType) {
  const { registry } = useTabRegistry()

  const tabConfig = useMemo(() => {
    return registry.getTab(activeTab)
  }, [activeTab, registry])

  const TabComponent = tabConfig?.component

  return { TabComponent, tabConfig }
}
