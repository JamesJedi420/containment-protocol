import { describe, expect, it } from 'vitest'
import {
  DEFENSE_DOCTRINE_FACILITY_ID,
  evaluateConcentricRingBreach,
  evaluateExteriorLaborRisk,
  evaluateIngressRiskSurface,
  evaluateLayoutIsolationTradeoff,
  evaluateWholeBaseCompoundFailure,
  planThreatClassCoverage,
  projectFortificationProgressionBurden,
  projectHardenedZoneEffect,
  projectPreAttackPreparation,
  projectSecurityPostureCoverage,
} from '../domain/baseDefenseDoctrine'

describe('SPE-1022 base defense doctrine and threat-class coverage matrix', () => {
  it('adds and removes coverage modules when the threat-class profile differs', () => {
    const dreamPlan = planThreatClassCoverage({
      facilityId: DEFENSE_DOCTRINE_FACILITY_ID,
      activeThreatAxes: ['dream_intrusion'],
      configuredModules: ['physical_barrier', 'guard_post'],
    })
    expect(dreamPlan).toMatchObject({
      modulesAdded: ['dream_ward'],
      modulesRemoved: ['physical_barrier'],
      oneProfileCoversAllAxes: false,
    })
    expect(dreamPlan?.resultingModules).toEqual(
      expect.arrayContaining(['dream_ward', 'guard_post'])
    )
    expect(dreamPlan?.resultingModules).not.toContain('physical_barrier')

    const brutePlan = planThreatClassCoverage({
      facilityId: DEFENSE_DOCTRINE_FACILITY_ID,
      activeThreatAxes: ['brute_force_breach'],
      configuredModules: ['dream_ward', 'guard_post'],
    })
    expect(brutePlan).toMatchObject({
      modulesAdded: ['physical_barrier'],
      modulesRemoved: ['dream_ward'],
      oneProfileCoversAllAxes: false,
    })
    expect(brutePlan?.resultingModules).toEqual(
      expect.arrayContaining(['physical_barrier', 'guard_post'])
    )

    const anomalousRetained = planThreatClassCoverage({
      facilityId: DEFENSE_DOCTRINE_FACILITY_ID,
      activeThreatAxes: ['dream_intrusion'],
      configuredModules: ['signal_fog', 'false_hallway', 'safe_door'],
    })
    expect(anomalousRetained?.modulesRemoved).toEqual([])
    expect(anomalousRetained?.resultingModules).toEqual(
      expect.arrayContaining([
        'dream_ward',
        'signal_fog',
        'false_hallway',
        'safe_door',
      ])
    )

    expect(
      planThreatClassCoverage({
        facilityId: DEFENSE_DOCTRINE_FACILITY_ID,
        activeThreatAxes: ['unknown_axis'],
        configuredModules: [],
      })
    ).toBeUndefined()
  })

  it('raises attack surface when expansion adds ingress while improving capability', () => {
    const baseline = evaluateIngressRiskSurface({
      facilityId: DEFENSE_DOCTRINE_FACILITY_ID,
      ingressPoints: ['door', 'dock'],
      capabilityGainUnits: 0,
    })
    expect(baseline).toMatchObject({
      ingressCount: 2,
      attackSurfaceUnits: 2,
      capabilityImproved: false,
      moreIngressAutomaticallySafer: false,
    })

    const expansion = evaluateIngressRiskSurface({
      facilityId: DEFENSE_DOCTRINE_FACILITY_ID,
      ingressPoints: [
        'door',
        'dock',
        'tunnel',
        'uplink',
        'mirror_room',
        'rooftop',
      ],
      capabilityGainUnits: 3,
    })
    expect(expansion).toMatchObject({
      ingressCount: 6,
      attackSurfaceUnits: 6,
      capabilityImproved: true,
      attackSurfaceIncreased: true,
      moreIngressAutomaticallySafer: false,
    })
    expect(expansion!.attackSurfaceUnits).toBeGreaterThan(
      baseline!.attackSurfaceUnits
    )
  })

  it('hardens fixed zones to cut spread damage and raise breach/evac costs', () => {
    expect(
      projectHardenedZoneEffect({
        facilityId: DEFENSE_DOCTRINE_FACILITY_ID,
        zoneId: 'zone:vault-anteroom',
        componentKind: 'fortified_room',
        mobility: 'fixed',
        hardened: true,
      })
    ).toMatchObject({
      spreadDamageReduced: true,
      breachResistanceDelta: 2,
      evacuationCostDelta: 1,
      isFixedDefense: true,
      freeHardening: false,
    })

    expect(
      projectHardenedZoneEffect({
        facilityId: DEFENSE_DOCTRINE_FACILITY_ID,
        zoneId: 'zone:vault-anteroom',
        componentKind: 'barricade',
        mobility: 'mobile_personal',
        hardened: true,
      })
    ).toMatchObject({
      spreadDamageReduced: false,
      breachResistanceDelta: 0,
      isFixedDefense: false,
      freeHardening: false,
    })
  })

  it('scales layered-ring breach severity by rings crossed', () => {
    expect(
      evaluateConcentricRingBreach({
        facilityId: DEFENSE_DOCTRINE_FACILITY_ID,
        outermostBreachedRing: 'public_cover',
        deepestBreachedRing: 'operations',
      })
    ).toMatchObject({
      ringsCrossed: 3,
      breachSeverity: 3,
      reachesDeepVault: false,
    })

    expect(
      evaluateConcentricRingBreach({
        facilityId: DEFENSE_DOCTRINE_FACILITY_ID,
        outermostBreachedRing: 'public_cover',
        deepestBreachedRing: 'deep_vault',
      })
    ).toMatchObject({
      ringsCrossed: 5,
      breachSeverity: 5,
      reachesDeepVault: true,
    })

    expect(
      evaluateConcentricRingBreach({
        facilityId: DEFENSE_DOCTRINE_FACILITY_ID,
        outermostBreachedRing: 'operations',
        deepestBreachedRing: 'operations',
      })
    ).toMatchObject({
      ringsCrossed: 1,
      breachSeverity: 1,
      reachesDeepVault: false,
    })

    expect(
      evaluateConcentricRingBreach({
        facilityId: DEFENSE_DOCTRINE_FACILITY_ID,
        outermostBreachedRing: 'containment',
        deepestBreachedRing: 'public_cover',
      })
    ).toBeUndefined()
  })

  it('treats simultaneous pressures as whole-base compound failure', () => {
    expect(
      evaluateWholeBaseCompoundFailure({
        facilityId: DEFENSE_DOCTRINE_FACILITY_ID,
        activePressures: ['breach'],
      })
    ).toMatchObject({
      pressureCount: 1,
      compoundFailure: false,
      isolatedBreachOnly: true,
    })

    expect(
      evaluateWholeBaseCompoundFailure({
        facilityId: DEFENSE_DOCTRINE_FACILITY_ID,
        activePressures: [
          'breach',
          'media_pressure',
          'staff_exhaustion',
          'inbound_logistics',
        ],
      })
    ).toMatchObject({
      pressureCount: 4,
      compoundFailure: true,
      isolatedBreachOnly: false,
    })
  })

  it('trades operational convenience against cleaner isolation geometry', () => {
    expect(
      evaluateLayoutIsolationTradeoff({
        facilityId: DEFENSE_DOCTRINE_FACILITY_ID,
        layoutGeometry: 'clean_isolation',
      })
    ).toMatchObject({
      isolationCleanliness: 3,
      operationalConvenience: 1,
      tradesConvenienceForIsolation: true,
    })

    expect(
      evaluateLayoutIsolationTradeoff({
        facilityId: DEFENSE_DOCTRINE_FACILITY_ID,
        layoutGeometry: 'branching_convenience',
      })
    ).toMatchObject({
      isolationCleanliness: 1,
      operationalConvenience: 3,
      tradesConvenienceForIsolation: false,
    })
  })

  it('improves pre-attack defense with visible opportunity cost across approaches', () => {
    const single = projectPreAttackPreparation({
      facilityId: DEFENSE_DOCTRINE_FACILITY_ID,
      approaches: ['emergency_drills'],
      contributorCount: 1,
      targetThreatAxis: 'brute_force_breach',
    })
    expect(single).toMatchObject({
      defenseReadinessDelta: 1,
      opportunityCostUnits: 0,
      multiApproachReachable: false,
      invulnerableBunker: false,
    })

    const multi = projectPreAttackPreparation({
      facilityId: DEFENSE_DOCTRINE_FACILITY_ID,
      approaches: [
        'emergency_drills',
        'emplacement_construction',
        'civilian_force_building',
      ],
      contributorCount: 4,
      targetThreatAxis: 'dream_intrusion',
    })
    expect(multi).toMatchObject({
      defenseReadinessDelta: 3,
      opportunityCostUnits: 3,
      multiApproachReachable: true,
      invulnerableBunker: false,
    })
    expect(multi!.defenseReadinessDelta).toBeGreaterThan(
      single!.defenseReadinessDelta
    )
    expect(multi!.opportunityCostUnits).toBeGreaterThan(
      single!.opportunityCostUnits
    )
  })

  it('scales guard coverage by security posture and exterior labor mitigation', () => {
    expect(
      projectSecurityPostureCoverage({
        facilityId: DEFENSE_DOCTRINE_FACILITY_ID,
        posture: 'active',
        guardPostsConfigured: 4,
      })
    ).toMatchObject({
      effectiveGuardCoverage: 4,
      attendedDefense: true,
    })

    expect(
      projectSecurityPostureCoverage({
        facilityId: DEFENSE_DOCTRINE_FACILITY_ID,
        posture: 'skeleton',
        guardPostsConfigured: 4,
      })
    ).toMatchObject({
      effectiveGuardCoverage: 2,
      attendedDefense: true,
    })

    expect(
      projectSecurityPostureCoverage({
        facilityId: DEFENSE_DOCTRINE_FACILITY_ID,
        posture: 'skeleton',
        guardPostsConfigured: 1,
      })
    ).toMatchObject({
      effectiveGuardCoverage: 1,
      attendedDefense: true,
    })

    expect(
      projectSecurityPostureCoverage({
        facilityId: DEFENSE_DOCTRINE_FACILITY_ID,
        posture: 'unattended',
        guardPostsConfigured: 4,
      })
    ).toMatchObject({
      effectiveGuardCoverage: 0,
      attendedDefense: false,
    })

    expect(
      projectSecurityPostureCoverage({
        facilityId: DEFENSE_DOCTRINE_FACILITY_ID,
        posture: 'quarantined',
        guardPostsConfigured: 4,
      })
    ).toMatchObject({
      effectiveGuardCoverage: 0,
      attendedDefense: false,
    })

    expect(
      evaluateExteriorLaborRisk({
        facilityId: DEFENSE_DOCTRINE_FACILITY_ID,
        laborKind: 'rooftop_servicing',
        escortProvided: false,
        shieldingProvided: false,
        remoteAlternative: false,
      })
    ).toMatchObject({
      exteriorExposure: true,
      mitigated: false,
    })

    expect(
      evaluateExteriorLaborRisk({
        facilityId: DEFENSE_DOCTRINE_FACILITY_ID,
        laborKind: 'courier',
        escortProvided: true,
        shieldingProvided: false,
        remoteAlternative: false,
      })
    ).toMatchObject({
      exteriorExposure: true,
      mitigated: true,
    })

    expect(
      evaluateExteriorLaborRisk({
        facilityId: DEFENSE_DOCTRINE_FACILITY_ID,
        laborKind: 'maintenance_crew',
        escortProvided: false,
        shieldingProvided: true,
        remoteAlternative: false,
      })
    ).toMatchObject({
      exteriorExposure: true,
      mitigated: true,
    })
  })

  it('burdens stronger fortification tiers instead of creating an invulnerable bunker', () => {
    expect(
      projectFortificationProgressionBurden({
        facilityId: DEFENSE_DOCTRINE_FACILITY_ID,
        fortificationTier: 3,
      })
    ).toMatchObject({
      breachResistanceDelta: 3,
      maintenanceBurden: 3,
      dependencyBurden: 3,
      auditBurden: 3,
      trustCost: 3,
      logisticsFriction: 3,
      invulnerableBunker: false,
    })
  })
})
