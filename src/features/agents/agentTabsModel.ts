export const AGENT_DETAIL_TABS = ['vitals', 'stats', 'morale', 'history'] as const
export type TabType = (typeof AGENT_DETAIL_TABS)[number]
export const DEFAULT_AGENT_DETAIL_TAB: TabType = 'stats'
