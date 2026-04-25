import { describe, expect, it } from 'vitest'
import { resolveSiteGenerationStages } from '../domain/siteGeneration'
import {
  PILOT_SITE_PACKETS,
  validatePilotSitePacketCatalog,
  validatePilotSitePacket,
  type PilotSiteGenerationPacket,
} from '../domain/siteGeneration/packets'

function createSequenceRng(values: number[]) {
  let index = 0

  return () => {
    if (index >= values.length) {
      return 0.5
    }

    return values[index++]!
  }
}

describe('site generation layered pipeline', () => {
  it('is deterministic for the same template and rng stream', () => {
    const rngA = createSequenceRng([0.11, 0.75, 0.25, 0.33, 0.66, 0.42, 0.88, 0.04, 0.57, 0.9])
    const rngB = createSequenceRng([0.11, 0.75, 0.25, 0.33, 0.66, 0.42, 0.88, 0.04, 0.57, 0.9])

    const resultA = resolveSiteGenerationStages('mixed_eclipse_ritual', rngA)
    const resultB = resolveSiteGenerationStages('mixed_eclipse_ritual', rngB)

    expect(resultA).toEqual(resultB)
  })

  it('materially changes later outputs when early purpose selection changes', () => {
    const ritualBranch = resolveSiteGenerationStages(
      'mixed_eclipse_ritual',
      createSequenceRng([0.01, 0.4, 0.3, 0.25, 0.2, 0.1, 0.5, 0.6, 0.7])
    )
    const predatorBranch = resolveSiteGenerationStages(
      'mixed_eclipse_ritual',
      createSequenceRng([0.99, 0.4, 0.3, 0.25, 0.2, 0.1, 0.5, 0.6, 0.7])
    )

    expect(ritualBranch).toBeTruthy()
    expect(predatorBranch).toBeTruthy()
    expect(ritualBranch?.stages.purpose).not.toBe(predatorBranch?.stages.purpose)

    expect(ritualBranch?.stages.hazards).not.toEqual(predatorBranch?.stages.hazards)
    expect(ritualBranch?.stages.treasure).not.toEqual(predatorBranch?.stages.treasure)
    expect(ritualBranch?.stages.inhabitants).not.toEqual(predatorBranch?.stages.inhabitants)
  })

  it('keeps the pass-one stage set fully populated for pilot templates', () => {
    const result = resolveSiteGenerationStages(
      'combat_vampire_nest',
      createSequenceRng([0.2, 0.6, 0.4, 0.1, 0.9, 0.3, 0.7, 0.8])
    )

    expect(result).toBeTruthy()
    expect(result?.stages.purpose).toBeTruthy()
    expect(result?.stages.builder).toBeTruthy()
    expect(result?.stages.location).toBeTruthy()
    expect(result?.stages.ingress).toBeTruthy()
    expect(result?.stages.topology).toBeTruthy()
    expect(result?.stages.hazards.length).toBeGreaterThan(0)
    expect(result?.stages.treasure.length).toBeGreaterThan(0)
    expect(result?.stages.inhabitants.length).toBeGreaterThan(0)
  })
})

