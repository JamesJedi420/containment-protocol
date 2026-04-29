// --- Legacy enums/types for stabilityLayer compat ---
export type DeploymentHardBlockerCode =
  | 'missing-coverage'
  | 'missing-certification'
  | 'invalid-loadout-gate'
  | 'team-state-incompatible'
  | 'training-blocked'
  | 'recovery-required'
  | 'routing-state-blocked'
  | 'capacity-locked'

export type DeploymentSoftRiskCode =
  | 'low-cohesion-band'
  | 'high-fatigue-burden'
  | 'weakest-link-risk'
  | 'strategic-mismatch'
  | 'budget-pressure'
  | 'attrition-pressure'
  | 'intel-uncertainty'

export type DeploymentReadinessCategory =
  | 'mission_ready'
  | 'conditional'
  | 'hard_blocked'
  | 'temporarily_blocked'
  | 'recovery_required'

export type MissionCategory =
  | 'containment_breach'
  | 'investigation_lead'
  | 'civilian_infrastructure_incident'
  | 'faction_hostile_activity'
  | 'strategic_opportunity'

export type MissionPriorityBand = 'critical' | 'high' | 'normal' | 'low'

export type MissionRoutingBlockerCode =
  | 'missing-coverage'
  | 'training-blocked'
  | 'missing-certification'
  | 'invalid-loadout-gate'
  | 'fatigue-over-threshold'
  | 'team-state-incompatible'
  | 'recovery-required'
  | 'routing-state-blocked'
  | 'capacity-locked'
  | 'no-valid-team'
  | 'no-eligible-teams'

export type MissionRoutingStateKind = 'queued' | 'shortlisted' | 'assigned' | 'deferred' | 'blocked'

export interface MissionTimeCostSummary {
  missionId: string
  plannedStartWeek: number
  expectedTravelWeeks: number
  expectedSetupWeeks: number
  expectedResolutionWeeks: number
  expectedRecoveryWeeks: number
  expectedTotalWeeks: number
  timeCostReasonCodes: string[]
}

export interface MissionRejectedTeamRecord {
  teamId: string
  reasonCode: string
}

export interface MissionRoutingRecord {
  missionId: string
  templateId: string
  category: MissionCategory
  kind: CaseKind
  status: CaseStatus
  generatedWeek: number
  deadlineRemaining: number
  durationWeeks: number
  weeksRemaining?: number
  stage: number
  difficulty: StatBlock
  weights: WeightBlock
  requiredRoles?: TeamCoverageRole[]
  requiredTags: string[]
  preferredTags: string[]
  assignedTeamIds: string[]
  intakeSource: MissionIntakeSource
  priority: MissionPriorityBand
  priorityReasonCodes: string[]
  triageScore: number
  routingState: MissionRoutingStateKind
  routingBlockers: MissionRoutingBlockerCode[]
  timeCostSummary?: MissionTimeCostSummary
  lastTriageWeek?: number
  lastRoutedWeek?: number
  lastCandidateTeamIds: string[]
  lastRejectedTeamIds: MissionRejectedTeamRecord[]
  id?: string
  state?: MissionRoutingStateKind
  blockers?: MissionRoutingBlockerCode[]
}

export interface MissionRoutingState {
  orderedMissionIds: string[]
  missions: Record<string, MissionRoutingRecord>
  nextGeneratedSequence: number
}

export type MissionIntakeSource =
  | 'scripted'
  | 'escalation'
  | 'pressure'
  | 'faction'
  | 'contract'
  | 'tutorial'

export interface TeamDeploymentReadinessState {
  teamId: string
  readinessCategory: DeploymentReadinessCategory
  readinessScore: number
  hardBlockers: DeploymentHardBlockerCode[]
  softRisks: DeploymentSoftRiskCode[]
  nicheSummary?: TeamNicheSummary
  intelPenalty?: number
  coverageCompleteness: {
    required: string[]
    covered: string[]
    missing: string[]
  }
  cohesionBand: string
  minimumMemberReadiness: number
  averageFatigue: number
  estimatedDeployWeeks: number
  estimatedRecoveryWeeks: number
  computedWeek: number
}

export type AgentAvailabilityState =
  | 'idle'
  | 'assigned'
  | 'training'
  | 'recovering'
  | 'unavailable'

export interface AgentDeploymentReadinessSnapshot {
  agentId: string
  deployable: boolean
  availabilityState: AgentAvailabilityState
  fatigue: number
  loadoutReadiness: string
  certificationReadiness: string
  trainingLockReason?: string
}

export interface DeploymentEligibilityResult {
  eligible: boolean
  hardBlockers: DeploymentHardBlockerCode[]
  softRisks: DeploymentSoftRiskCode[]
  intelPenalty: number
  timeCostSummary: MissionTimeCostSummary
  weakestLinkContributors: string[]
  explanationNotes: string[]
  agentSnapshots?: AgentDeploymentReadinessSnapshot[]
  readinessState?: TeamDeploymentReadinessState
}
// --- Sim/advanceWeek compatibility types ---
export type ResolutionOutcomeWithDetails = ResolutionOutcome & {
  rewards?: IncidentToCampaignPacket['rewards']
  falloutTags?: IncidentToCampaignPacket['falloutTags']
  powerImpact?: PowerImpactSummary
  injuries?: IncidentToCampaignPacket['injuries']
}

export interface WeeklyCaseResolutionStrategy {
  assignedAgents: NonNullable<GameState['agents'][string]>[]
  assignedAgentLeaderBonuses: Record<string, LeaderBonus>
  activeTeamStressModifiers: Record<string, number>
  outcome: ResolutionOutcomeWithDetails
  campaignToIncident?: unknown
  incidentToCampaign?: unknown
}
// Add missing types for sim/advanceWeek compatibility
export type KnowledgeTier = 'unknown' | 'fragmented' | 'partial' | 'confirmed'
// SPE-64: Explicit cross-scale handoff contracts

/**
 * Explicit contract for campaign → incident/operation handoff.
 * Contains only the bounded, deterministic state needed for incident resolution.
 */
export interface CampaignToIncidentPacket {
  campaignId: string
  week: number
  caseId: string
  caseTitle: string
  teamId: string
  teamSnapshot: Team // snapshot of team at handoff
  campaignDirectives: string[] // e.g., directive tags or ids
  knowledgeState: KnowledgeState
  // Add other minimal, explicit fields as needed
}

/**
 * Explicit contract for incident/operation → campaign fallout/result handoff.
 * Contains only the bounded, deterministic effects to apply to campaign state.
 */
export interface IncidentToCampaignPacket {
  caseId: string
  teamId: string
  outcome: string // e.g., 'success', 'partial', 'fail', etc.
  rewards: unknown // Use MissionRewardBreakdown or similar if available
  falloutTags?: string[] // Optional: tags for modular fallout handling
  performanceSummary?: PerformanceMetricSummary
  powerImpact?: PowerImpactSummary
  injuries?: unknown // Use MissionInjuryRecord[] or similar if available
  // Add other minimal, explicit fields as needed
}

// Canonical legitimacy/access state for bounded gating (SPE-53 legitimacy pass)
export interface LegitimacyState {
  sanctionLevel: 'sanctioned' | 'covert' | 'tolerated' | 'unsanctioned'
  accessReason?: string
  falloutRisk?: 'none' | 'risk' | 'costly'
}

// src/domain/models.ts
import type { OperationEvent } from './events/types'
import type { PartyCardState } from './partyCards/models'
import type { WeakestLinkMissionResolutionResult } from './weakestLinkResolution'
import type {
  Agent,
  AgentPowerImpact,
  AgentPerformanceOutput,
  FatigueBand,
  MarketPressure,
  PerformanceMetricSummary,
  ProtocolGlobalModifiers,
  ProtocolScope,
  ProtocolTier,
  ProtocolType,
} from './agent/models'
import type { BeliefTrackState } from './beliefTracks'
import type { KnowledgeState, KnowledgeStateMap } from './knowledge'
// SPE-59: Export KnowledgeState for projection/report typing
export type { KnowledgeState }

// Re-export all agent-related types
export type {
  Agent,
  AgentActiveProtocol,
  AgentAppliedKit,
  AgentAbility,
  AgentAbilityState,
  AgentAbilityTrigger,
  AgentAssignmentStatus,
  AgentAssignmentState,
  AgentGrowthStats,
  AgentHistory,
  AgentHistoryCounters,
  AgentHistoryEntry,
  AgentIdentity,
  AgentPerformance,
  AgentPerformanceBlendBreakdown,
  ExactPotentialTier,
  AgentPowerImpact,
  AgentPerformanceOutput,
  AgentProgression,
  PotentialIntel,
  PotentialIntelConfidence,
  PotentialIntelSource,
  AgentReadinessProfile,
  AgentRole,
  AgentSimulationPurpose,
  AgentScoreBreakdown,
  AgentServiceRecord,
  AgentTrait,
  AgentTraitModifierKey,
  AgentVitals,
  DomainStats,
  EquipmentSlots,
  FatigueBand,
  HireStatus,
  LegacyStatDomain,
  MarketPressure,
  PerformanceMetricSummary,
  PotentialTier,
  ProtocolGlobalModifiers,
  ProtocolScope,
  ProtocolTier,
  ProtocolType,
  RecruitCategory,
  RoleDomainWeights,
  SkillTree,
  StatDomain,
} from './agent/models'
import type {
  AgentCandidateData as RecruitmentAgentData,
  Candidate as RecruitmentCandidate,
  CandidateBase as RecruitmentCandidateBase,
  CandidateCategory as RecruitmentCandidateCategory,
  CandidateEvaluation as RecruitmentCandidateEvaluation,
  SpecialistCandidateData,
  StaffCandidateData as RecruitmentStaffData,
} from './recruitment'

