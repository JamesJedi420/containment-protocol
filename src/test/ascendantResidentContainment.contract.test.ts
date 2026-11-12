import { describe, expect, it } from 'vitest'
import {
  ASCENDANT_FACILITY_ID,
  evaluateSupervisedResidentAccess,
  projectAscendantResidentProfile,
  projectFacilityResidentRoster,
  projectResidentBreachEscalation,
} from '../domain/ascendantResidentContainment'

const baseResident = {
  facilityId: ASCENDANT_FACILITY_ID,
  residentId: 'resident:a',
  manifestationPath: 'partial' as const,
  escalationPath: 'slow_build' as const,
  containmentStatus: 'secured' as const,
  careStatus: 'routine' as const,
  cooperation: 'cooperative' as const,
  movementPermission: 'escorted_shared' as const,
  physicalRiskLow: false,
  beneficialAnomaly: false,
  externalPressureActive: false,
}

describe('SPE-791 ascendant-resident containment', () => {
  it('hosts multiple residents with divergent manifestation and escalation paths', () => {
    const roster = projectFacilityResidentRoster({
      facilityId: ASCENDANT_FACILITY_ID,
      residents: [
        { ...baseResident, residentId: 'resident:a', manifestationPath: 'latent' },
        {
          ...baseResident,
          residentId: 'resident:b',
          manifestationPath: 'emergent',
          escalationPath: 'volatile_spike',
          cooperation: 'resistant',
        },
      ],
    })
    expect(roster).toMatchObject({
      residentCount: 2,
      hostsMultipleDivergentResidents: true,
    })
  })

  it('separates containment, care, cooperation, and movement while deriving posture', () => {
    const ally = projectAscendantResidentProfile(baseResident)
    expect(ally).toMatchObject({
      statesSeparated: true,
      posture: 'ally',
      containmentStatus: 'secured',
      careStatus: 'routine',
      cooperation: 'cooperative',
      movementPermission: 'escorted_shared',
    })

    expect(
      projectAscendantResidentProfile({
        ...baseResident,
        residentId: 'resident:threat',
        cooperation: 'resistant',
        escalationPath: 'volatile_spike',
      })
    ).toMatchObject({ posture: 'threat' })

    expect(
      projectAscendantResidentProfile({
        ...baseResident,
        residentId: 'resident:pressured',
        cooperation: 'guarded',
        externalPressureActive: true,
      })
    ).toMatchObject({ posture: 'manipulated_asset' })
  })

  it('creates strategic pressure for low physical-risk beneficial residents', () => {
    expect(
      projectAscendantResidentProfile({
        ...baseResident,
        residentId: 'resident:secrecy',
        physicalRiskLow: true,
        beneficialAnomaly: true,
        cooperation: 'guarded',
      })
    ).toMatchObject({
      strategicPressure: 'secrecy_burden',
      posture: 'neutral',
    })

    expect(
      projectAscendantResidentProfile({
        ...baseResident,
        residentId: 'resident:theft',
        physicalRiskLow: true,
        beneficialAnomaly: true,
        escalationPath: 'strategic_pressure',
        cooperation: 'cooperative',
      })
    ).toMatchObject({
      strategicPressure: 'theft_demand',
    })

    expect(
      projectAscendantResidentProfile({
        ...baseResident,
        residentId: 'resident:misuse',
        physicalRiskLow: true,
        beneficialAnomaly: true,
        escalationPath: 'slow_build',
        cooperation: 'cooperative',
      })
    ).toMatchObject({
      strategicPressure: 'misuse_temptation',
    })

    expect(
      projectAscendantResidentProfile({
        ...baseResident,
        residentId: 'resident:volatile-ally-frame',
        cooperation: 'cooperative',
        escalationPath: 'volatile_spike',
      })
    ).toMatchObject({ posture: 'threat' })
  })

  it('enforces supervised zone access with escort rules', () => {
    expect(
      evaluateSupervisedResidentAccess({
        facilityId: ASCENDANT_FACILITY_ID,
        residentId: 'resident:a',
        containmentStatus: 'secured',
        movementPermission: 'escorted_shared',
        requestedZone: 'shared',
        escortPresent: true,
      })
    ).toMatchObject({ accessGranted: true, denialReason: 'none' })

    expect(
      evaluateSupervisedResidentAccess({
        facilityId: ASCENDANT_FACILITY_ID,
        residentId: 'resident:a',
        containmentStatus: 'secured',
        movementPermission: 'escorted_shared',
        requestedZone: 'recreation',
        escortPresent: true,
      })
    ).toMatchObject({ accessGranted: true, denialReason: 'none' })

    expect(
      evaluateSupervisedResidentAccess({
        facilityId: ASCENDANT_FACILITY_ID,
        residentId: 'resident:a',
        containmentStatus: 'secured',
        movementPermission: 'escorted_shared',
        requestedZone: 'public',
        escortPresent: true,
      })
    ).toMatchObject({
      accessGranted: false,
      denialReason: 'zone_not_permitted',
    })

    expect(
      evaluateSupervisedResidentAccess({
        facilityId: ASCENDANT_FACILITY_ID,
        residentId: 'resident:a',
        containmentStatus: 'secured',
        movementPermission: 'escorted_shared',
        requestedZone: 'shared',
        escortPresent: false,
      })
    ).toMatchObject({
      accessGranted: false,
      denialReason: 'escort_required',
    })
  })

  it('rejects roster duplicates and cross-facility residents', () => {
    expect(
      projectFacilityResidentRoster({
        facilityId: ASCENDANT_FACILITY_ID,
        residents: [
          { ...baseResident, residentId: 'resident:a' },
          { ...baseResident, residentId: 'resident:a', manifestationPath: 'emergent' },
        ],
      })
    ).toBeUndefined()

    expect(
      projectFacilityResidentRoster({
        facilityId: ASCENDANT_FACILITY_ID,
        residents: [
          {
            ...baseResident,
            facilityId: 'facility:other',
            residentId: 'resident:x',
          },
        ],
      })
    ).toBeUndefined()
  })

  it('links breach/escape to an external case rather than local-only escape', () => {
    expect(
      projectResidentBreachEscalation({
        facilityId: ASCENDANT_FACILITY_ID,
        residentId: 'resident:a',
        containmentStatus: 'escaped',
        externalCaseId: 'case:external-linked',
        manipulated: true,
      })
    ).toMatchObject({
      breachActive: true,
      externalIncidentLinked: true,
      localOnlyEscape: false,
      posture: 'manipulated_asset',
    })

    expect(
      projectResidentBreachEscalation({
        facilityId: ASCENDANT_FACILITY_ID,
        residentId: 'resident:a',
        containmentStatus: 'secured',
        externalCaseId: 'case:external-linked',
        manipulated: false,
      })
    ).toBeUndefined()
  })

  it('fails closed on malformed packets', () => {
    expect(projectAscendantResidentProfile(null)).toBeUndefined()
    expect(evaluateSupervisedResidentAccess(null)).toBeUndefined()
    expect(projectResidentBreachEscalation(null)).toBeUndefined()
    expect(projectFacilityResidentRoster(null)).toBeUndefined()
  })
})
