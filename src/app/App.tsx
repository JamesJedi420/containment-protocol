import { lazy, Suspense, type ComponentType } from 'react'
import { Route, Routes } from 'react-router'
import AppShell from './AppShell'
import OperationsDeskPage from '../features/operations/OperationsDeskPage'
import CasesPage from '../features/cases/CasesPage'
import CaseDetailPage from '../features/cases/CaseDetailPage'
import TeamsPage from '../features/teams/TeamsPage'
import TeamDetailPage from '../features/teams/TeamDetailPage'
import ReportPage from '../features/report/ReportPage'
import ReportDetailPage from '../features/report/ReportDetailPage'
import { APP_ROUTES } from './routes'

type RouteModule = { default: ComponentType }
type RouteLoader = () => Promise<RouteModule>

function createRouteComponent(loader: RouteLoader) {
  return lazy(loader)
}

function RouteLoadingFallback() {
  return (
    <section
      role="status"
      aria-live="polite"
      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm opacity-80"
    >
      Loading route...
    </section>
  )
}

function renderLazyRoute(Component: ComponentType) {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Component />
    </Suspense>
  )
}

const AgentsPage = createRouteComponent(() => import('../features/agents/AgentsPage'))
const AgentDetailPage = createRouteComponent(() => import('../features/agents/AgentDetailPage'))
const IntelPage = createRouteComponent(() => import('../features/intel/IntelPage'))
const IntelDetailPage = createRouteComponent(() => import('../features/intel/IntelDetailPage'))
const RecruitmentPage = createRouteComponent(
  () => import('../features/recruitment/RecruitmentPage')
)
const CardsPage = createRouteComponent(() => import('../features/cards/CardsPage'))
const RegistryPage = createRouteComponent(() => import('../features/registry/RegistryPage'))
const TrainingDivisionPage = createRouteComponent(
  () => import('../features/training/TrainingDivisionPage')
)
const EquipmentPage = createRouteComponent(() => import('../features/equipment/EquipmentPage'))
const FabricationPage = createRouteComponent(
  () => import('../features/fabrication/FabricationPage')
)
const ContainmentSiteRoute = createRouteComponent(() =>
  import('../features/divisions/SystemBoundaryPage').then((module) => ({
    default: function ContainmentSiteRoute() {
      return <module.SystemBoundaryPage boundary="containmentSite" />
    },
  }))
)
const MarketsSuppliersRoute = createRouteComponent(() =>
  import('../features/divisions/SystemBoundaryPage').then((module) => ({
    default: function MarketsSuppliersRoute() {
      return <module.SystemBoundaryPage boundary="marketsSuppliers" />
    },
  }))
)
const FactionsRoute = createRouteComponent(() =>
  import('../features/divisions/SystemBoundaryPage').then((module) => ({
    default: function FactionsRoute() {
      return <module.SystemBoundaryPage boundary="factions" />
    },
  }))
)
const RankingsRoute = createRouteComponent(() =>
  import('../features/divisions/SystemBoundaryPage').then((module) => ({
    default: function RankingsRoute() {
      return <module.SystemBoundaryPage boundary="rankings" />
    },
  }))
)
const AgencyRoute = createRouteComponent(() =>
  import('../features/divisions/SystemBoundaryPage').then((module) => ({
    default: function AgencyRoute() {
      return <module.SystemBoundaryPage boundary="agency" />
    },
  }))
)
const NotFoundRoute = createRouteComponent(() =>
  import('../features/divisions/SystemBoundaryPage').then((module) => ({
    default: function NotFoundRoute() {
      return <module.SystemBoundaryPage boundary="notFound" returnTo={APP_ROUTES.operationsDesk} />
    },
  }))
)

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<OperationsDeskPage />} />
        <Route path="agents">
          <Route index element={renderLazyRoute(AgentsPage)} />
          <Route path=":agentId" element={renderLazyRoute(AgentDetailPage)} />
        </Route>
        <Route path="recruitment" element={renderLazyRoute(RecruitmentPage)} />
        <Route path="cards" element={renderLazyRoute(CardsPage)} />
        <Route path="registry" element={renderLazyRoute(RegistryPage)} />
        <Route path="cases">
          <Route index element={<CasesPage />} />
          <Route path=":caseId" element={<CaseDetailPage />} />
        </Route>
        <Route path="teams">
          <Route index element={<TeamsPage />} />
          <Route path=":teamId" element={<TeamDetailPage />} />
        </Route>
        <Route path="training-division" element={renderLazyRoute(TrainingDivisionPage)} />
        <Route path="equipment" element={renderLazyRoute(EquipmentPage)} />
        <Route path="fabrication" element={renderLazyRoute(FabricationPage)} />
        <Route path="containment-site" element={renderLazyRoute(ContainmentSiteRoute)} />
        <Route path="markets-suppliers" element={renderLazyRoute(MarketsSuppliersRoute)} />
        <Route path="factions" element={renderLazyRoute(FactionsRoute)} />
        <Route path="rankings" element={renderLazyRoute(RankingsRoute)} />
        <Route path="agency" element={renderLazyRoute(AgencyRoute)} />
        <Route path="report">
          <Route index element={<ReportPage />} />
          <Route path=":week" element={<ReportDetailPage />} />
        </Route>
        <Route path="intel">
          <Route index element={renderLazyRoute(IntelPage)} />
          <Route path=":templateId" element={renderLazyRoute(IntelDetailPage)} />
        </Route>
        <Route path="*" element={renderLazyRoute(NotFoundRoute)} />
      </Route>
    </Routes>
  )
}
