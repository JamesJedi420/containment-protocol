/**
 * Unauthorized Enhancement Layer
 *
 * SPE-1023: Unauthorized enhancement lifecycle
 *
 * Bounded unauthorized-enhancement layer so hidden treatments can improve
 * capability, create dependency, produce overdose, and collapse under exposure
 * without cleanly fitting either medicine or poisoning alone.
 *
 * Deterministic only — all time advancement uses caller-supplied ISO clocks.
 */

export type UnauthorizedTreatment = {
  id: string
  name: string
  /** The official-looking name patients see */
  publicName: string
  /** The true nature - what it actually does */
  trueNature: TreatmentNature
  /** What the patient experiences */
  perceivedEffect: string
  /** The actual physiological effect */
  actualEffect: string
  /** How it's administered */
  administration: string
  /** Who provides it */
  providerType: ProviderType
}

export type TreatmentNature =
  | 'cognitive'
  | 'physical'
  | 'perceptual'
  | 'emotional'
  | 'metabolic'
  | 'neurological'
  | 'somatic'
  | 'psychological'

export type ProviderType =
  | 'underground'
  | 'sympathetic'
  | 'professional'
  | 'self-supplied'

export type EnhancementState = {
  id: string
  /** Current enhancement level (0-100) */
  level: number
  /** Level at last administration (decay base) */
  levelAtAdministration: number
  /** When enhancement was last administered (ISO) */
  lastAdministered: string
  /** Half-life in hours */
  halfLifeHours: number
  /** Peak effect hours after administration (no decay until after peak) */
  peakHours: number
  /** Duration of effect in hours */
  durationHours: number
  /** Current effects */
  activeEffects: Effect[]
  /** Dependency risk (0-1) */
  dependencyRisk: number
  /** Withdrawal symptoms if stopped */
  withdrawalSymptoms: string[]
}

export type Effect = {
  type: EffectType
  intensity: number
  threshold: number
  name: string
}

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
  | 'collapse_trigger'

export type SupplyState = {
  source: SupplySource
  storageMethod: string
  totalUnits: number
  consumedUnits: number
  hiddenUnits: number
  concealmentMethod: string
  replenishmentFrequency: string
}

export type SupplySource =
  | 'underground_dealer'
  | 'sympathetic_provider'
  | 'self_compiled'
  | 'medical_deviation'
  | 'imported'

export type DependencyState = {
  level: number
  developmentRate: 'slow' | 'moderate' | 'rapid'
  signs: DependencySign[]
  lastChecked: string
  monitoringInterval: string
}

export type DependencySign =
  | 'tolerance_increase'
  | 'withdrawal_symptoms'
  | 'dose_escalation'
  | 'behavioral_changes'
  | 'craving'
  | 'normalization_shift'

export type OfficialRecordState = {
  diagnosis: string
  prescribedTreatments: string[]
  prognosis: string
  gaps: RecordGap[]
  confidence: number
  lastReview: string
}

export type RecordGap =
  | 'missing_source'
  | 'missing_dose_history'
  | 'missing_side_effects'
  | 'misattributed_improvement'
  | 'unexplained_symptoms'
  | 'contradictory_findings'

export type OverdoseState = {
  risk: number
  collapseClock: number | null
  symptoms: string[]
  thresholdCrossed: boolean
  lastOverdose: string | null
  recoveryStatus: RecoveryStatus
}

export type RecoveryStatus =
  | 'stable'
  | 'monitoring'
  | 'declining'
  | 'critical'
  | 'collapsed'

export type PatientState = {
  id: string
  officialName: string
  realName?: string
  officialDiagnosis: string
  treatmentStatus: TreatmentStatus
  enhancements: EnhancementState[]
  supplies: SupplyState[]
  dependencies: DependencyState[]
  officialRecord: OfficialRecordState
  overdose: OverdoseState
  lastSeen: string
  location: string
  awareParties: string[]
}