export type {
  PartyCardDefinition,
  PartyCardEffect,
  PartyCardPlay,
  PartyCardResolutionBonus,
  PartyCardState,
  PartyCardTarget,
} from './partyCards/models'

export type {
  DistortionCarrier,
  DistortionInsight,
  DistortionState,
  DistortionThresholds,
} from './shared/distortion'

export type {
  CanonicalTag,
  ConditionCarrierKind,
  ConditionDefinition,
  ConditionKey,
  TagFamily,
} from './shared/tags'

export type {
  ConsequenceKey,
  ConsequenceRoute,
  ContestResolution,
  ContestResolutionInput,
  ExclusiveOutcomeType,
  OutcomeBand,
  OutcomeThresholds,
} from './shared/outcomes'

export type {
  CountermeasureCheck,
  ModifierCap,
  ModifierResult,
  ModifierSource,
  ResistanceProfile,
  ThreatFamily,
} from './shared/modifiers'

export type {
  AgentCandidateRole,
  CandidateCostEstimate,
  CandidateLegacyStats,
  CandidatePipelineStatus,
  CandidatePotentialTier,
  CandidateRevealLevel,
  CandidateScoutStage,
  CandidateScoutReport,
  SpecialistCandidateData,
  StaffCandidateSpecialty,
} from './recruitment'

export type { MissionResultInput } from './missionResults'

export {
  buildCandidateEvaluation,
  CANDIDATE_REVEAL_THRESHOLDS,
  deriveCandidateCostEstimate,
  getCandidateOverall,
  revealCandidate,
  getCandidateWeeklyCost,
  getCandidateScoutCost,
  isCandidateFieldVisible,
  isCandidateHireable,
  isCandidateScoutable,
  normalizeCandidateCategory,
  normalizeCandidateHireStatus,
  normalizeStaffCandidateSpecialty,
  previewCandidate,
  resolveCandidateActualPotentialTier,
  scoreToCandidatePotentialTier,
} from './recruitment'

export type Id = string

export type StatKey = 'combat' | 'investigation' | 'utility' | 'social'
export type StatBlock = Record<StatKey, number> & Record<string, number>
export type WeightBlock = Record<StatKey, number> & Record<string, number>
export const BASE_STAT_MAX = 100

export type CaseMode = 'threshold' | 'probability' | 'deterministic' | 'standard'
export type CaseKind = 'case' | 'raid' | 'standard' | 'anomaly'
export type CaseStatus = 'open' | 'in_progress' | 'resolved'

export type AgentAssignmentStateKind = 'idle' | 'assigned' | 'recovery' | 'training'
/** Compact team finite-state machine for the MVP deployment loop. */
export type TeamState = 'ready' | 'deployed' | 'resolving' | 'recovering'
export const TEAM_COVERAGE_ROLES = [
  'containment',
  'investigator',
  'support',
  'tactical',
  'technical',
] as const
export type TeamCoverageRole = (typeof TEAM_COVERAGE_ROLES)[number]

export type ValidationIssueCode =
  | 'no-selected-teams'
  | 'insufficient-raid-teams'
  | 'no-active-members'
  | 'invalid-team'
  | 'stale-member-reference'
  | 'training-blocked'
  | 'invalid-leader'
  | 'duplicate-membership'
  | 'deploy-conflict'
  | 'missing-required-roles'
  | 'missing-required-tags'

export interface ValidationIssue {
  code: ValidationIssueCode
  detail: string
}

export interface ValidationResult {
  valid: boolean
  requiredRoles: TeamCoverageRole[]
  coveredRoles: TeamCoverageRole[]
  satisfiedRoles: TeamCoverageRole[]
  missingRoles: TeamCoverageRole[]
  requiredTags: string[]
  coveredTags: string[]
  missingTags: string[]
  activeAgentIds: Id[]
  /** Includes agents unavailable due to terminal status (dead/resigned). */
  inactiveAgentIds: Id[]
  /** Legacy compatibility alias; mirrors `inactiveAgentIds`. */
  deadAgentIds: Id[]
  trainingAgentIds: Id[]
  issues: ValidationIssue[]
}

export type TeamCategory =
  | 'containment_strike_team'
  | 'investigation_cell'
  | 'liaison_stabilization_unit'
  | 'balanced_rapid_response_team'

export type TeamCohesionBand = 'strong' | 'steady' | 'unstable' | 'fragile'

export type OperativeNicheKey = 'recon' | 'containment' | 'support'

export interface TeamNicheSummary {
  protectedNiches: OperativeNicheKey[]
  hybridNiches: OperativeNicheKey[]
  substituteNiches: OperativeNicheKey[]
  missingNiches: OperativeNicheKey[]
  overlappingNiches: OperativeNicheKey[]
  summaryLines: string[]
}

export interface TeamCohesionSummary {
  cohesionScore: number
  cohesionBand: TeamCohesionBand
  chemistryScore: number
  coordinationScore: number
  trustScore: number
  fatiguePenalty: number
  cohesionFlags: string[]
}

export interface TeamCompositionState {
  category?: TeamCategory
  requiredCoverageRoles: TeamCoverageRole[]
  coveredRoles: TeamCoverageRole[]
  missingRoles: TeamCoverageRole[]
  nicheSummary?: TeamNicheSummary
  compositionValid: boolean
  validationIssues: ValidationIssue[]
  cohesion: TeamCohesionSummary
}

export interface TeamDerivedStats {
  /** Summary metric for UI only. Resolution logic must not use this as a canonical score. */
  overall: number
  fieldPower: number
  containment: number
  investigation: number
  support: number
  cohesion: number
  chemistryScore: number
  readiness: number
}

export interface TeamResolutionProfile {
  fieldPower: number
  containment: number
  investigation: number
  support: number
}

/** Relationship state determined by value thresholds. */
export type RelationshipState = 'hostile' | 'strained' | 'neutral' | 'friendly' | 'intimate'

export interface Relationship {
  agentAId: string
  agentBId: string
  value: number
  modifiers: string[]
  state: RelationshipState
  /** Stability (0-1) affects how quickly relationships drift. Higher = more resistant to change. */
  stability: number
}

export interface TeamChemistryProfile {
  relationships: Relationship[]
  raw: number
  bonus: number
  pairs: number
  average: number
  /** Overall team cohesion (0-1): average value + density bonus accounting for relationship strength distribution. */
  cohesion: number
}

/**
 * Historical snapshot of relationship value at a specific week.
 * Used for trend analysis and chemistry inspector visualization.
 */
export interface RelationshipSnapshot {
  week: number
  agentAId: string
  agentBId: string
  value: number
  modifiers: string[]
  trustDamage?: number
  reason?:
    | 'mission_success'
    | 'mission_partial'
    | 'mission_fail'
    | 'passive_drift'
    | 'external_event'
    | 'reconciliation'
    | 'spontaneous_event'
    | 'betrayal'
}

/**
 * Directional modifier representation for asymmetric relationship effects.
 * Allows A's perspective on the relationship to differ from B's perspective.
 */
export interface DirectionalModifier {
  modifier: string
  fromAgent: string // agentAId or agentBId, indicating which agent "owns" this perspective
  strength?: number // Optional override on base strength (default 1.0)
}

/**
 * Input parameters for chemistry prediction simulation.
 * Used to test roster changes without mutating game state.
 */
export interface ChemistryPredictionInput {
  baseTeamId: string

  /** Canonical site-space state for bounded spatial logic (SPE-57) */
  siteLayer?: 'exterior' | 'transition' | 'interior'
  visibilityState?: 'clear' | 'obstructed' | 'exposed'
  transitionType?: 'open-approach' | 'threshold' | 'chokepoint'
  /** Optional: bounded spatial flags for deterministic effects */
  spatialFlags?: string[]
  proposedAgentIds: string[]
  currentAgents: Record<string, Agent>
  currentTeams: Record<string, Team>
}

/**
 * Results from chemistry prediction.
 */
export interface ChemistryPredictionResult {
  currentChemistry: TeamChemistryProfile
  predictedChemistry: TeamChemistryProfile
  delta: number
  agentsRemoved: Agent[]
  agentsAdded: Agent[]
}

export interface LeaderBonus {
  /**
   * Team-level effectiveness multiplier applied after role bucket aggregation.
   * 1 is neutral; values above/below 1 improve or degrade team execution.
   */
  effectivenessMultiplier: number
  /**
   * Deterministic control over uncertain incident swings.
   * Positive values improve probability-mode case outcomes.
   */
  eventModifier: number
  /**
   * Post-operation learning multiplier applied to participating agents.
   */
  xpBonus: number
  /**
   * Post-operation stress/fatigue modifier applied to participating agents.
   * Negative values reduce stress; positive values increase it.
   */
  stressModifier: number
}

