// --- Operative Attrition, Loss, & Replacement Pressure System ---

export type AttritionCategory =
  | 'burnout'
  | 'injury_exit'
  | 'fatality'
  | 'long_term_unavailable'
  | 'resignation'
  | 'temporary_leave'

export type AttritionStatus =
  | 'active'
  | 'at_risk'
  | 'temporarily_unavailable'
  | 'lost'

export interface AgentAttritionState {
  attritionStatus: AttritionStatus
  attritionCategory?: AttritionCategory
  attritionSinceWeek?: number
  returnEligibleWeek?: number
  lossReasonCodes: string[]
  replacementPriority: number
  retentionPressure: number
}

export interface ReplacementBacklogEntry {
  agentId: string
  role: string
  requestedWeek: number
  status: 'open' | 'filled' | 'cancelled'
  requestedBy: string
}

export interface ReplacementPressureState {
  replacementPressure: number
  staffingGap: number
  activeLossCount: number
  criticalRoleLossCount: number
  replacementBacklog: ReplacementBacklogEntry[]
}
// --- Funding, Procurement, & Budget Pressure System ---

export type FundingCategory =
  | 'base_funding'
  | 'mission_reward'
  | 'contract_income'
  | 'failure_penalty'
  | 'unresolved_penalty'
  | 'grant'
  | 'market_transaction'

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
  fundingHistory: FundingHistoryRecord[]
  procurementBacklog: ProcurementBacklogEntry[]
}

// FundingState should be added to GameState and/or AgencyState as canonical.
// --- Research System ---

export type ResearchCategory = 'anomaly' | 'equipment' | 'medical' | 'field_ops'

export type ResearchProjectStatus =
  | 'locked'
  | 'available'
  | 'queued'
  | 'active'
  | 'completed'
  | 'blocked'

export interface ResearchProject {
  projectId: string
  category: ResearchCategory
  status: ResearchProjectStatus
  costTime: number
  costMaterials: number
  costData: number
  progressTime: number
  progressMaterials?: number
  progressData?: number
  requiredResearchIds?: string[]
  requiredFacilityLevels?: { facilityId: string; level: number }[]
  unlocks: ResearchUnlock[]
  startedWeek?: number
  completedWeek?: number
  blockedReasons?: string[]
  lastUpdatedWeek?: number
}

export type ResearchUnlockCategory =
  | 'gear'
  | 'equipment_tier'
  | 'intel_tool'
  | 'mission_modifier'
  | 'mission_type'
  | 'training_branch'
  | 'facility_tier'
  | 'passive_rule'
  | 'support_module'

