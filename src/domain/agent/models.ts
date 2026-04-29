// cspell:words callsign cooldown cooldowns substat substats
import type { OperationEvent, OperationEventType } from '../events/types'
import type { Id } from '../models'

/**
 * Agent role classification.
 * Maps to base stat distributions and default domain stat weights.
 */
export type AgentRole =
  | 'hunter'
  | 'occultist'
  | 'investigator'
  | 'field_recon'
  | 'medium'
  | 'tech'
  | 'medic'
  | 'negotiator'

/**
 * Stored substat groups backing the higher-level operational domain model.
 * These are retained for persistence compatibility and low-level stat mutation.
 */
export type LegacyStatDomain =
  | 'physical'
  | 'tactical'
  | 'cognitive'
  | 'social'
  | 'stability'
  | 'technical'

/**
 * Canonical operational domains used by agent evaluation, team composition, and resolution.
 * These are built from the stored substat lattice in `DomainStats`.
 */
export type StatDomain = 'field' | 'resilience' | 'control' | 'insight' | 'presence' | 'anomaly'

/**
 * Canonical stored stat lattice.
 * The resolution/evaluation layer consumes higher-level operational domains that are
 * derived from these persisted substats through `statDomains.ts`.
 */
export interface DomainStats {
  physical: {
    strength: number
    endurance: number
  }
  tactical: {
    awareness: number
    reaction: number
  }
  cognitive: {
    analysis: number
    investigation: number
  }
  social: {
    negotiation: number
    influence: number
  }
  stability: {
    resistance: number
    tolerance: number
  }
  technical: {
    equipment: number
    anomaly: number
  }
}

/**
 * Role-based weighting of domain contribution to case scoring.
 */
export type RoleDomainWeights = Record<StatDomain, number>

/**
 * Trait and ability modifiers can target:
 * - legacy stored substat groups (e.g., 'physical')
 * - higher-level operational domains (e.g., 'field')
 * - 'overall' for blanket bonuses
 */
export type AgentTraitModifierKey = LegacyStatDomain | StatDomain | 'overall'

/**
 * Persisted trait metadata.
 * Runtime conditions/modifier activation live in the deterministic trait registry in `domain/traits.ts`.
 * `modifiers` remains a serializable payload that a matching trait definition may consume.
 */
export interface AgentTrait {
  id: string
  label: string
  description?: string
  /** Domain-level or overall stat modifiers used when the runtime trait condition is met. */
  modifiers: Partial<Record<AgentTraitModifierKey, number>>
}

/**
 * Trigger-capable ability scaffold.
 * Passive abilities resolve during evaluation automatically.
 * Active abilities keep deterministic trigger/cooldown metadata but do not execute in MVP.
 */
export type AgentAbilityTrigger =
  | 'OnCaseStart'
  | 'OnThreatEncounter'
  | 'OnExposure'
  | 'OnStressGain'
  | 'OnTurnStart'
  | 'OnResolutionCheck'
  | 'OnLongCaseDurationCheck'

export type AgentAbilityEffect = Partial<Record<AgentTraitModifierKey, number>>

export interface AgentAbility {
  id: string
  label: string
  description?: string
  type: 'passive' | 'active'
  /** Trigger metadata for future active execution. Passive MVP ignores this at runtime. */
  trigger?: AgentAbilityTrigger
  /** Serializable effect payload consumed by the runtime ability helper. */
  effect: AgentAbilityEffect
  /** Scaffold for future active ability execution. */
  cooldown?: number
}

/**
 * Runtime state for an active ability execution lifecycle.
 * This is deterministic simulation state (cooldowns/usages), not authored definition data.
 */
export interface AgentAbilityRuntimeState {
  cooldownRemaining: number
  lastUsedWeek?: number
  usesConsumedThisWeek?: number
}

/**
 * Per-agent runtime map keyed by authored ability id.
 */
export type AgentAbilityState = Record<string, AgentAbilityRuntimeState>

/**
 * Agent identity information.
 */
export interface AgentIdentity {
  name: string
  age?: number
  background?: string
  codename?: string
  /** Compatibility alias retained for existing UI and persistence paths. */
  callsign?: string
  portraitId?: string
}

/**
 * Agent vitals: health, stress (derived from fatigue), and status flags.
 */
