/**
 * SPE-3384 — elapsed-time invariant simulation updates.
 *
 * Reusable contract so rate-based producers yield equivalent semantic results
 * for the same authoritative elapsed time regardless of scheduler cadence.
 * SPE-1071 remains the campaign/simulation-time owner. SPE-3180 remains the
 * subjective/local-time contradiction boundary — this module never treats
 * throttling as dilation.
 */

/** Fixed-point scale: rates are "units per time-unit" in milli-units (1/1000). */
export const ELAPSED_TIME_RATE_SCALE = 1000 as const

export type ElapsedTimeUpdateKind = 'rate' | 'discrete_event'

export interface RateElapsedTimeInput {
  readonly kind: 'rate'
  /** Authoritative elapsed time units (weeks, ticks, etc. — caller-owned). */
  readonly elapsedUnits: number
  /**
   * Signed rate in milli-units per time unit (positive = accumulate/repair,
   * negative = decay/exposure). Integer only.
   */
  readonly rateMilliPerUnit: number
  /** Current discrete stored value. */
  readonly value: number
  /** Carry remainder in milli-units from prior updates (0..scale-1 magnitude). */
  readonly remainderMilli: number
  readonly minValue?: number
  readonly maxValue?: number
}

export interface DiscreteEventElapsedTimeInput {
  readonly kind: 'discrete_event'
  /** Number of discrete events/steps to apply (not a continuous rate). */
  readonly eventCount: number
  readonly value: number
  readonly deltaPerEvent: number
  readonly minValue?: number
  readonly maxValue?: number
}

export type ElapsedTimeUpdateInput = RateElapsedTimeInput | DiscreteEventElapsedTimeInput

export interface ElapsedTimeUpdateResult {
  readonly kind: ElapsedTimeUpdateKind
  readonly value: number
  readonly remainderMilli: number
  readonly appliedElapsedUnits: number
  readonly appliedEvents: number
  readonly clamped: boolean
}

function clampValue(
  value: number,
  minValue: number | undefined,
  maxValue: number | undefined,
): { value: number; clamped: boolean } {
  if (
    minValue !== undefined &&
    maxValue !== undefined &&
    minValue > maxValue
  ) {
    throw new Error(
      `elapsedTimeInvariantUpdate: inverted bounds minValue ${minValue} > maxValue ${maxValue}`,
    )
  }
  let next = value
  let clamped = false
  if (minValue !== undefined && next < minValue) {
    next = minValue
    clamped = true
  }
  if (maxValue !== undefined && next > maxValue) {
    next = maxValue
    clamped = true
  }
  return { value: next, clamped }
}

/**
 * Drop fractional progress that points past a terminal bound so fine vs coarse
 * cadences cannot reopen drift after the value has reached that bound.
 */
function discardOutwardRemainder(
  value: number,
  remainderMilli: number,
  minValue: number | undefined,
  maxValue: number | undefined,
): number {
  if (maxValue !== undefined && value >= maxValue && remainderMilli > 0) {
    return 0
  }
  if (minValue !== undefined && value <= minValue && remainderMilli < 0) {
    return 0
  }
  return remainderMilli
}

function normalizeRemainder(remainderMilli: number): number {
  if (!Number.isFinite(remainderMilli) || !Number.isInteger(remainderMilli)) {
    return 0
  }
  // Keep remainder in (-scale, scale) with sign matching unfinished progress.
  return remainderMilli % ELAPSED_TIME_RATE_SCALE
}

/**
 * Apply one elapsed-time update step. Rate producers advance by elapsedUnits;
 * discrete producers advance only by eventCount (scheduler cadence must not
 * invent events).
 */
export function applyElapsedTimeUpdate(
  input: ElapsedTimeUpdateInput,
): ElapsedTimeUpdateResult {
  if (input.kind === 'discrete_event') {
    const events =
      Number.isFinite(input.eventCount) && Number.isInteger(input.eventCount)
        ? Math.max(0, input.eventCount)
        : 0
    const delta =
      Number.isFinite(input.deltaPerEvent) && Number.isInteger(input.deltaPerEvent)
        ? input.deltaPerEvent
        : 0
    const raw = (Number.isFinite(input.value) ? input.value : 0) + events * delta
    const clamped = clampValue(raw, input.minValue, input.maxValue)
    return {
      kind: 'discrete_event',
      value: clamped.value,
      remainderMilli: 0,
      appliedElapsedUnits: 0,
      appliedEvents: events,
      clamped: clamped.clamped,
    }
  }

  const elapsed =
    Number.isFinite(input.elapsedUnits) && Number.isInteger(input.elapsedUnits)
      ? Math.max(0, input.elapsedUnits)
      : 0
  const rate =
    Number.isFinite(input.rateMilliPerUnit) && Number.isInteger(input.rateMilliPerUnit)
      ? input.rateMilliPerUnit
      : 0
  const startValue = Number.isFinite(input.value) ? input.value : 0
  const startRemainder = normalizeRemainder(
    Number.isFinite(input.remainderMilli) ? input.remainderMilli : 0,
  )

  if (elapsed === 0 || rate === 0) {
    const clamped = clampValue(startValue, input.minValue, input.maxValue)
    return {
      kind: 'rate',
      value: clamped.value,
      remainderMilli: discardOutwardRemainder(
        clamped.value,
        startRemainder,
        input.minValue,
        input.maxValue,
      ),
      appliedElapsedUnits: elapsed,
      appliedEvents: 0,
      clamped: clamped.clamped,
    }
  }

  const totalMilli = startRemainder + rate * elapsed
  const deltaWhole = Math.trunc(totalMilli / ELAPSED_TIME_RATE_SCALE)
  const nextRemainder = totalMilli - deltaWhole * ELAPSED_TIME_RATE_SCALE
  const raw = startValue + deltaWhole
  const clamped = clampValue(raw, input.minValue, input.maxValue)

  // Clear remainder on clamp, and also discard outward fractional progress
  // when the value sits on a terminal bound without a whole-unit overshoot.
  const remainderMilli = clamped.clamped
    ? 0
    : discardOutwardRemainder(
        clamped.value,
        normalizeRemainder(nextRemainder),
        input.minValue,
        input.maxValue,
      )

  return {
    kind: 'rate',
    value: clamped.value,
    remainderMilli,
    appliedElapsedUnits: elapsed,
    appliedEvents: 0,
    clamped: clamped.clamped,
  }
}

