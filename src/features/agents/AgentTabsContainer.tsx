import { useId, useRef, useState, useEffect, type KeyboardEvent } from 'react'
import type { AgentView } from './agentView'
import { DEFAULT_AGENT_DETAIL_TAB, type TabType } from './agentTabsModel'
import { useTabRegistry } from './hooks/useTabRegistry'
import { useTabPanel } from './hooks/useTabPanel'
import { useTabLazyLoad } from './hooks/useTabLazyLoad'

export function AgentTabsContainer({
  view,
  activeTab: controlledActiveTab,
  onTabChange,
}: {
  view: AgentView
  activeTab?: TabType
  onTabChange?: (tab: TabType) => void
}) {
  const [uncontrolledActiveTab, setUncontrolledActiveTab] = useState<TabType>(
    DEFAULT_AGENT_DETAIL_TAB
  )
  const tabGroupId = useId()
  const activeTab = controlledActiveTab ?? uncontrolledActiveTab
  const tabRefs = useRef<Record<TabType, HTMLButtonElement | null>>({
    vitals: null,
    stats: null,
    morale: null,
    history: null,
  })
  const railRef = useRef<HTMLDivElement>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)
  const swipeStartXRef = useRef<number | null>(null)
  const swipeEndXRef = useRef<number | null>(null)

  // Use registry to get tab configs
  const { getTabsInOrder } = useTabRegistry()
  const tabs = getTabsInOrder().map((config) => ({
    id: config.id,
    label: config.label,
    meta: config.generateMeta(view),
  }))

  // Get current tab panel component
  const { TabComponent } = useTabPanel(activeTab)

  // Initialize lazy loading - auto-registers when activeTab changes
  const { shouldRenderTab, registerTabMount } = useTabLazyLoad(activeTab)

  const activeTabIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.id === activeTab)
  )

  const updateActiveTab = (nextTab: TabType) => {
    registerTabMount(nextTab)

    if (controlledActiveTab === undefined) {
      setUncontrolledActiveTab(nextTab)
    }

    onTabChange?.(nextTab)
  }

  const moveToTab = (nextIndex: number) => {
    const normalizedIndex = (nextIndex + tabs.length) % tabs.length
    const nextTab = tabs[normalizedIndex]

    updateActiveTab(nextTab.id)
    tabRefs.current[nextTab.id]?.focus()
  }

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault()
        moveToTab(currentIndex + 1)
        return
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault()
        moveToTab(currentIndex - 1)
        return
      case 'Home':
        event.preventDefault()
        moveToTab(0)
        return
      case 'End':
        event.preventDefault()
        moveToTab(tabs.length - 1)
        return
      default:
        return
    }
  }

  // Detect overflow and handle swipe gestures
  useEffect(() => {
    const checkOverflow = () => {
      if (railRef.current) {
        const isOverflow = railRef.current.scrollWidth > railRef.current.clientWidth
        setIsOverflowing(isOverflow)
      }
    }

    checkOverflow()
    window.addEventListener('resize', checkOverflow)
    return () => window.removeEventListener('resize', checkOverflow)
  }, [tabs])

  const handleSwipe = (startX: number | null, endX: number | null) => {
    if (startX !== null && endX !== null) {
      const distance = startX - endX
      const threshold = 50

      if (distance > threshold) {
        // Swipe left: previous tab
        moveToTab(activeTabIndex - 1)
      } else if (distance < -threshold) {
        // Swipe right: next tab
        moveToTab(activeTabIndex + 1)
      }
    }

    swipeStartXRef.current = null
    swipeEndXRef.current = null
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    const startX = e.changedTouches[0].screenX
    swipeStartXRef.current = startX
    swipeEndXRef.current = startX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const moveX = e.changedTouches[0].screenX
    swipeEndXRef.current = moveX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const endX = swipeEndXRef.current ?? e.changedTouches[0].screenX
    swipeEndXRef.current = endX
    handleSwipe(swipeStartXRef.current, endX)
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    swipeStartXRef.current = e.clientX
    swipeEndXRef.current = e.clientX
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    swipeEndXRef.current = e.clientX
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    const endX = swipeEndXRef.current ?? e.clientX
    swipeEndXRef.current = endX
    handleSwipe(swipeStartXRef.current, endX)
  }

  return (
    <article className="panel space-y-4 overflow-hidden">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">Deep readout</p>
            <h3 className="text-base font-semibold">Operative detail tabs</h3>
          </div>
          <p className="text-xs uppercase tracking-[0.24em] opacity-50">
            {tabs[activeTabIndex]?.label} active {`(${activeTabIndex + 1} of ${tabs.length})`}
            {isOverflowing && <span className="ml-2">●</span>}
          </p>
        </div>

        <div
          ref={railRef}
          role="tablist"
          aria-label="Agent detail tabs"
          aria-orientation="horizontal"
          className="tab-rail"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {tabs.map((tab, index) => {
            const selected = activeTab === tab.id

            if (selected) {
              return (
                <button
                  key={tab.id}
                  type="button"
                  ref={(node) => {
                    tabRefs.current[tab.id] = node
                  }}
                  id={`${tabGroupId}-tab-${tab.id}`}
                  role="tab"
                  tabIndex={0}
                  aria-selected="true"
                  aria-controls={`${tabGroupId}-tabpanel-${tab.id}`}
                  aria-label={`${tab.label} tab (${index + 1} of ${tabs.length}), ${tab.meta}`}
                  onClick={() => {
                    registerTabMount(tab.id)
                    updateActiveTab(tab.id)
                  }}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                  data-active
                  className="tab-trigger"
                >
                  <span className="tab-trigger-title">{tab.label}</span>
                  <span className="tab-trigger-meta">{tab.meta}</span>
                </button>
              )
            }

            return (
              <button
                key={tab.id}
                type="button"
                ref={(node) => {
                  tabRefs.current[tab.id] = node
                }}
                id={`${tabGroupId}-tab-${tab.id}`}
                role="tab"
                tabIndex={-1}
                aria-selected="false"
                aria-controls={`${tabGroupId}-tabpanel-${tab.id}`}
                aria-label={`${tab.label} tab (${index + 1} of ${tabs.length}), ${tab.meta}`}
                onClick={() => {
                  registerTabMount(tab.id)
                  updateActiveTab(tab.id)
                }}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                data-active={false}
                className="tab-trigger"
              >
                <span className="tab-trigger-title">{tab.label}</span>
                <span className="tab-trigger-meta">{tab.meta}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div
        id={`${tabGroupId}-tabpanel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`${tabGroupId}-tab-${activeTab}`}
        aria-live="polite"
        aria-label={`${tabs.find((t) => t.id === activeTab)?.label} panel content`}
        className="tab-panel"
      >
        {shouldRenderTab(activeTab) && TabComponent && <TabComponent view={view} />}
      </div>
    </article>
  )
}