export type TreatmentStatus =
  | 'active_enhanced'
  | 'active_official_only'
  | 'inactive'
  | 'withdrawn'
  | 'discovered'

export type CollapseResult = {
  collapsed: boolean
  reason: string | null
}

const OVERDOSE_RISK_PER_UNIT = 0.18
const OVERDOSE_RISK_PER_HOUR_WHILE_ENHANCED = 0.012
const OVERDOSE_COLLAPSE_RISK = 0.95
const OVERDOSE_WARNING_RISK = 0.7

function hoursBetween(fromIso: string, toIso: string): number {
  return (Date.parse(toIso) - Date.parse(fromIso)) / (1000 * 60 * 60)
}

export function addHoursIso(iso: string, hours: number): string {
  return new Date(Date.parse(iso) + hours * 60 * 60 * 1000).toISOString()
}

/**
 * Current enhancement level from last administration at an explicit clock.
 * No decay until peakHours have elapsed; then half-life decay from levelAtAdministration.
 */
export function calculateEnhancementLevel(
  lastAdministered: string,
  halfLifeHours: number,
  levelAtAdministration: number,
  asOf: string,
  peakHours = 0,
): number {
  const hoursPassed = hoursBetween(lastAdministered, asOf)
  if (hoursPassed < 0) return levelAtAdministration
  if (hoursPassed <= peakHours) return levelAtAdministration

  const decayHours = hoursPassed - peakHours
  const decayFactor = Math.pow(0.5, decayHours / halfLifeHours)
  return Math.max(0, levelAtAdministration * decayFactor)
}

export function isEnhancementPeaked(
  lastAdministered: string,
  peakHours: number,
  asOf: string,
): boolean {
  return hoursBetween(lastAdministered, asOf) >= peakHours
}

export function isEnhancementExpired(
  lastAdministered: string,
  durationHours: number,
  asOf: string,
): boolean {
  return hoursBetween(lastAdministered, asOf) >= durationHours
}

export function calculateDependencyRisk(
  usageDays: number,
  dependencyRate: number,
): number {
  const risk = 1 - Math.pow(1 - dependencyRate, usageDays / 30)
  return Math.min(1, Math.max(0, risk))
}

export function calculateOverdoseRisk(
  currentLevel: number,
  threshold: number,
  tolerance: number,
): number {
  const effectiveLevel = Math.max(tolerance, currentLevel)
  if (effectiveLevel <= threshold) return 0
  // Fail closed when threshold/tolerance collapse: any excess is full risk.
  if (threshold <= tolerance) return 1
  const risk = (effectiveLevel - tolerance) / (threshold - tolerance)
  return Math.min(1, Math.max(0, risk))
}

export function isOverdoseCrossed(
  currentLevel: number,
  threshold: number,
  tolerance: number,
): boolean {
  return currentLevel > threshold + tolerance
}

export function simulateCollapse(overdoseState: OverdoseState): CollapseResult {
  if (!overdoseState.thresholdCrossed) {
    return { collapsed: false, reason: null }
  }

  const risk = overdoseState.risk
  if (risk >= OVERDOSE_COLLAPSE_RISK) {
    return { collapsed: true, reason: 'severe_overdose' }
  }
  if (risk >= 0.85) {
    return { collapsed: true, reason: 'acute_symptoms' }
  }
  if (risk >= OVERDOSE_WARNING_RISK) {
    return { collapsed: false, reason: 'monitoring_required' }
  }
  return { collapsed: false, reason: 'stable' }
}

export function isDiagnosisIncomplete(patientState: PatientState): boolean {
  return patientState.officialRecord.gaps.length > 0
}

/**
 * Official medicine never explains parallel hidden enhancement.
 * Accepts the enhancement record for call-site symmetry; always returns null.
 */
export function getOfficialExplanation(
  enhancement: EnhancementState,
): string | null {
  if (typeof enhancement.id !== 'string') {
    return null
  }
  return null
}