/**
 * Evaluate a rate producer across an explicit cadence schedule whose elapsed
 * slices sum to `totalElapsed`. Used to prove fine vs coarse equivalence and
 * throttled invocation paths.
 */
export function applyRateAcrossCadence(args: {
  readonly totalElapsed: number
  readonly sliceElapsedUnits: readonly number[]
  readonly rateMilliPerUnit: number
  readonly value: number
  readonly remainderMilli?: number
  readonly minValue?: number
  readonly maxValue?: number
}): ElapsedTimeUpdateResult {
  const sum = args.sliceElapsedUnits.reduce((acc, n) => acc + n, 0)
  if (sum !== args.totalElapsed) {
    throw new Error(
      `elapsedTimeInvariantUpdate: cadence slices sum ${sum} !== totalElapsed ${args.totalElapsed}`,
    )
  }
  for (const elapsedUnits of args.sliceElapsedUnits) {
    if (!Number.isFinite(elapsedUnits) || !Number.isInteger(elapsedUnits) || elapsedUnits < 0) {
      throw new Error(
        `elapsedTimeInvariantUpdate: cadence slice must be a non-negative integer, got ${elapsedUnits}`,
      )
    }
  }
  if (!Number.isFinite(args.totalElapsed) || !Number.isInteger(args.totalElapsed) || args.totalElapsed < 0) {
    throw new Error(
      `elapsedTimeInvariantUpdate: totalElapsed must be a non-negative integer, got ${args.totalElapsed}`,
    )
  }

  let value = args.value
  let remainderMilli = args.remainderMilli ?? 0
  let clamped = false
  for (const elapsedUnits of args.sliceElapsedUnits) {
    const step = applyElapsedTimeUpdate({
      kind: 'rate',
      elapsedUnits,
      rateMilliPerUnit: args.rateMilliPerUnit,
      value,
      remainderMilli,
      minValue: args.minValue,
      maxValue: args.maxValue,
    })
    value = step.value
    remainderMilli = step.remainderMilli
    clamped = clamped || step.clamped
  }

  return {
    kind: 'rate',
    value,
    remainderMilli,
    appliedElapsedUnits: args.totalElapsed,
    appliedEvents: 0,
    clamped,
  }
}

/** Representative accumulation / repair-like producer (+2 units per time unit). */
export const FIXTURE_REPAIR_RATE_MILLI_PER_UNIT = 2 * ELAPSED_TIME_RATE_SCALE

/** Representative decay / exposure-like producer (−1 unit per time unit). */
export const FIXTURE_DECAY_RATE_MILLI_PER_UNIT = -1 * ELAPSED_TIME_RATE_SCALE

export function applyFixtureRepairAccumulation(args: {
  readonly elapsedUnits: number
  readonly value: number
  readonly remainderMilli?: number
  readonly maxValue?: number
}): ElapsedTimeUpdateResult {
  return applyElapsedTimeUpdate({
    kind: 'rate',
    elapsedUnits: args.elapsedUnits,
    rateMilliPerUnit: FIXTURE_REPAIR_RATE_MILLI_PER_UNIT,
    value: args.value,
    remainderMilli: args.remainderMilli ?? 0,
    maxValue: args.maxValue,
  })
}

export function applyFixtureExposureDecay(args: {
  readonly elapsedUnits: number
  readonly value: number
  readonly remainderMilli?: number
  readonly minValue?: number
}): ElapsedTimeUpdateResult {
  return applyElapsedTimeUpdate({
    kind: 'rate',
    elapsedUnits: args.elapsedUnits,
    rateMilliPerUnit: FIXTURE_DECAY_RATE_MILLI_PER_UNIT,
    value: args.value,
    remainderMilli: args.remainderMilli ?? 0,
    minValue: args.minValue ?? 0,
  })
}

/** Intentionally discrete: one event → fixed delta; not a continuous rate. */
export function applyFixtureDiscretePulse(args: {
  readonly eventCount: number
  readonly value: number
}): ElapsedTimeUpdateResult {
  return applyElapsedTimeUpdate({
    kind: 'discrete_event',
    eventCount: args.eventCount,
    value: args.value,
    deltaPerEvent: 1,
  })
}
