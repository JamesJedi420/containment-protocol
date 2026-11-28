import { describe, expect, it } from 'vitest'
import {
  lookupStatusEffect,
  normalizeStatusEffects,
  STATUS_EFFECT_FIXTURE_RECORDS,
  validateStatusEffects,
} from '../domain/statusEffectRegistry'
import type { StatusEffectRecord } from '../domain/statusEffectRegistry'

const fixture = STATUS_EFFECT_FIXTURE_RECORDS

describe('statusEffectRegistry (SPE-1365 slice 1)', () => {
  it('validates fixtures and distinguishes actor from environment scope', () => {
    expect(validateStatusEffects(fixture)).toEqual({ valid: true, issues: [] })
    const actor = fixture.filter((e) => e.scope === 'actor')
    const env = fixture.filter((e) => e.scope === 'environment')
    expect(actor.length).toBeGreaterThan(0)
    expect(env.length).toBeGreaterThan(0)
    expect(actor.every((e) => e.allowedTargets.every((t) => t !== 'zone'))).toBe(true)
    expect(env.every((e) => e.allowedTargets.includes('zone'))).toBe(true)
  })

  it('supports both mundane and anomalous families with explicit duration and removal metadata', () => {
    const mundane = fixture.filter((e) => e.family === 'mundane')
    const anomalous = fixture.filter((e) => e.family === 'anomalous')
    expect(mundane.length).toBeGreaterThan(0)
    expect(anomalous.length).toBeGreaterThan(0)
    for (const effect of fixture) {
      expect(effect.durationMode).toBeTruthy()
      expect(Array.isArray(effect.removalPaths)).toBe(true)
      expect(effect.allowedTargets.length).toBeGreaterThan(0)
    }
  })

  it('rejects duplicate effect ids', () => {
    const duplicate: StatusEffectRecord = {
      ...fixture[0]!,
      id: fixture[0]!.id,
    }
    const result = validateStatusEffects([...fixture, duplicate])
    expect(result.valid).toBe(false)
    expect(result.issues.map((i) => i.code)).toContain('duplicate_effect_id')
    expect(lookupStatusEffect([...fixture, duplicate], duplicate.id).status).toBe(
      'ambiguous_effect_id'
    )
  })

  it('distinguishes invalid effect ids from unknown registry members', () => {
    const invalid = validateStatusEffects([
      {
        id: 'not-a-status',
        scope: 'actor',
        family: 'mundane',
        allowedTargets: ['operative'],
        durationMode: 'elapsed_time',
        removalPaths: ['rest'],
        visibility: 'known',
      },
    ])
    expect(invalid.valid).toBe(false)
    expect(invalid.issues.some((i) => i.code === 'invalid_effect_id')).toBe(true)

    expect(lookupStatusEffect(fixture, 'status-effect:missing').status).toBe('unknown_effect_id')
    expect(lookupStatusEffect(fixture, 'not-an-id').status).toBe('invalid_effect_id')
  })

  it('normalizes accepted whitespace and is order-independent', () => {
    const input = [
      {
        id: ' status-effect:example ',
        scope: ' actor ',
        family: ' mundane ',
        allowedTargets: [' operative '],
        durationMode: ' elapsed_time ',
        removalPaths: [' rest '],
        visibility: ' known ',
      },
    ] as unknown as StatusEffectRecord[]
    expect(validateStatusEffects(input).valid).toBe(true)
    const normalized = normalizeStatusEffects(input)!
    expect(normalized[0]!.id).toBe('status-effect:example')
    expect(normalized[0]!.scope).toBe('actor')
    expect(Object.isFrozen(normalized[0])).toBe(true)

    const reversed = [...fixture].reverse()
    const forward = normalizeStatusEffects(fixture)
    const backward = normalizeStatusEffects(reversed)
    expect(forward).toEqual(backward)
    expect(normalizeStatusEffects([])).toEqual([])
  })

  it('rejects unknown scope, family, and duration mode', () => {
    const badScope = validateStatusEffects([
      {
        id: 'status-effect:bad',
        scope: 'unknown',
        family: 'mundane',
        allowedTargets: ['operative'],
        durationMode: 'elapsed_time',
        removalPaths: [],
        visibility: 'known',
      },
    ])
    expect(badScope.valid).toBe(false)
    expect(badScope.issues.some((i) => i.code === 'unknown_scope')).toBe(true)
  })

  it('looks up effects deterministically without mutating input', () => {
    const snapshot = JSON.stringify(fixture)
    expect(lookupStatusEffect(fixture, 'status-effect:fatigued').status).toBe('found')
    expect(lookupStatusEffect(fixture, 'status-effect:suppressed-zone').status).toBe('found')
    expect(JSON.stringify(fixture)).toBe(snapshot)
  })
})
