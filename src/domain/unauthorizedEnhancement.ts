/**
 * Unauthorized Enhancement Layer
 * 
 * SPE-1023: Unauthorized enhancement lifecycle
 * 
 * Goal: Implement a bounded unauthorized-enhancement layer so hidden treatments 
 * can improve capability, create dependency, produce overdose, and collapse 
 * under exposure without cleanly fitting either medicine or poisoning alone.
 * 
 * Scope:
 * - support illicit or unauthorized treatment programs running alongside official medicine
 * - support apparent restoration of cognition, mobility, art skill, perception
 * - support hidden supply chains, patient hoarding, missing inventory, self-dosing
 * - support overdose clocks, acute collapse, and treatment thresholds
 * - support conflict between official treatment explanations and hidden enhancement
 * - distinguish unauthorized enhancement from standard prescriptions, doping, antidote use
 * - connect to care-facility degradation, perception gating, administrative partial closure
 * 
 * Constraints:
 * - deterministic only
 * - no full pharmacology simulator
 * - no assumption that improvement means safety or that official records are complete
 * - prefer compact supply, effect, dependency, and overdose states
 * - keep current treatment source, dose state, and enhancement cost legible
 * 
 * Acceptance:
 * - at least one hidden treatment changes capability/condition/vulnerability
 * - at least one beneficiary conceals, hoards, or self-doses
 * - at least one overdose/instability event emerges
 * - at least one official medical explanation remains incomplete
 */

/**
 * Hidden treatment type - the unauthorized substance/therapy
 */
export type UnauthorizedTreatment = {
  id: string;
  name: string;
  /** The official-looking name patients see */
  publicName: string;
  /** The true nature - what it actually does */
  trueNature: TreatmentNature;
  /** What the patient experiences */
  perceivedEffect: string;
  /** The actual physiological effect */
  actualEffect: string;
  /** How it's administered */
  administration: string;
  /** Who provides it */
  providerType: ProviderType;
};

export type TreatmentNature = 
  | 'cognitive'      // Memory, focus, creativity
  | 'physical'       // Strength, endurance, coordination
  | 'perceptual'     // Sensory enhancement
  | 'emotional'      // Mood regulation, resilience
  | 'metabolic'      // Energy, appetite, sleep
  | 'neurological'   // Neural efficiency, processing speed
  | 'somatic'        // Pain suppression, healing acceleration
  | 'psychological'; // Confidence, willpower, fearlessness

export type ProviderType = 
  | 'underground'    // Street, black market
  | 'sympathetic'    // Friends, allies, hidden helpers
  | 'professional'   // Doctors with secret practices
  | 'self-supplied'; // Self-compiled, self-administered

/**
 * Enhancement effect state
 */
export type EnhancementState = {
  /** Current enhancement level (0-100%) */
  level: number;
  /** When enhancement was last administered */
  lastAdministered: string;
  /** Half-life in hours */
  halfLifeHours: number;
  /** Peak effect hours after administration */
  peakHours: number;
  /** Duration of effect in hours */
  durationHours: number;
  /** Current effects */
  activeEffects: Effect[];
  /** Dependency risk (0-1) */
  dependencyRisk: number;
  /** Withdrawal symptoms if stopped */
  withdrawalSymptoms: string[];
};

/**
 * Effect of enhancement
 */
export type Effect = {
  type: EffectType;
  intensity: number; // 0-100
  threshold: number; // % needed for effect to manifest
  name: string;
};

export type EffectType = 
  | 'cognitive_boost'
  | 'physical_boost'
  | 'perceptual_shift'
  | 'emotional_stabilization'
  | 'metabolic_acceleration'
  | 'neurological_optimization'
  | 'somatic_healing'
  | 'psychological_empowerment'
  | 'overdose_symptom'
  | 'collapse_trigger';

/**
 * Supply state - where it comes from and how it's tracked
 */
export type SupplyState = {
  /** Source of the treatment */
  source: SupplySource;
  /** How it's stored */
  storageMethod: string;
  /** Total available (units) */
  totalUnits: number;
  /** Units consumed */
  consumedUnits: number;
  /** Units hidden/concealed */
  hiddenUnits: number;
  /** How it's concealed */
  concealmentMethod: string;
  /** Frequency of replenishment */
  replenishmentFrequency: string;
};

export type SupplySource = 
  | 'underground_dealer'
  | 'sympathetic_provider'
  | 'self_compiled'
  | 'medical_deviation'
  | 'imported';

/**
 * Dependency state - how much the subject relies on the enhancement
 */
