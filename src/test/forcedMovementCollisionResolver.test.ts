import { describe, expect, it } from 'vitest'
import {
  resolveForcedMovementCollision,
  type ForcedMovementCollisionInput,
} from '../domain/forcedMovementCollisionResolver'

const base: ForcedMovementCollisionInput = {
  movementId: 'push-1',
  moverId: 'actor-a',
  vector: { xCells: 2, yCells: -1, levelDelta: 0 },
  impactForce: 60,
  moverStability: 70,
}

describe('SPE-2189 forced-movement collision resolver', () => {
  it('resolves actor collision, occupied-space harm, and knockdown deterministically', () => {
    const result = resolveForcedMovementCollision({
      ...base,
      target: { kind: 'actor', id: 'actor-b', stability: 20 },
    })
    expect(result).toMatchObject({
      kind: 'actor_collision',
      targetId: 'actor-b',
      obstructed: true,
      occupiedSpaceHarm: { mover: 25, occupant: 50 },
      moverKnockedDown: false,
      occupantKnockedDown: true,
      targetImpact: 60,
      infrastructurePropagation: 'not_evaluated',
      infrastructureOwner: 'SPE-2212',
      owner: 'SPE-2189',
    })
  })

  it('types object obstruction without inventing an occupied actor or infrastructure fallout', () => {
    expect(
      resolveForcedMovementCollision({
        ...base,
        moverStability: 10,
        target: { kind: 'object', id: 'crate-stack' },
      })
    ).toMatchObject({
      kind: 'object_collision',
      targetId: 'crate-stack',
      obstructed: true,
      occupiedSpaceHarm: { mover: 55, occupant: 0 },
      moverKnockedDown: true,
      occupantKnockedDown: false,
      targetImpact: 60,
      infrastructurePropagation: 'not_evaluated',
    })
  })

  it('returns a typed clear outcome when the destination is unoccupied', () => {
    expect(resolveForcedMovementCollision(base)).toMatchObject({
      kind: 'clear',
      obstructed: false,
      occupiedSpaceHarm: { mover: 0, occupant: 0 },
      moverKnockedDown: false,
      occupantKnockedDown: false,
      targetImpact: 0,
    })
  })

  it('is immutable, byte-stable for identical inputs, and does not mutate callers', () => {
    const input: ForcedMovementCollisionInput = {
      ...base,
      target: { kind: 'actor', id: 'actor-b', stability: 20 },
    }
    const before = structuredClone(input)
    const first = resolveForcedMovementCollision(input)
    const second = resolveForcedMovementCollision(input)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
    expect(input).toEqual(before)
    expect(Object.isFrozen(first)).toBe(true)
    expect(Object.isFrozen(first.vector)).toBe(true)
    expect(Object.isFrozen(first.occupiedSpaceHarm)).toBe(true)
  })

  it('fails closed on malformed vectors, impact inputs, and target kinds', () => {
    expect(() =>
      resolveForcedMovementCollision({ ...base, vector: { xCells: 0, yCells: 0, levelDelta: 0 } })
    ).toThrow(/move at least one axis/)
    expect(() => resolveForcedMovementCollision({ ...base, impactForce: 101 })).toThrow(
      /impactForce/
    )
    expect(() =>
      resolveForcedMovementCollision({
        ...base,
        target: { kind: 'actor', id: 'actor-b', stability: -1 },
      })
    ).toThrow(/target.stability/)
    expect(() =>
      resolveForcedMovementCollision({
        ...base,
        target: { kind: 'infrastructure', id: 'wall' } as never,
      })
    ).toThrow(/target kind/)
    expect(() =>
      resolveForcedMovementCollision({
        ...base,
        target: { kind: 'actor', id: base.moverId, stability: 50 },
      })
    ).toThrow(/differ from mover/)
  })
})
