import { describe, expect, it } from 'vitest'

import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import { createStartingState } from '../data/startingState'
import { EXAMPLE_HOTLINE_CHANNEL } from '../domain/hotlineChannel'
import { EXAMPLE_DISCUSSION_SURFACE } from '../domain/asyncDiscussionSurface'
import { EXAMPLE_COMMUNITY_ADVISORY_BODY } from '../domain/communityAdvisoryDecisionInfluence'
import { EXAMPLE_MEMORY_STABILIZATION_CHANNEL } from '../domain/collectiveMemoryStabilization'
import { EXAMPLE_SURVIVOR_REGISTRY } from '../domain/survivorInformalRegistry'
import type { Spe956PersistedHotlineChannel } from '../domain/spe956ParticipatoryChannelPersistence'
import { sanitizeSpe956HotlineChannelRecords } from '../domain/spe956ParticipatoryChannelPersistence'
import {
  advanceSpe956ParticipatoryChannelForWeek,
  applyWeeklySpe956ParticipatoryChannelTick,
  hasSpe956ParticipatoryChannelWeeklyDelta,
  type Spe956ParticipatoryChannelPersistenceMaps,
} from '../domain/spe956ParticipatoryChannelWeeklyOrchestration'

function emptyMaps(): Spe956ParticipatoryChannelPersistenceMaps {
  return {
    spe956SurvivorInformalRegistryRecords: {},
    spe956CollectiveMemoryChannelRecords: {},
    spe956HotlineChannelRecords: {},
    spe956AsyncDiscussionSurfaceRecords: {},
    spe956CommunityAdvisoryBodyRecords: {},
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

describe('spe956ParticipatoryChannelWeeklyOrchestration (SPE-2643)', () => {
  it('treats empty maps as a no-op without throw', () => {
    const empty = emptyMaps()
    expect(applyWeeklySpe956ParticipatoryChannelTick(empty, 12)).toBe(empty)
    expect(applyWeeklySpe956ParticipatoryChannelTick(undefined, 12)).toEqual(emptyMaps())
    expect(applyWeeklySpe956ParticipatoryChannelTick(null, 12)).toEqual(emptyMaps())
  })

  it('detects authored weekly delta fields', () => {
    expect(hasSpe956ParticipatoryChannelWeeklyDelta({ weeklyElapsedWeeksDelta: 1 })).toBe(true)
    expect(hasSpe956ParticipatoryChannelWeeklyDelta({ weeklyElapsedWeeksDelta: 0 })).toBe(true)
    expect(hasSpe956ParticipatoryChannelWeeklyDelta({})).toBe(false)
    expect(hasSpe956ParticipatoryChannelWeeklyDelta({ weeklyElapsedWeeksDelta: -1 })).toBe(false)
  })

  it('leaves channels without authored delta fields unchanged', () => {
    const channel = Object.freeze({ ...EXAMPLE_HOTLINE_CHANNEL })
    expect(advanceSpe956ParticipatoryChannelForWeek(channel, 5)).toBe(channel)
  })

  it('advances elapsedChannelWeeks when weekly delta is authored', () => {
    const channel = hotlineWithWeeklyDelta({
      elapsedChannelWeeks: 2,
      weeklyElapsedWeeksDelta: 3,
    })
    const advanced = advanceSpe956ParticipatoryChannelForWeek(channel, 5)

    expect(advanced.elapsedChannelWeeks).toBe(5)
    expect(advanced.lastWeeklyTickWeek).toBe(5)
  })

  it('defaults missing elapsedChannelWeeks to zero before applying delta', () => {
    const channel = hotlineWithWeeklyDelta({ weeklyElapsedWeeksDelta: 2 })
    const advanced = advanceSpe956ParticipatoryChannelForWeek(channel, 4)

    expect(advanced.elapsedChannelWeeks).toBe(2)
    expect(advanced.lastWeeklyTickWeek).toBe(4)
  })

  it('is idempotent when re-ticked for the same week', () => {
    const channel = hotlineWithWeeklyDelta()
    const once = advanceSpe956ParticipatoryChannelForWeek(channel, 8)
    const twice = advanceSpe956ParticipatoryChannelForWeek(once, 8)

    expect(twice).toBe(once)
    expect(twice.elapsedChannelWeeks).toBe(1)
  })

  it('stamps lastWeeklyTickWeek even when delta is zero', () => {
    const channel = hotlineWithWeeklyDelta({
      weeklyElapsedWeeksDelta: 0,
      elapsedChannelWeeks: 4,
    })
    const advanced = advanceSpe956ParticipatoryChannelForWeek(channel, 6)

    expect(advanced.elapsedChannelWeeks).toBe(4)
    expect(advanced.lastWeeklyTickWeek).toBe(6)
  })

  it('materializes elapsedChannelWeeks 0 when zero delta applies to missing counter', () => {
    const channel = hotlineWithWeeklyDelta({ weeklyElapsedWeeksDelta: 0 })
    const advanced = advanceSpe956ParticipatoryChannelForWeek(channel, 6)

    expect(advanced.elapsedChannelWeeks).toBe(0)
    expect(advanced.lastWeeklyTickWeek).toBe(6)
  })

  it('clamps counter overflow to Number.MAX_VALUE without producing Infinity', () => {
    const channel = hotlineWithWeeklyDelta({
      elapsedChannelWeeks: Number.MAX_VALUE,
      weeklyElapsedWeeksDelta: Number.MAX_VALUE,
    })
    const advanced = advanceSpe956ParticipatoryChannelForWeek(channel, 3)

    expect(advanced.elapsedChannelWeeks).toBe(Number.MAX_VALUE)
    expect(Number.isFinite(advanced.elapsedChannelWeeks)).toBe(true)
    expect(advanced.lastWeeklyTickWeek).toBe(3)
  })

  it('round-trips weekly fields through sanitize and save/load', () => {
    const channel = hotlineWithWeeklyDelta({
      elapsedChannelWeeks: Number.MAX_VALUE,
      weeklyElapsedWeeksDelta: 2,
      lastWeeklyTickWeek: 2,
    })
    const sanitized = sanitizeSpe956HotlineChannelRecords({ [channel.id]: channel })
    expect(sanitized[channel.id]?.elapsedChannelWeeks).toBe(Number.MAX_VALUE)
    expect(sanitized[channel.id]?.weeklyElapsedWeeksDelta).toBe(2)
    expect(sanitized[channel.id]?.lastWeeklyTickWeek).toBe(2)

    const state = createStartingState()
    Object.assign(state, {
      spe956HotlineChannelRecords: sanitized,
    })

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.spe956HotlineChannelRecords?.[channel.id]?.elapsedChannelWeeks).toBe(
      Number.MAX_VALUE
    )
    expect(loaded.spe956HotlineChannelRecords?.[channel.id]?.weeklyElapsedWeeksDelta).toBe(2)
    expect(loaded.spe956HotlineChannelRecords?.[channel.id]?.lastWeeklyTickWeek).toBe(2)
  })

  it('drops entries with invalid weekly fields during sanitize', () => {
    const dropped = sanitizeSpe956HotlineChannelRecords({
      bad: {
        ...EXAMPLE_HOTLINE_CHANNEL,
        weeklyElapsedWeeksDelta: -1,
      },
    })
    expect(Object.keys(dropped)).toEqual([])

    const fractionalWeek = sanitizeSpe956HotlineChannelRecords({
      bad: {
        ...EXAMPLE_HOTLINE_CHANNEL,
        lastWeeklyTickWeek: 4.9,
      },
    })
    expect(Object.keys(fractionalWeek)).toEqual([])
  })

  it('ticks all five map kinds when deltas are authored', () => {
    const survivor = Object.freeze({
      ...EXAMPLE_SURVIVOR_REGISTRY,
      weeklyElapsedWeeksDelta: 1,
    })
    const memory = Object.freeze({
      ...EXAMPLE_MEMORY_STABILIZATION_CHANNEL,
      weeklyElapsedWeeksDelta: 1,
    })
    const hotline = hotlineWithWeeklyDelta()
    const asyncSurface = Object.freeze({
      ...EXAMPLE_DISCUSSION_SURFACE,
      weeklyElapsedWeeksDelta: 1,
    })
    const advisory = Object.freeze({
      ...EXAMPLE_COMMUNITY_ADVISORY_BODY,
      weeklyElapsedWeeksDelta: 1,
    })
    const maps: Spe956ParticipatoryChannelPersistenceMaps = {
      spe956SurvivorInformalRegistryRecords: { [survivor.id]: survivor },
      spe956CollectiveMemoryChannelRecords: { [memory.id]: memory },
      spe956HotlineChannelRecords: { [hotline.id]: hotline },
      spe956AsyncDiscussionSurfaceRecords: { [asyncSurface.id]: asyncSurface },
      spe956CommunityAdvisoryBodyRecords: { [advisory.id]: advisory },
    }

    const next = applyWeeklySpe956ParticipatoryChannelTick(maps, 9)

    expect(next).not.toBe(maps)
    expect(next.spe956SurvivorInformalRegistryRecords[survivor.id]?.elapsedChannelWeeks).toBe(1)
    expect(next.spe956SurvivorInformalRegistryRecords[survivor.id]?.lastWeeklyTickWeek).toBe(9)
    expect(next.spe956CollectiveMemoryChannelRecords[memory.id]?.elapsedChannelWeeks).toBe(1)
    expect(next.spe956CollectiveMemoryChannelRecords[memory.id]?.lastWeeklyTickWeek).toBe(9)
    expect(next.spe956HotlineChannelRecords[hotline.id]?.elapsedChannelWeeks).toBe(1)
    expect(next.spe956HotlineChannelRecords[hotline.id]?.lastWeeklyTickWeek).toBe(9)
    expect(next.spe956AsyncDiscussionSurfaceRecords[asyncSurface.id]?.elapsedChannelWeeks).toBe(1)
    expect(next.spe956AsyncDiscussionSurfaceRecords[asyncSurface.id]?.lastWeeklyTickWeek).toBe(9)
    expect(next.spe956CommunityAdvisoryBodyRecords[advisory.id]?.elapsedChannelWeeks).toBe(1)
    expect(next.spe956CommunityAdvisoryBodyRecords[advisory.id]?.lastWeeklyTickWeek).toBe(9)
  })

  it('applies map tick in deterministic code-unit channel-id order', () => {
    const alpha = hotlineWithWeeklyDelta({ id: 'channel:alpha' })
    const beta = hotlineWithWeeklyDelta({ id: 'channel:beta' })
    const maps: Spe956ParticipatoryChannelPersistenceMaps = {
      ...emptyMaps(),
      spe956HotlineChannelRecords: {
        [beta.id]: beta,
        [alpha.id]: alpha,
      },
    }

    const next = applyWeeklySpe956ParticipatoryChannelTick(maps, 3)

    expect(next.spe956HotlineChannelRecords[alpha.id]?.elapsedChannelWeeks).toBe(1)
    expect(next.spe956HotlineChannelRecords[beta.id]?.elapsedChannelWeeks).toBe(1)
    expect(next.spe956HotlineChannelRecords[alpha.id]?.lastWeeklyTickWeek).toBe(3)
    expect(next.spe956HotlineChannelRecords[beta.id]?.lastWeeklyTickWeek).toBe(3)
  })
})
