import { describe, expect, it } from 'vitest'
import { hydrateGame } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import {
  adjustInventoryQuantity,
  advanceProgressClock,
  ensureManagedGameState,
  markOneShotEvent,
  readGameStateManager,
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
    state = advanceProgressClock(state, 'hub_alarm', 2, {
      label: 'Hub Alarm',
      max: 3,
    })
    state = advanceProgressClock(state, 'hub_alarm', 5, {
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
    expect(view.progressClocks['hub_alarm']).toMatchObject({
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
    expect(hydrated.inventory.corrupted_entry).toBe(0)
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
})
