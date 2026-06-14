import { lazy, Suspense, type ComponentType } from 'react'
import { Route, Routes } from 'react-router'
import AppShell from './AppShell'
import OperationsDeskPage from '../features/operations/OperationsDeskPage'
import ContractBoardPage from '../features/contracts/ContractBoardPage'
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
const EquipmentPage = createRouteComponent(() => import('../features/equipment/EquipmentPage'))
const FabricationPage = createRouteComponent(
  () => import('../features/fabrication/FabricationPage')
)
const TrainingDivisionPage = createRouteComponent(
  () => import('../features/training/TrainingDivisionPage')
)
const ContainmentSiteRoute = createRouteComponent(() =>
  import('../features/divisions/SystemBoundaryPage').then((module) => ({
    default: function ContainmentSiteRoute() {
      return <module.SystemBoundaryPage boundary="containmentSite" />
    },
  }))
)
const MarketsSuppliersRoute = createRouteComponent(() => import('../features/market/MarketPage'))
const FactionsPage = createRouteComponent(() => import('../features/factions/FactionsPage'))
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
const HelpRoute = createRouteComponent(() => import('../features/divisions/HelpPlaceholderPage'))
const PatternSourceSeriesMirrorRoute = createRouteComponent(
  () => import('../features/operations/PatternSourceSeriesMirrorPage')
)
const SelfCensoringInformationMirrorRoute = createRouteComponent(
  () => import('../features/operations/SelfCensoringInformationMirrorPage')
)
const PublicDisclosureMirrorRoute = createRouteComponent(
  () => import('../features/operations/PublicDisclosureMirrorPage')
)
const TruthLayerMirrorRoute = createRouteComponent(
  () => import('../features/operations/TruthLayerMirrorPage')
)
const CoverStoryMirrorRoute = createRouteComponent(
  () => import('../features/operations/CoverStoryMirrorPage')
)
const MassAnomalousPopulationEmergenceMirrorRoute = createRouteComponent(
  () => import('../features/operations/MassAnomalousPopulationEmergenceMirrorPage')
)
const VisualTriggerHazardMirrorRoute = createRouteComponent(
  () => import('../features/operations/VisualTriggerHazardMirrorPage')
)
const EntityWelfareReclassificationMirrorRoute = createRouteComponent(
  () => import('../features/operations/EntityWelfareReclassificationMirrorPage')
)
const ContainedPersonTherapeuticCareMirrorRoute = createRouteComponent(
  () => import('../features/operations/ContainedPersonTherapeuticCareMirrorPage')
)
const CoerciveContainedPersonProtocolMirrorRoute = createRouteComponent(
  () => import('../features/operations/CoerciveContainedPersonProtocolMirrorPage')
)
const PsychologicalResilienceMirrorRoute = createRouteComponent(
  () => import('../features/operations/PsychologicalResilienceMirrorPage')
)
const SurveillanceInterventionTuningMirrorRoute = createRouteComponent(
  () => import('../features/operations/SurveillanceInterventionTuningMirrorPage')
)
const NamingHazardDescriptorMirrorRoute = createRouteComponent(
  () => import('../features/operations/NamingHazardDescriptorMirrorPage')
)
const ContainedPersonIntegratedHealthBundleMirrorRoute = createRouteComponent(
  () => import('../features/operations/ContainedPersonIntegratedHealthBundleMirrorPage')
)
const WelfareDebtAccountingMirrorRoute = createRouteComponent(
  () => import('../features/operations/WelfareDebtAccountingMirrorPage')
)
const RuleDocumentComplianceMirrorRoute = createRouteComponent(
  () => import('../features/operations/RuleDocumentComplianceMirrorPage')
)
const RecurrentCatastropheMirrorRoute = createRouteComponent(
  () => import('../features/operations/RecurrentCatastropheMirrorPage')
)
const PostIncidentReviewMirrorRoute = createRouteComponent(
  () => import('../features/operations/PostIncidentReviewMirrorPage')
)
const PostIncidentReviewRecommendationMirrorRoute = createRouteComponent(
  () => import('../features/operations/PostIncidentReviewRecommendationMirrorPage')
)
const PostIncidentReviewRecommendationActionMirrorRoute = createRouteComponent(
  () => import('../features/operations/PostIncidentReviewRecommendationActionMirrorPage')
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
        <Route path="contracts" element={<ContractBoardPage />} />
        <Route path="agents">
          <Route index element={renderLazyRoute(AgentsPage)} />
          <Route path=":agentId" element={renderLazyRoute(AgentDetailPage)} />
        </Route>
        <Route path="recruitment" element={renderLazyRoute(RecruitmentPage)} />
        <Route path="cards" element={renderLazyRoute(CardsPage)} />
        <Route path="registry" element={renderLazyRoute(RegistryPage)} />
        <Route path="registry/:agentId" element={renderLazyRoute(AgentDetailPage)} />
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
        <Route path="factions" element={renderLazyRoute(FactionsPage)} />
        <Route path="rankings" element={renderLazyRoute(RankingsRoute)} />
        <Route path="agency" element={renderLazyRoute(AgencyRoute)} />
        <Route path="help" element={renderLazyRoute(HelpRoute)} />
        <Route path="report">
          <Route index element={<ReportPage />} />
          <Route path=":week" element={<ReportDetailPage />} />
        </Route>
        <Route path="intel">
          <Route index element={renderLazyRoute(IntelPage)} />
          <Route path=":templateId" element={renderLazyRoute(IntelDetailPage)} />
        </Route>
        <Route
          path="pattern-source-series"
          element={renderLazyRoute(PatternSourceSeriesMirrorRoute)}
        />
        <Route
          path="self-censoring-information"
          element={renderLazyRoute(SelfCensoringInformationMirrorRoute)}
        />
        <Route
          path="public-disclosure-state"
          element={renderLazyRoute(PublicDisclosureMirrorRoute)}
        />
        <Route path="truth-layer-records" element={renderLazyRoute(TruthLayerMirrorRoute)} />
        <Route path="cover-story-records" element={renderLazyRoute(CoverStoryMirrorRoute)} />
        <Route
          path="mass-anomalous-population-emergence"
          element={renderLazyRoute(MassAnomalousPopulationEmergenceMirrorRoute)}
        />
        <Route
          path="visual-trigger-hazard"
          element={renderLazyRoute(VisualTriggerHazardMirrorRoute)}
        />
        <Route
          path="entity-welfare-reclassification"
          element={renderLazyRoute(EntityWelfareReclassificationMirrorRoute)}
        />
        <Route
          path="contained-person-therapeutic-care"
          element={renderLazyRoute(ContainedPersonTherapeuticCareMirrorRoute)}
        />
        <Route
          path="coercive-contained-person-protocol"
          element={renderLazyRoute(CoerciveContainedPersonProtocolMirrorRoute)}
        />
        <Route
          path="psychological-resilience"
          element={renderLazyRoute(PsychologicalResilienceMirrorRoute)}
        />
        <Route
          path="surveillance-intervention-tuning"
          element={renderLazyRoute(SurveillanceInterventionTuningMirrorRoute)}
        />
        <Route
          path="naming-hazard-descriptor"
          element={renderLazyRoute(NamingHazardDescriptorMirrorRoute)}
        />
        <Route
          path="contained-person-integrated-health-bundle"
          element={renderLazyRoute(ContainedPersonIntegratedHealthBundleMirrorRoute)}
        />
        <Route
          path="welfare-debt-accounting"
          element={renderLazyRoute(WelfareDebtAccountingMirrorRoute)}
        />
        <Route
          path="rule-document-compliance"
          element={renderLazyRoute(RuleDocumentComplianceMirrorRoute)}
        />
        <Route
          path="recurrent-catastrophe-amelioration"
          element={renderLazyRoute(RecurrentCatastropheMirrorRoute)}
        />
        <Route
          path="post-incident-review"
          element={renderLazyRoute(PostIncidentReviewMirrorRoute)}
        />
        <Route
          path="post-incident-review-recommendations"
          element={renderLazyRoute(PostIncidentReviewRecommendationMirrorRoute)}
        />
        <Route
          path="post-incident-review-recommendation-actions"
          element={renderLazyRoute(PostIncidentReviewRecommendationActionMirrorRoute)}
        />
        <Route path="*" element={renderLazyRoute(NotFoundRoute)} />
      </Route>
    </Routes>
  )
}
