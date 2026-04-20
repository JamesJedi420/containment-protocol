// Emergency governance state for bounded, deterministic crisis rule changes
export interface EmergencyGovernanceState {
  active: boolean;
  triggeredBy: string; // e.g. 'pressure.critical'
  effects: {
    maxActiveCasesDelta: number;
    fundingBasePerWeekDelta: number;
  };
  activatedWeek: number;
  expiresWeek: number;
}

// SPE-64: Explicit cross-scale handoff contracts

/**
 * Explicit contract for campaign → incident/operation handoff.
 * Contains only the bounded, deterministic state needed for incident resolution.
 */
export interface CampaignToIncidentPacket {
  campaignId: string;
  week: number;
  caseId: string;
  caseTitle: string;
  teamId: string;
  teamSnapshot: Team; // snapshot of team at handoff
  campaignDirectives: string[]; // e.g., directive tags or ids
  knowledgeState: KnowledgeState;
  // Add other minimal, explicit fields as needed
}

/**
 * Explicit contract for incident/operation → campaign fallout/result handoff.
 * Contains only the bounded, deterministic effects to apply to campaign state.
 */
export interface IncidentToCampaignPacket {
  caseId: string;
  teamId: string;
  outcome: string; // e.g., 'success', 'partial', 'fail', etc.
  rewards: unknown; // Use MissionRewardBreakdown or similar if available
  falloutTags?: string[]; // Optional: tags for modular fallout handling
  performanceSummary?: PerformanceMetricSummary;
  powerImpact?: PowerImpactSummary;
  injuries?: unknown; // Use MissionInjuryRecord[] or similar if available
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
import type { KnowledgeState, KnowledgeStateMap } from './knowledge';
// SPE-59: Export KnowledgeState for projection/report typing
export type { KnowledgeState };

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
  AgentInheritedPowerState,
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
  TerritorialCastingEligibilityState,
  TerritorialConduitState,
  TerritorialExpenditureOutcome,
  TerritorialExpenditureResult,
  TerritorialNodeState,
  TerritorialPowerNodeSnapshot,
  TerritorialPowerReportSnapshot,
  TerritorialPowerState,
  TerritorialPowerSummary,
} from './territorialPower'

export type {
  SupplyBlockedReason,
  SupplyLinkMode,
  SupplyLinkState,
  SupplyLinkStatus,
  SupplyNetworkReportSnapshot,
  SupplyNetworkState,
  SupplyNetworkWeeklySummary,
  SupplyNodeController,
  SupplyNodeState,
  SupplyNodeType,
  SupplySourceState,
  SupplySourceType,
  SupplySupportState,
  SupplyTraceState,
  SupplyTransportAssetState,
  SupplyTransportClass,
  SupplyTransportStatus,
} from './supplyNetwork'

export type {
  CampaignCourtMode,
  CampaignGovernanceReportSnapshot,
  CampaignGovernanceState,
  CampaignGovernanceSummary,
  CampaignPrimacy,
  GovernanceActionRecord,
  GovernanceActionType,
  GovernanceRegionFortificationState,
  GovernanceRegionOccupationState,
  GovernanceRegionState,
  GovernanceRegionWarState,
  GovernanceResourceChannels,
  GovernanceSupplyState,
  GovernanceTurnPhase,
  GovernanceTurnStatus,
} from './campaignGovernance'

export type {
  GovernanceAuthorityClass,
  GovernanceAuthorityState,
  GovernanceClaimBasis,
  GovernanceClaimant,
  GovernanceContractTrigger,
  GovernanceHolderStatus,
  GovernanceInheritedPowerOutcome,
  GovernanceInheritedPowerOutcomeType,
  GovernanceInheritedPowerTier,
  GovernanceParticipant,
  GovernanceParticipantRole,
  GovernanceState,
  GovernanceSuccessionContract,
  GovernanceTransfer,
  GovernanceTransferOutcome,
  GovernanceTransferOutcomeType,
  GovernanceTransferPath,
  GovernanceTransferState,
  GovernanceViolentExtraction,
} from './governanceTransfers'

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
export type StatBlock = Record<StatKey, number>
export type WeightBlock = Record<StatKey, number>
export const BASE_STAT_MAX = 100

export type CaseMode = 'threshold' | 'probability' | 'deterministic'
export type CaseKind = 'case' | 'raid'
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
  | 'training-blocked'
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
  siteLayer?: 'exterior' | 'transition' | 'interior';
  visibilityState?: 'clear' | 'obstructed' | 'exposed';
  transitionType?: 'open-approach' | 'threshold' | 'chokepoint';
  /** Optional: bounded spatial flags for deterministic effects */
  spatialFlags?: string[];
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
}