export interface SynergyEffect {
  /**
   * Additive modifier applied after the raw team role-output buckets are aggregated.
   */
  resolutionBonus?: Partial<TeamResolutionProfile>
  /**
   * Flat additive score modifier applied after role-output weighting.
   */
  scoreBonus?: number
  /**
   * Summary-only cohesion lift for UI/readability surfaces.
   */
  cohesionBonus?: number
}

export interface Synergy {
  id: string
  label: string
  requiredTags: string[]
  threshold: number
  effect: SynergyEffect
}

export interface ActiveSynergy extends Synergy {
  matchedTags: string[]
}

export interface TeamSynergyProfile {
  active: ActiveSynergy[]
  resolutionBonus: TeamResolutionProfile
  scoreBonus: number
  cohesionBonus: number
  /** Additional score bonus from party training bond depth. Only non-zero when
   * synergies are active AND agents have trained together (trainedRelationships). */
  bondDepthBonus?: number
}

export interface TeamStatus {
  /** Current FSM state for the squad. */
  state: TeamState
  /** Canonical assignment pointer mirrored to the legacy team field. */
  assignedCaseId?: Id | null
}

export interface TeamPowerInventoryEntry {
  itemId: string
  name: string
  equippedCount: number
  activeContextCount: number
  stockOnHand: number
  totalQuality: number
  tags: string[]
}

export interface TeamPowerKitSummary {
  id: string
  label: string
  contributorIds: Id[]
  contributorCount: number
  matchedItemIds: string[]
  matchedTags: string[]
  activeThresholds: number[]
  highestActiveThreshold: number
  statModifiers: Record<string, number>
  effectivenessMultiplier: number
  stressImpactMultiplier: number
  moraleRecoveryDelta: number
}

export interface TeamPowerProtocolSummary {
  id: string
  label: string
  type: ProtocolType
  tier: ProtocolTier
  scope: ProtocolScope
  contributorIds: Id[]
  contributorCount: number
  unlockReasons: string[]
  globalModifiers: ProtocolGlobalModifiers
  statModifiers: Record<string, number>
  effectivenessMultiplier: number
  stressImpactMultiplier: number
  moraleRecoveryDelta: number
}

export interface TeamPowerSummary {
  inventory: readonly TeamPowerInventoryEntry[]
  kits: readonly TeamPowerKitSummary[]
  protocols: readonly TeamPowerProtocolSummary[]
  statModifiers: Record<string, number>
  effectivenessMultiplier: number
  stressImpactMultiplier: number
  moraleRecoveryDelta: number
}

export interface PowerImpactSummary extends AgentPowerImpact {
  notes: string[]
}

export type MissionResolutionKind = 'success' | 'partial' | 'fail' | 'unresolved'

export interface MissionRewardFactor {
  id: string
  label: string
  value: number
  detail: string
}

export interface MissionRewardInventoryGrant {
  kind: 'equipment' | 'material'
  itemId: string
  label: string
  quantity: number
  tags: string[]
}

export interface MissionRewardFactionStanding {
  factionId: string
  label: string
  delta: number
  overlapTags: string[]
}

export interface MissionRewardBreakdown {
  outcome: MissionResolutionKind
  caseType: string

  /** Canonical site-space state for bounded spatial logic (SPE-57) */
  siteLayer?: 'exterior' | 'transition' | 'interior'
  visibilityState?: 'clear' | 'obstructed' | 'exposed'
  transitionType?: 'open-approach' | 'threshold' | 'chokepoint'
  /** Optional: bounded spatial flags for deterministic effects */
  spatialFlags?: string[]
  caseTypeLabel: string
  operationValue: number
  factors: readonly MissionRewardFactor[]
  fundingDelta: number
  containmentDelta: number
  strategicValueDelta: number
  reputationDelta: number
  inventoryRewards: readonly MissionRewardInventoryGrant[]
  factionStanding: readonly MissionRewardFactionStanding[]
  label: string
  reasons: readonly string[]
}

export interface MissionPenaltyBreakdown {
  fundingLoss: number
  containmentLoss: number
  reputationLoss: number
  strategicLoss: number
}

export interface MissionTeamUsage {
  teamId: Id
  teamName?: string
}

export interface MissionFatigueChange {
  teamId: Id
  teamName?: string
  before: number
  after: number
  delta: number
  stressModifier: number
}

export interface MissionInjuryRecord {
  agentId: Id
  agentName: string
  severity: string
  damage: number
}

export interface MissionSpawnedConsequence {
  type: 'stage_escalation' | 'follow_up_case'
  caseId: Id
  caseTitle?: string
  stage?: number
  trigger?:
    | 'failure'
    | 'unresolved'
    | 'raid_pressure'
    | 'world_activity'
    | 'faction_offer'
    | 'faction_pressure'
    | 'pressure_threshold'
  detail: string
}

export interface ContactEventRef {
  eventId: Id
  type: string
  week: number
}

export interface ContactModifier {
  id?: Id
  label: string
  description: string
  effect?: string
  value?: number
  hidden?: boolean
}

export interface ContactReward {
  id?: Id
  label: string
  count?: number
}

export type ReputationTier = 'hostile' | 'unfriendly' | 'neutral' | 'friendly' | 'allied'

export type ContractStrategyTag = 'income' | 'materials' | 'research' | 'progression'

export type ContractRiskLevel = 'low' | 'medium' | 'moderate' | 'high' | 'severe' | 'extreme'

export interface ContractResearchUnlock {
  id: Id
  label: string
  description?: string
}

export interface ContractMaterialDrop {
  itemId: Id
  label: string
  quantity: number
}

export interface ContractRewardPackage {
  funding: number
  materials?: ContractMaterialDrop[]
  research?: ContractResearchUnlock[]
}

export type ContractModifierEffect =
  | 'success_bonus'
  | 'reward_bonus'
  | 'injury_risk'
  | 'death_risk'
  | 'deadline_pressure'
  | (string & {})

export interface ContractModifier {
  id: Id
  label: string
  description?: string
  effect?: ContractModifierEffect
  value?: number
  conditions?: string[]
  successModifier?: number
  injuryRiskModifier?: number
  deathRiskModifier?: number
  rewardMultiplier?: number
}

export interface ContractRequirements {
  recommendedClasses: string[]
  discouragedClasses: string[]
}

export interface ContractChainDefinition {
  nextContracts?: string[]
  unlockConditions?: Array<{
    type: string
    templateId?: string
    contractTemplateId?: string
    outcome?: MissionResolutionKind
    minimumOutcome?: MissionResolutionKind
    researchId?: string
    factionId?: string
    minTier?: ReputationTier
    minimumTier?: ReputationTier
    unlockId?: string
  }>
}

export interface ContractOffer {
  id: Id
  templateId: Id
  caseTemplateId: Id
  name: string
  description: string
  factionId?: Id
  contactId?: Id
  caseDifficulty: StatBlock
  difficulty: number
  strategyTag: ContractStrategyTag
  riskLevel: ContractRiskLevel
  durationWeeks: number
  rewards: ContractRewardPackage
  requirements: ContractRequirements
  modifiers: ContractModifier[]
  chain: ContractChainDefinition
  lootTableId?: string
  generatedWeek?: number
}

export interface ContractHistoryRecord {
  completions: number
  bestOutcome: MissionResolutionKind | 'none'
  lastOutcome?: MissionResolutionKind
  lastCompletedWeek?: number
}

export interface ActiveContractRuntime {
  contractId?: Id
  offerId?: Id
  caseId?: Id
  templateId?: Id
  startedWeek?: number
  name?: string
  description?: string
  factionId?: Id
  contactId?: Id
  strategyTag?: ContractStrategyTag
  riskLevel?: ContractRiskLevel
  caseDifficulty?: StatBlock
  rewards?: ContractRewardPackage
  lootTableId?: string
  requirements?: ContractRequirements
  modifiers?: ContractModifier[]
  chain?: ContractChainDefinition
}

export interface ContractSystemState {
  generatedWeek: number
  offers: ContractOffer[]
  history: Record<string, ContractHistoryRecord>
  unlockedResearchIds: string[]
  active?: Record<string, ActiveContractRuntime>
}

export interface Contact {
  id: Id
  name: string
  label?: string
  role: string
  status: 'active' | 'inactive' | 'hostile'
  relationship: number
  disposition?: string
  minTier?: 'hostile' | 'unfriendly' | 'neutral' | 'friendly' | 'allied'
  maxTier?: 'hostile' | 'unfriendly' | 'neutral' | 'friendly' | 'allied'
  rewardId?: Id
  summary?: string
  focusTags?: string[]
  modifiers?: ContactModifier[]
  rewards?: ContactReward[]
  history: {
    interactions: ContactEventRef[]
  }
}

