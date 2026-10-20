/**
 * Tests for Unauthorized Enhancement Layer
 *
 * SPE-1023 acceptance criteria:
 * - at least one hidden treatment changes capability/condition/vulnerability
 * - at least one beneficiary conceals, hoards, or self-doses
 * - at least one overdose/instability event emerges
 * - at least one official medical explanation remains incomplete
 */

import { describe, it, expect } from 'vitest'
import type {
  EnhancementState,
  SupplyState,
  DependencyState,
  OfficialRecordState,
  OverdoseState,
  PatientState,
  EffectType,
  DependencySign,
  SupplySource,
  RecoveryStatus,
} from './unauthorizedEnhancement'
import {
  calculateEnhancementLevel,
  calculateDependencyRisk,
  calculateOverdoseRisk,
  isOverdoseCrossed,
  simulateTimePassage,
  checkForCollapse,
  applyCollapseResult,
  initializePatient,
  administerEnhancement,
  simulateOfficialReview,
  isSelfDosingDetected,
  isHoardingDetected,
  isDiagnosisIncomplete,
  getOfficialExplanation,
  addHoursIso,
} from './unauthorizedEnhancement'

const T0 = '2026-10-20T12:00:00.000Z'

const sampleTreatment = {
  id: 'treatment-1',
  name: 'Memory Enhancement',
  publicName: 'Memory Aid Supplement',
  trueNature: 'cognitive' as const,
  perceivedEffect: 'Sharper focus',
  actualEffect: 'Enhanced memory retention',
  administration: 'Oral tablet',
  providerType: 'underground' as const,
}

