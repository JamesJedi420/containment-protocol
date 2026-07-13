import { describe, expect, it } from 'vitest'
import {
  EXAMPLE_COUNTER_MEMETIC_PLAN,
  evaluateCounterMemeticUptakeGate,
} from '../domain/counterMemeticUptakeGate'
import {
  EXAMPLE_RUMOR_FORUM_PLATFORM,
  evaluatePlatformReachMultiplier,
} from '../domain/platformReachMultiplier'
import {
  resolveCounterMemeticUptakeEvaluationInput,
  resolvePlatformReachEvaluationInput,
  SPE_947_EXAMPLE_PERSISTENCE_FIXTURE,
  type Spe947PersistedCounterMemeticPlan,
  type Spe947PersistedPlatform,
} from '../domain/spe947EvaluatorPersistence'
import {
  advanceSpe947CounterMemeticPlanForWeek,
  advanceSpe947PlatformForWeek,
  applyWeeklySpe947EvaluatorTick,
  hasSpe947PlatformWeeklyDelta,
  isSpe947CounterMemeticPlanEligibleForWeeklyTick,
} from '../domain/spe947EvaluatorWeeklyOrchestration'

function propagatingPlan(
  overrides: Partial<Spe947PersistedCounterMemeticPlan> = {}
): Spe947PersistedCounterMemeticPlan {
  return Object.freeze({
    ...EXAMPLE_COUNTER_MEMETIC_PLAN,
    elapsedPropagationWeeks: 0,
    uptakeState: 'partial' as const,
    ...overrides,
  })
}

function platformWithDeltas(
  overrides: Partial<Spe947PersistedPlatform> = {}
): Spe947PersistedPlatform {
  return Object.freeze({
    id: EXAMPLE_RUMOR_FORUM_PLATFORM.id,
    label: EXAMPLE_RUMOR_FORUM_PLATFORM.label,
    reachFactor: EXAMPLE_RUMOR_FORUM_PLATFORM.reachFactor,
    viewsPerScaleUnit: EXAMPLE_RUMOR_FORUM_PLATFORM.viewsPerScaleUnit,
    viewCount: 100,
    weeklyViewDelta: 50,
    uptimeState: 'online' as const,
    weeklyUptimeState: 'degraded' as const,
    ...overrides,
  })
}