export interface AgentVitals {
  health: number
  stress: number
  morale: number
  wounds: number
  statusFlags: string[]
}

export type AgentGrowthStats = Partial<Record<StatDomain | LegacyStatDomain, number>>

export type ExactPotentialTier = 'F' | 'D' | 'C' | 'B' | 'A' | 'S'
export type PotentialTier = ExactPotentialTier | 'low' | 'mid' | 'high'

export type PotentialIntelConfidence = 'unknown' | 'low' | 'medium' | 'high' | 'confirmed'

export type PotentialIntelSource =
  | 'recruitment_scout'
  | 'training'
  | 'mission'
  | 'breakthrough'
  | 'academy_record'

export interface PotentialIntel {
  visibleTier?: ExactPotentialTier
  exactKnown?: boolean
  confidence?: PotentialIntelConfidence
  discoveryProgress?: number
  source?: PotentialIntelSource
  lastUpdatedWeek?: number
}

export type TrainingStatus = 'idle' | 'queued' | 'in_progress' | 'blocked' | 'completed_recently'

export type TrainingCategory =
  | 'core_role_drills'
  | 'domain_skill_tracks'
  | 'operational_discipline_modules'
  | 'equipment_proficiency_modules'
  | 'cross_role_bridge_training'
  | 'advanced_certification_programs'

export type CertificationState =
  | 'not_started'
  | 'in_progress'
  | 'eligible_review'
  | 'certified'
  | 'expired'
  | 'revoked'

export interface TrainingHistoryEntry {
  trainingId: string
  week: number
}

export interface AgentCertificationRecord {
  certificationId: string
  state: CertificationState
  awardedWeek?: number
  expiresWeek?: number
  sourceTrainingIds?: string[]
  notes?: string
}

export interface AgentTrainingProfile {
  agentId: Id
  currentRole: AgentRole
  trainingStatus: TrainingStatus
  assignedTrainingId?: string
  trainingStartedWeek?: number
  trainingEtaWeek?: number
  trainingQueuePosition?: number
  readinessImpact: number
}

/**
 * Agent progression tracking: experience, level, potential tier, and growth profile.
 */
export interface AgentProgression {
  xp: number
  level: number
  potentialTier: PotentialTier
  growthProfile: string
  /** Player-facing intel about an agent's hidden potential; can begin inaccurate and improve over time. */
  potentialIntel?: PotentialIntel
  /** Per-stat growth ceilings for live agents, normalized to never fall below current base stats. */
  statCaps?: Record<'combat' | 'investigation' | 'utility' | 'social', number>
  growthStats?: AgentGrowthStats
  /** Skills and specialization tracking for training system */
  skillTree?: SkillTree
  /** Bounded progression budget earned from training completions and review steps. */
  trainingPoints?: number
  /** Bounded completion log for deterministic progression and certification prerequisites. */
  trainingHistory?: TrainingHistoryEntry[]
  /** Explicit per-certification milestone counters. */
  certProgress?: Record<string, number>
  /** Explicit finite certification records keyed by certification id. */
  certifications?: Record<string, AgentCertificationRecord>
  /** Optional specialization lane distinct from skillTree specialization for training programs. */
  specializationTrack?: 'combat' | 'investigation' | 'utility' | 'social'
  /** Last week this operative completed a training program. */
  lastTrainingWeek?: number
  /** Explicit failed-attempt counters by training/certification identifier. */
  failedAttemptsByTrainingId?: Record<string, number>
  /** Canonical training lifecycle payload for UI/debug/readiness consumers. */
  trainingProfile?: AgentTrainingProfile
}

export interface SkillTree {
  /** Total skill points accumulated from case resolutions and training. */
  skillPoints: number
  /** Current specialization path, if any. */
  specialization?: 'combat' | 'investigation' | 'utility' | 'social'
  /** Tracks partner agents trained with this agent. */
  trainedRelationships: Record<Id, number>
}

/**
 * Coarser operational role buckets used by higher-level command surfaces.
 * Existing simulation systems still use `AgentRole` as the primary role enum.
 */
export type AgentOperationalRole = 'field' | 'containment' | 'investigation' | 'support'

/**
 * Typed equipment slot map with open-ended compatibility keys.
 */
