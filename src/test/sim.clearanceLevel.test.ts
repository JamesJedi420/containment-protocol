import { describe, expect, it } from 'vitest'
import { computeClearanceLevel, resolveMaxClearanceLevel } from '../domain/sim/clearanceLevel'

describe('computeClearanceLevel', () => {
  it('returns level 1 when no thresholds are configured', () => {
    expect(computeClearanceLevel(500, [])).toBe(1)
    expect(computeClearanceLevel(-10, [])).toBe(1)
  })

  it('returns level 2 when the first threshold is met', () => {
    expect(computeClearanceLevel(0, [0])).toBe(2)
    expect(computeClearanceLevel(50, [40])).toBe(2)
  })

  it('counts each met threshold in sorted order', () => {
    expect(computeClearanceLevel(150, [100, 200])).toBe(2)
    expect(computeClearanceLevel(250, [100, 200])).toBe(3)
    expect(computeClearanceLevel(350, [100, 200, 300])).toBe(4)
  })

  it('sorts unsorted thresholds before counting', () => {
    expect(computeClearanceLevel(150, [200, 50, 100])).toBe(3)
    expect(computeClearanceLevel(75, [200, 50, 100])).toBe(2)
  })
})

describe('resolveMaxClearanceLevel', () => {
  it('returns 1 when no thresholds are configured', () => {
    expect(resolveMaxClearanceLevel([])).toBe(1)
  })

  it('returns one plus the threshold count', () => {
    expect(resolveMaxClearanceLevel([0, 180, 420])).toBe(4)
  })
})
