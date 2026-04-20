import { describe, expect, it } from 'vitest'

import {
  aggregateModifiers,
  aggregateRuntimeModifierResults,
  applyBoundedDelta,
  createRuntimeModifierResult,
  explainCountermeasures,
  hasEffectiveCountermeasure,
} from '../domain/shared/modifiers'

describe('shared modifiers/resistance substrate', () => {
  it('aggregates and caps bounded modifier sources', () => {
    const result = aggregateModifiers([
      { source: 'gear:thermal-vision', value: 2 },
      { source: 'condition:fatigued', value: -1 },
      { source: 'countermeasure:deception', value: 4 },
    ])

    expect(result.total).toBe(5)
    expect(result.capped).toBe(3)
  })

  it('aggregates runtime modifier payloads deterministically', () => {
    const result = aggregateRuntimeModifierResults([
      createRuntimeModifierResult({
        statModifiers: { presence: 2 },
        effectivenessMultiplier: 1.05,
        moraleRecoveryDelta: 1,
      }),
      createRuntimeModifierResult({
        statModifiers: { presence: -1, resilience: 3 },
        stressImpactMultiplier: 0.9,
        moraleRecoveryDelta: 2,
      }),
    ])

    expect(result.statModifiers).toEqual({ presence: 1, resilience: 3 })
    expect(result.effectivenessMultiplier).toBeCloseTo(1.05)
    expect(result.stressImpactMultiplier).toBeCloseTo(0.9)
    expect(result.moraleRecoveryDelta).toBe(3)
  })

  it('applies countermeasure and bounded stat helpers', () => {
    expect(
      hasEffectiveCountermeasure({
        family: 'deception',
        presentTags: ['thermal-vision', 'scout'],
      })
    ).toBe(true)
    expect(
      explainCountermeasures({
        family: 'deception',
        presentTags: ['thermal-vision', 'scout'],
      })
    ).toContain('thermal-vision')
    expect(applyBoundedDelta(98, 5, { min: 0, max: 100 })).toBe(100)
    expect(applyBoundedDelta(1, -5, { min: 0, max: 100 })).toBe(0)
  })
})
