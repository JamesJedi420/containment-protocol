import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { enqueueRuntimeEvent, listQueuedRuntimeEvents } from '../../domain/eventQueue'
import { consumeOneShotContent, setPersistentFlag } from '../../domain/flagSystem'
import {
  advanceProgressClock,
  recordSceneVisit,
  setCurrentLocation,
  setEncounterRuntimeState,
  setUiDebugState,
} from '../../domain/gameStateManager'
import { RUN_EXPORT_KIND, createRunExportPayload } from './runTransfer'
import {
  GAME_SAVE_KIND,
  GAME_SAVE_VERSION,
  createGameSavePayload,
  loadGameSave,
  serializeGameSave,
} from './saveSystem'
import { getFrontDeskBriefingView } from '../../features/operations/frontDeskView'
import {
  FRONT_DESK_TRIGGER_IDS,
  getEligibleFrontDeskSceneTriggerIds,
} from '../../features/operations/frontDeskTriggers'

describe('saveSystem', () => {
  it('builds an explicit save payload without templates', () => {
    const game = createStartingState()
    game.week = 3

    const payload = createGameSavePayload(game)

    expect(payload).toMatchObject({
      kind: GAME_SAVE_KIND,
      version: GAME_SAVE_VERSION,
      state: expect.objectContaining({ week: 3 }),
    })
    expect(payload.savedAt).toBeTypeOf('string')
    expect(new Date(payload.savedAt).toISOString()).toBe(payload.savedAt)
    expect(payload.state).not.toHaveProperty('templates')
  })

  it('round-trips authored runtime state, inventory, and breadcrumbs through save serialization', () => {
    let game = createStartingState()

    game = setPersistentFlag(game, 'contact.ivy.introduced', true)
    game = consumeOneShotContent(game, 'frontdesk.warning.weekly-report', 'frontdesk').state
    game = setCurrentLocation(game, {
      hubId: 'agency',
      locationId: 'front-desk',
      sceneId: 'special-recruit-opportunity',
    })
    game = recordSceneVisit(game, {
      locationId: 'front-desk',
      sceneId: 'special-recruit-opportunity',
      outcome: 'accepted',
      tags: ['notice', 'recruit'],
    })
    game = setEncounterRuntimeState(game, 'encounter.breach.followup', {
      status: 'active',
      phase: 'containment',
      hiddenModifierIds: ['hidden.echo'],
      revealedModifierIds: ['known.breach'],
      flags: { unstable: true },
    })
    game.inventory.psionic_shards = 3
    game = advanceProgressClock(game, 'incident.chain.breach', 2, {
      label: 'Breach Chain',
      max: 4,
      hidden: false,
    })
    game = setUiDebugState(game, {
      selectedCaseId: 'case-001',
      debug: {
        enabled: true,
        flags: { developerOverlay: true },
      },
      authoring: {
        activeContextId: 'frontdesk.notice.breach-follow-up',
        lastChoiceId: 'frontdesk.notice.breach-follow-up.cautious',
        lastNextTargetId: 'frontdesk.notice.breach-follow-up.cautious-brief',
        lastFollowUpIds: ['containment.breach.followup.cautious-brief'],
        updatedWeek: game.week,
      },
    })

    const roundTripped = loadGameSave(serializeGameSave(game))

    expect(roundTripped.inventory.psionic_shards).toBe(3)
    expect(roundTripped.runtimeState).toMatchObject({
      globalFlags: {
        'contact.ivy.introduced': true,
      },
      oneShotEvents: {
        'frontdesk.warning.weekly-report': {
          source: 'frontdesk',
        },
      },
      currentLocation: {
        hubId: 'agency',
        locationId: 'front-desk',
        sceneId: 'special-recruit-opportunity',
      },
      encounterState: {
        'encounter.breach.followup': {
          status: 'active',
          phase: 'containment',
          hiddenModifierIds: ['hidden.echo'],
          revealedModifierIds: ['known.breach'],
          flags: { unstable: true },
        },
      },
      progressClocks: {
        'incident.chain.breach': {
          label: 'Breach Chain',
          value: 2,
          max: 4,
        },
      },
      ui: {
        selectedCaseId: 'case-001',
        debug: {
          enabled: true,
          flags: { developerOverlay: true },
        },
        authoring: {
          activeContextId: 'frontdesk.notice.breach-follow-up',
          lastChoiceId: 'frontdesk.notice.breach-follow-up.cautious',
          lastNextTargetId: 'frontdesk.notice.breach-follow-up.cautious-brief',
          lastFollowUpIds: ['containment.breach.followup.cautious-brief'],
          updatedWeek: 1,
        },
      },
    })
    expect(roundTripped.runtimeState?.sceneHistory.at(-1)).toMatchObject({
      locationId: 'front-desk',
      sceneId: 'special-recruit-opportunity',
      outcome: 'accepted',
      tags: ['notice', 'recruit'],
    })
  })

  it('normalizes partial runtime payloads when loading a save', () => {
    const loaded = loadGameSave(
      JSON.stringify({
        kind: GAME_SAVE_KIND,
        version: GAME_SAVE_VERSION,
        savedAt: new Date().toISOString(),
        state: {
          week: 5,
          inventory: {
            valid_salvage: 4,
            broken_entry: -3,
          },
          runtimeState: {
            globalFlags: {
              'faction.ashkeepers.hostile': true,
              'invalid.flag': { nested: true },
            },
            oneShotEvents: {
              'frontdesk.warning.once': true,
              'frontdesk.warning.invalid': {
                seen: false,
              },
            },
            currentLocation: {
              hubId: 'agency',
              updatedWeek: 0,
            },
            sceneHistory: [
              {
                locationId: 'front-desk',
                sceneId: 'weekly-report',
                week: 3,
              },
              {
                locationId: '',
                sceneId: 'invalid-entry',
              },
            ],
            encounterState: {
              'encounter.partial': {
                status: 'invalid',
                phase: 44,
                hiddenModifierIds: ['hidden.trace'],
                flags: {
                  observed: true,
                  invalid: 'nope',
                },
                lastUpdatedWeek: 'bad',
              },
            },
            progressClocks: {
              'chain.partial': {
                label: 'Partial Clock',
                value: 9,
                max: 4,
                hidden: 'no',
                completedAtWeek: 'bad',
              },
            },
            ui: {
              debug: {
                enabled: 'yes',
                flags: {
                  developerOverlay: true,
                  invalid: 'no',
                },
              },
              authoring: {
                activeContextId: 'frontdesk.notice.weekly-report',
                lastFollowUpIds: ['frontdesk.notice.follow-up', 7],
                updatedWeek: 'bad',
              },
            },
          },
        },
      })
    )

    expect(loaded.inventory.valid_salvage).toBe(4)
    expect(loaded.inventory.broken_entry).toBe(0)
    expect(loaded.runtimeState).toMatchObject({
      globalFlags: {
        'faction.ashkeepers.hostile': true,
      },
      oneShotEvents: {
        'frontdesk.warning.once': {
          seen: true,
          firstSeenWeek: 5,
        },
      },
      currentLocation: {
        hubId: 'agency',
        updatedWeek: 1,
      },
      sceneHistory: [
        {
          locationId: 'front-desk',
          sceneId: 'weekly-report',
          week: 3,
        },
      ],
      encounterState: {
        'encounter.partial': {
          status: 'available',
          hiddenModifierIds: ['hidden.trace'],
          flags: { observed: true },
          lastUpdatedWeek: 5,
        },
      },
      progressClocks: {
        'chain.partial': {
          label: 'Partial Clock',
          value: 4,
          max: 4,
          completedAtWeek: 5,
        },
      },
      ui: {
        debug: {
          enabled: false,
          flags: { developerOverlay: true },
        },
        authoring: {
          activeContextId: 'frontdesk.notice.weekly-report',
          lastFollowUpIds: ['frontdesk.notice.follow-up'],
        },
      },
    })
    expect(loaded.runtimeState?.globalFlags).not.toHaveProperty('invalid.flag')
    expect(loaded.runtimeState?.oneShotEvents).not.toHaveProperty('frontdesk.warning.invalid')
  })

  it('loads legacy run exports for backward compatibility', () => {
    const legacyRaw = JSON.stringify(createRunExportPayload(createStartingState()))

    const loaded = loadGameSave(legacyRaw)

    expect(loaded.week).toBe(1)
  })

  it('keeps spent front-desk one-shots hidden after save/load round-trips', () => {
    let game = createStartingState()
    game = consumeOneShotContent(game, 'frontdesk.tutorial.weekly-report', 'frontdesk.notice').state

    const loaded = loadGameSave(serializeGameSave(game))

    expect(getEligibleFrontDeskSceneTriggerIds(loaded)).not.toContain(
      FRONT_DESK_TRIGGER_IDS.weeklyReportTutorial
    )
    expect(getFrontDeskBriefingView(loaded).notices[0]).toMatchObject({
      id: 'weekly-report-returning',
    })
  })

  it('round-trips queued authored/runtime follow-up events through save/load', () => {
    let game = createStartingState()
    game = enqueueRuntimeEvent(game, {
      type: 'authored.follow_up',
      targetId: 'containment.breach.followup.cautious-brief',
      source: 'frontdesk.notice.breach-follow-up.cautious',
      contextId: 'frontdesk.notice.breach-follow-up-open',
      week: 2,
      payload: {
        choiceId: 'frontdesk.notice.breach-follow-up.cautious',
      },
    }).state
    game = enqueueRuntimeEvent(game, {
      type: 'authored.follow_up',
      targetId: 'frontdesk.notice.weekly-report.returning',
      source: 'frontdesk.notice.weekly-report.acknowledge',
      week: 2,
    }).state

    const loaded = loadGameSave(serializeGameSave(game))
    const queued = listQueuedRuntimeEvents(loaded)

    expect(queued.map((entry) => entry.id)).toEqual(['qevt-0001', 'qevt-0002'])
    expect(queued.map((entry) => entry.targetId)).toEqual([
      'containment.breach.followup.cautious-brief',
      'frontdesk.notice.weekly-report.returning',
    ])
    expect(loaded.runtimeState?.eventQueue.nextSequence).toBe(3)
  })

  it('rejects malformed or unsupported save payloads', () => {
    expect(() => loadGameSave('not-json')).toThrow('Save payload is not valid JSON.')

    expect(() =>
      loadGameSave(
        JSON.stringify({
          kind: 'not-a-save',
          version: GAME_SAVE_VERSION,
          state: {},
        })
      )
    ).toThrow('Save payload is not a supported Containment Protocol save.')

    expect(() =>
      loadGameSave(
        JSON.stringify({
          kind: GAME_SAVE_KIND,
          version: GAME_SAVE_VERSION + 1,
          savedAt: new Date().toISOString(),
          state: {},
        })
      )
    ).toThrow('Save payload version is not supported by this build.')

    expect(() =>
      loadGameSave(
        JSON.stringify({
          kind: RUN_EXPORT_KIND,
          version: 999,
          exportedAt: new Date().toISOString(),
          game: {},
        })
      )
    ).toThrow('Run payload version is not supported by this build.')
  })
})