export type DependencyState = {
  /** Dependency level (0-100%) */
  level: number;
  /** How quickly it develops */
  developmentRate: 'slow' | 'moderate' | 'rapid';
  /** Signs of dependency */
  signs: DependencySign[];
  /** When last checked */
  lastChecked: string;
  /** Recommended monitoring interval */
  monitoringInterval: string;
};

export type DependencySign = 
  | 'tolerance_increase'
  | 'withdrawal_symptoms'
  | 'dose_escalation'
  | 'behavioral_changes'
  | 'craving'
  | 'normalization_shift';

/**
 * Official medical record state - what the system thinks
 */
export type OfficialRecordState = {
  /** What official medicine says is happening */
  diagnosis: string;
  /** Official treatments prescribed */
  prescribedTreatments: string[];
  /** Official prognosis */
  prognosis: string;
  /** What's missing from the record */
  gaps: RecordGap[];
  /** Confidence in the diagnosis */
  confidence: number; // 0-1
  /** Last official review */
  lastReview: string;
};

export type RecordGap = 
  | 'missing_source'
  | 'missing_dose_history'
  | 'missing_side_effects'
  | 'misattributed_improvement'
  | 'unexplained_symptoms'
  | 'contradictory_findings';

/**
 * Overdose/Collapse state
 */
export type OverdoseState = {
  /** Current overdose risk (0-100%) */
  risk: number;
  /** Current overdose clock (hours until collapse) */
  collapseClock: number | null; // null = no active overdose
  /** Active overdose symptoms */
  symptoms: string[];
  /** Threshold crossed? */
  thresholdCrossed: boolean;
  /** Last overdose event */
  lastOverdose: string | null;
  /** Recovery status */
  recoveryStatus: RecoveryStatus;
};

export type RecoveryStatus = 
  | 'stable'
  | 'monitoring'
  | 'declining'
  | 'critical'
  | 'collapsed';

/**
 * Patient state - combines all aspects
 */
export type PatientState = {
  /** Patient identifier */
  id: string;
  /** Name as known to official records */
  officialName: string;
  /** Real name (if known) */
  realName?: string;
  /** Current official diagnosis */
  officialDiagnosis: string;
  /** Current treatment status */
  treatmentStatus: TreatmentStatus;
  /** Enhancement states */
  enhancements: EnhancementState[];
  /** Supply states */
  supplies: SupplyState[];
  /** Dependency states */
  dependencies: DependencyState[];
  /** Official record state */
  officialRecord: OfficialRecordState;
  /** Overdose state */
  overdose: OverdoseState;
  /** Last known activity */
  lastSeen: string;
  /** Location */
  location: string;
  /** Who knows about the enhancements */
  awareParties: string[];
};

export type TreatmentStatus = 
  | 'active_enhanced'
  | 'active_official_only'
  | 'inactive'
  | 'withdrawn'
  | 'discovered';

/**
 * Simulation functions - deterministic, bounded
 */

/**
 * Calculate current enhancement level based on time since last administration
 */
export function calculateEnhancementLevel(
  lastAdministered: string,
  durationHours: number,
  currentLevel: number
): number {
  const now = new Date();
  const last = new Date(lastAdministered);
  const hoursPassed = (now.getTime() - last.getTime()) / (1000 * 60 * 60);
  
  if (hoursPassed < 0) return 100; // Just administered
  
  // Linear decay based on half-life
  const decayFactor = Math.pow(0.5, hoursPassed / durationHours);
  return Math.max(0, currentLevel * decayFactor);
}

/**
 * Check if enhancement has peaked
 */
export function isEnhancementPeaked(
  lastAdministered: string,
  peakHours: number
): boolean {
  const now = new Date();
  const last = new Date(lastAdministered);
  const hoursPassed = (now.getTime() - last.getTime()) / (1000 * 60 * 60);
  
  return hoursPassed >= peakHours;
}

/**
 * Check if enhancement has expired
 */
export function isEnhancementExpired(
  lastAdministered: string,
  durationHours: number
): boolean {
  const now = new Date();
  const last = new Date(lastAdministered);
  const hoursPassed = (now.getTime() - last.getTime()) / (1000 * 60 * 60);
  
  return hoursPassed >= durationHours;
}

/**
 * Calculate dependency risk based on usage frequency
 */
export function calculateDependencyRisk(
  usageDays: number,
  dependencyRate: number
): number {
  // Risk increases with usage days, capped at 1
  const risk = 1 - Math.pow(1 - dependencyRate, usageDays / 30);
  return Math.min(1, Math.max(0, risk));
}

