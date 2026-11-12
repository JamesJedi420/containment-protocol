import { describe, expect, it } from 'vitest'

import { EXAMPLE_HOTLINE_CHANNEL } from '../domain/hotlineChannel'
import { EXAMPLE_SURVIVOR_REGISTRY } from '../domain/survivorInformalRegistry'
import type { Spe956PersistedHotlineChannel } from '../domain/spe956ParticipatoryChannelPersistence'
import { advanceSpe956ParticipatoryChannelForWeek } from '../domain/spe956ParticipatoryChannelWeeklyOrchestration'
import { buildWeeklySpe956ParticipatoryChannelTransitionReportNotes } from '../domain/spe956ParticipatoryChannelWeeklyReportNotes'
import {
  composeSpe956ParticipatoryChannelWeeklyTransitionSummaries,
  formatSpe956ParticipatoryChannelWeeklyTransitionNoteContent,
} from '../domain/spe956ParticipatoryChannelSurfacing'

function emptyMaps() {
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
    elapsedChannelWeeks: 0,
    ...overrides,
  })
}

describe('spe956ParticipatoryChannelSurfacing (SPE-2646)', () => {
  it('returns no summaries for empty maps', () => {
    expect(
      composeSpe956ParticipatoryChannelWeeklyTransitionSummaries({
        priorMaps: emptyMaps(),
        nextMaps: emptyMaps(),
      })
    ).toEqual([])
  })

  it('returns no summaries when records are unchanged', () => {
    const channel = hotlineWithWeeklyDelta({ weeklyElapsedWeeksDelta: undefined })
    const maps = {
      ...emptyMaps(),
      spe956HotlineChannelRecords: { [channel.id]: channel },
    }

    expect(
      composeSpe956ParticipatoryChannelWeeklyTransitionSummaries({
        priorMaps: maps,
        nextMaps: maps,
      })
    ).toEqual([])
  })

  it('surfaces channel elapsed-week advancement', () => {
    const prior = hotlineWithWeeklyDelta()
    const next = advanceSpe956ParticipatoryChannelForWeek(prior, 5)

    const summaries = composeSpe956ParticipatoryChannelWeeklyTransitionSummaries({
      priorMaps: {
        ...emptyMaps(),
        spe956HotlineChannelRecords: { [prior.id]: prior },
      },
      nextMaps: {
        ...emptyMaps(),
        spe956HotlineChannelRecords: { [prior.id]: next },
      },
    })

    expect(summaries).toHaveLength(1)
    expect(summaries[0]?.channelKind).toBe('hotline')
    expect(summaries[0]?.transitionKinds).toEqual(['channel_elapsed_weeks_advanced'])
    expect(summaries[0]?.priorElapsedChannelWeeks).toBe(0)
    expect(summaries[0]?.nextElapsedChannelWeeks).toBe(1)
    expect(formatSpe956ParticipatoryChannelWeeklyTransitionNoteContent(summaries[0]!)).toContain(
      EXAMPLE_HOTLINE_CHANNEL.id
    )
  })

  it('builds deterministic typed report notes from summaries', () => {
    const prior = hotlineWithWeeklyDelta()
    const next = advanceSpe956ParticipatoryChannelForWeek(prior, 5)
    const priorMaps = {
      ...emptyMaps(),
      spe956HotlineChannelRecords: { [prior.id]: prior },
      spe956SurvivorInformalRegistryRecords: {
        [EXAMPLE_SURVIVOR_REGISTRY.id]: Object.freeze({
          ...EXAMPLE_SURVIVOR_REGISTRY,
          weeklyElapsedWeeksDelta: 2,
          elapsedChannelWeeks: 1,
        }),
      },
    }
    const nextMaps = {
      ...emptyMaps(),
      spe956HotlineChannelRecords: { [prior.id]: next },
      spe956SurvivorInformalRegistryRecords: {
        [EXAMPLE_SURVIVOR_REGISTRY.id]: advanceSpe956ParticipatoryChannelForWeek(
          priorMaps.spe956SurvivorInformalRegistryRecords[EXAMPLE_SURVIVOR_REGISTRY.id]!,
          5
        ),
      },
    }

    const notes = buildWeeklySpe956ParticipatoryChannelTransitionReportNotes({
      priorMaps,
      nextMaps,
      week: 5,
      sequenceStart: 1,
      baseTimestamp: 1_700_000_000_000,
    })

    expect(notes).toHaveLength(2)
    expect(notes.every((note) => note.type === 'spe956_participatory_channel.weekly_transition')).toBe(
      true
    )
    expect(notes[0]?.metadata?.recordId).toBeDefined()
    expect(notes.map((note) => note.id)).toEqual([
      notes[0]?.id,
      notes[1]?.id,
    ])
    expect(notes[0]?.id).not.toBe(notes[1]?.id)
  })
})
