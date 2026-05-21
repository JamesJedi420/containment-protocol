import { CASE_TRIAGE_TABS, type CaseTriageTab } from './caseView'
import { CASE_TRIAGE_TAB_LABELS } from './missionTriageLayoutView'

export function MissionTriageTabs({
  activeTab,
  tabCounts,
  onSelectTab,
}: {
  activeTab: CaseTriageTab
  tabCounts: Record<CaseTriageTab, number>
  onSelectTab: (tab: CaseTriageTab) => void
}) {
  return (
    <div
      className="flex flex-wrap gap-2"
      role="tablist"
      aria-label="Mission triage categories"
    >
      {CASE_TRIAGE_TABS.map((tab) => {
        const selected = activeTab === tab
        const count = tabCounts[tab]

        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={selected}
            className={selected ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-ghost'}
            onClick={() => {
              if (tab !== activeTab) {
                onSelectTab(tab)
              }
            }}
          >
            {CASE_TRIAGE_TAB_LABELS[tab]}
            <span className="ml-1 opacity-70">({count})</span>
          </button>
        )
      })}
    </div>
  )
}
