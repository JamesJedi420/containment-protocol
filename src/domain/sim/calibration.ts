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
  /** SPE-1653: weekly fatigue drift while exposure residue persists and downtime is ordinary rest only. */
  exposureResidueRestRecurrenceFatigue: 2,
  /** Medical staff count required for supervised washdown clearing exposure residue during therapy downtime. */
  exposureResidueMedicalClearThreshold: 2,
} as const

/** SPE-1309 slice 7: bounded vitals/scoring side-effects from cognitive hazard simulation triggers. */
export const COGNITIVE_HAZARD_CALIBRATION = {
  dutyDegradedTeamPenaltyMultiplier: 0.92,
  knowledgeDegradedTeamPenaltyMultiplier: 0.95,
  stressDeltaByReviewBand: {
    stable: 0,
    elevated: 6,
    critical: 12,
  },
  moraleDeltaByReviewBand: {
    stable: 0,
    elevated: 0,
    critical: -4,
  },
} as const

export const RESPONDER_ENERGY_CALIBRATION = {
  defaultReserve: 100,
  reserveBands: {
    stable: 70,
    taxed: 35,
  },
  dutyCosts: {
    idle_upkeep: 2,
    patrol: 8,
    carry: 13,
    sprint_response: 18,
    prolonged_field_operation: 24,
  },
  conditioningThresholds: {
    strong: 75,
    capable: 55,
    strained: 40,
  },
  conditioningMultipliers: {
    strong: 0.75,
    capable: 0.9,
    baseline: 1,
    strained: 1.25,
  },
  statusMultipliers: {
    injured: 1.35,
    recovering: 1.25,
  },
  reserveBandMultipliers: {
    stable: 1,
    taxed: 1.1,
    depleted: 1.25,
    overdrawn: 1.4,
  },
  overdrawnPhysicalDebtDivisor: 2,
  overdrawnPhysicalCostShare: 0.25,
  maxOverdrawnPhysicalDelta: 12,
  idleReserveRecovery: 6,
  idleDebtRecovery: 4,
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
  /** SPE-28 / SPE-2319: weeks from order placement until backlog inventory is granted on week-close. */
  procurementDelayedFulfillmentWeeks: 1,
  /** SPE-28: deterministic payroll + facility upkeep charged once per closed week in advanceWeek. */
  weeklyOperatingCost: {
    payrollPerAgent: 4,
    payrollPerSupportRole: 2,
    facilityUpkeepBase: 8,
    upkeepSpikeEveryWeeks: 4,
    upkeepSpikeAmount: 12,
  },
  /** SPE-2320: inventory carrying cost charged once per closed week in advanceWeek. */
  weeklyInventoryHoldingCost: {
    /** Stock at or below this level incurs no carrying fee (baseline working inventory). */
    billableStockThreshold: 50,
    costPerStockUnit: 1,
  },
  /** SPE-2321: read-time vendor shortage on one canonical roster listing (no week-close cash). */
  procurementShortagePressure: {
    listingId: 'material:medical_supplies',
    /** Agency stock above this level signals vendor rationing on the target listing. */
    stockThreshold: 60,
    budgetPressureThreshold: 2,
    /** Subtracted from derived bundle availability when shortage signals are active. */
    availabilityPenaltyBundles: 12,
    minBundles: 0,
  },
  /** SPE-2322: read-time office-mediated diversion on one canonical roster listing. */
  procurementCorruptionRouting: {
    listingId: 'material:electronic_parts',
    /** Subtracted from derived bundle availability when compromised-authority diversion is active. */
    availabilityPenaltyBundles: 12,
    minBundles: 0,
  },
  /** SPE-2323: callable obligation substitutes cash on one canonical roster listing. */
  procurementCallableObligation: {
    listingId: 'material:occult_reagents',
    factionId: 'institutions',
    favorId: 'institutions-lab-access-boon',
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

// SPE-1074 slice 1: material density / weight calibration
export const DENSITY_CALIBRATION = {
  /**
   * Abstract mass units per density class.
   * medium (1.0) is the neutral baseline; other classes scale relative to it.
   */
  massUnitsByClass: {
    ultralight: 0.2,
    light: 0.6,
    medium: 1.0,
    heavy: 2.5,
    extreme: 6.0,
  } as const,

  /**
   * Minimum mass units required to trigger each handling tier.
   * A profile whose massUnits are at or above this threshold uses that tier.
   */
  handlingTierThresholds: {
    minimal: 0,       // any mass — one person can carry unaided
    standard: 0.5,    // requires a second person or basic cart
    assisted: 1.2,    // requires small team + reinforced cart / pallet jack
    specialist: 2.0,  // requires specialist team + machinery
    'crane-only': 5.0,// crane or equivalent lift mandatory
  } as const,

  /** Extra person-weeks of labor per massUnit above 1.0 (medium baseline). */
  laborPerExcessMassUnit: 1.5,

  /**
   * Minimum handling tier that requires equipment (i.e., not human-only).
   * 'assisted' and above need listed equipment.
   */
  equipmentThresholdTier: 'assisted' as const,

  /**
   * Floor rating capacity in massUnits per installation unit.
   * If the profile's massUnits exceed the floor rating, installation is blocked.
   */
  floorRatingCapacity: {
    standard: 1.5,
    reinforced: 3.5,
    'heavy-rated': 7.0,
  } as const,

  /**
   * Delay in weeks added when a heavy material clears floor rating constraints
   * only with friction (e.g., reinforced but not heavy-rated).
   */
  frictionDelayWeeks: 1,

  /**
   * Injury risk delta added per handling tier above 'minimal' when crew/equipment
   * is under-provisioned relative to required tier.
   */
  injuryRiskDeltaPerTierGap: 0.10,

  /**
   * Handling tier gap at or above which routeBlockageRisk activates.
   * A gap of 2 means crew is two tiers below the required tier.
   */
  routeBlockageRiskTierGap: 2,

  /**
   * Handling tier gap at or above which infrastructureDamageRisk activates.
   */
  infrastructureDamageRiskTierGap: 3,

  /**
   * Breach resistance multiplier applied to massUnits to produce breachResistanceIndex.
   * higher density = proportionally higher resistance.
   */
  breachResistanceMultiplier: 12,

  /**
   * Deployment speed penalty per massUnit above medium baseline.
   * Used in tradeoff computation: positive = heavier is slower to deploy.
   */
  deploymentSpeedPenaltyPerMassUnit: 0.8,
} as const

// SPE-1069 slice 1: civilization parent-actor calibration
export const CIVILIZATION_CALIBRATION = {
  defaultMemoryCapacity: 10,
  institutionDerivationMinProbability: 0.3,
  minInstitutionsPerGeneration: 1,
  maxInstitutionsPerGeneration: 4,
} as const

// SPE-1069 slice 6: civilization evolution/change scaffolding calibration
export const CIVILIZATION_EVOLUTION_CALIBRATION = {
  significantChangeThreshold: 55,
  severeChangeThreshold: 70,
  memoryPressureWeight: 0.6,
  opposedBandPressureBonus: 10,
  alignedBandReformBonus: 8,
  topTagCount: 3,
} as const

// SPE-1059 slice 1: competency framework calibration
export const COMPETENCY_CALIBRATION = {
  minimumScore: 0,
  maxScore: 100,
  baseUseGain: 4,
  decayPerWeek: 2,
  decayStartAfterWeeks: 3,
} as const

// SPE-1024 slice 1: responder duty-state evaluation calibration
export const RESPONDER_DUTY_CALIBRATION = {
  readinessWeights: {
    certification: 0.35,
    gear: 0.35,
    condition: 0.3,
  },
  fatiguePenaltyWeight: 0.6,
  injuredPenalty: 20,
  recoveringPenalty: 30,
  trainingPenalty: 15,
  fitReadinessBonus: 8,
  mismatchReadinessPenalty: 18,
  visibleIndirectPanicBase: 55,
  visibleReachablePanicBase: 35,
  blackoutPanicPenalty: 10,
  minimumDeployScore: 55,
  panicHoldThreshold: 75,
} as const

// SPE-1045 slice 1: live registry core calibration
export const LIVE_REGISTRY_CALIBRATION = {
  confidenceDropThreshold: 0.5,
  alertSeverities: {
    escape: 'critical',
    compromise: 'high',
    transfer: 'warning',
    confirmation: 'info',
    confidenceDrop: 'warning',
  } as const,
} as const

// SPE-1045 slice 3: registry query/view calibration
export const LIVE_REGISTRY_QUERY_CALIBRATION = {
  /** Number of entries surfaced in the digest top-priority list. */
  digestTopN: 5,
  /**
   * When activeThreatCount reaches or exceeds this value, the registry
   * digest raises the overloadFlag to signal triage mode.
   */
  overloadThreshold: 5,
} as const

// SPE-1045 slice 4: alert-center / worklist orchestration calibration
export const LIVE_REGISTRY_ALERT_CENTER_CALIBRATION = {
  /**
   * When escalatedCount reaches or exceeds this value the worklist raises
   * overloadFlag — operators must triage rather than handle sequentially.
   */
  escalationOverloadThreshold: 3,
} as const

/** SPE-1701 slice 1: deployment readiness deltas from post-downtime posture (first contract week only). */
export const DOWNTIME_CARRY_IN_CALIBRATION = {
  /** Extra readiness penalty when residue is present but supervised therapy was foregone. */
  residueTherapyForegoneReadinessPenalty: 5,
  /** Readiness lift for a genuinely rested week with stable energy (does not duplicate raw fatigue term). */
  wellRestedStableEnergyReadinessBonus: 4,
  /** Fatigue ceiling for the well-rested bonus (higher fatigue already depresses readiness via averageFatigue). */
  wellRestedFatigueCeiling: 28,
  /** Cap on summed per-agent carry-in applied to team readiness (prevents runaway stacking). */
  teamReadinessDeltaCap: 12,
  /** SPE-1700: readiness drag when a botched off-books courier locks future runs. */
  offBooksCourierLockoutReadinessPenalty: 8,
} as const

/** SPE-1700 slice 1: single risky downtime path (off-books courier). SPE-1702: trusted relay tier. */
export const SIDE_WORK_CALIBRATION = {
  /** Pre-week fatigue at or above this threshold triggers the lockout branch (no payout). */
  offBooksCourierHighFatigueThreshold: 68,
  offBooksCourierSuccessFundingDelta: 220,
  offBooksCourierSuccessFatigueDelta: 14,
  offBooksCourierLockoutFatigueDelta: 22,
  /** SPE-1702: stricter gate than base courier — relay fails into shared lockout sooner when tired. */
  trustedCourierHighFatigueThreshold: 62,
  trustedCourierSuccessFundingDelta: 360,
  trustedCourierSuccessFatigueDelta: 24,
  trustedCourierLockoutFatigueDelta: 26,
} as const

/** SPE-1703a: single agency courier shell front (weekly resolve + collapse). */
export const FRONT_BUSINESS_CALIBRATION = {
  courierShellStartupCost: 750,
  /** Weekly gross margin before roster/agency risk drains (integer). */
  courierShellWeeklyBase: 150,
  /** Multiplier applied to the compact weekly risk score (lockouts, residue, pressure). */
  courierShellRiskMultiplier: 28,
  /** At or above: front is strained (or worse) even if net stays positive. */
  courierShellStrainRiskThreshold: 4,
  /** At or above: front collapses for the week (one-shot budget-pressure debt applies). */
  courierShellCollapseRiskThreshold: 8,
  /** Added to recomputed `budgetPressure` when the shell collapses (bounded, persistent debt field). */
  courierShellCollapseBudgetPressureDebt: 2,
} as const

/**
 * SPE-823a: read-only courier network capacity gap slice (derived report; not persisted on `GameState`).
 * Targets are authored thresholds for the static scenario id — not a procedural scenario generator.
 */
export const COURIER_NETWORK_CAPACITY_GAP_CALIBRATION = {
  scenarioId: 'spe-823a-logistics-baseline' as const,
  /** Immediate minimum courier/logistics support score for the baseline slice. */
  requiredCapacity: 20,
  /** Higher structural target: branch can meet immediate need yet remain undercapitalized. */
  desiredFutureCapacity: 36,
  /** Score floor when no licensed shell exists (informal agency logistics only). */
  informalNetworkBaseScore: 4,
  /** Added when at least one operative has `side-work-prereq:off-books-courier-paid`. */
  paidInformalPrereqBoost: 10,
  shellActiveScore: 42,
  shellStrainedScore: 32,
  shellCollapsedScore: 12,
  lockoutPenaltyPerLockout: 8,
  lockoutPenaltyCap: 16,
  residuePenaltyPerResidue: 4,
  residuePenaltyCap: 12,
  budgetPressurePenaltyPerPoint: 2,
  budgetPressurePenaltyCap: 12,
  pendingProcurementPenaltyPerOrder: 2,
  pendingProcurementPenaltyCap: 8,
  /** Weeks until notional desk reinforcement improves usable network capacity (hook only). */
  frontBusinessHookDelayedPayoffWeeks: 3,
  /** Weeks until procurement backlog fulfillment eases logistics friction (hook only). */
  procurementHookDelayedPayoffWeeks: 1,
} as const
