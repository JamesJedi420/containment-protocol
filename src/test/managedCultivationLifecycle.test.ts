import { describe, expect, it } from 'vitest'
import {
  CULTIVATION_PROGRESS_MAX,
  REPRESENTATIVE_CULTIVATION_PROFILES,
  advanceCultivationGrowth,
  createCultivationInstance,
  createEmptyCultivationRegistry,
  cultivationGrowthCadencesEquivalent,
  evaluateCultivationViability,
  getCultivationProfile,
  harvestCultivation,
  projectCultivationHarvestHandoff,
  projectCultivationLaborGate,
  projectCultivationRoomContribution,
  sanitizeManagedCultivationRegistry,
} from '../domain/managedCultivationLifecycle'
import type { SpecialistOperatorSlot } from '../domain/specialistLaborRegistry'
import { projectRoomQualityScores } from '../domain/roomQualityFacilitySatisfaction'

const FIT_REFINER: SpecialistOperatorSlot = {
  roleFamily: 'refinement_technician',
  skillBand: 'competent',
  availabilityBand: 'fit',
}

const FIT_WARD: SpecialistOperatorSlot = {
  roleFamily: 'ward_technician',
  skillBand: 'novice',
  availabilityBand: 'fit',
}

const CLEAN_SOIL = {
  medium: 'soil_bed' as const,
  lightBand: 'standard' as const,
  contaminationBand: 'clean' as const,
}