describe('spe947EvaluatorWeeklyOrchestration (SPE-2577 slice 1)', () => {
  it('is a no-op for empty maps without throwing', () => {
    const empty = {
      spe947PlatformRecords: {},
      spe947OperationRecords: {},
      spe947ContentArtifacts: {},
      spe947CounterMemeticPlans: {},
      spe947ContentOwners: {},
      spe947PostCaseMediaCases: {},
      spe947FootageExposureBindings: {},
      spe947TakedownResistanceBindings: {},
    }

    expect(applyWeeklySpe947EvaluatorTick(empty, 12)).toEqual(empty)
    expect(applyWeeklySpe947EvaluatorTick(undefined, 12).spe947PlatformRecords).toEqual({})
    expect(applyWeeklySpe947EvaluatorTick(null, 12).spe947CounterMemeticPlans).toEqual({})
  })

  it('resolves plan eligibility from crafted lore + distributor', () => {
    expect(isSpe947CounterMemeticPlanEligibleForWeeklyTick(EXAMPLE_COUNTER_MEMETIC_PLAN)).toBe(true)
    expect(
      isSpe947CounterMemeticPlanEligibleForWeeklyTick({
        loreState: 'draft',
        distributorId: 'distributor:civic-bulletin',
      })
    ).toBe(false)
    expect(
      isSpe947CounterMemeticPlanEligibleForWeeklyTick({
        loreState: 'crafted',
        distributorId: undefined,
      })
    ).toBe(false)
  })

  it('detects authored platform weekly deltas only when present', () => {
    expect(hasSpe947PlatformWeeklyDelta(platformWithDeltas())).toBe(true)
    expect(
      hasSpe947PlatformWeeklyDelta({
        weeklyViewDelta: undefined,
        weeklyUptimeState: undefined,
      })
    ).toBe(false)
  })

  it('advances elapsedPropagationWeeks on eligible plans', () => {
    const plan = propagatingPlan()
    const advanced = advanceSpe947CounterMemeticPlanForWeek(plan, 5)

    expect(advanced).not.toBe(plan)
    expect(advanced.elapsedPropagationWeeks).toBe(1)
    expect(advanced.lastWeeklyTickWeek).toBe(5)
    expect(advanced.uptakeState).toBe('partial')
  })

  it('leaves ineligible plans unchanged', () => {
    const plan = propagatingPlan({ loreState: 'draft', distributorId: undefined })
    expect(advanceSpe947CounterMemeticPlanForWeek(plan, 5)).toBe(plan)
  })

  it('is idempotent when re-applied for the same week on plans', () => {
    const once = advanceSpe947CounterMemeticPlanForWeek(propagatingPlan(), 5)
    const twice = advanceSpe947CounterMemeticPlanForWeek(once, 5)

    expect(twice).toBe(once)
    expect(twice.elapsedPropagationWeeks).toBe(1)
  })

  it('applies authored platform view and uptime deltas', () => {
    const platform = platformWithDeltas()
    const advanced = advanceSpe947PlatformForWeek(platform, 8)

    expect(advanced).not.toBe(platform)
    expect(advanced.viewCount).toBe(150)
    expect(advanced.uptimeState).toBe('degraded')
    expect(advanced.lastWeeklyTickWeek).toBe(8)
    expect(advanced.weeklyViewDelta).toBe(50)
  })

  it('leaves platforms without authored deltas unchanged', () => {
    const platform = platformWithDeltas({
      weeklyViewDelta: undefined,
      weeklyUptimeState: undefined,
    })
    expect(advanceSpe947PlatformForWeek(platform, 8)).toBe(platform)
  })

  it('is idempotent when re-applied for the same week on platforms', () => {
    const once = advanceSpe947PlatformForWeek(platformWithDeltas(), 8)
    const twice = advanceSpe947PlatformForWeek(once, 8)

    expect(twice).toBe(once)
    expect(twice.viewCount).toBe(150)
  })

  it('applies tick in stable id order without inventing growth on EXAMPLE fixture platforms', () => {
    const maps = {
      ...SPE_947_EXAMPLE_PERSISTENCE_FIXTURE,
      spe947CounterMemeticPlans: {
        [EXAMPLE_COUNTER_MEMETIC_PLAN.id]: propagatingPlan(),
      },
    }

    const next = applyWeeklySpe947EvaluatorTick(maps, 3)

    expect(
      next.spe947CounterMemeticPlans[EXAMPLE_COUNTER_MEMETIC_PLAN.id]?.elapsedPropagationWeeks
    ).toBe(1)
    // EXAMPLE platform has no weekly deltas authored — identity preserved.
    expect(next.spe947PlatformRecords).toBe(maps.spe947PlatformRecords)
  })

  it('does not falsely satisfy parent AC from empty default maps after tick', () => {
    const empty = applyWeeklySpe947EvaluatorTick(
      {
        spe947PlatformRecords: {},
        spe947OperationRecords: {},
        spe947ContentArtifacts: {},
        spe947CounterMemeticPlans: {},
        spe947ContentOwners: {},
        spe947PostCaseMediaCases: {},
        spe947FootageExposureBindings: {},
        spe947TakedownResistanceBindings: {},
      },
      10
    )

    const reach = evaluatePlatformReachMultiplier(
      resolvePlatformReachEvaluationInput(empty, EXAMPLE_RUMOR_FORUM_PLATFORM.id)
    )
    const uptake = evaluateCounterMemeticUptakeGate(
      resolveCounterMemeticUptakeEvaluationInput(empty, EXAMPLE_COUNTER_MEMETIC_PLAN.id)
    )

    expect(reach.reasonCodes).toContain('missing_platform')
    expect(uptake.readiness).toBe('blocked')
  })

  it('advances a propagating plan toward ready across distinct weeks', () => {
    let plan = propagatingPlan({
      requiredPropagationWeeks: 2,
      elapsedPropagationWeeks: 0,
      uptakeState: 'sufficient',
    })

    plan = advanceSpe947CounterMemeticPlanForWeek(plan, 1)
    expect(evaluateCounterMemeticUptakeGate({ plan }).readiness).toBe('propagating')

    plan = advanceSpe947CounterMemeticPlanForWeek(plan, 2)
    expect(plan.elapsedPropagationWeeks).toBe(2)
    expect(evaluateCounterMemeticUptakeGate({ plan }).readiness).toBe('ready')
  })
})
