import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { EXAMPLE_HOTLINE_CHANNEL } from '../domain/hotlineChannel'
import { EXAMPLE_SURVIVOR_REGISTRY } from '../domain/survivorInformalRegistry'
import type { Spe956PersistedHotlineChannel } from '../domain/spe956ParticipatoryChannelPersistence'

function freezeCasesForQuietWeek(state: ReturnType<typeof createStartingState>) {
  for (const currentCase of Object.values(state.cases)) {
    currentCase.status = 'open'
    currentCase.assignedTeamIds = []
    currentCase.requiredTags = []
    currentCase.preferredTags = []
    currentCase.weeksRemaining = undefined
  }
}

function hotlineWithWeeklyDelta(
  overrides: Partial<Spe956PersistedHotlineChannel> = {}
): Spe956PersistedHotlineChannel {
  return Object.freeze({
    ...EXAMPLE_HOTLINE_CHANNEL,
    weeklyElapsedWeeksDelta: 1,
    ...overrides,
  })
}

describe('advanceWeek SPE-956 participatory channel weekly orchestration (SPE-2643)', () => {
  it('is a no-op for empty channel maps without throwing', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.spe956SurvivorInformalRegistryRecords = {}
    state.spe956CollectiveMemoryChannelRecords = {}
    state.spe956HotlineChannelRecords = {}
    state.spe956AsyncDiscussionSurfaceRecords = {}
    state.spe956CommunityAdvisoryBodyRecords = {}

    const nextState = advanceWeek(state)

    expect(nextState.spe956HotlineChannelRecords).toEqual({})
    expect(nextState.spe956SurvivorInformalRegistryRecords).toEqual({})
  })

  it('advances authored channel elapsed weeks on advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 4
    state.spe956HotlineChannelRecords = {
      [EXAMPLE_HOTLINE_CHANNEL.id]: hotlineWithWeeklyDelta({
        elapsedChannelWeeks: 0,
      }),
    }
    state.spe956SurvivorInformalRegistryRecords = {
      [EXAMPLE_SURVIVOR_REGISTRY.id]: Object.freeze({
        ...EXAMPLE_SURVIVOR_REGISTRY,
        weeklyElapsedWeeksDelta: 2,
        elapsedChannelWeeks: 1,
      }),
    }

    const nextState = advanceWeek(state)
    const nextHotline = nextState.spe956HotlineChannelRecords?.[EXAMPLE_HOTLINE_CHANNEL.id]
    const nextSurvivor =
      nextState.spe956SurvivorInformalRegistryRecords?.[EXAMPLE_SURVIVOR_REGISTRY.id]

    expect(nextState.week).toBe(5)
    expect(nextHotline?.elapsedChannelWeeks).toBe(1)
    expect(nextHotline?.lastWeeklyTickWeek).toBe(5)
    expect(nextSurvivor?.elapsedChannelWeeks).toBe(3)
    expect(nextSurvivor?.lastWeeklyTickWeek).toBe(5)
  })

  it('does not invent channel growth when weekly deltas are absent', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    const channel = Object.freeze({ ...EXAMPLE_HOTLINE_CHANNEL })
    state.spe956HotlineChannelRecords = {
      [channel.id]: channel,
    }

    const nextState = advanceWeek(state)

    expect(nextState.spe956HotlineChannelRecords?.[channel.id]).toEqual(channel)
  })

  it('preserves evaluator envelope fields when weekly delta applies', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 2
    state.spe956HotlineChannelRecords = {
      [EXAMPLE_HOTLINE_CHANNEL.id]: hotlineWithWeeklyDelta(),
    }

    const nextState = advanceWeek(state)
    const nextHotline = nextState.spe956HotlineChannelRecords?.[EXAMPLE_HOTLINE_CHANNEL.id]

    expect(nextHotline?.scriptQuality).toBe(EXAMPLE_HOTLINE_CHANNEL.scriptQuality)
    expect(nextHotline?.staffingCapacity).toBe(EXAMPLE_HOTLINE_CHANNEL.staffingCapacity)
    expect(nextHotline?.unansweredMode).toBe(EXAMPLE_HOTLINE_CHANNEL.unansweredMode)
    expect(nextHotline?.angerMode).toBe(EXAMPLE_HOTLINE_CHANNEL.angerMode)
  })

  it('is idempotent for same-week re-tick via consecutive advanceWeek when week already stamped', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 6
    state.spe956HotlineChannelRecords = {
      [EXAMPLE_HOTLINE_CHANNEL.id]: hotlineWithWeeklyDelta({
        elapsedChannelWeeks: 3,
        lastWeeklyTickWeek: 7,
      }),
    }

    const nextState = advanceWeek(state)
    const nextHotline = nextState.spe956HotlineChannelRecords?.[EXAMPLE_HOTLINE_CHANNEL.id]

    // advanceWeek increments week to 7; channel already stamped for week 7 → no-op
    expect(nextState.week).toBe(7)
    expect(nextHotline?.elapsedChannelWeeks).toBe(3)
    expect(nextHotline?.lastWeeklyTickWeek).toBe(7)
  })

  it('surfaces weekly transition notes when channel elapsed weeks advance (SPE-2646)', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 4
    state.spe956HotlineChannelRecords = {
      [EXAMPLE_HOTLINE_CHANNEL.id]: hotlineWithWeeklyDelta({
        elapsedChannelWeeks: 0,
      }),
    }
    state.spe956SurvivorInformalRegistryRecords = {
      [EXAMPLE_SURVIVOR_REGISTRY.id]: Object.freeze({
        ...EXAMPLE_SURVIVOR_REGISTRY,
        weeklyElapsedWeeksDelta: 2,
        elapsedChannelWeeks: 1,
      }),
    }

    const nextState = advanceWeek(state)
    const transitionNotes =
      nextState.reports[nextState.reports.length - 1]?.notes?.filter(
        (note) => note.type === 'spe956_participatory_channel.weekly_transition'
      ) ?? []

    expect(transitionNotes).toHaveLength(2)
    expect(transitionNotes.some((note) => note.content.includes(EXAMPLE_HOTLINE_CHANNEL.id))).toBe(
      true
    )
    expect(transitionNotes.some((note) => note.content.includes('Elapsed 0 → 1'))).toBe(true)
    expect(transitionNotes.some((note) => note.content.includes('Elapsed 1 → 3'))).toBe(true)
  })

  it('does not surface weekly transition notes when channel maps are empty (SPE-2646)', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.spe956SurvivorInformalRegistryRecords = {}
    state.spe956CollectiveMemoryChannelRecords = {}
    state.spe956HotlineChannelRecords = {}
    state.spe956AsyncDiscussionSurfaceRecords = {}
    state.spe956CommunityAdvisoryBodyRecords = {}

    const nextState = advanceWeek(state)
    const transitionNotes =
      nextState.reports[nextState.reports.length - 1]?.notes?.filter(
        (note) => note.type === 'spe956_participatory_channel.weekly_transition'
      ) ?? []

    expect(transitionNotes).toEqual([])
  })

  it('does not re-emit transition notes when maps are unchanged on same-week re-tick (SPE-2646)', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 4
    state.spe956HotlineChannelRecords = {
      [EXAMPLE_HOTLINE_CHANNEL.id]: hotlineWithWeeklyDelta({
        elapsedChannelWeeks: 0,
      }),
    }

    const once = advanceWeek(state)
    const retickInput = {
      ...once,
      spe956HotlineChannelRecords: once.spe956HotlineChannelRecords,
    }
    retickInput.week = 4
    const reticked = advanceWeek(retickInput)
    const transitionNotes =
      reticked.reports[reticked.reports.length - 1]?.notes?.filter(
        (note) => note.type === 'spe956_participatory_channel.weekly_transition'
      ) ?? []

    expect(transitionNotes).toEqual([])
  })
})