export function isSelfDosingDetected(
  supplyState: SupplyState,
  consumptionPattern: string,
): boolean {
  const pattern = consumptionPattern.toLowerCase()
  return (
    supplyState.hiddenUnits > 0 ||
    supplyState.source === 'self_compiled' ||
    supplyState.replenishmentFrequency.toLowerCase().includes('personal') ||
    supplyState.replenishmentFrequency.toLowerCase().includes('self') ||
    pattern.includes('personal') ||
    pattern.includes('self') ||
    pattern.includes('irregular')
  )
}

export function getConcealmentMethod(supplyState: SupplyState): string {
  return supplyState.concealmentMethod || 'none'
}

export function isHoardingDetected(
  supplyState: SupplyState,
  totalUnits: number,
  consumedUnits: number,
): boolean {
  if (consumedUnits === 0 && totalUnits > 0) return true
  if (supplyState.hiddenUnits > totalUnits * 0.5) return true
  return false
}

export function generateOfficialDiagnosis(
  _symptoms: string[],
  _treatmentHistory: string[],
  asOf: string,
): OfficialRecordState {
  return {
    diagnosis: 'Unspecified cognitive dysfunction',
    prescribedTreatments: ['Supportive care', 'Observation'],
    prognosis: 'Uncertain',
    gaps: ['missing_source', 'misattributed_improvement', 'unexplained_symptoms'],
    confidence: 0.4,
    lastReview: asOf,
  }
}

export function initializePatient(
  patientId: string,
  officialName: string,
  treatment: UnauthorizedTreatment,
  asOf: string,
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
        levelAtAdministration: 100,
        lastAdministered: asOf,
        halfLifeHours: 24,
        peakHours: 0,
        durationHours: 48,
        activeEffects: [
          {
            type: 'cognitive_boost',
            intensity: 100,
            threshold: 50,
            name: 'Enhanced cognitive function',
          },
          {
            type: 'physical_boost',
            intensity: 80,
            threshold: 60,
            name: 'Improved physical coordination',
          },
        ],
        dependencyRisk: 0.2,
        withdrawalSymptoms: ['Fatigue', 'Mental fog', 'Reduced coordination'],
      },
    ],
    supplies: [
      {
        source: 'underground_dealer',
        storageMethod: 'Hidden in medical bag',
        totalUnits: 10,
        consumedUnits: 2,
        hiddenUnits: 8,
        concealmentMethod: 'Disguised as vitamins',
        replenishmentFrequency: 'Weekly from sympathetic provider',
      },
    ],
    dependencies: [
      {
        level: 0.2,
        developmentRate: 'slow',
        signs: [],
        lastChecked: asOf,
        monitoringInterval: 'Monthly',
      },
    ],
    officialRecord: generateOfficialDiagnosis(
      ['Fatigue', 'Difficulty concentrating'],
      ['Rest', 'Stress management'],
      asOf,
    ),
    overdose: {
      risk: 0.1,
      collapseClock: null,
      symptoms: [],
      thresholdCrossed: false,
      lastOverdose: null,
      recoveryStatus: 'stable',
    },
    lastSeen: asOf,
    location: 'Unknown',
    awareParties: ['Sympathetic provider'],
  }
}

function clonePatient(patientState: PatientState): PatientState {
  return structuredClone(patientState)
}

export function administerEnhancement(
  patientState: PatientState,
  enhancementId: string,
  units: number,
  asOf: string,
): PatientState {
  const next = clonePatient(patientState)
  const enhancement = next.enhancements.find((e) => e.id === enhancementId)
  if (!enhancement) return next

  enhancement.level = 100
  enhancement.levelAtAdministration = 100
  enhancement.lastAdministered = asOf
  enhancement.activeEffects.push({
    type: 'overdose_symptom',
    intensity: Math.min(100, units * 20),
    threshold: 95,
    name: 'Overdose approaching',
  })

  next.overdose.risk = Math.min(
    1,
    next.overdose.risk + units * OVERDOSE_RISK_PER_UNIT,
  )
  if (next.overdose.risk >= OVERDOSE_WARNING_RISK) {
    next.overdose.thresholdCrossed = true
    if (next.overdose.collapseClock === null) {
      next.overdose.collapseClock = 24
    }
  }

  const supply = next.supplies.find((s) => s.source === 'underground_dealer')
  if (supply) {
    supply.consumedUnits += units
    supply.totalUnits = Math.max(0, supply.totalUnits - units)
  }

  next.lastSeen = asOf
  return next
}