describe('SPE-3406 managed cultivation lifecycle', () => {
  it('authors materially different profiles including ornamental fixtures', () => {
    const ids = new Set(REPRESENTATIVE_CULTIVATION_PROFILES.map((p) => p.profileId))
    expect(ids.has('cultivation:fast-herb')).toBe(true)
    expect(ids.has('cultivation:slow-grain')).toBe(true)
    expect(ids.has('cultivation:hardy-moss')).toBe(true)
    expect(ids.has('cultivation:ritual-bloom')).toBe(true)
    expect(ids.has('cultivation:ornamental-fern')).toBe(true)
    expect(ids.has('cultivation:ornamental-lantern')).toBe(true)

    const fast = getCultivationProfile('cultivation:fast-herb')!
    const slow = getCultivationProfile('cultivation:slow-grain')!
    expect(fast.growthProgressPerUnit).toBeGreaterThan(slow.growthProgressPerUnit)
    expect(fast.harvestOutput!.quantity).toBeLessThan(slow.harvestOutput!.quantity)
    expect(getCultivationProfile('cultivation:ornamental-fern')!.harvestOutput).toBeNull()
  })

  it('blocks incompatible medium and keeps hardy moss viable under elevated contamination', () => {
    const ritual = getCultivationProfile('cultivation:ritual-bloom')!
    const blocked = evaluateCultivationViability(ritual, {
      medium: 'soil_bed',
      lightBand: 'bright',
      contaminationBand: 'clean',
    })
    expect(blocked.viability).toBe('nonviable')
    expect(blocked.reasonCodes).toContain('medium_incompatible')

    const moss = getCultivationProfile('cultivation:hardy-moss')!
    const hardy = evaluateCultivationViability(moss, {
      medium: 'soil_bed',
      lightBand: 'dim',
      contaminationBand: 'elevated',
    })
    expect(hardy.viability).toBe('viable')

    const herb = getCultivationProfile('cultivation:fast-herb')!
    const sensitive = evaluateCultivationViability(herb, {
      medium: 'soil_bed',
      lightBand: 'standard',
      contaminationBand: 'elevated',
    })
    expect(sensitive.viability).toBe('nonviable')
    expect(sensitive.reasonCodes).toContain('contamination_intolerant')
  })

  it('declares SPE-1058 labor demand without inventing a parallel workforce', () => {
    const profile = getCultivationProfile('cultivation:fast-herb')!
    const operable = projectCultivationLaborGate(profile, [FIT_REFINER])
    expect(operable.gateOutcome).toBe('operable')
    expect(operable.requiredRoleFamily).toBe('refinement_technician')

    const stalled = projectCultivationLaborGate(profile, [FIT_WARD])
    expect(stalled.gateOutcome).toBe('stalled')

    const created = createCultivationInstance({
      instanceId: 'plot:1',
      profileId: profile.profileId,
      environment: CLEAN_SOIL,
      operators: [FIT_WARD],
    })
    expect(created?.lifecycleState).toBe('blocked')
    expect(created?.reasonCodes).toContain('labor_stalled')
  })

  it('advances growth deterministically via SPE-3384 with fine/coarse cadence equivalence', () => {
    const profile = getCultivationProfile('cultivation:fast-herb')!
    expect(cultivationGrowthCadencesEquivalent(profile, 10, 10)).toBe(true)
    expect(cultivationGrowthCadencesEquivalent(profile, 10, 1)).toBe(true)

    let instance = createCultivationInstance({
      instanceId: 'plot:2',
      profileId: profile.profileId,
      environment: CLEAN_SOIL,
      operators: [FIT_REFINER],
    })!
    expect(instance.lifecycleState).toBe('viable')

    instance = advanceCultivationGrowth({
      instance,
      environment: CLEAN_SOIL,
      elapsedUnits: 1,
      operators: [FIT_REFINER],
    })!
    expect(instance.lifecycleState).toBe('growing')
    expect(instance.progress).toBeGreaterThan(0)

    // 500 milli/unit * 2 units = 1000 progress → mature
    instance = advanceCultivationGrowth({
      instance: {
        ...instance,
        progress: 0,
        remainderMilli: 0,
        lifecycleState: 'viable',
      },
      environment: CLEAN_SOIL,
      elapsedUnits: 2,
      operators: [FIT_REFINER],
    })!
    expect(instance.lifecycleState).toBe('mature')
    expect(instance.progress).toBe(CULTIVATION_PROGRESS_MAX)

    const replayA = advanceCultivationGrowth({
      instance: createCultivationInstance({
        instanceId: 'plot:replay',
        profileId: profile.profileId,
        environment: CLEAN_SOIL,
        operators: [FIT_REFINER],
      })!,
      environment: CLEAN_SOIL,
      elapsedUnits: 2,
      operators: [FIT_REFINER],
    })
    const replayB = advanceCultivationGrowth({
      instance: createCultivationInstance({
        instanceId: 'plot:replay',
        profileId: profile.profileId,
        environment: CLEAN_SOIL,
        operators: [FIT_REFINER],
      })!,
      environment: CLEAN_SOIL,
      elapsedUnits: 2,
      operators: [FIT_REFINER],
    })
    expect(replayA).toEqual(replayB)
  })

  it('emits a harvest handoff and propagation without owning storage', () => {
    const profile = getCultivationProfile('cultivation:fast-herb')!
    let instance = createCultivationInstance({
      instanceId: 'plot:3',
      profileId: profile.profileId,
      environment: CLEAN_SOIL,
      operators: [FIT_REFINER],
    })!
    instance = advanceCultivationGrowth({
      instance,
      environment: CLEAN_SOIL,
      elapsedUnits: 2,
      operators: [FIT_REFINER],
    })!
    const harvested = harvestCultivation({ instance })!
    expect(harvested.lifecycleState).toBe('harvested')
    expect(harvested.harvestedOutput).toEqual(profile.harvestOutput)

    const handoff = projectCultivationHarvestHandoff(harvested)!
    expect(handoff.ownerIssueId).toBe('SPE-3406')
    expect(handoff.materialId).toBe('material:cultivated_herb')
    expect(handoff.propagation?.propaguleMaterialId).toBe('material:herb_seed')
  })

  it('projects ornamental contribution into SPE-1060 and expires lifespan', () => {
    const fern = getCultivationProfile('cultivation:ornamental-fern')!
    let instance = createCultivationInstance({
      instanceId: 'plot:fern',
      profileId: fern.profileId,
      environment: CLEAN_SOIL,
      operators: [FIT_WARD],
    })!
    instance = advanceCultivationGrowth({
      instance,
      environment: CLEAN_SOIL,
      elapsedUnits: 10,
      operators: [FIT_WARD],
    })!
    expect(instance.lifecycleState).toBe('mature')

    const contribution = projectCultivationRoomContribution(instance)!
    expect(contribution.viability).toBe('viable')
    expect(contribution.localScopeOnly).toBe(true)

    const scored = projectRoomQualityScores({
      roomId: 'room:lounge',
      useContext: 'domestic',
      physical: {
        cleanliness: 0.9,
        clutter: 0.1,
        contamination: 0.05,
        damage: 0.05,
        lighting: 0.85,
        noise: 0.2,
        privacy: 0.8,
        crowding: 0.1,
      },
      cultivation: contribution,
    })
    expect(scored?.cultivationApplied).toBe(true)

    const expired = advanceCultivationGrowth({
      instance,
      environment: CLEAN_SOIL,
      elapsedUnits: 20,
      operators: [FIT_WARD],
    })!
    expect(expired.lifecycleState).toBe('expired')
    const dead = projectCultivationRoomContribution(expired)!
    expect(dead.viability).toBe('nonviable')
  })

  it('sanitizes registry round-trips and rejects malformed state', () => {
    const profile = getCultivationProfile('cultivation:fast-herb')!
    const instance = createCultivationInstance({
      instanceId: 'plot:save',
      profileId: profile.profileId,
      environment: CLEAN_SOIL,
      operators: [FIT_REFINER],
    })!
    const registry = sanitizeManagedCultivationRegistry({
      version: 1,
      instances: [instance],
    })!
    expect(registry.instances).toHaveLength(1)
    const json = JSON.parse(JSON.stringify(registry))
    expect(sanitizeManagedCultivationRegistry(json)).toEqual(registry)
    expect(sanitizeManagedCultivationRegistry(createEmptyCultivationRegistry())).toEqual(
      createEmptyCultivationRegistry(),
    )
    expect(
      sanitizeManagedCultivationRegistry({
        version: 1,
        instances: [{ ...instance, profileId: 'cultivation:missing' }],
      }),
    ).toBeUndefined()
    expect(sanitizeManagedCultivationRegistry({ version: 2, instances: [] })).toBeUndefined()
  })
})
