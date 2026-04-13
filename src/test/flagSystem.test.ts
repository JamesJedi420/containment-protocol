import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '../app/store/gameStore'
import { parseRunExport, serializeRunExport } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import {
  areFlagConditionsSatisfied,
  buildFlagSystemSnapshot,
  clearPersistentFlag,
  consumeOneShotContent,
  evaluateFlagConditions,
  hasConsumedOneShotContent,
  isPersistentFlagSet,
  readConsumedOneShotContent,
  readPersistentFlag,
  selectConsumedOneShots,
  selectPersistentFlags,
  setPersistentFlag,
} from '../domain/flagSystem'
import { ensureManagedGameState } from '../domain/gameStateManager'

describe('flagSystem', () => {
  beforeEach(() => {
    useGameStore.persist.clearStorage()
    useGameStore.setState({ game: createStartingState() })
  })

  it('prevents repeat one-shot consumption and preserves the first record', () => {
    const initial = createStartingState()

    const first = consumeOneShotContent(initial, 'frontdesk.tutorial.intro', 'frontdesk_report')
    const second = consumeOneShotContent(first.state, 'frontdesk.tutorial.intro', 'different_source')

    expect(first.consumed).toBe(true)
    expect(second.consumed).toBe(false)
    expect(readConsumedOneShotContent(second.state, 'frontdesk.tutorial.intro')).toMatchObject({
      eventId: 'frontdesk.tutorial.intro',
      source: 'frontdesk_report',
      firstSeenWeek: 1,
    })
  })

  it('round-trips persistent flags and one-shots through export/import', () => {
    let state = createStartingState()
    state = setPersistentFlag(state, 'faction.ashkeepers.hostile', true)
    state = setPersistentFlag(state, 'incident.chain.breach.depth', 2)
    state = consumeOneShotContent(
      state,
      'report.warning.weekly-breach',
      'frontdesk_warning'
    ).state

    const raw = serializeRunExport(state)
    const roundTripped = parseRunExport(raw)

    expect(readPersistentFlag(roundTripped, 'faction.ashkeepers.hostile')).toBe(true)
    expect(readPersistentFlag(roundTripped, 'incident.chain.breach.depth')).toBe(2)
    expect(readConsumedOneShotContent(roundTripped, 'report.warning.weekly-breach')).toMatchObject({
      source: 'frontdesk_warning',
      firstSeenWeek: 1,
    })
  })

  it('stays stable under normalization and hydration', () => {
    const base = ensureManagedGameState({
      ...createStartingState(),
      runtimeState: {
        player: { id: 'director', displayName: 'Director' },
        globalFlags: {
          'contact.ivy.introduced': true,
          'special.recruit.opportunity': 'open',
        },
        oneShotEvents: {
          'alert.weekly.warning': {
            eventId: 'alert.weekly.warning',
            seen: true,
            firstSeenWeek: 1,
            source: 'ops',
          },
        },
        currentLocation: {
          hubId: 'operations-desk',
          updatedWeek: 1,
        },
        sceneHistory: [],
        encounterState: {},
        progressClocks: {},
        eventQueue: {
          entries: [],
          nextSequence: 1,
        },
        ui: {
          debug: {
            enabled: false,
            flags: {},
          },
        },
      },
    })

    expect(isPersistentFlagSet(base, 'contact.ivy.introduced')).toBe(true)
    expect(isPersistentFlagSet(base, 'special.recruit.opportunity', 'open')).toBe(true)
    expect(hasConsumedOneShotContent(base, 'alert.weekly.warning')).toBe(true)
  })

  it('supports prefix selectors and snapshot reads for report/debug surfaces', () => {
    let state = createStartingState()
    state = setPersistentFlag(state, 'faction.ashkeepers.hostile', true)
    state = setPersistentFlag(state, 'faction.ashkeepers.tier', 'hostile')
    state = setPersistentFlag(state, 'contact.ivy.introduced', true)
    state = consumeOneShotContent(state, 'report.warning.breach', 'report').state
    state = consumeOneShotContent(state, 'report.warning.faction', 'report').state

    expect(selectPersistentFlags(state, 'faction.ashkeepers')).toEqual({
      'faction.ashkeepers.hostile': true,
      'faction.ashkeepers.tier': 'hostile',
    })
    expect(Object.keys(selectConsumedOneShots(state, 'report.warning'))).toEqual([
      'report.warning.breach',
      'report.warning.faction',
    ])

    expect(buildFlagSystemSnapshot(state)).toMatchObject({
      persistentFlags: expect.objectContaining({
        'contact.ivy.introduced': true,
      }),
      consumedOneShots: expect.objectContaining({
        'report.warning.breach': expect.any(Object),
      }),
    })
  })

  it('evaluates author-facing flag conditions for scripted gating', () => {
    let state = createStartingState()
    state = setPersistentFlag(state, 'contact.ivy.introduced', true)
    state = setPersistentFlag(state, 'faction.ashkeepers.standing', 'hostile')
    state = consumeOneShotContent(state, 'frontdesk.tutorial.complete', 'tutorial').state

    const passing = evaluateFlagConditions(state, {
      allFlags: ['contact.ivy.introduced'],
      anyFlags: [
        { flagId: 'faction.ashkeepers.standing', equals: 'hostile' },
        { flagId: 'faction.ashkeepers.standing', equals: 'unfriendly' },
      ],
      noFlags: ['report.warning.repeat_blocked'],
      consumedOneShots: ['frontdesk.tutorial.complete'],
      availableOneShots: ['special.recruit.ivy'],
    })

    const failing = evaluateFlagConditions(state, {
      allFlags: ['contact.ivy.introduced', 'occult.chain.z.unlocked'],
      anyFlags: ['report.warning.repeat_blocked', 'special.recruit.opportunity'],
      noFlags: [{ flagId: 'faction.ashkeepers.standing', equals: 'hostile' }],
      consumedOneShots: ['special.recruit.ivy'],
      availableOneShots: ['frontdesk.tutorial.complete'],
    })

    expect(passing.passes).toBe(true)
    expect(areFlagConditionsSatisfied(state, {
      allFlags: ['contact.ivy.introduced'],
      consumedOneShots: ['frontdesk.tutorial.complete'],
    })).toBe(true)

    expect(failing).toMatchObject({
      passes: false,
      missingAllFlags: ['occult.chain.z.unlocked'],
      missingAnyFlags: ['report.warning.repeat_blocked', 'special.recruit.opportunity'],
      blockedFlags: ['faction.ashkeepers.standing'],
      missingConsumedOneShots: ['special.recruit.ivy'],
      alreadyConsumedOneShots: ['frontdesk.tutorial.complete'],
    })
  })

  it('is safe to use through store actions and returns consumption status', () => {
    useGameStore.getState().setPersistentFlag('containment.breach.followup_unlocked')
    const first = useGameStore
      .getState()
      .consumeOneShotContent('containment.breach.followup_spawned', 'case_chain')
    const second = useGameStore
      .getState()
      .consumeOneShotContent('containment.breach.followup_spawned', 'different_source')

    useGameStore.getState().clearPersistentFlag('containment.breach.followup_unlocked')

    const game = useGameStore.getState().game

    expect(first).toBe(true)
    expect(second).toBe(false)
    expect(readPersistentFlag(game, 'containment.breach.followup_unlocked')).toBeUndefined()
    expect(readConsumedOneShotContent(game, 'containment.breach.followup_spawned')).toMatchObject({
      source: 'case_chain',
    })
  })

  it('clears persistent flags without disturbing one-shot history', () => {
    let state = createStartingState()
    state = setPersistentFlag(state, 'weekly.warning.shown', true)
    state = consumeOneShotContent(state, 'weekly.warning.shown_once', 'report').state
    state = clearPersistentFlag(state, 'weekly.warning.shown')

    expect(readPersistentFlag(state, 'weekly.warning.shown')).toBeUndefined()
    expect(hasConsumedOneShotContent(state, 'weekly.warning.shown_once')).toBe(true)
  })
})
