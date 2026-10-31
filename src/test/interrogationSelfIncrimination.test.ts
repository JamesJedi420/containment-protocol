import { beforeEach, describe, expect, it } from 'vitest'
import {
  createInterrogationProbe,
  isPartialSelfIncrimination,
  resolveInterrogationSelfIncrimination,
  type InterrogationProbe,
} from '../domain/interrogationSelfIncrimination'

describe('SPE-475 interrogation self-incrimination', () => {
  let baseline: InterrogationProbe

  beforeEach(() => {
    baseline = createInterrogationProbe({
      id: 'probe-1',
      subjectId: 'detainee-a',
      resistance: 12,
      modifiers: {
        deprivation: 2,
        coercion: 2,
        interrogatorSkill: 3,
        temperament: 'stoic',
      },
    })
  })

  it('allows partial self-incrimination without full confession', () => {
    const pressurized = createInterrogationProbe({
      id: 'probe-partial',
      subjectId: 'detainee-a',
      resistance: 8,
      modifiers: {
        deprivation: 4,
        coercion: 4,
        interrogatorSkill: 5,
        temperament: 'volatile',
      },
    })
    const result = resolveInterrogationSelfIncrimination(pressurized)
    expect(result.outcome).toBe('partial_leak')
    expect(result.partialIncrimination).toBe(true)
    expect(result.fullConfession).toBe(false)
    expect(isPartialSelfIncrimination(result)).toBe(true)
  })

  it('changes outcome when the condition stack intensifies', () => {
    const soft = resolveInterrogationSelfIncrimination(baseline)
    expect(soft.outcome).toBe('holds')

    const hard = createInterrogationProbe({
      ...baseline,
      id: 'probe-hard',
      modifiers: {
        deprivation: 8,
        coercion: 8,
        interrogatorSkill: 8,
        temperament: 'compliant',
      },
    })
    const broken = resolveInterrogationSelfIncrimination(hard)
    expect(broken.outcome).toBe('confession')
    expect(broken.fullConfession).toBe(true)
    expect(broken.effectivePressure).toBeGreaterThan(soft.effectivePressure)
  })

  it('stages slip and contradiction before confession', () => {
    const slip = resolveInterrogationSelfIncrimination(
      createInterrogationProbe({
        id: 'slip',
        subjectId: 'd',
        resistance: 8,
        modifiers: {
          deprivation: 4,
          coercion: 4,
          interrogatorSkill: 4,
          temperament: 'stoic',
        },
      })
    )
    expect(slip.outcome).toBe('slip')

    const contradiction = resolveInterrogationSelfIncrimination(
      createInterrogationProbe({
        id: 'contra',
        subjectId: 'd',
        resistance: 8,
        modifiers: {
          deprivation: 5,
          coercion: 5,
          interrogatorSkill: 5,
          temperament: 'stoic',
        },
      })
    )
    expect(contradiction.outcome).toBe('contradiction')
  })

  it('fail-closes malformed modifiers', () => {
    expect(() =>
      createInterrogationProbe({
        id: 'x',
        subjectId: 'y',
        resistance: 5,
        modifiers: {
          deprivation: 11,
          coercion: 0,
          interrogatorSkill: 0,
          temperament: 'stoic',
        },
      })
    ).toThrow(/deprivation/)
    expect(() =>
      createInterrogationProbe({
        id: 'x',
        subjectId: 'y',
        resistance: 5,
        modifiers: {
          deprivation: 0,
          coercion: 0,
          interrogatorSkill: 0,
          temperament: 'brave' as 'stoic',
        },
      })
    ).toThrow(/temperament/)
  })

  it('is deterministic and does not mutate inputs', () => {
    const probe = {
      id: 'p',
      subjectId: 's',
      resistance: 9,
      modifiers: {
        deprivation: 1,
        coercion: 1,
        interrogatorSkill: 1,
        temperament: 'volatile' as const,
      },
    }
    const before = structuredClone(probe)
    const first = resolveInterrogationSelfIncrimination(probe)
    const second = resolveInterrogationSelfIncrimination(probe)
    expect(first).toEqual(second)
    expect(Object.isFrozen(first)).toBe(true)
    expect(probe).toEqual(before)
  })
})