export interface FactionRuntimeState {
  id?: Id
  name?: string
  label?: string
  reputation?: number
  reputationTier?: 'hostile' | 'unfriendly' | 'neutral' | 'friendly' | 'allied'
  contacts?: Contact[]
  history?: {
    missionsCompleted: number
    missionsFailed: number
    successRate: number
    interactionLog: ContactEventRef[]
  }
  knownModifiers?: ContactModifier[]
  hiddenModifierCount?: number
  availableFavors?: ContactReward[]
  recruitUnlocks?: Array<{
    factionId: Id
    factionName: string
    contactId?: Id
    contactName?: string
    label: string
    summary?: string
    disposition?: string
    rewardId: Id
  }>
  lore?: {
    discovered: Array<{ label: string; summary: string }>
    remainingCount: number
  }
}

export interface MissionResult {
  caseId: Id
  caseTitle: string
  teamsUsed: readonly MissionTeamUsage[]
  outcome: MissionResolutionKind
  hiddenState?: 'hidden' | 'revealed' | 'displaced'
  detectionConfidence?: number
  counterDetection?: boolean
  displacementTarget?: Id | null
  route?: string | null
  weakestLink?: WeakestLinkMissionResolutionResult
  performanceSummary: PerformanceMetricSummary
  powerImpact?: PowerImpactSummary
  rewards: MissionRewardBreakdown
  penalties: MissionPenaltyBreakdown
  fatigueChanges: readonly MissionFatigueChange[]
  injuries: readonly MissionInjuryRecord[]
  fatalities?: readonly MissionFatalityRecord[]
  spawnedConsequences: readonly MissionSpawnedConsequence[]
  explanationNotes: readonly string[]
}

/** A team is the unit assigned to cases. Raids assign multiple teams. */
export interface Team {
  id: Id
  name: string
  /**
   * Canonical squad container for the backend team simulation layer.
   * Hydrated onto runtime state even when older saves only contain `agentIds`.
   */
  memberIds?: Id[]
  leaderId?: Id | null
  derivedStats?: TeamDerivedStats
  status?: TeamStatus

  /**
   * Legacy compatibility alias kept so existing routes/tests do not break.
   * Runtime state mirrors this from `memberIds`.
   */
  agentIds: Id[]

  /** Legacy compatibility alias mirrored from `status.assignedCaseId`. */
  assignedCaseId?: Id

  /** Optional equipment tags (e.g., "van", "lab-kit"). */
  tags: string[]
  category?: TeamCategory | string
  deploymentReadinessState?: TeamDeploymentReadinessState
  compositionState?: unknown
  recoveryPressure?: number
}

export type CandidateBase = RecruitmentCandidateBase

export type CandidateCategory = RecruitmentCandidateCategory

export type PersonBase = RecruitmentCandidateBase

export type CandidateEvaluation = RecruitmentCandidateEvaluation

export type AgentData = RecruitmentAgentData

export interface InstructorData {
  role: 'instructor'
  name: string
  efficiency: number
  instructorSpecialty: StatKey
  assignedAgentId?: string
}

export type StaffData = (RecruitmentStaffData & { role?: 'staff' }) | InstructorData

export type FieldTechData = SpecialistCandidateData

export type AnalystData = SpecialistCandidateData

export type Candidate = RecruitmentCandidate

export interface SpawnRule {
  /** Legacy escalation type discriminator used by older fixtures. */
  type?: string

  /** Stage increase applied to the parent case. */
  stageDelta?: number

  /** Reset/override the deadline after escalation (optional). */
  deadlineResetWeeks?: number

  /** Child-case spawn count range. */
  spawnCount?: { min: number; max: number }

  /** Template IDs to spawn from. */
  spawnTemplateIds?: string[]

  /** Optional: convert parent case to raid at/above stage threshold. */
  convertToRaidAtStage?: number
}

export interface CaseTemplate {
  templateId: string
  title: string
  description: string

  mode: CaseMode
  kind: CaseKind

  /** Difficulty by category: antagonists/puzzles/hazards/social complications. */
  difficulty: StatBlock

  /** Weights define what matters (combat-heavy vs investigation-heavy). */
  weights: WeightBlock

  /**
   * Commitment length once a team is assigned.
   * The case resolves ONLY when the full duration completes.
   */
  durationWeeks: number

  /**
   * How long the case can remain unassigned before "unresolved" triggers.
   * Unresolved is stronger than fail (by design).
   */
  deadlineWeeks: number

  tags: string[]
  distortion?: import('./shared/distortion').DistortionState[]

  /** Deterministic gate: hard requirements (e.g., "medium", "occultist"). */
  requiredTags?: string[]
  factionId?: string
  contactId?: string
  contract?: { templateId?: string; [key: string]: unknown }

  /** Baseline team role coverage required to attempt the case effectively. */
  requiredRoles?: TeamCoverageRole[]

  /** Soft preferences: additive bonuses for matching tools/skills. */
  preferredTags?: string[]

  onFail: SpawnRule
  onUnresolved: SpawnRule

  /** Optional explicit pressure contribution used by pressure pipeline and intel surfaces. */
  pressureValue?: number

  /** Optional explicit region affinity used by pressure pipeline and intel surfaces. */
  regionTag?: string

  /** Only relevant when kind === "raid". */
  raid?: { minTeams: number; maxTeams: number }
}

export interface CaseInstance {
  /**
   * SPE-38: True if this operation suffered a support shortfall this week (deterministic, for fallout/penalty).
   */
  supportShortfall?: boolean
  id: Id
  templateId: string

  title: string
  description: string

  mode: CaseMode
  kind: CaseKind
  status: CaseStatus

  difficulty: StatBlock
  weights: WeightBlock

  tags: string[]
  distortion?: import('./shared/distortion').DistortionState[]
  requiredTags: string[]
  requiredRoles?: TeamCoverageRole[]
  preferredTags: string[]
  threatFamily?: import('./shared/modifiers').ThreatFamily
  intelConfidence?: number
  intelUncertainty?: number
  intelLastUpdatedWeek?: number
  consequences?: import('./shared/outcomes').ConsequenceKey[]
  severeHit?: import('./shared/outcomes').ConsequenceKey[]
  escalationBand?: import('./shared/outcomes').OutcomeBand
  counterExplanation?: string
  beliefTracks?: BeliefTrackState
  factionId?: string
  contactId?: string
  contract?: { templateId?: string; [key: string]: unknown }
  majorIncident?: ActiveMajorIncidentRuntime
  escalationLevel?: number
  threatDrift?: number
  timePressure?: number

  /** Escalates with failure/unresolved; increases difficulty/spread. */
  stage: number

  durationWeeks: number
  weeksRemaining?: number

  deadlineWeeks: number
  deadlineRemaining: number

  /** For normal cases: 0..1 teams; for raids: 0..N teams. */
  assignedTeamIds: Id[]
  hiddenState?: 'hidden' | 'revealed' | 'displaced'
  detectionConfidence?: number
  counterDetection?: boolean
  displacementTarget?: Id | null
  route?: string | null

  onFail: SpawnRule
  onUnresolved: SpawnRule

  /** Optional explicit pressure contribution used by pressure pipeline and intel surfaces. */
  pressureValue?: number

  /** Optional explicit region affinity used by pressure pipeline and intel surfaces. */
  regionTag?: string

  raid?: { minTeams: number; maxTeams: number }

  // Added for spatial/visibility/transition support (SPE-57, SPE-XX)
  siteLayer?: 'exterior' | 'transition' | 'interior'
  visibilityState?: 'clear' | 'obstructed' | 'exposed'
  transitionType?: 'open-approach' | 'threshold' | 'chokepoint'
  spatialFlags?: string[]
  /** Resolved map-layer from the site-generation pipeline. Populated by applySiteGenerationToCase. */
  mapLayer?: import('./siteGeneration/mapMetadata').MapLayerResult
  /** Runtime weird-room state packets attached to this site. Populated by applySiteGenerationToCase. */
  weirdRoomPackets?: WeirdRoomPacket[]
}

export interface ResolutionOutcome {
  caseId: Id
  mode: CaseMode
  kind: CaseKind

  /** delta = teamScore - requiredScore */
  delta: number

  /** for probability mode (optional UI visibility) */
  successChance?: number

  /**
   * Abstract result summary only.
   * This system does not model tactical turns, positions, animations, or per-ability playback.
   */
  result: 'success' | 'partial' | 'fail'
  reasons: string[]

  /** Optional per-agent simulation outputs for analytics and balancing. */
  agentPerformance?: AgentPerformanceOutput[]
  performanceSummary?: PerformanceMetricSummary
}

export interface WeeklyReportCaseSnapshot {
  caseId: Id
  title: string
  kind: CaseKind
  mode: CaseMode
  status: CaseStatus
  stage: number
  deadlineRemaining: number
  durationWeeks: number
  weeksRemaining?: number
  assignedTeamIds: Id[]
  performanceSummary?: PerformanceMetricSummary
  powerImpact?: PowerImpactSummary
  rewardBreakdown?: MissionRewardBreakdown
  missionResult?: MissionResult
  /** Canonical distortion state propagated for output/reporting. */
  distortion?: import('./shared/distortion').DistortionState[]
  /** Canonical knowledge state for this case (per team, if available). */
  knowledge?: Record<string, import('./knowledge').KnowledgeState>
  /** Canonical explanation of what was unknown, revealed, and remains uncertain. */
  revealExplanation?: string
  // Allow dynamic property access for sim/report compatibility
  [key: string]: unknown
}

