import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { EXAMPLE_COUNTER_MEMETIC_PLAN } from '../domain/counterMemeticUptakeGate'
import { EXAMPLE_RUMOR_FORUM_PLATFORM } from '../domain/platformReachMultiplier'
import type {
  Spe947PersistedCounterMemeticPlan,
  Spe947PersistedPlatform,
} from '../domain/spe947EvaluatorPersistence'
import { advanceWeek } from '../domain/sim/advanceWeek'

function freezeCasesForQuietWeek(state: ReturnType<typeof createStartingState>) {
  for (const currentCase of Object.values(state.cases)) {
    currentCase.status = 'open'
    currentCase.assignedTeamIds = []
    currentCase.requiredTags = []
    currentCase.preferredTags = []
    currentCase.weeksRemaining = undefined
  }
}

function propagatingPlan(): Spe947PersistedCounterMemeticPlan {
  return Object.freeze({
    ...EXAMPLE_COUNTER_MEMETIC_PLAN,
    elapsedPropagationWeeks: 0,
    uptakeState: 'partial' as const,
  })
}

function platformWithViewDelta(): Spe947PersistedPlatform {
  return Object.freeze({
    id: EXAMPLE_RUMOR_FORUM_PLATFORM.id,
    label: EXAMPLE_RUMOR_FORUM_PLATFORM.label,
    reachFactor: EXAMPLE_RUMOR_FORUM_PLATFORM.reachFactor,
    viewsPerScaleUnit: EXAMPLE_RUMOR_FORUM_PLATFORM.viewsPerScaleUnit,
    viewCount: 100,
    weeklyViewDelta: 25,
    uptimeState: 'online' as const,
  })
}

describe('advanceWeek SPE-947 evaluator weekly orchestration (SPE-2577)', () => {
  it('is a no-op for empty spe947 maps without throwing', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.spe947PlatformRecords = {}
    state.spe947CounterMemeticPlans = {}

    const nextState = advanceWeek(state)

    expect(nextState.spe947PlatformRecords).toEqual({})
    expect(nextState.spe947CounterMemeticPlans).toEqual({})
  })

  it('advances authored counter-memetic plan elapsed weeks on advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 4
    state.spe947CounterMemeticPlans = {
      [EXAMPLE_COUNTER_MEMETIC_PLAN.id]: propagatingPlan(),
    }

    const nextState = advanceWeek(state)
    const nextPlan = nextState.spe947CounterMemeticPlans?.[EXAMPLE_COUNTER_MEMETIC_PLAN.id]

    expect(nextState.week).toBe(5)
    expect(nextPlan?.elapsedPropagationWeeks).toBe(1)
    expect(nextPlan?.lastWeeklyTickWeek).toBe(5)
  })

  it('applies authored platform view delta on advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 9
    state.spe947PlatformRecords = {
      [EXAMPLE_RUMOR_FORUM_PLATFORM.id]: platformWithViewDelta(),
    }

    const nextState = advanceWeek(state)
    const nextPlatform = nextState.spe947PlatformRecords?.[EXAMPLE_RUMOR_FORUM_PLATFORM.id]

    expect(nextState.week).toBe(10)
    expect(nextPlatform?.viewCount).toBe(125)
    expect(nextPlatform?.lastWeeklyTickWeek).toBe(10)
  })

  it('does not invent platform growth when weekly deltas are absent', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    const platform: Spe947PersistedPlatform = Object.freeze({
      id: EXAMPLE_RUMOR_FORUM_PLATFORM.id,
      label: EXAMPLE_RUMOR_FORUM_PLATFORM.label,
      viewCount: 100,
      uptimeState: 'online',
    })
    state.spe947PlatformRecords = {
      [EXAMPLE_RUMOR_FORUM_PLATFORM.id]: platform,
    }

    const nextState = advanceWeek(state)

    expect(nextState.spe947PlatformRecords?.[EXAMPLE_RUMOR_FORUM_PLATFORM.id]).toEqual(platform)
  })
})