export function simulateTimePassage(
  patientState: PatientState,
  hours: number,
): PatientState {
  const next = clonePatient(patientState)
  const asOf = addHoursIso(next.lastSeen, hours)

  for (const enhancement of next.enhancements) {
    enhancement.level = calculateEnhancementLevel(
      enhancement.lastAdministered,
      enhancement.halfLifeHours,
      enhancement.levelAtAdministration,
      asOf,
      enhancement.peakHours,
    )

    if (enhancement.level > 25 && next.treatmentStatus === 'active_enhanced') {
      next.overdose.risk = Math.min(
        1,
        next.overdose.risk + hours * OVERDOSE_RISK_PER_HOUR_WHILE_ENHANCED,
      )
      const existing = enhancement.activeEffects.find(
        (e) => e.type === 'overdose_symptom',
      )
      const intensity = Math.min(100, Math.round(next.overdose.risk * 100))
      if (existing) {
        existing.intensity = Math.max(existing.intensity, intensity)
      } else if (next.overdose.risk >= 0.3) {
        enhancement.activeEffects.push({
          type: 'overdose_symptom',
          intensity,
          threshold: 95,
          name: 'Overdose progressing',
        })
      }
    }
  }

  if (next.overdose.risk >= OVERDOSE_WARNING_RISK) {
    next.overdose.thresholdCrossed = true
    if (next.overdose.collapseClock === null) {
      next.overdose.collapseClock = 24
    } else {
      next.overdose.collapseClock = Math.max(0, next.overdose.collapseClock - hours)
    }
  }

  next.lastSeen = asOf
  const overdoseResult = checkForCollapse(next)
  return applyCollapseResult(next, overdoseResult, asOf)
}

export function checkForCollapse(patientState: PatientState): CollapseResult {
  if (
    patientState.overdose.risk >= OVERDOSE_COLLAPSE_RISK ||
    (patientState.overdose.thresholdCrossed &&
      patientState.overdose.collapseClock !== null &&
      patientState.overdose.collapseClock <= 0)
  ) {
    return { collapsed: true, reason: 'critical_overdose' }
  }
  return simulateCollapse(patientState.overdose)
}

export function applyCollapseResult(
  patientState: PatientState,
  result: CollapseResult,
  asOf?: string,
): PatientState {
  if (!result.collapsed) return patientState

  const next = clonePatient(patientState)
  for (const enhancement of next.enhancements) {
    enhancement.level = 0
    enhancement.activeEffects = []
  }
  next.overdose.risk = 1
  next.overdose.collapseClock = 0
  next.overdose.thresholdCrossed = true
  next.overdose.symptoms = [
    'Complete cognitive collapse',
    'Loss of motor control',
    'Respiratory distress',
  ]
  next.overdose.recoveryStatus = 'critical'
  next.overdose.lastOverdose = asOf ?? next.lastSeen
  next.treatmentStatus = 'withdrawn'
  return next
}

export function simulateOfficialReview(
  _patientState: PatientState,
  asOf: string,
): OfficialRecordState {
  return {
    diagnosis: 'Mild cognitive impairment',
    prescribedTreatments: ['Memory exercises', 'Sleep hygiene'],
    prognosis: 'Reversible with rest',
    gaps: [
      'missing_source',
      'misattributed_improvement',
      'unexplained_symptoms',
    ],
    confidence: 0.3,
    lastReview: asOf,
  }
}