export interface WeeklyReportTeamStatus {
  teamId: Id
  teamName?: string
  assignedCaseId?: Id
  assignedCaseTitle?: string
  avgFatigue: number
  fatigueBand?: FatigueBand
}

/** Structured report log entry emitted by the weekly simulation step. */
export type ReportNoteType =
  | 'case.resolved'
  | 'case.partially_resolved'
  | 'case.failed'
  | 'case.escalated'
  | 'case.spawned'
  | 'case.raid_converted'
  | 'case.aggregate_battle'
  | 'agent.training_completed'
  | 'production.queue_completed'
  | 'market.shifted'
  | 'market.transaction_recorded'
  | 'faction.standing_changed'
  | 'faction.unlock_available'
  | 'agency.containment_updated'
  | 'system.week_delta'
  | 'system.recruitment_expired'
  | 'system.recruitment_generated'
  | 'recruitment.scouting_initiated'
  | 'recruitment.scouting_refined'
  | 'recruitment.intel_confirmed'
  | 'system.party_cards_drawn'
  | 'system.escalation_consequence'
  | 'system.proxy_conflict'
  | 'system.protocol_contact'
  | 'system.anchor_instability'
  | 'directive.applied'
  // Add support.shortfall for fallout reporting
  | 'support.shortfall'
  | 'support.restored'
  | 'hub.opportunity'
  | 'hub.rumor'
  | 'system.equipment_recovered'

export type ReportNoteMetadataValue =
  | string
  | number
  | boolean
  | null
  | readonly string[]
  | readonly number[]
  | readonly boolean[]

export type ReportNoteMetadata = Record<string, ReportNoteMetadataValue>

export interface ReportNote {
  id: string
  content: string
  timestamp: number
  type?: ReportNoteType
  metadata?: ReportNoteMetadata
}

/**
 * Bounded set of seasons used by the shared campaign-calendar surface.
 * SPE-1071 slice 1: derivation only, no seasonal modifiers yet.
 */
export type CampaignSeason = 'spring' | 'summer' | 'autumn' | 'winter'

/**
 * Pure derivation of `GameState.week` into a typed campaign-date surface.
 * SPE-1071 slice 1: no month/lunar/anniversary semantics. `absoluteWeek`
 * matches `GameState.week` and is the single mutable source of truth.
 */
export interface CampaignDate {
  absoluteWeek: number
  year: number
  weekOfYear: number
  season: CampaignSeason
}

/**
 * Resolved calendar configuration. `weeksPerYear` mirrors
 * `GameConfig.weeksPerYear`; `weeksPerSeason` is derived (default 4 seasons
 * per year). Epoch defaults place absolute week 0 at Year 1, Week 1.
 * SPE-1071 slice 1.
 */
export interface CalendarConfig {
  weeksPerYear: number
  weeksPerSeason: number
  epochYear: number
  epochWeekOfYear: number
}

export interface WeeklyReport {
  week: number
  rngStateBefore: number
  rngStateAfter: number

  /**
   * Shared campaign-calendar date stamp (SPE-1071 slice 1). Optional so
   * legacy persisted reports remain valid; populated for new reports.
   * `date.absoluteWeek === week` by construction.
   */
  date?: CampaignDate

  /** Aggregate case-resolution outputs, not a combat transcript. */
  newCases: Id[]

  progressedCases: Id[]
  resolvedCases: Id[]
  failedCases: Id[]
  partialCases: Id[]

  unresolvedTriggers: Id[]
  spawnedCases: Id[]
  maxStage: number
  avgFatigue: number

  teamStatus: WeeklyReportTeamStatus[]
  caseSnapshots?: Record<Id, WeeklyReportCaseSnapshot>

  notes: ReportNote[]
}

export type WeeklyDirectiveId =
  | 'intel-surge'
  | 'recovery-rotation'
  | 'procurement-push'
  | 'lockdown-protocol'

export interface WeeklyDirectiveHistoryEntry {
  week: number
  directiveId: WeeklyDirectiveId
}

export interface WeeklyDirectiveState {
  selectedId: WeeklyDirectiveId | null
  history: WeeklyDirectiveHistoryEntry[]
}

export interface TrainingProgram {
  trainingId: string
  category?: string
  name: string
  description: string
  scope?: 'agent' | 'team'
  /** Minimum academy tier required before the program becomes queueable. */
  minAcademyTier?: number
  targetStat: StatKey
  statDelta: number
  durationWeeks: number
  fundingCost: number
  fatigueDelta: number
  /** Permanent bonus added to the agent's per-week recovery rate on completion. */
  recoveryBonus?: number
  /** Direct resilience training bonuses applied to derived stability stats. */
  stabilityResistanceDelta?: number
  stabilityToleranceDelta?: number
  relationshipDelta?: number
  trainedRelationshipDelta?: number
  certificationIds?: string[]
  requiredResearchIds?: string[]
}

export interface TrainingQueueEntry {
  id: Id
  trainingId: string
  trainingName: string
  scope: 'agent' | 'team'
  agentId: Id
  agentName: string
  teamId?: Id
  teamName?: string
  drillGroupId?: Id
  memberIds?: Id[]
  targetStat: StatKey
  statDelta: number
  startedWeek: number
  durationWeeks: number
  remainingWeeks: number
  fundingCost: number
  fatigueDelta: number
  recoveryBonus?: number
  stabilityResistanceDelta?: number
  stabilityToleranceDelta?: number
  /** Permanent stat bonus from academy tier, snapshotted at queue time. */
  academyStatBonus?: number
  relationshipDelta?: number
  trainedRelationshipDelta?: number
}

export interface ProductionMaterialRequirement {
  materialId: string
  materialName: string
  quantity: number
}

export interface ProductionQueueEntry {
  id: Id
  recipeId: string
  recipeName: string
  recipeDescription?: string
  outputItemId: string
  outputItemName: string
  outputQuantity: number
  inputMaterials?: ProductionMaterialRequirement[]
  startedWeek: number
  durationWeeks: number
  remainingWeeks: number
  fundingCost: number
}

export interface MarketState {
  week: number
  featuredRecipeId: string
  pressure: MarketPressure
  costMultiplier: number
  listings?: unknown[]
}

export type CasePriority = 'critical' | 'high' | 'normal' | 'low'

export interface CaseQueueState {
  queuedCaseIds: Id[]
  priorities: Record<Id, CasePriority>
}

export type GameFlagValue = string | number | boolean

export interface PlayerProfileState {
  id: string
  displayName: string
  callsign?: string
  organization?: string
}

export interface GameLocationState {
  hubId: string
  locationId?: string
  sceneId?: string
  updatedWeek?: number
}

export interface SceneHistoryEntry {
  sceneId: string
  locationId: string
  week?: number
  outcome?: string
  tags?: string[]
}

export interface OneShotEventState {
  seen: boolean
  eventId?: string
  firstSeenWeek?: number
  source?: string
}

export type EncounterRuntimeStatus = 'available' | 'active' | 'resolved' | 'locked' | 'hidden' | 'archived'
export type EncounterResolutionOutcome = 'success' | 'partial' | 'failed' | 'failure' | 'dismissed'

export interface EncounterRuntimeState {
  encounterId?: string
  status?: EncounterRuntimeStatus
  phase?: string
  startedWeek?: number
  resolvedWeek?: number
  latestOutcome?: EncounterResolutionOutcome
  lastResolutionId?: string
  followUpIds?: string[]
  hiddenModifierIds?: string[]
  revealedModifierIds?: string[]
  flags?: Record<string, boolean>
  lastUpdatedWeek?: number
}

export interface ProgressClockState {
  id: string
  label: string
  value: number
  max: number
  hidden?: boolean
  completedAtWeek?: number
}

export type RuntimeEventQueuePayloadValue =
  | string
  | number
  | boolean
  | readonly string[]

export interface RuntimeQueuedEvent {
  id: string
  type: string
  targetId: string
  contextId?: string
  source?: string
  week?: number
  payload?: Record<string, RuntimeEventQueuePayloadValue>
}

export interface RuntimeEventQueueState {
  entries: RuntimeQueuedEvent[]
  nextSequence: number
}

export type DeveloperLogEventType =
  | 'flag.set'
  | 'flag.cleared'
  | 'one_shot.consumed'
  | 'route.selected'
  | 'choice.executed'
  | 'event_queue.enqueued'
  | 'event_queue.dequeued'
  | 'event_queue.cleared'
  | 'progress_clock.changed'
  | 'encounter.patched'
  | 'location.changed'
  | 'save.exported'
  | 'save.imported'
  | 'authoring.context_changed'

export type DeveloperLogDetailValue =
  | string
  | number
  | boolean
  | readonly string[]

export interface DeveloperLogEvent {
  id: string
  week: number
  type: DeveloperLogEventType
  summary: string
  contextId?: string
  details?: Record<string, DeveloperLogDetailValue>
}

export interface GameUiDebugState {
  selectedLocationId?: string
  selectedSceneId?: string
  selectedCaseId?: string
  selectedTeamId?: string
  selectedAgentId?: string
  inspectorPanel?: string
  authoring?: {
    activeContextId?: string
    lastChoiceId?: string
    lastNextTargetId?: string
    lastFollowUpIds?: string[]
    updatedWeek?: number
  }
  debug: {
    enabled: boolean
    flags: Record<string, boolean>
    eventLog?: DeveloperLogEvent[]
    nextEventSequence?: number
  }
}

