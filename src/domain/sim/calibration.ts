export const WEAKEST_LINK_CALIBRATION = {
  weights: {
    'missing-coverage': 1,
    'low-min-readiness': 0.85,
    'fragile-cohesion': 0.8,
    'training-lock-pressure': 0.75,
    'loadout-gate-miss': 0.75,
    'fatigue-concentration': 0.7,
    'intel-friction': 0.7,
  },
  caps: {
    'missing-coverage': 22, // was 24; softens hard collapse
    'low-min-readiness': 16, // was 18
    'fragile-cohesion': 14,
    'training-lock-pressure': 10,
    'loadout-gate-miss': 10,
    'fatigue-concentration': 8,
    'intel-friction': 8,
  },
  basePenaltyScales: {
    'missing-coverage': 24,
    'low-min-readiness': 22,
    'fragile-cohesion': 14,
    'training-lock-pressure': 12,
    'loadout-gate-miss': 12,
    'fatigue-concentration': 10,
    'intel-friction': 10,
  },
  globalPenaltyCap: 42,
  minimumReadinessFloor: 60,
  fatigueSafeThreshold: 85,
  fatigueMaxThreshold: 100,
  partialFailureThreshold: -18,
  recoveryPressureFailureThreshold: 6,
  recoveryPressureBands: {
    severe: 36, // was 34; delays death spiral trigger
    high: 24,
    moderate: 14,
  },
} as const

export const INTEL_CALIBRATION = {
  confidenceDecayPerWeek: 0.04,
  uncertaintyGrowthPerWeek: 0.04,
  routingRiskPenaltyCap: 8,
  routingRiskReasonThresholds: {
    high: 6,
    medium: 3,
  },
  deploymentPenaltyCap: 8,
  deploymentSoftRiskThreshold: 5,
  researchReductionPerIntelTool: 0.15,
  researchMitigationFloor: 0.6,
} as const

export const RECOVERY_CALIBRATION = {
  minorRecoveryDurationWeeks: 2,
  moderateRecoveryDurationWeeks: 3,
  returningMoraleFloor: 72,
  recoveringMoralePenalty: 3,
  downtimeFatigueRecovery: {
    rest: 12,
    therapy: 6,
  },
  downtimeTherapyTraumaReduction: 1,
  healthyReturnFatigueThreshold: 15, // default, band-gated below
  teamRecoveryPressureWeights: {
    recovering: 1,
    traumatized: 1.5,
    incapacitated: 2.0, // was 2.2; further reduces stacking penalty in second band
    traumaLevel: 0.5,
  },
  // SPE-1070 slice 1: off-duty coping (alcohol family)
  copingFatigueRelief: 8,
  copingMoraleRelief: 6,
  /** Effective team-score multiplier per impaired agent's contribution fraction. 0.85 = 15% penalty. */
  copingNextWeekPenaltyMultiplier: 0.85,
  copingDependencyThreshold: 3,
  copingProhibitedMoralePenalty: 5,
  therapyCopingStreakDecrement: 3,
} as const

// Band-gated overrides for second escalation band
export function getHealthyReturnFatigueThreshold(week: number) {
  return isSecondEscalationBandWeek(week) ? 18 : RECOVERY_CALIBRATION.healthyReturnFatigueThreshold;
}

export function getRecoveryPressureSevereThreshold(week: number) {
  return isSecondEscalationBandWeek(week) ? 38 : WEAKEST_LINK_CALIBRATION.recoveryPressureBands.severe;
}