/**
 * Calculate overdose risk based on current level and threshold
 */
export function calculateOverdoseRisk(
  currentLevel: number,
  threshold: number,
  tolerance: number
): number {
  // Risk = (current - tolerance) / (threshold - tolerance)
  const effectiveLevel = Math.max(tolerance, currentLevel);
  if (effectiveLevel <= threshold) return 0;
  
  const risk = (effectiveLevel - tolerance) / (threshold - tolerance);
  return Math.min(1, Math.max(0, risk));
}

/**
 * Check if overdose threshold has been crossed
 */
export function isOverdoseCrossed(
  currentLevel: number,
  threshold: number,
  tolerance: number
): boolean {
  return currentLevel > threshold + tolerance;
}

/**
 * Simulate collapse based on overdose state
 */
export function simulateCollapse(
  overdoseState: OverdoseState
): CollapseResult {
  if (!overdoseState.thresholdCrossed) {
    return { collapsed: false, reason: null };
  }
  
  const risk = overdoseState.risk;
  
  if (risk >= 0.95) {
    return { collapsed: true, reason: 'severe_overdose' };
  } else if (risk >= 0.85) {
    return { collapsed: true, reason: 'acute_symptoms' };
  } else if (risk >= 0.7) {
    return { collapsed: false, reason: 'monitoring_required' };
  } else {
    return { collapsed: false, reason: 'stable' };
  }
}

export type CollapseResult = {
  collapsed: boolean;
  reason: string | null;
};

/**
 * Check if official diagnosis explains the symptoms
 */
export function isDiagnosisIncomplete(
  patientState: PatientState
): boolean {
  return patientState.officialRecord.gaps.length > 0;
}

/**
 * Get official explanation for enhancement effects
 */
export function getOfficialExplanation(
  enhancement: EnhancementState
): string | null {
  // In real implementation, this would query the official medical system
  // For simulation, we return null to indicate incomplete explanation
  return null;
}

/**
 * Check if self-dosing is occurring
 */
export function isSelfDosingDetected(
  supplyState: SupplyState,
  consumptionPattern: string
): boolean {
  // Self-dosing indicators:
  // - Hidden units > 0
  // - Replenishment frequency suggests personal use
  return supplyState.hiddenUnits > 0 || 
         (supplyState.replenishmentFrequency.includes('personal') || 
          supplyState.replenishmentFrequency.includes('self'));
}

/**
 * Get concealment method
 */
export function getConcealmentMethod(
  supplyState: SupplyState
): string {
  return supplyState.concealmentMethod || 'none';
}

/**
 * Check for hoarding behavior
 */
export function isHoardingDetected(
  supplyState: SupplyState,
  totalUnits: number,
  consumedUnits: number
): boolean {
  if (consumedUnits === 0 && totalUnits > 0) return true;
  if (supplyState.hiddenUnits > totalUnits * 0.5) return true;
  return false;
}

/**
 * Generate official diagnosis (may be incomplete)
 */
export function generateOfficialDiagnosis(
  symptoms: string[],
  treatmentHistory: string[]
): OfficialRecordState {
  // In real implementation, this would query the medical system
  // For simulation, we create a partial diagnosis
  return {
    diagnosis: 'Unspecified cognitive dysfunction',
    prescribedTreatments: ['Supportive care', 'Observation'],
    prognosis: 'Uncertain',
    gaps: [
      'missing_source',
      'misattributed_improvement',
      'unexplained_symptoms'
    ],
    confidence: 0.4, // Low confidence due to missing data
    lastReview: new Date().toISOString()
  };
}

/**
 * Initialize a new patient with unauthorized enhancement
 */
