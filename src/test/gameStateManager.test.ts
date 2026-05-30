import { describe, expect, it } from 'vitest'
import { hydrateGame } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import {
  adjustInventoryQuantity,
  advanceProgressClock,
  ensureManagedGameState,
  markOneShotEvent,
  normalizeRuntimeState,
  readGameStateManager,
  reconcileRuntimeUiSelections,
  recordSceneVisit,
  setCurrentLocation,
  setEncounterRuntimeState,
  setGlobalFlag,
  setPlayerProfile,
  setUiDebugState,
} from '../domain/gameStateManager'

describe('gameStateManager', () => {
  it('creates a canonical runtime slice on starting state', () => {
    const state = createStartingState()
    const view = readGameStateManager(state)

    expect(state.runtimeState).toBeDefined()
    expect(view.player.displayName).toBe('Director')
    expect(view.currentLocation.hubId).toBe('operations-desk')
    expect(view.currentLocation.sceneId).toBe('dashboard')
    expect(view.ui.debug.enabled).toBe(false)
  })

  it('writes narrative/runtime slices through stable helpers with guardrails', () => {
    let state = createStartingState()

    state = setPlayerProfile(state, {
      displayName: 'Handler One',
      callsign: 'Relay',
    })
    state = setGlobalFlag(state, 'hub.intro_complete', true)
    state = markOneShotEvent(state, 'event.opening-brief', 'intro_scene')
    state = markOneShotEvent(state, 'event.opening-brief', 'duplicate_attempt')
    state = setCurrentLocation(state, {
      hubId: 'recruitment',
      locationId: 'recruitment-board',
      sceneId: 'candidate-sweep',
    })
    state = recordSceneVisit(state, {
      locationId: 'recruitment-board',
      sceneId: 'candidate-sweep',
      outcome: 'intel-gained',
      tags: ['recruitment', 'intro'],
    })
    state = setEncounterRuntimeState(state, 'case-001', {
      status: 'active',
      hiddenModifierIds: ['hidden-pressure'],
      revealedModifierIds: ['known-faction-tail'],
      flags: { scouted: true },
    })
    state = advanceProgressClock(state, 'debug.hub_alarm', 2, {
      label: 'Hub Alarm',
      max: 3,
    })
    state = advanceProgressClock(state, 'debug.hub_alarm', 5, {
      label: 'Hub Alarm',
      max: 3,
    })
    state = adjustInventoryQuantity(state, 'custom_supplies', 3)
    state = adjustInventoryQuantity(state, 'custom_supplies', -50)
    state = setUiDebugState(state, {
      selectedCaseId: 'case-001',
      authoring: {
        activeContextId: 'frontdesk.notice.weekly-report-tutorial',
        lastChoiceId: 'frontdesk.notice.weekly-report.acknowledge',
        lastNextTargetId: 'frontdesk.notice.weekly-report.returning',
        lastFollowUpIds: ['frontdesk.notice.weekly-report.returning'],
        updatedWeek: 1,
      },
      debug: {
        enabled: true,
        flags: {
          revealHiddenState: true,
        },
      },
    })

    const view = readGameStateManager(state)

    expect(view.player.displayName).toBe('Handler One')
    expect(view.player.callsign).toBe('Relay')
    expect(view.globalFlags['hub.intro_complete']).toBe(true)
    expect(view.oneShotEvents['event.opening-brief']?.firstSeenWeek).toBe(1)
    expect(view.oneShotEvents['event.opening-brief']?.source).toBe('intro_scene')
    expect(view.currentLocation.hubId).toBe('recruitment')
    expect(view.sceneHistory).toHaveLength(1)
    expect(view.encounterState['case-001']).toMatchObject({
      status: 'active',
      hiddenModifierIds: ['hidden-pressure'],
      revealedModifierIds: ['known-faction-tail'],
      flags: { scouted: true },
    })
    expect(view.progressClocks['debug.hub_alarm']).toMatchObject({
      label: 'Hub Alarm',
      value: 3,
      max: 3,
      completedAtWeek: 1,
    })
    expect(view.inventory['custom_supplies']).toBe(0)
    expect(view.ui.selectedCaseId).toBe('case-001')
    expect(view.ui.authoring?.activeContextId).toBe('frontdesk.notice.weekly-report-tutorial')
    expect(view.ui.authoring?.lastChoiceId).toBe('frontdesk.notice.weekly-report.acknowledge')
    expect(view.ui.authoring?.lastFollowUpIds).toEqual(['frontdesk.notice.weekly-report.returning'])
    expect(view.ui.debug.flags.revealHiddenState).toBe(true)
  })

  it('backfills missing runtime state and sanitizes sparse inventory during hydration', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...fallback,
        runtimeState: undefined,
        inventory: {
          medical_supplies: 2.8,
          corrupted_entry: -4,
        },
      },
      fallback
    )

    expect(hydrated.runtimeState).toBeDefined()
    expect(hydrated.runtimeState?.player.displayName).toBe('Director')
    expect(hydrated.inventory.medical_supplies).toBe(2)
    expect(hydrated.inventory.corrupted_entry).toBeUndefined()
  })

  it('ensures managed state for sparse legacy payloads', () => {
    const base = createStartingState()
    const next = ensureManagedGameState({
      ...base,
      runtimeState: undefined,
      inventory: {
        ...base.inventory,
        temp_cache: -3,
      },
    })

    expect(next.runtimeState).toBeDefined()
    expect(next.inventory.temp_cache).toBe(0)
  })

  describe('hydration problems 639-646', () => {
    it('639-642 normalizes location, scene history, encounters, and modifier overlap', () => {
      const normalized = normalizeRuntimeState(
        {
          currentLocation: {
            hubId: 'operations-desk',
            locationId: 'operations-desk',
            sceneId: 'dashboard',
            updatedWeek: 50,
          },
          sceneHistory: [
            { sceneId: 'weekly-report', locationId: 'front-desk', week: 8 },
            { sceneId: 'dashboard', locationId: 'operations-desk', week: 3 },
            { sceneId: 'dashboard', locationId: 'operations-desk', week: 3, outcome: 'kept' },
          ],
          encounterState: {
            'enc-overlap': {
              encounterId: 'enc-overlap',
              status: 'archived',
              startedWeek: 9,
              resolvedWeek: 2,
              hiddenModifierIds: ['shared-tail', 'hidden-only'],
              revealedModifierIds: ['shared-tail'],
              lastUpdatedWeek: 20,
            },
          },
        },
        5
      )

      expect(normalized.currentLocation.updatedWeek).toBe(5)
      expect(normalized.sceneHistory).toEqual([
        { sceneId: 'dashboard', locationId: 'operations-desk', week: 3, outcome: 'kept' },
        { sceneId: 'weekly-report', locationId: 'front-desk', week: 5 },
      ])
      expect(normalized.encounterState['enc-overlap']).toMatchObject({
        startedWeek: 5,
        resolvedWeek: 5,
        lastUpdatedWeek: 5,
        hiddenModifierIds: ['hidden-only'],
        revealedModifierIds: ['shared-tail'],
      })
    })

    it('644-646 sanitizes developer log ids, caps retention, and strips legacy player fields', () => {
      const normalized = normalizeRuntimeState(
        {
          player: {
            id: 'director',
            displayName: 'Director',
            pronouns: 'they/them',
            notes: 'legacy notes',
          },
          ui: {
            debug: {
              enabled: true,
              flags: {},
              eventLog: [
                {
                  id: 'devlog-0010',
                  week: 99,
                  type: 'flag.set',
                  summary: 'First.',
                },
                {
                  id: 'devlog-0010',
                  week: 99,
                  type: 'route.selected',
                  summary: 'Duplicate.',
                },
              ],
              nextEventSequence: 2,
            },
          },
        },
        4
      )

      expect(normalized.player).not.toHaveProperty('pronouns')
      expect(normalized.player).not.toHaveProperty('notes')
      expect(normalized.ui.debug.eventLog.map((entry) => entry.id)).toEqual([
        'devlog-0010',
        'devlog-0010-dup-2',
      ])
      expect(normalized.ui.debug.eventLog[0]?.week).toBe(4)
      expect(normalized.ui.debug.nextEventSequence).toBe(11)
    })

    it('643 reconciles UI selections against live entity maps', () => {
      const base = createStartingState()
      const caseId = Object.keys(base.cases)[0]
      const teamId = Object.keys(base.teams)[0]
      const agentId = Object.keys(base.agents)[0]
      const runtime = normalizeRuntimeState(
        {
          ...base.runtimeState,
          ui: {
            ...base.runtimeState!.ui,
            selectedCaseId: 'missing-case',
            selectedTeamId: teamId,
            selectedAgentId: agentId,
            selectedLocationId: 'front-desk',
            selectedSceneId: 'weekly-report',
          },
        },
        base.week
      )

      const reconciled = reconcileRuntimeUiSelections(runtime, {
        cases: base.cases,
        teams: base.teams,
        agents: base.agents,
      })

      expect(reconciled.ui.selectedCaseId).toBeUndefined()
      expect(reconciled.ui.selectedTeamId).toBe(teamId)
      expect(reconciled.ui.selectedAgentId).toBe(agentId)
      expect(reconciled.ui.selectedLocationId).toBe('front-desk')
      expect(reconciled.ui.selectedSceneId).toBe('weekly-report')

      const validCase = reconcileRuntimeUiSelections(
        {
          ...runtime,
          ui: {
            ...runtime.ui,
            selectedCaseId: caseId,
          },
        },
        {
          cases: base.cases,
          teams: base.teams,
          agents: base.agents,
        }
      )

      expect(validCase.ui.selectedCaseId).toBe(caseId)
    })
  })

  describe('hydration problems 647-654', () => {
    it('647 caps one-shot firstSeenWeek to the campaign week', () => {
      const normalized = normalizeRuntimeState(
        {
          oneShotEvents: {
            'event.legacy-bool': true,
            'event.stale-week': {
              seen: true,
              firstSeenWeek: 40,
            },
          },
        },
        6
      )

      expect(normalized.oneShotEvents['event.legacy-bool']?.firstSeenWeek).toBe(6)
      expect(normalized.oneShotEvents['event.stale-week']?.firstSeenWeek).toBe(6)
    })

    it('648-649 preserves finite flag numbers and keeps first trimmed key', () => {
      const normalized = normalizeRuntimeState(
        {
          globalFlags: {
            ' score.multiplier ': 1.25,
            'score.multiplier': 9.99,
            truncatedShouldNotApply: 3.7,
          },
        },
        2
      )

      expect(normalized.globalFlags['score.multiplier']).toBe(1.25)
      expect(normalized.globalFlags.truncatedShouldNotApply).toBe(3.7)
    })

    it('650-651 caps progress clock max and keeps first trimmed clock id', () => {
      const normalized = normalizeRuntimeState(
        {
          progressClocks: {
            ' story.breach-depth ': {
              id: 'story.breach-depth',
              label: 'First',
              value: 1,
              max: 2,
            },
            'story.breach-depth': {
              id: 'story.breach-depth',
              label: 'Second',
              value: 3,
              max: 4,
            },
            'story.clock-huge': {
              id: 'story.clock-huge',
              label: 'Huge',
              value: 50,
              max: 50000,
            },
          },
        },
        3
      )

      expect(normalized.progressClocks['story.breach-depth']).toMatchObject({
        label: 'First',
        value: 1,
        max: 2,
      })
      expect(normalized.progressClocks['story.clock-huge']?.max).toBe(9999)
      expect(normalized.progressClocks['story.clock-huge']?.value).toBe(50)
    })

    it('652-654 preserves queue payload and developer-log numeric precision and caps log weeks', () => {
      const normalized = normalizeRuntimeState(
        {
          encounterState: {
            'enc-live': {
              encounterId: 'enc-live',
              status: 'active',
              lastUpdatedWeek: 4,
            },
          },
          eventQueue: {
            entries: [
              {
                id: 'qevt-0001',
                type: 'encounter.follow_up',
                targetId: 'enc-live',
                week: 4,
                payload: {
                  ratio: 0.125,
                },
              },
            ],
            nextSequence: 2,
          },
          ui: {
            debug: {
              enabled: true,
              flags: {},
              eventLog: [
                {
                  id: 'devlog-0001',
                  week: 80,
                  type: 'event_queue.enqueued',
                  summary: 'Queued.',
                  details: {
                    ratio: 0.3333333333333333,
                  },
                },
              ],
              nextEventSequence: 2,
            },
          },
        },
        4
      )

      expect(normalized.eventQueue.entries[0]?.payload?.ratio).toBe(0.125)
      expect(normalized.ui.debug.eventLog[0]?.week).toBe(4)
      expect(normalized.ui.debug.eventLog[0]?.details?.ratio).toBe(0.3333333333333333)
    })

    it('preserves encounter.follow_up queue entries when targetId is an authored follow-up id', () => {
      const normalized = normalizeRuntimeState(
        {
          encounterState: {},
          eventQueue: {
            entries: [
              {
                id: 'qevt-authored-follow-up',
                type: 'encounter.follow_up',
                targetId: 'frontdesk.notice.authority.exchange',
                week: 2,
              },
            ],
            nextSequence: 2,
          },
        },
        2
      )

      expect(normalized.eventQueue.entries).toEqual([
        expect.objectContaining({
          id: 'qevt-authored-follow-up',
          type: 'encounter.follow_up',
          targetId: 'frontdesk.notice.authority.exchange',
        }),
      ])
    })
  })

  describe('hydration problems 655-662', () => {
    it('655-656 normalizes shape-valid runtime and coerces eventQueue.entries before read', () => {
      const base = createStartingState()
      const malformedRuntime = {
        ...base.runtimeState!,
        eventQueue: {
          entries: { poisoned: true },
          nextSequence: 1,
        },
        ui: {
          ...base.runtimeState!.ui,
          debug: {
            enabled: true,
            flags: { ' debug.trace ': true },
            eventLog: [],
            nextEventSequence: 1,
          },
        },
      }

      const managed = ensureManagedGameState({
        ...base,
        runtimeState: malformedRuntime as typeof base.runtimeState,
      })

      expect(Array.isArray(managed.runtimeState?.eventQueue.entries)).toBe(true)
      expect(() => readGameStateManager(managed)).not.toThrow()
      expect(readGameStateManager(managed).eventQueue.entries).toEqual([])
    })

    it('657-658 trims inventory keys and derives debug.enabled from sanitized flags', () => {
      const base = createStartingState()
      const managed = ensureManagedGameState({
        ...base,
        inventory: {
          ' medical_supplies ': 4,
        },
        runtimeState: {
          ...base.runtimeState!,
          ui: {
            ...base.runtimeState!.ui,
            debug: {
              enabled: true,
              flags: {
                ' trace.verbose ': true,
                'trace.verbose': false,
              },
              eventLog: [],
              nextEventSequence: 1,
            },
          },
        },
      })

      expect(managed.inventory['medical_supplies']).toBe(4)
      expect(managed.runtimeState?.ui.debug.enabled).toBe(true)
      expect(managed.runtimeState?.ui.debug.flags['trace.verbose']).toBe(true)

      const flagsOff = ensureManagedGameState({
        ...base,
        runtimeState: {
          ...base.runtimeState!,
          ui: {
            ...base.runtimeState!.ui,
            debug: {
              enabled: true,
              flags: {},
              eventLog: [],
              nextEventSequence: 1,
            },
          },
        },
      })

      expect(flagsOff.runtimeState?.ui.debug.enabled).toBe(false)
    })

    it('659-662 caps authoring.updatedWeek and keeps first trimmed collision keys', () => {
      const normalized = normalizeRuntimeState(
        {
          ui: {
            authoring: {
              activeContextId: 'ctx-1',
              updatedWeek: 80,
            },
            debug: {
              enabled: false,
              flags: {
                ' ops.panel ': true,
                'ops.panel': false,
              },
              eventLog: [
                {
                  id: 'devlog-0099',
                  week: 2,
                  type: 'flag.set',
                  summary: 'Flag changed.',
                  details: {
                    ' delta.value ': 1,
                    'delta.value': 9,
                  },
                },
              ],
              nextEventSequence: 2,
            },
          },
          encounterState: {
            'enc-live': {
              encounterId: 'enc-live',
              status: 'active',
              lastUpdatedWeek: 3,
            },
          },
          eventQueue: {
            entries: [
              {
                id: 'qevt-0099',
                type: 'encounter.follow_up',
                targetId: 'enc-live',
                week: 3,
                payload: {
                  ' weight.value ': 0.25,
                  'weight.value': 0.75,
                },
              },
            ],
            nextSequence: 2,
          },
        },
        3
      )

      expect(normalized.ui.authoring?.updatedWeek).toBe(3)
      expect(normalized.ui.debug.flags['ops.panel']).toBe(true)
      expect(normalized.eventQueue.entries[0]?.payload?.['weight.value']).toBe(0.25)
      expect(normalized.ui.debug.eventLog[0]?.details?.['delta.value']).toBe(1)
    })
  })
})
