// src/domain/models.ts
import type { OperationEvent } from './events/types'
import type { PartyCardState } from './partyCards/models'
import type {
  Agent,
  AgentPerformanceOutput,
  FatigueBand,
  MarketPressure,
} from './agent/models'

// Re-export all agent-related types
export type {
  Agent,
  AgentAbility,
  AgentAssignmentState,
  AgentHistory,
  AgentHistoryCounters,
  AgentHistoryEntry,
  AgentIdentity,
  AgentPerformanceOutput,
  AgentProgression,
  AgentRole,
  AgentTrait,
  AgentTraitModifierKey,
  AgentVitals,
  DomainStats,
  FatigueBand,
  HireStatus,
  MarketPressure,
  PotentialTier,
  RecruitCategory,
  RoleDomainWeights,
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
  SpecialistCandidateData,
  StaffCandidateSpecialty,
} from './recruitment'

export {
  buildCandidateEvaluation,
  CANDIDATE_REVEAL_THRESHOLDS,
  deriveCandidateCostEstimate,
  getCandidateOverall,
  revealCandidate,
  getCandidateWeeklyCost,
  isCandidateFieldVisible,
  isCandidateHireable,
  normalizeCandidateCategory,
  normalizeCandidateHireStatus,
  normalizeStaffCandidateSpecialty,
  previewCandidate,
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
  | 'agency.containment_updated'
  | 'system.week_delta'
  | 'system.recruitment_expired'
  | 'system.recruitment_generated'
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

export type WeeklyDirectiveId = 'intel-surge' | 'recovery-rotation' | 'procurement-push' | 'lockdown-protocol'

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

export interface ProductionQueueEntry {
  id: Id
  recipeId: string
  recipeName: string
  outputItemId: string
  outputItemName: string
  outputQuantity: number
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
  partyCards?: PartyCardState
  config: GameConfig

  /** Canonical progression shape (preferred over legacy top-level fields). */
  agency?: AgencyState

  /**
   * Transitional compatibility fields.
   * TODO: Remove after all consumers and persistence paths are migrated to `agency`.
   */
  containmentRating: number
  clearanceLevel: number
  funding: number

  /** Current academy upgrade tier (0–3). Each tier unlocks +1 training slot and tier 2+ grants +1 stat on completion. */
  academyTier?: number
}
