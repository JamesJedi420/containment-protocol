import { useState, useCallback } from 'react'
import type { TabType } from '../agentTabsModel'

export function useTabLazyLoad(activeTab: TabType) {
  const [mountedTabs, setMountedTabs] = useState<Set<TabType>>(() => new Set([activeTab]))

  const shouldRenderTab = useCallback(
    (tabId: TabType) => {
      return tabId === activeTab || mountedTabs.has(tabId)
    },
    [activeTab, mountedTabs]
  )

  const registerTabMount = useCallback((tabId: TabType) => {
    setMountedTabs((prev) => {
      if (prev.has(tabId)) return prev
      const next = new Set(prev)
      next.add(tabId)
      return next
    })
  }, [])

  return { shouldRenderTab, registerTabMount, mountedTabs }
}
