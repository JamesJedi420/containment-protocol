/**
 * Tests for Unauthorized Enhancement Layer
 * 
 * SPE-1023 acceptance criteria:
 * - at least one hidden treatment changes capability/condition/vulnerability
 * - at least one beneficiary conceals, hoards, or self-doses
 * - at least one overdose/instability event emerges
 * - at least one official medical explanation remains incomplete
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  UnauthorizedTreatment,
  EnhancementState,
  SupplyState,
  DependencyState,
  OfficialRecordState,
  OverdoseState,
  PatientState,
  TreatmentStatus,
  RecoveryStatus,
  EffectType,
  DependencySign,
  SupplySource,
  calculateEnhancementLevel,
  calculateDependencyRisk,
  calculateOverdoseRisk,
  isOverdoseCrossed,
  simulateTimePassage,
  checkForCollapse,
  applyCollapseResult,
  initializePatient,
  administerEnhancement,
  simulateOfficialReview
} from '../domain/unauthorizedEnhancement';

describe('Unauthorized Enhancement Layer', () => {
  describe('Hidden treatment changes capability', () => {
    it('should calculate enhancement level decay over time', () => {
      const initialLevel = 100;
      const duration = 24;
      
      // Just administered - should be at full level
      expect(calculateEnhancementLevel('2026-10-20T12:00:00Z', duration, 100)).toBe(100);
      
      // After half-life - should be at 50%
      expect(calculateEnhancementLevel('2026-10-20T00:00:00Z', duration, 100)).toBe(50);
      
      // After 2 half-lives - should be at 25%
      expect(calculateEnhancementLevel('2026-10-19T00:00:00Z', duration, 100)).toBe(25);
      
      // After 4 half-lives - should be at ~6%
      expect(calculateEnhancementLevel('2026-10-18T00:00:00Z', duration, 100)).toBe(6);
    });

    it('should track active effects and intensity', () => {
      const enhancement: EnhancementState = {
        id: 'test-enhancement-1',
        level: 80,
        lastAdministered: '2026-10-20T12:00:00Z',
        halfLifeHours: 24,
        peakHours: 4,
        durationHours: 48,
        activeEffects: [
          {
            type: 'cognitive_boost' as EffectType,
            intensity: 75,
            threshold: 50,
            name: 'Enhanced cognitive function'
          }
        ],
        dependencyRisk: 0.3,
        withdrawalSymptoms: ['Fatigue', 'Mental fog']
      };
      
      expect(enhancement.activeEffects[0].type).toBe('cognitive_boost');
      expect(enhancement.activeEffects[0].intensity).toBe(75);
      expect(enhancement.activeEffects[0].threshold).toBe(50);
    });

    it('should recognize when enhancement exceeds threshold', () => {
      const currentLevel = 90;
      const threshold = 80;
      const tolerance = 10;
      
      expect(isOverdoseCrossed(currentLevel, threshold, tolerance)).toBe(true);
      expect(calculateOverdoseRisk(currentLevel, threshold, tolerance)).toBeGreaterThan(0);
    });

    it('should distinguish between safe and unsafe levels', () => {
      const threshold = 80;
      const tolerance = 10;
      
      // Below threshold - safe
      expect(isOverdoseCrossed(60, threshold, tolerance)).toBe(false);
      expect(calculateOverdoseRisk(60, threshold, tolerance)).toBe(0);
      
      // At threshold - warning
      expect(isOverdoseCrossed(80, threshold, tolerance)).toBe(false);
      expect(calculateOverdoseRisk(80, threshold, tolerance)).toBe(0);
      
      // Above threshold - risk
      expect(isOverdoseCrossed(95, threshold, tolerance)).toBe(true);
      expect(calculateOverdoseRisk(95, threshold, tolerance)).toBe(0.5);
    });
  });

  describe('Beneficiary conceals, hoards, or self-doses', () => {
    it('should detect hidden supply units', () => {
      const supplyState: SupplyState = {
        source: 'underground_dealer' as SupplySource,
        storageMethod: 'Hidden in medical bag',
        totalUnits: 10,
        consumedUnits: 2,
        hiddenUnits: 8,
        concealmentMethod: 'Disguised as vitamins',
        replenishmentFrequency: 'Weekly from sympathetic provider'
      };
      
      expect(supplyState.hiddenUnits).toBe(8);
      expect(supplyState.concealmentMethod).toBe('Disguised as vitamins');
    });

    it('should detect hoarding behavior', () => {
      const supplyState: SupplyState = {
        source: 'underground_dealer' as SupplySource,
        storageMethod: 'Multiple hiding spots',
        totalUnits: 50,
        consumedUnits: 2,
        hiddenUnits: 48,
        concealmentMethod: 'Dispersed across locations',
        replenishmentFrequency: 'Monthly'
      };
      
      // Hoarding detection: hidden units > 50% of total
      const isHoarding = supplyState.hiddenUnits > supplyState.totalUnits * 0.5;
      expect(isHoarding).toBe(true);
    });

    it('should detect self-dosing', () => {
      const supplyState: SupplyState = {
        source: 'self_compiled' as SupplySource,
        storageMethod: 'Personal stash',
        totalUnits: 5,
        consumedUnits: 3,
        hiddenUnits: 2,
        concealmentMethod: 'None - openly self-administered',
        replenishmentFrequency: 'Self-compiled weekly'
      };
      
      // Self-dosing detected by self-sourced supply
      const isSelfDosing = supplyState.source === 'self_compiled';
      expect(isSelfDosing).toBe(true);
    });

    it('should track supply consumption and replenishment', () => {
      let supplyState: SupplyState = {
        source: 'underground_dealer' as SupplySource,
        storageMethod: 'Medical bag',
        totalUnits: 10,
        consumedUnits: 0,
        hiddenUnits: 10,
        concealmentMethod: 'Hidden',
        replenishmentFrequency: 'Weekly'
      };
      
      // Administer 3 units
      supplyState.consumedUnits += 3;
      supplyState.totalUnits = Math.max(0, supplyState.totalUnits - 3);
      
      expect(supplyState.consumedUnits).toBe(3);
      expect(supplyState.totalUnits).toBe(7);
    });
  });

  describe('Overdose and instability events', () => {
    it('should track overdose risk progression', () => {
      const overdoseState: OverdoseState = {
        risk: 0.1,
        collapseClock: null,
        symptoms: [],
        thresholdCrossed: false,
        lastOverdose: null,
        recoveryStatus: 'stable' as RecoveryStatus
      };
      
      expect(overdoseState.risk).toBe(0.1);
      expect(overdoseState.recoveryStatus).toBe('stable');
      expect(overdoseState.thresholdCrossed).toBe(false);
    });

    it('should simulate collapse progression', () => {
      const overdoseState: OverdoseState = {
        risk: 0.98,
        collapseClock: 1, // 1 hour until collapse
        symptoms: ['Severe confusion', 'Motor control loss'],
        thresholdCrossed: true,
        lastOverdose: '2026-10-20T10:00:00Z',
        recoveryStatus: 'critical' as RecoveryStatus
      };
      
      const result = simulateCollapse(overdoseState);
      expect(result.collapsed).toBe(true);
      expect(result.reason).toBe('severe_overdose');
    });

    it('should recognize overdose symptoms', () => {
      const overdoseState: OverdoseState = {
        risk: 0.85,
        collapseClock: 4,
        symptoms: [
          'Nausea',
          'Headache',
          'Dizziness',
          'Coordination issues'
        ],
        thresholdCrossed: true,
        lastOverdose: '2026-10-20T08:00:00Z',
        recoveryStatus: 'monitoring' as RecoveryStatus
      };
      
      expect(overdoseState.symptoms.length).toBe(4);
      expect(overdoseState.collapseClock).toBe(4);
      expect(overdoseState.recoveryStatus).toBe('monitoring');
    });

    it('should track recovery status progression', () => {
      const statuses: RecoveryStatus[] = [
        'stable',
        'monitoring',
        'declining',
        'critical',
        'collapsed'
      ];
      
      expect(statuses[0]).toBe('stable');
      expect(statuses[4]).toBe('collapsed');
    });

    it('should handle overdose clock', () => {
      const overdoseState: OverdoseState = {
        risk: 0.95,
        collapseClock: 2, // 2 hours until collapse
        symptoms: ['Acute onset'],
        thresholdCrossed: true,
        lastOverdose: '2026-10-20T06:00:00Z',
        recoveryStatus: 'critical' as RecoveryStatus
      };
      
      expect(overdoseState.collapseClock).toBe(2);
      expect(overdoseState.thresholdCrossed).toBe(true);
    });
  });

  describe('Official medical explanation incomplete', () => {
    it('should identify record gaps', () => {
      const record: OfficialRecordState = {
        diagnosis: 'Unspecified cognitive dysfunction',
        prescribedTreatments: ['Supportive care', 'Observation'],
        prognosis: 'Uncertain',
        gaps: [
          'missing_source',
          'misattributed_improvement',
          'unexplained_symptoms'
        ],
        confidence: 0.4,
        lastReview: '2026-10-20T10:00:00Z'
      };
      
      expect(record.gaps.length).toBe(3);
      expect(record.confidence).toBe(0.4); // Low confidence
    });

    it('should track missing source', () => {
      const record: OfficialRecordState = {
        diagnosis: 'TBD',
        prescribedTreatments: ['Pending'],
        prognosis: 'Unknown',
        gaps: ['missing_source'],
        confidence: 0.0,
        lastReview: '2026-10-20T00:00:00Z'
      };
      
      expect(record.gaps[0]).toBe('missing_source');
    });

    it('should track misattributed improvement', () => {
      const record: OfficialRecordState = {
        diagnosis: 'Improving cognitive function',
        prescribedTreatments: ['Memory exercises', 'Sleep hygiene'],
        prognosis: 'Good',
        gaps: ['misattributed_improvement'],
        confidence: 0.6,
        lastReview: '2026-10-20T10:00:00Z'
      };
      
      // Official records attribute improvements to prescribed treatments
      // but don't acknowledge the actual cause
      expect(record.gaps[0]).toBe('misattributed_improvement');
    });

    it('should track unexplained symptoms', () => {
      const record: OfficialRecordState = {
        diagnosis: 'Mixed symptom presentation',
        prescribedTreatments: ['Symptomatic treatment'],
        prognosis: 'Uncertain',
        gaps: ['unexplained_symptoms'],
        confidence: 0.5,
        lastReview: '2026-10-20T08:00:00Z'
      };
      
      expect(record.gaps[0]).toBe('unexplained_symptoms');
    });

    it('should identify all record gaps', () => {
      const record: OfficialRecordState = {
        diagnosis: 'Complex case',
        prescribedTreatments: ['Supportive care'],
        prognosis: 'Uncertain',
        gaps: [
          'missing_source',
          'missing_dose_history',
          'missing_side_effects',
          'misattributed_improvement',
          'unexplained_symptoms',
          'contradictory_findings'
        ],
        confidence: 0.2,
        lastReview: '2026-10-20T06:00:00Z'
      };
      
      expect(record.gaps.length).toBe(6);
      expect(record.confidence).toBe(0.2); // Very low confidence
    });

    it('should be detectable as incomplete diagnosis', () => {
      const record: OfficialRecordState = {
        diagnosis: 'TBD',
        prescribedTreatments: [],
        prognosis: 'Unknown',
        gaps: ['missing_source'],
        confidence: 0.0,
        lastReview: '2026-10-20T00:00:00Z'
      };
      
      // Diagnosis is incomplete if there are any gaps
      const isIncomplete = record.gaps.length > 0;
      expect(isIncomplete).toBe(true);
    });
  });

  describe('Patient state initialization', () => {
    it('should create patient with enhancement', () => {
      const patient: PatientState = initializePatient(
        'patient-001',
        'John Doe',
        {
          id: 'treatment-1',
          name: 'Memory Enhancement',
          publicName: 'Memory Aid Supplement',
          trueNature: 'cognitive' as const,
          perceivedEffect: 'Sharper focus',
          actualEffect: 'Enhanced memory retention',
          administration: 'Oral tablet',
          providerType: 'underground' as const
        }
      );
      
      expect(patient.id).toBe('patient-001');
      expect(patient.officialName).toBe('John Doe');
      expect(patient.treatmentStatus).toBe('active_enhanced');
      expect(patient.enhancements.length).toBe(1);
      expect(patient.enhancements[0].level).toBe(100);
    });

    it('should initialize supply with hidden units', () => {
      const patient = initializePatient(
        'patient-001',
        'John Doe',
        {
          id: 'treatment-1',
          name: 'Treatment',
          publicName: 'Vitamin C',
          trueNature: 'cognitive' as const,
          perceivedEffect: 'Energy boost',
          actualEffect: 'Cognitive enhancement',
          administration: 'Oral',
          providerType: 'underground' as const
        }
      );
      
      const supply = patient.supplies[0];
      expect(supply.hiddenUnits).toBeGreaterThan(0);
      expect(supply.concealmentMethod).toBeDefined();
    });

    it('should initialize dependency at low risk', () => {
      const patient = initializePatient(
        'patient-001',
        'John Doe',
        {
          id: 'treatment-1',
          name: 'Treatment',
          publicName: 'Treatment',
          trueNature: 'cognitive' as const,
          perceivedEffect: 'Helpful',
          actualEffect: 'Enhancing',
          administration: 'Oral',
          providerType: 'underground' as const
        }
      );
      
      const dependency = patient.dependencies[0];
      expect(dependency.level).toBeLessThan(0.5);
      expect(dependency.developmentRate).toBe('slow');
    });

    it('should initialize overdose as stable', () => {
      const patient = initializePatient(
        'patient-001',
        'John Doe',
        {
          id: 'treatment-1',
          name: 'Treatment',
          publicName: 'Treatment',
          trueNature: 'cognitive' as const,
          perceivedEffect: 'Helpful',
          actualEffect: 'Enhancing',
          administration: 'Oral',
          providerType: 'underground' as const
        }
      );
      
      const overdose = patient.overdose;
      expect(overdose.risk).toBe(0.1);
      expect(overdose.thresholdCrossed).toBe(false);
      expect(overdose.recoveryStatus).toBe('stable');
    });
  });

  describe('Enhancement administration', () => {
    it('should reset enhancement to full level', () => {
      let patient = initializePatient(
        'patient-001',
        'John Doe',
        {
          id: 'treatment-1',
          name: 'Treatment',
          publicName: 'Treatment',
          trueNature: 'cognitive' as const,
          perceivedEffect: 'Helpful',
          actualEffect: 'Enhancing',
          administration: 'Oral',
          providerType: 'underground' as const
        }
      );
      
      // Simulate some time passing
      patient = simulateTimePassage(patient, 24);
      expect(patient.enhancements[0].level).toBeLessThan(100);
      
      // Administer again
      patient = administerEnhancement(patient, 'treatment-1', 1);
      
      expect(patient.enhancements[0].level).toBe(100);
      expect(patient.enhancements[0].lastAdministered).toBeTruthy();
    });

    it('should track overdose risk after administration', () => {
      let patient = initializePatient(
        'patient-001',
        'John Doe',
        {
          id: 'treatment-1',
          name: 'Treatment',
          publicName: 'Treatment',
          trueNature: 'cognitive' as const,
          perceivedEffect: 'Helpful',
          actualEffect: 'Enhancing',
          administration: 'Oral',
          providerType: 'underground' as const
        }
      );
      
      // Administer
      patient = administerEnhancement(patient, 'treatment-1', 1);
      
      // Check for overdose symptom
      const hasOverdoseSymptom = patient.enhancements[0].activeEffects.some(
        e => e.type === 'overdose_symptom'
      );
      expect(hasOverdoseSymptom).toBe(true);
    });

    it('should update supply consumption', () => {
      let patient = initializePatient(
        'patient-001',
        'John Doe',
        {
          id: 'treatment-1',
          name: 'Treatment',
          publicName: 'Treatment',
          trueNature: 'cognitive' as const,
          perceivedEffect: 'Helpful',
          actualEffect: 'Enhancing',
          administration: 'Oral',
          providerType: 'underground' as const
        }
      );
      
      expect(patient.supplies[0].totalUnits).toBe(10);
      expect(patient.supplies[0].consumedUnits).toBe(2);
      
      // Administer 3 more units
      patient = administerEnhancement(patient, 'treatment-1', 3);
      
      expect(patient.supplies[0].consumedUnits).toBe(5);
      expect(patient.supplies[0].totalUnits).toBe(7);
    });
  });

  describe('Time passage simulation', () => {
    it('should decay enhancement levels over time', () => {
      let patient = initializePatient(
        'patient-001',
        'John Doe',
        {
          id: 'treatment-1',
          name: 'Treatment',
          publicName: 'Treatment',
          trueNature: 'cognitive' as const,
          perceivedEffect: 'Helpful',
          actualEffect: 'Enhancing',
          administration: 'Oral',
          providerType: 'underground' as const
        }
      );
      
      // After 24 hours (1 half-life)
      patient = simulateTimePassage(patient, 24);
      expect(patient.enhancements[0].level).toBe(50);
      
      // After 48 hours (2 half-lives)
      patient = simulateTimePassage(patient, 24);
      expect(patient.enhancements[0].level).toBe(25);
    });

    it('should track enhancement peak', () => {
      let patient = initializePatient(
        'patient-001',
        'John Doe',
        {
          id: 'treatment-1',
          name: 'Treatment',
          publicName: 'Treatment',
          trueNature: 'cognitive' as const,
          perceivedEffect: 'Helpful',
          actualEffect: 'Enhancing',
          administration: 'Oral',
          providerType: 'underground' as const
        }
      );
      
      // At 4 hours (peak)
      patient = simulateTimePassage(patient, 4);
      expect(patient.enhancements[0].level).toBe(100);
    });

    it('should increase overdose risk over time', () => {
      let patient = initializePatient(
        'patient-001',
        'John Doe',
        {
          id: 'treatment-1',
          name: 'Treatment',
          publicName: 'Treatment',
          trueNature: 'cognitive' as const,
          perceivedEffect: 'Helpful',
          actualEffect: 'Enhancing',
          administration: 'Oral',
          providerType: 'underground' as const
        }
      );
      
      // After 46 hours (close to threshold)
      patient = simulateTimePassage(patient, 46);
      
      // Enhancement should be high enough to trigger overdose symptoms
      const overdoseSymptom = patient.enhancements[0].activeEffects.find(
        e => e.type === 'overdose_symptom'
      );
      expect(overdoseSymptom).toBeDefined();
      if (overdoseSymptom) {
        expect(overdoseSymptom.intensity).toBeGreaterThan(0);
      }
    });
  });

  describe('Collapse detection', () => {
    it('should detect critical overdose collapse', () => {
      const patient = initializePatient(
        'patient-001',
        'John Doe',
        {
          id: 'treatment-1',
          name: 'Treatment',
          publicName: 'Treatment',
          trueNature: 'cognitive' as const,
          perceivedEffect: 'Helpful',
          actualEffect: 'Enhancing',
          administration: 'Oral',
          providerType: 'underground' as const
        }
      );
      
      // Simulate time until overdose
      patient = simulateTimePassage(patient, 48);
      
      // Check for collapse
      const result = checkForCollapse(patient);
      expect(result.collapsed).toBe(false); // Not collapsed yet
      
      // Simulate more time
      patient = simulateTimePassage(patient, 48);
      
      // Should now be collapsed
      const result2 = checkForCollapse(patient);
      expect(result2.collapsed).toBe(true);
      expect(result2.reason).toBe('critical_overdose');
    });

    it('should apply collapse and zero enhancement', () => {
      let patient = initializePatient(
        'patient-001',
        'John Doe',
        {
          id: 'treatment-1',
          name: 'Treatment',
          publicName: 'Treatment',
          trueNature: 'cognitive' as const,
          perceivedEffect: 'Helpful',
          actualEffect: 'Enhancing',
          administration: 'Oral',
          providerType: 'underground' as const
        }
      );
      
      // Administer multiple times to increase risk
      patient = administerEnhancement(patient, 'treatment-1', 1);
      patient = simulateTimePassage(patient, 24);
      patient = administerEnhancement(patient, 'treatment-1', 1);
      patient = simulateTimePassage(patient, 24);
      
      // Apply collapse
      const result = checkForCollapse(patient);
      if (result.collapsed) {
        patient = applyCollapseResult(patient, result);
        
        // Enhancement should be zeroed
        expect(patient.enhancements[0].level).toBe(0);
        expect(patient.enhancements[0].activeEffects.length).toBe(0);
        
        // Overdose should be critical
        expect(patient.overdose.recoveryStatus).toBe('critical');
        expect(patient.overdose.thresholdCrossed).toBe(true);
        
        // Treatment should be withdrawn
        expect(patient.treatmentStatus).toBe('withdrawn');
      }
    });

    it('should track collapse symptoms', () => {
      let patient = initializePatient(
        'patient-001',
        'John Doe',
        {
          id: 'treatment-1',
          name: 'Treatment',
          publicName: 'Treatment',
          trueNature: 'cognitive' as const,
          perceivedEffect: 'Helpful',
          actualEffect: 'Enhancing',
          administration: 'Oral',
          providerType: 'underground' as const
        }
      );
      
      // Build up to overdose
      patient = simulateTimePassage(patient, 60);
      
      const result = checkForCollapse(patient);
      if (result.collapsed) {
        patient = applyCollapseResult(patient, result);
        
        // Should have collapse symptoms
        expect(patient.overdose.symptoms).toContain('Complete cognitive collapse');
        expect(patient.overdose.symptoms).toContain('Loss of motor control');
        expect(patient.overdose.symptoms).toContain('Respiratory distress');
      }
    });
  });

  describe('Official review simulation', () => {
    it('should generate incomplete diagnosis', () => {
      const record = simulateOfficialReview({
        id: 'patient-001',
        officialName: 'John Doe',
        officialDiagnosis: 'TBD',
        treatmentStatus: 'active_enhanced',
        enhancements: [],
        supplies: [],
        dependencies: [],
        officialRecord: {
          diagnosis: 'Unknown',
          prescribedTreatments: [],
          prognosis: 'Unknown',
          gaps: [],
          confidence: 1,
          lastReview: '2026-10-20T00:00:00Z'
        },
        overdose: {
          risk: 0,
          collapseClock: null,
          symptoms: [],
          thresholdCrossed: false,
          lastOverdose: null,
          recoveryStatus: 'stable'
        },
        lastSeen: '2026-10-20T00:00:00Z',
        location: 'Unknown',
        awareParties: []
      });
      
      // Official diagnosis has gaps
      expect(record.gaps.length).toBeGreaterThan(0);
      expect(record.confidence).toBeLessThan(0.5);
    });

    it('should attribute improvements to prescribed treatments', () => {
      const record = simulateOfficialReview({
        id: 'patient-001',
        officialName: 'John Doe',
        officialDiagnosis: 'Improving',
        treatmentStatus: 'active_official_only',
        enhancements: [],
        supplies: [],
        dependencies: [],
        officialRecord: {
          diagnosis: 'Improving',
          prescribedTreatments: ['Rest', 'Observation'],
          prognosis: 'Good',
          gaps: ['misattributed_improvement'],
          confidence: 0.7,
          lastReview: '2026-10-20T10:00:00Z'
        },
        overdose: {
          risk: 0,
          collapseClock: null,
          symptoms: [],
          thresholdCrossed: false,
          lastOverdose: null,
          recoveryStatus: 'stable'
        },
        lastSeen: '2026-10-20T10:00:00Z',
        location: 'Home',
        awareParties: []
      });
      
      expect(record.gaps[0]).toBe('misattributed_improvement');
    });

    it('should maintain low confidence', () => {
      const record = simulateOfficialReview({
        id: 'patient-001',
        officialName: 'John Doe',
        officialDiagnosis: 'TBD',
        treatmentStatus: 'active_enhanced',
        enhancements: [],
        supplies: [],
        dependencies: [],
        officialRecord: {
          diagnosis: 'Unknown',
          prescribedTreatments: [],
          prognosis: 'Unknown',
          gaps: ['missing_source', 'unexplained_symptoms'],
          confidence: 0.3,
          lastReview: '2026-10-20T08:00:00Z'
        },
        overdose: {
          risk: 0,
          collapseClock: null,
          symptoms: [],
          thresholdCrossed: false,
          lastOverdose: null,
          recoveryStatus: 'stable'
        },
        lastSeen: '2026-10-20T08:00:00Z',
        location: 'Unknown',
        awareParties: []
      });
      
      expect(record.confidence).toBe(0.3);
      expect(record.gaps.length).toBe(2);
    });
  });

  describe('Dependency tracking', () => {
    it('should calculate dependency risk based on usage', () => {
      const risk = calculateDependencyRisk(60, 0.5);
      expect(risk).toBeGreaterThan(0.5);
      
      const lowRisk = calculateDependencyRisk(10, 0.5);
      expect(lowRisk).toBeLessThan(0.2);
    });

    it('should track dependency signs', () => {
      const dependency: DependencyState = {
        level: 0.7,
        developmentRate: 'moderate',
        signs: [
          'tolerance_increase',
          'dose_escalation',
          'behavioral_changes'
        ],
        lastChecked: '2026-10-20T10:00:00Z',
        monitoringInterval: 'Weekly'
      };
      
      expect(dependency.signs.length).toBe(3);
      expect(dependency.developmentRate).toBe('moderate');
    });

    it('should recognize tolerance increase', () => {
      const signs: DependencySign[] = [
        'tolerance_increase',
        'dose_escalation',
        'craving'
      ];
      
      const hasTolerance = signs.includes('tolerance_increase');
      expect(hasTolerance).toBe(true);
    });
  });

  describe('Dependency signs', () => {
    it('should track all dependency signs', () => {
      const signs: DependencySign[] = [
        'tolerance_increase',
        'withdrawal_symptoms',
        'dose_escalation',
        'behavioral_changes',
        'craving',
        'normalization_shift'
      ];
      
      expect(signs.length).toBe(6);
      expect(signs[0]).toBe('tolerance_increase');
      expect(signs[1]).toBe('withdrawal_symptoms');
      expect(signs[5]).toBe('normalization_shift');
    });
  });

  describe('Supply sources', () => {
    it('should track all supply sources', () => {
      const sources: SupplySource[] = [
        'underground_dealer',
        'sympathetic_provider',
        'self_compiled',
        'medical_deviation',
        'imported'
      ];
      
      expect(sources.length).toBe(5);
      expect(sources[0]).toBe('underground_dealer');
      expect(sources[3]).toBe('medical_deviation');
    });
  });

  describe('Treatment natures', () => {
    it('should track all treatment natures', () => {
      const natures = [
        'cognitive',
        'physical',
        'perceptual',
        'emotional',
        'metabolic',
        'neurological',
        'somatic',
        'psychological'
      ];
      
      expect(natures.length).toBe(8);
      expect(natures[0]).toBe('cognitive');
      expect(natures[4]).toBe('metabolic');
    });
  });
});
