import { describe, expect, it } from 'vitest'
import {
  DEGRADED_CARE_FACILITY_ID,
  projectCareScheduleAudit,
  projectDegradedCareRisk,
  projectHiddenZoneActivation,
  projectRecoveryTransferThreat,
  projectResidentAgency,
  projectUnevenStaffKnowledge,
} from '../domain/degradedCareFacilityRisk'

describe('SPE-1012 degraded-care facility risk', () => {
  it('amplifies anomaly risk versus baseline under degraded conditions', () => {
    const risk = projectDegradedCareRisk({
      facilityId: DEGRADED_CARE_FACILITY_ID,
      understaffed: true,
      deferredMaintenance: true,
      intermittentMedicalCoverage: true,
      officialQualityClaim: 'excellent',
      observedFloorCondition: 'neglect',
      baselineAnomalyRisk: 'baseline',
    })
    expect(risk).toMatchObject({
      amplifiesVsBaseline: true,
      effectiveAnomalyRisk: 'critical',
      qualityClaimContradiction: true,
    })
  })

  it('marks partially closed zones as operationally important when activated', () => {
    expect(
      projectHiddenZoneActivation({
        facilityId: DEGRADED_CARE_FACILITY_ID,
        zoneId: 'zone:west-wing',
        zoneKind: 'partially_closed',
        partiallyClosed: false,
        activatedUse: 'anomaly_habitat',
      })
    ).toMatchObject({
      operationallyImportant: true,
      activatedUse: 'anomaly_habitat',
    })

    expect(
      projectHiddenZoneActivation({
        facilityId: DEGRADED_CARE_FACILITY_ID,
        zoneId: 'zone:idle',
        zoneKind: 'partially_closed',
        partiallyClosed: true,
        activatedUse: 'none',
      })
    ).toMatchObject({ operationallyImportant: false })
  })

  it('treats vulnerable residents as meaningful case actors', () => {
    expect(
      projectResidentAgency({
        facilityId: DEGRADED_CARE_FACILITY_ID,
        residentId: 'resident:witness',
        agencyRole: 'witness',
        hidesSupplies: false,
        warnsInvestigators: true,
      })
    ).toMatchObject({
      activeParticipant: true,
      meaningfulCaseActor: true,
    })
  })

  it('audits care-schedule failures as systemic neglect', () => {
    expect(
      projectCareScheduleAudit({
        facilityId: DEGRADED_CARE_FACILITY_ID,
        failures: ['skipped_meal', 'handoff_neglect', 'skipped_meal'],
      })
    ).toMatchObject({
      failureCount: 2,
      systemicNeglect: true,
      isolatedFlavorOnly: false,
    })
  })

  it('keeps threat when symbolic or haunting pressure survives clinical transfer', () => {
    expect(
      projectRecoveryTransferThreat({
        facilityId: DEGRADED_CARE_FACILITY_ID,
        caseId: 'case:transfer-1',
        transferKind: 'hospital',
        symbolicPressureActive: true,
        hauntingLinkedPressureActive: false,
        preTransferThreat: 'elevated',
      })
    ).toMatchObject({
      postTransferThreat: 'elevated',
      threatReduced: false,
      clinicalTransferInsufficient: true,
    })

    expect(
      projectRecoveryTransferThreat({
        facilityId: DEGRADED_CARE_FACILITY_ID,
        caseId: 'case:transfer-2',
        transferKind: 'recovery_room',
        symbolicPressureActive: false,
        hauntingLinkedPressureActive: false,
        preTransferThreat: 'elevated',
      })
    ).toMatchObject({
      postTransferThreat: 'baseline',
      threatReduced: true,
      clinicalTransferInsufficient: false,
    })
  })

  it('keeps institutional knowledge uneven across roles', () => {
    expect(
      projectUnevenStaffKnowledge({
        facilityId: DEGRADED_CARE_FACILITY_ID,
        role: 'administrator',
        knowsOfficialClaim: true,
        knowsFloorNeglect: false,
        knowsHiddenZone: false,
      })
    ).toMatchObject({
      knowledgeFragmentCount: 1,
      unevenInstitutionalKnowledge: true,
    })

    expect(
      projectUnevenStaffKnowledge({
        facilityId: DEGRADED_CARE_FACILITY_ID,
        role: 'doctor',
        knowsOfficialClaim: true,
        knowsFloorNeglect: true,
        knowsHiddenZone: true,
      })
    ).toMatchObject({
      knowledgeFragmentCount: 3,
      unevenInstitutionalKnowledge: false,
    })
  })

  it('covers non-amplifying and non-contradiction baselines', () => {
    expect(
      projectDegradedCareRisk({
        facilityId: DEGRADED_CARE_FACILITY_ID,
        understaffed: false,
        deferredMaintenance: false,
        intermittentMedicalCoverage: false,
        officialQualityClaim: 'adequate',
        observedFloorCondition: 'stable',
        baselineAnomalyRisk: 'baseline',
      })
    ).toMatchObject({
      amplifiesVsBaseline: false,
      qualityClaimContradiction: false,
      effectiveAnomalyRisk: 'baseline',
    })

    expect(
      projectDegradedCareRisk({
        facilityId: DEGRADED_CARE_FACILITY_ID,
        understaffed: true,
        deferredMaintenance: false,
        intermittentMedicalCoverage: false,
        officialQualityClaim: 'excellent',
        observedFloorCondition: 'stable',
        baselineAnomalyRisk: 'baseline',
      })
    ).toMatchObject({
      qualityClaimContradiction: true,
      amplifiesVsBaseline: true,
    })

    expect(
      projectResidentAgency({
        facilityId: DEGRADED_CARE_FACILITY_ID,
        residentId: 'resident:passive',
        agencyRole: 'passive',
        hidesSupplies: false,
        warnsInvestigators: false,
      })
    ).toMatchObject({ meaningfulCaseActor: false })

    expect(
      projectCareScheduleAudit({
        facilityId: DEGRADED_CARE_FACILITY_ID,
        failures: [],
      })
    ).toMatchObject({ systemicNeglect: false, failureCount: 0 })
  })

  it('fails closed on malformed packets', () => {
    expect(projectDegradedCareRisk(null)).toBeUndefined()
    expect(projectHiddenZoneActivation(null)).toBeUndefined()
    expect(projectResidentAgency(null)).toBeUndefined()
    expect(projectCareScheduleAudit(null)).toBeUndefined()
    expect(projectRecoveryTransferThreat(null)).toBeUndefined()
    expect(projectUnevenStaffKnowledge(null)).toBeUndefined()
  })
})