export interface RuntimeState {
  player: PlayerProfileState
  globalFlags: Record<string, GameFlagValue>
  oneShotEvents: Record<string, OneShotEventState>
  currentLocation: GameLocationState
  sceneHistory: SceneHistoryEntry[]
  encounterState: Record<string, EncounterRuntimeState>
  progressClocks: Record<string, ProgressClockState>
  eventQueue: RuntimeEventQueueState
  ui: GameUiDebugState
}

export type FacilityCategory = string
export type FacilityStatus = 'available' | 'active' | 'upgrading' | 'inactive' | 'locked'

export interface FacilityEffect {
  researchSlots?: number
  researchSpeedMultiplier?: number
  dataPoolPerWeek?: number
  materialsPoolPerWeek?: number
  trainingSlots?: number
  recoveryThroughput?: number
  [key: string]: number | undefined
}

export interface FacilityInstance {
  facilityId: string
  category: FacilityCategory
  level: number
  maxLevel?: number
  status: FacilityStatus
  effects: FacilityEffect
  upgradeInProgress?: boolean
  upgradeStartedWeek?: number
  upgradeCompleteWeek?: number
  pendingEffectDeltas?: FacilityEffect
}

export interface FacilityUpgradeMetadata {
  costMoney: number
  costMaterials?: number
  buildWeeks: number
  effectDeltas: FacilityEffect
  requirements?: {
    requiredResearchIds?: string[]
    requiredFacilityLevels?: Array<{ facilityId: string; level: number }>
  }
}

export interface FacilityState {
  facilities: Record<string, FacilityInstance>
}

export type FundingCategory =
  | 'weekly_income'
  | 'resolution_reward'
  | 'failure_penalty'
  | 'unresolved_penalty'
  | 'market_transaction'
  | 'facility_upgrade'
  | (string & {})

export interface FundingHistoryRecord {
  week: number
  delta: number
  reason: FundingCategory | string
  sourceId?: string
}

export interface ProcurementBacklogEntry {
  requestId: string
  itemId: string
  quantity: number
  status: 'pending' | 'fulfilled' | 'cancelled'
  requestedWeek: number
  fulfilledWeek?: number
  cost: number
  blockedReason?: string
}

export interface FundingState {
  funding: number
  fundingBasePerWeek: number
  fundingPerResolution: number
  fundingPenaltyPerFail: number
  fundingPenaltyPerUnresolved: number
  budgetPressure: number
  constrained?: boolean
  severeConstraint?: boolean
  fundingHistory: FundingHistoryRecord[]
  procurementBacklog: ProcurementBacklogEntry[]
}

export type ResearchUnlockCategory =
  | 'intel_tool'
  | 'facility'
  | 'training'
  | 'equipment'
  | 'contract'
  | (string & {})

export interface ResearchUnlock {
  id: string
  label: string
  category: ResearchUnlockCategory
  description?: string
}

export type ResearchProjectStatus = 'locked' | 'available' | 'queued' | 'active' | 'completed' | 'blocked'

export interface ResearchProject {
  projectId: string
  label?: string
  category?: string
  status: ResearchProjectStatus
  costTime: number
  costData: number
  costMaterials: number
  progressTime?: number
  progressData?: number
  progressMaterials?: number
  startedWeek?: number
  completedWeek?: number
  lastUpdatedWeek?: number
  requiredResearchIds?: string[]
  requiredFacilityLevels?: Array<{ facilityId: string; level: number }>
  blockedReasons?: string[]
  unlocks: ResearchUnlock[]
}

export interface ResearchState {
  projects: Record<string, ResearchProject>
  activeProjectIds: string[]
  queuedProjectIds: string[]
  completedProjectIds: string[]
  availableProjectIds: string[]
  blockedProjectIds: string[]
  researchSlots: number
  researchSpeedMultiplier: number
  researchDataPool: number
  researchMaterialsPool: number
}

export type AgentAttritionStatus = 'active' | 'at_risk' | 'temporarily_unavailable' | 'lost'
export type AgentAttritionCategory =
  | 'injury_exit'
  | 'burnout'
  | 'temporary_leave'
  | 'disciplinary'
  | 'unknown'

export interface AgentAttritionState {
  attritionStatus: AgentAttritionStatus
  attritionCategory?: AgentAttritionCategory
  attritionSinceWeek?: number
  returnEligibleWeek?: number
  lossReasonCodes: string[]
  replacementPriority: number
  retentionPressure: number
}

export interface ReplacementPressureState {
  replacementPressure: number
  staffingGap: number
  activeLossCount: number
  criticalRoleLossCount: number
  replacementBacklog?: unknown[]
  temporaryUnavailableCount?: number
  activeUnavailableCount?: number
  constrained?: boolean
  severeConstraint?: boolean
  deploymentTriagePenalty?: number
  deploymentSetupDelayWeeks?: number
  recoveryThroughputPenalty?: number
  teamRecoveryPressurePenalty?: number
  recruitmentPriorityBand?: 'stable' | 'elevated' | 'critical'
  reasonCodes?: string[]
}

export interface SupportStaffSummary {
  admin: number
  logistics: number
  medical: number
  intel: number
  total: number
  pressure: number
}

export type MajorIncidentStrategy =
  | 'aggressive'
  | 'balanced'
  | 'cautious'
  | 'rapid_response'
  | 'containment_first'
  | 'risk_accepting'
export type MajorIncidentProvisionType = string
export type RecruitmentFunnelStage = import('./recruitment/types').RecruitmentFunnelStage
export type CertificationState = import('./agent/models').CertificationState

export interface MajorIncidentRewardItem {
  itemId: string
  label: string
  quantity: number
}

export interface ActiveMajorIncidentRuntime {
  incidentId?: string
  archetypeId?: string
  name?: string
  description?: string
  strategy: MajorIncidentStrategy
  provisions: MajorIncidentProvisionType[]
  durationWeeks: number
  requiredTeams: number
  difficulty: number
  riskLevel?: ContractRiskLevel
  stage?: number
  rewards?: {
    materials?: ContractMaterialDrop[]
    gear?: MajorIncidentRewardItem[]
    progressionUnlocks?: string[]
    rumors?: Array<{
      description: string
      hiddenLootModifiers?: MajorIncidentRewardItem[]
    }>
  }
  modifiers?: ContractModifier[]
  rumor?: {
    description: string
    hiddenLootModifiers?: MajorIncidentRewardItem[]
  }
  rewardPreview?: unknown
  [key: string]: unknown
}

export interface MissionFatalityRecord {
  agentId: string
  agentName?: string
  damage?: number
  reason?: string
}

// ── SPE-687: Harvested-mind loadouts ─────────────────────────────────────────
// Compact predator-power layer. Hostiles that consume high-value minds gain
// victim-specific capabilities stored as a bounded loadout. Reserve organ slots
// allow swapping the active toolkit. Institution funnels mature and sort victims
// for harvest without direct hunting.

/** Identifies the type of harvested victim that produced a capability set. */
export type HarvestSourceId =
  | 'academic'   // scholar, researcher — grants perception, cognitive reach
  | 'mystic'     // occult practitioner — grants ward manipulation, remote sense
  | 'engineer'   // technical expert — grants structural exploitation, trap bypass
  | 'soldier'    // combat-trained — grants melee and formation awareness bonuses
  | 'administrator' // bureaucratic/institutional — grants social infiltration, cover depth

/** One slot in a hostile's reserve organ store. */
export interface ReserveOrganSlot {
  /** Position index in the reserve array (0-based, max 3). */
  slotIndex: number
  /** The victim type whose organ is stored here. */
  sourceId: HarvestSourceId
  /** Whether this slot currently holds a preserved organ (false = empty/spent). */
  occupied: boolean
}

/** Runtime loadout derived from harvested minds. Attached to a hostile unit. */
export interface HarvestedMindLoadout {
  /** The victim type currently driving the active capability set. Null = no harvest yet. */
  activeSourceId: HarvestSourceId | null
  /** Up to 3 preserved reserve slots for toolkit swapping. */
  reserveSlots: ReserveOrganSlot[]
  /** Resolved capability IDs derived from activeSourceId at creation/swap time. */
  derivedCapabilityIds: string[]
  /** Opaque seed string used to deterministically resolve capabilities. */
  seedKey: string
}

/** Cultivation stages an institution funnel passes through. */
export type InstitutionFunnelStage = 'recruiting' | 'maturing' | 'sorting' | 'harvesting'

/** Tracks the state of a predatory institution that matures victims for harvest. */
export interface InstitutionFunnelState {
  /** Template ID of the institution (e.g. 'academy_front', 'clinic_front'). */
  templateId: string
  /** Current cultivation stage. */
  stage: InstitutionFunnelStage
  /** Number of matured candidates currently in the victim pool. */
  victimPoolSize: number
  /** Opaque seed string for deterministic stage resolution. */
  seedKey: string
}

// ── end SPE-687 types ─────────────────────────────────────────────────────────

