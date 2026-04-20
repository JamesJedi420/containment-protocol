import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { consumeOneShotContent, setPersistentFlag } from '../domain/flagSystem'
import {
  setCurrentLocation,
  setEncounterRuntimeState,
  setProgressClock,
} from '../domain/gameStateManager'
import {
  evaluateScreenRouteCondition,
  selectScreenRoute,
  type ScreenRouteBranch,
} from '../domain/screenRouting'

describe('screenRouting', () => {
  it('selects the first matching branch before the fallback', () => {
    let state = createStartingState()
    state = setPersistentFlag(state, 'story.intro.complete', true)
    state = setPersistentFlag(state, 'story.returning', true)

    const routes: ScreenRouteBranch<string>[] = [
      {
        id: 'intro-complete',
        when: {
          flags: {
            allFlags: ['story.intro.complete'],
          },
        },
        value: 'intro',
      },
      {
        id: 'returning',
        when: {
          flags: {
            allFlags: ['story.returning'],
          },
        },
        value: 'returning',
      },
      {
        id: 'fallback',
        value: 'fallback',
      },
    ]

    expect(selectScreenRoute(state, routes)).toMatchObject({
      branchId: 'intro-complete',
      value: 'intro',
      isFallback: false,
    })
  })

  it('evaluates flags, location, progress clocks, encounter state, active context, and predicates together', () => {
    let state = createStartingState()
    state = setPersistentFlag(state, 'incident.chain.z.unlocked', true)
    state = setCurrentLocation(state, {
      hubId: 'operations-desk',
      sceneId: 'dashboard',
    })
    state = setProgressClock(state, 'story.breach-depth', {
      label: 'Breach Depth',
      value: 2,
      max: 4,
    })
    state = setEncounterRuntimeState(state, 'case-001', {
      status: 'active',
      phase: 'breach-followup',
      flags: {
        intelReady: true,
      },
    })

    const evaluation = evaluateScreenRouteCondition(
      state,
      {
        flags: {
          allFlags: ['incident.chain.z.unlocked'],
          availableOneShots: ['frontdesk.warning.breach'],
        },
        location: {
          hubId: 'operations-desk',
          sceneId: 'dashboard',
        },
        progressClocks: [
          {
            clockId: 'story.breach-depth',
            minValue: 2,
            maxValue: 3,
            completed: false,
          },
        ],
        encounter: {
          encounterId: 'case-001',
          status: 'active',
          phase: 'breach-followup',
          requiredFlags: ['intelReady'],
        },
        activeContexts: ['frontdesk.modal'],
        predicates: [
          {
            id: 'week-one',
            test: ({ state: currentState }) => currentState.week === 1,
          },
        ],
      },
      {
        activeContextId: 'frontdesk.modal',
      }
    )

    expect(evaluation).toMatchObject({
      passes: true,
      locationMatched: true,
      failedProgressClocks: [],
      failedEncounterIds: [],
      failedActiveContexts: [],
      failedPredicates: [],
    })
    expect(evaluation.flagEvaluation?.passes).toBe(true)
  })

  it('falls back after a one-shot route is consumed, preventing repeat-trigger routing', () => {
    let state = createStartingState()
    state = setPersistentFlag(state, 'containment.breach.followup_unlocked', true)

    const routes: ScreenRouteBranch<string>[] = [
      {
        id: 'breach-follow-up',
        when: {
          flags: {
            allFlags: ['containment.breach.followup_unlocked'],
            availableOneShots: ['containment.breach.followup_alert'],
          },
        },
        value: 'alert',
      },
      {
        id: 'fallback',
        value: 'clear',
      },
    ]

    expect(selectScreenRoute(state, routes)?.branchId).toBe('breach-follow-up')

    state = consumeOneShotContent(
      state,
      'containment.breach.followup_alert',
      'frontdesk_notice'
    ).state

    expect(selectScreenRoute(state, routes)).toMatchObject({
      branchId: 'fallback',
      value: 'clear',
      isFallback: true,
    })
  })
})
