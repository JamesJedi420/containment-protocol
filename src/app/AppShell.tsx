import {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  type ComponentType,
  type MouseEvent,
} from 'react'
import { Link, NavLink, Outlet, useLocation, useMatch } from 'react-router'
import Logo from '../components/Logo'
import {
  IconAgency,
  IconBack,
  IconCases,
  IconCards,
  IconContainment,
  IconDashboard,
  IconEquipment,
  IconFabrication,
  IconFactions,
  IconIntel,
  IconMarkets,
  IconRankings,
  IconRecruitment,
  IconRegistry,
  IconReports,
  IconTeams,
  IconTraining,
} from '../components/shellIcons'
import { ShellStatusBar } from '../components/layout/ShellStatusBar'
import { DASHBOARD_HEADLINE, GAME_OVER_REASONS, SHELL_UI_TEXT } from '../data/copy'
import { useGameStore } from './store/gameStore'
import { APP_ROUTES } from './routes'
import { getShellMeta } from './shellView'
import { NavigationHistoryControls } from './NavigationHistoryControls'
import { installInputRuntime, startInputCapture } from './inputRuntime'
import {
  FUTURE_EXPANSION_APP_SYSTEMS,
  PRIMARY_APP_SYSTEMS,
  SECONDARY_MVP_APP_SYSTEMS,
  type AppSystemId,
} from './systemRegistry'

// The overlay is a development-only surface. Gating the dynamic import on PROD keeps its
// projection graph out of the production entry while MODE === 'test' still loads it.
const DeveloperOverlay: ComponentType = import.meta.env.PROD
  ? () => null
  : lazy(() =>
      import('../features/developer/DeveloperOverlay').then((module) => ({
        default: module.DeveloperOverlay,
      }))
    )

const SYSTEM_ICONS: Record<AppSystemId, typeof IconDashboard> = {
  operationsDesk: IconDashboard,
  cases: IconCases,
  cards: IconCards,
  agents: IconRegistry,
  recruitment: IconRecruitment,
  registry: IconRegistry,
  teams: IconTeams,
  trainingDivision: IconTraining,
  equipment: IconEquipment,
  fabrication: IconFabrication,
  containmentSite: IconContainment,
  marketsSuppliers: IconMarkets,
  factions: IconFactions,
  rankings: IconRankings,
  agency: IconAgency,
  report: IconReports,
  intel: IconIntel,
}

function handleSkipToMain(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault()
  event.currentTarget.ownerDocument.getElementById('main-content')?.focus()
}

export default function AppShell() {
  useEffect(installInputRuntime, [])
  const { pathname, search } = useLocation()
  const showingMainMenu = useMatch(APP_ROUTES.mainMenu) !== null
  const wasShowingMainMenu = useRef(showingMainMenu)
  const main = useRef<HTMLElement>(null)
  const { game, gameReplacementRevision } = useGameStore()
  const meta = getShellMeta(pathname, search, game)

  useLayoutEffect(() => {
    if (wasShowingMainMenu.current === showingMainMenu) return
    // Moving between these surfaces unmounts the previous Settings dialog.
    startInputCapture(null)
    if (!showingMainMenu) main.current?.focus()
    wasShowingMainMenu.current = showingMainMenu
  }, [showingMainMenu])

  return (
    <>
      <a href="#main-content" className="skip-link" onClick={handleSkipToMain}>
        Skip to main content
      </a>

      <div className="p-6 space-y-6">
        <div hidden={showingMainMenu} className="space-y-6">
          <ShellStatusBar showUtilities={!showingMainMenu} />

          <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              {meta.backTo && meta.backLabel ? (
                <Link to={meta.backTo} className="btn btn-ghost btn-sm" aria-label={meta.backLabel}>
                  <IconBack className="h-4 w-4" aria-hidden="true" />
                  {meta.backLabel}
                </Link>
              ) : null}

              <div className="flex items-center gap-3">
                <Logo size={30} className="shrink-0" />
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">{meta.title}</h1>
                  {meta.subtitle ? <p className="text-sm opacity-60">{meta.subtitle}</p> : null}
                </div>
              </div>
            </div>

            {game.gameOver ? (
              <p className="text-sm font-medium text-red-300">
                {`${DASHBOARD_HEADLINE.haltedPrefix} ${game.gameOverReason ?? GAME_OVER_REASONS.breachState}`}
              </p>
            ) : null}

            {pathname === APP_ROUTES.operationsDesk && (
              <Link to={APP_ROUTES.mainMenu} className="btn btn-ghost min-h-11">
                Main Menu
              </Link>
            )}
          </header>

          <NavigationHistoryControls key={gameReplacementRevision} active={!showingMainMenu} />

          <nav aria-label="Primary operations" className="nav-primary flex flex-wrap gap-3">
            {PRIMARY_APP_SYSTEMS.map((route) => {
              const Icon = SYSTEM_ICONS[route.id]

              return (
                <NavLink
                  key={route.to}
                  to={route.to}
                  end={route.to === APP_ROUTES.operationsDesk}
                  className={({ isActive }) => (isActive ? 'btn btn-primary' : 'btn btn-ghost')}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {route.label}
                </NavLink>
              )
            })}
          </nav>

          <div className="nav-section-secondary">
            <div className="space-y-3">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50">
                  {SHELL_UI_TEXT.mvpSystems}
                </p>
                <nav aria-label="MVP systems" className="nav-secondary flex flex-wrap gap-2">
                  {SECONDARY_MVP_APP_SYSTEMS.map((route) => {
                    const Icon = SYSTEM_ICONS[route.id]

                    return (
                      <NavLink
                        key={route.to}
                        to={route.to}
                        end={route.to === APP_ROUTES.operationsDesk}
                        className={({ isActive }) =>
                          isActive ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-ghost'
                        }
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        {route.label}
                      </NavLink>
                    )
                  })}
                </nav>
              </div>

              <div className="space-y-2">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50">
                    {SHELL_UI_TEXT.futureExpansion}
                  </p>
                  <p className="text-sm opacity-60">{SHELL_UI_TEXT.futureExpansionHint}</p>
                </div>

                <nav
                  aria-label="Future expansion systems"
                  className="nav-secondary flex flex-wrap gap-2"
                >
                  {FUTURE_EXPANSION_APP_SYSTEMS.map((route) => {
                    const Icon = SYSTEM_ICONS[route.id]

                    return (
                      <NavLink
                        key={route.to}
                        to={route.to}
                        end={route.to === APP_ROUTES.operationsDesk}
                        className={({ isActive }) =>
                          isActive ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-ghost'
                        }
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        {route.label}
                      </NavLink>
                    )
                  })}
                </nav>
              </div>
            </div>
          </div>
        </div>
        <main ref={main} id="main-content" tabIndex={-1} className="space-y-6">
          <Outlet />
        </main>
        {!showingMainMenu && (
          <Suspense fallback={null}>
            <DeveloperOverlay />
          </Suspense>
        )}
      </div>
    </>
  )
}