export interface EquipmentSlots {
  primary?: string
  secondary?: string
  armor?: string
  headgear?: string
  utility1?: string
  utility2?: string
  utility?: string
  primaryKit?: string
  secondaryKit?: string
  utilityKit?: string
  protectiveGear?: string
  [slotId: string]: string | undefined
}

/**
 * Simplified assignment lifecycle projection used by persistence/UI surfaces.
 * Canonical simulation assignment remains `AgentAssignmentState`.
 */
export type AgentAssignmentLifecycleState =
  | {
      state: 'idle'
      teamId: null
      caseId?: null
      startedWeek?: undefined
    }
  | {
      state: 'assigned' | 'resolving' | 'recovering'
      teamId: Id | null
      caseId?: Id | null
      startedWeek?: number
    }

export interface AgentAssignmentStatus {
  state: AgentAssignmentLifecycleState['state']
  teamId: Id | null
  caseId?: Id | null
  startedWeek?: number
}

/**
 * Persistent service-level milestones for a long-term operative.
 * These are compatibility-safe and are updated by domain lifecycle helpers.
 */
export interface AgentServiceRecord {
  joinedWeek: number
  lastAssignmentWeek?: number
  lastCaseWeek?: number
  lastTrainingWeek?: number
  lastRecoveryWeek?: number
}

export type AgentReadinessState = 'ready' | 'assigned' | 'training' | 'recovering' | 'unavailable'

export type AgentReadinessBand = 'steady' | 'strained' | 'critical' | 'unavailable'

/**
 * Canonical derived readiness projection for UI and command surfaces.
 * This is normalized from vitals, fatigue, status, and assignment state.
 */
export interface AgentReadinessProfile {
  state: AgentReadinessState
  band: AgentReadinessBand
  deploymentEligible: boolean
  recoveryRequired: boolean
  riskFlags: string[]
}

/**
 * Cumulative counters tracking agent mission history.
 */
export interface AgentHistoryCounters {
  [key: string]: number
  assignmentsCompleted: number
  casesResolved: number
  casesPartiallyResolved: number
  casesFailed: number
  anomaliesContained: number
  recoveryWeeks: number
  trainingWeeks: number
  trainingsCompleted: number
  stressSustained: number
  damageSustained: number
  anomalyExposures: number
  evidenceRecovered: number
}

export interface AgentPerformanceStats {
  deployments: number
  totalContribution: number
  totalThreatHandled: number
  totalDamageTaken: number
  totalHealingPerformed: number
  totalEvidenceGathered: number
  totalContainmentActionsCompleted: number
  totalFieldPower: number
  totalContainment: number
  totalInvestigation: number
  totalSupport: number
  totalStressImpact: number
  totalEquipmentContributionDelta: number
  totalKitContributionDelta: number
  totalProtocolContributionDelta: number
  totalEquipmentScoreDelta: number
  totalKitScoreDelta: number
  totalProtocolScoreDelta: number
  totalKitEffectivenessDelta: number
  totalProtocolEffectivenessDelta: number
}

/**
 * Single timeline entry recording an agent's event.
 */
export interface AgentHistoryEntry {
  week: number
  eventType: OperationEventType | 'simulation.weekly_tick'
  note: string
  eventId?: string
}

/**
 * Agent history: cumulative counters and full timeline.
 */
export interface AgentHistory {
  counters: AgentHistoryCounters
  casesCompleted: number
  trainingsDone: number
  bonds: Record<Id, number>
  performanceStats: AgentPerformanceStats
  alliesWorkedWith: Id[]
  timeline: AgentHistoryEntry[]
  logs: OperationEvent[]
}

export interface TrustConsequenceEntry {
  reason: 'betrayal'
  pairAgentId: Id
  triggeredWeek: number
  consequenceType: 'benching' | 'performance_penalty' | 'disciplinary' | 'resignation'
  expiresWeek?: number
}

/**
 * Assignment state: idle, assigned to a case/team, recovery, or training.
 */
export type AgentAssignmentState =
  | {
      state: 'idle'
      caseId?: undefined
      teamId?: undefined
      startedWeek?: undefined
    }
  | {
      state: 'assigned'
      caseId: Id
      teamId: Id
      startedWeek: number
    }
  | {
      state: 'recovery'
      teamId?: Id
      startedWeek: number
    }
  | {
      state: 'training'
      teamId?: Id
      startedWeek: number
      trainingProgramId?: string
    }

