import { GAME_OVER_REASONS } from '../../data/copy'
import { createStartingState } from '../../data/startingState'
import { createSeedCampaignLedger, sanitizeCampaignLedger } from '../../domain/campaignLedger'
import {
  getProductionRecipe,
  getRecipeFundingCost,
  getRecipeInputMaterials,
  inventoryItemLabels,
  productionCatalog,
  productionMaterialCatalog,
  type ProductionRecipe,
} from '../../data/production'
import { getTrainingProgram, trainingCatalog } from '../../data/training'
import { createDefaultAgentAssignmentState } from '../../domain/agentDefaults'
import { normalizeAgent, reconcileAgentAssignmentAgainstGame } from '../../domain/agent/normalize'
import { recomputeAttritionDerivedState } from '../../domain/agent/attritionReset'
import { sanitizeReplacementPressureState } from '../../domain/agent/replacementPressureHydration'
import { EQUIPMENT_SLOT_KINDS, getEquipmentSlotItemId } from '../../domain/equipment'
import {
  DEPLOYMENT_MOMENTUM_MAX_STACKS,
  deploymentMomentumSurfacesEnabled,
} from '../../domain/agent/deploymentMomentum'
import {
  createDefaultWeeklyDirectiveState,
  getWeeklyDirectiveDefinitions,
  isWeeklyDirectiveId,
} from '../../domain/directives'
import { buildOperationEventTimestamp, inferOperationEventSourceSystem } from '../../domain/events'
import { operationEventPayloadSchemas } from '../../domain/events/eventValidation'
import {
  getKnownProcurementItemIds,
  normalizeFundingState,
  sanitizeCourierShellFrontState,
  sanitizeEmergencyGrayMarketWaiverPrecedentCount,
  sanitizeEmergencyGrayMarketWaiverWeek,
  sanitizeLegitimacyState,
  sanitizeMaintenanceSpecialistsAvailable,
  sanitizeSupportStaffSummary,
} from '../../domain/funding'
import { sanitizeProgressionUnlockIds } from '../../domain/agencyProgression'
import { normalizeRuntimeState, reconcileRuntimeUiSelections } from '../../domain/gameStateManager'
import { normalizeCaseInstance } from '../../domain/case/normalizeCase'
import { sanitizeDistrictScheduleState } from '../../domain/districtSchedule'
import { sanitizeDamagedEquipmentQueue } from '../../domain/equipmentRecovery'
import { normalizeMissionIntelRecord } from '../../domain/intel'
import {
  reconcileHydratedMissionRoutingTriage,
  sanitizePersistedMissionRoutingState,
} from '../../domain/missionIntakeRouting'
import { sanitizePersistedPartyCardState } from '../../domain/partyCards/sanitize'
import {
  sanitizePersistedGlobalPressureScalars,
  sanitizePersistedResponseGrid,
} from '../../domain/pressure'
import { sanitizeCompromisedAuthorityState } from '../../domain/sim/compromisedAuthority'
import { getCampaignDate, resolveCalendarConfig } from '../../domain/campaignCalendar'
import { clamp, normalizeSeed, nextSeed } from '../../domain/math'
import {
  buildReportNoteTimestamp,
  createDeterministicReportNote,
  deriveReportNoteWeekFromTimestamp,
} from '../../domain/reportNotes'
import { MAX_ACADEMY_TIER } from '../../domain/sim/academyUpgrade'
import { isTrainingProgramUnlocked } from '../../domain/sim/training'
import { buildReportCaseSnapshots } from '../../domain/sim/reportCaseSnapshot'
import { buildReportTeamStatus } from '../../domain/sim/reportTeamStatus'
import { calcWeekScore, resolvePartialMarginUpperBound } from '../../domain/sim/scoring'
import { computeClearanceLevel, resolveMaxClearanceLevel } from '../../domain/sim/clearanceLevel'
import { buildTeamDeploymentReadinessState } from '../../domain/deploymentReadiness'
import type {
  ExecutionInstabilityOverlay,
  RecoveryPressureBand,
  WeakestLinkMissionResolutionResult,
  WeakestLinkPenaltyBucket,
  WeakestLinkPenaltySourceCode,
  WeakestLinkResolutionOutcomeCategory,
  WeakestLinkResultKind,
} from '../../domain/weakestLinkResolution'
import {
  getContractNextIntentValues,
  resolveContractTemplateDefinition,
  sanitizeContractSystemState,
} from '../../domain/contracts'
import { createInitialResearchState, recomputeResearchState } from '../../domain/research'
import type { HubState } from '../../domain/hub/hubState'
import { createSquadKitTemplate } from '../../domain/squadKitTemplate'
import { createSquadMetadata } from '../../domain/squadMetadata'
import { sanitizePersistedFieldBasePacket } from '../../domain/fieldBaseStaging'
import {
  FACTION_DEFINITIONS,
  getFactionDefinition,
  getFactionReputationTier,
} from '../../domain/factions'
import { buildTeamCompositionState } from '../../domain/teamComposition'
import { getTeamMemberIds, syncTeamSimulationTeam } from '../../domain/teamSimulation'
import { resolveTeamStatus } from '../../domain/teamStateMachine'
import {
  type ActiveContractRuntime,
  type Agent,
  type Candidate,
  type CaseEscalationTrigger,
  type CaseInstance,
  type CaseSpawnTrigger,
  type Contact,
  type ContractDebriefChangedEntity,
  type ContractDebriefChangedEntityKind,
  type ContractDebriefRecord,
  type ContractDebriefStrategicOption,
  type ContractDebriefUnresolvedClock,
  type ContractHistoryRecord,
  type ContractNextIntent,
  type ContractOffer,
  type ContractRiskLevel,
  type ContractStrategyTag,
  type ContractSystemState,
  type ExternalSupportAsset,
  type FacilityEffect,
  type FacilityInstance,
  type FacilityState,
  type FacilityStatus,
  type GameFlagValue,
  type ResearchProject,
  type ResearchProjectStatus,
  type ResearchState,
  type ResearchUnlock,
  type RelationshipSnapshot,
  type SquadKitAssignment,
  type SquadKitTemplate,
  type SquadMetadata,
  type StaffData,
  type StatKey,
  type ExternalSupportAssetClass,
  type FatigueBand,
  type FactionRuntimeState,
  isExpeditionRecoveryMode,
  type AgencyState,
  type CampaignDate,
  type CaseKind,
  type CaseMode,
  type CasePriority,
  type CaseQueueState,
  type CaseStatus,
  type GameConfig,
  type GameState,
  type Id,
  type MarketPressure,
  type MarketState,
  type MissionResolutionKind,
  type MissionRewardBreakdown,
  type MissionResult,
  type PowerImpactSummary,
  type OperationEvent,
  type OperationEventType,
  type PartyCardState,
  type PerformanceMetricSummary,
  type ProductionMaterialRequirement,
  type ProductionQueueEntry,
  type ReportNote,
  type ReportNoteMetadata,
  type ReportNoteMetadataValue,
  type ReportNoteType,
  type ReputationTier,
  type RuntimeState,
  type StatBlock,
  type Team,
  type TeamCategory,
  type TeamState,
  type TrainingQueueEntry,
  type WeeklyDirectiveId,
  type WeeklyReport,
  type WeeklyReportCaseSnapshot,
  type WeeklyReportTeamStatus,
} from '../../domain/models'
import {
  AUTHORITY_ROUTE_CRISIS_DIRECTOR_SELF,
  LEGACY_WAIVER_AUTHORITY_BASIS_MIGRATION,
} from '../../domain/procurementEmergencyAuthority'
import { normalizeInstitutionKeyForAudit } from '../../domain/procurementEmergencyInstitution'
import {
  getCanonicalMarketCostMultiplier,
  sanitizeFeaturedRecipeId,
  sanitizePersistedMarketState,
} from '../../domain/market'
import {
  reconcileAgentPromotedFields,
  reconcileProgressionXpGainedFields,
} from '../../domain/progression'
import { reconcileAgentBetrayedFields } from '../../domain/sim/betrayal'
import { reconcileAgentRelationshipChangedFields } from '../../domain/sim/relationshipProjection'
import { sanitizePersistedAgencyProtocols } from '../../domain/protocols'
import { isDistortionState, propagateDistortion } from '../../domain/shared/distortion'
import { createDefaultPowerImpactSummary } from '../../domain/teamSimulation'
import { getKnowledgeKey } from '../../domain/knowledge'
import { sanitizeKnowledgeStateMap } from '../../domain/knowledge/sanitize'
import { sanitizeInformationIntakeReports } from '../../domain/informationIntakeReport'
import { sanitizeExtranormalEventRecords } from '../../domain/extranormalEventRegistry'
import { sanitizeNamingHazardDescriptorRecords } from '../../domain/namingHazardDescriptorRegistry'
import { sanitizeRecurrentCatastropheRecords } from '../../domain/recurrentCatastropheAmeliorationRegistry'
import { sanitizePostIncidentReviewRecords } from '../../domain/postIncidentReviewRegistry'
import { sanitizePostIncidentReviewRecommendationActionRecords } from '../../domain/postIncidentReviewRecommendationActionRegistry'
import { sanitizePostIncidentReviewRecommendationRecords } from '../../domain/postIncidentReviewRecommendationRegistry'
import { sanitizeRuleDocumentComplianceRecords } from '../../domain/ruleDocumentComplianceContainmentRegistry'
import { sanitizeUnexplainedLocationRecords } from '../../domain/unexplainedLocationRegistry'
import { sanitizeMinorAnomalyItemRecords } from '../../domain/minorAnomalyItemRegistry'
import { sanitizeSelfCensoringInformationRecords } from '../../domain/selfCensoringInformationRegistry'
import { sanitizePublicDisclosureRecords } from '../../domain/publicDisclosureStateRegistry'
import { sanitizePublicDisclosurePostureChoices } from '../../domain/publicDisclosurePostureChoice'
import {
  sanitizeTruthLayerRecords,
  sanitizeTruthLayerWeeklyProjectionSnapshots,
} from '../../domain/truthLayerRecordRegistry'
import {
  sanitizeCoverStoryRecords,
  sanitizeCoverStoryWeeklyProjectionSnapshots,
} from '../../domain/coverStoryLifecycleRegistry'
import { sanitizePatternSourceSeriesRecords } from '../../domain/patternSourceSeriesRegistry'
import { sanitizePublishQueueRecords } from '../../domain/publishAutomationCreditingHooks'
import { sanitizePublishQueueExecutionReceipts } from '../../domain/publishQueueExecutionReceiptPersistence'
import { sanitizeModifiableDataPackRecords } from '../../domain/modifiableDataPackValidation'
import { sanitizeMassAnomalousPopulationEmergenceRecords } from '../../domain/massAnomalousPopulationEmergenceRegistry'
import { sanitizeAffiliationPersonStatusRecords } from '../../domain/affiliationPersonStatusRecords'
import { sanitizeAffiliationFileWorkQueueActionRecords } from '../../domain/affiliationFileWorkQueueActionRecords'
import { sanitizeAffiliationFileWorkQueueEvidenceResolutionRecords } from '../../domain/affiliationFileWorkQueueEvidenceResolutionRecords'
import { sanitizeAffiliationFileWorkQueueRepairActionRecords } from '../../domain/affiliationFileWorkQueueRepairActionRecords'
import { sanitizeAffiliationFileWorkQueueReleaseActionRecords } from '../../domain/affiliationFileWorkQueueReleaseActionRecords'
import { sanitizeAffiliationFileWorkQueueReleaseOutcomeRecords } from '../../domain/affiliationFileWorkQueueReleaseOutcomeRecords'
import { sanitizeAffiliationFileWorkQueueReleaseFulfillmentRecords } from '../../domain/affiliationFileWorkQueueReleaseFulfillmentRecords'
import { sanitizeAffiliationFileWorkQueueReleasePackageRecords } from '../../domain/affiliationFileWorkQueueReleasePackageRecords'
import { sanitizeAffiliationFileWorkQueueFileReleaseDeliveryRecords } from '../../domain/affiliationFileWorkQueueFileReleaseDeliveryRecords'
import { sanitizeAffiliationFileWorkQueueNonMissionEnforcementRecords } from '../../domain/affiliationFileWorkQueueNonMissionEnforcementRecords'
import { sanitizeAffiliationFileWorkQueueEvidenceRepairWorkflows } from '../../domain/affiliationFileWorkQueueEvidenceRepairWorkflows'
import { sanitizeEntityWelfareReclassificationRecords } from '../../domain/entityWelfareReclassificationRegistry'
import { sanitizeTherapeuticCareScheduleRecords } from '../../domain/containedPersonTherapeuticCareRegistry'
import { sanitizeCustodyStatusRecords } from '../../domain/containedPersonCustodyStatusRegistry'
import { sanitizeFactionEthicsMatrixRecords } from '../../domain/factionEthicsMatrixRegistry'
import { sanitizeMoralLegalAccountabilityMatrixRecords } from '../../domain/moralLegalAccountabilityMatrixRegistry'
import { sanitizeWelfareDebtAccountingRecords } from '../../domain/welfareDebtAccountingRegistry'
import {
  sanitizeCoerciveProtocolRecords,
  sanitizeCoerciveProtocolWeeklyProjectionSnapshots,
} from '../../domain/coerciveContainedPersonProtocolRegistry'
import { sanitizeMedicationRegimenRecords } from '../../domain/containedPersonMedicationRegimenRegistry'
import { sanitizeContainedPersonIntegratedHealthBundles } from '../../domain/containedPersonIntegratedHealthBundleRegistry'
import { sanitizeSurveillanceInterventionTuningRecords } from '../../domain/surveillanceCapacityInterventionTuningRegistry'
import { sanitizePsychologicalResilienceRecords } from '../../domain/psychologicalResilienceRegistry'
import { sanitizeCognitiveHazardExposureRecords } from '../../domain/cognitiveHazardEngine'
import { sanitizeVisualTriggerHazardRecords } from '../../domain/visualTriggerHazardRegistry'
import {
  sanitizeSpe947ContentArtifacts,
  sanitizeSpe947ContentOwners,
  sanitizeSpe947CounterMemeticPlans,
  sanitizeSpe947FootageExposureBindings,
  sanitizeSpe947OperationRecords,
  sanitizeSpe947PlatformRecords,
  sanitizeSpe947PostCaseMediaCases,
  sanitizeSpe947TakedownResistanceBindings,
  sanitizeSpe947VisualTriggerHazardBindings,
} from '../../domain/spe947EvaluatorPersistence'
import {
  sanitizeSpe947MediaEconomyContinuityBindings,
  sanitizeSpe947MediaEconomyWeights,
} from '../../domain/spe947MediaEconomyContinuity'
import {
  sanitizeSpe947MediaEconomyCommercializationActors,
  sanitizeSpe947MediaEconomyLastWeeklyTickWeek,
} from '../../domain/spe947MediaEconomySimulator'
import { sanitizeSpe956PropagationGraphRecords } from '../../domain/spe956PropagationGraphPersistence'
import {
  sanitizeSpe956AsyncDiscussionSurfaceRecords,
  sanitizeSpe956CollectiveMemoryChannelRecords,
  sanitizeSpe956CommunityAdvisoryBodyRecords,
  sanitizeSpe956HotlineChannelRecords,
  sanitizeSpe956SurvivorInformalRegistryRecords,
} from '../../domain/spe956ParticipatoryChannelPersistence'
import { sanitizeSpe956IncidentBaselineRecords } from '../../domain/spe956IncidentBaselinePersistence'
import {
  buildCandidateEvaluation,
  deriveCandidateCostEstimate,
  normalizeCandidateHireStatus,
  normalizeRecruitmentFunnelStage,
  normalizeStaffCandidateSpecialty,
} from '../../domain/recruitment'
import type {
  CandidateCategory,
  CandidateCostEstimate,
  CandidatePipelineStatus,
  CandidateRevealLevel,
  CandidateScoutReport,
  CandidateScoutStage,
  StaffCandidateSpecialty,
} from '../../domain/recruitment/types'

export const GAME_STORE_VERSION = 6
export const RUN_EXPORT_KIND = 'containment-protocol-run'

/** Hydration 592: weekly report roster fatigue summary uses the same 0..100 scale as agents. */
const WEEKLY_REPORT_AVG_FATIGUE_MAX = 100

/** Hydration 598: system count events are audit-only; bound counts during import. */
const OPERATION_EVENT_AUDIT_COUNT_MAX = 99

export type PersistedGame = Omit<GameState, 'templates'>
export type PersistedStore = { game: PersistedGame }

export interface RunExportPayload {
  kind: typeof RUN_EXPORT_KIND
  version: number
  exportedAt: string
  game: PersistedGame
}

const IMPORT_TIMESTAMP_FUTURE_SKEW_MS = 5 * 60 * 1000

export function validateImportTimestampMetadata(
  value: unknown,
  fieldName: 'exportedAt' | 'savedAt',
  payloadLabel = 'Run payload'
) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${payloadLabel} ${fieldName} timestamp is missing or invalid.`)
  }

  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) {
    throw new Error(`${payloadLabel} ${fieldName} timestamp is missing or invalid.`)
  }

  if (timestamp > Date.now() + IMPORT_TIMESTAMP_FUTURE_SKEW_MS) {
    throw new Error(`${payloadLabel} ${fieldName} timestamp is from the future.`)
  }
}

/** Hydration allowlist — derived from `OperationEventPayloadMap` + legacy import-only types. */
export const OPERATION_EVENT_TYPES = [
  ...(Object.keys(operationEventPayloadSchemas) as OperationEventType[]),
  'faction.activity',
] as const

const CASE_ESCALATION_TRIGGERS: CaseEscalationTrigger[] = ['deadline', 'failure']
const CASE_SPAWN_TRIGGERS: CaseSpawnTrigger[] = [
  'failure',
  'unresolved',
  'raid_pressure',
  'world_activity',
  'faction_offer',
  'faction_pressure',
  'pressure_threshold',
]
const INFILTRATION_PROBE_STAGES = ['probing', 'exposed', 'violent'] as const
const INFILTRATION_PROBE_ACTIONS = ['probe_access', 'probe_route', 'cleanup'] as const
const INFILTRATION_PROBE_ACTION_SOURCES = ['override', 'authored', 'heuristic'] as const
const INFILTRATION_COVER_ROLES = [
  'uniform_guard',
  'civilian_staff',
  'courier',
  'maintenance',
  'official_inspector',
] as const
const CONCEALMENT_MODES = ['hidden', 'displaced'] as const
const MARKET_PRESSURES: MarketPressure[] = ['discounted', 'stable', 'tight']
const RECRUIT_CATEGORIES = [
  'agent',
  'staff',
  'specialist',
  'fieldTech',
  'analyst',
  'instructor',
] as const
const STAT_KEYS = ['combat', 'investigation', 'utility', 'social'] as const
const EXACT_POTENTIAL_TIERS = ['F', 'D', 'C', 'B', 'A', 'S'] as const
/** Hydration 575-576: weekly report snapshot kind/mode allowlists. */
const CASE_KINDS = ['case', 'raid', 'standard', 'anomaly'] as const satisfies readonly CaseKind[]
const CASE_MODES = [
  'threshold',
  'probability',
  'standard',
  'anomaly',
] as const satisfies readonly CaseMode[]
const SCOUT_CONFIDENCES = ['low', 'medium', 'high', 'confirmed'] as const
const MARKET_TRANSACTION_ACTIONS = ['buy', 'sell', 'favor_exchange', 'callable_obligation'] as const
const MARKET_TRANSACTION_CATEGORIES = ['equipment', 'component', 'material'] as const
const MARKET_TRANSACTION_RESOURCE_CLASSES = [
  'supplier_attention_slot',
  'reagent_stock',
  'licensed_handling_capacity',
] as const
const MARKET_PROCUREMENT_ALLOCATION_PRIORITY_MAX = 10
const MARKET_PROCUREMENT_ALLOCATION_DELAY_WEEKS_MAX = 52
const FACTION_STANDING_MIN = -9999
const FACTION_STANDING_MAX = 9999
const FACTION_REPUTATION_MIN = -100
const FACTION_REPUTATION_MAX = 100
const CONTACT_RELATIONSHIP_MIN = -100
const CONTACT_RELATIONSHIP_MAX = 100
const FACTION_UNLOCK_DISPOSITIONS = ['supportive', 'adversarial'] as const
/** Hydration allowlist — kept in sync with `ReportNoteType` (drift-guarded in tests). */
export const REPORT_NOTE_TYPES = [
  'case.resolved',
  'case.partially_resolved',
  'case.failed',
  'case.escalated',
  'case.spawned',
  'case.raid_converted',
  'case.aggregate_battle',
  'agent.training_completed',
  'production.queue_completed',
  'market.shifted',
  'market.transaction_recorded',
  'faction.standing_changed',
  'faction.unlock_available',
  'agency.containment_updated',
  'system.week_delta',
  'system.recruitment_expired',
  'system.recruitment_generated',
  'recruitment.scouting_initiated',
  'recruitment.scouting_refined',
  'recruitment.intel_confirmed',
  'system.party_cards_drawn',
  'system.escalation_consequence',
  'system.proxy_conflict',
  'system.protocol_contact',
  'system.anchor_instability',
  'directive.applied',
  'support.shortfall',
  'infiltration.awareness_complication',
  'infiltration.escalation_exposed',
  'infiltration.escalation_violent',
  'infiltration.cover_strain',
  'infiltration.weekly_encounter',
  'infiltration.leave_behind_tradeoff',
  'concealment.activated',
  'support.restored',
  'hub.opportunity',
  'hub.rumor',
  'system.equipment_recovered',
  'information_intake.verification',
  'information_intake.naming_hazard_cross_link',
  'information_intake.extranormal_cross_link',
  'information_intake.minor_anomaly_cross_link',
  'information_intake.unexplained_location_cross_link',
  'welfare_debt.accounting_cross_link',
  'coercive_protocol.integrated_health_reconciliation',
  'post_incident_review.follow_on',
  'post_incident_review.closeout_reward_payout',
  'public_disclosure.trust_outcome',
  'public_disclosure.segment_trust_divergence',
  'cognitive_hazard.simulation_trigger',
  'contribution_release.publish_queue_execution',
  'contribution_release.modifiable_data_pack_governance',
  'contribution_release.modifiable_data_pack_publish_enqueue',
  'visual_trigger_hazard.weekly_transition',
  'spe947_evaluator.weekly_transition',
  'spe956_participatory_channel.weekly_transition',
  'entity_welfare_reclassification.weekly_transition',
  'affiliation_person_status.weekly_progression',
  'pattern_source_series.weekly_transition',
] as const satisfies readonly ReportNoteType[]

const REPORT_NOTE_METADATA_MAX_KEYS = 32
const REPORT_NOTE_METADATA_MAX_ARRAY_LENGTH = 64
const REPORT_NOTE_METADATA_MAX_STRING_LENGTH = 2048
const OPERATION_EVENT_CLOCK_START_MS = Date.UTC(2042, 0, 1, 0, 0, 0)
const OPERATION_EVENT_WEEK_MS = 7 * 24 * 60 * 60 * 1000

const CASE_OUTCOME_REWARD_METADATA_KEYS = [
  'fundingDelta',
  'containmentDelta',
  'reputationDelta',
  'strategicValueDelta',
  'materialRewardCount',
  'equipmentRewardCount',
  'factionStandingNet',
] as const

/** Known metadata keys per typed report note (hydration problem 334). */
const REPORT_NOTE_METADATA_ALLOWLIST: Partial<Record<ReportNoteType, readonly string[]>> = {
  'case.resolved': ['caseId', 'caseTitle', 'stage', ...CASE_OUTCOME_REWARD_METADATA_KEYS],
  'case.partially_resolved': [
    'caseId',
    'caseTitle',
    'fromStage',
    'toStage',
    ...CASE_OUTCOME_REWARD_METADATA_KEYS,
  ],
  'case.failed': [
    'caseId',
    'caseTitle',
    'fromStage',
    'toStage',
    ...CASE_OUTCOME_REWARD_METADATA_KEYS,
  ],
  'case.escalated': [
    'caseId',
    'caseTitle',
    'fromStage',
    'toStage',
    'trigger',
    'neighborhoodPressureAuditTag',
    ...CASE_OUTCOME_REWARD_METADATA_KEYS,
  ],
  'case.spawned': [
    'caseId',
    'caseTitle',
    'parentCaseId',
    'trigger',
    'factionId',
    'factionLabel',
    'sourceReason',
  ],
  'case.raid_converted': ['caseId', 'caseTitle', 'stage', 'trigger'],
  'case.aggregate_battle': [
    'caseId',
    'caseTitle',
    'battleId',
    'roundsResolved',
    'winnerLabel',
    'friendlyRoutedCount',
    'hostileRoutedCount',
    'friendlyRoutedUnits',
    'hostileRoutedUnits',
    'specialDamageCount',
    'specialDamage',
    'movementDeniedCount',
  ],
  'agent.training_completed': ['agentId', 'agentName', 'trainingId', 'queueId'],
  'production.queue_completed': [
    'queueId',
    'recipeId',
    'recipeName',
    'outputItemId',
    'outputQuantity',
  ],
  'market.shifted': ['featuredRecipeId', 'pressure', 'costMultiplier'],
  'market.transaction_recorded': [
    'action',
    'listingId',
    'itemId',
    'category',
    'quantity',
    'bundleCount',
    'unitPrice',
    'totalPrice',
    'remainingAvailability',
    'allocation',
    'allocations',
  ],
  'faction.standing_changed': [
    'factionId',
    'factionName',
    'delta',
    'standingBefore',
    'standingAfter',
    'reason',
    'caseId',
    'caseTitle',
  ],
  'faction.unlock_available': [
    'factionId',
    'factionName',
    'contactId',
    'contactName',
    'label',
    'disposition',
  ],
  'agency.containment_updated': ['containmentDelta', 'fundingDelta', 'clearanceLevelAfter'],
  'system.week_delta': ['delta'],
  'system.recruitment_expired': ['count'],
  'system.recruitment_generated': ['count'],
  'recruitment.scouting_initiated': [
    'candidateId',
    'candidateName',
    'stage',
    'projectedTier',
    'confidence',
    'fundingCost',
    'revealLevel',
  ],
  'recruitment.scouting_refined': [
    'candidateId',
    'candidateName',
    'stage',
    'projectedTier',
    'confidence',
    'fundingCost',
    'revealLevel',
    'previousProjectedTier',
    'previousConfidence',
  ],
  'recruitment.intel_confirmed': [
    'candidateId',
    'candidateName',
    'stage',
    'projectedTier',
    'confirmedTier',
    'confidence',
    'fundingCost',
    'revealLevel',
    'previousProjectedTier',
    'previousConfidence',
  ],
  'system.party_cards_drawn': ['count'],
  'system.escalation_consequence': [
    'caseId',
    'threatFamily',
    'escalationBand',
    'consequences',
    'severeHit',
    'counterExplanation',
    'week',
  ],
  'system.proxy_conflict': ['effect', 'week'],
  'system.protocol_contact': ['outcome', 'reliabilityDelta', 'distortionDelta', 'week'],
  'system.anchor_instability': [
    'cohesion',
    'agendaPressure',
    'reliability',
    'distortion',
    'distortionStates',
    'distortionSummary',
    'factionId',
    'week',
  ],
  'directive.applied': ['directiveId', 'directiveLabel'],
  'support.shortfall': ['caseId', 'caseTitle', 'remainingSupport', 'week'],
  'support.restored': ['prev', 'next', 'amount', 'week'],
  'system.equipment_recovered': [
    'recovered',
    'delayed',
    'recoveredCount',
    'delayedCount',
    'maintenanceCapacity',
    'damagedCount',
  ],
  'infiltration.awareness_complication': [
    'caseId',
    'caseTitle',
    'summary',
    'infiltrationAwareness',
    'infiltrationProbeProgress',
    'infiltrationStage',
    'probeAction',
    'probeActionSource',
    'coverRole',
    'leaveBehindId',
    'leaveBehindLabel',
  ],
  'infiltration.escalation_exposed': [
    'caseId',
    'caseTitle',
    'summary',
    'infiltrationAwareness',
    'infiltrationProbeProgress',
    'infiltrationStage',
    'probeAction',
    'probeActionSource',
    'coverRole',
    'leaveBehindId',
    'leaveBehindLabel',
  ],
  'infiltration.escalation_violent': [
    'caseId',
    'caseTitle',
    'summary',
    'infiltrationAwareness',
    'infiltrationProbeProgress',
    'infiltrationStage',
    'probeAction',
    'probeActionSource',
    'coverRole',
    'leaveBehindId',
    'leaveBehindLabel',
  ],
  'infiltration.cover_strain': [
    'caseId',
    'caseTitle',
    'summary',
    'infiltrationAwareness',
    'infiltrationProbeProgress',
    'infiltrationStage',
    'probeAction',
    'probeActionSource',
    'coverRole',
    'leaveBehindId',
    'leaveBehindLabel',
  ],
  'infiltration.weekly_encounter': [
    'caseId',
    'caseTitle',
    'summary',
    'infiltrationAwareness',
    'infiltrationProbeProgress',
    'infiltrationStage',
    'probeAction',
    'probeActionSource',
    'coverRole',
    'leaveBehindId',
    'leaveBehindLabel',
  ],
  'infiltration.leave_behind_tradeoff': [
    'caseId',
    'caseTitle',
    'summary',
    'infiltrationAwareness',
    'infiltrationProbeProgress',
    'infiltrationStage',
    'probeAction',
    'probeActionSource',
    'coverRole',
    'leaveBehindId',
    'leaveBehindLabel',
  ],
  'concealment.activated': [
    'caseId',
    'caseTitle',
    'mode',
    'reason',
    'summary',
    'displacementTarget',
  ],
  'hub.opportunity': ['label', 'summary', 'week'],
  'hub.rumor': ['label', 'summary', 'week'],
  'information_intake.verification': [
    'reportId',
    'reportLabel',
    'eventKind',
    'verificationStatus',
    'week',
  ],
  'information_intake.naming_hazard_cross_link': [
    'topicRef',
    'linkedReportCount',
    'linkedDescriptorCount',
    'structuredReasons',
    'week',
  ],
  'information_intake.extranormal_cross_link': [
    'topicRef',
    'linkedReportCount',
    'linkedEventCount',
    'structuredReasons',
    'week',
  ],
  'information_intake.minor_anomaly_cross_link': [
    'topicRef',
    'linkedReportCount',
    'linkedItemCount',
    'structuredReasons',
    'week',
  ],
  'information_intake.unexplained_location_cross_link': [
    'topicRef',
    'linkedReportCount',
    'linkedLocationCount',
    'structuredReasons',
    'week',
  ],
  'welfare_debt.accounting_cross_link': [
    'debtRef',
    'subjectRef',
    'integratedHealthLinkCount',
    'coerciveProtocolLinkCount',
    'crossLinkLabels',
    'week',
  ],
  'coercive_protocol.integrated_health_reconciliation': [
    'subjectRef',
    'linkedProtocolCount',
    'linkedBundleCount',
    'crossSystemTensionFlags',
    'structuredReasons',
    'week',
  ],
  'post_incident_review.follow_on': [
    'reviewRef',
    'reviewLabel',
    'followOnKind',
    'followOnToken',
    'week',
  ],
  'post_incident_review.closeout_reward_payout': [
    'reviewRef',
    'reviewLabel',
    'rewardBranch',
    'payoutKinds',
    'week',
  ],
  'public_disclosure.trust_outcome': [
    'activeCampaignCount',
    'dominantAwarenessLevel',
    'aggregateRegionalTrustBand',
    'cooperationBand',
    'week',
  ],
  'public_disclosure.segment_trust_divergence': [
    'activeCampaignCount',
    'visibleSegmentCount',
    'hasDivergence',
    'week',
  ],
  'cognitive_hazard.simulation_trigger': [
    'subjectRef',
    'linkedRecordCount',
    'exposureReviewBand',
    'triggerKinds',
    'activeTriggerChannels',
    'structuredReasons',
    'week',
  ],
  'contribution_release.publish_queue_execution': [
    'recordId',
    'outcome',
    'executionWeek',
    'skipCode',
    'publishChannelStub',
    'recordStatus',
    'week',
  ],
  'contribution_release.modifiable_data_pack_governance': [
    'packId',
    'outcome',
    'executionWeek',
    'importStatus',
    'skipCode',
    'reasonCodes',
    'week',
  ],
  'contribution_release.modifiable_data_pack_publish_enqueue': [
    'packId',
    'outcome',
    'executionWeek',
    'queueRecordId',
    'skipCode',
    'reasonCodes',
    'week',
  ],
  'visual_trigger_hazard.weekly_transition': [
    'recordId',
    'transitionKinds',
    'priorPursuitState',
    'nextPursuitState',
    'priorObserverAwarenessBand',
    'nextObserverAwarenessBand',
    'advancedSweepMediaInstanceIds',
    'structuredReasons',
    'week',
  ],
  'spe947_evaluator.weekly_transition': [
    'entityKind',
    'recordId',
    'transitionKinds',
    'priorElapsedPropagationWeeks',
    'nextElapsedPropagationWeeks',
    'priorViewCount',
    'nextViewCount',
    'priorUptimeState',
    'nextUptimeState',
    'structuredReasons',
    'week',
  ],
  'spe956_participatory_channel.weekly_transition': [
    'channelKind',
    'recordId',
    'transitionKinds',
    'priorElapsedChannelWeeks',
    'nextElapsedChannelWeeks',
    'structuredReasons',
    'week',
  ],
  'entity_welfare_reclassification.weekly_transition': [
    'recordId',
    'transitionKinds',
    'priorReclassificationState',
    'nextReclassificationState',
    'priorReviewGate',
    'nextReviewGate',
    'structuredReasons',
    'week',
  ],
  'affiliation_person_status.weekly_progression': [
    'recordId',
    'transitionKinds',
    'structuredReasons',
    'week',
  ],
  'pattern_source_series.weekly_transition': [
    'recordId',
    'transitionKinds',
    'priorProcessingStatus',
    'nextProcessingStatus',
    'priorReadinessScore',
    'nextReadinessScore',
    'structuredReasons',
    'week',
  ],
}

const FALLBACK_WEEKLY_DIRECTIVE_ID = getWeeklyDirectiveDefinitions()[0]?.id ?? 'intel-surge'

/** Required payload identity fields; events missing these are dropped unless legacy repair is enabled. */
const REQUIRED_OPERATION_EVENT_IDENTITY: Partial<
  Record<OperationEventType | 'faction.activity', readonly string[]>
> = {
  'assignment.team_assigned': ['caseId', 'teamId'],
  'assignment.team_unassigned': ['caseId', 'teamId'],
  'case.resolved': ['caseId'],
  'case.partially_resolved': ['caseId'],
  'case.failed': ['caseId'],
  'case.escalated': ['caseId'],
  'case.spawned': ['caseId', 'templateId'],
  'case.raid_converted': ['caseId'],
  'agent.training_started': ['agentId', 'queueId'],
  'agent.training_completed': ['agentId', 'queueId'],
  'agent.training_cancelled': ['agentId'],
  'agent.relationship_changed': ['agentId', 'counterpartId'],
  'agent.instructor_assigned': ['staffId', 'agentId'],
  'agent.instructor_unassigned': ['staffId', 'agentId'],
  'agent.injured': ['agentId'],
  'agent.killed': ['agentId', 'caseId'],
  'agent.betrayed': ['betrayerId', 'betrayedId'],
  'case.aggregate_battle': ['caseId', 'battleId'],
  'agent.resigned': ['agentId'],
  'agent.promoted': ['agentId'],
  'agent.hired': ['candidateId', 'agentId'],
  'progression.xp_gained': ['agentId'],
  'recruitment.scouting_initiated': ['candidateId'],
  'recruitment.scouting_refined': ['candidateId'],
  'recruitment.intel_confirmed': ['candidateId'],
  'production.queue_started': ['queueId', 'recipeId'],
  'production.queue_completed': ['queueId', 'recipeId'],
  'market.shifted': ['featuredRecipeId'],
  'market.transaction_recorded': ['transactionId', 'listingId', 'itemId'],
  'faction.standing_changed': ['factionId'],
  'faction.unlock_available': ['factionId'],
  'faction.activity': ['factionId'],
  'support.shortfall': ['caseId'],
  'infiltration.awareness_complication': ['caseId'],
  'infiltration.escalation_exposed': ['caseId'],
  'infiltration.escalation_violent': ['caseId'],
  'infiltration.cover_strain': ['caseId'],
  'infiltration.weekly_encounter': ['caseId'],
  'infiltration.leave_behind_tradeoff': ['caseId'],
  'concealment.activated': ['caseId'],
}

function hasRequiredOperationEventIdentity(
  eventType: OperationEventType | 'faction.activity',
  payload: Record<string, unknown>
) {
  const requiredFields = REQUIRED_OPERATION_EVENT_IDENTITY[eventType]

  if (!requiredFields) {
    return true
  }

  return requiredFields.every((field) => {
    if (typeof payload[field] !== 'string') {
      return false
    }

    return payload[field].trim().length > 0
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === 'string' && options.includes(value as T)
}

function stripUndefinedFields<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => stripUndefinedFields(entry)) as T
  }

  if (!isRecord(value)) {
    return value
  }

  const nextValue: Record<string, unknown> = {}

  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined) {
      nextValue[key] = stripUndefinedFields(entry)
    }
  }

  return nextValue as T
}

const CURRENT_OPERATION_EVENT_SCHEMA_VERSION = 2 as const

function normalizeOperationEventSchemaVersion(value: unknown) {
  return (value === 1 || value === 2 ? value : CURRENT_OPERATION_EVENT_SCHEMA_VERSION) as 1 | 2
}

function normalizeLegacyOperationEventType(
  value: unknown
): OperationEventType | 'faction.activity' | null {
  if (value === 'faction.activity') {
    return value
  }

  return isOneOf(value, OPERATION_EVENT_TYPES) ? value : null
}

function migrateOperationEventToCurrentSchema<TType extends OperationEventType>(
  event: OperationEvent<TType>
): OperationEvent<TType> {
  switch (event.schemaVersion) {
    case CURRENT_OPERATION_EVENT_SCHEMA_VERSION:
      return event
    default:
      return {
        ...event,
        schemaVersion: CURRENT_OPERATION_EVENT_SCHEMA_VERSION,
      }
  }
}

function sanitizeInteger(value: number | undefined, fallback: number, min: number) {
  const finiteValue = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return Math.max(min, Math.trunc(finiteValue))
}

function sanitizeFiniteDecimalPreservePrecision(
  value: number | undefined,
  fallback: number,
  min: number,
  max?: number
) {
  const finiteValue = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return max === undefined ? Math.max(min, finiteValue) : clamp(finiteValue, min, max)
}

function sanitizeFiniteNumber(value: unknown, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()

    if (trimmed.length > 0) {
      const parsed = Number(trimmed)

      if (Number.isFinite(parsed)) {
        return parsed
      }
    }
  }

  return fallback
}

function reconcileTrainingEventProgram(
  trainingIdValue: unknown,
  trainingNameValue: unknown
): { trainingId: string; trainingName: string; fundingCost: number } {
  const trainingIdCandidate = typeof trainingIdValue === 'string' ? trainingIdValue : undefined
  const trainingNameCandidate =
    typeof trainingNameValue === 'string' && trainingNameValue.trim().length > 0
      ? trainingNameValue.trim()
      : undefined

  const matchedProgramById =
    trainingIdCandidate && getTrainingProgram(trainingIdCandidate)
      ? getTrainingProgram(trainingIdCandidate)
      : undefined
  const matchedProgramByName = trainingNameCandidate
    ? trainingCatalog.find((program) => program.name === trainingNameCandidate)
    : undefined
  const fallbackProgram = trainingCatalog[0]
  const program = matchedProgramById ?? matchedProgramByName ?? fallbackProgram

  if (!program) {
    return {
      trainingId: 'combat-drills',
      trainingName: trainingNameCandidate ?? 'Close-Quarters Drills',
      fundingCost: 0,
    }
  }

  return {
    trainingId: program.trainingId,
    trainingName: program.name,
    fundingCost: program.fundingCost,
  }
}

const ALLOWED_GAME_OVER_REASONS = new Set<string>(Object.values(GAME_OVER_REASONS))

const WEEKLY_REPORT_CASE_SNAPSHOT_KEYS = new Set([
  'caseId',
  'title',
  'kind',
  'mode',
  'status',
  'stage',
  'deadlineRemaining',
  'durationWeeks',
  'weeksRemaining',
  'assignedTeamIds',
  'performanceSummary',
  'powerImpact',
  'rewardBreakdown',
  'missionResult',
  'distortion',
  'knowledge',
  'revealExplanation',
])

export type WeeklyReportIntelSnapshot = {
  resolvedCount: number
  failedCount: number
  partialCount: number
  unresolvedCount: number
  spawnedCount: number
  noteCount: number
  score: number
}

export type SanitizeOperationEventsOptions = {
  /** When true, missing entity IDs may be synthesized for legacy import repair. */
  allowLegacySyntheticRepair?: boolean
  /** SPE-490: clamp payload week fields to 1..campaignWeek during hydration. */
  campaignWeek?: number
  /** Hydration 533: reconcile intel.report_generated counts/score when a weekly report exists. */
  weeklyReportsByWeek?: ReadonlyMap<number, WeeklyReportIntelSnapshot>
  /** Hydration 586: catalog fallback for market.shifted featuredRecipeId reconciliation. */
  fallbackFeaturedRecipeId?: string
}

export interface OperationEventReconcileContext {
  agentIds: ReadonlySet<string>
  teamIds: ReadonlySet<string>
  caseIds: ReadonlySet<string>
  candidateIds: ReadonlySet<string>
  staffIds: ReadonlySet<string>
  factionIds: ReadonlySet<string>
  templateIds: ReadonlySet<string>
  trainingIds: ReadonlySet<string>
}

function clampOperationEventWeek(value: unknown, fallback: number, campaignWeek?: number): number {
  const week = sanitizeInteger(value as number | undefined, fallback, 1)

  if (campaignWeek === undefined) {
    return week
  }

  return clamp(week, 1, Math.max(1, Math.trunc(campaignWeek)))
}

function sanitizeGameOverReason(
  gameOver: boolean,
  rawReason: unknown,
  fallbackReason: string | undefined
): string | undefined {
  if (!gameOver) {
    return undefined
  }

  if (typeof rawReason !== 'string') {
    const fallback =
      typeof fallbackReason === 'string' && ALLOWED_GAME_OVER_REASONS.has(fallbackReason)
        ? fallbackReason
        : GAME_OVER_REASONS.breachState

    return fallback
  }

  const trimmed = rawReason.trim()

  if (trimmed.length === 0) {
    return GAME_OVER_REASONS.breachState
  }

  return ALLOWED_GAME_OVER_REASONS.has(trimmed) ? trimmed : GAME_OVER_REASONS.breachState
}

function trimOperationEventPayloadStrings(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const next: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === 'string') {
      const trimmed = value.trim()

      if (trimmed.length > 0) {
        next[key] = trimmed
      }

      continue
    }

    if (Array.isArray(value)) {
      next[key] = value
        .map((entry) => {
          if (typeof entry === 'string') {
            const trimmed = entry.trim()
            return trimmed.length > 0 ? trimmed : null
          }

          if (isRecord(entry)) {
            return trimOperationEventPayloadStrings(entry)
          }

          return entry
        })
        .filter((entry) => entry !== null)

      continue
    }

    if (isRecord(value)) {
      next[key] = trimOperationEventPayloadStrings(value)
      continue
    }

    next[key] = value
  }

  return next
}

/** SPE-491: trim event payload strings; preserve stale entity IDs for historical logs. */
export function reconcileHydratedOperationEventRefs(events: OperationEvent[]): OperationEvent[] {
  return events.map((event) => {
    if (!isRecord(event.payload)) {
      return event
    }

    const payload = trimOperationEventPayloadStrings(event.payload) as OperationEvent['payload']

    return {
      ...event,
      payload,
    } as OperationEvent
  })
}

function resolveImportedEntityId(
  value: unknown,
  legacyFallback: string,
  allowLegacySyntheticRepair: boolean
): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()

    if (trimmed.length > 0) {
      return trimmed
    }
  }

  return allowLegacySyntheticRepair ? legacyFallback : null
}

function reconcileStageTransition(fromStage: unknown, toStage: unknown) {
  const from = sanitizeInteger(fromStage as number | undefined, 1, 1)
  const to = sanitizeInteger(toStage as number | undefined, from, 1)

  return {
    fromStage: from,
    toStage: Math.max(from, to),
  }
}

function reconcileStandingFields(standingBefore: unknown, standingAfter: unknown, delta: unknown) {
  const before = clamp(
    sanitizeInteger(standingBefore as number | undefined, 0, FACTION_STANDING_MIN),
    FACTION_STANDING_MIN,
    FACTION_STANDING_MAX
  )
  const deltaHint = sanitizeInteger(delta as number | undefined, 0, FACTION_STANDING_MIN)
  const afterRaw = clamp(
    sanitizeInteger(standingAfter as number | undefined, before + deltaHint, FACTION_STANDING_MIN),
    FACTION_STANDING_MIN,
    FACTION_STANDING_MAX
  )
  const reconciledAfter =
    afterRaw === before + deltaHint
      ? afterRaw
      : clamp(before + deltaHint, FACTION_STANDING_MIN, FACTION_STANDING_MAX)
  const reconciledDelta = reconciledAfter - before

  return {
    standingBefore: before,
    delta: reconciledDelta,
    standingAfter: reconciledAfter,
  }
}

function boundReputationValue(value: unknown, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return clamp(Math.trunc(value), FACTION_REPUTATION_MIN, FACTION_REPUTATION_MAX)
  }

  if (typeof value === 'number' && value > FACTION_REPUTATION_MAX) {
    return FACTION_REPUTATION_MAX
  }

  if (typeof value === 'number' && value < FACTION_REPUTATION_MIN) {
    return FACTION_REPUTATION_MIN
  }

  return clamp(Math.trunc(fallback), FACTION_REPUTATION_MIN, FACTION_REPUTATION_MAX)
}

function reconcileReputationFields(reputationBefore: unknown, reputationAfter: unknown) {
  const before = boundReputationValue(reputationBefore, 0)
  const after = boundReputationValue(reputationAfter, before)

  return {
    reputationBefore: before,
    reputationAfter: after,
  }
}

function reconcileContactRelationshipFields(
  relationshipBefore: unknown,
  relationshipAfter: unknown,
  contactDelta: unknown
) {
  const before = clamp(
    sanitizeInteger(relationshipBefore as number | undefined, 0, CONTACT_RELATIONSHIP_MIN),
    CONTACT_RELATIONSHIP_MIN,
    CONTACT_RELATIONSHIP_MAX
  )
  const deltaHint = sanitizeInteger(contactDelta as number | undefined, 0, CONTACT_RELATIONSHIP_MIN)
  const afterRaw = clamp(
    sanitizeInteger(
      relationshipAfter as number | undefined,
      before + deltaHint,
      CONTACT_RELATIONSHIP_MIN
    ),
    CONTACT_RELATIONSHIP_MIN,
    CONTACT_RELATIONSHIP_MAX
  )
  const reconciledAfter =
    afterRaw === before + deltaHint
      ? afterRaw
      : clamp(before + deltaHint, CONTACT_RELATIONSHIP_MIN, CONTACT_RELATIONSHIP_MAX)
  const reconciledDelta = reconciledAfter - before

  return {
    contactRelationshipBefore: before,
    contactRelationshipAfter: reconciledAfter,
    contactDelta: reconciledDelta,
  }
}

function clampEmergencyWaiverGrantWeek(
  value: unknown,
  eventWeek: number,
  campaignWeek: number
): number {
  const cappedCampaignWeek = Math.max(1, Math.trunc(campaignWeek))
  const cappedEventWeek = Math.max(1, Math.trunc(eventWeek))
  const maxGrantWeek = Math.min(cappedEventWeek - 1, cappedCampaignWeek)

  if (maxGrantWeek < 1) {
    return 1
  }

  const fallback = Math.max(1, cappedEventWeek - 1)

  return clamp(sanitizeInteger(value as number | undefined, fallback, 1), 1, maxGrantWeek)
}

function reconcileBeforeAfterDelta(before: unknown, after: unknown, delta: unknown, min: number) {
  const beforeValue = sanitizeInteger(before as number | undefined, 0, min)
  const deltaValue = sanitizeInteger(delta as number | undefined, 0, Number.MIN_SAFE_INTEGER)
  const expectedAfter = beforeValue + deltaValue
  const afterValue = sanitizeInteger(after as number | undefined, expectedAfter, min)

  return {
    before: beforeValue,
    after: afterValue === expectedAfter ? afterValue : expectedAfter,
    delta: deltaValue,
  }
}

function reconcileMarketTotalPrice(
  unitPrice: number,
  quantity: number,
  bundleCount: number,
  totalPrice: unknown
) {
  const expected = Math.max(0, Math.trunc(unitPrice * quantity * bundleCount))
  const sanitized = sanitizeInteger(totalPrice as number | undefined, expected, 0)

  return sanitized === expected ? sanitized : expected
}

function reconcileProductionEventRecipeOutput(
  recipeIdValue: unknown,
  outputIdValue: unknown,
  outputNameValue: unknown
): { recipeId: string; outputId: string; outputName: string } {
  const recipeById =
    typeof recipeIdValue === 'string' && getProductionRecipe(recipeIdValue)
      ? getProductionRecipe(recipeIdValue)
      : undefined
  const recipe = recipeById ?? undefined

  if (!recipe) {
    const fallbackOutputId = typeof outputIdValue === 'string' ? outputIdValue : 'output-1'
    const fallbackOutputName =
      typeof outputNameValue === 'string' && outputNameValue.trim().length > 0
        ? outputNameValue.trim()
        : (inventoryItemLabels[fallbackOutputId] ?? 'Output 1')

    return {
      recipeId: typeof recipeIdValue === 'string' ? recipeIdValue : 'recipe-1',
      outputId: fallbackOutputId,
      outputName: fallbackOutputName,
    }
  }

  return {
    recipeId: recipe.recipeId,
    outputId: recipe.outputItemId,
    outputName: recipe.outputItemName,
  }
}

function sanitizeOperationEventMarketProcurementAllocation(value: unknown) {
  if (!isRecord(value)) {
    return undefined
  }

  const resourceClass = isOneOf(value.resourceClass, MARKET_TRANSACTION_RESOURCE_CLASSES)
    ? value.resourceClass
    : 'supplier_attention_slot'
  const allocationId =
    typeof value.allocationId === 'string' && value.allocationId.trim().length > 0
      ? value.allocationId.trim()
      : undefined

  if (!allocationId) {
    return undefined
  }

  const source =
    typeof value.source === 'string' && value.source.trim().length > 0
      ? value.source.trim()
      : 'unknown_source'
  const sourceLabel =
    typeof value.sourceLabel === 'string' && value.sourceLabel.trim().length > 0
      ? value.sourceLabel.trim()
      : source
  const destinationUse =
    typeof value.destinationUse === 'string' && value.destinationUse.trim().length > 0
      ? value.destinationUse.trim()
      : 'unknown_destination'
  const destinationLabel =
    typeof value.destinationLabel === 'string' && value.destinationLabel.trim().length > 0
      ? value.destinationLabel.trim()
      : destinationUse
  const expectedBenefit =
    typeof value.expectedBenefit === 'string' && value.expectedBenefit.trim().length > 0
      ? value.expectedBenefit.trim()
      : 'unspecified'

  return {
    allocationId,
    resourceClass,
    source,
    sourceLabel,
    destinationUse,
    destinationLabel,
    urgency: value.urgency === 'contingency' ? 'contingency' : 'standard',
    expectedBenefit,
    priority: clamp(
      sanitizeInteger(value.priority as number | undefined, 0, 0),
      0,
      MARKET_PROCUREMENT_ALLOCATION_PRIORITY_MAX
    ),
    delayWeeks: clamp(
      sanitizeInteger(value.delayWeeks as number | undefined, 0, 0),
      0,
      MARKET_PROCUREMENT_ALLOCATION_DELAY_WEEKS_MAX
    ),
    ...(typeof value.displacedAlternativeUse === 'string' &&
    value.displacedAlternativeUse.trim().length > 0
      ? { displacedAlternativeUse: value.displacedAlternativeUse.trim() }
      : {}),
    substitutionStatus:
      value.substitutionStatus === 'degraded_substitute' ? 'degraded_substitute' : 'none',
    ...(typeof value.substitutionSummary === 'string' && value.substitutionSummary.trim().length > 0
      ? { substitutionSummary: value.substitutionSummary.trim() }
      : {}),
  }
}

function sanitizeOperationEventMarketListingResourceStatuses(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined
  }

  const sanitizeCapacityValue = (raw: unknown) =>
    typeof raw === 'number' && Number.isFinite(raw) ? Math.max(0, Math.trunc(raw)) : undefined

  const sanitized = value
    .filter((entry): entry is Record<string, unknown> => isRecord(entry))
    .map((entry) => {
      const resourceClass = isOneOf(entry.resourceClass, MARKET_TRANSACTION_RESOURCE_CLASSES)
        ? entry.resourceClass
        : 'supplier_attention_slot'
      const allocationIds = Array.isArray(entry.allocations)
        ? [
            ...new Set(
              entry.allocations
                .filter(
                  (allocationId): allocationId is string =>
                    typeof allocationId === 'string' && allocationId.trim().length > 0
                )
                .map((allocationId) => allocationId.trim())
            ),
          ].sort((left, right) => left.localeCompare(right))
        : undefined
      const capacity = sanitizeCapacityValue(entry.capacity)
      const available = sanitizeCapacityValue(entry.available)
      const boundedAvailable =
        available !== undefined && capacity !== undefined
          ? Math.min(available, capacity)
          : available

      return stripUndefinedFields({
        resourceClass,
        ...(typeof entry.sourceId === 'string' && entry.sourceId.trim().length > 0
          ? { sourceId: entry.sourceId.trim() }
          : {}),
        ...(typeof entry.label === 'string' && entry.label.trim().length > 0
          ? { label: entry.label.trim() }
          : {}),
        ...(boundedAvailable !== undefined ? { available: boundedAvailable } : {}),
        ...(capacity !== undefined ? { capacity } : {}),
        ...(allocationIds && allocationIds.length > 0 ? { allocations: allocationIds } : {}),
      })
    })

  return sanitized.length > 0 ? sanitized : undefined
}

function sanitizeOperationEventMarketProcurementAllocations(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined
  }

  const sanitized = value
    .map((entry) => sanitizeOperationEventMarketProcurementAllocation(entry))
    .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined)

  return sanitized.length > 0 ? sanitized : undefined
}

function sanitizeReportRngState(value: unknown, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return normalizeSeed(value)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()

    if (trimmed.length > 0) {
      const parsed = Number(trimmed)

      if (Number.isFinite(parsed)) {
        return normalizeSeed(parsed)
      }
    }
  }

  return normalizeSeed(fallback)
}

/** Hydration 598: preserve audit counts but clamp to a finite import-safe ceiling. */
function sanitizeOperationEventAuditCount(value: unknown, fallback = 0) {
  return clamp(
    sanitizeInteger(value as number | undefined, fallback, 0),
    0,
    OPERATION_EVENT_AUDIT_COUNT_MAX
  )
}

/**
 * Hydration 594: normalize weekly report RNG cursors and ensure `after` advances from `before`
 * when a stale import left them identical.
 */
function reconcileWeeklyReportRngTransition(
  before: unknown,
  after: unknown,
  chainFallback: number
) {
  const rngStateBefore = sanitizeReportRngState(before, chainFallback)
  const persistedAfter = sanitizeReportRngState(after, nextSeed(rngStateBefore))
  const rngStateAfter =
    persistedAfter === rngStateBefore ? nextSeed(rngStateBefore) : persistedAfter

  return { rngStateBefore, rngStateAfter }
}

/**
 * Hydration 592: clamp durable avgFatigue; for the current campaign week optionally
 * reconcile from sanitized teamStatus rollups when live enrichment is active.
 */
function reconcileWeeklyReportAvgFatigue(
  value: unknown,
  teamStatus: WeeklyReportTeamStatus[],
  options: {
    reconcileFromTeamStatus?: boolean
    /** When false, only clamp the durable summary (historical or empty teamStatus imports). */
    persistedTeamStatusProvided?: boolean
  } = {}
) {
  const clamped = clamp(
    sanitizeInteger(value as number | undefined, 0, 0),
    0,
    WEEKLY_REPORT_AVG_FATIGUE_MAX
  )

  if (
    !options.reconcileFromTeamStatus ||
    !options.persistedTeamStatusProvided ||
    teamStatus.length === 0
  ) {
    return clamped
  }

  const teamRollup = Math.round(
    teamStatus.reduce((sum, entry) => sum + entry.avgFatigue, 0) / teamStatus.length
  )

  return clamp(teamRollup, 0, WEEKLY_REPORT_AVG_FATIGUE_MAX)
}

/**
 * Hydration 566: `rngSeed` anchors the run; `rngState` is the live cursor and defaults to
 * `rngSeed` when missing or non-finite. Both normalize to uint32 (minimum 1).
 */
function reconcileHydratedRngState(
  rngSeed: number,
  rngState: unknown
): { rngSeed: number; rngState: number } {
  const normalizedSeed = normalizeSeed(rngSeed)
  const normalizedState =
    typeof rngState === 'number' && Number.isFinite(rngState)
      ? normalizeSeed(rngState)
      : normalizedSeed

  return { rngSeed: normalizedSeed, rngState: normalizedState }
}

function sanitizeStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((entry): entry is string => typeof entry === 'string')
}

/** Hydration 529: trim operation-event string fields and reject blank-only values. */
function sanitizeTrimmedOperationEventString(value: unknown, fallback: string) {
  if (typeof value !== 'string') {
    return fallback
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : fallback
}

/** Hydration 530: trim, dedupe, and drop blank string list entries. */
function sanitizeTrimmedDedupedStringList(value: unknown) {
  const seen = new Set<string>()
  const next: string[] = []

  for (const entry of sanitizeStringList(value)) {
    const trimmed = entry.trim()

    if (trimmed.length === 0 || seen.has(trimmed)) {
      continue
    }

    seen.add(trimmed)
    next.push(trimmed)
  }

  return next
}

function buildWeeklyReportIntelSnapshotsByWeek(
  reports: WeeklyReport[]
): Map<number, WeeklyReportIntelSnapshot> {
  const snapshotsByWeek = new Map<number, WeeklyReportIntelSnapshot>()

  for (const report of reports) {
    snapshotsByWeek.set(report.week, {
      resolvedCount: report.resolvedCases.length,
      failedCount: report.failedCases.length,
      partialCount: report.partialCases.length,
      unresolvedCount: report.unresolvedTriggers.length,
      spawnedCount: report.spawnedCases.length,
      noteCount: report.notes.length,
      score: calcWeekScore(report),
    })
  }

  return snapshotsByWeek
}

function sanitizeInfiltrationProbeEventPayload(
  payload: Record<string, unknown>,
  week: number,
  index: number,
  importEntityId: (value: unknown, legacyFallback: string) => string | undefined
) {
  const caseId = importEntityId(payload.caseId, `case-${index + 1}`) ?? `case-${index + 1}`
  const sanitizeInfiltrationFraction = (value: unknown) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return undefined
    }

    const normalizedValue = value > 1 ? value / 100 : value
    return clamp(normalizedValue, 0, 1)
  }
  const infiltrationAwareness = sanitizeInfiltrationFraction(payload.infiltrationAwareness)
  const infiltrationProbeProgress = sanitizeInfiltrationFraction(payload.infiltrationProbeProgress)
  const infiltrationStage = isOneOf(payload.infiltrationStage, INFILTRATION_PROBE_STAGES)
    ? payload.infiltrationStage
    : undefined
  const probeAction = isOneOf(payload.probeAction, INFILTRATION_PROBE_ACTIONS)
    ? payload.probeAction
    : undefined
  const probeActionSource = isOneOf(payload.probeActionSource, INFILTRATION_PROBE_ACTION_SOURCES)
    ? payload.probeActionSource
    : undefined
  const coverRole = isOneOf(payload.coverRole, INFILTRATION_COVER_ROLES)
    ? payload.coverRole
    : undefined
  const leaveBehindId =
    typeof payload.leaveBehindId === 'string' && payload.leaveBehindId.trim().length > 0
      ? payload.leaveBehindId.trim()
      : undefined
  const leaveBehindLabel =
    typeof payload.leaveBehindLabel === 'string' && payload.leaveBehindLabel.trim().length > 0
      ? payload.leaveBehindLabel.trim()
      : undefined

  return {
    week,
    caseId,
    caseTitle: sanitizeTrimmedOperationEventString(payload.caseTitle, `Case ${index + 1}`),
    summary: sanitizeTrimmedOperationEventString(
      payload.summary,
      `Infiltration event (${index + 1})`
    ),
    ...(infiltrationAwareness !== undefined ? { infiltrationAwareness } : {}),
    ...(infiltrationProbeProgress !== undefined ? { infiltrationProbeProgress } : {}),
    ...(infiltrationStage !== undefined ? { infiltrationStage } : {}),
    ...(probeAction !== undefined ? { probeAction } : {}),
    ...(probeActionSource !== undefined ? { probeActionSource } : {}),
    ...(coverRole !== undefined ? { coverRole } : {}),
    ...(leaveBehindId !== undefined ? { leaveBehindId } : {}),
    ...(leaveBehindLabel !== undefined ? { leaveBehindLabel } : {}),
  }
}

function sanitizeConcealmentActivatedEventPayload(
  payload: Record<string, unknown>,
  week: number,
  index: number,
  importEntityId: (value: unknown, legacyFallback: string) => string | undefined
) {
  const caseId = importEntityId(payload.caseId, `case-${index + 1}`) ?? `case-${index + 1}`
  const mode = isOneOf(payload.mode, CONCEALMENT_MODES) ? payload.mode : 'hidden'
  const detectionConfidence =
    typeof payload.detectionConfidence === 'number' && Number.isFinite(payload.detectionConfidence)
      ? clamp(payload.detectionConfidence, 0, 1)
      : undefined
  const displacementTargetRaw =
    typeof payload.displacementTarget === 'string' ? payload.displacementTarget.trim() : null
  const displacementTarget =
    displacementTargetRaw === null || displacementTargetRaw.length === 0
      ? null
      : displacementTargetRaw

  return {
    week,
    caseId,
    caseTitle: sanitizeTrimmedOperationEventString(payload.caseTitle, `Case ${index + 1}`),
    mode,
    reason: sanitizeTrimmedOperationEventString(payload.reason, 'unknown'),
    summary: sanitizeTrimmedOperationEventString(
      payload.summary,
      `Concealment activated (${index + 1})`
    ),
    ...(detectionConfidence !== undefined ? { detectionConfidence } : {}),
    ...(payload.displacementTarget !== undefined ? { displacementTarget } : {}),
  }
}

function reconcileIntelReportGeneratedPayload(
  payload: Record<string, unknown>,
  week: number,
  weeklyReportsByWeek: ReadonlyMap<number, WeeklyReportIntelSnapshot> | undefined
) {
  const reportSnapshot = weeklyReportsByWeek?.get(week)

  if (reportSnapshot === undefined) {
    return {
      week,
      resolvedCount: sanitizeInteger(payload.resolvedCount as number | undefined, 0, 0),
      failedCount: sanitizeInteger(payload.failedCount as number | undefined, 0, 0),
      partialCount: sanitizeInteger(payload.partialCount as number | undefined, 0, 0),
      unresolvedCount: sanitizeInteger(payload.unresolvedCount as number | undefined, 0, 0),
      spawnedCount: sanitizeInteger(payload.spawnedCount as number | undefined, 0, 0),
      noteCount: sanitizeInteger(payload.noteCount as number | undefined, 0, 0),
      score: sanitizeInteger(payload.score as number | undefined, 0, Number.MIN_SAFE_INTEGER),
    }
  }

  return {
    week,
    resolvedCount: reportSnapshot.resolvedCount,
    failedCount: reportSnapshot.failedCount,
    partialCount: reportSnapshot.partialCount,
    unresolvedCount: reportSnapshot.unresolvedCount,
    spawnedCount: reportSnapshot.spawnedCount,
    noteCount: reportSnapshot.noteCount,
    score: reportSnapshot.score,
  }
}

function sanitizeReportNoteMetadataValue(value: unknown): ReportNoteMetadataValue | undefined {
  if (value === null) {
    return null
  }

  if (typeof value === 'string') {
    return value.length > REPORT_NOTE_METADATA_MAX_STRING_LENGTH
      ? value.slice(0, REPORT_NOTE_METADATA_MAX_STRING_LENGTH)
      : value
  }

  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined
  }

  if (!Array.isArray(value)) {
    return undefined
  }

  const sanitizedEntries: Array<string | number | boolean> = []

  for (const entry of value) {
    if (typeof entry === 'string') {
      sanitizedEntries.push(
        entry.length > REPORT_NOTE_METADATA_MAX_STRING_LENGTH
          ? entry.slice(0, REPORT_NOTE_METADATA_MAX_STRING_LENGTH)
          : entry
      )
      continue
    }

    if (typeof entry === 'boolean') {
      sanitizedEntries.push(entry)
      continue
    }

    if (typeof entry === 'number' && Number.isFinite(entry)) {
      sanitizedEntries.push(entry)
    }
  }

  if (sanitizedEntries.length === 0) {
    return undefined
  }

  return sanitizedEntries.slice(0, REPORT_NOTE_METADATA_MAX_ARRAY_LENGTH) as ReportNoteMetadataValue
}

function isAllowedReportNoteMetadataKey(type: ReportNoteType | undefined, key: string) {
  if (type === undefined) {
    return true
  }

  const allowlist = REPORT_NOTE_METADATA_ALLOWLIST[type]

  return allowlist === undefined || allowlist.includes(key)
}

/** Hydration 546: trim metadata keys and dedupe trimmed collisions (latest wins). */
function dedupeReportNoteMetadataKeys(
  raw: Record<string, unknown>,
  type: ReportNoteType | undefined
): ReportNoteMetadata | undefined {
  const byTrimmedKey = new Map<string, { key: string; value: ReportNoteMetadataValue }>()

  for (const [rawKey, metadataValue] of Object.entries(raw)) {
    const key = rawKey.trim()

    if (key.length === 0 || !isAllowedReportNoteMetadataKey(type, key)) {
      continue
    }

    const nextValue = sanitizeReportNoteMetadataValue(metadataValue)

    if (nextValue === undefined) {
      continue
    }

    byTrimmedKey.set(key, { key, value: nextValue })
  }

  const entries = [...byTrimmedKey.values()].slice(0, REPORT_NOTE_METADATA_MAX_KEYS)

  if (entries.length === 0) {
    return undefined
  }

  const sanitized: ReportNoteMetadata = {}

  for (const { key, value } of entries) {
    sanitized[key] = value
  }

  return sanitized
}

function sanitizeReportNoteMetadata(
  raw: unknown,
  type: ReportNoteType | undefined
): ReportNoteMetadata | undefined {
  if (!isRecord(raw)) {
    return undefined
  }

  return dedupeReportNoteMetadataKeys(raw, type)
}

function repairBlankReportNoteContent(
  content: string,
  type: ReportNoteType | undefined,
  metadata: ReportNoteMetadata | undefined
): string | null {
  if (content.trim().length > 0) {
    return content
  }

  if (type === undefined) {
    return null
  }

  const caseTitle =
    typeof metadata?.caseTitle === 'string' && metadata.caseTitle.trim().length > 0
      ? metadata.caseTitle.trim()
      : undefined

  if (caseTitle) {
    return `${caseTitle} (${type})`
  }

  const label =
    typeof metadata?.label === 'string' && metadata.label.trim().length > 0
      ? metadata.label.trim()
      : undefined

  if (label) {
    return `${label} (${type})`
  }

  return type.replaceAll('.', ' ')
}

function sanitizeReportNoteTimestamp(raw: unknown, week: number, sequence: number) {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return buildReportNoteTimestamp(week, sequence)
  }

  const derivedWeek = deriveReportNoteWeekFromTimestamp(raw)

  if (derivedWeek === null || derivedWeek !== week) {
    return buildReportNoteTimestamp(week, sequence)
  }

  return Math.max(0, Math.trunc(raw))
}

function deriveOperationEventWeekFromTimestamp(timestamp: string) {
  const parsed = Date.parse(timestamp)

  if (Number.isNaN(parsed)) {
    return null
  }

  const weekIndex = Math.floor((parsed - OPERATION_EVENT_CLOCK_START_MS) / OPERATION_EVENT_WEEK_MS)

  return Math.max(1, weekIndex + 1)
}

function reconcileOperationEventTimestamp(week: number, sequence: number, rawTimestamp: unknown) {
  if (typeof rawTimestamp === 'string' && !Number.isNaN(Date.parse(rawTimestamp))) {
    const derivedWeek = deriveOperationEventWeekFromTimestamp(rawTimestamp)

    if (derivedWeek === week) {
      return rawTimestamp
    }
  }

  return buildOperationEventTimestamp(week, sequence)
}

function sanitizeReportNoteList(value: unknown, week: number): ReportNote[] {
  if (!Array.isArray(value)) {
    return []
  }

  const notes: ReportNote[] = []
  const seenIds = new Set<string>()

  for (const [index, entry] of value.entries()) {
    if (typeof entry === 'string') {
      const trimmed = entry.trim()

      if (trimmed.length === 0) {
        continue
      }

      notes.push(createDeterministicReportNote(trimmed, week, index))
      continue
    }

    if (!isRecord(entry)) {
      continue
    }

    const rawId =
      typeof entry.id === 'string' && entry.id.trim().length > 0
        ? entry.id.trim()
        : `note-${index + 1}`
    let id = rawId

    if (seenIds.has(id)) {
      id = `${rawId}-dup-${index + 1}`
    }

    seenIds.add(id)

    const rawContent = typeof entry.content === 'string' ? entry.content : ''
    const type = isOneOf(entry.type, REPORT_NOTE_TYPES) ? entry.type : undefined
    const metadata = sanitizeReportNoteMetadata(entry.metadata, type)
    const content = repairBlankReportNoteContent(rawContent, type, metadata)

    if (content === null) {
      continue
    }

    const timestamp = sanitizeReportNoteTimestamp(entry.timestamp, week, index)
    const note = stripUndefinedFields({
      id,
      content,
      timestamp,
      ...(type !== undefined ? { type } : {}),
      ...(metadata !== undefined ? { metadata } : {}),
    }) as ReportNote

    notes.push(note)
  }

  return notes
}

const SUBSTANCE_POLICIES = [
  'permitted',
  'restricted',
  'prohibited',
] as const satisfies readonly NonNullable<GameConfig['substancePolicy']>[]

/**
 * Hydration problem 475: clearance thresholds are deduped, non-negative, and strictly increasing.
 * Hydration 547: explicit `[]` is preserved (537 empty-array pattern); missing/invalid uses fallback.
 */
function sanitizeClearanceThresholds(value: unknown, fallback: number[]) {
  if (!Array.isArray(value)) {
    return fallback
  }

  if (value.length === 0) {
    return []
  }

  const sanitized = [
    ...new Set(
      value
        .filter((entry): entry is number => typeof entry === 'number' && Number.isFinite(entry))
        .map((entry) => Math.trunc(entry))
        .filter((entry) => entry >= 0)
    ),
  ].sort((left, right) => left - right)

  const strictlyIncreasing = sanitized.filter(
    (entry, index) => index === 0 || entry > sanitized[index - 1]!
  )

  return strictlyIncreasing.length > 0 ? strictlyIncreasing : fallback
}

/** Hydration 472: agency.supportAvailable is canonical; top-level mirrors agency. */
function reconcileHydratedSupportAvailable(
  topLevel: unknown,
  agencyLevel: unknown,
  fallback?: number
): number | undefined {
  const read = (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : undefined

  const agencyValue = read(agencyLevel)
  const topLevelValue = read(topLevel)

  if (agencyValue !== undefined) {
    return agencyValue
  }

  if (topLevelValue !== undefined) {
    return topLevelValue
  }

  return fallback
}

/** Hydration 473: agency coordination friction fields are canonical; top-level mirrors agency. */
function reconcileHydratedCoordinationFriction(
  topLevelActive: unknown,
  topLevelReason: unknown,
  agencyActive: unknown,
  agencyReason: unknown,
  fallback: { active?: boolean; reason?: string }
): { coordinationFrictionActive?: boolean; coordinationFrictionReason?: string } {
  const active =
    typeof agencyActive === 'boolean'
      ? agencyActive
      : typeof topLevelActive === 'boolean'
        ? topLevelActive
        : fallback.coordinationFrictionActive

  const reason =
    typeof agencyReason === 'string' && agencyReason.length > 0
      ? agencyReason
      : typeof topLevelReason === 'string' && topLevelReason.length > 0
        ? topLevelReason
        : fallback.coordinationFrictionReason

  return {
    ...(typeof active === 'boolean' ? { coordinationFrictionActive: active } : {}),
    ...(typeof reason === 'string' && reason.length > 0
      ? { coordinationFrictionReason: reason }
      : {}),
  }
}

export function getFatigueBand(value: number): FatigueBand {
  if (value >= 45) {
    return 'critical'
  }

  if (value >= 20) {
    return 'strained'
  }

  return 'steady'
}

export function stripGameTemplates(game: GameState): PersistedGame {
  const { templates, ...persistedGame } = game
  void templates
  return stripUndefinedFields(persistedGame)
}

export function buildReportCaseSnapshot(
  currentCase: CaseInstance,
  knowledgeMap?: Record<string, import('../../domain/knowledge').KnowledgeState>
): WeeklyReportCaseSnapshot {
  const snapshot: WeeklyReportCaseSnapshot = {
    caseId: currentCase.id,
    title: currentCase.title,
    kind: currentCase.kind,
    mode: currentCase.mode,
    status: currentCase.status,
    stage: currentCase.stage,
    deadlineRemaining: currentCase.deadlineRemaining,
    durationWeeks: currentCase.durationWeeks,
    weeksRemaining: currentCase.weeksRemaining,
    assignedTeamIds: [...currentCase.assignedTeamIds],
    // SPE-59: Surface canonical knowledge state for this case (per team)
    knowledge: knowledgeMap,
    // SPE-59: Add reveal explanation for provisional/true/context
    revealExplanation: knowledgeMap
      ? Object.entries(knowledgeMap)
          .map(([teamId, ks]) => {
            const parts: string[] = []
            if (ks.provisionalClassification && ks.confirmationState === 'provisional') {
              parts.push(
                `Team ${teamId}: Provisional classification: ${ks.provisionalClassification}`
              )
            }
            if (ks.trueClassification && ks.confirmationState === 'confirmed') {
              parts.push(`Team ${teamId}: Confirmed as: ${ks.trueClassification}`)
            }
            if (ks.contextTag) {
              parts.push(`(Context: ${ks.contextTag})`)
            }
            return parts.join(' ')
          })
          .filter(Boolean)
          .join(' | ')
      : undefined,
  }

  return currentCase.distortion?.length ? propagateDistortion(currentCase, snapshot) : snapshot
}

export function buildReportCaseSnapshots(cases: GameState['cases']) {
  return Object.fromEntries(
    Object.values(cases).map((currentCase) => [
      currentCase.id,
      buildReportCaseSnapshot(currentCase),
    ])
  )
}

export {
  buildReportTeamStatus,
  buildReportTeamStatusEntry,
} from '../../domain/sim/reportTeamStatus'

/** Hydration 507: upper bounds for persisted tuning scalars. */
const MAX_GAME_CONFIG_MAX_ACTIVE_CASES = 50
const MAX_GAME_CONFIG_TRAINING_SLOTS = 32
const MAX_GAME_CONFIG_PARTIAL_MARGIN_ABSOLUTE = 100
const MAX_GAME_CONFIG_STAGE_SCALAR = 10
const MAX_GAME_CONFIG_ATTRITION_PER_WEEK = 50
const MAX_GAME_CONFIG_PROBABILITY_K = 20
const MAX_GAME_CONFIG_WEEKS_PER_YEAR = 104
const MAX_GAME_CONFIG_FUNDING_SCALAR = 1_000_000
const MAX_GAME_CONFIG_CONTAINMENT_DELTA = 1_000

export function sanitizeGameConfig(
  config: unknown,
  fallback: GameConfig,
  options: { invalidAttritionPolicy?: 'fallback' | 'minimum' } = {}
) {
  const invalidAttritionPolicy = options.invalidAttritionPolicy ?? 'fallback'
  const nextConfig = { ...fallback }

  if (!isRecord(config)) {
    return nextConfig
  }

  if (config.maxActiveCases !== undefined) {
    nextConfig.maxActiveCases = clamp(
      sanitizeInteger(config.maxActiveCases as number, fallback.maxActiveCases, 1),
      1,
      MAX_GAME_CONFIG_MAX_ACTIVE_CASES
    )
  }

  if (config.trainingSlots !== undefined) {
    nextConfig.trainingSlots = clamp(
      sanitizeInteger(config.trainingSlots as number, fallback.trainingSlots, 1),
      1,
      MAX_GAME_CONFIG_TRAINING_SLOTS
    )
  }

  if (config.partialMargin !== undefined) {
    const partialMarginCap = Math.min(
      MAX_GAME_CONFIG_PARTIAL_MARGIN_ABSOLUTE,
      resolvePartialMarginUpperBound(nextConfig)
    )

    nextConfig.partialMargin = clamp(
      sanitizeInteger(config.partialMargin as number, fallback.partialMargin, 0),
      0,
      partialMarginCap
    )
  }

  if (config.stageScalar !== undefined) {
    nextConfig.stageScalar = sanitizeFiniteDecimalPreservePrecision(
      config.stageScalar as number,
      fallback.stageScalar,
      0.05,
      MAX_GAME_CONFIG_STAGE_SCALAR
    )
  }

  if (typeof config.challengeModeEnabled === 'boolean') {
    nextConfig.challengeModeEnabled = config.challengeModeEnabled
  }

  if (config.attritionPerWeek !== undefined) {
    const parsedAttrition = sanitizeInteger(
      config.attritionPerWeek as number,
      fallback.attritionPerWeek,
      1
    )

    nextConfig.attritionPerWeek =
      parsedAttrition > MAX_GAME_CONFIG_ATTRITION_PER_WEEK
        ? fallback.attritionPerWeek
        : clamp(parsedAttrition, 1, MAX_GAME_CONFIG_ATTRITION_PER_WEEK)
  }

  if (config.probabilityK !== undefined) {
    nextConfig.probabilityK = sanitizeFiniteDecimalPreservePrecision(
      config.probabilityK as number,
      fallback.probabilityK,
      0.05,
      MAX_GAME_CONFIG_PROBABILITY_K
    )
  }

  if (config.raidCoordinationPenaltyPerExtraTeam !== undefined) {
    nextConfig.raidCoordinationPenaltyPerExtraTeam = sanitizeFiniteDecimalPreservePrecision(
      config.raidCoordinationPenaltyPerExtraTeam as number,
      fallback.raidCoordinationPenaltyPerExtraTeam,
      0,
      1
    )
  }

  if (config.durationModel === 'capacity' || config.durationModel === 'attrition') {
    nextConfig.durationModel = config.durationModel
  }

  if (config.weeksPerYear !== undefined) {
    nextConfig.weeksPerYear = clamp(
      sanitizeInteger(config.weeksPerYear as number, fallback.weeksPerYear, 1),
      1,
      MAX_GAME_CONFIG_WEEKS_PER_YEAR
    )
  }

  if (config.fundingBasePerWeek !== undefined) {
    nextConfig.fundingBasePerWeek = clamp(
      sanitizeInteger(config.fundingBasePerWeek as number, fallback.fundingBasePerWeek, 0),
      0,
      MAX_GAME_CONFIG_FUNDING_SCALAR
    )
  }

  if (config.fundingPerResolution !== undefined) {
    nextConfig.fundingPerResolution = clamp(
      sanitizeInteger(config.fundingPerResolution as number, fallback.fundingPerResolution, 0),
      0,
      MAX_GAME_CONFIG_FUNDING_SCALAR
    )
  }

  if (config.fundingPenaltyPerFail !== undefined) {
    nextConfig.fundingPenaltyPerFail = clamp(
      sanitizeInteger(config.fundingPenaltyPerFail as number, fallback.fundingPenaltyPerFail, 0),
      0,
      MAX_GAME_CONFIG_FUNDING_SCALAR
    )
  }

  if (config.fundingPenaltyPerUnresolved !== undefined) {
    nextConfig.fundingPenaltyPerUnresolved = clamp(
      sanitizeInteger(
        config.fundingPenaltyPerUnresolved as number,
        fallback.fundingPenaltyPerUnresolved,
        0
      ),
      0,
      MAX_GAME_CONFIG_FUNDING_SCALAR
    )
  }

  if (config.containmentWeeklyDecay !== undefined) {
    nextConfig.containmentWeeklyDecay = clamp(
      sanitizeInteger(config.containmentWeeklyDecay as number, fallback.containmentWeeklyDecay, 0),
      0,
      MAX_GAME_CONFIG_CONTAINMENT_DELTA
    )
  }

  if (config.containmentDeltaPerResolution !== undefined) {
    nextConfig.containmentDeltaPerResolution = clamp(
      sanitizeInteger(
        config.containmentDeltaPerResolution as number,
        fallback.containmentDeltaPerResolution,
        0
      ),
      0,
      MAX_GAME_CONFIG_CONTAINMENT_DELTA
    )
  }

  if (config.containmentDeltaPerFail !== undefined) {
    nextConfig.containmentDeltaPerFail = clamp(
      sanitizeInteger(
        config.containmentDeltaPerFail as number,
        fallback.containmentDeltaPerFail,
        -MAX_GAME_CONFIG_CONTAINMENT_DELTA
      ),
      -MAX_GAME_CONFIG_CONTAINMENT_DELTA,
      MAX_GAME_CONFIG_CONTAINMENT_DELTA
    )
  }

  if (config.containmentDeltaPerUnresolved !== undefined) {
    nextConfig.containmentDeltaPerUnresolved = clamp(
      sanitizeInteger(
        config.containmentDeltaPerUnresolved as number,
        fallback.containmentDeltaPerUnresolved,
        -MAX_GAME_CONFIG_CONTAINMENT_DELTA
      ),
      -MAX_GAME_CONFIG_CONTAINMENT_DELTA,
      MAX_GAME_CONFIG_CONTAINMENT_DELTA
    )
  }

  if (config.clearanceThresholds !== undefined) {
    nextConfig.clearanceThresholds = sanitizeClearanceThresholds(
      config.clearanceThresholds,
      fallback.clearanceThresholds
    )
  }

  if (SUBSTANCE_POLICIES.includes(config.substancePolicy as (typeof SUBSTANCE_POLICIES)[number])) {
    nextConfig.substancePolicy = config.substancePolicy as GameConfig['substancePolicy']
  }

  if (!nextConfig.challengeModeEnabled && nextConfig.durationModel === 'attrition') {
    nextConfig.durationModel = 'capacity'
  }

  if (!nextConfig.challengeModeEnabled && config.attritionPerWeek !== undefined) {
    const rawAttrition = config.attritionPerWeek as number

    if (!Number.isFinite(rawAttrition) || rawAttrition < 1) {
      nextConfig.attritionPerWeek =
        invalidAttritionPolicy === 'minimum' ? 1 : fallback.attritionPerWeek
    }
  }

  return nextConfig
}

/** Hydration 571: config.trainingSlots is base capacity; academyTier adds derived slots at runtime. */
function reconcileTrainingCapacity(
  trainingSlots: number,
  academyTier: number,
  fallbackBaseSlots: number
): { trainingSlots: number; academyTier: number } {
  const tier = clamp(sanitizeInteger(academyTier, 0, 0), 0, MAX_ACADEMY_TIER)
  let baseSlots = clamp(
    sanitizeInteger(trainingSlots, fallbackBaseSlots, 1),
    1,
    MAX_GAME_CONFIG_TRAINING_SLOTS
  )

  if (baseSlots < fallbackBaseSlots) {
    baseSlots = fallbackBaseSlots
  }

  if (baseSlots > fallbackBaseSlots + tier) {
    baseSlots = Math.max(fallbackBaseSlots, baseSlots - tier)
  }

  if (baseSlots + tier > MAX_GAME_CONFIG_TRAINING_SLOTS) {
    baseSlots = Math.max(1, MAX_GAME_CONFIG_TRAINING_SLOTS - tier)
  }

  return { trainingSlots: baseSlots, academyTier: tier }
}

function reconcileHydratedClearanceLevel(
  clearanceLevel: number,
  containmentRating: number,
  thresholds: number[]
): number {
  const maxClearance = resolveMaxClearanceLevel(thresholds)
  const derivedClearance = computeClearanceLevel(containmentRating, thresholds)

  return clamp(sanitizeInteger(clearanceLevel, derivedClearance, 1), 1, maxClearance)
}

const TEAM_STATES = [
  'ready',
  'deployed',
  'resolving',
  'recovering',
] as const satisfies readonly TeamState[]

/** Hydration 415: persisted team recovery pressure is a non-negative finite scalar. */
const MAX_TEAM_RECOVERY_PRESSURE = 100
const MISSION_RESOLUTION_OUTCOMES = [
  'success',
  'partial',
  'fail',
  'unresolved',
] as const satisfies readonly MissionResolutionKind[]

const CASE_PRIORITIES = [
  'critical',
  'high',
  'normal',
  'low',
] as const satisfies readonly CasePriority[]

/** Hydration 583–584: case operation event kind/mode allowlists (aligned with 575–576). */
function sanitizeOperationEventCaseKind(value: unknown): CaseKind {
  return isOneOf(value, CASE_KINDS) ? value : 'case'
}

function sanitizeOperationEventCaseMode(value: unknown): CaseMode {
  return isOneOf(value, CASE_MODES) ? value : 'threshold'
}

/** Hydration 586–587: market.shifted catalog + canonical pressure multiplier (aligned with 454). */
function reconcileMarketShiftedFields(
  payload: Record<string, unknown>,
  fallbackFeaturedRecipeId: string
) {
  const pressure = isOneOf(payload.pressure, MARKET_PRESSURES) ? payload.pressure : 'stable'
  const featuredRecipeId = sanitizeFeaturedRecipeId(
    payload.featuredRecipeId,
    fallbackFeaturedRecipeId
  )
  const recipe = getProductionRecipe(featuredRecipeId)
  const catalogName = recipe?.name ?? featuredRecipeId
  const featuredRecipeName =
    typeof payload.featuredRecipeName === 'string' &&
    payload.featuredRecipeName.trim() === catalogName
      ? payload.featuredRecipeName.trim()
      : catalogName
  const canonicalCostMultiplier = getCanonicalMarketCostMultiplier(pressure)
  const boundedCostMultiplier = sanitizeFiniteDecimalPreservePrecision(
    payload.costMultiplier as number | undefined,
    canonicalCostMultiplier,
    0.5,
    2
  )
  const costMultiplier =
    boundedCostMultiplier === canonicalCostMultiplier
      ? boundedCostMultiplier
      : canonicalCostMultiplier

  return { featuredRecipeId, featuredRecipeName, pressure, costMultiplier }
}

/** Hydration 588: reconcile fallout tick outcome with risk and before/after metrics. */
function reconcileEmergencyGrayMarketFalloutTickFields(payload: Record<string, unknown>) {
  const outcome =
    payload.outcome === 'resolved_closed' ? 'resolved_closed' : 'escalated_pending_oversight'
  const falloutRiskBefore = outcome === 'resolved_closed' ? 'costly' : 'risk'
  const falloutRiskAfter = outcome === 'resolved_closed' ? 'none' : 'costly'
  const fundingBefore = sanitizeInteger(payload.fundingBefore as number | undefined, 0, 0)
  const fundingAfterRaw = sanitizeInteger(
    payload.fundingAfter as number | undefined,
    fundingBefore,
    0
  )
  const fundingAfter = Math.min(fundingAfterRaw, fundingBefore)
  const containmentRatingBefore = sanitizeInteger(
    payload.containmentRatingBefore as number | undefined,
    0,
    0
  )
  const containmentRatingAfterRaw = sanitizeInteger(
    payload.containmentRatingAfter as number | undefined,
    containmentRatingBefore,
    0
  )
  const containmentRatingAfter = Math.min(containmentRatingAfterRaw, containmentRatingBefore)

  return {
    outcome,
    falloutRiskBefore,
    falloutRiskAfter,
    fundingBefore,
    fundingAfter,
    containmentRatingBefore,
    containmentRatingAfter,
  }
}

/** Hydration 589: academy upgrade tier progression and funding debit consistency. */
function reconcileAcademyUpgradeFields(payload: Record<string, unknown>) {
  const tierBefore = clamp(
    sanitizeInteger(payload.tierBefore as number | undefined, 0, 0),
    0,
    MAX_ACADEMY_TIER
  )
  const cost = sanitizeInteger(payload.cost as number | undefined, 0, 0)
  const requestedTierAfter = sanitizeInteger(
    payload.tierAfter as number | undefined,
    tierBefore + 1,
    0
  )
  const tierAfter =
    tierBefore >= MAX_ACADEMY_TIER
      ? MAX_ACADEMY_TIER
      : clamp(Math.max(tierBefore + 1, requestedTierAfter), tierBefore + 1, MAX_ACADEMY_TIER)
  const fundingBefore = sanitizeInteger(payload.fundingBefore as number | undefined, 0, 0)
  const expectedFundingAfter = Math.max(0, fundingBefore - cost)
  const fundingAfterRaw = sanitizeInteger(
    payload.fundingAfter as number | undefined,
    expectedFundingAfter,
    0
  )
  const fundingAfter =
    fundingAfterRaw === expectedFundingAfter ? fundingAfterRaw : expectedFundingAfter

  return { tierBefore, tierAfter, fundingBefore, fundingAfter, cost }
}

/** SPE-455: only open or in-progress cases may remain in the priority queue. */
const CASE_QUEUE_ELIGIBLE_STATUSES = [
  'open',
  'in_progress',
] as const satisfies readonly CaseStatus[]

const CONTRACT_STRATEGY_TAGS = [
  'income',
  'materials',
  'research',
  'progression',
] as const satisfies readonly ContractStrategyTag[]

const CONTRACT_RISK_LEVELS = [
  'low',
  'medium',
  'moderate',
  'high',
  'severe',
  'extreme',
] as const satisfies readonly ContractRiskLevel[]

const CONTRACT_HISTORY_OUTCOMES = [
  'success',
  'partial',
  'fail',
  'unresolved',
  'none',
] as const satisfies readonly (MissionResolutionKind | 'none')[]

const RESEARCH_PROJECT_STATUSES = [
  'locked',
  'available',
  'queued',
  'active',
  'completed',
  'blocked',
] as const satisfies readonly ResearchProjectStatus[]

const FACILITY_STATUSES = [
  'available',
  'active',
  'upgrading',
  'inactive',
  'locked',
] as const satisfies readonly FacilityStatus[]

const FACILITY_EFFECT_KEYS = [
  'researchSlots',
  'researchSpeedMultiplier',
  'dataPoolPerWeek',
  'materialsPoolPerWeek',
  'trainingSlots',
  'recoveryThroughput',
  'fabricationYield',
] as const satisfies readonly (keyof FacilityEffect)[]

const RELATIONSHIP_SNAPSHOT_REASONS = [
  'mission_success',
  'mission_partial',
  'mission_fail',
  'passive_drift',
  'external_event',
  'reconciliation',
  'spontaneous_event',
  'betrayal',
] as const satisfies readonly NonNullable<RelationshipSnapshot['reason']>[]

const CONTRACT_DEBRIEF_ENTITY_KINDS = [
  'staff',
  'subject',
  'route',
  'evidence',
  'faction',
] as const satisfies readonly ContractDebriefChangedEntityKind[]

const HUB_DISTRICT_KEYS = ['central_hub', 'industrial_zone'] as const
const HUB_ACCESS_STATES = ['allowed', 'blocked', 'risky', 'costly'] as const
const HUB_SANCTION_LEVELS = ['sanctioned', 'covert', 'tolerated', 'unsanctioned'] as const

const RELATIONSHIP_VALUE_MIN = -2
const RELATIONSHIP_VALUE_MAX = 2
const MAX_RESEARCH_SLOTS = 12
const MAX_RESEARCH_SPEED_MULTIPLIER = 8
const MAX_RESEARCH_POOL = 1_000_000
const MAX_FACILITY_LEVEL = 99
const MAX_DEBRIEF_SUMMARY_LENGTH = 280
const MAX_RELATIONSHIP_HISTORY_ENTRIES = 500

const EXTERNAL_SUPPORT_ASSET_CLASSES = [
  'contractor',
  'informant',
  'auxiliary',
  'defector',
] as const satisfies readonly ExternalSupportAssetClass[]

const CONTACT_STATUSES = [
  'active',
  'inactive',
  'hostile',
] as const satisfies readonly Contact['status'][]

const REPUTATION_TIERS = [
  'hostile',
  'unfriendly',
  'neutral',
  'friendly',
  'allied',
] as const satisfies readonly ReputationTier[]

const KNOWN_FACTION_IDS = new Set(FACTION_DEFINITIONS.map((faction) => faction.id))

function sanitizeTagList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  const seen = new Set<string>()
  const tags: string[] = []

  for (const tag of value) {
    if (typeof tag !== 'string') {
      continue
    }

    const trimmed = tag.trim()
    if (!trimmed || seen.has(trimmed)) {
      continue
    }

    seen.add(trimmed)
    tags.push(trimmed)
  }

  return tags
}

const TEAM_CATEGORIES = [
  'containment_strike_team',
  'investigation_cell',
  'liaison_stabilization_unit',
  'balanced_rapid_response_team',
] as const satisfies readonly TeamCategory[]

/** Hydration 409: bounded TeamCategory enum only; invalid free-text is cleared. */
function sanitizeTeamCategoryField(value: unknown): TeamCategory | undefined {
  return typeof value === 'string' && (TEAM_CATEGORIES as readonly string[]).includes(value)
    ? (value as TeamCategory)
    : undefined
}

function sanitizeTeamStateKind(value: unknown, fallback: TeamState): TeamState {
  return isOneOf(value, TEAM_STATES) ? value : fallback
}

function finiteCandidateWeek(value: unknown, campaignWeek?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined
  }

  let week = Math.max(1, Math.trunc(value))
  if (campaignWeek !== undefined) {
    week = Math.min(week, campaignWeek)
  }

  return week
}

function sanitizeRevealLevel(value: unknown): CandidateRevealLevel {
  if (value === 0 || value === 1 || value === 2) {
    return value
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.min(2, Math.max(0, Math.trunc(value))) as CandidateRevealLevel
  }

  return 0
}

function reconcileRecruitmentEventRevealLevel(
  stage: CandidateScoutStage,
  revealLevel: CandidateRevealLevel
): CandidateRevealLevel {
  if (stage >= 2) {
    return 2
  }

  return Math.max(1, revealLevel) as CandidateRevealLevel
}

function sanitizeCandidateCostEstimate(value: unknown): CandidateCostEstimate | undefined {
  return value === 'low' || value === 'moderate' || value === 'high' || value === 'unknown'
    ? value
    : undefined
}

function sanitizeReputationTierRef(value: unknown): Candidate['sourceRequiredTier'] | undefined {
  return isOneOf(value, REPUTATION_TIERS) ? value : undefined
}

function sanitizeCandidateScoutReport(
  value: unknown,
  campaignWeek?: number
): CandidateScoutReport | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const stage: CandidateScoutStage | undefined =
    value.stage === 1 || value.stage === 2 || value.stage === 3 ? value.stage : undefined
  const projectedTier = isOneOf(value.projectedTier, EXACT_POTENTIAL_TIERS)
    ? value.projectedTier
    : undefined

  if (!stage || !projectedTier) {
    return undefined
  }

  const confidence = isOneOf(value.confidence, SCOUT_CONFIDENCES) ? value.confidence : 'low'
  const confirmedTier = isOneOf(value.confirmedTier, EXACT_POTENTIAL_TIERS)
    ? value.confirmedTier
    : undefined
  const exactKnown = value.exactKnown === true || confidence === 'confirmed'
  const scoutedWeek = finiteCandidateWeek(value.scoutedWeek, campaignWeek)

  return {
    stage,
    projectedTier,
    exactKnown,
    confidence,
    ...(confirmedTier ? { confirmedTier } : {}),
    ...(scoutedWeek !== undefined ? { scoutedWeek } : {}),
  }
}

function sanitizePassiveBonuses(value: unknown) {
  if (!isRecord(value)) {
    return undefined
  }

  const next = Object.fromEntries(
    Object.entries(value).filter(
      ([key, bonus]) =>
        typeof key === 'string' &&
        key.length > 0 &&
        typeof bonus === 'number' &&
        Number.isFinite(bonus)
    )
  )

  return Object.keys(next).length > 0 ? next : undefined
}

function sanitizeCandidateEvaluation(
  value: unknown,
  revealLevel: CandidateRevealLevel
): Candidate['evaluation'] | undefined {
  if (!isRecord(value)) {
    return buildCandidateEvaluation(revealLevel, {})
  }

  const rumorTags = [
    ...new Set(
      (Array.isArray(value.rumorTags) ? value.rumorTags : [])
        .filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
        .map((tag) => tag.trim())
    ),
  ]

  const overall =
    typeof value.overall === 'number' && Number.isFinite(value.overall)
      ? clamp(Math.round(value.overall), 0, 100)
      : typeof value.overallValue === 'number' && Number.isFinite(value.overallValue)
        ? clamp(Math.round(value.overallValue), 0, 100)
        : undefined

  const potentialTier =
    value.potentialTier === 'low' || value.potentialTier === 'mid' || value.potentialTier === 'high'
      ? value.potentialTier
      : undefined

  return buildCandidateEvaluation(revealLevel, {
    overall,
    potentialTier,
    rumorTags,
    impression: typeof value.impression === 'string' ? value.impression : undefined,
    teamwork: typeof value.teamwork === 'string' ? value.teamwork : undefined,
    outlook: typeof value.outlook === 'string' ? value.outlook : undefined,
  })
}

function sanitizeCandidateEntry(entry: unknown, campaignWeek?: number): Candidate | null {
  if (!isRecord(entry)) {
    return null
  }

  const id = typeof entry.id === 'string' ? entry.id.trim() : ''
  const name = typeof entry.name === 'string' ? entry.name.trim() : ''

  if (!id || !name) {
    return null
  }

  if (!isOneOf(entry.category, RECRUIT_CATEGORIES)) {
    return null
  }

  const category = entry.category as CandidateCategory
  const revealLevel = sanitizeRevealLevel(entry.revealLevel)
  const evaluation = sanitizeCandidateEvaluation(entry.evaluation, revealLevel)

  if (!evaluation) {
    return null
  }

  const age =
    typeof entry.age === 'number' && Number.isFinite(entry.age)
      ? clamp(Math.trunc(entry.age), 18, 72)
      : 30
  let hireStatus = normalizeCandidateHireStatus(
    (typeof entry.hireStatus === 'string'
      ? entry.hireStatus
      : 'available') as CandidatePipelineStatus
  )
  let expiryWeek = finiteCandidateWeek(entry.expiryWeek, campaignWeek) ?? campaignWeek ?? 1
  const weeklyCostRaw =
    typeof entry.weeklyCost === 'number' && Number.isFinite(entry.weeklyCost)
      ? Math.max(0, Math.trunc(entry.weeklyCost))
      : typeof entry.weeklyWage === 'number' && Number.isFinite(entry.weeklyWage)
        ? Math.max(0, Math.trunc(entry.weeklyWage))
        : undefined
  const weeklyCost = weeklyCostRaw
  const weeklyWage =
    typeof entry.weeklyWage === 'number' && Number.isFinite(entry.weeklyWage)
      ? Math.max(0, Math.trunc(entry.weeklyWage))
      : weeklyCost
  const costEstimate =
    sanitizeCandidateCostEstimate(entry.costEstimate) ?? deriveCandidateCostEstimate(weeklyCost)
  const portraitId =
    typeof entry.portraitId === 'string' && entry.portraitId.trim().length > 0
      ? entry.portraitId.trim()
      : undefined
  const sourceFactionId =
    typeof entry.sourceFactionId === 'string' && entry.sourceFactionId.trim().length > 0
      ? entry.sourceFactionId.trim()
      : undefined
  const sourceFactionName =
    typeof entry.sourceFactionName === 'string' && entry.sourceFactionName.trim().length > 0
      ? entry.sourceFactionName.trim()
      : undefined
  const sourceContactId =
    typeof entry.sourceContactId === 'string' && entry.sourceContactId.trim().length > 0
      ? entry.sourceContactId.trim()
      : undefined
  const sourceContactName =
    typeof entry.sourceContactName === 'string' && entry.sourceContactName.trim().length > 0
      ? entry.sourceContactName.trim()
      : undefined
  const sourceSummary =
    typeof entry.sourceSummary === 'string' && entry.sourceSummary.trim().length > 0
      ? entry.sourceSummary.trim()
      : undefined
  const origin =
    typeof entry.origin === 'string' && entry.origin.trim().length > 0
      ? entry.origin.trim()
      : undefined
  const sourceDisposition =
    entry.sourceDisposition === 'supportive' || entry.sourceDisposition === 'adversarial'
      ? entry.sourceDisposition
      : undefined
  const sourceRequiredTier = sanitizeReputationTierRef(entry.sourceRequiredTier)
  const sourceMaxTier = sanitizeReputationTierRef(entry.sourceMaxTier)
  const roleInclination =
    typeof entry.roleInclination === 'string' && entry.roleInclination.trim().length > 0
      ? entry.roleInclination.trim()
      : undefined
  const skills = [
    ...new Set(
      (Array.isArray(entry.skills) ? entry.skills : [])
        .filter((skill): skill is string => typeof skill === 'string' && skill.trim().length > 0)
        .map((skill) => skill.trim())
    ),
  ]
  const liabilities = [
    ...new Set(
      (Array.isArray(entry.liabilities) ? entry.liabilities : [])
        .filter(
          (liability): liability is string =>
            typeof liability === 'string' && liability.trim().length > 0
        )
        .map((liability) => liability.trim())
    ),
  ]
  const availabilityWindow = isRecord(entry.availabilityWindow)
    ? (() => {
        const opensWeek = finiteCandidateWeek(entry.availabilityWindow.opensWeek, campaignWeek)
        const closesWeek = finiteCandidateWeek(entry.availabilityWindow.closesWeek, campaignWeek)

        if (opensWeek === undefined || closesWeek === undefined) {
          return undefined
        }

        return {
          opensWeek,
          closesWeek: Math.max(opensWeek, closesWeek),
        }
      })()
    : undefined
  const funnelStage = normalizeRecruitmentFunnelStage(entry.funnelStage)
  // Recruitment funnel metadata (created/lastUpdated) is informational and must survive
  // save/load round-trips even when it is out-of-range relative to current campaign week.
  // Only lower-bound normalize to 1..N-safe finite weeks.
  let createdWeek = finiteCandidateWeek(entry.createdWeek)
  let lastUpdatedWeek = finiteCandidateWeek(entry.lastUpdatedWeek)
  let normalizedAvailabilityWindow = availabilityWindow

  if (createdWeek !== undefined && lastUpdatedWeek !== undefined && lastUpdatedWeek < createdWeek) {
    lastUpdatedWeek = createdWeek
  }

  const cappedCampaignWeek =
    campaignWeek !== undefined ? Math.max(1, Math.trunc(campaignWeek)) : undefined

  if (
    cappedCampaignWeek !== undefined &&
    hireStatus === 'available' &&
    (expiryWeek < cappedCampaignWeek ||
      (normalizedAvailabilityWindow !== undefined &&
        normalizedAvailabilityWindow.closesWeek < cappedCampaignWeek))
  ) {
    hireStatus = 'expired'
  }

  if (normalizedAvailabilityWindow !== undefined) {
    expiryWeek = Math.max(expiryWeek, normalizedAvailabilityWindow.closesWeek)
  }

  if (cappedCampaignWeek !== undefined && hireStatus === 'expired') {
    createdWeek =
      createdWeek !== undefined ? Math.min(createdWeek, cappedCampaignWeek) : cappedCampaignWeek
    lastUpdatedWeek = cappedCampaignWeek
    expiryWeek = cappedCampaignWeek
    normalizedAvailabilityWindow = {
      opensWeek: cappedCampaignWeek,
      closesWeek: cappedCampaignWeek,
    }
  }

  const lossReason =
    typeof entry.lossReason === 'string' && entry.lossReason.trim().length > 0
      ? entry.lossReason.trim()
      : undefined
  const transitionNotes = [
    ...new Set(
      (Array.isArray(entry.transitionNotes) ? entry.transitionNotes : [])
        .filter((note): note is string => typeof note === 'string' && note.trim().length > 0)
        .map((note) => note.trim())
    ),
  ]
  const actualPotentialTier = isOneOf(entry.actualPotentialTier, EXACT_POTENTIAL_TIERS)
    ? entry.actualPotentialTier
    : undefined
  const scoutReport = sanitizeCandidateScoutReport(entry.scoutReport, campaignWeek)

  const shared = {
    id,
    name,
    age,
    category,
    hireStatus,
    revealLevel,
    expiryWeek,
    evaluation,
    ...(portraitId ? { portraitId } : {}),
    ...(weeklyCost !== undefined ? { weeklyCost, weeklyWage: weeklyWage ?? weeklyCost } : {}),
    ...(weeklyWage !== undefined && weeklyCost === undefined ? { weeklyWage } : {}),
    ...(costEstimate ? { costEstimate } : {}),
    ...(sourceFactionId ? { sourceFactionId } : {}),
    ...(sourceFactionName ? { sourceFactionName } : {}),
    ...(sourceContactId ? { sourceContactId } : {}),
    ...(sourceContactName ? { sourceContactName } : {}),
    ...(sourceSummary ? { sourceSummary } : {}),
    ...(origin ? { origin } : {}),
    ...(sourceDisposition ? { sourceDisposition } : {}),
    ...(sourceRequiredTier ? { sourceRequiredTier } : {}),
    ...(sourceMaxTier ? { sourceMaxTier } : {}),
    ...(roleInclination ? { roleInclination } : {}),
    ...(skills.length > 0 ? { skills } : {}),
    ...(liabilities.length > 0 ? { liabilities } : {}),
    ...(normalizedAvailabilityWindow ? { availabilityWindow: normalizedAvailabilityWindow } : {}),
    funnelStage,
    ...(createdWeek !== undefined ? { createdWeek } : {}),
    ...(lastUpdatedWeek !== undefined ? { lastUpdatedWeek } : {}),
    ...(lossReason ? { lossReason } : {}),
    ...(transitionNotes.length > 0 ? { transitionNotes } : {}),
    ...(actualPotentialTier ? { actualPotentialTier } : {}),
    ...(scoutReport ? { scoutReport } : {}),
  }

  if (category === 'agent') {
    if (!isRecord(entry.agentData)) {
      return null
    }

    const agentData = entry.agentData
    const role =
      agentData.role === 'field' ||
      agentData.role === 'analyst' ||
      agentData.role === 'containment' ||
      agentData.role === 'support' ||
      agentData.role === 'combat' ||
      agentData.role === 'investigation'
        ? agentData.role
        : 'field'
    const specialization =
      typeof agentData.specialization === 'string' && agentData.specialization.trim().length > 0
        ? agentData.specialization.trim()
        : role

    return {
      ...shared,
      category: 'agent',
      agentData: {
        role,
        specialization,
        traits: [
          ...new Set(
            (Array.isArray(agentData.traits) ? agentData.traits : []).filter(
              (trait): trait is string => typeof trait === 'string' && trait.length > 0
            )
          ),
        ],
        ...(typeof agentData.growthProfile === 'string' && agentData.growthProfile.length > 0
          ? { growthProfile: agentData.growthProfile }
          : {}),
        ...(isRecord(agentData.stats)
          ? {
              stats: {
                combat: clamp(Math.round(Number(agentData.stats.combat) || 0), 0, 100),
                investigation: clamp(
                  Math.round(Number(agentData.stats.investigation) || 0),
                  0,
                  100
                ),
                utility: clamp(Math.round(Number(agentData.stats.utility) || 0), 0, 100),
                social: clamp(Math.round(Number(agentData.stats.social) || 0), 0, 100),
              },
            }
          : {}),
        ...(isRecord(agentData.visibleStats) ? { visibleStats: agentData.visibleStats } : {}),
        ...(isRecord(agentData.domainStats) ? { domainStats: agentData.domainStats } : {}),
        ...(isRecord(agentData.visibleDomainStats)
          ? { visibleDomainStats: agentData.visibleDomainStats }
          : {}),
      },
    }
  }

  if (category === 'staff') {
    if (!isRecord(entry.staffData)) {
      return null
    }

    const specialtyRaw = entry.staffData.specialty
    const specialty: StaffCandidateSpecialty =
      specialtyRaw === 'intel' ||
      specialtyRaw === 'logistics' ||
      specialtyRaw === 'fabrication' ||
      specialtyRaw === 'analysis' ||
      specialtyRaw === 'intelligence'
        ? specialtyRaw
        : 'analysis'
    const efficiency =
      typeof entry.staffData.efficiency === 'number' && Number.isFinite(entry.staffData.efficiency)
        ? clamp(Math.round(entry.staffData.efficiency), 0, 100)
        : undefined

    return {
      ...shared,
      category: 'staff',
      staffData: {
        specialty: normalizeStaffCandidateSpecialty(specialty),
        ...(efficiency !== undefined ? { efficiency } : {}),
        ...(typeof entry.staffData.visibleEfficiency === 'number' &&
        Number.isFinite(entry.staffData.visibleEfficiency)
          ? {
              visibleEfficiency: clamp(Math.round(entry.staffData.visibleEfficiency), 0, 100),
            }
          : {}),
        ...(typeof entry.staffData.assignmentType === 'string' &&
        entry.staffData.assignmentType.length > 0
          ? { assignmentType: entry.staffData.assignmentType }
          : {}),
        ...(() => {
          const passiveBonuses = sanitizePassiveBonuses(entry.staffData.passiveBonuses)
          return passiveBonuses ? { passiveBonuses } : {}
        })(),
      },
    }
  }

  if (category === 'instructor') {
    if (!isRecord(entry.instructorData)) {
      return null
    }

    const instructorSpecialty = isOneOf(entry.instructorData.instructorSpecialty, STAT_KEYS)
      ? entry.instructorData.instructorSpecialty
      : 'combat'
    const efficiency =
      typeof entry.instructorData.efficiency === 'number' &&
      Number.isFinite(entry.instructorData.efficiency)
        ? clamp(Math.round(entry.instructorData.efficiency), 0, 100)
        : 70

    return {
      ...shared,
      category: 'instructor',
      instructorData: {
        instructorSpecialty,
        efficiency,
        ...(typeof entry.instructorData.visibleEfficiency === 'number' &&
        Number.isFinite(entry.instructorData.visibleEfficiency)
          ? {
              visibleEfficiency: clamp(Math.round(entry.instructorData.visibleEfficiency), 0, 100),
            }
          : {}),
      },
    }
  }

  if (category === 'specialist' || category === 'fieldTech' || category === 'analyst') {
    if (!isRecord(entry.specialistData)) {
      return null
    }

    const specialty =
      typeof entry.specialistData.specialty === 'string' &&
      entry.specialistData.specialty.trim().length > 0
        ? entry.specialistData.specialty.trim()
        : category
    const efficiency =
      typeof entry.specialistData.efficiency === 'number' &&
      Number.isFinite(entry.specialistData.efficiency)
        ? clamp(Math.round(entry.specialistData.efficiency), 0, 100)
        : undefined
    const focus =
      typeof entry.specialistData.focus === 'string' && entry.specialistData.focus.trim().length > 0
        ? entry.specialistData.focus.trim()
        : undefined

    return {
      ...shared,
      category,
      specialistData: {
        specialty,
        ...(efficiency !== undefined ? { efficiency } : {}),
        ...(focus ? { focus } : {}),
      },
    }
  }

  return null
}

/** Hydration 478: recruitment candidate records beyond id/name checks. */
export function sanitizeCandidateList(value: unknown, campaignWeek?: number): Candidate[] {
  if (!Array.isArray(value)) {
    return []
  }

  const seen = new Set<string>()
  const next: Candidate[] = []

  for (const entry of value) {
    const sanitized = sanitizeCandidateEntry(entry, campaignWeek)
    if (!sanitized || seen.has(sanitized.id)) {
      continue
    }

    seen.add(sanitized.id)
    next.push(sanitized)
  }

  return next
}

/** SPE-312/479: canonical candidates own; recruitmentPool mirrors on hydrate. */
export function sanitizeCandidatesRecruitment(
  candidatesValue: unknown,
  recruitmentPoolValue: unknown,
  fallback: GameState['candidates'],
  campaignWeek?: number
): GameState['candidates'] {
  const canonical = sanitizeCandidateList(candidatesValue, campaignWeek)
  const mirror = sanitizeCandidateList(recruitmentPoolValue, campaignWeek)

  if (canonical.length > 0) {
    return canonical
  }

  if (mirror.length > 0) {
    return mirror
  }

  return fallback
}

function sanitizeAgentEquipmentSlots(agent: Agent): Agent {
  const nextSlots: NonNullable<Agent['equipmentSlots']> = {}

  for (const slot of EQUIPMENT_SLOT_KINDS) {
    const itemId = getEquipmentSlotItemId(agent.equipmentSlots, slot)

    if (itemId) {
      nextSlots[slot] = itemId
    }
  }

  return {
    ...agent,
    equipmentSlots: nextSlots,
  }
}

/** SPE-343: drop equipment quality keys that no longer match slotted items. */
function reconcileAgentEquipment(agent: Agent): Agent {
  const slottedItemIds = new Set(
    EQUIPMENT_SLOT_KINDS.map((slot) => getEquipmentSlotItemId(agent.equipmentSlots, slot)).filter(
      (itemId): itemId is string => typeof itemId === 'string' && itemId.length > 0
    )
  )

  return {
    ...agent,
    equipment: Object.fromEntries(
      Object.entries(agent.equipment ?? {}).filter(([itemId]) => slottedItemIds.has(itemId))
    ),
  }
}

const WEEKLY_REPORT_CASE_BUCKET_KEYS = [
  'resolvedCases',
  'failedCases',
  'partialCases',
  'progressedCases',
  'newCases',
  'spawnedCases',
  'unresolvedTriggers',
] as const

/** Hydration 503: each case id may appear in only one outcome bucket (highest-priority wins). */
function reconcileWeeklyReportCaseBuckets(buckets: {
  newCases: string[]
  progressedCases: string[]
  resolvedCases: string[]
  failedCases: string[]
  partialCases: string[]
  unresolvedTriggers: string[]
  spawnedCases: string[]
}) {
  const claimed = new Set<string>()
  const next = { ...buckets }

  for (const key of WEEKLY_REPORT_CASE_BUCKET_KEYS) {
    next[key] = next[key].filter((caseId) => {
      if (claimed.has(caseId)) {
        return false
      }

      claimed.add(caseId)
      return true
    })
  }

  return next
}

/** Hydration 504: keep aligned campaign dates; recompute when week fields drift. */
function sanitizeWeeklyReportDate(
  value: unknown,
  week: number,
  calendarConfig: ReturnType<typeof resolveCalendarConfig>
): CampaignDate | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const canonical = getCampaignDate(week, calendarConfig)
  const absoluteWeek = sanitizeInteger(value.absoluteWeek as number | undefined, -1, 0)

  if (absoluteWeek !== week) {
    return canonical
  }

  const year = sanitizeInteger(value.year as number | undefined, -1, 1)
  const weekOfYear = sanitizeInteger(value.weekOfYear as number | undefined, -1, 1)
  const season = value.season

  if (
    season === canonical.season &&
    year === canonical.year &&
    weekOfYear === canonical.weekOfYear
  ) {
    return {
      absoluteWeek: week,
      year: canonical.year,
      weekOfYear: canonical.weekOfYear,
      season: canonical.season,
    }
  }

  return canonical
}

/** SPE-339: trim, dedupe, and keep ids present in live cases or report snapshots. */
function sanitizeWeeklyReportCaseIdList(value: unknown, allowedCaseIds: Set<string>) {
  if (!Array.isArray(value)) {
    return []
  }

  const seen = new Set<string>()
  const next: string[] = []

  for (const entry of value) {
    if (typeof entry !== 'string') {
      continue
    }

    const caseId = entry.trim()

    if (caseId.length === 0 || seen.has(caseId) || !allowedCaseIds.has(caseId)) {
      continue
    }

    seen.add(caseId)
    next.push(caseId)
  }

  return next
}

function buildWeeklyReportAllowedCaseIds(
  cases: GameState['cases'],
  caseSnapshots: Record<Id, WeeklyReportCaseSnapshot>
) {
  return new Set([...Object.keys(cases), ...Object.keys(caseSnapshots)])
}

function resolveWeeklyReportMaxStageCap(
  cases: GameState['cases'],
  caseSnapshots: Record<Id, WeeklyReportCaseSnapshot>
) {
  const snapshotStageCap = Math.max(
    0,
    ...Object.values(caseSnapshots).map((snapshot) => snapshot.stage)
  )
  const liveStageCap = Math.max(0, ...Object.values(cases).map((currentCase) => currentCase.stage))

  return Math.max(snapshotStageCap, liveStageCap)
}

/** Hydration 480: staff roster records (support + instructors). */
export function sanitizeStaffMap(
  value: unknown,
  agents: GameState['agents'],
  fallback: GameState['staff']
): GameState['staff'] {
  if (!isRecord(value)) {
    return fallback
  }

  const knownAgentIds = new Set(Object.keys(agents))
  const next: Record<string, StaffData> = {}

  for (const [staffId, entry] of Object.entries(value)) {
    if (!isRecord(entry) || staffId.length === 0) {
      continue
    }

    if (entry.role === 'instructor') {
      const instructorSpecialty = isOneOf(entry.instructorSpecialty, STAT_KEYS)
        ? (entry.instructorSpecialty as StatKey)
        : 'combat'
      const efficiency =
        typeof entry.efficiency === 'number' && Number.isFinite(entry.efficiency)
          ? clamp(Math.round(entry.efficiency), 0, 100)
          : 70
      const name =
        typeof entry.name === 'string' && entry.name.trim().length > 0 ? entry.name.trim() : staffId
      const assignedAgentId =
        typeof entry.assignedAgentId === 'string' && knownAgentIds.has(entry.assignedAgentId)
          ? entry.assignedAgentId
          : undefined

      next[staffId] = {
        role: 'instructor',
        name,
        efficiency,
        instructorSpecialty,
        ...(assignedAgentId ? { assignedAgentId } : {}),
      }
      continue
    }

    const specialtyRaw = entry.specialty
    const specialty: StaffCandidateSpecialty =
      specialtyRaw === 'intel' ||
      specialtyRaw === 'logistics' ||
      specialtyRaw === 'fabrication' ||
      specialtyRaw === 'analysis' ||
      specialtyRaw === 'intelligence'
        ? specialtyRaw
        : 'analysis'
    const efficiency =
      typeof entry.efficiency === 'number' && Number.isFinite(entry.efficiency)
        ? clamp(Math.round(entry.efficiency), 0, 100)
        : undefined
    const passiveBonuses = sanitizePassiveBonuses(entry.passiveBonuses)

    next[staffId] = {
      specialty: normalizeStaffCandidateSpecialty(specialty),
      ...(efficiency !== undefined ? { efficiency } : {}),
      ...(typeof entry.visibleEfficiency === 'number' && Number.isFinite(entry.visibleEfficiency)
        ? { visibleEfficiency: clamp(Math.round(entry.visibleEfficiency), 0, 100) }
        : {}),
      ...(typeof entry.assignmentType === 'string' && entry.assignmentType.length > 0
        ? { assignmentType: entry.assignmentType }
        : {}),
      ...(passiveBonuses ? { passiveBonuses } : {}),
    }
  }

  return Object.keys(next).length > 0 ? next : fallback
}

export interface SanitizeAgentsMapContext {
  cases?: GameState['cases']
  teams?: GameState['teams']
  campaignWeek?: number
}

/** SPE-294: sanitize agent roster records beyond shallow object checks. */
export function sanitizeAgentsMap(
  value: unknown,
  fallback: GameState['agents'],
  context: SanitizeAgentsMapContext = {}
): GameState['agents'] {
  if (!isRecord(value)) {
    return fallback
  }

  const next: Record<string, Agent> = {}
  const knownAgentIds = new Set<string>([
    ...Object.keys(fallback),
    ...Object.keys(value).filter((agentId) => isRecord(value[agentId])),
  ])

  for (const [agentId, entry] of Object.entries(value)) {
    if (!isRecord(entry) || typeof entry.id !== 'string' || entry.id !== agentId) {
      continue
    }

    const fallbackAgent = fallback[agentId]
    const merged = fallbackAgent
      ? { ...fallbackAgent, ...(entry as Agent), id: agentId }
      : ({ ...(entry as Agent), id: agentId } as Agent)

    if (!merged.baseStats && fallbackAgent?.baseStats) {
      merged.baseStats = fallbackAgent.baseStats
    }

    if (!merged.baseStats) {
      continue
    }

    let normalized = normalizeAgent(reconcileAgentEquipment(sanitizeAgentEquipmentSlots(merged)), {
      knownAgentIds,
      fallbackBaseStats: fallbackAgent?.baseStats ?? merged.baseStats,
      campaignWeek: context.campaignWeek,
    })

    if (context.cases && context.teams) {
      const assignment = reconcileAgentAssignmentAgainstGame(
        normalized.assignment ?? createDefaultAgentAssignmentState(),
        context.cases,
        context.teams
      )
      // Recompute derived readiness profile after assignment repair so hydration does not
      // carry stale deployability/coverage state across save/load round-trips.
      normalized = normalizeAgent(
        {
          ...normalized,
          assignment,
        },
        {
          knownAgentIds,
          fallbackBaseStats: fallbackAgent?.baseStats ?? merged.baseStats,
          campaignWeek: context.campaignWeek,
        }
      )
    }

    next[agentId] = normalized
  }

  return Object.keys(next).length > 0 ? next : fallback
}

function resolveCanonicalTeamMemberIds(
  entry: Record<string, unknown>,
  agentIds: Set<string>
): Id[] {
  const memberIds = Array.isArray(entry.memberIds)
    ? entry.memberIds.filter((id): id is string => typeof id === 'string' && agentIds.has(id))
    : []
  const legacyAgentIds = Array.isArray(entry.agentIds)
    ? entry.agentIds.filter((id): id is string => typeof id === 'string' && agentIds.has(id))
    : []

  const source = memberIds.length > 0 ? memberIds : legacyAgentIds

  return [...new Set(source)]
}

function sanitizeTeamRecoveryPressure(value: unknown): number | undefined {
  if (value === undefined) {
    return undefined
  }

  if (typeof value !== 'number') {
    return undefined
  }

  if (!Number.isFinite(value)) {
    return value === Number.POSITIVE_INFINITY ? MAX_TEAM_RECOVERY_PRESSURE : undefined
  }

  const clamped = clamp(Number(value.toFixed(2)), 0, MAX_TEAM_RECOVERY_PRESSURE)

  return clamped > 0 ? clamped : undefined
}

/** Hydration: prefer status.assignedCaseId; fall back to legacy top-level save field. */
function resolveHydratedTeamAssignedCaseId(
  statusRecord: Record<string, unknown> | undefined,
  legacyAssignedCaseId: unknown
): Id | null {
  if (statusRecord) {
    if (typeof statusRecord.assignedCaseId === 'string') {
      return statusRecord.assignedCaseId
    }
    if (statusRecord.assignedCaseId === null) {
      return null
    }
  }

  return typeof legacyAssignedCaseId === 'string' ? legacyAssignedCaseId : null
}

/** Hydration 412: team assignment must exist on the case roster mirror. */
function reconcileTeamAssignedCaseId(
  teamId: string,
  assignedCaseId: Id | null,
  cases: GameState['cases']
): Id | undefined {
  if (!assignedCaseId || !(assignedCaseId in cases)) {
    return undefined
  }

  const assignedCase = cases[assignedCaseId]

  if (!assignedCase.assignedTeamIds.includes(teamId)) {
    return undefined
  }

  return assignedCaseId
}

/** SPE-294/313–315/410–415: team record hydration, mirrors, assignment, composition recompute. */
export function sanitizeTeamsMap(
  value: unknown,
  agents: GameState['agents'],
  cases: GameState['cases'],
  fallback: GameState['teams']
): GameState['teams'] {
  if (!isRecord(value)) {
    return fallback
  }

  const agentIds = new Set(Object.keys(agents))
  const next: Record<string, Team> = {}

  for (const teamId of Object.keys(value).sort()) {
    const entry = value[teamId]
    if (!isRecord(entry)) {
      continue
    }

    const reconciledEntry: Record<string, unknown> = {
      ...entry,
      id: teamId,
    }

    const memberIds = resolveCanonicalTeamMemberIds(reconciledEntry, agentIds)
    const leaderId =
      typeof reconciledEntry.leaderId === 'string' && memberIds.includes(reconciledEntry.leaderId)
        ? reconciledEntry.leaderId
        : (memberIds[0] ?? null)
    const category = sanitizeTeamCategoryField(reconciledEntry.category)

    const statusRecord = isRecord(reconciledEntry.status) ? reconciledEntry.status : undefined
    const rawAssignedCaseId = resolveHydratedTeamAssignedCaseId(
      statusRecord,
      reconciledEntry.assignedCaseId
    )
    const assignedCaseId = reconcileTeamAssignedCaseId(teamId, rawAssignedCaseId, cases)
    const recoveryPressure = sanitizeTeamRecoveryPressure(reconciledEntry.recoveryPressure)

    const teamWithoutComposition: Team = {
      ...(reconciledEntry as Team),
      id: teamId,
      name:
        typeof reconciledEntry.name === 'string' && reconciledEntry.name.length > 0
          ? reconciledEntry.name
          : teamId,
      memberIds,
      agentIds: memberIds,
      leaderId,
      tags: sanitizeTagList(reconciledEntry.tags),
      ...(category !== undefined ? { category } : {}),
      status: resolveTeamStatus({
        currentState: sanitizeTeamStateKind(
          statusRecord?.state,
          assignedCaseId ? 'deployed' : 'ready'
        ),
        assignedCaseId: assignedCaseId ?? null,
        caseStatus: assignedCaseId ? cases[assignedCaseId]?.status : undefined,
        weeksRemaining: assignedCaseId ? cases[assignedCaseId]?.weeksRemaining : undefined,
        readiness:
          typeof (reconciledEntry as Team).derivedStats?.readiness === 'number'
            ? (reconciledEntry as Team).derivedStats!.readiness
            : undefined,
        memberCount: memberIds.length,
      }),
      compositionState: undefined,
      ...(recoveryPressure !== undefined ? { recoveryPressure } : {}),
    }

    if (reconciledEntry.category !== undefined && category === undefined) {
      delete teamWithoutComposition.category
    }

    if (recoveryPressure === undefined) {
      delete teamWithoutComposition.recoveryPressure
    }

    delete (teamWithoutComposition as Record<string, unknown>).assignedCaseId

    const synced = syncTeamSimulationTeam(teamWithoutComposition, agents, cases)
    const teamsForComposition = {
      ...fallback,
      ...next,
      [teamId]: synced,
    }
    const hydrationState: GameState = {
      ...createStartingState(),
      agents,
      cases,
      teams: teamsForComposition,
    }

    const hydratedTeam: Team = stripUndefinedFields({
      ...synced,
      compositionState: buildTeamCompositionState(synced, agents, teamsForComposition),
      deploymentReadinessState: buildTeamDeploymentReadinessState(hydrationState, teamId),
      ...(recoveryPressure !== undefined ? { recoveryPressure } : {}),
    }) as Team

    if (reconciledEntry.category !== undefined && category === undefined) {
      delete hydratedTeam.category
    }

    if (recoveryPressure === undefined) {
      delete hydratedTeam.recoveryPressure
    }

    next[teamId] = hydratedTeam
  }

  return Object.keys(next).length > 0 ? next : fallback
}

/** SPE-294 / hydration 374–409: sanitize persisted case instances on import. */
export function reconcileCaseFactionReferences(
  cases: GameState['cases'],
  factions: GameState['factions'] | undefined
): GameState['cases'] {
  const knownFactions = factions ?? {}
  const contactIdsByFaction = new Map<string, Set<string>>()

  for (const [factionId, faction] of Object.entries(knownFactions)) {
    contactIdsByFaction.set(
      factionId,
      new Set(
        (faction.contacts ?? [])
          .map((contact) => contact.id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      )
    )
  }

  let changed = false
  const next: Record<string, CaseInstance> = {}

  for (const [caseId, caseData] of Object.entries(cases)) {
    let factionId = caseData.factionId
    let contactId = caseData.contactId

    if (typeof factionId === 'string' && !contactIdsByFaction.has(factionId)) {
      factionId = undefined
      contactId = undefined
    }

    if (typeof contactId === 'string') {
      const contacts =
        typeof factionId === 'string' ? contactIdsByFaction.get(factionId) : undefined
      if (!contacts?.has(contactId)) {
        contactId = undefined
      }
    }

    if (factionId !== caseData.factionId || contactId !== caseData.contactId) {
      changed = true
      const updated = { ...caseData }
      if (factionId !== undefined) {
        updated.factionId = factionId
      } else {
        delete updated.factionId
      }
      if (contactId !== undefined) {
        updated.contactId = contactId
      } else {
        delete updated.contactId
      }
      next[caseId] = updated
    } else {
      next[caseId] = caseData
    }
  }

  return changed ? next : cases
}

/** Hydration 549: catalog keys come from `fallback.templates` (`Record<string, CaseTemplate>`). */
export function resolveKnownCaseTemplateIds(
  templates?: GameState['templates']
): ReadonlySet<string> | undefined {
  if (!templates) {
    return undefined
  }

  return new Set(Object.keys(templates))
}

/** SPE-1310 slice 2: case lifecycleStage hydrates via normalizeCaseInstance (no fallback backfill). */
export function sanitizeCasesMap(
  value: unknown,
  teams: GameState['teams'],
  week: number,
  fallback: GameState['cases'],
  agents?: GameState['agents'],
  templates?: GameState['templates']
): GameState['cases'] {
  if (!isRecord(value)) {
    return fallback
  }

  const knownTemplateIds = resolveKnownCaseTemplateIds(templates)
  const next: Record<string, CaseInstance> = {}

  for (const caseId of Object.keys(value).sort()) {
    const entry = value[caseId]
    if (!isRecord(entry)) {
      continue
    }

    const reconciledEntry: Record<string, unknown> = {
      ...entry,
      id: caseId,
    }

    next[caseId] = normalizeCaseInstance(caseId, reconciledEntry, fallback[caseId], {
      week,
      teams,
      agents,
      knownTemplateIds,
      templates,
    })
  }

  return normalizeMissionIntelRecord(Object.keys(next).length > 0 ? next : fallback, week)
}

function sanitizePerformanceMetricSummary(value: unknown): PerformanceMetricSummary | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  return {
    contribution: sanitizeInteger(value.contribution as number | undefined, 0, 0),
    threatHandled: sanitizeInteger(value.threatHandled as number | undefined, 0, 0),
    damageTaken: sanitizeInteger(value.damageTaken as number | undefined, 0, 0),
    healingPerformed: sanitizeInteger(value.healingPerformed as number | undefined, 0, 0),
    evidenceGathered: sanitizeInteger(value.evidenceGathered as number | undefined, 0, 0),
    containmentActionsCompleted: sanitizeInteger(
      value.containmentActionsCompleted as number | undefined,
      0,
      0
    ),
  }
}

function sanitizePowerImpactSummary(value: unknown): PowerImpactSummary | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const defaults = createDefaultPowerImpactSummary()

  return {
    ...defaults,
    equipmentContributionDelta: sanitizeFiniteNumber(
      value.equipmentContributionDelta,
      defaults.equipmentContributionDelta
    ),
    kitContributionDelta: sanitizeFiniteNumber(
      value.kitContributionDelta,
      defaults.kitContributionDelta
    ),
    protocolContributionDelta: sanitizeFiniteNumber(
      value.protocolContributionDelta,
      defaults.protocolContributionDelta
    ),
    equipmentScoreDelta: sanitizeFiniteNumber(
      value.equipmentScoreDelta,
      defaults.equipmentScoreDelta
    ),
    kitScoreDelta: sanitizeFiniteNumber(value.kitScoreDelta, defaults.kitScoreDelta),
    protocolScoreDelta: sanitizeFiniteNumber(value.protocolScoreDelta, defaults.protocolScoreDelta),
    kitEffectivenessMultiplier: sanitizeFiniteNumber(
      value.kitEffectivenessMultiplier,
      defaults.kitEffectivenessMultiplier
    ),
    protocolEffectivenessMultiplier: sanitizeFiniteNumber(
      value.protocolEffectivenessMultiplier,
      defaults.protocolEffectivenessMultiplier
    ),
    activeEquipmentIds: sanitizeStringList(value.activeEquipmentIds),
    activeKitIds: sanitizeStringList(value.activeKitIds),
    activeProtocolIds: sanitizeStringList(value.activeProtocolIds),
    notes: sanitizeStringList(value.notes),
  }
}

function sanitizeMissionRewardBreakdownSnapshot(
  value: unknown,
  fallback?: MissionRewardBreakdown
): MissionRewardBreakdown | undefined {
  if (!isRecord(value)) {
    return fallback
  }

  const outcome = isOneOf(value.outcome, MISSION_RESOLUTION_OUTCOMES)
    ? value.outcome
    : fallback?.outcome

  if (!outcome) {
    return fallback
  }

  return {
    outcome,
    caseType:
      typeof value.caseType === 'string' ? value.caseType : (fallback?.caseType ?? 'general'),
    caseTypeLabel:
      typeof value.caseTypeLabel === 'string'
        ? value.caseTypeLabel
        : (fallback?.caseTypeLabel ?? 'Operation'),
    operationValue: sanitizeInteger(
      value.operationValue as number | undefined,
      fallback?.operationValue ?? 0,
      0
    ),
    factors: Array.isArray(value.factors)
      ? value.factors.filter((entry): entry is MissionRewardBreakdown['factors'][number] =>
          isRecord(entry)
        )
      : (fallback?.factors ?? []),
    fundingDelta: sanitizeInteger(
      value.fundingDelta as number | undefined,
      fallback?.fundingDelta ?? 0,
      -10_000
    ),
    containmentDelta: sanitizeInteger(
      value.containmentDelta as number | undefined,
      fallback?.containmentDelta ?? 0,
      -10_000
    ),
    strategicValueDelta: sanitizeInteger(
      value.strategicValueDelta as number | undefined,
      fallback?.strategicValueDelta ?? 0,
      -10_000
    ),
    reputationDelta: sanitizeInteger(
      value.reputationDelta as number | undefined,
      fallback?.reputationDelta ?? 0,
      -10_000
    ),
    inventoryRewards: Array.isArray(value.inventoryRewards)
      ? value.inventoryRewards.filter((entry) => isRecord(entry))
      : (fallback?.inventoryRewards ?? []),
    factionStanding: Array.isArray(value.factionStanding)
      ? value.factionStanding.filter((entry) => isRecord(entry))
      : (fallback?.factionStanding ?? []),
    label: typeof value.label === 'string' ? value.label : (fallback?.label ?? 'Mission'),
    reasons: Array.isArray(value.reasons)
      ? value.reasons.filter((note): note is string => typeof note === 'string')
      : (fallback?.reasons ?? []),
  }
}

function sanitizeOperationEventCaseOutcomeFields(payload: Record<string, unknown>) {
  const performanceSummary = sanitizePerformanceMetricSummary(payload.performanceSummary)
  const rewardBreakdown = sanitizeMissionRewardBreakdownSnapshot(payload.rewardBreakdown)

  return stripUndefinedFields({
    ...(performanceSummary ? { performanceSummary } : {}),
    ...(rewardBreakdown ? { rewardBreakdown } : {}),
  })
}

function sanitizeRecruitmentSourceContactFields(payload: Record<string, unknown>) {
  return stripUndefinedFields({
    sourceFactionId:
      typeof payload.sourceFactionId === 'string' ? payload.sourceFactionId : undefined,
    sourceFactionName:
      typeof payload.sourceFactionName === 'string' ? payload.sourceFactionName : undefined,
    sourceContactId:
      typeof payload.sourceContactId === 'string' ? payload.sourceContactId : undefined,
    sourceContactName:
      typeof payload.sourceContactName === 'string' ? payload.sourceContactName : undefined,
  })
}

function sanitizeWeeklyReportDistortion(
  value: unknown
): WeeklyReportCaseSnapshot['distortion'] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const distortion = value.filter(
    (entry): entry is NonNullable<WeeklyReportCaseSnapshot['distortion']>[number] =>
      isDistortionState(entry)
  )

  return distortion.length > 0 ? distortion : undefined
}

function sanitizeWeeklyReportCaseKnowledge(
  value: unknown,
  campaignWeek: number,
  knownTeamIds: ReadonlySet<string>
): WeeklyReportCaseSnapshot['knowledge'] | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const next: NonNullable<WeeklyReportCaseSnapshot['knowledge']> = {}

  for (const [teamId, entry] of Object.entries(value)) {
    if (!isRecord(entry)) {
      continue
    }

    const entityId =
      typeof entry.entityId === 'string' && entry.entityId.trim().length > 0
        ? entry.entityId.trim()
        : teamId
    const subjectId =
      typeof entry.subjectId === 'string' && entry.subjectId.trim().length > 0
        ? entry.subjectId.trim()
        : ''

    if (!subjectId) {
      continue
    }

    const key = getKnowledgeKey(entityId, subjectId)
    const sanitizedEntry = sanitizeKnowledgeStateMap(
      { [key]: entry },
      {},
      { campaignWeek, knownTeamIds }
    )[key]

    if (sanitizedEntry) {
      next[teamId] = sanitizedEntry
    }
  }

  return Object.keys(next).length > 0 ? next : undefined
}

/** SPE-318: bounded mission-result snapshot sanitizer (no raw cast). */
function sanitizeMissionResult(
  value: unknown,
  fallback?: MissionResult
): MissionResult | undefined {
  if (!isRecord(value)) {
    return fallback
  }

  const caseId =
    typeof value.caseId === 'string' && value.caseId.length > 0 ? value.caseId : fallback?.caseId
  const outcome = isOneOf(value.outcome, MISSION_RESOLUTION_OUTCOMES)
    ? value.outcome
    : fallback?.outcome

  if (!caseId || !outcome) {
    return fallback
  }

  const teamsUsed = Array.isArray(value.teamsUsed)
    ? value.teamsUsed
        .filter((entry): entry is Record<string, unknown> => isRecord(entry))
        .map((entry, index) => ({
          teamId:
            typeof entry.teamId === 'string' && entry.teamId.length > 0
              ? entry.teamId
              : (fallback?.teamsUsed[index]?.teamId ?? `team-${index + 1}`),
          ...(typeof entry.teamName === 'string' && entry.teamName.length > 0
            ? { teamName: entry.teamName }
            : fallback?.teamsUsed[index]?.teamName
              ? { teamName: fallback.teamsUsed[index]!.teamName }
              : {}),
        }))
    : (fallback?.teamsUsed ?? [])

  const performanceSummary = sanitizePerformanceMetricSummary(value.performanceSummary) ??
    fallback?.performanceSummary ?? {
      contribution: 0,
      threatHandled: 0,
      damageTaken: 0,
      healingPerformed: 0,
      evidenceGathered: 0,
      containmentActionsCompleted: 0,
    }

  const WEAKST_LINK_PENALTY_SOURCE_CODES = [
    'missing-coverage',
    'low-min-readiness',
    'fragile-cohesion',
    'training-lock-pressure',
    'loadout-gate-miss',
    'fatigue-concentration',
    'intel-friction',
  ] as const satisfies readonly WeakestLinkPenaltySourceCode[]

  const WEAKST_LINK_OUTCOME_CATEGORIES = [
    'clean_success',
    'strained_success',
    'partial',
    'failure',
    'failure_recovery_pressure',
  ] as const satisfies readonly WeakestLinkResolutionOutcomeCategory[]

  const WEAKST_LINK_RESULT_KINDS = [
    'success',
    'partial',
    'fail',
  ] as const satisfies readonly WeakestLinkResultKind[]

  const WEAKST_LINK_RECOVERY_PRESSURE_BANDS = [
    'low',
    'moderate',
    'high',
    'severe',
  ] as const satisfies readonly RecoveryPressureBand[]

  const sanitizeWeakestLinkPenaltyBucket = (
    entry: unknown
  ): WeakestLinkPenaltyBucket | undefined => {
    if (!isRecord(entry)) return undefined

    const code = isOneOf(entry.code, WEAKST_LINK_PENALTY_SOURCE_CODES) ? entry.code : undefined
    const weight =
      typeof entry.weight === 'number' && Number.isFinite(entry.weight) ? entry.weight : undefined
    const rawSignal =
      typeof entry.rawSignal === 'number' && Number.isFinite(entry.rawSignal)
        ? entry.rawSignal
        : undefined
    const appliedPenalty =
      typeof entry.appliedPenalty === 'number' && Number.isFinite(entry.appliedPenalty)
        ? entry.appliedPenalty
        : undefined

    if (!code || weight === undefined || rawSignal === undefined || appliedPenalty === undefined)
      return undefined

    return { code, weight, rawSignal, appliedPenalty }
  }

  const sanitizeWeakestLinkMissionResolutionResult = (
    raw: unknown,
    weakFallback?: WeakestLinkMissionResolutionResult
  ): WeakestLinkMissionResolutionResult | undefined => {
    if (!isRecord(raw)) {
      return weakFallback
    }

    const missionId =
      typeof raw.missionId === 'string' && raw.missionId.trim().length > 0
        ? raw.missionId.trim()
        : weakFallback?.missionId

    const week =
      typeof raw.week === 'number' && Number.isFinite(raw.week)
        ? Math.max(1, Math.trunc(raw.week))
        : weakFallback?.week

    const outcomeCategory = isOneOf(raw.outcomeCategory, WEAKST_LINK_OUTCOME_CATEGORIES)
      ? raw.outcomeCategory
      : weakFallback?.outcomeCategory

    const resultKind = isOneOf(raw.resultKind, WEAKST_LINK_RESULT_KINDS)
      ? raw.resultKind
      : weakFallback?.resultKind

    if (!missionId || week === undefined || !outcomeCategory || !resultKind) {
      return weakFallback
    }

    const baseScore =
      typeof raw.baseScore === 'number' && Number.isFinite(raw.baseScore)
        ? raw.baseScore
        : (weakFallback?.baseScore ?? 0)
    const requiredScore =
      typeof raw.requiredScore === 'number' && Number.isFinite(raw.requiredScore)
        ? raw.requiredScore
        : (weakFallback?.requiredScore ?? 0)
    const finalDelta =
      typeof raw.finalDelta === 'number' && Number.isFinite(raw.finalDelta)
        ? raw.finalDelta
        : (weakFallback?.finalDelta ?? 0)

    const weakestLinkTotalPenalty =
      typeof raw.weakestLinkTotalPenalty === 'number' &&
      Number.isFinite(raw.weakestLinkTotalPenalty)
        ? raw.weakestLinkTotalPenalty
        : (weakFallback?.weakestLinkTotalPenalty ?? 0)

    const weakestLinkPenaltyBuckets = Array.isArray(raw.weakestLinkPenaltyBuckets)
      ? raw.weakestLinkPenaltyBuckets
          .map(sanitizeWeakestLinkPenaltyBucket)
          .filter((bucket): bucket is WeakestLinkPenaltyBucket => bucket !== undefined)
      : (weakFallback?.weakestLinkPenaltyBuckets ?? [])

    const weakestLinkContributors = Array.isArray(raw.weakestLinkContributors)
      ? raw.weakestLinkContributors.filter((entry): entry is string => typeof entry === 'string')
      : (weakFallback?.weakestLinkContributors ?? [])

    const weakestLinkNarrativeReasonCodes = Array.isArray(raw.weakestLinkNarrativeReasonCodes)
      ? raw.weakestLinkNarrativeReasonCodes.filter(
          (entry): entry is string => typeof entry === 'string'
        )
      : (weakFallback?.weakestLinkNarrativeReasonCodes ?? [])

    const injuryRiskDelta =
      typeof raw.injuryRiskDelta === 'number' && Number.isFinite(raw.injuryRiskDelta)
        ? raw.injuryRiskDelta
        : weakFallback?.injuryRiskDelta
    const fatalityRiskDelta =
      typeof raw.fatalityRiskDelta === 'number' && Number.isFinite(raw.fatalityRiskDelta)
        ? raw.fatalityRiskDelta
        : weakFallback?.fatalityRiskDelta
    const expectedRecoveryWeeksDelta =
      typeof raw.expectedRecoveryWeeksDelta === 'number' &&
      Number.isFinite(raw.expectedRecoveryWeeksDelta)
        ? raw.expectedRecoveryWeeksDelta
        : weakFallback?.expectedRecoveryWeeksDelta

    const recoveryPressureBand = isOneOf(
      raw.recoveryPressureBand,
      WEAKST_LINK_RECOVERY_PRESSURE_BANDS
    )
      ? raw.recoveryPressureBand
      : weakFallback?.recoveryPressureBand

    const deploymentDebtSignals = Array.isArray(raw.deploymentDebtSignals)
      ? raw.deploymentDebtSignals.filter((entry): entry is string => typeof entry === 'string')
      : weakFallback?.deploymentDebtSignals

    const penaltyComputationVersion =
      typeof raw.penaltyComputationVersion === 'string' &&
      raw.penaltyComputationVersion.trim().length > 0
        ? raw.penaltyComputationVersion.trim().slice(0, REPORT_NOTE_METADATA_MAX_STRING_LENGTH)
        : weakFallback?.penaltyComputationVersion

    const orderedPenaltyApplication = Array.isArray(raw.orderedPenaltyApplication)
      ? raw.orderedPenaltyApplication
          .map(sanitizeWeakestLinkPenaltyBucket)
          .filter((bucket): bucket is WeakestLinkPenaltyBucket => bucket !== undefined)
      : weakFallback?.orderedPenaltyApplication

    const cappedPenalties = Array.isArray(raw.cappedPenalties)
      ? raw.cappedPenalties
          .map(sanitizeWeakestLinkPenaltyBucket)
          .filter((bucket): bucket is WeakestLinkPenaltyBucket => bucket !== undefined)
      : weakFallback?.cappedPenalties

    const executionInstability = isRecord(raw.executionInstability)
      ? (() => {
          const flag =
            raw.executionInstability.flag === 'contract_archive_instability'
              ? raw.executionInstability.flag
              : undefined
          const applied =
            typeof raw.executionInstability.applied === 'boolean'
              ? raw.executionInstability.applied
              : undefined
          const upstreamCause =
            typeof raw.executionInstability.upstreamCause === 'string' &&
            raw.executionInstability.upstreamCause.trim().length > 0
              ? raw.executionInstability.upstreamCause
                  .trim()
                  .slice(0, REPORT_NOTE_METADATA_MAX_STRING_LENGTH)
              : undefined
          const downstreamEffect =
            typeof raw.executionInstability.downstreamEffect === 'string' &&
            raw.executionInstability.downstreamEffect.trim().length > 0
              ? raw.executionInstability.downstreamEffect
                  .trim()
                  .slice(0, REPORT_NOTE_METADATA_MAX_STRING_LENGTH)
              : undefined

          if (!flag || applied === undefined || !upstreamCause || !downstreamEffect) {
            return weakFallback?.executionInstability
          }

          return {
            flag,
            applied,
            upstreamCause,
            downstreamEffect,
          } satisfies ExecutionInstabilityOverlay
        })()
      : weakFallback?.executionInstability

    return stripUndefinedFields({
      missionId,
      week,
      outcomeCategory,
      resultKind,
      baseScore,
      requiredScore,
      finalDelta,
      weakestLinkTotalPenalty,
      weakestLinkPenaltyBuckets,
      weakestLinkContributors,
      weakestLinkNarrativeReasonCodes,
      ...(injuryRiskDelta !== undefined ? { injuryRiskDelta } : {}),
      ...(fatalityRiskDelta !== undefined ? { fatalityRiskDelta } : {}),
      ...(expectedRecoveryWeeksDelta !== undefined ? { expectedRecoveryWeeksDelta } : {}),
      ...(recoveryPressureBand !== undefined ? { recoveryPressureBand } : {}),
      ...(deploymentDebtSignals !== undefined ? { deploymentDebtSignals } : {}),
      ...(penaltyComputationVersion !== undefined ? { penaltyComputationVersion } : {}),
      ...(orderedPenaltyApplication !== undefined ? { orderedPenaltyApplication } : {}),
      ...(cappedPenalties !== undefined ? { cappedPenalties } : {}),
      ...(executionInstability !== undefined ? { executionInstability } : {}),
    }) as WeakestLinkMissionResolutionResult
  }

  const weakestLink = sanitizeWeakestLinkMissionResolutionResult(
    value.weakestLink,
    fallback?.weakestLink
  )

  const rewards = isRecord(value.rewards)
    ? {
        ...(fallback?.rewards ?? {
          outcome,
          caseType: 'general',
          caseTypeLabel: 'Operation',
          operationValue: 0,
          factors: [],
          fundingDelta: 0,
          containmentDelta: 0,
          strategicValueDelta: 0,
          reputationDelta: 0,
          inventoryRewards: [],
          factionStanding: [],
          label: 'Mission',
          reasons: [],
        }),
        ...value.rewards,
        outcome: isOneOf(
          (value.rewards as { outcome?: unknown }).outcome,
          MISSION_RESOLUTION_OUTCOMES
        )
          ? (value.rewards as { outcome: MissionResolutionKind }).outcome
          : outcome,
        fundingDelta: sanitizeInteger(
          (value.rewards as { fundingDelta?: number }).fundingDelta,
          fallback?.rewards.fundingDelta ?? 0,
          -10_000
        ),
        containmentDelta: sanitizeInteger(
          (value.rewards as { containmentDelta?: number }).containmentDelta,
          fallback?.rewards.containmentDelta ?? 0,
          -10_000
        ),
        reputationDelta: sanitizeInteger(
          (value.rewards as { reputationDelta?: number }).reputationDelta,
          fallback?.rewards.reputationDelta ?? 0,
          -10_000
        ),
        inventoryRewards: Array.isArray(
          (value.rewards as { inventoryRewards?: unknown }).inventoryRewards
        )
          ? (value.rewards as { inventoryRewards: MissionResult['rewards']['inventoryRewards'] })
              .inventoryRewards
          : (fallback?.rewards.inventoryRewards ?? []),
        factionStanding: Array.isArray(
          (value.rewards as { factionStanding?: unknown }).factionStanding
        )
          ? (value.rewards as { factionStanding: MissionResult['rewards']['factionStanding'] })
              .factionStanding
          : (fallback?.rewards.factionStanding ?? []),
      }
    : (fallback?.rewards ?? {
        outcome,
        caseType: 'general',
        caseTypeLabel: 'Operation',
        operationValue: 0,
        factors: [],
        fundingDelta: 0,
        containmentDelta: 0,
        strategicValueDelta: 0,
        reputationDelta: 0,
        inventoryRewards: [],
        factionStanding: [],
        label: 'Mission',
        reasons: [],
      })

  const penalties = isRecord(value.penalties)
    ? {
        ...(fallback?.penalties ?? {
          fundingLoss: 0,
          containmentLoss: 0,
          reputationLoss: 0,
          strategicLoss: 0,
        }),
        fundingLoss: sanitizeInteger(
          (value.penalties as { fundingLoss?: number }).fundingLoss,
          fallback?.penalties.fundingLoss ?? 0,
          0
        ),
        containmentLoss: sanitizeInteger(
          (value.penalties as { containmentLoss?: number }).containmentLoss,
          fallback?.penalties.containmentLoss ?? 0,
          0
        ),
        reputationLoss: sanitizeInteger(
          (value.penalties as { reputationLoss?: number }).reputationLoss,
          fallback?.penalties.reputationLoss ?? 0,
          0
        ),
        strategicLoss: sanitizeInteger(
          (value.penalties as { strategicLoss?: number }).strategicLoss,
          fallback?.penalties.strategicLoss ?? 0,
          0
        ),
      }
    : (fallback?.penalties ?? {
        fundingLoss: 0,
        containmentLoss: 0,
        reputationLoss: 0,
        strategicLoss: 0,
      })

  return stripUndefinedFields({
    caseId,
    caseTitle:
      typeof value.caseTitle === 'string' && value.caseTitle.length > 0
        ? value.caseTitle
        : (fallback?.caseTitle ?? caseId),
    teamsUsed,
    outcome,
    ...(weakestLink ? { weakestLink } : {}),
    performanceSummary,
    rewards,
    penalties,
    fatigueChanges: Array.isArray(value.fatigueChanges)
      ? value.fatigueChanges.filter((entry) => isRecord(entry))
      : (fallback?.fatigueChanges ?? []),
    injuries: Array.isArray(value.injuries)
      ? value.injuries.filter((entry) => isRecord(entry))
      : (fallback?.injuries ?? []),
    spawnedConsequences: Array.isArray(value.spawnedConsequences)
      ? value.spawnedConsequences.filter((entry) => isRecord(entry))
      : (fallback?.spawnedConsequences ?? []),
    explanationNotes: Array.isArray(value.explanationNotes)
      ? value.explanationNotes.filter((note): note is string => typeof note === 'string')
      : (fallback?.explanationNotes ?? []),
    ...(Array.isArray(value.fatalities)
      ? { fatalities: value.fatalities.filter((entry) => isRecord(entry)) }
      : fallback?.fatalities
        ? { fatalities: fallback.fatalities }
        : {}),
    ...(value.hiddenState === 'hidden' ||
    value.hiddenState === 'revealed' ||
    value.hiddenState === 'displaced'
      ? { hiddenState: value.hiddenState }
      : fallback?.hiddenState
        ? { hiddenState: fallback.hiddenState }
        : {}),
    ...(typeof value.route === 'string'
      ? { route: value.route }
      : fallback?.route
        ? { route: fallback.route }
        : {}),
  }) as MissionResult
}

/** SPE-460: resolved snapshots require a valid mission result; active snapshots drop stale results. */
function reconcileCaseSnapshotStatusMissionResult(
  snapshot: WeeklyReportCaseSnapshot
): WeeklyReportCaseSnapshot {
  const missionResult = snapshot.missionResult

  if (!missionResult || missionResult.caseId !== snapshot.caseId) {
    if (snapshot.status === 'resolved') {
      return {
        ...snapshot,
        status: 'open',
        missionResult: undefined,
      }
    }

    return {
      ...snapshot,
      missionResult: undefined,
    }
  }

  const terminalOutcome =
    missionResult.outcome === 'success' ||
    missionResult.outcome === 'partial' ||
    missionResult.outcome === 'fail'

  if (terminalOutcome) {
    return {
      ...snapshot,
      status: 'resolved',
      missionResult,
    }
  }

  // Non-terminal outcomes (for example unresolved/escalated) may keep mission
  // metadata while the snapshot status remains open/in_progress.
  return {
    ...snapshot,
    missionResult,
  }
}

function sanitizeCaseSnapshots(
  value: unknown,
  fallback: Record<Id, WeeklyReportCaseSnapshot>,
  options: {
    campaignWeek?: number
    reportWeek?: number
    currentCampaignWeek?: number
    knownTeamIds?: ReadonlySet<string>
  } = {}
): Record<Id, WeeklyReportCaseSnapshot> {
  const currentCampaignWeek = Math.max(
    1,
    Math.trunc(options.currentCampaignWeek ?? options.campaignWeek ?? 1)
  )
  const reportWeek = Math.max(1, Math.trunc(options.reportWeek ?? options.campaignWeek ?? 1))
  const useCurrentCaseFallback = reportWeek === currentCampaignWeek

  if (value === undefined || value === null) {
    return {}
  }

  if (!isRecord(value)) {
    return useCurrentCaseFallback ? { ...fallback } : {}
  }

  const nextSnapshots: Record<Id, WeeklyReportCaseSnapshot> = {}
  const campaignWeek = options.campaignWeek ?? reportWeek
  const knownTeamIds = options.knownTeamIds ?? new Set<string>()

  for (const [entryId, snapshot] of Object.entries(value)) {
    if (!isRecord(snapshot)) {
      continue
    }

    const caseId =
      typeof snapshot.caseId === 'string' && snapshot.caseId.length > 0 ? snapshot.caseId : entryId
    const fallbackSnapshot = useCurrentCaseFallback
      ? (fallback[caseId] ?? fallback[entryId])
      : undefined

    if (entryId !== caseId && entryId in nextSnapshots) {
      delete nextSnapshots[entryId]
    }

    const sanitizedMissionResult = sanitizeMissionResult(
      snapshot.missionResult,
      fallbackSnapshot?.missionResult
    )
    const missionResult =
      sanitizedMissionResult && sanitizedMissionResult.caseId === caseId
        ? sanitizedMissionResult
        : undefined
    const performanceSummary =
      sanitizePerformanceMetricSummary(snapshot.performanceSummary) ??
      missionResult?.performanceSummary ??
      fallbackSnapshot?.performanceSummary
    const powerImpact =
      sanitizePowerImpactSummary(snapshot.powerImpact) ?? fallbackSnapshot?.powerImpact
    const rewardBreakdown =
      sanitizeMissionRewardBreakdownSnapshot(
        snapshot.rewardBreakdown,
        fallbackSnapshot?.rewardBreakdown
      ) ??
      (missionResult
        ? sanitizeMissionRewardBreakdownSnapshot(
            missionResult.rewards,
            fallbackSnapshot?.rewardBreakdown
          )
        : undefined) ??
      fallbackSnapshot?.rewardBreakdown
    const distortion =
      sanitizeWeeklyReportDistortion(snapshot.distortion) ?? fallbackSnapshot?.distortion
    const knowledge =
      sanitizeWeeklyReportCaseKnowledge(snapshot.knowledge, campaignWeek, knownTeamIds) ??
      (useCurrentCaseFallback ? fallbackSnapshot?.knowledge : undefined)
    const revealExplanationRaw =
      typeof snapshot.revealExplanation === 'string' ? snapshot.revealExplanation.trim() : undefined
    const revealExplanation =
      revealExplanationRaw && revealExplanationRaw.length > 0
        ? revealExplanationRaw.slice(0, REPORT_NOTE_METADATA_MAX_STRING_LENGTH)
        : useCurrentCaseFallback
          ? fallbackSnapshot?.revealExplanation
          : undefined

    const sanitized = stripUndefinedFields({
      caseId,
      title:
        typeof snapshot.title === 'string' ? snapshot.title : (fallbackSnapshot?.title ?? caseId),
      kind: isOneOf(snapshot.kind, CASE_KINDS) ? snapshot.kind : (fallbackSnapshot?.kind ?? 'case'),
      mode: isOneOf(snapshot.mode, CASE_MODES)
        ? snapshot.mode
        : (fallbackSnapshot?.mode ?? 'threshold'),
      status:
        snapshot.status === 'open' ||
        snapshot.status === 'in_progress' ||
        snapshot.status === 'resolved'
          ? snapshot.status
          : (fallbackSnapshot?.status ?? 'open'),
      stage: sanitizeInteger(snapshot.stage as number | undefined, fallbackSnapshot?.stage ?? 1, 1),
      deadlineRemaining: sanitizeInteger(
        snapshot.deadlineRemaining as number | undefined,
        fallbackSnapshot?.deadlineRemaining ?? 1,
        0
      ),
      durationWeeks: sanitizeInteger(
        snapshot.durationWeeks as number | undefined,
        fallbackSnapshot?.durationWeeks ?? 1,
        1
      ),
      weeksRemaining:
        snapshot.weeksRemaining === undefined
          ? fallbackSnapshot?.weeksRemaining
          : sanitizeInteger(snapshot.weeksRemaining as number, 0, 0),
      assignedTeamIds:
        Array.isArray(snapshot.assignedTeamIds) &&
        snapshot.assignedTeamIds.every((teamId) => typeof teamId === 'string')
          ? [...snapshot.assignedTeamIds]
          : (fallbackSnapshot?.assignedTeamIds ?? []),
      ...(performanceSummary ? { performanceSummary } : {}),
      ...(powerImpact ? { powerImpact } : {}),
      ...(rewardBreakdown ? { rewardBreakdown } : {}),
      ...(distortion ? { distortion } : {}),
      ...(knowledge ? { knowledge } : {}),
      ...(revealExplanation ? { revealExplanation } : {}),
      ...(missionResult ? { missionResult } : {}),
    }) as WeeklyReportCaseSnapshot

    for (const key of Object.keys(sanitized)) {
      if (!WEEKLY_REPORT_CASE_SNAPSHOT_KEYS.has(key)) {
        delete sanitized[key]
      }
    }

    nextSnapshots[caseId] = reconcileCaseSnapshotStatusMissionResult(sanitized)
  }

  return nextSnapshots
}

/** SPE-455–456: filter queue to known eligible cases; reconcile priorities with queue order. */
function sanitizeCaseQueueState(
  value: unknown,
  cases: GameState['cases'],
  fallback?: CaseQueueState
): CaseQueueState {
  const fallbackQueue = fallback ?? { queuedCaseIds: [], priorities: {} }
  const rawQueuedCaseIds = Array.isArray((value as CaseQueueState | undefined)?.queuedCaseIds)
    ? (value as CaseQueueState).queuedCaseIds
    : fallbackQueue.queuedCaseIds
  const rawPriorities = isRecord((value as CaseQueueState | undefined)?.priorities)
    ? ((value as CaseQueueState).priorities as Record<string, unknown>)
    : fallbackQueue.priorities

  const seen = new Set<string>()
  const queuedCaseIds: Id[] = []

  for (const entry of rawQueuedCaseIds) {
    if (typeof entry !== 'string' || entry.length === 0 || seen.has(entry)) {
      continue
    }

    const currentCase = cases[entry]

    if (!currentCase || !CASE_QUEUE_ELIGIBLE_STATUSES.includes(currentCase.status)) {
      continue
    }

    seen.add(entry)
    queuedCaseIds.push(entry)
  }

  const priorities: Record<Id, CasePriority> = {}

  for (const caseId of queuedCaseIds) {
    const rawPriority = rawPriorities[caseId]
    priorities[caseId] = isOneOf(rawPriority, CASE_PRIORITIES) ? rawPriority : 'normal'
  }

  return {
    queuedCaseIds,
    priorities,
  }
}

/** SPE-316: preserve historical team ids; clear stale case references. */
function sanitizeTeamStatus(
  value: unknown,
  fallback: WeeklyReportTeamStatus[],
  teams: GameState['teams'],
  cases: GameState['cases'],
  agents: GameState['agents'],
  caseSnapshots: Record<Id, WeeklyReportCaseSnapshot> = {},
  allowedCaseIds?: ReadonlySet<string>,
  options: {
    useCurrentTeamFallback?: boolean
    enrichFromLiveTeams?: boolean
  } = {}
): WeeklyReportTeamStatus[] {
  const useCurrentTeamFallback = options.useCurrentTeamFallback ?? true
  const enrichFromLiveTeams = options.enrichFromLiveTeams ?? useCurrentTeamFallback

  if (!Array.isArray(value)) {
    return useCurrentTeamFallback ? fallback : []
  }

  const nextTeamStatus: WeeklyReportTeamStatus[] = []
  const seenTeamIds = new Set<string>()

  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.teamId !== 'string' || entry.teamId.length === 0) {
      continue
    }

    if (seenTeamIds.has(entry.teamId)) {
      continue
    }

    seenTeamIds.add(entry.teamId)

    const liveTeam = enrichFromLiveTeams ? teams[entry.teamId] : undefined
    let assignedCaseId =
      typeof entry.assignedCaseId === 'string' && entry.assignedCaseId.length > 0
        ? entry.assignedCaseId
        : undefined

    if (assignedCaseId && !(assignedCaseId in cases) && !allowedCaseIds?.has(assignedCaseId)) {
      assignedCaseId = undefined
    }

    const assignedCase = assignedCaseId ? cases[assignedCaseId] : undefined
    const snapshotCase = assignedCaseId ? caseSnapshots[assignedCaseId] : undefined
    const memberIds = liveTeam ? getTeamMemberIds(liveTeam) : []
    const avgFatigue = liveTeam
      ? memberIds.length === 0
        ? 0
        : Math.round(
            memberIds.reduce((sum, agentId) => sum + (agents[agentId]?.fatigue ?? 0), 0) /
              memberIds.length
          )
      : sanitizeInteger(entry.avgFatigue as number | undefined, 0, 0)

    nextTeamStatus.push(
      stripUndefinedFields({
        teamId: entry.teamId,
        teamName: typeof entry.teamName === 'string' ? entry.teamName : liveTeam?.name,
        assignedCaseId,
        assignedCaseTitle: assignedCaseId
          ? (assignedCase?.title ??
            snapshotCase?.title ??
            (typeof entry.assignedCaseTitle === 'string' ? entry.assignedCaseTitle : undefined))
          : undefined,
        avgFatigue,
        fatigueBand: getFatigueBand(avgFatigue),
        ...((): Pick<WeeklyReportTeamStatus, 'deployedRecoveryMode' | 'recoveryLegibility'> => {
          if (!assignedCaseId) {
            return {}
          }

          const hasAssignedCaseContext =
            assignedCaseId in cases ||
            assignedCaseId in caseSnapshots ||
            allowedCaseIds?.has(assignedCaseId) === true

          if (!hasAssignedCaseContext) {
            return {}
          }

          const deployedRecoveryMode = isExpeditionRecoveryMode(entry.deployedRecoveryMode)
            ? entry.deployedRecoveryMode
            : undefined

          if (!deployedRecoveryMode) {
            return {}
          }

          const recoveryLegibility =
            typeof entry.recoveryLegibility === 'string' &&
            entry.recoveryLegibility.trim().length > 0
              ? entry.recoveryLegibility.trim()
              : undefined

          return {
            deployedRecoveryMode,
            ...(recoveryLegibility ? { recoveryLegibility } : {}),
          }
        })(),
      }) as WeeklyReportTeamStatus
    )
  }

  if (nextTeamStatus.length > 0) {
    return nextTeamStatus
  }

  return useCurrentTeamFallback ? fallback : []
}

/**
 * SPE-317 / hydration 539-541: clamp quantities against procurement catalog overlap;
 * trim keys, drop blanks, dedupe trimmed collisions (latest wins); preserve explicit `{}`.
 */
function sanitizeInventory(value: unknown, fallback: Record<string, number>) {
  if (!isRecord(value)) {
    return { ...fallback }
  }

  const knownItemIds = getKnownProcurementItemIds()
  const nextInventory: Record<string, number> = {}

  for (const [rawKey, quantity] of Object.entries(value)) {
    if (typeof rawKey !== 'string') {
      continue
    }

    const itemId = rawKey.trim()
    if (itemId.length === 0) {
      continue
    }

    const sanitizedQuantity = sanitizeInteger(
      quantity as number | undefined,
      fallback[itemId] ?? 0,
      0
    )

    if (knownItemIds.has(itemId) || sanitizedQuantity > 0 || fallback[itemId] !== undefined) {
      nextInventory[itemId] = sanitizedQuantity
    }
  }

  return nextInventory
}

function sanitizePartyCardState(
  value: unknown,
  fallback: PartyCardState | undefined,
  cases: GameState['cases'],
  teams: GameState['teams'],
  campaignWeek: number
) {
  return sanitizePersistedPartyCardState(value, fallback, cases, teams, campaignWeek)
}

const INVENTED_AGENT_ID_PATTERN = /^agent-\d+$/

function isInventedAgentId(agentId: string) {
  return INVENTED_AGENT_ID_PATTERN.test(agentId)
}

function isTrainingQueueEntryInFlight(remainingWeeks: number, durationWeeks: number) {
  return remainingWeeks < durationWeeks
}

function isProductionQueueEntryInFlight(remainingWeeks: number, durationWeeks: number) {
  return remainingWeeks > 0 && remainingWeeks < durationWeeks
}

/** Hydration 554/556: trim ids and regenerate duplicates (`id-dup-N`). */
function assignUniqueQueueEntryIds<T extends { id: string }>(
  entries: readonly T[],
  fallbackPrefix: string
): T[] {
  const seen = new Set<string>()
  const next: T[] = []

  for (const [index, entry] of entries.entries()) {
    const trimmed = entry.id.trim()
    const baseId = trimmed.length > 0 ? trimmed : `${fallbackPrefix}-${index + 1}`
    let resolvedId = baseId

    if (seen.has(resolvedId)) {
      resolvedId = `${baseId}-dup-${index + 1}`
    }

    seen.add(resolvedId)
    next.push(resolvedId === entry.id ? entry : { ...entry, id: resolvedId })
  }

  return next
}

/** Hydration 557: recompute funding snapshots outside the recipe cost band. */
function reconcileProductionFundingCost(
  persisted: number | undefined,
  recipe: ProductionRecipe,
  market: MarketState
) {
  const expected = getRecipeFundingCost(recipe, market)
  const minCost = Math.max(1, Math.round(recipe.baseFundingCost * 0.7))
  const maxCost = Math.max(expected, Math.round(recipe.baseFundingCost * 1.5))
  const sanitized = sanitizeInteger(persisted, expected, 0)

  if (sanitized < minCost || sanitized > maxCost) {
    return expected
  }

  return sanitized
}

function collectTrainingDrillGroupRegistry(value: unknown) {
  const counts = new Map<string, number>()

  if (!Array.isArray(value)) {
    return new Set<string>()
  }

  for (const entry of value) {
    if (
      isRecord(entry) &&
      entry.scope === 'team' &&
      typeof entry.drillGroupId === 'string' &&
      entry.drillGroupId.length > 0
    ) {
      counts.set(entry.drillGroupId, (counts.get(entry.drillGroupId) ?? 0) + 1)
    }
  }

  return new Set(
    [...counts.entries()].filter(([, count]) => count >= 2).map(([drillGroupId]) => drillGroupId)
  )
}

const KNOWN_PRODUCTION_MATERIAL_IDS = new Set(
  productionMaterialCatalog.map((material) => material.materialId)
)

/** Hydration 510: operation-event material rows follow recipe catalog and drop stale unknown ids. */
function sanitizeOperationEventProductionInputMaterials(
  payload: Record<string, unknown>
): ProductionMaterialRequirement[] {
  const recipeId = typeof payload.recipeId === 'string' ? payload.recipeId : undefined
  const recipe = recipeId ? getProductionRecipe(recipeId) : undefined

  return sanitizeProductionInputMaterials(payload, recipe) ?? []
}

function sanitizeProductionInputMaterials(
  entry: Record<string, unknown>,
  recipe: ReturnType<typeof getProductionRecipe>
): ProductionMaterialRequirement[] | undefined {
  if (recipe) {
    return getRecipeInputMaterials(recipe)
  }

  if (!Array.isArray(entry.inputMaterials)) {
    return undefined
  }

  const sanitized = entry.inputMaterials
    .filter((material): material is Record<string, unknown> => isRecord(material))
    .map((material) => {
      const materialId = typeof material.materialId === 'string' ? material.materialId.trim() : ''
      const catalogMaterialName = inventoryItemLabels[materialId]
      const materialName =
        typeof catalogMaterialName === 'string' && catalogMaterialName.trim().length > 0
          ? catalogMaterialName.trim()
          : typeof material.materialName === 'string'
            ? material.materialName.trim()
            : ''
      const quantity =
        typeof material.quantity === 'number' &&
        Number.isFinite(material.quantity) &&
        Number.isInteger(material.quantity) &&
        material.quantity >= 0
          ? material.quantity
          : -1

      return {
        materialId,
        materialName,
        quantity,
      }
    })
    .filter(
      (material) =>
        material.materialId.length > 0 &&
        material.materialName.length > 0 &&
        KNOWN_PRODUCTION_MATERIAL_IDS.has(material.materialId) &&
        material.quantity >= 0
    )

  return sanitized.length > 0 ? sanitized : undefined
}

function isKnownProductionOutputItemId(outputItemId: string) {
  return Object.prototype.hasOwnProperty.call(inventoryItemLabels, outputItemId)
}

function reconcileTeamDrillMemberIds(
  entry: Record<string, unknown>,
  agents: GameState['agents'],
  teams: GameState['teams']
): { teamId: string; teamName: string; memberIds: string[]; agentId: string } | null {
  const teamId = typeof entry.teamId === 'string' ? entry.teamId : undefined
  const team = teamId ? teams[teamId] : undefined

  if (!teamId || !team) {
    return null
  }

  const rosterMemberIds = new Set(getTeamMemberIds(team))
  const requestedMemberIds = sanitizeStringList(entry.memberIds)
  const memberIds = (
    requestedMemberIds.length > 0
      ? requestedMemberIds
      : typeof entry.agentId === 'string'
        ? [entry.agentId]
        : []
  ).filter((id) => Boolean(agents[id]) && rosterMemberIds.has(id))

  if (memberIds.length < 2) {
    return null
  }

  const agentId =
    typeof entry.agentId === 'string' && rosterMemberIds.has(entry.agentId)
      ? entry.agentId
      : memberIds[0]!

  return {
    teamId,
    teamName: team.name,
    memberIds,
    agentId,
  }
}

function sanitizeTrainingQueue(
  value: unknown,
  agents: GameState['agents'],
  teams: GameState['teams'],
  academyTier: number,
  campaignWeek: number
): TrainingQueueEntry[] {
  if (!Array.isArray(value)) {
    return []
  }

  const drillGroupRegistry = collectTrainingDrillGroupRegistry(value)
  const nextQueue: TrainingQueueEntry[] = []

  for (const [index, entry] of value.entries()) {
    if (!isRecord(entry)) {
      continue
    }

    const agentId = typeof entry.agentId === 'string' ? entry.agentId : undefined
    const agent = agentId ? agents[agentId] : undefined

    if (!agentId || !agent || isInventedAgentId(agentId)) {
      continue
    }

    const trainingId = typeof entry.trainingId === 'string' ? entry.trainingId : undefined

    if (!trainingId) {
      continue
    }

    const program = getTrainingProgram(trainingId)
    const scope =
      entry.scope === 'team' || entry.scope === 'agent' ? entry.scope : (program?.scope ?? 'agent')

    const teamDrillRefs =
      scope === 'team' ? reconcileTeamDrillMemberIds(entry, agents, teams) : null

    if (scope === 'team' && !teamDrillRefs) {
      continue
    }

    const durationWeeks = sanitizeInteger(
      entry.durationWeeks as number | undefined,
      program?.durationWeeks ?? 1,
      1
    )
    const remainingWeeks = Math.min(
      sanitizeInteger(entry.remainingWeeks as number | undefined, durationWeeks, 0),
      durationWeeks
    )
    const inFlight = isTrainingQueueEntryInFlight(remainingWeeks, durationWeeks)

    if (!program && !inFlight) {
      continue
    }

    if (program && !isTrainingProgramUnlocked({ academyTier }, program) && !inFlight) {
      continue
    }

    const persistedTrainingName =
      typeof entry.trainingName === 'string' && entry.trainingName.trim().length > 0
        ? entry.trainingName.trim()
        : undefined
    const trainingName = program?.name ?? persistedTrainingName

    if (!trainingName) {
      continue
    }

    const reconciledTrainingId = program?.trainingId ?? trainingId
    const memberIds = teamDrillRefs?.memberIds ?? sanitizeStringList(entry.memberIds)
    const reconciledAgentId = teamDrillRefs?.agentId ?? agentId

    if (!agents[reconciledAgentId]) {
      continue
    }

    const startedWeek = clamp(
      sanitizeInteger(entry.startedWeek as number | undefined, 1, 1),
      1,
      campaignWeek
    )
    const drillGroupId =
      scope === 'team' &&
      typeof entry.drillGroupId === 'string' &&
      entry.drillGroupId.length > 0 &&
      drillGroupRegistry.has(entry.drillGroupId)
        ? entry.drillGroupId
        : undefined

    const queueEntry: TrainingQueueEntry = {
      id:
        typeof entry.id === 'string' && entry.id.trim().length > 0
          ? entry.id.trim()
          : `training-${index + 1}`,
      trainingId: reconciledTrainingId,
      trainingName,
      scope,
      agentId: reconciledAgentId,
      agentName: agents[reconciledAgentId]!.name,
      targetStat: isOneOf(entry.targetStat, STAT_KEYS)
        ? entry.targetStat
        : (program?.targetStat ?? 'combat'),
      statDelta: sanitizeInteger(entry.statDelta as number | undefined, program?.statDelta ?? 1, 1),
      startedWeek,
      durationWeeks,
      remainingWeeks,
      fundingCost: sanitizeInteger(
        entry.fundingCost as number | undefined,
        program?.fundingCost ?? 0,
        0
      ),
      fatigueDelta: sanitizeInteger(
        entry.fatigueDelta as number | undefined,
        program?.fatigueDelta ?? 0,
        0
      ),
      recoveryBonus:
        typeof entry.recoveryBonus === 'number'
          ? sanitizeInteger(entry.recoveryBonus, 0, 0)
          : undefined,
      stabilityResistanceDelta:
        typeof entry.stabilityResistanceDelta === 'number'
          ? sanitizeInteger(entry.stabilityResistanceDelta, 0, 0)
          : undefined,
      stabilityToleranceDelta:
        typeof entry.stabilityToleranceDelta === 'number'
          ? sanitizeInteger(entry.stabilityToleranceDelta, 0, 0)
          : undefined,
      academyStatBonus:
        typeof entry.academyStatBonus === 'number'
          ? sanitizeInteger(entry.academyStatBonus, 0, 0)
          : undefined,
      relationshipDelta:
        typeof entry.relationshipDelta === 'number'
          ? sanitizeFiniteDecimalPreservePrecision(
              entry.relationshipDelta,
              program?.relationshipDelta ?? 0,
              RELATIONSHIP_VALUE_MIN,
              RELATIONSHIP_VALUE_MAX
            )
          : undefined,
      trainedRelationshipDelta:
        typeof entry.trainedRelationshipDelta === 'number'
          ? clamp(
              sanitizeInteger(
                entry.trainedRelationshipDelta,
                program?.trainedRelationshipDelta ?? 0,
                0
              ),
              0,
              RELATIONSHIP_VALUE_MAX
            )
          : undefined,
    }

    if (scope === 'team') {
      queueEntry.teamId = teamDrillRefs?.teamId
      queueEntry.teamName =
        teamDrillRefs?.teamName ??
        (typeof entry.teamId === 'string' && entry.teamId in teams
          ? teams[entry.teamId]!.name
          : undefined)
      if (drillGroupId) {
        queueEntry.drillGroupId = drillGroupId
      }
      if (memberIds.length > 0) {
        queueEntry.memberIds = memberIds
      }
    }

    nextQueue.push(queueEntry)
  }

  return assignUniqueQueueEntryIds(nextQueue, 'training')
}

function sanitizeProductionQueue(
  value: unknown,
  campaignWeek: number,
  market: MarketState
): ProductionQueueEntry[] {
  if (!Array.isArray(value)) {
    return []
  }

  const nextQueue: ProductionQueueEntry[] = []

  for (const [index, entry] of value.entries()) {
    if (!isRecord(entry)) {
      continue
    }

    const recipeId = typeof entry.recipeId === 'string' ? entry.recipeId : undefined

    if (!recipeId) {
      continue
    }

    const recipe = getProductionRecipe(recipeId)
    const durationWeeks = sanitizeInteger(
      entry.durationWeeks as number | undefined,
      recipe?.durationWeeks ?? 1,
      1
    )
    const remainingWeeks = Math.min(
      sanitizeInteger(entry.remainingWeeks as number | undefined, durationWeeks, 0),
      durationWeeks
    )
    const inFlight = isProductionQueueEntryInFlight(remainingWeeks, durationWeeks)

    if (!recipe && !inFlight) {
      continue
    }

    if (!recipe && inFlight) {
      continue
    }

    const resolvedRecipe = recipe!
    const outputItemId =
      typeof entry.outputItemId === 'string' ? entry.outputItemId : resolvedRecipe.outputItemId

    if (
      !isKnownProductionOutputItemId(outputItemId) ||
      outputItemId !== resolvedRecipe.outputItemId
    ) {
      continue
    }

    const startedWeek = clamp(
      sanitizeInteger(entry.startedWeek as number | undefined, 1, 1),
      1,
      campaignWeek
    )
    const inputMaterials = sanitizeProductionInputMaterials(entry, resolvedRecipe)

    nextQueue.push({
      id:
        typeof entry.id === 'string' && entry.id.trim().length > 0
          ? entry.id.trim()
          : `queue-${index + 1}`,
      recipeId,
      recipeName: resolvedRecipe.name,
      outputItemId,
      outputItemName: resolvedRecipe.outputItemName,
      outputQuantity: sanitizeInteger(
        entry.outputQuantity as number | undefined,
        resolvedRecipe.outputQuantity,
        1
      ),
      startedWeek,
      durationWeeks,
      remainingWeeks,
      fundingCost: reconcileProductionFundingCost(
        entry.fundingCost as number | undefined,
        resolvedRecipe,
        market
      ),
      ...(inputMaterials ? { inputMaterials } : {}),
    })
  }

  return assignUniqueQueueEntryIds(nextQueue, 'queue')
}

function sanitizeContractStatBlock(value: unknown, fallback: StatBlock): StatBlock {
  const raw = isRecord(value) ? value : {}

  return {
    combat: Math.max(1, sanitizeInteger(raw.combat as number | undefined, fallback.combat, 1)),
    investigation: Math.max(
      1,
      sanitizeInteger(raw.investigation as number | undefined, fallback.investigation, 1)
    ),
    utility: Math.max(1, sanitizeInteger(raw.utility as number | undefined, fallback.utility, 1)),
    social: Math.max(1, sanitizeInteger(raw.social as number | undefined, fallback.social, 1)),
  }
}

function sanitizeContractRewardPackage(
  value: unknown,
  fallback: ContractOffer['rewards']
): ContractOffer['rewards'] {
  const raw = isRecord(value) ? value : {}
  const knownMaterialItemIds = getKnownProcurementItemIds()

  const materials = Array.isArray(raw.materials)
    ? raw.materials
        .filter((entry): entry is Record<string, unknown> => isRecord(entry))
        .map((entry) => ({
          itemId: typeof entry.itemId === 'string' ? entry.itemId.trim() : '',
          label: typeof entry.label === 'string' ? entry.label.trim() : '',
          quantity: Math.max(0, sanitizeInteger(entry.quantity as number | undefined, 0, 0)),
        }))
        .filter(
          (entry) =>
            entry.itemId.length > 0 &&
            entry.label.length > 0 &&
            knownMaterialItemIds.has(entry.itemId)
        )
    : fallback.materials

  const research = Array.isArray(raw.research)
    ? raw.research
        .filter((entry): entry is Record<string, unknown> => isRecord(entry))
        .map((entry) => ({
          id: typeof entry.id === 'string' ? entry.id : '',
          label: typeof entry.label === 'string' ? entry.label : '',
          ...(typeof entry.description === 'string' ? { description: entry.description } : {}),
        }))
        .filter((entry) => entry.id.length > 0 && entry.label.length > 0)
    : fallback.research

  return {
    funding: Math.max(0, sanitizeInteger(raw.funding as number | undefined, fallback.funding, 0)),
    ...(materials && materials.length > 0 ? { materials } : {}),
    ...(research && research.length > 0 ? { research } : {}),
  }
}

function sanitizeContractRequirements(value: unknown): ContractOffer['requirements'] {
  const raw = isRecord(value) ? value : {}

  const dedupe = (entries: string[]) => [...new Set(entries)]

  return {
    recommendedClasses: dedupe(sanitizeStringList(raw.recommendedClasses)),
    discouragedClasses: dedupe(sanitizeStringList(raw.discouragedClasses)),
  }
}

function resolveHydratedFactionContact(
  factionId: string | undefined,
  contactId: string | undefined,
  factions: GameState['factions'] | undefined
): { factionId?: string; contactId?: string } {
  if (!factionId || !KNOWN_FACTION_IDS.has(factionId)) {
    return {}
  }

  if (!contactId) {
    return { factionId }
  }

  const contacts = factions?.[factionId]?.contacts ?? []
  if (!contacts.some((contact) => contact.id === contactId)) {
    return { factionId }
  }

  return { factionId, contactId }
}

function sanitizeHydratedContractOffer(
  value: unknown,
  factions: GameState['factions'] | undefined
): ContractOffer | null {
  if (!isRecord(value)) {
    return null
  }

  const templateId = typeof value.templateId === 'string' ? value.templateId : undefined
  const definition = templateId ? resolveContractTemplateDefinition(templateId) : undefined

  if (!templateId || !definition) {
    return null
  }

  const id = typeof value.id === 'string' && value.id.length > 0 ? value.id : undefined

  if (!id) {
    return null
  }

  const strategyTag = isOneOf(value.strategyTag, CONTRACT_STRATEGY_TAGS)
    ? value.strategyTag
    : definition.strategyTag
  const riskLevel = isOneOf(value.riskLevel, CONTRACT_RISK_LEVELS)
    ? value.riskLevel
    : CONTRACT_RISK_LEVELS[Math.min(CONTRACT_RISK_LEVELS.length - 1, 2)]!

  const caseTemplateId =
    typeof value.caseTemplateId === 'string' && value.caseTemplateId === definition.caseTemplateId
      ? value.caseTemplateId
      : definition.caseTemplateId

  const caseDifficulty = sanitizeContractStatBlock(value.caseDifficulty, {
    combat: Math.max(1, Math.round(definition.baseDifficultyScalar * 10)),
    investigation: Math.max(1, Math.round(definition.baseDifficultyScalar * 10)),
    utility: Math.max(1, Math.round(definition.baseDifficultyScalar * 10)),
    social: Math.max(1, Math.round(definition.baseDifficultyScalar * 10)),
  })
  const difficulty = Math.max(
    1,
    sanitizeInteger(value.difficulty as number | undefined, caseDifficulty.combat, 1)
  )
  const factionRefs = resolveHydratedFactionContact(
    typeof value.factionId === 'string' ? value.factionId : definition.factionId,
    typeof value.contactId === 'string' ? value.contactId : undefined,
    factions
  )
  const fieldBase = sanitizePersistedFieldBasePacket(value.fieldBase) ?? definition.fieldBase

  return {
    id,
    templateId,
    caseTemplateId,
    name:
      typeof value.name === 'string' && value.name.trim().length > 0 ? value.name : definition.name,
    description:
      typeof value.description === 'string' && value.description.trim().length > 0
        ? value.description
        : definition.description,
    ...factionRefs,
    caseDifficulty,
    difficulty,
    strategyTag,
    riskLevel,
    durationWeeks: Math.max(
      1,
      sanitizeInteger(value.durationWeeks as number | undefined, definition.durationWeeks ?? 1, 1)
    ),
    rewards: sanitizeContractRewardPackage(value.rewards, definition.baseRewards),
    requirements: sanitizeContractRequirements(value.requirements),
    modifiers: Array.isArray(value.modifiers)
      ? value.modifiers
          .filter((entry): entry is Record<string, unknown> => isRecord(entry))
          .map((entry) => ({
            id: typeof entry.id === 'string' ? entry.id : 'modifier',
            label: typeof entry.label === 'string' ? entry.label : 'Modifier',
            ...(typeof entry.description === 'string' ? { description: entry.description } : {}),
            ...(typeof entry.effect === 'string' ? { effect: entry.effect } : {}),
            ...(typeof entry.value === 'number' && Number.isFinite(entry.value)
              ? { value: entry.value }
              : {}),
            ...(Array.isArray(entry.conditions)
              ? { conditions: sanitizeStringList(entry.conditions) }
              : {}),
            ...(typeof entry.successModifier === 'number'
              ? { successModifier: entry.successModifier }
              : {}),
            ...(typeof entry.injuryRiskModifier === 'number'
              ? { injuryRiskModifier: entry.injuryRiskModifier }
              : {}),
            ...(typeof entry.deathRiskModifier === 'number'
              ? { deathRiskModifier: entry.deathRiskModifier }
              : {}),
            ...(typeof entry.rewardMultiplier === 'number'
              ? { rewardMultiplier: entry.rewardMultiplier }
              : {}),
          }))
      : definition.modifiers.map((modifier) => ({ ...modifier })),
    chain: isRecord(value.chain)
      ? {
          ...(Array.isArray(value.chain.nextContracts)
            ? { nextContracts: sanitizeStringList(value.chain.nextContracts) }
            : {}),
          ...(Array.isArray(value.chain.unlockConditions)
            ? {
                unlockConditions: value.chain.unlockConditions
                  .filter((entry): entry is Record<string, unknown> => isRecord(entry))
                  .map((entry) => ({ ...entry })),
              }
            : {}),
        }
      : {
          ...(definition.chain.nextContracts
            ? { nextContracts: [...definition.chain.nextContracts] }
            : {}),
          ...(definition.chain.unlockConditions
            ? {
                unlockConditions: definition.chain.unlockConditions.map((condition) => ({
                  ...condition,
                })),
              }
            : {}),
        },
    ...(typeof value.lootTableId === 'string' ? { lootTableId: value.lootTableId } : {}),
    ...(typeof value.generatedWeek === 'number' && Number.isFinite(value.generatedWeek)
      ? { generatedWeek: Math.max(0, Math.round(value.generatedWeek)) }
      : {}),
    ...(fieldBase ? { fieldBase } : {}),
  }
}

function sanitizeHydratedContractHistoryRecord(
  value: unknown,
  campaignWeek: number
): ContractHistoryRecord | null {
  if (!isRecord(value)) {
    return null
  }

  const completions = Math.max(0, sanitizeInteger(value.completions as number | undefined, 0, 0))
  const bestOutcome = isOneOf(value.bestOutcome, CONTRACT_HISTORY_OUTCOMES)
    ? value.bestOutcome
    : 'none'
  const lastOutcome = isOneOf(value.lastOutcome, MISSION_RESOLUTION_OUTCOMES)
    ? value.lastOutcome
    : undefined
  const lastCompletedWeek =
    typeof value.lastCompletedWeek === 'number' && Number.isFinite(value.lastCompletedWeek)
      ? clamp(Math.round(value.lastCompletedWeek), 1, campaignWeek)
      : undefined

  return {
    completions,
    bestOutcome,
    ...(lastOutcome ? { lastOutcome } : {}),
    ...(typeof lastCompletedWeek === 'number' ? { lastCompletedWeek } : {}),
  }
}

function sanitizeHydratedActiveContractRuntime(
  recordKey: string,
  value: unknown,
  context: {
    campaignWeek: number
    cases: GameState['cases']
    offers: ContractOffer[]
    factions: GameState['factions'] | undefined
  }
): { key: string; runtime: ActiveContractRuntime } | null {
  if (!isRecord(value)) {
    return null
  }

  const caseId =
    typeof value.caseId === 'string' && value.caseId.length > 0
      ? value.caseId
      : typeof value.contractId === 'string' && value.contractId.length > 0
        ? value.contractId
        : recordKey

  if (!context.cases[caseId]) {
    return null
  }

  const templateId = typeof value.templateId === 'string' ? value.templateId : undefined
  const definition = templateId ? resolveContractTemplateDefinition(templateId) : undefined

  if (templateId && !definition) {
    return null
  }

  const offerId = typeof value.offerId === 'string' ? value.offerId : undefined
  if (offerId && !context.offers.some((offer) => offer.id === offerId)) {
    return null
  }

  const startedWeek = clamp(
    sanitizeInteger(value.startedWeek as number | undefined, 1, 1),
    1,
    context.campaignWeek
  )
  const factionRefs = resolveHydratedFactionContact(
    typeof value.factionId === 'string' ? value.factionId : definition?.factionId,
    typeof value.contactId === 'string' ? value.contactId : undefined,
    context.factions
  )
  const fieldBase = sanitizePersistedFieldBasePacket(value.fieldBase)

  const runtime: ActiveContractRuntime = {
    contractId: caseId,
    ...(offerId ? { offerId } : {}),
    caseId,
    ...(templateId ? { templateId } : {}),
    startedWeek,
    ...(typeof value.name === 'string' ? { name: value.name } : {}),
    ...(typeof value.description === 'string' ? { description: value.description } : {}),
    ...factionRefs,
    ...(isOneOf(value.strategyTag, CONTRACT_STRATEGY_TAGS)
      ? { strategyTag: value.strategyTag }
      : {}),
    ...(isOneOf(value.riskLevel, CONTRACT_RISK_LEVELS) ? { riskLevel: value.riskLevel } : {}),
    ...(isRecord(value.caseDifficulty)
      ? {
          caseDifficulty: sanitizeContractStatBlock(value.caseDifficulty, {
            combat: 1,
            investigation: 1,
            utility: 1,
            social: 1,
          }),
        }
      : {}),
    ...(isRecord(value.rewards)
      ? {
          rewards: sanitizeContractRewardPackage(value.rewards, {
            funding: 0,
          }),
        }
      : {}),
    ...(typeof value.lootTableId === 'string' ? { lootTableId: value.lootTableId } : {}),
    ...(isRecord(value.requirements)
      ? {
          requirements: sanitizeContractRequirements(value.requirements),
        }
      : {}),
    ...(Array.isArray(value.modifiers)
      ? {
          modifiers: value.modifiers
            .filter((entry): entry is Record<string, unknown> => isRecord(entry))
            .map((entry) => ({
              id: typeof entry.id === 'string' ? entry.id : 'modifier',
              label: typeof entry.label === 'string' ? entry.label : 'Modifier',
            })),
        }
      : {}),
    ...(fieldBase ? { fieldBase } : {}),
  }

  return { key: caseId, runtime }
}

function sanitizeHydratedContractSystemState(
  value: unknown,
  campaignWeek: number,
  fallback: ContractSystemState | undefined,
  context: {
    factions: GameState['factions'] | undefined
    cases: GameState['cases']
  }
): ContractSystemState {
  const offers = Array.isArray((value as { offers?: unknown })?.offers)
    ? (value as { offers: unknown[] }).offers
        .map((offer) => sanitizeHydratedContractOffer(offer, context.factions))
        .filter((offer): offer is ContractOffer => offer !== null)
    : []

  const historyEntries: Array<[string, ContractHistoryRecord]> = []

  if (isRecord(value) && isRecord(value.history)) {
    for (const [templateId, record] of Object.entries(value.history)) {
      if (!resolveContractTemplateDefinition(templateId)) {
        continue
      }

      const sanitized = sanitizeHydratedContractHistoryRecord(record, campaignWeek)

      if (sanitized) {
        historyEntries.push([templateId, sanitized])
      }
    }
  }

  const activeEntries: Array<[string, ActiveContractRuntime]> = []

  if (isRecord(value) && isRecord(value.active)) {
    for (const [recordKey, record] of Object.entries(value.active)) {
      const sanitized = sanitizeHydratedActiveContractRuntime(recordKey, record, {
        campaignWeek,
        cases: context.cases,
        offers,
        factions: context.factions,
      })

      if (sanitized) {
        activeEntries.push([sanitized.key, sanitized.runtime])
      }
    }
  }

  const preSanitized = {
    ...(isRecord(value) ? value : {}),
    offers,
    history: Object.fromEntries(historyEntries),
    ...(activeEntries.length > 0 ? { active: Object.fromEntries(activeEntries) } : {}),
  }

  const sanitized = sanitizeContractSystemState(preSanitized, fallback)
  const debriefRecords = isRecord(value)
    ? sanitizeHydratedContractDebriefRecords(
        value.debriefRecords,
        campaignWeek,
        context.cases,
        context.factions
      )
    : undefined

  return {
    ...sanitized,
    ...(activeEntries.length > 0 ? { active: Object.fromEntries(activeEntries) } : {}),
    ...(debriefRecords ? { debriefRecords } : {}),
  } as ContractSystemState
}

function sanitizeExternalSupportAssetsMap(
  value: unknown
): GameState['externalSupportAssets'] | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const next: Record<string, ExternalSupportAsset> = {}

  for (const [recordKey, entry] of Object.entries(value)) {
    if (!isRecord(entry)) {
      continue
    }

    const id = typeof entry.id === 'string' && entry.id.length > 0 ? entry.id : recordKey
    const label = typeof entry.label === 'string' ? entry.label.trim() : ''

    if (!label) {
      continue
    }

    const assetClass = isOneOf(entry.assetClass, EXTERNAL_SUPPORT_ASSET_CLASSES)
      ? entry.assetClass
      : 'contractor'

    if (id !== recordKey) {
      continue
    }

    const tags = [
      ...new Set(
        sanitizeStringList(entry.tags)
          .map((tag) => tag.trim())
          .filter(Boolean)
      ),
    ]

    next[recordKey] = stripUndefinedFields({
      id,
      label,
      assetClass,
      reliability: clamp(sanitizeInteger(entry.reliability as number | undefined, 50, 0), 0, 100),
      tags,
      ...(typeof entry.lastDriftReason === 'string' && entry.lastDriftReason.trim().length > 0
        ? { lastDriftReason: entry.lastDriftReason.trim() }
        : {}),
    }) as ExternalSupportAsset
  }

  return Object.keys(next).length > 0 ? next : undefined
}

function sanitizeHydratedContact(value: unknown): Contact | null {
  if (!isRecord(value)) {
    return null
  }

  const id = typeof value.id === 'string' && value.id.length > 0 ? value.id : undefined
  const name =
    typeof value.name === 'string' && value.name.trim().length > 0 ? value.name : undefined
  const role =
    typeof value.role === 'string' && value.role.trim().length > 0 ? value.role : undefined

  if (!id || !name || !role) {
    return null
  }

  const status = isOneOf(value.status, CONTACT_STATUSES) ? value.status : 'inactive'
  const relationship = clamp(
    sanitizeInteger(value.relationship as number | undefined, 0, -100),
    -100,
    100
  )

  return stripUndefinedFields({
    id,
    name,
    role,
    status,
    relationship,
    ...(typeof value.label === 'string' && value.label.trim().length > 0
      ? { label: value.label.trim() }
      : {}),
    ...(typeof value.disposition === 'string' ? { disposition: value.disposition } : {}),
    ...(isOneOf(value.minTier, REPUTATION_TIERS) ? { minTier: value.minTier } : {}),
    ...(isOneOf(value.maxTier, REPUTATION_TIERS) ? { maxTier: value.maxTier } : {}),
    ...(typeof value.rewardId === 'string' ? { rewardId: value.rewardId } : {}),
    ...(typeof value.summary === 'string' ? { summary: value.summary } : {}),
    focusTags: sanitizeStringList(value.focusTags),
    modifiers: Array.isArray(value.modifiers)
      ? value.modifiers
          .filter((entry): entry is Record<string, unknown> => isRecord(entry))
          .map((entry) => ({
            id: typeof entry.id === 'string' ? entry.id : 'modifier',
            label: typeof entry.label === 'string' ? entry.label : 'Modifier',
            ...(typeof entry.description === 'string' ? { description: entry.description } : {}),
          }))
      : [],
    rewards: Array.isArray(value.rewards)
      ? value.rewards
          .filter((entry): entry is Record<string, unknown> => isRecord(entry))
          .map((entry) => ({ ...entry }))
      : [],
    history: {
      interactions: Array.isArray((value.history as { interactions?: unknown })?.interactions)
        ? (value.history as { interactions: unknown[] }).interactions
            .filter((entry): entry is Record<string, unknown> => isRecord(entry))
            .map((entry) => ({
              ...(typeof entry.id === 'string' ? { id: entry.id } : {}),
              ...(typeof entry.label === 'string' ? { label: entry.label } : {}),
              ...(typeof entry.week === 'number' && Number.isFinite(entry.week)
                ? { week: Math.max(1, Math.round(entry.week)) }
                : {}),
            }))
        : [],
    },
  }) as Contact
}

function sanitizeFactionsMap(
  value: unknown,
  fallback: GameState['factions']
): GameState['factions'] {
  if (!isRecord(value)) {
    return fallback
  }

  const next: NonNullable<GameState['factions']> = {}

  for (const factionId of FACTION_DEFINITIONS.map((faction) => faction.id)) {
    const entry = value[factionId]

    if (!isRecord(entry)) {
      continue
    }

    const definition = getFactionDefinition(factionId)!
    const reputation = clamp(
      sanitizeInteger(entry.reputation as number | undefined, 0, -100),
      -100,
      100
    )
    const knownContactIds = new Set(
      (fallback[factionId]?.contacts ?? []).map((contact) => contact.id)
    )
    const contacts = Array.isArray(entry.contacts)
      ? entry.contacts
          .map((contact) => sanitizeHydratedContact(contact))
          .filter(
            (contact): contact is Contact => contact !== null && knownContactIds.has(contact.id)
          )
      : [...(fallback[factionId]?.contacts ?? [])]
    const historyRaw = isRecord(entry.history) ? entry.history : {}
    const missionsCompleted = Math.max(
      0,
      sanitizeInteger(historyRaw.missionsCompleted as number | undefined, 0, 0)
    )
    const missionsFailed = Math.max(
      0,
      sanitizeInteger(historyRaw.missionsFailed as number | undefined, 0, 0)
    )
    const totalMissions = missionsCompleted + missionsFailed
    const successRate = totalMissions > 0 ? missionsCompleted / totalMissions : 0

    const loreRaw = isRecord(entry.lore) ? entry.lore : undefined
    const lore =
      loreRaw && Array.isArray(loreRaw.discovered)
        ? {
            discovered: loreRaw.discovered
              .filter((item): item is Record<string, unknown> => isRecord(item))
              .map((item) => ({
                label: typeof item.label === 'string' ? item.label : 'Lore',
                summary: typeof item.summary === 'string' ? item.summary : '',
              }))
              .filter((item) => item.label.length > 0),
            remainingCount: Math.max(
              0,
              sanitizeInteger(loreRaw.remainingCount as number | undefined, 0, 0)
            ),
          }
        : { discovered: [], remainingCount: 1 }

    next[factionId] = stripUndefinedFields({
      id: definition.id,
      name: typeof entry.name === 'string' ? entry.name : definition.name,
      label: typeof entry.label === 'string' ? entry.label : definition.label,
      reputation,
      reputationTier: getFactionReputationTier(reputation),
      contacts,
      history: {
        missionsCompleted,
        missionsFailed,
        successRate,
        interactionLog: Array.isArray(historyRaw.interactionLog)
          ? historyRaw.interactionLog
              .filter((item): item is Record<string, unknown> => isRecord(item))
              .map((item) => ({
                ...(typeof item.id === 'string' ? { id: item.id } : {}),
                ...(typeof item.label === 'string' ? { label: item.label } : {}),
                ...(typeof item.week === 'number' && Number.isFinite(item.week)
                  ? { week: Math.max(1, Math.round(item.week)) }
                  : {}),
              }))
          : [],
      },
      knownModifiers: Array.isArray(entry.knownModifiers)
        ? entry.knownModifiers
            .filter((item): item is Record<string, unknown> => isRecord(item))
            .map((item) => ({
              id: typeof item.id === 'string' ? item.id : 'modifier',
              label: typeof item.label === 'string' ? item.label : 'Modifier',
              ...(typeof item.description === 'string' ? { description: item.description } : {}),
            }))
        : [],
      hiddenModifierCount: Math.max(
        0,
        sanitizeInteger(entry.hiddenModifierCount as number | undefined, 0, 0)
      ),
      availableFavors: Array.isArray(entry.availableFavors)
        ? entry.availableFavors
            .filter((item): item is Record<string, unknown> => isRecord(item))
            .map((item) => ({ ...item }))
        : [],
      recruitUnlocks: Array.isArray(entry.recruitUnlocks)
        ? entry.recruitUnlocks
            .filter((item): item is Record<string, unknown> => isRecord(item))
            .map((item) => ({
              factionId:
                typeof item.factionId === 'string' && KNOWN_FACTION_IDS.has(item.factionId)
                  ? item.factionId
                  : factionId,
              factionName:
                typeof item.factionName === 'string' ? item.factionName : definition.name,
              ...(typeof item.contactId === 'string' ? { contactId: item.contactId } : {}),
              ...(typeof item.contactName === 'string' ? { contactName: item.contactName } : {}),
              label: typeof item.label === 'string' ? item.label : 'Recruit channel',
              ...(typeof item.summary === 'string' ? { summary: item.summary } : {}),
              ...(typeof item.disposition === 'string' ? { disposition: item.disposition } : {}),
              rewardId: typeof item.rewardId === 'string' ? item.rewardId : 'reward',
            }))
            .filter(
              (unlock) =>
                !unlock.contactId || contacts.some((contact) => contact.id === unlock.contactId)
            )
        : [],
      lore,
    }) as FactionRuntimeState
  }

  return Object.keys(next).length > 0 ? next : fallback
}

function isGameFlagValue(value: unknown): value is GameFlagValue {
  return (
    typeof value === 'string' ||
    (typeof value === 'number' && Number.isFinite(value)) ||
    typeof value === 'boolean'
  )
}

function sanitizePersistedGlobalFlags(value: unknown): Record<string, GameFlagValue> {
  if (!isRecord(value)) {
    return {}
  }

  const next: Record<string, GameFlagValue> = {}

  for (const [flagId, rawValue] of Object.entries(value)) {
    const normalizedId = typeof flagId === 'string' ? flagId.trim() : ''

    if (normalizedId.length === 0 || !isGameFlagValue(rawValue) || normalizedId in next) {
      continue
    }

    next[normalizedId] =
      typeof rawValue === 'number'
        ? Number.isInteger(rawValue)
          ? Math.trunc(rawValue)
          : rawValue
        : rawValue
  }

  return next
}

/** SPE-441: normalize agency.fundingState at hydrate; top-level mirrors win over stale agency copies. */
function sanitizeHydratedFundingValue(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined
  }

  return sanitizeInteger(value, 0, 0)
}

function resolveHydratedFunding(game: Record<string, unknown>, fallback: GameState): number {
  const topLevelFunding = sanitizeHydratedFundingValue(game.funding)
  if (topLevelFunding !== undefined) {
    return topLevelFunding
  }

  if (isRecord(game.agency)) {
    const agencyFunding = sanitizeHydratedFundingValue(game.agency.funding)
    if (agencyFunding !== undefined) {
      return agencyFunding
    }

    if (isRecord(game.agency.fundingState)) {
      const fundingStateFunding = sanitizeHydratedFundingValue(game.agency.fundingState.funding)
      if (fundingStateFunding !== undefined) {
        return fundingStateFunding
      }
    }
  }

  return sanitizeInteger(fallback.funding, 0, 0)
}

function sanitizeAgencyState(
  raw: unknown,
  mirrors: {
    containmentRating: number
    clearanceLevel: number
    funding: number
    supportAvailable?: number
    coordinationFrictionActive?: boolean
    coordinationFrictionReason?: string
  },
  config: GameConfig,
  campaignWeek: number
): AgencyState | undefined {
  if (!isRecord(raw)) {
    return undefined
  }

  const funding = sanitizeInteger(mirrors.funding, 0, 0)
  const fundingState = normalizeFundingState(
    funding,
    config,
    isRecord(raw.fundingState) ? (raw.fundingState as AgencyState['fundingState']) : undefined,
    campaignWeek
  )

  const maintenanceSpecialistsAvailable = sanitizeMaintenanceSpecialistsAvailable(
    raw.maintenanceSpecialistsAvailable
  )
  const courierShellFront = sanitizeCourierShellFrontState(raw.courierShellFront, campaignWeek)
  const progressionUnlockIds = sanitizeProgressionUnlockIds(raw.progressionUnlockIds)

  const agency: AgencyState = {
    containmentRating: sanitizeInteger(
      mirrors.containmentRating,
      sanitizeInteger(raw.containmentRating as number | undefined, mirrors.containmentRating, 0),
      0
    ),
    clearanceLevel: sanitizeInteger(
      mirrors.clearanceLevel,
      sanitizeInteger(raw.clearanceLevel as number | undefined, mirrors.clearanceLevel, 1),
      1
    ),
    funding,
    fundingState: {
      ...fundingState,
      funding,
    },
    ...(mirrors.supportAvailable !== undefined
      ? {
          supportAvailable: sanitizeInteger(
            mirrors.supportAvailable,
            sanitizeInteger(
              raw.supportAvailable as number | undefined,
              mirrors.supportAvailable,
              0
            ),
            0
          ),
        }
      : {}),
    ...(maintenanceSpecialistsAvailable !== undefined ? { maintenanceSpecialistsAvailable } : {}),
    ...(typeof mirrors.coordinationFrictionActive === 'boolean'
      ? { coordinationFrictionActive: mirrors.coordinationFrictionActive }
      : {}),
    ...(typeof mirrors.coordinationFrictionReason === 'string' &&
    mirrors.coordinationFrictionReason.length > 0
      ? { coordinationFrictionReason: mirrors.coordinationFrictionReason }
      : {}),
    ...(courierShellFront ? { courierShellFront } : {}),
    ...sanitizePersistedAgencyProtocols(raw, mirrors.clearanceLevel),
    ...(progressionUnlockIds ? { progressionUnlockIds } : {}),
  }

  return agency
}

/** SPE-427: runtimeState.globalFlags owns; top-level mirror is rebuilt after legacy merge. */
function reconcileHydratedGlobalFlags(
  runtimeStateRaw: unknown,
  topLevelFlagsRaw: unknown,
  campaignWeek: number,
  fallbackRuntime?: RuntimeState
): { runtimeState: RuntimeState; globalFlags: Record<string, GameFlagValue> } {
  const legacyFlags = sanitizePersistedGlobalFlags(topLevelFlagsRaw)
  const runtimeSeed = isRecord(runtimeStateRaw) ? runtimeStateRaw : {}
  const runtimeFlags = isRecord(runtimeSeed.globalFlags)
    ? sanitizePersistedGlobalFlags(runtimeSeed.globalFlags)
    : {}
  const runtimeState = normalizeRuntimeState(
    {
      ...runtimeSeed,
      globalFlags: {
        ...legacyFlags,
        ...runtimeFlags,
      },
    },
    campaignWeek,
    fallbackRuntime,
    'hydrate'
  )

  return {
    runtimeState,
    globalFlags: { ...runtimeState.globalFlags },
  }
}

function uniqueSortedProjectIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) {
    return []
  }

  return [
    ...new Set(ids.filter((id): id is string => typeof id === 'string' && id.length > 0)),
  ].sort((left, right) => left.localeCompare(right))
}

function sanitizeResearchUnlock(value: unknown): ResearchUnlock | null {
  if (!isRecord(value)) {
    return null
  }

  const id = typeof value.id === 'string' ? value.id.trim() : ''
  const label = typeof value.label === 'string' ? value.label.trim() : ''

  if (!id || !label) {
    return null
  }

  const category =
    typeof value.category === 'string' && value.category.trim().length > 0
      ? value.category.trim()
      : 'contract'

  return stripUndefinedFields({
    id,
    label,
    category,
    ...(typeof value.description === 'string' && value.description.trim().length > 0
      ? { description: value.description.trim() }
      : {}),
  }) as ResearchUnlock
}

function sanitizeResearchProject(
  recordKey: string,
  value: unknown,
  campaignWeek: number
): ResearchProject | null {
  if (!isRecord(value)) {
    return null
  }

  const projectId =
    typeof value.projectId === 'string' && value.projectId.length > 0 ? value.projectId : recordKey

  if (projectId !== recordKey) {
    return null
  }

  const status = isOneOf(value.status, RESEARCH_PROJECT_STATUSES) ? value.status : 'locked'

  const unlocks = Array.isArray(value.unlocks)
    ? value.unlocks
        .map((unlock) => sanitizeResearchUnlock(unlock))
        .filter((unlock): unlock is ResearchUnlock => unlock !== null)
    : []

  const costTime = Math.max(0, sanitizeInteger(value.costTime as number | undefined, 0, 0))
  const costData = Math.max(0, sanitizeInteger(value.costData as number | undefined, 0, 0))
  const costMaterials = Math.max(
    0,
    sanitizeInteger(value.costMaterials as number | undefined, 0, 0)
  )

  const startedWeek =
    typeof value.startedWeek === 'number' && Number.isFinite(value.startedWeek)
      ? clamp(Math.round(value.startedWeek), 1, campaignWeek)
      : undefined
  const completedWeek =
    typeof value.completedWeek === 'number' && Number.isFinite(value.completedWeek)
      ? clamp(Math.round(value.completedWeek), 1, campaignWeek)
      : undefined
  const lastUpdatedWeek =
    typeof value.lastUpdatedWeek === 'number' && Number.isFinite(value.lastUpdatedWeek)
      ? clamp(Math.round(value.lastUpdatedWeek), 1, campaignWeek)
      : undefined
  const progressTime =
    typeof value.progressTime === 'number' && Number.isFinite(value.progressTime)
      ? clamp(Math.round(value.progressTime), 0, Math.max(costTime, 0))
      : undefined
  const progressData =
    typeof value.progressData === 'number' && Number.isFinite(value.progressData)
      ? clamp(Math.round(value.progressData), 0, Math.max(costData, 0))
      : undefined
  const progressMaterials =
    typeof value.progressMaterials === 'number' && Number.isFinite(value.progressMaterials)
      ? clamp(Math.round(value.progressMaterials), 0, Math.max(costMaterials, 0))
      : undefined

  return stripUndefinedFields({
    projectId,
    ...(typeof value.label === 'string' && value.label.trim().length > 0
      ? { label: value.label.trim() }
      : {}),
    ...(typeof value.category === 'string' && value.category.trim().length > 0
      ? { category: value.category.trim() }
      : {}),
    status,
    costTime,
    costData,
    costMaterials,
    ...(progressTime !== undefined ? { progressTime } : {}),
    ...(progressData !== undefined ? { progressData } : {}),
    ...(progressMaterials !== undefined ? { progressMaterials } : {}),
    ...(startedWeek !== undefined ? { startedWeek } : {}),
    ...(completedWeek !== undefined ? { completedWeek } : {}),
    ...(lastUpdatedWeek !== undefined ? { lastUpdatedWeek } : {}),
    ...(Array.isArray(value.requiredResearchIds)
      ? {
          requiredResearchIds: uniqueSortedProjectIds(value.requiredResearchIds),
        }
      : {}),
    ...(Array.isArray(value.requiredFacilityLevels)
      ? {
          requiredFacilityLevels: value.requiredFacilityLevels
            .filter((entry): entry is Record<string, unknown> => isRecord(entry))
            .map((entry) => ({
              facilityId: typeof entry.facilityId === 'string' ? entry.facilityId.trim() : '',
              level: Math.max(0, sanitizeInteger(entry.level as number | undefined, 0, 0)),
            }))
            .filter((entry) => entry.facilityId.length > 0),
        }
      : {}),
    ...(Array.isArray(value.blockedReasons)
      ? { blockedReasons: sanitizeStringList(value.blockedReasons) }
      : {}),
    unlocks,
  }) as ResearchProject
}

/** SPE-608: queue/active/completed lists are derived from `project.status`. */
function reconcileResearchProjectListsFromStatus(state: ResearchState): ResearchState {
  const activeProjectIds: string[] = []
  const queuedProjectIds: string[] = []
  const completedProjectIds: string[] = []
  const availableProjectIds: string[] = []
  const blockedProjectIds: string[] = []

  for (const [projectId, project] of Object.entries(state.projects)) {
    switch (project.status) {
      case 'active':
        activeProjectIds.push(projectId)
        break
      case 'queued':
        queuedProjectIds.push(projectId)
        break
      case 'completed':
        completedProjectIds.push(projectId)
        break
      case 'available':
        availableProjectIds.push(projectId)
        break
      case 'blocked':
        blockedProjectIds.push(projectId)
        break
      default:
        break
    }
  }

  const sortIds = (ids: string[]) => [...ids].sort((left, right) => left.localeCompare(right))

  return {
    ...state,
    activeProjectIds: sortIds(activeProjectIds),
    queuedProjectIds: sortIds(queuedProjectIds),
    completedProjectIds: sortIds(completedProjectIds),
    availableProjectIds: sortIds(availableProjectIds),
    blockedProjectIds: sortIds(blockedProjectIds),
  }
}

function filterResearchProjectPrerequisiteIds(
  projects: Record<string, ResearchProject>
): Record<string, ResearchProject> {
  const knownProjectIds = new Set(Object.keys(projects))
  const next: Record<string, ResearchProject> = {}

  for (const [projectId, project] of Object.entries(projects)) {
    if (!project.requiredResearchIds || project.requiredResearchIds.length === 0) {
      next[projectId] = project
      continue
    }

    const requiredResearchIds = uniqueSortedProjectIds(project.requiredResearchIds).filter(
      (requiredId) => requiredId !== projectId && knownProjectIds.has(requiredId)
    )

    next[projectId] =
      requiredResearchIds.length > 0
        ? { ...project, requiredResearchIds }
        : stripUndefinedFields({
            ...project,
            requiredResearchIds: undefined,
          })
  }

  return next
}

/** SPE-610: apply sanitized facility effect scalars after base research bounds. */
function applyHydratedFacilityResearchScalars(
  state: ResearchState,
  facilityState?: FacilityState
): ResearchState {
  if (!facilityState?.facilities) {
    return state
  }

  const facilities = Object.values(facilityState.facilities)
  const bonusSlots = facilities.reduce((sum, facility) => {
    const raw = facility.effects.researchSlots

    return (
      sum + (typeof raw === 'number' && Number.isFinite(raw) ? Math.max(0, Math.round(raw)) : 0)
    )
  }, 0)
  const speedMultiplier = facilities.reduce((product, facility) => {
    const raw = facility.effects.researchSpeedMultiplier

    if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) {
      return product
    }

    return (
      product * sanitizeFiniteDecimalPreservePrecision(raw, 1, 0.1, MAX_RESEARCH_SPEED_MULTIPLIER)
    )
  }, 1)

  if (bonusSlots === 0 && speedMultiplier === 1) {
    return state
  }

  return {
    ...state,
    researchSlots: Math.max(1, state.researchSlots + bonusSlots),
    researchSpeedMultiplier: clamp(
      sanitizeFiniteDecimalPreservePrecision(
        state.researchSpeedMultiplier * speedMultiplier,
        state.researchSpeedMultiplier,
        0.1,
        MAX_RESEARCH_SPEED_MULTIPLIER
      ),
      0.1,
      MAX_RESEARCH_SPEED_MULTIPLIER
    ),
  }
}

/** SPE-424 / SPE-607–610: drop malformed projects; reconcile lists, scalars, and facility coupling. */
function sanitizeResearchState(
  value: unknown,
  campaignWeek: number,
  fallback?: ResearchState,
  facilityState?: FacilityState
): ResearchState | undefined {
  if (!isRecord(value)) {
    return fallback
  }

  const projects: Record<string, ResearchProject> = {}

  if (isRecord(value.projects)) {
    for (const [recordKey, project] of Object.entries(value.projects)) {
      const sanitized = sanitizeResearchProject(recordKey, project, campaignWeek)

      if (sanitized) {
        projects[recordKey] = sanitized
      }
    }
  }

  const base = fallback ?? createInitialResearchState()

  const sanitized = stripUndefinedFields({
    projects: filterResearchProjectPrerequisiteIds(projects),
    activeProjectIds: [],
    queuedProjectIds: [],
    completedProjectIds: [],
    availableProjectIds: [],
    blockedProjectIds: [],
    researchSlots: clamp(
      sanitizeInteger(value.researchSlots as number | undefined, base.researchSlots, 1),
      1,
      MAX_RESEARCH_SLOTS
    ),
    researchSpeedMultiplier: clamp(
      sanitizeFiniteDecimalPreservePrecision(
        value.researchSpeedMultiplier as number | undefined,
        base.researchSpeedMultiplier,
        0.1,
        MAX_RESEARCH_SPEED_MULTIPLIER
      ),
      0.1,
      MAX_RESEARCH_SPEED_MULTIPLIER
    ),
    researchDataPool: clamp(
      sanitizeInteger(value.researchDataPool as number | undefined, base.researchDataPool, 0),
      0,
      MAX_RESEARCH_POOL
    ),
    researchMaterialsPool: clamp(
      sanitizeInteger(
        value.researchMaterialsPool as number | undefined,
        base.researchMaterialsPool,
        0
      ),
      0,
      MAX_RESEARCH_POOL
    ),
  }) as ResearchState

  const reconciled = applyHydratedFacilityResearchScalars(
    recomputeResearchState(
      reconcileResearchProjectListsFromStatus(sanitized),
      campaignWeek,
      facilityState
    ),
    facilityState
  )

  return reconciled
}

function sanitizeFacilityEffect(value: unknown): FacilityEffect {
  if (!isRecord(value)) {
    return {}
  }

  const next: FacilityEffect = {}

  for (const key of FACILITY_EFFECT_KEYS) {
    const raw = value[key]

    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      continue
    }

    next[key] = sanitizeFiniteDecimalPreservePrecision(raw, 0, 0, 100)
  }

  return next
}

function sanitizeFacilityInstance(
  recordKey: string,
  value: unknown,
  campaignWeek: number
): FacilityInstance | null {
  if (!isRecord(value)) {
    return null
  }

  const facilityId =
    typeof value.facilityId === 'string' && value.facilityId.length > 0
      ? value.facilityId
      : recordKey

  if (facilityId !== recordKey) {
    return null
  }

  const maxLevel = clamp(
    sanitizeInteger(value.maxLevel as number | undefined, MAX_FACILITY_LEVEL, 1),
    1,
    MAX_FACILITY_LEVEL
  )
  const level = clamp(sanitizeInteger(value.level as number | undefined, 1, 1), 1, maxLevel)
  const status = isOneOf(value.status, FACILITY_STATUSES) ? value.status : 'inactive'
  const upgradeInProgress = value.upgradeInProgress === true
  const upgradeStartedWeek =
    typeof value.upgradeStartedWeek === 'number' && Number.isFinite(value.upgradeStartedWeek)
      ? clamp(Math.round(value.upgradeStartedWeek), 1, campaignWeek)
      : undefined
  const upgradeCompleteWeek =
    typeof value.upgradeCompleteWeek === 'number' && Number.isFinite(value.upgradeCompleteWeek)
      ? clamp(Math.round(value.upgradeCompleteWeek), 1, campaignWeek + 52)
      : undefined
  const pendingEffectDeltas = sanitizeFacilityEffect(value.pendingEffectDeltas)

  const normalizedUpgradeInProgress =
    upgradeInProgress &&
    upgradeStartedWeek !== undefined &&
    upgradeCompleteWeek !== undefined &&
    upgradeCompleteWeek >= upgradeStartedWeek
  const normalizedStatus = normalizedUpgradeInProgress
    ? 'upgrading'
    : status === 'upgrading'
      ? 'inactive'
      : status

  return stripUndefinedFields({
    facilityId,
    category:
      typeof value.category === 'string' && value.category.trim().length > 0
        ? value.category.trim()
        : facilityId,
    level,
    maxLevel,
    status: normalizedStatus,
    effects: sanitizeFacilityEffect(value.effects),
    ...(normalizedUpgradeInProgress
      ? {
          upgradeInProgress: true,
          upgradeStartedWeek,
          upgradeCompleteWeek:
            upgradeCompleteWeek >= upgradeStartedWeek ? upgradeCompleteWeek : upgradeStartedWeek,
        }
      : {}),
    ...(normalizedUpgradeInProgress && Object.keys(pendingEffectDeltas).length > 0
      ? { pendingEffectDeltas }
      : {}),
  }) as FacilityInstance
}

/** SPE-425: allowlist facility effect keys; drop malformed facility records. */
function sanitizeFacilityState(
  value: unknown,
  campaignWeek: number,
  fallback?: FacilityState
): FacilityState | undefined {
  if (!isRecord(value) || !isRecord(value.facilities)) {
    return fallback
  }

  const facilities: Record<string, FacilityInstance> = {}

  for (const [recordKey, facility] of Object.entries(value.facilities)) {
    const sanitized = sanitizeFacilityInstance(recordKey, facility, campaignWeek)

    if (sanitized) {
      facilities[recordKey] = sanitized
    }
  }

  if (Object.keys(facilities).length === 0) {
    return fallback
  }

  return { facilities }
}

function sanitizeRelationshipSnapshot(
  value: unknown,
  campaignWeek: number,
  agentIds: Set<string>
): RelationshipSnapshot | null {
  if (!isRecord(value)) {
    return null
  }

  const agentAId = typeof value.agentAId === 'string' ? value.agentAId : ''
  const agentBId = typeof value.agentBId === 'string' ? value.agentBId : ''

  if (
    agentAId.length === 0 ||
    agentBId.length === 0 ||
    agentAId === agentBId ||
    !agentIds.has(agentAId) ||
    !agentIds.has(agentBId)
  ) {
    return null
  }

  const week = clamp(
    sanitizeInteger(value.week as number | undefined, campaignWeek, 1),
    1,
    campaignWeek
  )
  const snapshotValue = clamp(
    sanitizeFiniteDecimalPreservePrecision(
      value.value as number | undefined,
      0,
      RELATIONSHIP_VALUE_MIN,
      RELATIONSHIP_VALUE_MAX
    ),
    RELATIONSHIP_VALUE_MIN,
    RELATIONSHIP_VALUE_MAX
  )
  const reason = isOneOf(value.reason, RELATIONSHIP_SNAPSHOT_REASONS) ? value.reason : undefined
  const trustDamage =
    typeof value.trustDamage === 'number' && Number.isFinite(value.trustDamage)
      ? clamp(
          sanitizeFiniteDecimalPreservePrecision(value.trustDamage, 0, 0, RELATIONSHIP_VALUE_MAX),
          0,
          RELATIONSHIP_VALUE_MAX
        )
      : undefined

  return stripUndefinedFields({
    week,
    agentAId,
    agentBId,
    value: snapshotValue,
    modifiers: sanitizeStringList(value.modifiers)
      .map((modifier) => modifier.trim())
      .filter(Boolean),
    ...(trustDamage !== undefined ? { trustDamage } : {}),
    ...(reason ? { reason } : {}),
  }) as RelationshipSnapshot
}

/** SPE-426: drop snapshots with stale agent references or invalid pairs. */
function sanitizeRelationshipHistory(
  value: unknown,
  campaignWeek: number,
  agents: GameState['agents'],
  fallback?: RelationshipSnapshot[]
): RelationshipSnapshot[] | undefined {
  if (!Array.isArray(value)) {
    return fallback
  }

  const agentIds = new Set(Object.keys(agents))
  const next = value
    .map((entry) => sanitizeRelationshipSnapshot(entry, campaignWeek, agentIds))
    .filter((entry): entry is RelationshipSnapshot => entry !== null)
    .slice(-MAX_RELATIONSHIP_HISTORY_ENTRIES)

  return next.length > 0 ? next : fallback
}

function sanitizeHubOpportunity(
  value: unknown,
  factionIds: ReadonlySet<string>
): HubState['opportunities'][number] | null {
  if (!isRecord(value)) {
    return null
  }

  const id = typeof value.id === 'string' ? value.id.trim() : ''
  const label = typeof value.label === 'string' ? value.label.trim() : ''
  const detail = typeof value.detail === 'string' ? value.detail.trim() : ''
  const factionId = typeof value.factionId === 'string' ? value.factionId.trim() : ''

  if (!id || !label || !detail || !factionIds.has(factionId)) {
    return null
  }

  return stripUndefinedFields({
    id,
    label,
    detail,
    factionId,
    confidence: clamp(
      sanitizeFiniteDecimalPreservePrecision(value.confidence as number | undefined, 0.5, 0, 1),
      0,
      1
    ),
    ...(typeof value.misleading === 'boolean' ? { misleading: value.misleading } : {}),
    ...(isOneOf(value.requiredSanctionLevel, HUB_SANCTION_LEVELS)
      ? { requiredSanctionLevel: value.requiredSanctionLevel }
      : {}),
    ...(typeof value.accessExplanation === 'string' && value.accessExplanation.trim().length > 0
      ? { accessExplanation: value.accessExplanation.trim() }
      : {}),
    ...(isOneOf(value.accessState, HUB_ACCESS_STATES) ? { accessState: value.accessState } : {}),
  }) as HubState['opportunities'][number]
}

function sanitizeHubRumor(value: unknown): HubState['rumors'][number] | null {
  if (!isRecord(value)) {
    return null
  }

  const id = typeof value.id === 'string' ? value.id.trim() : ''
  const label = typeof value.label === 'string' ? value.label.trim() : ''
  const detail = typeof value.detail === 'string' ? value.detail.trim() : ''

  if (!id || !label || !detail) {
    return null
  }

  return stripUndefinedFields({
    id,
    label,
    detail,
    confidence: clamp(
      sanitizeFiniteDecimalPreservePrecision(value.confidence as number | undefined, 0.5, 0, 1),
      0,
      1
    ),
    ...(typeof value.misleading === 'boolean' ? { misleading: value.misleading } : {}),
    ...(typeof value.filtered === 'boolean' ? { filtered: value.filtered } : {}),
  }) as HubState['rumors'][number]
}

/** SPE-428: bounded HubState sanitizer; strip payloads that do not match the hub model. */
function sanitizeHubState(value: unknown, factions?: GameState['factions']): HubState | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const factionIds = new Set(Object.keys(factions ?? {}))
  if (factionIds.size === 0) {
    for (const factionId of KNOWN_FACTION_IDS) {
      factionIds.add(factionId)
    }
  }

  const districtKey =
    typeof value.districtKey === 'string' && isOneOf(value.districtKey.trim(), HUB_DISTRICT_KEYS)
      ? value.districtKey.trim()
      : HUB_DISTRICT_KEYS[0]

  const factionPresence: Record<string, number> = {}

  if (isRecord(value.factionPresence)) {
    for (const [factionId, standing] of Object.entries(value.factionPresence)) {
      const normalizedFactionId = factionId.trim()
      if (!factionIds.has(normalizedFactionId)) {
        continue
      }

      factionPresence[normalizedFactionId] = clamp(
        sanitizeFiniteDecimalPreservePrecision(standing as number | undefined, 0, -100, 100),
        -100,
        100
      )
    }
  }

  const opportunities = Array.isArray(value.opportunities)
    ? value.opportunities
        .map((entry) => sanitizeHubOpportunity(entry, factionIds))
        .filter((entry): entry is HubState['opportunities'][number] => entry !== null)
        .slice(0, 8)
    : []

  const rumors = Array.isArray(value.rumors)
    ? value.rumors
        .map((entry) => sanitizeHubRumor(entry))
        .filter((entry): entry is HubState['rumors'][number] => entry !== null)
        .slice(0, 8)
    : []

  if (
    opportunities.length === 0 &&
    rumors.length === 0 &&
    Object.keys(factionPresence).length === 0
  ) {
    return undefined
  }

  return {
    districtKey,
    factionPresence,
    opportunities,
    rumors,
  }
}

function sanitizeSquadMetadataMap(
  value: unknown,
  teams: GameState['teams'],
  agents: GameState['agents']
): Record<string, SquadMetadata> | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const next: Record<string, SquadMetadata> = {}

  for (const [recordKey, entry] of Object.entries(value)) {
    if (!isRecord(entry)) {
      continue
    }

    const squadId =
      typeof entry.squadId === 'string' && entry.squadId.length > 0 ? entry.squadId : recordKey

    if (squadId !== recordKey || !(squadId in teams)) {
      continue
    }

    const leaderId =
      typeof entry.designatedLeaderId === 'string'
        ? entry.designatedLeaderId
        : (teams[squadId]?.leaderId ?? '')

    if (!(leaderId in agents)) {
      continue
    }

    const created = createSquadMetadata({
      squadId,
      name: typeof entry.name === 'string' ? entry.name : squadId,
      role: typeof entry.role === 'string' ? entry.role : 'field',
      doctrine: typeof entry.doctrine === 'string' ? entry.doctrine : 'standard',
      shift: typeof entry.shift === 'string' ? entry.shift : 'day',
      assignedZone: typeof entry.assignedZone === 'string' ? entry.assignedZone : 'hub',
      designatedLeaderId: leaderId,
    })

    if (created.ok) {
      next[recordKey] = created.metadata
    }
  }

  return Object.keys(next).length > 0 ? next : undefined
}

function sanitizeSquadKitTemplatesMap(
  value: unknown
): Record<string, SquadKitTemplate> | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const next: Record<string, SquadKitTemplate> = {}

  for (const [recordKey, entry] of Object.entries(value)) {
    if (!isRecord(entry)) {
      continue
    }

    const created = createSquadKitTemplate({
      id: typeof entry.id === 'string' ? entry.id : recordKey,
      label: typeof entry.label === 'string' ? entry.label : recordKey,
      requiredItemTags: Array.isArray(entry.requiredItemTags)
        ? entry.requiredItemTags.filter((tag): tag is string => typeof tag === 'string')
        : [],
      minCoveredCount: sanitizeInteger(entry.minCoveredCount as number | undefined, 1, 1),
    })

    if (created.ok && created.template.id === recordKey) {
      next[recordKey] = created.template
    }
  }

  return Object.keys(next).length > 0 ? next : undefined
}

function sanitizeSquadKitAssignmentsMap(
  value: unknown,
  teams: GameState['teams'],
  templates: Record<string, SquadKitTemplate> | undefined
): Record<string, SquadKitAssignment> | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const next: Record<string, SquadKitAssignment> = {}

  for (const [recordKey, entry] of Object.entries(value).sort(([left], [right]) =>
    left.localeCompare(right)
  )) {
    if (!isRecord(entry)) {
      continue
    }

    const squadId =
      typeof entry.squadId === 'string' && entry.squadId.length > 0 ? entry.squadId : recordKey

    if (squadId !== recordKey || !(squadId in teams)) {
      continue
    }

    const kitTemplateId =
      entry.kitTemplateId === null
        ? null
        : typeof entry.kitTemplateId === 'string' && entry.kitTemplateId in (templates ?? {})
          ? entry.kitTemplateId
          : null

    next[recordKey] = {
      squadId,
      kitTemplateId,
    }
  }

  return Object.keys(next).length > 0 ? next : undefined
}

function sanitizeHydratedContractDebriefChangedEntity(
  value: unknown
): ContractDebriefChangedEntity | null {
  if (!isRecord(value)) {
    return null
  }

  const kind = isOneOf(value.kind, CONTRACT_DEBRIEF_ENTITY_KINDS) ? value.kind : null
  const id = typeof value.id === 'string' ? value.id.trim() : ''
  const label = typeof value.label === 'string' ? value.label.trim() : ''
  const detail = typeof value.detail === 'string' ? value.detail.trim() : ''

  if (!kind || !id || !label || !detail) {
    return null
  }

  return { kind, id, label, detail }
}

function sanitizeHydratedContractDebriefUnresolvedClock(
  value: unknown
): ContractDebriefUnresolvedClock | null {
  if (!isRecord(value)) {
    return null
  }

  const id = typeof value.id === 'string' ? value.id.trim() : ''
  const label = typeof value.label === 'string' ? value.label.trim() : ''
  const detail = typeof value.detail === 'string' ? value.detail.trim() : ''

  if (!id || !label || !detail) {
    return null
  }

  return { id, label, detail }
}

function sanitizeHydratedContractDebriefStrategicOption(
  value: unknown
): ContractDebriefStrategicOption | null {
  if (!isRecord(value)) {
    return null
  }

  const intentValues = getContractNextIntentValues() as readonly string[]
  const intent =
    typeof value.intent === 'string' && intentValues.includes(value.intent)
      ? (value.intent as ContractNextIntent)
      : null
  const label = typeof value.label === 'string' ? value.label.trim() : ''
  const reason = typeof value.reason === 'string' ? value.reason.trim() : ''

  if (!intent || !label || !reason) {
    return null
  }

  return { intent, label, reason }
}

/** SPE-430: validate optional persisted contract debrief records. */
function sanitizeHydratedContractDebriefRecord(
  value: unknown,
  campaignWeek: number,
  cases: GameState['cases'],
  factions: GameState['factions'] | undefined
): ContractDebriefRecord | null {
  if (!isRecord(value)) {
    return null
  }

  const caseId = typeof value.caseId === 'string' ? value.caseId.trim() : ''
  const contractTemplateId =
    typeof value.contractTemplateId === 'string' ? value.contractTemplateId.trim() : ''
  const caseTitle = typeof value.caseTitle === 'string' ? value.caseTitle.trim() : ''
  const summary = typeof value.summary === 'string' ? value.summary.trim() : ''

  if (
    !caseId ||
    !(caseId in cases) ||
    !contractTemplateId ||
    !resolveContractTemplateDefinition(contractTemplateId) ||
    !caseTitle ||
    summary.length === 0 ||
    summary.length > MAX_DEBRIEF_SUMMARY_LENGTH
  ) {
    return null
  }

  const outcome = isOneOf(value.outcome, MISSION_RESOLUTION_OUTCOMES) ? value.outcome : null

  if (!outcome) {
    return null
  }

  const week = clamp(
    sanitizeInteger(value.week as number | undefined, campaignWeek, 1),
    1,
    campaignWeek
  )
  const factionId =
    typeof value.factionId === 'string' && value.factionId.length > 0 ? value.factionId : undefined

  if (factionId && factions && !(factionId in factions)) {
    return null
  }

  const changedEntities = Array.isArray(value.changedEntities)
    ? value.changedEntities
        .map((entry) => sanitizeHydratedContractDebriefChangedEntity(entry))
        .filter((entry): entry is ContractDebriefChangedEntity => entry !== null)
    : []
  const unresolvedClocks = Array.isArray(value.unresolvedClocks)
    ? value.unresolvedClocks
        .map((entry) => sanitizeHydratedContractDebriefUnresolvedClock(entry))
        .filter((entry): entry is ContractDebriefUnresolvedClock => entry !== null)
    : []
  const strategicOptions = Array.isArray(value.strategicOptions)
    ? value.strategicOptions
        .map((entry) => sanitizeHydratedContractDebriefStrategicOption(entry))
        .filter((entry): entry is ContractDebriefStrategicOption => entry !== null)
        .slice(0, 6)
    : []

  return stripUndefinedFields({
    caseId,
    caseTitle,
    contractTemplateId,
    ...(factionId ? { factionId } : {}),
    ...(typeof value.factionLabel === 'string' && value.factionLabel.trim().length > 0
      ? { factionLabel: value.factionLabel.trim() }
      : {}),
    outcome,
    week,
    summary,
    changedEntities,
    unresolvedClocks,
    strategicOptions,
  }) as ContractDebriefRecord
}

function sanitizeHydratedContractDebriefRecords(
  value: unknown,
  campaignWeek: number,
  cases: GameState['cases'],
  factions: GameState['factions'] | undefined
): ContractDebriefRecord[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const records = value
    .map((entry) => sanitizeHydratedContractDebriefRecord(entry, campaignWeek, cases, factions))
    .filter((record): record is ContractDebriefRecord => record !== null)

  return records.length > 0 ? records : undefined
}

/**
 * SPE-282: hydrate optional deployment momentum from save/export payloads.
 * Stacks are clamped to the domain cap; `lastChangeWeek` is clamped to 1..current campaign week.
 */
function sanitizeDeploymentMomentumState(
  raw: unknown,
  campaignWeek: number,
  config: GameConfig
): GameState['deploymentMomentum'] {
  if (!isRecord(raw)) {
    return undefined
  }

  const stacks = clamp(
    sanitizeInteger(raw.stacks as number | undefined, 0, 0),
    0,
    DEPLOYMENT_MOMENTUM_MAX_STACKS
  )

  const lastChangeWeek =
    raw.lastChangeWeek !== undefined &&
    typeof raw.lastChangeWeek === 'number' &&
    Number.isFinite(raw.lastChangeWeek)
      ? clamp(Math.trunc(raw.lastChangeWeek as number), 1, Math.max(1, campaignWeek))
      : undefined

  const lastSummary =
    typeof raw.lastSummary === 'string' && raw.lastSummary.trim().length > 0
      ? raw.lastSummary.trim().slice(0, 600)
      : undefined

  // Hydration 559: zero stacks do not preserve stale recap metadata.
  if (stacks === 0) {
    return undefined
  }

  if (!deploymentMomentumSurfacesEnabled(config)) {
    return undefined
  }

  return { stacks, lastChangeWeek, lastSummary }
}

function sanitizeMarket(value: unknown, fallback: MarketState, campaignWeek: number): MarketState {
  return sanitizePersistedMarketState(value, fallback, campaignWeek)
}

function sanitizeOperationEvents(
  events: unknown,
  fallback: OperationEvent[],
  options: SanitizeOperationEventsOptions = {}
): OperationEvent[] {
  if (!Array.isArray(events)) {
    return fallback
  }

  const allowLegacySyntheticRepair = options.allowLegacySyntheticRepair ?? false
  const cappedCampaignWeek =
    options.campaignWeek !== undefined ? Math.max(1, Math.trunc(options.campaignWeek)) : undefined
  const fallbackFeaturedRecipeId =
    options.fallbackFeaturedRecipeId ?? productionCatalog[0]?.recipeId ?? 'ward-seals'
  const nextEvents: OperationEvent[] = []
  const seenEventIds = new Set<string>()

  for (const [index, entry] of events.entries()) {
    if (!isRecord(entry) || !isRecord(entry.payload)) {
      continue
    }

    const eventType = normalizeLegacyOperationEventType(entry.type)

    if (!eventType) {
      continue
    }

    const payload = entry.payload

    if (!allowLegacySyntheticRepair && !hasRequiredOperationEventIdentity(eventType, payload)) {
      continue
    }

    const week = clampOperationEventWeek(payload.week, 1, cappedCampaignWeek)
    const schemaVersion = normalizeOperationEventSchemaVersion(entry.schemaVersion)
    const importEntityId = (value: unknown, legacyFallback: string) =>
      resolveImportedEntityId(value, legacyFallback, allowLegacySyntheticRepair)
    const rawEventId =
      typeof entry.id === 'string' && entry.id.length > 0
        ? entry.id
        : `evt-migrated-${String(index + 1).padStart(6, '0')}`
    let resolvedEventId = rawEventId

    if (seenEventIds.has(resolvedEventId)) {
      resolvedEventId = `${rawEventId}-dup-${index + 1}`
    }

    seenEventIds.add(resolvedEventId)

    const createBase = <TType extends OperationEventType>(
      type: TType
    ): Pick<
      OperationEvent<TType>,
      'id' | 'schemaVersion' | 'type' | 'sourceSystem' | 'timestamp'
    > => ({
      id: resolvedEventId,
      schemaVersion,
      type,
      sourceSystem: inferOperationEventSourceSystem(type),
      timestamp: reconcileOperationEventTimestamp(week, index + 1, entry.timestamp),
    })

    switch (eventType) {
      case 'assignment.team_assigned': {
        const maxTeams = sanitizeInteger(payload.maxTeams as number | undefined, 1, 1)
        const assignedTeamCount = Math.min(
          sanitizeInteger(payload.assignedTeamCount as number | undefined, 1, 0),
          maxTeams
        )

        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('assignment.team_assigned'),
            payload: {
              week,
              caseId: importEntityId(payload.caseId, `case-${index + 1}`) ?? `case-${index + 1}`,
              caseTitle:
                typeof payload.caseTitle === 'string' ? payload.caseTitle : `Case ${index + 1}`,
              caseKind: payload.caseKind === 'raid' ? 'raid' : 'case',
              teamId: importEntityId(payload.teamId, `team-${index + 1}`) ?? `team-${index + 1}`,
              teamName:
                typeof payload.teamName === 'string' ? payload.teamName : `Team ${index + 1}`,
              assignedTeamCount,
              maxTeams,
            },
          })
        )
        break
      }

      case 'assignment.team_unassigned':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('assignment.team_unassigned'),
            payload: {
              week,
              caseId: typeof payload.caseId === 'string' ? payload.caseId : `case-${index + 1}`,
              caseTitle:
                typeof payload.caseTitle === 'string' ? payload.caseTitle : `Case ${index + 1}`,
              teamId: typeof payload.teamId === 'string' ? payload.teamId : `team-${index + 1}`,
              teamName:
                typeof payload.teamName === 'string' ? payload.teamName : `Team ${index + 1}`,
              remainingTeamCount: sanitizeInteger(
                payload.remainingTeamCount as number | undefined,
                0,
                0
              ),
            },
          })
        )
        break

      case 'case.resolved':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('case.resolved'),
            payload: {
              week,
              caseId: typeof payload.caseId === 'string' ? payload.caseId : `case-${index + 1}`,
              caseTitle:
                typeof payload.caseTitle === 'string' ? payload.caseTitle : `Case ${index + 1}`,
              mode: sanitizeOperationEventCaseMode(payload.mode),
              kind: sanitizeOperationEventCaseKind(payload.kind),
              stage: sanitizeInteger(payload.stage as number | undefined, 1, 1),
              teamIds: sanitizeTrimmedDedupedStringList(payload.teamIds),
              ...sanitizeOperationEventCaseOutcomeFields(payload),
            },
          })
        )
        break

      case 'case.partially_resolved': {
        const stageTransition = reconcileStageTransition(payload.fromStage, payload.toStage)

        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('case.partially_resolved'),
            payload: {
              week,
              caseId: importEntityId(payload.caseId, `case-${index + 1}`) ?? `case-${index + 1}`,
              caseTitle:
                typeof payload.caseTitle === 'string' ? payload.caseTitle : `Case ${index + 1}`,
              mode: sanitizeOperationEventCaseMode(payload.mode),
              kind: sanitizeOperationEventCaseKind(payload.kind),
              fromStage: stageTransition.fromStage,
              toStage: stageTransition.toStage,
              teamIds: sanitizeTrimmedDedupedStringList(payload.teamIds),
              ...sanitizeOperationEventCaseOutcomeFields(payload),
            },
          })
        )
        break
      }

      case 'case.failed': {
        const stageTransition = reconcileStageTransition(payload.fromStage, payload.toStage)

        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('case.failed'),
            payload: {
              week,
              caseId: importEntityId(payload.caseId, `case-${index + 1}`) ?? `case-${index + 1}`,
              caseTitle:
                typeof payload.caseTitle === 'string' ? payload.caseTitle : `Case ${index + 1}`,
              mode: sanitizeOperationEventCaseMode(payload.mode),
              kind: sanitizeOperationEventCaseKind(payload.kind),
              fromStage: stageTransition.fromStage,
              toStage: stageTransition.toStage,
              teamIds: sanitizeTrimmedDedupedStringList(payload.teamIds),
              ...sanitizeOperationEventCaseOutcomeFields(payload),
            },
          })
        )
        break
      }

      case 'case.escalated': {
        const stageTransition = reconcileStageTransition(payload.fromStage, payload.toStage)
        const convertedToRaid =
          typeof payload.convertedToRaid === 'boolean' ? payload.convertedToRaid : false

        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('case.escalated'),
            payload: {
              week,
              caseId: typeof payload.caseId === 'string' ? payload.caseId : `case-${index + 1}`,
              caseTitle:
                typeof payload.caseTitle === 'string' ? payload.caseTitle : `Case ${index + 1}`,
              fromStage: stageTransition.fromStage,
              toStage: stageTransition.toStage,
              trigger: isOneOf(payload.trigger, CASE_ESCALATION_TRIGGERS)
                ? payload.trigger
                : 'deadline',
              deadlineRemaining: sanitizeInteger(
                payload.deadlineRemaining as number | undefined,
                1,
                0
              ),
              convertedToRaid:
                convertedToRaid && stageTransition.toStage > stageTransition.fromStage,
              ...(typeof payload.neighborhoodPressureAuditTag === 'string'
                ? { neighborhoodPressureAuditTag: payload.neighborhoodPressureAuditTag }
                : {}),
              ...sanitizeOperationEventCaseOutcomeFields(payload),
            },
          })
        )
        break
      }

      case 'case.spawned':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('case.spawned'),
            payload: {
              week,
              caseId: typeof payload.caseId === 'string' ? payload.caseId : `case-${index + 1}`,
              caseTitle:
                typeof payload.caseTitle === 'string' ? payload.caseTitle : `Case ${index + 1}`,
              templateId:
                typeof payload.templateId === 'string'
                  ? payload.templateId
                  : `template-${index + 1}`,
              kind: sanitizeOperationEventCaseKind(payload.kind),
              stage: sanitizeInteger(payload.stage as number | undefined, 1, 1),
              trigger: isOneOf(payload.trigger, CASE_SPAWN_TRIGGERS)
                ? payload.trigger
                : 'unresolved',
              parentCaseId:
                typeof payload.parentCaseId === 'string' ? payload.parentCaseId : undefined,
              parentCaseTitle:
                typeof payload.parentCaseTitle === 'string' ? payload.parentCaseTitle : undefined,
              factionId: typeof payload.factionId === 'string' ? payload.factionId : undefined,
              factionLabel:
                typeof payload.factionLabel === 'string' ? payload.factionLabel : undefined,
              sourceReason:
                typeof payload.sourceReason === 'string' ? payload.sourceReason : undefined,
            },
          })
        )
        break

      case 'case.aggregate_battle':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('case.aggregate_battle'),
            payload: {
              week,
              caseId: typeof payload.caseId === 'string' ? payload.caseId : `case-${index + 1}`,
              caseTitle:
                typeof payload.caseTitle === 'string' ? payload.caseTitle : `Case ${index + 1}`,
              mode: sanitizeOperationEventCaseMode(payload.mode),
              kind: sanitizeOperationEventCaseKind(payload.kind),
              battleId:
                typeof payload.battleId === 'string' ? payload.battleId : `battle-${index + 1}`,
              roundsResolved: sanitizeInteger(payload.roundsResolved as number | undefined, 0, 0),
              winnerSideId: typeof payload.winnerSideId === 'string' ? payload.winnerSideId : null,
              winnerLabel: typeof payload.winnerLabel === 'string' ? payload.winnerLabel : null,
              friendlyLabel:
                typeof payload.friendlyLabel === 'string' ? payload.friendlyLabel : 'Friendly',
              hostileLabel:
                typeof payload.hostileLabel === 'string' ? payload.hostileLabel : 'Hostile',
              movementDeniedCount: sanitizeInteger(
                payload.movementDeniedCount as number | undefined,
                0,
                0
              ),
              friendlyRoutedCount: sanitizeInteger(
                payload.friendlyRoutedCount as number | undefined,
                0,
                0
              ),
              hostileRoutedCount: sanitizeInteger(
                payload.hostileRoutedCount as number | undefined,
                0,
                0
              ),
              friendlyRoutedUnits: sanitizeStringList(payload.friendlyRoutedUnits),
              hostileRoutedUnits: sanitizeStringList(payload.hostileRoutedUnits),
              specialDamageCount: sanitizeInteger(
                payload.specialDamageCount as number | undefined,
                0,
                0
              ),
              specialDamage: sanitizeStringList(payload.specialDamage),
              ...(payload.parallelObjectiveId !== undefined
                ? {
                    parallelObjectiveId:
                      typeof payload.parallelObjectiveId === 'string'
                        ? payload.parallelObjectiveId
                        : undefined,
                  }
                : {}),
              ...(payload.parallelObjectiveOutcome === 'success' ||
              payload.parallelObjectiveOutcome === 'partial' ||
              payload.parallelObjectiveOutcome === 'fail'
                ? { parallelObjectiveOutcome: payload.parallelObjectiveOutcome }
                : {}),
              ...(typeof payload.parallelObjectiveProgress === 'string'
                ? { parallelObjectiveProgress: payload.parallelObjectiveProgress }
                : {}),
              ...(typeof payload.extractionRequired === 'boolean'
                ? { extractionRequired: payload.extractionRequired }
                : {}),
              ...(payload.extractionOutcome === 'not_required' ||
              payload.extractionOutcome === 'secured' ||
              payload.extractionOutcome === 'contested' ||
              payload.extractionOutcome === 'overrun'
                ? { extractionOutcome: payload.extractionOutcome }
                : {}),
              ...(payload.extractionPressure === 'low' ||
              payload.extractionPressure === 'medium' ||
              payload.extractionPressure === 'high'
                ? { extractionPressure: payload.extractionPressure }
                : {}),
              ...(typeof payload.extractionResidualThreatUnits === 'number' &&
              Number.isFinite(payload.extractionResidualThreatUnits)
                ? {
                    extractionResidualThreatUnits: Math.max(
                      0,
                      Math.trunc(payload.extractionResidualThreatUnits)
                    ),
                  }
                : {}),
              ...(typeof payload.ceasefireApplied === 'boolean'
                ? { ceasefireApplied: payload.ceasefireApplied }
                : {}),
              ...(typeof payload.ceasefireObjectiveId === 'string'
                ? { ceasefireObjectiveId: payload.ceasefireObjectiveId }
                : {}),
              ...(payload.ceasefireTacticalValue === 'temporary_manpower' ||
              payload.ceasefireTacticalValue === 'specialist_knowledge'
                ? { ceasefireTacticalValue: payload.ceasefireTacticalValue }
                : {}),
            },
          })
        )
        break

      case 'case.raid_converted': {
        const minTeams = sanitizeInteger(payload.minTeams as number | undefined, 2, 1)
        const maxTeams = Math.max(
          minTeams,
          sanitizeInteger(payload.maxTeams as number | undefined, minTeams, 1)
        )

        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('case.raid_converted'),
            payload: {
              week,
              caseId: typeof payload.caseId === 'string' ? payload.caseId : `case-${index + 1}`,
              caseTitle:
                typeof payload.caseTitle === 'string' ? payload.caseTitle : `Case ${index + 1}`,
              stage: sanitizeInteger(payload.stage as number | undefined, 1, 1),
              trigger: isOneOf(payload.trigger, CASE_ESCALATION_TRIGGERS)
                ? payload.trigger
                : 'deadline',
              minTeams,
              maxTeams,
            },
          })
        )
        break
      }

      case 'intel.report_generated':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('intel.report_generated'),
            payload: reconcileIntelReportGeneratedPayload(
              payload,
              week,
              options.weeklyReportsByWeek
            ),
          })
        )
        break

      case 'agent.training_started':
        {
          const trainingProgram = reconcileTrainingEventProgram(
            payload.trainingId,
            payload.trainingName
          )

          nextEvents.push(
            migrateOperationEventToCurrentSchema({
              ...createBase('agent.training_started'),
              payload: {
                week,
                queueId:
                  typeof payload.queueId === 'string' ? payload.queueId : `queue-${index + 1}`,
                agentId:
                  typeof payload.agentId === 'string' ? payload.agentId : `agent-${index + 1}`,
                agentName:
                  typeof payload.agentName === 'string' ? payload.agentName : `Agent ${index + 1}`,
                trainingId: trainingProgram.trainingId,
                trainingName: trainingProgram.trainingName,
                teamName: typeof payload.teamName === 'string' ? payload.teamName : undefined,
                etaWeeks: sanitizeInteger(payload.etaWeeks as number | undefined, 1, 1),
                fundingCost: sanitizeInteger(payload.fundingCost as number | undefined, 0, 0),
              },
            })
          )
        }
        break

      case 'agent.training_completed':
        {
          const trainingProgram = reconcileTrainingEventProgram(
            payload.trainingId,
            payload.trainingName
          )

          nextEvents.push(
            migrateOperationEventToCurrentSchema({
              ...createBase('agent.training_completed'),
              payload: {
                week,
                queueId:
                  typeof payload.queueId === 'string' ? payload.queueId : `queue-${index + 1}`,
                agentId:
                  typeof payload.agentId === 'string' ? payload.agentId : `agent-${index + 1}`,
                agentName:
                  typeof payload.agentName === 'string' ? payload.agentName : `Agent ${index + 1}`,
                trainingId: trainingProgram.trainingId,
                trainingName: trainingProgram.trainingName,
              },
            })
          )
        }
        break

      case 'agent.training_cancelled':
        {
          const trainingProgram = reconcileTrainingEventProgram(
            payload.trainingId,
            payload.trainingName
          )

          nextEvents.push(
            migrateOperationEventToCurrentSchema({
              ...createBase('agent.training_cancelled'),
              payload: {
                week,
                agentId:
                  typeof payload.agentId === 'string' ? payload.agentId : `agent-${index + 1}`,
                agentName:
                  typeof payload.agentName === 'string' ? payload.agentName : `Agent ${index + 1}`,
                trainingId: trainingProgram.trainingId,
                trainingName: trainingProgram.trainingName,
                refund: Math.min(
                  sanitizeInteger(payload.refund as number | undefined, 0, 0),
                  trainingProgram.fundingCost
                ),
              },
            })
          )
        }
        break

      case 'agent.relationship_changed':
        {
          const relationship = reconcileAgentRelationshipChangedFields(payload)

          nextEvents.push(
            migrateOperationEventToCurrentSchema({
              ...createBase('agent.relationship_changed'),
              payload: {
                week,
                agentId:
                  importEntityId(payload.agentId, `agent-${index + 1}`) ?? `agent-${index + 1}`,
                agentName:
                  typeof payload.agentName === 'string' ? payload.agentName : `Agent ${index + 1}`,
                counterpartId:
                  importEntityId(payload.counterpartId, `counterpart-${index + 1}`) ??
                  `counterpart-${index + 1}`,
                counterpartName:
                  typeof payload.counterpartName === 'string'
                    ? payload.counterpartName
                    : `Counterpart ${index + 1}`,
                previousValue: relationship.previousValue,
                nextValue: relationship.nextValue,
                delta: relationship.delta,
                reason:
                  payload.reason === 'mission_success' ||
                  payload.reason === 'mission_partial' ||
                  payload.reason === 'mission_fail' ||
                  payload.reason === 'passive_drift' ||
                  payload.reason === 'external_event' ||
                  payload.reason === 'reconciliation' ||
                  payload.reason === 'spontaneous_event' ||
                  payload.reason === 'betrayal'
                    ? payload.reason
                    : 'passive_drift',
              },
            })
          )
        }
        break

      case 'agent.instructor_assigned':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('agent.instructor_assigned'),
            payload: {
              week,
              staffId: typeof payload.staffId === 'string' ? payload.staffId : `staff-${index + 1}`,
              instructorName:
                typeof payload.instructorName === 'string'
                  ? payload.instructorName
                  : `Instructor ${index + 1}`,
              agentId: typeof payload.agentId === 'string' ? payload.agentId : `agent-${index + 1}`,
              agentName:
                typeof payload.agentName === 'string' ? payload.agentName : `Agent ${index + 1}`,
              instructorSpecialty: isOneOf(payload.instructorSpecialty, STAT_KEYS)
                ? payload.instructorSpecialty
                : 'combat',
              bonus: sanitizeInteger(payload.bonus as number | undefined, 0, 0),
            },
          })
        )
        break

      case 'agent.instructor_unassigned':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('agent.instructor_unassigned'),
            payload: {
              week,
              staffId: typeof payload.staffId === 'string' ? payload.staffId : `staff-${index + 1}`,
              instructorName:
                typeof payload.instructorName === 'string'
                  ? payload.instructorName
                  : `Instructor ${index + 1}`,
              agentId: typeof payload.agentId === 'string' ? payload.agentId : `agent-${index + 1}`,
              agentName:
                typeof payload.agentName === 'string' ? payload.agentName : `Agent ${index + 1}`,
              instructorSpecialty: isOneOf(payload.instructorSpecialty, STAT_KEYS)
                ? payload.instructorSpecialty
                : 'combat',
              bonus: sanitizeInteger(payload.bonus as number | undefined, 0, 0),
            },
          })
        )
        break

      case 'agent.injured':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('agent.injured'),
            payload: {
              week,
              agentId: typeof payload.agentId === 'string' ? payload.agentId : `agent-${index + 1}`,
              agentName:
                typeof payload.agentName === 'string' ? payload.agentName : `Agent ${index + 1}`,
              severity: typeof payload.severity === 'string' ? payload.severity : 'unknown',
            },
          })
        )
        break

      case 'agent.killed':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('agent.killed'),
            payload: {
              week,
              agentId: typeof payload.agentId === 'string' ? payload.agentId : `agent-${index + 1}`,
              agentName:
                typeof payload.agentName === 'string' ? payload.agentName : `Agent ${index + 1}`,
              caseId: typeof payload.caseId === 'string' ? payload.caseId : `case-${index + 1}`,
              caseTitle:
                typeof payload.caseTitle === 'string' ? payload.caseTitle : `Case ${index + 1}`,
            },
          })
        )
        break

      case 'agent.betrayed': {
        const betrayal = reconcileAgentBetrayedFields(payload)
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('agent.betrayed'),
            payload: {
              week,
              betrayerId:
                typeof payload.betrayerId === 'string' ? payload.betrayerId : `agent-${index + 1}`,
              betrayerName:
                typeof payload.betrayerName === 'string'
                  ? payload.betrayerName
                  : `Agent ${index + 1}`,
              betrayedId:
                typeof payload.betrayedId === 'string'
                  ? payload.betrayedId
                  : `counterpart-${index + 1}`,
              betrayedName:
                typeof payload.betrayedName === 'string'
                  ? payload.betrayedName
                  : `Counterpart ${index + 1}`,
              trustDamageDelta: betrayal.trustDamageDelta,
              trustDamageTotal: betrayal.trustDamageTotal,
              triggeredConsequences: Array.isArray(payload.triggeredConsequences)
                ? payload.triggeredConsequences.filter(
                    (
                      entry
                    ): entry is
                      | 'benching'
                      | 'performance_penalty'
                      | 'disciplinary'
                      | 'resignation' =>
                      entry === 'benching' ||
                      entry === 'performance_penalty' ||
                      entry === 'disciplinary' ||
                      entry === 'resignation'
                  )
                : [],
            },
          })
        )
        break
      }

      case 'agent.resigned':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('agent.resigned'),
            payload: {
              week,
              agentId: typeof payload.agentId === 'string' ? payload.agentId : `agent-${index + 1}`,
              agentName:
                typeof payload.agentName === 'string' ? payload.agentName : `Agent ${index + 1}`,
              reason: 'trust_failure_cumulative',
              counterpartId:
                typeof payload.counterpartId === 'string' ? payload.counterpartId : undefined,
              counterpartName:
                typeof payload.counterpartName === 'string' ? payload.counterpartName : undefined,
            },
          })
        )
        break

      case 'agent.promoted': {
        const promotion = reconcileAgentPromotedFields(payload)
        const trimmedNewRole =
          typeof payload.newRole === 'string' ? payload.newRole.trim() : ''

        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('agent.promoted'),
            payload: {
              week,
              agentId: typeof payload.agentId === 'string' ? payload.agentId : `agent-${index + 1}`,
              agentName:
                typeof payload.agentName === 'string' ? payload.agentName : `Agent ${index + 1}`,
              newRole:
                trimmedNewRole === 'occultist' ||
                trimmedNewRole === 'investigator' ||
                trimmedNewRole === 'field_recon' ||
                trimmedNewRole === 'medium' ||
                trimmedNewRole === 'tech' ||
                trimmedNewRole === 'medic' ||
                trimmedNewRole === 'negotiator' ||
                trimmedNewRole === 'hunter'
                  ? trimmedNewRole
                  : 'hunter',
              previousLevel: promotion.previousLevel,
              newLevel: promotion.newLevel,
              levelsGained: promotion.levelsGained,
              skillPointsGranted: promotion.skillPointsGranted,
            },
          })
        )
        break
      }

      case 'agent.hired':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('agent.hired'),
            payload: {
              week,
              candidateId:
                typeof payload.candidateId === 'string' ? payload.candidateId : `cand-${index + 1}`,
              agentId: typeof payload.agentId === 'string' ? payload.agentId : `agent-${index + 1}`,
              agentName:
                typeof payload.agentName === 'string' ? payload.agentName : `Agent ${index + 1}`,
              recruitCategory: isOneOf(payload.recruitCategory, RECRUIT_CATEGORIES)
                ? payload.recruitCategory
                : 'agent',
              ...sanitizeRecruitmentSourceContactFields(payload),
            },
          })
        )
        break

      case 'progression.xp_gained': {
        const progression = reconcileProgressionXpGainedFields(payload)

        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('progression.xp_gained'),
            payload: {
              week,
              agentId: typeof payload.agentId === 'string' ? payload.agentId : `agent-${index + 1}`,
              agentName:
                typeof payload.agentName === 'string' ? payload.agentName : `Agent ${index + 1}`,
              xpAmount: progression.xpAmount,
              reason:
                typeof payload.reason === 'string' && payload.reason.trim().length > 0
                  ? payload.reason.trim()
                  : 'unknown',
              totalXp: progression.totalXp,
              level: progression.level,
              levelsGained: progression.levelsGained,
            },
          })
        )
        break
      }

      case 'system.recruitment_expired':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('system.recruitment_expired'),
            payload: {
              week,
              count: sanitizeOperationEventAuditCount(payload.count),
            },
          })
        )
        break

      case 'system.recruitment_generated':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('system.recruitment_generated'),
            payload: {
              week,
              count: sanitizeOperationEventAuditCount(payload.count),
            },
          })
        )
        break

      case 'system.party_cards_drawn':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('system.party_cards_drawn'),
            payload: {
              week,
              count: sanitizeOperationEventAuditCount(payload.count),
            },
          })
        )
        break

      case 'recruitment.scouting_initiated':
      case 'recruitment.scouting_refined':
      case 'recruitment.intel_confirmed':
        {
          const stage = clamp(sanitizeInteger(payload.stage as number | undefined, 1, 1), 1, 3) as
            | 1
            | 2
            | 3
          const revealLevel = reconcileRecruitmentEventRevealLevel(
            stage,
            sanitizeRevealLevel(payload.revealLevel)
          )
          const projectedTier = isOneOf(payload.projectedTier, EXACT_POTENTIAL_TIERS)
            ? payload.projectedTier
            : 'C'

          nextEvents.push(
            migrateOperationEventToCurrentSchema({
              ...createBase(eventType),
              payload: {
                week,
                candidateId:
                  typeof payload.candidateId === 'string'
                    ? payload.candidateId
                    : `cand-${index + 1}`,
                candidateName:
                  typeof payload.candidateName === 'string'
                    ? payload.candidateName
                    : `Candidate ${index + 1}`,
                fundingCost: sanitizeInteger(payload.fundingCost as number | undefined, 0, 0),
                stage,
                projectedTier,
                confidence: isOneOf(payload.confidence, SCOUT_CONFIDENCES)
                  ? payload.confidence
                  : 'low',
                previousProjectedTier: isOneOf(payload.previousProjectedTier, EXACT_POTENTIAL_TIERS)
                  ? payload.previousProjectedTier
                  : undefined,
                previousConfidence: isOneOf(payload.previousConfidence, SCOUT_CONFIDENCES)
                  ? payload.previousConfidence
                  : undefined,
                confirmedTier:
                  eventType === 'recruitment.intel_confirmed'
                    ? isOneOf(payload.confirmedTier, EXACT_POTENTIAL_TIERS)
                      ? payload.confirmedTier
                      : projectedTier
                    : isOneOf(payload.confirmedTier, EXACT_POTENTIAL_TIERS)
                      ? payload.confirmedTier
                      : undefined,
                revealLevel,
                sourceFactionId:
                  typeof payload.sourceFactionId === 'string' ? payload.sourceFactionId : undefined,
                sourceFactionName:
                  typeof payload.sourceFactionName === 'string'
                    ? payload.sourceFactionName
                    : undefined,
                sourceContactId:
                  typeof payload.sourceContactId === 'string' ? payload.sourceContactId : undefined,
                sourceContactName:
                  typeof payload.sourceContactName === 'string'
                    ? payload.sourceContactName
                    : undefined,
              },
            })
          )
        }
        break

      case 'production.queue_started':
        {
          const productionOutput = reconcileProductionEventRecipeOutput(
            payload.recipeId,
            payload.outputId,
            payload.outputName
          )

          nextEvents.push(
            migrateOperationEventToCurrentSchema({
              ...createBase('production.queue_started'),
              payload: {
                week,
                queueId:
                  typeof payload.queueId === 'string' ? payload.queueId : `queue-${index + 1}`,
                queueName:
                  typeof payload.queueName === 'string' ? payload.queueName : `Queue ${index + 1}`,
                recipeId: productionOutput.recipeId,
                outputId: productionOutput.outputId,
                outputName: productionOutput.outputName,
                outputQuantity: sanitizeInteger(payload.outputQuantity as number | undefined, 1, 1),
                etaWeeks: sanitizeInteger(payload.etaWeeks as number | undefined, 1, 0),
                fundingCost: sanitizeInteger(payload.fundingCost as number | undefined, 0, 0),
                inputMaterials: sanitizeOperationEventProductionInputMaterials(payload),
              },
            })
          )
        }
        break

      case 'production.queue_completed':
        {
          const productionOutput = reconcileProductionEventRecipeOutput(
            payload.recipeId,
            payload.outputId,
            payload.outputName
          )

          nextEvents.push(
            migrateOperationEventToCurrentSchema({
              ...createBase('production.queue_completed'),
              payload: {
                week,
                queueId:
                  typeof payload.queueId === 'string' ? payload.queueId : `queue-${index + 1}`,
                queueName:
                  typeof payload.queueName === 'string' ? payload.queueName : `Queue ${index + 1}`,
                recipeId: productionOutput.recipeId,
                outputId: productionOutput.outputId,
                outputName: productionOutput.outputName,
                outputQuantity: sanitizeInteger(payload.outputQuantity as number | undefined, 1, 1),
                fundingCost: sanitizeInteger(payload.fundingCost as number | undefined, 0, 0),
                inputMaterials: sanitizeOperationEventProductionInputMaterials(payload),
              },
            })
          )
        }
        break

      case 'market.shifted': {
        const marketShift = reconcileMarketShiftedFields(payload, fallbackFeaturedRecipeId)

        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('market.shifted'),
            payload: {
              week,
              featuredRecipeId: marketShift.featuredRecipeId,
              featuredRecipeName: marketShift.featuredRecipeName,
              pressure: marketShift.pressure,
              costMultiplier: marketShift.costMultiplier,
            },
          })
        )
        break
      }

      case 'market.transaction_recorded': {
        const quantity = sanitizeInteger(payload.quantity as number | undefined, 1, 1)
        const bundleCount = sanitizeInteger(payload.bundleCount as number | undefined, 1, 1)
        const unitPrice = sanitizeInteger(payload.unitPrice as number | undefined, 0, 0)
        const totalPrice = reconcileMarketTotalPrice(
          unitPrice,
          quantity,
          bundleCount,
          payload.totalPrice
        )
        const allocation = sanitizeOperationEventMarketProcurementAllocation(payload.allocation)
        const allocations = sanitizeOperationEventMarketProcurementAllocations(payload.allocations)
        const listingResourceStatuses = sanitizeOperationEventMarketListingResourceStatuses(
          payload.listingResourceStatuses
        )

        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('market.transaction_recorded'),
            payload: stripUndefinedFields({
              week,
              marketWeek: clampOperationEventWeek(payload.marketWeek, week, cappedCampaignWeek),
              transactionId:
                importEntityId(payload.transactionId, `txn-${week}-${index + 1}`) ??
                `txn-${week}-${index + 1}`,
              action: isOneOf(payload.action, MARKET_TRANSACTION_ACTIONS) ? payload.action : 'buy',
              listingId:
                importEntityId(payload.listingId, `listing-${index + 1}`) ?? `listing-${index + 1}`,
              itemId: importEntityId(payload.itemId, `item-${index + 1}`) ?? `item-${index + 1}`,
              itemName:
                typeof payload.itemName === 'string' ? payload.itemName : `Item ${index + 1}`,
              category: isOneOf(payload.category, MARKET_TRANSACTION_CATEGORIES)
                ? payload.category
                : 'material',
              quantity,
              bundleCount,
              unitPrice,
              totalPrice,
              remainingAvailability: sanitizeInteger(
                payload.remainingAvailability as number | undefined,
                0,
                0
              ),
              ...(listingResourceStatuses ? { listingResourceStatuses } : {}),
              ...(allocation ? { allocation } : {}),
              ...(allocations ? { allocations } : {}),
              ...(typeof payload.favorExchangeFactionId === 'string'
                ? { favorExchangeFactionId: payload.favorExchangeFactionId }
                : {}),
              ...(typeof payload.favorExchangeFavorId === 'string'
                ? { favorExchangeFavorId: payload.favorExchangeFavorId }
                : {}),
              ...(typeof payload.favorExchangeLabel === 'string'
                ? { favorExchangeLabel: payload.favorExchangeLabel }
                : {}),
              ...(typeof payload.callableObligationFactionId === 'string'
                ? { callableObligationFactionId: payload.callableObligationFactionId }
                : {}),
              ...(typeof payload.callableObligationFavorId === 'string'
                ? { callableObligationFavorId: payload.callableObligationFavorId }
                : {}),
              ...(typeof payload.callableObligationLabel === 'string'
                ? { callableObligationLabel: payload.callableObligationLabel }
                : {}),
            }),
          })
        )
        break
      }

      case 'market.emergency_gray_market_waiver_granted':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('market.emergency_gray_market_waiver_granted'),
            payload: {
              week,
              marketWeek: clampOperationEventWeek(payload.marketWeek, week, cappedCampaignWeek),
              crisisPressureScore: sanitizeInteger(
                payload.crisisPressureScore as number | undefined,
                0,
                0
              ),
              sanctionLevel: 'sanctioned',
              packetId: 'gray_market_broker',
              falloutRiskApplied: 'risk',
              waiverPrecedentCount: clamp(
                sanitizeInteger(payload.waiverPrecedentCount as number | undefined, 1, 1),
                1,
                50000
              ),
              institutionKey: normalizeInstitutionKeyForAudit(
                typeof payload.institutionKey === 'string' ? payload.institutionKey : undefined
              ),
              authorityRoute:
                typeof payload.authorityRoute === 'string' &&
                payload.authorityRoute.trim().length > 0
                  ? payload.authorityRoute.trim()
                  : AUTHORITY_ROUTE_CRISIS_DIRECTOR_SELF,
              authorityBasis:
                typeof payload.authorityBasis === 'string' &&
                payload.authorityBasis.trim().length > 0
                  ? payload.authorityBasis.trim()
                  : LEGACY_WAIVER_AUTHORITY_BASIS_MIGRATION,
              regulatoryArbitrageSignal:
                payload.regulatoryArbitrageSignal === 'cross_institution_clearance_route'
                  ? 'cross_institution_clearance_route'
                  : 'none',
              ruleConflictSignal:
                payload.ruleConflictSignal === 'none'
                  ? 'none'
                  : 'sanctioned_procurement_vs_crisis_waiver',
            },
          })
        )
        break

      case 'market.emergency_gray_market_waiver_accountability_closed':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('market.emergency_gray_market_waiver_accountability_closed'),
            payload: {
              week,
              waiverGrantWeek: clampEmergencyWaiverGrantWeek(
                payload.waiverGrantWeek,
                week,
                cappedCampaignWeek
              ),
              institutionKey: normalizeInstitutionKeyForAudit(
                typeof payload.institutionKey === 'string' ? payload.institutionKey : undefined
              ),
            },
          })
        )
        break

      case 'market.emergency_gray_market_fallout_tick': {
        const fallout = reconcileEmergencyGrayMarketFalloutTickFields(payload)

        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('market.emergency_gray_market_fallout_tick'),
            payload: {
              week,
              outcome: fallout.outcome,
              falloutRiskBefore: fallout.falloutRiskBefore,
              falloutRiskAfter: fallout.falloutRiskAfter,
              fundingBefore: fallout.fundingBefore,
              fundingAfter: fallout.fundingAfter,
              containmentRatingBefore: fallout.containmentRatingBefore,
              containmentRatingAfter: fallout.containmentRatingAfter,
              institutionKey: normalizeInstitutionKeyForAudit(
                typeof payload.institutionKey === 'string' ? payload.institutionKey : undefined
              ),
              waiverPrecedentCount: clamp(
                sanitizeInteger(payload.waiverPrecedentCount as number | undefined, 1, 1),
                1,
                50000
              ),
              precedentPenaltyMultiplier: clamp(
                typeof payload.precedentPenaltyMultiplier === 'number' &&
                  Number.isFinite(payload.precedentPenaltyMultiplier)
                  ? payload.precedentPenaltyMultiplier
                  : 1,
                1,
                2
              ),
            },
          })
        )
        break
      }

      case 'faction.activity':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('faction.standing_changed'),
            payload: {
              week,
              factionId:
                typeof payload.factionId === 'string' ? payload.factionId : `faction-${index + 1}`,
              factionName:
                typeof payload.factionName === 'string'
                  ? payload.factionName
                  : `Faction ${index + 1}`,
              delta: 0,
              standingBefore: 0,
              standingAfter: 0,
              reason: 'case.resolved',
              caseTitle: typeof payload.summary === 'string' ? payload.summary : undefined,
            },
          })
        )
        break

      case 'faction.standing_changed': {
        const standing = reconcileStandingFields(
          payload.standingBefore,
          payload.standingAfter,
          payload.delta
        )
        const reputation =
          payload.reputationBefore !== undefined || payload.reputationAfter !== undefined
            ? reconcileReputationFields(payload.reputationBefore, payload.reputationAfter)
            : undefined
        const contact =
          payload.contactRelationshipBefore !== undefined ||
          payload.contactRelationshipAfter !== undefined ||
          payload.contactDelta !== undefined
            ? reconcileContactRelationshipFields(
                payload.contactRelationshipBefore,
                payload.contactRelationshipAfter,
                payload.contactDelta
              )
            : undefined

        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('faction.standing_changed'),
            payload: stripUndefinedFields({
              week,
              factionId:
                importEntityId(payload.factionId, `faction-${index + 1}`) ?? `faction-${index + 1}`,
              factionName:
                typeof payload.factionName === 'string'
                  ? payload.factionName
                  : `Faction ${index + 1}`,
              delta: standing.delta,
              standingBefore: standing.standingBefore,
              standingAfter: standing.standingAfter,
              ...(reputation ?? {}),
              reason:
                payload.reason === 'case.partially_resolved' ||
                payload.reason === 'case.failed' ||
                payload.reason === 'case.escalated' ||
                payload.reason === 'recruitment.hired'
                  ? payload.reason
                  : 'case.resolved',
              caseId: typeof payload.caseId === 'string' ? payload.caseId : undefined,
              caseTitle: typeof payload.caseTitle === 'string' ? payload.caseTitle : undefined,
              interactionLabel:
                typeof payload.interactionLabel === 'string' ? payload.interactionLabel : undefined,
              contactId: typeof payload.contactId === 'string' ? payload.contactId : undefined,
              contactName:
                typeof payload.contactName === 'string' ? payload.contactName : undefined,
              ...(contact ?? {}),
            }),
          })
        )
        break
      }

      case 'faction.unlock_available':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('faction.unlock_available'),
            payload: {
              week,
              factionId:
                typeof payload.factionId === 'string' ? payload.factionId : `faction-${index + 1}`,
              factionName:
                typeof payload.factionName === 'string'
                  ? payload.factionName
                  : `Faction ${index + 1}`,
              contactId: typeof payload.contactId === 'string' ? payload.contactId : undefined,
              contactName:
                typeof payload.contactName === 'string' ? payload.contactName : undefined,
              label: typeof payload.label === 'string' ? payload.label : `Unlock ${index + 1}`,
              summary:
                typeof payload.summary === 'string'
                  ? payload.summary
                  : `Faction unlock available (${index + 1})`,
              disposition: isOneOf(payload.disposition, FACTION_UNLOCK_DISPOSITIONS)
                ? payload.disposition
                : 'supportive',
            },
          })
        )
        break

      case 'agency.containment_updated': {
        const containment = reconcileBeforeAfterDelta(
          payload.containmentRatingBefore,
          payload.containmentRatingAfter,
          payload.containmentDelta,
          0
        )
        const funding = reconcileBeforeAfterDelta(
          payload.fundingBefore,
          payload.fundingAfter,
          payload.fundingDelta,
          0
        )
        const clearanceBefore = sanitizeInteger(
          payload.clearanceLevelBefore as number | undefined,
          1,
          1
        )
        const clearanceAfterRaw = sanitizeInteger(
          payload.clearanceLevelAfter as number | undefined,
          clearanceBefore,
          1
        )
        const clearance = reconcileBeforeAfterDelta(
          clearanceBefore,
          clearanceAfterRaw,
          clearanceAfterRaw - clearanceBefore,
          1
        )

        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('agency.containment_updated'),
            payload: {
              week,
              containmentRatingBefore: containment.before,
              containmentRatingAfter: containment.after,
              containmentDelta: containment.delta,
              clearanceLevelBefore: clearance.before,
              clearanceLevelAfter: clearance.after,
              fundingBefore: funding.before,
              fundingAfter: funding.after,
              fundingDelta: funding.delta,
            },
          })
        )
        break
      }

      case 'directive.applied':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('directive.applied'),
            payload: {
              week,
              directiveId: isWeeklyDirectiveId(payload.directiveId)
                ? payload.directiveId
                : FALLBACK_WEEKLY_DIRECTIVE_ID,
              directiveLabel:
                typeof payload.directiveLabel === 'string'
                  ? payload.directiveLabel
                  : 'Directive applied',
            },
          })
        )
        break

      case 'support.shortfall':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('support.shortfall'),
            payload: {
              week,
              caseId: typeof payload.caseId === 'string' ? payload.caseId : `case-${index + 1}`,
              caseTitle:
                typeof payload.caseTitle === 'string' ? payload.caseTitle : `Case ${index + 1}`,
              remainingSupport: sanitizeInteger(
                payload.remainingSupport as number | undefined,
                0,
                0
              ),
            },
          })
        )
        break

      case 'system.academy_upgraded': {
        const academyUpgrade = reconcileAcademyUpgradeFields(payload)

        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('system.academy_upgraded'),
            payload: {
              week,
              tierBefore: academyUpgrade.tierBefore,
              tierAfter: academyUpgrade.tierAfter,
              fundingBefore: academyUpgrade.fundingBefore,
              fundingAfter: academyUpgrade.fundingAfter,
              cost: academyUpgrade.cost,
            },
          })
        )
        break
      }

      case 'agency.front_business.opened':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('agency.front_business.opened'),
            payload: {
              week,
              kind: 'courierShell',
              startupCost: sanitizeInteger(payload.startupCost as number | undefined, 0, 0),
              fundingBefore: sanitizeInteger(payload.fundingBefore as number | undefined, 0, 0),
              fundingAfter: sanitizeInteger(payload.fundingAfter as number | undefined, 0, 0),
            },
          })
        )
        break

      case 'agency.front_business.resolved':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('agency.front_business.resolved'),
            payload: {
              week,
              kind: 'courierShell',
              statusBefore:
                payload.statusBefore === 'active' ||
                payload.statusBefore === 'strained' ||
                payload.statusBefore === 'collapsed'
                  ? payload.statusBefore
                  : 'active',
              statusAfter:
                payload.statusAfter === 'active' ||
                payload.statusAfter === 'strained' ||
                payload.statusAfter === 'collapsed'
                  ? payload.statusAfter
                  : 'active',
              fundingDelta: sanitizeInteger(payload.fundingDelta as number | undefined, 0, -10_000),
              riskScore: sanitizeInteger(payload.riskScore as number | undefined, 0, 0),
              lockoutCount: sanitizeInteger(payload.lockoutCount as number | undefined, 0, 0),
              residueCount: sanitizeInteger(payload.residueCount as number | undefined, 0, 0),
              budgetPressure: sanitizeInteger(payload.budgetPressure as number | undefined, 0, 0),
            },
          })
        )
        break

      case 'staff.coping.applied':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('staff.coping.applied'),
            payload: {
              week,
              agentId: typeof payload.agentId === 'string' ? payload.agentId : `agent-${index + 1}`,
              streak: sanitizeInteger(payload.streak as number | undefined, 1, 0),
              policy:
                payload.policy === 'permitted' ||
                payload.policy === 'restricted' ||
                payload.policy === 'prohibited'
                  ? payload.policy
                  : 'permitted',
            },
          })
        )
        break

      case 'staff.coping.misconduct':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('staff.coping.misconduct'),
            payload: {
              week,
              agentId: typeof payload.agentId === 'string' ? payload.agentId : `agent-${index + 1}`,
              policy:
                payload.policy === 'restricted' || payload.policy === 'prohibited'
                  ? payload.policy
                  : 'restricted',
            },
          })
        )
        break

      case 'staff.side_work.resolved':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('staff.side_work.resolved'),
            payload: {
              week,
              agentId: typeof payload.agentId === 'string' ? payload.agentId : `agent-${index + 1}`,
              optionId:
                payload.optionId === 'offBooksCourier' || payload.optionId === 'trustedCourier'
                  ? payload.optionId
                  : 'trustedCourier',
              outcome:
                payload.outcome === 'paid' || payload.outcome === 'lockout'
                  ? payload.outcome
                  : 'paid',
              fundingDelta: sanitizeInteger(payload.fundingDelta as number | undefined, 0, -10_000),
              fatigueDelta: sanitizeInteger(payload.fatigueDelta as number | undefined, 0, -100),
            },
          })
        )
        break

      case 'infiltration.awareness_complication':
      case 'infiltration.escalation_exposed':
      case 'infiltration.escalation_violent':
      case 'infiltration.cover_strain':
      case 'infiltration.weekly_encounter':
      case 'infiltration.leave_behind_tradeoff':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase(eventType),
            payload: sanitizeInfiltrationProbeEventPayload(payload, week, index, importEntityId),
          })
        )
        break

      case 'concealment.activated':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('concealment.activated'),
            payload: sanitizeConcealmentActivatedEventPayload(payload, week, index, importEntityId),
          })
        )
        break

      case 'system.equipment_recovered':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('system.equipment_recovered'),
            payload: {
              week,
              content: sanitizeTrimmedOperationEventString(
                payload.content,
                `Equipment recovered (${index + 1})`
              ),
              recovered: sanitizeTrimmedDedupedStringList(payload.recovered),
              delayed: sanitizeTrimmedDedupedStringList(payload.delayed),
              maintenanceCapacity: sanitizeInteger(
                payload.maintenanceCapacity as number | undefined,
                1,
                0
              ),
              damagedCount: sanitizeInteger(payload.damagedCount as number | undefined, 0, 0),
            },
          })
        )
        break
    }
  }

  return nextEvents
}

function sanitizeWeeklyDirectiveState(
  value: unknown,
  fallback = createDefaultWeeklyDirectiveState(),
  campaignWeek = 1
) {
  if (!isRecord(value)) {
    return fallback
  }

  const cappedWeek = Math.max(1, campaignWeek)
  const historyByWeek = new Map<number, { week: number; directiveId: WeeklyDirectiveId }>()

  if (Array.isArray(value.history)) {
    for (const entry of value.history) {
      if (
        !isRecord(entry) ||
        typeof entry.week !== 'number' ||
        typeof entry.directiveId !== 'string' ||
        !isWeeklyDirectiveId(entry.directiveId)
      ) {
        continue
      }

      const week = clamp(sanitizeInteger(entry.week, 1, 1), 1, cappedWeek)

      historyByWeek.set(week, {
        week,
        directiveId: entry.directiveId,
      })
    }
  }

  const history = [...historyByWeek.values()].sort((left, right) => left.week - right.week)
  const campaignWeekEntry = history.find((entry) => entry.week === cappedWeek)
  const latestHistoryEntry = history[history.length - 1]
  const reconciledSelectedId =
    campaignWeekEntry?.directiveId ??
    latestHistoryEntry?.directiveId ??
    (isWeeklyDirectiveId(value.selectedId) ? value.selectedId : fallback.selectedId)

  return {
    selectedId: reconciledSelectedId,
    history: history.length > 0 ? history : fallback.history,
  }
}

function sanitizeWeeklyReports(
  reports: unknown,
  cases: GameState['cases'],
  teams: GameState['teams'],
  agents: GameState['agents'],
  campaignWeek = 1,
  rngSeed = 1,
  calendarConfig = resolveCalendarConfig()
) {
  if (!Array.isArray(reports)) {
    return []
  }

  const fallbackCaseSnapshots = buildReportCaseSnapshots(cases)
  const fallbackTeamStatus = buildReportTeamStatus(teams, agents, cases)
  const nextReports: WeeklyReport[] = []
  const sortedEntries = reports
    .map((report, index) => ({ report, index }))
    .filter((entry): entry is { report: Record<string, unknown>; index: number } =>
      isRecord(entry.report)
    )
    .sort((left, right) => {
      const leftWeek = sanitizeInteger(left.report.week as number | undefined, left.index + 1, 1)
      const rightWeek = sanitizeInteger(right.report.week as number | undefined, right.index + 1, 1)

      return leftWeek - rightWeek || left.index - right.index
    })

  const reportsByWeek = new Map<number, { report: Record<string, unknown>; index: number }>()
  const cappedCampaignWeek = Math.max(1, Math.trunc(campaignWeek))
  const importedReportWeeks = sortedEntries
    .map((entry) => sanitizeInteger(entry.report.week as number | undefined, entry.index + 1, 1))
    .filter((rawWeek) => rawWeek >= 1)
  const maxImportedReportWeek =
    importedReportWeeks.length > 0 ? Math.max(...importedReportWeeks) : cappedCampaignWeek
  const reportSanitizeCap = Math.max(
    cappedCampaignWeek,
    Math.min(maxImportedReportWeek, cappedCampaignWeek * 3)
  )

  for (const entry of sortedEntries) {
    const rawWeek = sanitizeInteger(entry.report.week as number | undefined, entry.index + 1, 1)

    if (rawWeek < 1 || rawWeek > reportSanitizeCap) {
      continue
    }

    const week = clamp(rawWeek, 1, cappedCampaignWeek)

    reportsByWeek.set(week, entry)
  }

  const dedupedEntries = [...reportsByWeek.entries()]
    .sort(([leftWeek], [rightWeek]) => leftWeek - rightWeek)
    .map(([week, entry]) => ({ week, ...entry }))

  let previousRngStateAfter = normalizeSeed(rngSeed)

  for (const { report, week } of dedupedEntries) {
    const { rngStateBefore, rngStateAfter } = reconcileWeeklyReportRngTransition(
      report.rngStateBefore,
      report.rngStateAfter,
      previousRngStateAfter
    )

    previousRngStateAfter = rngStateAfter

    const isCurrentWeekReport = week === cappedCampaignWeek
    const caseSnapshots = sanitizeCaseSnapshots(report.caseSnapshots, fallbackCaseSnapshots, {
      campaignWeek: week,
      reportWeek: week,
      currentCampaignWeek: cappedCampaignWeek,
      knownTeamIds: new Set(Object.keys(teams)),
    })
    const allowedCaseIds = buildWeeklyReportAllowedCaseIds(cases, caseSnapshots)
    const maxStageCap = resolveWeeklyReportMaxStageCap(cases, caseSnapshots)
    const caseBuckets = reconcileWeeklyReportCaseBuckets({
      newCases: sanitizeWeeklyReportCaseIdList(report.newCases, allowedCaseIds),
      progressedCases: sanitizeWeeklyReportCaseIdList(report.progressedCases, allowedCaseIds),
      resolvedCases: sanitizeWeeklyReportCaseIdList(report.resolvedCases, allowedCaseIds),
      failedCases: sanitizeWeeklyReportCaseIdList(report.failedCases, allowedCaseIds),
      partialCases: sanitizeWeeklyReportCaseIdList(report.partialCases, allowedCaseIds),
      unresolvedTriggers: sanitizeWeeklyReportCaseIdList(report.unresolvedTriggers, allowedCaseIds),
      spawnedCases: sanitizeWeeklyReportCaseIdList(report.spawnedCases, allowedCaseIds),
    })
    const reportDate = sanitizeWeeklyReportDate(report.date, week, calendarConfig)
    const importedTeamStatus = Array.isArray(report.teamStatus) ? report.teamStatus : undefined
    const teamStatus = sanitizeTeamStatus(
      report.teamStatus,
      fallbackTeamStatus,
      teams,
      cases,
      agents,
      caseSnapshots,
      allowedCaseIds,
      {
        useCurrentTeamFallback: isCurrentWeekReport,
        enrichFromLiveTeams: isCurrentWeekReport,
      }
    )

    nextReports.push(
      stripUndefinedFields({
        week,
        rngStateBefore,
        rngStateAfter,
        ...(reportDate ? { date: reportDate } : {}),
        ...caseBuckets,
        maxStage: clamp(
          sanitizeInteger(report.maxStage as number | undefined, maxStageCap, 0),
          0,
          maxStageCap
        ),
        avgFatigue: reconcileWeeklyReportAvgFatigue(report.avgFatigue, teamStatus, {
          reconcileFromTeamStatus: isCurrentWeekReport,
          persistedTeamStatusProvided:
            Array.isArray(importedTeamStatus) && importedTeamStatus.length > 0,
        }),
        teamStatus,
        caseSnapshots,
        notes: sanitizeReportNoteList(report.notes, week),
      }) as WeeklyReport
    )
  }

  return nextReports
}

export interface HydrateGameOptions {
  /** SPE-273/274: synthesize missing legacy event identity fields during import hydration. */
  allowLegacySyntheticRepair?: boolean
}

export function hydrateGame(
  game: unknown,
  fallback = createStartingState(),
  options: HydrateGameOptions = {}
): GameState {
  if (!isRecord(game)) {
    return fallback
  }

  const hasPersistedContracts = Object.prototype.hasOwnProperty.call(game, 'contracts')
  const hasPersistedFactions = Object.prototype.hasOwnProperty.call(game, 'factions')
  const hasPersistedExternalSupport = Object.prototype.hasOwnProperty.call(
    game,
    'externalSupportAssets'
  )
  const week = sanitizeInteger(game.week as number | undefined, fallback.week, 1)
  const sanitizedConfig = sanitizeGameConfig(game.config, fallback.config)
  const trainingCapacity = reconcileTrainingCapacity(
    sanitizedConfig.trainingSlots,
    sanitizeInteger(game.academyTier as number | undefined, fallback.academyTier ?? 0, 0),
    fallback.config.trainingSlots
  )
  const config = {
    ...sanitizedConfig,
    trainingSlots: trainingCapacity.trainingSlots,
  }
  const calendarConfig = resolveCalendarConfig(config)
  const candidates = sanitizeCandidatesRecruitment(
    game.candidates,
    game.recruitmentPool,
    fallback.candidates,
    week
  )
  const recruitmentPool = [...candidates]
  const provisionalAgents = sanitizeAgentsMap(game.agents, fallback.agents, { campaignWeek: week })
  const provisionalTeams = sanitizeTeamsMap(
    game.teams,
    provisionalAgents,
    fallback.cases,
    fallback.teams
  )
  const provisionalCases = sanitizeCasesMap(
    game.cases,
    provisionalTeams,
    week,
    fallback.cases,
    provisionalAgents,
    fallback.templates
  )
  const teams = sanitizeTeamsMap(game.teams, provisionalAgents, provisionalCases, fallback.teams)
  const agents = sanitizeAgentsMap(game.agents, fallback.agents, {
    cases: provisionalCases,
    teams,
    campaignWeek: week,
  })
  const staff = sanitizeStaffMap(game.staff, agents, fallback.staff)
  const knowledge = sanitizeKnowledgeStateMap(game.knowledge, fallback.knowledge, {
    campaignWeek: week,
    knownTeamIds: new Set(Object.keys(teams)),
  })
  const informationIntakeReports = sanitizeInformationIntakeReports(
    game.informationIntakeReports,
    fallback.informationIntakeReports ?? {}
  )
  const extranormalEventRecords = sanitizeExtranormalEventRecords(
    game.extranormalEventRecords,
    fallback.extranormalEventRecords ?? {}
  )
  const unexplainedLocationRecords = sanitizeUnexplainedLocationRecords(
    game.unexplainedLocationRecords,
    fallback.unexplainedLocationRecords ?? {}
  )
  const minorAnomalyItemRecords = sanitizeMinorAnomalyItemRecords(
    game.minorAnomalyItemRecords,
    fallback.minorAnomalyItemRecords ?? {}
  )
  const namingHazardDescriptorRecords = sanitizeNamingHazardDescriptorRecords(
    game.namingHazardDescriptorRecords,
    fallback.namingHazardDescriptorRecords ?? {}
  )
  const recurrentCatastropheRecords = sanitizeRecurrentCatastropheRecords(
    game.recurrentCatastropheRecords,
    fallback.recurrentCatastropheRecords ?? {}
  )
  const postIncidentReviewRecords = sanitizePostIncidentReviewRecords(
    game.postIncidentReviewRecords,
    fallback.postIncidentReviewRecords ?? {}
  )
  const postIncidentReviewRecommendationRecords = sanitizePostIncidentReviewRecommendationRecords(
    game.postIncidentReviewRecommendationRecords,
    fallback.postIncidentReviewRecommendationRecords ?? {}
  )
  const postIncidentReviewRecommendationActionRecords =
    sanitizePostIncidentReviewRecommendationActionRecords(
      game.postIncidentReviewRecommendationActionRecords,
      fallback.postIncidentReviewRecommendationActionRecords ?? {}
    )
  const ruleDocumentComplianceRecords = sanitizeRuleDocumentComplianceRecords(
    game.ruleDocumentComplianceRecords,
    fallback.ruleDocumentComplianceRecords ?? {}
  )
  const selfCensoringInformationRecords = sanitizeSelfCensoringInformationRecords(
    game.selfCensoringInformationRecords,
    fallback.selfCensoringInformationRecords ?? {}
  )
  const publicDisclosureRecords = sanitizePublicDisclosureRecords(
    game.publicDisclosureRecords,
    fallback.publicDisclosureRecords ?? {}
  )
  const publicDisclosurePostureChoices = sanitizePublicDisclosurePostureChoices(
    game.publicDisclosurePostureChoices,
    new Set(Object.keys(publicDisclosureRecords)),
    fallback.publicDisclosurePostureChoices ?? {}
  )
  const truthLayerRecords = sanitizeTruthLayerRecords(
    game.truthLayerRecords,
    fallback.truthLayerRecords ?? {}
  )
  const truthLayerWeeklyProjectionSnapshots = sanitizeTruthLayerWeeklyProjectionSnapshots(
    game.truthLayerWeeklyProjectionSnapshots,
    fallback.truthLayerWeeklyProjectionSnapshots ?? {},
    new Set(Object.keys(truthLayerRecords))
  )
  const coverStoryRecords = sanitizeCoverStoryRecords(
    game.coverStoryRecords,
    fallback.coverStoryRecords ?? {}
  )
  const coverStoryWeeklyProjectionSnapshots = sanitizeCoverStoryWeeklyProjectionSnapshots(
    game.coverStoryWeeklyProjectionSnapshots,
    fallback.coverStoryWeeklyProjectionSnapshots ?? {},
    new Set(Object.keys(coverStoryRecords))
  )
  const patternSourceSeriesRecords = sanitizePatternSourceSeriesRecords(
    game.patternSourceSeriesRecords,
    fallback.patternSourceSeriesRecords ?? {}
  )
  const publishQueueRecords = sanitizePublishQueueRecords(
    game.publishQueueRecords,
    fallback.publishQueueRecords ?? {}
  )
  const publishQueueExecutionReceipts = sanitizePublishQueueExecutionReceipts(
    game.publishQueueExecutionReceipts,
    fallback.publishQueueExecutionReceipts ?? {},
    new Set(Object.keys(publishQueueRecords))
  )
  const modifiableDataPackRecords = sanitizeModifiableDataPackRecords(
    game.modifiableDataPackRecords,
    fallback.modifiableDataPackRecords ?? {}
  )
  const massAnomalousPopulationEmergenceRecords = sanitizeMassAnomalousPopulationEmergenceRecords(
    game.massAnomalousPopulationEmergenceRecords,
    fallback.massAnomalousPopulationEmergenceRecords ?? {}
  )
  const visualTriggerHazardRecords = sanitizeVisualTriggerHazardRecords(
    game.visualTriggerHazardRecords,
    fallback.visualTriggerHazardRecords ?? {}
  )
  const spe947PlatformRecords = sanitizeSpe947PlatformRecords(
    game.spe947PlatformRecords,
    fallback.spe947PlatformRecords ?? {}
  )
  const spe947OperationRecords = sanitizeSpe947OperationRecords(
    game.spe947OperationRecords,
    fallback.spe947OperationRecords ?? {}
  )
  const spe947ContentArtifacts = sanitizeSpe947ContentArtifacts(
    game.spe947ContentArtifacts,
    fallback.spe947ContentArtifacts ?? {}
  )
  const spe947CounterMemeticPlans = sanitizeSpe947CounterMemeticPlans(
    game.spe947CounterMemeticPlans,
    fallback.spe947CounterMemeticPlans ?? {}
  )
  const spe947ContentOwners = sanitizeSpe947ContentOwners(
    game.spe947ContentOwners,
    fallback.spe947ContentOwners ?? {}
  )
  const spe947PostCaseMediaCases = sanitizeSpe947PostCaseMediaCases(
    game.spe947PostCaseMediaCases,
    fallback.spe947PostCaseMediaCases ?? {}
  )
  const spe947FootageExposureBindings = sanitizeSpe947FootageExposureBindings(
    game.spe947FootageExposureBindings,
    fallback.spe947FootageExposureBindings ?? {}
  )
  const spe947TakedownResistanceBindings = sanitizeSpe947TakedownResistanceBindings(
    game.spe947TakedownResistanceBindings,
    fallback.spe947TakedownResistanceBindings ?? {}
  )
  const spe947VisualTriggerHazardBindings = sanitizeSpe947VisualTriggerHazardBindings(
    game.spe947VisualTriggerHazardBindings,
    fallback.spe947VisualTriggerHazardBindings ?? {}
  )
  const spe947MediaEconomyWeights = sanitizeSpe947MediaEconomyWeights(
    game.spe947MediaEconomyWeights,
    fallback.spe947MediaEconomyWeights ?? {}
  )
  const spe947MediaEconomyContinuityBindings = sanitizeSpe947MediaEconomyContinuityBindings(
    game.spe947MediaEconomyContinuityBindings,
    fallback.spe947MediaEconomyContinuityBindings ?? {}
  )
  const spe947MediaEconomyCommercializationActors =
    sanitizeSpe947MediaEconomyCommercializationActors(
      game.spe947MediaEconomyCommercializationActors,
      fallback.spe947MediaEconomyCommercializationActors ?? {}
    )
  const spe947MediaEconomyLastWeeklyTickWeek = sanitizeSpe947MediaEconomyLastWeeklyTickWeek(
    game.spe947MediaEconomyLastWeeklyTickWeek,
    fallback.spe947MediaEconomyLastWeeklyTickWeek
  )
  const spe956PropagationGraphRecords = sanitizeSpe956PropagationGraphRecords(
    game.spe956PropagationGraphRecords,
    fallback.spe956PropagationGraphRecords ?? {}
  )
  const spe956SurvivorInformalRegistryRecords = sanitizeSpe956SurvivorInformalRegistryRecords(
    game.spe956SurvivorInformalRegistryRecords,
    fallback.spe956SurvivorInformalRegistryRecords ?? {}
  )
  const spe956CollectiveMemoryChannelRecords = sanitizeSpe956CollectiveMemoryChannelRecords(
    game.spe956CollectiveMemoryChannelRecords,
    fallback.spe956CollectiveMemoryChannelRecords ?? {}
  )
  const spe956HotlineChannelRecords = sanitizeSpe956HotlineChannelRecords(
    game.spe956HotlineChannelRecords,
    fallback.spe956HotlineChannelRecords ?? {}
  )
  const spe956AsyncDiscussionSurfaceRecords = sanitizeSpe956AsyncDiscussionSurfaceRecords(
    game.spe956AsyncDiscussionSurfaceRecords,
    fallback.spe956AsyncDiscussionSurfaceRecords ?? {}
  )
  const spe956CommunityAdvisoryBodyRecords = sanitizeSpe956CommunityAdvisoryBodyRecords(
    game.spe956CommunityAdvisoryBodyRecords,
    fallback.spe956CommunityAdvisoryBodyRecords ?? {}
  )
  const spe956IncidentBaselineRecords = sanitizeSpe956IncidentBaselineRecords(
    game.spe956IncidentBaselineRecords,
    fallback.spe956IncidentBaselineRecords ?? {}
  )
  const affiliationPersonStatusRecords = sanitizeAffiliationPersonStatusRecords(
    game.affiliationPersonStatusRecords,
    fallback.affiliationPersonStatusRecords ?? {}
  )
  const affiliationFileWorkQueueActionRecords = sanitizeAffiliationFileWorkQueueActionRecords(
    game.affiliationFileWorkQueueActionRecords,
    fallback.affiliationFileWorkQueueActionRecords ?? {}
  )
  const affiliationFileWorkQueueEvidenceResolutionRecords =
    sanitizeAffiliationFileWorkQueueEvidenceResolutionRecords(
      game.affiliationFileWorkQueueEvidenceResolutionRecords,
      fallback.affiliationFileWorkQueueEvidenceResolutionRecords ?? {}
    )
  const affiliationFileWorkQueueRepairActionRecords =
    sanitizeAffiliationFileWorkQueueRepairActionRecords(
      game.affiliationFileWorkQueueRepairActionRecords,
      fallback.affiliationFileWorkQueueRepairActionRecords ?? {}
    )
  const affiliationFileWorkQueueReleaseActionRecords =
    sanitizeAffiliationFileWorkQueueReleaseActionRecords(
      game.affiliationFileWorkQueueReleaseActionRecords,
      fallback.affiliationFileWorkQueueReleaseActionRecords ?? {}
    )
  const affiliationFileWorkQueueReleaseOutcomeRecords =
    sanitizeAffiliationFileWorkQueueReleaseOutcomeRecords(
      game.affiliationFileWorkQueueReleaseOutcomeRecords,
      fallback.affiliationFileWorkQueueReleaseOutcomeRecords ?? {}
    )
  const affiliationFileWorkQueueReleaseFulfillmentRecords =
    sanitizeAffiliationFileWorkQueueReleaseFulfillmentRecords(
      game.affiliationFileWorkQueueReleaseFulfillmentRecords,
      fallback.affiliationFileWorkQueueReleaseFulfillmentRecords ?? {}
    )
  const affiliationFileWorkQueueReleasePackageRecords =
    sanitizeAffiliationFileWorkQueueReleasePackageRecords(
      game.affiliationFileWorkQueueReleasePackageRecords,
      fallback.affiliationFileWorkQueueReleasePackageRecords ?? {}
    )
  const affiliationFileWorkQueueFileReleaseDeliveryRecords =
    sanitizeAffiliationFileWorkQueueFileReleaseDeliveryRecords(
      game.affiliationFileWorkQueueFileReleaseDeliveryRecords,
      fallback.affiliationFileWorkQueueFileReleaseDeliveryRecords ?? {}
    )
  const affiliationFileWorkQueueNonMissionEnforcementRecords =
    sanitizeAffiliationFileWorkQueueNonMissionEnforcementRecords(
      game.affiliationFileWorkQueueNonMissionEnforcementRecords,
      fallback.affiliationFileWorkQueueNonMissionEnforcementRecords ?? {}
    )
  const affiliationFileWorkQueueEvidenceRepairWorkflows =
    sanitizeAffiliationFileWorkQueueEvidenceRepairWorkflows(
      game.affiliationFileWorkQueueEvidenceRepairWorkflows,
      fallback.affiliationFileWorkQueueEvidenceRepairWorkflows ?? {}
    )
  const entityWelfareReclassificationRecords = sanitizeEntityWelfareReclassificationRecords(
    game.entityWelfareReclassificationRecords,
    fallback.entityWelfareReclassificationRecords ?? {}
  )
  const containedPersonTherapeuticCareRecords = sanitizeTherapeuticCareScheduleRecords(
    game.containedPersonTherapeuticCareRecords,
    fallback.containedPersonTherapeuticCareRecords ?? {}
  )
  const containedPersonMedicationRegimenRecords = sanitizeMedicationRegimenRecords(
    game.containedPersonMedicationRegimenRecords,
    fallback.containedPersonMedicationRegimenRecords ?? {}
  )
  const containedPersonCustodyStatusRecords = sanitizeCustodyStatusRecords(
    game.containedPersonCustodyStatusRecords,
    fallback.containedPersonCustodyStatusRecords ?? {}
  )
  const coerciveContainedPersonProtocolRecords = sanitizeCoerciveProtocolRecords(
    game.coerciveContainedPersonProtocolRecords,
    fallback.coerciveContainedPersonProtocolRecords ?? {}
  )
  const coerciveContainedPersonProtocolWeeklyProjectionSnapshots =
    sanitizeCoerciveProtocolWeeklyProjectionSnapshots(
      game.coerciveContainedPersonProtocolWeeklyProjectionSnapshots,
      fallback.coerciveContainedPersonProtocolWeeklyProjectionSnapshots ?? {},
      new Set(Object.keys(coerciveContainedPersonProtocolRecords))
    )
  const welfareDebtAccountingRecords = sanitizeWelfareDebtAccountingRecords(
    game.welfareDebtAccountingRecords,
    fallback.welfareDebtAccountingRecords ?? {}
  )
  const factionEthicsRecords = sanitizeFactionEthicsMatrixRecords(
    game.factionEthicsRecords,
    fallback.factionEthicsRecords ?? {}
  )
  const accountabilityMatrixRecords = sanitizeMoralLegalAccountabilityMatrixRecords(
    game.accountabilityMatrixRecords,
    fallback.accountabilityMatrixRecords ?? {}
  )
  const containedPersonIntegratedHealthBundles = sanitizeContainedPersonIntegratedHealthBundles(
    game.containedPersonIntegratedHealthBundles,
    fallback.containedPersonIntegratedHealthBundles ?? {}
  )
  const surveillanceInterventionTuningRecords = sanitizeSurveillanceInterventionTuningRecords(
    game.surveillanceInterventionTuningRecords,
    fallback.surveillanceInterventionTuningRecords ?? {}
  )
  const psychologicalResilienceRecords = sanitizePsychologicalResilienceRecords(
    game.psychologicalResilienceRecords,
    fallback.psychologicalResilienceRecords ?? {}
  )
  const cognitiveHazardExposureRecords = sanitizeCognitiveHazardExposureRecords(
    game.cognitiveHazardExposureRecords,
    fallback.cognitiveHazardExposureRecords ?? {}
  )
  const factions = hasPersistedFactions
    ? sanitizeFactionsMap(game.factions, fallback.factions)
    : fallback.factions
  const normalizedCases = reconcileCaseFactionReferences(
    sanitizeCasesMap(game.cases, teams, week, fallback.cases, agents, fallback.templates),
    factions
  )
  const contracts = hasPersistedContracts
    ? sanitizeHydratedContractSystemState(game.contracts, week, fallback.contracts, {
        factions,
        cases: normalizedCases,
      })
    : undefined
  const externalSupportAssets = hasPersistedExternalSupport
    ? sanitizeExternalSupportAssetsMap(game.externalSupportAssets)
    : undefined
  const { rngSeed, rngState: hydratedRngState } = reconcileHydratedRngState(
    (game.rngSeed as number | undefined) ?? fallback.rngSeed,
    game.rngState
  )
  const academyTier = trainingCapacity.academyTier
  const { runtimeState, globalFlags } = reconcileHydratedGlobalFlags(
    game.runtimeState,
    game.globalFlags,
    week,
    fallback.runtimeState
  )
  const facilityState = sanitizeFacilityState(game.facilityState, week, fallback.facilityState)
  const squadKitTemplates = sanitizeSquadKitTemplatesMap(game.squadKitTemplates)
  const squadKitAssignments = sanitizeSquadKitAssignmentsMap(
    game.squadKitAssignments,
    teams,
    squadKitTemplates
  )
  const hydrationFunding = resolveHydratedFunding(game, fallback)
  const hydrationContainmentRating = sanitizeInteger(
    game.containmentRating as number | undefined,
    fallback.containmentRating,
    0
  )
  const hydrationClearanceLevel = reconcileHydratedClearanceLevel(
    sanitizeInteger(game.clearanceLevel as number | undefined, fallback.clearanceLevel, 1),
    hydrationContainmentRating,
    config.clearanceThresholds
  )
  const hydrationSupportAvailable = reconcileHydratedSupportAvailable(
    game.supportAvailable,
    isRecord(game.agency) ? game.agency.supportAvailable : undefined,
    fallback.supportAvailable
  )
  const hydrationCoordinationFriction = reconcileHydratedCoordinationFriction(
    game.coordinationFrictionActive,
    game.coordinationFrictionReason,
    isRecord(game.agency) ? game.agency.coordinationFrictionActive : undefined,
    isRecord(game.agency) ? game.agency.coordinationFrictionReason : undefined,
    {
      coordinationFrictionActive: fallback.coordinationFrictionActive,
      coordinationFrictionReason: fallback.coordinationFrictionReason,
    }
  )
  const hydrationSupportStaff = sanitizeSupportStaffSummary(game.supportStaff)
  const hydrationAgency =
    sanitizeAgencyState(
      game.agency ?? fallback.agency,
      {
        containmentRating: hydrationContainmentRating,
        clearanceLevel: hydrationClearanceLevel,
        funding: hydrationFunding,
        supportAvailable: hydrationSupportAvailable,
        coordinationFrictionActive: hydrationCoordinationFriction.coordinationFrictionActive,
        coordinationFrictionReason: hydrationCoordinationFriction.coordinationFrictionReason,
      },
      config,
      week
    ) ?? fallback.agency
  const gameOver = typeof game.gameOver === 'boolean' ? game.gameOver : fallback.gameOver
  const gameOverReason = sanitizeGameOverReason(
    gameOver,
    game.gameOverReason,
    fallback.gameOverReason
  )
  const reports = sanitizeWeeklyReports(
    game.reports,
    normalizedCases,
    teams,
    agents,
    week,
    rngSeed,
    calendarConfig
  )
  const sanitizedEvents = sanitizeOperationEvents(game.events, fallback.events, {
    allowLegacySyntheticRepair:
      options.allowLegacySyntheticRepair === true ||
      (isRecord(game) && game.allowLegacySyntheticRepair === true),
    campaignWeek: week,
    weeklyReportsByWeek: buildWeeklyReportIntelSnapshotsByWeek(reports),
    fallbackFeaturedRecipeId: fallback.market.featuredRecipeId,
  })
  const events = reconcileHydratedOperationEventRefs(sanitizedEvents)
  const market = sanitizeMarket(game.market, fallback.market, week)
  const inventory = sanitizeInventory(game.inventory, fallback.inventory)
  const damagedEquipmentQueue = sanitizeDamagedEquipmentQueue(
    game.damagedEquipmentQueue,
    inventory,
    fallback.damagedEquipmentQueue
  )

  const hydratedBase = stripUndefinedFields({
    ...fallback,
    week,
    rngSeed,
    rngState: hydratedRngState,
    gameOver,
    gameOverReason,
    directiveState: sanitizeWeeklyDirectiveState(
      game.directiveState,
      fallback.directiveState,
      week
    ),
    agents,
    staff,
    knowledge,
    informationIntakeReports,
    extranormalEventRecords,
    unexplainedLocationRecords,
    minorAnomalyItemRecords,
    namingHazardDescriptorRecords,
    recurrentCatastropheRecords,
    postIncidentReviewRecords,
    postIncidentReviewRecommendationRecords,
    postIncidentReviewRecommendationActionRecords,
    ruleDocumentComplianceRecords,
    selfCensoringInformationRecords,
    publicDisclosureRecords,
    publicDisclosurePostureChoices,
    truthLayerRecords,
    truthLayerWeeklyProjectionSnapshots,
    coverStoryRecords,
    coverStoryWeeklyProjectionSnapshots,
    patternSourceSeriesRecords,
    publishQueueRecords,
    publishQueueExecutionReceipts,
    modifiableDataPackRecords,
    massAnomalousPopulationEmergenceRecords,
    visualTriggerHazardRecords,
    spe947PlatformRecords,
    spe947OperationRecords,
    spe947ContentArtifacts,
    spe947CounterMemeticPlans,
    spe947ContentOwners,
    spe947PostCaseMediaCases,
    spe947FootageExposureBindings,
    spe947TakedownResistanceBindings,
    spe947VisualTriggerHazardBindings,
    spe947MediaEconomyWeights,
    spe947MediaEconomyContinuityBindings,
    spe947MediaEconomyCommercializationActors,
    spe947MediaEconomyLastWeeklyTickWeek,
    spe956PropagationGraphRecords,
    spe956SurvivorInformalRegistryRecords,
    spe956CollectiveMemoryChannelRecords,
    spe956HotlineChannelRecords,
    spe956AsyncDiscussionSurfaceRecords,
    spe956CommunityAdvisoryBodyRecords,
    spe956IncidentBaselineRecords,
    affiliationPersonStatusRecords,
    affiliationFileWorkQueueActionRecords,
    affiliationFileWorkQueueEvidenceResolutionRecords,
    affiliationFileWorkQueueRepairActionRecords,
    affiliationFileWorkQueueReleaseActionRecords,
    affiliationFileWorkQueueReleaseOutcomeRecords,
    affiliationFileWorkQueueReleaseFulfillmentRecords,
    affiliationFileWorkQueueReleasePackageRecords,
    affiliationFileWorkQueueFileReleaseDeliveryRecords,
    affiliationFileWorkQueueNonMissionEnforcementRecords,
    affiliationFileWorkQueueEvidenceRepairWorkflows,
    entityWelfareReclassificationRecords,
    containedPersonTherapeuticCareRecords,
    containedPersonMedicationRegimenRecords,
    containedPersonCustodyStatusRecords,
    coerciveContainedPersonProtocolRecords,
    coerciveContainedPersonProtocolWeeklyProjectionSnapshots,
    welfareDebtAccountingRecords,
    factionEthicsRecords,
    accountabilityMatrixRecords,
    containedPersonIntegratedHealthBundles,
    surveillanceInterventionTuningRecords,
    psychologicalResilienceRecords,
    cognitiveHazardExposureRecords,
    candidates,
    recruitmentPool,
    teams,
    cases: normalizedCases,
    caseQueue: sanitizeCaseQueueState(game.caseQueue, normalizedCases, fallback.caseQueue),
    reports,
    events,
    inventory,
    damagedEquipmentQueue,
    runtimeState,
    globalFlags,
    researchState: sanitizeResearchState(
      game.researchState,
      week,
      fallback.researchState,
      facilityState
    ),
    facilityState,
    relationshipHistory: sanitizeRelationshipHistory(
      game.relationshipHistory,
      week,
      agents,
      fallback.relationshipHistory
    ),
    hubState: sanitizeHubState(game.hubState, factions),
    prevHubState: sanitizeHubState(game.prevHubState, factions),
    squadMetadata: sanitizeSquadMetadataMap(game.squadMetadata, teams, agents),
    squadKitTemplates,
    squadKitAssignments,
    partyCards: sanitizePartyCardState(
      game.partyCards,
      fallback.partyCards,
      normalizedCases,
      teams,
      week
    ),
    missionRouting: sanitizePersistedMissionRoutingState(game.missionRouting, {
      cases: normalizedCases,
      teams,
      week,
      informationIntakeReports,
      agents,
      config,
      funding: hydrationFunding,
      agency: hydrationAgency,
      supportStaff: hydrationSupportStaff,
    }),
    replacementPressureState: sanitizeReplacementPressureState(game.replacementPressureState),
    districtScheduleState: sanitizeDistrictScheduleState(game.districtScheduleState, week),
    compromisedAuthority: sanitizeCompromisedAuthorityState(game.compromisedAuthority, factions),
    trainingQueue: sanitizeTrainingQueue(game.trainingQueue, agents, teams, academyTier, week),
    market,
    productionQueue: sanitizeProductionQueue(game.productionQueue, week, market),
    config,
    campaignLedger: sanitizeCampaignLedger(
      game.campaignLedger,
      fallback.campaignLedger ?? createSeedCampaignLedger(),
      week
    ),
    contracts,
    factions,
    externalSupportAssets,
    academyTier,
    containmentRating: hydrationContainmentRating,
    clearanceLevel: hydrationClearanceLevel,
    funding: hydrationFunding,
    emergencyGrayMarketWaiverWeek: sanitizeEmergencyGrayMarketWaiverWeek(
      game.emergencyGrayMarketWaiverWeek,
      week
    ),
    emergencyGrayMarketWaiverPrecedentCount: sanitizeEmergencyGrayMarketWaiverPrecedentCount(
      game.emergencyGrayMarketWaiverPrecedentCount
    ),
    deploymentMomentum: sanitizeDeploymentMomentumState(game.deploymentMomentum, week, config),
    templates: fallback.templates,
  }) as GameState

  const containmentRating = hydrationContainmentRating
  const clearanceLevel = hydrationClearanceLevel
  const funding = hydrationFunding
  const supportAvailable = hydrationSupportAvailable
  const coordinationFrictionActive = hydrationCoordinationFriction.coordinationFrictionActive
  const coordinationFrictionReason = hydrationCoordinationFriction.coordinationFrictionReason
  const legitimacy = sanitizeLegitimacyState(game.legitimacy)
  const supportStaff = hydrationSupportStaff
  const globalPressureScalars = sanitizePersistedGlobalPressureScalars({
    globalPressure: game.globalPressure,
    globalEscalationLevel: game.globalEscalationLevel,
    globalThreatDrift: game.globalThreatDrift,
    globalTimePressure: game.globalTimePressure,
  })

  const agency = hydrationAgency

  const responseGrid = sanitizePersistedResponseGrid(game.responseGrid, {
    templates: fallback.templates,
    agency: agency ?? fallback.agency,
  })

  let hydrated = recomputeAttritionDerivedState({
    ...hydratedBase,
    containmentRating,
    clearanceLevel,
    funding,
    supportAvailable,
    coordinationFrictionActive,
    coordinationFrictionReason,
    ...(legitimacy ? { legitimacy } : {}),
    ...(supportStaff ? { supportStaff } : {}),
    ...globalPressureScalars,
    ...(responseGrid ? { responseGrid } : {}),
    ...(agency ? { agency } : {}),
    runtimeState: reconcileRuntimeUiSelections(hydratedBase.runtimeState!, {
      cases: normalizedCases,
      teams,
      agents,
    }),
  })

  hydrated = {
    ...hydrated,
    missionRouting: reconcileHydratedMissionRoutingTriage(
      hydratedBase.missionRouting,
      hydrated.missionRouting,
      {
        cases: normalizedCases,
        informationIntakeReports,
      }
    ),
  }

  if (!legitimacy) {
    delete hydrated.legitimacy
  }

  if (!supportStaff) {
    delete hydrated.supportStaff
  }

  for (const key of [
    'globalPressure',
    'globalEscalationLevel',
    'globalThreatDrift',
    'globalTimePressure',
  ] as const) {
    if (!(key in globalPressureScalars)) {
      delete hydrated[key]
    }
  }

  if (!hasPersistedContracts) {
    delete hydrated.contracts
  } else {
    const persistedDebriefRecords = (
      contracts as ContractSystemState & { debriefRecords?: ContractDebriefRecord[] }
    ).debriefRecords

    if (contracts?.active || persistedDebriefRecords) {
      hydrated = {
        ...hydrated,
        contracts: {
          ...contracts,
          ...(persistedDebriefRecords ? { debriefRecords: persistedDebriefRecords } : {}),
        } as ContractSystemState,
      }
    }
  }

  // Reapply SPE-956 participatory channel + incident baseline maps after stripUndefinedFields /
  // spreads so per-entry Object.freeze from sanitize survive hydrateGame.
  hydrated = {
    ...hydrated,
    spe956SurvivorInformalRegistryRecords,
    spe956CollectiveMemoryChannelRecords,
    spe956HotlineChannelRecords,
    spe956AsyncDiscussionSurfaceRecords,
    spe956CommunityAdvisoryBodyRecords,
    spe956IncidentBaselineRecords,
  }

  return hydrated
}

/**
 * Hydration 548: persisted-store migration is hydrate-only. The `version` argument only
 * rejects invalid envelopes; all schema repair runs inside `hydrateGame`. Bump
 * `GAME_STORE_VERSION` only when pre-hydrate envelope shape must change.
 */
export function migratePersistedStore(
  persistedState: unknown,
  version: number,
  fallback = createStartingState()
): PersistedStore {
  if (version < 1 || !isRecord(persistedState)) {
    return { game: stripGameTemplates(fallback) }
  }

  if (!('game' in persistedState)) {
    return { game: stripGameTemplates(fallback) }
  }

  return {
    game: stripGameTemplates(
      hydrateGame(persistedState.game, fallback, { allowLegacySyntheticRepair: true })
    ),
  }
}

export function createRunExportPayload(game: GameState): RunExportPayload {
  return {
    kind: RUN_EXPORT_KIND,
    version: GAME_STORE_VERSION,
    exportedAt: new Date().toISOString(),
    game: stripGameTemplates(game),
  }
}

export function serializeRunExport(game: GameState) {
  return JSON.stringify(createRunExportPayload(game), null, 2)
}

export function parseRunExport(raw: string, fallback = createStartingState()): GameState {
  let parsed: unknown

  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Run payload is not valid JSON.')
  }

  if (!isRecord(parsed) || parsed.kind !== RUN_EXPORT_KIND || !('game' in parsed)) {
    throw new Error('Run payload is not a supported Containment Protocol export.')
  }

  if (
    typeof parsed.version !== 'number' ||
    !Number.isInteger(parsed.version) ||
    parsed.version < 1 ||
    parsed.version > GAME_STORE_VERSION
  ) {
    throw new Error('Run payload version is not supported by this build.')
  }

  validateImportTimestampMetadata(parsed.exportedAt, 'exportedAt')

  return hydrateGame(parsed.game, fallback, { allowLegacySyntheticRepair: true })
}

export function createRunFromCurrentConfig(config: GameConfig, seed: number) {
  const nextGame = createStartingState()
  const normalizedSeed = normalizeSeed(seed)

  return {
    ...nextGame,
    rngSeed: normalizedSeed,
    rngState: normalizedSeed,
    config: sanitizeGameConfig(config, nextGame.config),
  }
}
