import { describe, expect, it } from 'vitest'
import {
  normalizeConstructedEntityPurposeDrift,
  CONSTRUCTED_ENTITY_PURPOSE_DRIFT_OWNER,
} from '../domain/constructedEntityPurposeDrift'

const knownCreatorBase = {
  entityId: 'entity-7',
  intendedPurpose: 'patrol perimeter',
  currentBehaviorSummary: 'patrols but ignores designated zones',
  driftState: 'drifting' as const,
  creatorKnown: true,
  creatorId: 'creator-a',
  failureMode: 'partial' as const,
}

describe('SPE-2201 constructed entity purpose-drift registry', () => {
  it('normalizes a record with known creator and independent fields', () => {
    const result = normalizeConstructedEntityPurposeDrift(knownCreatorBase)
    expect(result).toEqual({
      entityId: 'entity-7',
      intendedPurpose: 'patrol perimeter',
      currentBehaviorSummary: 'patrols but ignores designated zones',
      driftState: 'drifting',
      creatorKnown: true,
      creatorId: 'creator-a',
      failureMode: 'partial',
      owner: CONSTRUCTED_ENTITY_PURPOSE_DRIFT_OWNER,
    })
    expect(Object.isFrozen(result)).toBe(true)
  })

  it('retains uncertain creator attribution without treating it as known', () => {
    const result = normalizeConstructedEntityPurposeDrift({
      entityId: 'entity-8',
      intendedPurpose: 'assist research',
      currentBehaviorSummary: 'idle',
      driftState: 'stable',
      creatorKnown: false,
      failureMode: 'none',
    })
    expect(result.creatorKnown).toBe(false)
    expect(result.creatorId).toBeUndefined()
    expect(result.driftState).toBe('stable')
    expect(result.failureMode).toBe('none')
  })

  it('is deterministic and does not mutate the caller', () => {
    const input = { ...knownCreatorBase }
    const before = structuredClone(input)
    const first = normalizeConstructedEntityPurposeDrift(input)
    const second = normalizeConstructedEntityPurposeDrift(input)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
    expect(input).toEqual(before)
  })

  it('rejects a stale creator ID when a record becomes uncertain', () => {
    const attributedRecord = normalizeConstructedEntityPurposeDrift(knownCreatorBase)
    expect(() =>
      normalizeConstructedEntityPurposeDrift({ ...attributedRecord, creatorKnown: false })
    ).toThrow(/creatorId must be omitted/)
  })

  it('fails closed on malformed record fields', () => {
    expect(() =>
      normalizeConstructedEntityPurposeDrift({
        ...knownCreatorBase,
        driftState: 'unknown' as never,
      })
    ).toThrow(/driftState/)
    expect(() =>
      normalizeConstructedEntityPurposeDrift({
        ...knownCreatorBase,
        failureMode: 'exploded' as never,
      })
    ).toThrow(/failureMode/)
    expect(() =>
      normalizeConstructedEntityPurposeDrift({
        ...knownCreatorBase,
        creatorKnown: true,
        creatorId: '',
      })
    ).toThrow(/creatorId/)
    expect(() =>
      normalizeConstructedEntityPurposeDrift({
        entityId: '',
        intendedPurpose: 'x',
        currentBehaviorSummary: 'y',
        driftState: 'stable',
        creatorKnown: false,
        failureMode: 'none',
      })
    ).toThrow(/entityId/)
  })
})