/**
 * Canonical abstract performance profile for a single agent.
 * Derived from effective domain stats plus passive systems such as traits, abilities, and equipment.
 */
export interface AgentPerformance {
  fieldPower: number
  containment: number
  investigation: number
  support: number
  stressImpact: number
  contribution: number
  threatHandled: number
  damageTaken: number
  healingPerformed: number
  evidenceGathered: number
  containmentActionsCompleted: number
}

/**
 * Aggregate explanatory metrics for a team or operation.
 * These are summed from per-agent performance outputs and used to explain resolution outcomes.
 */
export interface PerformanceMetricSummary {
  contribution: number
  threatHandled: number
  damageTaken: number
  healingPerformed: number
  evidenceGathered: number
  containmentActionsCompleted: number
}

/**
 * Performance output for a single agent in a case resolution.
 */
export interface AgentPerformanceOutput extends AgentPerformance {
  agentId: Id
  effectivenessScore: number
  contributionByDomain: Record<StatDomain, number>
  powerImpact?: AgentPowerImpact
}

export interface AgentPowerImpact {
  activeEquipmentIds: string[]
  activeKitIds: string[]
  activeProtocolIds: string[]
  equipmentContributionDelta: number
  kitContributionDelta: number
  protocolContributionDelta: number
  equipmentScoreDelta: number
  kitScoreDelta: number
  protocolScoreDelta: number
  kitEffectivenessMultiplier: number
  protocolEffectivenessMultiplier: number
  notes?: string[]
}

export interface AgentScoreBreakdown {
  baseDomainScore: number
  traitBonus: number
  preEffectivenessScore: number
  effectivenessMultiplier: number
  finalScore: number
}

export interface AgentPerformanceBlendBreakdown {
  equipmentLoad: number
  legacyBlendWeight: number
  weightedBlendWeight: number
  legacyTotal: number
  weightedTotal: number
  normalizedWeightedTotal: number
  blendedTotal: number
}

export type ProtocolTier = 'operations' | 'containment' | 'directorate'

export type ProtocolType =
  | 'survival-focused'
  | 'anomaly-interaction'
  | 'investigation-efficiency'
  | 'operational-endurance'

export type ProtocolScope =
  | {
      kind: 'all_agents'
    }
  | {
      kind: 'role'
      roles: AgentRole[]
    }
  | {
      kind: 'tag'
      tags: string[]
    }

export interface ProtocolGlobalModifiers {
  statModifiers: Partial<Record<AgentTraitModifierKey, number>>
  effectivenessMultiplier: number
  stressImpactMultiplier: number
  moraleRecoveryDelta: number
}

export interface AgentAppliedKit {
  id: string
  label: string
  matchedItemIds: string[]
  matchedTags: string[]
  matchedPieceCount: number
  activeThresholds: number[]
  highestActiveThreshold: number
  statModifiers: Partial<Record<AgentTraitModifierKey, number>>
  effectivenessMultiplier: number
  stressImpactMultiplier: number
  moraleRecoveryDelta: number
}

export interface AgentActiveProtocol {
  id: string
  label: string
  type: ProtocolType
  tier: ProtocolTier
  scope: ProtocolScope
  unlockReason: string
  globalModifiers: ProtocolGlobalModifiers
  statModifiers: Partial<Record<AgentTraitModifierKey, number>>
  effectivenessMultiplier: number
  stressImpactMultiplier: number
  moraleRecoveryDelta: number
}

export interface AgentPowerLayerProfile {
  kits: AgentAppliedKit[]
  protocols: AgentActiveProtocol[]
}

export type AgentSimulationPurpose = 'assignment' | 'resolution'

export interface AgentEligibilityStatus {
  eligible: boolean
  blockedReasons: string[]
}

/**
 * Canonical backend availability view for downstream simulation systems.
 * This keeps assignment gating and resolution gating separate while preserving
 * one normalized source of truth for current operative readiness.
 */
export interface AgentAvailabilityProfile {
  assignment: AgentEligibilityStatus
  resolution: AgentEligibilityStatus
  readinessState: AgentReadinessState
  readinessBand: AgentReadinessBand
  currentAssignmentState: AgentAssignmentState['state']
  recoveryRequired: boolean
}

/**
 * Stable long-term counters used by reporting, progression analysis, and future advisory layers.
 */
