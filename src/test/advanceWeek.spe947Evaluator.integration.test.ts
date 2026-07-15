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

  it('surfaces weekly transition notes when plan elapsed weeks advance', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 4
    state.spe947CounterMemeticPlans = {
      [EXAMPLE_COUNTER_MEMETIC_PLAN.id]: propagatingPlan(),
    }

    const nextState = advanceWeek(state)
    const transitionNotes =
      nextState.reports[nextState.reports.length - 1]?.notes?.filter(
        (note) => note.type === 'spe947_evaluator.weekly_transition'
      ) ?? []

    expect(transitionNotes).toHaveLength(1)
    expect(transitionNotes[0]?.content).toContain(EXAMPLE_COUNTER_MEMETIC_PLAN.label)
    expect(transitionNotes[0]?.content).toContain('Elapsed 0 → 1')
  })

  it('surfaces weekly transition notes when platform view delta applies', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 9
    state.spe947PlatformRecords = {
      [EXAMPLE_RUMOR_FORUM_PLATFORM.id]: platformWithViewDelta(),
    }

    const nextState = advanceWeek(state)
    const transitionNotes =
      nextState.reports[nextState.reports.length - 1]?.notes?.filter(
        (note) => note.type === 'spe947_evaluator.weekly_transition'
      ) ?? []

    expect(transitionNotes).toHaveLength(1)
    expect(transitionNotes[0]?.content).toContain(EXAMPLE_RUMOR_FORUM_PLATFORM.label)
    expect(transitionNotes[0]?.content).toContain('Views 100 → 125')
  })

  it('does not surface weekly transition notes when spe947 maps are empty', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.spe947PlatformRecords = {}
    state.spe947CounterMemeticPlans = {}

    const nextState = advanceWeek(state)
    const transitionNotes =
      nextState.reports[nextState.reports.length - 1]?.notes?.filter(
        (note) => note.type === 'spe947_evaluator.weekly_transition'
      ) ?? []

    expect(transitionNotes).toEqual([])
  })

  it('does not re-emit transition notes when maps are unchanged on same-week re-tick', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 4
    state.spe947CounterMemeticPlans = {
      [EXAMPLE_COUNTER_MEMETIC_PLAN.id]: propagatingPlan(),
    }

    const once = advanceWeek(state)
    const retickInput = {
      ...once,
      spe947CounterMemeticPlans: once.spe947CounterMemeticPlans,
    }
    retickInput.week = 4
    const reticked = advanceWeek(retickInput)
    const transitionNotes =
      reticked.reports[reticked.reports.length - 1]?.notes?.filter(
        (note) => note.type === 'spe947_evaluator.weekly_transition'
      ) ?? []

    expect(reticked.spe947CounterMemeticPlans?.[EXAMPLE_COUNTER_MEMETIC_PLAN.id]).toEqual(
      once.spe947CounterMemeticPlans?.[EXAMPLE_COUNTER_MEMETIC_PLAN.id]
    )
    expect(transitionNotes).toEqual([])
  })
})

describe('advanceWeek SPE-947 media-economy week-close (SPE-2615)', () => {
  it('no-ops for empty economy maps / no persisted actors without inventing truth', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.spe947MediaEconomyWeights = {}
    state.spe947MediaEconomyContinuityBindings = {}

    const nextState = advanceWeek(state)

    expect(nextState.spe947MediaEconomyWeights).toEqual({})
    expect(nextState.spe947MediaEconomyContinuityBindings).toEqual({})
  })

  it('does not mutate authored economy maps when actors are not persisted', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 6
    state.spe947MediaEconomyWeights = {
      'weight:test': {
        id: 'weight:test',
        label: 'Test weight',
        continuityFactor: 2,
      },
    }
    state.spe947MediaEconomyContinuityBindings = {
      'bind:test': {
        id: 'bind:test',
        caseId: 'case:test',
        economyWeightId: 'weight:test',
      },
    }
    const priorWeights = structuredClone(state.spe947MediaEconomyWeights)
    const priorBindings = structuredClone(state.spe947MediaEconomyContinuityBindings)

    const nextState = advanceWeek(state)

    expect(nextState.spe947MediaEconomyWeights).toEqual(priorWeights)
    expect(nextState.spe947MediaEconomyContinuityBindings).toEqual(priorBindings)
  })
})
