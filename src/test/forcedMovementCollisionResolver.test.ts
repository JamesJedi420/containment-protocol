import { describe, expect, it } from 'vitest'
import {
  resolveForcedMovementCollision,
  type ForcedMovementInput,
} from '../domain/forcedMovementCollisionResolver'

describe('forcedMovementCollisionResolver (SPE-2189)', () => {
  it('produces a typed impact outcome for forced displacement against an actor', () => {
    const input: ForcedMovementInput = {
      displacement: { dx: 3, dy: 0 },
      targetKind: 'actor',
      targetId: 'actor-1',
      targetOccupied: false,
      resistance: 1,
    }
    const result = resolveForcedMovementCollision(input)
    expect(result.outcome.kind).toBe('impact')
    expect(result.outcome.targetId).toBe('actor-1')
    expect(result.occupiedSpaceHarm).toBeNull()
  })

  it('applies occupied-space harm without infrastructure damage', () => {
    const input: ForcedMovementInput = {
      displacement: { dx: 5, dy: 0 },
      targetKind: 'object',
      targetId: 'crate-1',
      targetOccupied: true,
      resistance: 0,
    }
    const result = resolveForcedMovementCollision(input)
    expect(result.outcome.kind).toBe('knockdown')
    expect(result.occupiedSpaceHarm).not.toBeNull()
    expect(result.occupiedSpaceHarm?.source).toBe('occupied-space')
    expect(result.occupiedSpaceHarm?.harmAmount).toBeGreaterThan(0)
  })

  it('returns obstruction when resistance exceeds displacement', () => {
    const input: ForcedMovementInput = {
      displacement: { dx: 1, dy: 0 },
      targetKind: 'actor',
      targetId: 'actor-2',
      targetOccupied: false,
      resistance: 5,
    }
    const result = resolveForcedMovementCollision(input)
    expect(result.outcome.kind).toBe('obstruction')
  })

  it('is deterministic for identical inputs', () => {
    const input: ForcedMovementInput = {
      displacement: { dx: 2, dy: 2 },
      targetKind: 'object',
      targetId: 'box-1',
      targetOccupied: true,
      resistance: 1,
    }
    const a = resolveForcedMovementCollision(input)
    const b = resolveForcedMovementCollision(input)
    expect(a).toEqual(b)
  })
})
