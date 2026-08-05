import { describe, expect, it } from 'vitest'
import {
  buildReadinessCompositionRegistry,
  composeDeployableReadiness,
  validateReadinessCompositionRecord,
  validateReadinessCompositionRegistry,
} from '../domain/deployableReadiness'

describe('deployable readiness composition registry', () => {
  it('composes all three authoritative input classes deterministically', () => {
    const first = composeDeployableReadiness('team:alpha', {
      certificationState: 'certified',
      gearTier: 'rare',
      conditionBand: 'steady',
    })
    const second = composeDeployableReadiness('team:alpha', {
      certificationState: 'certified',
      gearTier: 'rare',
      conditionBand: 'steady',
    })

    expect(second).toEqual(first)
    expect(first).toEqual({
      deployableId: 'team:alpha',
      certificationState: 'certified',
      gearTier: 'rare',
      conditionBand: 'steady',
      fieldReliabilityScore: 95,
      readinessBand: 'ready',
      missingInputs: [],
    })
  })

  it.each([
    ['certification', { gearTier: 'rare', conditionBand: 'steady' }],
    ['gear', { certificationState: 'certified', conditionBand: 'steady' }],
    ['condition', { certificationState: 'certified', gearTier: 'rare' }],
  ] as const)('blocks readiness when %s input is missing', (missingInput, inputs) => {
    const record = composeDeployableReadiness('team:alpha', inputs)

    expect(record.fieldReliabilityScore).toBe(0)
    expect(record.readinessBand).toBe('blocked')
    expect(record.missingInputs).toEqual([missingInput])
  })

  it('treats standard certified gear and steady condition as field ready', () => {
    const record = composeDeployableReadiness('team:alpha', {
      certificationState: 'certified',
      gearTier: 'basic',
      conditionBand: 'steady',
    })

    expect(record.fieldReliabilityScore).toBe(90)
    expect(record.readinessBand).toBe('ready')
  })

  it('caps review-pending or strained inputs at limited readiness', () => {
    const reviewPending = composeDeployableReadiness('team:review', {
      certificationState: 'eligible_review',
      gearTier: 'legendary',
      conditionBand: 'steady',
    })
    const strained = composeDeployableReadiness('team:strained', {
      certificationState: 'certified',
      gearTier: 'legendary',
      conditionBand: 'strained',
    })

    expect(reviewPending).toMatchObject({
      fieldReliabilityScore: 79,
      readinessBand: 'limited',
    })
    expect(strained).toMatchObject({
      fieldReliabilityScore: 79,
      readinessBand: 'limited',
    })
  })

  it('caps training-in-progress or critical condition at degraded readiness', () => {
    const training = composeDeployableReadiness('team:training', {
      certificationState: 'in_progress',
      gearTier: 'legendary',
      conditionBand: 'steady',
    })
    const critical = composeDeployableReadiness('team:critical', {
      certificationState: 'certified',
      gearTier: 'legendary',
      conditionBand: 'critical',
    })

    expect(training).toMatchObject({
      fieldReliabilityScore: 59,
      readinessBand: 'degraded',
    })
    expect(critical).toMatchObject({
      fieldReliabilityScore: 59,
      readinessBand: 'degraded',
    })
  })

  it.each(['not_started', 'expired', 'revoked'] as const)(
    'hard-blocks %s certification state',
    (certificationState) => {
      const record = composeDeployableReadiness('team:alpha', {
        certificationState,
        gearTier: 'legendary',
        conditionBand: 'steady',
      })

      expect(record.fieldReliabilityScore).toBe(0)
      expect(record.readinessBand).toBe('blocked')
    }
  )

  it('hard-blocks unavailable condition even with certified legendary equipment', () => {
    const record = composeDeployableReadiness('team:alpha', {
      certificationState: 'certified',
      gearTier: 'legendary',
      conditionBand: 'unavailable',
    })

    expect(record.fieldReliabilityScore).toBe(0)
    expect(record.readinessBand).toBe('blocked')
  })

  it('builds a stable registry ordered by deployable id', () => {
    const registry = buildReadinessCompositionRegistry({
      'team:zulu': {
        certificationState: 'certified',
        gearTier: 'rare',
        conditionBand: 'steady',
      },
      'team:alpha': {
        certificationState: 'eligible_review',
        gearTier: 'uncommon',
        conditionBand: 'strained',
      },
    })

    expect(Object.keys(registry)).toEqual(['team:alpha', 'team:zulu'])
    expect(validateReadinessCompositionRegistry(registry)).toEqual({ valid: true, issues: [] })
  })

  it('rejects tampered derived values and registry key mismatches', () => {
    const valid = composeDeployableReadiness('team:alpha', {
      certificationState: 'certified',
      gearTier: 'rare',
      conditionBand: 'steady',
    })
    const tampered = {
      ...valid,
      fieldReliabilityScore: 100,
      readinessBand: 'limited' as const,
    }

    expect(validateReadinessCompositionRecord(tampered)).toEqual({
      valid: false,
      issues: ['field-reliability-score-mismatch', 'readiness-band-mismatch'],
    })

    expect(
      validateReadinessCompositionRecord({
        ...valid,
        missingInputs: ['gear'],
      })
    ).toEqual({
      valid: false,
      issues: ['missing-inputs-mismatch'],
    })

    expect(
      validateReadinessCompositionRegistry({
        'team:other': valid,
      })
    ).toEqual({
      valid: false,
      issues: ['team:other:registry-key-mismatch'],
    })
  })
})