export function initializePatient(
  patientId: string,
  officialName: string,
  treatment: UnauthorizedTreatment
): PatientState {
  return {
    id: patientId,
    officialName,
    realName: undefined,
    officialDiagnosis: 'Pending evaluation',
    treatmentStatus: 'active_enhanced',
    enhancements: [
      {
        id: treatment.id,
        level: 100,
        lastAdministered: new Date().toISOString(),
        halfLifeHours: 24,
        peakHours: 4,
        durationHours: 48,
        activeEffects: [
          {
            type: 'cognitive_boost',
            intensity: 100,
            threshold: 50,
            name: 'Enhanced cognitive function'
          },
          {
            type: 'physical_boost',
            intensity: 80,
            threshold: 60,
            name: 'Improved physical coordination'
          }
        ],
        dependencyRisk: 0.2, // Low initially
        withdrawalSymptoms: [
          'Fatigue',
          'Mental fog',
          'Reduced coordination'
        ]
      }
    ],
    supplies: [
      {
        source: 'underground_dealer',
        storageMethod: 'Hidden in medical bag',
        totalUnits: 10,
        consumedUnits: 2,
        hiddenUnits: 8,
        concealmentMethod: 'Disguised as vitamins',
        replenishmentFrequency: 'Weekly from sympathetic provider'
      }
    ],
    dependencies: [
      {
        level: 0.2,
        developmentRate: 'slow',
        signs: [],
        lastChecked: new Date().toISOString(),
        monitoringInterval: 'Monthly'
      }
    ],
    officialRecord: generateOfficialDiagnosis(
      ['Fatigue', 'Difficulty concentrating'],
      ['Rest', 'Stress management']
    ),
    overdose: {
      risk: 0.1,
      collapseClock: null,
      symptoms: [],
      thresholdCrossed: false,
      lastOverdose: null,
      recoveryStatus: 'stable'
    },
    lastSeen: new Date().toISOString(),
    location: 'Unknown',
    awareParties: ['Sympathetic provider']
  };
}

/**
 * Simulate enhancement administration
 */
export function administerEnhancement(
  patientState: PatientState,
  enhancementId: string,
  units: number
): PatientState {
  const enhancement = patientState.enhancements.find(e => e.id === enhancementId);
  if (!enhancement) return patientState;
  
  // Reset to full effect
  enhancement.level = 100;
  enhancement.lastAdministered = new Date().toISOString();
  
  // Add overdose risk
  enhancement.activeEffects.push({
    type: 'overdose_symptom',
    intensity: 0, // Will increase over time
    threshold: 95,
    name: 'Overdose approaching'
  });
  
  // Update supply
  const supply = patientState.supplies.find(s => s.source === 'underground_dealer');
  if (supply) {
    supply.consumedUnits += units;
    supply.totalUnits = Math.max(0, supply.totalUnits - units);
  }
  
  return patientState;
}

/**
 * Simulate time passage
 */
export function simulateTimePassage(
  patientState: PatientState,
  hours: number
): PatientState {
  let newState = { ...patientState };
  
  for (const enhancement of newState.enhancements) {
    enhancement.level = calculateEnhancementLevel(
      enhancement.lastAdministered,
      enhancement.durationHours,
      enhancement.level
    );
    
    // Increase overdose risk if above threshold
    if (enhancement.level > 90) {
      enhancement.activeEffects.push({
        type: 'overdose_symptom',
        intensity: Math.min(100, hours * 5),
        threshold: 95,
        name: 'Overdose progressing'
      });
    }
  }
  
  // Check for collapse
  const overdoseResult = checkForCollapse(newState);
  newState = applyCollapseResult(newState, overdoseResult);
  
  return newState;
}

/**
 * Check for collapse based on current state
 */
export function checkForCollapse(patientState: PatientState): CollapseResult {
  for (const enhancement of patientState.enhancements) {
    if (enhancement.level > 95) {
      return { collapsed: true, reason: 'critical_overdose' };
    }
  }
  return { collapsed: false, reason: null };
}

/**
 * Apply collapse result
 */
export function applyCollapseResult(
  patientState: PatientState,
  result: CollapseResult
): PatientState {
  if (result.collapsed) {
    patientState.enhancements.forEach(e => {
      e.level = 0;
      e.activeEffects = [];
    });
    patientState.overdose.risk = 1;
    patientState.overdose.collapseClock = 0;
    patientState.overdose.thresholdCrossed = true;
    patientState.overdose.symptoms = [
      'Complete cognitive collapse',
      'Loss of motor control',
      'Respiratory distress'
    ];
    patientState.overdose.recoveryStatus = 'critical';
    patientState.treatmentStatus = 'withdrawn';
  }
  
  return patientState;
}

/**
 * Simulate official medical review
 */
export function simulateOfficialReview(patientState: PatientState): OfficialRecordState {
  // Official medicine sees only the surface symptoms
  return {
    diagnosis: 'Mild cognitive impairment',
    prescribedTreatments: ['Memory exercises', 'Sleep hygiene'],
    prognosis: 'Reversible with rest',
    gaps: [
      'missing_source', // They don't know about the enhancement
      'misattributed_improvement', // They attribute improvements to their treatment
      'unexplained_symptoms' // Can't explain certain effects
    ],
    confidence: 0.3,
    lastReview: new Date().toISOString()
  };
}