export interface ResearchUnlock {
  id: string
  category: ResearchUnlockCategory
  label: string
  description?: string
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
// --- Facility Progression System ---

export type FacilityCategory =
  | 'research_lab'
  | 'fabrication_lab'
  | 'medical_wing'
  | 'command_center'
  | 'intel_center'

export type FacilityStatus = 'locked' | 'available' | 'upgrading' | 'active'

export interface FacilityEffect {
  researchSpeedMultiplier?: number
  researchSlots?: number
  fabricationYield?: number
  fabricationTier?: number
  recoveryThroughput?: number
  injuryPenaltyReduction?: number
  teamCapacity?: number
  coordinationBonus?: number
  reconReliability?: number
  intelCertainty?: number
  deploymentPrepEfficiency?: number
  trainingThroughput?: number
}

export interface FacilityUpgradeRequirement {
  requiredResearchIds?: string[]
  requiredFacilityLevels?: { facilityId: string; level: number }[]
}

export interface FacilityUpgradeMetadata {
  costMoney: number
  costMaterials: number
  buildWeeks: number
  requirements?: FacilityUpgradeRequirement
  effectDeltas: FacilityEffect
}

export interface FacilityInstance {
  facilityId: string
  category: FacilityCategory
  level: number
  maxLevel?: number
  status: FacilityStatus
  upgradeInProgress?: boolean
  upgradeStartedWeek?: number
  upgradeCompleteWeek?: number
  effects: FacilityEffect
  requirements?: FacilityUpgradeRequirement
  lastUpdatedWeek?: number
  // For deterministic upgrades: effect deltas to apply on completion
  pendingEffectDeltas?: FacilityEffect
}

export interface FacilityState {
  facilities: Record<string, FacilityInstance>
  // Optionally, a log of upgrades or changes for debug/overlay
  upgradeLog?: Array<{
    facilityId: string
    fromLevel: number
    toLevel: number
    startedWeek: number
    completedWeek?: number
    status: FacilityStatus
    reason?: string
  }>
}
// cspell:words lockdown queueable scoutable
// src/domain/models.ts
import type { OperationEvent } from './events/types'
import type { PartyCardState } from './partyCards/models'
import type {
  Agent,
  AgentRole,
  AgentPowerImpact,
  AgentPerformanceOutput,
  FatigueBand,
  MarketPressure,
  PerformanceMetricSummary,
  ProtocolGlobalModifiers,
  ProtocolScope,
  ProtocolTier,
  ProtocolType,
  TrainingCategory,
} from './agent/models'

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
  AgentCertificationRecord,
    AgentTrainingProfile,
  AgentTrait,
  AgentTraitModifierKey,
  AgentVitals,
  CertificationState,
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
    TrainingCategory,
    TrainingHistoryEntry,
    TrainingStatus,
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
  AgentCandidateRole,
  CandidateCostEstimate,
  CandidateLegacyStats,
  CandidatePipelineStatus,
  CandidatePotentialTier,
  CandidateRevealLevel,
  RecruitmentFunnelStage,
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
export type StatBlock = Record<StatKey, number>
export type WeightBlock = Record<StatKey, number>
export const BASE_STAT_MAX = 100

export type CaseMode = 'threshold' | 'probability' | 'deterministic'
export type CaseKind = 'case' | 'raid'
export type CaseStatus = 'open' | 'in_progress' | 'resolved'
export type MajorIncidentStrategy = 'aggressive' | 'balanced' | 'cautious'
export type MajorIncidentProvisionType =
  | 'medical_supplies'
  | 'tactical_enhancers'
  | 'extraction_tools'
  | 'optimization_kits'

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
  | 'training-blocked'
  | 'missing-required-roles'
  | 'missing-required-tags'
  | 'invalid-team'
  | 'invalid-leader'
  | 'duplicate-membership'
  | 'deploy-conflict'
  | 'stale-member-reference'

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

export type TeamCategory =
  | 'containment_strike_team'
  | 'investigation_cell'
  | 'liaison_stabilization_unit'
  | 'balanced_rapid_response_team'

export type TeamCohesionBand = 'fragile' | 'unstable' | 'steady' | 'strong'

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
  compositionValid: boolean
  validationIssues: ValidationIssue[]
  cohesion: TeamCohesionSummary
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
  assignedCaseId: Id | null
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
  contactId?: string
  contactName?: string
  contactDelta?: number
}

export interface MissionRewardBreakdown {
  outcome: MissionResolutionKind
  caseType: string
  caseTypeLabel: string
  operationValue: number
  factors: readonly MissionRewardFactor[]
  fundingDelta: number
  containmentDelta: number
  strategicValueDelta: number
  reputationDelta: number
  inventoryRewards: readonly MissionRewardInventoryGrant[]
  factionStanding: readonly MissionRewardFactionStanding[]
  factionGrants?: readonly {
    factionId: string
    contactId?: string
    kind: 'funding' | 'inventory' | 'favor'
    rewardId?: string
    label: string
    amount?: number
    itemId?: string
    quantity?: number
  }[]
  factionUnlocks?: readonly {
    factionId: string
    contactId?: string
    kind: 'recruit'
    label: string
    summary?: string
    disposition?: 'supportive' | 'adversarial'
  }[]
  researchUnlocks?: readonly ContractResearchUnlock[]
  progressionUnlocks?: readonly string[]
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

export interface MissionFatalityRecord {
  agentId: Id
  agentName: string
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

export interface MissionResult {
  caseId: Id
  caseTitle: string
  teamsUsed: readonly MissionTeamUsage[]
  outcome: MissionResolutionKind
  performanceSummary: PerformanceMetricSummary
  powerImpact?: PowerImpactSummary
  rewards: MissionRewardBreakdown
  penalties: MissionPenaltyBreakdown
  fatigueChanges: readonly MissionFatigueChange[]
  injuries: readonly MissionInjuryRecord[]
  fatalities?: readonly MissionFatalityRecord[]
  spawnedConsequences: readonly MissionSpawnedConsequence[]
  explanationNotes: readonly string[]
  /** Canonical weakest-link mission resolution output, if used. */
  weakestLink?: import('./weakestLinkResolution').WeakestLinkMissionResolutionResult
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
  category?: TeamCategory
  reserveMemberIds?: Id[]
  compositionState?: TeamCompositionState
  deploymentReadinessState?: TeamDeploymentReadinessState
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

