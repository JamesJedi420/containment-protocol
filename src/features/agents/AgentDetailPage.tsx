import { useEffect } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import {
  cloneSearchParams,
  readEnumParam,
  toSearchString,
  writeEnumParam,
} from '../../app/searchParams'
import LocalNotFound from '../../app/LocalNotFound'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { NAVIGATION_ROUTES, SHELL_UI_TEXT } from '../../data/copy'
import { AgentEntityPanel } from './AgentEntityPanel'
import { AGENT_DETAIL_TABS, DEFAULT_AGENT_DETAIL_TAB, type TabType } from './agentTabsModel'
import { getAgentView } from './agentView'

interface AgentDetailLocationState {
  registrySearch?: string
}

export default function AgentDetailPage() {
  const { agentId } = useParams()
  const location = useLocation()
  const { pathname } = location
  const [searchParams, setSearchParams] = useSearchParams()
  const { game } = useGameStore()
  const view = agentId ? getAgentView(game, agentId) : undefined
  const activeTab = readEnumParam(searchParams, 'tab', AGENT_DETAIL_TABS, DEFAULT_AGENT_DETAIL_TAB)
  const locationState = (location.state ?? null) as AgentDetailLocationState | null
  const backParams = cloneSearchParams(searchParams)
  const isRegistryDetailRoute = pathname.startsWith(`${APP_ROUTES.registry}/`)
  const backSystemRoute = isRegistryDetailRoute ? APP_ROUTES.registry : APP_ROUTES.agents
  const backSystemLabel = isRegistryDetailRoute
    ? NAVIGATION_ROUTES.registry.label
    : NAVIGATION_ROUTES.agents.label

  backParams.delete('tab')

  const backSearch = toSearchString(backParams)
  const fallbackRegistrySearch =
    isRegistryDetailRoute && !backSearch ? (locationState?.registrySearch ?? '') : ''
  const backTo = `${backSystemRoute}${backSearch || fallbackRegistrySearch}`

  useEffect(() => {
    const normalizedParams = cloneSearchParams(searchParams)

    writeEnumParam(normalizedParams, 'tab', activeTab, DEFAULT_AGENT_DETAIL_TAB)

    if (normalizedParams.toString() !== searchParams.toString()) {
      setSearchParams(normalizedParams, { replace: true, state: location.state })
    }
  }, [activeTab, location.state, searchParams, setSearchParams])

  const handleTabChange = (nextTab: TabType) => {
    const nextParams = cloneSearchParams(searchParams)

    writeEnumParam(nextParams, 'tab', nextTab, DEFAULT_AGENT_DETAIL_TAB)
    setSearchParams(nextParams, { state: location.state })
  }

  if (!view) {
    return (
      <LocalNotFound
        title={SHELL_UI_TEXT.agentNotFoundTitle}
        message={SHELL_UI_TEXT.agentNotFoundMessage}
        backTo={backTo}
        backLabel={SHELL_UI_TEXT.backToTemplate.replace('{label}', backSystemLabel)}
      />
    )
  }

  return (
    <AgentEntityPanel
      view={view}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      headerActions={
        <>
          <Link to={backTo} className="btn btn-sm btn-ghost">
            {`Back to ${backSystemLabel.toLowerCase()}`}
          </Link>
          <Link to={view.squadBuilderLink} className="btn btn-sm btn-ghost">
            {view.squadBuilderLabel}
          </Link>
        </>
      }
    />
  )
}
