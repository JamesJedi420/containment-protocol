import { describe, expect, it } from 'vitest'
import {
  HOSTILE_ACTUATOR_FACILITY_ID,
  evaluateRescueRouteChoice,
  projectContestedRescueWindow,
  projectGeometryRoutingHazard,
  projectHostileActuatorEvent,
  projectUtilityControlRescueEffect,
} from '../domain/hostileFacilityActuator'

describe('SPE-1015 hostile facility-actuator system', () => {
  it('weaponizes ordinary infrastructure without a visible attacker', () => {
    expect(
      projectHostileActuatorEvent({
        facilityId: HOSTILE_ACTUATOR_FACILITY_ID,
        roomId: 'room:bath-3',
        actuators: ['faucet', 'drain', 'door', 'room_seal'],
        hazardKind: 'rising_water',
        visibleAttackerPresent: false,
        coordinatedPlumbingAssault: true,
      })
    ).toMatchObject({
      weaponizedThroughInfrastructure: true,
      requiresVisibleAttacker: false,
      coordinatedEvent: true,
      actuatorCount: 4,
    })
  })

  it('exposes a contested rescue window for vertical/drowning hazards', () => {
    expect(
      projectContestedRescueWindow({
        facilityId: HOSTILE_ACTUATOR_FACILITY_ID,
        roomId: 'room:shaft',
        hazardKind: 'vertical_fall',
        gripLost: true,
        rescueWindowOpen: true,
        contested: true,
      })
    ).toMatchObject({
      meaningfulRescueWindow: true,
      gripLost: true,
      contested: true,
    })
  })

  it('lets emergency utility controls affect rescue timing and outcome', () => {
    expect(
      projectUtilityControlRescueEffect({
        facilityId: HOSTILE_ACTUATOR_FACILITY_ID,
        controlId: 'util:main-valve',
        controlState: 'accessible',
        rescueWindowOpen: true,
      })
    ).toMatchObject({
      controlUsable: true,
      rescueTimingImproved: true,
      rescueOutcomeBoosted: true,
    })

    expect(
      projectUtilityControlRescueEffect({
        facilityId: HOSTILE_ACTUATOR_FACILITY_ID,
        controlId: 'util:main-valve',
        controlState: 'stuck',
        rescueWindowOpen: true,
      })
    ).toMatchObject({
      controlUsable: false,
      rescueTimingImproved: false,
    })
  })

  it('manipulates routing through facility geometry beyond a single room trap', () => {
    expect(
      projectGeometryRoutingHazard({
        facilityId: HOSTILE_ACTUATOR_FACILITY_ID,
        corridorId: 'corridor:decoy-a',
        forcedDetour: true,
        ingressVector: 'hvac',
        decoyCorridor: true,
      })
    ).toMatchObject({
      manipulatesRouting: true,
      beyondSingleRoomTrap: true,
      ingressVector: 'hvac',
    })
  })

  it('makes rescue outcome depend on response-family choice', () => {
    const base = {
      facilityId: HOSTILE_ACTUATOR_FACILITY_ID,
      roomId: 'room:bath-3',
      availableRoutes: [
        'direct_physical',
        'utility_disablement',
        'purge_response',
      ] as const,
      utilityControlUsable: true,
      physicalReachPossible: false,
    }

    expect(
      evaluateRescueRouteChoice({
        ...base,
        chosenRoute: 'direct_physical',
      })
    ).toMatchObject({
      routeValid: true,
      outcomeDependsOnRouteChoice: true,
      success: false,
    })

    expect(
      evaluateRescueRouteChoice({
        ...base,
        chosenRoute: 'utility_disablement',
      })
    ).toMatchObject({ success: true })

    expect(
      evaluateRescueRouteChoice({
        ...base,
        chosenRoute: 'purge_response',
        purgeKind: 'uv_flood',
      })
    ).toMatchObject({ success: true })
  })

  it('fails closed on malformed packets', () => {
    expect(projectHostileActuatorEvent(null)).toBeUndefined()
    expect(projectContestedRescueWindow(null)).toBeUndefined()
    expect(projectUtilityControlRescueEffect(null)).toBeUndefined()
    expect(projectGeometryRoutingHazard(null)).toBeUndefined()
    expect(evaluateRescueRouteChoice(null)).toBeUndefined()
  })
})