  /** Aggregate recovery pressure for team overlays and stability. */
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
  /** Stage increase applied to the parent case. */
  stageDelta: number

  /** Reset/override the deadline after escalation (optional). */
  deadlineResetWeeks?: number

  /** Child-case spawn count range. */
  spawnCount: { min: number; max: number }

  /** Template IDs to spawn from. */
  spawnTemplateIds: string[]

  /** Optional: convert parent case to raid at/above stage threshold. */
  convertToRaidAtStage?: number
}

export interface CaseTemplate {
  templateId: string
  title: string
  description: string
  factionId?: string
  contactId?: string

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

  /** Deterministic gate: hard requirements (e.g., "medium", "occultist"). */
  requiredTags?: string[]

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
  id: Id
  templateId: string

  title: string
  description: string
  factionId?: string
  contactId?: string
  contract?: ActiveContractRuntime
  majorIncident?: ActiveMajorIncidentRuntime

  mode: CaseMode
  kind: CaseKind
  status: CaseStatus

  difficulty: StatBlock
  weights: WeightBlock

  tags: string[]
  requiredTags: string[]
  requiredRoles?: TeamCoverageRole[]
  preferredTags: string[]

  /** Escalates with failure/unresolved; increases difficulty/spread. */
  stage: number

  durationWeeks: number
  weeksRemaining?: number

  deadlineWeeks: number
  deadlineRemaining: number

  /** For normal cases: 0..1 teams; for raids: 0..N teams. */
  assignedTeamIds: Id[]

  /** Deterministic field intel quality used by weakest-link resolution and stale intel decay. */
  intelConfidence: number
  intelUncertainty: number
  intelLastUpdatedWeek: number

  onFail: SpawnRule
  onUnresolved: SpawnRule

  /** Optional explicit pressure contribution used by pressure pipeline and intel surfaces. */
  pressureValue?: number

  /** Optional explicit region affinity used by pressure pipeline and intel surfaces. */
  regionTag?: string

  raid?: { minTeams: number; maxTeams: number }
  
  /** Canonical escalation state: tracks cumulative escalation events for this case. */
  escalationLevel?: number
  
  /** Canonical threat drift: tracks how much the threat has drifted from baseline (e.g., due to delays, failures). */
  threatDrift?: number
  
