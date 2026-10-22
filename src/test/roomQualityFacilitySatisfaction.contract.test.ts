import { describe, expect, it } from 'vitest'
import {
  evaluateExpectationLegitimacy,
  evaluateRecoveryModifier,
  evaluateSharedSpacePressure,
  evaluateTaskQualityGate,
  evaluateWorkPerformanceModifier,
  projectRoomPhysicalCondition,
  projectRoomQualityScores,
} from '../domain/roomQualityFacilitySatisfaction'

const CLEAN_PHYSICAL = {
  cleanliness: 0.9,
  clutter: 0.1,
  contamination: 0.05,
  damage: 0.05,
  lighting: 0.85,
  noise: 0.2,
  privacy: 0.8,
  crowding: 0.1,
}

const FILTHY_PHYSICAL = {
  cleanliness: 0.2,
  clutter: 0.8,
  contamination: 0.7,
  damage: 0.6,
  lighting: 0.3,
  noise: 0.7,
  privacy: 0.2,
  crowding: 0.8,
}

describe('SPE-1060 room quality, zone value, and facility satisfaction', () => {
  it('projects physical condition fail-closed and unchanged by context', () => {
    expect(projectRoomPhysicalCondition(CLEAN_PHYSICAL)).toMatchObject(CLEAN_PHYSICAL)
    expect(projectRoomPhysicalCondition({ ...CLEAN_PHYSICAL, cleanliness: 2 })).toBeUndefined()
  })

  it('scores comfort, technical suitability, prestige, and symbolic fit separately', () => {
    const lavishPoorTech = projectRoomQualityScores({
      roomId: 'room:lavish-clinic',
      useContext: 'clinical',
      physical: {
        cleanliness: 0.15,
        clutter: 0.7,
        contamination: 0.85,
        damage: 0.7,
        lighting: 0.2,
        noise: 0.6,
        privacy: 0.5,
        crowding: 0.4,
      },
      materialsPrestige: 0.98,
      domainMatch: 0.35,
    })

    expect(lavishPoorTech).toMatchObject({
      dimensionsSeparated: true,
      physicalUnchangedByContext: true,
    })
    expect(lavishPoorTech!.prestige).toBeGreaterThan(lavishPoorTech!.technicalSuitability)
    expect(lavishPoorTech!.comfort).not.toBe(lavishPoorTech!.symbolicFit)
    expect(lavishPoorTech!.reasonCodes).toEqual(
      expect.arrayContaining(['prestige_does_not_imply_technical'])
    )
  })

  it('values the same physical condition differently by use context', () => {
    const clinical = projectRoomQualityScores({
      roomId: 'room:shared-bay',
      useContext: 'clinical',
      physical: FILTHY_PHYSICAL,
    })
    const domestic = projectRoomQualityScores({
      roomId: 'room:shared-bay',
      useContext: 'domestic',
      physical: FILTHY_PHYSICAL,
    })

    expect(clinical!.physical).toEqual(domestic!.physical)
    expect(clinical!.technicalSuitability).not.toBe(domestic!.technicalSuitability)
    expect(clinical!.reasonCodes).toContain('context:clinical')
    expect(domestic!.reasonCodes).toContain('context:domestic')
  })

  it('changes recovery/burnout outcomes from recovery-space comfort', () => {
    const good = projectRoomQualityScores({
      roomId: 'room:quiet-lounge',
      useContext: 'recovery',
      physical: CLEAN_PHYSICAL,
    })
    const bad = projectRoomQualityScores({
      roomId: 'room:crowded-bunk',
      useContext: 'recovery',
      physical: FILTHY_PHYSICAL,
    })

    const goodRecovery = evaluateRecoveryModifier(good!)
    const badRecovery = evaluateRecoveryModifier(bad!)
    expect(goodRecovery!.recoveryDelta).toBeGreaterThan(0)
    expect(badRecovery!.recoveryDelta).toBeLessThan(goodRecovery!.recoveryDelta)
    expect(badRecovery!.burnoutRiskDelta).toBeGreaterThan(goodRecovery!.burnoutRiskDelta)
  })

  it('improves specialist work reliability when technical suitability is high', () => {
    const goodLab = projectRoomQualityScores({
      roomId: 'room:lab',
      useContext: 'research',
      physical: CLEAN_PHYSICAL,
    })
    const badLab = projectRoomQualityScores({
      roomId: 'room:lab',
      useContext: 'research',
      physical: FILTHY_PHYSICAL,
    })

    const goodWork = evaluateWorkPerformanceModifier(goodLab!)
    const badWork = evaluateWorkPerformanceModifier(badLab!)
    expect(goodWork.speedDelta).toBeGreaterThan(badWork.speedDelta)
    expect(goodWork.safetyDelta).toBeGreaterThan(badWork.safetyDelta)
    expect(goodWork.errorResistanceDelta).toBeGreaterThan(badWork.errorResistanceDelta)
  })

  it('projects shared-space pressure from comfort, privacy, and crowding', () => {
    const crowded = projectRoomQualityScores({
      roomId: 'room:dorm',
      useContext: 'domestic',
      physical: FILTHY_PHYSICAL,
    })
    const privateRoom = projectRoomQualityScores({
      roomId: 'room:dorm',
      useContext: 'domestic',
      physical: CLEAN_PHYSICAL,
    })

    const crowdedPressure = evaluateSharedSpacePressure(crowded!)
    const privatePressure = evaluateSharedSpacePressure(privateRoom!)
    expect(crowdedPressure.irritationDelta).toBeGreaterThan(privatePressure.irritationDelta)
    expect(crowdedPressure.conflictRiskDelta).toBeGreaterThan(
      privatePressure.conflictRiskDelta
    )
    expect(privatePressure.cohesionDelta).toBeGreaterThan(crowdedPressure.cohesionDelta)
  })

  it('changes inspector/faction/public-cover legitimacy from prestige expectation', () => {
    const shabbyFront = projectRoomQualityScores({
      roomId: 'room:clinic-front',
      useContext: 'public_facing',
      physical: FILTHY_PHYSICAL,
      materialsPrestige: 0.1,
    })
    const lavishFront = projectRoomQualityScores({
      roomId: 'room:clinic-front',
      useContext: 'public_facing',
      physical: CLEAN_PHYSICAL,
      materialsPrestige: 0.99,
    })

    expect(
      evaluateExpectationLegitimacy({
        scores: shabbyFront,
        expectedPrestige: 0.7,
        audience: 'inspector',
      })
    ).toMatchObject({ outcome: 'below_expectation' })

    expect(
      evaluateExpectationLegitimacy({
        scores: lavishFront,
        expectedPrestige: 0.3,
        audience: 'public_cover',
      })
    ).toMatchObject({ outcome: 'above_expectation_suspicion' })
  })

  it('blocks or downgrades tasks that fail minimum room quality', () => {
    const filthyClinic = projectRoomQualityScores({
      roomId: 'room:surgery',
      useContext: 'clinical',
      physical: FILTHY_PHYSICAL,
    })
    const cleanClinic = projectRoomQualityScores({
      roomId: 'room:surgery',
      useContext: 'clinical',
      physical: CLEAN_PHYSICAL,
    })

    expect(
      evaluateTaskQualityGate({
        scores: filthyClinic,
        taskId: 'task:surgery',
        requiredTechnical: 0.95,
      })
    ).toMatchObject({ outcome: 'blocked' })

    expect(
      evaluateTaskQualityGate({
        scores: cleanClinic,
        taskId: 'task:surgery',
        requiredTechnical: 0.55,
      })
    ).toMatchObject({ outcome: 'allowed' })

    const mid = projectRoomQualityScores({
      roomId: 'room:surgery',
      useContext: 'clinical',
      physical: {
        ...CLEAN_PHYSICAL,
        cleanliness: 0.45,
        contamination: 0.55,
        damage: 0.45,
        lighting: 0.4,
      },
    })
    expect(
      evaluateTaskQualityGate({
        scores: mid,
        taskId: 'task:surgery',
        requiredTechnical: 0.85,
      })?.outcome
    ).toMatch(/downgraded|unsafe|blocked/)
  })

  it('applies viable cultivation locally without lifting technical suitability', () => {
    const without = projectRoomQualityScores({
      roomId: 'room:lobby',
      useContext: 'public_facing',
      physical: CLEAN_PHYSICAL,
    })
    const withPlants = projectRoomQualityScores({
      roomId: 'room:lobby',
      useContext: 'public_facing',
      physical: CLEAN_PHYSICAL,
      cultivation: {
        contributionId: 'cultivation:ornamental-1',
        viability: 'viable',
        comfortBonus: 0.4,
        prestigeBonus: 0.3,
        symbolicFitBonus: 0.2,
        localScopeOnly: true,
      },
    })
    const deadPlants = projectRoomQualityScores({
      roomId: 'room:lobby',
      useContext: 'public_facing',
      physical: CLEAN_PHYSICAL,
      cultivation: {
        contributionId: 'cultivation:ornamental-1',
        viability: 'nonviable',
        comfortBonus: 0.4,
        prestigeBonus: 0.3,
        symbolicFitBonus: 0.2,
        localScopeOnly: true,
      },
    })

    expect(withPlants!.comfort).toBeGreaterThan(without!.comfort)
    expect(withPlants!.technicalSuitability).toBe(without!.technicalSuitability)
    expect(deadPlants!.comfort).toBe(without!.comfort)
    expect(deadPlants!.cultivationApplied).toBe(false)
  })

  it('applies SPE-1066 preference deltas without mutating physical condition', () => {
    const midPhysical = {
      cleanliness: 0.5,
      clutter: 0.4,
      contamination: 0.2,
      damage: 0.2,
      lighting: 0.5,
      noise: 0.5,
      privacy: 0.4,
      crowding: 0.4,
    }
    const base = projectRoomQualityScores({
      roomId: 'room:quarters',
      useContext: 'domestic',
      physical: midPhysical,
    })
    const preferred = projectRoomQualityScores({
      roomId: 'room:quarters',
      useContext: 'domestic',
      physical: midPhysical,
      preferenceModifier: {
        preferenceOwner: 'SPE-1066',
        comfortDelta: 12,
        technicalSuitabilityDelta: -3,
      },
    })

    expect(preferred!.physical).toEqual(base!.physical)
    expect(preferred!.comfort).toBe(base!.comfort + 12)
    expect(preferred!.technicalSuitability).toBe(base!.technicalSuitability - 3)
    expect(preferred!.preferenceApplied).toBe(true)
  })

  it('clamps preference-adjusted scores at the ceiling and rejects unbounded deltas', () => {
    const nearCeiling = projectRoomQualityScores({
      roomId: 'room:quarters',
      useContext: 'domestic',
      physical: CLEAN_PHYSICAL,
      preferenceModifier: {
        preferenceOwner: 'SPE-1066',
        comfortDelta: 50,
        technicalSuitabilityDelta: 0,
      },
    })
    expect(nearCeiling!.comfort).toBe(100)

    expect(
      projectRoomQualityScores({
        roomId: 'room:quarters',
        useContext: 'domestic',
        physical: CLEAN_PHYSICAL,
        preferenceModifier: {
          preferenceOwner: 'SPE-1066',
          comfortDelta: 1000,
          technicalSuitabilityDelta: 0,
        },
      })
    ).toBeUndefined()
  })

  it('returns undefined recovery modifier outside recovery/domestic contexts', () => {
    const clinical = projectRoomQualityScores({
      roomId: 'room:bay',
      useContext: 'clinical',
      physical: CLEAN_PHYSICAL,
    })
    expect(evaluateRecoveryModifier(clinical!)).toBeUndefined()
  })

  it('fails closed on incomplete or non-finite score packets for gates', () => {
    expect(
      evaluateTaskQualityGate({
        scores: {
          roomId: 'room:surgery',
          technicalSuitability: 80,
        },
        taskId: 'task:surgery',
        requiredTechnical: 0.5,
      })
    ).toBeUndefined()

    expect(
      evaluateExpectationLegitimacy({
        scores: {
          roomId: 'room:front',
          useContext: 'public_facing',
          physical: CLEAN_PHYSICAL,
          comfort: 50,
          technicalSuitability: 50,
          prestige: Number.NaN,
          symbolicFit: 50,
        },
        expectedPrestige: 0.5,
        audience: 'inspector',
      })
    ).toBeUndefined()
  })

  it('marks cultivationApplied only when context-relevant bonuses apply', () => {
    const clinicalPlants = projectRoomQualityScores({
      roomId: 'room:lab',
      useContext: 'clinical',
      physical: CLEAN_PHYSICAL,
      cultivation: {
        contributionId: 'cultivation:ornamental-1',
        viability: 'viable',
        comfortBonus: 0.4,
        prestigeBonus: 0.3,
        symbolicFitBonus: 0.2,
        localScopeOnly: true,
      },
    })
    expect(clinicalPlants!.cultivationApplied).toBe(false)
    expect(clinicalPlants!.reasonCodes).toContain('cultivation_context_irrelevant')
  })
})
