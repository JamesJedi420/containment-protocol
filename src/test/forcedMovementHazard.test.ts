import { describe, expect, it } from 'vitest'
import {
  SHORT_KNOCKBACK_MAX_CELLS,
  applyForcedMovementHazard,
  createForcedMovementHazard,
  isOrdinaryKnockback,
} from '../domain/forcedMovementHazard'

describe('SPE-399 long-range and vertical forced-movement hazards', () => {
  it('displaces a target across levels via vertical hazard', () => {
    const hazard = createForcedMovementHazard({
      id: 'shaft-drop',
      kind: 'vertical_level_change',
      rangeCells: 0,
      levelDelta: -2,
    })
    const result = applyForcedMovementHazard(hazard, { nodeId: 'balcony', level: 3 }, 'pit-floor')
    expect(result.to).toEqual({ nodeId: 'pit-floor', level: 1 })
    expect(result.longRange).toBe(true)
    expect(result.traversalChanged).toBe(true)
    expect(isOrdinaryKnockback(result.kind)).toBe(false)
  })

  it('ejects through a one-way exit and changes traversal outcome', () => {
    const hazard = createForcedMovementHazard({
      id: 'chute',
      kind: 'one_way_exit',
      rangeCells: 1,
      levelDelta: -1,
      exitNodeId: 'alley-grate',
    })
    const result = applyForcedMovementHazard(hazard, { nodeId: 'roof-hatch', level: 2 })
    expect(result.oneWayExit).toBe(true)
    expect(result.to.nodeId).toBe('alley-grate')
    expect(result.to.level).toBe(1)
    expect(result.traversalChanged).toBe(true)
  })

  it('distinguishes long-range horizontal from ordinary knockback', () => {
    const knockback = createForcedMovementHazard({
      id: 'shove',
      kind: 'short_knockback',
      rangeCells: SHORT_KNOCKBACK_MAX_CELLS,
      levelDelta: 0,
    })
    const longRange = createForcedMovementHazard({
      id: 'cannon',
      kind: 'long_range_horizontal',
      rangeCells: SHORT_KNOCKBACK_MAX_CELLS + 3,
      levelDelta: 0,
    })
    const shortResult = applyForcedMovementHazard(
      knockback,
      { nodeId: 'a', level: 0 },
      'a-adjacent'
    )
    const longResult = applyForcedMovementHazard(longRange, { nodeId: 'a', level: 0 }, 'far-ledge')
    expect(shortResult.longRange).toBe(false)
    expect(longResult.longRange).toBe(true)
    expect(longRange.rangeCells).toBeGreaterThan(SHORT_KNOCKBACK_MAX_CELLS)
    expect(isOrdinaryKnockback(shortResult.kind)).toBe(true)
    expect(isOrdinaryKnockback(longResult.kind)).toBe(false)
  })

  it('is deterministic and does not mutate inputs', () => {
    const hazard = {
      id: 'h1',
      kind: 'long_range_horizontal' as const,
      rangeCells: 5,
      levelDelta: 0,
    }
    const from = { nodeId: 'start', level: 0 }
    const beforeH = structuredClone(hazard)
    const beforeF = structuredClone(from)
    const first = applyForcedMovementHazard(hazard, from, 'end')
    const second = applyForcedMovementHazard(hazard, from, 'end')
    expect(first).toEqual(second)
    expect(Object.isFrozen(first)).toBe(true)
    expect(hazard).toEqual(beforeH)
    expect(from).toEqual(beforeF)
  })

  it('rejects malformed hazards and missing destinations', () => {
    expect(() =>
      createForcedMovementHazard({
        id: 'bad',
        kind: 'long_range_horizontal',
        rangeCells: 1,
        levelDelta: 0,
      })
    ).toThrow(/exceed short knockback/)
    expect(() =>
      createForcedMovementHazard({
        id: 'bad2',
        kind: 'one_way_exit',
        rangeCells: 1,
        levelDelta: 0,
      })
    ).toThrow(/exitNodeId/)
    const vertical = createForcedMovementHazard({
      id: 'v',
      kind: 'vertical_level_change',
      rangeCells: 0,
      levelDelta: 1,
    })
    expect(() => applyForcedMovementHazard(vertical, { nodeId: 'a', level: 0 })).toThrow(
      /destinationNodeId/
    )
  })
})