export type {
  CaseEscalationTrigger,
  CaseSpawnTrigger,
  OperationEventPayloadMap,
  OperationEventSourceSystem,
  OperationEventType,
  OperationEvent,
} from './events/types'

export interface GameConfig {
  maxActiveCases: number

  /** Maximum number of agents that can be in training simultaneously. Increased by academyTier. */
  trainingSlots: number

  /** Threshold "near miss" window (points). */
  partialMargin: number

  /** Stage multiplier per stage (>0). */
  stageScalar: number

  /** Unlocks higher-pressure configuration options like attrition mode. */
  challengeModeEnabled: boolean

  /** Duration model toggles (defaults unspecified). */
  durationModel: 'capacity' | 'attrition'
  attritionPerWeek: number

  /** Probability curve steepness (defaults unspecified). */
  probabilityK: number

  /** Coordination penalty per extra team in raids (defaults unspecified). */
  raidCoordinationPenaltyPerExtraTeam: number

  /** Calendar length used for derived Year/Week display. */
  weeksPerYear: number

  /** Simple weekly budget model (income + outcome deltas). */
  fundingBasePerWeek: number
  fundingPerResolution: number
  fundingPenaltyPerFail: number
  fundingPenaltyPerUnresolved: number

  /** Containment momentum model (outcomes + decay). */
  containmentWeeklyDecay: number
  containmentDeltaPerResolution: number
  containmentDeltaPerFail: number
  containmentDeltaPerUnresolved: number

  /** Clearance progression thresholds by cumulative score, ascending. */
  clearanceThresholds: number[]
}

/** Canonical agency progression state for new development. */
export interface AgencyState {
  containmentRating: number
  clearanceLevel: number
  funding: number
  /**
   * Canonical support pool: available support staff/capacity for operations this week.
   * Bounded, deterministic, and consumed by operations. Restored by hub/campaign actions.
   */
  supportAvailable?: number
  /**
   * Canonical maintenance specialist pool: available capacity for equipment recovery this week.
   * Each damaged item or recovery job consumes 1 maintenance specialist per week.
   */
  maintenanceSpecialistsAvailable?: number
  protocolSelectionLimit?: number
  activeProtocolIds?: string[]
  /**
   * True if command-coordination friction was active this week (bounded, deterministic, for fallout/penalty).
   */
  coordinationFrictionActive?: boolean
  /**
   * Optional surfaced reason for coordination friction (for report output).
   */
  coordinationFrictionReason?: string
  progressionUnlockIds?: string[]
  fundingState?: FundingState
}

// ── SPE-93: External support reliability and trust state ──────────────────────

/**
 * Class of external support asset. Only 'contractor' is used in the live path for this pass.
 * Other classes are defined here for future bounded expansion without type changes.
 */
export type ExternalSupportAssetClass = 'contractor' | 'informant' | 'auxiliary' | 'defector'

/**
 * Trust band derived from reliability at read time — never stored separately.
 * high ≥ 70 | moderate ≥ 40 | degraded ≥ 15 | failed < 15
 */
export type ExternalAssetTrustBand = 'high' | 'moderate' | 'degraded' | 'failed'

/**
 * An agency-side external support asset with explicit reliability state.
 * NOT deployable as a squad member — support-layer only.
 */
export interface ExternalSupportAsset {
  id: string
  label: string
  assetClass: ExternalSupportAssetClass
  /** 0–100. Drives trust band and downstream outcome modifiers deterministically. */
  reliability: number
  tags: string[]
  /** Optional free-text reason for the last reliability change, for report surfacing. */
  lastDriftReason?: string
}

// ── SPE-109: District time-cadence encounter scheduling ──────────────────────
/**
 * Baseline traffic state for a district at a specific time band.
 * Deterministic, composed from baseline + rare event overlays.
 */
export interface TrafficSnapshot {
  /** Baseline population count (absolute, not percentage). */
  baselinePopulation: number
  /** Witness density modifier (0-1, where 1 is maximum witness presence). */
  witnessModifier: number
  /** Visibility modifier applied to covert operations (0-1, where 0 is invisible). */
  visibilityModifier: number
  /** Whether this time-state confers a covert advantage to hidden actors. */
  covertAdvantage: boolean
  /** Applied event overlays, for audit trail. */
  appliedEvents: string[]
  /** Seed used for deterministic reproducibility. */
  seedKey: string
}

/**
 * Encounter-generation context derived from district identity and time band.
 * Shapes case weighting, escalation modifiers, and authority response.
 */
export interface EncounterContext {
  /** District ID. */
  districtId: string
  /** Time band ID. */
  timeBandId: string
  /** Encounter family tags to bias case selection (e.g., ["cult_activity", "supernatural"]). */
  encounterFamilyTags: string[]
  /** Escalation rule modifiers (e.g., {"stage_delta": 0.5, "pressure_weight": 1.2}). */
  escalationModifiers: Record<string, number>
  /** Authority response profile (e.g., "rapid_response", "slow_reaction", "corruption"). */
  authorityResponseProfile: string
}

/**
 * Public traffic profile for a single time band (Dawn, Morning, Afternoon, Evening, Night).
 */
export interface TimeBandProfile {
  id: string
  label: string
  /** Baseline population state at this time band. */
  baselinePopulation: number
  /** Witness density (0-1). */
  witnessModifier: number
  /** Visibility (0-1, where 0 is darkness). */
  visibilityModifier: number
  /** Whether this time band confers covert advantage. */
  covertAdvantage?: boolean
}

/**
 * District profile: encounters, escalation, authority response, and time-band overrides.
 */
export interface DistrictProfile {
  id: string
  label: string
  /** Case encounter families biased by district (e.g., ["feral_pack", "criminal"]). */
  encounterFamilyTags: string[]
  /** Escalation modifiers specific to this district. */
  escalationModifiers: Record<string, number>
  /** Authority response archetype. */
  authorityResponseProfile: string
  /** Optional time-band overrides (e.g., Night in Outskirts = lowered witness). */
  timeBandOverrides?: Record<string, Partial<TimeBandProfile>>
}

/**
 * Rare event overlay applied on top of baseline traffic.
 */
export interface RareEventOverlay {
  id: string
  label: string
  /** Districts this event affects. */
  appliesTo: string[]
  /** Week range this event is active. */
  startWeek: number
  endWeek: number
  /** Traffic modifiers (additive or override). */
  trafficModifier: { populationDelta?: number; witnessModifier?: number; visibilityModifier?: number }
  /** Encounter family bias (combines with district baseline). */
  encounterFamilyBias?: string[]
  /** Seed key for deterministic application. */
  seedKey: string
}

/**
 * Complete district-time schedule for a settlement.
 * Optional in GameState; when present, drives encounter generation.
 */
export interface DistrictScheduleState {
  /** Settlement ID (typically "haven" for MVP). */
  settlementId: string
  /** District definitions. */
  districts: Record<string, DistrictProfile>
  /** Time band definitions. */
  timeBands: Record<string, TimeBandProfile>
  /** Active rare events. */
  events: RareEventOverlay[]
}
// ── end SPE-109 types ────────────────────────────────────────────────────────

export interface GameState {
  /** Canonical legitimacy/access state for bounded gating (SPE-53 legitimacy pass) */
  legitimacy?: LegitimacyState
  week: number
  rngSeed: number
  rngState: number

  gameOver: boolean
  gameOverReason?: string

  directiveState: WeeklyDirectiveState

  agents: Record<Id, Agent>
  staff: Record<Id, StaffData>
  candidates: Candidate[]
  /** Compatibility alias for the weekly recruitment pipeline. Mirrors `candidates`. */
  recruitmentPool?: Candidate[]
  teams: Record<Id, Team>
  cases: Record<Id, CaseInstance>

  templates: Record<string, CaseTemplate>
  reports: WeeklyReport[]
  events: OperationEvent[]
  /** District time-cadence schedule (SPE-109). When present, drives encounter generation. */
  districtScheduleState?: DistrictScheduleState
  /** Agency-side external support assets with reliability/trust state (SPE-93). */
  externalSupportAssets?: Record<string, ExternalSupportAsset>
  /** Historical snapshots of relationship values for trend analysis and chemistry prediction. */
  relationshipHistory?: RelationshipSnapshot[]
  inventory: Record<string, number>
  caseQueue?: CaseQueueState
  trainingQueue: TrainingQueueEntry[]
  productionQueue: ProductionQueueEntry[]
  market: MarketState
  globalPressure?: number
  globalEscalationLevel?: number
  globalThreatDrift?: number
  globalTimePressure?: number
  supportStaff?: SupportStaffSummary
  runtimeState?: RuntimeState
  researchState?: ResearchState
  facilityState?: FacilityState
  missionRouting?: MissionRoutingState
  contracts?: ContractSystemState
  replacementPressureState?: ReplacementPressureState
  responseGrid?: {
    majorIncidentThreshold: number
    majorIncidentTemplateIds: string[]
    pressureDecayPerWeek?: number
  }
  partyCards?: PartyCardState
  config: GameConfig

  /** Canonical progression shape (preferred over legacy top-level fields). */
  agency?: AgencyState

  // Compatibility: top-level pointer for coordination friction (mirrors agency.coordinationFrictionActive)
  coordinationFrictionActive?: boolean
  coordinationFrictionReason?: string

