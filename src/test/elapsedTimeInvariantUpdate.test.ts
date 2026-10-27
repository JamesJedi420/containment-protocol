import { describe, expect, it } from 'vitest'
import {
  ELAPSED_TIME_RATE_SCALE,
  applyElapsedTimeUpdate,
  applyFixtureDiscretePulse,
  applyFixtureExposureDecay,
  applyFixtureRepairAccumulation,
  applyRateAcrossCadence,
} from '../domain/elapsedTimeInvariantUpdate'

describe('applyElapsedTimeUpdate rate cadence equivalence', () => {
  it('matches one N-unit step with N one-unit steps for repair accumulation', () => {
    const coarse = applyFixtureRepairAccumulation({ elapsedUnits: 5, value: 10 })
    let value = 10
    let remainderMilli = 0
    for (let i = 0; i < 5; i += 1) {
      const step = applyFixtureRepairAccumulation({
        elapsedUnits: 1,
        value,
        remainderMilli,
      })
      value = step.value
      remainderMilli = step.remainderMilli
    }
    expect(value).toBe(coarse.value)
    expect(remainderMilli).toBe(coarse.remainderMilli)
    expect(coarse.value).toBe(20)
  })

  it('matches fine vs coarse cadence for exposure decay', () => {
    const once = applyFixtureExposureDecay({ elapsedUnits: 8, value: 20, minValue: 0 })
    const throttled = applyRateAcrossCadence({
      totalElapsed: 8,
      sliceElapsedUnits: [3, 3, 2],
      rateMilliPerUnit: -1 * ELAPSED_TIME_RATE_SCALE,
      value: 20,
      minValue: 0,
    })
    expect(throttled.value).toBe(once.value)
    expect(throttled.remainderMilli).toBe(once.remainderMilli)
    expect(once.value).toBe(12)
  })

  it('preserves remainder so fractional rates do not drift across cadences', () => {
    const rate = Math.trunc(ELAPSED_TIME_RATE_SCALE / 2) // +0.5 per unit
    const coarse = applyElapsedTimeUpdate({
      kind: 'rate',
      elapsedUnits: 4,
      rateMilliPerUnit: rate,
      value: 0,
      remainderMilli: 0,
    })
    const fine = applyRateAcrossCadence({
      totalElapsed: 4,
      sliceElapsedUnits: [1, 1, 1, 1],
      rateMilliPerUnit: rate,
      value: 0,
    })
    expect(fine).toEqual(coarse)
    expect(coarse.value).toBe(2)
    expect(coarse.remainderMilli).toBe(0)
  })

  it('handles zero elapsed without mutation', () => {
    const result = applyFixtureRepairAccumulation({
      elapsedUnits: 0,
      value: 7,
      remainderMilli: 12,
    })
    expect(result.value).toBe(7)
    expect(result.remainderMilli).toBe(12)
    expect(result.appliedElapsedUnits).toBe(0)
  })

  it('clamps at terminal bounds and clears remainder', () => {
    const result = applyFixtureExposureDecay({
      elapsedUnits: 100,
      value: 3,
      minValue: 0,
    })
    expect(result.value).toBe(0)
    expect(result.clamped).toBe(true)
    expect(result.remainderMilli).toBe(0)
  })

  it('discards outward remainder at max so fine and coarse stay equivalent', () => {
    const rate = 750
    const coarse = applyElapsedTimeUpdate({
      kind: 'rate',
      elapsedUnits: 4,
      rateMilliPerUnit: rate,
      value: 0,
      remainderMilli: 0,
      maxValue: 1,
    })
    const fine = applyRateAcrossCadence({
      totalElapsed: 4,
      sliceElapsedUnits: [1, 1, 1, 1],
      rateMilliPerUnit: rate,
      value: 0,
      maxValue: 1,
    })
    expect(fine.value).toBe(coarse.value)
    expect(fine.remainderMilli).toBe(coarse.remainderMilli)
    expect(fine.value).toBe(1)
    expect(fine.remainderMilli).toBe(0)

    const afterCoarse = applyElapsedTimeUpdate({
      kind: 'rate',
      elapsedUnits: 2,
      rateMilliPerUnit: -rate,
      value: coarse.value,
      remainderMilli: coarse.remainderMilli,
      minValue: 0,
    })
    const afterFine = applyElapsedTimeUpdate({
      kind: 'rate',
      elapsedUnits: 2,
      rateMilliPerUnit: -rate,
      value: fine.value,
      remainderMilli: fine.remainderMilli,
      minValue: 0,
    })
    expect(afterFine).toEqual(afterCoarse)
  })

  it('clamps out-of-range rate starts before applying elapsed progress', () => {
    const rate = -750
    const coarse = applyElapsedTimeUpdate({
      kind: 'rate',
      elapsedUnits: 4,
      rateMilliPerUnit: rate,
      value: 12,
      remainderMilli: 0,
      minValue: 0,
      maxValue: 10,
    })
    const fine = applyRateAcrossCadence({
      totalElapsed: 4,
      sliceElapsedUnits: [1, 1, 1, 1],
      rateMilliPerUnit: rate,
      value: 12,
      minValue: 0,
      maxValue: 10,
    })

    expect(fine).toEqual(coarse)
    expect(coarse.value).toBe(7)
    expect(coarse.remainderMilli).toBe(0)
  })

  it('throws on inverted min/max bounds', () => {
    expect(() =>
      applyElapsedTimeUpdate({
        kind: 'rate',
        elapsedUnits: 1,
        rateMilliPerUnit: ELAPSED_TIME_RATE_SCALE,
        value: 0,
        remainderMilli: 0,
        minValue: 5,
        maxValue: 1,
      })
    ).toThrow(/inverted bounds/)
  })

  it('throws when cadence slices are non-integer', () => {
    expect(() =>
      applyRateAcrossCadence({
        totalElapsed: 1,
        sliceElapsedUnits: [0.5, 0.5],
        rateMilliPerUnit: ELAPSED_TIME_RATE_SCALE,
        value: 0,
      })
    ).toThrow(/non-negative integer/)
  })

  it('replays identically for the same inputs', () => {
    const a = applyFixtureRepairAccumulation({ elapsedUnits: 7, value: 1 })
    const b = applyFixtureRepairAccumulation({ elapsedUnits: 7, value: 1 })
    expect(a).toEqual(b)
  })
})

