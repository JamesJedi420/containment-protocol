import { describe, expect, it } from 'vitest'
import {
  compareFacilityExpansionBurden,
  isExpansionBurdenBand,
  isExpansionCapabilityId,
  projectFacilityExpansionBurden,
} from '../domain/facilityExpansionBurden'

describe('SPE-2262 facility expansion burden projector', () => {
  it('AC1: expanding rooms raises at least one burden metric and grants a named capability', () => {
    const baseline = projectFacilityExpansionBurden({ roomCount: 2 })
    const expanded = projectFacilityExpansionBurden({ roomCount: 5, priorRoomCount: 2 })
    expect(baseline).toMatchObject({
      band: 'baseline',
      grantedCapabilityId: 'core_footprint',
      travelTimeMultiplier: 1,
      maintenanceDebtAccrual: 0,
    })
    expect(expanded).toMatchObject({
      band: 'expanded',
      grantedCapabilityId: 'annex_capacity',
    })
    expect(expanded!.upkeepLoad).toBeGreaterThan(baseline!.upkeepLoad)
    expect(expanded!.staffingMinimum).toBeGreaterThan(baseline!.staffingMinimum)
    expect(expanded!.travelTimeMultiplier).toBeGreaterThan(baseline!.travelTimeMultiplier)
    expect(expanded!.patrolCoverageGapRisk).toBeGreaterThan(baseline!.patrolCoverageGapRisk)
    expect(expanded!.maintenanceDebtAccrual).toBeGreaterThan(baseline!.maintenanceDebtAccrual)
    expect(expanded!.grantedCapabilityId).not.toBe(baseline!.grantedCapabilityId)
  })

  it('AC2: expansion tradeoff example — capability up and burden up vs prior band', () => {
    const comparison = compareFacilityExpansionBurden(8, 3)
    expect(comparison).toBeDefined()
    if (!comparison) throw new Error('missing comparison')
    expect(comparison.left.band).toBe('sprawling')
    expect(comparison.right.band).toBe('baseline')
    expect(comparison.left.grantedCapabilityId).toBe('wing_capacity')
    expect(comparison.capabilityChanged).toBe(true)
    expect(comparison.travelTimeMultiplierDelta).toBeGreaterThan(0)
    expect(comparison.upkeepLoadDelta).toBeGreaterThan(0)
    expect(comparison.staffingMinimumDelta).toBeGreaterThan(0)
    expect(comparison.patrolCoverageGapRiskDelta).toBeGreaterThan(0)
    expect(comparison.maintenanceDebtAccrualDelta).toBeGreaterThan(0)
  })

  it('AC3: band edges are deterministic (0–3 baseline, 4–7 expanded, 8+ sprawling)', () => {
    expect(projectFacilityExpansionBurden({ roomCount: 0 })?.band).toBe('baseline')
    expect(projectFacilityExpansionBurden({ roomCount: 3 })?.band).toBe('baseline')
    expect(projectFacilityExpansionBurden({ roomCount: 4 })?.band).toBe('expanded')
    expect(projectFacilityExpansionBurden({ roomCount: 7 })?.band).toBe('expanded')
    expect(projectFacilityExpansionBurden({ roomCount: 8 })?.band).toBe('sprawling')
    expect(projectFacilityExpansionBurden({ roomCount: 100 })?.band).toBe('sprawling')
  })

  it('fail-closes malformed roomCount and priorRoomCount', () => {
    expect(projectFacilityExpansionBurden(null)).toBeUndefined()
    expect(projectFacilityExpansionBurden(undefined)).toBeUndefined()
    expect(projectFacilityExpansionBurden({ roomCount: -1 })).toBeUndefined()
    expect(projectFacilityExpansionBurden({ roomCount: 1.5 })).toBeUndefined()
    expect(projectFacilityExpansionBurden({ roomCount: Number.NaN })).toBeUndefined()
    expect(projectFacilityExpansionBurden({ roomCount: Number.POSITIVE_INFINITY })).toBeUndefined()
    expect(
      projectFacilityExpansionBurden({ roomCount: 4, priorRoomCount: -2 })
    ).toBeUndefined()
    expect(compareFacilityExpansionBurden('four', 2)).toBeUndefined()
    expect(compareFacilityExpansionBurden(4, null)).toBeUndefined()
  })

  it('returns immutable records and is byte-stable on repeat calls', () => {
    const first = projectFacilityExpansionBurden({ roomCount: 6 })
    const second = projectFacilityExpansionBurden({ roomCount: 6 })
    expect(first).toEqual(second)
    expect(Object.isFrozen(first)).toBe(true)
    expect(() => {
      // @ts-expect-error intentional mutation probe
      first.upkeepLoad = 999
    }).toThrow()
  })

  it('exposes band and capability type guards', () => {
    expect(isExpansionBurdenBand('expanded')).toBe(true)
    expect(isExpansionBurdenBand('mega')).toBe(false)
    expect(isExpansionCapabilityId('annex_capacity')).toBe(true)
    expect(isExpansionCapabilityId('teleport_hub')).toBe(false)
  })
})