export const PRESSURE_CALIBRATION = {
  maxPressureIncidentsPerTick: 2,
  // First escalation band smoothing (weeks 7–12):
  // These values delay compounding risk in the first major escalation window (not endgame).
  // Pressure cliffs here should warn and strain the player, not hard-collapse the campaign.
  defaultMajorIncidentThreshold: 128, // was 120; delays compounding after week 7–8 (first escalation band)
  defaultPressureDecayPerWeek: 4, // was 3; softens early stress window (weeks 7–12)
  secondEscalationBandStartWeek: 13,
  secondEscalationBandEndWeek: 24,
  secondEscalationPressureDecayBonus: 1,
  secondEscalationAmbientPressureWeight: 0.6,
  secondEscalationUnresolvedPressureWeight: 0.8,
  secondEscalationMissionIntakeReserveSlots: 3, // was 2; increases reserve slots for incident overlap in second band
  secondEscalationMaxPressureIncidentsPerTick: 1,
  secondEscalationMajorIncidentDurationReductionWeeks: 1,
  secondEscalationFollowUpSpawnReduction: 2,
  secondEscalationDeadlineResetBonusWeeks: 1,
  maxCaseEscalationLevel: 8,
  maxCaseThreatDrift: 8,
  maxCaseTimePressure: 8,
  escalationLevelDelta: {
    partial: 0,
    failed: 1,
    unresolved: 1,
  },
  threatDriftDeltaPerUnresolved: 1,
  timePressureDeltaPerUnresolved: 1,
} as const

export function isSecondEscalationBandWeek(week: number) {
  return (
    Number.isFinite(week) &&
    week >= PRESSURE_CALIBRATION.secondEscalationBandStartWeek &&
    week <= PRESSURE_CALIBRATION.secondEscalationBandEndWeek
  )
}

export const FUNDING_CALIBRATION = {
  failOperationPenaltyRate: 0.05,
  unresolvedOperationPenaltyRate: 0.08,
  budgetPressure: {
    pendingBacklogThreshold: 7,
    staleBacklogWeeks: 4,
    recentPenaltyWindow: 6,
    recentPenaltyCountThreshold: 4,
    maxPressure: 4,
  },
} as const

export const ATTRITION_CALIBRATION = {
  atRiskLossAfterWeeks: 5,
  maxReplacementPressure: 10,
} as const

// SPE-1072 slice 1: wood material family calibration
export const WOOD_CALIBRATION = {
  /** Build cost delta (negative = cheaper) vs stone/metal baseline (0). */
  buildCostDelta: -30,
  /** Build duration delta in weeks (negative = faster). */
  buildDurationDelta: -1,
  /** Recovery throughput additive delta for wood-furnished rooms. */
  comfortRecoveryDelta: 4,
  /** Morale additive delta for wood-furnished rooms. */
  comfortMoraleDelta: 3,
  /**
   * Room categories eligible for the comfort bonus.
   * Containment rooms, storage, and offices are explicitly excluded.
   */
  comfortEligibleCategories: [
    'housing',
    'lounge',
    'chapel',
    'therapy',
  ] as const,
  /**
   * Room categories where wood is a valid material input.
   * containment_high is excluded — it requires stone/metal.
   */
  woodAcceptedCategories: [
    'housing',
    'lounge',
    'chapel',
    'therapy',
    'office',
    'storage',
    'containment_low',
  ] as const,
  /**
   * Room categories where wood is explicitly rejected.
   * Any category not in woodAcceptedCategories is also rejected by default.
   */
  woodRejectedCategories: ['containment_high'] as const,
  /** Vulnerability: state after fire exposure (from intact). */
  fireTransitionFrom: 'intact' as const,
  fireDamagedState: 'fire-damaged' as const,
  /** Vulnerability: state after rot/moisture exposure (from intact). */
  rotDamagedState: 'rot-damaged' as const,
  /** Compounded state when both fire and rot damage are present. */
  compromisedState: 'compromised' as const,
  /** Investigation/ritual modifier for memory-bearing provenance. */
  provenanceMemoryBearingModifier: 8,
  /** Investigation/ritual modifier for gallows-timber provenance. */
  provenanceGallowsTimberModifier: 12,
  /** Investigation/ritual modifier for fresh-sourced wood (no provenance). */
  provenanceFreshModifier: 0,
} as const