describe('discrete event producer', () => {
  it('applies event counts without inventing rate-based progress', () => {
    const pulses = applyFixtureDiscretePulse({ eventCount: 3, value: 10 })
    expect(pulses.value).toBe(13)
    expect(pulses.kind).toBe('discrete_event')
    expect(pulses.appliedEvents).toBe(3)
    expect(pulses.appliedElapsedUnits).toBe(0)
    expect(pulses.remainderMilli).toBe(0)

    // Elapsed time alone does not advance a discrete producer.
    const noEvent = applyElapsedTimeUpdate({
      kind: 'discrete_event',
      eventCount: 0,
      value: 10,
      deltaPerEvent: 1,
    })
    expect(noEvent.value).toBe(10)
  })
})

describe('throttled evaluation path', () => {
  it('reduces invocation count without changing authoritative outcomes', () => {
    const full = applyRateAcrossCadence({
      totalElapsed: 6,
      sliceElapsedUnits: [1, 1, 1, 1, 1, 1],
      rateMilliPerUnit: FIXTURE_RATE(),
      value: 0,
    })
    const throttled = applyRateAcrossCadence({
      totalElapsed: 6,
      sliceElapsedUnits: [6],
      rateMilliPerUnit: FIXTURE_RATE(),
      value: 0,
    })
    expect(throttled.value).toBe(full.value)
    expect(throttled.remainderMilli).toBe(full.remainderMilli)
  })
})

function FIXTURE_RATE(): number {
  return 750 // 0.75 units per time unit
}
