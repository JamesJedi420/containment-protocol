/**
 * SPE-1074 slice 1 — Material Density tests
 *
 * Covers: classifyMaterialDensity, evaluateTransportBurden,
 *         evaluateInstallationConstraint, evaluateHandlingRisk,
 *         evaluateHeavyLightTradeoff.
 *
 * All tests are deterministic — no randomness, no GameState.
 */

import { describe, it, expect } from 'vitest'
import {
  classifyMaterialDensity,
  evaluateTransportBurden,
  evaluateInstallationConstraint,
  evaluateHandlingRisk,
  evaluateHeavyLightTradeoff,
} from '../domain/materialDensity'
import { DENSITY_CALIBRATION } from '../domain/sim/calibration'

// ---------------------------------------------------------------------------
// classifyMaterialDensity
// ---------------------------------------------------------------------------

describe('classifyMaterialDensity', () => {
  it('classifies wood_plank as light', () => {
    const p = classifyMaterialDensity('wood_plank')
    expect(p.densityClass).toBe('light')
    expect(p.materialId).toBe('wood_plank')
  })

  it('classifies lead_sheet as heavy', () => {
    const p = classifyMaterialDensity('lead_sheet')
    expect(p.densityClass).toBe('heavy')
    expect(p.handlingTier).toBe('specialist')
  })

  it('classifies dimensional_anchor as extreme', () => {
    const p = classifyMaterialDensity('dimensional_anchor')
    expect(p.densityClass).toBe('extreme')
    expect(p.handlingTier).toBe('crane-only')
  })

  it('classifies occult_reagent as ultralight', () => {
    const p = classifyMaterialDensity('occult_reagent')
    expect(p.densityClass).toBe('ultralight')
    expect(p.handlingTier).toBe('minimal')
  })

  it('classifies stone_block as medium', () => {
    const p = classifyMaterialDensity('stone_block')
    expect(p.densityClass).toBe('medium')
  })

  it('falls back to medium for unknown materialId', () => {
    const p = classifyMaterialDensity('unknown_mystery_material')
    expect(p.densityClass).toBe('medium')
    expect(p.materialId).toBe('unknown_mystery_material')
  })

  it('returns correct massUnits from DENSITY_CALIBRATION for each class', () => {
    expect(classifyMaterialDensity('wood_plank').massUnits).toBe(
      DENSITY_CALIBRATION.massUnitsByClass.light,
    )
    expect(classifyMaterialDensity('lead_sheet').massUnits).toBe(
      DENSITY_CALIBRATION.massUnitsByClass.heavy,
    )
    expect(classifyMaterialDensity('occult_reagent').massUnits).toBe(
      DENSITY_CALIBRATION.massUnitsByClass.ultralight,
    )
  })

  it('AC1: stone_block and lead_sheet (same structural role) differ in massUnits and breachResistanceIndex', () => {
    const stone = classifyMaterialDensity('stone_block')
    const lead  = classifyMaterialDensity('lead_sheet')
    expect(lead.massUnits).toBeGreaterThan(stone.massUnits)
    expect(lead.breachResistanceIndex).toBeGreaterThan(stone.breachResistanceIndex)
  })

  it('breachResistanceIndex is derived from massUnits × multiplier', () => {
    const p = classifyMaterialDensity('stone_block')
    expect(p.breachResistanceIndex).toBe(
      Math.round(p.massUnits * DENSITY_CALIBRATION.breachResistanceMultiplier),
    )
  })
})

// ---------------------------------------------------------------------------
// evaluateTransportBurden
// ---------------------------------------------------------------------------

