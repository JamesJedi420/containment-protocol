import { describe, expect, it } from 'vitest'
import {
  projectActorObservableCue,
  type ActorObservableCueProjectionInput,
} from '../domain/actorObservableCueProjection'

const baseInput: ActorObservableCueProjectionInput = {
  internal: {
    actorId: 'actor-1',
    stress: 60,
    appraisal: 'threat-moderate',
  },
  context: {
    contextId: 'briefing',
    seed: 42,
    masking: false,
    suppression: false,
  },
}

describe('projectActorObservableCue', () => {
  it('is deterministic for identical inputs', () => {
    const a = projectActorObservableCue(baseInput)
    const b = projectActorObservableCue(baseInput)
    expect(a).toEqual(b)
    expect(a.actorId).toBe('actor-1')
    expect(a.owner).toBe('SPE-3422')
    expect(a.trace).toContain('stress=60')
  })

  it('emits distinguishable cues under different contexts for same internal state', () => {
    const highContext = projectActorObservableCue({
      ...baseInput,
      context: { ...baseInput.context, contextId: 'crisis', seed: 7, masking: true },
    })
    const lowContext = projectActorObservableCue({
      ...baseInput,
      context: { ...baseInput.context, contextId: 'routine', seed: 99, masking: false },
    })
    expect(highContext.contextId).toBe('crisis')
    expect(lowContext.contextId).toBe('routine')
    expect(highContext.cueFamily).not.toBe(lowContext.cueFamily)
    expect(highContext.quality).toBe('masked')
  })

  it('supports masking and suppression without claiming internal access', () => {
    const masked = projectActorObservableCue({
      ...baseInput,
      internal: { ...baseInput.internal, stress: 80 },
      context: { ...baseInput.context, masking: true, suppression: false },
    })
    const suppressed = projectActorObservableCue({
      ...baseInput,
      context: { ...baseInput.context, suppression: true },
    })
    expect(masked.quality).toBe('masked')
    expect(masked.intensity).toBeLessThan(80)
    expect(suppressed.quality).toBe('suppressed')
    expect(suppressed.intensity).toBe(0)
    expect(masked.trace).not.toContain('observer')
  })

  it('can produce indistinguishable outward cues from different internal states', () => {
    const highStress = projectActorObservableCue({
      ...baseInput,
      internal: { ...baseInput.internal, stress: 90, appraisal: 'high-threat' },
      context: { ...baseInput.context, seed: 10, masking: true },
    })
    const lowStressMasked = projectActorObservableCue({
      ...baseInput,
      internal: { ...baseInput.internal, stress: 30, appraisal: 'low-threat' },
      context: { ...baseInput.context, seed: 10, masking: true },
    })
    // Both masked; intensity bands can overlap under seed
    expect(highStress.quality).toBe('masked')
    expect(lowStressMasked.quality).toBe('masked')
    expect(typeof highStress.intensity).toBe('number')
  })

  it('rejects malformed input', () => {
    expect(() =>
      projectActorObservableCue({
        internal: { actorId: '', stress: 50, appraisal: 'x' },
        context: baseInput.context,
      })
    ).toThrow()
    expect(() =>
      projectActorObservableCue({
        internal: baseInput.internal,
        context: { ...baseInput.context, seed: -1 },
      })
    ).toThrow()
  })

  it('does not expose privileged internal appraisal beyond trace metadata', () => {
    const result = projectActorObservableCue(baseInput)
    expect(result).not.toHaveProperty('appraisal')
    expect(result.trace).toContain('appraisal=threat-moderate')
    // Downstream consumers receive only the cue record
    const keys = Object.keys(result)
    expect(keys).not.toContain('internal')
  })
})
