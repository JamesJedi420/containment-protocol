const RECRUITMENT_PATH = '/recruitment'
export const RECRUITMENT_CANDIDATE_PARAM = 'candidate'
export const LATEST_REPORT_CASE_NAVIGATION = 'latest-report-case'
export const LATEST_REPORT_CHEMISTRY_NAVIGATION = 'latest-report-chemistry'
export const LATEST_REPORT_DOSSIER_NAVIGATION = 'latest-report-dossier'
export const LATEST_REPORT_COACHING_NAVIGATION = 'latest-report-coaching'
export const LATEST_REPORT_INJURY_NAVIGATION = 'latest-report-injury'
export const LATEST_REPORT_PROCUREMENT_NAVIGATION = 'latest-report-procurement'
export const LATEST_REPORT_RECRUITMENT_NAVIGATION = 'latest-report-recruitment'
export const LATEST_REPORT_TEAM_ROSTER_NAVIGATION = 'latest-report-team-roster'
export const LATEST_REPORT_TRAINING_NAVIGATION = 'latest-report-training'

export const APP_ROUTES = {
  mainMenu: '/main-menu',
  operationsDesk: '/',
  dashboard: '/',
  help: '/help',
  agents: '/agents',
  cards: '/cards',
  agentDetail: (agentId: string) => `/agents/${encodeURIComponent(agentId)}`,
  recruitment: RECRUITMENT_PATH,
  recruitmentCandidate: (candidateId: string) =>
    `${RECRUITMENT_PATH}?${new URLSearchParams({ [RECRUITMENT_CANDIDATE_PARAM]: candidateId })}`,
  registry: '/registry',
  registryDetail: (agentId: string) => `/registry/${encodeURIComponent(agentId)}`,
  contracts: '/contracts',
  cases: '/cases',
  caseDetail: (caseId: string) => `/cases/${encodeURIComponent(caseId)}`,
  teams: '/teams',
  teamDetail: (teamId: string) => `/teams/${encodeURIComponent(teamId)}`,
  trainingDivision: '/training-division',
  equipment: '/equipment',
  fabrication: '/fabrication',
  containmentSite: '/containment-site',
  marketsSuppliers: '/markets-suppliers',
  factions: '/factions',
  rankings: '/rankings',
  agency: '/agency',
  report: '/report',
  reportDetail: (week: number | string) => `/report/${week}`,
  intel: '/intel',
  intelDetail: (templateId: string) => `/intel/${encodeURIComponent(templateId)}`,
  patternSourceSeries: '/pattern-source-series',
  publishQueue: '/publish-queue',
  departmentWorkshop: '/department-workshop',
  departmentWorkshopActivate: '/department-workshop/activate',
  modifiableDataPacks: '/modifiable-data-packs',
  selfCensoringInformation: '/self-censoring-information',
  publicDisclosureState: '/public-disclosure-state',
  publicDisclosureCampaign: '/campaign/public-disclosure',
  truthLayerRecords: '/truth-layer-records',
  coverStoryRecords: '/cover-story-records',
  massAnomalousPopulationEmergence: '/mass-anomalous-population-emergence',
  visualTriggerHazard: '/visual-trigger-hazard',
  hazardousContentPropagation: '/hazardous-content-propagation',
  propagationGraph: '/propagation-graph',
  participatoryChannels: '/participatory-channels',
  entityWelfareReclassification: '/entity-welfare-reclassification',
  affiliationPersonStatus: '/affiliation-person-status',
  containedPersonTherapeuticCare: '/contained-person-therapeutic-care',
  coerciveContainedPersonProtocol: '/coercive-contained-person-protocol',
  psychologicalResilience: '/psychological-resilience',
  cognitiveHazardExposure: '/cognitive-hazard-exposure',
  surveillanceInterventionTuning: '/surveillance-intervention-tuning',
  namingHazardDescriptor: '/naming-hazard-descriptor',
  containedPersonIntegratedHealthBundle: '/contained-person-integrated-health-bundle',
  welfareDebtAccounting: '/welfare-debt-accounting',
  ruleDocumentCompliance: '/rule-document-compliance',
  recurrentCatastropheAmelioration: '/recurrent-catastrophe-amelioration',
  postIncidentReview: '/post-incident-review',
  postIncidentReviewRecommendations: '/post-incident-review-recommendations',
  postIncidentReviewRecommendationActions: '/post-incident-review-recommendation-actions',
} as const

export const APP_ROUTE_PATTERNS = {
  agentDetail: '/agents/:agentId',
  registryDetail: '/registry/:agentId',
  caseDetail: '/cases/:caseId',
  teamDetail: '/teams/:teamId',
  reportDetail: '/report/:week',
  intelDetail: '/intel/:templateId',
} as const
