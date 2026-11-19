import { describe, expect, it } from 'vitest'
import {
  deriveAlarmSourceCredibility,
  type AlarmSourceCredibilityInput,
} from '../domain/alarmSourceCredibilityRegistry'

const base: AlarmSourceCredibilityInput = {
  sourceId: 'alarm-door-3',
  activations: [],
}

describe('SPE-3154 alarm-source credibility registry', () => {
  it('returns high credibility with no verification burden for a new source', () => {
    const result = deriveAlarmSourceCredibility(base)
    expect(result).toMatchObject({
      sourceId: 'alarm-door-3',
      band: 'high',
      verificationBurden: 0,
      automaticMobilizationAllowed: true,
      requiresCorroboration: false,
      owner: 'SPE-3154',
    })
    expect(Object.isFrozen(result)).toBe(true)
  })

  it('reduces credibility and raises verification burden after repeated nuisance activations', () => {
    const result = deriveAlarmSourceCredibility({
      sourceId: 'alarm-door-3',
      activations: [
        { activationId: 'a1', outcome: 'nuisance', sequence: 1 },
        { activationId: 'a2', outcome: 'nuisance', sequence: 2 },
        { activationId: 'a3', outcome: 'nuisance', sequence: 3 },
      ],
    })
    expect(result.band).toBe('low')
    expect(result.verificationBurden).toBe(2)
    expect(result.automaticMobilizationAllowed).toBe(false)
    expect(result.requiresCorroboration).toBe(true)
    expect(result.reason).toContain('3 confirmed nuisance')
  })

  it('retains high credibility for sources with confirmed valid activations', () => {
    const result = deriveAlarmSourceCredibility({
      sourceId: 'alarm-door-3',
      activations: [
        { activationId: 'v1', outcome: 'confirmed_valid', sequence: 1 },
        { activationId: 'n1', outcome: 'nuisance', sequence: 2 },
      ],
    })
    expect(result.band).toBe('high')
    expect(result.automaticMobilizationAllowed).toBe(true)
  })

  it('restores high credibility after explicit corrective evidence', () => {
    const result = deriveAlarmSourceCredibility({
      sourceId: 'alarm-door-3',
      activations: [
        { activationId: 'a1', outcome: 'nuisance', sequence: 1 },
        { activationId: 'a2', outcome: 'nuisance', sequence: 2 },
        { activationId: 'a3', outcome: 'nuisance', sequence: 3 },
      ],
      hasCorrectiveEvidence: true,
    })
    expect(result.band).toBe('high')
    expect(result.verificationBurden).toBe(0)
    expect(result.automaticMobilizationAllowed).toBe(true)
    expect(result.reason).toContain('corrective evidence')
  })

  it('is deterministic and does not mutate the caller', () => {
    const input: AlarmSourceCredibilityInput = {
      sourceId: 'alarm-door-3',
      activations: [{ activationId: 'a1', outcome: 'nuisance', sequence: 1 }],
    }
    const before = structuredClone(input)
    const first = deriveAlarmSourceCredibility(input)
    const second = deriveAlarmSourceCredibility(input)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
    expect(input).toEqual(before)
  })

  it('fails closed on malformed inputs and duplicate activation ids', () => {
    expect(() => deriveAlarmSourceCredibility({ ...base, sourceId: '  ' })).toThrow(/sourceId/)
    expect(() =>
      deriveAlarmSourceCredibility({
        sourceId: 's',
        activations: [{ activationId: 'dup', outcome: 'nuisance', sequence: 1 }, { activationId: 'dup', outcome: 'nuisance', sequence: 2 }],
      })
    ).toThrow(/duplicate activationId/)
    expect(() =>
      deriveAlarmSourceCredibility({
        sourceId: 's',
        activations: [{ activationId: 'bad', outcome: 'unknown' as never, sequence: 1 }],
      })
    ).toThrow(/outcome is invalid/)
  })
})