describe('evaluateTransportBurden', () => {
  it('AC2: heavy material produces laborDelta > 0', () => {
    const lead = classifyMaterialDensity('lead_sheet')
    const result = evaluateTransportBurden(lead, 2)
    expect(result.laborDelta).toBeGreaterThan(0)
  })

  it('AC2: heavy material requires equipment', () => {
    const lead = classifyMaterialDensity('lead_sheet')
    const result = evaluateTransportBurden(lead, 1)
    expect(result.equipmentRequired.length).toBeGreaterThan(0)
  })

  it('AC2: light material has zero laborDelta at quantity 1', () => {
    const wood = classifyMaterialDensity('wood_plank')
    const result = evaluateTransportBurden(wood, 1)
    expect(result.laborDelta).toBe(0)
  })

  it('light material requires no equipment', () => {
    const wood = classifyMaterialDensity('wood_plank')
    const result = evaluateTransportBurden(wood, 4)
    expect(result.equipmentRequired).toEqual([])
  })

  it('ultralight material has no burden and no equipment', () => {
    const reagent = classifyMaterialDensity('occult_reagent')
    const result = evaluateTransportBurden(reagent, 10)
    expect(result.laborDelta).toBe(0)
    expect(result.burdenFlag).toBe(false)
    expect(result.equipmentRequired).toEqual([])
  })

  it('extreme material has high laborDelta and crane equipment', () => {
    const anchor = classifyMaterialDensity('dimensional_anchor')
    const result = evaluateTransportBurden(anchor, 1)
    expect(result.laborDelta).toBeGreaterThan(0)
    expect(result.equipmentRequired).toContain('crane')
    expect(result.burdenFlag).toBe(true)
  })

  it('burdenFlag is false for minimal-tier material', () => {
    const reagent = classifyMaterialDensity('occult_reagent')
    const result = evaluateTransportBurden(reagent, 1)
    expect(result.burdenFlag).toBe(false)
  })

  it('results are deterministic on repeated calls', () => {
    const lead = classifyMaterialDensity('lead_sheet')
    const a = evaluateTransportBurden(lead, 3)
    const b = evaluateTransportBurden(lead, 3)
    expect(a.laborDelta).toBe(b.laborDelta)
    expect(a.equipmentRequired).toEqual(b.equipmentRequired)
    expect(a.burdenFlag).toBe(b.burdenFlag)
  })
})

// ---------------------------------------------------------------------------
// evaluateInstallationConstraint
// ---------------------------------------------------------------------------

describe('evaluateInstallationConstraint', () => {
  it('AC3: heavy floorLoadEligible material blocked on standard floor', () => {
    const lead = classifyMaterialDensity('lead_sheet')
    const result = evaluateInstallationConstraint(lead, {
      floorRating: 'standard',
      supportEquipmentAvailable: 'specialist',
    })
    expect(result.cleared).toBe(false)
    expect(result.blockerReason).not.toBe('')
  })

  it('AC3: heavy material clears on heavy-rated floor', () => {
    const lead = classifyMaterialDensity('lead_sheet')
    const result = evaluateInstallationConstraint(lead, {
      floorRating: 'heavy-rated',
      supportEquipmentAvailable: 'specialist',
    })
    expect(result.cleared).toBe(true)
    expect(result.blockerReason).toBe('')
  })

  it('AC3: cleared with friction when equipment is below required tier', () => {
    const lead = classifyMaterialDensity('lead_sheet')
    const result = evaluateInstallationConstraint(lead, {
      floorRating: 'heavy-rated',
      supportEquipmentAvailable: 'standard', // below specialist
    })
    expect(result.cleared).toBe(true)
    expect(result.delayWeeks).toBeGreaterThan(0)
  })

  it('AC3: light material clears on standard floor with no delay', () => {
    const wood = classifyMaterialDensity('wood_plank')
    const result = evaluateInstallationConstraint(wood, {
      floorRating: 'standard',
      supportEquipmentAvailable: 'minimal',
    })
    expect(result.cleared).toBe(true)
    expect(result.delayWeeks).toBe(0)
  })

  it('non-floor-load-eligible material always clears', () => {
    const reagent = classifyMaterialDensity('occult_reagent')
    const result = evaluateInstallationConstraint(reagent, {
      floorRating: 'standard',
      supportEquipmentAvailable: 'minimal',
    })
    expect(result.cleared).toBe(true)
  })

  it('extreme material blocked even on reinforced floor', () => {
    const anchor = classifyMaterialDensity('dimensional_anchor')
    const result = evaluateInstallationConstraint(anchor, {
      floorRating: 'reinforced',
      supportEquipmentAvailable: 'crane-only',
    })
    expect(result.cleared).toBe(false)
  })

  it('extreme material clears on heavy-rated floor with proper equipment', () => {
    const anchor = classifyMaterialDensity('dimensional_anchor')
    const result = evaluateInstallationConstraint(anchor, {
      floorRating: 'heavy-rated',
      supportEquipmentAvailable: 'crane-only',
    })
    expect(result.cleared).toBe(true)
    expect(result.delayWeeks).toBe(0)
  })

  it('results are deterministic on repeated calls', () => {
    const lead = classifyMaterialDensity('lead_sheet')
    const ctx = { floorRating: 'heavy-rated' as const, supportEquipmentAvailable: 'standard' as const }
    const a = evaluateInstallationConstraint(lead, ctx)
    const b = evaluateInstallationConstraint(lead, ctx)
    expect(a.cleared).toBe(b.cleared)
    expect(a.delayWeeks).toBe(b.delayWeeks)
  })
})