export interface AgentHistorySummary {
  assignmentsCompleted: number
  casesCompleted: number
  casesResolved: number
  casesPartiallyResolved: number
  casesFailed: number
  trainingsDone: number
  trainingWeeks: number
  recoveryWeeks: number
  anomalyExposures: number
  evidenceRecovered: number
  stressSustained: number
  damageSustained: number
  anomaliesContained: number
  deployments: number
  totalContribution: number
  totalThreatHandled: number
  totalDamageTaken: number
  totalHealingPerformed: number
  totalEvidenceGathered: number
  totalContainmentActionsCompleted: number
  totalEquipmentContributionDelta: number
  totalKitContributionDelta: number
  totalProtocolContributionDelta: number
  totalEquipmentScoreDelta: number
  totalKitScoreDelta: number
  totalProtocolScoreDelta: number
  totalKitEffectivenessDelta: number
  totalProtocolEffectivenessDelta: number
  alliesWorkedWith: number
}

/**
 * Fully evaluated operative backend profile.
 * This is the simulation-facing foundation that team composition, validation,
 * resolution, progression analysis, and reporting can all consume.
 */
export interface AgentSimulationProfile {
  agent: Agent
  agentId: Id
  assignment: AgentAssignmentState
  readiness: AgentReadinessProfile
  service: AgentServiceRecord
  progression: AgentProgression
  availability: AgentAvailabilityProfile
  history: AgentHistorySummary
  effectiveStats: DomainStats
  effectiveWeights: RoleDomainWeights
  domainProfile: Record<StatDomain, number>
  contributionByDomain: Record<StatDomain, number>
  scoreBreakdown: AgentScoreBreakdown
  performanceBlend: AgentPerformanceBlendBreakdown
  powerLayer: AgentPowerLayerProfile
  modifierEffects: {
    effectivenessMultiplier: number
    stressImpactMultiplier: number
    moraleRecoveryDelta: number
  }
  score: number
  performance: AgentPerformanceOutput
}

/**
 * Fatigue band classification used in UI and reports.
 */
export type FatigueBand = 'steady' | 'strained' | 'critical'

/**
 * Recruitment market pressure classification.
 */
export type MarketPressure = 'discounted' | 'stable' | 'tight'

/**
 * Recruit category.
 * `fieldTech` / `analyst` are legacy specialist aliases kept for compatibility.
 */
export type RecruitCategory =
  | 'agent'
  | 'staff'
  | 'specialist'
  | 'fieldTech'
  | 'analyst'
  | 'instructor'

/**
 * Recruitment hiring status.
 */
export type HireStatus = 'candidate' | 'active'

/**
 * Canonical Agent entity.
 *
 * Schema notes:
 * - `stats` (DomainStats) is the preferred stat representation. `baseStats` is legacy.
 * - runtime normalization guarantees the canonical nested fields even for sparse legacy payloads.
 * - `traits` are passive modifiers applied during evaluation.
 * - `abilities` are passive abilities (no triggers this phase).
 * - `assignment` tracks current state: idle/assigned/recovery/training.
 * - `fatigue` (0..100) is mapped to vitals.stress and statically reduces effectiveness.
 */
export interface AgentRecoveryStatus {
  state: 'healthy' | 'recovering' | 'traumatized' | 'incapacitated'
  detail?: string
  sinceWeek: number
}

export interface AgentTraumaState {
  traumaLevel: number
  traumaTags: string[]
  lastEventWeek: number
}

export interface AgentDowntimeActivity {
  activity: 'rest' | 'training' | 'therapy' | 'other'
  sinceWeek: number
}

/**
 * Three-channel fatigue state for SPE-130 Phase 1.
 *
 * Each channel accumulates from distinct causes and recovers at distinct rates:
 * - `physicalExhaustion`: travel, prolonged deployment, combat physical wear
 * - `mentalExhaustion`: investigation load, concentration pressure
 * - `combatStress`: acute crisis/combat events
 *
 * All channels are 0–100. Optional on Agent; absent agents are treated as
 * zero across all channels for backward compatibility.
 *
 * SPE-130 Phase 3: `capabilityUsesThisPhase` tracks repeated heavy capability
 * use in the current phase; resets to 0 each weekly tick. When >= threshold,
 * additional mental + physical strain is applied during capability_use context.
 */
