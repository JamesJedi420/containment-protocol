import { describe, expect, it } from 'vitest'
import {
  EFFECT_DELIVERY_GEOMETRY_FIXTURES,
  projectEffectDeliveryGeometry,
  validateEffectDeliveryGeometryRecord,
  type EffectDeliveryGeometryRecord,
} from '../domain/effectDeliveryGeometryRegistry'

describe('effectDeliveryGeometryRegistry', () => {
  it('covers required delivery kinds with legal cost scaling', () => {
    const kinds = new Set(EFFECT_DELIVERY_GEOMETRY_FIXTURES.map((f) => f.deliveryKind))
    expect(kinds.has('cone')).toBe(true)
    expect(kinds.has('line')).toBe(true)
    expect(kinds.has('touch')).toBe(true)
    expect(kinds.has('remote')).toBe(true)
    expect(kinds.has('zone')).toBe(true)

    for (const fixture of EFFECT_DELIVERY_GEOMETRY_FIXTURES) {
      const result = validateEffectDeliveryGeometryRecord(fixture)
      expect(result.valid).toBe(true)
      expect(result.issues).toHaveLength(0)

      const projection = projectEffectDeliveryGeometry(fixture)
      expect(projection).not.toBeNull()
      expect(projection?.scaledCost).toBe(fixture.baseCost * (1 + fixture.areaScaleFactor))
    }
  })

  it('rejects unknown deliveryKind', () => {
    const bad: EffectDeliveryGeometryRecord = {
      id: 'bad-kind',
      deliveryKind: 'aura' as never,
      baseCost: 1,
      areaScaleFactor: 1,
      willingnessRule: 'none',
    }
    const result = validateEffectDeliveryGeometryRecord(bad)
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.code === 'unknown_delivery_kind')).toBe(true)
  })

  it('rejects negative baseCost', () => {
    const bad: EffectDeliveryGeometryRecord = {
      id: 'neg-cost',
      deliveryKind: 'cone',
      baseCost: -1,
      areaScaleFactor: 1,
      willingnessRule: 'none',
    }
    const result = validateEffectDeliveryGeometryRecord(bad)
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.code === 'negative_base_cost')).toBe(true)
  })

  it('rejects areaScaleFactor outside bounds', () => {
    const tooHigh: EffectDeliveryGeometryRecord = {
      id: 'high-scale',
      deliveryKind: 'zone',
      baseCost: 1,
      areaScaleFactor: 11,
      willingnessRule: 'none',
    }
    const result = validateEffectDeliveryGeometryRecord(tooHigh)
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.code === 'area_scale_factor_out_of_bounds')).toBe(true)
  })

  it('requires willingnessRule when policy marks it mandatory', () => {
    const badTouch: EffectDeliveryGeometryRecord = {
      id: 'touch-none',
      deliveryKind: 'touch',
      baseCost: 1,
      areaScaleFactor: 0,
      willingnessRule: 'none',
    }
    const result = validateEffectDeliveryGeometryRecord(badTouch)
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.code === 'willingness_rule_required')).toBe(true)

    const okTouch: EffectDeliveryGeometryRecord = {
      ...badTouch,
      willingnessRule: 'consent',
    }
    expect(validateEffectDeliveryGeometryRecord(okTouch).valid).toBe(true)
  })

  it('produces deterministic projection without runtime effect execution', () => {
    const fixture = EFFECT_DELIVERY_GEOMETRY_FIXTURES[0]
    const p1 = projectEffectDeliveryGeometry(fixture)
    const p2 = projectEffectDeliveryGeometry(fixture)
    expect(p1).toEqual(p2)
    expect(p1?.scaledCost).toBeGreaterThanOrEqual(0)
  })
})
