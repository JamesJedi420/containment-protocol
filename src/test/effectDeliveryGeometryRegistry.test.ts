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
    expect(result.issues.some((i) => i.code === 'invalid_base_cost')).toBe(true)
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

  it.each([NaN, Infinity, -Infinity, -1, '1', null, undefined])(
    'rejects invalid baseCost %s without projecting a cost',
    (baseCost) => {
      const record = { ...EFFECT_DELIVERY_GEOMETRY_FIXTURES[0], baseCost }
      expect(validateEffectDeliveryGeometryRecord(record).valid).toBe(false)
      expect(projectEffectDeliveryGeometry(record)).toBeNull()
    }
  )

  it.each([NaN, Infinity, -Infinity, -0.01, 10.01, '1', null, undefined])(
    'rejects invalid areaScaleFactor %s',
    (areaScaleFactor) => {
      const record = { ...EFFECT_DELIVERY_GEOMETRY_FIXTURES[0], areaScaleFactor }
      expect(validateEffectDeliveryGeometryRecord(record).valid).toBe(false)
      expect(projectEffectDeliveryGeometry(record)).toBeNull()
    }
  )

  it('rejects finite inputs that overflow during scaling', () => {
    const record = {
      ...EFFECT_DELIVERY_GEOMETRY_FIXTURES[0],
      baseCost: Number.MAX_VALUE,
      areaScaleFactor: 10,
    }
    expect(validateEffectDeliveryGeometryRecord(record).issues).toContainEqual(
      expect.objectContaining({ code: 'scaled_cost_overflow' })
    )
    expect(projectEffectDeliveryGeometry(record)).toBeNull()
    expect(projectEffectDeliveryGeometry({ ...record, areaScaleFactor: 0 })?.scaledCost).toBe(
      Number.MAX_VALUE
    )
  })

  it.each([0, 10])('accepts inclusive scale bound %s and zero cost', (areaScaleFactor) => {
    const record = { ...EFFECT_DELIVERY_GEOMETRY_FIXTURES[0], baseCost: 0, areaScaleFactor }
    expect(projectEffectDeliveryGeometry(record)?.scaledCost).toBe(0)
  })

  it.each([null, undefined, [], 1, 'record', {}])('rejects malformed record %s', (record) => {
    expect(validateEffectDeliveryGeometryRecord(record).valid).toBe(false)
    expect(projectEffectDeliveryGeometry(record)).toBeNull()
  })

  it.each(['', '   ', 1, null])('rejects invalid identifiers %s', (id) => {
    expect(
      projectEffectDeliveryGeometry({ ...EFFECT_DELIVERY_GEOMETRY_FIXTURES[0], id })
    ).toBeNull()
  })

  it.each(['remote', 'touch'] as const)('enforces willingness policy for %s', (deliveryKind) => {
    const base = { id: 'consent', deliveryKind, baseCost: 1, areaScaleFactor: 0 }
    for (const willingnessRule of [undefined, 'none', 'unknown']) {
      expect(projectEffectDeliveryGeometry({ ...base, willingnessRule })).toBeNull()
    }
    expect(projectEffectDeliveryGeometry({ ...base, willingnessRule: 'consent' })).not.toBeNull()
  })

  it.each([
    undefined,
    null,
    { originSquare: '' },
    { originSquare: 'origin', shapeKind: 'cone', lineOfEffect: [], barrierBlocksPropagation: true },
    {
      originSquare: 'origin',
      shapeKind: 'line',
      lineOfEffect: ['origin'],
      barrierBlocksPropagation: true,
    },
    {
      originSquare: 'origin',
      shapeKind: 'cone',
      lineOfEffect: ['other'],
      barrierBlocksPropagation: true,
    },
    {
      originSquare: 'origin',
      shapeKind: 'cone',
      lineOfEffect: ['origin', ' '],
      barrierBlocksPropagation: true,
    },
    {
      originSquare: 'origin',
      shapeKind: 'cone',
      lineOfEffect: ['origin', ' origin '],
      barrierBlocksPropagation: true,
    },
    {
      originSquare: 'origin',
      shapeKind: 'cone',
      lineOfEffect: ['origin'],
      barrierBlocksPropagation: false,
    },
    { originSquare: 'origin', shapeKind: 'cone', lineOfEffect: ['origin'] },
  ])('rejects malformed origin, shape, route or barrier policy: %j', (propagation) => {
    const record = { ...EFFECT_DELIVERY_GEOMETRY_FIXTURES[0], propagation }
    expect(validateEffectDeliveryGeometryRecord(record).issues).toContainEqual(
      expect.objectContaining({ code: 'invalid_propagation' })
    )
    expect(projectEffectDeliveryGeometry(record)).toBeNull()
  })

  it('preserves distinct authored spread shapes and barrier-blocked policies', () => {
    const areaFixtures = EFFECT_DELIVERY_GEOMETRY_FIXTURES.filter((record) => record.propagation)
    expect(areaFixtures.map((record) => record.propagation?.shapeKind)).toEqual([
      'cone',
      'line',
      'zone',
      'radius-anchor',
    ])
    for (const fixture of areaFixtures) {
      const projected = projectEffectDeliveryGeometry(fixture)
      expect(projected?.propagation?.shapeKind).toBe(fixture.deliveryKind)
      expect(projected?.propagation?.barrierBlocksPropagation).toBe(true)
      expect(projected?.propagation?.lineOfEffect[0]).toBe(projected?.propagation?.originSquare)
    }
  })

  it.each([
    undefined,
    null,
    { anchorActorRef: '', radiusBand: 'local', followsMovement: true },
    { radiusBand: 'local', followsMovement: true },
    { anchorActorRef: 'actor:a', radiusBand: 'unknown', followsMovement: true },
    { anchorActorRef: 'actor:a', radiusBand: 'local', followsMovement: false },
    { anchorActorRef: 'actor:a', radiusBand: 'local' },
  ])('rejects invalid mobile-anchor metadata %j', (mobileAnchor) => {
    const fixture = EFFECT_DELIVERY_GEOMETRY_FIXTURES.find(
      (record) => record.deliveryKind === 'radius-anchor'
    )!
    expect(
      validateEffectDeliveryGeometryRecord({ ...fixture, mobileAnchor }).issues
    ).toContainEqual(expect.objectContaining({ code: 'invalid_mobile_anchor' }))
    expect(projectEffectDeliveryGeometry({ ...fixture, mobileAnchor })).toBeNull()
  })

  it.each(['local', 'extended'])('accepts declared mobile radius band %s', (radiusBand) => {
    const fixture = EFFECT_DELIVERY_GEOMETRY_FIXTURES.find(
      (record) => record.deliveryKind === 'radius-anchor'
    )!
    expect(
      projectEffectDeliveryGeometry({
        ...fixture,
        mobileAnchor: { anchorActorRef: 'actor:a', radiusBand, followsMovement: true },
      })?.mobileAnchor
    ).toEqual({ anchorActorRef: 'actor:a', radiusBand, followsMovement: true })
  })

  it('rejects metadata on incompatible delivery kinds', () => {
    const cone = EFFECT_DELIVERY_GEOMETRY_FIXTURES[0]
    const touch = EFFECT_DELIVERY_GEOMETRY_FIXTURES.find(
      (record) => record.deliveryKind === 'touch'
    )!
    expect(projectEffectDeliveryGeometry({ ...touch, propagation: cone.propagation })).toBeNull()
    expect(
      projectEffectDeliveryGeometry({
        ...cone,
        mobileAnchor: { anchorActorRef: 'actor:a', radiusBand: 'local', followsMovement: true },
      })
    ).toBeNull()
  })

  it('returns normalized immutable snapshots without retaining or changing source metadata', () => {
    const route = [' origin ', ' next ']
    const input = {
      id: ' geometry ',
      deliveryKind: 'radius-anchor',
      baseCost: 1,
      areaScaleFactor: 1,
      willingnessRule: 'none',
      propagation: {
        originSquare: ' origin ',
        shapeKind: 'radius-anchor',
        lineOfEffect: route,
        barrierBlocksPropagation: true,
      },
      mobileAnchor: { anchorActorRef: ' actor:a ', radiusBand: 'local', followsMovement: true },
    }
    const before = structuredClone(input)
    const result = projectEffectDeliveryGeometry(input)!
    expect(input).toEqual(before)
    expect(result.id).toBe('geometry')
    expect(result.propagation?.originSquare).toBe('origin')
    expect(result.propagation?.lineOfEffect).toEqual(['origin', 'next'])
    expect(result.mobileAnchor?.anchorActorRef).toBe('actor:a')
    expect(
      [result, result.propagation, result.propagation?.lineOfEffect, result.mobileAnchor].every(
        Object.isFrozen
      )
    ).toBe(true)
    route[1] = 'changed'
    input.mobileAnchor.anchorActorRef = 'changed'
    expect(result.propagation?.lineOfEffect).toEqual(['origin', 'next'])
    expect(result.mobileAnchor?.anchorActorRef).toBe('actor:a')
  })
})