// ---------------------------------------------------------------------------
// evaluateHandlingRisk
// ---------------------------------------------------------------------------

describe('evaluateHandlingRisk', () => {
  it('AC5: heavy material with minimal crew/equipment returns severe risk', () => {
    const lead = classifyMaterialDensity('lead_sheet')
    const result = evaluateHandlingRisk(lead, {
      crewSize: 1,
      equipmentAvailable: 'minimal',
      operationUrgency: 'emergency',
    })
    expect(result.riskLevel).toBe('severe')
    expect(result.injuryRiskDelta).toBeGreaterThan(0)
  })

  it('AC5: severe risk sets routeBlockageRisk true', () => {
    const lead = classifyMaterialDensity('lead_sheet')
    const result = evaluateHandlingRisk(lead, {
      crewSize: 1,
      equipmentAvailable: 'minimal',
      operationUrgency: 'emergency',
    })
    expect(result.routeBlockageRisk).toBe(true)
  })

  it('AC5: extreme material with minimal crew/equipment sets infrastructureDamageRisk', () => {
    const anchor = classifyMaterialDensity('dimensional_anchor')
    const result = evaluateHandlingRisk(anchor, {
      crewSize: 1,
      equipmentAvailable: 'minimal',
      operationUrgency: 'routine',
    })
    expect(result.infrastructureDamageRisk).toBe(true)
  })

  it('AC5 contrast: heavy material with proper equipment returns low/none risk', () => {
    const lead = classifyMaterialDensity('lead_sheet')
    const result = evaluateHandlingRisk(lead, {
      crewSize: 4,
      equipmentAvailable: 'specialist',
      operationUrgency: 'routine',
    })
    expect(['none', 'low']).toContain(result.riskLevel)
  })

  it('AC5: light material at any crew/equipment level stays none or low', () => {
    const wood = classifyMaterialDensity('wood_plank')
    for (const urgency of ['routine', 'urgent', 'emergency'] as const) {
      const result = evaluateHandlingRisk(wood, {
        crewSize: 1,
        equipmentAvailable: 'minimal',
        operationUrgency: urgency,
      })
      expect(['none', 'low']).toContain(result.riskLevel)
    }
  })

  it('ultralight material produces no risk under any conditions', () => {
    const reagent = classifyMaterialDensity('occult_reagent')
    const result = evaluateHandlingRisk(reagent, {
      crewSize: 1,
      equipmentAvailable: 'minimal',
      operationUrgency: 'emergency',
    })
    expect(result.riskLevel).toBe('none')
    expect(result.injuryRiskDelta).toBe(0)
    expect(result.routeBlockageRisk).toBe(false)
    expect(result.infrastructureDamageRisk).toBe(false)
  })

  it('emergency urgency amplifies risk above routine', () => {
    const steel = classifyMaterialDensity('steel_rod')
    const routine = evaluateHandlingRisk(steel, {
      crewSize: 1,
      equipmentAvailable: 'minimal',
      operationUrgency: 'routine',
    })
    const emergency = evaluateHandlingRisk(steel, {
      crewSize: 1,
      equipmentAvailable: 'minimal',
      operationUrgency: 'emergency',
    })
    expect(emergency.injuryRiskDelta).toBeGreaterThan(routine.injuryRiskDelta)
  })

  it('results are deterministic on repeated calls', () => {
    const lead = classifyMaterialDensity('lead_sheet')
    const ctx = { crewSize: 1, equipmentAvailable: 'minimal' as const, operationUrgency: 'emergency' as const }
    const a = evaluateHandlingRisk(lead, ctx)
    const b = evaluateHandlingRisk(lead, ctx)
    expect(a.riskLevel).toBe(b.riskLevel)
    expect(a.injuryRiskDelta).toBe(b.injuryRiskDelta)
    expect(a.routeBlockageRisk).toBe(b.routeBlockageRisk)
    expect(a.infrastructureDamageRisk).toBe(b.infrastructureDamageRisk)
  })
})