describe('pilot packet coverage validation', () => {
  it('catalog-level validation passes for shipped pilot packets', () => {
    expect(validatePilotSitePacketCatalog()).toEqual([])
  })

  it('all shipped pilot packets pass full coverage validation', () => {
    for (const packet of PILOT_SITE_PACKETS) {
      expect(validatePilotSitePacket(packet)).toEqual([])
    }
  })

  it('catalog-level validation detects duplicate template ownership', () => {
    const duplicateCatalog: PilotSiteGenerationPacket[] = [
      {
        id: 'packet-a',
        templateIds: ['dup-template'],
        purposes: [{ id: 'ritual_complex', weight: 1 }],
        buildersByPurpose: {
          ritual_complex: [{ id: 'cult_engineers', weight: 1 }],
          predator_nest: [{ id: 'feral_pack', weight: 1 }],
        },
        locationsByPurpose: {
          ritual_complex: [{ id: 'riverfront_substrate', weight: 1 }],
          predator_nest: [{ id: 'stockyard_labyrinth', weight: 1 }],
        },
        ingressByPurposeAndLocation: {
          'ritual_complex|riverfront_substrate': [{ id: 'floodgate', weight: 1 }],
          'ritual_complex|stockyard_labyrinth': [{ id: 'service_door', weight: 1 }],
          'predator_nest|riverfront_substrate': [{ id: 'storm_drain', weight: 1 }],
          'predator_nest|stockyard_labyrinth': [{ id: 'maintenance_shaft', weight: 1 }],
        },
        topologyByIngressAndBuilder: {
          'floodgate|cult_engineers': [{ id: 'concentric_sanctum', weight: 1 }],
          'floodgate|feral_pack': [{ id: 'lure_corridors', weight: 1 }],
          'service_door|cult_engineers': [{ id: 'lure_corridors', weight: 1 }],
          'service_door|feral_pack': [{ id: 'lure_corridors', weight: 1 }],
          'storm_drain|cult_engineers': [{ id: 'collapsed_cells', weight: 1 }],
          'storm_drain|feral_pack': [{ id: 'collapsed_cells', weight: 1 }],
          'maintenance_shaft|cult_engineers': [{ id: 'concentric_sanctum', weight: 1 }],
          'maintenance_shaft|feral_pack': [{ id: 'lure_corridors', weight: 1 }],
        },
        hazardsByPurposeAndTopology: {
          'ritual_complex|concentric_sanctum': [{ id: 'ward_feedback', weight: 1 }],
          'ritual_complex|lure_corridors': [{ id: 'ritual_backwash', weight: 1 }],
          'ritual_complex|collapsed_cells': [{ id: 'structural_fall', weight: 1 }],
          'predator_nest|concentric_sanctum': [{ id: 'predator_ambush', weight: 1 }],
          'predator_nest|lure_corridors': [{ id: 'blood_traps', weight: 1 }],
          'predator_nest|collapsed_cells': [{ id: 'structural_fall', weight: 1 }],
        },
        treasureByPurposeAndLocation: {
          'ritual_complex|riverfront_substrate': [{ id: 'sealed_reliquary', weight: 1 }],
          'ritual_complex|stockyard_labyrinth': [{ id: 'rite_ledger', weight: 1 }],
          'predator_nest|riverfront_substrate': [{ id: 'feeding_cache', weight: 1 }],
          'predator_nest|stockyard_labyrinth': [{ id: 'smuggled_cache', weight: 1 }],
        },
        inhabitantsByPurposeAndBuilder: {
          'ritual_complex|cult_engineers': [{ id: 'ritual_adepts', weight: 1 }],
          'ritual_complex|feral_pack': [{ id: 'bound_sentinels', weight: 1 }],
          'predator_nest|cult_engineers': [{ id: 'captured_witnesses', weight: 1 }],
          'predator_nest|feral_pack': [{ id: 'feral_packmates', weight: 1 }],
        },
        topologySpatialProfiles: {
          concentric_sanctum: {
            siteLayer: 'interior',
            visibilityState: 'obstructed',
            transitionType: 'threshold',
            spatialFlags: [],
          },
          lure_corridors: {
            siteLayer: 'transition',
            visibilityState: 'obstructed',
            transitionType: 'chokepoint',
            spatialFlags: [],
          },
          collapsed_cells: {
            siteLayer: 'interior',
            visibilityState: 'exposed',
            transitionType: 'open-approach',
            spatialFlags: [],
          },
        },
      },
      {
        id: 'packet-b',
        templateIds: ['dup-template'],
        purposes: [{ id: 'ritual_complex', weight: 1 }],
        buildersByPurpose: {
          ritual_complex: [{ id: 'cult_engineers', weight: 1 }],
          predator_nest: [{ id: 'feral_pack', weight: 1 }],
        },
        locationsByPurpose: {
          ritual_complex: [{ id: 'riverfront_substrate', weight: 1 }],
          predator_nest: [{ id: 'stockyard_labyrinth', weight: 1 }],
        },
        ingressByPurposeAndLocation: {
          'ritual_complex|riverfront_substrate': [{ id: 'floodgate', weight: 1 }],
          'ritual_complex|stockyard_labyrinth': [{ id: 'service_door', weight: 1 }],
          'predator_nest|riverfront_substrate': [{ id: 'storm_drain', weight: 1 }],
          'predator_nest|stockyard_labyrinth': [{ id: 'maintenance_shaft', weight: 1 }],
        },
        topologyByIngressAndBuilder: {
          'floodgate|cult_engineers': [{ id: 'concentric_sanctum', weight: 1 }],
          'floodgate|feral_pack': [{ id: 'lure_corridors', weight: 1 }],
          'service_door|cult_engineers': [{ id: 'lure_corridors', weight: 1 }],
          'service_door|feral_pack': [{ id: 'lure_corridors', weight: 1 }],
          'storm_drain|cult_engineers': [{ id: 'collapsed_cells', weight: 1 }],
          'storm_drain|feral_pack': [{ id: 'collapsed_cells', weight: 1 }],
          'maintenance_shaft|cult_engineers': [{ id: 'concentric_sanctum', weight: 1 }],
          'maintenance_shaft|feral_pack': [{ id: 'lure_corridors', weight: 1 }],
        },
        hazardsByPurposeAndTopology: {
          'ritual_complex|concentric_sanctum': [{ id: 'ward_feedback', weight: 1 }],
          'ritual_complex|lure_corridors': [{ id: 'ritual_backwash', weight: 1 }],
          'ritual_complex|collapsed_cells': [{ id: 'structural_fall', weight: 1 }],
          'predator_nest|concentric_sanctum': [{ id: 'predator_ambush', weight: 1 }],
          'predator_nest|lure_corridors': [{ id: 'blood_traps', weight: 1 }],
          'predator_nest|collapsed_cells': [{ id: 'structural_fall', weight: 1 }],
        },
        treasureByPurposeAndLocation: {
          'ritual_complex|riverfront_substrate': [{ id: 'sealed_reliquary', weight: 1 }],
          'ritual_complex|stockyard_labyrinth': [{ id: 'rite_ledger', weight: 1 }],
          'predator_nest|riverfront_substrate': [{ id: 'feeding_cache', weight: 1 }],
          'predator_nest|stockyard_labyrinth': [{ id: 'smuggled_cache', weight: 1 }],
        },
        inhabitantsByPurposeAndBuilder: {
          'ritual_complex|cult_engineers': [{ id: 'ritual_adepts', weight: 1 }],
          'ritual_complex|feral_pack': [{ id: 'bound_sentinels', weight: 1 }],
          'predator_nest|cult_engineers': [{ id: 'captured_witnesses', weight: 1 }],
          'predator_nest|feral_pack': [{ id: 'feral_packmates', weight: 1 }],
        },
        topologySpatialProfiles: {
          concentric_sanctum: {
            siteLayer: 'interior',
            visibilityState: 'obstructed',
            transitionType: 'threshold',
            spatialFlags: [],
          },
          lure_corridors: {
            siteLayer: 'transition',
            visibilityState: 'obstructed',
            transitionType: 'chokepoint',
            spatialFlags: [],
          },
          collapsed_cells: {
            siteLayer: 'interior',
            visibilityState: 'exposed',
            transitionType: 'open-approach',
            spatialFlags: [],
          },
        },
      },
    ]

    const errors = validatePilotSitePacketCatalog(duplicateCatalog)

    expect(errors.some((e) => e.includes('duplicate template mapping'))).toBe(true)
  })

  it('detects a missing ingress combo in a deliberately incomplete packet', () => {
    const incomplete: PilotSiteGenerationPacket = {
      id: 'test-incomplete.v0',
      templateIds: [],
      purposes: [{ id: 'ritual_complex', weight: 10 }],
      buildersByPurpose: {
        ritual_complex: [{ id: 'cult_engineers', weight: 10 }],
        predator_nest: [],
      },
      locationsByPurpose: {
        ritual_complex: [{ id: 'riverfront_substrate', weight: 10 }],
        predator_nest: [],
      },
      // Missing 'ritual_complex|riverfront_substrate' ingress entry
      ingressByPurposeAndLocation: {} as PilotSiteGenerationPacket['ingressByPurposeAndLocation'],
      topologyByIngressAndBuilder: {} as PilotSiteGenerationPacket['topologyByIngressAndBuilder'],
      hazardsByPurposeAndTopology: {} as PilotSiteGenerationPacket['hazardsByPurposeAndTopology'],
      treasureByPurposeAndLocation: {} as PilotSiteGenerationPacket['treasureByPurposeAndLocation'],
      inhabitantsByPurposeAndBuilder:
        {} as PilotSiteGenerationPacket['inhabitantsByPurposeAndBuilder'],
      topologySpatialProfiles: {} as PilotSiteGenerationPacket['topologySpatialProfiles'],
    }

    const errors = validatePilotSitePacket(incomplete)

    expect(errors.some((e) => e.includes('ingressByPurposeAndLocation'))).toBe(true)
    expect(errors.some((e) => e.includes('ritual_complex|riverfront_substrate'))).toBe(true)
  })

  it('returns an error when purposes array is empty', () => {
    const empty: PilotSiteGenerationPacket = {
      id: 'test-empty.v0',
      templateIds: [],
      purposes: [],
      buildersByPurpose: {} as PilotSiteGenerationPacket['buildersByPurpose'],
      locationsByPurpose: {} as PilotSiteGenerationPacket['locationsByPurpose'],
      ingressByPurposeAndLocation: {} as PilotSiteGenerationPacket['ingressByPurposeAndLocation'],
      topologyByIngressAndBuilder: {} as PilotSiteGenerationPacket['topologyByIngressAndBuilder'],
      hazardsByPurposeAndTopology: {} as PilotSiteGenerationPacket['hazardsByPurposeAndTopology'],
      treasureByPurposeAndLocation: {} as PilotSiteGenerationPacket['treasureByPurposeAndLocation'],
      inhabitantsByPurposeAndBuilder:
        {} as PilotSiteGenerationPacket['inhabitantsByPurposeAndBuilder'],
      topologySpatialProfiles: {} as PilotSiteGenerationPacket['topologySpatialProfiles'],
    }

    expect(validatePilotSitePacket(empty)).toContain('test-empty.v0: purposes array is empty')
  })
})
