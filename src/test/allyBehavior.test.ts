import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  evaluateAllyBehaviors,
  selectAllyBehavior,
  type AllyBehaviorProfile,
} from '../domain/allyBehavior'
import { setPersistentFlag } from '../domain/flagSystem'
import { setEncounterRuntimeState } from '../domain/gameStateManager'
import { PROGRESS_CLOCK_IDS, setDefinedProgressClock } from '../domain/progressClocks'

const CAUTIOUS_PROFILE: AllyBehaviorProfile = {
  allyId: 'ally-cautious',
  branches: [
    {
      id: 'stability-push',
      when: {
        encounter: {
          encounterId: 'encounter.alpha',
          status: 'active',
        },
        progressClocks: [
          {
            clockId: PROGRESS_CLOCK_IDS.breachFollowUpPosture,
            threshold: 1,
          },
        ],
      },
      effects: {
        thresholdModifier: {
          partialAt: -5,
        },
        followUpIds: ['ally.cautious.review'],
      },
      summary: 'Cautious ally stabilizes the aftermath threshold.',
    },
    {
      id: 'fallback',
      effects: {
        thresholdModifier: {
          partialAt: -2,
        },
      },
    },
  ],
}

const AGGRESSIVE_PROFILE: AllyBehaviorProfile = {
  allyId: 'ally-aggressive',
  branches: [
    {
      id: 'escalate-on-flag',
      when: {
        flags: {
          allFlags: ['ally.aggressive.enabled'],
        },
      },
      effects: {
        scoreModifier: 2,
        followUpIds: ['ally.aggressive.escalation'],
        flagEffects: {
          set: {
            'ally.aggressive.triggered': true,
          },
        },
      },
      summary: 'Aggressive ally escalates on command.',
    },
    {
      id: 'stand-down',
      effects: {
        scoreModifier: 0,
      },
    },
  ],
}

describe('allyBehavior', () => {
  it('selects deterministic behavior branch for an ally profile', () => {
    let state = createStartingState()
    state = setEncounterRuntimeState(state, 'encounter.alpha', {
      status: 'active',
      phase: 'engagement',
    })
    state = setDefinedProgressClock(state, PROGRESS_CLOCK_IDS.breachFollowUpPosture, {
      value: 1,
      max: 3,
      label: 'Breach Follow-Up Posture',
    })

    const selection = selectAllyBehavior(state, CAUTIOUS_PROFILE, {
      encounterId: 'encounter.alpha',
    })

    expect(selection).toMatchObject({
      allyId: 'ally-cautious',
      behaviorId: 'stability-push',
      isFallback: false,
      effects: {
        thresholdModifier: {
          partialAt: -5,
        },
        followUpIds: ['ally.cautious.review'],
      },
    })
  })

  it('supports state-conditioned variation and aggregate contribution calculation', () => {
    let state = createStartingState()

    const baseline = evaluateAllyBehaviors(state, [AGGRESSIVE_PROFILE], {
      encounterId: 'encounter.alpha',
    })

    state = setPersistentFlag(state, 'ally.aggressive.enabled', true)

    const enabled = evaluateAllyBehaviors(state, [AGGRESSIVE_PROFILE], {
      encounterId: 'encounter.alpha',
    })

    expect(baseline.selections[0]).toMatchObject({
      behaviorId: 'stand-down',
      isFallback: true,
    })
    expect(enabled.selections[0]).toMatchObject({
      behaviorId: 'escalate-on-flag',
      isFallback: false,
    })
    expect(enabled.scoreModifier).toBe(2)
    expect(enabled.followUpIds).toEqual(['ally.aggressive.escalation'])
    expect(enabled.flagEffects.set).toMatchObject({
      'ally.aggressive.triggered': true,
    })
  })

  it('aggregates multiple ally profiles deterministically', () => {
    let state = createStartingState()
    state = setPersistentFlag(state, 'ally.aggressive.enabled', true)
    state = setEncounterRuntimeState(state, 'encounter.alpha', {
      status: 'active',
    })
    state = setDefinedProgressClock(state, PROGRESS_CLOCK_IDS.breachFollowUpPosture, {
      value: 1,
      max: 3,
      label: 'Breach Follow-Up Posture',
    })

    const aggregate = evaluateAllyBehaviors(state, [CAUTIOUS_PROFILE, AGGRESSIVE_PROFILE], {
      encounterId: 'encounter.alpha',
    })

    expect(aggregate.selections.map((entry) => `${entry.allyId}:${entry.behaviorId}`)).toEqual([
      'ally-cautious:stability-push',
      'ally-aggressive:escalate-on-flag',
    ])
    expect(aggregate.scoreModifier).toBe(2)
    expect(aggregate.thresholdModifier).toMatchObject({
      successAt: 0,
      partialAt: -5,
    })
    expect(aggregate.followUpIds).toEqual([
      'ally.cautious.review',
      'ally.aggressive.escalation',
    ])
  })
})
