import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  applyDebugReset,
  applyEncounterDebugReset,
  applyFrontDeskRuntimeBaselineReset,
  applyQueueAndLogReset,
} from '../domain/debugResetTools'
import { appendDeveloperLogEvent } from '../domain/developerLog'
import { enqueueRuntimeEvent } from '../domain/eventQueue'
import { consumeOneShotContent, setPersistentFlag } from '../domain/flagSystem'
import {
  setEncounterRuntimeState,
  setUiDebugState,
  setCurrentLocation,
} from '../domain/gameStateManager'
import { setDefinedProgressClock } from '../domain/progressClocks'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'

describe('debugResetTools', () => {
  it('clears queue + developer log without touching long-term simulation state', () => {
    let state = createStartingState()
    state.funding = 777
    state = appendDeveloperLogEvent(state, {
      type: 'choice.executed',
      summary: 'Choice executed: debug.test',
    })
    state = enqueueRuntimeEvent(state, {
      type: 'authored.follow_up',
      targetId: 'frontdesk.debug.followup',
      week: 1,
    }).state

    const reset = applyQueueAndLogReset(state)

    expect(reset.summary).toMatchObject({
      clearedDeveloperLog: true,
      clearedEventQueue: true,
    })
    expect(reset.state.runtimeState?.eventQueue.entries).toEqual([])
    expect(reset.state.runtimeState?.ui.debug.eventLog ?? []).toEqual([])
    expect(reset.state.funding).toBe(777)
    expect(reset.state.week).toBe(state.week)
    expect(reset.state.cases).toEqual(state.cases)
  })

  it('resets front-desk authored runtime baseline while preserving flags and clocks', () => {
    let state = createStartingState()
    state = setPersistentFlag(state, 'frontdesk.notice.debug.flag', true)
    state = consumeOneShotContent(state, 'frontdesk.notice.debug.one-shot', 'frontdesk').state
    state = setDefinedProgressClock(
      state,
      {
        id: 'frontdesk.debug.clock',
        label: 'Front Desk Debug Clock',
        max: 4,
      },
      {
        value: 2,
      }
    )
    state = setEncounterRuntimeState(state, 'encounter.frontdesk.debug', {
      status: 'active',
      phase: 'debug',
      flags: { tracing: true },
    })
    state = setUiDebugState(state, {
      authoring: {
        activeContextId: 'frontdesk.notice.debug',
        lastChoiceId: 'frontdesk.choice.debug',
        lastFollowUpIds: ['frontdesk.followup.debug'],
        updatedWeek: 1,
      },
      selectedCaseId: 'case-001',
    })
    state = enqueueRuntimeEvent(state, {
      type: 'authored.follow_up',
      targetId: 'frontdesk.followup.debug',
      week: 1,
    }).state

    const reset = applyFrontDeskRuntimeBaselineReset(state)

    expect(reset.summary).toMatchObject({
      clearedDeveloperLog: true,
      clearedEventQueue: true,
      clearedEncounterCount: 1,
      resetAuthoredDebugContext: true,
    })

    expect(reset.state.runtimeState?.encounterState).toEqual({})
    expect(reset.state.runtimeState?.eventQueue.entries).toEqual([])
    expect(reset.state.runtimeState?.ui.authoring).toBeUndefined()
    expect(reset.state.runtimeState?.ui.selectedCaseId).toBeUndefined()

    // Not part of this composed reset scope:
    expect(reset.state.runtimeState?.globalFlags['frontdesk.notice.debug.flag']).toBe(true)
    expect(reset.state.runtimeState?.oneShotEvents['frontdesk.notice.debug.one-shot']).toBeDefined()
    expect(reset.state.runtimeState?.progressClocks['frontdesk.debug.clock']?.value).toBe(2)
  })

  it('resets encounter state scope deterministically', () => {
    let state = createStartingState()
    state = setEncounterRuntimeState(state, 'encounter.alpha', {
      status: 'active',
      phase: 'alpha',
    })
    state = setEncounterRuntimeState(state, 'encounter.beta', {
      status: 'active',
      phase: 'beta',
    })
    state = enqueueRuntimeEvent(state, {
      type: 'encounter.follow_up',
      targetId: 'encounter.alpha.after',
      week: 1,
    }).state

    const reset = applyEncounterDebugReset(state)

    expect(reset.summary.clearedEncounterCount).toBe(2)
    expect(reset.summary.clearedEventQueue).toBe(true)
    expect(reset.state.runtimeState?.encounterState).toEqual({})
    expect(reset.state.runtimeState?.eventQueue.entries).toEqual([])
  })

  it('supports explicit full runtime debug reset while preserving simulation state', () => {
    let state = createStartingState()
    state.funding = 901
    state.week = 5
    state = setCurrentLocation(state, {
      hubId: 'agency',
      locationId: 'front-desk',
      sceneId: 'weekly-report',
    })
    state = setPersistentFlag(state, 'runtime.debug.flag', true)
    state = consumeOneShotContent(state, 'runtime.debug.one-shot', 'debug').state
    state = setDefinedProgressClock(
      state,
      {
        id: 'runtime.debug.clock',
        label: 'Runtime Debug Clock',
        max: 3,
      },
      { value: 2 }
    )

    const reset = applyDebugReset(state, { fullRuntimeDebugReset: true })

    expect(reset.summary.fullRuntimeDebugReset).toBe(true)
    expect(reset.state.funding).toBe(901)
    expect(reset.state.week).toBe(5)
    expect(reset.state.runtimeState?.currentLocation).toMatchObject({
      hubId: 'agency',
      locationId: 'front-desk',
      sceneId: 'weekly-report',
    })
    expect(reset.state.runtimeState?.globalFlags).toEqual({})
    expect(reset.state.runtimeState?.oneShotEvents).toEqual({})
    expect(reset.state.runtimeState?.progressClocks).toEqual({})
    expect(reset.state.runtimeState?.encounterState).toEqual({})
    expect(reset.state.runtimeState?.eventQueue.entries).toEqual([])
    expect(reset.state.runtimeState?.ui.authoring).toBeUndefined()
  })

  it('remains save/load compatible after targeted reset operations', () => {
    let state = createStartingState()
    state = setPersistentFlag(state, 'reset.target.flag', true)
    state = consumeOneShotContent(state, 'reset.target.one-shot', 'debug').state
    state = setDefinedProgressClock(
      state,
      {
        id: 'reset.target.clock',
        label: 'Reset Target Clock',
        max: 4,
      },
      { value: 3 }
    )
    state = setEncounterRuntimeState(state, 'reset.target.encounter', {
      status: 'active',
      phase: 'debug',
    })

    const reset = applyDebugReset(state, {
      resetFlags: { flagIds: ['reset.target.flag'] },
      resetOneShots: { contentIds: ['reset.target.one-shot'] },
      resetProgressClocks: { clockIds: ['reset.target.clock'], resetToDefaults: false },
      clearEncounterRuntime: { encounterIds: ['reset.target.encounter'] },
    })

    const roundTripped = loadGameSave(serializeGameSave(reset.state))

    expect(roundTripped.runtimeState?.globalFlags['reset.target.flag']).toBeUndefined()
    expect(roundTripped.runtimeState?.oneShotEvents['reset.target.one-shot']).toBeUndefined()
    expect(roundTripped.runtimeState?.progressClocks['reset.target.clock']).toMatchObject({
      value: 0,
      max: 4,
    })
    expect(roundTripped.runtimeState?.encounterState['reset.target.encounter']).toBeUndefined()
  })
})
