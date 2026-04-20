import { Link, NavLink, Outlet, useLocation } from 'react-router'
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
} from '../components/icons'
import { ShellStatusBar } from '../components/layout/ShellStatusBar'
import { DeveloperOverlay } from '../features/developer/DeveloperOverlay'
import {
  DASHBOARD_HEADLINE,
  GAME_OVER_REASONS,
  SHELL_UI_TEXT,
} from '../data/copy'
import { useGameStore } from './store/gameStore'
import { APP_ROUTES } from './routes'
import { getShellMeta } from './shellView'
import {
  FUTURE_EXPANSION_APP_SYSTEMS,
  PRIMARY_APP_SYSTEMS,
  SECONDARY_MVP_APP_SYSTEMS,
  type AppSystemId,
} from './systemRegistry'

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

export default function AppShell() {
  const { pathname, search } = useLocation()
  const { game } = useGameStore()
  const meta = getShellMeta(pathname, search, game)

  return (
    <main className="p-6 space-y-6">
      <ShellStatusBar />

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
      </header>

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

      <Outlet />
      <DeveloperOverlay />
    </main>
  )
}
