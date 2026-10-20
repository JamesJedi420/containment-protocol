import { describe, expect, it } from 'vitest'
import {
  AUTOMATION_FACILITY_ID,
  evaluateAnomalyContainmentCompatibility,
  evaluateManualVsAutomaticResponse,
  evaluateTrafficDiscrimination,
  projectCountermeasureResetBurden,
  projectCountermeasureStateCommandChain,
  projectLureRouting,
  projectQuietDegradation,
} from '../domain/facilityAutomationReset'

describe('SPE-1021 facility automation and countermeasure reset layer', () => {
  it('runs an explicit open/close/seal/purge command chain (not generic activate)', () => {
    expect(
      projectCountermeasureStateCommandChain({
        facilityId: AUTOMATION_FACILITY_ID,
        deviceId: 'device:cell-gate-3',
        triggerSourceId: 'sensor:motion-bay',
        commands: ['close', 'seal', 'isolate', 'purge'],
      })
    ).toMatchObject({
      usesExplicitStateCommands: true,
      genericActivation: false,
      commandCount: 4,
      commands: ['close', 'seal', 'isolate', 'purge'],
    })

    expect(
      projectCountermeasureStateCommandChain({
        facilityId: AUTOMATION_FACILITY_ID,
        deviceId: 'device:cell-gate-3',
        triggerSourceId: 'sensor:motion-bay',
        commands: ['activate'],
      })
    ).toBeUndefined()
  })

  it('trades manual selectivity against automatic speed under ambiguous traffic', () => {
    expect(
      evaluateManualVsAutomaticResponse({
        facilityId: AUTOMATION_FACILITY_ID,
        deviceId: 'device:corridor-seal',
        controlMode: 'manual',
        trafficAmbiguous: true,
      })
    ).toMatchObject({
      responseFaster: false,
      responseMoreSelective: true,
      errorProneUnderAmbiguousTraffic: false,
      automationStrictlySafer: false,
    })

    expect(
      evaluateManualVsAutomaticResponse({
        facilityId: AUTOMATION_FACILITY_ID,
        deviceId: 'device:corridor-seal',
        controlMode: 'automatic',
        trafficAmbiguous: true,
      })
    ).toMatchObject({
      responseFaster: true,
      responseMoreSelective: false,
      errorProneUnderAmbiguousTraffic: true,
      automationStrictlySafer: false,
    })
  })

  it('requires reset burden before a fired countermeasure can arm again', () => {
    expect(
      projectCountermeasureResetBurden({
        facilityId: AUTOMATION_FACILITY_ID,
        deviceId: 'device:purge-nozzle',
        resetProfile: 'single_use',
        alreadyFired: true,
        consumableAvailable: true,
        staffResetAvailable: true,
      })
    ).toMatchObject({
      readyToFireAgain: false,
      resetBurdenRequired: true,
      freeImmediateRefire: false,
    })

    expect(
      projectCountermeasureResetBurden({
        facilityId: AUTOMATION_FACILITY_ID,
        deviceId: 'device:purge-nozzle',
        resetProfile: 'consumable_fed',
        alreadyFired: true,
        consumableAvailable: false,
        staffResetAvailable: true,
      })
    ).toMatchObject({
      readyToFireAgain: false,
      resetBurdenRequired: true,
    })

    expect(
      projectCountermeasureResetBurden({
        facilityId: AUTOMATION_FACILITY_ID,
        deviceId: 'device:purge-nozzle',
        resetProfile: 'staff_reset',
        alreadyFired: true,
        consumableAvailable: true,
        staffResetAvailable: true,
      })
    ).toMatchObject({
      readyToFireAgain: true,
      resetBurdenRequired: true,
      freeImmediateRefire: false,
    })
  })

  it('degrades quietly and recovers via inspection before catastrophic reveal', () => {
    expect(
      projectQuietDegradation({
        facilityId: AUTOMATION_FACILITY_ID,
        deviceId: 'device:hinge-seal',
        fault: 'warped_hinge',
        crisisActive: false,
        inspectionCompleted: false,
      })
    ).toMatchObject({
      quietDegradation: true,
      hiddenUntilCrisisOrInspection: true,
      recoverableViaInspection: false,
      catastrophicReveal: false,
    })

    expect(
      projectQuietDegradation({
        facilityId: AUTOMATION_FACILITY_ID,
        deviceId: 'device:hinge-seal',
        fault: 'warped_hinge',
        crisisActive: false,
        inspectionCompleted: true,
      })
    ).toMatchObject({
      recoverableViaInspection: true,
      catastrophicReveal: false,
    })

    expect(
      projectQuietDegradation({
        facilityId: AUTOMATION_FACILITY_ID,
        deviceId: 'device:hinge-seal',
        fault: 'dead_battery',
        crisisActive: true,
        inspectionCompleted: false,
      })
    ).toMatchObject({
      catastrophicReveal: true,
      recoverableViaInspection: false,
    })
  })

  it('lets an anomaly class resist containment until a prerequisite debuff is met', () => {
    expect(
      evaluateAnomalyContainmentCompatibility({
        facilityId: AUTOMATION_FACILITY_ID,
        deviceId: 'device:binding-cage',
        anomalyClassId: 'class:unbound-shade',
        requiredDebuff: 'naming',
        activeDebuffs: ['reveal'],
      })
    ).toMatchObject({
      containmentHolds: false,
      resistsUntilPrerequisite: true,
      universalCellAssumed: false,
    })

    expect(
      evaluateAnomalyContainmentCompatibility({
        facilityId: AUTOMATION_FACILITY_ID,
        deviceId: 'device:binding-cage',
        anomalyClassId: 'class:unbound-shade',
        requiredDebuff: 'naming',
        activeDebuffs: ['reveal', 'naming'],
      })
    ).toMatchObject({
      containmentHolds: true,
      resistsUntilPrerequisite: false,
    })
  })

  it('false-triggers on legitimate traffic when discrimination or routing is poor', () => {
    expect(
      evaluateTrafficDiscrimination({
        facilityId: AUTOMATION_FACILITY_ID,
        deviceId: 'device:corridor-seal',
        controlMode: 'automatic',
        trafficKind: 'staff',
        discriminationQuality: 'poor',
        safePathRoutingEnabled: false,
        badgeOrAttunementPresent: false,
      })
    ).toMatchObject({
      falsePositive: true,
      catchesLegitimateTraffic: true,
      trafficSafe: false,
      delayedOrConflicted: true,
    })

    expect(
      evaluateTrafficDiscrimination({
        facilityId: AUTOMATION_FACILITY_ID,
        deviceId: 'device:corridor-seal',
        controlMode: 'manual',
        trafficKind: 'staff',
        discriminationQuality: 'high',
        safePathRoutingEnabled: true,
        badgeOrAttunementPresent: true,
      })
    ).toMatchObject({
      falsePositive: false,
      trafficSafe: true,
    })
  })

  it('routes a non-cruel lure into a capture zone and rejects cruel-harm packets', () => {
    expect(
      projectLureRouting({
        facilityId: AUTOMATION_FACILITY_ID,
        lureKind: 'psychic_beacon',
        targetAnomalyClassId: 'class:hunger-shade',
        captureZoneId: 'zone:capture-pit',
        cruelHarmIntent: false,
      })
    ).toMatchObject({
      pullsIntoCaptureZone: true,
      nonCruel: true,
    })

    expect(
      projectLureRouting({
        facilityId: AUTOMATION_FACILITY_ID,
        lureKind: 'relic_bait',
        targetAnomalyClassId: 'class:hunger-shade',
        captureZoneId: 'zone:capture-pit',
        cruelHarmIntent: true,
      })
    ).toBeUndefined()
  })
})