export interface MissionRewardBreakdown {
  outcome: MissionResolutionKind
  caseType: string

  /** Canonical site-space state for bounded spatial logic (SPE-57) */
  siteLayer?: 'exterior' | 'transition' | 'interior';
  visibilityState?: 'clear' | 'obstructed' | 'exposed';
  transitionType?: 'open-approach' | 'threshold' | 'chokepoint';
  /** Optional: bounded spatial flags for deterministic effects */
  spatialFlags?: string[];
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
  consequences?: import('./shared/outcomes').ConsequenceKey[]
  severeHit?: import('./shared/outcomes').ConsequenceKey[]
  escalationBand?: import('./shared/outcomes').OutcomeBand
  counterExplanation?: string

  /** Escalates with failure/unresolved; increases difficulty/spread. */
  stage: number

  durationWeeks: number
  weeksRemaining?: number

  deadlineWeeks: number
  deadlineRemaining: number

  /** For normal cases: 0..1 teams; for raids: 0..N teams. */
  assignedTeamIds: Id[]

  onFail: SpawnRule
  onUnresolved: SpawnRule

  /** Optional explicit pressure contribution used by pressure pipeline and intel surfaces. */
  pressureValue?: number

  /** Optional explicit region affinity used by pressure pipeline and intel surfaces. */
  regionTag?: string

  raid?: { minTeams: number; maxTeams: number }
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
  | 'system.territorial_power'
  | 'system.supply_network_updated'
  | 'system.fortification_updated'
  | 'directive.applied'
  | 'governance.turn_resolved'
  | 'governance.transfer_processed'

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
  campaignGovernance?: import('./campaignGovernance').CampaignGovernanceReportSnapshot
  territorialPower?: import('./territorialPower').TerritorialPowerReportSnapshot
  supplyNetwork?: import('./supplyNetwork').SupplyNetworkReportSnapshot

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
  authority?: number
  /**
   * Canonical support pool: available support staff/capacity for operations this week.
   * Bounded, deterministic, and consumed by operations. Restored by hub/campaign actions.
   */
  supportAvailable: number
  /**
   * Canonical maintenance specialist pool: available capacity for equipment recovery this week.
   * Each damaged item or recovery job consumes 1 maintenance specialist per week.
   */
  maintenanceSpecialistsAvailable?: number
  upkeepBurden?: number
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
}

export interface GameState {
    /** Canonical legitimacy/access state for bounded gating (SPE-53 legitimacy pass) */
    legitimacy?: LegitimacyState
  emergencyGovernance?: EmergencyGovernanceState
  /** Canonical authority-transfer and succession state. */
  governance?: import('./governanceTransfers').GovernanceState
  /** Canonical strategic-governance turn state for authority, upkeep, war, and fortification. */
  campaignGovernance?: import('./campaignGovernance').CampaignGovernanceState
  /** Canonical territorial-power substrate for deterministic weekly simulation. */
  territorialPower?: import('./territorialPower').TerritorialPowerState
  /** Canonical connected-source support and transport substrate. */
  supplyNetwork?: import('./supplyNetwork').SupplyNetworkState
  /** Canonical regional/zone/route state for bounded, deterministic regional simulation. */
  regionalState?: RegionalState
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
  /** Historical snapshots of relationship values for trend analysis and chemistry prediction. */
  relationshipHistory?: RelationshipSnapshot[]
  inventory: Record<string, number>
  caseQueue?: CaseQueueState
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
  academyTier?: number

  /** Canonical persistent knowledge-state map (keyed by entity/subject) */
  knowledge: KnowledgeStateMap
}

/**
 * Canonical regional/zone/route state for bounded, deterministic regional simulation.
 * - regions: minimal set of region ids (e.g., 'north', 'central', 'south')
 * - control: which faction/entity controls each region
 * - routes: minimal adjacency/connection info (for future deterministic routing)
 * - knowledge: per-region knowledge state (mirrors knowledgeState pattern)
 */
export interface RegionalState {
  regions: readonly string[]
  control: Record<string, string> // regionId -> controller (e.g., 'agency', 'hostile', etc.)
  routes: Record<string, readonly string[]> // regionId -> connected regionIds
  knowledge: Record<string, import('./knowledge').KnowledgeState>
}