  /**
   * Transitional compatibility fields.
   * TODO: Remove after all consumers and persistence paths are migrated to `agency`.
   */
  containmentRating: number
  clearanceLevel: number
  funding: number

  /** Current academy upgrade tier (0–3). Each tier unlocks +1 training slot and tier 2+ grants +1 stat on completion. */
  supportAvailable?: number
  academyTier?: number

  /** Canonical persistent knowledge-state map (keyed by entity/subject) */
  knowledge: KnowledgeStateMap

  /** Optional active compromised-authority runtime packet (SPE-746). */
  compromisedAuthority?: CompromisedAuthorityState

  // Added for sim/advanceWeek compatibility
  factions?: Record<string, FactionRuntimeState>
  hubState?: unknown
  prevHubState?: unknown
}

// ---------------------------------------------------------------------------
// SPE-809: Cross-institution prisoner trafficking pipeline
// ---------------------------------------------------------------------------

/** The named stages a subject passes through in a custody pipeline. */
export type CustodyStageKind =
  | 'intake'
  | 'holding'
  | 'transfer_en_route'
  | 'handoff'
  | 'delivered'
  | 'released_hostile'

/** Custody-specific distortion tags attached to a single stage record. */
export type CustodyDistortionContext =
  | 'custody_record_scrubbed'
  | 'forged_transfer_credentials'
  | 'vanished_file'

/** One stage in the chain, with which institution owns it and any record-tampering context. */
export interface CustodyStageRecord {
  kind: CustodyStageKind
  institutionId: string
  /** Distortion contexts applied to this stage's records. */
  distortionContext?: CustodyDistortionContext[]
  /** True when a suppress_record marker has fired at this stage. */
  suppressed?: boolean
}

/**
 * A hidden routing instruction embedded in the pipeline.
 * Fires at a specific transition point and silently changes how the subject is processed.
 */
export interface CustodyMarker {
  triggeredAt: 'handoff' | 'processing'
  /**
   * Effect applied when this marker fires.
   * 'compromised_authority_release' (SPE-746): combines suppress_record + accelerate_transfer
   * via the compromised-authority pipeline; bypasses normal review stages.
   */
  effect: 'reroute' | 'suppress_record' | 'accelerate_transfer' | 'compromised_authority_release'
  /** For reroute: overrides the next institutionId. */
  targetInstitutionId: string
}

/** How the subject entered the custody pipeline. */
export type CustodyEntryMode = 'standard' | 'deliberate_arrest' | 'frame_up'

/**
 * A chained custody pipeline spanning one or more institutions.
 * Pure data packet — no mutations; advance via advanceCustodyStage().
 */
export interface CustodyChain {
  id: string
  /** Ordered institution IDs for the declared routing path. */
  institutionIds: string[]
  stages: CustodyStageRecord[]
  currentStageIndex: number
  hiddenMarkers: CustodyMarker[]
  entryMode: CustodyEntryMode
  /** Set when the chain terminal is reached via hostile handoff or sale. */
  resolvedHostile?: boolean
}

/** The type of corruption evidence surfaced by an investigation. */
export type CustodyDiscoveryEventType =
  | 'missing_record'
  | 'marker_revealed'
  | 'compromised_actor_identified'

/** A single discovery produced by resolveCorruptionDiscovery(). */
export interface CustodyDiscoveryEvent {
  type: CustodyDiscoveryEventType
  stageIndex: number
  institutionId: string
}

// ---------------------------------------------------------------------------
// SPE-815: Weird-room state and local rule overrides
// ---------------------------------------------------------------------------

/** Operational category of weirdness a room exhibits once entered. */
export type WeirdRoomStateKind =
  | 'false_environment_shell'  // room presents false visual/spatial profile
  | 'shifted_affordances'      // interaction grammar altered: exits, items, doors resolve differently
  | 'passive_influence'        // actors affected continuously without discrete trigger events
  | 'stateful_hazard_room'     // room has internal state that escalates through dwell/disturbance

/** Which dimension of local operation a rule override modifies. */
export type LocalRuleOverrideDomain = 'traversal' | 'perception' | 'interaction' | 'timing'

/** A single local rule that applies while a room packet is active. */
export interface LocalRuleOverride {
  domain: LocalRuleOverrideDomain
  /** spatialFlag removed while this override is active. */
  suppressedFlag?: string
  /** spatialFlag injected while this override is active. */
  addedFlag?: string
  /** Signed concealment modifier applied during resolution checks in this room. */
  deltaConcealment?: number
  /** Traversal: prevents exit from the room unless an external condition clears it. */
  blocksExit?: boolean
}

/** What event class advances an escalation counter for a room. */
export type RoomEscalationActivator = 'dwell' | 'disturbance' | 'staged_interaction'

/**
 * A threshold at which a room's local state escalates.
 * Thresholds are per-activator and evaluated independently.
 */
export interface RoomEscalationTrigger {
  activator: RoomEscalationActivator
  /** Events required to fire (dwell: turns; disturbance: event count; staged_interaction: count). */
  threshold: number
  /** WeirdRoomStateKind the room transitions to when this trigger fires. */
  resultKind: WeirdRoomStateKind
  /** Overrides merged into active overrides when this trigger fires. Existing overrides are preserved. */
  addedOverrides: LocalRuleOverride[]
}

/**
 * Authoring-time profile describing what kind of weird room a topology can contain.
 * Instantiated into a WeirdRoomPacket at site generation time.
 */
export interface WeirdRoomProfile {
  id: string
  kind: WeirdRoomStateKind
  overrides: LocalRuleOverride[]
  escalationTriggers: RoomEscalationTrigger[]
  /** Whether the room's true state is hidden from operatives when first entered. */
  hiddenFromSurface: boolean
}

/**
 * Runtime state packet for a single weird-room instance attached to a CaseInstance.
 * All transitions happen through pure sim functions — never mutated directly.
 */
export interface WeirdRoomPacket {
  id: string
  kind: WeirdRoomStateKind
  /** Currently active local overrides. May grow through escalation. */
  overrides: LocalRuleOverride[]
  escalationTriggers: RoomEscalationTrigger[]
  /** True when the room's true state has not yet been revealed to operatives. */
  hiddenFromSurface: boolean
  /** Turns operatives have dwelt in this room during the current engagement. */
  dwellCount: number
  /** Disturbance events that have fired in this room. */
  disturbanceCount: number
  /** Staged interactions completed in this room. */
  stagedInteractionCount: number
  /** Week-turn when the room's true state became known. Undefined until revealed. */
  revealedAt?: number
}

// ---------------------------------------------------------------------------
// SPE-746: Corrupt authority and compromised security response
// ---------------------------------------------------------------------------

/** The institutional role whose holder is secretly compromised. */
export type CompromisedOfficialRole =
  | 'sheriff'
  | 'magistrate'
  | 'watchCommander'
  | 'inquisitor'

/** Response categories a compromised official can distort. */
export type CompromisedResponseCategory =
  | 'patrol'
  | 'interrogation'
  | 'custody'
  | 'evidence'

/** How deeply the official is embedded in the hostile network. */
export type CorruptionDepth = 'shallow_cover' | 'embedded_control'

/**
 * State packet for a single compromised authority surface.
 * Attaches to a zone, location, or CaseInstance in the campaign layer.
 */
export interface CompromisedAuthorityState {
  /** Which office the compromised holder fills. */
  officialRole: CompromisedOfficialRole
  /** Faction that benefits from the distortion (matches an existing faction anchor key). */
  benefittingFactionId: string
  /** Which response categories are currently being distorted. */
  distortedCategories: CompromisedResponseCategory[]
  /** Depth of compromise — shallow_cover means plausible deniability still holds. */
  corruptionDepth: CorruptionDepth
  /**
   * Cumulative patrol anomaly count. Incremented each time a patrol-distortion-weighted
   * spawn passes through this authority surface. When it reaches EXPOSURE_THRESHOLD the
   * exposure path fires.
   */
  patrolAnomalyCount: number
  /**
   * True when a recovered document with an authority_link flag has been confirmed.
   * Acts as an alternate exposure trigger.
   * [TEMPORARY STUB — full evidence model owned by SPE-867]
   */
  authorityLinkEvidenceFound?: boolean
}

/** How evidence is handled when a compromised authority controls the evidence category. */
export type EvidenceRoutingMode = 'suppress' | 'misroute' | 'forward_to_faction'

/**
 * The resolved set of overrides a compromised authority applies to a security event.
 * Pure data packet — callers decide which overrides to apply.
 */
export interface CompromisedResponseOverride {
  /** Signed delta applied to anti-faction intel template weights (<0 = deprioritise). */
  patrolWeightDelta: number
  /** Signed delta applied to investigator-harassment template weights (>0 = prioritise). */
  harassmentWeightDelta: number
  /** When true, interrogation should be redirected away from faction-linked targets. */
  redirectInterrogation: boolean
  /** Custody marker to inject when 'custody' is in distortedCategories. */
  custodyMarker?: Pick<CustodyMarker, 'effect' | 'triggeredAt' | 'targetInstitutionId'>
  /** Evidence routing mode when 'evidence' is in distortedCategories. */
  evidenceRoutingMode?: EvidenceRoutingMode
}