  /** Canonical time pressure: tracks time-based pressure for this case. */
  timePressure?: number
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
  rewardBreakdown?: MissionRewardBreakdown
  missionResult?: MissionResult
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
  | 'directive.applied'

export type ReportNoteMetadata = Record<string, string | number | boolean | null>

export interface ReportNote {
  id: string
  content: string
  timestamp: number
  type?: ReportNoteType
  metadata?: ReportNoteMetadata
}

export interface WeeklyReport {
  week: number
  rngStateBefore: number
  rngStateAfter: number

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

export type ReputationTier = 'hostile' | 'unfriendly' | 'neutral' | 'friendly' | 'allied'

export type ContactStatus = 'active' | 'hostile' | 'inactive'

export interface EventRef {
  eventId: string
  type?: string
  week?: number
}

export type FactionModifierEffect =
  | 'reward_multiplier'
  | 'success_bonus'
  | 'funding_flat'
  | 'favor_gain'
  | 'recruit_quality'

export interface FactionModifier {
  id: string
  label: string
  description: string
  effect: FactionModifierEffect
  value: number
  tags?: string[]
}

export type FactionRewardKind = 'funding' | 'gear' | 'favor' | 'recruit'

export interface FactionReward {
  id: string
  label: string
  description: string
  kind: FactionRewardKind
  minTier: ReputationTier
  maxTier?: ReputationTier
  disposition?: 'supportive' | 'adversarial'
  amount?: number
  itemId?: string
  quantity?: number
  contactId?: string
}

export interface FactionLoreEntry {
  id: string
  label: string
  summary: string
  unlockAfterInteractions: number
}

export interface Contact {
  id: string
  factionId: string
  name: string
  role: string
  relationship: number
  status: ContactStatus
  focusTags?: string[]
  rewards?: FactionReward[]
  modifiers?: FactionModifier[]
  history: {
    interactions: EventRef[]
  }
}

export interface Faction {
  id: string
  name: string
  description: string
  reputation: number
  reputationTier: ReputationTier
  modifiers: {
    known: FactionModifier[]
    hidden: FactionModifier[]
  }
  contacts: Contact[]
  lore: {
    entries: FactionLoreEntry[]
    discoveredEntryIds: string[]
  }
  history: {
    missionsCompleted: number
    missionsFailed: number
    interactionLog: EventRef[]
    revealedHiddenModifierIds: string[]
  }
  stateFlags: {
    isHostile: boolean
    isUnlocked: boolean
  }
  availableFavors?: Record<string, number>
}

export interface WeeklyDirectiveHistoryEntry {
  week: number
  directiveId: WeeklyDirectiveId
}

export interface WeeklyDirectiveState {
  selectedId: WeeklyDirectiveId | null
  history: WeeklyDirectiveHistoryEntry[]
}

export type ContractRiskLevel = 'low' | 'medium' | 'high' | 'extreme'

export type ContractStrategyTag = 'income' | 'materials' | 'research' | 'progression'

export type ContractModifierEffect =
  | 'difficulty_flat'
  | 'success_bonus'
  | 'reward_bonus'
  | 'injury_risk'
  | 'death_risk'

export interface ContractModifier {
  id: string
  label: string
  description: string
  effect: ContractModifierEffect
  value: number
}

export interface ContractMaterialDrop {
  itemId: string
  label: string
  quantity: number
}

export interface ContractResearchUnlock {
  id: string
  label: string
  description: string
}

export type ContractUnlockCondition =
  | {
      type: 'completed_contract'
      contractTemplateId: string
      minimumOutcome?: MissionResolutionKind
    }
  | {
      type: 'research_unlocked'
      researchId: string
    }
  | {
      type: 'faction_tier'
      factionId: string
      minimumTier: ReputationTier
    }
  | {
      type: 'progression_unlock'
      unlockId: string
    }

export interface ContractChainDefinition {
  nextContracts?: string[]
  unlockConditions?: ContractUnlockCondition[]
}

export interface ContractRequirements {
  recommendedClasses: AgentRole[]
  discouragedClasses: AgentRole[]
}

export interface ContractRewardPackage {
  funding: number
  materials?: ContractMaterialDrop[]
  research?: ContractResearchUnlock[]
}

export interface MajorIncidentRewardItem {
  itemId: string
  label: string
  quantity: number
}

export interface MajorIncidentRuntimeModifier {
  id: string
  label: string
  detail: string
}

export interface MajorIncidentRumor {
  description: string
  hiddenLootModifiers: MajorIncidentRewardItem[]
}

export interface ActiveMajorIncidentRuntime {
  incidentId: string
  name: string
  description: string
  requiredTeams: number
  difficulty: number
  riskLevel: ContractRiskLevel
  durationWeeks: number
  rewards: {
    materials: ContractMaterialDrop[]
    gear?: MajorIncidentRewardItem[]
    progressionUnlocks?: string[]
  }
  modifiers: MajorIncidentRuntimeModifier[]
  rumor?: MajorIncidentRumor
  strategy: MajorIncidentStrategy
  provisions: MajorIncidentProvisionType[]
}

export interface ContractOffer {
  id: string
  templateId: string
  caseTemplateId: string
  name: string
  description: string
  factionId?: string
  difficulty: number
  caseDifficulty: StatBlock
  riskLevel: ContractRiskLevel
  durationWeeks: number
  rewards: ContractRewardPackage
  lootTableId?: string
  requirements: ContractRequirements
  modifiers: ContractModifier[]
  chain: ContractChainDefinition
  strategyTag: ContractStrategyTag
  generatedWeek: number
}

export interface ContractHistoryRecord {
  completions: number
  bestOutcome: MissionResolutionKind | 'none'
  lastOutcome?: MissionResolutionKind
  lastCompletedWeek?: number
}

export interface ContractSystemState {
  generatedWeek: number
  offers: ContractOffer[]
  history: Record<string, ContractHistoryRecord>
  unlockedResearchIds: string[]
}

export interface ActiveContractRuntime {
  offerId: string
  templateId: string
  name: string
  strategyTag: ContractStrategyTag
  riskLevel: ContractRiskLevel
  caseDifficulty: StatBlock
  rewards: ContractRewardPackage
  lootTableId?: string
  requirements: ContractRequirements
  modifiers: ContractModifier[]
  chain: ContractChainDefinition
}

export interface TrainingProgram {
  trainingId: string
  name: string
  description: string
  category?: TrainingCategory
  scope?: 'agent' | 'team'
  /** Minimum academy tier required before the program becomes queueable. */
  minAcademyTier?: number
  /** Completed research project ids or unlock ids required before the program becomes queueable. */
  requiredResearchIds?: string[]
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
  /** Optional certification milestones this training contributes toward. */
  certificationIds?: string[]
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
}

export type CasePriority = 'critical' | 'high' | 'normal' | 'low'

export interface CaseQueueState {
  queuedCaseIds: Id[]
  priorities: Record<Id, CasePriority>
}

export type MissionCategory =
  | 'containment_breach'
  | 'investigation_lead'
  | 'civilian_infrastructure_incident'
  | 'faction_hostile_activity'
  | 'strategic_opportunity'

export type MissionIntakeSource =
  | 'scripted'
  | 'escalation'
  | 'pressure'
  | 'faction'
  | 'contract'
  | 'tutorial'

export type MissionPriorityBand = 'critical' | 'high' | 'normal' | 'low'

export type MissionRoutingStateKind = 'queued' | 'shortlisted' | 'assigned' | 'deferred' | 'blocked'

export type MissionRoutingBlockerCode =
  | 'missing-coverage'
  | 'training-blocked'
  | 'invalid-loadout-gate'
  | 'missing-certification'
  | 'fatigue-over-threshold'
  | 'no-eligible-teams'
  | 'capacity-locked'
  | 'team-state-incompatible'
  | 'routing-state-blocked'
  | 'recovery-required'

export type DeploymentReadinessCategory =
  | 'mission_ready'
  | 'conditional'
  | 'temporarily_blocked'
  | 'hard_blocked'
  | 'recovery_required'

export type AgentAvailabilityState =
  | 'idle'
  | 'assigned'
  | 'training'
  | 'recovering'
  | 'unavailable'

export type DeploymentHardBlockerCode =
  | 'missing-coverage'
  | 'training-blocked'
  | 'invalid-loadout-gate'
  | 'missing-certification'
  | 'team-state-incompatible'
  | 'routing-state-blocked'
  | 'capacity-locked'
  | 'recovery-required'

export type DeploymentSoftRiskCode =
  | 'low-cohesion-band'
  | 'high-fatigue-burden'
  | 'weakest-link-risk'
  | 'strategic-mismatch'
  | 'budget-pressure'
  | 'attrition-pressure'
  | 'intel-uncertainty'

export interface AgentDeploymentReadinessSnapshot {
  agentId: Id
  deployable: boolean
  availabilityState: AgentAvailabilityState
  fatigue: number
  loadoutReadiness: 'ready' | 'partial' | 'blocked'
  certificationReadiness: 'ready' | 'blocked'
  trainingLockReason?: string
}

export interface TeamCoverageCompleteness {
  required: TeamCoverageRole[]
  covered: TeamCoverageRole[]
  missing: TeamCoverageRole[]
}

export interface MissionTimeCostSummary {
  missionId: Id
  plannedStartWeek: number
  expectedTravelWeeks: number
  expectedSetupWeeks: number
  expectedResolutionWeeks: number
  expectedRecoveryWeeks: number
  expectedTotalWeeks: number
  timeCostReasonCodes: string[]
}

export interface DeploymentEligibilityResult {
  eligible: boolean
  hardBlockers: DeploymentHardBlockerCode[]
  softRisks: DeploymentSoftRiskCode[]
  intelPenalty?: number
  timeCostSummary: MissionTimeCostSummary
  weakestLinkContributors: string[]
  explanationNotes: string[]
}

export interface TeamDeploymentReadinessState {
  teamId: Id
  readinessCategory: DeploymentReadinessCategory
  readinessScore: number
  hardBlockers: DeploymentHardBlockerCode[]
  softRisks: DeploymentSoftRiskCode[]
  intelPenalty?: number
  coverageCompleteness: TeamCoverageCompleteness
  cohesionBand: TeamCohesionBand
  minimumMemberReadiness: number
  averageFatigue: number
  estimatedDeployWeeks: number
  estimatedRecoveryWeeks: number
  computedWeek: number
}

export interface MissionRejectedTeamRecord {
  teamId: Id
  reasonCode: MissionRoutingBlockerCode
}

export interface MissionRoutingRecord {
  missionId: Id
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
  requiredRoles: TeamCoverageRole[]
  requiredTags: string[]
  preferredTags: string[]
  assignedTeamIds: Id[]
  intakeSource: MissionIntakeSource
  priority: MissionPriorityBand
  priorityReasonCodes: string[]
  triageScore: number
  routingState: MissionRoutingStateKind
  routingBlockers: MissionRoutingBlockerCode[]
  timeCostSummary?: MissionTimeCostSummary
  lastTriageWeek?: number
  lastRoutedWeek?: number
  lastCandidateTeamIds: Id[]
  lastRejectedTeamIds: MissionRejectedTeamRecord[]
}

export interface MissionRoutingState {
  orderedMissionIds: Id[]
  missions: Record<Id, MissionRoutingRecord>
  nextGeneratedSequence: number
}

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
  funding: number // legacy, migrate to fundingState.funding
  fundingState?: FundingState
  protocolSelectionLimit?: number
  activeProtocolIds?: string[]
  progressionUnlockIds?: string[]
  /** Canonical support staff/capacity summary for agency operations. */
  supportStaff?: SupportStaffSummary
}

/**
 * Stable scalar payload for authored condition flags.
 * Boolean values should be preferred for simple gating; strings/numbers are
 * reserved for deterministic stage/state labels and exact-match routing.
 */
export type GameFlagValue = string | number | boolean

/**
 * Narrative-facing identity layer for the player/controller.
 * Extension point: add authored biography, portrait ids, or faction alignment later
 * without disturbing the rest of the simulation model.
 */
export interface PlayerProfileState {
  id?: string
  displayName: string
  callsign?: string
  organization?: string
  pronouns?: string
  notes?: string
}

/**
 * Current hub/scene position used by authored scene systems.
 * This stays intentionally lightweight so future save/load can persist it as-is.
 */
export interface GameLocationState {
  hubId: string
  locationId?: string
  sceneId?: string
  updatedWeek: number
}

/**
 * One-way scene traversal history.
 * Store references/counters here, not full narrative payloads.
 */
export interface SceneHistoryEntry {
  sceneId: string
  locationId: string
  week: number
  outcome?: string
  tags?: string[]
}

export interface OneShotEventState {
  eventId: string
  seen: boolean
  /** First successful consumption week. Repeated checks must not rewrite this. */
  firstSeenWeek: number
  /** Optional authored/source label for reports, routing, or debugging. */
  source?: string
}

export type EncounterRuntimeStatus = 'hidden' | 'available' | 'active' | 'resolved' | 'archived'

export type EncounterResolutionOutcome = 'success' | 'partial' | 'failure'

/**
 * Runtime metadata layered onto cases/encounters.
 * Extension point: hidden scene triggers, authored phase ids, or intel discoveries.
 */
export interface EncounterRuntimeState {
  encounterId: string
  status: EncounterRuntimeStatus
  phase?: string
  startedWeek?: number
  resolvedWeek?: number
  latestOutcome?: EncounterResolutionOutcome
  lastResolutionId?: string
  followUpIds?: string[]
  hiddenModifierIds: string[]
  revealedModifierIds: string[]
  flags: Record<string, boolean>
  lastUpdatedWeek: number
}

/**
 * Generic segmented progress clock for story, projects, or hidden progress.
 * `value` is clamped against `max` by the state manager helpers.
 */
export interface ProgressClockState {
  id: string
  label: string
  value: number
  max: number
  hidden?: boolean
  completedAtWeek?: number
}

export type RuntimeEventQueuePayloadValue = string | number | boolean | string[]

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
  /**
   * Development-only runtime trace for authored/meta-state changes.
   * This is intentionally compact and bounded so it can travel with saves
   * and power the overlay without becoming a second event engine.
   */
  debug: {
    enabled: boolean
    flags: Record<string, boolean>
    eventLog?: DeveloperLogEvent[]
    nextEventSequence?: number
  }
}

export type DeveloperLogDetailValue = string | number | boolean | string[]

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

export interface DeveloperLogEvent {
  id: string
  week: number
  type: DeveloperLogEventType
  summary: string
  contextId?: string
  details?: Record<string, DeveloperLogDetailValue>
}

/**
 * Canonical cross-cutting runtime slice for authored scenes, hub progression,
 * and debug affordances. Operational systems can keep their domain-specific data
 * where it already lives, but they should report shared narrative/meta state here
 * through the state-manager helpers.
 */
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

export interface GameState {
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
  factions?: Record<string, Faction>
  contracts?: ContractSystemState