export interface AgentFatigueChannels {
  /** Physical wear from travel, combat, and prolonged deployment. 0..100. */
  physicalExhaustion: number
  /** Mental strain from investigation and concentration pressure. 0..100. */
  mentalExhaustion: number
  /** Acute stress from combat encounters and crisis events. 0..100. */
  combatStress: number
  /** Heavy capability uses accumulated this phase; resets weekly. 0..n. */
  capabilityUsesThisPhase: number
}

/**
 * SPE-130 Phase 4 minimal overdrive runtime state.
 *
 * Keep this bounded to only what the current slice needs:
 * - active/inactive
 * - remaining short-window duration (phase count)
 * - deterministic recovery debt remaining after expiry
 */
export interface AgentOverdriveState {
  /** Whether overdrive is currently active. */
  active: boolean
  /** Remaining short-window duration (phase count). */
  remainingPhases: number
  /** Deterministic recovery debt remaining after overdrive expiry. */
  recoveryDebt: number
}

export interface Agent {
  id: Id
  name: string
  role: AgentRole
  specialization?: string
  operationalRole?: AgentOperationalRole
  age?: number
  level?: number

  /** Canonical identity container for simulation-first agent representation. */
  identity?: AgentIdentity

  /** Canonical domain stat representation (preferred over flat `baseStats`). */
  stats?: DomainStats

  /** Canonical vitals container (fatigue is retained for compatibility). */
  vitals?: AgentVitals

  /** Persistent service milestones for long-term roster analysis. */
  serviceRecord?: AgentServiceRecord

  /** Canonical derived readiness state; recomputed during normalization. */
  readinessProfile?: AgentReadinessProfile

  /** Canonical progression state (preferred over top-level `level`). */
  progression?: AgentProgression

  /** Canonical attrition/loss state for deterministic personnel pressure. */
  attritionState?: import('../models').AgentAttritionState

  equipment?: Record<string, number>
  equipmentSlots?: EquipmentSlots
  /** Context-aware trait modifiers resolved through the runtime trait registry. */
  traits?: AgentTrait[]
  /** Passive abilities are live in MVP; active abilities are persisted as trigger scaffolds only. */
  abilities?: AgentAbility[]
  /** Runtime execution state for active abilities (cooldowns/usage tracking). */
  abilityState?: AgentAbilityState
  history?: AgentHistory
  assignment?: AgentAssignmentState
  assignmentStatus?: AgentAssignmentStatus

  /** Raw contribution before fatigue modifiers. */
  baseStats: Record<'combat' | 'investigation' | 'utility' | 'social', number>

  /** Capability tags used for deterministic gates and bonuses. */
  tags: string[]

  /**
   * Pairwise chemistry (relationship) map:
   * typical range -2..+2, stored as "how I feel about them".
   */
  relationships: Record<Id, number>

  /** Accumulated betrayal trust damage per counterpart, used by the phase-2 consequence ladder. */
  trustDamageByAgent?: Record<Id, number>

  /** Active and historical betrayal-driven consequences applied to this agent. */
  trustConsequenceStack?: TrustConsequenceEntry[]

  /** Optional effectiveness/readiness penalty multiplier while trust penalties are active. */
  performancePenaltyMultiplier?: number

  /** 0..100 fatigue impacts effective stats; missions raise fatigue. */
  fatigue: number

  /**
   * Permanent per-week fatigue recovery bonus (added to the baseline recoveryFatigue).
   * Granted by endurance training programs that complete successfully.
   */
  recoveryRateBonus?: number

  /** Prototype status hooks (injury/trauma can be expanded later). */
  status: 'active' | 'injured' | 'recovering' | 'resigned' | 'dead'

  /** Canonical recovery state for deterministic recovery/trauma/downtime system. */
  recoveryStatus?: AgentRecoveryStatus
  trauma?: AgentTraumaState
  downtimeActivity?: AgentDowntimeActivity

  /**
   * Three-axis fatigue channel state (SPE-130 Phase 1).
   * Optional; absent agents treated as zero across all channels.
   */
  fatigueChannels?: AgentFatigueChannels

  /**
   * SPE-130 Phase 4 bounded overdrive state.
   * Optional and backward-compatible; absent means no overdrive state/history.
   */
  overdrive?: AgentOverdriveState
}