// ---------------------------------------------------------------------------
// evaluateHeavyLightTradeoff
// ---------------------------------------------------------------------------

describe('evaluateHeavyLightTradeoff', () => {
  // Helper profiles
  const heavy = classifyMaterialDensity('lead_sheet')    // heavy
  const light = classifyMaterialDensity('wood_plank')    // light

  it('AC4: breachResistanceDelta is positive (heavy advantage)', () => {
    const result = evaluateHeavyLightTradeoff(heavy, light, {
      containmentStrengthPriority: false,
      deploymentSpeedPriority: false,
    })
    expect(result.breachResistanceDelta).toBeGreaterThan(0)
  })

  it('AC4/AC6: recommend heavy when containment priority is true', () => {
    const result = evaluateHeavyLightTradeoff(heavy, light, {
      containmentStrengthPriority: true,
      deploymentSpeedPriority: false,
    })
    expect(result.recommendedChoice).toBe('heavy')
  })

  it('AC6: recommend light when deployment speed priority is true', () => {
    const result = evaluateHeavyLightTradeoff(heavy, light, {
      containmentStrengthPriority: false,
      deploymentSpeedPriority: true,
    })
    expect(result.recommendedChoice).toBe('light')
  })

  it('AC6: context-dependent when both priorities are set', () => {
    const result = evaluateHeavyLightTradeoff(heavy, light, {
      containmentStrengthPriority: true,
      deploymentSpeedPriority: true,
    })
    expect(result.recommendedChoice).toBe('context-dependent')
  })

  it('context-dependent when neither priority is set', () => {
    const result = evaluateHeavyLightTradeoff(heavy, light, {
      containmentStrengthPriority: false,
      deploymentSpeedPriority: false,
    })
    expect(result.recommendedChoice).toBe('context-dependent')
  })

  it('deploymentSpeedDelta is positive (light is faster)', () => {
    const result = evaluateHeavyLightTradeoff(heavy, light, {
      containmentStrengthPriority: false,
      deploymentSpeedPriority: false,
    })
    expect(result.deploymentSpeedDelta).toBeGreaterThan(0)
  })

  it('laborCostDelta is non-negative (heavy costs at least as much labor)', () => {
    const result = evaluateHeavyLightTradeoff(heavy, light, {
      containmentStrengthPriority: false,
      deploymentSpeedPriority: false,
    })
    expect(result.laborCostDelta).toBeGreaterThanOrEqual(0)
  })

  it('two heavy materials have smaller breachResistanceDelta than heavy vs ultralight', () => {
    const ultralight = classifyMaterialDensity('occult_reagent')
    const heavyVsUltralight = evaluateHeavyLightTradeoff(heavy, ultralight, {
      containmentStrengthPriority: false,
      deploymentSpeedPriority: false,
    })
    const heavyVsLight = evaluateHeavyLightTradeoff(heavy, light, {
      containmentStrengthPriority: false,
      deploymentSpeedPriority: false,
    })
    expect(heavyVsUltralight.breachResistanceDelta).toBeGreaterThan(
      heavyVsLight.breachResistanceDelta,
    )
  })

  it('tradeoff between identical profiles returns zero deltas', () => {
    const stone = classifyMaterialDensity('stone_block')
    const result = evaluateHeavyLightTradeoff(stone, stone, {
      containmentStrengthPriority: false,
      deploymentSpeedPriority: false,
    })
    expect(result.breachResistanceDelta).toBe(0)
    expect(result.deploymentSpeedDelta).toBe(0)
    expect(result.laborCostDelta).toBe(0)
  })

  it('results are deterministic on repeated calls', () => {
    const ctx = { containmentStrengthPriority: true, deploymentSpeedPriority: false }
    const a = evaluateHeavyLightTradeoff(heavy, light, ctx)
    const b = evaluateHeavyLightTradeoff(heavy, light, ctx)
    expect(a.breachResistanceDelta).toBe(b.breachResistanceDelta)
    expect(a.recommendedChoice).toBe(b.recommendedChoice)
    expect(a.laborCostDelta).toBe(b.laborCostDelta)
  })
})