  templates: Record<string, CaseTemplate>
  reports: WeeklyReport[]
  events: OperationEvent[]
  /** Historical snapshots of relationship values for trend analysis and chemistry prediction. */
  relationshipHistory?: RelationshipSnapshot[]
  inventory: Record<string, number>
  caseQueue?: CaseQueueState
  missionRouting?: MissionRoutingState
  trainingQueue: TrainingQueueEntry[]
  productionQueue: ProductionQueueEntry[]
  market: MarketState
  globalPressure?: number
  responseGrid?: {
    majorIncidentThreshold: number
    majorIncidentTemplateIds: string[]
    pressureDecayPerWeek?: number
  }
  partyCards?: PartyCardState
  config: GameConfig
  /**
   * Canonical narrative/meta state slice managed through `gameStateManager.ts`.
   * Save/load can later serialize this whole object without needing a bespoke migration path.
   */
  runtimeState?: RuntimeState

  /** Canonical progression shape (preferred over legacy top-level fields). */
  agency?: AgencyState

  /** Canonical support staff/capacity summary for agency operations. */
  supportStaff?: SupportStaffSummary

  /** Canonical replacement-pressure and staffing-gap state. */
  replacementPressureState?: ReplacementPressureState

  /**
   * Transitional compatibility fields.
   * TODO: Remove after all consumers and persistence paths are migrated to `agency`.
   */
  containmentRating: number
  clearanceLevel: number
  funding: number

  /** Current academy upgrade tier (0–3). Each tier unlocks +1 training slot and tier 2+ grants +1 stat on completion. */
  academyTier?: number

  /** Canonical facility/base progression state. */
  facilityState?: FacilityState

  /** Canonical research system state (Occult + Technical). */
  researchState?: ResearchState
  
  /** Canonical global escalation state: tracks cumulative escalation events across all cases. */
  globalEscalationLevel?: number
  
  /** Canonical global threat drift: tracks overall threat drift across the organization. */
  globalThreatDrift?: number
  
  /** Canonical global time pressure: tracks aggregate time-based pressure. */
  globalTimePressure?: number
}
