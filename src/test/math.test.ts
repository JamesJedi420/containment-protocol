import { describe, expect, it } from 'vitest'
import {
  clamp,
  createSeededRng,
  nextSeed,
  normalizeSeed,
  randInt,
  roll,
  sigmoid,
} from '../domain/math'

describe('math helpers', () => {
  it('clamps values within the provided range', () => {
    expect(clamp(-5, 0, 10)).toBe(0)
    expect(clamp(4, 0, 10)).toBe(4)
    expect(clamp(15, 0, 10)).toBe(10)
    expect(clamp(4, 10, 0)).toBe(4)
  })

  it('normalizes invalid or zero seeds into a positive uint32 value', () => {
    expect(normalizeSeed(Number.NaN)).toBe(1)
    expect(normalizeSeed(Number.POSITIVE_INFINITY)).toBe(1)
    expect(normalizeSeed(0)).toBe(1)
    expect(normalizeSeed(-42.9)).toBe(42)
  })

  it('advances seeded rng state deterministically', () => {
    const first = nextSeed(1337)
    const second = nextSeed(first)
    const rng = createSeededRng(1337)

    expect(rng.next()).toBeCloseTo(first / 2 ** 32, 12)
    expect(rng.getState()).toBe(first)
    expect(rng.next()).toBeCloseTo(second / 2 ** 32, 12)
    expect(rng.getState()).toBe(second)
  })

  it('returns inclusive random integers using the supplied rng', () => {
    expect(randInt(() => 0, 3, 7)).toBe(3)
    expect(randInt(() => 0.999999, 3, 7)).toBe(7)
    expect(randInt(() => 0.5, 7, 3)).toBe(5)
  })

  it('clamps roll probability before comparing against the rng', () => {
    expect(roll(-1, () => 0)).toBe(false)
    expect(roll(2, () => 0.999)).toBe(true)
    expect(roll(0.4, () => 0.5)).toBe(false)
    expect(roll(Number.NaN, () => 0)).toBe(false)
  })

  it('produces a sigmoid centered around zero', () => {
    expect(sigmoid(0)).toBeCloseTo(0.5, 12)
    expect(sigmoid(10)).toBeGreaterThan(0.99)
    expect(sigmoid(-10)).toBeLessThan(0.01)
  })
})