describe('Unauthorized Enhancement Layer', () => {
  describe('Hidden treatment changes capability', () => {
    it('should calculate enhancement level decay over time', () => {
      const halfLife = 24
      const asOf = T0

      expect(calculateEnhancementLevel(T0, halfLife, 100, asOf)).toBe(100)
      expect(
        calculateEnhancementLevel(addHoursIso(T0, -24), halfLife, 100, asOf),
      ).toBe(50)
      expect(
        calculateEnhancementLevel(addHoursIso(T0, -48), halfLife, 100, asOf),
      ).toBe(25)
      expect(
        calculateEnhancementLevel(addHoursIso(T0, -96), halfLife, 100, asOf),
      ).toBeCloseTo(6.25, 5)
    })

    it('should hold full level until peak hours elapse', () => {
      const asOf = addHoursIso(T0, 4)
      expect(calculateEnhancementLevel(T0, 24, 100, asOf, 4)).toBe(100)
      expect(
        calculateEnhancementLevel(T0, 24, 100, addHoursIso(T0, 28), 4),
      ).toBe(50)
    })

    it('should track active effects and intensity', () => {
      const enhancement: EnhancementState = {
        id: 'test-enhancement-1',
        level: 80,
        levelAtAdministration: 80,
        lastAdministered: T0,
        halfLifeHours: 24,
        peakHours: 4,
        durationHours: 48,
        activeEffects: [
          {
            type: 'cognitive_boost' as EffectType,
            intensity: 75,
            threshold: 50,
            name: 'Enhanced cognitive function',
          },
        ],
        dependencyRisk: 0.3,
        withdrawalSymptoms: ['Fatigue', 'Mental fog'],
      }

      expect(enhancement.activeEffects[0].type).toBe('cognitive_boost')
      expect(enhancement.activeEffects[0].intensity).toBe(75)
      expect(enhancement.activeEffects[0].threshold).toBe(50)
    })

    it('should recognize when enhancement exceeds threshold', () => {
      expect(isOverdoseCrossed(90, 80, 10)).toBe(true)
      expect(calculateOverdoseRisk(90, 80, 10)).toBeGreaterThan(0)
    })

    it('should distinguish between safe and unsafe levels', () => {
      const threshold = 80
      const tolerance = 10

      expect(isOverdoseCrossed(60, threshold, tolerance)).toBe(false)
      expect(calculateOverdoseRisk(60, threshold, tolerance)).toBe(0)
      expect(isOverdoseCrossed(80, threshold, tolerance)).toBe(false)
      expect(calculateOverdoseRisk(80, threshold, tolerance)).toBe(0)
      expect(isOverdoseCrossed(95, threshold, tolerance)).toBe(true)
      expect(calculateOverdoseRisk(95, threshold, tolerance)).toBe(0.5)
    })

    it('should change capability via initialized hidden treatment', () => {
      const patient = initializePatient(
        'patient-001',
        'John Doe',
        sampleTreatment,
        T0,
      )
      const boost = patient.enhancements[0].activeEffects.find(
        (e) => e.type === 'cognitive_boost',
      )
      expect(boost).toBeDefined()
      expect(patient.enhancements[0].level).toBe(100)
      expect(patient.treatmentStatus).toBe('active_enhanced')
    })
  })

  describe('Beneficiary conceals, hoards, or self-doses', () => {
    it('should detect hidden supply units', () => {
      const supplyState: SupplyState = {
        source: 'underground_dealer' as SupplySource,
        storageMethod: 'Hidden in medical bag',
        totalUnits: 10,
        consumedUnits: 2,
        hiddenUnits: 8,
        concealmentMethod: 'Disguised as vitamins',
        replenishmentFrequency: 'Weekly',
      }

      expect(supplyState.hiddenUnits).toBeGreaterThan(0)
      expect(supplyState.concealmentMethod).not.toBe('none')
      expect(isHoardingDetected(supplyState, 10, 2)).toBe(true)
    })

    it('should detect self-dosing from self-compiled supply', () => {
      const supplyState: SupplyState = {
        source: 'self_compiled' as SupplySource,
        storageMethod: 'Personal stash',
        totalUnits: 5,
        consumedUnits: 3,
        hiddenUnits: 2,
        concealmentMethod: 'None - openly self-administered',
        replenishmentFrequency: 'Self-compiled weekly',
      }

      expect(isSelfDosingDetected(supplyState, 'irregular')).toBe(true)
    })

    it('should track supply consumption and replenishment', () => {
      const supplyState: SupplyState = {
        source: 'underground_dealer' as SupplySource,
        storageMethod: 'Medical bag',
        totalUnits: 10,
        consumedUnits: 0,
        hiddenUnits: 10,
        concealmentMethod: 'Hidden',
        replenishmentFrequency: 'Weekly',
      }

      supplyState.consumedUnits += 3
      supplyState.totalUnits = Math.max(0, supplyState.totalUnits - 3)

      expect(supplyState.consumedUnits).toBe(3)
      expect(supplyState.totalUnits).toBe(7)
    })

    it('should initialize patient with concealed supply', () => {
      const patient = initializePatient(
        'patient-001',
        'John Doe',
        sampleTreatment,
        T0,
      )
      expect(patient.supplies[0].hiddenUnits).toBeGreaterThan(0)
      expect(patient.supplies[0].concealmentMethod).toBeDefined()
    })
  })

  describe('Overdose and instability', () => {
    it('should model overdose recovery statuses', () => {
      const statuses: RecoveryStatus[] = [
        'stable',
        'monitoring',
        'declining',
        'critical',
        'collapsed',
      ]
      expect(statuses).toHaveLength(5)
    })

    it('should raise overdose risk from the same treatment that helped', () => {
      let patient = initializePatient(
        'patient-001',
        'John Doe',
        sampleTreatment,
        T0,
      )
      expect(patient.enhancements[0].level).toBe(100)

      patient = administerEnhancement(patient, 'treatment-1', 2, T0)
      expect(patient.enhancements[0].level).toBe(100)
      expect(patient.overdose.risk).toBeGreaterThan(0.1)

      const symptom = patient.enhancements[0].activeEffects.find(
        (e) => e.type === 'overdose_symptom',
      )
      expect(symptom).toBeDefined()
    })

    it('should accumulate instability across time while enhanced', () => {
      let patient = initializePatient(
        'patient-001',
        'John Doe',
        sampleTreatment,
        T0,
      )
      const before = patient.overdose.risk
      patient = simulateTimePassage(patient, 40)
      expect(patient.overdose.risk).toBeGreaterThan(before)
      const overdoseSymptom = patient.enhancements[0].activeEffects.find(
        (e) => e.type === 'overdose_symptom',
      )
      expect(overdoseSymptom).toBeDefined()
      expect(overdoseSymptom!.intensity).toBeGreaterThan(0)
    })

    it('should detect critical overdose collapse after repeated dosing', () => {
      let patient = initializePatient(
        'patient-001',
        'John Doe',
        sampleTreatment,
        T0,
      )

      patient = administerEnhancement(patient, 'treatment-1', 3, T0)
      patient = administerEnhancement(
        patient,
        'treatment-1',
        3,
        addHoursIso(T0, 2),
      )
      patient = simulateTimePassage(patient, 30)

      const result = checkForCollapse(patient)
      expect(result.collapsed).toBe(true)
      expect(result.reason).toBe('critical_overdose')
    })

    it('should apply collapse and zero enhancement', () => {
      let patient = initializePatient(
        'patient-001',
        'John Doe',
        sampleTreatment,
        T0,
      )
      patient = administerEnhancement(patient, 'treatment-1', 5, T0)
      patient = simulateTimePassage(patient, 20)

      const result = checkForCollapse(patient)
      expect(result.collapsed).toBe(true)
      patient = applyCollapseResult(patient, result, patient.lastSeen)

      expect(patient.enhancements[0].level).toBe(0)
      expect(patient.enhancements[0].activeEffects).toHaveLength(0)
      expect(patient.overdose.recoveryStatus).toBe('critical')
      expect(patient.overdose.thresholdCrossed).toBe(true)
      expect(patient.treatmentStatus).toBe('withdrawn')
      expect(patient.overdose.symptoms).toContain('Complete cognitive collapse')
    })
  })

  describe('Official medical explanation remains incomplete', () => {
    it('should leave gaps in official records', () => {
      const record: OfficialRecordState = {
        diagnosis: 'Mild cognitive impairment',
        prescribedTreatments: ['Rest'],
        prognosis: 'Good',
        gaps: ['missing_source', 'misattributed_improvement'],
        confidence: 0.4,
        lastReview: T0,
      }
      expect(record.gaps.length).toBeGreaterThan(0)
      expect(record.confidence).toBeLessThan(0.5)
    })

    it('should report incomplete diagnosis for enhanced patients', () => {
      const patient = initializePatient(
        'patient-001',
        'John Doe',
        sampleTreatment,
        T0,
      )
      expect(isDiagnosisIncomplete(patient)).toBe(true)
      expect(getOfficialExplanation(patient.enhancements[0])).toBeNull()
    })

    it('should generate incomplete official review', () => {
      const patient = initializePatient(
        'patient-001',
        'John Doe',
        sampleTreatment,
        T0,
      )
      const record = simulateOfficialReview(patient, T0)
      expect(record.gaps.length).toBeGreaterThan(0)
      expect(record.confidence).toBeLessThan(0.5)
      expect(record.gaps).toContain('missing_source')
      expect(record.gaps).toContain('misattributed_improvement')
      expect(record.lastReview).toBe(T0)
    })
  })

  describe('Patient state initialization', () => {
    it('should create patient with enhancement', () => {
      const patient: PatientState = initializePatient(
        'patient-001',
        'John Doe',
        sampleTreatment,
        T0,
      )

      expect(patient.id).toBe('patient-001')
      expect(patient.officialName).toBe('John Doe')
      expect(patient.treatmentStatus).toBe('active_enhanced')
      expect(patient.enhancements).toHaveLength(1)
      expect(patient.enhancements[0].level).toBe(100)
      expect(patient.lastSeen).toBe(T0)
    })

    it('should initialize dependency at low risk', () => {
      const patient = initializePatient(
        'patient-001',
        'John Doe',
        sampleTreatment,
        T0,
      )
      expect(patient.dependencies[0].level).toBeLessThan(0.5)
      expect(patient.dependencies[0].developmentRate).toBe('slow')
    })

    it('should initialize overdose as stable', () => {
      const patient = initializePatient(
        'patient-001',
        'John Doe',
        sampleTreatment,
        T0,
      )
      expect(patient.overdose.risk).toBe(0.1)
      expect(patient.overdose.thresholdCrossed).toBe(false)
      expect(patient.overdose.recoveryStatus).toBe('stable')
    })
  })

  describe('Enhancement administration', () => {
    it('should reset enhancement to full level after decay', () => {
      let patient = initializePatient(
        'patient-001',
        'John Doe',
        sampleTreatment,
        T0,
      )

      patient = simulateTimePassage(patient, 24)
      expect(patient.enhancements[0].level).toBe(50)

      patient = administerEnhancement(patient, 'treatment-1', 1, patient.lastSeen)
      expect(patient.enhancements[0].level).toBe(100)
      expect(patient.enhancements[0].lastAdministered).toBe(patient.lastSeen)
    })

    it('should update supply consumption', () => {
      let patient = initializePatient(
        'patient-001',
        'John Doe',
        sampleTreatment,
        T0,
      )

      expect(patient.supplies[0].totalUnits).toBe(10)
      expect(patient.supplies[0].consumedUnits).toBe(2)

      patient = administerEnhancement(patient, 'treatment-1', 3, T0)
      expect(patient.supplies[0].consumedUnits).toBe(5)
      expect(patient.supplies[0].totalUnits).toBe(7)
    })
  })

  describe('Time passage simulation', () => {
    it('should decay enhancement levels over time', () => {
      let patient = initializePatient(
        'patient-001',
        'John Doe',
        sampleTreatment,
        T0,
      )

      patient = simulateTimePassage(patient, 24)
      expect(patient.enhancements[0].level).toBe(50)

      patient = simulateTimePassage(patient, 24)
      expect(patient.enhancements[0].level).toBe(25)
    })

    it('should advance lastSeen deterministically', () => {
      let patient = initializePatient(
        'patient-001',
        'John Doe',
        sampleTreatment,
        T0,
      )
      patient = simulateTimePassage(patient, 4)
      expect(patient.lastSeen).toBe(addHoursIso(T0, 4))
      expect(patient.enhancements[0].level).toBeCloseTo(
        calculateEnhancementLevel(T0, 24, 100, patient.lastSeen),
        5,
      )
    })
  })

  describe('Dependency helpers', () => {
    it('should calculate dependency risk from usage days', () => {
      expect(calculateDependencyRisk(0, 0.1)).toBe(0)
      expect(calculateDependencyRisk(30, 0.1)).toBeCloseTo(0.1, 5)
      expect(calculateDependencyRisk(300, 0.1)).toBeGreaterThan(0.5)
    })

    it('should accept dependency sign vocabulary', () => {
      const signs: DependencySign[] = [
        'tolerance_increase',
        'withdrawal_symptoms',
        'dose_escalation',
        'behavioral_changes',
        'craving',
        'normalization_shift',
      ]
      const dependency: DependencyState = {
        level: 0.4,
        developmentRate: 'moderate',
        signs,
        lastChecked: T0,
        monitoringInterval: 'Weekly',
      }
      expect(dependency.signs).toHaveLength(6)
    })

    it('should accept overdose state shape', () => {
      const overdoseState: OverdoseState = {
        risk: 0.5,
        collapseClock: 12,
        symptoms: ['Tremor'],
        thresholdCrossed: true,
        lastOverdose: null,
        recoveryStatus: 'monitoring' as RecoveryStatus,
      }
      expect(overdoseState.thresholdCrossed).toBe(true)
    })
  })
})
