import type { AgentView } from './agentView'
import type { TabType } from './agentTabsModel'

export interface TabConfig {
  id: TabType
  label: string
  generateMeta: (view: AgentView) => string
  component: React.ComponentType<{ view: AgentView }>
  description?: string
}

export interface TabRegistryOptions {
  tabs?: TabConfig[]
}

class TabRegistry {
  private tabs: Map<TabType, TabConfig> = new Map()

  constructor(options?: TabRegistryOptions) {
    if (options?.tabs) {
      options.tabs.forEach((tab) => {
        this.register(tab)
      })
    }
  }

  register(config: TabConfig): void {
    this.tabs.set(config.id, config)
  }

  unregister(id: TabType): void {
    this.tabs.delete(id)
  }

  getTab(id: TabType): TabConfig | undefined {
    return this.tabs.get(id)
  }

  getAllTabs(): TabConfig[] {
    return Array.from(this.tabs.values())
  }

  getTabsInOrder(ids: TabType[]): TabConfig[] {
    return ids.map((id) => this.tabs.get(id)).filter((tab) => tab !== undefined) as TabConfig[]
  }
}

export { TabRegistry }
